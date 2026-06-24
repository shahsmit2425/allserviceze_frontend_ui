/**
 * DailyCallRoomNative
 *
 * iOS-only Daily.co implementation using createCallObject() instead of
 * createFrame(). WKWebView cannot grant camera/microphone to nested iframes,
 * so we run the call in the main page context and render our own video tiles.
 *
 * Website uses DailyCallRoom (Prebuilt iframe) — this file is NOT used there.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import DailyIframe from "@daily-co/daily-js";
import { Mic, MicOff, Video, VideoOff, FlipHorizontal2, PhoneOff, User, Pin, PinOff } from "lucide-react";
import axios from "axios";
import logger from "@/utils/logger";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;

// ── Video tile: attaches a MediaStreamTrack to a <video> element ──────────
function VideoTile({ track, mirror = false, style = {} }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (track) {
      el.srcObject = new MediaStream([track]);
    } else {
      el.srcObject = null;
    }
  }, [track]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={mirror} // local self-view: muted to avoid echo
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: mirror ? "scaleX(-1)" : "none",
        background: "#111",
        ...style,
      }}
    />
  );
}

// ── Audio tile: plays remote participant's audio ────────────────────────────
// CRITICAL: createCallObject() separates audio from video tracks.
// Without this, the remote party is completely silent on iOS.
function AudioTile({ track }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (track) {
      el.srcObject = new MediaStream([track]);
      // Explicit play() handles iOS autoplay policy edge cases
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [track]);
  return <audio ref={ref} autoPlay playsInline style={{ display: "none" }} />;
}

// ── Round control button ──────────────────────────────────────────────────
function CtrlBtn({ onPress, bg = "#2a2a2a", size = 56, disabled = false, children }) {
  return (
    <button
      onClick={onPress}
      disabled={disabled}
      style={{
        width: size, height: size,
        borderRadius: "50%",
        background: bg,
        border: "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        flexShrink: 0,
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        transition: "opacity 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function DailyCallRoomNative({ bookingId, roomUrl, token, callType, otherPartyName, onLeave }) {
  const coRef = useRef(null);
  const notifiedRef = useRef(false);

  const [joined, setJoined] = useState(false);
  const [localP, setLocalP] = useState(null);
  const [remotes, setRemotes] = useState([]);
  const [micMuted, setMicMuted] = useState(false);
  const [camOff, setCamOff] = useState(callType !== "video");
  const [flipping, setFlipping] = useState(false);
  const [joining, setJoining] = useState(true);
  const [joinError, setJoinError] = useState(null);
  // selfPinned: true = local video fills main area, remote goes to PiP
  const [selfPinned, setSelfPinned] = useState(false);
  const toggleSelfPin = useCallback(() => setSelfPinned((p) => !p), []);

  const isVideo = callType === "video";

  // Sync participant state from the call object
  const syncParticipants = useCallback((co) => {
    const all = co.participants();
    setLocalP(all.local ?? null);
    setRemotes(Object.values(all).filter((p) => !p.local));
  }, []);

  // ── Initialise callObject ────────────────────────────────────────────
  useEffect(() => {
    if (!roomUrl) return;

    const co = DailyIframe.createCallObject({
      subscribeToTracksAutomatically: true, // ensure audio+video tracks arrive automatically
      audioSource: true,
      videoSource: isVideo,
    });
    coRef.current = co;

    co.on("joining-meeting", () => setJoining(true));
    co.on("joined-meeting",  () => { setJoining(false); setJoined(true); setJoinError(null); syncParticipants(co); });
    co.on("participant-joined",  () => syncParticipants(co));
    co.on("participant-updated", () => syncParticipants(co));
    co.on("participant-left",    () => syncParticipants(co));
    // track-started/stopped fire when mute state changes or tracks become available
    // Essential for cross-platform: web user unmutes → iOS sees the track
    co.on("track-started",  () => syncParticipants(co));
    co.on("track-stopped",  () => syncParticipants(co));
    co.on("left-meeting", () => onLeave?.());
    co.on("error", (e) => {
      logger.error("Daily native error:", e);
      setJoining(false);
      setJoinError(e?.errorMsg || e?.type || "Call failed — please try again");
    });

    co.join({
      url: roomUrl,
      token: token || undefined,
      startVideoOff: !isVideo,
      startAudioOff: false,
    }).catch((e) => {
      logger.error("Daily join failed:", e);
      setJoining(false);
      setJoinError(e?.message || "Could not connect — check your connection and try again");
    });

    return () => {
      co.leave().catch(() => {}).finally(() => co.destroy().catch(() => {}));
      coRef.current = null;
    };
  }, [roomUrl, token, isVideo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Controls ─────────────────────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (!coRef.current) return;
    const next = !micMuted;
    coRef.current.setLocalAudio(!next);
    setMicMuted(next);
  }, [micMuted]);

  const toggleCam = useCallback(() => {
    if (!coRef.current) return;
    const next = !camOff;
    coRef.current.setLocalVideo(!next);
    setCamOff(next);
  }, [camOff]);

  const flipCam = useCallback(async () => {
    if (!coRef.current || flipping) return;
    setFlipping(true);
    try {
      await coRef.current.cycleCamera({ preferDifferentFacingMode: true });
    } catch (e) {
      logger.error("Flip camera error:", e);
    } finally {
      setTimeout(() => setFlipping(false), 600);
    }
  }, [flipping]);

  // ── Retry: must create a fresh callObject (errored one is terminal) ─────
  const handleRetry = useCallback(() => {
    // Destroy the old (errored) callObject and create a fresh one
    if (coRef.current) {
      coRef.current.destroy().catch(() => {});
      coRef.current = null;
    }
    setJoinError(null);
    setJoining(true);
    const co = DailyIframe.createCallObject({
      subscribeToTracksAutomatically: true,
      audioSource: true,
      videoSource: isVideo,
    });
    coRef.current = co;
    co.on("joined-meeting", () => { setJoining(false); setJoined(true); setJoinError(null); syncParticipants(co); });
    co.on("participant-joined",  () => syncParticipants(co));
    co.on("participant-updated", () => syncParticipants(co));
    co.on("participant-left",    () => syncParticipants(co));
    co.on("track-started",  () => syncParticipants(co));
    co.on("track-stopped",  () => syncParticipants(co));
    co.on("left-meeting", () => onLeave?.());
    co.on("error", (e) => { setJoining(false); setJoinError(e?.errorMsg || e?.type || "Call failed"); });
    co.join({ url: roomUrl, token: token || undefined, startVideoOff: !isVideo, startAudioOff: false })
      .catch((e) => { setJoining(false); setJoinError(e?.message || "Could not connect"); });
  }, [roomUrl, token, isVideo, syncParticipants, onLeave]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Notify backend of presence ────────────────────────────────────────
  useEffect(() => {
    if (!bookingId || !joined || notifiedRef.current) return;
    notifiedRef.current = true;

    axios.post(
      `${API_URL}/bookings/${bookingId}/call-room/presence`,
      { action: "join", call_type: callType || "video" },
      { withCredentials: true }
    ).catch(() => {});

    return () => {
      axios.post(
        `${API_URL}/bookings/${bookingId}/call-room/presence`,
        { action: "leave" },
        { withCredentials: true }
      ).catch(() => {});
    };
  }, [bookingId, joined, callType]);

  // ── Derive tracks ─────────────────────────────────────────────────────
  const primaryRemote      = remotes[0];
  const remoteVideoTrack   = primaryRemote?.tracks?.video?.persistentTrack ?? null;
  const remoteAudioTrack   = primaryRemote?.tracks?.audio?.persistentTrack ?? null; // plays remote voice
  const localVideoTrack    = localP?.tracks?.video?.persistentTrack ?? null;

  // Which track fills the main (large) tile vs the PiP (small) tile
  const mainTrack = selfPinned ? localVideoTrack  : remoteVideoTrack;
  const mainMirror = selfPinned; // mirror when showing self in main
  const mainLabel  = selfPinned ? "You (pinned)" : (otherPartyName || "Other party");
  const pipTrack   = selfPinned ? remoteVideoTrack : localVideoTrack;
  const pipMirror  = !selfPinned; // mirror when showing self in PiP
  const pipLabel   = selfPinned ? (otherPartyName || "Other party") : "You";

  // ── Render ────────────────────────────────────────────────────────────
  return (
    // position: fixed covers the entire viewport including DailyCallModal's header
    // so iOS gets a truly fullscreen native call UI
    <div style={{
      position: "fixed", inset: 0, zIndex: 100000,
      background: "#0d1117", display: "flex", flexDirection: "column",
      paddingTop: "env(safe-area-inset-top, 0px)",
    }}>
      {/* CRITICAL: hidden audio element — plays remote participant's voice.
          createCallObject() does NOT auto-wire audio to any output. */}
      <AudioTile track={remoteAudioTrack} />

      {/* ── Native header (replaces DailyCallModal header underneath) ── */}
      <div style={{
        height: 54, flexShrink: 0, display: "flex",
        alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", background: "#161b22", borderBottom: "1px solid #30363d",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>{isVideo ? "🎥" : "🎙️"}</span>
          <div>
            <div style={{ color: "#e6edf3", fontWeight: 600, fontSize: 15 }}>
              {isVideo ? "Video" : "Audio"} Call
            </div>
            {otherPartyName && (
              <div style={{ color: "#8b949e", fontSize: 12 }}>with {otherPartyName}</div>
            )}
          </div>
        </div>
        {joined && !joinError && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#3fb950" }} />
            <span style={{ color: "#3fb950", fontSize: 12, fontWeight: 500 }}>Connected</span>
          </div>
        )}
      </div>

      {/* ── Main video area ── */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "#111" }}>

        {/* Main tile: remote (default) or self when pinned */}
        {isVideo && mainTrack ? (
          <VideoTile track={mainTrack} mirror={mainMirror} style={{ position: "absolute", inset: 0 }} />
        ) : (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 14,
          }}>
            <div style={{
              width: 88, height: 88, borderRadius: "50%",
              background: "#252525",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <User size={40} color="#555" />
            </div>
            <p style={{ color: "#8b949e", fontSize: 14, margin: 0 }}>
              {joining
                ? "Connecting…"
                : primaryRemote
                  ? (isVideo ? "Camera off" : "Audio only")
                  : "Waiting for other party…"}
            </p>
          </div>
        )}

        {/* "Pinned" label on main tile */}
        {isVideo && joined && (
          <div style={{
            position: "absolute", top: 10, left: 10,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
            borderRadius: 6, padding: "3px 8px",
            display: "flex", alignItems: "center", gap: 5,
            pointerEvents: "none",
          }}>
            {selfPinned && <Pin size={11} color="#58a6ff" />}
            <span style={{ color: selfPinned ? "#58a6ff" : "#adbac7", fontSize: 11, fontWeight: 500 }}>
              {mainLabel}
            </span>
          </div>
        )}

        {/* PiP tile — tap to toggle pin */}
        {isVideo && (
          <div
            onClick={!camOff ? toggleSelfPin : undefined}
            style={{
              position: "absolute", bottom: 16, right: 16,
              width: 88, height: 120,
              borderRadius: 12, overflow: "hidden",
              border: selfPinned
                ? "2px solid #58a6ff"      // blue border when remote is in PiP
                : "2px solid rgba(255,255,255,0.18)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
              background: "#252525",
              cursor: !camOff ? "pointer" : "default",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {/* Show video or placeholder in PiP */}
            {pipTrack && !(selfPinned ? false : camOff) ? (
              <VideoTile track={pipTrack} mirror={pipMirror} />
            ) : (
              <div style={{
                width: "100%", height: "100%",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 4,
              }}>
                <VideoOff size={20} color="#555" />
              </div>
            )}

            {/* PiP label */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
              padding: "12px 4px 4px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
            }}>
              {!selfPinned && !camOff && <Pin size={9} color="#adbac7" />}
              <span style={{ color: "#adbac7", fontSize: 9, fontWeight: 500 }}>
                {!camOff ? (selfPinned ? pipLabel : "Tap to pin") : pipLabel}
              </span>
            </div>
          </div>
        )}

        {/* Connecting spinner overlay */}
        {joining && !joinError && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(13,17,23,0.7)",
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: "3px solid #30363d", borderTopColor: "#58a6ff",
              animation: "native-spin 0.8s linear infinite",
            }} />
          </div>
        )}

        {/* Error overlay with retry */}
        {joinError && (
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 16,
            background: "rgba(13,17,23,0.92)", padding: "0 32px", textAlign: "center",
          }}>
            <p style={{ color: "#f85149", fontSize: 15, margin: 0, lineHeight: 1.5 }}>
              {joinError}
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={onLeave}
                style={{
                  padding: "10px 20px", borderRadius: 8, border: "1px solid #30363d",
                  background: "transparent", color: "#8b949e", fontSize: 14, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRetry}
                style={{
                  padding: "10px 20px", borderRadius: 8, border: "none",
                  background: "#1f6feb", color: "#fff", fontSize: 14, cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Control bar ── */}
      <div style={{
        background: "#161b22",
        borderTop: "1px solid #30363d",
        padding: "18px 32px",
        paddingBottom: "max(18px, env(safe-area-inset-bottom, 18px))",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 22,
      }}>
        {/* Mic toggle */}
        <CtrlBtn onPress={toggleMic} bg={micMuted ? "#da3633" : "#2a2a2a"}>
          {micMuted ? <MicOff size={22} color="#fff" /> : <Mic size={22} color="#fff" />}
        </CtrlBtn>

        {/* Camera toggle — video calls only */}
        {isVideo && (
          <CtrlBtn onPress={toggleCam} bg={camOff ? "#da3633" : "#2a2a2a"}>
            {camOff ? <VideoOff size={22} color="#fff" /> : <Video size={22} color="#fff" />}
          </CtrlBtn>
        )}

        {/* Flip camera — video calls, cam on */}
        {isVideo && !camOff && (
          <CtrlBtn onPress={flipCam} bg="#2a2a2a" disabled={flipping}>
            <FlipHorizontal2 size={22} color="#fff" style={flipping ? { opacity: 0.5 } : {}} />
          </CtrlBtn>
        )}

        {/* Pin self — video calls, cam on */}
        {isVideo && !camOff && (
          <CtrlBtn onPress={toggleSelfPin} bg={selfPinned ? "#1f6feb" : "#2a2a2a"}>
            {selfPinned
              ? <PinOff size={22} color="#fff" />
              : <Pin    size={22} color="#fff" />}
          </CtrlBtn>
        )}

        {/* End call */}
        <CtrlBtn onPress={onLeave} bg="#da3633" size={64}>
          <PhoneOff size={26} color="#fff" />
        </CtrlBtn>
      </div>

      {/* Spinner keyframe (injected once) */}
      <style>{`@keyframes native-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

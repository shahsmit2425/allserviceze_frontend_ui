/**
 * DailyCallModal
 *
 * True fullscreen call overlay — wraps DailyCallRoom (Daily Prebuilt)
 * which provides all features (chat, screen share, reactions, settings)
 * plus custom floating controls for camera flip.
 */
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { PhoneOff, RefreshCw, AlertTriangle } from "lucide-react";
import DailyCallRoom from "./DailyCallRoom";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;

export default function DailyCallModal({ booking, callType, otherPartyName, onClose }) {
  const [roomUrl, setRoomUrl]   = useState(null);
  const [token, setToken]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [retrying, setRetrying] = useState(false);

  const createRoom = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post(
        `${API_URL}/bookings/${booking.id}/call-room`,
        { call_type: callType },
        { withCredentials: true }
      );
      setRoomUrl(response.data.room_url);
      setToken(response.data.token);
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        "Failed to create call room. Please try again."
      );
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  useEffect(() => {
    createRoom();
    return () => { setRoomUrl(null); setToken(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll while the call is open (critical on iOS Safari)
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <>
      <style>{`
        @keyframes daily-spin { to { transform: rotate(360deg); } }

        /* ── Root: true fullscreen, notch-aware ── */
        .daily-modal-root {
          position: fixed !important; inset: 0; z-index: 99999;
          display: flex; flex-direction: column;
          background: #0d1117;
          width: 100vw; width: 100dvw;
          height: 100vh; height: 100dvh;
          overflow: hidden;
          padding-top:    env(safe-area-inset-top,    0px);
          padding-bottom: env(safe-area-inset-bottom, 0px);
          padding-left:   env(safe-area-inset-left,   0px);
          padding-right:  env(safe-area-inset-right,  0px);
        }

        /* ── Header ── */
        .daily-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 12px; height: 54px; min-height: 54px;
          flex-shrink: 0; gap: 8px;
          background: #161b22; border-bottom: 1px solid #30363d;
        }
        .daily-header-left {
          display: flex; align-items: center; gap: 10px;
          min-width: 0; overflow: hidden; flex: 1;
        }
        .daily-header-title {
          color: #e6edf3; font-weight: 600; font-size: 15px; white-space: nowrap;
        }
        .daily-header-sub {
          color: #8b949e; font-size: 12px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        /* ── End Call button ── */
        .daily-end-btn {
          display: flex; align-items: center; gap: 6px; flex-shrink: 0;
          background: #da3633; border: none; border-radius: 8px;
          color: #fff; font-size: 13px; font-weight: 600;
          padding: 0 14px; min-height: 40px; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: background 0.15s;
        }
        .daily-end-btn:hover  { background: #b91c1c; }
        .daily-end-btn:active { background: #991b1b; transform: scale(0.97); }
        @media (max-width: 360px) {
          .daily-end-btn-label { display: none; }
          .daily-end-btn { padding: 0 10px; }
        }

        /* ── Body ── */
        .daily-body { flex: 1; position: relative; overflow: hidden; min-height: 0; }
        .daily-center {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
        }
        .daily-spinner {
          width: 44px; height: 44px;
          border: 3px solid #21262d; border-top-color: #58a6ff;
          border-radius: 50%; animation: daily-spin 0.8s linear infinite;
        }
      `}</style>

      <div className="daily-modal-root">
        {/* ── Header ── */}
        <div className="daily-header">
          <div className="daily-header-left">
            <span style={{ fontSize: 20, flexShrink: 0 }}>
              {callType === "video" ? "🎥" : "🎙️"}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="daily-header-title">
                {callType === "video" ? "Video" : "Audio"} Call
              </div>
              {otherPartyName && (
                <div className="daily-header-sub">with {otherPartyName}</div>
              )}
            </div>
          </div>

          <button className="daily-end-btn" onClick={onClose}>
            <PhoneOff size={14} />
            <span className="daily-end-btn-label">End Call</span>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="daily-body">
          {/* Loading */}
          {loading && (
            <div className="daily-center">
              <div className="daily-spinner" />
              <p style={{ color: "#8b949e", marginTop: 16, fontSize: 14, textAlign: "center" }}>
                Setting up your private call room…
              </p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="daily-center" style={{ gap: 16, padding: "0 24px" }}>
              <AlertTriangle size={40} color="#f0883e" />
              <p style={{ color: "#cdd9e5", fontSize: 14, textAlign: "center", maxWidth: 320, lineHeight: 1.5, marginTop: 8 }}>
                {error}
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
                <button
                  onClick={() => { setRetrying(true); createRoom(); }}
                  disabled={retrying}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "10px 18px", background: "#1f6feb", border: "none",
                    borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 600,
                    cursor: retrying ? "not-allowed" : "pointer", opacity: retrying ? 0.6 : 1,
                    minHeight: 44,
                  }}
                >
                  <RefreshCw size={13} /> Try Again
                </button>
                <button
                  onClick={onClose}
                  style={{
                    padding: "10px 18px", background: "#21262d", border: "1px solid #30363d",
                    borderRadius: 8, color: "#cdd9e5", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", minHeight: 44,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Live call using Daily Prebuilt + custom flip button */}
          {!loading && !error && roomUrl && (
            <DailyCallRoom
              bookingId={booking.id}
              roomUrl={roomUrl}
              token={token}
              callType={callType}
              otherPartyName={otherPartyName}
              onLeave={onClose}
            />
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

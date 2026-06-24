/**
 * DailyCallRoom - Hybrid Daily Prebuilt + Custom Controls
 *
 * Uses Daily.co Prebuilt iframe for core video features + custom overlay controls
 * that work reliably on ALL devices (iPhone, iPad, Android, desktop).
 * 
 * Custom controls:
 * - Camera flip using cycleCamera({ preferDifferentFacingMode: true })
 * - People sidebar access for pinning participants
 * - Always-visible mobile-safe tap targets
 */
import { useEffect, useRef, useState, useCallback } from "react";
import logger from "@/utils/logger";
import DailyIframe from "@daily-co/daily-js";
import axios from "axios";
import { FlipHorizontal2, Users, Maximize2, Minimize2 } from "lucide-react";
import { usePlatform } from "@/mobile/hooks/usePlatform";
import DailyCallRoomNative from "./DailyCallRoomNative";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;

// Web-only: Prebuilt iframe.  NOT used on iOS (WKWebView cannot grant camera/mic to iframes).
function DailyCallRoomWeb({ bookingId, roomUrl, token, callType, onLeave }) {
  const containerRef = useRef(null);
  const callFrameRef = useRef(null);
  const notifiedRef = useRef(false);
  const [joined, setJoined] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [flipError, setFlipError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize Daily Prebuilt iframe
  useEffect(() => {
    if (!containerRef.current || !roomUrl || callFrameRef.current) return;

    const initFrame = async () => {
      try {
        // Create Prebuilt frame with all native features
        const frame = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: "none",
          },
          showLeaveButton: true,
          showFullscreenButton: false, // We'll provide our own
          showLocalVideo: true,
          showParticipantsBar: true,
        });

        callFrameRef.current = frame;

        // Event handlers
        frame.on("joined-meeting", () => {
          setJoined(true);
        });
        
        frame.on("left-meeting", () => {
          onLeave?.();
        });
        
        frame.on("error", (e) => {
          logger.error("Daily error:", e);
        });

        // Join the room
        await frame.join({
          url: roomUrl,
          token: token,
          startVideoOff: callType !== "video",
          startAudioOff: false,
        });

      } catch (e) {
        logger.error("Daily frame init error:", e);
        onLeave?.();
      }
    };

    initFrame();

    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    };
  }, [roomUrl, token, callType, onLeave]);

  // Flip camera using Daily's cycleCamera with preferDifferentFacingMode
  const handleFlipCamera = useCallback(async () => {
    if (!callFrameRef.current || flipping) return;

    setFlipping(true);
    setFlipError(false);
    try {
      // Use Daily's recommended approach for mobile camera switching
      await callFrameRef.current.cycleCamera({ preferDifferentFacingMode: true });
      logger.log("Camera flipped successfully");
    } catch (e) {
      logger.error("Camera flip error:", e);
      setFlipError(true);
      // Auto-clear error after 3 seconds
      setTimeout(() => setFlipError(false), 3000);
    } finally {
      setTimeout(() => setFlipping(false), 500);
    }
  }, [flipping]);

  // Open People sidebar for pinning participants (Prebuilt-native way)
  const handleOpenPeople = useCallback(() => {
    if (!callFrameRef.current) return;
    try {
      callFrameRef.current.setSidebarView("people");
      logger.log("Opened People sidebar");
    } catch (e) {
      logger.error("Failed to open People sidebar:", e);
    }
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Notify backend of presence
  useEffect(() => {
    if (!bookingId || !joined || notifiedRef.current) return;
    notifiedRef.current = true;
    axios
      .post(`${API_URL}/bookings/${bookingId}/call-room/presence`, 
        { action: "join", call_type: callType || "video" }, 
        { withCredentials: true })
      .catch(() => {});

    const onUnload = () => {
      navigator.sendBeacon(
        `${API_URL}/bookings/${bookingId}/call-room/presence`,
        JSON.stringify({ action: "leave" })
      );
    };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      axios
        .post(`${API_URL}/bookings/${bookingId}/call-room/presence`, 
          { action: "leave" }, 
          { withCredentials: true })
        .catch(() => {});
    };
  }, [bookingId, joined, callType]);

  const showControls = joined && callType === "video";

  return (
    <>
      <style>{`
        .daily-prebuilt-container {
          position: relative;
          width: 100%;
          height: 100%;
          background: #0d1117;
        }

        /* Custom controls overlay - always visible, mobile-optimized */
        .custom-controls-overlay {
          position: absolute;
          top: 50%;
          left: 12px;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 999999; /* Above Daily Prebuilt UI */
          pointer-events: none; /* Allow clicks through to Daily UI */
        }

        .custom-control-btn {
          pointer-events: auto; /* Re-enable clicks on buttons */
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          min-width: 48px;
          min-height: 48px;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.75);
          color: #fff;
          cursor: pointer;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
          touch-action: manipulation; /* Prevent double-tap zoom */
        }

        /* Mobile-optimized sizes */
        @media (max-width: 768px) {
          .custom-control-btn {
            width: 52px;
            height: 52px;
            min-width: 52px;
            min-height: 52px;
          }
          .custom-controls-overlay {
            left: 10px;
            gap: 12px;
          }
        }

        /* Extra spacing for devices with notches */
        @media (max-width: 768px) and (orientation: portrait) {
          .custom-controls-overlay {
            left: max(10px, env(safe-area-inset-left, 10px));
          }
        }

        .custom-control-btn:hover {
          background: rgba(0, 0, 0, 0.85);
          transform: scale(1.05);
        }

        .custom-control-btn:active {
          transform: scale(0.95);
        }

        .custom-control-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .custom-control-btn.error {
          background: #dc3545;
        }

        .custom-control-btn.flipping {
          animation: flip-animation 0.5s ease-out;
        }

        @keyframes flip-animation {
          0% { transform: scaleX(1) rotate(0deg); }
          50% { transform: scaleX(-1) rotate(180deg); }
          100% { transform: scaleX(1) rotate(360deg); }
        }

        /* Tooltip for controls */
        .custom-control-btn::before {
          content: attr(data-tooltip);
          position: absolute;
          left: 100%;
          margin-left: 10px;
          padding: 6px 12px;
          background: rgba(0, 0, 0, 0.9);
          color: #fff;
          font-size: 12px;
          border-radius: 6px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s;
        }

        .custom-control-btn:hover::before {
          opacity: 1;
        }

        /* Hide tooltip on mobile */
        @media (max-width: 768px) {
          .custom-control-btn::before {
            display: none;
          }
        }

        /* Loading/error overlay for camera flip */
        .flip-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.3);
          z-index: 999998;
          pointer-events: none;
          backdrop-filter: blur(2px);
        }

        .flip-overlay-content {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 20px;
          background: rgba(0, 0, 0, 0.8);
          border-radius: 8px;
          color: #fff;
          font-size: 14px;
        }

        .flip-overlay-content.error {
          background: rgba(220, 53, 69, 0.9);
        }

        .flip-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="daily-prebuilt-container" ref={containerRef}>
        {/* Custom overlay controls */}
        {showControls && (
          <div className="custom-controls-overlay">
            {/* Camera flip button - always show, handle errors gracefully */}
            <button
              className={`custom-control-btn ${flipping ? 'flipping' : ''} ${flipError ? 'error' : ''}`}
              onClick={handleFlipCamera}
              disabled={flipping}
              data-tooltip={flipError ? "Only one camera" : "Flip camera"}
              aria-label="Flip camera"
            >
              <FlipHorizontal2 size={22} />
            </button>

            {/* People button - opens sidebar for pinning */}
            <button
              className="custom-control-btn"
              onClick={handleOpenPeople}
              data-tooltip="People / Pin"
              aria-label="Open people list"
            >
              <Users size={22} />
            </button>

            {/* Fullscreen toggle */}
            <button
              className="custom-control-btn"
              onClick={toggleFullscreen}
              data-tooltip={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={22} /> : <Maximize2 size={22} />}
            </button>
          </div>
        )}

        {/* Loading/error overlay during camera flip */}
        {(flipping || flipError) && (
          <div className="flip-overlay">
            <div className={`flip-overlay-content ${flipError ? 'error' : ''}`}>
              {!flipError && <div className="flip-spinner" />}
              <span>{flipError ? "Only one camera available" : "Flipping camera..."}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
// On iOS Capacitor, render the callObject-based UI so WKWebView can grant
// camera/microphone permissions.  On web, use the Prebuilt iframe as before.
export default function DailyCallRoom(props) {
  const { isNative } = usePlatform();
  return isNative ? <DailyCallRoomNative {...props} /> : <DailyCallRoomWeb {...props} />;
}

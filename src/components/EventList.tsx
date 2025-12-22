import { useState, useEffect, useRef, useCallback } from "react";
import type { PlayEvent } from "../types/nba";
import "./EventList.css";

interface EventListProps {
  events: PlayEvent[];
  loading?: boolean;
}

export function EventList({ events, loading }: EventListProps) {
  const [isNextReady, setIsNextReady] = useState(true);
  const nextReadyTimeout = useRef<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  const showControls = useCallback(() => {
    setControlsVisible(true);

    // Clear existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    // Hide after 3 seconds of inactivity
    hideTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setControlsVisible(false);
      }
    }, 3000);
  }, [isPlaying]);

  // Reset to first video when events change (new game selected)
  useEffect(() => {
    // Defer the reset to avoid synchronous setState inside effect and
    // ensure it only runs when `events` changes (not when currentIndex updates).
    const t = window.setTimeout(() => setCurrentIndex(0), 0);
    return () => clearTimeout(t);
  }, [events]);

  // Track next video preload status
  useEffect(() => {
    if (isNextReady) {
      // Defer to avoid synchronous setState in effect
      window.setTimeout(() => setIsNextReady(false), 0);
    }
    // Give preloader time to buffer; show loader only if not ready after a short period
    if (nextReadyTimeout.current) clearTimeout(nextReadyTimeout.current);
    nextReadyTimeout.current = setTimeout(() => {
      if (!isNextReady && currentIndex < events.length - 1) {
        setIsNextReady(false); // show loader
      }
    }, 400); // Adjust delay as needed

    const nextVideo = nextVideoRef.current;
    if (nextVideo) {
      const onCanPlay = () => setIsNextReady(true);
      const onError = () => setIsNextReady(false);
      nextVideo.addEventListener("canplaythrough", onCanPlay);
      nextVideo.addEventListener("error", onError);
      return () => {
        nextVideo.removeEventListener("canplaythrough", onCanPlay);
        nextVideo.removeEventListener("error", onError);
      };
    }
  }, [currentIndex, events, isNextReady]);

  // Auto-play current video when it changes
  useEffect(() => {
    if (videoRef.current && events.length > 0) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {
        // Autoplay might be blocked, that's ok
      });
    }
  }, [currentIndex, events]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const handleVideoEnded = () => {
    if (currentIndex < events.length - 1) {
      // Try seamless swap: promote hidden next video to main, if possible
      if (nextVideoRef.current && videoRef.current) {
        // Pause current video (safety)
        videoRef.current.pause();
        // Detach event handlers from old video
        videoRef.current.onended = null;
        videoRef.current.onplay = null;
        videoRef.current.onpause = null;
        videoRef.current.onclick = null;

        // Replace src and event handlers/refs
        // Remove old video, show hidden one as main
        // TODO: In a stricter implementation, you'd swap DOM order, but for React, we'll re-render.
        setControlsVisible(false);
        setCurrentIndex((idx) => idx + 1);
        // The useEffect for [currentIndex, events] will re-attach videoRef to the new on-screen video
      } else {
        setControlsVisible(false);
        setCurrentIndex((idx) => idx + 1);
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setControlsVisible(false);
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < events.length - 1) {
      setControlsVisible(false);
      setCurrentIndex(currentIndex + 1);
    }
  };

  const jumpToStart = () => {
    setControlsVisible(false);
    setCurrentIndex(0);
  };

  const jumpToEnd = () => {
    setControlsVisible(false);
    setCurrentIndex(events.length - 1);
  };

  const handleMouseMove = () => {
    showControls();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Arrow key navigation (don't show controls, they'll be hidden)
    if (e.key === "ArrowLeft") {
      handlePrev();
    } else if (e.key === "ArrowRight") {
      handleNext();
    } else if (e.key === " ") {
      e.preventDefault();
      showControls();
      if (videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }
    } else {
      showControls();
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    // Don't show controls here - let them stay hidden during auto-play
  };

  const handlePause = () => {
    setIsPlaying(false);
    setControlsVisible(true);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const currentEvent = events[currentIndex];

  if (loading) {
    return (
      <div className="event-list-container">
        <div className="event-list-loading">
          <div className="loading-spinner"></div>
          <span>Loading highlights...</span>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="event-list-container">
        <div className="event-list-empty">
          No highlights available for this game
        </div>
      </div>
    );
  }

  return (
    <div
      className="event-list-container"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={showControls}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Video Player with Navigation */}
      <div
        className={`video-player-section ${
          controlsVisible ? "controls-visible" : "controls-hidden"
        }`}
      >
        {currentEvent?.videoUrl ? (
          <div className="video-inner">
            {/* Main visible video */}
            <video
              ref={videoRef}
              src={currentEvent.videoUrl}
              className="main-video"
              autoPlay
              onEnded={handleVideoEnded}
              onPlay={handlePlay}
              onPause={handlePause}
              onClick={togglePlay}
              style={{ display: "block", zIndex: 2 }}
            >
              Your browser does not support video playback.
            </video>

            {/* Hidden next video for seamless swap */}
            {currentIndex < events.length - 1 &&
              events[currentIndex + 1]?.videoUrl && (
                <video
                  ref={nextVideoRef}
                  src={events[currentIndex + 1].videoUrl}
                  preload="auto"
                  tabIndex={-1}
                  style={{ display: "none" }}
                ></video>
              )}

            {/* Custom Controls Overlay */}
            <div className="custom-controls">
              <button
                className="nav-button jump-start"
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToStart();
                }}
                disabled={currentIndex === 0}
                aria-label="Jump to start"
                title="Jump to first video"
              >
                ⏮
              </button>

              <button
                className="nav-button prev"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                disabled={currentIndex === 0}
                aria-label="Previous video"
              >
                ‹
              </button>

              <button
                className="play-pause-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? "❚❚" : "▶"}
              </button>

              <button
                className="nav-button next"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                disabled={currentIndex === events.length - 1}
                aria-label="Next video"
              >
                ›
              </button>

              <button
                className="nav-button jump-end"
                onClick={(e) => {
                  e.stopPropagation();
                  jumpToEnd();
                }}
                disabled={currentIndex === events.length - 1}
                aria-label="Jump to end"
                title="Jump to last video (clutch time)"
              >
                ⏭
              </button>

              <button
                className="fullscreen-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                aria-label="Toggle fullscreen"
              >
                ⛶
              </button>
            </div>
          </div>
        ) : (
          <div className="video-placeholder">No video available</div>
        )}

        {/* Hidden preloading video element - seamless transition */}
        {currentIndex < events.length - 1 &&
          events[currentIndex + 1]?.videoUrl && (
            <video
              src={events[currentIndex + 1].videoUrl}
              preload="auto"
              tabIndex={-1}
              style={{ display: "none" }}
              ref={nextVideoRef}
            ></video>
          )}
      </div>
    </div>
  );
}

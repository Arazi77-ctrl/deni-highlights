import { useState, useEffect, useRef, useCallback } from 'react';
import type { PlayEvent } from '../types/nba';
import './EventList.css';

interface EventListProps {
  events: PlayEvent[];
  loading?: boolean;
}

export function EventList({ events, loading }: EventListProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
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
    setCurrentIndex(0);
  }, [events]);

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

  // Show controls initially then start hide timer
  useEffect(() => {
    showControls();
  }, [showControls]);

  const handleVideoEnded = () => {
    // Auto-advance to next video
    if (currentIndex < events.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < events.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleMouseMove = () => {
    showControls();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    showControls();
    
    // Arrow key navigation
    if (e.key === 'ArrowLeft') {
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      handleNext();
    } else if (e.key === ' ') {
      e.preventDefault();
      if (videoRef.current) {
        if (videoRef.current.paused) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    showControls();
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
      <div className={`video-player-section ${controlsVisible ? 'controls-visible' : 'controls-hidden'}`}>
        {currentEvent?.videoUrl ? (
          <>
            <video
              ref={videoRef}
              src={currentEvent.videoUrl}
              className="main-video"
              autoPlay
              onEnded={handleVideoEnded}
              onPlay={handlePlay}
              onPause={handlePause}
              onClick={togglePlay}
            >
              Your browser does not support video playback.
            </video>
            
            {/* Custom Controls Overlay */}
            <div className="custom-controls">
              <button 
                className="nav-button prev"
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                disabled={currentIndex === 0}
                aria-label="Previous video"
              >
                ‹
              </button>
              
              <button 
                className="play-pause-btn"
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>
              
              <button 
                className="nav-button next"
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                disabled={currentIndex === events.length - 1}
                aria-label="Next video"
              >
                ›
              </button>
              
              <button 
                className="fullscreen-btn"
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                aria-label="Toggle fullscreen"
              >
                ⛶
              </button>
            </div>
          </>
        ) : (
          <div className="video-placeholder">
            No video available
          </div>
        )}
      </div>
    </div>
  );
}

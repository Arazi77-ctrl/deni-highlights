import { useState, useEffect, useRef } from 'react';
import type { PlayEvent } from '../types/nba';
import './EventList.css';

interface EventListProps {
  events: PlayEvent[];
  loading?: boolean;
}

export function EventList({ events, loading }: EventListProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

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
    <div className="event-list-container">
      {/* Video Player with Navigation */}
      <div className="video-player-section">
        {currentEvent?.videoUrl ? (
          <video
            ref={videoRef}
            src={currentEvent.videoUrl}
            className="main-video"
            controls
            autoPlay
            onEnded={handleVideoEnded}
          >
            Your browser does not support video playback.
          </video>
        ) : (
          <div className="video-placeholder">
            No video available
          </div>
        )}
        
        {/* Navigation Controls */}
        <div className="video-controls">
          <button 
            className="nav-button prev"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            aria-label="Previous video"
          >
            ‹
          </button>
          
          <button 
            className="nav-button next"
            onClick={handleNext}
            disabled={currentIndex === events.length - 1}
            aria-label="Next video"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

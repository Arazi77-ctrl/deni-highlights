import { useState } from 'react';
import type { PlayEvent, Shot, ContextMeasure } from '../types/nba';
import './Court.css';

interface CourtProps {
  shots?: Shot[];
  events?: PlayEvent[];
  selectedMeasure?: ContextMeasure;
  onEventClick?: (event: PlayEvent | Shot) => void;
}

// Court dimensions in NBA API coordinates
// NBA court is 94 ft x 50 ft
// The shot chart uses a coordinate system where:
// X: -250 to 250 (representing half the court width, in 1/10th of feet)
// Y: -50 to 420 (representing from baseline to just past half court)
const COURT_WIDTH = 500;
const COURT_HEIGHT = 470;
const HOOP_Y = 50; // Distance from baseline to hoop

// Color mapping for different event types
const EVENT_COLORS: Record<ContextMeasure, { fill: string; stroke: string }> = {
  FGA: { fill: '#3b82f6', stroke: '#1d4ed8' }, // Blue for shots
  AST: { fill: '#22c55e', stroke: '#15803d' }, // Green for assists
  FTA: { fill: '#eab308', stroke: '#ca8a04' }, // Yellow for free throws
  PF: { fill: '#ef4444', stroke: '#b91c1c' },  // Red for fouls
  TO: { fill: '#f97316', stroke: '#c2410c' },  // Orange for turnovers
  BLK: { fill: '#8b5cf6', stroke: '#6d28d9' }, // Purple for blocks
  STL: { fill: '#06b6d4', stroke: '#0891b2' }  // Cyan for steals
};

export function Court({ shots = [], events = [], selectedMeasure, onEventClick }: CourtProps) {
  const [hoveredEvent, setHoveredEvent] = useState<PlayEvent | Shot | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Convert NBA coordinates to SVG coordinates
  const toSvgCoords = (locX: number, locY: number) => {
    // NBA X is centered at 0, ranges from -250 to 250
    // NBA Y starts at 0 at the baseline
    const svgX = COURT_WIDTH / 2 + locX;
    const svgY = COURT_HEIGHT - locY - HOOP_Y;
    return { x: svgX, y: svgY };
  };

  const handleMouseEnter = (event: PlayEvent | Shot, e: React.MouseEvent) => {
    setHoveredEvent(event);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredEvent(null);
  };

  // Render shot markers
  const renderShots = () => {
    return shots.map((shot, index) => {
      const { x, y } = toSvgCoords(shot.locX, shot.locY);
      const color = shot.shotMade ? '#22c55e' : '#ef4444';
      
      return (
        <g
          key={`shot-${index}`}
          className="shot-marker"
          onMouseEnter={(e) => handleMouseEnter(shot, e)}
          onMouseLeave={handleMouseLeave}
          onClick={() => onEventClick?.(shot)}
        >
          {shot.shotMade ? (
            <circle
              cx={x}
              cy={y}
              r={6}
              fill={color}
              stroke="#fff"
              strokeWidth={1.5}
              opacity={0.85}
            />
          ) : (
            <g transform={`translate(${x}, ${y})`}>
              <line x1={-5} y1={-5} x2={5} y2={5} stroke={color} strokeWidth={2.5} />
              <line x1={5} y1={-5} x2={-5} y2={5} stroke={color} strokeWidth={2.5} />
            </g>
          )}
        </g>
      );
    });
  };

  // Render event markers
  const renderEvents = () => {
    return events.map((event, index) => {
      const { x, y } = toSvgCoords(event.locX, event.locY);
      const colors = EVENT_COLORS[event.contextMeasure];
      const isSelected = !selectedMeasure || event.contextMeasure === selectedMeasure;
      
      return (
        <circle
          key={`event-${index}`}
          cx={x}
          cy={y}
          r={7}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={2}
          opacity={isSelected ? 0.9 : 0.2}
          className="event-marker"
          onMouseEnter={(e) => handleMouseEnter(event, e)}
          onMouseLeave={handleMouseLeave}
          onClick={() => onEventClick?.(event)}
        />
      );
    });
  };

  return (
    <div className="court-container">
      <svg
        viewBox={`0 0 ${COURT_WIDTH} ${COURT_HEIGHT}`}
        className="court-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Court Background */}
        <rect x={0} y={0} width={COURT_WIDTH} height={COURT_HEIGHT} fill="#1a1a2e" />
        
        {/* Court outline */}
        <rect x={0} y={0} width={COURT_WIDTH} height={COURT_HEIGHT} 
          fill="none" stroke="#444" strokeWidth={2} />

        {/* Paint / Key (16 ft wide, 19 ft from baseline) */}
        <rect x={170} y={COURT_HEIGHT - 190} width={160} height={190} 
          fill="none" stroke="#666" strokeWidth={2} />

        {/* Free throw circle */}
        <circle cx={250} cy={COURT_HEIGHT - 190} r={60} 
          fill="none" stroke="#666" strokeWidth={2} />

        {/* Restricted area (4 ft radius) */}
        <path
          d={`M 210 ${COURT_HEIGHT} A 40 40 0 0 1 290 ${COURT_HEIGHT}`}
          fill="none" stroke="#666" strokeWidth={2}
        />

        {/* Backboard */}
        <line x1={220} y1={COURT_HEIGHT - 40} x2={280} y2={COURT_HEIGHT - 40} 
          stroke="#888" strokeWidth={3} />

        {/* Hoop */}
        <circle cx={250} cy={COURT_HEIGHT - 50} r={9} 
          fill="none" stroke="#e65100" strokeWidth={3} />

        {/* Three-point line */}
        <path
          d={`M 30 ${COURT_HEIGHT} L 30 ${COURT_HEIGHT - 140} 
              A 238 238 0 0 1 470 ${COURT_HEIGHT - 140} 
              L 470 ${COURT_HEIGHT}`}
          fill="none" stroke="#666" strokeWidth={2}
        />

        {/* Half-court line */}
        <line x1={0} y1={0} x2={COURT_WIDTH} y2={0} 
          stroke="#666" strokeWidth={2} />

        {/* Center circle */}
        <circle cx={250} cy={0} r={60} 
          fill="none" stroke="#666" strokeWidth={2} />

        {/* Render markers */}
        {renderShots()}
        {renderEvents()}
      </svg>

      {/* Tooltip */}
      {hoveredEvent && (
        <div 
          className="court-tooltip"
          style={{ 
            left: tooltipPosition.x + 10, 
            top: tooltipPosition.y - 10 
          }}
        >
          {'description' in hoveredEvent ? (
            <>
              <div className="tooltip-period">Q{hoveredEvent.period} - {hoveredEvent.clock}</div>
              <div className="tooltip-desc">{hoveredEvent.description}</div>
            </>
          ) : (
            <>
              <div className="tooltip-period">Q{hoveredEvent.period}</div>
              <div className="tooltip-desc">{hoveredEvent.actionType}</div>
              <div className="tooltip-result">{hoveredEvent.shotMade ? 'Made' : 'Missed'}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}


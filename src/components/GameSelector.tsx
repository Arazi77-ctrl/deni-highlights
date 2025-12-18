import type { Game } from '../types/nba';
import './GameSelector.css';

interface GameSelectorProps {
  games: Game[];
  selectedGameId: string | null;
  onSelectGame: (gameId: string) => void;
  loading?: boolean;
}

export function GameSelector({ games, selectedGameId, onSelectGame, loading }: GameSelectorProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getOpponent = (matchup: string) => {
    // Matchup format: "POR vs. OPP" or "POR @ OPP"
    const parts = matchup.split(/\s+(?:vs\.|@)\s+/);
    return parts[1] || matchup;
  };

  if (loading) {
    return (
      <div className="game-selector">
        <div className="game-selector-loading">
          <div className="loading-spinner"></div>
          <span>Loading games...</span>
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="game-selector">
        <div className="game-selector-empty">No games found</div>
      </div>
    );
  }

  return (
    <div className="game-selector">
      <label className="game-selector-label">Select Game</label>
      <div className="game-list">
        {games.slice(0, 10).map((game) => (
          <button
            key={game.gameId}
            className={`game-item ${selectedGameId === game.gameId ? 'selected' : ''}`}
            onClick={() => onSelectGame(game.gameId)}
          >
            <div className="game-date">{formatDate(game.gameDate)}</div>
            <div className="game-matchup">
              <span className="game-location">{game.isHome ? 'vs' : '@'}</span>
              <span className="game-opponent">{getOpponent(game.matchup)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}


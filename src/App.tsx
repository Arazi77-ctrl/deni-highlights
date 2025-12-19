import { useState, useEffect, useCallback } from 'react';
import { getPortlandGames, getAllVideoEvents } from './api/nba';
import { GameSelector, EventList } from './components';
import type { Game, PlayEvent } from './types/nba';
import './App.css';

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [events, setEvents] = useState<PlayEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGames, setLoadingGames] = useState(true);

  // Get selected game object
  const selectedGame = games.find(g => g.gameId === selectedGameId) || null;

  // Load games on mount
  useEffect(() => {
    const loadGames = async () => {
      setLoadingGames(true);
      const gamesData = await getPortlandGames();
      setGames(gamesData);
      setLoadingGames(false);
      
      // Auto-select the most recent game
      if (gamesData.length > 0) {
        setSelectedGameId(gamesData[0].gameId);
      }
    };
    loadGames();
  }, []);

  // Load events when game changes
  // Server returns Deni's full game + clutch time videos, already deduplicated and sorted
  const loadGameData = useCallback(async (gameId: string) => {
    setLoading(true);
    
    try {
      const allEvents = await getAllVideoEvents(gameId);
      setEvents(allEvents);
    } catch (error) {
      console.error('Failed to load game data:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedGameId) {
      loadGameData(selectedGameId);
    }
  }, [selectedGameId, loadGameData]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-logo">
            <img 
              src="https://cdn.nba.com/headshots/nba/latest/1040x760/1630166.png" 
              alt="Deni Avdija"
              className="player-avatar"
            />
            <div className="header-text">
              <h1>Deni Avdija</h1>
              <span className="team-name">Portland Trail Blazers</span>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="content-grid">
          <section className="section section-games">
            <div className="section-header">
              <h2>Games</h2>
            </div>
            <GameSelector
              games={games}
              selectedGameId={selectedGameId}
              onSelectGame={setSelectedGameId}
              loading={loadingGames}
            />
          </section>

          {selectedGame && (
            <section className="section section-events">
              <div className="section-header">
                <h2>Highlights</h2>
              </div>
              <EventList
                events={events}
                loading={loading}
              />
            </section>
          )}
      </div>
      </main>

      <footer className="app-footer">
        <p>Data provided by NBA Stats API • Videos © NBA</p>
      </footer>
      </div>
  );
}

export default App;

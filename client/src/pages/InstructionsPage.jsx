import { Link } from 'react-router-dom';
import GameRules from '../components/GameRules.jsx';
import { useAuth } from '../auth/useAuth.js';

/**
 * Public instructions — exam: anonymous visitors see rules only.
 * No network/map API calls on this page.
 */
export default function InstructionsPage() {
  const { user } = useAuth();

  return (
    <div className="page instructions-page">
      <div className="instructions-layout">
        <section className="instructions-main">
          <h1>How to play</h1>
          <p className="lead">
            Plan your route. Beat the clock. Beat your best score.
          </p>

          <ol className="instructions-list">
            <li>
              <strong>Setup</strong> — After logging in, study the full metro map
              with all lines and connections. Press start when you are ready.
            </li>
            <li>
              <strong>Planning</strong> — The map hides line connections. You receive a
              random start and destination (at least 3 segments apart). You have{' '}
              <strong>90 seconds</strong> to pick segments from the full list and build
              a route. Submit before time runs out (or your partial route is sent
              automatically).
            </li>
            <li>
              <strong>Execution</strong> — The server validates your route. For each leg,
              a random event changes your coins. The app shows one step at a time.
            </li>
            <li>
              <strong>Result</strong> — Your final score is the coins left. Start a new
              game or check the ranking for your best score.
            </li>
          </ol>

          <p className="anonymous-note">
            Visitors without an account can read these instructions only — the network
            map and game are available after login.
          </p>

          <div className="instructions-cta">
            {user ? (
              <Link to="/game" className="btn-primary">
                Go to Play
              </Link>
            ) : (
              <Link to="/login" className="btn-primary">
                Log in to play
              </Link>
            )}
          </div>
        </section>

        <GameRules />
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import CoinAmount from '../icons/CoinAmount.jsx';

export default function ResultPhase({ result, game, onPlayAgain, replaying }) {
  const valid = result?.valid === true;
  const score = result?.finalScore ?? 0;

  return (
    <div className="game-phase result-phase">
      <h2>{valid ? 'Run complete!' : 'Game over'}</h2>

      {!valid ? (
        <p className="result-invalid">
          Your route was incomplete or invalid. You lose all 20 coins — final score{' '}
          <CoinAmount value={0} size={18} className="coin-amount-inline" />
        </p>
      ) : null}

      <p className="final-score">
        Final score:{' '}
        <CoinAmount value={score} size={26} className="final-score-amount" />
      </p>

      {game ? (
        <p className="result-summary">
          {game.start} → {game.destination}
          {valid && result?.steps ? ` · ${result.steps.length} legs` : ''}
        </p>
      ) : null}

      <div className="result-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={onPlayAgain}
          disabled={replaying}
        >
          {replaying ? 'Starting…' : 'Play again'}
        </button>
        <Link to="/ranking" className="btn-secondary">
          View ranking
        </Link>
      </div>
    </div>
  );
}

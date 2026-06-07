import { Link } from 'react-router-dom';

export default function ResultPhase({ result, game, onPlayAgain, replaying }) {
  const valid = result?.valid === true;
  const score = result?.finalScore ?? 0;

  return (
    <div className="game-phase result-phase">
      <h2>{valid ? 'Run complete!' : 'Game over'}</h2>

      {!valid ? (
        <p className="result-invalid">
          Your route was incomplete or invalid. You lose all 20 coins — final score{' '}
          <strong>0</strong>.
        </p>
      ) : null}

      <p className="final-score">
        Final score: <strong>{score}</strong> coins
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

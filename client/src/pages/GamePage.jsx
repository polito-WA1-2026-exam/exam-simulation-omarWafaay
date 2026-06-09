import { useCallback, useEffect, useState } from 'react';
import {
  beginPlanning,
  createGame,
  fetchNetworkFull,
} from '../api/gameApi.js';
import ExecutionPhase from '../components/game/ExecutionPhase.jsx';
import PlanningPhase from '../components/game/PlanningPhase.jsx';
import ResultPhase from '../components/game/ResultPhase.jsx';
import SetupPhase from '../components/game/SetupPhase.jsx';

export default function GamePage() {
  const [phase, setPhase] = useState('loading');
  const [game, setGame] = useState(null);
  const [network, setNetwork] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const startNewGame = useCallback(async () => {
    setError('');
    setRouteResult(null);
    setPhase('loading');
    setBusy(true);

    const [gameRes, netRes] = await Promise.all([
      createGame(),
      fetchNetworkFull(),
    ]);
    setBusy(false);

    if (gameRes.status !== 201) {
      setError('Could not start a new game.');
      setPhase('error');
      return;
    }
    if (netRes.status !== 200) {
      setError('Could not load network map.');
      setPhase('error');
      return;
    }

    setGame(gameRes.data);
    setNetwork(netRes.data);
    setPhase('setup');
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  async function handleStartPlanning() {
    if (!game) return;
    setBusy(true);
    setError('');

    const res = await beginPlanning(game.id);
    setBusy(false);

    if (res.status === 409) {
      setError('Game is not in setup phase.');
      return;
    }
    if (res.status !== 200) {
      setError('Could not start planning.');
      return;
    }

    setGame(res.data);
    setPhase('planning');
  }

  function handleRouteComplete(result) {
    setRouteResult(result);
    if (result.valid && Array.isArray(result.steps) && result.steps.length > 0) {
      setPhase('execution');
    } else {
      setPhase('result');
    }
  }

  if (phase === 'loading') {
    return (
      <div className="page game-page">
        <p className="page-message">Loading game…</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="page game-page">
        <p className="form-error">{error}</p>
        <button type="button" className="btn-primary" onClick={startNewGame}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page game-page">
      {error ? <p className="form-error">{error}</p> : null}

      {phase === 'setup' ? (
        <SetupPhase
          network={network}
          onStart={handleStartPlanning}
          starting={busy}
        />
      ) : null}

      {phase === 'planning' && game ? (
        <PlanningPhase
          game={game}
          onComplete={handleRouteComplete}
          onError={(msg) => {
            setError(msg);
            setPhase('error');
          }}
        />
      ) : null}

      {phase === 'execution' && routeResult?.steps ? (
        <ExecutionPhase
          steps={routeResult.steps}
          onFinish={() => setPhase('result')}
        />
      ) : null}

      {phase === 'result' ? (
        <ResultPhase
          result={routeResult}
          game={game}
          onPlayAgain={startNewGame}
          replaying={busy}
        />
      ) : null}
    </div>
  );
}

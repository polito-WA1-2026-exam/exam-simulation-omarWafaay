import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRanking } from '../api/gameApi.js';
import { useAuth } from '../auth/useAuth.js';
import CoinAmount from '../components/icons/CoinAmount.jsx';
import { RankPlace } from '../components/ranking/RankingIcons.jsx';

function RankingSummary({ rows, username }) {
  const myIndex = rows.findIndex((r) => r.username === username);
  if (myIndex < 0) return null;

  const me = rows[myIndex];
  const leader = rows[0];
  const gap = leader.bestScore - me.bestScore;

  return (
    <div className="panel ranking-summary">
      <p className="ranking-summary-row">
        Your best: <CoinAmount value={me.bestScore} size={22} />
      </p>
      <p className="ranking-summary-row">
        Rank <strong>#{myIndex + 1}</strong> of {rows.length}
      </p>
      {myIndex === 0 ? (
        <p className="ranking-summary-note">You are in 1st place.</p>
      ) : (
        <p className="ranking-summary-note">
          <CoinAmount value={gap} size={16} /> behind {leader.username}
        </p>
      )}
    </div>
  );
}

export default function RankingPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    const res = await fetchRanking();
    setLoading(false);

    if (res.status !== 200 || !Array.isArray(res.data)) {
      setError('Could not load ranking.');
      return;
    }
    setRows(res.data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="page ranking-page">
        <p className="page-message">Loading ranking…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page ranking-page">
        <p className="form-error">{error}</p>
        <button type="button" className="btn-primary" onClick={load}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="page ranking-page">
      <h1>Leaderboard</h1>
      <p className="phase-hint">Best score per player — coins left after a completed run.</p>

      {rows.length === 0 ? (
        <div className="panel ranking-empty">
          <p className="page-message">No completed games yet.</p>
          <Link to="/game" className="btn-primary">
            Play your first run
          </Link>
        </div>
      ) : (
        <div className="page-body">
          <RankingSummary rows={rows} username={user?.username} />

          <table className="ranking-table">
            <thead>
              <tr>
                <th scope="col">Place</th>
                <th scope="col">Player</th>
                <th scope="col" className="col-num">Coins</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const place = index + 1;
                const isSelf = row.username === user?.username;

                return (
                  <tr
                    key={row.username}
                    className={isSelf ? 'ranking-row-self' : ''}
                    data-place={place <= 3 ? place : undefined}
                  >
                    <td className="col-place">
                      <RankPlace place={place} />
                    </td>
                    <td>
                      {row.username}
                      {isSelf ? <span className="badge-you">You</span> : null}
                    </td>
                    <td className="col-num">
                      <CoinAmount value={row.bestScore} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 ? (
        <p className="page-actions">
          <Link to="/game" className="btn-secondary">
            Play again
          </Link>
        </p>
      ) : null}
    </div>
  );
}

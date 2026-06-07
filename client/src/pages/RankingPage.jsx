import { useCallback, useEffect, useState } from 'react';
import { fetchRanking } from '../api/gameApi.js';
import { useAuth } from '../auth/useAuth.js';

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
    return <p className="page-message">Loading ranking…</p>;
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
      <h1>Ranking (best score)</h1>
      <p className="phase-hint">Only each player&apos;s best completed game is shown.</p>

      {rows.length === 0 ? (
        <p className="page-message">No completed games yet.</p>
      ) : (
        <table className="ranking-table">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Player</th>
              <th scope="col">Best score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.username}
                className={row.username === user?.username ? 'ranking-row-self' : ''}
              >
                <td>{index + 1}</td>
                <td>{row.username}</td>
                <td>{row.bestScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/** Setup — full network from GET /api/network?view=full */
export default function SetupPhase({ network, onStart, starting }) {
  return (
    <div className="game-phase setup-phase">
      <h2>Study the network</h2>
      <p className="phase-hint">
        Review all lines and connections. When you are ready, start planning.
      </p>

      <div className="network-full">
        {network?.lines?.map((line) => (
          <section key={line.id} className="line-block">
            <h3>{line.name}</h3>
            <p className="line-stations">
              {line.stations.map((s) => s.name).join(' → ')}
            </p>
          </section>
        ))}
      </div>

      <details className="segments-details">
        <summary>All segments ({network?.segments?.length ?? 0})</summary>
        <ul className="segment-pairs-list">
          {network?.segments?.map((seg) => (
            <li key={`${seg.fromId}-${seg.toId}`}>
              {seg.from} — {seg.to}
            </li>
          ))}
        </ul>
      </details>

      <button
        type="button"
        className="btn-primary"
        onClick={onStart}
        disabled={starting}
      >
        {starting ? 'Starting…' : 'Start game'}
      </button>
    </div>
  );
}

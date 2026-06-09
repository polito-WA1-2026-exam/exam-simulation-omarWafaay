/** Setup — full network from GET /api/network?view=full */
import { lineColorClass } from '../../utils/lineColor.js';

export default function SetupPhase({ network, onStart, starting }) {
  return (
    <div className="game-phase setup-phase">
      <h2>Study the network</h2>
      <p className="phase-hint">
        Review all lines and connections. When you are ready, start planning.
      </p>

      <div className="network-full">
        {network?.lines?.map((line) => (
          <section
            key={line.id}
            className={`line-block ${lineColorClass(line.name)}`}
          >
            <h3>{line.name}</h3>
            <p className="line-stations">
              {line.stations.map((s, i) => (
                <span key={s.id}>
                  {i > 0 ? <span className="station-connector">—</span> : null}
                  <span className="station-node">{s.name}</span>
                </span>
              ))}
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

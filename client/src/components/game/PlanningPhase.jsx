import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchNetworkPlanning, fetchSegments, submitRoute } from '../../api/gameApi.js';
import { segmentKey } from '../../utils/segmentKey.js';

function formatTime(msLeft) {
  const total = Math.max(0, Math.ceil(msLeft / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function PlanningPhase({ game, onComplete, onError }) {
  const [stations, setStations] = useState([]);
  const [allSegments, setAllSegments] = useState([]);
  const [route, setRoute] = useState([]);
  const [msLeft, setMsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const autoSubmitted = useRef(false);
  const submittingRef = useRef(false);

  const deadline = new Date(game.planningDeadline).getTime();

  const nameById = useMemo(() => {
    const map = {};
    for (const s of stations) map[s.id] = s.name;
    for (const seg of allSegments) {
      map[seg.fromId] = seg.from;
      map[seg.toId] = seg.to;
    }
    return map;
  }, [stations, allSegments]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [planRes, segRes] = await Promise.all([
        fetchNetworkPlanning(),
        fetchSegments(),
      ]);
      if (cancelled) return;
      if (planRes.status !== 200 || segRes.status !== 200) {
        setLoadError('Could not load planning data.');
        return;
      }
      setStations(planRes.data.stations ?? []);
      setAllSegments(segRes.data.segments ?? []);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const doSubmit = useCallback(
    async (segments) => {
      if (submittingRef.current || autoSubmitted.current) return;
      autoSubmitted.current = true;
      submittingRef.current = true;
      setSubmitting(true);

      const res = await submitRoute(game.id, segments);
      submittingRef.current = false;
      setSubmitting(false);

      if (res.status === 409 && res.data?.error === 'PLANNING_EXPIRED') {
        onError('Planning time expired before the route was received.');
        return;
      }
      if (res.status !== 200) {
        onError('Could not submit route.');
        return;
      }
      onComplete(res.data);
    },
    [game.id, onComplete, onError]
  );

  useEffect(() => {
    const tick = () => {
      const left = deadline - Date.now();
      setMsLeft(left);
      if (left <= 0 && !autoSubmitted.current) {
        doSubmit(route);
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [deadline, route, doSubmit]);

  /** Pick travel direction: connect to previous leg, or start at assigned station when first. */
  function orientLeg(seg) {
    const { fromId, toId } = seg;
    if (route.length === 0) {
      if (fromId === game.startStationId) return [fromId, toId];
      if (toId === game.startStationId) return [toId, fromId];
      return [fromId, toId];
    }
    const prevTo = route[route.length - 1][1];
    if (fromId === prevTo) return [fromId, toId];
    if (toId === prevTo) return [toId, fromId];
    return [fromId, toId];
  }

  function addSegment(seg) {
    const leg = orientLeg(seg);
    const key = segmentKey(leg[0], leg[1]);
    if (route.some(([a, b]) => segmentKey(a, b) === key)) return;
    setRoute((old) => [...old, leg]);
  }

  function removeLeg(index) {
    setRoute((old) => old.filter((_, i) => i !== index));
  }

  function legLabel([fromId, toId]) {
    return `${nameById[fromId] ?? fromId} → ${nameById[toId] ?? toId}`;
  }

  if (loadError) {
    return <p className="form-error">{loadError}</p>;
  }
  const WARNING_MS = 30000;
  const URGENT_MS = 10000;
  const timerClass =
    msLeft <= URGENT_MS ? 'timer-urgent' : msLeft <= WARNING_MS ? 'timer-warning' : '';

  return (
    <div className="game-phase planning-phase">
      <div className="planning-header">
        <div className="mission-box">
          <h2>Your mission</h2>
          <p>
            <strong>Start:</strong> {game.start} ({game.startStationId})
          </p>
          <p>
            <strong>Destination:</strong> {game.destination} ({game.destinationStationId})
          </p>
        </div>
        <div className={`timer-box ${timerClass}`}>
          <span className="timer-label">Time left</span>
          <span className="timer-value">{formatTime(msLeft)}</span>
        </div>
      </div>

      <div className="planning-grid">
        <section>
          <h3>Stations (connections hidden)</h3>
          <div className="station-chips">
            {stations.map((s) => (
              <span
                key={s.id}
                className={`station-chip ${
                  s.id === game.startStationId ? 'station-start' : ''
                } ${s.id === game.destinationStationId ? 'station-dest' : ''}`}
              >
                {s.name}
              </span>
            ))}
          </div>

          <h3>Your route ({route.length} legs)</h3>
          {route.length === 0 ? (
            <p className="phase-hint">Click segments below to build your route.</p>
          ) : (
            <ul className="route-chips">
              {route.map((leg, i) => (
                <li key={`${leg[0]}-${leg[1]}-${i}`}>
                  {legLabel(leg)}
                  <button
                    type="button"
                    className="chip-remove"
                    onClick={() => removeLeg(i)}
                    disabled={submitting}
                    aria-label="Remove leg"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="btn-primary"
            onClick={() => doSubmit(route)}
            disabled={submitting || msLeft <= 0}
          >
            {submitting ? 'Submitting…' : 'Submit route'}
          </button>
        </section>

        <section>
          <h3>All segments</h3>
          <ul className="segment-pick-list">
            {allSegments.map((seg) => {
              const used = route.some(
                ([a, b]) => segmentKey(a, b) === segmentKey(seg.fromId, seg.toId)
              );
              return (
                <li key={`${seg.fromId}-${seg.toId}`}>
                  <button
                    type="button"
                    className="segment-pick-btn"
                    onClick={() => addSegment(seg)}
                    disabled={submitting || used}
                  >
                    {seg.from} — {seg.to}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

import { all } from '../db.js';

const MIN_SEGMENTS = 3;

/** Undirected segment key for duplicate detection (exam: each segment at most once). */
export function segmentKey(fromId, toId) {
  const lo = Math.min(fromId, toId);
  const hi = Math.max(fromId, toId);
  return `${lo}-${hi}`;
}

async function loadNetworkContext() {
  const segments = await all('SELECT station_a_id, station_b_id FROM segments');
  const segmentSet = new Set(
    segments.map((s) => `${s.station_a_id}-${s.station_b_id}`)
  );

  const lineRows = await all(
    `SELECT sl.line_id AS lineId, sl.station_id AS stationId, sl.position
     FROM station_lines sl
     ORDER BY sl.line_id, sl.position`
  );

  const byLine = new Map();
  for (const row of lineRows) {
    if (!byLine.has(row.lineId)) byLine.set(row.lineId, []);
    byLine.get(row.lineId).push(row);
  }

  const linesForSegment = (fromId, toId) => {
    const lo = Math.min(fromId, toId);
    const hi = Math.max(fromId, toId);
    const result = new Set();
    for (const ordered of byLine.values()) {
      for (let i = 0; i < ordered.length - 1; i++) {
        const a = ordered[i].stationId;
        const b = ordered[i + 1].stationId;
        if (Math.min(a, b) === lo && Math.max(a, b) === hi) {
          result.add(ordered[0].lineId);
        }
      }
    }
    return result;
  };

  const interchangeRows = await all(
    `SELECT station_id AS id
     FROM station_lines
     GROUP BY station_id
     HAVING COUNT(DISTINCT line_id) > 1`
  );
  const interchangeIds = new Set(interchangeRows.map((r) => r.id));

  const hasSegment = (a, b) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return segmentSet.has(`${lo}-${hi}`);
  };

  return { hasSegment, linesForSegment, interchangeIds };
}

/**
 * Validate a submitted route (station ID pairs).
 * @param {{ startStationId: number, destinationStationId: number, segments: number[][] }} input
 * @returns {Promise<boolean>}
 */
export async function isValidRoute({ startStationId, destinationStationId, segments }) {
  const { hasSegment, linesForSegment, interchangeIds } = await loadNetworkContext();

  if (!Array.isArray(segments) || segments.length === 0) {
    return false;
  }

  if (segments.length < MIN_SEGMENTS) {
    return false;
  }

  const [firstFrom] = segments[0];
  const lastLeg = segments[segments.length - 1];
  const lastTo = lastLeg[1];

  if (firstFrom !== startStationId || lastTo !== destinationStationId) {
    return false;
  }

  const usedSegments = new Set();
  let prevTo = null;
  for (const leg of segments) {
    if (!Array.isArray(leg) || leg.length !== 2) return false;
    const [fromId, toId] = leg;
    if (!Number.isInteger(fromId) || !Number.isInteger(toId)) return false;
    if (!hasSegment(fromId, toId)) return false;
    const key = segmentKey(fromId, toId);
    if (usedSegments.has(key)) return false;
    usedSegments.add(key);
    if (prevTo !== null && fromId !== prevTo) return false;
    prevTo = toId;
  }

  for (let i = 0; i < segments.length - 1; i++) {
    const [a1, b1] = segments[i];
    const [a2, b2] = segments[i + 1];
    if (a2 !== b1) continue;
    const shared = [...linesForSegment(a1, b1)].filter((lineId) =>
      linesForSegment(a2, b2).has(lineId)
    );
    if (shared.length === 0 && !interchangeIds.has(b1)) {
      return false;
    }
  }

  return true;
}

/**
 * Find one valid route between start and destination (for tests / tooling).
 * @returns {Promise<number[][] | null>}
 */
export async function findValidRouteSegments(startStationId, destinationStationId) {
  const ctx = await loadNetworkContext();
  const segmentRows = await all('SELECT station_a_id, station_b_id FROM segments');
  const adj = new Map();
  for (const { station_a_id: a, station_b_id: b } of segmentRows) {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
  }

  function legAllowed(legs, fromId, toId) {
    if (!ctx.hasSegment(fromId, toId)) return false;
    if (legs.length === 0) return true;
    const [a1, b1] = legs[legs.length - 1];
    const shared = [...ctx.linesForSegment(a1, b1)].filter((lineId) =>
      ctx.linesForSegment(fromId, toId).has(lineId)
    );
    if (shared.length === 0 && !ctx.interchangeIds.has(b1)) return false;
    return true;
  }

  // Exam: same station may repeat; each undirected segment may be used only once.
  function dfs(current, legs, usedSegments) {
    if (current === destinationStationId && legs.length >= MIN_SEGMENTS) {
      return legs;
    }
    if (legs.length >= 14) return null;

    for (const next of adj.get(current) ?? []) {
      const key = segmentKey(current, next);
      if (usedSegments.has(key)) continue;
      if (!legAllowed(legs, current, next)) continue;
      const nextUsed = new Set(usedSegments);
      nextUsed.add(key);
      const found = dfs(next, [...legs, [current, next]], nextUsed);
      if (found) return found;
    }
    return null;
  }

  return dfs(startStationId, [], new Set());
}

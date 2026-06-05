/**
 * Random start and destination for a new planning phase.
 * Exam: dest reachable from start with at least 3 segments on the shortest path.
 */
import { all } from '../db.js';

/** Undirected adjacency from segments table (station_a_id, station_b_id). */
function buildGraph(segmentRows) {
  const adj = new Map();
  const addEdge = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
  };
  for (const { station_a_id: a, station_b_id: b } of segmentRows) {
    addEdge(a, b);
  }
  return adj;
}

/** Shortest path length in edges (BFS). Returns -1 if unreachable. */
function shortestPathLength(adj, start, dest) {
  if (start === dest) return 0;
  const queue = [[start, 0]];
  const seen = new Set([start]);
  while (queue.length) {
    const [node, dist] = queue.shift();
    for (const next of adj.get(node) ?? []) {
      if (next === dest) return dist + 1;
      if (!seen.has(next)) {
        seen.add(next);
        queue.push([next, dist + 1]);
      }
    }
  }
  return -1;
}

/**
 * Pick random pair until shortest path has ≥ 3 edges.
 * Example from exam: Centrale→Porta Velaria→Crocevia→Piazza = 3 segments, 4 stops.
 */
export async function pickStartAndDestination() {
  const segments = await all('SELECT station_a_id, station_b_id FROM segments');
  const stations = await all('SELECT id FROM stations');
  const adj = buildGraph(segments);
  const ids = stations.map((s) => s.id);
  const maxAttempts = 500;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const start = ids[Math.floor(Math.random() * ids.length)];
    const dest = ids[Math.floor(Math.random() * ids.length)];
    if (dest === start) continue;
    const hops = shortestPathLength(adj, start, dest);
    if (hops >= 3) {
      return { startStationId: start, destinationStationId: dest };
    }
  }

  throw new Error('Could not find start/destination pair with at least 3 hops');
}

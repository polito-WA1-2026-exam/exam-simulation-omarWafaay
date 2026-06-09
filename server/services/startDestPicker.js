/**
 * When planning starts, the server must pick a random start station and destination.
 *
 * Exam rule: they must be reachable and the *shortest* path between them must use
 * at least 3 segments (e.g. Green Park → Regent Street → Piccadilly → Covent Garden).
 */
import { all } from '../db.js';

// Read all rows from segments and build a graph: station id → set of neighbour ids.
// Segments are undirected, so we add both directions.
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

// How many edges on the shortest path from start to dest? BFS.
// Returns -1 if there is no path at all.
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
 * Keep drawing random pairs until we find one at least 3 hops apart.
 * 500 tries is plenty for our seeded network.
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

/** Same undirected key as server routeValidator — for duplicate checks in the route builder. */
export function segmentKey(fromId, toId) {
  const lo = Math.min(fromId, toId);
  const hi = Math.max(fromId, toId);
  return `${lo}-${hi}`;
}

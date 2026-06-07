import { apiFetch } from './client.js';

export function createGame() {
  return apiFetch('/api/games', { method: 'POST' });
}

export function beginPlanning(gameId) {
  return apiFetch(`/api/games/${gameId}/planning`, { method: 'POST' });
}

export function submitRoute(gameId, segments) {
  return apiFetch(`/api/games/${gameId}/route`, {
    method: 'PUT',
    body: { segments },
  });
}

export function fetchNetworkFull() {
  return apiFetch('/api/network?view=full');
}

export function fetchNetworkPlanning() {
  return apiFetch('/api/network?view=planning');
}

export function fetchSegments() {
  return apiFetch('/api/segments');
}

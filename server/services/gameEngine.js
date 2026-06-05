/**
 * Execution phase (server-side): random event per leg, persist steps, compute score.
 * Exam: start 20 coins; invalid routes never call this (score 0, no steps).
 */
import { all, get, run } from '../db.js';
import { GameStep } from '../LastRaceModels.js';

const STARTING_COINS = 20;

async function getStationNames() {
  const rows = await all('SELECT id, name FROM stations');
  return Object.fromEntries(rows.map((r) => [r.id, r.name]));
}

async function pickRandomEvent() {
  return get(
    'SELECT id, description, effect FROM events ORDER BY RANDOM() LIMIT 1'
  );
}

/**
 * @param {number} gameId
 * @param {number[][]} routeSegments ordered [fromId, toId] pairs
 * @returns steps for API + finalScore (clamped ≥ 0)
 */
export async function executeRoute(gameId, routeSegments) {
  const names = await getStationNames();
  let coins = STARTING_COINS;
  const steps = [];

  for (let i = 0; i < routeSegments.length; i++) {
    const [fromId, toId] = routeSegments[i];
    const eventRow = await pickRandomEvent();
    coins += eventRow.effect;
    const order = i + 1;

    await run(
      `INSERT INTO game_steps (game_id, step_order, from_station_id, to_station_id, event_id, coins_after)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [gameId, order, fromId, toId, eventRow.id, coins]
    );

    steps.push(
      new GameStep(
        order,
        fromId,
        toId,
        names[fromId],
        names[toId],
        { description: eventRow.description, effect: eventRow.effect },
        coins
      )
    );
  }

  const finalScore = Math.max(0, coins);
  return { finalScore, steps };
}

export { STARTING_COINS };

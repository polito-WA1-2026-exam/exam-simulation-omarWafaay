/**
 * The "execution" phase on the server.
 *
 * The exam says: for each leg of a *valid* route, pick a random event and update coins.
 * The React app then shows those steps one by one — we return the full list in one response.
 * If the route was invalid, gameDao never calls this (score stays 0, no rows in game_steps).
 */
import { all, get, run } from '../db.js';
import { GameStep } from '../LastRaceModels.js';

const STARTING_COINS = 20;

// Same helper as gameDao: id → name for the JSON the client displays.
async function getStationNames() {
  const rows = await all('SELECT id, name FROM stations');
  return Object.fromEntries(rows.map((r) => [r.id, r.name]));
}

// One random row from the events table — exam says events are server-side only.
async function pickRandomEvent() {
  return get(
    'SELECT id, description, effect FROM events ORDER BY RANDOM() LIMIT 1'
  );
}

/**
 * Walk the route in order: apply an event per leg, save to game_steps, build steps[] for the API.
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

    // Persist so GET /api/games/:id can reload the same playback later.
    await run(
      `INSERT INTO game_steps (game_id, step_order, from_station_id, to_station_id, event_id, coins_after)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [gameId, order, fromId, toId, eventRow.id, coins]
    );

    // What the client needs to animate one step (ids + names + event text + running total).
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

  // Exam: if coins go negative, store and show 0.
  const finalScore = Math.max(0, coins);
  return { finalScore, steps };
}

export { STARTING_COINS };

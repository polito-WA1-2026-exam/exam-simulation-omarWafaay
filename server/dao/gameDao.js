/**
 * Game lifecycle: create, planning, route submit, read back.
 * Orchestrates startDestPicker, routeValidator, and gameEngine (exam rules live there).
 */
import { all, get, run } from '../db.js';
import { Game, GameStep } from '../LastRaceModels.js';
import { pickStartAndDestination } from '../services/startDestPicker.js';
import { isValidRoute } from '../services/routeValidator.js';
import { executeRoute, STARTING_COINS } from '../services/gameEngine.js';

/** Exam: 90 seconds planning; client shows countdown from planningDeadline. */
const PLANNING_SECONDS = 90;
/** Our extension: reject PUT slightly after deadline (not in exam text). */
const PLANNING_GRACE_MS = 5000;

async function getStationNames() {
  const rows = await all('SELECT id, name FROM stations');
  return Object.fromEntries(rows.map((r) => [r.id, r.name]));
}

function planningDeadlineFromRow(row) {
  if (!row.planning_started_at) return null;
  const start = new Date(row.planning_started_at);
  return new Date(start.getTime() + PLANNING_SECONDS * 1000).toISOString();
}

function isPlanningExpired(row) {
  if (!row.planning_started_at) return false;
  const deadline = new Date(planningDeadlineFromRow(row));
  return Date.now() > deadline.getTime() + PLANNING_GRACE_MS;
}

/** Owner-only: wrong user gets null → HTTP 404 (do not leak other users' games). */
async function loadOwnedGame(gameId, userId) {
  const row = await get(
    `SELECT g.*, sa.name AS start_name, sb.name AS dest_name
     FROM games g
     LEFT JOIN stations sa ON sa.id = g.start_station_id
     LEFT JOIN stations sb ON sb.id = g.dest_station_id
     WHERE g.id = ? AND g.user_id = ?`,
    [gameId, userId]
  );
  return row ?? null;
}

function toGameResponse(row, { includeSteps = false, steps = [] } = {}) {
  if (row.status === 'setup') {
    return new Game(row.id, 'setup', STARTING_COINS, null, null, null, null, null);
  }

  if (row.status === 'planning') {
    return new Game(
      row.id,
      'planning',
      STARTING_COINS,
      row.start_station_id,
      row.dest_station_id,
      row.start_name,
      row.dest_name,
      planningDeadlineFromRow(row)
    );
  }

  if (row.status === 'completed') {
    const completed = {
      id: row.id,
      status: 'completed',
      finalScore: row.final_score,
    };
    if (includeSteps && steps.length) {
      completed.steps = steps;
    }
    return completed;
  }

  return { id: row.id, status: row.status };
}

async function loadGameSteps(gameId) {
  const rows = await all(
    `SELECT gs.step_order AS "order",
            gs.from_station_id AS fromStationId,
            gs.to_station_id AS toStationId,
            sa.name AS fromName,
            sb.name AS toName,
            e.description,
            e.effect,
            gs.coins_after AS coinsAfter
     FROM game_steps gs
     JOIN stations sa ON sa.id = gs.from_station_id
     JOIN stations sb ON sb.id = gs.to_station_id
     JOIN events e ON e.id = gs.event_id
     WHERE gs.game_id = ?
     ORDER BY gs.step_order`,
    [gameId]
  );
  return rows.map(
    (r) =>
      new GameStep(
        r.order,
        r.fromStationId,
        r.toStationId,
        r.fromName,
        r.toName,
        { description: r.description, effect: r.effect },
        r.coinsAfter
      )
  );
}

/** Exam setup phase: no start/dest yet (NULL in DB until planning). */
export async function createGame(userId) {
  const { lastID } = await run(
    `INSERT INTO games (user_id, start_station_id, dest_station_id, status)
     VALUES (?, NULL, NULL, 'setup')`,
    [userId]
  );
  return new Game(lastID, 'setup', STARTING_COINS, null, null, null, null, null);
}

/** Exam planning phase: server picks start/dest and starts the 90s window. */
export async function beginPlanning(gameId, userId) {
  const row = await loadOwnedGame(gameId, userId);
  if (!row) return { error: 'NOT_FOUND' };
  if (row.status !== 'setup') return { error: 'INVALID_STATE' };

  const { startStationId, destinationStationId } = await pickStartAndDestination();
  const names = await getStationNames();
  const startedAt = new Date().toISOString();

  await run(
    `UPDATE games
     SET status = 'planning',
         start_station_id = ?,
         dest_station_id = ?,
         planning_started_at = ?
     WHERE id = ?`,
    [startStationId, destinationStationId, startedAt, gameId]
  );

  return {
    game: new Game(
      gameId,
      'planning',
      STARTING_COINS,
      startStationId,
      destinationStationId,
      names[startStationId],
      names[destinationStationId],
      planningDeadlineFromRow({ planning_started_at: startedAt })
    ),
  };
}

export async function getGame(gameId, userId) {
  const row = await loadOwnedGame(gameId, userId);
  if (!row) return { error: 'NOT_FOUND' };

  if (row.status === 'completed') {
    const steps = await loadGameSteps(gameId);
    return {
      game: {
        id: row.id,
        status: 'completed',
        finalScore: row.final_score,
        ...(steps.length ? { steps } : {}),
      },
    };
  }

  return { game: toGameResponse(row) };
}

/**
 * Exam: validate on submit (after 90s or before). Invalid → score 0, no steps.
 * Valid → random event per leg, return all steps for client animation.
 */
export async function submitRoute(gameId, userId, segments) {
  const row = await loadOwnedGame(gameId, userId);
  if (!row) return { error: 'NOT_FOUND' };
  if (row.status !== 'planning') return { error: 'INVALID_STATE' };
  if (isPlanningExpired(row)) return { error: 'PLANNING_EXPIRED' };

  const routeJson = JSON.stringify(segments);
  const valid = await isValidRoute({
    startStationId: row.start_station_id,
    destinationStationId: row.dest_station_id,
    segments,
  });

  if (!valid) {
    await run(
      `UPDATE games
       SET status = 'completed',
           route_json = ?,
           final_score = 0
       WHERE id = ?`,
      [routeJson, gameId]
    );
    return {
      result: {
        valid: false,
        finalScore: 0,
        status: 'completed',
      },
    };
  }

  const { finalScore, steps } = await executeRoute(gameId, segments);
  await run(
    `UPDATE games
     SET status = 'completed',
         route_json = ?,
         final_score = ?
     WHERE id = ?`,
    [routeJson, finalScore, gameId]
  );

  return {
    result: {
      valid: true,
      status: 'completed',
      finalScore,
      steps,
    },
  };
}

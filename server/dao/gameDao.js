/**
 * Everything about playing a game lives here: create, start planning, submit route, read back.
 * The actual exam rules (is the route OK? what score?) are in the service files —
 * this file just talks to SQLite and ties the steps together.
 */
import { all, get, run } from '../db.js';
import { Game, GameStep } from '../LastRaceModels.js';
import { pickStartAndDestination } from '../services/startDestPicker.js';
import { isValidRoute } from '../services/routeValidator.js';
import { executeRoute, STARTING_COINS } from '../services/gameEngine.js';

// The exam gives the player 90 seconds to plan. The React app shows a countdown;
// we store when planning started and send back planningDeadline (= start + 90s).
const PLANNING_SECONDS = 90;

// Turn station rows into { 1: "Green Park", 6: "Hyde Park Corner", ... } for API responses.
async function getStationNames() {
  const rows = await all('SELECT id, name FROM stations');
  return Object.fromEntries(rows.map((r) => [r.id, r.name]));
}

// Client needs an ISO timestamp for the timer: when did planning start + 90s.
function planningDeadlineFromRow(row) {
  if (!row.planning_started_at) return null;
  const start = new Date(row.planning_started_at);
  return new Date(start.getTime() + PLANNING_SECONDS * 1000).toISOString();
}

// True once the 90s window has passed (exam: no submissions after the deadline).
function isPlanningExpired(row) {
  if (!row.planning_started_at) return false;
  const deadline = new Date(planningDeadlineFromRow(row));
  return Date.now() > deadline.getTime();
}

// Load one game only if it belongs to this user. We return null for wrong owner
// so the route handler can answer 404 — we never tell player2 that player1's game exists.
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

// Build the JSON shape the client expects for setup / planning / completed.
function toGameResponse(row, { includeSteps = false, steps = [] } = {}) {
  if (row.status === 'setup') {
    // Setup: player sees the full map; no start/dest yet.
    return new Game(row.id, 'setup', STARTING_COINS, null, null, null, null, null);
  }

  if (row.status === 'planning') {
    // Planning: include assigned stations (ids + names) and when time runs out.
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

// Read execution history from game_steps and wrap each row as a GameStep model.
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

/**
 * POST /api/games — player is on the setup screen (full map, not playing yet).
 * Start/dest stay NULL in the database until they call planning.
 */
export async function createGame(userId) {
  const { lastID } = await run(
    `INSERT INTO games (user_id, start_station_id, dest_station_id, status)
     VALUES (?, NULL, NULL, 'setup')`,
    [userId]
  );
  return new Game(lastID, 'setup', STARTING_COINS, null, null, null, null, null);
}

/**
 * POST /api/games/:id/planning — player clicked "ready".
 * Server picks random start + destination (at least 3 segments apart) and starts the clock.
 */
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

/**
 * GET /api/games/:id — whatever the client needs for the current phase.
 * Finished games also load steps from the DB so the result screen can replay them.
 */
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
 * PUT /api/games/:id/route — player submitted their route (or the timer auto-submitted).
 *
 * Flow:
 *  1. Check game is in planning and not too late.
 *  2. Ask routeValidator if the path is legal.
 *  3a. Bad path → score 0, no game_steps, status completed (exam: lose all 20 coins).
 *  3b. Good path → gameEngine runs events leg by leg, saves steps, returns them to React.
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
    // Still save what they sent (for debugging / audit) but no execution.
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

/**
 * GET /api/ranking — best score per user across all their completed games.
 *
 * Exam: registered users see a general ranking on a dedicated page.
 * We only include users who finished at least one game; sort highest score first.
 */
export async function getRanking() {
  const rows = await all(
    `SELECT u.username, MAX(g.final_score) AS bestScore
     FROM users u
     JOIN games g ON g.user_id = u.id AND g.status = 'completed'
     GROUP BY u.id
     ORDER BY bestScore DESC, u.username ASC`
  );
  return rows.map((row) => ({
    username: row.username,
    bestScore: row.bestScore,
  }));
}

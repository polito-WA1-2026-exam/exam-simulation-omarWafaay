/**

 * HTTP tests for game lifecycle APIs.

 *

 * Usage: node verify-games.mjs

 * Prerequisite: stop any server on port 3001 (this script starts its own).

 *

 * Each block below maps to the official exam text as captured in

 * docs/LAST-RACE-API-PLAN.md (Web Applications I 2025/26 — Exam #1 "Last Race").

 */

import { spawn } from 'child_process';

import { setTimeout as delay } from 'timers/promises';

import path from 'path';

import { fileURLToPath } from 'url';

import { attachToExistingDb, get, run } from './db.js';

import { findValidRouteSegments, isValidRoute } from './services/routeValidator.js';



const base = 'http://localhost:3001';

const cwd = path.dirname(fileURLToPath(import.meta.url));

const STARTING_COINS = 20;



// --- helpers: HTTP + session cookie ---



function parseCookies(setCookie) {

  if (!setCookie) return '';

  const headers = Array.isArray(setCookie) ? setCookie : [setCookie];

  return headers.map((h) => h.split(';')[0]).join('; ');

}



async function request(method, pathName, { body, cookie } = {}) {

  const headers = { Accept: 'application/json' };

  if (body) headers['Content-Type'] = 'application/json';

  if (cookie) headers.Cookie = cookie;



  const res = await fetch(`${base}${pathName}`, {

    method,

    headers,

    body: body ? JSON.stringify(body) : undefined,

  });

  const json = await res.json().catch(() => null);

  const setCookie = res.headers.getSetCookie?.() ?? res.headers.get('set-cookie');

  return { status: res.status, json, cookie: parseCookies(setCookie) };

}



async function waitForServer(child) {

  for (let i = 0; i < 75; i++) {

    try {

      if ((await fetch(`${base}/api/health`)).ok) return;

    } catch {

      /* wait */

    }

    await delay(200);

    if (child.exitCode !== null) throw new Error('Server exited early');

  }

  throw new Error('Server timeout');

}



async function login(username) {

  const res = await request('POST', '/api/sessions', {

    body: { username, password: 'password' },

  });

  if (!res.cookie) throw new Error(`login failed for ${username}`);

  return res.cookie;

}



// --- helpers: assert response shapes from the exam spec ---



/**

 * Exam §4 PUT /route — invalid route body example:

 *   { "valid": false, "finalScore": 0, "status": "completed" }

 * Exam §8 — invalid route: "no game_steps, final_score = 0, status = completed".

 */

function assertInvalidRouteResponse(json, fail) {

  if (json.valid !== false) {

    fail('invalid route should have valid:false');

    return;

  }

  if (json.finalScore !== 0) {

    fail('invalid route should have finalScore:0');

    return;

  }

  if (json.status !== 'completed') {

    fail('invalid route should have status:completed');

    return;

  }

  if (json.steps !== undefined) {

    fail('invalid route must not include steps');

  }

}



/**

 * Exam §4 — valid route steps[] item:

 *   order, fromStationId, toStationId, from, to,

 *   event: { description, effect }, coinsAfter

 * Exam §1 — "API responses: IDs + names for display".

 */

function assertStepShape(step, leg, order, fail) {

  const [fromId, toId] = leg;

  if (step.order !== order) fail(`step ${order}: wrong order field`);

  if (step.fromStationId !== fromId || step.toStationId !== toId) {

    fail(`step ${order}: station ids do not match submitted leg`);

  }

  if (!step.from || !step.to) fail(`step ${order}: missing from/to names`);

  if (!step.event || typeof step.event.description !== 'string') {

    fail(`step ${order}: missing event.description`);

  }

  if (typeof step.event.effect !== 'number') {

    fail(`step ${order}: event.effect must be a number`);

  }

  if (typeof step.coinsAfter !== 'number') fail(`step ${order}: missing coinsAfter`);

}



/**

 * Exam §1 — "Valid route → random event per leg on server" (steps returned in PUT response).

 * Exam §8 — "Start with 20 coins"; "final_score = max(0, coins)".

 * Exam §7 — route must have at least 3 legs (start/dest picker requires ≥ 3 hops).

 */

function assertValidRouteResponse(json, routeSegments, fail) {

  if (json.valid !== true) {

    fail('expected valid:true');

    return;

  }

  if (json.status !== 'completed') {

    fail('valid route should have status:completed');

    return;

  }

  if (!Array.isArray(json.steps)) {

    fail('expected steps array for valid route');

    return;

  }

  if (json.steps.length !== routeSegments.length) {

    fail(`expected steps length ${routeSegments.length}, got ${json.steps.length}`);

    return;

  }

  if (json.steps.length < 3) {

    fail(`expected at least 3 legs, got ${json.steps.length}`);

    return;

  }



  let coins = STARTING_COINS;

  for (let i = 0; i < json.steps.length; i++) {

    assertStepShape(json.steps[i], routeSegments[i], i + 1, fail);

    coins += json.steps[i].event.effect;

    if (json.steps[i].coinsAfter !== coins) {

      fail(`step ${i + 1}: coinsAfter ${json.steps[i].coinsAfter} ≠ expected ${coins}`);

      return;

    }

  }



  const expectedFinal = Math.max(0, coins);

  if (json.finalScore !== expectedFinal) {

    fail(`finalScore ${json.finalScore} ≠ expected ${expectedFinal}`);

  }

}

/** Insert a back-and-forth on leg index 1 to reuse the same undirected segment. */
function routeWithDuplicateSegment(route) {
  if (!route || route.length < 2) return null;
  const [a, b] = route[1];
  return [route[0], route[1], [b, a], route[1], ...route.slice(2)];
}



const child = spawn(process.execPath, ['index.js'], { cwd, stdio: 'ignore' });

let failed = false;

const fail = (m) => {

  console.log('FAIL:', m);

  failed = true;

};

const ok = (m) => console.log('OK:', m);



try {

  await waitForServer(child);



  // -------------------------------------------------------------------------

  // 1. Anonymous users cannot play

  //    Exam §1: "Anonymous: instructions only, no map, no play"

  //            → "Network, segments, games, ranking → 401 without session"

  //    Exam §9: "Not logged in → 401 { error: 'UNAUTHORIZED' }"

  // -------------------------------------------------------------------------

  const anon = await request('POST', '/api/games');

  if (anon.status !== 401 || anon.json?.error !== 'UNAUTHORIZED') {

    fail(`anonymous POST /api/games → ${anon.status} / ${anon.json?.error}`);

  } else ok('POST /api/games without login → 401 UNAUTHORIZED');



  const cookie = await login('player1');



  // -------------------------------------------------------------------------

  // 2. Start a new game (setup phase)

  //    Exam §5 flow: "POST /api/games (status: setup)"

  //    Exam §4 POST /api/games → { id, status: "setup", coins: 20 }

  //    Exam §8: "Start with 20 coins"

  // -------------------------------------------------------------------------

  const created = await request('POST', '/api/games', { cookie });

  if (created.status !== 201) fail(`POST /api/games → ${created.status}`);

  else if (created.json.status !== 'setup' || created.json.coins !== STARTING_COINS) {

    fail('setup game shape wrong');

  } else ok('POST /api/games → setup');



  // -------------------------------------------------------------------------

  // 3. Begin planning — server assigns start, destination, and 90s timer

  //    Exam §5: "POST /api/games/:id/planning (status: planning, start + dest)"

  //    Exam §4: server picks start/dest "reachable, at least 3 legs on shortest path"

  //    Exam §4: planningDeadline = planning_started_at + 90s

  //    Exam §1: "Phases: setup → planning (90s) → execution → result"

  //    Exam §1: responses include "IDs + names for display"

  // -------------------------------------------------------------------------

  const planning = await request('POST', `/api/games/${created.json.id}/planning`, {

    cookie,

  });

  if (planning.status !== 200) fail(`POST planning → ${planning.status}`);

  else if (planning.json.status !== 'planning') fail('expected planning status');

  else if (!planning.json.planningDeadline) fail('missing planningDeadline');

  else if (!planning.json.startStationId || !planning.json.destinationStationId) {

    fail('missing start/dest ids');

  } else if (!planning.json.start || !planning.json.destination) {

    fail('missing start/destination names');

  } else ok('POST /api/games/:id/planning');



  // -------------------------------------------------------------------------

  // 4. Cannot repeat planning on the same game

  //    Exam §9: "Wrong game phase (e.g. planning twice) → 409 INVALID_STATE"

  // -------------------------------------------------------------------------

  const planningAgain = await request('POST', `/api/games/${created.json.id}/planning`, {

    cookie,

  });

  if (planningAgain.status !== 409 || planningAgain.json?.error !== 'INVALID_STATE') {

    fail(`planning twice → ${planningAgain.status} / ${planningAgain.json?.error}`);

  } else ok('POST planning twice → 409 INVALID_STATE');



  // -------------------------------------------------------------------------

  // 5. Cannot submit a route before entering planning

  //    Exam §5: route submit happens only after planning has started

  //    Exam §9: wrong phase → 409 INVALID_STATE

  // -------------------------------------------------------------------------

  const setupOnly = await request('POST', '/api/games', { cookie });

  const routeSetup = await request('PUT', `/api/games/${setupOnly.json.id}/route`, {

    cookie,

    body: { segments: [[1, 2]] },

  });

  if (routeSetup.status !== 409 || routeSetup.json?.error !== 'INVALID_STATE') {

    fail(`PUT route in setup → ${routeSetup.status} / ${routeSetup.json?.error}`);

  } else ok('PUT route in setup → 409 INVALID_STATE');



  // -------------------------------------------------------------------------

  // 6. Too-short route (fewer than 3 legs) scores zero

  //    Exam §1: "Invalid or incomplete route → 0 coins, no execution"

  //    Exam §7: route with fewer than 3 segments → valid: false

  //    Exam §9: "Invalid route on submit → 200 { valid: false, finalScore: 0 }"

  //            (not a server error — client shows score 0)

  // -------------------------------------------------------------------------

  const tooShort = await request('PUT', `/api/games/${created.json.id}/route`, {

    cookie,

    body: { segments: [[planning.json.startStationId, planning.json.destinationStationId]] },

  });

  if (tooShort.status !== 200) fail(`too-short route → ${tooShort.status}`);

  else {

    assertInvalidRouteResponse(tooShort.json, fail);

    if (!failed) ok('PUT too-short route → valid:false, finalScore:0, status:completed, no steps');

  }



  // Open DB for route discovery and deadline backdating (tests 7 and 12).

  await attachToExistingDb();



  // -------------------------------------------------------------------------

  // 7. Incomplete route submitted before deadline (timeout scenario)

  //    Exam §5: "[90s timer — client auto-submits on timeout]"

  //    Exam §5: "incomplete routes → valid: false, finalScore: 0"

  //    Exam §7: last leg toId !== destinationStationId → valid: false

  // -------------------------------------------------------------------------

  const partialGame = await request('POST', '/api/games', { cookie });

  const partialPlanning = await request('POST', `/api/games/${partialGame.json.id}/planning`, {

    cookie,

  });

  const fullRoute = await findValidRouteSegments(

    partialPlanning.json.startStationId,

    partialPlanning.json.destinationStationId

  );

  if (!fullRoute || fullRoute.length < 2) {

    fail('could not build route for partial-route test');

  } else {

    const incomplete = fullRoute.slice(0, -1);

    const partial = await request('PUT', `/api/games/${partialGame.json.id}/route`, {

      cookie,

      body: { segments: incomplete },

    });

    if (partial.status !== 200) fail(`incomplete route → ${partial.status}`);

    else {

      assertInvalidRouteResponse(partial.json, fail);

      if (!failed) ok('PUT incomplete connected route → valid:false, score 0');

    }

  }



  // -------------------------------------------------------------------------

  // 7a. Station loop allowed (exam 2026-06-05: same station may repeat)

  //     Porta Velaria appears twice; no segment is reused.

  // -------------------------------------------------------------------------

  const loopRoute = [

    [2, 1],

    [1, 6],

    [6, 2],

    [2, 3],

    [3, 4],

    [4, 5],

  ];

  if (!(await isValidRoute({ startStationId: 2, destinationStationId: 5, segments: loopRoute }))) {

    fail('station loop route should be valid (Porta revisited, no duplicate segment)');

  } else ok('station loop route accepted (same station twice, segments once)');



  // -------------------------------------------------------------------------

  // 7b. Duplicate segment — same undirected edge used twice

  //     Exam (2026-06-05): "Each segment may be selected only once."

  //     Exam: "must not involve any segment more than once" ([p])

  // -------------------------------------------------------------------------

  const dupGame = await request('POST', '/api/games', { cookie });

  const dupPlanning = await request('POST', `/api/games/${dupGame.json.id}/planning`, {

    cookie,

  });

  const dupBaseRoute = await findValidRouteSegments(

    dupPlanning.json.startStationId,

    dupPlanning.json.destinationStationId

  );

  const duplicateRoute = routeWithDuplicateSegment(dupBaseRoute);

  if (!duplicateRoute) {

    fail('could not build duplicate-segment route for test');

  } else {

    const duplicate = await request('PUT', `/api/games/${dupGame.json.id}/route`, {

      cookie,

      body: { segments: duplicateRoute },

    });

    if (duplicate.status !== 200) fail(`duplicate segment route → ${duplicate.status}`);

    else {

      assertInvalidRouteResponse(duplicate.json, fail);

      if (!failed) ok('PUT duplicate segment route → valid:false, score 0');

    }

  }



  // -------------------------------------------------------------------------

  // 8. Valid route — validate, execute with random events, return steps

  //    Exam §5: "PUT /api/games/:id/route (validate + score + steps)"

  //    Exam §1: "Valid route → random event per leg on server"

  //    Exam §4 PUT /route body: segments as [fromStationId, toStationId] pairs

  //    Exam §8: pick random event per leg; final_score = max(0, coins)

  // -------------------------------------------------------------------------

  const winGame = await request('POST', '/api/games', { cookie });

  const winPlanning = await request('POST', `/api/games/${winGame.json.id}/planning`, {

    cookie,

  });

  const routeSegments = await findValidRouteSegments(

    winPlanning.json.startStationId,

    winPlanning.json.destinationStationId

  );

  if (!routeSegments) fail('findValidRouteSegments returned null');

  const gameId = winGame.json.id;

  const valid = await request('PUT', `/api/games/${gameId}/route`, {

    cookie,

    body: { segments: routeSegments },

  });

  if (valid.status !== 200) fail(`valid route → ${valid.status}`);

  else {

    assertValidRouteResponse(valid.json, routeSegments, fail);

    if (!failed) ok('PUT valid route → steps shape, coinsAfter, finalScore');

  }



  // -------------------------------------------------------------------------

  // 9. Owner can read back the completed game

  //    Exam §4 GET /api/games/:id: "Return the fields needed for the current phase"

  //    Exam §5: after execution → result screen (final score available)

  // -------------------------------------------------------------------------

  const fetched = await request('GET', `/api/games/${gameId}`, { cookie });

  if (fetched.status !== 200) fail(`GET game → ${fetched.status}`);

  else if (fetched.json.status !== 'completed' || fetched.json.finalScore !== valid.json.finalScore) {

    fail('GET completed game mismatch');

  } else if (!Array.isArray(fetched.json.steps) || fetched.json.steps.length !== routeSegments.length) {

    fail('GET completed game should include persisted steps');

  } else ok('GET /api/games/:id after complete');



  // -------------------------------------------------------------------------

  // 10. Other users must not see someone else's game

  //     Exam §1: "Do not leak data — no other users' games"

  //     Exam §9: "Game not found / not owner → 404 NOT_FOUND"

  // -------------------------------------------------------------------------

  const cookie2 = await login('player2');

  const other = await request('GET', `/api/games/${gameId}`, { cookie: cookie2 });

  if (other.status !== 404 || other.json?.error !== 'NOT_FOUND') {

    fail(`other user GET game → ${other.status} / ${other.json?.error}`);

  } else ok('GET game as other user → 404 NOT_FOUND');



  // -------------------------------------------------------------------------

  // 11. Malformed route body (non-integer station ids)

  //     Exam §4: PUT body segments are station IDs only

  //     Exam §9: "Malformed body (non-integer ids) → 400 BAD_REQUEST"

  // -------------------------------------------------------------------------

  const badBody = await request('PUT', `/api/games/${gameId}/route`, {

    cookie,

    body: { segments: [['a', 'b']] },

  });

  if (badBody.status !== 400 || badBody.json?.error !== 'BAD_REQUEST') {

    fail(`bad route body → ${badBody.status} / ${badBody.json?.error}`);

  } else ok('PUT route bad body → 400 BAD_REQUEST');



  // -------------------------------------------------------------------------

  // 12. Late submission after planning window

  //     Exam §5: "reject PUT if now is more than ~5s after planningDeadline"

  //             → 409 { error: "PLANNING_EXPIRED" }

  //     Exam §7: "PUT after planning deadline + grace → 409 PLANNING_EXPIRED"

  //     Game must remain in planning (not scored).

  // -------------------------------------------------------------------------

  const expiredGame = await request('POST', '/api/games', { cookie });

  const expiredPlanning = await request('POST', `/api/games/${expiredGame.json.id}/planning`, {

    cookie,

  });

  const expiredStartedAt = new Date(Date.now() - 100 * 1000).toISOString();

  await run('UPDATE games SET planning_started_at = ? WHERE id = ?', [

    expiredStartedAt,

    expiredGame.json.id,

  ]);

  const expiredRoute = await findValidRouteSegments(

    expiredPlanning.json.startStationId,

    expiredPlanning.json.destinationStationId

  );

  const expiredPut = await request('PUT', `/api/games/${expiredGame.json.id}/route`, {

    cookie,

    body: { segments: expiredRoute ?? [[1, 2], [2, 3], [3, 4]] },

  });

  if (expiredPut.status !== 409 || expiredPut.json?.error !== 'PLANNING_EXPIRED') {

    fail(`expired planning PUT → ${expiredPut.status} / ${expiredPut.json?.error}`);

  } else {

    const row = await get('SELECT status FROM games WHERE id = ?', [expiredGame.json.id]);

    if (row?.status !== 'planning') fail('expired PUT should not complete the game');

    else ok('PUT route after deadline → 409 PLANNING_EXPIRED');

  }

} catch (e) {

  fail(e.message);

} finally {

  child.kill('SIGTERM');

  await delay(300);

}



process.exit(failed ? 1 : 0);



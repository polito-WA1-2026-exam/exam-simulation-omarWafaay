/**
 * Quick constraint smoke test (no REST Client needed).
 * Run: node run-constraint-tests.mjs  (server must be on :3001)
 */
const BASE = 'http://localhost:3001';

async function req(method, path, body, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json, headers: res.headers };
}

function getCookie(res) {
  const set = res.headers.getSetCookie?.() ?? [];
  return set.map((c) => c.split(';')[0]).join('; ');
}

async function expectStatus(label, res, code) {
  const ok = res.status === code;
  console.log(`${ok ? 'OK' : 'FAIL'}: ${label} → HTTP ${res.status}${ok ? '' : ` (expected ${code})`}`);
  if (!ok && res.json?.error) console.log('   ', res.json);
  return ok;
}

const login = await req('POST', '/api/sessions', {
  username: 'bob',
  password: 'password',
});
const cookie = getCookie(login);
if (login.status !== 201) {
  console.error('Login failed. Is the server running on port 3001?');
  process.exit(1);
}

await req('PUT', '/api/study-plan', {
  courses: ['01OTWOV', '01SQLOV', '01UDFOV', '01OUZPD'],
}, cookie);

let allOk = true;

let r = await req('POST', '/api/study-plan/courses', { courseCode: '05BIDOV' }, cookie);
allOk &= await expectStatus('preparatory: add 05BIDOV without 02GOLOV', r, 400);

r = await req('POST', '/api/study-plan/courses', { courseCode: '02GOLOV' }, cookie);
allOk &= await expectStatus('add 02GOLOV', r, 200);

r = await req('POST', '/api/study-plan/courses', { courseCode: '02LSEOV' }, cookie);
allOk &= await expectStatus('incompatible: add 02LSEOV with 02GOLOV', r, 400);

r = await req('POST', '/api/study-plan/courses', { courseCode: '05BIDOV' }, cookie);
allOk &= await expectStatus('add 05BIDOV after prep', r, 200);

r = await req('DELETE', '/api/study-plan/courses/02GOLOV', null, cookie);
allOk &= await expectStatus('preparatory: remove 02GOLOV with 05BIDOV in plan', r, 400);

r = await req('DELETE', '/api/study-plan/courses/05BIDOV', null, cookie);
allOk &= await expectStatus('remove 05BIDOV', r, 200);

r = await req('DELETE', '/api/study-plan/courses/02GOLOV', null, cookie);
allOk &= await expectStatus('remove 02GOLOV after dependent gone', r, 200);

r = await req('POST', '/api/study-plan/courses', { courseCode: '01TXYOV' }, cookie);
allOk &= await expectStatus('incompatible: 01TXYOV with 01UDFOV in plan', r, 400);

await req(
  'PUT',
  '/api/study-plan',
  { courses: ['01OTWOV', '01SQLOV', '01UDFOV', '01OUZPD'] },
  cookie
);

process.exit(allOk ? 0 : 1);

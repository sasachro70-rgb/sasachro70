// Tests for the Edge Function supabase/functions/tts/index.ts, run in Node (22.6 or newer, which can read TypeScript) with fakes for
// Deno, Supabase and Google. Checks: best Thai voice per gender, cache hit costs nothing, Thai-only, length limit, daily limit, CORS.
// Run: npm run test:security
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'functions', 'tts', 'index.ts'), 'utf8');
const RUN = `
let handler; const store = new Map(); const quota = { ok: true }; const log = [];
globalThis.Deno = { env: { get: k => ({ GOOGLE_TTS_API_KEY: 'gk', SUPABASE_URL: 'u', SUPABASE_SERVICE_ROLE_KEY: 's' })[k] }, serve: h => { handler = h; } };
globalThis.__mock = { createClient: () => ({
  auth: { getUser: async t => ({ data: { user: t === 'a.b.c' ? { id: 'U1' } : null } }) },
  storage: { from: () => ({ download: async p => ({ data: store.has(p) ? new Blob([store.get(p)]) : null }), upload: async (p, b) => { store.set(p, b); return {}; } }) },
  rpc: async (n, a) => { log.push(['rpc', a.p_who.split(':')[0], a.p_chars]); return { data: quota.ok, error: null }; } }) };
globalThis.fetch = async (url) => {
  log.push(['google', String(url).includes('/voices') ? 'voices' : 'synth']);
  if (String(url).includes('/voices')) return new Response(JSON.stringify({ voices: [
    { name: 'th-TH-Standard-A', ssmlGender: 'FEMALE', languageCodes: ['th-TH'] }, { name: 'th-TH-Neural2-C', ssmlGender: 'FEMALE', languageCodes: ['th-TH'] },
    { name: 'th-TH-Chirp3-HD-Charon', ssmlGender: 'MALE', languageCodes: ['th-TH'] }, { name: 'th-TH-Chirp3-HD-Achernar', ssmlGender: 'FEMALE', languageCodes: ['th-TH'] } ] }));
  return new Response(JSON.stringify({ audioContent: btoa('MP3DATA') }));
};
await import('./fn.ts');
const call = (body, h = {}, origin = 'https://sasachro70-rgb.github.io', method = 'POST') => handler(new Request('https://f/tts', { method, headers: { origin, 'content-type': 'application/json', ...h }, body: method === 'POST' ? JSON.stringify(body) : undefined }));
const sum = async r => ({ s: r.status, v: r.headers.get('x-voice'), c: r.headers.get('x-cache'), o: r.headers.get('access-control-allow-origin'), b: await r.text() });
const out = {};
out.first = await sum(await call({ text: 'สวัสดี' }));
out.again = await sum(await call({ text: 'สวัสดี' }));
out.male = await sum(await call({ text: 'สวัสดี', gender: 'male' }, { authorization: 'Bearer a.b.c' }));
out.latin = await sum(await call({ text: 'hello' }));
out.long = await sum(await call({ text: 'ก'.repeat(401) }));
quota.ok = false; out.limit = await sum(await call({ text: 'แมว' }));
out.evil = (await call({ text: 'แมว' }, {}, 'https://evil.example')).status;
out.pre = (await call(null, {}, 'http://localhost:8780', 'OPTIONS')).headers.get('access-control-allow-origin');
out.log = log;
console.log(JSON.stringify(out));
`;
const major = +process.versions.node.split('.')[0], minor = +process.versions.node.split('.')[1];
test('tts Edge Function', { skip: major < 22 || (major === 22 && minor < 6) ? 'needs Node 22.6+' : false }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tts-'));
  fs.writeFileSync(path.join(dir, 'fn.ts'), SRC.replace(/^import \{ createClient \} from 'npm:@supabase\/supabase-js@[^']+';$/m, 'const { createClient } = (globalThis as any).__mock;'));
  fs.writeFileSync(path.join(dir, 'run.mjs'), RUN);
  const o = JSON.parse(execFileSync(process.execPath, ['--experimental-strip-types', '--no-warnings', 'run.mjs'], { cwd: dir, encoding: 'utf8' }).trim().split('\n').pop());
  assert.deepEqual([o.first.s, o.first.v, o.first.c, o.first.b], [200, 'th-TH-Chirp3-HD-Achernar', 'miss', 'MP3DATA']);   // best type, female by default
  assert.deepEqual([o.again.s, o.again.c], [200, 'hit']);                                                                  // stored once, reused
  assert.deepEqual([o.male.s, o.male.v], [200, 'th-TH-Chirp3-HD-Charon']);
  assert.equal(o.latin.s, 400); assert.equal(o.long.s, 413); assert.equal(o.limit.s, 429);
  assert.equal(o.evil, 403); assert.equal(o.pre, 'http://localhost:8780'); assert.equal(o.first.o, 'https://sasachro70-rgb.github.io');
  // the quota is asked only for new sentences: visitor by IP, signed-in user by id; a cache hit and refused input never reach Google
  assert.deepEqual(o.log.filter(x => x[0] === 'rpc').map(x => x[1] + ':' + x[2]), ['ip:6', 'u:6', 'ip:3']);
  assert.deepEqual(o.log.filter(x => x[0] === 'google').map(x => x[1]), ['voices', 'synth', 'synth']);
});

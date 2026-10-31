// The cloud Thai voice (js/family/cloud-voice.js) and how voice.js uses it. No packages and no network: fetch, Audio and the voices are fakes.
// Run: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load({ voices = [], fetchImpl, config = { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'sb_publishable_k' }, mode } = {}) {
  const mem = {}; if (mode) mem['pasathai.thVoice'] = mode;
  const calls = [], played = [], spoken = [];
  const ls = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }, key: i => Object.keys(mem)[i], get length() { return Object.keys(mem).length; } };
  class Audio { constructor(u) { this.src = u; played.push(u); } play() { setTimeout(() => this.onended && this.onended(), 1); return Promise.resolve(); } pause() {} }
  class Utt { constructor(t) { this.text = t; } }
  const ctx = { console, Math, Date, Set, Map, JSON, Array, Object, String, Number, Boolean, Error, Promise, RegExp, Intl, setTimeout, clearTimeout, URL: { createObjectURL: b => 'blob:' + b.text },
    localStorage: ls, FGH_CONFIG: config, Audio, SpeechSynthesisUtterance: Utt, navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', maxTouchPoints: 0 },
    speechSynthesis: { getVoices: () => voices, speak: u => { spoken.push(u.text); setTimeout(() => u.onend && u.onend(), 1); }, cancel() {}, addEventListener() {} },
    fetch: async (url, o) => { calls.push({ url, body: JSON.parse(o.body), headers: o.headers }); return fetchImpl ? fetchImpl(url, o) : { ok: true, status: 200, blob: async () => ({ size: 10, text: JSON.parse(o.body).text }) }; } };
  ctx.globalThis = ctx; ctx.window = undefined;
  vm.createContext(ctx);
  for (const f of ['js/family/cloud-voice.js', 'js/family/voice.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
  return { ctx, V: ctx.FGH.voice, CV: ctx.FGH.cloudVoice, calls, played, spoken, mem };
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const TH = { name: 'Kanya', lang: 'th-TH', voiceURI: 'kanya', localService: true };
const SV = { name: 'Alva', lang: 'sv-SE', voiceURI: 'alva', localService: true };

test('no Thai voice on the device: Thai is read by the cloud voice, one request per line, public key only', async () => {
  const { V, calls, played } = load({ voices: [SV] });
  assert.equal(V.canSpeak('th'), true);
  assert.equal(V.say('สวัสดีครับ\nยินดีที่ได้รู้จัก', 'th'), true);
  await wait(700);   // the pause between sentences
  assert.deepEqual(calls.map(c => c.body.text), ['สวัสดีครับ', 'ยินดีที่ได้รู้จัก']);
  assert.equal(calls[0].url, 'https://x.supabase.co/functions/v1/tts');
  assert.equal(calls[0].body.lang, 'th'); assert.equal(calls[0].body.gender, 'female');
  assert.equal(calls[0].headers.Authorization, 'Bearer sb_publishable_k');
  assert.deepEqual(played, ['blob:สวัสดีครับ', 'blob:ยินดีที่ได้รู้จัก']);
});

test('the same sentence is fetched only once', async () => {
  const { V, calls } = load({ voices: [] });
  V.say('แมว', 'th'); await wait(10); V.say('แมว', 'th'); await wait(10);
  assert.equal(calls.length, 1);
});

test('priority (docs/THAI_AUDIO.md): automatic and cloud use the natural cloud voice first; "device" never calls the cloud', async () => {
  let r = load({ voices: [TH] });
  r.V.say('แมว', 'th'); await wait(10);
  assert.equal(r.calls.length, 1); assert.deepEqual(r.spoken, []);
  r = load({ voices: [TH], mode: 'cloud' });
  r.V.say('แมว', 'th'); await wait(10);
  assert.equal(r.calls.length, 1); assert.deepEqual(r.spoken, []);
  r = load({ voices: [TH], mode: 'device' });
  r.V.say('แมว', 'th'); await wait(10);
  assert.equal(r.calls.length, 0); assert.deepEqual(r.spoken, ['แมว']);
  r = load({ voices: [], mode: 'device' });
  assert.equal(r.V.say('แมว', 'th'), false); assert.equal(r.calls.length, 0);
  assert.equal(r.V.canSpeak('th'), false);
});

test('a sentence the cloud cannot give is read by the device Thai voice (automatic), never by another language', async () => {
  let r = load({ voices: [TH, SV], fetchImpl: async () => ({ ok: false, status: 404 }) });
  assert.equal(r.V.say('แมว', 'th'), true); await wait(30);
  assert.deepEqual(r.spoken, ['แมว']);
  r.V.say('หมา', 'th'); await wait(30);   // the cloud is now switched off for a while: straight to the device voice
  assert.deepEqual(r.spoken, ['แมว', 'หมา']); assert.equal(r.calls.length, 1);
  r = load({ voices: [SV], fetchImpl: async () => ({ ok: false, status: 404 }) });
  r.V.say('แมว', 'th'); await wait(30);
  assert.deepEqual(r.spoken, []);   // a Swedish voice never reads Thai
  r = load({ voices: [TH], mode: 'cloud', fetchImpl: async () => ({ ok: false, status: 503 }) });
  r.V.say('แมว', 'th'); await wait(30);
  assert.deepEqual(r.spoken, []);   // "cloud only" does not fall back
});

test('word by word: content marks first, then the Thai word breaker', () => {
  const { V } = load({ voices: [] });
  assert.deepEqual(JSON.parse(JSON.stringify(V.wordsOf('ผม|ชื่อ|ต้น|ครับ', 'th'))), ['ผม', 'ชื่อ', 'ต้น', 'ครับ']);
  const w = JSON.parse(JSON.stringify(V.wordsOf('ขอบคุณมากครับ', 'th')));
  assert.ok(w.length >= 2 && w.join('') === 'ขอบคุณมากครับ', JSON.stringify(w));
  assert.deepEqual(JSON.parse(JSON.stringify(V.wordsOf('Hej på dig', 'sv'))), ['Hej', 'på', 'dig']);
  assert.equal(V.SLOW, 0.5); assert.ok(V.RATES.includes(0.85) && V.RATES.includes(0.5) && V.RATES.includes(1.25));
});

test('a Thai word inside Swedish text goes to the cloud voice, the Swedish to the Swedish voice', async () => {
  const { V, calls, spoken } = load({ voices: [SV] });
  assert.equal(V.say('Ordet แมว betyder katt.', 'sv'), true);
  await wait(1200);
  assert.deepEqual(calls.map(c => c.body.text), ['แมว']);
  assert.ok(spoken.join(' ').includes('Ordet') && spoken.join(' ').includes('betyder katt.'));
});

test('function missing or limit reached: the cloud switches itself off and says why; nothing is thrown', async () => {
  const r = load({ voices: [], fetchImpl: async () => ({ ok: false, status: 429 }) });
  r.V.say('แมว', 'th'); await wait(10);
  assert.equal(r.CV.status().state, 'down'); assert.equal(r.CV.status().why, 'limit');
  assert.equal(r.V.canSpeak('th'), false);
  assert.equal(r.V.say('หมา', 'th'), false);   // no second request while switched off
  assert.equal(r.calls.length, 1);
  const r2 = load({ voices: [], fetchImpl: async () => ({ ok: false, status: 404 }) });
  r2.V.say('แมว', 'th'); await wait(10);
  assert.equal(r2.CV.status().why, 'setup');
  const r3 = load({ voices: [], fetchImpl: async () => { throw new Error('offline'); } });
  r3.V.say('แมว', 'th'); await wait(10);
  assert.equal(r3.CV.status().why, 'offline');
});

test('not configured: no cloud; long lines are cut below the limit; the platform is recognised', () => {
  const r = load({ voices: [], config: {} });
  assert.equal(r.CV.status().state, 'off'); assert.equal(r.V.say('แมว', 'th'), false);
  const long = Array.from({ length: 120 }, () => 'สวัสดีครับ').join(' ');
  const parts = r.V.cloudPieces(long);
  assert.ok(parts.length >= 3 && parts.every(p => p.length <= 400));
  assert.equal(parts.join(' ').replace(/\s+/g, ''), long.replace(/\s+/g, ''));
  assert.equal(r.V.platform(), 'windows');
  assert.equal(r.V.thaiStatus().device, false);
});

test('signed-in users send their own session token (so the daily limit is per user)', async () => {
  const r = load({ voices: [] });
  r.mem['sb-x-auth-token'] = JSON.stringify({ access_token: 'a.b.c', expires_at: Math.floor(Date.now() / 1000) + 600 });
  r.V.say('แมว', 'th'); await wait(10);
  assert.equal(r.calls[0].headers.Authorization, 'Bearer a.b.c');
});

test('every page that loads voice.js loads cloud-voice.js first', () => {
  for (const page of ['academy.html', 'kids.html', 'content.html', 'student.html', 'parent.html', 'admin.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', page), 'utf8');
    assert.ok(html.indexOf('js/family/cloud-voice.js') > 0 && html.indexOf('js/family/cloud-voice.js') < html.indexOf('js/family/voice.js'), page);
  }
});

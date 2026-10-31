// ThaiElevate Phase B: welcome page, Play Zone and branding. Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
function load(files) {
  const ctx = { console, window: {} }; ctx.globalThis = ctx; vm.createContext(ctx);
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
  return ctx;
}

test('welcome page: brand, Thai heading, English and Swedish subtitles, the two doors', () => {
  const html = read('index.html');
  assert.match(html, /<span class="brand-name">Thai<b>Elevate<\/b><\/span>/);
  assert.match(html, /ยินดีต้อนรับสู่ <span class="nowrap">ThaiElevate<\/span>/);
  assert.ok(html.includes('Welcome to ThaiElevate – Your Thai Language Learning Journey.'));
  assert.ok(html.includes('Välkommen till ThaiElevate – din resa för att lära dig thailändska.'));
  assert.ok(html.includes('Learn Thai. Speak Thai. Understand Thai.'));
  assert.ok(html.includes('Learn Thai with confidence.'));
  assert.match(html, /class="door play" href="play\.html"/);
  assert.match(html, /class="door academy js-academy" href="academy\.html\?course=th&amp;explain=sv"/);
  assert.ok(html.includes('Spela, upptäck och lär genom roliga aktiviteter.'));
  assert.ok(html.includes('Strukturerad undervisning i thailändska.'));
  assert.ok(html.includes('ระบบเรียนการสอนภาษาไทยอย่างเป็นระบบ'));
  assert.ok(html.includes('Förklaringsspråk / <span lang="th">ภาษาที่ใช้ในการอธิบาย</span>'));
  assert.ok(!/Family Game Hub/.test(html), 'old brand not shown');
});

test('welcome page: every link points to a page that exists, and every text key exists in Thai, Swedish and English', () => {
  const html = read('index.html');
  for (const m of html.matchAll(/href="([a-z-]+\.html)/g)) assert.ok(fs.existsSync(path.join(root, m[1])), m[1]);
  const W = load(['js/welcome.js']).window.TE_WELCOME;
  const keys = Array.from(html.matchAll(/data-t(?:-aria)?="([A-Za-z0-9]+)"/g), m => m[1]);
  assert.ok(keys.length > 15);
  for (const l of W.LANGS) for (const k of keys) assert.ok(W.T[l][k], l + ' is missing ' + k);
});

test('welcome page: explanation language is sv or th, and the Academy link follows it', () => {
  const W = load(['js/welcome.js']).window.TE_WELCOME;
  assert.equal(W.pickExplain('th'), 'th');
  assert.equal(W.pickExplain('en'), 'sv');
  assert.equal(W.pickExplain(null), 'sv');
  assert.equal(W.academyHref('th'), 'academy.html?course=th&explain=th');
  assert.equal(W.pickLang('sv', 'th-TH'), 'sv');
  assert.equal(W.pickLang(undefined, 'th-TH'), 'th');
  assert.equal(W.pickLang(undefined, 'de-DE'), 'en');
});

test('welcome page: changing the menu language keeps every other part of the saved family games', () => {
  const W = load(['js/welcome.js']).window.TE_WELCOME;
  const saved = JSON.stringify({ v: 1, ui: 'en', sound: true, players: [{ id: 'p1', name: 'Mali' }], history: [{ players: [] }] });
  const next = JSON.parse(W.withUi(saved, 'th'));
  assert.equal(next.ui, 'th');
  assert.deepEqual(Object.assign({}, next, { ui: 'en' }), JSON.parse(saved));
  assert.equal(W.withUi('{broken', 'th'), null, 'unreadable data is never overwritten');
  assert.equal(W.withUi('{"v":2}', 'th'), null, 'unknown versions are never overwritten');
  assert.deepEqual(JSON.parse(W.withUi(null, 'sv')), { v: 1, ui: 'sv' });
});

test('Play Zone: the former home page with the same saved data; no academy or school sections mixed in', () => {
  const html = read('play.html');
  assert.match(html, /<title>Play Zone · ThaiElevate<\/title>/);
  for (const s of ['js/hub-core.js', 'js/games/flag-quiz.js', 'js/family/hub-bridge.js', 'js/hub-ui.js']) assert.ok(html.includes(s), s);
  const ui = read('js/hub-ui.js');
  assert.ok(ui.includes("STORE = 'fgh.v1'"), 'same storage key as before');
  assert.ok(!/B\.academyHTML\(|B\.schoolHTML\(/.test(ui), 'academy and school sections are not on the Play Zone page');
  assert.ok(ui.includes('playHeroHTML'));
  const bridge = read('js/family/hub-bridge.js');   // all three languages are checked by tests/thai-voice.test.js (home page texts)
  assert.ok(bridge.includes("playSub: 'Spela, upptäck och lär genom roliga aktiviteter.'"));
  assert.equal((bridge.match(/heroTitle: 'ThaiElevate'/g) || []).length, 3);
  assert.ok(!bridge.includes("heroTitle: 'Family Game Hub'"));
});

test('branding: no page title or visible header text says Family Game Hub; Play Zone pages lead back to the Play Zone', () => {
  for (const f of fs.readdirSync(root).filter(f => f.endsWith('.html'))) assert.ok(!/<title>[^<]*Family Game Hub/.test(read(f)), f);
  assert.ok(!read('js/keykids/ui.js').includes('🏠 Family Game Hub'));
  assert.ok(read('js/keykids/ui.js').includes('href="play.html">🏠 Play Zone'));
  assert.ok(read('js/online/online-ui.js').includes('href="play.html"'));
  assert.match(read('kids.html'), /data-home="play\.html"/);
  const FT = load(['js/family/i18n.js']).window.FGH.FT;
  for (const l of ['en', 'sv', 'th']) { assert.equal(FT[l].hub, 'ThaiElevate'); assert.equal(FT[l].playZone, 'Play Zone'); }
});

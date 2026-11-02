// Student Mode on the device and the teacher/student pages (no packages needed). Run: npm test
// The database side (classes, PIN login, server checks) is tested in supabase/tests/classes.test.js.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');

function load(files) {
  const mem = {};
  const ctx = { console, Intl, Math, Date, Set, Map, JSON, Array, Object, String, Number, Boolean, Error, Promise, RegExp, TextEncoder, setTimeout, clearTimeout, crypto: globalThis.crypto,
    localStorage: { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } } };
  ctx.globalThis = ctx; ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  return ctx;
}
const plain = x => JSON.parse(JSON.stringify(x));

test('school texts exist in Thai, Swedish and English', () => {
  const { FGH } = load(['js/school/school-i18n.js']);
  const flat = (o, p) => Object.keys(o).flatMap(k => typeof o[k] === 'object' ? flat(o[k], p + k + '.') : [p + k]);
  const en = flat(FGH.schoolTexts.en, '');
  for (const l of ['sv', 'th']) { const has = new Set(flat(FGH.schoolTexts[l], '')); for (const k of en) assert.ok(has.has(k), l + ' is missing ' + k); }
});

test('teacher and student pages load scripts that exist, in an order that works', () => {
  for (const page of ['teacher.html', 'student.html', 'kids.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
    for (const s of srcs) assert.ok(fs.existsSync(path.join(root, s)), page + ' → ' + s);
    const at = s => srcs.indexOf(s);
    if (page !== 'kids.html') assert.ok(at('js/family/kit.js') > at('js/school/school-i18n.js') && at('js/school/school-service.js') > at('js/online/supabase-client.js'), page);
    if (page !== 'teacher.html') assert.ok(at('js/school/student-sync.js') > at('js/family/store.js') && at('js/school/student-sync.js') > at('js/school/school-service.js'), page);
  }
  const online = fs.readFileSync(path.join(root, 'js/online/online-ui.js'), 'utf8');
  assert.ok(!online.includes('data-form="family"'), 'the family form is gone from online.html');
});

test('student sync: sign-in brings the server progress, every change and activity is saved once, logout leaves nothing on the device', async () => {
  const ctx = load(['js/family/ledger.js', 'js/family/store.js', 'js/family/srs.js', 'js/school/school-service.js', 'js/school/student-sync.js']);
  const { FGH } = ctx, store = FGH.familyStore, SS = FGH.studentSync, F = FGH.family;
  /* a family learner already on this shared iPad must stay untouched */
  const mia = store.mutate(f => F.addProfile(f, { name: 'Mia', kind: 'child' }).profile.id);
  let server = { rev: 2, data: { learning: { 'kl:th-sv': { lessons: { a: { best: 70, attempts: 1, done: true, last: 5, firstDone: 5 } }, current: 'b', timeMs: 100, lastAt: 5, tests: [] } } } };
  const calls = { save: 0, acts: [] }; let loggedOut = false;
  const svc = {
    saveProgress: async (doc, rev) => { calls.save++; if (rev !== server.rev) return { ok: false, error: 'stale', rev: server.rev, data: server.data }; server = { rev: rev + 1, data: doc }; return { ok: true, rev: server.rev }; },
    recordActivity: async a => { calls.acts.push(a.key); return { ok: true, duplicate: false }; },
    studentLogout: async () => { loggedOut = true; }
  };
  const me = { student_id: 'S1', student_no: 3, name: 'Mali', class_name: 'Thai 1A', class_code: 'K7MP4Q', rev: 2, progress: server.data, recent: [] };
  const pid = SS.begin(svc, me);
  let f = store.get();
  assert.equal(F.getProfile(f, pid).name, 'Mali');
  assert.equal(F.getProfile(f, pid).studentId, 'S1');
  assert.equal(f.learning[pid]['kl:th-sv'].current, 'b');                     // continue where you left off
  /* the same student signing in again uses the same local learner */
  assert.equal(SS.begin(svc, me), pid);
  /* a finished lesson on this device */
  store.mutate(ff => { F.recordLesson(ff, pid, 'kl:th-sv', 'b', 90, 60000, 60); ff.log.push({ id: 'e1', pid, ts: 10, area: 'kids', kind: 'lang', title: 'Lesson B', ms: 60000, score: 9, max: 10, pct: 90, key: 'kl:b' }); });
  await SS.push();
  assert.deepEqual(plain(calls.acts), ['log:e1']);
  assert.equal(server.rev, 3);
  assert.ok(server.data.learning['kl:th-sv'].lessons.b.done);
  await SS.push();                                                             // nothing new → nothing sent again
  assert.deepEqual(plain(calls.acts), ['log:e1']);
  /* another device saved in between: the newer server copy is merged, not overwritten */
  server = { rev: 7, data: { learning: { 'kl:th-sv': { lessons: { c: { best: 100, attempts: 1, done: true, last: 20, firstDone: 20 } }, current: 'd', timeMs: 50, lastAt: 20, tests: [] } } } };
  store.mutate(ff => { F.recordLesson(ff, pid, 'kl:th-sv', 'e', 50, 1000, 60); });
  await SS.push();
  assert.equal(server.rev, 8);
  const L = server.data.learning['kl:th-sv'].lessons;
  assert.ok(L.a && L.b && L.c && L.e, 'lessons from both devices are kept');
  /* activities of other learners are never sent */
  store.mutate(ff => { ff.log.push({ id: 'e2', pid: mia, ts: 11, area: 'kids', kind: 'quiz', title: 'Mia quiz', ms: 1, score: 1, max: 1 }); });
  await SS.push();
  assert.ok(!calls.acts.includes('log:e2'));
  /* log out: saved, signed out, the student's local copy removed, Mia untouched */
  await SS.end(svc);
  f = store.get();
  assert.equal(loggedOut, true);
  assert.equal(SS.current(), null);
  assert.equal(F.getProfile(f, pid), null);
  assert.equal(f.learning[pid], undefined);
  assert.ok(!f.log.some(e => e.pid === pid));
  assert.ok(F.getProfile(f, mia));
  assert.ok(f.log.some(e => e.pid === mia));
});

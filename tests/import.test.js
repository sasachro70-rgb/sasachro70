// Teacher Content Manager: reading Excel, CSV and Word files, mapping columns, checking rows, building lessons. Run: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const plain = x => JSON.parse(JSON.stringify(x));
function load() {
  const ctx = { console, Math, JSON, TextDecoder, DecompressionStream, Response, Blob, Uint8Array, DataView, Map, Set, Error, Promise, String, Object, Array, Number, RegExp };
  ctx.globalThis = ctx; ctx.window = undefined; vm.createContext(ctx);
  for (const f of ['content/academy-th.js', 'js/family/srs.js', 'js/family/academy.js', 'js/content/import-core.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  return ctx;
}
const fx = n => fs.readFileSync(path.join(__dirname, 'fixtures', n));

test('Excel (.xlsx): columns found from the header, rows checked one by one, words grouped into lessons by level', async () => {
  const IC = load().FGH.importCore;
  const x = await IC.readXlsx(fx('ord.xlsx'));
  assert.equal(x.rows.length, 10); assert.deepEqual(plain(x.sheets), ['Ord']);
  const map = IC.autoMap(x.rows[0]);
  assert.deepEqual(plain(map), { lesson: 0, thai: 1, rom: 2, sv: 3, audio: 4, level: 5 });
  const r = IC.rowsToLessons(x.rows, map, { header: true, levels: ['L1', 'L2', 'L3', 'L4', 'L5'], prefix: 't-test' });
  assert.deepEqual(plain(r.lessons.map(l => [l.level, l.title.sv, l.vocab.length])), [['L1', 'Hälsningar', 3], ['L2', 'Familj', 3]]);
  assert.deepEqual(plain(r.errors.map(e => [e.row, e.code])), [[8, 'not_thai'], [9, 'no_swedish'], [10, 'bad_level']]);
  assert.equal(r.lessons[0].audio['สวัสดี'], 'sawatdi.mp3');
  assert.deepEqual(plain(r.lessons[0].vocab[1]), { t: 'ขอบคุณ', rom: 'khop khun', tr: { sv: 'Tack' }, note: null });
  /* the column order does not matter: the teacher can map columns by hand */
  const r2 = IC.rowsToLessons(x.rows.map(row => [row[3], row[1]]), { sv: 0, thai: 1 }, { header: true, lessonName: 'Allt' });
  assert.equal(r2.lessons[0].vocab.length, 7);
});

test('CSV: semicolons, quotes and a header; Word (.docx): headings, paragraphs, tables and lists in order', async () => {
  const IC = load().FGH.importCore;
  const c = IC.readCsv(fx('ord.csv').toString('utf8'));
  assert.deepEqual(plain(c.rows[1]), ['สวัสดี', 'Hej', 'vanlig hälsning; också hej då']);
  const rc = IC.rowsToLessons(c.rows, IC.autoMap(c.rows[0]), { header: true });
  assert.equal(rc.lessons[0].vocab[0].note.sv, 'vanlig hälsning; också hej då');
  const d = await IC.readDocx(fx('lektion.docx'));
  assert.deepEqual(plain(d.blocks.map(b => b.kind)), ['heading', 'para', 'para', 'para', 'table', 'list', 'list']);
  assert.equal(d.blocks[0].text, 'บทที่ ๑ ตลาดน้ำ');
  assert.deepEqual(plain(d.blocks[4].rows[1]), ['เรือ', 'ruea', 'båt']);
  /* the teacher marks what each block is; nothing is used without a mark */
  const roles = { 0: 'title', 1: 'reading', 2: 'reading', 3: 'explanation', 4: 'words', 5: 'questions', 6: 'questions' };
  const l = IC.blocksToLesson(d.blocks, roles, { id: 't-x-1', level: 'L1' });
  assert.equal(l.title.sv, 'บทที่ ๑ ตลาดน้ำ');
  assert.deepEqual(plain(l.dialogue[0]), { who: '', t: 'เรา ไป ตลาดน้ำ', rom: 'rao pai talat nam', tr: { sv: 'Vi åker till den flytande marknaden.' } });
  assert.deepEqual(plain(l.vocab.map(v => [v.t, v.rom, v.tr.sv])), [['เรือ', 'ruea', 'båt'], ['ผลไม้', 'phonlamai', 'frukt']]);
  assert.equal(l.grammar.body.sv, 'Den flytande marknaden ligger nära Bangkok. Man handlar från båtar.');
  assert.deepEqual(plain(l.exercises.filter(e => e.type === 'write').map(e => e.task.sv)), ['ใคร ไป ตลาดน้ำ ?', 'แม่ ซื้อ อะไร ?']);
});

test('PDF text repair, reading lines, and the checks before publishing; imported lessons work in the lesson engine', async () => {
  const ctx = load(), IC = ctx.FGH.importCore, AC = ctx.FGH.academy;
  assert.equal(IC.fixThai('วิเคราะห์ หาค าตอบ'), 'วิเคราะห์ หาคำตอบ');
  assert.equal(IC.fixThai('น ้าตาล'), 'น้ำตาล');
  assert.equal(IC.fixThai('ไป ป ่ า'), 'ไป ป่า');
  assert.equal(IC.fixThai('มะลิ ทา ยา'), 'มะลิ ทา ยา', 'real words are left alone');
  assert.deepEqual(plain(IC.splitLine('ยาย mormor')), { t: 'ยาย', rom: '', sv: 'mormor' });
  assert.deepEqual(plain(IC.splitLine('ตา morfar / ögon')), { t: 'ตา', rom: '', sv: 'morfar / ögon' });
  assert.deepEqual(plain(IC.splitLine('มะลิ มาหา ยาย')), { t: 'มะลิ มาหา ยาย', rom: '', sv: '' }, 'a Thai sentence stays whole');
  const wl = IC.blocksToLesson([{ i: 0, kind: 'para', text: 'ยาย   mormor\nหาย försvinna / bli frisk' }], { 0: 'words' }, { id: 'x', level: 'L1' });
  assert.deepEqual(plain(wl.vocab.map(v => [v.t, v.tr.sv])), [['ยาย', 'mormor'], ['หาย', 'försvinna / bli frisk']]);
  const b = IC.pdfPagesToBlocks(['สวัสดี ครับ\nHej', '']);
  assert.deepEqual(plain(b.map(x => [x.kind, x.page])), [['page', 1], ['para', 1], ['para', 1], ['page', 2]]);
  assert.deepEqual(plain(IC.parseLines('สวัสดี | sawatdi | Hej\nnot thai\nขอบคุณ | Tack')), [{ t: 'สวัสดี', rom: 'sawatdi', sv: 'Hej' }, { t: 'ขอบคุณ', rom: '', sv: 'Tack' }]);
  const course = IC.newCourse('t-demo', 'Demo');
  assert.deepEqual(plain(IC.validateCourse(course).map(p => p.code)), ['no_lessons']);
  const x = await IC.readXlsx(fx('ord.xlsx'));
  course.lessons = IC.rowsToLessons(x.rows, IC.autoMap(x.rows[0]), { header: true, levels: ['L1', 'L2', 'L3', 'L4', 'L5'], prefix: 't-demo' }).lessons;
  assert.deepEqual(plain(IC.validateCourse(course)), []);
  course.lessons.push(Object.assign({}, course.lessons[0]));
  assert.deepEqual(plain(IC.validateCourse(course).map(p => p.code)), ['duplicate_lesson_id']);
  course.lessons.pop();
  /* the same engine as every other course */
  ctx.FGH_CONTENT.academy.courses['t-demo'] = course;
  const c = AC.course('t-demo');
  for (const l of c.lessons) for (const e of AC.exercises(c, l, 'sv', Math.random)) if (e.opts) assert.ok(e.opts.some(o => String(o.v) === String(e.answer)), l.id + ' ' + e.type);
  assert.match(IC.courseId('Mitt ordförråd'), /^t-mitt-ordf-rr-d-[a-z0-9]{4}$|^t-mitt-[a-z0-9-]+-[a-z0-9]{4}$/);
});

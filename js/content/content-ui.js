/* Teacher Content Manager (content.html): the teacher's own courses as drafts, import from Excel/CSV/Word/PDF, lesson editor with
   audio and pictures, check, publish (students see it), unpublish, version history. Every right is checked by the database
   (supabase/migrations/0006); files are read in the browser (js/content/import-core.js) and nothing is published without the teacher. */
(function () {
  'use strict';
  const FGH = window.FGH, K = FGH.kit, IC = FGH.importCore;
  const { $, esc } = K;
  const t = (k, v) => K.t('cm.' + k, v);
  const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.2.146/build/';
  const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js';
  const ICONS = ['📘', '🌼', '🏫', '🐈', '🐸', '🎵', '🐟', '✈️', '🪷', '✏️', '🥭', '🛶', '🎄', '💬', '🍜', '🏠', '🐘', '🌧️'];
  const V = { screen: 'loading', err: null, msg: null, courses: [], id: null, title: '', doc: null, published: 0, dirty: false, edit: null, imp: null, hist: null, confirm: null, problems: null, busy: false };
  let svc = null;

  const errText = e => { const c = e && (e.code || e.message); return c === 'migration_missing' ? t('needsUpdate') : (K.t('school.err_' + c) !== 'school.err_' + c ? K.t('school.err_' + c) : String(c || '?')); };
  async function run(fn) { if (V.busy) return; V.busy = true; V.err = null; V.msg = null; render(); try { await fn(); } catch (e) { V.err = errText(e); } V.busy = false; render(); }
  const levelsOf = () => (V.doc && V.doc.levels && V.doc.levels.length ? V.doc.levels : IC.newCourse('x', 'x').levels);
  const lvName = id => { const l = levelsOf().find(x => x.id === id); return l ? (l.name[K.ui()] || l.name.sv) : id; };
  const changed = () => { V.dirty = true; };
  const L = obj => (obj && (obj[K.ui()] || obj.sv || obj.en || Object.values(obj)[0])) || '';

  /* ---------- start ---------- */
  async function boot() {
    const acc = FGH.teachingAccess ? await FGH.teachingAccess.check() : { ok: false, reason: 'not_configured' };
    if (!acc.ok || acc.kind !== 'staff') { V.screen = 'gate'; V.reason = acc.reason || (acc.ok ? 'student' : 'error'); return render(); }
    svc = acc.svc; V.me = acc.name;
    await loadCourses();
  }
  async function loadCourses() {
    try { V.courses = await svc.teacherCourses(); V.screen = 'courses'; }
    catch (e) { V.screen = 'gate'; V.reason = FGH.teachingAccess.reasonOf(e); }
    render();
  }
  async function openCourse(id) {
    const d = await svc.getCourseDraft(id);
    V.id = id; V.doc = d ? d.doc : IC.newCourse(id, V.newName || id); V.title = d ? d.title : (V.newName || id);
    V.published = d && !d.draft ? d.version : ((V.courses.find(c => c.id === id) || {}).version || 0);
    V.dirty = !d; V.edit = null; V.imp = null; V.hist = null; V.problems = null; V.screen = 'course';
  }
  async function saveDraft() {
    V.doc.name = Object.assign({}, V.doc.name, { sv: V.title, en: V.doc.name && V.doc.name.en && V.doc.name.en !== V.doc.name.sv ? V.doc.name.en : V.title });
    if (!V.doc.name.th) V.doc.name.th = V.title;
    await svc.saveCourseDraft(V.id, V.title, V.doc); V.dirty = false; V.msg = t('saved');
  }

  /* ---------- screens ---------- */
  function render() {
    document.documentElement.lang = K.ui(); document.body.dataset.area = 'parent';
    const S = { loading: () => '<p class="muted">' + esc(t('checking')) + '</p>', gate: gateHTML, courses: coursesHTML, course: courseHTML, lesson: lessonHTML, import: importHTML, history: historyHTML };
    const out = (V.err ? '<div class="warn" role="alert">⚠️ ' + esc(V.err) + '</div>' : '') + (V.msg ? '<div class="notebox" role="status">✓ ' + esc(V.msg) + '</div>' : '');
    const back = V.screen === 'course' ? 'toCourses' : (V.screen === 'lesson' || V.screen === 'import' || V.screen === 'history') ? 'toCourse' : null;
    $('app').innerHTML = K.header('📚 ' + t('title'), { back, extra: V.dirty && V.id ? '<span class="pill">● ' + esc(t('unsaved')) + '</span>' : '' }) + out + (S[V.screen] || S.loading)() + confirmHTML();
  }
  function confirmHTML() {
    if (!V.confirm) return '';
    return '<div class="overlay" role="dialog" aria-modal="true"><div class="card stack" style="max-width:460px"><p>' + esc(V.confirm.text) + '</p><div class="row">' +
      '<button class="btn primary" data-act="confirmYes">' + esc(t('yes')) + '</button><button class="btn" data-act="confirmNo">' + esc(t('no')) + '</button></div></div></div>';
  }
  function gateHTML() {
    return '<section class="card stack"><h2>🔒 ' + esc(t('title')) + '</h2><p>' + esc(V.reason === 'migration_missing' ? t('needsUpdate') : t('onlyStaff')) + '</p><div class="row"><a class="btn primary" href="teacher.html">' + esc(t('signIn')) + '</a></div></section>';
  }
  function coursesHTML() {
    let h = '<h2 class="sec">' + esc(t('myCourses')) + '</h2>';
    h += V.courses.length ? '<div class="courselist">' + V.courses.map(c => '<button class="coursecard" data-act="open" data-v="' + esc(c.id) + '"><span class="ci" aria-hidden="true">📘</span><b>' + esc(c.title) + '</b>' +
      '<span class="muted">' + esc(t('lessonsN', { n: c.lessons })) + ' · ' + esc(c.version ? t('published', { v: c.version }) : t('notPublished')) + '</span>' +
      (c.draft_at ? '<span class="muted">✏️ ' + esc(t('draftSaved', { d: K.fmtDate(Date.parse(c.draft_at), true) })) + '</span>' : '') + '</button>').join('') + '</div>'
      : '<p class="muted">' + esc(t('noCourses')) + '</p>';
    return h + '<form class="card row" data-form="newCourse"><label for="ncn">' + esc(t('courseName')) + '</label><input id="ncn" type="text" maxlength="80" required style="flex:1;min-height:48px"><button class="btn primary" type="submit">＋ ' + esc(t('create')) + '</button></form>';
  }
  function courseHTML() {
    const d = V.doc;
    let h = '<section class="card stack"><div class="row" style="margin:0"><input id="ctitle" type="text" maxlength="120" value="' + esc(V.title) + '" aria-label="' + esc(t('courseName')) + '" data-input="title" style="flex:1;min-height:48px;font-size:1.2rem;font-weight:700">' +
      '<span class="pill">' + esc(V.published ? t('published', { v: V.published }) : t('notPublished')) + '</span></div><p class="muted" style="margin:0">✏️ ' + esc(t('draftNote')) + '</p>' +
      '<div class="row" style="margin:0"><button class="btn primary" data-act="save"' + (V.busy ? ' disabled' : '') + '>💾 ' + esc(t('saveDraft')) + '</button><button class="btn" data-act="check">✅ ' + esc(t('publish')) + '</button>' +
      '<button class="btn" data-act="history">🕘 ' + esc(t('history')) + '</button>' + (V.published ? '<button class="btn" data-act="ask" data-v="unpublish">' + esc(t('unpublish')) + '</button>' : '') + '<button class="btn" data-act="ask" data-v="discard">' + esc(t('deleteDraft')) + '</button></div></section>';
    if (V.problems) h += '<section class="card stack"><h2 style="margin:0">' + esc(t('checkTitle')) + '</h2>' + (V.problems.length ? '<ul class="plain">' + V.problems.map(p => '<li>⚠️ ' + esc((p.lesson ? p.lesson + ': ' : '') + t('p.' + p.code) + (p.value != null ? ' (' + p.value + ')' : '')) + '</li>').join('') + '</ul>'
      : '<p>✓ ' + esc(t('ok')) + '</p><div class="row" style="margin:0"><button class="btn primary big" data-act="ask" data-v="publish">🚀 ' + esc(t('publish')) + '</button></div>') + '</section>';
    h += '<section class="card stack"><h2 style="margin:0">📥 ' + esc(t('importTitle')) + '</h2><p class="muted" style="margin:0">' + esc(t('importHelp')) + '</p>' +
      '<div class="row" style="margin:0"><input id="impf" type="file" accept=".xlsx,.xls,.csv,.txt,.docx,.pdf" data-change="importFile"></div></section>';
    h += '<h2 class="sec">' + esc(t('lessons')) + ' (' + d.lessons.length + ')</h2>';
    h += d.lessons.length ? '<div class="hwlist">' + d.lessons.map((l, i) => '<div class="hwrow" style="cursor:default"><span class="hwi" aria-hidden="true">' + esc(l.icon || '📘') + '</span><span class="hwt"><b>' + esc(L(l.title)) + '</b><span class="muted">' + esc(lvName(l.level)) + ' · ' +
      (l.vocab || []).length + ' ' + esc(t('words')) + ' · ' + (l.dialogue || []).length + ' ' + esc(t('lines')) + ' · ' + (l.exercises || []).filter(e => e.type === 'write').length + ' ' + esc(t('questions')) + '</span></span>' +
      '<span class="row" style="margin:0;flex-wrap:nowrap"><button class="btn small" data-act="editLesson" data-v="' + i + '">' + esc(t('edit')) + '</button><button class="btn small" data-act="move" data-v="' + i + ':-1" aria-label="' + esc(t('up')) + '"' + (i ? '' : ' disabled') + '>↑</button>' +
      '<button class="btn small" data-act="move" data-v="' + i + ':1" aria-label="' + esc(t('down')) + '"' + (i < d.lessons.length - 1 ? '' : ' disabled') + '>↓</button><button class="btn small" data-act="ask" data-v="removeLesson:' + i + '">' + esc(t('remove')) + '</button></span></div>').join('') + '</div>' : '';
    return h + '<div class="row"><button class="btn" data-act="addLesson">＋ ' + esc(t('addLesson')) + '</button></div>';
  }

  /* ---------- lesson editor ---------- */
  const pipe = rows => rows.map(r => r.join(' | ').replace(/( \| )+$/, '')).join('\n');
  function lessonHTML() {
    const l = V.doc.lessons[V.edit]; if (!l) return '';
    const vocabTxt = pipe((l.vocab || []).map(w => [w.t, w.rom || '', w.tr.sv || '', w.note ? w.note.sv || '' : ''])), readTxt = pipe((l.dialogue || []).map(x => [x.t, x.rom || '', x.tr.sv || '']));
    const qTxt = (l.exercises || []).filter(e => e.type === 'write').map(e => e.task.sv).join('\n');
    const field = (lbl, html) => '<label class="field">' + esc(lbl) + html + '</label>';
    let h = '<form class="card stack" data-form="lesson">' +
      '<div class="row" style="margin:0">' + field(t('tSv'), '<input id="ltsv" type="text" maxlength="120" required value="' + esc(l.title.sv || '') + '">') + field(t('tTh'), '<input id="ltth" type="text" maxlength="120" lang="th" value="' + esc(l.title.th || '') + '">') + '</div>' +
      '<div class="row" style="margin:0">' + field(t('level'), '<select id="llv">' + levelsOf().map(x => '<option value="' + esc(x.id) + '"' + (x.id === l.level ? ' selected' : '') + '>' + esc(L(x.name)) + '</option>').join('') + '</select>') +
      field(t('icon'), '<select id="lic">' + ICONS.concat(ICONS.includes(l.icon) ? [] : [l.icon || '📘']).map(i => '<option' + (i === l.icon ? ' selected' : '') + '>' + esc(i) + '</option>').join('') + '</select>') + '</div>' +
      field(t('goal'), '<input id="lgo" type="text" maxlength="200" value="' + esc((l.goal && l.goal.sv) || '') + '">') +
      field(t('reading'), '<textarea id="lrd" rows="6" lang="th">' + esc(readTxt) + '</textarea>') +
      field(t('vocab'), '<textarea id="lvo" rows="8" lang="th">' + esc(vocabTxt) + '</textarea>') +
      field(t('explSv'), '<textarea id="lesv" rows="4">' + esc((l.grammar && l.grammar.body && l.grammar.body.sv) || '') + '</textarea>') +
      field(t('explTh'), '<textarea id="leth" rows="4" lang="th">' + esc((l.grammar && l.grammar.body && l.grammar.body.th) || '') + '</textarea>') +
      field(t('openQ'), '<textarea id="lq" rows="4" lang="th">' + esc(qTxt) + '</textarea>') +
      '<div class="row" style="margin:0"><button class="btn primary" type="submit">' + esc(t('done')) + '</button></div></form>';
    /* media */
    const aud = l.audio || {};
    h += '<section class="card stack"><h2 style="margin:0">🔊 ' + esc(t('audio')) + '</h2><p class="muted" style="margin:0">' + esc(t('audioHelp')) + '</p>' +
      '<div class="tablewrap"><table><tbody>' + (l.vocab || []).map(w => '<tr><td lang="th"><b>' + esc(w.t) + '</b></td><td class="muted">' + esc(w.rom || '') + '</td><td>' + (aud[w.t] ? '🎵 ' + esc(String(aud[w.t]).split('/').pop()) : '<span class="muted">' + esc(t('noFile')) + '</span>') + '</td></tr>').join('') + '</tbody></table></div>' +
      '<label class="btn">⬆️ ' + esc(t('uploadAudio')) + '<input type="file" accept="audio/*" multiple data-change="audioFiles" hidden></label></section>';
    h += '<section class="card stack"><h2 style="margin:0">🖼️ ' + esc(t('images')) + '</h2>' + ((l.images || []).length ? '<ul class="plain">' + l.images.map((im, k) => '<li>🖼️ ' + esc(im.caption || String(im.path).split('/').pop()) + ' <button class="btn small" data-act="rmImage" data-v="' + k + '">' + esc(t('remove')) + '</button></li>').join('') + '</ul>' : '') +
      '<label class="btn">⬆️ ' + esc(t('uploadImage')) + '<input type="file" accept="image/*" multiple data-change="imageFiles" hidden></label></section>';
    /* preview with the real Thai voice */
    h += '<section class="card stack"><h2 style="margin:0">👁️ ' + esc(t('previewL')) + '</h2>' + (l.dialogue || []).map((x, k) => '<div><b lang="th">' + esc(x.t) + '</b> <button class="ghost" data-act="say" data-v="d' + k + '" aria-label="' + esc(t('listen')) + '">🔊</button><br><span class="muted">' + esc(x.rom || '') + (x.rom && x.tr.sv ? ' · ' : '') + esc(x.tr.sv || '') + '</span></div>').join('') +
      ((l.vocab || []).length ? '<div class="chips">' + l.vocab.map((w, k) => '<button class="chip" data-act="say" data-v="w' + k + '" lang="th">🔊 ' + esc(w.t) + ' – ' + esc(w.tr.sv) + '</button>').join('') + '</div>' : '') + '</section>';
    return h;
  }
  function readLessonForm() {
    const l = V.doc.lessons[V.edit];
    l.title = { sv: $('ltsv').value.trim() || 'Lektion' }; if ($('ltth').value.trim()) l.title.th = $('ltth').value.trim();
    l.level = $('llv').value; l.icon = $('lic').value; l.goal = { sv: $('lgo').value.trim() };
    l.dialogue = IC.parseLines($('lrd').value).map(x => ({ who: '', t: x.t, rom: x.rom, tr: { sv: x.sv } }));
    l.vocab = $('lvo').value.split(/\r?\n/).map(s => s.split('|').map(x => x.trim())).filter(p => p[0] && IC.THAI.test(p[0]))
      .map(p => ({ t: p[0], rom: p.length > 2 ? p[1] : '', tr: { sv: p.length > 2 ? p[2] : (p[1] || '') }, note: p[3] ? { sv: p[3] } : null }));
    l.grammar = { title: l.grammar && l.grammar.title ? l.grammar.title : { sv: 'Förklaring' }, body: { sv: $('lesv').value.trim() } };
    if ($('leth').value.trim()) { l.grammar.body.th = $('leth').value.trim(); l.grammar.title.th = l.grammar.title.th || 'คำอธิบาย'; }
    /* exercises: the teacher's open questions + listening questions made from the words (made again when the words change); others are kept */
    const qs = $('lq').value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const kept = (l.exercises || []).filter(e => !(e.type === 'write') && !(e.type === 'listen' && (e.auto || l.imported)));
    const auto = IC.makeLesson({ id: l.id, level: l.level, words: l.vocab }).exercises.map(e => Object.assign(e, { auto: true }));
    l.exercises = kept.concat(auto, qs.map(q => ({ type: 'write', task: { sv: q }, model: '' })));
    if (l.audio) for (const w in l.audio) if (!l.vocab.some(v => v.t === w)) delete l.audio[w];
    changed();
  }
  /* audio file names → words: same as the word, its romanization, or "1.mp3" = the first word */
  const base = n => String(n).replace(/\.[a-z0-9]+$/i, '').normalize('NFC').toLowerCase().replace(/[_\-\s]+/g, ' ').trim();
  function matchWord(l, name) {
    const b = base(name), list = l.vocab || [];
    return list.find(w => base(w.t) === b) || list.find(w => w.rom && base(w.rom) === b) || (/^\d+$/.test(b) ? list[+b - 1] : null) || null;
  }

  /* ---------- import ---------- */
  async function importFile(file) {
    const name = file.name.toLowerCase(), buf = await file.arrayBuffer();
    if (/\.xls$/.test(name)) throw Object.assign(new Error('xls'), { code: 'xls' });
    V.imp = { name: file.name, level: levelsOf()[0].id, lessonName: file.name.replace(/\.[^.]+$/, '') };
    if (/\.xlsx$/.test(name)) { V.imp.kind = 'table'; V.imp.buf = buf; await loadSheet(0); }
    else if (/\.(csv|txt)$/.test(name)) { V.imp.kind = 'table'; const x = IC.readCsv(new TextDecoder().decode(buf)); setRows(x); }
    else if (/\.docx$/.test(name)) { V.imp.kind = 'blocks'; const x = await IC.readDocx(buf); V.imp.blocks = x.blocks; V.imp.media = x.media; V.imp.roles = guessRoles(x.blocks); }
    else if (/\.pdf$/.test(name)) { V.imp.kind = 'blocks'; V.imp.pdf = true; V.msg = t('pdfLoading'); render(); const pages = await readPdf(buf); V.msg = null; V.imp.pages = pages; V.imp.blocks = IC.pdfPagesToBlocks(pages.map(p => p.text)); V.imp.roles = {}; V.imp.from = 1; V.imp.to = Math.min(pages.length, 5); }
    else throw Object.assign(new Error('type'), { code: 'type' });
    V.screen = 'import';
  }
  async function loadSheet(n) { const x = await IC.readXlsx(V.imp.buf, n); V.imp.sheet = n; V.imp.sheets = x.sheets; setRows(x); }
  function setRows(x) { V.imp.rows = x.rows; V.imp.sheets = V.imp.sheets || x.sheets; V.imp.header = IC.looksLikeHeader(x.rows[0] || []); V.imp.map = V.imp.header ? IC.autoMap(x.rows[0]) : { thai: 0, sv: (x.rows[0] || []).length > 2 ? 2 : 1, rom: (x.rows[0] || []).length > 2 ? 1 : undefined }; }
  function guessRoles(blocks) {
    const r = {};
    blocks.forEach(b => { r[b.i] = b.kind === 'heading' ? 'title' : b.kind === 'table' ? 'words' : b.kind === 'list' ? 'questions' : b.kind === 'image' ? 'image' : IC.THAI.test(b.text || '') ? 'reading' : 'explanation'; });
    const firstTitle = blocks.find(b => r[b.i] === 'title'); blocks.forEach(b => { if (r[b.i] === 'title' && b !== firstTitle) r[b.i] = 'explanation'; });
    return r;
  }
  function loadScript(src) { return new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.crossOrigin = 'anonymous'; s.onload = ok; s.onerror = () => bad(Object.assign(new Error('offline'), { code: 'offline' })); document.head.appendChild(s); }); }
  async function readPdf(buf) {
    if (!window.pdfjsLib) await loadScript(PDFJS + 'pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise; V.imp.pdfDoc = pdf;
    const pages = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const tc = await (await pdf.getPage(n)).getTextContent();
      let s = ''; tc.items.forEach(it => { s += it.str + (it.hasEOL ? '\n' : ''); });
      pages.push({ n, text: s.trim() });
    }
    return pages;
  }
  async function ocrPage(n) {
    if (!window.Tesseract) await loadScript(TESS);
    const page = await V.imp.pdfDoc.getPage(n), vp = page.getViewport({ scale: 2 }), cv = document.createElement('canvas');
    cv.width = vp.width; cv.height = vp.height; await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    const r = await window.Tesseract.recognize(cv, 'tha+swe');
    V.imp.pages[n - 1].text = r.data.text.trim(); V.imp.pages[n - 1].ocr = true;
    const roles = V.imp.roles; V.imp.blocks = IC.pdfPagesToBlocks(V.imp.pages.map(p => p.text)); V.imp.roles = roles;
  }
  function tableResult() { const lv = levelsOf().map(x => x.id); return IC.rowsToLessons(V.imp.rows, V.imp.map, { header: V.imp.header, levels: lv, level: V.imp.level, lessonName: V.imp.lessonName, prefix: V.id }); }
  function importHTML() {
    const I = V.imp; if (!I) return '';
    let h = '<section class="card"><h2 style="margin:0">📥 ' + esc(I.name) + '</h2></section>';
    if (I.kind === 'table') {
      const cols = Math.max(0, ...I.rows.slice(0, 30).map(r => r.length)), r = tableResult();
      h += '<section class="card stack">' + (I.sheets && I.sheets.length > 1 ? '<label class="field">' + esc(t('sheet')) + '<select data-change="sheet">' + I.sheets.map((s, k) => '<option value="' + k + '"' + (k === I.sheet ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select></label>' : '') +
        '<label class="row" style="margin:0"><input type="checkbox" data-change="header"' + (I.header ? ' checked' : '') + '> ' + esc(t('hasHeader')) + '</label><h3 style="margin:0">' + esc(t('mapTitle')) + '</h3><div class="mapgrid">' +
        IC.FIELDS.map(f => '<label class="field">' + esc(t('f.' + f)) + '<select data-change="map" data-f="' + f + '"><option value="">' + esc(t('none')) + '</option>' +
          Array.from({ length: cols }, (_, k) => '<option value="' + k + '"' + (I.map[f] === k ? ' selected' : '') + '>' + String.fromCharCode(65 + (k % 26)) + (I.header && I.rows[0][k] ? ' – ' + esc(String(I.rows[0][k]).slice(0, 24)) : '') + '</option>').join('') + '</select></label>').join('') + '</div>' +
        '<div class="row" style="margin:0"><label class="field">' + esc(t('defLevel')) + '<select data-change="level">' + levelsOf().map(x => '<option value="' + esc(x.id) + '"' + (x.id === I.level ? ' selected' : '') + '>' + esc(L(x.name)) + '</option>').join('') + '</select></label>' +
        '<label class="field">' + esc(t('defLesson')) + '<input type="text" data-input="lessonName" value="' + esc(I.lessonName) + '"></label></div></section>';
      h += '<section class="card tablewrap"><h3>' + esc(t('preview')) + '</h3><table><tbody>' + I.rows.slice(0, 8).map((row, k) => '<tr' + (k === 0 && I.header ? ' class="muted"' : '') + '>' + Array.from({ length: cols }, (_, c) => '<td lang="th">' + esc(row[c] || '') + '</td>').join('') + '</tr>').join('') + '</tbody></table></section>';
      h += '<section class="card stack"><h3 style="margin:0">✓ ' + esc(t('result', { n: r.count, m: r.lessons.length })) + '</h3>' + r.lessons.map(l => '<p style="margin:0">📘 <b>' + esc(l.title.sv) + '</b> · ' + esc(lvName(l.level)) + ' · ' + l.vocab.length + ' ' + esc(t('words')) + '</p>').join('') +
        (r.errors.length ? '<h3 style="margin:.4rem 0 0">' + esc(t('problems')) + ' (' + r.errors.length + ')</h3><ul class="plain">' + r.errors.slice(0, 50).map(e => '<li>⚠️ ' + esc(t('row', { n: e.row }) + ': ' + t('e.' + e.code) + (e.value ? ' – ' + e.value : '')) + '</li>').join('') + '</ul>' : '') +
        (r.warnings.length ? '<h3 style="margin:.4rem 0 0">' + esc(t('warnings')) + '</h3><ul class="plain">' + r.warnings.slice(0, 50).map(e => '<li>ℹ️ ' + esc(t('row', { n: e.row }) + ': ' + t('e.' + e.code) + (e.value ? ' – ' + e.value : '')) + '</li>').join('') + '</ul>' : '') +
        '<div class="row" style="margin:0"><button class="btn primary big" data-act="addTable"' + (r.lessons.length ? '' : ' disabled') + '>＋ ' + esc(t('addToDraft')) + '</button></div></section>';
    } else {
      const shown = I.pdf ? I.blocks.filter(b => b.page >= I.from && b.page <= I.to) : I.blocks;
      h += '<section class="card stack"><h3 style="margin:0">' + esc(t('blocksTitle')) + '</h3><p class="muted" style="margin:0">' + esc(t('blocksHelp')) + '</p>' +
        (I.pdf ? '<div class="row" style="margin:0"><b>' + esc(t('pages')) + '</b> ' + esc(t('from')) + ' <input type="number" min="1" max="' + I.pages.length + '" value="' + I.from + '" data-change="from" style="width:5em"> ' + esc(t('to')) + ' <input type="number" min="1" max="' + I.pages.length + '" value="' + I.to + '" data-change="to" style="width:5em"> / ' + I.pages.length +
          ' · ' + esc(t('markPages')) + ' <select id="bulkRole">' + ['skip', 'title', 'reading', 'explanation', 'words', 'questions'].map(r => '<option value="' + r + '">' + esc(t('role.' + r)) + '</option>').join('') + '</select><button class="btn small" data-act="bulkRole">' + esc(t('apply')) + '</button></div>' : '') +
        '<div class="row" style="margin:0"><label class="field">' + esc(t('lessonLevel')) + '<select data-change="level">' + levelsOf().map(x => '<option value="' + esc(x.id) + '"' + (x.id === I.level ? ' selected' : '') + '>' + esc(L(x.name)) + '</option>').join('') + '</select></label></div></section>';
      h += '<div class="blocks">' + shown.map(b => {
        if (b.kind === 'page') { const p = I.pages[b.page - 1]; return '<h3 class="sec">' + esc(t('page', { n: b.page })) + (p && !p.text ? ' · <span class="muted">' + esc(t('emptyPage')) + '</span> <button class="btn small" data-act="ocr" data-v="' + b.page + '">🔎 ' + esc(t('ocr')) + '</button>' : '') + (p && p.ocr ? ' <span class="pill">OCR – ' + esc(t('ocrNote')) + '</span>' : '') + '</h3>'; }
        const role = I.roles[b.i] || 'skip';
        const body = b.kind === 'table' ? '<table><tbody>' + b.rows.slice(0, 6).map(r => '<tr>' + r.map(c => '<td lang="th">' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>' + (b.rows.length > 6 ? '<span class="muted">… ' + b.rows.length + '</span>' : '')
          : b.kind === 'image' ? '🖼️ ' + esc(b.name) : '<span lang="th" style="white-space:pre-wrap">' + esc(b.text) + '</span>';
        return '<div class="block role-' + role + '"><select data-change="role" data-i="' + b.i + '" aria-label="' + esc(t('blocksTitle')) + '">' + ['skip', 'title', 'reading', 'explanation', 'words', 'questions', 'image'].filter(r => b.kind === 'image' ? (r === 'skip' || r === 'image') : r !== 'image').map(r => '<option value="' + r + '"' + (r === role ? ' selected' : '') + '>' + esc(t('role.' + r)) + '</option>').join('') + '</select><div class="bb">' + body + '</div></div>';
      }).join('') + '</div><div class="row"><button class="btn primary big" data-act="addBlocks">＋ ' + esc(t('makeLesson')) + '</button></div>';
    }
    return h;
  }

  /* ---------- history ---------- */
  function historyHTML() {
    if (!V.hist) return '<p class="muted">…</p>';
    return '<section class="card stack"><h2 style="margin:0">🕘 ' + esc(t('history')) + '</h2>' + (V.hist.length ? '<ul class="plain">' + V.hist.map(h => '<li class="row" style="margin:0;justify-content:space-between"><span><b>v' + h.version + '</b> · ' + esc(h.title) + ' · ' + esc(t('lessonsN', { n: h.lessons })) + ' · <span class="muted">' + esc(K.fmtDate(Date.parse(h.published_at), true)) + '</span></span><button class="btn small" data-act="ask" data-v="restore:' + h.version + '">' + esc(t('restore')) + '</button></li>').join('') + '</ul>' : '<p class="muted">' + esc(t('noHistory')) + '</p>') + '</section>';
  }

  /* ---------- actions ---------- */
  const newLessonId = () => { let k = V.doc.lessons.length + 1, id; do { id = V.id + '-' + k++; } while (V.doc.lessons.some(l => l.id === id)); return id; };
  const ACT = {
    setUi(v) { K.setUi(v); render(); },
    open(v) { V.newName = null; run(() => openCourse(v)); },
    toCourses() { if (V.dirty && !confirm(t('leaveAsk'))) return; V.id = null; V.doc = null; V.dirty = false; run(loadCourses); },
    toCourse() { if (V.screen === 'lesson') readLessonForm(); V.screen = 'course'; V.imp = null; render(); },
    save() { run(saveDraft); },
    check() { V.problems = IC.validateCourse(V.doc); render(); },
    history() { V.screen = 'history'; V.hist = null; run(async () => { V.hist = await svc.courseHistory(V.id); }); },
    addLesson() { V.doc.lessons.push(IC.makeLesson({ id: newLessonId(), level: levelsOf()[0].id, title: 'Ny lektion' })); changed(); V.edit = V.doc.lessons.length - 1; V.screen = 'lesson'; render(); },
    editLesson(v) { V.edit = +v; V.screen = 'lesson'; render(); window.scrollTo(0, 0); },
    move(v) { const [i, d] = v.split(':').map(Number), a = V.doc.lessons, j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; changed(); render(); },
    rmImage(v) { readLessonForm(); V.doc.lessons[V.edit].images.splice(+v, 1); changed(); render(); },
    say(v) { const l = V.doc.lessons[V.edit]; readLessonForm(); const x = v[0] === 'd' ? l.dialogue[+v.slice(1)] : l.vocab[+v.slice(1)]; if (x && FGH.voice) FGH.voice.say(x.t, 'th'); },
    addTable() { const r = tableResult(); r.lessons.forEach(l => { l.id = newLessonId(); V.doc.lessons.push(l); }); changed(); V.imp = null; V.screen = 'course'; V.msg = t('result', { n: r.count, m: r.lessons.length }); render(); },
    addBlocks() {
      run(async () => {
        const I = V.imp;
        for (const b of I.blocks) if (b.kind === 'image' && I.roles[b.i] === 'image' && I.media && I.media[b.src] && !b.uploaded) {
          const ext = (b.name.split('.').pop() || 'png').toLowerCase(), type = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/png';
          b.uploaded = await svc.uploadCourseMedia(V.id, new Blob([I.media[b.src]], { type }), 'img', b.name);
        }
        const l = IC.blocksToLesson(I.blocks, I.roles, { id: newLessonId(), level: I.level, title: I.name });
        V.doc.lessons.push(l); changed(); V.imp = null; V.edit = V.doc.lessons.length - 1; V.screen = 'lesson';
      });
    },
    bulkRole() { const r = $('bulkRole').value; V.imp.blocks.filter(b => b.kind !== 'page' && b.page >= V.imp.from && b.page <= V.imp.to).forEach(b => { V.imp.roles[b.i] = r; }); render(); },
    ocr(v) { V.msg = t('ocrBusy'); render(); run(() => ocrPage(+v)); },
    ask(v) {
      const [what, x] = v.split(':');
      const text = what === 'publish' ? t('publishAsk') : what === 'unpublish' ? t('unpublishAsk') : what === 'discard' ? t('leaveAsk') : what === 'restore' ? t('restoreAsk', { v: x }) : t('removeAsk', { t: L(V.doc.lessons[+x].title) });
      V.confirm = { v, text }; render();
    },
    confirmNo() { V.confirm = null; render(); },
    confirmYes() {
      const [what, x] = V.confirm.v.split(':'); V.confirm = null;
      if (what === 'removeLesson') { V.doc.lessons.splice(+x, 1); changed(); return render(); }
      run(async () => {
        if (what === 'publish') { await saveDraft(); const r = await svc.publishCourseDraft(V.id); V.published = r.version; V.problems = null; V.msg = t('publishedOk', { v: r.version }); }
        if (what === 'unpublish') { if (V.dirty) await saveDraft(); await svc.unpublishCourse(V.id); V.published = 0; }
        if (what === 'discard') { await svc.deleteCourseDraft(V.id); await loadCourses(); if (V.courses.some(c => c.id === V.id)) await openCourse(V.id); else { V.id = null; V.screen = 'courses'; } }
        if (what === 'restore') { await svc.restoreCourseVersion(V.id, +x); await openCourse(V.id); }
      });
    }
  };
  K.bindActs(ACT);
  document.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target.dataset.form;
    if (f === 'newCourse') { const name = $('ncn').value.trim(); if (!name) return; V.newName = name; const id = IC.courseId(name); run(async () => { await openCourse(id); V.title = name; V.doc = IC.newCourse(id, name, V.me); await saveDraft(); V.courses = await svc.teacherCourses(); }); }
    if (f === 'lesson') { readLessonForm(); V.screen = 'course'; render(); }
  });
  document.addEventListener('input', e => {
    const k = e.target.dataset.input; if (!k) return;
    if (k === 'title') { V.title = e.target.value; changed(); }
    if (k === 'lessonName' && V.imp) { V.imp.lessonName = e.target.value; }
  });
  document.addEventListener('change', async e => {
    const c = e.target.dataset.change; if (!c) return;
    const I = V.imp;
    if (c === 'importFile') { const file = e.target.files[0]; if (!file) return; run(async () => { try { await importFile(file); } catch (err) { throw Object.assign(new Error(err.code === 'xls' ? t('xlsOld') : t('readError')), { code: err.code === 'xls' ? t('xlsOld') : t('readError') }); } }); return; }
    if (c === 'sheet') return run(() => loadSheet(+e.target.value));
    if (c === 'header') { I.header = e.target.checked; if (I.header) I.map = IC.autoMap(I.rows[0]); }
    if (c === 'map') { const v = e.target.value; if (v === '') delete I.map[e.target.dataset.f]; else I.map[e.target.dataset.f] = +v; }
    if (c === 'level') I.level = e.target.value;
    if (c === 'role') I.roles[e.target.dataset.i] = e.target.value;
    if (c === 'from') I.from = Math.max(1, +e.target.value || 1);
    if (c === 'to') I.to = Math.max(I.from, +e.target.value || I.from);
    if (c === 'audioFiles' || c === 'imageFiles') {
      readLessonForm(); const l = V.doc.lessons[V.edit], files = Array.from(e.target.files || []);
      return run(async () => {
        const unmatched = [];
        for (const file of files) {
          if (c === 'audioFiles') { const w = matchWord(l, file.name); if (!w) { unmatched.push(file.name); continue; } const path = await svc.uploadCourseMedia(V.id, file, 'audio'); l.audio = l.audio || {}; l.audio[w.t] = path; }
          else { const path = await svc.uploadCourseMedia(V.id, file, 'img'); l.images = (l.images || []).concat([{ path, caption: base(file.name) }]); }
        }
        changed();
        if (unmatched.length) V.err = t('audioHelp') + ' – ' + unmatched.join(', ');
      });
    }
    render();
  });
  window.addEventListener('beforeunload', e => { if (V.dirty) { e.preventDefault(); e.returnValue = ''; } });
  render();
  boot().catch(e => { V.screen = 'gate'; V.reason = 'error'; V.err = errText(e); render(); });
  window.__content = { state: () => V };
})();

/* Teacher Content Manager – reading teachers' files and turning them into lessons. No DOM: tested in Node (tests/import.test.js).
   - unzip(): .xlsx and .docx are zip files of XML; read with the browser's DecompressionStream (no outside library).
   - xlsx: shared strings + the first (or chosen) sheet → rows of cells.   csv: commas, semicolons or tabs, quotes.
   - docx: paragraphs, headings, list items and tables (in order) → blocks.
   - autoMap(): guesses which column is Thai / romanization / Swedish / note / audio / lesson / level from the header.
   - rowsToLessons(): checks every row, reports problems row by row, groups words into lessons.
   - blocksToLesson(): blocks marked by the teacher (title, reading, explanation, words table, questions) → one lesson.
   - validateCourse(): the same checks the app needs before anything is published. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const THAI = /[\u0E00-\u0E7F]/;

  /* ---------- zip ---------- */
  async function inflateRaw(bytes) {
    const ds = new G.DecompressionStream('deflate-raw');
    const out = new G.Response(new G.Blob([bytes]).stream().pipeThrough(ds));
    return new Uint8Array(await out.arrayBuffer());
  }
  /* returns { name: Uint8Array } for every file in the zip (only the names asked for, when "want" is given) */
  async function unzip(buf, want) {
    const b = new Uint8Array(buf), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let eocd = -1;
    for (let i = b.length - 22; i >= Math.max(0, b.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('not_a_zip');
    const count = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
    const files = {}, dec = new G.TextDecoder();
    for (let k = 0; k < count; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('bad_zip');
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = dec.decode(b.subarray(p + 46, p + 46 + nlen));
      p += 46 + nlen + xlen + clen;
      if (want && !want(name)) continue;
      const lnlen = dv.getUint16(off + 26, true), lxlen = dv.getUint16(off + 28, true), start = off + 30 + lnlen + lxlen;
      const data = b.subarray(start, start + csize);
      if (method === 0) files[name] = data.slice(); else if (method === 8) files[name] = await inflateRaw(data); else throw new Error('zip_method_' + method);
    }
    return files;
  }
  const text = u8 => new G.TextDecoder().decode(u8);

  /* ---------- tiny XML helpers (regex based; Office XML is regular enough for this) ---------- */
  const unxml = s => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&');
  const runs = xml => { let s = ''; xml.replace(/<w:(t|tab|br)\b[^>]*?(?:\/>|>([\s\S]*?)<\/w:\1>)/g, (m, tag, inner) => { s += tag === 't' ? unxml(inner || '') : tag === 'tab' ? '\t' : '\n'; return m; }); return s; };

  /* ---------- xlsx ---------- */
  const colIndex = ref => { const m = /^([A-Z]+)/.exec(ref || 'A'); let n = 0; for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  async function readXlsx(buf, sheetNo) {
    const f = await unzip(buf, n => /^xl\/(sharedStrings\.xml|workbook\.xml|worksheets\/sheet\d+\.xml)$/.test(n));
    const shared = [];
    if (f['xl/sharedStrings.xml']) text(f['xl/sharedStrings.xml']).replace(/<si>([\s\S]*?)<\/si>/g, (m, si) => { let s = ''; si.replace(/<t\b[^>]*>([\s\S]*?)<\/t>/g, (mm, t) => { s += unxml(t); return mm; }); shared.push(s); return m; });
    const sheets = Object.keys(f).filter(n => /worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => parseInt(a.match(/(\d+)\.xml$/)[1], 10) - parseInt(b.match(/(\d+)\.xml$/)[1], 10));
    const names = []; if (f['xl/workbook.xml']) text(f['xl/workbook.xml']).replace(/<sheet\b[^>]*name="([^"]*)"/g, (m, n) => { names.push(unxml(n)); return m; });
    const xml = text(f[sheets[Math.min(sheetNo || 0, sheets.length - 1)]] || new Uint8Array());
    const rows = [];
    xml.replace(/<row\b[^>]*>([\s\S]*?)<\/row>/g, (m, r) => {
      const row = [];
      r.replace(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g, (mm, attrs, inner) => {
        const ref = (/r="([A-Z]+\d+)"/.exec(attrs) || [])[1], type = (/t="(\w+)"/.exec(attrs) || [])[1];
        let v = '';
        if (type === 'inlineStr') { (inner || '').replace(/<t\b[^>]*>([\s\S]*?)<\/t>/g, (a, t) => { v += unxml(t); return a; }); }
        else { const raw = (/<v>([\s\S]*?)<\/v>/.exec(inner || '') || [])[1]; v = raw == null ? '' : type === 's' ? (shared[+raw] || '') : unxml(raw); }
        row[ref ? colIndex(ref) : row.length] = v; return mm;
      });
      for (let i = 0; i < row.length; i++) if (row[i] == null) row[i] = '';
      rows.push(row); return m;
    });
    return { rows: rows.filter(r => r.some(c => String(c).trim())), sheets: names.length ? names : sheets.map((s, i) => 'Sheet ' + (i + 1)) };
  }

  /* ---------- csv ---------- */
  function readCsv(str) {
    str = String(str).replace(/^\uFEFF/, '');
    const first = str.split(/\r?\n/)[0] || '', sep = [';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (q) { if (ch === '"') { if (str[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && str[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return { rows: rows.filter(r => r.some(c => c.trim())), sheets: ['CSV'] };
  }

  /* ---------- docx ---------- */
  async function readDocx(buf) {
    const f = await unzip(buf, n => n === 'word/document.xml' || n === 'word/_rels/document.xml.rels' || /^word\/media\//.test(n));
    const xml = text(f['word/document.xml'] || new Uint8Array());
    const rels = {}; if (f['word/_rels/document.xml.rels']) text(f['word/_rels/document.xml.rels']).replace(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g, (m, id, tg) => { rels[id] = 'word/' + tg.replace(/^\/?word\//, ''); return m; });
    const body = (/<w:body>([\s\S]*)<\/w:body>/.exec(xml) || [])[1] || '';
    const blocks = [];
    const para = p => {
      const style = (/<w:pStyle w:val="([^"]+)"/.exec(p) || [])[1] || '';
      const t = runs(p).replace(/[ \t]+\n/g, '\n').trim();
      const imgs = []; p.replace(/r:embed="([^"]+)"/g, (m, id) => { if (rels[id]) imgs.push(rels[id]); return m; });
      imgs.forEach(src => blocks.push({ kind: 'image', src, name: src.split('/').pop() }));
      if (!t) return;
      const h = /^(Heading|Rubrik|berschrift|Title|Titel)\s*(\d)?/i.exec(style);
      blocks.push({ kind: h ? 'heading' : (/<w:numPr>/.test(p) || /^(List|Liste|Lista|Listst)/i.test(style)) ? 'list' : 'para', level: h ? (+h[2] || 1) : 0, text: t });
    };
    /* tables and paragraphs in document order */
    const re = /<w:tbl>([\s\S]*?)<\/w:tbl>|<w:p\b[^>]*?(?:\/>|>([\s\S]*?)<\/w:p>)/g; let m;
    while ((m = re.exec(body))) {
      if (m[1] != null) {
        const rows = []; m[1].replace(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g, (a, tr) => { const r = []; tr.replace(/<w:tc>([\s\S]*?)<\/w:tc>/g, (b2, tc) => { r.push(runs(tc).trim()); return b2; }); rows.push(r); return a; });
        if (rows.length) blocks.push({ kind: 'table', rows });
      } else para(m[0]);
    }
    const media = {}; Object.keys(f).filter(n => /^word\/media\//.test(n)).forEach(n => { media[n] = f[n]; });
    return { blocks: blocks.map((b, i) => Object.assign({ i }, b)), media };
  }

  /* ---------- PDF text → blocks (the PDF itself is read with pdf.js in the page) ---------- */
  function pdfPagesToBlocks(pages) {
    const out = [];
    pages.forEach((p, n) => {
      out.push({ kind: 'page', page: n + 1, text: '' });
      String(p || '').split(/\n+/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean).forEach(line => out.push({ kind: 'para', page: n + 1, text: fixThai(line) }));
    });
    return out.map((b, i) => Object.assign({ i }, b));
  }
  /* PDFs made from Word often split สระอำ as "ท า" and drop the nikhahit; common repairs only */
  function fixThai(s) {
    return String(s)
      .replace(/([\u0E01-\u0E2E])\s+([\u0E48-\u0E4B])า/g, '$1$2ำ')      // "น ้า" → น้ำ
      .replace(/([\u0E01-\u0E2E])\s+([\u0E48-\u0E4B])\s+/g, '$1$2')   // "ป ่ า" → ป่า
      .replace(/([\u0E01-\u0E2E])\s+า(?![\u0E31-\u0E3A\u0E47-\u0E4E])/g, '$1ำ');   // "ท า" → ทำ
  }

  /* ---------- column mapping ---------- */
  const FIELDS = ['thai', 'rom', 'sv', 'th', 'note', 'audio', 'lesson', 'level', 'image'];
  const GUESS = {
    thai: /^(thai|thailändska|ภาษาไทย|ไทย|คำ|คำศัพท์|word|ord)$/i, rom: /^(rom|romani[sz]ation|romanisering|transkription|uttal|คำอ่าน|อ่านว่า|pronunciation)$/i,
    sv: /^(svenska|swedish|sv|betydelse|meaning|สวีเดน|ภาษาสวีเดน|ความหมาย)$/i, th: /^(förklaring på thai|thai meaning|คำอธิบาย|ความหมายภาษาไทย)$/i,
    note: /^(note|notes|anteckning|kommentar|หมายเหตุ|tips?)$/i, audio: /^(audio|ljud|ljudfil|เสียง|ไฟล์เสียง|sound)$/i,
    lesson: /^(lesson|lektion|kapitel|chapter|บท|บทที่|บทเรียน)$/i, level: /^(level|nivå|ระดับ|steg)$/i, image: /^(image|bild|รูป|รูปภาพ|picture)$/i
  };
  function autoMap(header) {
    const map = {}; (header || []).forEach((h, i) => { const s = String(h || '').trim(); for (const f of FIELDS) if (map[f] == null && GUESS[f].test(s)) { map[f] = i; break; } });
    return map;
  }
  /* does the first row look like a header (no Thai letters in the Thai column guess)? */
  const looksLikeHeader = row => Object.keys(autoMap(row)).length >= 2;

  /* ---------- rows → lessons ---------- */
  const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\u0E00-\u0E7F]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'x';
  function rowsToLessons(rows, map, opts) {
    opts = opts || {};
    const errors = [], warnings = [], groups = new Map();
    const levels = opts.levels || ['L1'];
    const start = opts.header ? 1 : 0;
    const cell = (r, f) => map[f] == null ? '' : String(r[map[f]] == null ? '' : r[map[f]]).trim();
    for (let i = start; i < rows.length; i++) {
      const r = rows[i], n = i + 1, t = cell(r, 'thai'), sv = cell(r, 'sv');
      if (!t && !sv) continue;
      if (!t) { errors.push({ row: n, code: 'no_thai' }); continue; }
      if (!THAI.test(t)) { errors.push({ row: n, code: 'not_thai', value: t }); continue; }
      if (!sv) { errors.push({ row: n, code: 'no_swedish', value: t }); continue; }
      const rom = cell(r, 'rom'); if (rom && THAI.test(rom)) warnings.push({ row: n, code: 'rom_has_thai', value: rom });
      let lv = cell(r, 'level'); const lvNum = /(\d+)/.exec(lv); lv = lv ? (levels.includes(lv) ? lv : lvNum && levels[+lvNum[1] - 1] ? levels[+lvNum[1] - 1] : null) : (opts.level || levels[0]);
      if (!lv) { errors.push({ row: n, code: 'bad_level', value: cell(r, 'level') }); continue; }
      const lessonName = cell(r, 'lesson') || opts.lessonName || 'Ordlista';
      const key = lv + '|' + lessonName;
      if (!groups.has(key)) groups.set(key, { name: lessonName, level: lv, words: [], audio: {}, seen: new Set() });
      const g = groups.get(key);
      if (g.seen.has(t)) { warnings.push({ row: n, code: 'duplicate', value: t }); continue; }
      g.seen.add(t);
      const thm = cell(r, 'th'), note = cell(r, 'note'), audio = cell(r, 'audio'), image = cell(r, 'image');
      g.words.push({ t, rom: rom || '', tr: thm ? { sv, th: thm } : { sv }, note: note ? { sv: note } : null, audio: audio || null, image: image || null, row: n });
    }
    const lessons = Array.from(groups.values()).map((g, k) => makeLesson({ id: (opts.prefix || 'imp') + '-' + slug(g.name) + '-' + (k + 1), level: g.level, title: g.name, words: g.words }));
    return { lessons, errors, warnings, count: lessons.reduce((a, l) => a + l.vocab.length, 0) };
  }

  /* a complete lesson in the app's format; "Lyssna och välj" questions for the first words so the lesson has exercises of its own */
  function makeLesson(x) {
    const vocab = (x.words || []).map(w => ({ t: w.t, rom: w.rom || '', tr: w.tr, note: w.note || null }));
    const ex = [];
    vocab.slice(0, 6).forEach((w, i) => {
      const others = vocab.filter(o => o !== w).slice(i, i + 2); if (others.length < 2) return;
      ex.push({ type: 'listen', say: w.t, opts: [w.t].concat(others.map(o => o.t)), a: 0 });
    });
    (x.questions || []).forEach(q => ex.push({ type: 'write', task: { sv: q }, model: '' }));
    const audio = {}, images = [];
    (x.words || []).forEach(w => { if (w.audio) audio[w.t] = w.audio; if (w.image) images.push({ path: w.image, caption: w.t }); });
    return {
      id: x.id, level: x.level, icon: x.icon || '📘', skills: x.skills || ['vocabulary', 'reading'], imported: true,
      title: { sv: x.title || 'Lektion', th: x.titleTh || undefined }, goal: { sv: x.goal || '' },
      dialogue: (x.lines || []).map(l => ({ who: '', t: l.t, rom: l.rom || '', tr: { sv: l.sv || '' } })),
      vocab, grammar: { title: { sv: x.explTitle || 'Förklaring' }, body: { sv: x.explanation || '' } },
      exercises: ex, audio: Object.keys(audio).length ? audio : undefined, images: images.length ? images : undefined
    };
  }

  /* "ยาย mormor" (Thai, then Swedish, as in many teachers' word lists) → { t: 'ยาย', sv: 'mormor' } */
  const MIXED = /^([\u0E00-\u0E7F][\u0E00-\u0E7F\s\d.,!?'"“”()ๆฯ-]*?)\s+([A-Za-zÅÄÖÉåäöéü*(“"].*)$/;
  function splitLine(s) {
    s = String(s || '').trim();
    if (s.includes('|')) { const p = s.split('|').map(x => x.trim()); return { t: p[0], rom: p.length > 2 ? p[1] : '', sv: p.length > 2 ? p[2] : (p[1] || '') }; }
    const m = MIXED.exec(s); if (m) return { t: m[1].trim(), rom: '', sv: m[2].trim() };
    return { t: s, rom: '', sv: '' };
  }
  /* reading lines typed or pasted as "Thai | romanization | Swedish" (romanization and Swedish may be left out) */
  function parseLines(str) {
    return String(str || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(splitLine).filter(l => THAI.test(l.t));
  }

  /* blocks marked by the teacher → one lesson. roles: title, reading, explanation, words (table), questions, image, skip */
  function blocksToLesson(blocks, roles, x) {
    const pick = role => blocks.filter(b => roles[b.i] === role);
    const title = pick('title').map(b => b.text).join(' ').trim() || x.title || 'Lektion';
    const lines = [].concat(...pick('reading').map(b => String(b.text).split(/\n+/))).map(s => s.trim()).filter(s => THAI.test(s)).map(splitLine);
    const explanation = pick('explanation').map(b => b.text).join('\n\n');
    const words = [];
    pick('words').forEach(b => {
      if (b.kind === 'table') { const map = autoMap(b.rows[0]); const hasHeader = looksLikeHeader(b.rows[0]); const m = Object.keys(map).length >= 2 ? map : { thai: 0, sv: b.rows[0].length > 2 ? 2 : 1, rom: b.rows[0].length > 2 ? 1 : undefined };
        rowsToLessons(b.rows, m, { header: hasHeader }).lessons.forEach(l => words.push(...l.vocab.map(v => ({ t: v.t, rom: v.rom, tr: v.tr, note: v.note })))); }
      else String(b.text).split(/\n+/).forEach(s => {
        const p = s.split(/\s*[|–=:]\s*|\s{2,}/);
        if (p[0] && THAI.test(p[0]) && p[1]) return words.push({ t: p[0].trim(), rom: p.length > 2 ? p[1].trim() : '', tr: { sv: (p.length > 2 ? p.slice(2) : p.slice(1)).join(' ').trim() } });
        const m = splitLine(s); if (THAI.test(m.t) && m.sv) words.push({ t: m.t, rom: '', tr: { sv: m.sv } });
      });
    });
    const questions = [].concat(...pick('questions').map(b => String(b.text).split(/\n+/))).map(s => s.trim()).filter(Boolean);
    const images = pick('image').map(b => ({ path: b.uploaded || b.src, caption: b.name }));
    const l = makeLesson({ id: x.id, level: x.level, title, lines, explanation, words, questions });
    if (images.length) l.images = images;
    return l;
  }

  /* ---------- checks before publishing ---------- */
  function validateCourse(doc) {
    const problems = [];
    if (!doc || !Array.isArray(doc.lessons)) return [{ code: 'bad_document' }];
    if (!doc.lessons.length) problems.push({ code: 'no_lessons' });
    const ids = new Set(), lv = new Set((doc.levels || []).map(l => l.id));
    doc.lessons.forEach(l => {
      const at = l.id || '?';
      if (!l.id) problems.push({ lesson: at, code: 'lesson_without_id' }); else if (ids.has(l.id)) problems.push({ lesson: at, code: 'duplicate_lesson_id' }); ids.add(l.id);
      if (!l.title || !l.title.sv) problems.push({ lesson: at, code: 'no_title' });
      if (lv.size && !lv.has(l.level)) problems.push({ lesson: at, code: 'bad_level' });
      if (!(l.vocab || []).length && !(l.dialogue || []).length) problems.push({ lesson: at, code: 'empty_lesson' });
      (l.vocab || []).forEach(w => { if (!THAI.test(w.t || '') || !(w.tr && w.tr.sv)) problems.push({ lesson: at, code: 'bad_word', value: w.t }); });
      (l.dialogue || []).forEach(d => { if (!THAI.test(d.t || '')) problems.push({ lesson: at, code: 'bad_line', value: d.t }); });
      (l.exercises || []).forEach((e, k) => { if (e.opts && !(e.a >= 0 && e.a < e.opts.length)) problems.push({ lesson: at, code: 'bad_exercise', value: k }); });
    });
    return problems;
  }
  function newCourse(id, name, owner) {
    return { key: id, target: 'th', explain: ['sv'], sample: false, passPct: 70, track: 'thai', teacherCourse: true, owner: owner || '',
      name: { sv: name, en: name, th: name }, desc: { sv: '', en: '', th: '' },
      levels: [1, 2, 3, 4, 5].map(n => ({ id: 'L' + n, n, name: { sv: 'Nivå ' + n, en: 'Level ' + n, th: 'ระดับ ' + n } })), lessons: [] };
  }
  const courseId = name => 't-' + slug(name).replace(/[\u0E00-\u0E7F]+/g, '').replace(/^-+|-+$/g, '').slice(0, 24) + '-' + Math.random().toString(36).slice(2, 6);

  FGH.importCore = { splitLine, unzip, readXlsx, readCsv, readDocx, pdfPagesToBlocks, fixThai, autoMap, looksLikeHeader, rowsToLessons, makeLesson, parseLines, blocksToLesson, validateCourse, newCourse, courseId, slug, FIELDS, THAI };
})(typeof window !== 'undefined' ? window : globalThis);

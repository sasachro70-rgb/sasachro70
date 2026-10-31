/* ThaiElevate welcome page (index.html).
   - Menu language th / sv / en: shared with the Play Zone (it is the "ui" field of the hub's saved data, fgh.v1), so both pages agree.
   - Explanation language sv / th: saved on this device as "te.explain" and sent to the Academy as ?explain=.
     (Saving it in the student's profile on the server is part of the Academy phase.)
   The page is complete without this script; it only changes texts and links. Pure parts are exported for tests (tests/welcome.test.js). */
(function (G) {
  'use strict';
  const LANGS = ['th', 'sv', 'en'];
  const EXPLAIN = ['sv', 'th'];
  const HUB_KEY = 'fgh.v1', EXPLAIN_KEY = 'te.explain';

  const T = {
    en: {
      skip: 'Skip to the two areas', menuLang: 'Menu language', navPlay: 'Play Zone', navAcademy: 'Thai Learning Academy',
      account: 'Account', accSignIn: 'Sign in · family account', accStudent: 'Student login', accTeacher: 'Teacher', accParent: 'Parent Dashboard',
      confident: 'Learn Thai with confidence.',
      playKicker: 'Games & family', playDesc: 'Explore games and family activities.', playC1: 'Family games', playC2: 'Flag Quiz', playC3: 'Reward shop', playGo: 'Go to Play Zone',
      acKicker: 'Structured learning', acDesc: 'Learn Thai through structured lessons, teachers and practice.',
      acC1: 'Lessons, Level 1–5', acC2: 'Tones & pronunciation', acC3: 'Thai audio, adjustable speed', acC4: 'Teacher classes', acGo: 'Open the Academy',
      explainNote: 'Thai is always the language you learn. Choose the language the explanations are written in – you can change it at any time.',
      thNote: 'Thai explanations are being written. Until a lesson has them, it shows the Swedish explanation.',
      otherCourses: 'Other language courses (Swedish, English, Spanish)'
    },
    sv: {
      skip: 'Hoppa till de två delarna', menuLang: 'Menyspråk', navPlay: 'Play Zone', navAcademy: 'Thai Learning Academy',
      account: 'Konto', accSignIn: 'Logga in · familjekonto', accStudent: 'Elevinloggning', accTeacher: 'Lärare', accParent: 'Föräldrapanel',
      confident: 'Lär dig thailändska med självförtroende.',
      playKicker: 'Spel och familj', playDesc: 'Utforska spel och familjeaktiviteter.', playC1: 'Familjespel', playC2: 'Flaggquiz', playC3: 'Belöningsbutik', playGo: 'Till Play Zone',
      acKicker: 'Strukturerat lärande', acDesc: 'Lär dig thailändska med strukturerade lektioner, lärare och övningar.',
      acC1: 'Lektioner, nivå 1–5', acC2: 'Toner och uttal', acC3: 'Thailändskt ljud, justerbar hastighet', acC4: 'Lärarklasser', acGo: 'Öppna akademin',
      explainNote: 'Du lär dig alltid thailändska. Välj vilket språk förklaringarna ska vara på – du kan byta när som helst.',
      thNote: 'Förklaringar på thai håller på att skrivas. Tills en lektion har dem visas den svenska förklaringen.',
      otherCourses: 'Andra språkkurser (svenska, engelska, spanska)'
    },
    th: {
      skip: 'ข้ามไปยังสองส่วนหลัก', menuLang: 'ภาษาเมนู', navPlay: 'Play Zone', navAcademy: 'Thai Learning Academy',
      account: 'บัญชี', accSignIn: 'เข้าสู่ระบบ · บัญชีครอบครัว', accStudent: 'นักเรียนเข้าสู่ระบบ', accTeacher: 'ครู', accParent: 'แดชบอร์ดผู้ปกครอง',
      confident: 'เรียนภาษาไทยอย่างมั่นใจ',
      playKicker: 'เกมและครอบครัว', playDesc: 'สำรวจเกมและกิจกรรมสำหรับครอบครัว', playC1: 'เกมครอบครัว', playC2: 'ทายธงชาติ', playC3: 'ร้านแลกรางวัล', playGo: 'ไปที่ Play Zone',
      acKicker: 'การเรียนอย่างเป็นระบบ', acDesc: 'เรียนภาษาไทยผ่านบทเรียนที่เป็นระบบ ครูผู้สอน และแบบฝึกหัด',
      acC1: 'บทเรียน ระดับ 1–5', acC2: 'วรรณยุกต์และการออกเสียง', acC3: 'เสียงภาษาไทย ปรับความเร็วได้', acC4: 'ห้องเรียนกับครู', acGo: 'เข้าสู่ Academy',
      explainNote: 'ภาษาที่เรียนคือภาษาไทยเสมอ เลือกภาษาที่ใช้อธิบายได้ และเปลี่ยนได้ทุกเมื่อ',
      thNote: 'คำอธิบายภาษาไทยกำลังจัดทำ บทเรียนที่ยังไม่มีจะแสดงคำอธิบายภาษาสวีเดนไปก่อน',
      otherCourses: 'คอร์สภาษาอื่น (สวีเดน อังกฤษ สเปน)'
    }
  };

  /* ---------- pure ---------- */
  const text = (ui, key) => (T[ui] && T[ui][key]) || T.en[key] || key;
  const pickLang = (saved, nav) => LANGS.includes(saved) ? saved : (LANGS.includes(String(nav || '').slice(0, 2)) ? String(nav).slice(0, 2) : 'en');
  const pickExplain = v => EXPLAIN.includes(v) ? v : 'sv';
  const academyHref = explain => 'academy.html?course=th&explain=' + pickExplain(explain);
  /* sets only the "ui" field of the hub's saved data and keeps everything else exactly as it was */
  function withUi(raw, ui) {
    let s = null;
    try { s = raw ? JSON.parse(raw) : null; } catch (e) { return null; }   // unreadable data is never overwritten
    if (s === null) return JSON.stringify({ v: 1, ui });            // no hub data yet: the hub fills in the rest (js/hub-core.js loadState)
    if (typeof s !== 'object' || Array.isArray(s) || s.v !== 1) return null;
    s.ui = ui; return JSON.stringify(s);
  }

  G.TE_WELCOME = { T, LANGS, EXPLAIN, text, pickLang, pickExplain, academyHref, withUi };
  if (typeof document === 'undefined') return;

  /* ---------- page ---------- */
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode: the choice lasts until the page closes */ } };
  let hubUi = null; try { hubUi = (JSON.parse(get(HUB_KEY) || '{}') || {}).ui; } catch (e) { /* ignore */ }
  let ui = pickLang(hubUi, navigator.language);
  let explain = pickExplain(get(EXPLAIN_KEY));

  function apply() {
    document.documentElement.lang = ui;
    document.querySelectorAll('[data-t]').forEach(el => { el.textContent = text(ui, el.dataset.t); });
    document.querySelectorAll('[data-t-aria]').forEach(el => el.setAttribute('aria-label', text(ui, el.dataset.tAria)));
    document.querySelectorAll('[data-ui]').forEach(b => { const on = b.dataset.ui === ui; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    document.querySelectorAll('.js-academy').forEach(a => a.setAttribute('href', academyHref(explain)));
    document.querySelectorAll('input[name="explain"]').forEach(r => { r.checked = r.value === explain; });
    const n = document.getElementById('thNote'); if (n) n.hidden = explain !== 'th';
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ui]'); if (!b) return;
    ui = pickLang(b.dataset.ui); const next = withUi(get(HUB_KEY), ui); if (next) put(HUB_KEY, next); apply();
  });
  document.addEventListener('change', e => {
    if (e.target.name !== 'explain') return;
    explain = pickExplain(e.target.value); put(EXPLAIN_KEY, explain); apply();
  });
  /* the account menu closes when you tap outside it */
  document.addEventListener('click', e => { const d = document.querySelector('details.account'); if (d && d.open && !d.contains(e.target)) d.open = false; });
  apply();
})(typeof window !== 'undefined' ? window : globalThis);

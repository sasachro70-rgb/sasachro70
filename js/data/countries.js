/* Countries shared by the hub's games: names in Thai, Swedish and English, capital, flag drawing and look-alike groups.
   The first 22 are the same countries as the KeyKids flag quiz (keykids.html). Add a country by adding a row here and a flag below. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};

  /* code, Thai, Swedish, English, capital [th, sv, en] */
  const ROWS = [
    ['th', 'ไทย', 'Thailand', 'Thailand', ['กรุงเทพฯ', 'Bangkok', 'Bangkok']],
    ['cn', 'จีน', 'Kina', 'China', ['ปักกิ่ง', 'Peking', 'Beijing']],
    ['jp', 'ญี่ปุ่น', 'Japan', 'Japan', ['โตเกียว', 'Tokyo', 'Tokyo']],
    ['se', 'สวีเดน', 'Sverige', 'Sweden', ['สตอกโฮล์ม', 'Stockholm', 'Stockholm']],
    ['no', 'นอร์เวย์', 'Norge', 'Norway', ['ออสโล', 'Oslo', 'Oslo']],
    ['de', 'เยอรมนี', 'Tyskland', 'Germany', ['เบอร์ลิน', 'Berlin', 'Berlin']],
    ['fr', 'ฝรั่งเศส', 'Frankrike', 'France', ['ปารีส', 'Paris', 'Paris']],
    ['fi', 'ฟินแลนด์', 'Finland', 'Finland', ['เฮลซิงกิ', 'Helsingfors', 'Helsinki']],
    ['dk', 'เดนมาร์ก', 'Danmark', 'Denmark', ['โคเปนเฮเกน', 'Köpenhamn', 'Copenhagen']],
    ['is', 'ไอซ์แลนด์', 'Island', 'Iceland', ['เรคยาวิก', 'Reykjavik', 'Reykjavik']],
    ['it', 'อิตาลี', 'Italien', 'Italy', ['โรม', 'Rom', 'Rome']],
    ['es', 'สเปน', 'Spanien', 'Spain', ['มาดริด', 'Madrid', 'Madrid']],
    ['nl', 'เนเธอร์แลนด์', 'Nederländerna', 'Netherlands', ['อัมสเตอร์ดัม', 'Amsterdam', 'Amsterdam']],
    ['be', 'เบลเยียม', 'Belgien', 'Belgium', ['บรัสเซลส์', 'Bryssel', 'Brussels']],
    ['at', 'ออสเตรีย', 'Österrike', 'Austria', ['เวียนนา', 'Wien', 'Vienna']],
    ['ch', 'สวิตเซอร์แลนด์', 'Schweiz', 'Switzerland', ['เบิร์น', 'Bern', 'Bern']],
    ['pl', 'โปแลนด์', 'Polen', 'Poland', ['วอร์ซอ', 'Warszawa', 'Warsaw']],
    ['ua', 'ยูเครน', 'Ukraina', 'Ukraine', ['เคียฟ', 'Kyiv', 'Kyiv']],
    ['ie', 'ไอร์แลนด์', 'Irland', 'Ireland', ['ดับลิน', 'Dublin', 'Dublin']],
    ['gr', 'กรีซ', 'Grekland', 'Greece', ['เอเธนส์', 'Aten', 'Athens']],
    ['vn', 'เวียดนาม', 'Vietnam', 'Vietnam', ['ฮานอย', 'Hanoi', 'Hanoi']],
    ['id', 'อินโดนีเซีย', 'Indonesien', 'Indonesia', ['จาการ์ตา', 'Jakarta', 'Jakarta']],
    ['us', 'สหรัฐอเมริกา', 'USA', 'United States', ['วอชิงตัน ดี.ซี.', 'Washington D.C.', 'Washington, D.C.']],
    ['gb', 'สหราชอาณาจักร', 'Storbritannien', 'United Kingdom', ['ลอนดอน', 'London', 'London']],
    ['br', 'บราซิล', 'Brasilien', 'Brazil', ['บราซิเลีย', 'Brasília', 'Brasília']],
    ['in', 'อินเดีย', 'Indien', 'India', ['นิวเดลี', 'New Delhi', 'New Delhi']],
    ['mx', 'เม็กซิโก', 'Mexiko', 'Mexico', ['เม็กซิโกซิตี', 'Mexico City', 'Mexico City']],
    ['ar', 'อาร์เจนตินา', 'Argentina', 'Argentina', ['บัวโนสไอเรส', 'Buenos Aires', 'Buenos Aires']],
    ['tr', 'ตุรกี', 'Turkiet', 'Turkey', ['อังการา', 'Ankara', 'Ankara']],
    ['ca', 'แคนาดา', 'Kanada', 'Canada', ['ออตตาวา', 'Ottawa', 'Ottawa']]
  ];

  /* flags look alike within a group (Nordic crosses, tricolours, red with a symbol ...) */
  const GROUPS = [['se', 'no', 'fi', 'dk', 'is'], ['fr', 'it', 'ie', 'be', 'mx'], ['de', 'be', 'at', 'es'], ['nl', 'th', 'fr', 'at'],
    ['pl', 'id', 'at', 'ua'], ['cn', 'vn', 'tr'], ['ch', 'dk', 'at', 'ca'], ['gr', 'fi', 'is', 'se', 'ar'], ['us', 'gb'], ['in', 'ie', 'ar']];

  /* flag drawings, 30×20 */
  function starPts(cx, cy, r) {
    const p = [];
    for (let i = 0; i < 10; i++) { const a = (-90 + i * 36) * Math.PI / 180, rr = i % 2 ? r * 0.382 : r; p.push((cx + rr * Math.cos(a)).toFixed(2) + ',' + (cy + rr * Math.sin(a)).toFixed(2)); }
    return p.join(' ');
  }
  const star = (cx, cy, r, fill) => '<polygon points="' + starPts(cx, cy, r) + '" fill="' + fill + '"/>';
  const h3 = (a, b, c) => '<rect width="30" height="20" fill="' + a + '"/><rect y="6.67" width="30" height="6.67" fill="' + b + '"/><rect y="13.33" width="30" height="6.67" fill="' + c + '"/>';
  const v3 = (a, b, c) => '<rect width="30" height="20" fill="' + a + '"/><rect x="10" width="10" height="20" fill="' + b + '"/><rect x="20" width="10" height="20" fill="' + c + '"/>';
  const h2 = (a, b) => '<rect width="30" height="20" fill="' + a + '"/><rect y="10" width="30" height="10" fill="' + b + '"/>';
  const nordic = (bg, outer, inner) => '<rect width="30" height="20" fill="' + bg + '"/><rect x="8.2" width="5.5" height="20" fill="' + outer + '"/><rect y="7.5" width="30" height="5" fill="' + outer + '"/>' +
    (inner ? '<rect x="9.6" width="2.7" height="20" fill="' + inner + '"/><rect y="8.75" width="30" height="2.5" fill="' + inner + '"/>' : '');
  const FLAGS = {
    th: '<rect width="30" height="20" fill="#A51931"/><rect y="3.33" width="30" height="13.34" fill="#F4F5F8"/><rect y="6.67" width="30" height="6.66" fill="#2D2A4A"/>',
    jp: '<rect width="30" height="20" fill="#FFFFFF"/><circle cx="15" cy="10" r="6" fill="#BC002D"/>',
    se: '<rect width="30" height="20" fill="#006AA7"/><rect x="9.4" width="3.75" height="20" fill="#FECC00"/><rect y="8" width="30" height="4" fill="#FECC00"/>',
    no: nordic('#BA0C2F', '#FFFFFF', '#00205B'), is: nordic('#02529C', '#FFFFFF', '#DC1E35'),
    dk: '<rect width="30" height="20" fill="#C8102E"/><rect x="9" width="3" height="20" fill="#FFFFFF"/><rect y="8.5" width="30" height="3" fill="#FFFFFF"/>',
    fi: '<rect width="30" height="20" fill="#FFFFFF"/><rect x="8.3" width="5" height="20" fill="#002F6C"/><rect y="7.5" width="30" height="5" fill="#002F6C"/>',
    de: h3('#000000', '#DD0000', '#FFCE00'), nl: h3('#AE1C28', '#FFFFFF', '#21468B'), at: h3('#C8102E', '#FFFFFF', '#C8102E'),
    fr: v3('#0055A4', '#FFFFFF', '#EF4135'), it: v3('#009246', '#FFFFFF', '#CE2B37'), ie: v3('#169B62', '#FFFFFF', '#FF883E'), be: v3('#000000', '#FDDA24', '#EF3340'),
    pl: h2('#FFFFFF', '#DC143C'), ua: h2('#0057B7', '#FFD700'), id: h2('#CE1126', '#FFFFFF'),
    es: '<rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/>',
    ch: '<rect width="30" height="20" fill="#DA291C"/><rect x="13" y="4" width="4" height="12" fill="#FFFFFF"/><rect x="9" y="8" width="12" height="4" fill="#FFFFFF"/>',
    cn: '<rect width="30" height="20" fill="#DE2910"/>' + star(5, 5, 3, '#FFDE00') + star(10, 2, 1, '#FFDE00') + star(12, 4, 1, '#FFDE00') + star(12, 7, 1, '#FFDE00') + star(10, 9, 1, '#FFDE00'),
    vn: '<rect width="30" height="20" fill="#DA251D"/>' + star(15, 10, 6, '#FFFF00'),
    gr: Array.from({ length: 9 }, (_, i) => '<rect y="' + (i * 20 / 9).toFixed(3) + '" width="30" height="2.23" fill="' + (i % 2 ? '#FFFFFF' : '#0D5EAF') + '"/>').join('') +
      '<rect width="11.11" height="11.11" fill="#0D5EAF"/><rect y="4.44" width="11.11" height="2.23" fill="#FFFFFF"/><rect x="4.44" width="2.23" height="11.11" fill="#FFFFFF"/>',
    us: Array.from({ length: 13 }, (_, i) => '<rect y="' + (i * 20 / 13).toFixed(3) + '" width="30" height="1.54" fill="' + (i % 2 ? '#FFFFFF' : '#B22234') + '"/>').join('') +
      '<rect width="12" height="10.77" fill="#3C3B6E"/>' + Array.from({ length: 20 }, (_, i) => '<circle cx="' + (1.4 + (i % 5) * 2.3).toFixed(2) + '" cy="' + (1.4 + Math.floor(i / 5) * 2.6).toFixed(2) + '" r="0.42" fill="#FFFFFF"/>').join(''),
    gb: '<rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#FFFFFF" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#C8102E" stroke-width="1.4"/>' +
      '<path d="M15 0V20M0 10H30" stroke="#FFFFFF" stroke-width="6"/><path d="M15 0V20M0 10H30" stroke="#C8102E" stroke-width="3.4"/>',
    br: '<rect width="30" height="20" fill="#009C3B"/><polygon points="15,2.2 27.6,10 15,17.8 2.4,10" fill="#FFDF00"/><circle cx="15" cy="10" r="4.3" fill="#002776"/><path d="M10.9 9.2Q15 8.2 19.1 10.6" stroke="#FFFFFF" stroke-width="0.7" fill="none"/>',
    in: h3('#FF9933', '#FFFFFF', '#138808') + '<circle cx="15" cy="10" r="2.5" fill="none" stroke="#000080" stroke-width="0.5"/><circle cx="15" cy="10" r="0.5" fill="#000080"/>',
    mx: v3('#006847', '#FFFFFF', '#CE1126') + '<circle cx="15" cy="10" r="2" fill="#8C5A2B"/><circle cx="15" cy="10" r="1.1" fill="#4E8F3A"/>',
    ar: h3('#74ACDF', '#FFFFFF', '#74ACDF') + '<circle cx="15" cy="10" r="1.7" fill="#F6B40E"/>',
    tr: '<rect width="30" height="20" fill="#E30A17"/><circle cx="11" cy="10" r="5" fill="#FFFFFF"/><circle cx="12.25" cy="10" r="4" fill="#E30A17"/>' + star(16.4, 10, 2.2, '#FFFFFF'),
    ca: '<rect width="30" height="20" fill="#D80621"/><rect x="7.5" width="15" height="20" fill="#FFFFFF"/>' +
      '<path d="M15 4L16.2 6.8L18 6.2L17.4 9L19.6 8.2L19 10L20.4 10.6L17.6 12.6L18 14L15.4 13.4L15.4 16L14.6 16L14.6 13.4L12 14L12.4 12.6L9.6 10.6L11 10L10.4 8.2L12.6 9L12 6.2L13.8 6.8Z" fill="#D80621"/>'
  };

  const LANG_COL = { th: 1, sv: 2, en: 3 };
  const BY_CODE = {};
  const list = ROWS.map(r => {
    const c = { code: r[0], name: {}, capital: { th: r[4][0], sv: r[4][1], en: r[4][2] } };
    for (const l in LANG_COL) c.name[l] = r[LANG_COL[l]].normalize('NFC');
    BY_CODE[c.code] = c;
    return c;
  });

  function similar(code) {
    const s = new Set();
    GROUPS.forEach(g => { if (g.includes(code)) g.forEach(c => { if (c !== code) s.add(c); }); });
    return Array.from(s);
  }
  function flagSVG(code, cls, label) {
    return '<svg class="flag ' + (cls || '') + '" viewBox="0 0 30 20" role="img" aria-label="' + (label || 'flag') + '">' + FLAGS[code] + '</svg>';
  }

  FGH.countries = { list, codes: list.map(c => c.code), byCode: BY_CODE, similar, flagSVG, hasFlag: code => !!FLAGS[code] };
})(typeof window !== 'undefined' ? window : globalThis);

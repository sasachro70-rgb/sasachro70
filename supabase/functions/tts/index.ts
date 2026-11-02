// Pasathai – Edge Function "tts": natural Thai voice from Google Cloud Text-to-Speech.
//
// The browser sends Thai text; the function returns an mp3. The Google key never reaches the browser.
//   * Each sentence is generated once and stored in the private Storage bucket "tts-cache"; later requests for the same
//     sentence (from anyone) are served from there and cost nothing.
//   * Only new sentences count against the daily limits (migration 0007, public.tts_take_quota): per signed-in user,
//     per IP address for visitors, and in total. When a limit is reached the browser falls back to the device's own voice.
//   * Only Thai text, at most 400 characters per request, and only from the allowed web addresses (CORS).
//
// Secrets (Supabase → Edge Functions → Secrets, or: supabase secrets set NAME=value)
//   GOOGLE_TTS_API_KEY   required. An API key restricted to "Cloud Text-to-Speech API".
//   TTS_ALLOWED_ORIGINS  optional, comma separated. Default: https://sasachro70-rgb.github.io plus localhost.
//   TTS_VOICE_TYPES      optional, order of preference. Default: Chirp3-HD,Neural2,Wavenet,Standard
//   TTS_VOICE            optional, one exact voice name (e.g. th-TH-Chirp3-HD-Achernar) used for every request.
//   TTS_USER_DAILY       optional, new characters per caller per day. Default 6000.
//   TTS_TOTAL_DAILY      optional, new characters per day for everyone together. Default 30000 (about 900 000 a month,
//                        inside Google's monthly free amount for Chirp 3 HD / Neural2 voices; check your own billing).
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const env = (k: string, d = '') => Deno.env.get(k) ?? d;
const GKEY = env('GOOGLE_TTS_API_KEY');
const ORIGINS = env('TTS_ALLOWED_ORIGINS', 'https://sasachro70-rgb.github.io').split(',').map(s => s.trim()).filter(Boolean);
const TYPES = env('TTS_VOICE_TYPES', 'Chirp3-HD,Neural2,Wavenet,Standard').split(',').map(s => s.trim()).filter(Boolean);
const USER_DAILY = +env('TTS_USER_DAILY', '6000') || 6000;
const TOTAL_DAILY = +env('TTS_TOTAL_DAILY', '30000') || 30000;
const MAX = 400;
const BUCKET = 'tts-cache';
const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

const allowed = (o: string | null) => !!o && (ORIGINS.includes(o) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o));
function cors(o: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowed(o) ? o! : ORIGINS[0] || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Expose-Headers': 'x-voice, x-cache',
    Vary: 'Origin'
  };
}
const json = (o: string | null, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(o), 'Content-Type': 'application/json' } });

const tidy = (s: unknown) => String(s ?? '').replace(/\|/g, '').replace(/\s+/g, ' ').trim();
const THAI = /[฀-๿]/;
async function sha256(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
}

/* the best Thai voice this Google project offers, per gender; looked up once per function instance */
type GV = { name: string; ssmlGender: string; languageCodes: string[] };
let voiceCache: { at: number; list: GV[] } | null = null;
async function pickVoice(gender: string): Promise<string> {
  const fixed = env('TTS_VOICE'); if (fixed) return fixed;
  if (!voiceCache || Date.now() - voiceCache.at > 6 * 3600e3) {
    const r = await fetch('https://texttospeech.googleapis.com/v1/voices?languageCode=th-TH&key=' + encodeURIComponent(GKEY));
    if (!r.ok) throw new Error('voices ' + r.status);
    const d = await r.json();
    voiceCache = { at: Date.now(), list: (d.voices || []).filter((v: GV) => (v.languageCodes || []).includes('th-TH')) };
  }
  const list = voiceCache.list;
  const want = gender === 'male' ? 'MALE' : 'FEMALE';
  for (const type of TYPES) {
    const of = list.filter(v => v.name.includes('-' + type + '-')).sort((a, b) => a.name.localeCompare(b.name));
    const hit = of.find(v => v.ssmlGender === want) || of[0];
    if (hit) return hit.name;
  }
  if (list[0]) return list[0].name;
  throw new Error('no Thai voice in this Google project');
}

async function synth(text: string, voice: string): Promise<Uint8Array> {
  const r = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + encodeURIComponent(GKEY), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: 'th-TH', name: voice }, audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 24000 } })
  });
  if (!r.ok) throw new Error('synthesize ' + r.status + ' ' + (await r.text()).slice(0, 200));
  const d = await r.json();
  return Uint8Array.from(atob(d.audioContent), c => c.charCodeAt(0));
}

/* who is asking: a signed-in Supabase user (its id), otherwise a hash of the IP address */
async function caller(req: Request): Promise<string> {
  const auth = req.headers.get('authorization') || '';
  const tok = auth.replace(/^Bearer\s+/i, '');
  if (tok.split('.').length === 3) {
    try { const { data } = await admin.auth.getUser(tok); if (data && data.user) return 'u:' + data.user.id; } catch { /* treat as visitor */ }
  }
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'unknown';
  return 'ip:' + (await sha256('pasathai:' + ip)).slice(0, 32);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(origin) });
  if (req.method !== 'POST') return json(origin, 405, { error: 'method' });
  if (origin && !allowed(origin)) return json(origin, 403, { error: 'origin' });
  if (!GKEY) return json(origin, 503, { error: 'not_configured' });

  let body: { text?: string; gender?: string; lang?: string };
  try { body = await req.json(); } catch { return json(origin, 400, { error: 'bad_json' }); }
  const text = tidy(body.text);
  if ((body.lang || 'th') !== 'th' || !text || !THAI.test(text)) return json(origin, 400, { error: 'thai_only' });
  if (text.length > MAX) return json(origin, 413, { error: 'too_long', max: MAX });
  const gender = body.gender === 'male' ? 'male' : 'female';

  try {
    const voice = await pickVoice(gender);
    const path = 'th/' + (await sha256(voice + '\n' + text)) + '.mp3';
    const head = { ...cors(origin), 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Voice': voice };

    const hit = await admin.storage.from(BUCKET).download(path);
    if (hit.data) return new Response(hit.data, { headers: { ...head, 'X-Cache': 'hit' } });

    const who = await caller(req);
    const { data: ok, error } = await admin.rpc('tts_take_quota', { p_who: who, p_chars: text.length, p_limit: USER_DAILY, p_total: TOTAL_DAILY });
    if (error) return json(origin, 503, { error: 'migration_missing' });
    if (!ok) return json(origin, 429, { error: 'daily_limit' });

    const mp3 = await synth(text, voice);
    await admin.storage.from(BUCKET).upload(path, mp3, { contentType: 'audio/mpeg', upsert: true });
    return new Response(mp3, { headers: { ...head, 'X-Cache': 'miss' } });
  } catch (e) {
    console.error(e);
    return json(origin, 502, { error: 'tts_failed' });
  }
});

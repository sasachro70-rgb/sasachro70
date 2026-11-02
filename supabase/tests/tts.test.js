// Tests for supabase/migrations/0007_thai_cloud_voice.sql: the cloud-voice quota is only reachable by the Edge Function (service_role),
// limits per caller and in total hold, and the rollback works. Run: npm run test:security
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { PGlite } = require('@electric-sql/pglite');

const MIG = fs.readFileSync(path.join(__dirname, '..', 'migrations', '0007_thai_cloud_voice.sql'), 'utf8');
const ROLLBACK = fs.readFileSync(path.join(__dirname, '..', 'rollback', '0007_rollback.sql'), 'utf8');
const STANDIN = `
  do $$ begin if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if; end $$;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;
async function fresh() { const db = new PGlite(); await db.exec(STANDIN); await db.exec(MIG); return db; }
async function as(db, role, sql, params = []) { await db.exec('set role ' + role); try { return (await db.query(sql, params)).rows; } finally { await db.exec('reset role'); } }
const take = (db, who, n, lim, tot) => as(db, 'service_role', 'select public.tts_take_quota($1, $2, $3, $4) as ok', [who, n, lim, tot]).then(r => r[0].ok);

test('T1 browsers cannot read the usage table or call the quota function', async () => {
  const db = await fresh();
  for (const role of ['anon', 'authenticated']) {
    await assert.rejects(as(db, role, 'select * from public.tts_usage'));
    await assert.rejects(as(db, role, "select public.tts_take_quota('x', 10, 100, 1000)"));
    await assert.rejects(as(db, role, "insert into public.tts_usage (day, who) values (current_date, 'x')"));
  }
});

test('T2 per-caller and total daily limits hold; a refused call adds nothing', async () => {
  const db = await fresh();
  assert.equal(await take(db, 'u1', 60, 100, 150), true);
  assert.equal(await take(db, 'u1', 50, 100, 150), false);   // u1 would pass 100
  assert.equal(await take(db, 'u1', 40, 100, 150), true);    // exactly 100
  assert.equal(await take(db, 'u2', 60, 100, 150), false);   // total would pass 150
  assert.equal(await take(db, 'u2', 50, 100, 150), true);    // total exactly 150
  assert.equal(await take(db, 'u3', 1, 100, 150), false);
  assert.equal(await take(db, 'u3', 0, 100, 150), false);    // nonsense sizes are refused
  assert.equal(await take(db, 'u3', 6000, 99999, 99999), false);
  const rows = await as(db, 'service_role', 'select who, chars, calls from public.tts_usage order by who');
  assert.deepEqual(rows.map(r => [r.who, r.chars, r.calls]), [['*', 150, 3], ['u1', 100, 2], ['u2', 50, 1], ['u3', 0, 0]]);
});

test('T3 rollback removes the table and function', async () => {
  const db = await fresh();
  await db.exec(ROLLBACK);
  const r = await db.query("select to_regclass('public.tts_usage') as t, to_regproc('public.tts_take_quota') as f");
  assert.equal(r.rows[0].t, null); assert.equal(r.rows[0].f, null);
  await db.exec(MIG);   // and it can be applied again
});

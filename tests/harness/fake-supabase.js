/* TEST ONLY. A stand-in for supabase-js that sends every call to an in-browser PGlite database as the
   signed-in user of one "device", so online.html can be tried with real database rules but without a
   Supabase project. Auth is faked (no e-mails, no password hashing). Never load this from the app. */
(function () {
  'use strict';
  function create(db) {
    let chain = Promise.resolve();
    const lock = fn => { const p = chain.then(fn, fn); chain = p.catch(() => {}); return p; };   // one user at a time on the single connection
    const users = {};
    function run(user, sql, params) {
      return lock(async () => {
        await db.exec('reset role');
        await db.query("select set_config('request.jwt.claims', $1, false)", [user ? JSON.stringify({ sub: user.id, role: 'authenticated', is_anonymous: !!user.anonymous }) : '']);
        await db.exec(user ? 'set role authenticated' : 'set role anon');
        try { return await db.query(sql, params); } finally { await db.exec('reset role'); }
      });
    }
    function client(device) {
      const key = 'fake-session-' + device;
      let session = null; const listeners = [];
      try { session = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (e) { session = null; }
      const set = (s, ev) => { session = s; try { sessionStorage.setItem(key, JSON.stringify(s)); } catch (e) { /* ignore */ } setTimeout(() => listeners.forEach(f => f(ev, s)), 0); };
      const mk = u => ({ user: { id: u.id, email: u.email || null, is_anonymous: !!u.anonymous }, expires_at: Math.floor(Date.now() / 1000) + 3600 });
      const me = () => session ? { id: session.user.id, anonymous: session.user.is_anonymous } : null;
      const auth = {
        onAuthStateChange(f) { listeners.push(f); return { data: { subscription: { unsubscribe() {} } } }; },
        async getSession() { return { data: { session }, error: null }; },
        async signUp({ email, password }) {
          if (users[email]) return { data: {}, error: { message: 'User already registered', status: 422 } };
          const u = { id: crypto.randomUUID(), email, password }; users[email] = u; set(mk(u), 'SIGNED_IN'); return { data: { session: mk(u) }, error: null };
        },
        async signInWithPassword({ email, password }) {
          const u = users[email]; if (!u || u.password !== password) return { error: { message: 'Invalid login credentials', status: 400 } };
          set(mk(u), 'SIGNED_IN'); return { data: {}, error: null };
        },
        async signInAnonymously() { const u = { id: crypto.randomUUID(), anonymous: true }; set(mk(u), 'SIGNED_IN'); return { data: {}, error: null }; },
        async updateUser({ email, password }) {
          if (!session) return { error: { message: 'not signed in' } };
          const u = { id: session.user.id, email: email || session.user.email, password }; if (email) users[email] = u; set(mk(u), 'USER_UPDATED'); return { data: {}, error: null };
        },
        async signOut() { set(null, 'SIGNED_OUT'); return { error: null }; },
        async signInWithOtp() { return { error: null }; },
        async resetPasswordForEmail() { return { error: null }; }
      };
      return {
        auth,
        async rpc(name, args) {
          const keys = Object.keys(args || {});
          const params = keys.map(k => (args[k] !== null && typeof args[k] === 'object') ? JSON.stringify(args[k]) : args[k]);
          try {
            const res = await run(me(), `select * from public.${name}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')})`, params);
            const scalar = res.rows.length === 1 && res.fields.length === 1 && res.fields[0].name === name;
            return { data: scalar ? res.rows[0][name] : res.rows, error: null };
          } catch (e) { return { data: null, error: { message: e.message } }; }
        },
        from(table) {
          const q = { cols: '*', where: [], params: [], order: [], limit: null };
          const b = {
            select(c) { q.cols = c; return b; },
            eq(c, v) { q.params.push(v); q.where.push(`${c} = $${q.params.length}`); return b; },
            in(c, arr) { q.params.push(arr.map(String)); q.where.push(`${c}::text = any($${q.params.length}::text[])`); return b; },
            order(c, o) { q.order.push(c + (o && o.ascending === false ? ' desc' : '')); return b; },
            limit(n) { q.limit = n; return b; },
            then(ok, bad) {
              const sql = `select ${q.cols} from public.${table}` + (q.where.length ? ' where ' + q.where.join(' and ') : '') + (q.order.length ? ' order by ' + q.order.join(', ') : '') + (q.limit ? ' limit ' + q.limit : '');
              return run(me(), sql, q.params).then(r => ({ data: r.rows, error: null }), e => ({ data: null, error: { message: e.message } })).then(ok, bad);
            }
          };
          return b;
        }
      };
    }
    return { client, run, users };
  }
  window.FakeSupabase = { create };
})();

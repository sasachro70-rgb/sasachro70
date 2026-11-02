/* Auth Service: everything about who is signed in, kept apart from games and family data.
   Adults: e-mail + password (or a sign-in link). Guests: Supabase anonymous sign-in, a real signed session
   with limited rights. A guest can keep their progress by adding an e-mail and password: the account id
   stays the same, so their guest profiles and scores stay theirs. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const MIN_PASSWORD = 8;

  function create(client) {
    let session = null;
    const listeners = new Set();
    const emit = () => listeners.forEach(fn => { try { fn(state()); } catch (e) { /* a listener failing must not break sign-in */ } });

    function state() {
      const u = session && session.user;
      return {
        signedIn: !!u,
        user: u ? { id: u.id, email: u.email || null, guest: !!u.is_anonymous } : null,
        expiresAt: session && session.expires_at ? session.expires_at * 1000 : null
      };
    }
    /* Supabase's auth errors become short codes the page can translate */
    const fail = (error) => {
      if (!error) return;
      const m = String(error.message || '');
      const code = /invalid login/i.test(m) ? 'bad_login' : /already registered|already been registered/i.test(m) ? 'email_taken'
        : /not confirmed/i.test(m) ? 'email_not_confirmed' : (error.status === 429 || /rate limit/i.test(m)) ? 'too_many_requests'
        : /failed to fetch|network/i.test(m) ? 'offline' : (error.code || 'auth_error');
      throw Object.assign(new Error(m || code), { code });
    };
    const checkEmail = email => { if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())) throw Object.assign(new Error('bad_email'), { code: 'bad_email' }); return String(email).trim(); };
    const checkPassword = pw => { if (String(pw || '').length < MIN_PASSWORD) throw Object.assign(new Error('weak_password'), { code: 'weak_password' }); return pw; };

    client.auth.onAuthStateChange((_event, s) => { session = s; emit(); });

    return {
      MIN_PASSWORD,
      state,
      onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      async init() { const { data, error } = await client.auth.getSession(); fail(error); session = data.session; emit(); return state(); },
      async signUp(email, password) {
        const { data, error } = await client.auth.signUp({ email: checkEmail(email), password: checkPassword(password) });
        fail(error); return { needsConfirmation: !data.session };
      },
      async signIn(email, password) {
        const { error } = await client.auth.signInWithPassword({ email: checkEmail(email), password });
        fail(error); return state();
      },
      async sendSignInLink(email) {
        const { error } = await client.auth.signInWithOtp({ email: checkEmail(email), options: { shouldCreateUser: false, emailRedirectTo: location.href.split('#')[0] } });
        fail(error);
      },
      async signInAsGuest() {
        if (state().signedIn) return state();
        const { error } = await client.auth.signInAnonymously();
        fail(error); return state();
      },
      /* turns the current guest into a permanent account with the same id */
      async keepGuestProgress(email, password) {
        const st = state();
        if (!st.signedIn || !st.user.guest) throw Object.assign(new Error('not_a_guest'), { code: 'not_a_guest' });
        const { error } = await client.auth.updateUser({ email: checkEmail(email), password: checkPassword(password) });
        fail(error);
      },
      /* the reply never says whether the address has an account */
      async sendPasswordReset(email) {
        const { error } = await client.auth.resetPasswordForEmail(checkEmail(email), { redirectTo: location.href.split('#')[0] });
        if (error && error.status !== 400 && error.status !== 404) fail(error);
      },
      async setNewPassword(password) { const { error } = await client.auth.updateUser({ password: checkPassword(password) }); fail(error); },
      /* "everywhere" revokes the refresh tokens of every device */
      async signOut(everywhere) {
        const { error } = await client.auth.signOut({ scope: everywhere ? 'global' : 'local' });
        session = null;
        try { localStorage.removeItem('fgh-online-ui'); } catch (e) { /* storage blocked */ }
        emit(); fail(error);
      }
    };
  }

  FGH.authService = { create };
})(typeof window !== 'undefined' ? window : globalThis);

/* Creates the Supabase client from js/online/config.js, refusing keys that must never reach a browser.
   The supabase-js library is only downloaded when online play is configured. */
(function (G) {
  'use strict';
  const FGH = G.FGH = G.FGH || {};
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';

  /* a service_role JWT or a secret key would bypass every RLS rule; stop before using it */
  function keyProblem(key) {
    if (!key) return 'missing';
    if (/^sb_secret_/i.test(key)) return 'secret_key';
    const parts = key.split('.');
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.role === 'service_role') return 'secret_key';
      } catch (e) { /* not a JWT we can read; let Supabase decide */ }
    }
    return null;
  }
  function configured(cfg) {
    cfg = cfg || G.FGH_CONFIG || {};
    return !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  }
  function loadLibrary() {
    if (G.supabase && G.supabase.createClient) return Promise.resolve(G.supabase);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = LIB; s.crossOrigin = 'anonymous';
      s.onload = () => G.supabase ? resolve(G.supabase) : reject(new Error('library_failed'));
      s.onerror = () => reject(new Error('offline'));
      document.head.appendChild(s);
    });
  }
  async function createClient(cfg) {
    cfg = cfg || G.FGH_CONFIG || {};
    const problem = keyProblem(cfg.supabaseAnonKey);
    if (!cfg.supabaseUrl || problem) throw new Error(problem || 'missing');
    const lib = await loadLibrary();
    return lib.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'fgh-auth' }
    });
  }

  FGH.supabaseClient = { createClient, configured, keyProblem };
})(typeof window !== 'undefined' ? window : globalThis);

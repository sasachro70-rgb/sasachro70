/* Online play settings. Fill in from your Supabase project: Settings → API.
   Use ONLY the public "anon" key (or the "publishable" key). Never put the service_role / secret key here:
   everything in this folder is sent to every browser. While these are empty, online play stays switched off
   and the offline hub works as before. */
window.FGH_CONFIG = {
  supabaseUrl: 'https://fgnczbpqkopxemybmtij.supabase.co',
  supabaseAnonKey: 'sb_publishable_4hJxO6vsaZRxQGyCE36zGw_YzZ4E5_h'   // public publishable key (safe in the browser); data is protected by RLS
};

/* Voice settings screen and the small speed bar used inside lessons. Shared by kids.html and academy.html.
   Logic and storage are in js/family/voice.js; texts are FGH.FT.*.voice. */
(function (G) {
  'use strict';
  const FGH = G.FGH, K = FGH.kit, V = FGH.voice, store = FGH.familyStore, A = FGH.actions;
  const { esc, t } = K;

  function regionName(code) {
    if (!code) return t('voice.noRegion');
    try { return new Intl.DisplayNames([K.ui()], { type: 'region' }).of(code) + ' (' + code + ')'; } catch (e) { return code; }
  }
  const gIcon = g => g === 'female' ? '♀ ' + t('voice.female') : g === 'male' ? '♂ ' + t('voice.male') : t('voice.unknown');

  /* the speed choices; compact = the bar shown above lesson content */
  function speedHTML(pid, compact) {
    const r = V.rateOf(store.get(), pid);
    return '<div class="vspeed' + (compact ? ' compact' : '') + '" role="group" aria-label="' + esc(t('voice.speed')) + '"><span class="muted">🐢 ' + esc(t('voice.speed')) + '</span>' +
      V.RATES.map(x => '<button class="btn small' + (Math.abs(x - r) < 0.001 ? ' on' : '') + '" data-act="vRate" data-v="' + x + '" aria-pressed="' + (Math.abs(x - r) < 0.001) + '">' + x + '×' + (x === V.DEFAULT_RATE ? ' ★' : '') + '</button>').join('') +
      (compact ? '' : '<span class="muted" style="font-size:.85rem">★ ' + esc(t('voice.speedDefault')) + '</span>') + '</div>';
  }

  /* one card per language: every voice this device has for it, with preview and select */
  function panelHTML(pid, langs) {
    const f = store.get();
    let h = '<p class="muted">' + esc(t('voice.intro')) + '</p>' + '<section class="card">' + speedHTML(pid) + '</section>';
    if (langs.includes('th')) h += thaiCardHTML(pid);
    if (!V.hasTTS) return h + '<div class="notebox">🔇 ' + esc(t('voice.noTTS')) + '</div>';
    langs.forEach(lang => {
      const list = V.listFor(V.voices(), lang), pref = V.prefFor(f, pid, lang), cur = V.current(lang, pid);
      h += '<section class="card"><div class="row" style="margin:0 0 6px"><h2 style="margin:0">' + esc(t('lang.' + lang)) + '</h2><span class="muted">' + esc(list.length ? t('voice.count', { n: list.length }) : '') + '</span><span class="grow"></span>' +
        (pref ? '<button class="btn small" data-act="vReset" data-v="' + lang + '">↺ ' + esc(t('voice.reset')) + '</button>' : '<span class="muted" style="font-size:.85rem">' + esc(t('voice.isDefault')) + '</span>') + '</div>';
      if (!list.length) { h += '<div class="notebox">🔇 ' + esc(t('voice.none', { lang: t('lang.' + lang) })) + '<br><small>' + esc(lang === 'th' ? t('voice.how.' + V.platform()) : t('voice.install')) + '</small></div></section>'; return; }
      if (pref && cur && cur.id !== pref.id) h += '<p class="muted" style="font-size:.9rem">ℹ️ ' + esc(t('voice.substitute', { name: pref.name })) + '</p>';
      const regs = V.regions(list);
      if (regs.length > 1) h += '<p class="muted" style="margin:.2rem 0">' + esc(t('voice.accents')) + ': ' + regs.map(r => esc(regionName(r))).join(' · ') + '</p>';
      h += '<div class="vlist">' + list.map(v => {
        const on = cur && cur.id === v.id;
        return '<div class="vrow' + (on ? ' on' : '') + '"><span class="vname"><b>' + esc(v.name) + '</b><small>' + esc(regionName(v.region)) + ' · ' + esc(gIcon(v.gender)) + ' · ' + esc(v.local ? t('voice.offline') : t('voice.online')) + '</small></span>' +
          '<button class="btn small" data-act="vPreview" data-v="' + esc(lang + '\n' + v.id) + '">▶ ' + esc(t('voice.preview')) + '</button>' +
          (on ? '<span class="status approved">✓ ' + esc(t('voice.selected')) + '</span>' : '<button class="btn small primary" data-act="vSelect" data-v="' + esc(lang + '\n' + v.id) + '">' + esc(t('voice.select')) + '</button>') + '</div>';
      }).join('') + '</div><p class="muted" style="font-size:.82rem;margin:.4rem 0 0">' + esc(t('voice.genderNote')) + '</p></section>';
    });
    return h;
  }
  /* Thai voice: where it comes from (automatic / cloud / device), whether the cloud voice works, and how to add a Thai voice to this device */
  const CV = () => FGH.cloudVoice;
  function cloudLine(st) {
    const c = st.cloud;
    if (c.state === 'ok') return '<p class="vstate ok">' + esc(t('voice.cloudOk')) + '</p>';
    if (c.state === 'down' || (c.state === 'off' && c.why !== 'device_mode')) return '<p class="vstate warn">⚠️ ' + esc(t('voice.cloudDown.' + c.why) || '') + '</p>';
    if (c.state === 'unknown') return '<p class="vstate muted">' + esc(t('voice.cloudTesting')) + '</p>';
    return '';
  }
  function howHTML(st) { return '<details class="vhow"' + (st.speaks ? '' : ' open') + '><summary>📲 ' + esc(t('voice.howTitle')) + '</summary><p>' + esc(t('voice.how.' + st.platform)) + '</p></details>'; }
  function thaiCardHTML(pid) {
    const st = V.thaiStatus(pid), cv = CV();
    st.pid = pid; probe(st, true);
    let h = '<section class="card vthai"><h2 style="margin:0 0 .4rem">🇹🇭 ' + esc(t('voice.thTitle')) + '</h2>';
    if (cv && cv.configured()) {
      h += '<p class="muted" style="margin:.2rem 0">' + esc(t('voice.thMode')) + '</p><div class="row" role="group" aria-label="' + esc(t('voice.thMode')) + '">' +
        cv.MODES.map(m => '<button class="btn small' + (st.mode === m ? ' on' : '') + '" aria-pressed="' + (st.mode === m) + '" data-act="vMode" data-v="' + m + '">' + esc(t('voice.mode.' + m)) + '</button>').join('') + '</div>' +
        '<p class="muted" style="font-size:.88rem;margin:.3rem 0">' + esc(t('voice.modeHelp.' + st.mode)) + '</p>' + cloudLine(st) +
        (st.mode !== 'device' ? '<button class="btn small" data-act="vCloudPreview">▶ ' + esc(t('voice.cloudPreview')) + '</button>' : '');
    }
    if (!st.device) h += '<p class="vstate ' + (st.speaks ? 'muted' : 'warn') + '">' + esc(st.speaks ? t('voice.noThaiOk') : '🔇 ' + t('voice.noThai')) + '</p>' + howHTML(st);
    return h + '</section>';
  }
  /* the cloud voice is tried once in the background (a short, cached word) so the page can say whether it works */
  let probed = false, redraw = null;
  function probe(st, card) {
    const cv = CV(); if (probed || !cv || st.cloud.state !== 'unknown' || (st.device && st.mode !== 'cloud')) return;
    probed = true;
    /* redraw only when what is shown changes: always on the voice card, on lesson pages only if the notice must appear or go */
    cv.get('สวัสดี', 'female').then(() => { if (redraw && (card || V.thaiStatus(st.pid).speaks !== st.speaks)) redraw(); });
  }
  /* a notice for lesson pages: shown only when Thai cannot be read aloud at all on this device, with the way to fix it */
  function thaiBannerHTML(pid) {
    const st = V.thaiStatus(pid); st.pid = pid; probe(st, false);
    if (st.speaks) return '';
    const c = st.cloud;
    const why = c.state === 'down' || (c.state === 'off' && c.why === 'device_mode') ? ' ' + t('voice.cloudDown.' + c.why) : '';
    return '<div class="notebox vbanner" role="status">🔇 <b>' + esc(t('voice.noThai')) + '</b>' + esc(why) + '<br><small>' + esc(t('voice.how.' + st.platform)) + '</small>' +
      ' <button class="btn small" data-act="go" data-v="voice">' + esc(t('voice.voiceSettings')) + '</button></div>';
  }
  const find = v => { const i = v.indexOf('\n'), lang = v.slice(0, i), id = v.slice(i + 1); return { lang, entry: V.listFor(V.voices(), lang).find(x => x.id === id) }; };

  /* actions to merge into a page's action table; pidOf() returns the learner, rerender() redraws */
  function acts(pidOf, rerender) {
    redraw = rerender;
    return {
      vPreview(v) { const { lang, entry } = find(v); if (!entry) return K.toast(t('voice.gone')); V.say(V.SAMPLE[lang] || '', lang, { voice: entry, pid: pidOf() }); },
      vSelect(v) {
        const { lang, entry } = find(v), pid = pidOf(); if (!entry || !pid) return K.toast(t('voice.gone'));
        A.updateLearning(pid, f => { V.setVoice(f, pid, lang, entry); });
        V.say(V.SAMPLE[lang] || '', lang, { pid }); K.toast('✓ ' + t('voice.saved', { name: entry.name })); rerender();
      },
      vReset(lang) { const pid = pidOf(); if (!pid) return; A.updateLearning(pid, f => { V.resetVoice(f, pid, lang); }); K.toast('↺ ' + t('voice.resetDone')); rerender(); },
      vMode(m) { const cv = CV(); if (!cv) return; cv.setMode(m); probed = false; rerender(); },
      vCloudPreview() { const cv = CV(); if (!cv) return; if (cv.mode() === 'device') return; const was = cv.mode(); cv.setMode('cloud'); V.say(V.SAMPLE.th, 'th', { pid: pidOf(), onDone: rerender }); cv.setMode(was); setTimeout(rerender, 2500); },
      vRate(v) { const pid = pidOf(); if (!pid) return; A.updateLearning(pid, f => { V.setRate(f, pid, +v); }); rerender(); }
    };
  }
  FGH.voiceUI = { panelHTML, speedHTML, acts, regionName, thaiCardHTML, thaiBannerHTML };
})(window);

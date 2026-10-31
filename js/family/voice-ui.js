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
    if (!V.hasTTS) return h + '<div class="notebox">🔇 ' + esc(t('voice.noTTS')) + '</div>';
    langs.forEach(lang => {
      const list = V.listFor(V.voices(), lang), pref = V.prefFor(f, pid, lang), cur = V.current(lang, pid);
      h += '<section class="card"><div class="row" style="margin:0 0 6px"><h2 style="margin:0">' + esc(t('lang.' + lang)) + '</h2><span class="muted">' + esc(list.length ? t('voice.count', { n: list.length }) : '') + '</span><span class="grow"></span>' +
        (pref ? '<button class="btn small" data-act="vReset" data-v="' + lang + '">↺ ' + esc(t('voice.reset')) + '</button>' : '<span class="muted" style="font-size:.85rem">' + esc(t('voice.isDefault')) + '</span>') + '</div>';
      if (!list.length) { h += '<div class="notebox">🔇 ' + esc(t('voice.none', { lang: t('lang.' + lang) })) + '<br><small>' + esc(t('voice.install')) + '</small></div></section>'; return; }
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
  const find = v => { const i = v.indexOf('\n'), lang = v.slice(0, i), id = v.slice(i + 1); return { lang, entry: V.listFor(V.voices(), lang).find(x => x.id === id) }; };

  /* actions to merge into a page's action table; pidOf() returns the learner, rerender() redraws */
  function acts(pidOf, rerender) {
    return {
      vPreview(v) { const { lang, entry } = find(v); if (!entry) return K.toast(t('voice.gone')); V.say(V.SAMPLE[lang] || '', lang, { voice: entry, pid: pidOf() }); },
      vSelect(v) {
        const { lang, entry } = find(v), pid = pidOf(); if (!entry || !pid) return K.toast(t('voice.gone'));
        A.updateLearning(pid, f => { V.setVoice(f, pid, lang, entry); });
        V.say(V.SAMPLE[lang] || '', lang, { pid }); K.toast('✓ ' + t('voice.saved', { name: entry.name })); rerender();
      },
      vReset(lang) { const pid = pidOf(); if (!pid) return; A.updateLearning(pid, f => { V.resetVoice(f, pid, lang); }); K.toast('↺ ' + t('voice.resetDone')); rerender(); },
      vRate(v) { const pid = pidOf(); if (!pid) return; A.updateLearning(pid, f => { V.setRate(f, pid, +v); }); rerender(); }
    };
  }
  FGH.voiceUI = { panelHTML, speedHTML, acts, regionName };
})(window);

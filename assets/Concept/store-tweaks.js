/* ============================================================
 * Tweaks panel — Rendarr's Exchange
 * Same vanilla pattern used in Character Sheet v2 (themes,
 * scanlines, anim speed, glow, breathing) plus store-specific:
 * wartime markup toggle, wallet preset, base font tone.
 * ============================================================ */
(function(){
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "vapor",
    "scanStrength": 0.03,
    "animSpeed": 1,
    "glow": 1,
    "breathing": true,
    "wartime": true,
    "walletPreset": 2400
  }/*EDITMODE-END*/;

  const THEMES = {
    vapor: { label:'Vaporwave',   cyan:'oklch(0.85 0.18 200)', pink:'oklch(0.72 0.26 350)', purple:'oklch(0.55 0.26 300)', screenH:278, inkH:190 },
    holo:  { label:'Holo Blue',   cyan:'oklch(0.85 0.14 220)', pink:'oklch(0.78 0.15 240)', purple:'oklch(0.55 0.18 260)', screenH:235, inkH:220 },
    imp:   { label:'Imperial',    cyan:'oklch(0.80 0.18 25)',  pink:'oklch(0.72 0.22 15)',  purple:'oklch(0.45 0.20 20)',  screenH:18,  inkH:25  },
    reb:   { label:'Rebel Alert', cyan:'oklch(0.82 0.20 55)',  pink:'oklch(0.78 0.22 35)',  purple:'oklch(0.55 0.22 40)',  screenH:40,  inkH:60  },
    jedi:  { label:'Jedi Archive',cyan:'oklch(0.85 0.14 175)', pink:'oklch(0.80 0.18 150)', purple:'oklch(0.48 0.15 160)', screenH:165, inkH:170 },
    sith:  { label:'Sith Holocron',cyan:'oklch(0.75 0.22 15)', pink:'oklch(0.65 0.26 340)', purple:'oklch(0.40 0.22 350)', screenH:350, inkH:15  },
    droid: { label:'Droid Amber', cyan:'oklch(0.82 0.17 75)',  pink:'oklch(0.78 0.20 55)',  purple:'oklch(0.50 0.18 60)',  screenH:60,  inkH:80  },
    merc:  { label:'Merc Green',  cyan:'oklch(0.82 0.19 145)', pink:'oklch(0.78 0.20 120)', purple:'oklch(0.45 0.18 155)', screenH:150, inkH:145 },
    cryo:  { label:'Cryo Ice',    cyan:'oklch(0.92 0.08 200)', pink:'oklch(0.85 0.10 210)', purple:'oklch(0.60 0.10 220)', screenH:215, inkH:205 },
    blood: { label:'Blood Moon',  cyan:'oklch(0.72 0.24 20)',  pink:'oklch(0.65 0.26 10)',  purple:'oklch(0.38 0.20 10)',  screenH:12,  inkH:20  }
  };

  function applyTweaks(t) {
    const r = document.documentElement.style;
    const th = THEMES[t.theme] || THEMES.vapor;
    r.setProperty('--vapor-cyan',   th.cyan);
    r.setProperty('--vapor-pink',   th.pink);
    r.setProperty('--vapor-purple', th.purple);
    r.setProperty('--screen-h',     th.screenH);
    r.setProperty('--ink-h',        th.inkH);
    r.setProperty('--scan-strength', t.scanStrength);
    r.setProperty('--anim-speed',    t.animSpeed);
    r.setProperty('--glow-mult',     t.glow);
    document.querySelector('.tablet').style.animationPlayState = t.breathing ? 'running' : 'paused';
    if (window.__store) {
      window.__store.state.wartimeMarkup = t.wartime ? 0.08 : 0;
      window.__store.state.wallet = t.walletPreset;
      window.__store.refreshWalletUI();
      window.__store.renderCards();
      window.__store.renderCartMini();
      window.__store.renderCartFull();
      window.__store.renderSell();
    }
  }

  /* --- Panel CSS --- */
  const css = `
    .twk-fab{position:fixed;right:14px;bottom:14px;z-index:99999;width:44px;height:44px;border-radius:50%;
      background:linear-gradient(135deg,var(--vapor-pink),var(--vapor-cyan));
      border:1px solid var(--vapor-cyan);cursor:pointer;display:flex;align-items:center;justify-content:center;
      font-family:var(--font-display);font-size:22px;color:#0a0a12;
      box-shadow:0 0 18px color-mix(in oklab, var(--vapor-cyan) 50%, transparent), 0 6px 20px rgba(0,0,0,0.5);
      transition:transform 0.2s;}
    .twk-fab:hover{transform:scale(1.08) rotate(30deg);}
    .twk-panel{position:fixed;right:14px;bottom:14px;z-index:99999;width:320px;max-height:calc(100vh - 28px);
      display:none;flex-direction:column;
      background:linear-gradient(180deg, oklch(0.14 0.06 var(--screen-h)) 0%, oklch(0.10 0.05 var(--screen-h)) 100%);
      border:1px solid color-mix(in oklab, var(--vapor-cyan) 50%, transparent);border-radius:4px;
      box-shadow:0 20px 60px rgba(0,0,0,0.7), 0 0 40px color-mix(in oklab, var(--vapor-cyan) 20%, transparent);
      font-family:var(--font-mono);color:var(--ink);overflow:hidden;}
    .twk-panel.open{display:flex;}
    .twk-panel::before{content:'';position:absolute;inset:0;pointer-events:none;
      background:repeating-linear-gradient(0deg,transparent 0 3px,oklch(1 0 0 / 0.025) 3px 4px);}
    .twk-hd{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;
      background:linear-gradient(90deg, color-mix(in oklab, var(--vapor-pink) 18%, transparent), color-mix(in oklab, var(--vapor-cyan) 14%, transparent));
      border-bottom:1px solid color-mix(in oklab, var(--vapor-cyan) 30%, transparent);cursor:move;user-select:none;}
    .twk-hd b{font-family:var(--font-display);font-size:16px;letter-spacing:0.28em;color:var(--vapor-cyan);
      text-shadow:0 0 8px color-mix(in oklab, var(--vapor-cyan) 60%, transparent);}
    .twk-x{background:transparent;border:1px solid color-mix(in oklab, var(--vapor-cyan) 40%, transparent);color:var(--ink-dim);
      width:20px;height:20px;cursor:pointer;font-family:var(--font-mono);font-size:11px;line-height:1;padding:0;}
    .twk-x:hover{color:var(--vapor-pink);border-color:var(--vapor-pink);}
    .twk-body{padding:14px;display:flex;flex-direction:column;gap:14px;overflow-y:auto;}
    .twk-sect{font-family:var(--font-mono);font-size:9px;letter-spacing:0.3em;text-transform:uppercase;
      color:var(--vapor-pink);padding-bottom:4px;border-bottom:1px dashed color-mix(in oklab, var(--vapor-cyan) 25%, transparent);}
    .twk-row{display:flex;flex-direction:column;gap:6px;}
    .twk-lbl{display:flex;justify-content:space-between;font-size:10px;letter-spacing:0.2em;
      text-transform:uppercase;color:var(--ink-dim);}
    .twk-lbl .v{color:var(--vapor-cyan);font-family:var(--font-display);font-size:14px;letter-spacing:0.05em;}
    .twk-themes{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;}
    .twk-theme{position:relative;padding:8px 10px;cursor:pointer;text-align:left;
      background:oklch(0 0 0 / 0.4);border:1px solid color-mix(in oklab, var(--vapor-cyan) 25%, transparent);
      font-family:var(--font-mono);font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:var(--ink-dim);
      display:flex;align-items:center;gap:8px;transition:all 0.15s;
      clip-path:polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%);}
    .twk-theme:hover{border-color:color-mix(in oklab, var(--vapor-cyan) 50%, transparent);color:var(--ink);}
    .twk-theme.active{background:linear-gradient(90deg, color-mix(in oklab, var(--vapor-pink) 18%, transparent), color-mix(in oklab, var(--vapor-cyan) 12%, transparent));
      border-color:var(--vapor-cyan);color:var(--vapor-cyan);
      text-shadow:0 0 6px color-mix(in oklab, var(--vapor-cyan) 60%, transparent);}
    .twk-swatch{width:14px;height:14px;flex-shrink:0;border:1px solid rgba(255,255,255,0.3);
      background:linear-gradient(135deg, var(--tc) 0%, var(--tc) 33%, var(--tp) 33%, var(--tp) 66%, var(--tpu) 66%, var(--tpu) 100%);}
    .twk-slider{width:100%;-webkit-appearance:none;appearance:none;height:4px;background:oklch(0 0 0 / 0.6);
      border:1px solid color-mix(in oklab, var(--vapor-cyan) 30%, transparent);outline:none;}
    .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;background:var(--vapor-pink);
      border:1px solid var(--vapor-cyan);cursor:pointer;box-shadow:0 0 8px var(--vapor-pink);
      clip-path:polygon(50% 0, 100% 50%, 50% 100%, 0 50%);}
    .twk-slider::-moz-range-thumb{width:14px;height:14px;background:var(--vapor-pink);
      border:1px solid var(--vapor-cyan);cursor:pointer;box-shadow:0 0 8px var(--vapor-pink);border-radius:0;}
    .twk-toggle{display:flex;align-items:center;justify-content:space-between;cursor:pointer;
      padding:6px 10px;background:oklch(0 0 0 / 0.4);border:1px solid color-mix(in oklab, var(--vapor-cyan) 30%, transparent);
      font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--ink-dim);}
    .twk-sw{width:32px;height:14px;background:oklch(0 0 0 / 0.6);border:1px solid color-mix(in oklab, var(--vapor-cyan) 40%, transparent);
      position:relative;transition:all 0.2s;}
    .twk-sw::after{content:'';position:absolute;top:1px;left:1px;width:10px;height:10px;
      background:var(--ink-faint);transition:all 0.2s;}
    .twk-toggle.on .twk-sw{background:color-mix(in oklab, var(--vapor-pink) 30%, transparent);border-color:var(--vapor-pink);}
    .twk-toggle.on .twk-sw::after{left:19px;background:var(--vapor-pink);box-shadow:0 0 6px var(--vapor-pink);}
    .twk-toggle.on{color:var(--vapor-cyan);}
    .twk-reset{background:transparent;border:1px solid color-mix(in oklab, var(--vapor-pink) 40%, transparent);color:var(--vapor-pink);
      padding:6px 10px;font-family:var(--font-mono);font-size:9px;letter-spacing:0.24em;text-transform:uppercase;
      cursor:pointer;clip-path:polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%);}
    .twk-reset:hover{background:color-mix(in oklab, var(--vapor-pink) 15%, transparent);box-shadow:0 0 10px color-mix(in oklab, var(--vapor-pink) 40%, transparent);}
  `;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const tweaks = { ...TWEAK_DEFAULTS };
  applyTweaks(tweaks);

  const fab = document.createElement('button');
  fab.className = 'twk-fab'; fab.title = 'Tweaks'; fab.innerHTML = '◈';
  document.body.appendChild(fab);

  const panel = document.createElement('div');
  panel.className = 'twk-panel';
  panel.innerHTML = `
    <div class="twk-hd">
      <b>◇ TWEAKS</b>
      <button class="twk-x">✕</button>
    </div>
    <div class="twk-body">
      <div class="twk-row">
        <div class="twk-sect">◆ Color Theme</div>
        <div class="twk-themes" id="twk-themes"></div>
      </div>
      <div class="twk-row">
        <div class="twk-sect">▸ Display</div>
        <div class="twk-row">
          <div class="twk-lbl"><span>Scanlines</span><span class="v" id="v-scan"></span></div>
          <input type="range" class="twk-slider" id="r-scan" min="0" max="0.12" step="0.005">
        </div>
        <div class="twk-row">
          <div class="twk-lbl"><span>Animation speed</span><span class="v" id="v-anim"></span></div>
          <input type="range" class="twk-slider" id="r-anim" min="0.25" max="2.5" step="0.25">
        </div>
        <div class="twk-row">
          <div class="twk-lbl"><span>Glow</span><span class="v" id="v-glow"></span></div>
          <input type="range" class="twk-slider" id="r-glow" min="0" max="2" step="0.1">
        </div>
        <label class="twk-toggle" id="t-breathe">
          <span>Tablet breathing</span><span class="twk-sw"></span>
        </label>
      </div>
      <div class="twk-row">
        <div class="twk-sect">▸ Store Economy</div>
        <label class="twk-toggle" id="t-wartime">
          <span>Wartime markup (+8% weapons)</span><span class="twk-sw"></span>
        </label>
        <div class="twk-row">
          <div class="twk-lbl"><span>Wallet preset</span><span class="v" id="v-wallet"></span></div>
          <input type="range" class="twk-slider" id="r-wallet" min="500" max="50000" step="100">
        </div>
      </div>
      <div class="twk-row" style="align-items:flex-end;">
        <button class="twk-reset" id="twk-reset">↺ Restore Defaults</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // Theme buttons
  const themesWrap = panel.querySelector('#twk-themes');
  Object.entries(THEMES).forEach(([key, th]) => {
    const b = document.createElement('button');
    b.className = 'twk-theme' + (key === tweaks.theme ? ' active' : '');
    b.dataset.theme = key;
    b.style.setProperty('--tc', th.cyan);
    b.style.setProperty('--tp', th.pink);
    b.style.setProperty('--tpu', th.purple);
    b.innerHTML = `<span class="twk-swatch"></span><span>${th.label}</span>`;
    b.addEventListener('click', () => setTweak('theme', key));
    themesWrap.appendChild(b);
  });

  function refreshUI() {
    panel.querySelectorAll('.twk-theme').forEach(b => b.classList.toggle('active', b.dataset.theme === tweaks.theme));
    panel.querySelector('#r-scan').value = tweaks.scanStrength;
    panel.querySelector('#v-scan').textContent = (tweaks.scanStrength * 100).toFixed(1) + '%';
    panel.querySelector('#r-anim').value = tweaks.animSpeed;
    panel.querySelector('#v-anim').textContent = tweaks.animSpeed.toFixed(2) + '×';
    panel.querySelector('#r-glow').value = tweaks.glow;
    panel.querySelector('#v-glow').textContent = tweaks.glow.toFixed(1) + '×';
    panel.querySelector('#t-breathe').classList.toggle('on', tweaks.breathing);
    panel.querySelector('#t-wartime').classList.toggle('on', tweaks.wartime);
    panel.querySelector('#r-wallet').value = tweaks.walletPreset;
    panel.querySelector('#v-wallet').textContent = tweaks.walletPreset.toLocaleString() + ' cr';
  }
  refreshUI();

  function setTweak(key, val) {
    tweaks[key] = val;
    applyTweaks(tweaks); refreshUI();
    try { window.parent.postMessage({ type:'__edit_mode_set_keys', edits: { [key]: val } }, '*'); } catch(e){}
  }

  panel.querySelector('#r-scan').addEventListener('input', e => setTweak('scanStrength', parseFloat(e.target.value)));
  panel.querySelector('#r-anim').addEventListener('input', e => setTweak('animSpeed', parseFloat(e.target.value)));
  panel.querySelector('#r-glow').addEventListener('input', e => setTweak('glow', parseFloat(e.target.value)));
  panel.querySelector('#t-breathe').addEventListener('click', () => setTweak('breathing', !tweaks.breathing));
  panel.querySelector('#t-wartime').addEventListener('click', () => setTweak('wartime', !tweaks.wartime));
  panel.querySelector('#r-wallet').addEventListener('input', e => setTweak('walletPreset', parseInt(e.target.value, 10)));
  panel.querySelector('#twk-reset').addEventListener('click', () => {
    Object.entries(TWEAK_DEFAULTS).forEach(([k,v]) => tweaks[k] = v);
    applyTweaks(tweaks); refreshUI();
    try { window.parent.postMessage({ type:'__edit_mode_set_keys', edits: {...TWEAK_DEFAULTS} }, '*'); } catch(e){}
  });

  function showPanel(){ panel.classList.add('open'); fab.style.display = 'none'; }
  function hidePanel(){
    panel.classList.remove('open'); fab.style.display = 'flex';
    try { window.parent.postMessage({ type:'__edit_mode_dismissed' }, '*'); } catch(e){}
  }
  fab.addEventListener('click', showPanel);
  panel.querySelector('.twk-x').addEventListener('click', hidePanel);

  window.addEventListener('message', ev => {
    const d = ev.data || {};
    if (d.type === '__activate_edit_mode')   showPanel();
    if (d.type === '__deactivate_edit_mode') hidePanel();
  });
  try { window.parent.postMessage({ type:'__edit_mode_available' }, '*'); } catch(e){}

  // Drag
  (function(){
    const hd = panel.querySelector('.twk-hd');
    let dx, dy, dragging = false;
    hd.addEventListener('mousedown', e => {
      if (e.target.closest('.twk-x')) return;
      dragging = true; const r = panel.getBoundingClientRect();
      dx = e.clientX - r.left; dy = e.clientY - r.top;
      panel.style.right = 'auto'; panel.style.bottom = 'auto';
      panel.style.left = r.left + 'px'; panel.style.top = r.top + 'px';
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      panel.style.left = (e.clientX - dx) + 'px';
      panel.style.top = (e.clientY - dy) + 'px';
    });
    document.addEventListener('mouseup', () => { dragging = false; });
  })();
})();

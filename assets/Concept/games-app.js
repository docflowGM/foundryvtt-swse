/* ===================================================================
   Holopad Games — app shell: scaling, router, library
   =================================================================== */
(function () {
  'use strict';

  /* ---------- Fit-to-viewport scaling ---------- */
  const scaler = document.getElementById('scaler');
  const BASE_W = 1300 + 52, BASE_H = 904 + 56; // tablet + padding
  function fit() {
    const s = Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H);
    scaler.style.transform = `scale(${s})`;
  }
  window.addEventListener('resize', fit); fit();

  /* ---------- Clock ---------- */
  function tick() {
    const d = new Date();
    const t = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} · GST`;
    const el = document.getElementById('hud-clock'); if (el) el.textContent = t;
  }
  tick(); setInterval(tick, 1000);

  /* ---------- Credit HUD ---------- */
  const Bank = {
    get() { return PLAYER.credits; },
    set(v) { PLAYER.credits = Math.max(0, Math.round(v)); document.getElementById('hud-credits').textContent = PLAYER.credits.toLocaleString(); },
    add(v) { this.set(PLAYER.credits + v); }
  };
  window.Bank = Bank;

  /* ---------- Router ---------- */
  const views = {
    library: document.getElementById('view-library'),
    pazaak: document.getElementById('view-pazaak'),
    sabacc: document.getElementById('view-sabacc'),
    hintaro: document.getElementById('view-hintaro'),
    dejarik: document.getElementById('view-dejarik')
  };
  const hudTitle = document.getElementById('hud-title');
  const hudContext = document.getElementById('hud-context');
  const hudHome = document.getElementById('hud-home');

  const Router = {
    show(name, opts = {}) {
      Object.values(views).forEach(v => v.classList.remove('is-active'));
      views[name].classList.add('is-active');
      if (name === 'library') {
        hudTitle.textContent = 'GAME CENTER';
        hudContext.innerHTML = '<span class="dot pink"></span> HOLOPAD SIDE TABLES';
        hudHome.style.display = 'none';
      } else {
        hudTitle.textContent = (opts.title || name).toUpperCase();
        hudContext.innerHTML = '<span class="dot warn"></span> TABLE MODE · ACTIVE SESSION';
        hudHome.style.display = '';
      }
    },
    home() { Router.show('library'); renderRail(); }
  };
  window.Router = Router;
  hudHome.addEventListener('click', () => Router.home());

  /* ===================== LIBRARY ===================== */
  let selectedId = 'pazaak';
  const config = { opponentId: 'salty', buyIn: 100, sets: 3, difficulty: 'Hard', seats: 4, rules: 'wagered' };

  const gameList = document.getElementById('game-list');
  const detailPane = document.getElementById('detail-pane');
  const railPane = document.getElementById('rail-pane');
  document.getElementById('lib-count').textContent = GAMES.length;

  function renderGameList() {
    gameList.innerHTML = GAMES.map(g => `
      <button class="game-card ${g.id === selectedId ? 'is-selected' : ''} ${g.playable ? '' : 'is-locked'}" data-game="${g.id}">
        <span class="game-card__icon">${g.icon}</span>
        <span>
          <span class="game-card__title">${g.title}</span>
          <span class="game-card__sub">${g.subtitle}</span>
          <span class="game-card__meta">
            <span class="pill ${g.statusKind}">${g.status}</span>
            <span class="pill">${g.minPlayers === g.maxPlayers ? g.minPlayers : g.minPlayers + '–' + g.maxPlayers} players</span>
          </span>
        </span>
      </button>`).join('');
    gameList.querySelectorAll('[data-game]').forEach(b =>
      b.addEventListener('click', () => { selectedId = b.dataset.game; renderGameList(); renderDetail(); }));
  }

  function capRow(caps) {
    const order = [['AI', 'AI Opponents'], ['NPC', 'NPC Seats'], ['PvP', 'PvP'], ['Spectate', 'Spectators'], ['Credits', 'Credit Wagers'], ['Items', 'Item Wagers']];
    return order.map(([k, lbl]) => `<span class="cap ${caps[k] ? 'on' : 'off'}">${caps[k] ? '◆' : '◇'} ${lbl}</span>`).join('');
  }

  function renderDetail() {
    const g = GAMES.find(x => x.id === selectedId);
    const playableConfig = g.playable;
    const oppList = Object.values(OPPONENTS).slice(0, 4);
    detailPane.innerHTML = `
      <div class="detail-hero">
        <div class="detail-hero__glyph">${g.icon}</div>
        <span class="kicker">${g.phase} · ${g.status}</span>
        <h2>${g.title}</h2>
        <p class="sub">${g.description}</p>
        <div class="detail-tags">${g.tags.map(t => `<span class="pill">${t}</span>`).join('')}</div>
      </div>

      <div class="spec-grid">
        <div class="spec"><div class="k">Players</div><div class="v cyan">${g.minPlayers === g.maxPlayers ? g.minPlayers : g.minPlayers + '–' + g.maxPlayers}</div><div class="vs">at the table</div></div>
        <div class="spec"><div class="k">${g.id === 'pazaak' ? 'Target' : g.id === 'sabacc' ? 'Target' : 'Mode'}</div><div class="v">${g.id === 'pazaak' ? '20' : g.id === 'sabacc' ? '0' : g.tags[0]}</div><div class="vs">${g.id === 'pazaak' ? 'closest, no bust' : g.id === 'sabacc' ? 'closest to zero' : 'house ruleset'}</div></div>
        <div class="spec"><div class="k">Stakes</div><div class="v gold">${g.caps.Credits ? 'Credits' : '—'}</div><div class="vs">escrowed buy-in</div></div>
        <div class="spec"><div class="k">Build</div><div class="v pink">${g.phase.replace('Phase ', 'P')}</div><div class="vs">${g.status}</div></div>
      </div>

      <div class="capset">${capRow(g.caps)}</div>

      ${playableConfig ? `
      <div class="config">
        <span class="kicker">Start a Table</span>
        <h4>Configure ${g.title} session</h4>

        <div class="config-row">
          <span class="lbl">Opponent${g.id === 'sabacc' ? 's' : ''}</span>
          <div class="opp-pick">
            ${oppList.map(o => `
              <button class="opp-chip ${o.id === config.opponentId ? 'on' : ''}" data-opp="${o.id}">
                <img src="${o.img}" alt="">
                <span>${o.name.split(' ')[0]}<br>${o.personality}</span>
              </button>`).join('')}
          </div>
        </div>

        <div class="config-row">
          <span class="lbl">Rules</span>
          <div class="seg" data-seg="rules">
            <button data-val="wagered" class="${config.rules === 'wagered' ? 'on' : ''}">Credit Buy-In</button>
            <button data-val="senate" class="${config.rules === 'senate' ? 'on' : ''}">Republic Senate</button>
          </div>
        </div>

        <div class="config-row">
          <span class="lbl">${g.id === 'sabacc' ? 'Ante' : 'Buy-In'}</span>
          <div class="stepper" data-step="buyIn">
            <button data-d="-25">−</button><span class="val" id="val-buyIn">${config.buyIn} cr</span><button data-d="25">+</button>
          </div>
        </div>

        ${g.id === 'pazaak' ? `
        <div class="config-row">
          <span class="lbl">Sets to Win</span>
          <div class="stepper" data-step="sets">
            <button data-d="-1">−</button><span class="val" id="val-sets">${config.sets}</span><button data-d="1">+</button>
          </div>
        </div>` : `
        <div class="config-row">
          <span class="lbl">Seats</span>
          <div class="stepper" data-step="seats">
            <button data-d="-1">−</button><span class="val" id="val-seats">${config.seats}</span><button data-d="1">+</button>
          </div>
        </div>`}

        <div class="start-row">
          <button class="btn pink" id="start-table">▸ Sit at Table</button>
          <span class="start-note">Buy-in is escrowed via TransactionEngine. Pot pays out on settlement.<br>Your balance: <b style="color:var(--gold)">${PLAYER.credits.toLocaleString()} cr</b></span>
        </div>
      </div>` : `
      <div class="config">
        <span class="kicker">Status</span>
        <h4>${g.title} table coming online</h4>
        <p class="start-note" style="margin-top:10px">This game’s engine exists in the registry (${g.phase}) but its in-universe table is still being built. ${g.id === 'hintaro' ? 'Dice-pit layout: central tray, ranked cubes, seats around the rim.' : 'Holochess layout: radial board centered, creature rail, compact combat controls.'}</p>
        <div class="start-row"><button class="btn ghost" disabled>▸ Table Locked</button><span class="start-note">Pazaak & Sabacc are the first playable tables in this concept.</span></div>
      </div>`}
    `;
    wireConfig(g);
  }

  function wireConfig(g) {
    detailPane.querySelectorAll('[data-opp]').forEach(b =>
      b.addEventListener('click', () => { config.opponentId = b.dataset.opp; renderDetail(); }));
    detailPane.querySelectorAll('[data-seg] button').forEach(b =>
      b.addEventListener('click', () => { config.rules = b.dataset.val; renderDetail(); }));
    detailPane.querySelectorAll('[data-step]').forEach(stp => {
      const key = stp.dataset.step;
      stp.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        const d = Number(b.dataset.d);
        if (key === 'buyIn') config.buyIn = Math.max(0, config.buyIn + d);
        if (key === 'sets') config.sets = Math.min(5, Math.max(1, config.sets + d));
        if (key === 'seats') config.seats = Math.min(6, Math.max(2, config.seats + d));
        const v = document.getElementById('val-' + key);
        if (v) v.textContent = key === 'buyIn' ? config.buyIn + ' cr' : config[key];
      }));
    });
    const start = document.getElementById('start-table');
    if (start) start.addEventListener('click', () => {
      const c = { ...config, opponent: OPPONENTS[config.opponentId] };
      if (g.id === 'pazaak') { Router.show('pazaak', { title: 'Pazaak' }); PazaakTable.start(c); }
      else if (g.id === 'sabacc') { Router.show('sabacc', { title: 'Sabacc' }); SabaccTable.start(c); }
      else if (g.id === 'hintaro') { Router.show('hintaro', { title: 'Hintaro' }); HintaroTable.start(c); }
      else if (g.id === 'dejarik') { Router.show('dejarik', { title: 'Dejarik' }); DejarikTable.start(c); }
    });
  }

  /* ---------- Right rail: active tables, invites, results ---------- */
  function renderRail() {
    const inv = OPPONENTS.krag, inv2 = OPPONENTS.riquis;
    railPane.innerHTML = `
      <div class="rail-card">
        <div class="head"><span class="kicker">Active Tables</span><span class="hint">2 live</span></div>
        <div class="table-row">
          <img class="table-row__ava" src="${OPPONENTS.salty.img}">
          <div><div class="table-row__name">Salty’s High Table</div><div class="table-row__meta">Pazaak · 100cr buy-in · your turn</div></div>
          <button class="table-row__cta" data-resume="pazaak">Resume</button>
        </div>
        <div class="table-row">
          <span class="table-row__avaglyph">0</span>
          <div><div class="table-row__name">The Sabacc Den</div><div class="table-row__meta">Sabacc · 4 seats · pot 640cr</div></div>
          <button class="table-row__cta" data-resume="sabacc">Resume</button>
        </div>
      </div>

      <div class="rail-card">
        <div class="head"><span class="kicker">Pending Invites</span><span class="hint">2</span></div>
        <div class="table-row invite">
          <img class="table-row__ava" src="${inv.img}">
          <div><div class="table-row__name">${inv.name}</div><div class="table-row__meta">wants a Pazaak rematch · 250cr</div></div>
          <button class="table-row__cta">Accept</button>
        </div>
        <div class="table-row invite">
          <img class="table-row__ava" src="${inv2.img}">
          <div><div class="table-row__name">${inv2.name}</div><div class="table-row__meta">Sabacc, House rules · 6 seats</div></div>
          <button class="table-row__cta">Accept</button>
        </div>
      </div>

      <div class="rail-card">
        <div class="head"><span class="kicker">Recent Results</span><span class="hint">ledger</span></div>
        <div class="feed-row"><span class="ico pos">▲</span><span><span class="em">Pazaak</span> vs Pegar Voss — won set 3–1</span><span class="time">+180</span></div>
        <div class="feed-row"><span class="ico neg">▼</span><span><span class="em">Sabacc</span> at The Den — bombed out</span><span class="time">−120</span></div>
        <div class="feed-row"><span class="ico pos">▲</span><span><span class="em">Pazaak</span> vs Vera — pure twenty</span><span class="time">+300</span></div>
        <div class="feed-row"><span class="ico">◇</span><span><span class="em">Sabacc</span> — Idiot’s Array folded the room</span><span class="time">+540</span></div>
      </div>`;
    railPane.querySelectorAll('[data-resume]').forEach(b => b.addEventListener('click', () => {
      selectedId = b.dataset.resume; renderGameList(); renderDetail();
      const g = GAMES.find(x => x.id === selectedId);
      if (g.id === 'pazaak') { Router.show('pazaak', { title: 'Pazaak' }); PazaakTable.start({ ...config, opponent: OPPONENTS[config.opponentId] }); }
      else { Router.show('sabacc', { title: 'Sabacc' }); SabaccTable.start({ ...config }); }
    }));
  }

  /* ---------- boot ---------- */
  Bank.set(PLAYER.credits);
  renderGameList();
  renderDetail();
  renderRail();
})();

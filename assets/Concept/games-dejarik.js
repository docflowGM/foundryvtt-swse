/* ===================================================================
   Holopad Games — DEJARIK table (radial holochess)
   Creatures · movement · range · attack · HP · defeat · light AI
   =================================================================== */
const DejarikTable = (function () {
  'use strict';

  const view = document.getElementById('view-dejarik');
  let S = null;
  const RAYS = DEJARIK.rays;          // 12
  const HUB_R = 15;                                   // hub radius (% of board)
  const RING_BANDS = [[15, 30], [30, 46]];            // inner / outer ring radial extents
  const RINGR = [ (RING_BANDS[0][0] + RING_BANDS[0][1]) / 2, (RING_BANDS[1][0] + RING_BANDS[1][1]) / 2 ]; // cell centres → [22.5, 38]

  /* annular-sector path (0–100 viewBox) for one cell; pad=angular inset°, rp=radial inset% */
  function cellPath(ring, ray, pad, rp) {
    const [ri, ro] = RING_BANDS[ring];
    const rIn = ri + rp, rOut = ro - rp;
    const a0 = (ray * 30 + pad) * Math.PI / 180;
    const a1 = ((ray + 1) * 30 - pad) * Math.PI / 180;
    const pt = (r, a) => `${(50 + r * Math.sin(a)).toFixed(2)} ${(50 - r * Math.cos(a)).toFixed(2)}`;
    return `M ${pt(rIn, a0)} L ${pt(rOut, a0)} A ${rOut} ${rOut} 0 0 1 ${pt(rOut, a1)} L ${pt(rIn, a1)} A ${rIn} ${rIn} 0 0 0 ${pt(rIn, a0)} Z`;
  }
  function sectorPath(ring, ray) { return cellPath(ring, ray, 1.3, 1.2); }

  function pos(ring, ray) {
    // +0.5 centres the token inside the pie-slice cell instead of on the spoke line
    const a = ((ray + 0.5) * 360 / RAYS) * Math.PI / 180;
    const r = RINGR[ring];
    return { x: 50 + r * Math.sin(a), y: 50 - r * Math.cos(a) };
  }
  function key(ring, ray) { return ring + '-' + ((ray % RAYS) + RAYS) % RAYS; }
  function neighbors(ring, ray) {
    return [
      { ring: 1 - ring, ray },
      { ring, ray: ((ray + 1) % RAYS) },
      { ring, ray: ((ray - 1 + RAYS) % RAYS) }
    ];
  }
  function dist(a, b) {
    const rd = Math.abs(a.ring - b.ring);
    let yd = Math.abs(a.ray - b.ray); yd = Math.min(yd, RAYS - yd);
    return rd + yd;
  }
  function pieceAt(ring, ray) { return S.pieces.find(p => p.alive && p.ring === ring && p.ray === ((ray % RAYS) + RAYS) % RAYS); }

  function start(cfg) {
    const opp = cfg.opponent || OPPONENTS.vera;
    const buyIn = cfg.rules === 'wagered' ? cfg.buyIn : 0;
    S = { cfg, opp, buyIn, pot: buyIn * 2, phase: 'select', chosen: [], pieces: [], turn: 'player', selectedId: null, moves: [], log: [], winner: null };
    render();
  }
  function mk(m, owner, ring, ray, id) { return { id, name: m.name, glyph: m.glyph, owner, atk: m.atk, hp: m.hp, maxHp: m.hp, ring, ray, alive: true }; }

  /* ---------- pre-match draft ---------- */
  function toggleChoose(k) {
    const i = S.chosen.indexOf(k);
    if (i >= 0) S.chosen.splice(i, 1);
    else if (S.chosen.length < 4) S.chosen.push(k);
    render();
  }
  function deploy() {
    if (S.chosen.length !== 4) return;
    if (S.buyIn) Bank.add(-S.buyIn);
    const mine = S.chosen.map(k => DEJARIK.monsters.find(m => m.key === k));
    const pool = [...DEJARIK.monsters]; const theirs = [];
    for (let i = 0; i < 4; i++) theirs.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    const playerRays = [4, 5, 6, 7], enemyRays = [10, 11, 0, 1];
    const pieces = [];
    mine.forEach((m, i) => pieces.push(mk(m, 'player', 1, playerRays[i], 'p' + i)));
    theirs.forEach((m, i) => pieces.push(mk(m, 'opp', 1, enemyRays[i], 'e' + i)));
    S.pieces = pieces; S.phase = 'playing'; S.turn = 'player'; S.selectedId = null; S.moves = [];
    logMsg('table', `Holochess engaged. ${PLAYER.name} (cyan) vs ${S.opp.name} (magenta). ${S.buyIn ? `Pot ${S.pot}cr escrowed.` : 'Friendly match.'}`, 'force');
    render();
  }

  function logMsg(who, msg, tone = '') { S.log.unshift({ who, msg, tone }); if (S.log.length > 28) S.log.pop(); }
  function say(key) { const t = line(S.opp.personality, key); if (t) logMsg(S.opp.name, '“' + t + '”', 'force'); }

  /* ---------- selection / legal targets ---------- */
  function select(id) {
    if (S.turn !== 'player' || S.phase !== 'playing') return;
    const p = S.pieces.find(x => x.id === id && x.owner === 'player' && x.alive);
    if (!p) return;
    S.selectedId = id;
    S.moves = neighbors(p.ring, p.ray).filter(n => !pieceAt(n.ring, n.ray)).map(n => key(n.ring, n.ray));
    render();
  }
  function targetsFor(p) {
    return neighbors(p.ring, p.ray).map(n => pieceAt(n.ring, n.ray)).filter(t => t && t.owner !== p.owner);
  }
  function moveTo(spaceKey) {
    const p = S.pieces.find(x => x.id === S.selectedId); if (!p) return;
    const [ring, ray] = spaceKey.split('-').map(Number);
    if (!S.moves.includes(spaceKey)) return;
    p.ring = ring; p.ray = ray;
    logMsg(PLAYER.name, `moves ${p.name} to ${ring === 1 ? 'outer' : 'inner'} ${ray}.`);
    endPlayerAction();
  }
  function attack(targetId) {
    const p = S.pieces.find(x => x.id === S.selectedId); const t = S.pieces.find(x => x.id === targetId);
    if (!p || !t) return;
    if (!targetsFor(p).includes(t)) return;
    resolveAttack(p, t);
    endPlayerAction();
  }
  function resolveAttack(att, def) {
    const dmg = att.atk + Math.floor(Math.random() * 2);
    def.hp -= dmg;
    S.lastHit = def.id;
    if (def.hp <= 0) { def.alive = false; def.hp = 0; logMsg(att.owner === 'player' ? PLAYER.name : S.opp.name, `${att.name} strikes ${def.name} for ${dmg} — defeated!`, att.owner === 'player' ? 'success' : 'danger'); }
    else logMsg(att.owner === 'player' ? PLAYER.name : S.opp.name, `${att.name} hits ${def.name} for ${dmg} (${def.hp}/${def.maxHp} left).`, att.owner === 'player' ? 'success' : 'danger');
  }
  function endPlayerAction() {
    S.selectedId = null; S.moves = [];
    if (checkWin()) return render();
    S.turn = 'opp'; render();
    setTimeout(aiTurn, 850);
  }

  /* ---------- AI ---------- */
  function aiTurn() {
    if (S.phase !== 'playing') return;
    const mine = S.pieces.filter(p => p.alive && p.owner === 'opp');
    const foes = S.pieces.filter(p => p.alive && p.owner === 'player');
    if (!mine.length || !foes.length) { checkWin(); return render(); }
    // prefer a piece that can attack (target the weakest reachable foe)
    let bestAtk = null;
    mine.forEach(p => { targetsFor(p).forEach(t => { if (!bestAtk || t.hp < bestAtk.t.hp) bestAtk = { p, t }; }); });
    if (bestAtk) {
      S.selectedId = bestAtk.p.id; render();
      setTimeout(() => { resolveAttack(bestAtk.p, bestAtk.t); say('playsCard'); S.selectedId = null; if (checkWin()) return render(); S.turn = 'player'; render(); }, 500);
      return;
    }
    // else move the piece nearest a foe one step closer
    let best = null;
    mine.forEach(p => {
      const nf = foes.reduce((m, f) => { const d = dist(p, f); return d < m.d ? { f, d } : m; }, { d: 99 }).f;
      neighbors(p.ring, p.ray).forEach(n => {
        if (pieceAt(n.ring, n.ray)) return;
        const d = dist({ ring: n.ring, ray: n.ray }, nf);
        if (!best || d < best.d) best = { p, n, d };
      });
    });
    if (best) {
      best.p.ring = best.n.ring; best.p.ray = best.n.ray;
      logMsg(S.opp.name, `advances ${best.p.name}.`); say('thinking');
    }
    S.turn = 'player'; render();
  }

  function checkWin() {
    const p = S.pieces.some(x => x.alive && x.owner === 'player');
    const o = S.pieces.some(x => x.alive && x.owner === 'opp');
    if (!o) { S.phase = 'over'; S.winner = 'player'; settle(); return true; }
    if (!p) { S.phase = 'over'; S.winner = 'opp'; settle(); return true; }
    return false;
  }
  function settle() {
    if (S.winner === 'player') { logMsg('table', `${PLAYER.name} wins the board!${S.buyIn ? ` Pot ${S.pot}cr paid out via TransactionEngine.` : ''}`, 'success'); if (S.buyIn) Bank.add(S.pot); say('loseRound'); }
    else { logMsg('table', `${S.opp.name} clears the board.${S.buyIn ? ` Pot ${S.pot}cr lost.` : ''}`, 'danger'); say('winRound'); }
  }

  /* ---------- render ---------- */
  /* ---------- render ---------- */
  function renderSelect() {
    const o = S.cfg.opponent;
    const n = S.chosen.length;
    const maxHp = Math.max(...DEJARIK.monsters.map(m => m.hp));
    const maxAtk = Math.max(...DEJARIK.monsters.map(m => m.atk));
    const cards = DEJARIK.monsters.map(m => {
      const on = S.chosen.includes(m.key);
      const order = S.chosen.indexOf(m.key) + 1;
      const full = n >= 4 && !on;
      return `<button class="dj-pick ${on ? 'on' : ''} ${full ? 'dim' : ''}" data-pick="${m.key}">
        ${on ? `<span class="dj-pick__num">${order}</span>` : ''}
        <span class="dj-pick__glyph">${m.glyph}</span>
        <span class="dj-pick__name">${m.name}</span>
        <span class="dj-pick__trait">${m.trait}</span>
        <span class="dj-pick__stats"><span class="st atk">⚔ ${m.atk}</span><span class="st hp">✚ ${m.hp}</span></span>
        <span class="dj-pick__bars">
          <span class="bar"><i class="atk" style="width:${m.atk / maxAtk * 100}%"></i></span>
          <span class="bar"><i class="hp" style="width:${m.hp / maxHp * 100}%"></i></span>
        </span>
      </button>`;
    }).join('');
    view.innerHTML = `
      <div class="table-mode felt">
        <div class="tm-bar">
          <div class="tm-bar__title"><span class="kicker">Dejarik Board</span><h3>${o.name.split(' ')[0]}’s Holotable</h3>
            <div><span class="tm-bar__status">Pre-Match Draft</span><div class="tm-bar__rules">Radial holochess · 4 monsters each · last side standing wins</div></div>
          </div>
          <div class="tm-bar__right">
            ${S.buyIn ? `<span class="pot-strip"><span class="p"><span class="k">Pot</span><span class="v">${S.pot}</span></span><span class="p"><span class="k">Buy-In</span><span class="v cyan">${S.buyIn}</span></span></span>` : ''}
            <button class="btn danger sm" id="dj-sel-close">Close Board</button>
          </div>
        </div>
        <div class="dj-select">
          <div class="dj-select__head">
            <div><span class="kicker">Choose Your Squad</span><h3>Deploy four holomonsters</h3>
              <p>Pick 4 of the 8 holomonsters to bring to the board. Weigh heavy bruisers against fast skirmishers — ${o.name.split(' ')[0]} drafts four of their own.</p></div>
            <div class="build-counter"><div class="n ${n === 4 ? 'full' : ''}">${n}<span style="font-size:18px;opacity:.5">/4</span></div><div class="k">deployed</div></div>
          </div>
          <div class="dj-pickgrid">${cards}</div>
          <div class="dj-select__foot">
            <div class="opp-mini"><img src="${o.img}" alt=""><span>${o.name} · ${o.difficulty} AI · ${o.personality}</span></div>
            <button class="btn ghost sm" id="dj-sel-clear">Clear</button>
            <button class="btn pink" id="dj-deploy" ${n === 4 ? '' : 'disabled'}>▸ Deploy to Board</button>
          </div>
        </div>
      </div>`;
    const q = id => view.querySelector(id);
    q('#dj-sel-close')?.addEventListener('click', () => Router.home());
    q('#dj-deploy')?.addEventListener('click', deploy);
    q('#dj-sel-clear')?.addEventListener('click', () => { S.chosen = []; render(); });
    view.querySelectorAll('[data-pick]').forEach(el => el.addEventListener('click', () => toggleChoose(el.dataset.pick)));
  }

  function boardHtml() {
    const sel = S.pieces.find(p => p.id === S.selectedId);
    // base checkered tiles (their strokes draw the spoke + ring grid)
    let tiles = '';
    for (let ring = 0; ring < 2; ring++) for (let ray = 0; ray < RAYS; ray++) {
      const parity = (ring + ray) % 2;
      tiles += `<path class="dj-tile ${parity ? 'odd' : 'even'}" d="${cellPath(ring, ray, 0, 0)}"></path>`;
    }
    // eligible-cell highlights (full wedges)
    let cells = '';
    S.moves.forEach(k => { const [ring, ray] = k.split('-').map(Number); cells += `<path class="dj-cell move" d="${sectorPath(ring, ray)}" data-space="${k}"></path>`; });
    if (sel) targetsFor(sel).forEach(t => { cells += `<path class="dj-cell atk" d="${sectorPath(t.ring, t.ray)}" data-atk="${t.id}"></path>`; });
    const rings = `
      <circle class="dj-rim faint" cx="50" cy="50" r="${RING_BANDS[1][1] + 1.8}"/>
      <circle class="dj-rim" cx="50" cy="50" r="${RING_BANDS[1][1]}"/>
      <circle class="dj-rim" cx="50" cy="50" r="${RING_BANDS[0][1]}"/>
      <circle class="dj-hub" cx="50" cy="50" r="${HUB_R}"/>
      <circle class="dj-hub-inner" cx="50" cy="50" r="${HUB_R - 4}"/>
      <circle class="dj-hub-dot" cx="50" cy="50" r="1.4"/>`;
    const targetIds = sel ? targetsFor(sel).map(t => t.id) : [];
    const pieces = S.pieces.map(p => {
      const { x, y } = pos(p.ring, p.ray);
      const cls = [p.owner === 'player' ? 'friendly' : 'enemy'];
      if (!p.alive) cls.push('defeated');
      if (p.id === S.selectedId) cls.push('selected');
      if (targetIds.includes(p.id)) cls.push('targetable');
      if (p.id === S.lastHit) cls.push('hit');
      return `<div class="dj-piece ${cls.join(' ')}" style="left:${x}%;top:${y}%" data-piece="${p.id}" title="${p.name}">
        <span class="glyph">${p.glyph}</span>
        <span class="dj-piece__hp"><i style="width:${Math.max(0, p.hp / p.maxHp * 100)}%"></i></span>
      </div>`;
    }).join('');
    return `<div class="dj-board">
      <svg class="dj-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="djBase" cx="50%" cy="42%" r="62%">
            <stop offset="0%" stop-color="#15243c"/><stop offset="68%" stop-color="#0d1726"/><stop offset="100%" stop-color="#080f1b"/>
          </radialGradient>
          <radialGradient id="djHub" cx="50%" cy="40%" r="62%">
            <stop offset="0%" stop-color="#1d3550"/><stop offset="100%" stop-color="#0a1828"/>
          </radialGradient>
        </defs>
        <circle class="dj-base" cx="50" cy="50" r="${RING_BANDS[1][1]}"/>
        ${tiles}${rings}${cells}
      </svg>
      ${pieces}
    </div>`;
  }

  function rosterCard(p) {
    const sel = p.id === S.selectedId ? 'sel' : '';
    return `<div class="dj-piececard ${sel}">
      <div class="dj-piececard__top">
        <div class="dj-piececard__glyph ${p.owner === 'player' ? 'friendly' : 'enemy'}">${p.glyph}</div>
        <div><div class="dj-piececard__n">${p.name}</div><div class="dj-piececard__stats">ATK ${p.atk} · HP ${p.hp}/${p.maxHp}${p.alive ? '' : ' · DEFEATED'}</div></div>
      </div>
      <div class="dj-piececard__hp"><i style="width:${Math.max(0, p.hp / p.maxHp * 100)}%;background:${p.owner === 'player' ? 'var(--vapor-cyan)' : 'var(--vapor-pink)'}"></i></div>
    </div>`;
  }

  function render() {
    if (S.phase === 'select') return renderSelect();
    const sel = S.pieces.find(p => p.id === S.selectedId);
    const myAlive = S.pieces.filter(p => p.owner === 'player' && p.alive);
    const oppAlive = S.pieces.filter(p => p.owner === 'opp' && p.alive);
    const help = S.phase === 'over'
      ? (S.winner === 'player' ? '▲ Victory — enemy board cleared.' : '▼ Defeat — your monsters fell.')
      : S.turn === 'opp' ? `${S.opp.name.split(' ')[0]} is plotting…`
      : sel ? `${sel.name}: ATK ${sel.atk} · HP ${sel.hp}/${sel.maxHp}. Cyan = move, red = attack.`
      : 'Select one of your holomonsters below or on the board.';

    view.innerHTML = `
      <div class="table-mode felt">
        <div class="tm-bar">
          <div class="tm-bar__title"><span class="kicker">Dejarik Board</span><h3>${S.opp.name.split(' ')[0]}’s Holotable</h3>
            <div><span class="tm-bar__status">${S.phase === 'over' ? 'Match Complete' : S.turn === 'player' ? 'Your Activation' : 'Opponent Turn'}</span>
            <div class="tm-bar__rules">Radial holochess · 4 monsters each · last side standing wins</div></div>
          </div>
          <div class="tm-bar__right">
            ${S.buyIn ? `<span class="pot-strip"><span class="p"><span class="k">Pot</span><span class="v">${S.pot}</span></span></span>` : ''}
            ${S.phase === 'over' ? `<button class="btn sm" id="dj-rematch">Rematch</button>` : ''}
            <button class="btn danger sm" id="dj-close">Close Board</button>
          </div>
        </div>

        <div class="dj">
          <div class="dj-rail dj-rail--left">
            <div class="opp-card">
              <img class="opp-card__img" src="${S.opp.img}" alt=""><div class="opp-card__grad"></div>
              <div class="opp-card__info"><div class="n">${S.opp.name}</div><div class="r">${S.opp.difficulty} AI · <span style="color:var(--vapor-pink)">${S.opp.personality}</span></div></div>
            </div>
            <div class="rail-card" style="position:relative">
              <div class="head"><span class="kicker">Tactical Overlay</span><span class="hint">${oppAlive.length} enemy</span></div>
              <div class="dj-selhelp">${help}</div>
              ${S.turn === 'player' && S.phase === 'playing' ? `<button class="btn ghost sm" id="dj-deselect" style="margin-top:10px">Clear Selection</button>` : ''}
            </div>
          </div>

          <div class="dj-stage">${boardHtml()}</div>

          <div class="dj-rail dj-rail--right">
            <div class="rail-card">
              <div class="head"><span class="kicker" style="color:var(--vapor-pink)">Enemy Monsters</span><span class="hint">${oppAlive.length}/4</span></div>
              ${S.pieces.filter(p => p.owner === 'opp').map(rosterCard).join('')}
            </div>
            <div class="rail-card" style="flex:1;display:flex;flex-direction:column;min-height:0">
              <div class="head"><span class="kicker">Board Log</span><span class="hint">live</span></div>
              <div class="log">${S.log.map(e => `<div class="log-row tone-${e.tone}"><b>${e.who === 'table' ? '◇' : e.who.split(' ')[0]}</b><span>${e.msg}</span></div>`).join('')}</div>
            </div>
          </div>
        </div>

        <div class="dj-dock">
          <span class="kicker">Your Monsters</span>
          <div class="pieces">
            ${S.pieces.filter(p => p.owner === 'player').map(p => `
              <button class="dj-chip ${p.id === S.selectedId ? 'sel' : ''} ${p.alive ? '' : 'dead'}" data-piece="${p.id}" ${p.alive ? '' : 'disabled'}>
                <span class="g">${p.glyph}</span><span><span class="nm">${p.name}</span><br><span class="st">ATK ${p.atk} · HP ${p.hp}/${p.maxHp}</span></span>
              </button>`).join('')}
          </div>
          <span class="dj-selhelp">${S.turn === 'player' && S.phase === 'playing' ? 'One move or attack, then the turn passes.' : ''}</span>
        </div>
      </div>`;
    wire();
    S.lastHit = null;
  }

  function wire() {
    const q = id => view.querySelector(id);
    q('#dj-close')?.addEventListener('click', () => Router.home());
    q('#dj-rematch')?.addEventListener('click', () => start({ ...S.cfg, opponent: S.opp }));
    q('#dj-deselect')?.addEventListener('click', () => { S.selectedId = null; S.moves = []; render(); });
    view.querySelectorAll('.dj-chip[data-piece]').forEach(el => el.addEventListener('click', () => select(el.dataset.piece)));
    view.querySelectorAll('.dj-piece[data-piece]').forEach(el => el.addEventListener('click', () => {
      const p = S.pieces.find(x => x.id === el.dataset.piece);
      if (!p) return;
      if (p.owner === 'player' && p.alive) select(p.id);
      else if (p.owner === 'opp' && S.selectedId) attack(p.id);
    }));
    view.querySelectorAll('.dj-cell.move').forEach(el => el.addEventListener('click', () => moveTo(el.dataset.space)));
    view.querySelectorAll('.dj-cell.atk').forEach(el => el.addEventListener('click', () => attack(el.dataset.atk)));
  }

  return { start };
})();

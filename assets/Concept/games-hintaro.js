/* ===================================================================
   Holopad Games — HINTARO table (chance-cube pit)
   Ante · betting · optional reroll · rank compare · split / carryover pots
   =================================================================== */
const HintaroTable = (function () {
  'use strict';

  const view = document.getElementById('view-hintaro');
  let S = null;

  const SEAT_POS = {
    1: [{ l: 50, t: 19 }],
    2: [{ l: 27, t: 23 }, { l: 73, t: 23 }],
    3: [{ l: 19, t: 29 }, { l: 50, t: 18 }, { l: 81, t: 29 }],
    4: [{ l: 15, t: 41 }, { l: 34, t: 22 }, { l: 66, t: 22 }, { l: 86, t: 41 }],
    5: [{ l: 13, t: 46 }, { l: 28, t: 23 }, { l: 50, t: 18 }, { l: 72, t: 23 }, { l: 87, t: 46 }]
  };

  function rollCube() { return { value: 1 + Math.floor(Math.random() * 6), type: Math.random() < 0.5 ? 'tukar' : 'kulro' }; }
  function evalCubes(cubes, face) {
    const live = cubes.filter(c => c.type !== (face.cancels || ''));
    const vals = live.map(c => c.value).sort((a, b) => a - b);
    const score = vals.reduce((s, v) => s + v, 0);
    let rank = 'Scatter';
    if (live.length === 0) rank = 'Void';
    else if (vals.length === 3 && vals[0] === vals[2]) rank = 'Hintaron';
    else if (vals.length === 3 && vals[1] === vals[0] + 1 && vals[2] === vals[1] + 1) rank = 'Surge';
    else if (vals.length >= 2 && (vals[0] === vals[1] || vals[1] === vals[2])) rank = 'Pair';
    return { live: live.length, score, rank };
  }

  function start(cfg) {
    const ante = Math.max(10, cfg.rules === 'wagered' ? cfg.buyIn : HINTARO.ante);
    const stack = ante * 6;
    Bank.add(-stack);
    const oppIds = ['krag', 'dezmin', 'salty', 'riquis', 'pegar'];
    const n = Math.max(1, Math.min(5, (cfg.seats || 4) - 1));
    const seats = [];
    for (let i = 0; i < n; i++) { const o = OPPONENTS[oppIds[i]]; seats.push({ id: o.id, name: o.name, opp: o, ai: true, cubes: [], tableCredits: stack, contrib: 0, folded: false, stood: false, last: '', wins: 0 }); }
    const me = { id: 'me', name: PLAYER.name, ai: false, cubes: [], tableCredits: stack, contrib: 0, folded: false, stood: false, last: '', wins: 0, sel: new Set() };
    S = { cfg, ante, stack, seats, me, allSeats: [...seats, me], pot: 0, carried: 0, round: 1, phase: 'betting', face: null, currentBet: 0, bet: ante, log: [], bubbles: {}, showdown: null };
    deal();
    render();
  }

  function logMsg(who, msg, tone = '') { S.log.unshift({ who, msg, tone }); if (S.log.length > 28) S.log.pop(); }
  function say(s, key, show = true) { const t = line(s.opp.personality, key); if (t && show) S.bubbles = { [s.id]: t }; if (t) logMsg(s.name, '“' + t + '”', 'force'); }

  function deal() {
    S.face = HINTARO.hintaroFaces[Math.floor(Math.random() * HINTARO.hintaroFaces.length)];
    S.pot = S.carried; S.carried = 0;
    S.allSeats.forEach(s => {
      s.cubes = [rollCube(), rollCube(), rollCube()];
      s.eval = evalCubes(s.cubes, S.face);
      s.folded = false; s.stood = false; s.contrib = 0;
      s.tableCredits -= S.ante; s.contrib += S.ante; S.pot += S.ante;
      s.last = 'Antes ' + S.ante + '.';
      if (s.sel) s.sel.clear();
    });
    S.currentBet = 0; S.phase = 'betting'; S.showdown = null; S.bubbles = {};
    S.rolling = true;
    logMsg('table', `Round ${S.round}: cubes cast. Hintaro die shows ${S.face.label} — ${S.face.desc}`, 'force');
  }

  /* ---------- betting ---------- */
  function toCall() { return Math.max(0, S.currentBet - S.me.contrib); }
  function adjBet(d) { S.bet = Math.max(S.ante, Math.min(S.me.tableCredits, S.bet + d)); render(); }
  function commit(s, amt) { amt = Math.min(amt, s.tableCredits); s.tableCredits -= amt; s.contrib += amt; S.pot += amt; }
  function pBet() { commit(S.me, S.bet); S.currentBet = S.me.contrib; S.me.last = `Bets ${S.bet}.`; logMsg(PLAYER.name, `bets ${S.bet}.`); afterBet(); }
  function pCall() { const a = toCall(); commit(S.me, a); S.me.last = a ? `Calls ${a}.` : 'Checks.'; logMsg(PLAYER.name, a ? `calls ${a}.` : 'checks.'); afterBet(); }
  function pFold() { S.me.folded = true; S.me.last = 'Folds.'; logMsg(PLAYER.name, 'folds.', 'danger'); afterBet(); }

  function afterBet() {
    render();
    let i = 0;
    const step = () => {
      if (i >= S.seats.length) { setTimeout(toReroll, 450); return; }
      const s = S.seats[i++];
      if (s.folded) return step();
      setTimeout(() => { aiBet(s); render(); step(); }, 600);
    };
    setTimeout(step, 420);
  }
  function aiBet(s) {
    const need = Math.max(0, S.currentBet - s.contrib);
    const strong = s.eval.score >= 12 || s.eval.rank === 'Hintaron';
    let act;
    if (S.me.folded) act = 'check';
    else if (strong && Math.random() < 0.5 && s.tableCredits > need + S.ante) act = 'raise';
    else if (need === 0 || s.eval.score >= 7) act = 'call';
    else act = Math.random() < 0.5 ? 'fold' : 'call';
    if (act === 'fold') { s.folded = true; s.last = 'Folds.'; logMsg(s.name, 'folds.', 'danger'); }
    else if (act === 'raise') { const r = need + S.ante; commit(s, r); S.currentBet = s.contrib; s.last = `Raises to ${S.currentBet}.`; logMsg(s.name, `raises to ${S.currentBet}.`); say(s, 'taunt'); }
    else { commit(s, need); s.last = need ? `Calls ${need}.` : 'Checks.'; logMsg(s.name, need ? `calls ${need}.` : 'checks.'); }
  }

  /* ---------- reroll ---------- */
  function toReroll() {
    if (activeCount() <= 1) return settle();
    S.phase = 'reroll';
    logMsg('table', 'Reroll window — recast any cubes once, or stand.', '');
    render();
  }
  function activeCount() { return S.allSeats.filter(s => !s.folded).length; }
  function toggleSel(idx) { if (S.phase !== 'reroll') return; if (S.me.sel.has(idx)) S.me.sel.delete(idx); else S.me.sel.add(idx); render(); }
  function pReroll() {
    if (!S.me.sel.size) return;
    S.me.sel.forEach(i => { S.me.cubes[i] = rollCube(); });
    S.me.eval = evalCubes(S.me.cubes, S.face); S.me.sel.clear();
    S.rolling = true;
    S.me.last = 'Rerolls.'; logMsg(PLAYER.name, `rerolls → ${S.me.eval.rank}, ${S.me.eval.score}.`);
    pStand();
  }
  function pStand() {
    S.me.stood = true; S.me.last = `Stands · ${S.me.eval.rank}.`; logMsg(PLAYER.name, `stands on ${S.me.eval.score} (${S.me.eval.rank}).`);
    render();
    let i = 0;
    const step = () => {
      if (i >= S.seats.length) { setTimeout(settle, 600); return; }
      const s = S.seats[i++];
      if (s.folded) return step();
      setTimeout(() => {
        if (s.eval.score < 8 && Math.random() < 0.8) {
          const lo = s.cubes.map((c, idx) => idx).sort((a, b) => s.cubes[a].value - s.cubes[b].value).slice(0, 2);
          lo.forEach(idx => { s.cubes[idx] = rollCube(); }); s.eval = evalCubes(s.cubes, S.face);
          s.last = 'Rerolls.'; logMsg(s.name, `rerolls → ${s.eval.score}.`); say(s, 'drawsCard');
        } else { s.last = `Stands · ${s.eval.rank}.`; logMsg(s.name, 'stands.'); say(s, 'stand'); }
        s.stood = true; render(); step();
      }, 600);
    };
    setTimeout(step, 450);
  }

  /* ---------- settle ---------- */
  function settle() {
    S.phase = 'settle';
    const live = S.allSeats.filter(s => !s.folded);
    const top = Math.max(...live.map(s => s.eval.score));
    const winners = live.filter(s => s.eval.score === top);
    if (top === 0) {
      S.carried = S.pot; S.showdown = { carry: true, amount: S.pot };
      logMsg('table', `Everyone voided. Pot of ${S.pot} carries to round ${S.round + 1}.`, 'danger');
    } else {
      const share = Math.floor(S.pot / winners.length);
      winners.forEach(w => { w.tableCredits += share; w.wins++; });
      const names = winners.map(w => w.name.split(' ')[0]).join(' & ');
      S.showdown = { winners: winners.map(w => w.id), label: winners[0].eval.rank, score: top, amount: share, split: winners.length > 1, names };
      logMsg('table', `${names} ${winners.length > 1 ? 'split' : 'wins'} ${share}${winners.length > 1 ? ' each' : ''} with ${top} (${winners[0].eval.rank}).`, winners.some(w => w.id === 'me') ? 'success' : 'danger');
      const aiW = winners.find(w => w.ai); if (aiW) say(aiW, 'winRound');
    }
    S.pot = 0; S.phase = 'roundComplete'; render();
  }
  function nextRound() { S.round++; deal(); render(); }
  function cashOut() { Bank.add(S.me.tableCredits); logMsg('table', `${PLAYER.name} cashes out ${S.me.tableCredits}. Escrow settled.`, 'success'); Router.home(); }

  /* ---------- render ---------- */
  const D6_REST = { 1: 'rotateX(0deg) rotateY(0deg)', 2: 'rotateX(-90deg) rotateY(0deg)', 3: 'rotateX(0deg) rotateY(-90deg)', 4: 'rotateX(0deg) rotateY(90deg)', 5: 'rotateX(90deg) rotateY(0deg)', 6: 'rotateX(0deg) rotateY(180deg)' };
  const D6_PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  function d6Face(n, cls) {
    let cells = '';
    for (let i = 1; i <= 9; i++) cells += `<span class="${D6_PIPS[n].includes(i) ? 'pip' : ''}"></span>`;
    return `<div class="d6__f ${cls}">${cells}</div>`;
  }
  function d6Html(cube, idx) {
    const cancelled = cube.type === (S.face.cancels || '');
    const dl = (idx * 0.09).toFixed(2);
    const dur = (1.02 + idx * 0.08).toFixed(2);
    return `<div class="d6-wrap ${cube.type} ${cancelled ? 'cancelled' : ''}">
      <div class="d6 ${cube.type} ${S.rolling ? 'rolling' : ''}" style="--rest:${D6_REST[cube.value]};--dl:${dl}s;--dur:${dur}s">
        ${d6Face(1, 'f1')}${d6Face(6, 'f6')}${d6Face(2, 'f2')}${d6Face(5, 'f5')}${d6Face(3, 'f3')}${d6Face(4, 'f4')}
      </div>
      <span class="d6-type">${HINTARO.glyphs[cube.type].label} ${cube.value}</span>
    </div>`;
  }

  function cube(c, cancelled, big, idx, selectable) {
    const g = HINTARO.glyphs[c.type];
    const sel = selectable && S.me.sel.has(idx) ? 'sel' : '';
    return `<span class="ht-cube ${c.type} ${cancelled ? 'cancelled' : ''} ${sel}" ${selectable ? `data-cube="${idx}"` : ''}><span class="v">${c.value}</span><span class="g">${g.mark}</span></span>`;
  }
  function seatHtml(s, pos) {
    const reveal = true;
    const win = S.showdown && S.showdown.winners && S.showdown.winners.includes(s.id);
    const status = s.folded ? 'fold' : s.stood ? 'called' : 'in';
    const statusLabel = s.folded ? 'Folded' : s.stood ? 'Stood' : 'In';
    const bubble = S.bubbles[s.id] ? `<div class="bubble"><span class="who">${s.name.split(' ')[0]}</span>${S.bubbles[s.id]}</div>` : '';
    return `<div class="sb-seat ${s.folded ? 'folded' : ''} ${win ? 'special' : ''}" style="left:${pos.l}%;top:${pos.t}%">
      ${bubble}
      <div class="sb-seat__card">
        <div class="sb-seat__head">
          <img class="sb-seat__ava" src="${s.opp.img}" alt="">
          <div><div class="sb-seat__n">${s.name.split(' ')[0]}</div><div class="sb-seat__meta">${s.opp.difficulty} · ${s.opp.personality}</div></div>
          <div class="sb-seat__total">${reveal ? s.eval.score : '—'}<span class="tl">${reveal ? s.eval.rank : 'hidden'}</span></div>
        </div>
        <div class="ht-cubes">${s.cubes.map(c => cube(c, reveal && c.type === (S.face.cancels || ''))).join('')}</div>
        <div class="sb-seat__chips"><span class="sb-seat__status ${status}">${statusLabel}</span><span class="cr">${s.tableCredits}cr</span></div>
        <div class="sb-seat__chips"><span class="last">${s.last}</span></div>
      </div>
    </div>`;
  }

  function dock() {
    const ev = S.me.eval;
    const canBet = S.phase === 'betting' && !S.me.folded;
    const canReroll = S.phase === 'reroll' && !S.me.folded && !S.me.stood;
    let actions = '';
    if (canBet) {
      const tc = toCall();
      actions = `<div class="sb-betinfo">To call <b>${tc}</b> · current bet <b>${S.currentBet}</b></div>
        <div class="sb-betactions">
          ${tc === 0 ? `<button class="btn ghost sm" id="ht-check">Check</button>` : `<button class="btn pink sm" id="ht-call">Call ${tc}</button>`}
          <span class="sb-betamt"><button id="ht-minus">−</button><span class="val">${S.bet}</span><button id="ht-plus">+</button></span>
          <button class="btn sm" id="ht-bet">${S.currentBet === 0 ? 'Bet' : 'Raise'}</button>
          <button class="btn danger sm" id="ht-fold">Fold</button>
        </div>`;
    } else if (canReroll) {
      actions = `<div class="sb-betinfo">Tap cubes to recast · <b>${S.me.sel.size}</b> selected · ${ev.rank} (${ev.score})</div>
        <div class="sb-betactions">
          <button class="btn sm" id="ht-reroll" ${S.me.sel.size ? '' : 'disabled'}>Reroll Selected</button>
          <button class="btn pink sm" id="ht-stand">Stand</button>
        </div>`;
    } else if (S.phase === 'roundComplete') {
      const won = S.showdown && S.showdown.winners && S.showdown.winners.includes('me');
      actions = `<div class="sb-betinfo" style="color:${won ? 'var(--pos)' : 'var(--neg)'}">${won ? '▲ You took the pot' : S.showdown.carry ? '◇ Pot carried over' : '▼ Round lost'}</div>
        <div class="sb-betactions"><button class="btn pink sm" id="ht-next">Next Round ▸</button><button class="btn ghost sm" id="ht-cash">Cash Out</button></div>`;
    } else actions = `<div class="sb-betinfo muted">Waiting on the pit…</div>`;

    return `<div class="sb-dock">
      <div class="sb-myhand">
        <span class="kicker">Your Cubes${canReroll ? ' — tap to select for reroll' : ''}</span>
        <div class="ht-dock-cubes">${S.me.cubes.map((c, i) => cube(c, c.type === (S.face.cancels || ''), true, i, canReroll)).join('')}</div>
      </div>
      <div class="sb-betbox">${actions}</div>
      <div class="sb-myinfo"><div class="cr">${S.me.tableCredits}</div><div class="crl">table credits</div>
        <div class="tot">rank <b style="color:var(--vapor-pink)">${ev.rank}</b> · score <b style="color:var(--vapor-cyan)">${ev.score}</b></div></div>
    </div>`;
  }

  function render() {
    const pos = SEAT_POS[S.seats.length] || SEAT_POS[3];
    const banner = S.showdown ? (S.showdown.carry
      ? `<div class="sb-banner">Pot carries — ${S.showdown.amount}cr<small>every hand voided this round</small></div>`
      : `<div class="sb-banner ${S.showdown.winners.includes('me') ? 'win' : ''}">${S.showdown.names} ${S.showdown.split ? 'split the pot' : 'wins ' + S.showdown.amount + 'cr'}<small>${S.showdown.label} · ${S.showdown.score}${S.showdown.split ? ' · ' + S.showdown.amount + 'cr each' : ''}</small></div>`) : '';

    view.innerHTML = `
      <div class="table-mode felt">
        <div class="tm-bar">
          <div class="tm-bar__title"><span class="kicker">Hintaro Pit</span><h3>The Chance Cubes</h3>
            <div><span class="tm-bar__status">${({ betting: 'Betting Round', reroll: 'Reroll Window', settle: 'Settling', roundComplete: 'Round Complete' })[S.phase]}</span>
            <div class="tm-bar__rules">Tukar &amp; Kulro cubes · Hintaro die cancels · round ${S.round}</div></div>
          </div>
          <div class="tm-bar__right">
            <span class="pot-strip"><span class="p"><span class="k">Pot</span><span class="v">${S.pot}</span></span><span class="p"><span class="k">Carried</span><span class="v cyan">${S.carried}</span></span></span>
            <button class="btn ghost sm" id="ht-cancel">Cash Out</button>
            <button class="btn danger sm" id="ht-close">Close Table</button>
          </div>
        </div>
        <div class="sb">
          ${banner}
          <div class="sb-table">
            <div class="sb-center">
              <div class="ht-cast-label">Your cast on the table</div>
              <div class="ht-tray">${S.me.cubes.map((c, i) => d6Html(c, i)).join('')}</div>
              <div class="ht-facebox">
                <div class="ht-face-die tone-${S.face.tone} ${S.rolling ? 'rolling' : ''}"><span class="s">${S.face.short}</span><span class="l">die</span></div>
                <div class="txt ht-callout" style="margin-top:0"><b>${S.face.label} die.</b> ${S.face.desc}</div>
              </div>
            </div>
          </div>
          <div class="ht-ranks-panel">
            <span class="kicker dim">Rank Order</span>
            <div class="ht-ranklist">${HINTARO.ranks.map(r => `<div class="r ${(!S.me.folded && r.label === S.me.eval.rank) ? 'active' : ''}"><b>${r.label}</b><span>${r.desc}</span></div>`).join('')}</div>
          </div>
          ${S.seats.map((s, i) => seatHtml(s, pos[i])).join('')}
          ${dock()}
        </div>
      </div>`;
    wire();
    if (S.rolling) { clearTimeout(S._rollTimer); S._rollTimer = setTimeout(() => { S.rolling = false; }, 1400); }
  }

  function wire() {
    const q = id => view.querySelector(id);
    q('#ht-close')?.addEventListener('click', cashOut);
    q('#ht-cancel')?.addEventListener('click', cashOut);
    q('#ht-minus')?.addEventListener('click', () => adjBet(-S.ante));
    q('#ht-plus')?.addEventListener('click', () => adjBet(S.ante));
    q('#ht-check')?.addEventListener('click', pCall);
    q('#ht-call')?.addEventListener('click', pCall);
    q('#ht-bet')?.addEventListener('click', pBet);
    q('#ht-fold')?.addEventListener('click', pFold);
    q('#ht-reroll')?.addEventListener('click', pReroll);
    q('#ht-stand')?.addEventListener('click', pStand);
    q('#ht-next')?.addEventListener('click', nextRound);
    q('#ht-cash')?.addEventListener('click', cashOut);
    view.querySelectorAll('[data-cube]').forEach(el => el.addEventListener('click', () => toggleSel(Number(el.dataset.cube))));
  }

  return { start };
})();

/* ===================================================================
   Holopad Games — SABACC table (Corellian Spike, casino mode)
   Target zero · hand pot + sabacc pot · betting + draw + showdown
   =================================================================== */
const SabaccTable = (function () {
  'use strict';

  const view = document.getElementById('view-sabacc');
  let S = null;

  // opponent seat positions around the oval, keyed by opponent count
  const SEAT_POS = {
    1: [{ l: 50, t: 20 }],
    2: [{ l: 28, t: 24 }, { l: 72, t: 24 }],
    3: [{ l: 20, t: 30 }, { l: 50, t: 19 }, { l: 80, t: 30 }],
    4: [{ l: 15, t: 42 }, { l: 34, t: 22 }, { l: 66, t: 22 }, { l: 86, t: 42 }],
    5: [{ l: 13, t: 47 }, { l: 28, t: 24 }, { l: 50, t: 18 }, { l: 72, t: 24 }, { l: 87, t: 47 }]
  };

  function draw() { return { ...SABACC_DECK[Math.floor(Math.random() * SABACC_DECK.length)] }; }
  function evalHand(cards) {
    const total = cards.reduce((s, c) => s + c.value, 0);
    const hasSylop = cards.some(c => c.sylop);
    const dist = Math.abs(total);
    const pureSabacc = total === 0 && cards.length >= 2;
    const idiotsArray = cards.length === 3 && hasSylop && total === 0;
    return { total, dist, pureSabacc, idiotsArray, hasSylop,
      label: pureSabacc ? (idiotsArray ? "Idiot’s Array" : 'Pure Sabacc') : (total > 0 ? '+' + total : String(total)) };
  }

  function start(cfg) {
    const ante = Math.max(10, cfg.rules === 'wagered' ? cfg.buyIn : 25);
    const stack = ante * 5;
    Bank.add(-stack);
    const oppIds = ['salty', 'vera', 'dezmin', 'riquis', 'pegar'];
    const n = Math.max(1, Math.min(5, (cfg.seats || 4) - 1));
    const seats = [];
    for (let i = 0; i < n; i++) {
      const o = OPPONENTS[oppIds[i]];
      seats.push({ id: o.id, name: o.name, opp: o, ai: true, hand: [], folded: false, called: false, tableCredits: stack, contrib: 0, last: 'Anteing in.', wins: 0 });
    }
    const me = { id: 'me', name: PLAYER.name, ai: false, hand: [], folded: false, called: false, tableCredits: stack, contrib: 0, last: '', wins: 0 };
    S = {
      cfg, ante, stack, seats, me, allSeats: [...seats, me],
      handPot: 0, sabaccPot: ante * 2, round: 1, phase: 'betting',
      currentBet: 0, activeIdx: 0, log: [], bet: ante, shift: null, showdown: null, bubbles: {}
    };
    deal();
    render();
  }

  function logMsg(who, msg, tone = '') { S.log.unshift({ who, msg, tone }); if (S.log.length > 30) S.log.pop(); }

  function deal() {
    S.allSeats.forEach(s => {
      s.hand = []; s.folded = false; s.called = false; s.contrib = 0;
      s.tableCredits -= S.ante; s.contrib += S.ante; S.handPot += S.ante;
      s.hand.push(draw(), draw());
      s.eval = evalHand(s.hand);
      s.last = 'Antes ' + S.ante + 'cr.';
    });
    S.currentBet = 0; S.phase = 'betting'; S.shift = null; S.showdown = null; S.bubbles = {};
    logMsg('table', `Hand ${S.round} dealt. Two cards each. Ante ${S.ante}cr → hand pot ${S.handPot}.`, 'force');
  }

  /* ---------- player betting ---------- */
  function toCall() { return Math.max(0, S.currentBet - S.me.contrib); }
  function adjBet(d) { S.bet = Math.max(S.ante, Math.min(S.me.tableCredits, S.bet + d)); render(); }

  function pBet() { const amt = Math.min(S.bet, S.me.tableCredits); commit(S.me, amt); S.currentBet = S.me.contrib; S.me.last = `Bets ${amt}.`; logMsg(PLAYER.name, `bets ${amt}cr.`); afterPlayerBet(); }
  function pCall() { const amt = toCall(); commit(S.me, amt); S.me.last = amt ? `Calls ${amt}.` : 'Checks.'; logMsg(PLAYER.name, amt ? `calls ${amt}cr.` : 'checks.'); afterPlayerBet(); }
  function pRaise() { const amt = toCall() + S.bet; commit(S.me, amt); S.currentBet = S.me.contrib; S.me.last = `Raises to ${S.currentBet}.`; logMsg(PLAYER.name, `raises to ${S.currentBet}cr.`); afterPlayerBet(); }
  function pFold() { S.me.folded = true; S.me.last = 'Folds.'; logMsg(PLAYER.name, 'folds.', 'danger'); afterPlayerBet(); }
  function commit(s, amt) { amt = Math.min(amt, s.tableCredits); s.tableCredits -= amt; s.contrib += amt; S.handPot += amt; }

  function afterPlayerBet() {
    render();
    // AI seats respond in order
    let i = 0;
    const stepAI = () => {
      if (i >= S.seats.length) { setTimeout(toDrawing, 500); return; }
      const s = S.seats[i++];
      if (s.folded) { stepAI(); return; }
      setTimeout(() => { aiBet(s); render(); stepAI(); }, 620);
    };
    if (S.me.folded) { // others may still want to bet but hand ends fast
      setTimeout(stepAI, 400);
    } else setTimeout(stepAI, 450);
  }

  function aiBet(s) {
    const need = Math.max(0, S.currentBet - s.contrib);
    const d = s.eval.dist;
    const strong = d <= 3, ok = d <= 7;
    let act;
    if (S.me.folded) act = 'check';
    else if (strong && Math.random() < 0.5 && s.tableCredits > need + S.ante) act = 'raise';
    else if (ok || need === 0) act = 'call';
    else act = Math.random() < 0.55 ? 'fold' : 'call';
    if (act === 'fold') { s.folded = true; s.last = 'Folds.'; logMsg(s.name, 'folds.', 'danger'); say(s, 'taunt', false); }
    else if (act === 'raise') { const r = need + S.ante; commit(s, r); S.currentBet = s.contrib; s.last = `Raises to ${S.currentBet}.`; logMsg(s.name, `raises to ${S.currentBet}cr.`); say(s, 'playsCard'); }
    else { commit(s, need); s.last = need ? `Calls ${need}.` : 'Checks.'; logMsg(s.name, need ? `calls ${need}cr.` : 'checks.'); }
  }

  function say(s, key, show = true) {
    const t = line(s.opp.personality, key);
    if (t && show) S.bubbles = { [s.id]: t }; // keep only the latest speaker
    if (t) logMsg(s.name, '“' + t + '”', 'force');
  }

  /* ---------- drawing phase ---------- */
  function toDrawing() {
    if (activeCount() <= 1) { showdown(); return; }
    S.phase = 'drawing';
    logMsg('table', 'Drawing round — improve toward zero or stand.', '');
    maybeShift();
    render();
  }
  function activeCount() { return S.allSeats.filter(s => !s.folded).length; }

  function maybeShift() {
    // occasional shift dice that can force a redraw of one random card
    if (Math.random() < 0.5) {
      const a = 1 + Math.floor(Math.random() * 6), b = 1 + Math.floor(Math.random() * 6);
      const matched = a === b;
      S.shift = { a, b, matched };
      logMsg('table', `Shift dice: ${a} · ${b}${matched ? ' — SABACC SHIFT! random cards swap.' : ' — stable.'}`, matched ? 'danger' : '');
      if (matched) {
        S.allSeats.forEach(s => { if (!s.folded && s.hand.length) { const idx = Math.floor(Math.random() * s.hand.length); s.hand[idx] = draw(); s.eval = evalHand(s.hand); } });
      }
    } else S.shift = null;
  }

  function pDraw() {
    if (S.phase !== 'drawing') return;
    S.me.hand.push(draw()); S.me.eval = evalHand(S.me.hand);
    S.me.last = 'Draws.'; logMsg(PLAYER.name, `draws → ${S.me.eval.label}.`);
    if (S.me.hand.length >= 5) { S.me.last = 'Hand full.'; }
    render();
  }
  function pStand() {
    if (S.phase !== 'drawing') return;
    S.me.called = true; S.me.last = 'Stands.'; logMsg(PLAYER.name, `stands on ${S.me.eval.label}.`);
    render();
    // AI draw decisions
    let i = 0;
    const stepAI = () => {
      if (i >= S.seats.length) { setTimeout(showdown, 600); return; }
      const s = S.seats[i++];
      if (s.folded) { stepAI(); return; }
      setTimeout(() => {
        if (s.eval.dist > 4 && s.hand.length < 4 && Math.random() < 0.8) { s.hand.push(draw()); s.eval = evalHand(s.hand); s.last = 'Draws.'; logMsg(s.name, `draws → ${s.eval.dist} off.`); say(s, 'drawsCard'); }
        else { s.called = true; s.last = 'Stands.'; logMsg(s.name, 'stands.'); say(s, 'stand'); }
        render(); stepAI();
      }, 650);
    };
    setTimeout(stepAI, 500);
  }

  /* ---------- showdown ---------- */
  function showdown() {
    S.phase = 'showdown';
    const live = S.allSeats.filter(s => !s.folded);
    let winner = live[0];
    live.forEach(s => {
      if (s.eval.dist < winner.eval.dist) winner = s;
      else if (s.eval.dist === winner.eval.dist && s.eval.pureSabacc && !winner.eval.pureSabacc) winner = s;
    });
    const pure = winner.eval.pureSabacc;
    let payout = S.handPot;
    winner.tableCredits += S.handPot;
    winner.wins++;
    let extra = 0;
    if (pure) { extra = S.sabaccPot; winner.tableCredits += S.sabaccPot; S.sabaccPot = S.ante * 2; }
    else { S.sabaccPot += S.ante; } // carryover grows
    S.showdown = { winnerId: winner.id, label: winner.eval.label, pure, payout: payout + extra };
    logMsg('table', `${winner.name} wins ${payout + extra}cr with ${winner.eval.label}${pure ? ' — takes the Sabacc pot!' : ''}`, winner.id === 'me' ? 'success' : 'danger');
    if (winner.ai) say(winner, 'winRound');
    S.handPot = 0; S.phase = 'handComplete';
    render();
  }

  function nextHand() { S.round++; deal(); render(); }
  function cashOut() {
    Bank.add(S.me.tableCredits);
    logMsg('table', `${PLAYER.name} cashes out ${S.me.tableCredits}cr. Escrow settled via TransactionEngine.`, 'success');
    Router.home();
  }

  /* ---------- render ---------- */
  function cardFace(c, reveal) {
    if (!reveal) return `<span class="sbcard back"></span>`;
    return `<span class="sbcard sign-${c.sign} ${c.sylop ? 'sylop' : ''} deal-in"><img src="${c.img}" alt=""></span>`;
  }

  function seatHtml(s, idx, pos) {
    const reveal = S.phase === 'showdown' || S.phase === 'handComplete';
    const isCur = false;
    const cls = s.folded ? 'folded' : '';
    const winCls = S.showdown && S.showdown.winnerId === s.id ? 'special' : '';
    const status = s.folded ? 'fold' : s.called ? 'called' : 'in';
    const statusLabel = s.folded ? 'Folded' : s.called ? 'Stood' : 'In Hand';
    const totalLabel = reveal ? s.eval.label : `${s.hand.length}×`;
    const bubble = S.bubbles[s.id] ? `<div class="bubble"><span class="who">${s.name.split(' ')[0]}</span>${S.bubbles[s.id]}</div>` : '';
    return `<div class="sb-seat ${cls} ${winCls}" style="left:${pos.l}%;top:${pos.t}%">
      ${bubble}
      <div class="sb-seat__card">
        <div class="sb-seat__head">
          <img class="sb-seat__ava" src="${s.opp.img}" alt="">
          <div><div class="sb-seat__n">${s.name.split(' ')[0]}</div><div class="sb-seat__meta">${s.opp.difficulty} · ${s.opp.personality}</div></div>
          <div class="sb-seat__total ${s.eval.pureSabacc && reveal ? '' : ''}"><span class="tl">total</span>${totalLabel}</div>
        </div>
        <div class="sb-seat__cards">${s.hand.map(c => cardFace(c, reveal)).join('')}</div>
        <div class="sb-seat__chips"><span class="sb-seat__status ${status}">${statusLabel}</span><span class="cr">${s.tableCredits}cr</span></div>
        <div class="sb-seat__chips"><span class="last">${s.last}</span></div>
      </div>
    </div>`;
  }

  function dockHtml() {
    const reveal = true;
    const canBet = S.phase === 'betting' && !S.me.folded;
    const canDraw = S.phase === 'drawing' && !S.me.folded && !S.me.called;
    const ev = S.me.eval;
    let actions = '';
    if (canBet) {
      const tc = toCall();
      actions = `
        <div class="sb-betinfo">To call <b>${tc}</b> · current bet <b>${S.currentBet}</b></div>
        <div class="sb-betactions">
          ${tc === 0 ? `<button class="btn ghost sm" id="sb-check">Check</button>` : `<button class="btn pink sm" id="sb-call">Call ${tc}</button>`}
          <span class="sb-betamt"><button id="sb-minus">−</button><span class="val">${S.bet}</span><button id="sb-plus">+</button></span>
          ${S.currentBet === 0 ? `<button class="btn sm" id="sb-bet">Bet</button>` : `<button class="btn sm" id="sb-raise">Raise</button>`}
          <button class="btn danger sm" id="sb-fold">Fold</button>
        </div>`;
    } else if (canDraw) {
      actions = `<div class="sb-betinfo">Distance from zero: <b>${ev.dist}</b> ${ev.pureSabacc ? '· PURE SABACC' : ''}</div>
        <div class="sb-betactions">
          <button class="btn sm" id="sb-draw" ${S.me.hand.length >= 5 ? 'disabled' : ''}>Draw Card</button>
          <button class="btn pink sm" id="sb-stand">Stand</button>
          <button class="btn danger sm" id="sb-fold2">Fold</button>
        </div>`;
    } else if (S.phase === 'handComplete') {
      const won = S.showdown && S.showdown.winnerId === 'me';
      actions = `<div class="sb-betinfo" style="color:${won ? 'var(--pos)' : 'var(--neg)'}">${won ? '▲ You took the pot' : '▼ Hand lost'}</div>
        <div class="sb-betactions"><button class="btn pink sm" id="sb-next">Next Hand ▸</button><button class="btn ghost sm" id="sb-cash">Cash Out</button></div>`;
    } else {
      actions = `<div class="sb-betinfo muted">Waiting on the table…</div>`;
    }
    return `
      <div class="sb-dock">
        <div class="sb-myhand">
          <span class="kicker">Your Hand — private</span>
          <div class="hcards">${S.me.hand.map(c => `<span class="hc sign-${c.sign} ${c.sylop ? 'sylop' : ''}"><img src="${c.img}" alt=""></span>`).join('')}</div>
        </div>
        <div class="sb-betbox">${actions}</div>
        <div class="sb-myinfo">
          <div class="cr">${S.me.tableCredits}</div><div class="crl">table credits</div>
          <div class="tot">hand total <b style="color:${ev.pureSabacc ? 'var(--vapor-pink)' : 'var(--vapor-cyan)'}">${ev.label}</b> · ${ev.dist} off zero</div>
        </div>
      </div>`;
  }

  function render() {
    const pos = SEAT_POS[S.seats.length] || SEAT_POS[3];
    const showdownBanner = S.showdown ? `<div class="sb-banner ${S.showdown.winnerId === 'me' ? 'win' : ''}">${S.allSeats.find(s => s.id === S.showdown.winnerId).name} wins ${S.showdown.payout}cr<small>${S.showdown.label}${S.showdown.pure ? ' · claims the Sabacc pot' : ''}</small></div>` : '';
    const market = S.phase === 'drawing' ? `
      <div class="sb-market">
        <span class="kicker dim" style="text-align:right">Market</span>
        ${SABACC_DECK.slice(0, 2).map(c => `<div class="mk"><span class="sbcard sign-${c.sign}"><img src="${c.img}"></span><span class="meta">${c.suit}<b>${S.ante}cr</b>buy</span></div>`).join('')}
      </div>` : '';

    view.innerHTML = `
      <div class="table-mode felt">
        <div class="tm-bar">
          <div class="tm-bar__title">
            <span class="kicker">Sabacc Table</span>
            <h3>The Sabacc Den</h3>
            <div><span class="tm-bar__status">${phaseLabel()}</span>
            <div class="tm-bar__rules">Corellian Spike · target zero · ante ${S.ante} · ${S.seats.length + 1} seats</div></div>
          </div>
          <div class="tm-bar__right">
            <span class="pot-strip">
              <span class="p"><span class="k">Hand Pot</span><span class="v">${S.handPot}</span></span>
              <span class="p"><span class="k">Sabacc Pot</span><span class="v cyan">${S.sabaccPot}</span></span>
            </span>
            <button class="btn ghost sm" id="sb-cancel">Cancel</button>
            <button class="btn danger sm" id="sb-close">Close Table</button>
          </div>
        </div>

        <div class="sb">
          ${showdownBanner}
          <div class="sb-felt"></div>
          <div class="sb-table">
            <div class="sb-center">
              <div class="sb-pots">
                <div class="sb-pot"><div class="k">Hand Pot</div><div class="v">${S.handPot}</div></div>
                <div class="sb-pot sabacc"><div class="k">Sabacc Pot</div><div class="v">${S.sabaccPot}</div></div>
              </div>
              <div class="sb-deck">
                <span class="deck-back" style="width:46px"></span>
                <span style="font-family:var(--font-mono);font-size:9px;color:var(--ink-dim);text-align:left;line-height:1.5">62-card spike deck<br><b style="color:var(--vapor-cyan)">+10…−10</b> · 2 sylops</span>
              </div>
              <div class="sb-shift">Shift dice:
                <span class="sb-dice">
                  <span class="sb-die ${S.shift && S.shift.matched ? 'rolling' : ''}">${S.shift ? S.shift.a : '–'}</span>
                  <span class="sb-die ${S.shift && S.shift.matched ? 'rolling' : ''}">${S.shift ? S.shift.b : '–'}</span>
                </span>
                ${S.shift ? (S.shift.matched ? '<b style="color:var(--neg)"> shift!</b>' : ' stable') : ''}
              </div>
            </div>
          </div>
          ${S.seats.map((s, i) => seatHtml(s, i, pos[i])).join('')}
          ${market}
          ${dockHtml()}
        </div>
      </div>`;
    wire();
  }

  function phaseLabel() {
    return { betting: 'Betting Round', drawing: 'Drawing Round', showdown: 'Showdown', handComplete: 'Hand Complete' }[S.phase] || S.phase;
  }

  function wire() {
    const q = id => view.querySelector(id);
    q('#sb-close')?.addEventListener('click', () => cashOut());
    q('#sb-cancel')?.addEventListener('click', () => cashOut());
    q('#sb-minus')?.addEventListener('click', () => adjBet(-S.ante));
    q('#sb-plus')?.addEventListener('click', () => adjBet(S.ante));
    q('#sb-check')?.addEventListener('click', pCall);
    q('#sb-call')?.addEventListener('click', pCall);
    q('#sb-bet')?.addEventListener('click', pBet);
    q('#sb-raise')?.addEventListener('click', pRaise);
    q('#sb-fold')?.addEventListener('click', pFold);
    q('#sb-draw')?.addEventListener('click', pDraw);
    q('#sb-stand')?.addEventListener('click', pStand);
    q('#sb-fold2')?.addEventListener('click', pFold);
    q('#sb-next')?.addEventListener('click', nextHand);
    q('#sb-cash')?.addEventListener('click', cashOut);
  }

  return { start };
})();

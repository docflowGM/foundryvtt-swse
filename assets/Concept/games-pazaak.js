/* ===================================================================
   Holopad Games — PAZAAK table
   Side-deck builder (10) → 4-card hand · drag/click play · flip chooser
   =================================================================== */
const PazaakTable = (function () {
  'use strict';

  const view = document.getElementById('view-pazaak');
  let S = null;
  let uidSeq = 0;

  const MAIN_DECK = [1,2,3,4,5,6,7,8,9,10];
  function drawMain() { return MAIN_DECK[Math.floor(Math.random() * MAIN_DECK.length)]; }
  function catalogById(id) { return PAZAAK_SIDE_CATALOG.find(c => c.id === id); }
  function instance(entry) { return { ...entry, uid: entry.id + '_' + (uidSeq++), used: false }; }
  function randomDeck() {
    const d = [];
    while (d.length < PAZAAK_DECK_SIZE) d.push(PAZAAK_SIDE_CATALOG[Math.floor(Math.random() * PAZAAK_SIDE_CATALOG.length)]);
    return d;
  }
  function drawHand(deck) {
    const pool = deck.map((e, i) => i);
    const hand = [];
    while (hand.length < PAZAAK_HAND_SIZE && pool.length) hand.push(instance(deck[pool.splice(Math.floor(Math.random() * pool.length), 1)[0]]));
    return hand;
  }

  function start(cfg) {
    const opp = cfg.opponent;
    const buyIn = cfg.rules === 'wagered' ? cfg.buyIn : 0;
    if (buyIn) Bank.add(-buyIn);
    S = {
      cfg, opp, buyIn, pot: buyIn * 2, setsToWin: cfg.sets,
      active: 'player', phase: 'setup', sideUsedThisTurn: false,
      lastDealt: null, log: [], playerDeck: [],
      player: { name: PLAYER.name, score: 0, cards: [], stood: false, bust: false, sets: 0, hand: [] },
      opp: { name: opp.name, personality: opp.personality, score: 0, cards: [], stood: false, bust: false, sets: 0, hand: [], deck: randomDeck() }
    };
    logMsg('table', `${PLAYER.name} sits across from ${opp.name}. ${buyIn ? `${buyIn}cr each escrowed — pot ${S.pot}cr.` : 'Republic Senate rules — no credits change hands.'}`, 'force');
    speak('invite');
    render();
  }

  /* ---------- logging + dialogue ---------- */
  function logMsg(who, msg, tone = '') { S.log.unshift({ who, msg, tone }); if (S.log.length > 30) S.log.pop(); }
  let bubbleText = '';
  function speak(key) {
    const t = line(S.opp.personality || S.cfg.opponent.personality, key);
    if (t) { bubbleText = t; logMsg(S.opp.name, '“' + t + '”', 'force'); }
  }

  /* ---------- deck builder ---------- */
  function addCard(id) { if (S.playerDeck.length >= PAZAAK_DECK_SIZE) return; S.playerDeck.push(catalogById(id)); render(); }
  function removeCard(i) { S.playerDeck.splice(i, 1); render(); }
  function autoFill() { while (S.playerDeck.length < PAZAAK_DECK_SIZE) S.playerDeck.push(PAZAAK_SIDE_CATALOG[Math.floor(Math.random() * PAZAAK_SIDE_CATALOG.length)]); render(); }
  function clearDeck() { S.playerDeck = []; render(); }
  function lockDeck() {
    if (S.playerDeck.length !== PAZAAK_DECK_SIZE) return;
    S.player.hand = drawHand(S.playerDeck);
    S.opp.hand = drawHand(S.opp.deck);
    S.phase = 'playing';
    logMsg('table', `Side decks locked. ${PAZAAK_HAND_SIZE} cards drawn into each hand. First to ${S.setsToWin} sets.`, 'force');
    render();
    setTimeout(playerTurnStart, 650);
  }

  /* ---------- turn flow ---------- */
  function dealMain(side) {
    const p = S[side];
    const v = drawMain();
    p.cards.push({ value: v, source: 'main' });
    p.score += v;
    if (p.score > 20) p.bust = true;
    S.lastDealt = { side, index: p.cards.length - 1 };
  }
  function playerTurnStart() {
    if (S.phase !== 'playing') return;
    S.active = 'player'; S.sideUsedThisTurn = false;
    if (S.player.stood) { endTurn(); return; }
    dealMain('player');
    logMsg(PLAYER.name, `draws ${S.player.cards.at(-1).value} → ${S.player.score}.`);
    render();
  }

  function deltaFor(card, choice) {
    if (card.type === 'plus') return Math.abs(card.value);
    if (card.type === 'minus') return -Math.abs(card.value);
    if (!choice) return null;
    const sign = choice.sign === 'plus' ? 1 : -1;
    if (card.type === 'flip') return sign * card.mag;
    if (card.type === 'range') return sign * (choice.value || 1);
    if (card.type === 'tiebreaker') return sign * 1;
    return null;
  }

  function playSide(uid, choice) {
    if (S.active !== 'player' || S.sideUsedThisTurn || S.player.stood) return;
    const card = S.player.hand.find(c => c.uid === uid);
    if (!card || card.used) return;
    const delta = deltaFor(card, choice);
    if (delta === null) return; // flip card needs a sign choice
    card.used = true; S.sideUsedThisTurn = true;
    S.player.score += delta; S.player.bust = S.player.score > 20;
    const signed = (delta >= 0 ? '+' : '') + delta;
    S.player.cards.push({ value: delta, source: 'side', short: signed, tone: card.tone });
    S.lastDealt = { side: 'player', index: S.player.cards.length - 1 };
    logMsg(PLAYER.name, `plays ${card.label} as ${signed} → ${S.player.score}.`, 'success');
    render();
  }

  function stand() {
    if (S.active !== 'player') return;
    S.player.stood = true;
    logMsg(PLAYER.name, `stands on ${S.player.score}.`, S.player.score === 20 ? 'success' : '');
    render(); setTimeout(nextTurn, 500);
  }
  function endTurn() {
    if (S.active !== 'player') return;
    if (S.player.bust) logMsg(PLAYER.name, `busts at ${S.player.score}.`, 'danger');
    render(); setTimeout(nextTurn, 400);
  }
  function nextTurn() {
    if (bothDone()) { resolveSet(); return; }
    if (S.active === 'player') { S.active = 'opp'; setTimeout(oppTurn, 700); }
    else playerTurnStart();
  }
  function bothDone() { const a = S.player, b = S.opp; return (a.stood || a.bust) && (b.stood || b.bust); }

  function oppTurn() {
    if (S.phase !== 'playing') return;
    const o = S.opp;
    if (o.stood || o.bust) { S.active = 'player'; return setTimeout(nextTurn, 200); }
    render({ thinking: true }); speak('thinking'); render({ thinking: true });
    setTimeout(() => {
      dealMain('opp');
      logMsg(o.name, `draws ${o.cards.at(-1).value} → ${o.score}.`); speak('drawsCard');
      if (o.bust) {
        const fix = o.hand.find(c => !c.used && (c.type === 'minus' || c.type === 'flip' || c.type === 'range' || c.type === 'tiebreaker'));
        if (fix) applyOppSide(fix);
      } else if (o.score < 18) {
        const want = 20 - o.score;
        const plus = o.hand.find(c => !c.used && c.type === 'plus' && Math.abs(c.value) <= want);
        if (plus && Math.random() < 0.6) applyOppSide(plus);
      }
      render();
      const standAt = o.personality === 'cautious' ? 17 : (o.personality === 'aggressive' || o.personality === 'reckless') ? 19 : 18;
      setTimeout(() => {
        if (o.bust) { logMsg(o.name, `busts at ${o.score}.`, 'danger'); speak('busts'); }
        else if (o.score >= standAt || o.score === 20) { o.stood = true; logMsg(o.name, `stands on ${o.score}.`); speak(o.score === 20 ? 'hits20' : 'stand'); }
        render(); S.active = 'player'; setTimeout(nextTurn, 600);
      }, 650);
    }, 850);
  }
  function applyOppSide(card) {
    let delta;
    if (card.type === 'plus') delta = Math.abs(card.value);
    else if (card.type === 'minus') delta = -Math.abs(card.value);
    else {
      const opts = card.type === 'range' ? [1,2,-1,-2] : card.type === 'tiebreaker' ? [1,-1] : [card.mag, -card.mag];
      let best = opts[0], bd = 99;
      opts.forEach(x => { const t = S.opp.score + x; const d = Math.abs(20 - t); if (t <= 20 && d < bd) { bd = d; best = x; } });
      delta = best;
    }
    card.used = true; S.opp.score += delta; S.opp.bust = S.opp.score > 20;
    const signed = (delta >= 0 ? '+' : '') + delta;
    S.opp.cards.push({ value: delta, source: 'side', short: signed, tone: card.tone });
    S.lastDealt = { side: 'opp', index: S.opp.cards.length - 1 };
    logMsg(S.opp.name, `plays ${card.label} as ${signed} → ${S.opp.score}.`, 'success'); speak('playsCard');
  }

  /* ---------- set / match resolution ---------- */
  function resolveSet() {
    const a = S.player, b = S.opp;
    const av = a.bust ? -1 : a.score, bv = b.bust ? -1 : b.score;
    let winner = null;
    if (av > bv) winner = 'player'; else if (bv > av) winner = 'opp';
    if (winner) S[winner].sets++;
    logMsg('table', winner ? `${S[winner].name} takes the set (${a.score} vs ${b.score}).` : `Set tied at ${a.score}. No point.`, winner === 'player' ? 'success' : winner === 'opp' ? 'danger' : '');
    speak(winner === 'opp' ? 'winRound' : winner === 'player' ? 'loseRound' : '');
    if (a.sets >= S.setsToWin || b.sets >= S.setsToWin) { S.phase = 'matchOver'; settle(); }
    else S.phase = 'setResolved';
    render();
  }
  function settle() {
    const won = S.player.sets >= S.setsToWin;
    if (S.buyIn) {
      if (won) { Bank.add(S.pot); logMsg('table', `Pot of ${S.pot}cr paid to ${PLAYER.name} via TransactionEngine.`, 'success'); }
      else logMsg('table', `Pot of ${S.pot}cr paid to ${S.opp.name}. Escrow released.`, 'danger');
    }
  }
  function nextSet() {
    ['player', 'opp'].forEach(s => { S[s].score = 0; S[s].cards = []; S[s].stood = false; S[s].bust = false; });
    S.phase = 'playing'; S.active = 'player'; S.lastDealt = null;
    render(); setTimeout(playerTurnStart, 500);
  }

  /* ---------- render: SETUP (deck builder) ---------- */
  function renderSetup() {
    const o = S.cfg.opponent;
    const n = S.playerDeck.length;
    const counts = {};
    S.playerDeck.forEach(c => counts[c.id] = (counts[c.id] || 0) + 1);
    const catalog = PAZAAK_SIDE_CATALOG.map(c => `
      <div class="build-card pz-tmpl tone-${c.tone}" data-add="${c.id}" title="${c.desc}">
        <img src="${PZ_CARD_FRONT}" alt=""><span class="wash"></span>
        <span class="add">＋</span>
        ${counts[c.id] ? `<span class="owned">×${counts[c.id]}</span>` : ''}
        <span class="num">${c.short}</span>
        <span class="lbl">${c.label}</span>
      </div>`).join('');
    const tray = Array.from({ length: PAZAAK_DECK_SIZE }, (_, i) => {
      const c = S.playerDeck[i];
      return c
        ? `<div class="deck-slot filled pz-tmpl tone-${c.tone}" data-remove="${i}"><span class="deck-slot__idx">${String(i+1).padStart(2,'0')}</span><img src="${PZ_CARD_FRONT}" alt=""><span class="wash"></span><span class="num">${c.short}</span></div>`
        : `<div class="deck-slot"><span class="deck-slot__idx">${String(i+1).padStart(2,'0')}</span></div>`;
    }).join('');

    view.innerHTML = `
      <div class="table-mode felt">
        ${topbar('setup')}
        <div class="pz-setup">
          <div class="pz-setup__side">
            <div class="opp-card">
              <img class="opp-card__img" src="${o.img}" alt=""><div class="opp-card__grad"></div>
              <div class="opp-card__info"><div class="n">${o.name}</div><div class="r">${o.difficulty} AI · <span style="color:var(--vapor-pink)">${o.personality}</span></div></div>
            </div>
            <div class="opp-card__quality">“${o.quality}”</div>
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--ink-faint);line-height:1.6;border-top:1px dashed var(--line-soft);padding-top:10px">
              <b style="color:var(--vapor-cyan)">How it works.</b> Build a 10-card side deck. ${PAZAAK_HAND_SIZE} cards are drawn at random as your hand for the match. Tint = effect: <span style="color:var(--pos)">green +</span>, <span style="color:var(--neg)">red −</span>, <span style="color:oklch(0.7 0.2 300)">purple ±</span>.
            </div>
          </div>

          <div class="pz-setup__main">
            <div class="build-head">
              <div>
                <span class="kicker">Side Deck Builder</span>
                <h3>Build your side deck</h3>
                <p>Tap cards below to add up to ${PAZAAK_DECK_SIZE}. Duplicates allowed. ${PAZAAK_HAND_SIZE} are dealt into your usable hand when the match begins.</p>
              </div>
              <div class="build-counter"><div class="n ${n === PAZAAK_DECK_SIZE ? 'full' : ''}">${n}<span style="font-size:18px;opacity:.5">/${PAZAAK_DECK_SIZE}</span></div><div class="k">cards selected</div></div>
            </div>

            <div class="build-catalog">${catalog}</div>

            <div class="deck-tray-wrap">
              <div class="deck-tray-head"><span class="kicker">Your Side Deck — click a card to remove</span><span class="muted" style="font-family:var(--font-mono);font-size:9px">${n}/${PAZAAK_DECK_SIZE}</span></div>
              <div class="deck-tray">${tray}</div>
            </div>

            <div class="build-actions">
              <span class="note">Opponent’s deck is built automatically.${S.buyIn ? ` Pot ${S.pot}cr is escrowed.` : ''}</span>
              <button class="btn ghost sm" id="pz-clear">Clear</button>
              <button class="btn ghost sm" id="pz-auto">Auto-Fill</button>
              <button class="btn pink" id="pz-lock" ${n === PAZAAK_DECK_SIZE ? '' : 'disabled'}>▸ Lock Deck &amp; Deal</button>
            </div>
          </div>
        </div>
      </div>`;
    wireSetup();
  }

  /* ---------- render: BOARD (play) ---------- */
  function slotRow(side) {
    const p = S[side];
    let html = '';
    for (let i = 0; i < 9; i++) {
      const c = p.cards[i];
      const idx = `<div class="pz-slot__idx">${String(i+1).padStart(2,'0')}</div>`;
      if (c) {
        const deal = S.lastDealt && S.lastDealt.side === side && S.lastDealt.index === i ? 'deal-in' : '';
        if (c.source === 'side') {
          html += `<div class="pz-slot">${idx}<div class="card pz-tmpl tone-${c.tone} ${deal}"><img src="${PZ_CARD_FRONT}" alt=""><span class="wash"></span><span class="num">${c.short}</span><span class="tag">side</span></div></div>`;
        } else {
          html += `<div class="pz-slot">${idx}<div class="card main ${deal}"><span class="num">${c.value}</span><span class="tag">main</span></div></div>`;
        }
      } else html += `<div class="pz-slot">${idx}</div>`;
    }
    return html;
  }

  function seatHeader(side) {
    const p = S[side], isOpp = side === 'opp', o = S.cfg.opponent;
    const cur = S.active === side && S.phase === 'playing';
    const scoreCls = p.bust ? 'is-bust' : p.score === 20 ? 'win' : p.stood ? 'is-stand' : '';
    const pips = Array.from({ length: S.setsToWin }, (_, i) => `<i class="${i < p.sets ? 'on' : ''}"></i>`).join('');
    const status = p.bust ? 'BUST' : p.stood ? 'STAND' : cur ? 'YOUR TURN' : 'WAIT';
    const ava = isOpp
      ? `<div class="pz-seat__ava"><img src="${o.img}" alt=""></div>`
      : `<div class="pz-seat__ava" style="display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:30px;color:var(--vapor-cyan)">${PLAYER.portraitGlyph}</div>`;
    const sub = isOpp
      ? `<span class="persona-tag ${o.force ? 'force' : ''}">${o.personality}</span><span>${o.difficulty} AI</span><span>${o.profession}</span>`
      : `<span>${PLAYER.role}</span>`;
    return `
      <div class="pz-seat ${cur ? 'is-current' : ''}">
        ${ava}
        <div>
          <div class="pz-seat__id">${p.name}</div>
          <div class="pz-seat__sub">${sub}</div>
          <div class="pz-seat__sub" style="margin-top:6px"><span class="pz-sets">${pips}</span><span>${p.sets}/${S.setsToWin} sets · ${isOpp ? 'opponent' : 'you'}</span></div>
        </div>
        <div class="pz-score ${scoreCls}"><div class="n">${p.score}</div><div class="s">${status}</div></div>
      </div>`;
  }

  function handHtml() {
    const canAct = S.active === 'player' && S.phase === 'playing' && !S.player.stood && !S.player.bust;
    return S.player.hand.map(c => {
      const playable = canAct && !c.used && !S.sideUsedThisTurn;
      const isFlip = c.type === 'flip' || c.type === 'range' || c.type === 'tiebreaker';
      let controls = '';
      if (playable && isFlip) {
        if (c.type === 'range') {
          controls = `<div class="flip-btns">
            <button class="flip-btn plus" data-play="${c.uid}" data-sign="plus" data-val="1">+1</button>
            <button class="flip-btn plus" data-play="${c.uid}" data-sign="plus" data-val="2">+2</button>
            <button class="flip-btn minus" data-play="${c.uid}" data-sign="minus" data-val="1">−1</button>
            <button class="flip-btn minus" data-play="${c.uid}" data-sign="minus" data-val="2">−2</button></div>`;
        } else {
          const mag = c.type === 'tiebreaker' ? 1 : c.mag;
          controls = `<div class="flip-btns">
            <button class="flip-btn plus" data-play="${c.uid}" data-sign="plus">＋${mag}</button>
            <button class="flip-btn minus" data-play="${c.uid}" data-sign="minus">－${mag}</button></div>`;
        }
      } else if (playable) {
        controls = `<span class="flip-hint">drag or click ▸</span>`;
      }
      const draggable = playable && !isFlip;
      return `<div class="hand-card pz-tmpl tone-${c.tone} ${c.used ? 'used' : ''} ${draggable ? 'playable' : ''}" data-uid="${c.uid}" ${draggable ? 'draggable="true"' : ''}>
        <img src="${PZ_CARD_FRONT}" alt=""><span class="wash"></span>
        <span class="num">${c.short}</span>
        <span class="lbl">${c.label}</span>
        ${controls}
      </div>`;
    }).join('');
  }

  function topbar(mode) {
    const o = S.cfg.opponent;
    const statusLabel = mode === 'setup' ? 'Building Decks' : S.phase === 'playing' ? 'In Play' : S.phase === 'setResolved' ? 'Set Break' : 'Match Complete';
    return `
      <div class="tm-bar">
        <div class="tm-bar__title">
          <span class="kicker">Pazaak Table</span>
          <h3>${o.name.split(' ')[0]}’s High Table</h3>
          <div><span class="tm-bar__status">${statusLabel}</span>
          <div class="tm-bar__rules">${S.buyIn ? 'Wagered credits' : 'Republic Senate rules'} · target 20 · first to ${S.setsToWin} sets</div></div>
        </div>
        <div class="tm-bar__right">
          ${S.buyIn ? `<span class="pot-strip"><span class="p"><span class="k">Pot</span><span class="v">${S.pot}</span></span><span class="p"><span class="k">Buy-In</span><span class="v cyan">${S.buyIn}</span></span></span>` : ''}
          <button class="btn ghost sm" id="pz-forfeit">Forfeit</button>
          <button class="btn danger sm" id="pz-close">Close Table</button>
        </div>
      </div>`;
  }

  function render(opts = {}) {
    if (S.phase === 'setup') { renderSetup(); return; }
    const o = S.cfg.opponent;
    const canAct = S.active === 'player' && S.phase === 'playing' && !S.player.stood && !S.player.bust;
    const showBubble = bubbleText && (opts.thinking || S.active !== 'player' || S.phase !== 'playing');
    let actions = '';
    if (S.phase === 'matchOver') {
      const won = S.player.sets >= S.setsToWin;
      actions = `<span class="pz-turn-flag" style="color:${won ? 'var(--pos)' : 'var(--neg)'}">${won ? '▲ YOU WIN THE MATCH' : '▼ MATCH LOST'}${S.buyIn ? ` · ${won ? '+' : '−'}${S.buyIn} cr` : ''}</span>
        <button class="btn" id="pz-rematch">Rematch</button>`;
    } else if (S.phase === 'setResolved') {
      actions = `<span class="pz-turn-flag">Set ${S.player.sets + S.opp.sets} resolved</span><button class="btn pink" id="pz-next">Next Set ▸</button>`;
    } else if (canAct) {
      actions = `<span class="pz-turn-flag">▸ Your move</span><button class="btn pink" id="pz-stand">Stand</button><button class="btn ghost" id="pz-end">End Turn</button>`;
    } else if (opts.thinking || S.active === 'opp') {
      actions = `<span class="thinking">${o.name.split(' ')[0]} is thinking <i></i><i></i><i></i></span>`;
    } else actions = `<span class="pz-turn-flag muted">Waiting…</span>`;

    view.innerHTML = `
      <div class="table-mode felt">
        ${topbar('play')}
        <div class="pz">
          <div class="pz-rail pz-rail--left">
            <div class="opp-card">
              <img class="opp-card__img" src="${o.img}" alt=""><div class="opp-card__grad"></div>
              <div class="opp-card__info"><div class="n">${o.name}</div><div class="r">${o.difficulty} AI · <span style="color:var(--vapor-pink)">${o.personality}</span>${o.force ? ' · Force-sensitive' : ''}</div></div>
            </div>
            <div class="opp-card__quality">“${o.quality}”</div>
            <div style="font-family:var(--font-mono);font-size:9px;color:var(--ink-faint);line-height:1.5;border-top:1px dashed var(--line-soft);padding-top:9px">${o.tableFact}</div>
          </div>

          <div class="pz-board">
            ${seatHeader('opp')}
            <div class="pz-slots">${slotRow('opp')}</div>
            <div class="pz-mid"><span class="set">Set ${S.player.sets + S.opp.sets + (S.phase === 'playing' ? 1 : 0)}</span><span class="vs">VS</span><span class="target">◎ TARGET 20</span></div>
            <div class="pz-slots ${canAct ? 'is-droptarget' : ''}" id="pz-player-slots"><div class="drop-tip">▾ drop side card to play</div>${slotRow('player')}</div>
            ${seatHeader('player')}
          </div>

          <div class="pz-rail pz-rail--right">
            <div class="rail-card" style="position:relative">
              <div class="head"><span class="kicker">Match</span><span class="hint">${S.player.sets}–${S.opp.sets}</span></div>
              <div class="deck-pile"><div class="deck-back"></div><div class="deck-back" style="margin-left:-30px"></div><div class="deck-back" style="margin-left:-30px"></div>
                <div style="margin-left:8px;font-family:var(--font-mono);font-size:9px;color:var(--ink-dim);line-height:1.5">Main deck<br><b style="color:var(--vapor-cyan)">1–10</b> shuffled</div></div>
              ${showBubble ? `<div class="bubble" style="margin-top:12px"><span class="who">${o.name.split(' ')[0]}</span>${bubbleText}</div>` : ''}
            </div>
            <div class="rail-card" style="flex:1;display:flex;flex-direction:column;min-height:0">
              <div class="head"><span class="kicker">Table Log</span><span class="hint">live</span></div>
              <div class="log">${S.log.map(e => `<div class="log-row tone-${e.tone}"><b>${e.who === 'table' ? '◇' : e.who.split(' ')[0]}</b><span>${e.msg}</span></div>`).join('')}</div>
            </div>
          </div>
        </div>

        <div style="border-top:1px solid var(--line);padding:12px 24px 16px;background:linear-gradient(180deg,transparent,oklch(0.07 0.02 285 / 0.85) 40%)">
          <div class="pz-hand-head">
            <span class="kicker">Your Side Hand · ${S.player.hand.filter(c => !c.used).length} left · one per turn · green + / red − / purple ±</span>
            <div class="pz-actions" style="padding-top:0">${actions}</div>
          </div>
          <div class="pz-hand">${handHtml()}</div>
        </div>
      </div>`;
    wireBoard();
  }

  /* ---------- wiring ---------- */
  function wireSetup() {
    const q = id => view.querySelector(id);
    q('#pz-close')?.addEventListener('click', () => Router.home());
    q('#pz-forfeit')?.addEventListener('click', () => { if (S.buyIn) Bank.add(0); Router.home(); });
    q('#pz-lock')?.addEventListener('click', lockDeck);
    q('#pz-auto')?.addEventListener('click', autoFill);
    q('#pz-clear')?.addEventListener('click', clearDeck);
    view.querySelectorAll('[data-add]').forEach(el => el.addEventListener('click', () => addCard(el.dataset.add)));
    view.querySelectorAll('[data-remove]').forEach(el => el.addEventListener('click', () => removeCard(Number(el.dataset.remove))));
  }

  function wireBoard() {
    const q = id => view.querySelector(id);
    q('#pz-close')?.addEventListener('click', () => Router.home());
    q('#pz-forfeit')?.addEventListener('click', () => { logMsg(PLAYER.name, 'forfeits the table.', 'danger'); Router.home(); });
    q('#pz-stand')?.addEventListener('click', stand);
    q('#pz-end')?.addEventListener('click', endTurn);
    q('#pz-next')?.addEventListener('click', nextSet);
    q('#pz-rematch')?.addEventListener('click', () => start({ ...S.cfg, opponent: S.cfg.opponent }));
    // flip chooser buttons
    view.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      playSide(b.dataset.play, { sign: b.dataset.sign, value: Number(b.dataset.val || 1) });
    }));
    // click-to-play (plus/minus)
    view.querySelectorAll('.hand-card.playable').forEach(el => el.addEventListener('click', () => playSide(el.dataset.uid)));
    // drag-and-drop
    view.querySelectorAll('.hand-card[draggable="true"]').forEach(el => {
      el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', el.dataset.uid); e.dataTransfer.effectAllowed = 'move'; el.classList.add('dragging'); });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
    });
    const drop = q('#pz-player-slots');
    if (drop && drop.classList.contains('is-droptarget')) {
      drop.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; drop.classList.add('drop-ready'); });
      drop.addEventListener('dragleave', e => { if (!drop.contains(e.relatedTarget)) drop.classList.remove('drop-ready'); });
      drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('drop-ready'); const uid = e.dataTransfer.getData('text/plain'); if (uid) playSide(uid); });
    }
  }

  return { start };
})();

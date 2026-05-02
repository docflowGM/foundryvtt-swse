/* ============================================================
 * Rendarr's Exchange — main app logic
 * ============================================================ */
(function(){
  const ITEMS = window.STORE_ITEMS;
  const RECS  = window.STORE_RECS;
  const INV   = window.STORE_INVENTORY;
  const RUMORS = window.STORE_RUMORS;
  const GREETINGS = window.STORE_GREETINGS;
  const RENDARR_PURCHASE = window.STORE_RENDARR_PURCHASE;

  const state = {
    cart: {},        // id -> qty
    filter: { search: '', cat: 'all', rar: 'all', priceMax: 50000 },
    expanded: null,  // expanded card id
    wallet: 2400,
    haggle: { discount: 0, status: 'none', lastRoll: null }, // status: none|pending|denied
    sellOffer: {},   // inv-id -> qty
    sellState: 'none', // none | pending | accepted | denied
    orders: [
      { date: '2206.04', dir: 'IN',  items: 'Field Medpac ×2', delta: -180, status: 'CLEARED' },
      { date: '2206.07', dir: 'IN',  items: 'Encrypted Comlink', delta: -120, status: 'CLEARED' },
      { date: '2206.11', dir: 'OUT', items: 'Salvage scrap (lot)', delta: +340, status: 'CLEARED' },
      { date: '2206.18', dir: 'IN',  items: 'Battle Stim', delta: -240, status: 'CLEARED' }
    ],
    wartimeMarkup: 0.08, // applied to weapons by default — toggleable via tweaks
    stockMultiplier: 1
  };

  /* ---------- helpers ---------- */
  const $  = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const fmt = n => Math.round(n).toLocaleString();
  const byId = id => ITEMS.find(i => i.id === id);
  const invById = id => INV.find(i => i.id === id);

  const RAR_VAR = {
    common: 'var(--rar-common)',
    uncommon: 'var(--rar-uncommon)',
    rare: 'var(--rar-rare)',
    restricted: 'var(--rar-restrict)',
    illegal: 'var(--rar-illegal)'
  };

  function priceOf(item) {
    let p = item.price;
    if (state.wartimeMarkup > 0 && item.category === 'weapons') p *= (1 + state.wartimeMarkup);
    return Math.round(p);
  }
  function basePriceOf(item) { return item.price; }

  function avgStars(item) {
    if (!item.reviews || !item.reviews.length) return 0;
    return item.reviews.reduce((a, r) => a + r.stars, 0) / item.reviews.length;
  }

  function starGlyphs(n, max=5) {
    const filled = Math.round(n);
    let html = '';
    for (let i=1;i<=max;i++) html += i <= filled ? '★' : '<span class="empty">☆</span>';
    return html;
  }

  /* ============================================================
   * Tab switching
   * ============================================================ */
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      $$('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
      $$('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.tab === tab));
      if (tab === 'cart') renderCartFull();
      if (tab === 'sell') renderSell();
      if (tab === 'orders') renderOrders();
    });
  });

  /* ============================================================
   * Filters
   * ============================================================ */
  $('#search').addEventListener('input', e => { state.filter.search = e.target.value.toLowerCase(); renderCards(); });
  $$('#cat-group .chip').forEach(c => c.addEventListener('click', () => {
    $$('#cat-group .chip').forEach(x => x.classList.toggle('active', x === c));
    state.filter.cat = c.dataset.cat; renderCards();
  }));
  $$('#rar-group .chip').forEach(c => c.addEventListener('click', () => {
    $$('#rar-group .chip').forEach(x => x.classList.toggle('active', x === c));
    state.filter.rar = c.dataset.rar; renderCards();
  }));
  $('#price-max').addEventListener('input', e => {
    const v = +e.target.value;
    state.filter.priceMax = v >= 50000 ? Infinity : v;
    $('#price-max-val').textContent = v >= 50000 ? '∞' : fmt(v) + ' cr';
    renderCards();
  });

  /* ============================================================
   * Browse — cards + expand
   * ============================================================ */
  function visibleItems() {
    const f = state.filter;
    return ITEMS.filter(i =>
      (f.cat === 'all' || i.category === f.cat) &&
      (f.rar === 'all' || i.rarity === f.rar) &&
      priceOf(i) <= f.priceMax &&
      (!f.search || (i.name + ' ' + i.slot + ' ' + (i.tags||[]).join(' ')).toLowerCase().includes(f.search))
    );
  }

  function renderCards() {
    const grid = $('#cards-grid');
    grid.innerHTML = '';
    const list = visibleItems();
    if (!list.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;font-family:var(--font-mono);color:var(--ink-faint);font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">▸ No matches on the floor.<br><span style="color:var(--vapor-pink);font-style:italic;text-transform:none;letter-spacing:0.04em;">"Try shopping somewhere else." — Rendarr</span></div>`;
      return;
    }
    list.forEach(item => {
      const expanded = state.expanded === item.id;
      const price = priceOf(item);
      const unaffordable = price > state.wallet;
      const inCart = !!state.cart[item.id];
      const stars = avgStars(item);
      const card = document.createElement('div');
      card.className = 'card' + (expanded ? ' expanded' : '') + (unaffordable && !inCart ? ' unaffordable' : '');
      card.style.setProperty('--rar', RAR_VAR[item.rarity]);
      card.dataset.id = item.id;

      card.innerHTML = `
        <span class="card-rar-tag">${item.rarity}</span>
        <span class="card-id">SKU ${item.id.toUpperCase()}</span>
        <div class="glyph-panel"><span class="store-glyph">${item.glyph}</span></div>
        <div class="card-title">${item.name}</div>
        <div class="card-meta">
          <span class="slot">${item.slot}</span>
          ${(item.tags||[]).slice(0,2).map(t => `<span>${t}</span>`).join('')}
        </div>
        <div class="card-stars">
          <span class="stars">${starGlyphs(stars)}</span>
          <span>${stars.toFixed(1)} · ${item.reviews.length} reviews</span>
        </div>
        <div class="card-foot">
          <span class="card-price">${fmt(price)}</span>
          <div class="card-actions">
            <button class="card-btn js-toggle">${expanded ? 'COLLAPSE' : 'DETAILS'}</button>
            <button class="card-btn primary js-add" ${unaffordable && !inCart ? 'disabled' : ''}>${inCart ? '+ ' + state.cart[item.id] : '+ ADD'}</button>
          </div>
        </div>
      `;

      if (expanded) {
        const expand = document.createElement('div');
        expand.className = 'expand-body';
        expand.innerHTML = `
          <div class="expand-section">
            <h4>◇ Item brief</h4>
            <div class="desc-block">${item.desc}</div>
            <div class="stat-grid">
              ${Object.entries(item.stats).map(([k,v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}
            </div>
          </div>
          <div class="expand-section">
            <h4>◇ Field reviews · ${item.reviews.length}</h4>
            <div class="review-thread">
              ${item.reviews.map(r => `
                <div class="review">
                  <div class="review-head">
                    <div class="review-author">
                      ${r.author}
                      ${r.verified ? '<span class="verified" title="Verified buyer">✓</span>' : ''}
                      <span class="species">${r.species}</span>
                    </div>
                    <div class="review-stars">${starGlyphs(r.stars)}</div>
                  </div>
                  <div class="review-body">${r.text}</div>
                  ${r.reply ? `<div class="review-reply"><div class="reply-author">⚐ Rendarr replied</div>${r.reply}</div>` : ''}
                  <div class="review-foot">
                    <span class="helpful">▴ ${r.helpful} helpful</span>
                    <span>flag · reply</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
        card.appendChild(expand);

        // recommendations
        const recIds = (RECS[item.id] || []).filter(id => byId(id));
        if (recIds.length) {
          const recs = document.createElement('div');
          recs.className = 'recs-row';
          recs.innerHTML = `
            <h4>◇ Customers like you also bought<span class="hint">based on ${item.reviews.length} buyers in the last cycle</span></h4>
            <div class="recs">
              ${recIds.map(id => {
                const r = byId(id); const rs = avgStars(r);
                return `<div class="rec js-rec" data-id="${r.id}" style="--rar2: ${RAR_VAR[r.rarity]};">
                  <div class="glyph-mini">${r.glyph}</div>
                  <div class="rec-text">
                    <div class="rec-name">${r.name}</div>
                    <div class="rec-stars">${starGlyphs(rs)}<span class="ct"> ${rs.toFixed(1)} · ${r.reviews.length}</span></div>
                  </div>
                  <div class="rec-price">${fmt(priceOf(r))}</div>
                </div>`;
              }).join('')}
            </div>
          `;
          card.appendChild(recs);
        }
      }

      grid.appendChild(card);

      // event delegation per card
      card.querySelector('.js-toggle').addEventListener('click', e => {
        e.stopPropagation();
        state.expanded = state.expanded === item.id ? null : item.id;
        renderCards();
      });
      card.querySelector('.js-add').addEventListener('click', e => {
        e.stopPropagation();
        if (unaffordable && !inCart) return;
        addToCart(item.id);
      });
      if (expanded) {
        card.querySelectorAll('.js-rec').forEach(el => {
          el.addEventListener('click', () => {
            state.expanded = el.dataset.id;
            renderCards();
            // scroll the card into the visible viewport gently
            setTimeout(() => {
              const target = document.querySelector(`.card[data-id="${el.dataset.id}"]`);
              if (target) target.scrollIntoView ? target.scrollIntoView({ behavior:'smooth', block:'center' }) : null;
            }, 50);
          });
        });
      }
    });
  }

  /* ============================================================
   * Cart
   * ============================================================ */
  function addToCart(id) {
    state.cart[id] = (state.cart[id] || 0) + 1;
    toast(`+ ${byId(id).name} added · ${fmt(priceOf(byId(id)))} cr`);
    renderCards();
    renderCartMini();
    refreshCartCount();
  }
  function setQty(id, q) {
    if (q <= 0) delete state.cart[id]; else state.cart[id] = q;
    renderCards(); renderCartMini(); renderCartFull(); refreshCartCount();
  }
  function clearCart() { state.cart = {}; renderCards(); renderCartMini(); renderCartFull(); refreshCartCount(); }

  function cartLines() {
    return Object.entries(state.cart).map(([id, qty]) => ({ item: byId(id), qty }));
  }
  function cartSubtotal() {
    return cartLines().reduce((a, l) => a + priceOf(l.item) * l.qty, 0);
  }
  function cartMarkup() {
    // already baked into priceOf for weapons; expose the baked-in markup as an info row
    const lines = cartLines();
    const baseSum = lines.reduce((a, l) => a + basePriceOf(l.item) * l.qty, 0);
    return cartSubtotal() - baseSum;
  }
  function cartDiscountAmt() {
    return Math.round(cartSubtotal() * (state.haggle.discount / 100));
  }
  function cartTotal() { return Math.max(0, cartSubtotal() - cartDiscountAmt()); }

  function refreshCartCount() {
    const c = Object.values(state.cart).reduce((a,b)=>a+b,0);
    $('#cart-count').textContent = c;
    $('#cart-count').style.display = c > 0 ? '' : 'none';
  }

  function renderCartMini() {
    const wrap = $('#cart-mini');
    const totals = $('#cart-totals');
    const checkout = $('#mini-checkout');
    const lines = cartLines();
    if (!lines.length) {
      wrap.innerHTML = `<div class="cart-empty">No items selected.<br>Click a card's <span style="color:var(--vapor-pink)">+ ADD</span> to start a haul.</div>`;
      totals.style.display = 'none';
      checkout.disabled = true;
      checkout.textContent = '▸ Open Cart';
      $('#cart-hint').textContent = 'empty';
    } else {
      wrap.innerHTML = lines.map(l => `
        <div class="cart-line" style="--rar:${RAR_VAR[l.item.rarity]}">
          <span class="gly">${l.item.glyph}</span>
          <span class="name" title="${l.item.name}">${l.item.name}</span>
          <span class="qty">
            <button data-id="${l.item.id}" data-d="-1">−</button>
            ${l.qty}
            <button data-id="${l.item.id}" data-d="1">+</button>
          </span>
          <span class="ln-price">${fmt(priceOf(l.item) * l.qty)}</span>
        </div>
      `).join('');
      wrap.querySelectorAll('.qty button').forEach(b => b.addEventListener('click', () => {
        const id = b.dataset.id; setQty(id, (state.cart[id]||0) + (+b.dataset.d));
      }));
      totals.style.display = '';
      $('#mini-subtotal').textContent = fmt(cartSubtotal()) + ' cr';
      const mk = cartMarkup();
      $('#mini-markup-row').style.display = mk > 0 ? '' : 'none';
      $('#mini-markup').textContent = '+' + fmt(mk) + ' cr';
      const dc = cartDiscountAmt();
      $('#mini-discount-row').style.display = dc > 0 ? '' : 'none';
      $('#mini-discount').textContent = '−' + fmt(dc) + ' cr';
      $('#mini-total').textContent = fmt(cartTotal()) + ' cr';
      checkout.disabled = false;
      checkout.textContent = '▸ Open Cart  →';
      $('#cart-hint').textContent = `${lines.reduce((a,l)=>a+l.qty,0)} item${lines.length>1?'s':''}`;
    }
    // wallet preview
    $('#wallet-balance').textContent = fmt(state.wallet);
    $('#wallet-after').textContent = fmt(Math.max(0, state.wallet - cartTotal()));
  }

  $('#mini-checkout').addEventListener('click', () => {
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'cart'));
    $$('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.tab === 'cart'));
    renderCartFull();
  });

  function renderCartFull() {
    const list = $('#cart-list');
    const checkout = $('#checkout-btn');
    const lines = cartLines();
    if (!lines.length) {
      list.innerHTML = `<div class="cart-empty" style="padding: 60px 12px; text-align:center; font-family:var(--font-mono); font-size: 12px; color: var(--ink-faint); font-style: italic;">
        Empty cart. Rendarr says: <span style="color:var(--vapor-pink); font-style:normal;">"Browsing's free, kid. Spending isn't."</span>
      </div>`;
      checkout.disabled = true;
    } else {
      list.innerHTML = lines.map(l => `
        <div class="cart-row" style="--rar:${RAR_VAR[l.item.rarity]}">
          <div class="glyph-mini">${l.item.glyph}</div>
          <div class="cart-row-text">
            <div class="cart-row-name">${l.item.name}</div>
            <div class="cart-row-meta">${l.item.slot} · <span class="rar">${l.item.rarity}</span> · ${fmt(priceOf(l.item))} cr ea.</div>
          </div>
          <div class="cart-row-qty">
            <button data-id="${l.item.id}" data-d="-1">−</button>
            ${l.qty}
            <button data-id="${l.item.id}" data-d="1">+</button>
          </div>
          <div class="cart-row-price">${fmt(priceOf(l.item) * l.qty)} cr</div>
          <button class="cart-row-x" data-id="${l.item.id}">✕</button>
        </div>
      `).join('');
      list.querySelectorAll('.cart-row-qty button').forEach(b => b.addEventListener('click', () => {
        const id = b.dataset.id; setQty(id, (state.cart[id]||0) + (+b.dataset.d));
      }));
      list.querySelectorAll('.cart-row-x').forEach(b => b.addEventListener('click', () => setQty(b.dataset.id, 0)));
      checkout.disabled = false;
    }
    $('#full-count').textContent = lines.reduce((a,l)=>a+l.qty,0);
    $('#full-subtotal').textContent = fmt(cartSubtotal()) + ' cr';
    const mk = cartMarkup();
    $('#full-markup-row').style.display = mk > 0 ? '' : 'none';
    $('#full-markup').textContent = '+' + fmt(mk) + ' cr';
    const dc = cartDiscountAmt();
    $('#full-discount-row').style.display = dc > 0 ? '' : 'none';
    $('#full-discount').textContent = '−' + fmt(dc) + ' cr';
    $('#full-total').textContent = fmt(cartTotal()) + ' cr';
  }

  /* ============================================================
   * Haggle (persuasion roll → GM-set discount)
   * ============================================================ */
  const HAGGLE_DIE = $('#haggle-die');
  const HAGGLE_STATUS = $('#haggle-status');
  const HAGGLE_ROLL_BTN = $('#haggle-roll');
  const SKILL_INPUT = $('#skill-mod');
  const GM_PANEL = $('#gm-adjust');
  const GM_INPUT = $('#gm-discount-input');

  HAGGLE_ROLL_BTN.addEventListener('click', () => {
    HAGGLE_DIE.classList.add('rolling');
    HAGGLE_ROLL_BTN.disabled = true;
    let ticks = 12;
    const tick = () => {
      HAGGLE_DIE.textContent = Math.floor(Math.random()*20+1);
      ticks--;
      if (ticks > 0) setTimeout(tick, 38 + (12-ticks)*8);
      else finish();
    };
    const finish = () => {
      HAGGLE_DIE.classList.remove('rolling');
      HAGGLE_ROLL_BTN.disabled = false;
      const die = Math.floor(Math.random()*20+1);
      const mod = parseInt(SKILL_INPUT.value || 0, 10);
      const total = die + mod;
      HAGGLE_DIE.textContent = die;
      state.haggle.lastRoll = { die, mod, total };
      // Suggested discount table — GM can override
      let suggested = 0; let line = '';
      if (die === 1) { suggested = 0; line = `<span class="em neg">CRIT FAIL · ${total}</span> Rendarr smells desperation. No discount, possibly +5% out of spite.`; }
      else if (die === 20) { suggested = 25; line = `<span class="em pos">CRIT · ${total}</span> Rendarr respects the read. Suggests <span class="em pos">25% off</span>.`; }
      else if (total >= 25) { suggested = 20; line = `<span class="em pos">RESULT ${total}</span> Strong negotiation. Suggests <span class="em pos">15–20% off</span>.`; }
      else if (total >= 18) { suggested = 10; line = `<span class="em">RESULT ${total}</span> Reasonable read. Suggests <span class="em">8–12% off</span>.`; }
      else if (total >= 12) { suggested = 5;  line = `<span class="em">RESULT ${total}</span> A scowl, then: <span class="em">~5% off</span>.`; }
      else { suggested = 0; line = `<span class="em neg">RESULT ${total}</span> Rendarr doesn't move. Walks back behind the counter.`; }
      HAGGLE_STATUS.innerHTML = line + `<br><span style="color:var(--ink-faint); font-size:9px; letter-spacing:0.18em;">▸ GM applies the final discount in the panel below.</span>`;
      GM_PANEL.style.display = '';
      GM_INPUT.value = suggested;
      state.haggle.discount = suggested;
      renderCartMini(); renderCartFull();
    };
    tick();
  });

  GM_INPUT.addEventListener('input', () => {
    let v = parseInt(GM_INPUT.value || 0, 10);
    if (isNaN(v)) v = 0;
    v = Math.max(0, Math.min(50, v));
    state.haggle.discount = v;
    renderCartMini(); renderCartFull();
  });

  /* ============================================================
   * Confirm purchase modal
   * ============================================================ */
  $('#checkout-btn').addEventListener('click', () => openConfirm());
  function openConfirm() {
    const lines = cartLines();
    if (!lines.length) return;
    const total = cartTotal();
    const items = lines.reduce((a,l)=>a+l.qty,0);
    let line;
    if (total > 8000) line = RENDARR_PURCHASE.big;
    else if (total > 1500) line = RENDARR_PURCHASE.medium;
    else if (total > 400) line = RENDARR_PURCHASE.small;
    else line = RENDARR_PURCHASE.cheap;
    if (total > state.wallet) line = `You're <span class="em">${fmt(total - state.wallet)} cr short</span>. Sell something or come back richer. House doesn't extend credit.`;
    $('#modal-rendarr-line').innerHTML = line;
    $('#m-items').textContent = items;
    $('#m-subtotal').textContent = fmt(cartSubtotal()) + ' cr';
    const mk = cartMarkup();
    $('#m-markup-row').style.display = mk > 0 ? '' : 'none';
    $('#m-markup').textContent = '+' + fmt(mk) + ' cr';
    const dc = cartDiscountAmt();
    $('#m-discount-row').style.display = dc > 0 ? '' : 'none';
    $('#m-discount').textContent = '−' + fmt(dc) + ' cr';
    $('#m-wallet').textContent = fmt(state.wallet) + ' cr';
    $('#m-total').textContent = fmt(total) + ' cr';
    $('#m-after').textContent = fmt(state.wallet - total) + ' cr';
    $('#modal-confirm').disabled = total > state.wallet;
    $('#modal-confirm').style.opacity = total > state.wallet ? 0.4 : 1;
    $('#confirm-modal').classList.add('open');
  }
  function closeConfirm() { $('#confirm-modal').classList.remove('open'); }
  $('#modal-x').addEventListener('click', closeConfirm);
  $('#modal-cancel').addEventListener('click', closeConfirm);
  $('#confirm-modal').addEventListener('click', e => { if (e.target.id === 'confirm-modal') closeConfirm(); });

  $('#modal-confirm').addEventListener('click', () => {
    const total = cartTotal();
    if (total > state.wallet) return;
    const items = cartLines();
    const summary = items.map(l => `${l.item.name} ×${l.qty}`).join(', ');
    state.wallet -= total;
    state.orders.unshift({
      date: '2206.' + String(20 + Math.floor(Math.random()*7)).padStart(2,'0'),
      dir: 'IN',
      items: summary,
      delta: -total,
      status: 'CLEARED'
    });
    state.cart = {};
    state.haggle.discount = 0;
    GM_PANEL.style.display = 'none';
    HAGGLE_STATUS.innerHTML = 'Rolling lowers Rendarr\'s posted price. <span class="em">GM decides the discount</span> from the result you show them.';
    closeConfirm();
    renderCards(); renderCartMini(); renderCartFull(); refreshCartCount(); refreshWalletUI();
    toast('▸ Purchase cleared · −' + fmt(total) + ' cr');
  });

  /* ============================================================
   * Sell tab
   * ============================================================ */
  function offerPriceFor(invItem) {
    // 50% base, modulated by haggle discount inverse (better roll → Rendarr pays more)
    const factor = 0.5 + (state.haggle.discount / 100) * 0.6;
    return Math.round(invItem.base * Math.min(0.85, factor));
  }
  function offerTotal() {
    return Object.entries(state.sellOffer).reduce((a, [id, q]) => {
      const it = invById(id); if (!it) return a;
      return a + offerPriceFor(it) * q;
    }, 0);
  }

  function renderSell() {
    const list = $('#sell-list');
    list.innerHTML = INV.map(it => {
      const offered = !!state.sellOffer[it.id];
      const offerP = offerPriceFor(it);
      return `
        <div class="sell-row ${offered?'offered':''}" style="--rar:${RAR_VAR[it.rarity]}" data-id="${it.id}">
          <div class="glyph-mini">${it.glyph}</div>
          <div>
            <div class="sell-row-name">${it.name}</div>
            <div class="sell-row-meta">${it.slot} · ${it.rarity} · ${it.cond} · qty ${it.qty}</div>
          </div>
          <div class="sell-row-base">Base <span class="v">${fmt(it.base)}</span></div>
          <div class="sell-row-offer"><span class="strike">${fmt(it.base)}</span>${fmt(offerP)} cr</div>
          <button class="sell-row-btn ${offered?'added':''}" data-id="${it.id}">${offered ? '✓ OFFERED' : '+ OFFER'}</button>
        </div>
      `;
    }).join('');
    list.querySelectorAll('.sell-row-btn').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.id;
        if (state.sellOffer[id]) delete state.sellOffer[id];
        else state.sellOffer[id] = 1;
        state.sellState = 'none';
        renderSell();
      });
    });
    renderOfferSummary();
  }

  function renderOfferSummary() {
    const wrap = $('#offer-lines');
    const total = offerTotal();
    const ids = Object.keys(state.sellOffer);
    if (!ids.length) {
      wrap.innerHTML = `<div style="font-family:var(--font-mono); font-size:11px; color:var(--ink-faint); font-style:italic; padding:14px 0;">
        Select inventory items to offer. Rendarr pays at <span style="color:var(--vapor-cyan); font-style:normal;">50% base</span> by default; haggle for better.
      </div>`;
      $('#offer-submit').disabled = true;
    } else {
      wrap.innerHTML = ids.map(id => {
        const it = invById(id);
        return `<div class="offer-line"><span>${it.name}</span><span class="v">${fmt(offerPriceFor(it))} cr</span></div>`;
      }).join('');
      $('#offer-submit').disabled = false;
    }
    $('#offer-total').textContent = fmt(total) + ' cr';
    // banter
    if (state.sellState === 'none') {
      const banter = ids.length === 0
        ? `<span class="em">Rendarr:</span> Show me what you've got. I might be in a buying mood — or might not.`
        : total > 4000
          ? `<span class="em">Rendarr:</span> That's a lot of inventory. Where'd you get the code cylinder? Don't answer that.`
          : total > 1000
            ? `<span class="em">Rendarr:</span> Decent lot. I'll cycle it through the floor by tomorrow.`
            : `<span class="em">Rendarr:</span> Penny-ante haul. I'll take it off your hands as a favor I won't admit to.`;
      $('#offer-banter').innerHTML = banter;
      $('#offer-state').style.display = 'none';
    }
  }

  $('#offer-clear').addEventListener('click', () => { state.sellOffer = {}; state.sellState = 'none'; renderSell(); });
  $('#offer-submit').addEventListener('click', () => {
    const total = offerTotal();
    state.wallet += total;
    const summary = Object.keys(state.sellOffer).map(id => invById(id).name).join(', ');
    state.orders.unshift({
      date: '2206.' + String(20 + Math.floor(Math.random()*7)).padStart(2,'0'),
      dir: 'OUT', items: summary, delta: +total, status: 'CLEARED'
    });
    // Decrement quantities (or remove)
    Object.keys(state.sellOffer).forEach(id => {
      const it = invById(id); if (!it) return;
      it.qty = Math.max(0, it.qty - state.sellOffer[id]);
    });
    // Filter zero-qty items
    for (let i = INV.length - 1; i >= 0; i--) {
      if (INV[i].qty <= 0) INV.splice(i,1);
    }
    state.sellOffer = {};
    state.sellState = 'accepted';
    $('#offer-state').style.display = '';
    $('#offer-state').className = 'offer-state accepted';
    $('#offer-state').textContent = '▸ DEAL CLOSED · +' + fmt(total) + ' cr';
    $('#offer-banter').innerHTML = `<span class="em">Rendarr:</span> Pleasure. Don't bring me anything that's still warm.`;
    refreshWalletUI();
    renderSell();
    renderOrders();
    toast('▸ Sold · +' + fmt(total) + ' cr');
  });

  /* ============================================================
   * Orders
   * ============================================================ */
  function renderOrders() {
    $('#orders-body').innerHTML = state.orders.map(o => `
      <tr style="border-bottom: 1px dashed color-mix(in oklab, var(--vapor-cyan) 16%, transparent);">
        <td style="padding: 7px 8px; color: var(--ink-dim);">${o.date}</td>
        <td style="padding: 7px 8px; color: ${o.dir==='OUT' ? 'var(--pos)' : 'var(--vapor-cyan)'}; font-family: var(--font-orbit); font-size: 10px; letter-spacing: 0.18em;">${o.dir==='OUT' ? '◄ OUT' : '► IN'}</td>
        <td style="padding: 7px 8px; color: var(--ink); font-family: var(--font-mono); font-size: 10.5px;">${o.items}</td>
        <td style="padding: 7px 8px; text-align: right; color: ${o.delta >= 0 ? 'var(--pos)' : 'var(--vapor-pink)'}; font-family: var(--font-display); font-size: 16px; letter-spacing: 0.04em;">${o.delta >= 0 ? '+' : ''}${fmt(o.delta)} cr</td>
        <td style="padding: 7px 8px; color: var(--ink-faint); letter-spacing: 0.22em; font-size: 9px;">${o.status}</td>
      </tr>
    `).join('');
  }

  /* ============================================================
   * Wallet UI + greeter rotator + ticker + clock
   * ============================================================ */
  function refreshWalletUI() {
    $('#credits-val').textContent = fmt(state.wallet);
    $('#wallet-balance').textContent = fmt(state.wallet);
    $('#wallet-after').textContent = fmt(Math.max(0, state.wallet - cartTotal()));
  }

  function setupGreeter() {
    let i = 0;
    const el = $('#rendarr-quote-text');
    const rotate = () => {
      i = (i + 1) % GREETINGS.length;
      el.style.opacity = 0;
      setTimeout(() => { el.textContent = GREETINGS[i]; el.style.opacity = 1; }, 250);
    };
    el.style.transition = 'opacity 0.32s';
    setInterval(rotate, 9000);
  }

  function setupTicker() {
    const track = $('#ticker');
    const html = RUMORS.map(r => `<span>${r}</span>`).join('');
    track.innerHTML = html + html; // doubled for seamless loop
  }

  function setupClock() {
    const tick = () => {
      const d = new Date();
      const t = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
      $('#clock').textContent = `${t} · STD`;
    };
    tick(); setInterval(tick, 1000);
  }

  /* ============================================================
   * Toast
   * ============================================================ */
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  /* ============================================================
   * Boot
   * ============================================================ */
  setupClock();
  setupTicker();
  setupGreeter();
  refreshCartCount();
  refreshWalletUI();
  renderCards();
  renderCartMini();
  renderOrders();

  // Expose for tweaks
  window.__store = {
    state, byId, fmt, renderCards, renderCartMini, renderCartFull, refreshWalletUI, renderSell
  };
})();

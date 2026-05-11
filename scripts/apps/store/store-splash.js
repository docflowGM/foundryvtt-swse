import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { centerApplication } from "/systems/foundryvtt-swse/scripts/utils/sheet-position.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";
import { StoreSurfaceService } from "/systems/foundryvtt-swse/scripts/ui/shell/StoreSurfaceService.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const STORE_TICKER_COMPANIES = [
  ['Adarian government', 'ADG'], ['AestheTech Incorporated', 'ATI'], ['Arlen-Dempler Luxury Speeders', 'ADLS'], ['Aurodiseal', 'AUR'],
  ['Bakiska\'s', 'BAK'], ['Begamor Heavy Industry Group', 'BHIG'], ['Binary Star Realty', 'BSR'], ['Blackwater Systems', 'BWS'],
  ['Bolzi Design & Transmogrification', 'BDT'], ['Boonta Brand', 'BNT'], ['Bornaryn Trading', 'BTR'], ['Brodogon Consortium', 'BDG'],
  ['Commex', 'CMX'], ['Corazon Industries', 'CZI'], ['Corellian Masternav', 'CMNV'], ['Corellian Vehicle Reclamation', 'CVR'],
  ['Coronet Durasteel', 'CDS'], ['Coronet Ion Works', 'CIW'], ['Corsignis Property Alliance', 'CPA'], ['Cularin SpaceNav', 'CSN'],
  ['Cularin Trade Alliance', 'CTA'], ['Czerka Interstellar', 'CZK'], ['Daa Corporation', 'DAA'], ['Damask Holdings', 'DMK'],
  ['Dex Acquisitions', 'DEX'], ['Dieterschach', 'DTC'], ['Drekker Industries', 'DKI'], ['Drevin', 'DRV'], ['Drunk Droid', 'DRD'],
  ['Dynamet Corporation', 'DYN'], ['Everlasting Love Company', 'ELC'], ['Galactic Enlightenment Real Estate Group', 'GERE'],
  ['Galactic Gladiators', 'GGL'], ['Galactic Sustainability Institute', 'GSI'], ['GalaxSat', 'GXS'], ['General Trade Galactic', 'GTG'],
  ['Gonk-Stores Paradise Trading Inc.', 'GSPT'], ['Gowix Corporation', 'GWX'], ['HavaKing', 'HVK'], ['HealthiDrive', 'HDRV'],
  ['Hyrotii Assembly Services', 'HAS'], ['Jesa Corporation', 'JSA'], ['Jillion Bolts Company', 'JBC'], ['Joltin\'s Workshop', 'JWS'],
  ['Karrel Engineering', 'KRE'], ['Keshk Corporation', 'KSK'], ['Kiharaphor Engineering', 'KHE'], ['Kirr Ltd.', 'KIR'],
  ['Kornova Corp', 'KNV'], ['Kuat Photonics', 'KPH'], ['Land & Sky Corporation', 'LSC'], ['LiMerge Power', 'LMP'],
  ['Lucin Syndicate', 'LUC'], ['MadisCorp', 'MDC'], ['Mandellian Corporation', 'MND'], ['Mehrak Corporation', 'MHK'],
  ['Mikar Music', 'MKR'], ['Mon Calamari Commercial Expeditionary Service', 'MCCES'], ['Monchantics', 'MONC'], ['Moriales Systems', 'MRS'],
  ['Multycorp', 'MLT'], ['Naos III Mercantile', 'N3M'], ['Nav Guild', 'NVG'], ['Nessin Courier and Cargo', 'NCC'],
  ['New Cov Biomolecule Company', 'NCB'], ['North River Freight core engineering department', 'NRF'], ['North River Group', 'NRG'],
  ['Nova Orion Industries', 'NOI'], ['Ocanis Gas', 'OCG'], ['Olin and Lands', 'OAL'], ['Orfa Olfactory Corporation', 'OOC'],
  ['Outer Rim Supply Co.', 'ORSC'], ['Pakkerd Racing', 'PKR'], ['Piccatech Ltd.', 'PCT'], ['Planet Dreams Incorporated', 'PDI'],
  ['Pontilo Foundation', 'PNF'], ['Pricon Metals', 'PCM'], ['Pulsar Supertanker', 'PST'], ['Quagga\'s Garage', 'QGG'],
  ['Qulun', 'QLN'], ['Raxlo Corporation', 'RXL'], ['Reclamation Services Inc.', 'RSI'], ['Repair Rack', 'RRK'],
  ['Rim Excursions Inc.', 'REX'], ['Roskom Mechanized Systems', 'RMS'], ['Rouge Beauty Company', 'RBC'], ['Sacul Industries Group', 'SIG'],
  ['Saiy Engineering Workshop', 'SEW'], ['San Tekka conglomerate', 'STC'], ['Santhe/Sienar Fleet Technologies', 'SSFT'],
  ['Second Mistake Enterprises', 'SME'], ['SecuriCase', 'SEC'], ['Seinar Corporation', 'SNR'], ['Seraphan Industries', 'SPI'],
  ['Shu Industries', 'SHU'], ['Shvash Gas Cooperative', 'SGC'], ['Siechel Transystem', 'SCT'], ['Sienar Technologies', 'SNT'],
  ['Silver Sails Business Group', 'SSBG'], ['Sketto Tankers Fuel Services', 'STFS'], ['Spaaga Core Inc.', 'SPC'], ['Speeder Sales', 'SPD'],
  ['Spotts TradeChip Company', 'STC2'], ['Squib Merchandising Consortium', 'SMC'], ['StarSail Hotels', 'SSH'], ['Sunber Containers', 'SBC'],
  ['SunnGunn', 'SGN'], ['SurvivalEquipment Inc.', 'SEI'], ['Swift Hutt Spacer\'s Service Depot', 'SHSD'], ['Synchet Industries', 'SYN'],
  ['Talon Company', 'TLN'], ['TaunTaun Steak Company', 'TTS'], ['Ti\'mere\'s InfoServices', 'TIS'], ['Titus Steel', 'TTSL'],
  ['Tradium', 'TRD'], ['Traken Industries', 'TRK'], ['TransGalMeg Industries Inc.', 'TGM'], ['Troida Corporation', 'TRC'],
  ['Twin Suns', 'TWS'], ['Ultrastellar Aesthetic Consultancy', 'UAC'], ['Unlimited Horizons Inc.', 'UHI'], ['VaporTech', 'VPT'],
  ['Varcinius Agglomeration', 'VAG'], ['Vekanda Leisure Colonies', 'VLC'], ['Wookiee Trading Co.', 'WTC'], ['Xtib', 'XTB'],
  ['Ypsobay Trading Company', 'YTC'], ['Yylti Corporation', 'YYL'], ['Zerpen Industries', 'ZRP']
];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[ch]));
}

function isOpen(splash) {
  return splash?.dataset?.storeStatus !== 'closed';
}

function motionStyleFor(splash) {
  return splash?.dataset?.storeMotion
    || splash?.closest?.('[data-motion-style]')?.dataset?.motionStyle
    || 'standard';
}

function randomChange() {
  const magnitude = Math.random() < 0.18 ? Math.random() * 1000 : Math.random() * 99.9;
  const sign = Math.random() < 0.56 ? 1 : -1;
  return sign * magnitude;
}

function parseHotDeals(splash) {
  const node = splash?.querySelector?.('[data-store-hot-deals-json]');
  if (!node?.textContent?.trim()) return { groups: [], hydrated: false };
  try {
    const parsed = JSON.parse(node.textContent);
    return { groups: Array.isArray(parsed.groups) ? parsed.groups : [], hydrated: Boolean(parsed.hydrated) };
  } catch (err) {
    console.warn('[RendarrStoreSplash] Failed to parse hot deals JSON:', err);
    return { groups: [], hydrated: false };
  }
}

/* ── Ticker helpers ── */
function buildTickerHTML() {
  const shuffled = [...STORE_TICKER_COMPANIES].sort(() => Math.random() - 0.5).slice(0, 40);
  return shuffled.map(([name, code]) => {
    const change = randomChange();
    const up = change >= 0;
    const pct = Math.abs(change).toFixed(1);
    const price = Math.round(Math.random() * 5000 + 100).toLocaleString();
    return `<span class="ren-tk-item">`
      + `<span class="ren-tk-code">${escapeHtml(code)}</span>`
      + `<span class="${up ? 'ren-tk-up' : 'ren-tk-dn'}">${up ? '▲ +' : '▼ '}${pct}%</span>`
      + `<span class="ren-tk-cr">${price} cr</span>`
      + `</span>`;
  }).join('');
}

function setupTicker(splash, state) {
  const track = splash.querySelector('[data-store-ticker-track]');
  if (!track) return;

  if (!state.tickerHTML) {
    state.tickerHTML = buildTickerHTML();
    // Freeze ticker content when store is closed
    if (!isOpen(splash)) state.tickerFrozen = true;
  }
  track.innerHTML = state.tickerHTML + state.tickerHTML; // doubled for seamless loop
}

/* RAF-driven ticker scroll — cleans up on abort */
function startTickerRAF(splash, state, signal) {
  const track = splash.querySelector('[data-store-ticker-track]');
  if (!track) return;

  const motionOff = motionStyleFor(splash) === 'off'
    || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (motionOff) return;

  const SPEED_PX = 72; // pixels/sec
  let pos = 0;
  let last = null;
  let rafId = null;

  function frame(now) {
    if (signal?.aborted) return;
    if (last === null) last = now;
    const dt = Math.min(now - last, 100);
    last = now;
    pos += SPEED_PX * dt / 1000;
    const halfW = track.scrollWidth / 2;
    if (halfW > 0 && pos >= halfW) pos -= halfW;
    track.style.transform = `translateX(${-pos}px)`;
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);
  signal?.addEventListener?.('abort', () => { if (rafId) cancelAnimationFrame(rafId); }, { once: true });
}

/* ── Clock ── */
function startClock(splash, signal) {
  const el = splash.querySelector('[data-ren-clock]');
  if (!el) return;
  function tick() {
    if (signal?.aborted) return;
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    el.textContent = `${hh}:${mm}:${ss} · GST`;
  }
  tick();
  const id = window.setInterval(tick, 1000);
  signal?.addEventListener?.('abort', () => window.clearInterval(id), { once: true });
}

/* ── Rate card ── */
const RATE_REASONS_TAX = [
  `<span class="ren-em">HUTT CARTEL</span> wartime levy · all energy weapons`,
  `<span class="ren-em">IMPERIAL</span> luxury tariff · imports`,
  `<span class="ren-em">BLACK SUN</span> protection assessment`,
];
const RATE_REASONS_DISC = [
  `<span class="ren-em">REBEL</span> sympathizer discount · cash only`,
  `<span class="ren-em">CARAVAN</span> overstock · everything must move`,
  `<span class="ren-em">RENDARR</span> in a generous mood · do not ask`,
];
const RATE_NEUTRAL = `<span class="ren-em">MARKET</span> stable · no active modifiers`;

function updateRateCard(splash) {
  const card   = splash.querySelector('[data-ren-rate-card]');
  const label  = splash.querySelector('[data-ren-rate-label]');
  const val    = splash.querySelector('[data-ren-rate-val]');
  const reason = splash.querySelector('[data-ren-rate-reason]');
  if (!card) return;

  // Pull buyModifier from a data attribute written by template context, or default 0
  const modifier = Number(card.dataset.buyModifier ?? 0) || 0;
  const isDiscount = modifier < 0;
  card.classList.toggle('is-discount', isDiscount);
  if (label) label.textContent = isDiscount ? 'GM DISCOUNT' : (modifier === 0 ? 'GM MARKET · NEUTRAL' : 'GM TAX RATE');
  if (val) {
    const sign = modifier > 0 ? '+' : (modifier < 0 ? '−' : '±');
    val.textContent = `${sign}${Math.abs(modifier).toFixed(1)}%`;
  }
  if (reason) {
    if (modifier === 0) reason.innerHTML = RATE_NEUTRAL;
    else if (isDiscount) reason.innerHTML = RATE_REASONS_DISC[Math.floor(Math.abs(modifier) / 8) % RATE_REASONS_DISC.length];
    else reason.innerHTML = RATE_REASONS_TAX[Math.floor(modifier / 8) % RATE_REASONS_TAX.length];
  }
}

/* ── Hot Items Grid ── */
const HOT_SLOTS = [
  { label: 'Weapons',   icon: '⚡', keys: ['melee-weapons', 'ranged-weapons', 'weapon'] },
  { label: 'Armor',     icon: '🛡', keys: ['armor'] },
  { label: 'Gear',      icon: '⚙', keys: ['gear', 'equipment', 'medical'] },
  { label: 'Droids',    icon: '◈', keys: ['droid-parts', 'droid'] },
  { label: 'Ships',     icon: '◭', keys: ['starship-mods', 'vehicle', 'ship'] },
];

function buildHotCardHTML(item, slot, index) {
  const img = item.img
    ? `<img src="${escapeHtml(item.img)}" alt="" loading="lazy"/>`
    : `<span class="ren-hot-card__glyph">${slot.icon}</span>`;
  return `<button type="button"
    class="ren-hot-card"
    data-action="store-hot-deal-open"
    data-item-id="${escapeHtml(item.id || '')}"
    data-item-name="${escapeHtml(item.name || '')}"
    data-category="${escapeHtml(item.categoryKey || '')}"
    style="animation-delay:${index * 60}ms">
    <span class="ren-hot-card__rank">№${String(index + 1).padStart(2, '0')}</span>
    <span class="ren-hot-card__tag">${escapeHtml(item.tag || item.rarity || 'CATALOG')}</span>
    <div class="ren-hot-card__glyph-panel">${img}</div>
    <div class="ren-hot-card__name">${escapeHtml(item.name || 'Unknown')}</div>
    <div class="ren-hot-card__meta"><span class="ren-hot-card__cat">${escapeHtml(slot.label.toUpperCase())}</span></div>
    <div class="ren-hot-card__row">
      <span class="ren-hot-card__price">${escapeHtml(item.priceLabel || '—')}</span>
    </div>
  </button>`;
}

function buildComingSoonCardHTML(slot, index) {
  return `<div class="ren-hot-card ren-hot-card--empty" style="animation-delay:${index * 60}ms">
    <div class="ren-hot-card__glyph-panel"><span class="ren-hot-card__glyph">${slot.icon}</span></div>
    <div class="ren-hot-card__name">${slot.label.toUpperCase()}</div>
    <div class="ren-hot-card__coming">COMING SOON</div>
  </div>`;
}

function renderHotGrid(splash, state) {
  const grid = splash.querySelector('[data-hot-grid]');
  if (!grid) return;

  const groups = state.hotDeals.groups ?? [];
  const cards = HOT_SLOTS.map((slot, i) => {
    const group = groups.find(g =>
      slot.keys.some(k => (g.categoryKey || '').toLowerCase() === k
        || (g.categoryKey || '').toLowerCase().includes(k))
    );
    if (!group || !group.items?.length) return buildComingSoonCardHTML(slot, i);
    const cursor = (state.hotCursors[i] ?? 0) % group.items.length;
    return buildHotCardHTML(group.items[cursor], slot, i);
  });

  grid.style.transition = 'none';
  grid.innerHTML = cards.join('');
}

function startHotGridRotation(splash, state, signal) {
  const grid = splash.querySelector('[data-hot-grid]');
  if (!grid) return;
  const INTERVAL = 12000;
  const id = window.setInterval(() => {
    if (signal?.aborted) return;
    if (!isOpen(splash)) return;
    // Slide out
    grid.style.transition = 'transform 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.24s ease';
    grid.style.transform = 'translateX(-110%)';
    grid.style.opacity = '0';
    window.setTimeout(() => {
      if (signal?.aborted) return;
      // Advance cursors
      const groups = state.hotDeals.groups ?? [];
      HOT_SLOTS.forEach((slot, i) => {
        const group = groups.find(g => slot.keys.some(k => (g.categoryKey || '').toLowerCase().includes(k)));
        if (group && group.items?.length > 1) {
          state.hotCursors[i] = ((state.hotCursors[i] ?? 0) + 1) % group.items.length;
        }
      });
      grid.style.transition = 'none';
      grid.style.transform = 'translateX(110%)';
      grid.style.opacity = '0';
      renderHotGrid(splash, state);
      grid.offsetWidth; // reflow
      grid.style.transition = 'transform 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease';
      grid.style.transform = 'translateX(0)';
      grid.style.opacity = '1';
    }, 350);
  }, INTERVAL);
  signal?.addEventListener?.('abort', () => window.clearInterval(id), { once: true });
}

/* ── Greeting rotation ── */
const GREETINGS = [
  `Boot the terminal, friend. I don't care why you're here — I care what you're spending.`,
  `Everything's legal somewhere. That somewhere is here.`,
  `Credits good, questions bad. That's the only policy on this floor.`,
  `New stock just cleared customs. You didn't hear it from me.`,
  `Don't ask what the "R" stands for. Just browse.`,
];

function startGreetingRotation(splash, signal) {
  const el = splash.querySelector('[data-ren-greeting]');
  if (!el) return;
  let i = 0;
  const id = window.setInterval(() => {
    if (signal?.aborted) return;
    i = (i + 1) % GREETINGS.length;
    el.innerHTML = escapeHtml(GREETINGS[i]) + '<span class="ren-cursor" aria-hidden="true"></span>';
  }, 9000);
  signal?.addEventListener?.('abort', () => window.clearInterval(id), { once: true });
}

export function initRendarrStoreSplash(root, options = {}) {
  const splash = root?.querySelector?.('.swse-store-splash--rendarrs') ?? (root?.matches?.('.swse-store-splash--rendarrs') ? root : null);
  if (!splash) return () => {};

  const signal = options.signal;
  const motionOff = motionStyleFor(splash) === 'off'
    || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const state = {
    tickerHTML: null,
    tickerFrozen: false,
    hotCursors: [0, 0, 0, 0, 0],
    hotDeals: parseHotDeals(splash),
  };

  const cleanup = () => {};
  signal?.addEventListener?.('abort', cleanup, { once: true });

  /* Continue handler */
  const continueHandler = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    await options.onContinue?.(event);
  };
  splash.querySelectorAll('[data-action="store-splash-continue"]').forEach(btn => {
    btn.addEventListener('click', continueHandler, { signal });
  });

  /* Hot deal click handler */
  splash.addEventListener('click', async (event) => {
    const target = event.target instanceof Element ? event.target.closest('[data-action="store-hot-deal-open"]') : null;
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    await options.onHotDealOpen?.({
      id: target.dataset.itemId,
      name: target.dataset.itemName,
      category: target.dataset.category
    }, event);
  }, { signal });

  splash.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      await options.onContinue?.(event);
    }
  }, { signal });

  /* Init */
  setupTicker(splash, state);
  startTickerRAF(splash, state, signal);
  startClock(splash, signal);
  updateRateCard(splash);
  renderHotGrid(splash, state);
  if (!motionOff) {
    startHotGridRotation(splash, state, signal);
    startGreetingRotation(splash, signal);
  }

  return cleanup;
}

export class SWSEStoreSplashV2 extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'swse-store-splash',
    classes: ['swse', 'store-splash'],
    actions: {
      continue: (event, target) => this.prototype._onContinueAction.call(this, event, target),
    },
    window: {
      title: "Rendarr's Outfitters",
      icon: 'fas fa-store',
      resizable: true,
      minimizable: false,
      draggable: true,
    },
    position: {
      width: 1100,
      height: 820,
      top: null,
      left: null,
    },
  };

  static PARTS = {
    splash: {
      template: 'systems/foundryvtt-swse/templates/apps/store/store-splash.hbs',
    },
  };

  constructor(options = {}) {
    super(options);
    this.actor = options.actor ?? null;
    this._complete = false;
    this._settled = false;
    this._renderAbort = null;
    this._cleanupSplash = null;
  }

  async _prepareContext(_options) {
    let storeContext = {};
    try {
      const inst = await StoreSurfaceService.getOrCreateInstance(this.actor);
      storeContext = await inst?._prepareContext?.() ?? {};
    } catch (err) {
      SWSELogger.warn?.('[SWSEStoreSplashV2] Store catalog context unavailable for splash:', err);
    }
    return StoreSurfaceService.buildSplashContext(this.actor, storeContext, { splashComplete: false });
  }

  static async prompt(actor = null, options = {}) {
    if (options?.skipSplash) return;

    return new Promise((resolve, reject) => {
      try {
        const app = new this({ actor, ...options });
        app._resolve = resolve;
        app._reject = reject;
        app.render(true);
      } catch (err) {
        SWSELogger.error('[SWSEStoreSplashV2] ERROR rendering splash:', err);
        reject(err);
      }
    });
  }

  _onRender(context, options) {
    super._onRender(context, options);
    requestAnimationFrame(() => centerApplication(this));
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;
    const root = this.element;
    const sheetShell = root?.querySelector?.('[data-theme]');
    if (sheetShell) ThemeResolutionService.applyToElement(sheetShell, { actor: this.actor });
    this._cleanupSplash = initRendarrStoreSplash(root, {
      signal,
      onContinue: () => this._proceedToStore(),
      onHotDealOpen: () => this._proceedToStore()
    });
  }

  async close(options = {}) {
    this._renderAbort?.abort();
    this._cleanupSplash?.();
    this._settle();
    return super.close(options);
  }

  _settle() {
    if (this._settled) return;
    this._settled = true;
    this._resolve?.();
  }

  async _onContinueAction(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    await this._proceedToStore();
  }

  async _proceedToStore() {
    await this.close();
  }
}

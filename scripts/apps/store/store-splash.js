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

function formatChange(value) {
  const up = value >= 0;
  return { up, text: `${up ? '▲ +' : '▼ '}${value.toFixed(1)}%` };
}

function buildTicker() {
  const shuffled = [...STORE_TICKER_COMPANIES].sort(() => Math.random() - 0.5).slice(0, 42);
  return shuffled.map(([name, ticker]) => {
    const change = formatChange(randomChange());
    return `<span class="swse-rendarrs-ticker__item ${change.up ? 'is-up' : 'is-down'}"><strong>${escapeHtml(ticker)}</strong><span>${escapeHtml(name)}</span><em>${change.text}</em></span>`;
  }).join('');
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

function renderHotDeals(splash, state) {
  const category = splash.querySelector('[data-hot-deals-category]');
  const tagline = splash.querySelector('[data-hot-deals-tagline]');
  const list = splash.querySelector('[data-hot-deals-list]');
  const status = splash.querySelector('[data-hot-deals-status]');
  const stateLabel = splash.querySelector('[data-hot-deals-state]');
  if (!category || !tagline || !list) return;

  const groups = state.hotDeals.groups ?? [];
  const hydrated = state.hotDeals.hydrated && groups.length > 0;
  if (!hydrated) {
    category.textContent = 'Catalog Sync';
    tagline.textContent = 'Pending';
    list.innerHTML = '<div class="swse-rendarrs-hot-deals__empty">Catalog sync pending</div>';
    if (status) status.textContent = 'Catalog sync pending // store can still open';
    if (stateLabel) stateLabel.textContent = 'PENDING';
    return;
  }

  const currentIndex = isOpen(splash) ? state.hotDealIndex : state.hotDealFrozenIndex;
  const group = groups[currentIndex % groups.length];
  category.textContent = group.category || 'Hot Deals';
  tagline.textContent = group.tagline || 'Catalog rotation';
  if (status) status.textContent = isOpen(splash) ? 'Real catalog preview // rotating' : 'Catalog frozen // store closed';
  if (stateLabel) stateLabel.textContent = isOpen(splash) ? 'LIVE' : 'FROZEN';

  list.innerHTML = (group.items || []).slice(0, 5).map((item, index) => `
    <button type="button"
            class="swse-rendarrs-deal"
            data-action="store-hot-deal-open"
            data-item-id="${escapeHtml(item.id)}"
            data-item-name="${escapeHtml(item.name)}"
            data-category="${escapeHtml(item.categoryKey || group.categoryKey || '')}"
            style="animation-delay:${index * 55}ms">
      <span class="swse-rendarrs-deal__thumb" aria-hidden="true">${item.img ? `<img src="${escapeHtml(item.img)}" alt=""/>` : ''}</span>
      <span class="swse-rendarrs-deal__meta"><span class="swse-rendarrs-deal__name">${escapeHtml(item.name)}</span><span class="swse-rendarrs-deal__tag">${escapeHtml(item.tag || 'CATALOG')}</span></span>
      <strong class="swse-rendarrs-deal__price">${escapeHtml(item.priceLabel || '')}</strong>
    </button>
  `).join('') || '<div class="swse-rendarrs-hot-deals__empty">No highlighted catalog items</div>';

  if (isOpen(splash)) state.hotDealIndex = (state.hotDealIndex + 1) % groups.length;
}

function renderTicker(splash, state) {
  const track = splash.querySelector('[data-store-ticker-track]');
  if (!track) return;
  if (!isOpen(splash) && state.frozenTicker) {
    track.innerHTML = state.frozenTicker + state.frozenTicker;
    return;
  }
  const html = buildTicker();
  if (!isOpen(splash)) state.frozenTicker = state.frozenTicker || html;
  track.innerHTML = html + html;
}

function updateDecorativeIndex(splash) {
  if (!isOpen(splash)) return;
  const index = splash.querySelector('[data-market-index]');
  if (!index) return;
  const value = randomChange();
  index.textContent = `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  index.classList.toggle('is-up', value >= 0);
  index.classList.toggle('is-down', value < 0);
}

function syncOpenClosedState(splash) {
  const label = splash.querySelector('[data-store-status-label]');
  const boot = splash.querySelector('[data-store-boot-label]');
  const vendorStatus = splash.querySelector('[data-market-vendor-status]');
  const catalogSync = splash.querySelector('[data-market-catalog-sync]');
  if (label) label.textContent = isOpen(splash) ? 'OPEN' : 'CLOSED';
  if (boot) boot.textContent = isOpen(splash) ? 'Opening Rendarr vendor channel' : 'Catalog frozen // vendor channel closed';
  if (vendorStatus) vendorStatus.textContent = isOpen(splash) ? 'OPEN' : 'CLOSED';
  if (catalogSync) catalogSync.textContent = isOpen(splash) ? (catalogSync.textContent === 'SYNC PENDING' ? 'SYNC PENDING' : 'LIVE') : 'FROZEN';
}

export function initRendarrStoreSplash(root, options = {}) {
  const splash = root?.querySelector?.('.swse-store-splash--rendarrs') ?? (root?.matches?.('.swse-store-splash--rendarrs') ? root : null);
  if (!splash) return () => {};

  const signal = options.signal;
  const state = {
    frozenTicker: null,
    hotDealIndex: 0,
    hotDealFrozenIndex: 0,
    hotDeals: parseHotDeals(splash)
  };
  const timers = [];
  const reduced = motionStyleFor(splash) === 'reduced';
  const motionOff = motionStyleFor(splash) === 'off' || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const tickInterval = reduced ? 9000 : 5200;
  const dealsInterval = reduced ? 7500 : 4200;

  const cleanup = () => {
    while (timers.length) window.clearInterval(timers.pop());
  };
  signal?.addEventListener?.('abort', cleanup, { once: true });

  const continueHandler = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    await options.onContinue?.(event);
  };

  splash.querySelectorAll('[data-action="store-splash-continue"]').forEach(button => {
    button.addEventListener('click', continueHandler, { signal });
  });

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

  renderTicker(splash, state);
  renderHotDeals(splash, state);
  updateDecorativeIndex(splash);
  syncOpenClosedState(splash);

  if (!motionOff) {
    timers.push(window.setInterval(() => {
      renderTicker(splash, state);
      updateDecorativeIndex(splash);
      syncOpenClosedState(splash);
    }, tickInterval));
    timers.push(window.setInterval(() => renderHotDeals(splash, state), dealsInterval));
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
      width: 1000,
      height: 680,
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

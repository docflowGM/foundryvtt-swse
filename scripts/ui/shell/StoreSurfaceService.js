/**
 * StoreSurfaceService — View-model builder for the Holopad Store surface.
 *
 * Caches SWSEStore instances per actor so _initialize() (inventory loading)
 * only runs once per session. Subsequent renders just call _prepareContext()
 * after reloading cart state from actor flags.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { SettingsHelper } from '/systems/foundryvtt-swse/scripts/utils/settings-helper.js';
import { ThemeResolutionService } from '/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js';
import { buildStoreNavigationModel, normalizeArmorSubcategory } from '/systems/foundryvtt-swse/scripts/apps/store/store-shared.js';
import { getStoreCurrencySymbol } from '/systems/foundryvtt-swse/scripts/apps/store/store-description-resolver.js';

// Module-level cache: actorId → SWSEStore instance
const _instanceCache = new Map();

function _normalizeStoreFilterValue(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function _categoryKey(item = {}) {
  const raw = String(item.category ?? item.type ?? '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.includes('weapon')) return 'weapons';
  if (raw.includes('armor')) return 'armor';
  if (raw.includes('droid')) return 'droids';
  if (raw.includes('vehicle') || raw.includes('ship') || raw.includes('speeder') || raw.includes('walker')) return 'vehicles';
  if (raw.includes('gear') || raw.includes('equipment')) return 'gear';
  return raw.replace(/\s+/g, '-');
}

function _navSubcategory(item = {}) {
  if (_categoryKey(item) === 'armor') return normalizeArmorSubcategory(item);
  return String(item.subcategory ?? item.system?.subcategory ?? item.system?.category ?? '').trim();
}

const STORE_SPLASH_COMPANIES = [
  ['Adarian government', 'ADG'], ['AestheTech Incorporated', 'ATI'], ['Arlen-Dempler Luxury Speeders', 'ADLS'],
  ['Aurodiseal', 'AUR'], ['Bakiska\'s', 'BAK'], ['Begamor Heavy Industry Group', 'BHIG'],
  ['Binary Star Realty', 'BSR'], ['Blackwater Systems', 'BWS'], ['Bolzi Design & Transmogrification', 'BDT'],
  ['Boonta Brand', 'BNT'], ['Bornaryn Trading', 'BTR'], ['Brodogon Consortium', 'BDG'],
  ['Commex', 'CMX'], ['Corazon Industries', 'CZI'], ['Corellian Masternav', 'CMNV'],
  ['Corellian Vehicle Reclamation', 'CVR'], ['Coronet Durasteel', 'CDS'], ['Coronet Ion Works', 'CIW'],
  ['Corsignis Property Alliance', 'CPA'], ['Cularin SpaceNav', 'CSN'], ['Cularin Trade Alliance', 'CTA'],
  ['Czerka Interstellar', 'CZK'], ['Daa Corporation', 'DAA'], ['Damask Holdings', 'DMK'],
  ['Dex Acquisitions', 'DEX'], ['Dieterschach', 'DTC'], ['Drekker Industries', 'DKI'],
  ['Drevin', 'DRV'], ['Drunk Droid', 'DRD'], ['Dynamet Corporation', 'DYN'],
  ['Everlasting Love Company', 'ELC'], ['Galactic Enlightenment Real Estate Group', 'GERE'], ['Galactic Gladiators', 'GGL'],
  ['Galactic Sustainability Institute', 'GSI'], ['GalaxSat', 'GXS'], ['General Trade Galactic', 'GTG'],
  ['Gonk-Stores Paradise Trading Inc.', 'GSPT'], ['Gowix Corporation', 'GWX'], ['HavaKing', 'HVK'],
  ['HealthiDrive', 'HDRV'], ['Hyrotii Assembly Services', 'HAS'], ['Jesa Corporation', 'JSA'],
  ['Jillion Bolts Company', 'JBC'], ['Joltin\'s Workshop', 'JWS'], ['Karrel Engineering', 'KRE'],
  ['Keshk Corporation', 'KSK'], ['Kiharaphor Engineering', 'KHE'], ['Kirr Ltd.', 'KIR'],
  ['Kornova Corp', 'KNV'], ['Kuat Photonics', 'KPH'], ['Land & Sky Corporation', 'LSC'],
  ['LiMerge Power', 'LMP'], ['Lucin Syndicate', 'LUC'], ['MadisCorp', 'MDC'],
  ['Mandellian Corporation', 'MND'], ['Mehrak Corporation', 'MHK'], ['Mikar Music', 'MKR'],
  ['Mon Calamari Commercial Expeditionary Service', 'MCCES'], ['Monchantics', 'MONC'], ['Moriales Systems', 'MRS'],
  ['Multycorp', 'MLT'], ['Naos III Mercantile', 'N3M'], ['Nav Guild', 'NVG'],
  ['Nessin Courier and Cargo', 'NCC'], ['New Cov Biomolecule Company', 'NCB'], ['North River Freight core engineering department', 'NRF'],
  ['North River Group', 'NRG'], ['Nova Orion Industries', 'NOI'], ['Ocanis Gas', 'OCG'],
  ['Olin and Lands', 'OAL'], ['Orfa Olfactory Corporation', 'OOC'], ['Outer Rim Supply Co.', 'ORSC'],
  ['Pakkerd Racing', 'PKR'], ['Piccatech Ltd.', 'PCT'], ['Planet Dreams Incorporated', 'PDI'],
  ['Pontilo Foundation', 'PNF'], ['Pricon Metals', 'PCM'], ['Pulsar Supertanker', 'PST'],
  ['Quagga\'s Garage', 'QGG'], ['Qulun', 'QLN'], ['Raxlo Corporation', 'RXL'],
  ['Reclamation Services Inc.', 'RSI'], ['Repair Rack', 'RRK'], ['Rim Excursions Inc.', 'REX'],
  ['Roskom Mechanized Systems', 'RMS'], ['Rouge Beauty Company', 'RBC'], ['Sacul Industries Group', 'SIG'],
  ['Saiy Engineering Workshop', 'SEW'], ['San Tekka conglomerate', 'STC'], ['Santhe/Sienar Fleet Technologies', 'SSFT'],
  ['Second Mistake Enterprises', 'SME'], ['SecuriCase', 'SEC'], ['Seinar Corporation', 'SNR'],
  ['Seraphan Industries', 'SPI'], ['Shu Industries', 'SHU'], ['Shvash Gas Cooperative', 'SGC'],
  ['Siechel Transystem', 'SCT'], ['Sienar Technologies', 'SNT'], ['Silver Sails Business Group', 'SSBG'],
  ['Sketto Tankers Fuel Services', 'STFS'], ['Spaaga Core Inc.', 'SPC'], ['Speeder Sales', 'SPD'],
  ['Spotts TradeChip Company', 'STC2'], ['Squib Merchandising Consortium', 'SMC'], ['StarSail Hotels', 'SSH'],
  ['Sunber Containers', 'SBC'], ['SunnGunn', 'SGN'], ['SurvivalEquipment Inc.', 'SEI'],
  ['Swift Hutt Spacer\'s Service Depot', 'SHSD'], ['Synchet Industries', 'SYN'], ['Talon Company', 'TLN'],
  ['TaunTaun Steak Company', 'TTS'], ['Ti\'mere\'s InfoServices', 'TIS'], ['Titus Steel', 'TTSL'],
  ['Tradium', 'TRD'], ['Traken Industries', 'TRK'], ['TransGalMeg Industries Inc.', 'TGM'],
  ['Troida Corporation', 'TRC'], ['Twin Suns', 'TWS'], ['Ultrastellar Aesthetic Consultancy', 'UAC'],
  ['Unlimited Horizons Inc.', 'UHI'], ['VaporTech', 'VPT'], ['Varcinius Agglomeration', 'VAG'],
  ['Vekanda Leisure Colonies', 'VLC'], ['Wookiee Trading Co.', 'WTC'], ['Xtib', 'XTB'],
  ['Ypsobay Trading Company', 'YTC'], ['Yylti Corporation', 'YYL'], ['Zerpen Industries', 'ZRP']
];

function _safeJson(value) {
  return JSON.stringify(value ?? {}).replace(/</g, '\\u003c');
}

function _formatCredits(value) {
  const numeric = Number(value ?? 0) || 0;
  return `${numeric.toLocaleString()} cr`;
}

function _marketChange(seed = Math.random()) {
  const magnitude = seed < 0.18 ? Math.random() * 1000 : Math.random() * 99.9;
  const signed = (Math.random() < 0.56 ? 1 : -1) * magnitude;
  const up = signed >= 0;
  return {
    up,
    indicator: up ? '▲' : '▼',
    changeLabel: `${up ? '+' : ''}${signed.toFixed(1)}%`
  };
}


function _storeCardLetter(item = {}) {
  const type = String(item.type || '').toLowerCase();
  const categoryKey = _categoryKey(item);
  const category = String(item.category || '').toLowerCase();
  const name = String(item.name || '').trim();

  if (type === 'vehicle' || categoryKey === 'vehicles') return 'V';
  if (type === 'droid' || categoryKey === 'droids') return 'D';
  if (categoryKey === 'weapons' || category.includes('weapon')) return 'W';
  if (categoryKey === 'armor' || category.includes('armor')) return 'A';
  if (category.includes('medical')) return 'M';
  if (categoryKey === 'gear' || categoryKey === 'equipment') return 'G';
  return (name[0] || 'C').toUpperCase();
}

function _storeCardLabel(item = {}) {
  const categoryKey = _categoryKey(item);
  const labels = {
    weapons: 'Weapon',
    armor: 'Armor',
    gear: 'Gear',
    equipment: 'Gear',
    droids: 'Droid',
    vehicles: 'Vehicle'
  };
  return labels[categoryKey] || item.typeLabel || item.type || 'Catalog';
}

function _decorateStoreCardItem(item = {}) {
  return {
    ...item,
    cardLetter: item.cardLetter || _storeCardLetter(item),
    glyphLabel: item.glyphLabel || _storeCardLabel(item)
  };
}


function _storePriceLabel(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '—';
  return numeric.toLocaleString();
}

function _countRawCartEntries(cart = {}) {
  return (cart.items?.length ?? 0) + (cart.droids?.length ?? 0) + (cart.vehicles?.length ?? 0);
}

function _countApprovalEntries(cart = {}) {
  const entries = [
    ...(cart.items ?? []),
    ...(cart.droids ?? []),
    ...(cart.vehicles ?? [])
  ];
  return entries.filter(entry => entry?.requiresApproval === true || entry?.approvalRequired === true).length;
}

function _buildCheckoutState({ storeInstance, storeContext = {}, credits = 0, cartTotal = 0, cartEntries = [] } = {}) {
  const rawCart = storeInstance?.cart ?? {};
  const cartCount = Number(storeContext.cartCount ?? cartEntries.length ?? _countRawCartEntries(rawCart)) || 0;
  const storeOpen = SettingsHelper.getSafe?.('storeOpen', true) !== false;
  const cartRemainingActual = Number(credits ?? 0) - Number(cartTotal ?? 0);
  const approvalCount = _countApprovalEntries(rawCart);
  const warnings = [];

  if (!storeOpen) warnings.push('Store is currently closed by GM policy.');
  if (cartCount <= 0) warnings.push('Cart is empty.');
  if (cartRemainingActual < 0) {
    warnings.push(`Projected reserve is short by ${Math.abs(cartRemainingActual).toLocaleString()} credits. Checkout will ask the Transaction Engine to verify before anything changes.`);
  }
  if (approvalCount > 0) {
    warnings.push(`${approvalCount} staged listing${approvalCount === 1 ? '' : 's'} require GM approval and may be queued instead of purchased immediately.`);
  }

  const checkoutBlocked = !storeOpen || cartCount <= 0;
  return {
    storeOpen,
    cartCount,
    approvalCount,
    hasApprovalEntries: approvalCount > 0,
    cartRemainingActual,
    cartRemainingActualLabel: cartRemainingActual.toLocaleString(),
    cartRemainingNeg: cartRemainingActual < 0,
    checkoutBlocked,
    canCheckout: !checkoutBlocked,
    checkoutBlockedReason: !storeOpen ? 'Store is closed by GM policy.' : cartCount <= 0 ? 'Cart is empty.' : '',
    checkoutWarnings: warnings,
    hasCheckoutWarnings: warnings.length > 0
  };
}

function _stripHtml(value = '') {
  return String(value ?? '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function _buildSelectedProductDetail(product = null) {
  if (!product) {
    return {
      hasProduct: false,
      rows: [],
      priceOptions: [],
      summary: 'Select a listing to inspect stats, policy, pricing, and Rendarr\'s notes.'
    };
  }

  const rows = [
    { label: 'Type', value: product.typeLabel || product.type || 'Catalog' },
    { label: 'Category', value: product.category || product.categoryKey || 'General' },
    { label: 'Subcategory', value: product.subcategory || '—' },
    { label: 'Availability', value: product.availability || product.rarityLabel || 'Standard' },
    { label: 'Policy', value: product.blockedReason ? product.blockedReason : (product.canPurchase === false ? 'Blocked' : 'Purchasable') }
  ].filter(row => row.value !== undefined && row.value !== null && String(row.value).trim() !== '');

  const priceOptions = product.requiresCondition
    ? [
        { label: 'New', value: product.newCost, valueLabel: _storePriceLabel(product.newCost), condition: 'new' },
        { label: 'Used', value: product.usedCost, valueLabel: _storePriceLabel(product.usedCost), condition: 'used' }
      ].filter(option => Number.isFinite(Number(option.value)))
    : [{ label: 'Price', value: product.price ?? product.finalCost ?? product.cost, valueLabel: _storePriceLabel(product.price ?? product.finalCost ?? product.cost), condition: '' }];

  const summaryText = _stripHtml(product.descriptionBasic || product.description || product.descriptionAurebesh || '')
    || product.suggestionBullets?.[0]
    || product.mentorReview
    || 'No listing description available.';

  return {
    hasProduct: true,
    id: product.id,
    rows,
    priceOptions,
    summary: summaryText.length > 220 ? `${summaryText.slice(0, 217)}...` : summaryText,
    isVehicle: product.type === 'vehicle',
    isDroid: product.type === 'droid',
    canPurchase: product.canPurchase !== false,
    blockedReason: product.blockedReason || ''
  };
}

function _buildScratchBuilderActions(currentCategory = '') {
  const key = _normalizeStoreFilterValue(currentCategory || '');
  const isDroidCategory = key === 'droids' || key === 'droid' || key.includes('droid');
  const isVehicleCategory = key === 'vehicles' || key === 'vehicle' || key === 'ships' || key === 'shipyard'
    || key.includes('vehicle') || key.includes('ship') || key.includes('speeder') || key.includes('walker');

  if (isDroidCategory) {
    return [{
      key: 'droid',
      label: 'Build Droid From Scratch',
      sublabel: 'Launch Droid Builder',
      icon: 'D',
      tone: 'droid'
    }];
  }
  if (isVehicleCategory) {
    return [{
      key: 'vehicle',
      label: 'Build Ship / Vehicle From Scratch',
      sublabel: 'Launch Shipyard Builder',
      icon: 'V',
      tone: 'vehicle'
    }];
  }
  return [];
}

function _buildTickerPreview(count = 18) {
  return STORE_SPLASH_COMPANIES.slice(0, count).map(([name, ticker]) => ({
    name,
    ticker,
    ..._marketChange()
  }));
}

function _labelFromBuyModifier(value, positiveLabel = '0.0%') {
  const modifier = Number(value ?? 0) || 0;
  return modifier > 0 ? `${modifier.toFixed(1)}%` : positiveLabel;
}

function _discountFromBuyModifier(value, fallback = '0.0%') {
  const modifier = Number(value ?? 0) || 0;
  return modifier < 0 ? `-${Math.abs(modifier).toFixed(1)}%` : fallback;
}

function _normalizeCategoryKey(value = '') {
  const key = String(value || '').toLowerCase();
  if (key.includes('melee')) return 'melee-weapons';
  if (key.includes('ranged')) return 'ranged-weapons';
  if (key.includes('weapon')) return 'ranged-weapons';
  if (key.includes('armor')) return 'armor';
  if (key.includes('medical') || key.includes('medpac')) return 'medical';
  if (key.includes('droid')) return 'droid-parts';
  if (key.includes('vehicle') || key.includes('starship') || key.includes('ship')) return 'starship-mods';
  if (key.includes('equipment') || key.includes('gear')) return 'gear';
  return key || 'gear';
}

function _categoryLabel(key) {
  const labels = {
    'melee-weapons': 'Melee Weapons',
    'ranged-weapons': 'Ranged Weapons',
    armor: 'Armor',
    gear: 'Gear',
    medical: 'Medical',
    'droid-parts': 'Droid Parts',
    'starship-mods': 'Starship Mods',
    'black-market': 'Black-Market Specials'
  };
  return labels[key] || key.replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function _categoryTagline(key) {
  const taglines = {
    'melee-weapons': 'Close-quarters surplus',
    'ranged-weapons': 'Blaster markdowns',
    armor: 'Protective stock rotation',
    gear: 'Field kit specials',
    medical: 'Triage counter stock',
    'droid-parts': 'Garage counter stock',
    'starship-mods': 'Shipyard intake',
    'black-market': 'Quiet counter offers'
  };
  return taglines[key] || 'Catalog rotation';
}

function _itemTag(item = {}) {
  const rarity = String(item.rarityLabel || item.availability || '').trim();
  if (rarity) return rarity.toUpperCase();
  if (item.suggestion?.tierLabel) return item.suggestion.tierLabel.toUpperCase();
  return 'CATALOG';
}

function _buildHotDealsFromItems(allItems = []) {
  const groups = new Map();
  for (const item of allItems) {
    if (!item?.id || !item?.name) continue;
    const source = `${item.category || ''} ${item.subcategory || ''} ${item.type || ''}`;
    const categoryKey = _normalizeCategoryKey(source);
    if (!groups.has(categoryKey)) {
      groups.set(categoryKey, {
        category: _categoryLabel(categoryKey),
        categoryKey,
        tagline: _categoryTagline(categoryKey),
        items: []
      });
    }
    const price = item.price ?? item.finalCost ?? item.cost ?? item.costNew ?? 0;
    groups.get(categoryKey).items.push({
      id: item.id,
      name: item.name,
      img: item.img || '',
      categoryKey,
      storeCategory: item.category || categoryKey,
      displayCategory: _categoryLabel(categoryKey),
      price: Number(price) || 0,
      priceLabel: _formatCredits(price),
      rarity: item.rarityLabel || item.availability || '',
      tag: _itemTag(item)
    });
  }

  const orderedKeys = ['melee-weapons', 'ranged-weapons', 'armor', 'gear', 'medical', 'droid-parts', 'starship-mods', 'black-market'];
  const builtGroups = [...groups.values()]
    .map(group => ({
      ...group,
      items: group.items
        .sort((a, b) => a.price - b.price)
        .slice(0, 5)
        .map((item, index) => ({ ...item, animationDelay: index * 55 }))
    }))
    .filter(group => group.items.length > 0)
    .sort((a, b) => orderedKeys.indexOf(a.categoryKey) - orderedKeys.indexOf(b.categoryKey));

  const currentGroup = builtGroups[0] ?? {
    category: 'Catalog Sync',
    categoryKey: 'sync',
    tagline: 'Pending',
    items: []
  };

  return {
    hydrated: builtGroups.length > 0,
    frozen: false,
    groups: builtGroups,
    currentGroup
  };
}

export class StoreSurfaceService {

  /**
   * Get or create an initialized SWSEStore for the given actor.
   * Returns null on failure. Used by the controller for cart mutations.
   */
  static async getOrCreateInstance(actor) {
    if (!actor) return null;
    if (_instanceCache.has(actor.id)) return _instanceCache.get(actor.id);

    try {
      const { SWSEStore } = await import(
        '/systems/foundryvtt-swse/scripts/apps/store/store-main.js'
      );
      const inst = new SWSEStore(actor, {
        closeAfterCheckout: false,
        onCheckoutComplete: null,
        onClose: null
      });
      // Shell browse owns its own render window.  Full suggestion scoring can be
      // deferred so opening the store does not freeze the character sheet.
      inst._shellSkipInitialSuggestions = true;
      await inst._initialize();
      _instanceCache.set(actor.id, inst);
      return inst;
    } catch (err) {
      SWSELogger.error('[StoreSurfaceService] Failed to create store instance:', err);
      return null;
    }
  }

  /**
   * Invalidate cached instance for an actor (e.g. after actor change).
   */
  static invalidate(actorId) {
    _instanceCache.delete(actorId);
  }

  static buildSplashContext(actor, storeContext = {}, options = {}) {
    const buyModifier = Number(SettingsHelper.getSafe('globalBuyModifier', 0)) || 0;
    const storeOpen = Boolean(SettingsHelper.getSafe('storeOpen', true));
    const allItems = Array.isArray(storeContext.allItems) ? storeContext.allItems : [];
    const hotDeals = _buildHotDealsFromItems(allItems);
    const themeContext = ThemeResolutionService.buildSurfaceContext({ actor });
    const sheetTheme = themeContext.themeKey;
    const sheetMotionStyle = themeContext.motionStyle;
    const credits = Number(storeContext.credits ?? actor?.system?.credits ?? 0) || 0;

    return {
      actorName: actor?.name || 'GUEST ACCOUNT',
      credits,
      sheetTheme,
      sheetMotionStyle,
      surfaceStyleInline: themeContext.surfaceStyleInline,
      storeOpen,
      storeStatusLabel: storeOpen ? 'OPEN' : 'CLOSED',
      marketIndexLabel: '+000.0%',
      marketControls: {
        buyModifier,
        taxLabel: _labelFromBuyModifier(buyModifier),
        discountLabel: _discountFromBuyModifier(buyModifier),
        vendorStatusLabel: storeOpen ? 'OPEN' : 'CLOSED',
        catalogSyncLabel: hotDeals.hydrated ? 'LIVE' : 'SYNC PENDING'
      },
      hotDeals,
      hotDealsJson: _safeJson({ groups: hotDeals.groups, hydrated: hotDeals.hydrated }),
      tickerPreview: _buildTickerPreview(),
      currencySymbol: storeContext.currencySymbol ?? getStoreCurrencySymbol(),
      accountTier: credits >= 5000 ? 'Priority Trade Access' : credits >= 1000 ? 'Verified Customer Account' : 'Public Exchange Access',
      terminalId: actor?.id ? `ACT-${String(actor.id).slice(-6).toUpperCase()}` : 'PUB-0000',
      vendorLink: actor ? 'REN-DARR VERIFIED' : 'PUBLIC CATALOG LINK',
      splashComplete: Boolean(options.splashComplete || options.enteredStore || options.currentView)
    };
  }

  /**
   * Build the store surface view model.
   *
   * @param {Actor} actor
   * @param {object} options - { currentCategory, currentView, selectedProductId }
   * @returns {Promise<object>}
   */
  static async buildViewModel(actor, options = {}) {
    try {
      if (!actor) {
        return { id: 'store', title: 'Rendarr\'s Outfitters', error: 'No actor selected' };
      }

      // Temporary stability mode: bypass the store splash and enter Browse directly.
      // The splash remains in the repo as a deprecated path, but the shell-native
      // store should not hydrate hot-item/splash state before the real catalog.
      const splashComplete = true;

      // P0 safety: the splash screen must remain interactive.  The full store
      // catalog invokes suggestion scoring for every listing, which can be
      // expensive and chatty enough to make the holopad look frozen before the
      // player even clicks ENTER.  When the user is still on the splash, build a
      // lightweight VM from actor/theme data and only use a previously-loaded
      // store instance if it is already available.
      if (!splashComplete) {
        const cached = _instanceCache.get(actor.id);
        let cachedContext = {};
        if (cached?._loaded && typeof cached._prepareContext === 'function') {
          try {
            cachedContext = await cached._prepareContext({ splashOnly: true });
          } catch (err) {
            SWSELogger.warn('[StoreSurfaceService] Cached splash context unavailable:', err);
          }
        }
        const splashContext = StoreSurfaceService.buildSplashContext(actor, cachedContext, { ...options, splashComplete: false });
        return {
          id: 'store',
          title: 'Rendarr\'s Outfitters',
          actorName: actor.name,
          actorCredits: Number(actor.system?.credits ?? 0) || 0,
          sheetTheme: splashContext.sheetTheme,
          sheetMotionStyle: splashContext.sheetMotionStyle,
          splashComplete: false,
          storeSplash: splashContext,
          storeContext: {
            allItems: [],
            totalItems: 0,
            visibleItemCount: 0,
            credits: Number(actor.system?.credits ?? 0) || 0,
            cartCount: 0,
            cartTotal: 0,
            cartEntries: [],
            currentView: 'splash',
            isBrowseOrDetail: false,
            categorySummary: [],
            navigationModel: { topCategories: [] },
            pageContext: {},
            purchaseHistoryEntries: [],
            purchaseHistoryCount: 0,
            filters: { search: '', availability: 'all', sort: 'default' }
          }
        };
      }

      const storeInstance = await StoreSurfaceService.getOrCreateInstance(actor);
      if (!storeInstance) {
        return { id: 'store', title: 'Rendarr\'s Outfitters', error: 'Store unavailable' };
      }

      // Sync navigation state from shell options.
      // The splash is a full-catalog entry point; never let stale browse filters
      // from an earlier store session starve hot-item hydration before the user
      // has even entered the store.
      {
        const previousCategory = storeInstance.currentCategory ?? '';
        if (options.currentCategory !== undefined) storeInstance.currentCategory = options.currentCategory ?? '';
        // Phase 2: Sync subcategory/family state
        if (options.currentSubcategory !== undefined) storeInstance.currentSubcategory = options.currentSubcategory ?? null;
        if (options.currentFamily !== undefined) storeInstance.currentFamily = options.currentFamily ?? null;
        // When category changes, clear stale subcategory/family state
        if (options.currentCategory !== undefined && options.currentCategory !== previousCategory) {
          storeInstance.currentSubcategory = null;
          storeInstance.currentFamily = null;
        }
        if (options.currentView) storeInstance.currentView = options.currentView;
        if (options.selectedProductId !== undefined) storeInstance.selectedProductId = options.selectedProductId ?? null;
      }

      // Reload cart from actor flags (reflects any controller mutations)
      storeInstance.cart = storeInstance._loadCartFromActor();

      // Build context using the cached, already-initialized instance
      const storeContext = await storeInstance._prepareContext();

      const currentView = storeContext.currentView ?? 'browse';
      const cartRemaining = storeContext.pageContext?.cartRemaining ?? 0;
      const currentCategory = (storeContext.currentCategory ?? '').toLowerCase();
      const currentSubcategory = storeContext.currentSubcategory ?? null;
      const allItems = Array.isArray(storeContext.allItems) ? storeContext.allItems : [];
      const visibleItems = allItems.filter(item => {
        const matchesCategory = !currentCategory || _categoryKey(item) === currentCategory;
        const matchesSubcategory = !currentSubcategory
          || _normalizeStoreFilterValue(_navSubcategory(item)) === _normalizeStoreFilterValue(currentSubcategory);
        return matchesCategory && matchesSubcategory;
      });

      const baseRenderLimit = Number(options.storeRenderLimit ?? 36) || 36;
      const selectedProductId = options.selectedProductId ?? storeContext.selectedProduct?.id ?? null;
      let renderLimit = Math.max(12, baseRenderLimit);
      if (selectedProductId) {
        const selectedIndex = visibleItems.findIndex(item => item?.id === selectedProductId);
        if (selectedIndex >= renderLimit) renderLimit = selectedIndex + 1;
      }
      const renderedItems = visibleItems.slice(0, renderLimit).map(_decorateStoreCardItem);
      const hasMoreItems = renderedItems.length < visibleItems.length;
      const builderActions = _buildScratchBuilderActions(storeContext.currentCategory ?? '');
      const splashContext = StoreSurfaceService.buildSplashContext(actor, storeContext, { ...options, splashComplete });

      // Phase 2: Include navigation model
      const navigationModel = storeContext.navigationModel ?? buildStoreNavigationModel(
        storeInstance.storeInventory,
        {
          activeCategory: storeContext.currentCategory ?? '',
          activeSubcategory: storeContext.currentSubcategory ?? null,
          activeFamily: storeContext.currentFamily ?? null
        }
      );

      // Phase 2: Pre-group weapon subcategories by family for template simplicity
      if (navigationModel.topCategories) {
        for (const category of navigationModel.topCategories) {
          if (category.key === 'weapons' && category.children) {
            const byFamily = new Map();
            for (const child of category.children) {
              const family = child.family || 'other';
              if (!byFamily.has(family)) {
                byFamily.set(family, []);
              }
              byFamily.get(family).push(child);
            }
            category.familyGroups = Object.fromEntries(byFamily);
          }
        }
      }

      const rawCartEntries = Array.isArray(storeContext.cartEntries) ? storeContext.cartEntries : [];
      const cartTotal = Number(storeContext.cartTotal ?? 0) || 0;
      const credits = Number(storeContext.credits ?? 0) || 0;
      const checkoutState = _buildCheckoutState({
        storeInstance,
        storeContext,
        credits,
        cartTotal,
        cartEntries: rawCartEntries
      });

      const safeContext = {
        allItems: renderedItems,
        totalItems: allItems.length,
        visibleItemCount: visibleItems.length,
        renderedItemCount: renderedItems.length,
        renderLimit,
        hasMoreItems,
        nextRenderLimit: Math.min(visibleItems.length, renderLimit + 36),
        credits,
        cartCount: checkoutState.cartCount,
        cartTotal,
        cartEntries: rawCartEntries,
        currentView,
        isBrowseOrDetail: currentView === 'browse' || currentView === 'detail',
        currentCategory: storeContext.currentCategory ?? '',
        currentSubcategory: storeContext.currentSubcategory ?? null,
        currentFamily: storeContext.currentFamily ?? null,
        currencySymbol: storeContext.currencySymbol ?? getStoreCurrencySymbol(),
        currentCategoryLabel: storeContext.currentCategoryLabel ?? 'All Listings',
        categorySummary: storeContext.categorySummary ?? [],
        builderActions,
        hasBuilderActions: builderActions.length > 0,
        navigationModel,  // Phase 2: Include navigation model
        pageContext: storeContext.pageContext ?? {},
        cartRemainingActual: checkoutState.cartRemainingActual,
        cartRemainingActualLabel: checkoutState.cartRemainingActualLabel,
        cartRemainingNeg: checkoutState.cartRemainingNeg,
        storeOpen: checkoutState.storeOpen,
        checkoutBlocked: checkoutState.checkoutBlocked,
        canCheckout: checkoutState.canCheckout,
        checkoutBlockedReason: checkoutState.checkoutBlockedReason,
        checkoutWarnings: checkoutState.checkoutWarnings,
        hasCheckoutWarnings: checkoutState.hasCheckoutWarnings,
        approvalCount: checkoutState.approvalCount,
        hasApprovalEntries: checkoutState.hasApprovalEntries,
        purchaseHistoryEntries: storeContext.purchaseHistoryEntries ?? [],
        purchaseHistoryCount: storeContext.purchaseHistoryCount ?? 0,
        rendarrImage: storeContext.rendarrImage ?? '',
        rendarrWelcome: storeContext.rendarrWelcome ?? '',
        selectedProduct: storeContext.selectedProduct ? _decorateStoreCardItem(storeContext.selectedProduct) : null,
        selectedProductDetail: _buildSelectedProductDetail(storeContext.selectedProduct),
        selectedProductId: options.selectedProductId ?? storeContext.selectedProduct?.id ?? null,
        isGM: storeContext.isGM ?? false,
        filters: {
          search: options.search ?? '',
          availability: options.availability ?? 'all',
          sort: options.sort ?? 'default'
        }
      };

      return {
        id: 'store',
        title: 'Rendarr\'s Outfitters',
        actorName: actor.name,
        actorCredits: credits,
        sheetTheme: splashContext.sheetTheme,
        sheetMotionStyle: splashContext.sheetMotionStyle,
        surfaceStyleInline: splashContext.surfaceStyleInline,
        splashComplete,
        storeSplash: splashContext,
        storeContext: safeContext
      };
    } catch (err) {
      SWSELogger.error('[StoreSurfaceService] Failed to build store view model:', err);
      return { id: 'store', title: 'Rendarr\'s Outfitters', error: err.message };
    }
  }
}

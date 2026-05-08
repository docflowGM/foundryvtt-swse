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

// Module-level cache: actorId → SWSEStore instance
const _instanceCache = new Map();

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
      categoryKey: item.category || categoryKey,
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
    const sheetTheme = ThemeResolutionService.resolveThemeKey(null, { actor });
    const sheetMotionStyle = ThemeResolutionService.resolveMotionStyle(null, { actor });
    const credits = Number(storeContext.credits ?? actor?.system?.credits ?? 0) || 0;

    return {
      actorName: actor?.name || 'GUEST ACCOUNT',
      credits,
      sheetTheme,
      sheetMotionStyle,
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
      currencySymbol: storeContext.currencySymbol ?? '$',
      accountTier: credits >= 5000 ? 'Priority Trade Access' : credits >= 1000 ? 'Verified Customer Account' : 'Public Exchange Access',
      terminalId: actor?.id ? `ACT-${String(actor.id).slice(-6).toUpperCase()}` : 'PUB-0000',
      vendorLink: actor ? 'REN-DARR VERIFIED' : 'PUBLIC CATALOG LINK',
      splashComplete: Boolean(options.splashComplete)
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

      const storeInstance = await StoreSurfaceService.getOrCreateInstance(actor);
      if (!storeInstance) {
        return { id: 'store', title: 'Rendarr\'s Outfitters', error: 'Store unavailable' };
      }

      // Sync navigation state from shell options
      if (options.currentCategory !== undefined) storeInstance.currentCategory = options.currentCategory ?? '';
      if (options.currentView) storeInstance.currentView = options.currentView;
      if (options.selectedProductId !== undefined) storeInstance.selectedProductId = options.selectedProductId ?? null;

      // Reload cart from actor flags (reflects any controller mutations)
      storeInstance.cart = storeInstance._loadCartFromActor();

      // Build context using the cached, already-initialized instance
      const storeContext = await storeInstance._prepareContext();

      const currentView = storeContext.currentView ?? 'browse';
      const cartRemaining = storeContext.pageContext?.cartRemaining ?? 0;
      const currentCategory = (storeContext.currentCategory ?? '').toLowerCase();
      const allItems = Array.isArray(storeContext.allItems) ? storeContext.allItems : [];
      const visibleItems = currentCategory
        ? allItems.filter(item => (item.category ?? '').toLowerCase() === currentCategory)
        : allItems;
      const splashContext = StoreSurfaceService.buildSplashContext(actor, storeContext, options);
      const safeContext = {
        allItems: visibleItems,
        totalItems: allItems.length,
        visibleItemCount: visibleItems.length,
        credits: storeContext.credits ?? 0,
        cartCount: storeContext.cartCount ?? 0,
        cartTotal: storeContext.cartTotal ?? 0,
        cartEntries: storeContext.cartEntries ?? [],
        currentView,
        isBrowseOrDetail: currentView === 'browse' || currentView === 'detail',
        currentCategory: storeContext.currentCategory ?? '',
        currentCategoryLabel: storeContext.currentCategoryLabel ?? 'All Listings',
        categorySummary: storeContext.categorySummary ?? [],
        pageContext: storeContext.pageContext ?? {},
        cartRemainingNeg: cartRemaining < 0,
        purchaseHistoryEntries: storeContext.purchaseHistoryEntries ?? [],
        purchaseHistoryCount: storeContext.purchaseHistoryCount ?? 0,
        rendarrImage: storeContext.rendarrImage ?? '',
        rendarrWelcome: storeContext.rendarrWelcome ?? '',
        selectedProduct: storeContext.selectedProduct ?? null,
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
        actorCredits: storeContext.credits ?? 0,
        sheetTheme: splashContext.sheetTheme,
        sheetMotionStyle: splashContext.sheetMotionStyle,
        splashComplete: Boolean(options.splashComplete),
        storeSplash: splashContext,
        storeContext: safeContext
      };
    } catch (err) {
      SWSELogger.error('[StoreSurfaceService] Failed to build store view model:', err);
      return { id: 'store', title: 'Rendarr\'s Outfitters', error: err.message };
    }
  }
}

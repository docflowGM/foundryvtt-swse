const DESCRIPTION_FILES = Object.freeze({
  vehicle: 'systems/foundryvtt-swse/data/store/vehicle-store-descriptions.json',
  weapon: 'systems/foundryvtt-swse/data/store/weapon-store-descriptions.json',
  equipment: 'systems/foundryvtt-swse/data/store/equipment-store-descriptions.json',
  armor: 'systems/foundryvtt-swse/data/store/armor-store-descriptions.json',
  droid: 'systems/foundryvtt-swse/data/store/droid-store-descriptions.json',
  modification: 'systems/foundryvtt-swse/data/store/modification-store-descriptions.json'
});

const _datasetCache = new Map();

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/["'`’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferDatasetKeys(item) {
  const keys = new Set();
  const type = String(item?.type || '').toLowerCase();
  const subcategory = String(item?.subcategory || item?.system?.subcategory || '').toLowerCase();
  const category = String(item?.category || item?.system?.category || '').toLowerCase();
  const pack = String(item?.pack || item?.doc?.pack || '').toLowerCase();

  if (type === 'vehicle') keys.add('vehicle');
  if (type === 'weapon') keys.add('weapon');
  if (type === 'armor') keys.add('armor');
  if (type === 'droid') keys.add('droid');
  if (type === 'equipment' || type === 'tool' || type === 'tech') keys.add('equipment');

  if (subcategory.includes('upgrade') || category.includes('upgrade') || pack.includes('modification')) {
    keys.add('modification');
  }

  return Array.from(keys);
}

async function loadDataset(key) {
  if (!DESCRIPTION_FILES[key]) return { byId: new Map(), bySlug: new Map(), byName: new Map() };
  if (_datasetCache.has(key)) return _datasetCache.get(key);

  const promise = fetch(DESCRIPTION_FILES[key])
    .then(async response => {
      if (!response.ok) throw new Error(`Failed to load ${key} store descriptions (${response.status})`);
      const rows = await response.json();
      const byId = new Map();
      const bySlug = new Map();
      const byName = new Map();
      for (const row of Array.isArray(rows) ? rows : []) {
        if (row?.id) byId.set(String(row.id), row);
        if (row?.slug) bySlug.set(String(row.slug), row);
        if (row?.name) byName.set(normalizeName(row.name), row);
      }
      return { byId, bySlug, byName };
    })
    .catch(err => {
      console.warn('[SWSE Store] Failed to load store descriptions for', key, err);
      return { byId: new Map(), bySlug: new Map(), byName: new Map() };
    });

  _datasetCache.set(key, promise);
  return promise;
}

function resolveCompendiumDescription(item) {
  const description = item?.system?.description || item?.description || item?.doc?.system?.description || '';
  return typeof description === 'string' ? description : '';
}

function stripHtml(html) {
  const text = String(html || '').replace(/<[^>]+>/g, ' ');
  return text.replace(/\s+/g, ' ').trim();
}

export async function resolveStoreDescription(item) {
  if (!item) {
    return {
      source: 'none',
      description: '',
      aurebeshText: '',
      basicText: '',
      hasDescription: false
    };
  }

  const keys = inferDatasetKeys(item);
  const itemId = String(item.id || item._id || item?.doc?.id || item?.doc?._id || '');
  const slugCandidates = [
    String(item.slug || ''),
    normalizeName(item.name),
    normalizeName(item?.doc?.name),
    normalizeName(item?.system?.slug)
  ].filter(Boolean);
  const nameCandidates = [normalizeName(item.name), normalizeName(item?.doc?.name)].filter(Boolean);

  for (const key of keys) {
    const dataset = await loadDataset(key);
    if (itemId && dataset.byId.has(itemId)) {
      const row = dataset.byId.get(itemId);
      return {
        source: key,
        description: row.description || '',
        aurebeshText: row.description || '',
        basicText: row.description || '',
        hasDescription: Boolean(row.description)
      };
    }
    for (const slug of slugCandidates) {
      if (dataset.bySlug.has(slug)) {
        const row = dataset.bySlug.get(slug);
        return {
          source: key,
          description: row.description || '',
          aurebeshText: row.description || '',
          basicText: row.description || '',
          hasDescription: Boolean(row.description)
        };
      }
    }
    for (const name of nameCandidates) {
      if (dataset.byName.has(name)) {
        const row = dataset.byName.get(name);
        return {
          source: key,
          description: row.description || '',
          aurebeshText: row.description || '',
          basicText: row.description || '',
          hasDescription: Boolean(row.description)
        };
      }
    }
  }

  const fallback = resolveCompendiumDescription(item);
  const basicText = stripHtml(fallback);
  return {
    source: basicText ? 'compendium' : 'none',
    description: fallback,
    aurebeshText: basicText,
    basicText,
    hasDescription: Boolean(basicText)
  };
}

export function getStoreCurrencySymbol() {
  return '$';
}

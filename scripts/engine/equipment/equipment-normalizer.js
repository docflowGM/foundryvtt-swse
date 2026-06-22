/**
 * Equipment Normalizer
 *
 * Phase 1 gear/equipment foundation. This module is intentionally declarative:
 * it normalizes existing equipment records into stable metadata that store,
 * inventory, item sheets, and later skill-use resolvers can consume without
 * guessing from item names or prose descriptions.
 */

export const EQUIPMENT_BUCKETS = Object.freeze({
  comlinks: { label: 'Comlinks', category: 'tech', storeCategory: 'Tech', storeSubcategory: 'Communications' },
  medical: { label: 'Medical', category: 'medical', storeCategory: 'Medical', storeSubcategory: 'Medical Gear' },
  other: { label: 'Other', category: 'gear', storeCategory: 'Equipment', storeSubcategory: 'General Gear' },
  security: { label: 'Security', category: 'security', storeCategory: 'Security', storeSubcategory: 'Security & Detection' },
  survival: { label: 'Survival', category: 'survival', storeCategory: 'Survival', storeSubcategory: 'Survival & Life Support' },
  tech: { label: 'Tech', category: 'tech', storeCategory: 'Tech', storeSubcategory: 'Computers & Electronics' },
  tools: { label: 'Tools', category: 'tool', storeCategory: 'Tools', storeSubcategory: 'Tools & Kits' }
});

export const EQUIPMENT_BUCKET_OPTIONS = Object.freeze(Object.entries(EQUIPMENT_BUCKETS).map(([value, data]) => ({ value, label: data.label })));

export const EQUIPMENT_CATEGORY_OPTIONS = Object.freeze([
  { value: 'gear', label: 'Gear' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'medical', label: 'Medical' },
  { value: 'security', label: 'Security' },
  { value: 'survival', label: 'Survival' },
  { value: 'tech', label: 'Tech' },
  { value: 'tool', label: 'Tool' },
  { value: 'comlink', label: 'Comlink' },
  { value: 'computer', label: 'Computer' },
  { value: 'detection', label: 'Detection' },
  { value: 'life-support', label: 'Life Support' },
  { value: 'container', label: 'Container' },
  { value: 'upgrade', label: 'Upgrade' },
  { value: 'accessory', label: 'Accessory' }
]);

export const EQUIPMENT_AVAILABILITY_OPTIONS = Object.freeze([
  { value: 'standard', label: 'Standard' },
  { value: 'licensed', label: 'Licensed' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'military', label: 'Military' },
  { value: 'illegal', label: 'Illegal' },
  { value: 'rare', label: 'Rare' }
]);

const BUCKET_BY_PACK = Object.freeze({
  'equipment-comlinks': 'comlinks',
  'equipment-medical': 'medical',
  'equipment-other': 'other',
  'equipment-security': 'security',
  'equipment-survival': 'survival',
  'equipment-tech': 'tech',
  'equipment-tools': 'tools'
});

const TYPE_LABELS = Object.freeze({
  accessory: 'Accessory',
  comlink: 'Comlink',
  computer: 'Computer',
  consumable: 'Consumable',
  container: 'Container',
  cybernetic: 'Cybernetic',
  detection: 'Detection',
  explosive: 'Explosive',
  gear: 'Gear',
  lifeSupport: 'Life Support',
  'life-support': 'Life Support',
  medical: 'Medical Gear',
  misc: 'Miscellaneous',
  security: 'Security Gear',
  survival: 'Survival Gear',
  tech: 'Tech Gear',
  tool: 'Tool',
  upgrade: 'Upgrade'
});

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? {}));
}

export function slugifyEquipment(value, fallback = '') {
  const slug = String(value ?? '')
    .trim()
    .replace(/[’']/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return [];
}

function unique(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (!text) continue;
    const key = slugifyEquipment(text, text.toLowerCase());
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

export function parseEquipmentNumber(value, fallback = 0, { nullable = false } = {}) {
  if (value === null || value === undefined || value === '') return nullable ? null : fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : (nullable ? null : fallback);
  const cleaned = String(value)
    .replace(/,/g, '')
    .replace(/credits?|cr\.?/gi, '')
    .replace(/kilograms?|kgs?|kg/gi, '')
    .trim();
  if (!cleaned || /^[-—]+$/.test(cleaned)) return nullable ? null : fallback;
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return nullable ? null : fallback;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : (nullable ? null : fallback);
}

function canonicalAvailability(value) {
  const text = String(value ?? '').trim().toLowerCase();
  if (!text || text === 'common') return 'Standard';
  if (text.includes('licensed')) return 'Licensed';
  if (text.includes('restricted')) return 'Restricted';
  if (text.includes('military')) return 'Military';
  if (text.includes('illegal')) return 'Illegal';
  if (text.includes('rare')) return 'Rare';
  if (text.includes('standard')) return 'Standard';
  return String(value ?? 'Standard').trim() || 'Standard';
}

function restrictionFromAvailability(value) {
  const availability = canonicalAvailability(value).toLowerCase();
  if (['licensed', 'restricted', 'military', 'illegal', 'rare'].includes(availability)) return availability;
  return 'common';
}

export function equipmentBucketFromPack(pack = '') {
  const text = String(pack ?? '').toLowerCase();
  for (const [packKey, bucket] of Object.entries(BUCKET_BY_PACK)) {
    if (text.includes(packKey)) return bucket;
  }
  return '';
}

function equipmentBucketFromId(id = '') {
  const text = String(id ?? '').toLowerCase();
  if (text.startsWith('medical-')) return 'medical';
  if (text.startsWith('comms-')) return 'comlinks';
  if (text.startsWith('computer-') || text.startsWith('cyber-') || text.startsWith('upgrade-universal-')) return 'tech';
  if (text.startsWith('detect-') || text.startsWith('explosive-')) return 'security';
  if (text.startsWith('life-') || text.startsWith('survival-')) return 'survival';
  if (text.startsWith('tool-') || text.startsWith('upgrade-armor-') || text.startsWith('upgrade-weapon-')) return 'tools';
  if (text.startsWith('accessory-')) return 'other';
  return '';
}

export function resolveEquipmentBucket({ system = {}, sourcePack = '', id = '' } = {}) {
  const explicit = slugifyEquipment(system.equipmentBucket ?? system.bucket ?? '', '');
  if (explicit && EQUIPMENT_BUCKETS[explicit]) return explicit;
  const fromPack = equipmentBucketFromPack(sourcePack);
  if (fromPack) return fromPack;
  const fromId = equipmentBucketFromId(id);
  if (fromId) return fromId;
  return 'other';
}

function inferEquipmentType(system = {}, { id = '', bucket = '' } = {}) {
  const explicit = system.equipmentType ?? system.subcategory ?? system.type;
  const explicitSlug = slugifyEquipment(explicit, '');
  if (explicitSlug && explicitSlug !== 'equipment') return explicitSlug;

  const text = String(id ?? '').toLowerCase();
  if (text.startsWith('medical-')) return 'medical';
  if (text.startsWith('comms-')) return 'comlink';
  if (text.startsWith('computer-')) return 'computer';
  if (text.startsWith('cyber-')) return 'cybernetic';
  if (text.startsWith('detect-')) return 'detection';
  if (text.startsWith('explosive-')) return 'explosive';
  if (text.startsWith('life-')) return 'life-support';
  if (text.startsWith('survival-')) return 'survival';
  if (text.startsWith('tool-')) return 'tool';
  if (text.startsWith('upgrade-')) return 'upgrade';
  if (text.startsWith('accessory-')) return 'accessory';

  return EQUIPMENT_BUCKETS[bucket]?.category || 'gear';
}

function inferItemRole(system = {}, { id = '', equipmentType = '' } = {}) {
  const existing = slugifyEquipment(system.itemRole ?? system.role ?? '', '');
  if (existing) return existing;
  const text = String(id ?? '').toLowerCase();
  if (equipmentType === 'upgrade' || text.startsWith('upgrade-')) return 'upgrade';
  if (equipmentType === 'container' || text.includes('belt') || text.includes('bandolier') || text.includes('holster')) return 'container';
  if (text.includes('medpac') || text.includes('patch') || text.includes('dose') || text.includes('bacta-per-liter') || text.includes('ration') || text.includes('energy-cell') || text.includes('power-pack') || text.includes('detonite') || text.includes('charge')) return 'consumable';
  if (equipmentType === 'explosive') return 'consumable';
  return 'gear';
}

function normalizeSkillHooks(value) {
  const hooks = Array.isArray(value) ? value : [];
  return hooks.map((hook) => ({
    skill: slugifyEquipment(hook?.skill ?? hook?.skillKey ?? '', ''),
    useKey: slugifyEquipment(hook?.useKey ?? hook?.use ?? '', ''),
    mode: slugifyEquipment(hook?.mode ?? 'modifies', 'modifies'),
    required: hook?.required === true,
    consumes: hook?.consumes && typeof hook.consumes === 'object' ? clone(hook.consumes) : null,
    bonus: hook?.bonus && typeof hook.bonus === 'object' ? clone(hook.bonus) : null,
    source: String(hook?.source ?? '').trim(),
    note: String(hook?.note ?? '').trim()
  })).filter((hook) => hook.skill || hook.useKey || hook.mode);
}

function normalizeCharges(charges = {}) {
  const current = parseEquipmentNumber(charges?.current, null, { nullable: true });
  const max = parseEquipmentNumber(charges?.max, null, { nullable: true });
  return { current, max };
}

export function getEquipmentBucketLabel(bucket = '') {
  return EQUIPMENT_BUCKETS[bucket]?.label || bucket || 'Other';
}

export function getEquipmentTypeLabel(type = '') {
  return TYPE_LABELS[type] || TYPE_LABELS[slugifyEquipment(type, '')] || String(type || 'Gear');
}

export function categorizeEquipmentForStore(item = {}) {
  const system = item.system ?? item ?? {};
  const bucket = resolveEquipmentBucket({ system, sourcePack: item.sourcePack ?? item.pack ?? '', id: item.rawId ?? item._id ?? item.id ?? '' });
  const bucketConfig = EQUIPMENT_BUCKETS[bucket] ?? EQUIPMENT_BUCKETS.other;
  const explicitSubcategory = String(system.equipmentStoreSubcategory ?? system.equipmentTypeLabel ?? '').trim();
  return {
    cat: bucketConfig.storeCategory,
    sub: explicitSubcategory || bucketConfig.storeSubcategory
  };
}

export function normalizeEquipmentSystem(system = {}, context = {}) {
  const normalized = clone(system ?? {});
  const id = context.id ?? context._id ?? context.rawId ?? '';
  const bucket = resolveEquipmentBucket({ system: normalized, sourcePack: context.sourcePack ?? context.pack ?? '', id });
  const bucketConfig = EQUIPMENT_BUCKETS[bucket] ?? EQUIPMENT_BUCKETS.other;
  const equipmentType = inferEquipmentType(normalized, { id, bucket });
  const itemRole = inferItemRole(normalized, { id, equipmentType });
  const cost = Math.max(0, Math.round(parseEquipmentNumber(normalized.cost ?? normalized.costNumeric, 0)));
  const weight = Math.max(0, parseEquipmentNumber(normalized.weight ?? normalized.economics?.weight, 0));
  const quantity = Math.max(1, Math.round(parseEquipmentNumber(normalized.quantity, 1)));
  const availability = canonicalAvailability(normalized.availability ?? normalized.restriction);
  const restriction = restrictionFromAvailability(availability);
  const tags = unique([
    ...normalizeList(normalized.tags),
    bucket,
    equipmentType,
    itemRole
  ]).map((entry) => slugifyEquipment(entry, entry.toLowerCase()));
  const traits = unique([
    ...normalizeList(normalized.traits),
    ...tags
  ]).map((entry) => slugifyEquipment(entry, entry.toLowerCase()));
  const properties = unique(normalizeList(normalized.properties));
  const consumable = itemRole === 'consumable' || normalized.usage?.consumable === true;
  const charges = normalizeCharges(normalized.usage?.charges ?? normalized.charges ?? {});

  return {
    ...normalized,
    schemaVersion: Math.max(3, Number(normalized.schemaVersion ?? 0) || 0),
    category: bucketConfig.category,
    equipmentBucket: bucket,
    equipmentBucketLabel: getEquipmentBucketLabel(bucket),
    equipmentType,
    equipmentTypeLabel: getEquipmentTypeLabel(equipmentType),
    itemRole,
    itemRoleLabel: getEquipmentTypeLabel(itemRole),
    quantity,
    cost,
    value: Math.max(0, Math.round(parseEquipmentNumber(normalized.value ?? cost, cost))),
    costNumeric: cost,
    weight,
    weightLabel: `${Number.isInteger(weight) ? weight : Number(weight.toFixed(2))} kg`,
    availability,
    restriction,
    size: normalized.size || 'Small',
    equipped: normalized.equipped === true || normalized.equippable?.equipped === true,
    integrated: normalized.integrated === true,
    description: String(normalized.description ?? ''),
    notes: String(normalized.notes ?? ''),
    sourcebook: String(normalized.sourcebook ?? normalized.source ?? ''),
    source: String(normalized.source ?? normalized.sourcebook ?? ''),
    page: parseEquipmentNumber(normalized.page, null, { nullable: true }),
    tags,
    traits,
    properties,
    equippable: {
      equipped: normalized.equipped === true || normalized.equippable?.equipped === true,
      slot: normalized.equippable?.slot ?? null
    },
    usage: {
      mode: normalized.usage?.mode || (consumable ? 'consumable' : itemRole === 'container' ? 'container' : 'passive'),
      consumable,
      charges,
      consumeOn: normalized.usage?.consumeOn || (consumable ? 'manual' : '')
    },
    modifiers: normalized.modifiers && typeof normalized.modifiers === 'object' && !Array.isArray(normalized.modifiers) ? normalized.modifiers : {},
    container: {
      capacity: parseEquipmentNumber(normalized.container?.capacity, null, { nullable: true }),
      contents: Array.isArray(normalized.container?.contents) ? normalized.container.contents : []
    },
    economics: {
      cost,
      weight
    },
    capabilities: {
      ...(normalized.capabilities && typeof normalized.capabilities === 'object' && !Array.isArray(normalized.capabilities) ? normalized.capabilities : {}),
      skillHooksReady: true,
      skillLinked: Array.isArray(normalized.skillHooks) && normalized.skillHooks.length > 0,
      consumable,
      container: itemRole === 'container',
      upgrade: itemRole === 'upgrade'
    },
    skillHooks: normalizeSkillHooks(normalized.skillHooks),
    normalizationStatus: 'equipment-phase1-normalized'
  };
}

export default normalizeEquipmentSystem;

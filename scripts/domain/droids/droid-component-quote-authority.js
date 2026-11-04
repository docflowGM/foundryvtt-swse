/**
 * V2 droid component quotation authority (pure; no actor writes).
 *
 * Core Rulebook pp. 186-193, official 2008 errata and SGD category review.
 * This module calculates numbers only. It does NOT certify an item's source
 * identity, grant an installation host, or authorize a transaction.
 */
const FACTORS = Object.freeze({
  fine:       Object.freeze({ price: 20, accessoryWeight: 0.1 }),
  diminutive: Object.freeze({ price: 10, accessoryWeight: 0.2 }),
  tiny:       Object.freeze({ price: 5,  accessoryWeight: 0.4 }),
  small:      Object.freeze({ price: 2,  accessoryWeight: 1 }),
  medium:     Object.freeze({ price: 1,  accessoryWeight: 1 }),
  large:      Object.freeze({ price: 2,  accessoryWeight: 2 }),
  huge:       Object.freeze({ price: 5,  accessoryWeight: 5 }),
  gargantuan: Object.freeze({ price: 10, accessoryWeight: 10 }),
  colossal:   Object.freeze({ price: 20, accessoryWeight: 20 })
});

export function getDroidSizeFactors(size) {
  const key = String(size ?? '').trim().toLowerCase();
  return FACTORS[key] ?? null; // No unknown-size => Medium fallback.
}

export function getDroidPriceFactor(size) {
  return getDroidSizeFactors(size)?.price ?? null;
}

export function getDroidAccessoryWeightFactor(size) {
  return getDroidSizeFactors(size)?.accessoryWeight ?? null;
}

function invalid(reason) {
  return { status: 'BLOCKED', credits: null, kg: null, blockingReason: reason };
}

function numerical(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null; // Never parse "5000+", "varies", "-", or an empty string as a price.
}

function variantEntry(entries, variant) {
  if (!Array.isArray(entries) || !entries.length || !variant) return null;
  const key = String(variant).trim().toLowerCase();
  return entries.find(entry => [entry.id, entry.name, entry.type, entry.version, entry.range]
    .some(candidate => String(candidate ?? '').trim().toLowerCase() === key)) ?? null;
}

function accessoryCategory(category, sourcePath) {
  const path = String(sourcePath ?? '').toLowerCase();
  // SGD's three Locomotion systems are excluded even when integrated.
  if (path.includes('locomotion')) return false;
  if (path.startsWith('accessories.')) return true;
  return ['armor', 'shield', 'sensor', 'communication', 'accessory'].includes(category);
}

/**
 * @param {object} input
 * @param {object} input.definition  Existing DROID_SYSTEMS source definition
 * @param {string} input.size        Explicit droid size (all nine sizes supported)
 * @param {string} [input.category]  Source category (not a caller's desired host)
 * @param {string} [input.sourcePath] Original DROID_SYSTEMS path
 * @param {number} [input.speed]     Selected locomotion speed, not an assumed 6
 * @param {string} [input.variant]   Exact listed variant/range
 * @param {number} [input.appendageBaseCost] Cost of selected appendage
 * @param {number} [input.appendageBaseWeight] Weight of selected appendage
 * @param {number} [input.baseLocomotionCost] Quoted base locomotion cost
 *
 * All output fields are consumed by the droid-part adapter and its clients.
 * BLOCKED is a mandatory hard stop for callers, never a free quotation.
 */
export function resolveDroidComponentQuote(input = {}) {
  const {
    definition, size, category = '', sourcePath = '',
    speed, variant, appendageBaseCost, appendageBaseWeight, baseLocomotionCost
  } = input;
  const factors = getDroidSizeFactors(size);
  if (!factors) return invalid('Unknown droid size; choose a published size');
  if (!definition || typeof definition !== 'object') return invalid('Unknown component source definition');

  const kind = String(category).toLowerCase();
  const path = String(sourcePath || definition.sourcePath || '').toLowerCase();
  const priceFactor = factors.price;
  const massFactor = accessoryCategory(kind, path) ? factors.accessoryWeight : priceFactor;

  // A chosen variant must match a printed named/ranged option. No first-option fallback.
  let selected = definition;
  if (Array.isArray(definition.rangeOptions)) {
    selected = variantEntry(definition.rangeOptions, variant);
    if (!selected) return invalid('Select a published range variant');
  } else if (Array.isArray(definition.cost) || Array.isArray(definition.weight)) {
    const candidates = Array.isArray(definition.cost) ? definition.cost : definition.weight;
    selected = variantEntry(candidates, variant);
    if (!selected) return invalid('Select an exact published component variant');
  } else if (variant && Array.isArray(definition.variants)) {
    selected = variantEntry(definition.variants, variant);
    if (!selected) return invalid('Unknown component variant');
  } else if (Array.isArray(definition.variants) && definition.variants.length) {
    return invalid('Select an exact published component variant');
  }

  let credits = null;
  const cost = selected.cost ?? selected.price ?? null;
  if (typeof definition.costFormula === 'function') {
    if (!Number.isFinite(speed) || speed < 0) return invalid('Locomotion speed must be selected');
    credits = numerical(definition.costFormula(speed, priceFactor));
  } else if (typeof cost === 'function') {
    const base = path.includes('appendageenhancement')
      ? appendageBaseCost : priceFactor;
    if (!Number.isFinite(base)) return invalid('Select a priced base appendage');
    credits = numerical(cost(base));
  } else {
    credits = numerical(cost);
  }

  if (credits === null && Number.isFinite(definition.costMultiplier)) {
    const base = path.includes('locomotion')
      ? baseLocomotionCost
      : appendageBaseCost;
    if (!Number.isFinite(base)) return invalid('Select a priced base system for this enhancement');
    credits = numerical(base * definition.costMultiplier);
  }
  if (credits === null) return invalid('Published component price is not an exact number');
  if (credits < 0) return invalid('Construction-only credit offsets are not retail prices');
  credits = Math.ceil(credits);

  const weightValue = selected.weight ?? null;
  let kg = null;
  if (typeof definition.weightFormula === 'function') {
    kg = numerical(definition.weightFormula(massFactor));
  } else if (typeof weightValue === 'function') {
    const base = path.includes('appendageenhancement')
      ? appendageBaseWeight : massFactor;
    if (!Number.isFinite(base)) return invalid('Select a weighed base appendage');
    kg = numerical(weightValue(base));
  } else {
    kg = numerical(weightValue);
  }
  if (kg === null || kg < 0) return invalid('Published component mass is unavailable or unresolved');

  return { status: 'OK', credits, kg, blockingReason: null };
}

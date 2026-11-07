/**
 * V2 droid component quotation authority (pure; no actor writes).
 *
 * Core Rulebook pp. 186-193, official 2008 errata and SGD category review.
 * This module calculates numbers only. It does NOT certify an item's source
 * identity, grant an installation host, or authorize a transaction.
 */
import { resolveDroidComponentSourceReview } from './droid-component-source-review.js';
import { DROID_SIZE_ORDER, evaluateDroidComponentPrerequisites } from './droid-component-prerequisites.js';

const SIZE_ORDER = DROID_SIZE_ORDER;
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
 * @param {number} [input.selectedInstalledShieldRating] SR from an actual installed shield generator
 *
 * All output fields are consumed by the droid-part adapter and its clients.
 * BLOCKED is a mandatory hard stop for callers, never a free quotation.
 */
export function resolveDroidComponentQuote(input = {}) {
  const {
    definition, size, category = '', sourcePath = '',
    speed, variant, appendageBaseCost, appendageBaseWeight, baseLocomotionCost,
    selectedInstalledShieldRating
  } = input;
  const factors = getDroidSizeFactors(size);
  if (!factors) return invalid('Unknown droid size; choose a published size');
  if (!definition || typeof definition !== 'object') return invalid('Unknown component source definition');
  const orderedSize = SIZE_ORDER.indexOf(String(size).toLowerCase());
  const minimum = definition.sizeMinimum ?? definition.minSize ?? null;
  if (minimum && (SIZE_ORDER.indexOf(String(minimum).toLowerCase()) < 0
      || orderedSize < SIZE_ORDER.indexOf(String(minimum).toLowerCase()))) {
    return invalid('Droid is smaller than the published component minimum size');
  }
  const maximum = definition.maxSize ?? null;
  if (maximum && (SIZE_ORDER.indexOf(String(maximum).toLowerCase()) < 0
      || orderedSize > SIZE_ORDER.indexOf(String(maximum).toLowerCase()))) {
    return invalid('Droid is larger than the published component maximum size');
  }
  // Source entries with a secondary price/weight progression are not a
  // single retail variant. Until their variant and host are source-certified,
  // never sell the cheapest base value while ignoring higher-tier fields.
  if (definition.costWithHigherDefense !== undefined
      || definition.costIncrement !== undefined
      || definition.weightIncrement !== undefined) {
    return invalid('Component has unselected or unresolved published price/weight variants');
  }
  const isShieldExpansion = definition.id === 'shield-expansion-module';
  if (isShieldExpansion && (!Number.isInteger(selectedInstalledShieldRating)
      || ![5, 10, 15, 20].includes(selectedInstalledShieldRating)
      || orderedSize < SIZE_ORDER.indexOf('small'))) {
    return invalid('Shield expansion requires a Small-or-larger droid with an installed eligible shield generator SR');
  }

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
  if (variant && selected === definition) return invalid('No published variant matches the requested selection');

  let credits = null;
  const cost = selected.cost ?? selected.price ?? (selected === definition ? definition.cost : null);
  if (typeof definition.costFormula === 'function') {
    if (!Number.isFinite(speed) || speed < 0) return invalid('Locomotion speed must be selected');
    credits = numerical(definition.costFormula(speed, priceFactor));
  } else if (typeof cost === 'function') {
    const base = path.includes('appendageenhancement')
      ? appendageBaseCost : priceFactor;
    if (!Number.isFinite(base)) return invalid('Select a priced base appendage');
    credits = numerical(isShieldExpansion ? cost(base, selectedInstalledShieldRating) : cost(base));
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

  const weightValue = selected.weight ?? (selected === definition ? definition.weight : null);
  let kg = null;
  if (typeof definition.weightFormula === 'function') {
    kg = numerical(definition.weightFormula(massFactor));
  } else if (typeof weightValue === 'function') {
    const base = path.includes('appendageenhancement')
      ? appendageBaseWeight : massFactor;
    if (!Number.isFinite(base)) return invalid('Select a weighed base appendage');
    kg = numerical(isShieldExpansion ? weightValue(base, selectedInstalledShieldRating) : weightValue(base));
  } else {
    kg = numerical(weightValue);
  }
  if (kg === null || kg < 0) return invalid('Published component mass is unavailable or unresolved');

  return { status: 'OK', credits, kg, blockingReason: null };
}

/**
 * Numeric arithmetic and source-review presence are different gates.
 * Returning OK here certifies NEITHER installation host NOR commerce.
 */
export function resolveSourceReviewedDroidQuote(input = {}) {
  return resolveSourceReviewedDroidQuoteStaged(input).quote;
}

/**
 * Same decision, plus WHICH gate decided it. A valid price is not an
 * installation permit, so callers that need to tell "no published source
 * clearance" from "prerequisite unmet" from "price not exact" (installation
 * eligibility) read `stages`; `quote` is byte-for-byte what
 * resolveSourceReviewedDroidQuote has always returned.
 *
 *   stages.sourceReview  PASS | BLOCKED
 *   stages.prerequisites MET  | BLOCKED | NOT_EVALUATED
 *   stages.numeric       OK   | INVALID | NOT_EVALUATED
 */
export function resolveSourceReviewedDroidQuoteStaged(input = {}) {
  const review = resolveDroidComponentSourceReview(input.definition, {
    operationPhase: input.operationPhase,
    locomotionSlotOrdinal: input.locomotionSlotOrdinal,
    restrictedLocomotion: input.restrictedLocomotion
  });
  if (review.decision === 'BLOCKED') {
    return {
      quote: {
        status: 'NEEDS_SOURCE_ADJUDICATION',
        credits: null, kg: null,
        blockingReason: review.blockingReason
      },
      stages: { sourceReview: 'BLOCKED', prerequisites: 'NOT_EVALUATED', numeric: 'NOT_EVALUATED' }
    };
  }
  const prerequisites = evaluateDroidComponentPrerequisites(input);
  if (prerequisites.status !== 'PREREQUISITES_MET') {
    return {
      quote: {
        status: 'BLOCKED', credits: null, kg: null,
        blockingReason: prerequisites.blockingReason
      },
      stages: { sourceReview: 'PASS', prerequisites: 'BLOCKED', numeric: 'NOT_EVALUATED' }
    };
  }
  const quote = resolveDroidComponentQuote(input);
  return {
    quote,
    stages: { sourceReview: 'PASS', prerequisites: 'MET', numeric: quote.status === 'OK' ? 'OK' : 'INVALID' }
  };
}

/**
 * Entry point for every chargen/follower/preview consumer of DROID_SYSTEMS.
 * Keep sourcePath derivation here; callers must never supply their own
 * competing price or accessory weight factors.
 * Quoting a component is not permission to install or to charge the wallet:
 * source-status, host and ownership gates remain separate requirements.
 */
export function resolveDroidBuilderQuote({
  definition, category, subcategory = null, size, speed = null,
  variant = null, appendageBaseCost = null, appendageBaseWeight = null,
  baseLocomotionCost = null, selectedInstalledShieldRating = null,
  operationPhase = null, locomotionSlotOrdinal = null, restrictedLocomotion = null,
  droidSystems = null, installedComponentIds = [], selectedAppendage = null
} = {}) {
  const group = category === 'enhancement' ? 'locomotionEnhancement' : category;
  const paths = {
    locomotion: 'locomotion',
    processor: 'processors',
    appendage: 'appendages',
    locomotionEnhancement: 'locomotionEnhancements',
    appendageEnhancement: 'appendageEnhancements'
  };
  const sourcePath = group === 'accessory'
    ? (subcategory ? `accessories.${subcategory}` : '')
    : paths[group];
  if (!sourcePath) return invalid('Component source category is not recognized');

  return resolveSourceReviewedDroidQuote({
    definition, size, category: group === 'accessory' ? subcategory : group,
    sourcePath, speed, variant, appendageBaseCost,
    appendageBaseWeight, baseLocomotionCost, selectedInstalledShieldRating,
    operationPhase, locomotionSlotOrdinal, restrictedLocomotion,
    droidSystems, installedComponentIds, selectedAppendage
  });
}

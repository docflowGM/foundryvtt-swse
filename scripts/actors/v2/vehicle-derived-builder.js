/**
 * Vehicle Derived Data Builder (Phase 1)
 *
 * Builds vehicle-specific derived data contract.
 * Maintains compatibility with legacy vehicle fields (hull, raw defenses, etc.)
 * Produces system.derived structure matching v2 contract.
 *
 * NOTE: Vehicles inherit base HP/defense contract from character, but normalize
 * vehicle-specific field shapes (defenses, hull/hp coercion, identity labels).
 */

/**
 * Safe numeric coercion with fallback
 */
function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Build vehicle defense value as proper v2 contract object
 * Accepts raw numeric input or already-formed object
 */
function buildDefenseValue(rawValue, base = 10) {
  // If already properly formed, return as-is
  if (rawValue && typeof rawValue === 'object' && 'total' in rawValue) {
    return rawValue;
  }

  // Wrap raw numeric value in contract object
  const total = safeNumber(rawValue, base);
  const adjustment = total - base;

  return {
    base,
    total,
    adjustment,
    stateBonus: 0
  };
}

/**
 * Coerce vehicle HP from system.hp or system.hull (legacy compatibility)
 */
function coerceVehicleHp(system) {
  let value = 0;
  let max = 1;
  let temp = 0;

  // Priority: system.hp (modern) > system.hull (legacy)
  if (system.hp && typeof system.hp === 'object') {
    value = safeNumber(system.hp.value, 0);
    max = safeNumber(system.hp.max, 1);
    temp = safeNumber(system.hp.temp, 0);
  } else if (system.hull && typeof system.hull === 'object') {
    // Fallback to legacy hull field for older vehicles
    value = safeNumber(system.hull.value, 0);
    max = safeNumber(system.hull.max, 1);
    temp = 0;
  }

  // Ensure max > 0 to prevent division by zero
  if (!Number.isFinite(max) || max <= 0) {
    max = 1;
  }

  return { value, max, temp };
}

/**
 * Calculate HP display state (warning/critical thresholds)
 */
function calculateHpState(value, max) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;

  return {
    percent,
    warning: percent <= 50 && percent > 25,
    critical: percent <= 25
  };
}

/**
 * Build vehicle identity derived display labels
 */
function buildVehicleIdentity(system, actor) {
  const identity = {};

  // Type label (from system.type or fallback)
  identity.typeLabel = system.type || 'Vehicle';

  // Size label (from system.size or fallback)
  identity.sizeLabel = (system.size || 'Medium').charAt(0).toUpperCase() +
                       (system.size || 'Medium').slice(1).toLowerCase();

  // Category (from system.category or type)
  identity.category = system.category || system.type || 'Vehicle';

  // Store raw values for use in templates
  identity.size = system.size || '';
  identity.type = system.type || '';

  return identity;
}

/**
 * Main vehicle derived builder
 * Called from vehicle-actor.js computeVehicleDerived()
 *
 * @param {Actor} actor - The vehicle actor
 * @param {Object} system - The system data object (actor.system)
 */
export function buildVehicleDerived(actor, system) {
  // Ensure top-level derived structure exists
  system.derived ??= {};
  system.derived.defenses ??= {};
  system.derived.damage ??= {};
  system.derived.hp ??= {};
  system.derived.identity ??= {};

  // ════════════════════════════════════════════════════════════════════════════
  // DEFENSES: Wrap raw vehicle defense values in contract objects
  // Vehicles store raw numbers (reflexDefense, fortitudeDefense, etc.)
  // Convert to {base, total, adjustment, stateBonus} objects
  // ════════════════════════════════════════════════════════════════════════════

  // REF defense
  if (!system.derived.defenses.ref || typeof system.derived.defenses.ref !== 'object') {
    const refValue = system.reflexDefense ?? 10;
    system.derived.defenses.ref = buildDefenseValue(refValue, 10);
  }

  // FORT defense
  if (!system.derived.defenses.fort || typeof system.derived.defenses.fort !== 'object') {
    const fortValue = system.fortitudeDefense ?? 10;
    system.derived.defenses.fort = buildDefenseValue(fortValue, 10);
  }

  // WILL defense (vehicles may not have this)
  if (!system.derived.defenses.will || typeof system.derived.defenses.will !== 'object') {
    const willValue = system.willDefense ?? 10;
    system.derived.defenses.will = buildDefenseValue(willValue, 10);
  }

  // FLAT-FOOTED defense
  if (!system.derived.defenses.flatFooted || typeof system.derived.defenses.flatFooted !== 'object') {
    const ffValue = system.flatFooted ?? 10;
    system.derived.defenses.flatFooted = buildDefenseValue(ffValue, 10);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DAMAGE: Threshold, reduction, and state
  // ════════════════════════════════════════════════════════════════════════════

  if (!system.derived.damage.threshold || typeof system.derived.damage.threshold !== 'number') {
    system.derived.damage.threshold = safeNumber(system.damageThreshold, 10);
  }

  if (!Number.isFinite(system.derived.damage.reduction)) {
    system.derived.damage.reduction = safeNumber(system.damageReduction, 0);
  }

  // Condition track help state
  system.derived.damage.conditionHelpless = false;

  // ════════════════════════════════════════════════════════════════════════════
  // HP: Normalize from system.hp or system.hull (legacy)
  // Build all derived HP display values
  // ════════════════════════════════════════════════════════════════════════════

  const hp = coerceVehicleHp(system);
  const hpState = calculateHpState(hp.value, hp.max);

  system.derived.hp.value = hp.value;
  system.derived.hp.max = hp.max;
  system.derived.hp.temp = hp.temp;
  system.derived.hp.percent = hpState.percent;
  system.derived.hp.warning = hpState.warning;
  system.derived.hp.critical = hpState.critical;

  // ════════════════════════════════════════════════════════════════════════════
  // IDENTITY: Vehicle-specific identity labels
  // ════════════════════════════════════════════════════════════════════════════

  const identity = buildVehicleIdentity(system, actor);
  system.derived.identity.typeLabel = identity.typeLabel;
  system.derived.identity.sizeLabel = identity.sizeLabel;
  system.derived.identity.category = identity.category;
  system.derived.identity.size = identity.size;
  system.derived.identity.type = identity.type;

  // Timestamp for derived computation
  system.derived.meta ??= {};
  system.derived.meta.lastRecalcMs = Date.now();
}

/**
 * Export builder functions for testing/reuse
 */
export { buildDefenseValue, coerceVehicleHp, calculateHpState, buildVehicleIdentity };

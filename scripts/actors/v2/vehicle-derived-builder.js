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
  const total = safeNumber(rawValue?.total ?? rawValue, base);
  const resolvedBase = safeNumber(rawValue?.base ?? base, base);
  const adjustment = total - resolvedBase;

  return {
    base: resolvedBase,
    total,
    adjustment,
    stateBonus: safeNumber(rawValue?.stateBonus, 0)
  };
}

/**
 * Coerce vehicle HP from system.hp or system.hull (legacy compatibility)
 */
function coerceVehicleHp(system) {
  let value = 0;
  let max = 1;
  let temp = 0;

  // Phase 2 authority normalization fix: system.hp is the live, combat-
  // damage-tracked field for every actor type including vehicles —
  // ActorEngine.applyDamage()/SchemaAdapters.setHPUpdate() write ONLY
  // 'system.hp.value' (confirmed: no code path anywhere writes
  // system.hull.* after actor creation). system.hull is a one-time,
  // import-time mirror (vehicle-import-normalizer.js's normalizeHp()
  // writes both fields with identical values "to preserve the legacy hull
  // field for compatibility", then never touches hull again). Preferring
  // hull here — the previous behavior — meant a vehicle's displayed HP
  // silently stopped reflecting combat damage the moment it took any, for
  // every vehicle imported with a legacy hull object. hp-first matches
  // vehicle-import-normalizer.js's own documented intended priority
  // ("system.hp (modern) > system.hull (legacy) > bare number") and what
  // template.json's vehicle schema actually declares (only "hp", no
  // "hull" — hull is purely a runtime/legacy-import artifact, never part
  // of the schema). hull remains the fallback for the rare case where an
  // actor somehow has a populated hull but no hp object at all.
  if (system.hp && typeof system.hp === 'object') {
    value = safeNumber(system.hp.value, 0);
    max = safeNumber(system.hp.max, 1);
    temp = safeNumber(system.hp.temp, 0);
  } else if (system.hull && typeof system.hull === 'object') {
    value = safeNumber(system.hull.value, 0);
    max = safeNumber(system.hull.max, 1);
    temp = safeNumber(system.hull.temp, 0);
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

  // Always mirror source/statblock vehicle values into both the vehicle
  // shorthand keys (ref/fort) and the shared actor keys (reflex/fortitude).
  // Character-derived defaults often initialize to 10 first; vehicles must not
  // preserve those defaults over imported or GM-edited statblock values.
  const refDefense = buildDefenseValue(system.reflexDefense ?? system.defenses?.reflex?.total ?? system.defenses?.reflex ?? 10, 10);
  const fortDefense = buildDefenseValue(system.fortitudeDefense ?? system.defenses?.fortitude?.total ?? system.defenses?.fortitude ?? 10, 10);
  const willDefense = buildDefenseValue(system.willDefense ?? system.defenses?.will?.total ?? system.defenses?.will ?? 10, 10);
  const flatFootedDefense = buildDefenseValue(system.flatFooted ?? system.flatFootedDefense ?? system.defenses?.flatFooted?.total ?? system.defenses?.flatFooted ?? refDefense.total, 10);

  system.derived.defenses.ref = refDefense;
  system.derived.defenses.reflex = refDefense;
  system.derived.defenses.fort = fortDefense;
  system.derived.defenses.fortitude = fortDefense;
  system.derived.defenses.will = willDefense;
  system.derived.defenses.flatFooted = flatFootedDefense;

  // ════════════════════════════════════════════════════════════════════════════
  // DAMAGE: Threshold, reduction, and state
  // ════════════════════════════════════════════════════════════════════════════

  const vehicleDamageThreshold = safeNumber(system.damageThreshold ?? system.threshold, 10);
  system.derived.damage.threshold = vehicleDamageThreshold;
  system.derived.damage.reduction = safeNumber(system.damageReduction ?? system.damageReductionValue, 0);

  // Phase 2 authority normalization fix: also mirror onto the FLAT
  // system.derived.damageThreshold path (no ".damage." nesting) — the one
  // combat-facing consumers actually read (scripts/rolls/defenses.js's
  // calculateDamageThreshold(), and ThresholdEngine.calculateDamageThreshold()
  // in the default/RAW-rules configuration). Without this, DerivedCalculator.
  // computeAll()'s generic flat-DT block (character Fortitude total +
  // generic size bonus — a formula never designed for ships) runs
  // unconditionally for vehicles too and silently wins that field, so
  // combat resolution could read a different DT than the one displayed on
  // the vehicle sheet. This mirrors the same flat-field pattern droid
  // statblock mode already uses for the identical reason (droid-actor.js's
  // applyPublishedStatblockDerivedOverrides).
  system.derived.damageThreshold = vehicleDamageThreshold;

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

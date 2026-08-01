import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { hasOwnPath } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";

/**
 * Dark Side Points canonical-storage migration (Phase 2).
 *
 * Phase 1 made every DSP read path canonical-aware (DSPEngine.getValue()
 * checks actor._source to tell a genuinely-unpersisted legacy actor apart
 * from one with an intentionally-persisted canonical 0). This migration
 * backfills that canonical shape onto actor storage so worlds stop
 * depending on the read-time fallback, without removing that fallback —
 * unmigrated worlds and actors encountered before this runs still need it.
 *
 * Structured after scripts/migrations/json-backed-ids-migration.js (the
 * most complete existing example of this repo's migration shape), wired
 * into index.js's existing GM-gated ready hook alongside
 * repairWorldForcePowerAbilityMeta — the one migration pattern in this
 * repo that is actually invoked, rather than left orphaned.
 */

const MIGRATION_VERSION = '2026-08-01-dark-side-points-v1';
const SETTING_KEY = 'darkSidePointsPhase2Migration';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** The shape the old poison-engine bug produced: darkSideScore = { value: N }. */
function isMalformedLegacyObject(value) {
  return isPlainObject(value) && Number.isFinite(Number(value.value));
}

/** Recover a finite numeric DSP value from either a scalar or the malformed object shape. */
function recoverLegacyValue(persistedDarkSideScore) {
  if (isMalformedLegacyObject(persistedDarkSideScore)) {
    return Number(persistedDarkSideScore.value);
  }
  if (!isPlainObject(persistedDarkSideScore)) {
    const numeric = Number(persistedDarkSideScore);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

function isFiniteNonNegativeInteger(persisted, target) {
  return typeof persisted === 'number'
    && Number.isFinite(persisted)
    && persisted >= 0
    && Number.isInteger(persisted)
    && persisted === target;
}

/**
 * Compute the migration decision for a single actor, operating on
 * persisted source data (actor._source), never template-hydrated
 * prepared data — the same distinction DSPEngine.getValue() already
 * relies on for reads.
 *
 * @param {Actor} actor
 * @returns {{needsUpdate: boolean, update: object, malformedCanonicalRepaired: boolean, legacyObjectRecovered: boolean, legacyShapeCleaned: boolean}}
 */
export function computeDarkSidePointsMigration(actor) {
  const src = actor._source?.system ?? actor.system ?? {};

  const canonicalValuePersisted = hasOwnPath(src, 'darkSide.value');
  const persistedValue = canonicalValuePersisted ? src.darkSide.value : undefined;
  const canonicalValueNumeric = Number(persistedValue);
  const canonicalValueFiniteNonNegative = Number.isFinite(canonicalValueNumeric) && canonicalValueNumeric >= 0;

  const canonicalMaxPersisted = hasOwnPath(src, 'darkSide.max');
  const persistedMax = canonicalMaxPersisted ? src.darkSide.max : undefined;
  const canonicalMaxNumeric = Number(persistedMax);
  const canonicalMaxFiniteNonNegative = Number.isFinite(canonicalMaxNumeric) && canonicalMaxNumeric >= 0;

  const persistedDarkSideScore = hasOwnPath(src, 'darkSideScore') ? src.darkSideScore : undefined;

  let targetValue;
  let malformedCanonicalRepaired = false;
  let legacyObjectRecovered = false;

  if (canonicalValuePersisted && canonicalValueFiniteNonNegative) {
    // Valid persisted canonical value — preserve it (nearest-integer
    // normalization only; never overwritten by legacy data, even a
    // persisted 0 wins over a nonzero legacy scalar).
    targetValue = Math.max(0, Math.round(canonicalValueNumeric));
  } else {
    // Either canonical is absent, or it's present but malformed
    // (negative/NaN/Infinity/non-numeric) — in both cases, try to
    // recover a value from legacy storage before falling back to 0.
    const recovered = recoverLegacyValue(persistedDarkSideScore);
    if (recovered !== null) {
      targetValue = Math.max(0, Math.round(recovered));
      if (isMalformedLegacyObject(persistedDarkSideScore)) legacyObjectRecovered = true;
    } else {
      targetValue = 0;
    }
    if (canonicalValuePersisted) malformedCanonicalRepaired = true;
  }

  // Missing/malformed max always normalizes to 0 — the sentinel
  // DSPEngine.getMax() already treats as "derive from Wisdom x
  // multiplier." Never persist a Wisdom-derived snapshot here.
  const targetMax = (canonicalMaxPersisted && canonicalMaxFiniteNonNegative)
    ? Math.max(0, Math.ceil(canonicalMaxNumeric))
    : 0;

  // Idempotency is type/shape-sensitive, not just numeric-equality —
  // a persisted numeric string like "5" is not "already canonical"
  // merely because Number("5") === 5.
  const valueAlreadyValid = isFiniteNonNegativeInteger(persistedValue, targetValue);
  const maxAlreadyValid = isFiniteNonNegativeInteger(persistedMax, targetMax);

  // Independent of whether canonical value/max themselves need to
  // change — a valid canonical value alongside a malformed legacy
  // object still needs the legacy object cleaned up.
  const legacyShapeCleaned = isMalformedLegacyObject(persistedDarkSideScore);

  const needsCanonicalValueUpdate = !valueAlreadyValid;
  const needsCanonicalMaxUpdate = !maxAlreadyValid;
  const needsUpdate = needsCanonicalValueUpdate || needsCanonicalMaxUpdate || legacyShapeCleaned;

  const update = {};
  if (needsCanonicalValueUpdate) update['system.darkSide.value'] = targetValue;
  if (needsCanonicalMaxUpdate) update['system.darkSide.max'] = targetMax;
  if (legacyShapeCleaned) {
    // Deletion, never a value assignment — the established Foundry
    // field-removal syntax already used in phase5-compendium-heal.js.
    // No production write ever assigns a value to system.darkSideScore
    // after this migration; this key only ever removes it.
    update['system.-=darkSideScore'] = null;
  }

  return { needsUpdate, update, malformedCanonicalRepaired, legacyObjectRecovered, legacyShapeCleaned };
}

/**
 * Run the Dark Side Points canonical-storage migration for the current
 * world. GM-only, version-gated, idempotent — a second run against
 * already-migrated actors produces zero updates. The world-level version
 * only advances after a run with zero per-actor failures, so a partial
 * failure leaves the setting untouched and the next ready-hook cycle
 * retries; already-fixed actors are naturally skipped by the same
 * idempotency check that scopes this run.
 *
 * @param {object} [options]
 * @param {boolean} [options.silent=false]
 * @returns {Promise<object>} summary
 */
export async function migrateDarkSidePoints({ silent = false } = {}) {
  if (!game.user?.isGM) return null;

  const current = SettingsHelper.getSafe(SETTING_KEY, null);
  if (current === MIGRATION_VERSION) return null;

  if (!silent) SWSELogger.log(`[MIGRATION] Dark Side Points migration starting (${MIGRATION_VERSION})`);

  const actors = game.actors ? Array.from(game.actors) : [];
  const summary = {
    inspected: actors.length,
    migrated: 0,
    malformedCanonicalRepaired: 0,
    legacyObjectRecovered: 0,
    legacyShapeCleaned: 0,
    skipped: 0,
    failures: [],
    versionAdvanced: false
  };

  for (const actor of actors) {
    const decision = computeDarkSidePointsMigration(actor);
    if (!decision.needsUpdate) {
      summary.skipped += 1;
      continue;
    }

    try {
      await ActorEngine.updateActor(actor, decision.update, {
        diff: true,
        // system.darkSide.* is not consumed by DerivedCalculator, so a
        // full recalcAll() per migrated actor is unnecessary work for a
        // world-wide background pass; suppressAppRefresh/render:false
        // avoid repainting any actor sheets a GM happens to have open
        // while this runs.
        skipRecalc: true,
        suppressAppRefresh: true,
        render: false,
        source: 'dark-side-points-phase2-migration',
        meta: { origin: 'migration', version: MIGRATION_VERSION, guardKey: 'dark-side-points-phase2' }
      });
      summary.migrated += 1;
      if (decision.malformedCanonicalRepaired) summary.malformedCanonicalRepaired += 1;
      if (decision.legacyObjectRecovered) summary.legacyObjectRecovered += 1;
      if (decision.legacyShapeCleaned) summary.legacyShapeCleaned += 1;
    } catch (e) {
      SWSELogger.warn(`[MIGRATION] Failed migrating Dark Side Points for actor ${actor.id} (${actor.name})`, e);
      summary.failures.push({ actorId: actor.id, actorName: actor.name, error: String(e?.message ?? e) });
    }
  }

  SWSELogger.log(
    `[MIGRATION] Dark Side Points migration complete. Migrated: ${summary.migrated}/${summary.inspected}, ` +
    `skipped: ${summary.skipped}, malformed canonical repaired: ${summary.malformedCanonicalRepaired}, ` +
    `legacy objects recovered: ${summary.legacyObjectRecovered}, legacy shapes cleaned: ${summary.legacyShapeCleaned}, ` +
    `failures: ${summary.failures.length}`
  );

  if (summary.failures.length === 0) {
    await HouseRuleService.set(SETTING_KEY, MIGRATION_VERSION);
    summary.versionAdvanced = true;
  } else {
    SWSELogger.warn(`[MIGRATION] Dark Side Points migration had ${summary.failures.length} failure(s); version not advanced, will retry next ready cycle.`);
  }

  return summary;
}

export { MIGRATION_VERSION };

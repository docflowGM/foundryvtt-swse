/**
 * Droid Statblock Conversion Service
 *
 * PHASE 3 — Droid Stock-Statblock Authority.
 *
 * The only authority permitted to move a droid actor out of
 * stock-statblock calculation mode (see
 * scripts/actors/droid/droid-mode-adapter.js) into playable-derived mode,
 * or to roll that conversion back. Nothing else may write
 * system.droidCalculationMode after import — enforced by
 * tools/check-droid-calculation-mode-authority.mjs.
 *
 * Reuses existing, already-approved primitives rather than inventing a new
 * transaction mechanism:
 *   - scripts/engine/progression/utils/snapshot-manager.js's
 *     createSnapshot()/restoreSnapshot() (the same snapshot store
 *     level-up/chargen already use) for the pre-conversion snapshot and
 *     rollback.
 *   - scripts/governance/actor-engine/actor-engine.js's
 *     applyMutationPlan() for the actual mode-flip + weapon-flag mutation.
 *   - scripts/domain/droids/droid-installed-component-resolver.js (Phase 1)
 *     for reporting canonical installed components in the inspection.
 *   - scripts/actors/derived/derived-calculator.js's computeAll() — called
 *     read-only (its return value is never merged into the actor) purely to
 *     report what playable-derived math WOULD currently produce, for the
 *     inspection's discrepancy report.
 *
 * Does not invent classes, levels, feats, or talents to reproduce the
 * published statblock — a converted droid may legitimately have different
 * derived totals until a GM/player supplies progression.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SnapshotManager } from "/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js";
import { resolveDroidCalculationMode, DROID_CALCULATION_MODE } from "/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js";
import { resolveInstalledDroidComponents } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-installed-component-resolver.js";
import { getDroidPartDefinition, normalizeDroidPartId } from "/systems/foundryvtt-swse/scripts/data/droid-part-schema.js";

const CONVERSION_SNAPSHOT_LABEL = 'Pre-conversion snapshot (Droid Statblock → Playable)';

function canActOnConversion(actor) {
  return Boolean(game?.user?.isGM) || actor?.isOwner === true;
}

function itemsArray(actor) {
  const items = actor?.items;
  if (!items) return [];
  if (typeof items.contents !== 'undefined') return items.contents;
  return Array.isArray(items) ? items : Array.from(items);
}

function stockAttackWeapons(actor) {
  return itemsArray(actor).filter(item => item?.flags?.swse?.stockDroidAttack?.sourceStatblock === true);
}

/**
 * Non-mutating report of a stock-statblock droid's current state, for a GM
 * to review before deciding whether to convert.
 *
 * @param {Actor} actor
 * @returns {Promise<object>}
 */
export async function inspectConversion(actor) {
  const resolution = resolveDroidCalculationMode(actor);
  const warnings = [...resolution.warnings];

  if (!actor || actor.type !== 'droid') {
    return { safeToConvert: false, error: 'Not a droid actor', calculationMode: resolution };
  }

  const importState = actor.flags?.swse?.stockDroidImport ?? null;
  const publishedTotals = importState?.publishedTotals ?? null;

  const installedResolution = resolveInstalledDroidComponents(actor, {
    normalizeId: normalizeDroidPartId,
    getDefinition: (id) => getDroidPartDefinition(id)
  });

  const stockWeapons = stockAttackWeapons(actor).map(item => ({
    id: item.id,
    name: item.name,
    publishedAttackTotal: item.flags?.swse?.stockDroidAttack?.publishedAttackTotal ?? null,
    mode: item.flags?.swse?.stockDroidAttack?.mode ?? null,
    canMapToOrdinaryWeapon: Boolean(item.system?.damage)
  }));

  const classLevels = Array.isArray(actor.system?.progression?.classLevels) ? actor.system.progression.classLevels : [];

  let reproducedDerived = null;
  let discrepancies = [];
  try {
    const { DerivedCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js');
    // Read-only: computeAll() returns an updates object; we never merge it
    // back into the actor, so this cannot silently overwrite anything.
    const updates = await DerivedCalculator.computeAll(actor);
    reproducedDerived = {
      bab: updates?.['system.derived.bab'] ?? null,
      defenses: {
        fortitude: updates?.['system.derived.defenses']?.fortitude?.total ?? null,
        reflex: updates?.['system.derived.defenses']?.reflex?.total ?? null,
        will: updates?.['system.derived.defenses']?.will?.total ?? null
      },
      damageThreshold: updates?.['system.derived.damageThreshold'] ?? null
    };

    if (publishedTotals) {
      if (Number.isFinite(publishedTotals.bab) && reproducedDerived.bab !== null && publishedTotals.bab !== reproducedDerived.bab) {
        discrepancies.push({ field: 'bab', published: publishedTotals.bab, reproducedDerived: reproducedDerived.bab });
      }
      for (const key of ['fortitude', 'reflex', 'will']) {
        const publishedValue = publishedTotals.defenses?.[key];
        const reproducedValue = reproducedDerived.defenses[key];
        if (Number.isFinite(publishedValue) && reproducedValue !== null && publishedValue !== reproducedValue) {
          discrepancies.push({ field: `defenses.${key}`, published: publishedValue, reproducedDerived: reproducedValue });
        }
      }
      if (Number.isFinite(publishedTotals.threshold) && reproducedDerived.damageThreshold !== null && publishedTotals.threshold !== reproducedDerived.damageThreshold) {
        discrepancies.push({ field: 'damageThreshold', published: publishedTotals.threshold, reproducedDerived: reproducedDerived.damageThreshold });
      }
    }
  } catch (err) {
    warnings.push(`Could not compute a preview of playable-derived totals: ${err.message}`);
  }

  if (!publishedTotals) warnings.push('No published totals snapshot found on this actor.');
  if (resolution.mode !== DROID_CALCULATION_MODE.STOCK_STATBLOCK) {
    warnings.push('This actor is not currently in stock-statblock mode.');
  }

  return {
    calculationMode: resolution,
    stockImportSource: importState ? { sourceId: importState.sourceId, sourceName: importState.sourceName, importedAt: importState.importedAt, schemaVersion: importState.schemaVersion } : null,
    publishedTotals,
    classLevels,
    canonicalInstalledComponents: installedResolution.components.map(c => ({ canonicalId: c.canonicalId, category: c.category, installed: c.installed, active: c.active })),
    embeddedItems: itemsArray(actor).map(item => ({ id: item.id, name: item.name, type: item.type })),
    stockAttackWeapons: stockWeapons,
    reproducedDerived,
    discrepancies,
    warnings,
    // "Safe" means the actor is actually eligible for conversion (a droid
    // currently in stock-statblock mode) — discrepancies and warnings are
    // reported for the GM to review, not treated as hard blockers, since a
    // published statblock legitimately diverging from classless-derived
    // math is the expected, normal case, not an error condition.
    safeToConvert: resolution.mode === DROID_CALCULATION_MODE.STOCK_STATBLOCK
  };
}

/**
 * Convert a stock-statblock droid to playable-derived mode. Atomic
 * (snapshot before, restore on failure), routed entirely through
 * ActorEngine/SnapshotManager. Requires GM or owner permission.
 *
 * Does NOT invent classes, levels, feats, or talents. Does NOT touch the
 * canonical installedSystems ledger (Phase 1/2 policy is unaffected).
 * Neutralizes stock-only attack-total behavior on each integrated weapon by
 * clearing sourceStatblock (kept as metadata history rather than deleted
 * outright, so rollback can restore it exactly).
 *
 * @param {Actor} actor
 * @param {object} [options]
 * @returns {Promise<{success: boolean, error?: string, snapshotTimestamp?: number}>}
 */
export async function convertToPlayableDerived(actor, options = {}) {
  if (!actor || actor.type !== 'droid') {
    return { success: false, error: 'Not a droid actor' };
  }
  if (!canActOnConversion(actor)) {
    return { success: false, error: 'Only the GM or an owner may convert this droid.' };
  }
  const resolution = resolveDroidCalculationMode(actor);
  if (resolution.mode !== DROID_CALCULATION_MODE.STOCK_STATBLOCK) {
    return { success: false, error: 'Actor is not currently in stock-statblock mode.' };
  }

  let snapshot = null;
  try {
    snapshot = await SnapshotManager.createSnapshot(actor, options.snapshotLabel || CONVERSION_SNAPSHOT_LABEL);

    const timestamp = Date.now();
    const plan = {
      set: {
        'system.droidCalculationMode': DROID_CALCULATION_MODE.PLAYABLE_DERIVED,
        'flags.swse.stockDroidImport.convertedAt': timestamp,
        'flags.swse.stockDroidConversion.convertedAt': timestamp,
        'flags.swse.stockDroidConversion.snapshotTimestamp': snapshot.timestamp,
        'flags.swse.stockDroidConversion.sourceName': actor.flags?.swse?.stockDroidImport?.sourceName ?? null
      }
    };

    const stockWeapons = stockAttackWeapons(actor);
    if (stockWeapons.length > 0) {
      plan.update = {
        items: stockWeapons.map(item => ({
          _id: item.id,
          'flags.swse.stockDroidAttack.sourceStatblock': false
        }))
      };
    }

    await ActorEngine.applyMutationPlan(actor, plan, {
      source: 'DroidStatblockConversionService.convertToPlayableDerived',
      validate: true,
      rederive: true
    });

    SWSELogger.log(`[DroidStatblockConversionService] Converted ${actor.name} to playable-derived mode.`);
    return { success: true, snapshotTimestamp: snapshot.timestamp };
  } catch (err) {
    SWSELogger.error('[DroidStatblockConversionService] Conversion failed; attempting rollback:', err);
    try {
      if (snapshot) {
        // ROUND-2 CORRECTION: requireExact: true — an inexact rollback
        // (a partial-identity or root-mismatch restore) must be treated
        // as a FAILED rollback, not silently accepted with only a log
        // line. restoreSnapshotExact() itself now fails closed (running
        // its own bounded compensation) whenever requireExact is set and
        // the restore comes back inexact.
        const restored = await SnapshotManager.restoreSnapshotExact(actor, snapshot.timestamp, { requireExact: true });
        if (!restored.success) {
          SWSELogger.error('[DroidStatblockConversionService] Rollback after failed conversion ALSO failed or was not identity-exact:', restored);
          return { success: false, code: 'CONVERSION_ROLLBACK_FAILED', error: `Conversion failed and rollback failed: ${err.message}`, actorId: actor.id };
        }
      }
    } catch (restoreErr) {
      SWSELogger.error('[DroidStatblockConversionService] Rollback after failed conversion ALSO failed:', restoreErr);
      return { success: false, code: 'CONVERSION_ROLLBACK_FAILED', error: `Conversion failed and rollback failed: ${err.message}`, actorId: actor.id };
    }
    return { success: false, error: err.message };
  }
}

/**
 * Roll back a previously-converted droid to its pre-conversion
 * stock-statblock state, restoring published totals, stock attack
 * behavior, and calculation mode via the snapshot taken at conversion time.
 *
 * PHASE 4 — Converted-System Reconciliation audited this rollback against
 * the actual restore implementation (scripts/governance/snapshot/snapshot-service.js#restoreFromSnapshot,
 * not assumed): it fully replaces `system` (so `system.droidCalculationMode`,
 * the canonical ledger, and every published field are correctly restored)
 * and fully deletes+recreates every Item and ActiveEffect (so stock attack
 * flags and conversion-time weapon neutralization are correctly undone
 * too) — this was already a genuine full-actor restore, not a narrow
 * snapshot pointer, so no new rollback mechanism was needed. It confirmed
 * one real gap: `restoreFromSnapshot` never touched `actor.flags` at all,
 * so `flags.swse.stockDroidConversion`'s own record would otherwise keep
 * showing a stale "converted at" timestamp for a droid that this call just
 * put back into stock-statblock mode — cosmetic only (resolveDroidCalculationMode()
 * never reads this flag; only `system.droidCalculationMode`, which IS
 * correctly restored), but confusing for diagnostics/sheet history.
 *
 * PHASE 10 ADDENDUM (P1-7): snapshot restoration is now exact and
 * deletion-aware (see snapshot-service.js), which means restoring flags
 * to their pre-conversion state DELETES `flags.swse.stockDroidConversion`
 * entirely (it didn't exist before the conversion snapshot was taken).
 * Re-stamping only `rolledBackAt` afterward on a bare object would
 * therefore silently drop `snapshotTimestamp`, breaking a second,
 * idempotent rollback attempt (it reads `snapshotTimestamp` to find the
 * snapshot again). The record is captured before the restore and
 * reapplied in full, with `rolledBackAt` stamped on top, so repeated
 * rollback stays stable. Migrated to `restoreSnapshotExact()` so a
 * partial/inexact restore is reported honestly instead of silently
 * treated as full success.
 *
 * @param {Actor} actor
 * @returns {Promise<{success: boolean, error?: string, exact?: boolean}>}
 */
export async function rollbackConversion(actor) {
  if (!actor || actor.type !== 'droid') {
    return { success: false, error: 'Not a droid actor' };
  }
  if (!canActOnConversion(actor)) {
    return { success: false, error: 'Only the GM or an owner may roll back this conversion.' };
  }
  const snapshotTimestamp = actor.flags?.swse?.stockDroidConversion?.snapshotTimestamp;
  if (!Number.isFinite(snapshotTimestamp)) {
    return { success: false, error: 'No conversion snapshot found on this actor — nothing to roll back.' };
  }
  // Deep-cloned: root restoration mutates `actor.flags.swse.stockDroidConversion`
  // in place (deleting individual leaf keys off the live object) when the
  // pre-conversion snapshot's `flags.swse` branch already existed with
  // other content (e.g. `stockDroidImport`) — a bare reference here would
  // observe itself stripped down to `{}` by the time it's read below.
  const previousConversionRecord = actor.flags?.swse?.stockDroidConversion
    ? foundry.utils.deepClone(actor.flags.swse.stockDroidConversion)
    : null;

  try {
    // ROUND-2 CORRECTION: requireExact: true — an inexact restore (a
    // root/content mismatch, or Foundry failing to honor keepId on a
    // recreated Item) is now treated as a rollback FAILURE, not silently
    // accepted as success with only a warning logged.
    const restored = await SnapshotManager.restoreSnapshotExact(actor, snapshotTimestamp, { requireExact: true });
    if (!restored.success) {
      SWSELogger.error(`[DroidStatblockConversionService] Rollback restore failed for ${actor.name} at step "${restored.failedStep}".`, restored);
      return { success: false, error: restored.error || 'Conversion snapshot could not be found or restored, or the restore was not identity-exact.' };
    }
    // restoreSnapshotExact() restores flags to their pre-conversion state,
    // which deletes `flags.swse.stockDroidConversion` outright — reapply
    // the full previous record (not just a bare new key) with
    // `rolledBackAt` stamped on top so a subsequent rollback attempt can
    // still find `snapshotTimestamp` (see doc comment above).
    await ActorEngine.applyMutationPlan(actor, {
      set: {
        'flags.swse.stockDroidConversion': {
          ...(previousConversionRecord ?? {}),
          rolledBackAt: Date.now()
        }
      }
    }, { source: 'DroidStatblockConversionService.rollbackConversion', validate: false, rederive: true });
    SWSELogger.log(`[DroidStatblockConversionService] Rolled back conversion for ${actor.name}.`, { exact: restored.exact });
    return { success: true, exact: restored.exact };
  } catch (err) {
    SWSELogger.error('[DroidStatblockConversionService] Rollback failed:', err);
    return { success: false, error: err.message };
  }
}

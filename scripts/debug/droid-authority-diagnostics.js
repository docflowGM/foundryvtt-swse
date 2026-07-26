/**
 * Droid Authority Diagnostics
 *
 * Phase 1/2 — Droid Authority Consolidation developer utility.
 *
 * Reports, for one droid Actor, exactly what
 * scripts/domain/droids/droid-installed-component-resolver.js resolved:
 * canonical component id, effective installed/enabled/active state, which
 * source won precedence, every persisted source record (so a GM/dev can see
 * *why* a component reads the way it does), any cross-source conflicts, and
 * the modifiers ModifierEngine would apply for each active component. Phase
 * 2 adds pre-existing installation drift detection (see
 * scripts/domain/droids/droid-installation-reconciler.js) — components that
 * are mechanically active only because of a stray embedded Item left behind
 * by a removal performed before Phase 2's embedded-Item reconciliation
 * existed. This does not create chat messages, UI, or recurring console
 * output — it is opt-in, call-it-when-you-need-it, same convention as
 * scripts/debug/actor-contract-inspector.js.
 *
 * Usage (from the console or a debug script):
 *   const { diagnoseDroidAuthority } = await import(
 *     '/systems/foundryvtt-swse/scripts/debug/droid-authority-diagnostics.js'
 *   );
 *   const report = diagnoseDroidAuthority(game.actors.get('...'));
 *   console.log(report.summary());
 *   console.table(report.components);
 *   console.table(report.driftIssues);
 *   // To repair a specific flagged issue (deletes the named embedded Item(s)):
 *   const { repairDroidInstallationDrift } = await import(
 *     '/systems/foundryvtt-swse/scripts/domain/droids/droid-installation-reconciler.js'
 *   );
 *   await repairDroidInstallationDrift(actor, [report.driftIssues[0]]);
 */

import { getDroidPartDefinition, hydrateDroidPart, normalizeDroidPartId } from "/systems/foundryvtt-swse/scripts/data/droid-part-schema.js";
import { resolveInstalledDroidComponents } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-installed-component-resolver.js";
import { diagnoseDroidInstallationDrift } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-installation-reconciler.js";
import { resolveDroidCalculationMode } from "/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js";

function describeModifiers(component, activeIds) {
  if (!component.active || !component.definition) return [];
  const hydrated = hydrateDroidPart({ id: component.canonicalId }, { installedIds: activeIds });
  return (hydrated.modifiers ?? [])
    .filter(mod => mod && mod.active !== false && String(mod.target || '').trim() && Number(mod.value) !== 0)
    .map(mod => ({ target: mod.target, type: mod.type ?? 'untyped', value: Number(mod.value) || 0 }));
}

export function diagnoseDroidAuthority(actor) {
  if (!actor || actor.type !== 'droid') {
    return {
      actorName: actor?.name ?? 'Unknown',
      error: 'Not a droid actor',
      components: [],
      conflicts: [],
      warnings: [],
      summary: () => `[Droid Authority] ${actor?.name ?? 'Unknown'}: not a droid actor.`
    };
  }

  const resolution = resolveInstalledDroidComponents(actor, {
    normalizeId: normalizeDroidPartId,
    getDefinition: (id) => getDroidPartDefinition(id)
  });
  const activeIds = resolution.components.filter(c => c.active).map(c => c.canonicalId);

  const components = resolution.components.map(component => ({
    canonicalId: component.canonicalId,
    category: component.category,
    slot: component.slot,
    installed: component.installed,
    enabled: component.enabled,
    active: component.active,
    resolvedFrom: component.primarySource?.kind ?? 'unresolved',
    hasDefinition: Boolean(component.definition),
    sourceCount: component.sources.length,
    sources: component.sources,
    conflicts: component.conflicts,
    legacy: component.legacy,
    expectedModifiers: describeModifiers(component, activeIds)
  }));

  const legacyModifications = resolution.legacyModifications.map(mod => ({
    id: mod.id,
    name: mod.name,
    enabled: mod.enabled,
    modifierCount: mod.modifiers.length
  }));

  const driftIssues = diagnoseDroidInstallationDrift(resolution).issues;

  // PHASE 3 — Droid Stock-Statblock Authority. Cheap, synchronous fields
  // only (calculation mode, stored published totals, stock attack
  // contracts, conversion snapshot status) so diagnoseDroidAuthority() stays
  // synchronous for existing callers. For a full discrepancy report against
  // a live recomputation of playable-derived math, use
  // scripts/domain/droids/droid-statblock-conversion-service.js's
  // (async) inspectConversion(actor) instead.
  const calculationMode = resolveDroidCalculationMode(actor);
  const importState = actor.flags?.swse?.stockDroidImport ?? null;
  const conversionState = actor.flags?.swse?.stockDroidConversion ?? null;
  // PHASE 4 — Converted-System Reconciliation.
  const reconciliationState = actor.flags?.swse?.stockDroidReconciliation ?? null;
  const itemList = typeof actor.items?.contents !== 'undefined' ? actor.items.contents : Array.from(actor.items ?? []);
  const stockAttackContracts = itemList
    .filter(item => item?.flags?.swse?.stockDroidAttack)
    .map(item => ({
      itemId: item.id,
      name: item.name,
      publishedAttackTotal: item.flags.swse.stockDroidAttack.publishedAttackTotal ?? null,
      mode: item.flags.swse.stockDroidAttack.mode ?? null,
      sourceStatblock: item.flags.swse.stockDroidAttack.sourceStatblock === true
    }));

  return {
    actorName: actor.name,
    components,
    legacyModifications,
    conflicts: resolution.conflicts,
    warnings: resolution.warnings,
    driftIssues,
    stockStatblock: {
      calculationMode,
      importSource: importState ? { sourceId: importState.sourceId, sourceName: importState.sourceName, schemaVersion: importState.schemaVersion, importedAt: importState.importedAt } : null,
      publishedTotals: importState?.publishedTotals ?? null,
      conversionRecord: conversionState ? { convertedAt: conversionState.convertedAt, snapshotTimestamp: conversionState.snapshotTimestamp, sourceName: conversionState.sourceName, rolledBackAt: conversionState.rolledBackAt ?? null } : null,
      reconciliationRecord: reconciliationState ? { reconciledAt: reconciliationState.reconciledAt, snapshotTimestamp: reconciliationState.snapshotTimestamp, reconciledIds: reconciliationState.reconciledIds ?? [], rolledBackAt: reconciliationState.rolledBackAt ?? null } : null,
      stockAttackContracts
    },
    summary() {
      const active = components.filter(c => c.active).length;
      const inactive = components.length - active;
      const lines = [
        `[Droid Authority] ${actor.name}: ${components.length} component(s) resolved (${active} active, ${inactive} inactive/disabled), ${legacyModifications.length} freeform legacy mod(s), ${resolution.conflicts.length} conflict(s), ${resolution.warnings.length} warning(s), ${driftIssues.length} pre-existing drift issue(s).`,
        `[Droid Authority] Calculation mode: ${calculationMode.mode} (${calculationMode.explicit ? 'explicit' : calculationMode.inferred ? 'inferred' : 'default'}, reason: ${calculationMode.reason}).`
      ];
      for (const conflict of resolution.conflicts) lines.push(`  CONFLICT: ${conflict.message}`);
      for (const warning of resolution.warnings) lines.push(`  WARNING: ${warning}`);
      for (const issue of driftIssues) lines.push(`  DRIFT: ${issue.message}`);
      for (const warning of calculationMode.warnings) lines.push(`  MODE WARNING: ${warning}`);
      return lines.join('\n');
    }
  };
}

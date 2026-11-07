/**
 * Droid Customization Engine
 *
 * Phase 4: Dedicated droid customization lane
 *
 * This engine handles real-time droid system modifications (add/remove systems).
 * Unlike generic first-wave customization (weapons/armor/gear), droids have:
 * - Their own system types (locomotion, processor, armor, appendages, sensors)
 * - Their own pricing authority (DROID_SYSTEMS from droid chargen)
 * - Chassis/degree restrictions on system eligibility
 * - Distinct mutation model (installed systems, not slots)
 *
 * CRITICAL REUSE RULE:
 * This engine REUSES the existing droid chargen authority for all system definitions,
 * prices, and eligibility rules. If chargen knows what a system costs, customization
 * asks chargen instead of inventing the value. This avoids drift between chargen and
 * later droid editing.
 *
 * MUTATION AUTHORITY:
 * All mutations route through ActorEngine.applyMutationPlan().
 * The UI is purely requester/viewer; no direct item.update() or actor.update().
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/core/logger.js';
import { DROID_SYSTEMS } from '/systems/foundryvtt-swse/scripts/data/droid-systems.js';
import { computeDroidPartCost, getAllDroidPartDefinitions, getDroidCostFactor, getDroidPartDefinition, hydrateDroidPart, normalizeDroidPartId, resolveDroidPartQuoteDetailed, collectInstalledComponentEvidence, findConfirmedHostInstance } from '/systems/foundryvtt-swse/scripts/data/droid-part-schema.js';
import { followsDroidRules } from '/systems/foundryvtt-swse/scripts/domain/droids/droid-rules-profile.js';
import { evaluateInstallationEligibility } from '/systems/foundryvtt-swse/scripts/domain/droids/droid-installation-eligibility.js';
import { resolveInstalledDroidComponents } from '/systems/foundryvtt-swse/scripts/domain/droids/droid-installed-component-resolver.js';
import {
  appendageMirrorBucket, auditAppendageMirror, dependentsOfInstance, findInstance, instancesOfPart, isPhysicalAppendageDefinition,
  ledgerKeyForInstance, mintInstanceId, mintLocationId, takenIdentities
} from '/systems/foundryvtt-swse/scripts/domain/droids/droid-appendage-instance.js';
import { TransactionEngine } from '/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js';


function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value.values === 'function') return Array.from(value.values());
  return Array.from(value ?? []);
}

function humanize(value) {
  return String(value ?? '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function normalizedCredits(actor) {
  return Number(actor?.system?.credits ?? actor?.system?.currency?.credits ?? actor?.system?.wealth?.credits ?? 0) || 0;
}

/**
 * Canonical ids of every component the shared resolver considers physically
 * present on this droid — regardless of enabled/active state, since a
 * disabled or reserve part is still occupying a slot and must not be
 * eligible for purchase again. Sourced from
 * scripts/domain/droids/droid-installed-component-resolver.js instead of
 * this function's own id/name matching so the Garage's "already installed"
 * check agrees with the sheet and with ModifierEngine (PHASE 1 — Droid
 * Authority Consolidation).
 */
function collectInstalledComponents(actor) {
  const resolution = resolveInstalledDroidComponents(actor, {
    normalizeId: normalizeDroidPartId,
    getDefinition: (id) => getDroidPartDefinition(id)
  });
  return resolution.components.filter(c => c.installed);
}

/**
 * CONFIRMED hardware: components whose deciding (highest-precedence) evidence
 * is a well-formed, installed `system.installedSystems` ledger record. This is
 * the ONLY evidence that may authorize a removal or a resale credit. Mirror
 * (`system.droidSystems`), embedded-Item and legacy-mod evidence only means the
 * hardware is PRESENT: it still blocks a duplicate purchase (see
 * collectInstalledComponents) but is never sellable (U-0 finding F7).
 */
function collectConfirmedComponents(actor) {
  return collectInstalledComponents(actor).filter(c => c.primarySource?.kind === 'installedLedger');
}

function collectInstalledDroidPartIds(actor) {
  return new Set(collectInstalledComponents(actor).map(c => c.canonicalId));
}

function definitionFor(systemId) {
  const id = normalizeDroidPartId(systemId);
  return getAllDroidPartDefinitions().find(def => normalizeDroidPartId(def.id) === id || normalizeDroidPartId(def.name) === id) ?? null;
}

function cleanIdentity(value) {
  const text = String(value ?? '').trim();
  return text || null;
}

/**
 * Published appendage kinds a component must be fitted to (Gate A typed
 * prerequisite `requiresAppendage`). The TYPE compatibility decision itself
 * stays in droid-component-prerequisites.js; this only says whether a host
 * must be selected at all.
 */
function requiredHostTypes(definition) {
  const raw = definition?.source?.requiresAppendage;
  return (Array.isArray(raw) ? raw : raw == null ? [] : [raw])
    .map(value => String(value ?? '').trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Resolve the appendage instance a component is to be fitted to, from the
 * installation LEDGER (the display mirror is never consulted for identity).
 * Returns the `selectedAppendage` the shared quote/prerequisite authority
 * consumes. A price is not an installation permit: this only identifies the
 * host; the typed prerequisites still decide whether it is an allowed one.
 */
function resolveHostForPart(actor, definition, hostInstanceId) {
  const types = requiredHostTypes(definition);
  const hostId = cleanIdentity(hostInstanceId);
  if (!types.length) {
    if (hostId) {
      return { success: false, error: `${definition?.name ?? 'This component'} does not attach to a selected appendage.`, blockingReason: 'Host binding not supported' };
    }
    return { success: true, selectedAppendage: null, host: null };
  }
  if (!hostId) {
    return { success: false, error: `Select the installed ${types.join(' or ')} appendage ${definition?.name ?? 'this component'} is fitted to.`, blockingReason: 'Host appendage required' };
  }
  const host = findConfirmedHostInstance(actor, hostId);
  if (!host) {
    return { success: false, error: 'The selected appendage is not a confirmed, installed physical appendage on this droid.', blockingReason: 'Host appendage not installed' };
  }
  return {
    success: true,
    host,
    selectedAppendage: { id: normalizeDroidPartId(host.partId), instanceId: host.instanceId }
  };
}

function hasBackupProcessorSlot(actor) {
  // Post-creation authority: the backup slot exists only if the installation
  // LEDGER records a backup processor. A droidSystems mirror / stock-blob entry
  // (processorSlots.backup, backupProcessor) is display data and never
  // authorizes a second primary processor.
  return collectInstalledComponentEvidence(actor).confirmedIds.includes('backup-processor');
}

function isPrimaryProcessor(def) {
  return def?.category === 'processor' && (String(def?.slot ?? '').includes('primary') || ['basic-processor', 'heuristic-processor', 'remote-processor', 'military-processor'].includes(normalizeDroidPartId(def?.id)));
}

function droidPartEntry(def, actor, extra = {}) {
  // `selectedAppendage` is a quote/prerequisite INPUT (Gate A typed host), not
  // part data, and `restrictions` are already-established engine restrictions
  // for the eligibility decision; neither is spread into the returned entry or
  // the ledger payload.
  const { selectedAppendage = null, restrictions = [], ...entryExtra } = extra;
  const hydrated = hydrateDroidPart(def, { actor, installedIds: Array.from(collectInstalledDroidPartIds(actor)), selectedAppendage });
  // GATE C-2: a price is not an installation permit. Quote and eligibility are
  // separate results; `compatible` now means ELIGIBLE (source clearance +
  // confirmed-evidence prerequisites + exact quote + no pending host ruling +
  // no established restriction), never merely "has a price".
  const staged = resolveDroidPartQuoteDetailed(actor, hydrated, { selectedAppendage });
  const cost = staged.quote.credits;
  const eligibility = evaluateInstallationEligibility({
    componentId: normalizeDroidPartId(hydrated.ruleId ?? hydrated.id),
    stages: staged.stages,
    quote: staged.quote,
    restrictions
  });
  const quoteBlocked = hydrated.quoteStatus !== 'OK' || !Number.isFinite(cost) || cost < 0;
  return {
    id: normalizeDroidPartId(hydrated.ruleId ?? hydrated.id),
    name: hydrated.name,
    description: hydrated.description,
    type: hydrated.category || def?.category || 'accessory',
    category: hydrated.category || def?.category || 'accessory',
    slot: hydrated.slot || def?.slot || '',
    sourcePath: def?.sourcePath ?? '',
    installed: collectInstalledDroidPartIds(actor).has(normalizeDroidPartId(hydrated.ruleId ?? hydrated.id)),
    compatible: eligibility.installable,
    eligibility,
    blockingReason: eligibility.reasons[0]?.message ?? null,
    quoteStatus: hydrated.quoteStatus,
    cost,
    weight: hydrated.weight,
    resale: quoteBlocked ? null : Math.floor(cost * 0.5),
    availability: hydrated.availability ?? '-',
    prerequisites: [...(hydrated.prerequisiteIds ?? []), ...(hydrated.prerequisiteAnyIds ?? [])],
    modifiers: hydrated.modifiers ?? [],
    features: hydrated.features ?? [],
    restrictions: hydrated.restrictions ?? [],
    weaponProfile: hydrated.weaponProfile ?? null,
    rules: hydrated.rules ?? {},
    ...entryExtra
  };
}

function fail(error, blockingReason) {
  return { success: false, error, blockingReason, add: [], remove: [], addSpecs: [], removeSpecs: [] };
}

function parseAddSpec(raw) {
  if (raw && typeof raw === 'object') {
    return { id: normalizeDroidPartId(raw.id ?? raw.name), hostInstanceId: cleanIdentity(raw.hostInstanceId) };
  }
  return { id: normalizeDroidPartId(raw), hostInstanceId: null };
}

function parseRemoveSpec(raw) {
  if (raw && typeof raw === 'object') {
    return { id: normalizeDroidPartId(raw.id ?? raw.name), instanceId: cleanIdentity(raw.instanceId) };
  }
  return { id: normalizeDroidPartId(raw), instanceId: null };
}

/**
 * Normalize and validate a proposed droid customization change set BEFORE
 * any pricing is computed. Closes the resale exploit where a caller could
 * request removal of a system never actually installed (paying resale for
 * nothing), repeat the same removal id to multiply resale, or request the
 * same id in both `add` and `remove`.
 *
 * GATE C-1: entries are either a part id string (the original contract) or an
 * object. `add` objects may name the appendage a component is fitted to
 * (`{ id, hostInstanceId }`); `remove` objects name ONE physical instance
 * (`{ id, instanceId }`). A bare part id that matches more than one physical
 * instance is ambiguous and is refused rather than guessed, and a host with
 * fitted components cannot be removed from under them.
 *
 * Every physical appendage the droid already has is irrelevant to a new
 * purchase of that kind (Core p.190: any number of appendages); every other
 * component keeps the one-per-droid "already installed" rule.
 *
 * @param {Actor} actor
 * @param {{add?: Array<string|{id:string,hostInstanceId?:string}>, remove?: Array<string|{id:string,instanceId?:string}>}} changeSet
 * @returns {{success: boolean, error?: string, blockingReason?: string, add: string[], remove: string[], addSpecs: object[], removeSpecs: object[]}}
 */
function normalizeDroidCustomizationChangeSet(actor, changeSet = {}) {
  const rawAdd = Array.isArray(changeSet.add) ? changeSet.add : [];
  const rawRemove = Array.isArray(changeSet.remove) ? changeSet.remove : [];

  // Deduplicate each list independently (order-preserving) before any
  // cross-list or installed-state check runs.
  const addSpecs = [];
  const seenAdd = new Set();
  for (const spec of rawAdd.map(parseAddSpec)) {
    const key = `${spec.id}|${spec.hostInstanceId ?? ''}`;
    if (seenAdd.has(key)) continue;
    seenAdd.add(key);
    addSpecs.push(spec);
  }
  const removeRequests = [];
  const seenRemoveRequest = new Set();
  for (const spec of rawRemove.map(parseRemoveSpec)) {
    const key = `${spec.id}|${spec.instanceId ?? ''}`;
    if (seenRemoveRequest.has(key)) continue;
    seenRemoveRequest.add(key);
    removeRequests.push(spec);
  }

  const overlap = addSpecs.find(spec => removeRequests.some(r => r.id === spec.id));
  if (overlap) {
    return fail(`"${overlap.id}" cannot be both added and removed in the same request.`, 'Conflicting add/remove request');
  }

  // A droid whose instance records disagree with their display mirror is
  // mutated by nothing until it is reconciled: writing on top would hide the
  // disagreement.
  const mirrorProblems = auditAppendageMirror(actor?.system?.installedSystems, actor?.system?.droidSystems);
  if (mirrorProblems.length) {
    return fail(`Appendage records disagree (${mirrorProblems.map(p => p.code).join(', ')}); reconcile them before customizing this droid.`, 'Inconsistent appendage records');
  }

  const components = collectInstalledComponents(actor);
  const installed = new Set(components.map(c => c.canonicalId));
  const confirmed = new Set(collectConfirmedComponents(actor).map(c => c.canonicalId));
  const ledger = actor?.system?.installedSystems ?? {};

  const singletonAdds = new Map();
  for (const spec of addSpecs) {
    const definition = definitionFor(spec.id);
    const physical = Boolean(definition) && isPhysicalAppendageDefinition(definition);
    if (!physical) {
      if (installed.has(spec.id)) {
        return fail(`${humanize(spec.id)} is already installed and cannot be purchased again.`, 'Already installed');
      }
      singletonAdds.set(spec.id, (singletonAdds.get(spec.id) ?? 0) + 1);
      if (singletonAdds.get(spec.id) > 1) {
        return fail(`${humanize(spec.id)} can be installed only once; it is requested more than once in this change.`, 'Already installed');
      }
    }
  }

  const removeSpecs = [];
  const seenTargets = new Set();
  for (const request of removeRequests) {
    const id = request.id;
    let target;
    if (request.instanceId) {
      const instance = findInstance(ledger, request.instanceId);
      if (!instance || normalizeDroidPartId(instance.partId) !== id) {
        return fail(`${humanize(id)} (${request.instanceId}) is not currently installed and cannot be removed.`, 'Not installed');
      }
      target = { id, instanceId: instance.instanceId, ledgerKey: instance.ledgerKey, hostInstanceId: instance.hostInstanceId };
    } else {
      if (!confirmed.has(id)) {
        // F7: present-but-unconfirmed hardware (mirror/Item/legacy only) is
        // never removable and never earns resale; the Garage does not
        // manufacture installation records to allow it.
        return installed.has(id)
          ? fail(`${humanize(id)} is present on this droid but has no confirmed installation record, so it cannot be removed or sold.`, 'Not confirmed installed')
          : fail(`${humanize(id)} is not currently installed and cannot be removed.`, 'Not installed');
      }
      const instances = instancesOfPart(ledger, id).filter(i => normalizeDroidPartId(i.partId) === id);
      const unidentified = components.some(c => c.canonicalId === id && !c.instanceId);
      if (instances.length + (unidentified ? 1 : 0) > 1) {
        return fail(`${humanize(id)} has more than one installed instance; name the instance to remove.`, 'Ambiguous instance');
      }
      target = instances.length === 1 && !unidentified
        ? { id, instanceId: instances[0].instanceId, ledgerKey: instances[0].ledgerKey, hostInstanceId: instances[0].hostInstanceId }
        : { id, instanceId: null, ledgerKey: null, hostInstanceId: null };
    }
    const targetKey = target.instanceId ? `instance:${target.instanceId}` : `part:${target.id}`;
    if (seenTargets.has(targetKey)) continue;
    seenTargets.add(targetKey);
    removeSpecs.push(target);
  }

  // Never remove a host from under components fitted to it, unless those
  // components are removed in the same change.
  const removedPartIds = new Set(removeSpecs.filter(t => !t.instanceId).map(t => t.id));
  for (const target of removeSpecs.filter(t => t.instanceId)) {
    const orphans = dependentsOfInstance(ledger, target.instanceId)
      .filter(d => !removedPartIds.has(normalizeDroidPartId(d.partId)));
    if (orphans.length) {
      return fail(`${humanize(target.id)} (${target.instanceId}) has ${orphans.map(o => humanize(normalizeDroidPartId(o.partId))).join(', ')} fitted to it; remove that first.`, 'Appendage has fitted components');
    }
  }

  const removedInstanceIds = new Set(removeSpecs.filter(t => t.instanceId).map(t => t.instanceId));
  const fittedToRemoved = addSpecs.find(spec => spec.hostInstanceId && removedInstanceIds.has(spec.hostInstanceId));
  if (fittedToRemoved) {
    return fail(`${humanize(fittedToRemoved.id)} cannot be fitted to an appendage that is being removed in the same change.`, 'Host appendage not installed');
  }

  return {
    success: true,
    add: addSpecs.map(spec => spec.id),
    remove: removeSpecs.map(target => target.id),
    addSpecs,
    removeSpecs
  };
}

export class DroidCustomizationEngine {
  /**
   * Get normalized droid profile for customization purposes
   * REUSE: Leverages canonical droid systems definitions from chargen authority
   */
  static getNormalizedDroidProfile(actor) {
    if (!actor || !followsDroidRules(actor)) {
      return { success: false, error: 'Not a droid actor' };
    }

    const droidSystems = actor.system?.droidSystems ?? {};
    const installedSystems = actor.system?.installedSystems ?? {};
    const degree = actor.system?.degree ?? 'independent';
    const size = droidSystems.size ?? 'medium';

    return {
      success: true,
      profile: {
        actorId: actor.id,
        actorName: actor.name,
        degree,
        size,
        chassis: droidSystems.chassis,
        locomotion: droidSystems.locomotion,
        processor: droidSystems.processor,
        armor: droidSystems.armor,
        appendages: droidSystems.appendages ?? [],
        sensors: droidSystems.sensors ?? [],
        installedSystems: Object.keys(installedSystems)
      }
    };
  }

  /**
   * Get available droid systems for customization
   * REUSE: Pulls from canonical DROID_SYSTEMS chargen authority
   */
  static getAvailableSystems(actor) {
    if (!actor || !followsDroidRules(actor)) {
      return {
        success: false,
        error: 'Not a droid actor',
        systems: []
      };
    }

    const profile = this.getNormalizedDroidProfile(actor);
    if (!profile.success) {
      return {
        success: false,
        error: 'Failed to get droid profile',
        systems: []
      };
    }

    const installed = collectInstalledDroidPartIds(actor);
    const backupSlot = hasBackupProcessorSlot(actor);
    const hasPrimaryProcessor = Boolean(actor.system?.droidSystems?.processor?.id || actor.system?.droidSystems?.processor?.name);
    const systems = [];

    for (const def of getAllDroidPartDefinitions()) {
      // An already-installed primary processor is an ESTABLISHED restriction on
      // a second primary; a backup slot lifts exactly that restriction and
      // nothing else (source HOLD, unmet prerequisites, unresolved quote and
      // pending host rulings still block).
      const restrictions = [];
      if (isPrimaryProcessor(def) && hasPrimaryProcessor && !backupSlot && !installed.has(normalizeDroidPartId(def.id))) {
        restrictions.push({ code: 'PRIMARY_PROCESSOR_PRESENT', message: 'A primary processor is already installed. Install a Backup Processor before purchasing a second inactive processor.' });
      }
      const entry = droidPartEntry(def, actor, { restrictions });
      entry.installed = installed.has(entry.id);
      if (isPhysicalAppendageDefinition(def)) {
        // Core p.190: any number of appendages. Owning one does not make the
        // kind "already installed"; expose the count instead.
        entry.instanceCount = collectInstalledComponents(actor).filter(c => c.canonicalId === entry.id).length;
        entry.installed = false;
      }
      if (isPrimaryProcessor(def) && backupSlot && !entry.installed) {
        entry.slot = entry.slot || 'processor.backup';
        entry.note = 'Can be installed in the backup processor slot; only one processor is active at a time.';
      }
      systems.push(entry);
    }

    return {
      success: true,
      systems
    };
  }

  /**
   * Preview proposed droid customization changes
   * Shows what would happen if user adds/removes systems
   * REUSE: Uses chargen-authority costs for preview
   *
   * @param {Actor} actor - The droid whose systems are being previewed (asset actor)
   * @param {{add?: string[], remove?: string[]}} changeSet
   * @param {{walletActor?: Actor}} [options] - walletActor defaults to `actor` for
   *   backward compatibility (self-funded droid). Pass the owner's actor to preview
   *   affordability against the owner's credits instead of the droid's own.
   */
  static previewDroidCustomization(actor, changeSet = {}, options = {}) {
    const warnings = [];
    const walletActor = options.walletActor || actor;

    if (!actor || !followsDroidRules(actor)) {
      return { success: false, error: 'Not a droid actor', blockingReason: 'Invalid actor type' };
    }

    const profile = this.getNormalizedDroidProfile(actor);
    if (!profile.success) {
      return { success: false, error: 'Failed to get droid profile' };
    }

    const normalized = normalizeDroidCustomizationChangeSet(actor, changeSet);
    if (!normalized.success) {
      return { success: false, error: normalized.error, blockingReason: normalized.blockingReason };
    }
    const { addSpecs, removeSpecs } = normalized;
    // Systems/eligibility are evaluated against the droid (`actor`); affordability
    // is evaluated against whoever is paying (`walletActor`) — see Phase 1 audit,
    // "Where are the systems? from Where are the credits?"
    const currentCredits = normalizedCredits(walletActor);
    let totalAddCost = 0;
    let totalRemoveSale = 0;

    const addedSystems = [];
    const removedSystems = [];

    // Validate systems to add
    for (const spec of addSpecs) {
      const systemId = spec.id;
      const systemDef = this.#findSystemDefinition(systemId);
      if (!systemDef) {
        return { success: false, error: `Unknown system: ${systemId}`, blockingReason: 'System not found' };
      }

      // GATE C-1: components fitted to an appendage must name the installed
      // instance they attach to; the shared quote authority then applies the
      // typed Gate A prerequisites (type, source status) to that exact host.
      const hostResolution = resolveHostForPart(actor, systemDef, spec.hostInstanceId);
      if (!hostResolution.success) {
        return { success: false, error: hostResolution.error, blockingReason: hostResolution.blockingReason };
      }
      const quoteOptions = { selectedAppendage: hostResolution.selectedAppendage };

      const candidate = droidPartEntry(systemDef, actor, quoteOptions);
      if (candidate.compatible !== true) {
        return { success: false, error: candidate.blockingReason || `${candidate.name} is not eligible for installation on this droid`, blockingReason: 'System incompatible', eligibility: candidate.eligibility };
      }
      if (isPrimaryProcessor(systemDef) && actor.system?.droidSystems?.processor?.id && !hasBackupProcessorSlot(actor)) {
        return {
          success: false,
          error: 'A primary processor is already installed. Install a Backup Processor before purchasing a second inactive processor.',
          blockingReason: 'Backup processor slot required'
        };
      }
      const cost = this.#computeSystemCost(actor, systemDef, quoteOptions);
      if (!Number.isFinite(cost) || cost < 0) {
        return { success: false, error: `No valid source quote for ${systemDef.name}`, blockingReason: 'Unresolved droid component price' };
      }
      totalAddCost += cost;
      addedSystems.push({
        id: normalizeDroidPartId(systemId), name: systemDef.name, cost, category: candidate.category, slot: candidate.slot,
        hostInstanceId: hostResolution.host?.instanceId ?? null,
        // Minted by the single mutation authority at apply time.
        newPhysicalInstance: isPhysicalAppendageDefinition(systemDef)
      });
    }

    // Validate systems to remove
    for (const target of removeSpecs) {
      const systemId = target.id;
      const systemDef = this.#findSystemDefinition(systemId);
      if (!systemDef) {
        return { success: false, error: `Unknown system: ${systemId}`, blockingReason: 'System not found' };
      }

      // A fitted component is re-quoted against the host it is recorded on.
      const recordedHost = cleanIdentity(target.hostInstanceId);
      const hostResolution = recordedHost && requiredHostTypes(systemDef).length
        ? resolveHostForPart(actor, systemDef, recordedHost)
        : { success: true, selectedAppendage: null };
      if (!hostResolution.success) {
        return { success: false, error: hostResolution.error, blockingReason: hostResolution.blockingReason };
      }
      const quoteOptions = { selectedAppendage: hostResolution.selectedAppendage };

      const removed = droidPartEntry(systemDef, actor, quoteOptions);
      const resale = this.#computeSystemResale(actor, systemDef, quoteOptions);
      if (!Number.isFinite(resale) || resale < 0) {
        return { success: false, error: `No valid resale quote for ${systemDef.name}`, blockingReason: 'Unresolved droid component price' };
      }
      totalRemoveSale += resale;
      removedSystems.push({ id: normalizeDroidPartId(systemId), name: systemDef.name, resale, category: removed.category, slot: removed.slot, instanceId: target.instanceId ?? null });
    }

    const netCost = totalAddCost - totalRemoveSale;
    const newCredits = currentCredits - netCost;

    if (newCredits < 0) {
      return {
        success: false,
        error: `Insufficient credits: need ${netCost}, have ${currentCredits}`,
        blockingReason: 'Insufficient funds',
        preview: {
          currentCredits,
          netCost,
          newCredits,
          walletActorId: walletActor.id
        }
      };
    }

    return {
      success: true,
      preview: {
        actorId: actor.id,
        walletActorId: walletActor.id,
        currentCredits,
        systemsAdded: addedSystems,
        systemsRemoved: removedSystems,
        totalAddCost,
        totalRemoveSale,
        netCost,
        newCredits
      }
    };
  }

  /**
   * Apply droid customization changes through ActorEngine
   * MUTATION AUTHORITY: ActorEngine is the sole mutation authority
   *
   * @param {Actor} actor - The droid being modified (asset actor)
   * @param {{add?: string[], remove?: string[]}} changeSet
   * @param {{walletActor?: Actor}} [options] - walletActor defaults to `actor`
   *   (self-funded droid) for backward compatibility. Pass the owner's actor to
   *   debit/credit the owner instead of the droid.
   */
  static async applyDroidCustomization(actor, changeSet = {}, options = {}) {
    if (!actor || !followsDroidRules(actor)) {
      return { success: false, error: 'Not a droid actor' };
    }
    const walletActor = options.walletActor || actor;

    const preview = this.previewDroidCustomization(actor, changeSet, { walletActor });
    if (!preview.success) {
      return preview;
    }

    // Re-validate against the ACTOR'S CURRENT state immediately before
    // mutating — never trust the preview object (or the raw, possibly
    // duplicate-laden changeSet) as the source of truth for what actually
    // gets removed/added. This is a fresh, independent revalidation, not a
    // reuse of `preview`'s own (also-fresh) normalization — it exists so a
    // future refactor that lets `preview` be caller-supplied can't silently
    // reintroduce the exploit this closes.
    const revalidated = normalizeDroidCustomizationChangeSet(actor, changeSet);
    if (!revalidated.success) {
      return { success: false, error: revalidated.error, blockingReason: revalidated.blockingReason };
    }

    try {
      const { addSpecs, removeSpecs } = revalidated;
      const installedSystems = { ...(actor.system.installedSystems ?? {}) };
      const droidSystems = foundry.utils.deepClone(actor.system?.droidSystems ?? {});

      // PHASE 2 — Droid Authority Consolidation: embedded droid-part Items are
      // not authoritative installation state (system.installedSystems is —
      // see docs/audits/droid-authority-consolidation-phase-2.md). Resolve the
      // actor's current components once so a removal can also delete any
      // embedded Item representing the same canonical part; otherwise the
      // Item would remain the highest-precedence source once its ledger
      // entry is gone and the resolver would keep reporting the component as
      // installed and active (the "Garage removal does not reconcile
      // embedded Items" defect from docs/audits/droid-static-audit.md).
      const preRemovalResolution = removeSpecs.length
        ? resolveInstalledDroidComponents(actor, {
            normalizeId: normalizeDroidPartId,
            getDefinition: (id) => getDroidPartDefinition(id)
          })
        : null;
      const itemIdsToDelete = [];

      // Apply removals
      for (const target of removeSpecs) {
        const normalized = target.id;
        if (target.instanceId) {
          // GATE C-1: exactly one physical instance leaves; its siblings and
          // their display-mirror rows are untouched.
          delete installedSystems[target.ledgerKey];
          this.#applyRemovalToDroidSystems(droidSystems, normalized, target.instanceId);
          continue;
        }
        delete installedSystems[normalized];
        this.#applyRemovalToDroidSystems(droidSystems, normalized);
        const component = preRemovalResolution?.components.find(c => c.canonicalId === normalized && !c.instanceId);
        for (const source of component?.sources ?? []) {
          if (source.kind === 'embeddedItem' && source.itemId) itemIdsToDelete.push(source.itemId);
        }
      }

      // Apply additions
      const taken = takenIdentities(installedSystems, droidSystems);
      const idSource = typeof options.idSource === 'function' ? options.idSource : undefined;
      const appliedAdded = [];
      for (const spec of addSpecs) {
        const systemDef = this.#findSystemDefinition(spec.id);
        const hostResolution = resolveHostForPart(actor, systemDef, spec.hostInstanceId);
        if (!hostResolution.success) {
          return { success: false, error: hostResolution.error, blockingReason: hostResolution.blockingReason };
        }
        const payload = this.#buildInstalledPartPayload(systemDef, actor, { selectedAppendage: hostResolution.selectedAppendage });

        if (isPhysicalAppendageDefinition(systemDef)) {
          // One NEW physical appendage. Its identity is minted here, by the
          // single mutation authority, and written to the ledger first; the
          // droidSystems row is a display mirror of that same identity.
          const instanceId = mintInstanceId(taken.instanceIds, idSource);
          taken.instanceIds.add(instanceId);
          const locationId = mintLocationId(taken.locationIds);
          taken.locationIds.add(locationId);
          const entry = { ...payload, instanceId, locationId };
          installedSystems[ledgerKeyForInstance(entry.id, instanceId)] = entry;
          droidSystems.appendages = [...asArray(droidSystems.appendages), { ...entry, location: locationId }];
          appliedAdded.push({ id: entry.id, name: entry.name, cost: payload.cost, instanceId, locationId });
          continue;
        }

        const entry = hostResolution.host ? { ...payload, hostInstanceId: hostResolution.host.instanceId } : payload;
        installedSystems[entry.id] = entry;
        this.#applyAdditionToDroidSystems(actor, droidSystems, systemDef, entry);
        appliedAdded.push({ id: entry.id, name: entry.name, cost: payload.cost, instanceId: null, hostInstanceId: entry.hostInstanceId ?? null });
      }

      // Route credit movement + asset mutation through TransactionEngine so the
      // customization is one verified commerce transaction (recovery established,
      // restore outcome observed — not multi-document atomic) AND recorded in the
      // credit audit trail.
      // walletActor (defaults to the droid itself for backward compatibility)
      // pays/receives credits; assetActor (always the droid) receives the
      // system mutation. TransactionEngine already supports wallet !== asset —
      // see executeAssetCustomizationTransaction's own docstring — this merely
      // stops hardcoding them to the same actor. The embedded-Item delete
      // bucket rides in the same asset plan, so a failure anywhere in the
      // transaction (insufficient funds, validation, mutation error) restores
      // both actors' full pre-transaction snapshots — items included — via
      // TransactionEngine's existing rollback, not a second ad hoc mechanism.
      const netCost = Number(preview.preview.netCost) || 0;
      const assetMutationPlan = {
        set: {
          'system.installedSystems': installedSystems,
          'system.droidSystems': droidSystems
        }
      };
      if (itemIdsToDelete.length > 0) {
        assetMutationPlan.delete = { items: [...new Set(itemIdsToDelete)] };
      }
      const txn = await TransactionEngine.executeAssetCustomizationTransaction({
        actor: walletActor,
        assetActor: actor,
        assetMutationPlan,
        cost: Math.max(0, netCost),
        resaleCredit: Math.max(0, -netCost),
        transactionContext: 'owned-customization',
        reason: 'Droid customization',
        audit: {
          source: 'droid-customization',
          systemsAdded: appliedAdded,
          systemsRemoved: preview.preview.systemsRemoved,
          itemsDeleted: itemIdsToDelete,
          assetActorId: actor.id
        }
      }, { source: 'DroidCustomizationEngine.applyDroidCustomization', validate: true, rederive: true });

      if (!txn?.success) {
        return { success: false, error: txn?.error ?? 'Customization transaction failed' };
      }

      return {
        success: true,
        applied: {
          systemsAdded: preview.preview.systemsAdded.map((added, index) => ({ ...added, ...(appliedAdded[index] ?? {}), cost: added.cost })),
          systemsRemoved: preview.preview.systemsRemoved,
          netCost: preview.preview.netCost,
          newCredits: preview.preview.newCredits
        }
      ,
        ...(txn.presentationError ? { presentationError: txn.presentationError } : {})
      };
    } catch (err) {
      SWSELogger.error('Droid customization apply failed:', err);
      return { success: false, error: err.message };
    }
  }


  static #buildInstalledPartPayload(systemDef, actor, quoteOptions = {}) {
    // `quoteOptions` (e.g. the Gate C-1 selected host appendage) only feeds the
    // shared quote/prerequisite authority; it is never written to the ledger.
    const entry = droidPartEntry(systemDef, actor, quoteOptions);
    return {
      id: entry.id,
      name: entry.name,
      category: entry.category,
      slot: entry.slot,
      cost: entry.cost,
      installedAt: Date.now(),
      // PHASE 4 — Converted-System Reconciliation: every ordinary Garage/
      // Workshop install (through this engine) is, by definition, added
      // AFTER whatever the droid's published statblock totals already were
      // — never baked into them. This is the "post-import-modification"
      // provenance docs/audits/droid-converted-system-reconciliation-phase-4.md
      // and the reconciliation classifier rely on to tell an ordinary
      // Garage-installed part apart from a reconciled stock-import
      // component whose bonus is already accounted for in the published
      // totals. A caller may override via `extra.provenance`/`extra.mechanicalState`
      // (used only by DroidConvertedSystemReconciliationService itself,
      // which is the sole other writer of these fields — enforced by
      // tools/check-droid-reconciliation-authority.mjs).
      provenance: { origin: 'post-import-customization', bakedIntoPublishedTotals: false },
      mechanicalState: { applyModifiers: true }
    };
  }

  static #applyAdditionToDroidSystems(actor, droidSystems, systemDef, entry) {
    const slot = String(entry.slot ?? '');
    const category = entry.category;

    if (category === 'processor') {
      const primaryLike = isPrimaryProcessor(systemDef);
      droidSystems.processorSlots ??= {};
      if (primaryLike) {
        if (!droidSystems.processor?.id) droidSystems.processor = entry;
        else if (hasBackupProcessorSlot(actor)) {
          droidSystems.processorSlots.backup = { ...entry, active: false };
          droidSystems.backupProcessor = { ...entry, active: false };
        }
      } else if (entry.id === 'backup-processor' || entry.rules?.unlocksBackupProcessorSlot || slot.includes('backup')) {
        droidSystems.processorEnhancements ??= [];
        droidSystems.processorEnhancements = this.#upsertArrayEntry(droidSystems.processorEnhancements, entry);
        droidSystems.processorSlots.backup ??= null;
      } else {
        droidSystems.processorEnhancements ??= [];
        droidSystems.processorEnhancements = this.#upsertArrayEntry(droidSystems.processorEnhancements, entry);
      }
      return;
    }

    if (category === 'locomotion') {
      if (slot.includes('primary') || !droidSystems.locomotion?.id) droidSystems.locomotion = entry;
      else {
        droidSystems.locomotionSystems ??= [];
        droidSystems.locomotionSystems = this.#upsertArrayEntry(droidSystems.locomotionSystems, entry);
      }
      return;
    }

    const appendageBucket = appendageMirrorBucket({ category, slot });
    if (appendageBucket === 'appendages') {
      // Base appendages are minted with an identity by applyDroidCustomization();
      // reaching here would write a limb with no instance.
      throw new Error('A physical appendage must be added through the instance path.');
    }
    if (appendageBucket === 'appendageEnhancements') {
      // GATE C-1: everything with the appendage category that is not a base
      // appendage (enhancements, mounts, appendage weapons/shields/utilities)
      // is FITTED TO an appendage and never enters the physical list.
      droidSystems.appendageEnhancements ??= [];
      droidSystems.appendageEnhancements = this.#upsertArrayEntry(droidSystems.appendageEnhancements, entry);
      return;
    }

    if (category === 'armor') {
      droidSystems.armor = entry;
      return;
    }

    if (category === 'sensor') {
      droidSystems.sensors ??= [];
      droidSystems.sensors = this.#upsertArrayEntry(droidSystems.sensors, entry);
      return;
    }

    if (category === 'weapon' || entry.weaponProfile) {
      droidSystems.weapons ??= [];
      droidSystems.weapons = this.#upsertArrayEntry(droidSystems.weapons, entry);
      return;
    }

    droidSystems.accessories ??= [];
    droidSystems.accessories = this.#upsertArrayEntry(droidSystems.accessories, entry);
  }

  static #applyRemovalToDroidSystems(droidSystems, systemId, instanceId = null) {
    const id = normalizeDroidPartId(systemId);
    if (instanceId) {
      // GATE C-1: one physical instance only. Matching by part id here would
      // remove every sibling hand.
      if (Array.isArray(droidSystems.appendages)) {
        droidSystems.appendages = asArray(droidSystems.appendages).filter(entry => cleanIdentity(entry?.instanceId) !== instanceId);
      }
      return;
    }
    const matches = (entry) => normalizeDroidPartId(entry?.id ?? entry?.name) === id;
    const removeFrom = (array) => asArray(array).filter(entry => !matches(entry));

    if (matches(droidSystems.processor)) delete droidSystems.processor;
    if (matches(droidSystems.backupProcessor)) delete droidSystems.backupProcessor;
    if (matches(droidSystems.processorSlots?.backup)) delete droidSystems.processorSlots.backup;
    if (matches(droidSystems.armor)) delete droidSystems.armor;
    for (const key of ['processorEnhancements', 'locomotionSystems', 'secondaryLocomotion', 'appendages', 'appendageEnhancements', 'sensors', 'weapons', 'accessories', 'integratedSystems']) {
      if (Array.isArray(droidSystems[key])) droidSystems[key] = removeFrom(droidSystems[key]);
    }
  }

  static #upsertArrayEntry(array, entry) {
    const id = normalizeDroidPartId(entry?.id ?? entry?.name);
    const out = asArray(array).filter(existing => normalizeDroidPartId(existing?.id ?? existing?.name) !== id);
    out.push(entry);
    return out;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Find system definition in canonical DROID_SYSTEMS authority
   * REUSE: Searches chargen source for system definition
   */
  static #findSystemDefinition(systemId) {
    const id = normalizeDroidPartId(systemId);
    return getAllDroidPartDefinitions().find(def => normalizeDroidPartId(def.id) === id || normalizeDroidPartId(def.name) === id) ?? null;
  }

  /**
   * Compute cost of a system for a specific droid actor.
   * REUSE: Uses droid-part-schema, which wraps the canonical chargen DROID_SYSTEMS
   * source and understands cost factor, formulas, and x2/x5 dependent costs.
   */
  static #computeSystemCost(actor, systemDef, quoteOptions = {}) {
    return computeDroidPartCost(actor, systemDef, quoteOptions);
  }

  /**
   * Compute resale value of a system (50% of purchase cost)
   */
  static #computeSystemResale(actor, systemDef, quoteOptions = {}) {
    const purchaseCost = this.#computeSystemCost(actor, systemDef, quoteOptions);
    return Number.isFinite(purchaseCost) && purchaseCost >= 0 ? Math.floor(purchaseCost * 0.5) : null;
  }

  /**
   * Get cost factor for droid size
   * Used by chargen cost formulas
   */
  static #getCostFactor(size) {
    return getDroidCostFactor(size);
  }
}

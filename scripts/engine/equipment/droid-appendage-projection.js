/**
 * Droid appendage projection (E2A) -- READ ONLY.
 *
 * Projects the result of the existing installed-component authority (`resolveInstalledDroidComponents`) into appendage
 * records for the anatomy resolver. It is not an installation authority: it never reads `system.droidSystems` itself, never
 * writes anything, and never repairs the identity limits of the component resolver (that is reserved for E2B).
 *
 * Three identities are kept apart (owner ruling OA-8):
 *   slot      stable location on the actor            -- NOT available from the component resolver's output  -> always null here
 *   instance  one specific physical component         -- established ONLY by an embedded Item document id (Foundry id)
 *   part      the published component definition      -- the canonical component id (what KIND of component it is)
 * A canonical part id answers "what type is it?", never "which installed appendage is this?". Array positions and
 * dynamically generated `additional-N` locations are never used as identity.
 *
 * Why most Garage-authored droids project to zero identified appendages today: the component resolver groups records by part
 * type, and the ledger / `droidSystems` representations carry no per-instance identity. Such a record is reported as an
 * UNRESOLVED RECORD (with every fact that is established) instead of being counted as one or more manipulators.
 *
 * Capabilities are tri-state: true | false | null (null = unknown). Only an explicit boolean on the structural catalog entry
 * (`canManipulate`, and `canHold` / `canWield` if a catalog ever states them) is read; catalog prose (`features`, `restrictions`)
 * is never parsed. Today only `canManipulate` is stated, so `canHold` and `canWield` stay unknown for every droid appendage.
 *
 * Functional state is installed/enabled evidence only. `active` (operating state) is deliberately ignored: a passive mechanical
 * appendage that is enabled but not "active" is still physically functional.
 */
import { resolveInstalledDroidComponents } from "/systems/foundryvtt-swse/scripts/domain/droids/droid-installed-component-resolver.js";
import { getDroidPartDefinition, normalizeDroidPartId } from "/systems/foundryvtt-swse/scripts/data/droid-part-schema.js";
import { DROID_SYSTEMS } from "/systems/foundryvtt-swse/scripts/data/droid-systems.js";

/** Embedded-Item source kind string used by the component resolver (`DROID_COMPONENT_SOURCE_KIND.EMBEDDED_ITEM`). */
const EMBEDDED_ITEM = 'embeddedItem';

/** Restrictiveness order of functional states (higher = more restrictive). */
export const FUNCTIONAL_STATE_RANK = Object.freeze({ functional: 0, unresolved: 1, disabled: 2, missing: 3 });

/** Default structural catalog lookup: the hydrated canonical definition already carries its `droid-systems.js` entry as `.source`. */
function defaultCatalogEntryFor(definition) {
  if (definition?.source && typeof definition.source === 'object') return definition.source;
  const id = definition?.appendageType ?? definition?.id;
  const list = Array.isArray(DROID_SYSTEMS?.appendages) ? DROID_SYSTEMS.appendages : [];
  return id ? (list.find((entry) => entry?.id === id) ?? null) : null;
}

const boolOrNull = (value) => (typeof value === 'boolean' ? value : null);

function capabilitiesFrom(entry) {
  return {
    canHold: boolOrNull(entry?.canHold),
    canWield: boolOrNull(entry?.canWield),
    canManipulate: boolOrNull(entry?.canManipulate),
  };
}

const moreRestrictive = (a, b) => (FUNCTIONAL_STATE_RANK[b] > FUNCTIONAL_STATE_RANK[a] ? b : a);

function stateOf({ installed, enabled }) {
  if (installed === false) return 'missing';
  if (enabled === false) return 'disabled';
  if (installed === true && enabled === true) return 'functional';
  return 'unresolved';
}

function issue(code, severity, message, details = {}) {
  return { code, severity, message, details };
}

/**
 * Pure projection of a component-resolver result.
 *
 * @param {{components:object[]}} installedComponents  result of resolveInstalledDroidComponents()
 * @param {{getDefinition?:(id:string)=>object|null, catalogEntryFor?:(definition:object)=>object|null}} [deps]  injectable for tests
 * @returns {{appendages:object[], unresolvedRecords:object[], issues:object[]}}
 */
export function projectDroidAppendages(installedComponents, deps = {}) {
  const getDefinition = typeof deps.getDefinition === 'function' ? deps.getDefinition : getDroidPartDefinition;
  const catalogEntryFor = typeof deps.catalogEntryFor === 'function' ? deps.catalogEntryFor : defaultCatalogEntryFor;
  const components = Array.isArray(installedComponents?.components) ? installedComponents.components : [];

  const appendages = [];
  const unresolvedRecords = [];
  const issues = [];

  for (const component of components) {
    const definition = component?.definition ?? getDefinition(component?.canonicalId) ?? null;
    // Only BASE appendages (hand, claw, tool, instrument, probe ...). Mounts, enhancements, appendage weapons, shields and
    // utility parts are not appendages themselves and never contribute a manipulator.
    const slot = component?.slot ?? definition?.slot ?? null;
    const category = component?.category ?? definition?.category ?? null;
    if (slot !== 'appendage' || category !== 'appendage') continue;

    const partId = String(component.canonicalId);
    const catalogEntry = catalogEntryFor(definition) ?? null;
    const capabilities = capabilitiesFrom(catalogEntry);
    const sources = Array.isArray(component.sources) ? component.sources : [];

    if (component.installed !== true) {
      issues.push(issue('component-not-installed', 'info', `Appendage component "${partId}" is recorded as not installed; it contributes no manipulator.`, { partId }));
      continue;
    }

    const items = sources.filter((s) => s?.kind === EMBEDDED_ITEM && s?.itemId);
    const others = sources.filter((s) => !(s?.kind === EMBEDDED_ITEM && s?.itemId));
    const tierCounts = new Map();
    for (const s of others) tierCounts.set(s.kind, (tierCounts.get(s.kind) ?? 0) + 1);
    const duplicatedTier = [...tierCounts.values()].some((n) => n > 1);
    const otherTiersPresent = others.length > 0;

    const componentState = stateOf({ installed: component.installed, enabled: component.enabled });
    const base = { partId, appendageType: definition?.appendageType ?? partId, capabilities, componentState, sourceKinds: [...new Set(sources.map((s) => s?.kind).filter(Boolean))].sort() };

    // Instance identity exists only through embedded Item document ids, and only when the records can be matched unambiguously:
    // every non-item tier mentions the part at most once, and several Items are not mixed with other tiers' records.
    const identifiable = items.length >= 1 && !duplicatedTier && (items.length === 1 || !otherTiersPresent);
    if (identifiable) {
      for (const item of items) {
        let functionalState = stateOf({ installed: item.installed !== false, enabled: item.enabled });
        functionalState = moreRestrictive(functionalState, componentState);
        appendages.push({
          id: `droid-appendage:${item.itemId}`,
          kind: base.appendageType,
          source: 'droid-installed-component',
          identity: { slot: null, instance: String(item.itemId), part: partId },
          capabilities: { ...capabilities },
          functionalState,
          functionalStateSource: 'installed-component-evidence',
        });
      }
      continue;
    }

    // Not identifiable: preserve what IS established, claim nothing about count or identity.
    const recordCount = sources.length;
    unresolvedRecords.push({ ...base, recordCount, identity: { slot: null, instance: null, part: partId } });
    if (duplicatedTier || items.length > 1) {
      issues.push(issue('droid-appendage-duplicate-same-type-records', 'blocking',
        `Several "${partId}" records exist but the installed-component evidence cannot establish whether they are independent physical appendages; none is counted.`,
        { partId, recordCount, sourceKinds: base.sourceKinds }));
    } else {
      issues.push(issue('droid-appendage-instance-unestablished', 'blocking',
        `"${partId}" is recorded as installed (${componentState}) but no installed-instance or slot identity is established; the number of physical appendages is unknown and none is counted.`,
        { partId, recordCount, sourceKinds: base.sourceKinds, slotIdentity: null }));
    }
  }

  appendages.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { appendages, unresolvedRecords, issues };
}

/**
 * Convenience: run the existing component authority on an actor, then project. Both steps are injectable.
 *
 * @param {object} actor
 * @param {{resolveComponents?:Function, normalizeId?:Function, getDefinition?:Function, catalogEntryFor?:Function}} [deps]
 */
export function projectActorDroidAppendages(actor, deps = {}) {
  const resolveComponents = typeof deps.resolveComponents === 'function' ? deps.resolveComponents : resolveInstalledDroidComponents;
  const normalizeId = typeof deps.normalizeId === 'function' ? deps.normalizeId : normalizeDroidPartId;
  const getDefinition = typeof deps.getDefinition === 'function' ? deps.getDefinition : getDroidPartDefinition;
  const installed = resolveComponents(actor, { normalizeId, getDefinition });
  return projectDroidAppendages(installed, { getDefinition, catalogEntryFor: deps.catalogEntryFor });
}

export default { projectDroidAppendages, projectActorDroidAppendages, FUNCTIONAL_STATE_RANK };

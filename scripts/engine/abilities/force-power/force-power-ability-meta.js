/**
 * Force Power ability metadata normalizer / repair utility.
 *
 * ForceAdapter intentionally requires system.abilityMeta for FORCE_POWER items.
 * Older actor-owned force powers and the current force power pack can lack that
 * field, so this module provides one canonical repair seam used by:
 * - runtime registration (non-mutating normalization)
 * - progression finalization (future item materialization)
 * - optional/automatic actor-owned item backfill (persistent repair)
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ForceRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/force-registry.js";
import {
  ForcePowerActionType,
  ForcePowerDescriptor,
  ForcePowerFrequencyType
} from "./force-power-types.js";

const FORCE_POWER_TYPES = new Set(['force-power', 'forcepower', 'power']);

function cloneData(value) {
  if (!value) return value;
  const raw = value?.toObject ? value.toObject() : value;
  try {
    if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(raw);
  } catch (_err) {
    // Fall through to structured clone / JSON clone.
  }
  try {
    return structuredClone(raw);
  } catch (_err) {
    return JSON.parse(JSON.stringify(raw));
  }
}

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === '') return [];
  return [value];
}

function firstFiniteInteger(...values) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.trunc(n);
  }
  return null;
}

function normalizeActionType(...values) {
  const text = values
    .flatMap(asArray)
    .map((value) => String(value || '').toLowerCase())
    .join(' ');

  if (text.includes('full') && text.includes('round')) return ForcePowerActionType.FULL_ROUND;
  if (text.includes('reaction')) return ForcePowerActionType.REACTION;
  if (text.includes('swift')) return ForcePowerActionType.SWIFT;
  if (text.includes('move')) return ForcePowerActionType.MOVE;
  if (text.includes('free')) return ForcePowerActionType.FREE;
  if (text.includes('standard')) return ForcePowerActionType.STANDARD;
  return ForcePowerActionType.STANDARD;
}

function normalizeDescriptor(...values) {
  const tokens = values.flatMap(asArray).map((value) => String(value || '').toLowerCase());
  const text = tokens.join(' ');
  if (text.includes('dark')) return ForcePowerDescriptor.DARK;
  if (text.includes('light')) return ForcePowerDescriptor.LIGHT;
  return ForcePowerDescriptor.UNIVERSAL;
}

function normalizeFrequency(meta = {}, system = {}) {
  const value = String(meta.frequency || system.frequency || '').toLowerCase();
  if (Object.values(ForcePowerFrequencyType).includes(value)) return value;

  const maxUses = firstFiniteInteger(
    meta.maxUses,
    system.uses?.max,
    system.usage?.charges,
    system.usage?.max,
    system.usage?.perEncounter,
    system.resourceCost?.powerUse
  );

  // SWSE Force powers are suite uses, not at-will toggles. One actor-owned item
  // means one usable suite entry by default unless the source explicitly says otherwise.
  if (maxUses === 0) return ForcePowerFrequencyType.ENCOUNTER;
  return ForcePowerFrequencyType.ENCOUNTER;
}

function normalizeMaxUses(meta = {}, system = {}) {
  const maxUses = firstFiniteInteger(
    meta.maxUses,
    system.uses?.max,
    system.usage?.charges,
    system.usage?.max,
    system.usage?.perEncounter,
    system.resourceCost?.powerUse
  );
  return Math.max(1, maxUses || 1);
}

function normalizeForcePointCost(meta = {}, system = {}) {
  const explicit = firstFiniteInteger(meta.forcePointCost, system.resourceCost?.forcePoint, system.forcePointCost);
  if (explicit !== null) return Math.max(0, explicit);

  // Some old data used resourceCost.forcePoints for Use the Force DCs (Battle Strike = 15).
  // Do not treat that legacy field as an activation Force Point cost.
  return 0;
}

function resolveCanonicalEntry(itemData) {
  try {
    if (!ForceRegistry?._initialized) return null;
    return ForceRegistry.resolveEntry?.(
      itemData?.flags?.swse?.progression?.selectionId ||
      itemData?.system?.sourceId ||
      itemData?.system?.id ||
      itemData?._id ||
      itemData?.id ||
      itemData?.name,
      'power'
    ) || null;
  } catch (_err) {
    return null;
  }
}

function isForcePowerLike(itemData) {
  const type = String(itemData?.type || '').toLowerCase();
  const system = itemData?.system || {};
  return FORCE_POWER_TYPES.has(type)
    || system.executionModel === 'FORCE_POWER'
    || String(system.sourceType || '').toLowerCase() === 'forcepower'
    || String(system.sourceType || '').toLowerCase() === 'force-power';
}

function hasObjectMeta(system) {
  return !!system?.abilityMeta && typeof system.abilityMeta === 'object' && !Array.isArray(system.abilityMeta);
}

export function deriveForcePowerAbilityMeta(itemData, options = {}) {
  const system = itemData?.system || {};
  const canonicalEntry = options.canonicalEntry || resolveCanonicalEntry(itemData);
  const canonicalSystem = canonicalEntry?.system || {};
  const meta = {
    ...(canonicalSystem.abilityMeta || {}),
    ...(system.abilityMeta || {})
  };
  const descriptorValues = [
    meta.descriptor,
    system.descriptor,
    canonicalSystem.descriptor,
    system.tags,
    canonicalSystem.tags,
    canonicalEntry?.tags,
    system.discipline,
    canonicalSystem.discipline
  ];

  const frequency = normalizeFrequency(meta, system);
  const normalized = {
    ...meta,
    frequency,
    maxUses: frequency === ForcePowerFrequencyType.UNLIMITED ? undefined : normalizeMaxUses(meta, system),
    actionType: Object.values(ForcePowerActionType).includes(meta.actionType)
      ? meta.actionType
      : normalizeActionType(meta.actionType, system.time, system.actionType, system.actionLabel, canonicalSystem.time, canonicalSystem.actionType),
    forcePointCost: normalizeForcePointCost(meta, system),
    descriptor: Object.values(ForcePowerDescriptor).includes(meta.descriptor)
      ? meta.descriptor
      : normalizeDescriptor(...descriptorValues),
    darkSideOption: typeof meta.darkSideOption === 'boolean'
      ? meta.darkSideOption
      : normalizeDescriptor(...descriptorValues) === ForcePowerDescriptor.DARK,
    baseDC: Math.max(5, firstFiniteInteger(meta.baseDC, system.useTheForce, system.resolution?.baseDC, canonicalSystem.useTheForce, canonicalSystem.resolution?.baseDC, 15) || 15)
  };

  if (normalized.maxUses === undefined) delete normalized.maxUses;
  return normalized;
}

export function ensureForcePowerAbilityMeta(itemData, options = {}) {
  const data = cloneData(itemData);
  if (!data || !isForcePowerLike(data)) return data;

  const system = data.system || {};
  const needsMeta = !hasObjectMeta(system);
  const meta = deriveForcePowerAbilityMeta(data, options);

  data.type = 'force-power';
  data.system = {
    ...system,
    executionModel: 'FORCE_POWER',
    abilityMeta: meta
  };

  data.flags = data.flags || {};
  data.flags.swse = data.flags.swse || {};
  data.flags.swse.forcePowerAbilityMeta = {
    ...(data.flags.swse.forcePowerAbilityMeta || {}),
    normalized: true,
    repaired: needsMeta || data.flags.swse.forcePowerAbilityMeta?.repaired === true,
    source: options.source || data.flags.swse.forcePowerAbilityMeta?.source || 'derived'
  };

  return data;
}

export function forcePowerNeedsAbilityMetaRepair(item) {
  const data = item?.toObject ? item.toObject() : item;
  if (!isForcePowerLike(data)) return false;
  return !hasObjectMeta(data.system) || data.system?.executionModel !== 'FORCE_POWER' || String(data.type || '').toLowerCase() !== 'force-power';
}

export async function repairActorForcePowerAbilityMeta(actor, options = {}) {
  if (!actor?.items) return { actor: actor?.name || null, repaired: 0, skipped: 0 };
  const updates = [];

  for (const item of actor.items) {
    if (!forcePowerNeedsAbilityMetaRepair(item)) continue;
    const repaired = ensureForcePowerAbilityMeta(item, { source: 'actor-backfill' });
    if (!repaired?.system?.abilityMeta) {
      swseLogger.warn('[ForcePowerAbilityMeta] Unable to repair actor-owned Force power', {
        actor: actor.name,
        item: item.name
      });
      continue;
    }
    updates.push({
      _id: item.id,
      type: 'force-power',
      'system.executionModel': 'FORCE_POWER',
      'system.abilityMeta': repaired.system.abilityMeta,
      'flags.swse.forcePowerAbilityMeta': repaired.flags?.swse?.forcePowerAbilityMeta || { normalized: true, repaired: true, source: 'actor-backfill' }
    });
  }

  if (!updates.length) return { actor: actor.name, repaired: 0, skipped: 0 };

  const engine = options.actorEngine || ActorEngine;
  await engine.updateEmbeddedDocuments(actor, 'Item', updates, {
    source: 'force-power-ability-meta-backfill',
    skipRecalc: true
  });

  swseLogger.log(`[ForcePowerAbilityMeta] Repaired ${updates.length} Force power item(s) on ${actor.name}`);
  return { actor: actor.name, repaired: updates.length, skipped: 0 };
}

export async function repairWorldForcePowerAbilityMeta(options = {}) {
  const actors = Array.from(options.actors || globalThis.game?.actors || []);
  const results = [];
  for (const actor of actors) {
    try {
      results.push(await repairActorForcePowerAbilityMeta(actor, options));
    } catch (err) {
      swseLogger.warn('[ForcePowerAbilityMeta] Actor repair failed', {
        actor: actor?.name,
        error: err?.message || err
      });
      results.push({ actor: actor?.name || null, repaired: 0, skipped: 1, error: err?.message || String(err) });
    }
  }
  const repaired = results.reduce((sum, result) => sum + (Number(result.repaired) || 0), 0);
  if (!options.silent || repaired) {
    swseLogger.log(`[ForcePowerAbilityMeta] World repair complete: ${repaired} item(s) repaired`);
  }
  return { repaired, results };
}

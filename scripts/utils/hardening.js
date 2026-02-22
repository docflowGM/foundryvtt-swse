// scripts/utils/hardening.js

/**
 * "Last 10%" hardening utilities:
 * - Mixed progression warnings (heroic + nonheroic)
 * - Complete statblock snapshot + rollback (system + embedded docs)
 * - AppV2 lifecycle guards (skip derived calc for statblock NPCs)
 *
 * Snapshot is stored in flags.swse.npcLevelUp.snapshot (back-compat with existing UI).
 *
 * PHASE 7: All mutations routed through ActorEngine for atomic governance.
 */

import { ActorEngine } from '../governance/actor-engine/actor-engine.js';

const SYSTEM_SCOPE_COMPAT = 'swse';
const FLAG_SNAPSHOT = 'npcLevelUp.snapshot';
const FLAG_MODE = 'npcLevelUp.mode';
const FLAG_TRACK = 'npcLevelUp.track';
const FLAG_STARTED_AT = 'npcLevelUp.startedAt';

const MIXED_WARN_KEY = '__swseMixedTrackWarned__';

function _warnCache() {
  globalThis[MIXED_WARN_KEY] ??= new Set();
  return globalThis[MIXED_WARN_KEY];
}

function _actorKey(actor) {
  return actor?.uuid ?? actor?.id ?? actor?.name ?? 'unknown';
}

export function isStatblockNpc(actor) {
  if (!actor || actor.type !== 'npc') {return false;}
  const mode = actor.getFlag?.(SYSTEM_SCOPE_COMPAT, FLAG_MODE) ?? 'statblock';
  return mode !== 'progression';
}

export function shouldSkipDerivedData(actor) {
  return isStatblockNpc(actor);
}

/**
 * Treat embedded class items as the canonical "class map".
 * @param {Actor} actor
 */
export function getLevelSplitFromItems(actor) {
  const classes = actor?.items?.filter?.((i) => i?.type === 'class') ?? [];
  const heroicLevel = classes
    .filter((c) => c?.system?.isNonheroic !== true)
    .reduce((sum, c) => sum + (Number(c?.system?.level) || 0), 0);

  const nonheroicLevel = classes
    .filter((c) => c?.system?.isNonheroic === true)
    .reduce((sum, c) => sum + (Number(c?.system?.level) || 0), 0);

  return {
    heroicLevel: Math.max(0, Math.floor(heroicLevel)),
    nonheroicLevel: Math.max(0, Math.floor(nonheroicLevel)),
    totalLevel: Math.max(0, Math.floor(heroicLevel + nonheroicLevel))
  };
}

export function warnIfMixedTracks(actor, context = 'unknown') {
  try {
    const { heroicLevel, nonheroicLevel } = getLevelSplitFromItems(actor);
    if (!(heroicLevel > 0 && nonheroicLevel > 0)) {return;}

    const cache = _warnCache();
    const key = _actorKey(actor);
    if (cache.has(key)) {return;}
    cache.add(key);

    console.warn(
      `[SWSE] Mixed progression tracks detected (${context}). ` +
        `Actor="${actor?.name ?? key}" heroic=${heroicLevel} nonheroic=${nonheroicLevel}. ` +
        `Heroic math should use heroic levels only (derived from class items).`
    );
  } catch {
    // fail-soft
  }
}

export async function ensureNpcStatblockSnapshot(actor) {
  if (!actor) {return;}
  const existing = actor.getFlag?.(SYSTEM_SCOPE_COMPAT, FLAG_SNAPSHOT);
  if (existing) {return;}

  const raw = actor.toObject();
  const snapshot = {
    version: 1,
    createdAt: new Date().toISOString(),
    actorUuid: actor.uuid ?? '',
    name: raw.name,
    img: raw.img,
    system: foundry.utils.deepClone(raw.system ?? {}),
    prototypeToken: foundry.utils.deepClone(raw.prototypeToken ?? {}),
    items: foundry.utils.deepClone(raw.items ?? []),
    effects: foundry.utils.deepClone(raw.effects ?? [])
  };

  await actor.setFlag(SYSTEM_SCOPE_COMPAT, FLAG_SNAPSHOT, snapshot);
}

export async function rollbackNpcToStatblockSnapshot(actor) {
  const snap = actor?.getFlag?.(SYSTEM_SCOPE_COMPAT, FLAG_SNAPSHOT);
  if (!snap) {
    ui.notifications.warn('No NPC snapshot found.');
    return;
  }

  // PHASE 7: All mutations routed through ActorEngine for atomic governance
  // Restores complete actor state (root + items + effects) in single transaction
  const result = await ActorEngine.restoreFromSnapshot(actor, snap, {
    diff: false,
    [SYSTEM_SCOPE_COMPAT]: { skipProgression: true }
  });

  if (result.success) {
    // Update flags after successful restoration
    await actor.setFlag(SYSTEM_SCOPE_COMPAT, FLAG_MODE, 'statblock');
    await actor.unsetFlag(SYSTEM_SCOPE_COMPAT, FLAG_TRACK);
    await actor.unsetFlag(SYSTEM_SCOPE_COMPAT, FLAG_STARTED_AT);

    ui.notifications.info('NPC reverted to statblock snapshot.');
  }
}

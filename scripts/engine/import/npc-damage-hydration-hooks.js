import { hydrateImportedStatblockWeapon } from './nonheroic-damage-profile-hydrator.js';

const NPC_ACTOR_TYPES = new Set(['npc', 'droid']);
const WEAPON_ITEM_TYPES = new Set(['weapon', 'meleeWeapon', 'rangedWeapon']);
const RAW_ATTACK_KEYS = ['Melee Weapons', 'Ranged Weapons'];

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function normalize(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function splitAttackRows(value) {
  const text = cleanText(value);
  if (!text) return [];

  const rows = [];
  let current = '';
  let depth = 0;
  for (const char of text) {
    if (char === '(' || char === '[') depth += 1;
    if (char === ')' || char === ']') depth = Math.max(0, depth - 1);
    if ((char === ',' || char === ';') && depth === 0) {
      if (cleanText(current)) rows.push(cleanText(current));
      current = '';
      continue;
    }
    current += char;
  }
  if (cleanText(current)) rows.push(cleanText(current));
  return rows;
}

function collectActorAttackRows(actor) {
  const rows = [];
  const namespaces = [actor.flags?.swse, actor.flags?.['foundryvtt-swse']].filter(Boolean);

  for (const flags of namespaces) {
    const raw = flags?.import?.raw ?? {};
    for (const key of RAW_ATTACK_KEYS) rows.push(...splitAttackRows(raw?.[key]));
    rows.push(...splitAttackRows(flags?.beastData?.melee));
    rows.push(...splitAttackRows(flags?.beastData?.ranged));
  }

  return [...new Set(rows.filter(Boolean))];
}

function itemHasUsableDamage(item) {
  const system = item.system ?? {};
  return Boolean(
    cleanText(system.damageFormula)
    || cleanText(system.damage)
    || system.statblockHydrated
    || item.flags?.swse?.damageProfile?.slug
  );
}

function findRawRowForItem(item, actorRows) {
  const explicit = cleanText(item.flags?.swse?.import?.raw ?? item.flags?.['foundryvtt-swse']?.import?.raw);
  if (explicit) return explicit;

  const itemName = normalize(item.name);
  if (!itemName) return null;

  const matches = actorRows.filter((row) => {
    const normalizedRow = normalize(row);
    return normalizedRow === itemName
      || normalizedRow.startsWith(`${itemName} `)
      || normalizedRow.includes(` ${itemName} `);
  });

  return matches.length === 1 ? matches[0] : null;
}

function isEligibleActor(actor) {
  return Boolean(
    actor
    && !actor.pack
    && NPC_ACTOR_TYPES.has(actor.type)
    && actor.isOwner
  );
}

export async function hydrateWorldNpcDamage(actor, { reason = 'manual' } = {}) {
  if (!isEligibleActor(actor)) return { actorId: actor?.id ?? null, reason, checked: 0, updated: 0, skipped: true };

  const actorRows = collectActorAttackRows(actor);
  if (!actorRows.length) return { actorId: actor.id, reason, checked: 0, updated: 0 };

  const updates = [];
  let checked = 0;

  for (const item of actor.items ?? []) {
    if (!WEAPON_ITEM_TYPES.has(item.type) || itemHasUsableDamage(item)) continue;
    const raw = findRawRowForItem(item, actorRows);
    if (!raw) continue;

    checked += 1;
    const itemData = item.toObject();
    const hydrated = await hydrateImportedStatblockWeapon(itemData, {
      raw,
      actorName: actor.name,
      templateName: actor.name,
      statblock: { name: actor.name, Name: actor.name }
    });

    if (!hydrated?.system?.statblockHydrated) continue;
    updates.push({
      _id: item.id,
      system: hydrated.system,
      flags: hydrated.flags
    });
  }

  if (updates.length) {
    await actor.updateEmbeddedDocuments('Item', updates, {
      diff: true,
      recursive: true,
      render: false,
      swseSource: 'npc-damage-hydration'
    });
    actor.render?.(false);
  }

  return { actorId: actor.id, actorName: actor.name, reason, checked, updated: updates.length };
}

export async function hydrateExistingWorldNpcDamage({ notify = false } = {}) {
  if (!game.user?.isGM) return { actorsChecked: 0, actorsUpdated: 0, itemsUpdated: 0, skipped: true };

  const actors = (game.actors?.contents ?? []).filter(isEligibleActor);
  let actorsUpdated = 0;
  let itemsUpdated = 0;

  for (const actor of actors) {
    try {
      const result = await hydrateWorldNpcDamage(actor, { reason: 'ready-scan' });
      if (result.updated > 0) actorsUpdated += 1;
      itemsUpdated += result.updated ?? 0;
    } catch (error) {
      console.warn('[SWSE NPC Damage] Failed to hydrate actor', actor?.name, error);
    }
  }

  const summary = { actorsChecked: actors.length, actorsUpdated, itemsUpdated };
  if (notify && itemsUpdated > 0) {
    ui.notifications?.info?.(`SWSE hydrated ${itemsUpdated} NPC weapon${itemsUpdated === 1 ? '' : 's'} across ${actorsUpdated} actor${actorsUpdated === 1 ? '' : 's'}.`);
  }
  return summary;
}

let registered = false;

export function registerNpcDamageHydrationHooks() {
  if (registered) return;
  registered = true;

  Hooks.on('createActor', (actor, options, userId) => {
    if (!game.user?.isGM || userId !== game.user.id || !isEligibleActor(actor)) return;
    queueMicrotask(() => hydrateWorldNpcDamage(actor, { reason: 'createActor' }).catch((error) => {
      console.warn('[SWSE NPC Damage] createActor hydration failed', actor?.name, error);
    }));
  });

  Hooks.once('ready', () => {
    if (!game.user?.isGM) return;
    hydrateExistingWorldNpcDamage().catch((error) => {
      console.warn('[SWSE NPC Damage] ready hydration scan failed', error);
    });
  });

  globalThis.SWSE ??= {};
  globalThis.SWSE.hydrateNpcDamage = hydrateWorldNpcDamage;
  globalThis.SWSE.hydrateAllNpcDamage = hydrateExistingWorldNpcDamage;
}

/**
 * EquipmentSkillHookResolver
 *
 * Foundation-only resolver for later bucket passes. Extra Skill Uses remain the
 * action/rules SSOT; this resolver only exposes which carried/equipped gear has
 * declared hooks that can unlock, require, modify, or consume against those
 * skill uses.
 */

import { normalizeEquipmentSystem, slugifyEquipment } from './equipment-normalizer.js';

function itemArray(actorOrItems = null) {
  if (!actorOrItems) return [];
  const source = actorOrItems.items ?? actorOrItems;
  if (Array.isArray(source)) return source;
  if (typeof source?.contents === 'object' && Array.isArray(source.contents)) return source.contents;
  if (typeof source?.values === 'function') return Array.from(source.values());
  if (typeof source?.filter === 'function') return source.filter(() => true);
  return [];
}

function normalizeQuantity(value) {
  const number = Number(value ?? 1);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 1;
}

function normalizeHook(rawHook = {}, item = {}) {
  const skill = slugifyEquipment(rawHook.skill ?? rawHook.skillKey ?? '', '');
  const useKey = slugifyEquipment(rawHook.useKey ?? rawHook.use ?? '', '');
  const mode = slugifyEquipment(rawHook.mode ?? 'modifies', 'modifies');
  if (!skill && !useKey) return null;
  return {
    skill,
    useKey,
    mode,
    required: rawHook.required === true,
    consumes: rawHook.consumes ?? null,
    bonus: rawHook.bonus ?? null,
    source: rawHook.source || item.name || '',
    note: rawHook.note || '',
    itemId: item.id ?? item._id ?? '',
    itemName: item.name ?? 'Equipment',
    itemUuid: item.uuid ?? null,
    quantity: normalizeQuantity(item.system?.quantity),
    equipped: item.system?.equipped === true || item.system?.equippable?.equipped === true,
    available: normalizeQuantity(item.system?.quantity) > 0
  };
}

export function getEquipmentSkillHooks(actorOrItems = null, { skill = '', useKey = '', includeUnavailable = false } = {}) {
  const skillFilter = slugifyEquipment(skill, '');
  const useFilter = slugifyEquipment(useKey, '');
  const hooks = [];

  for (const item of itemArray(actorOrItems)) {
    if (item?.type !== 'equipment') continue;
    const system = normalizeEquipmentSystem(item.system ?? {}, {
      id: item._id ?? item.id ?? '',
      sourcePack: item.pack ?? ''
    });
    for (const rawHook of system.skillHooks ?? []) {
      const hook = normalizeHook(rawHook, { ...item, system });
      if (!hook) continue;
      if (!includeUnavailable && !hook.available) continue;
      if (skillFilter && hook.skill !== skillFilter) continue;
      if (useFilter && hook.useKey !== useFilter) continue;
      hooks.push(hook);
    }
  }

  return hooks;
}

export function getEquipmentHooksForSkill(actorOrItems = null, skill = '', options = {}) {
  return getEquipmentSkillHooks(actorOrItems, { ...options, skill });
}

export function summarizeEquipmentSkillHooks(actorOrItems = null) {
  const hooks = getEquipmentSkillHooks(actorOrItems, { includeUnavailable: true });
  const bySkill = new Map();
  for (const hook of hooks) {
    if (!bySkill.has(hook.skill)) bySkill.set(hook.skill, []);
    bySkill.get(hook.skill).push(hook);
  }
  return {
    count: hooks.length,
    skills: Array.from(bySkill.entries()).map(([skill, entries]) => ({ skill, count: entries.length, hooks: entries }))
  };
}

export default {
  getEquipmentSkillHooks,
  getEquipmentHooksForSkill,
  summarizeEquipmentSkillHooks
};

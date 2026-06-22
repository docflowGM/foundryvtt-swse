/**
 * EquipmentSkillHookResolver
 *
 * Extra Skill Uses remain the action/rules SSOT. Equipment hooks unlock,
 * require, modify, and sometimes consume inventory against those skill uses.
 */

import { normalizeEquipmentSystem, slugifyEquipment } from './equipment-normalizer.js';

const SKILL_KEY_MAP = Object.freeze({
  acrobatics: 'acrobatics',
  climb: 'climb',
  deception: 'deception',
  endurance: 'endurance',
  gatherinformation: 'gatherInformation',
  'gather-information': 'gatherInformation',
  initiative: 'initiative',
  jump: 'jump',
  knowledge: 'knowledge',
  knowledgelifesciences: 'knowledgeLifeSciences',
  'knowledge-life-sciences': 'knowledgeLifeSciences',
  knowledgetechnology: 'knowledgeTechnology',
  'knowledge-technology': 'knowledgeTechnology',
  mechanics: 'mechanics',
  perception: 'perception',
  persuasion: 'persuasion',
  pilot: 'pilot',
  ride: 'ride',
  stealth: 'stealth',
  survival: 'survival',
  swim: 'swim',
  treatinjury: 'treatInjury',
  'treat-injury': 'treatInjury',
  usecomputer: 'useComputer',
  'use-computer': 'useComputer',
  usetheforce: 'useTheForce',
  'use-the-force': 'useTheForce'
});

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

function normalizeSkillKey(value) {
  const slug = slugifyEquipment(value, '');
  const squashed = slug.replace(/-/g, '');
  return SKILL_KEY_MAP[slug] || SKILL_KEY_MAP[squashed] || value || '';
}

function normalizeUseKey(value) {
  return slugifyEquipment(value, '');
}

function getHookPriority(hook = {}) {
  const explicit = Number(hook?.consumes?.priority ?? hook?.bonus?.priority ?? 100);
  return Number.isFinite(explicit) ? explicit : 100;
}

function isEquipped(system = {}) {
  return system.equipped === true || system.equippable?.equipped === true;
}

function normalizeHook(rawHook = {}, item = {}) {
  const system = item.system ?? {};
  const skill = normalizeSkillKey(rawHook.skill ?? rawHook.skillKey ?? '');
  const useKey = normalizeUseKey(rawHook.useKey ?? rawHook.use ?? '');
  const mode = slugifyEquipment(rawHook.mode ?? 'modifies', 'modifies');
  if (!skill && !useKey) return null;
  const quantity = normalizeQuantity(system.quantity);
  const equipped = isEquipped(system);
  const bonus = rawHook.bonus ?? null;
  const requiresEquipped = bonus?.requiresEquipped === true || rawHook.requiresEquipped === true;
  return {
    skill,
    useKey,
    mode,
    required: rawHook.required === true,
    consumes: rawHook.consumes ?? null,
    bonus,
    source: rawHook.source || item.name || '',
    note: rawHook.note || '',
    itemId: item.id ?? item._id ?? '',
    itemName: item.name ?? 'Equipment',
    itemUuid: item.uuid ?? null,
    quantity,
    equipped,
    requiresEquipped,
    available: quantity > 0 && (!requiresEquipped || equipped),
    carried: quantity > 0,
    priority: getHookPriority(rawHook),
    system
  };
}

function useAliases(skillUse = {}) {
  const values = [
    skillUse.key,
    skillUse.useKey,
    skillUse.id,
    skillUse._id,
    skillUse.label,
    skillUse.name,
    skillUse.application,
    skillUse._source?._id,
    skillUse._source?.name,
    skillUse._source?.system?.application
  ].map(normalizeUseKey).filter(Boolean);

  const text = `${skillUse.label ?? ''} ${skillUse.name ?? ''} ${skillUse.application ?? ''} ${skillUse._source?.system?.application ?? ''}`.toLowerCase();
  if (text.includes('first aid')) values.push('first-aid');
  if (text.includes('critical care')) values.push('critical-care');
  if (text.includes('surgery')) values.push('perform-surgery', 'surgery');
  if (text.includes('revivify')) values.push('revivify');
  if (text.includes('treat disease')) values.push('treat-disease');
  if (text.includes('treat poison')) values.push('treat-poison');
  if (text.includes('treat radiation')) values.push('treat-radiation');
  if (text.includes('long-term care') || text.includes('long term care')) values.push('long-term-care');
  if (text.includes('identify ailment') || text.includes('identify ailments')) values.push('identify-ailment');

  return Array.from(new Set(values));
}

function hookMatchesUse(hook = {}, skillUse = {}) {
  if (!hook) return false;
  if (!hook.useKey || hook.useKey === 'all' || hook.useKey === '*') return true;
  return useAliases(skillUse).includes(hook.useKey);
}

function hookMatchesSkill(hook = {}, skill = '') {
  if (!skill) return true;
  return hook.skill === normalizeSkillKey(skill);
}

function hookLabel(hook = {}) {
  const pieces = [hook.itemName || hook.source];
  if (hook.requiresEquipped && !hook.equipped) pieces.push('(not equipped)');
  if (hook.quantity <= 0) pieces.push('(none left)');
  return pieces.filter(Boolean).join(' ');
}

function sortHooks(a, b) {
  if (a.available !== b.available) return a.available ? -1 : 1;
  if (a.priority !== b.priority) return a.priority - b.priority;
  return String(a.itemName).localeCompare(String(b.itemName));
}

function equipmentBonusFromHooks(hooks = [], chosenConsumable = null) {
  let best = null;
  for (const hook of hooks) {
    if (!hook.available || !hook.bonus || hook.bonus.type !== 'equipment') continue;
    if (hook.bonus.appliesWhenChosen === true && chosenConsumable?.itemId !== hook.itemId) continue;
    const value = Number(hook.bonus.value ?? 0);
    if (!Number.isFinite(value) || value === 0) continue;
    if (!best || value > best.value) {
      best = {
        value,
        type: 'equipment',
        label: hook.bonus.label || `${value >= 0 ? '+' : ''}${value} Equipment bonus`,
        source: hook.itemName || hook.source,
        hook
      };
    }
  }
  return best;
}

export function getEquipmentSkillHooks(actorOrItems = null, { skill = '', useKey = '', includeUnavailable = false } = {}) {
  const skillFilter = normalizeSkillKey(skill);
  const useFilter = normalizeUseKey(useKey);
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

  return hooks.sort(sortHooks);
}

export function getEquipmentHooksForSkill(actorOrItems = null, skill = '', options = {}) {
  return getEquipmentSkillHooks(actorOrItems, { ...options, skill });
}

export function resolveEquipmentForSkillUse(actorOrItems = null, skillUse = {}, { skill = '' } = {}) {
  const skillKey = normalizeSkillKey(skill || skillUse.skillKey || skillUse.skill || skillUse._source?.system?.skill || '');
  const allHooks = getEquipmentSkillHooks(actorOrItems, { skill: skillKey, includeUnavailable: true })
    .filter((hook) => hookMatchesSkill(hook, skillKey))
    .filter((hook) => hookMatchesUse(hook, skillUse))
    .sort(sortHooks);

  const requiredHooks = allHooks.filter((hook) => hook.required === true || hook.mode === 'requires');
  const enableHooks = allHooks.filter((hook) => hook.mode === 'enables');
  const availableEnableHooks = enableHooks.filter((hook) => hook.available);
  const chosenConsumable = availableEnableHooks.find((hook) => hook.consumes) ?? null;

  const missingRequirements = [];
  if (enableHooks.some((hook) => hook.required === true) && !availableEnableHooks.length) {
    missingRequirements.push({ kind: 'any', label: enableHooks.map(hookLabel).join(' or '), hooks: enableHooks });
  }
  for (const hook of requiredHooks) {
    if (!hook.available) missingRequirements.push({ kind: 'required', label: hookLabel(hook), hooks: [hook] });
  }

  const availableHooks = allHooks.filter((hook) => hook.available);
  const equipmentBonus = equipmentBonusFromHooks(availableHooks, chosenConsumable);
  const notes = availableHooks.map((hook) => hook.note).filter(Boolean);
  const consumeOnAttempt = chosenConsumable?.consumes?.timing === 'onAttempt' || chosenConsumable?.consumes?.consumeOn === 'onAttempt';

  return {
    skillKey,
    useAliases: useAliases(skillUse),
    hooks: allHooks,
    availableHooks,
    missingRequirements,
    blocked: missingRequirements.length > 0,
    blockedReason: missingRequirements.length ? `Requires ${missingRequirements.map((entry) => entry.label).join(' and ')}` : '',
    enablingHooks: enableHooks,
    requiredHooks,
    chosenConsumable,
    consumeOnAttempt,
    equipmentBonus,
    equipmentBonusValue: equipmentBonus?.value ?? 0,
    notes,
    summary: summarizeSkillUseEquipment({ availableHooks, missingRequirements, equipmentBonus, chosenConsumable })
  };
}

export function summarizeSkillUseEquipment(state = {}) {
  if (state.missingRequirements?.length) return state.missingRequirements.map((entry) => `Missing: ${entry.label}`).join(' | ');
  const pieces = [];
  if (state.chosenConsumable) pieces.push(`${state.chosenConsumable.itemName} ready`);
  if (state.equipmentBonus) pieces.push(`${state.equipmentBonus.label} (${state.equipmentBonus.source})`);
  const passive = (state.availableHooks || [])
    .filter((hook) => hook.mode !== 'enables' && hook.bonus?.value === undefined)
    .map((hook) => hook.itemName || hook.source)
    .filter(Boolean);
  if (passive.length) pieces.push(`Gear: ${Array.from(new Set(passive)).join(', ')}`);
  return pieces.join(' | ');
}

export async function consumeEquipmentForSkillUse(actor = null, state = {}, { timing = 'onAttempt' } = {}) {
  if (!actor || !state?.chosenConsumable) return { consumed: false, reason: 'no-consumable' };
  const hook = state.chosenConsumable;
  const consumes = hook.consumes ?? {};
  const hookTiming = consumes.timing ?? consumes.consumeOn ?? '';
  if (hookTiming && hookTiming !== timing) return { consumed: false, reason: 'timing-mismatch' };
  const itemId = hook.itemId;
  const item = actor.items?.get?.(itemId) ?? itemArray(actor).find((entry) => (entry.id ?? entry._id) === itemId);
  if (!item) return { consumed: false, reason: 'item-not-found' };
  const amount = Math.max(1, Number(consumes.amount ?? 1) || 1);
  const quantity = normalizeQuantity(item.system?.quantity);
  if (quantity < amount) return { consumed: false, reason: 'insufficient-quantity', itemName: item.name };
  const nextQuantity = Math.max(0, quantity - amount);
  await item.update?.({ 'system.quantity': nextQuantity });
  return {
    consumed: true,
    itemId,
    itemName: item.name,
    amount,
    remaining: nextQuantity,
    reason: consumes.reason || hook.note || ''
  };
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
  resolveEquipmentForSkillUse,
  consumeEquipmentForSkillUse,
  summarizeEquipmentSkillHooks
};

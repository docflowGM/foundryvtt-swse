/**
 * EquipmentSkillHookResolver
 *
 * Extra Skill Uses remain the action/rules SSOT. Equipment hooks unlock,
 * require, modify, and sometimes consume inventory against those skill uses.
 */

import { normalizeEquipmentSystem, slugifyEquipment } from './equipment-normalizer.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { getSharedWeaponAuthorityRegistry, resolveCanonicalIdentity, resolveAttackWeaponRuntime, resolveCanonicalAttackProficiency } from '/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js';

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
    allowsUntrained: rawHook.allowsUntrained === true || rawHook.trainingOverride?.trainedOnlyUses === true,
    trainingOverride: rawHook.trainingOverride ?? null,
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

  // Mechanics bucket aliases. These let gear hooks target broad rules families
  // like "disable-device" or "repair" while still matching the more
  // specific Extra Skill Use cards in the compendium.
  if (text.includes('disable device')) {
    values.push('disable-device');
    if (text.includes('simple')) values.push('disable-device-simple');
    if (text.includes('tricky')) values.push('disable-device-tricky');
    if (text.includes('complex')) values.push('disable-device-complex');
  }
  if (text.includes('leave no trace') || text.includes('trace of tampering')) values.push('leave-no-trace');
  if (text.includes('repair droid')) values.push('repair', 'repair-droid');
  if (text.includes('repair object') || text.includes('repair vehicle') || text.includes('repair damaged')) values.push('repair', 'repair-object');
  if (text.includes('jury-rig') || text.includes('jury rig')) values.push('repair', 'jury-rig');
  if (text.includes('reprogram droid')) values.push('reprogram-droid');
  if (text.includes('modify droid')) values.push('modify-droid');
  if (text.includes('build object')) values.push('build-object');
  if (text.includes('biotech adaptation')) values.push('biotech-adaptation');
  if (text.includes('booby trap')) values.push('booby-trap');
  if (text.includes('explosive')) values.push('handle-explosives', 'set-explosive');
  if (text.includes('set detonator') || text.includes('detonator')) values.push('handle-explosives', 'set-detonator');

  // Perception / detection aliases for gear such as electrobinoculars, aural
  // amplifiers, demolitions sensors, and sensor packs.
  if (text.includes('listen') || text.includes('eavesdrop') || text.includes('aural') || text.includes('distant') || text.includes('ambient noises')) values.push('listen');
  if (text.includes('notice target') || text.includes('detect moving') || text.includes('detect target')) values.push('notice-targets');
  if (text.includes('search area') || text.includes('search')) values.push('search-area');
  if (text.includes('long-range spotter') || text.includes('long range spotter')) values.push('long-range-spotter');
  if (text.includes('sense deception') || text.includes('sense motive') || text.includes('detect lies')) values.push('sense-deception');
  if (text.includes('avoid surprise')) values.push('avoid-surprise');

  // Use Computer / computers and storage aliases. These allow equipment hooks
  // to target broad concepts like "improve-access" while matching the
  // canonical Extra Skill Use card labels.
  if (text.includes('access information')) {
    values.push('access-information');
    if (text.includes('general')) values.push('access-information-general');
    if (text.includes('specific')) values.push('access-information-specific');
    if (text.includes('private')) values.push('access-information-private');
    if (text.includes('secret')) values.push('access-information-secret');
  }
  if (text.includes('improve access')) values.push('improve-access');
  if (text.includes('issue routine command')) values.push('issue-routine-command');
  if (text.includes('disable or erase program') || text.includes('erase program')) values.push('disable-erase-program');
  if (text.includes('astrogate')) values.push('astrogate');
  if (text.includes('backtrail')) values.push('backtrail');
  if (text.includes('copy') && (text.includes('code cylinder') || text.includes('access card'))) values.push('copy-reprogram-code-cylinder');
  if (text.includes('reprogram') && (text.includes('code cylinder') || text.includes('access card'))) values.push('copy-reprogram-code-cylinder');
  if (text.includes('electronic device')) values.push('access-reprogram-electronic-device');
  if (text.includes('cover tracks')) values.push('cover-tracks');
  if (text.includes('hyperspace')) values.push('detect-hyperspace-travel');
  if (text.includes('remote activation') || text.includes('activation code')) values.push('remote-activation-code');
  if (text.includes('use sensors') || text.includes('sensor')) values.push('use-sensors');
  if (text.includes('intercept communications') || text.includes('intercept transmission') || text.includes('intercepted transmission')) values.push('intercept-communications', 'intercept-transmission');
  if (text.includes('decrypt') && (text.includes('transmission') || text.includes('scrambled') || text.includes('communications'))) values.push('decrypt-transmission', 'decrypt-scrambled-transmission');
  if ((text.includes('communication') || text.includes('comlink') || text.includes('signal')) && (text.includes('jamming') || text.includes('jammed') || text.includes('scrambler'))) values.push('overcome-communication-jamming', 'overcome-com-scrambler');
  if (text.includes('hide communication device') || text.includes('hide comlink') || text.includes('earbud comlink') || text.includes('comlink, earbud')) values.push('hide-communication-device', 'hide-comlink');

  // Survival / life-support aliases. These connect survival gear to the
  // canonical skill-use cards without inventing a parallel gear action model.
  if (text.includes('basic survival')) values.push('basic-survival');
  if (text.includes('endure extreme temperatures') || text.includes('extreme temperature')) values.push('endure-extreme-temperatures');
  if (text.includes('track')) values.push('track');
  if (text.includes('cross difficult terrain') || text.includes('difficult terrain')) values.push('cross-difficult-terrain');
  if (text.includes('hold breath') || text.includes('breath')) values.push('hold-breath');
  if (text.includes('ignore hunger') || text.includes('hunger')) values.push('ignore-hunger');
  if (text.includes('ignore thirst') || text.includes('thirst')) values.push('ignore-thirst');
  if (text.includes('swim') || text.includes('tread water')) values.push('swim-tread-water');
  if (text.includes('conceal item on self') || text.includes('conceal item') || text.includes('conceal weapon')) values.push('conceal-item-on-self', 'conceal-weapon');
  if (text.includes('conceal large item') || text.includes('conceal covered area') || text.includes('conceal position')) values.push('conceal-large-item');
  if (text.includes('snipe') || text.includes('sniping')) values.push('snipe');
  if (text.includes('hide') || text.includes('sneak')) values.push('hide-sneak');
  if (text.includes('climb')) values.push('climb');

  return Array.from(new Set(values));
}

function hookMatchesUse(hook = {}, skillUse = {}) {
  if (!hook) return false;
  if (!hook.useKey || hook.useKey === 'all' || hook.useKey === '*') return true;
  const aliases = useAliases(skillUse);
  if (hook.useKey === 'climb' && hook.skill === 'climb') return true;
  return aliases.includes(hook.useKey);
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
    if (!hook.available || !hook.bonus || hook.bonus.type !== 'equipment' || hook.bonus.conditional === true) continue;
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

/**
 * Phase 5D-I-D-A1 -- weapon-carried skill hooks.
 *
 * The canonical weapon registry states, per identity, the skill effects the weapon grants its carrier (operation.* keys). They are turned into the SAME hook
 * shape equipment items use, so the one resolver below stays the only authority for equipment -> Extra Skill Use modifiers. Identity comes from
 * resolveCanonicalIdentity (flag stamp / production id), NEVER from the item name; a legacy weapon (no canonical identity) derives no hooks.
 *
 *   key                                   hook                                                                         source (registry canonicalPlayerText)
 *   concealmentEquipmentBonus             +N EQUIPMENT bonus, Stealth, "conceal item on self", only for THIS weapon     "...+5 equipment bonus on Stealth checks made to conceal the weapon"
 *   concealmentStealthBonus               +N untyped bonus,   Stealth, "conceal item on self", only for THIS weapon     Defender Microblaster: "+5 bonus on Stealth checks to conceal it"
 *   concealmentStealthPenalty             -N penalty,         Stealth, "conceal item on self", only for THIS weapon     Ascension Gun: "bulk imposes -5 on Stealth checks made to conceal it"
 *   snipingStealthEquipmentBonus          +N EQUIPMENT bonus, Stealth, "snipe", only when sniping WITH this weapon      Magna Caster: "+5 equipment bonus on Stealth checks made to snipe"
 *   survivalBasicForestJungleBonus...     +N untyped bonus,   Survival, "basic survival", carried + proficient + forest/jungle   Ryyk Blade
 * Qualifier keys (concealmentSkill, snipingSkill, concealmentContext) are validated, never assumed: a mismatch derives no hook.
 */
export const WEAPON_SKILL_HOOK_SPECS = Object.freeze([
  Object.freeze({ key: 'concealmentEquipmentBonus', skill: 'stealth', useKey: 'conceal-item-on-self', type: 'equipment', itemScope: 'self-item', qualifiers: { concealmentSkill: 'stealth', concealmentContext: 'conceal this weapon' } }),
  Object.freeze({ key: 'concealmentStealthBonus', skill: 'stealth', useKey: 'conceal-item-on-self', type: 'untyped', itemScope: 'self-item', qualifiers: { concealmentSkill: 'stealth', concealmentContext: 'conceal this weapon' } }),
  Object.freeze({ key: 'concealmentStealthPenalty', skill: 'stealth', useKey: 'conceal-item-on-self', type: 'penalty', itemScope: 'self-item', qualifiers: { concealmentSkill: 'stealth', concealmentContext: 'conceal this weapon' } }),
  Object.freeze({ key: 'snipingStealthEquipmentBonus', skill: 'stealth', useKey: 'snipe', type: 'equipment', itemScope: 'self-item', qualifiers: { snipingSkill: 'stealth' } }),
  Object.freeze({ key: 'survivalBasicForestJungleBonusWhenProficientAndCarried', skill: 'survival', useKey: 'basic-survival', type: 'untyped', itemScope: 'carried', requires: Object.freeze({ terrain: ['forest', 'jungle'], proficient: true }) })
]);

function weaponDerivedHooks(item, actor = null) {
  if (!['weapon', 'lightsaber'].includes(String(item?.type ?? '').toLowerCase())) return [];
  const registry = getSharedWeaponAuthorityRegistry();
  if (!registry) return [];
  let record = null;
  try {
    const identity = resolveCanonicalIdentity(item, registry);
    if (identity.kind !== 'canonical') return [];
    record = registry.getByIdentityKey(identity.identityKey);
  } catch (_err) { return []; }
  const operation = record?.operation ?? {};
  const hooks = [];
  for (const spec of WEAPON_SKILL_HOOK_SPECS) {
    if (!(spec.key in operation)) continue;
    const value = Number(operation[spec.key]);
    if (!Number.isFinite(value) || value === 0) continue;
    // qualifier keys must agree with the spec; a disagreement means the record states something this mapping was not written for
    const qualifiersAgree = Object.entries(spec.qualifiers ?? {}).every(([qualifierKey, expected]) => !(qualifierKey in operation) || String(operation[qualifierKey]).trim().toLowerCase() === expected);
    if (!qualifiersAgree) continue;
    const signed = spec.type === 'penalty' ? -Math.abs(value) : value;
    const hook = normalizeHook({
      skill: spec.skill, useKey: spec.useKey, mode: 'modifies', source: record.canonicalName || item.name,
      bonus: { type: spec.type, value: signed, label: `${signed > 0 ? '+' : ''}${signed} ${spec.type === 'penalty' ? 'Penalty' : spec.type === 'equipment' ? 'Equipment bonus' : 'Bonus'}`, conditional: false },
      requiresEquipped: false
    }, item);
    if (!hook) continue;
    hooks.push({ ...hook, origin: 'canonical-weapon', canonicalKey: spec.key, identityKey: record.identityKey, itemScope: spec.itemScope, requires: spec.requires ?? null, actor });
  }
  return hooks;
}

export function getEquipmentSkillHooks(actorOrItems = null, { skill = '', useKey = '', includeUnavailable = false } = {}) {
  const skillFilter = normalizeSkillKey(skill);
  const useFilter = normalizeUseKey(useKey);
  const hooks = [];

  for (const item of itemArray(actorOrItems)) {
    if (item?.type === 'weapon' || item?.type === 'lightsaber') {
      for (const hook of weaponDerivedHooks(item, actorOrItems?.items ? actorOrItems : null)) {
        if (!includeUnavailable && !hook.available) continue;
        if (skillFilter && hook.skill !== skillFilter) continue;
        if (useFilter && hook.useKey !== useFilter) continue;
        hooks.push(hook);
      }
      continue;
    }
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

function terrainList(value) {
  const list = Array.isArray(value) ? value : value == null ? [] : [value];
  return list.map((entry) => slugifyEquipment(entry, '')).filter(Boolean);
}

/** is the actor proficient with this canonical weapon? true / false, or null when it cannot be observed (fail closed at the caller) */
function carrierProficiency(item, actor) {
  try {
    const runtime = resolveAttackWeaponRuntime(item, {});
    if (runtime?.source !== 'canonical') return null;
    return resolveCanonicalAttackProficiency(runtime, actor).proficient === true;
  } catch (_err) { return null; }
}

/**
 * Turn the AVAILABLE hooks of one skill use into signed modifiers with provenance and explicit stacking.
 *   equipment bonuses   do not stack with each other: the best one applies (the others are reported as superseded, never silently dropped)
 *   untyped bonuses     stack
 *   penalties           stack and are NEVER suppressed by (nor counted against) the best-equipment-bonus selection
 *   self-item hooks     apply only when `context.hookItemId` names THIS item (the object being concealed / the weapon used to snipe); no context -> not applied
 *   requires.terrain    only when `context.terrain` names one of the listed terrains; requires.proficient only when the carrier is proficient with the weapon
 * A hook that does not apply is returned in `skipped` with its reason (shown to the player), never guessed.
 * @returns {{modifiers:object[], total:number, skipped:object[]}}
 */
export function resolveSkillModifiersFromHooks(hooks = [], { actor = null, context = {}, chosenConsumable = null } = {}) {
  const applicable = [];
  const skipped = [];
  const terrain = terrainList(context?.terrain);
  for (const hook of hooks) {
    const bonus = hook?.bonus;
    if (!hook?.available || !bonus || bonus.conditional === true) continue;
    const value = Number(bonus.value ?? 0);
    if (!Number.isFinite(value) || value === 0) continue;
    const type = bonus.type === 'penalty' || value < 0 ? 'penalty' : bonus.type === 'equipment' ? 'equipment' : bonus.type === 'untyped' ? 'untyped' : null;
    const label = hook.itemName || hook.source;
    const note = (reason) => skipped.push({ id: `${hook.itemId}:${hook.canonicalKey ?? hook.useKey ?? hook.skill}`, label, source: label, itemId: hook.itemId, skill: hook.skill, useKey: hook.useKey, value, type: type ?? bonus.type ?? null, reason });
    // Conservative wiring (Automation Authority): only a plain, use-specific, always-available modifier is applied automatically.
    //   - enable / require hooks, consumables and training overrides are not modifiers: they stay with their own (unwired) paths, so merely
    //     carrying a consumable can never grant its bonus or be consumed here
    //   - circumstance / unknown typed bonuses were never applied and stay unapplied
    //   - "all uses" hooks depend on activation, terrain or other circumstances the system cannot observe (Holoshroud, Sound Sponge, Camouflage
    //     Poncho...): UNKNOWN is not TRUE, so they are reported and not applied until a contextual toggle exists
    if (hook.mode && hook.mode !== 'modifies') { note('not-a-modifier-hook'); continue; }
    if (hook.required === true || hook.consumes) { note('consumable-or-required-hook'); continue; }
    if (!type) { note('unsupported-bonus-type'); continue; }
    if (!hook.useKey || hook.useKey === 'all' || hook.useKey === '*') { note('all-uses-hook-needs-context'); continue; }
    const entry = { hook, type, value, id: `${hook.itemId}:${hook.canonicalKey ?? hook.useKey ?? hook.skill}`, label, source: label, itemId: hook.itemId, skill: hook.skill, useKey: hook.useKey };
    if (bonus.appliesWhenChosen === true && chosenConsumable?.itemId !== hook.itemId) continue; // legacy: only the consumable that was chosen for this use
    if (hook.itemScope === 'self-item' && String(context?.hookItemId ?? '') !== String(hook.itemId)) { skipped.push({ ...entry, reason: context?.hookItemId ? 'different-item' : 'item-context-missing' }); continue; }
    if (hook.requires?.terrain && !hook.requires.terrain.some((t) => terrain.includes(t))) { skipped.push({ ...entry, reason: terrain.length ? 'terrain-mismatch' : 'terrain-unstated' }); continue; }
    if (hook.requires?.proficient) {
      const owned = actor?.items?.get?.(hook.itemId) ?? null;
      const proficient = owned ? carrierProficiency(owned, actor) : null;
      if (proficient !== true) { skipped.push({ ...entry, reason: proficient === false ? 'not-proficient' : 'proficiency-unobserved' }); continue; }
    }
    applicable.push(entry);
  }
  const modifiers = [];
  const equipment = applicable.filter((e) => e.type === 'equipment').sort((a, b) => b.value - a.value);
  if (equipment.length) { modifiers.push(equipment[0]); for (const loser of equipment.slice(1)) skipped.push({ ...loser, reason: 'superseded-equipment-bonus' }); }
  for (const e of applicable) if (e.type !== 'equipment') modifiers.push(e);
  const slim = ({ hook, ...rest }) => rest; // provenance only: never carry the hook (it holds the item system) into chat flags
  return { modifiers: modifiers.map(slim), total: modifiers.reduce((sum, e) => sum + e.value, 0), skipped: skipped.map(slim) };
}

export function resolveEquipmentForSkillUse(actorOrItems = null, skillUse = {}, { skill = '', context = {} } = {}) {
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
  const trainingOverrideHook = availableHooks.find((hook) => hook.allowsUntrained === true);
  const trainingOverride = Boolean(trainingOverrideHook);
  const trainingOverrideLabel = trainingOverrideHook?.trainingOverride?.label || (trainingOverrideHook ? `${trainingOverrideHook.itemName || trainingOverrideHook.source} permits this trained-only use while untrained` : '');
  const equipmentBonus = equipmentBonusFromHooks(availableHooks.filter((hook) => hook.itemScope !== 'self-item' && hook.itemScope !== 'carried'), chosenConsumable);
  const skillModifiers = resolveSkillModifiersFromHooks(availableHooks, { actor: actorOrItems?.items ? actorOrItems : null, context, chosenConsumable });
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
    trainingOverride,
    trainingOverrideLabel,
    trainingOverrideHook,
    enablingHooks: enableHooks,
    requiredHooks,
    chosenConsumable,
    consumeOnAttempt,
    equipmentBonus,
    equipmentBonusValue: equipmentBonus?.value ?? 0,
    skillModifiers: skillModifiers.modifiers,
    skillModifierTotal: skillModifiers.total,
    skippedSkillModifiers: skillModifiers.skipped,
    notes,
    summary: summarizeSkillUseEquipment({ availableHooks, missingRequirements, equipmentBonus, chosenConsumable })
  };
}

export function summarizeSkillUseEquipment(state = {}) {
  if (state.missingRequirements?.length) return state.missingRequirements.map((entry) => `Missing: ${entry.label}`).join(' | ');
  const pieces = [];
  if (state.chosenConsumable) pieces.push(`${state.chosenConsumable.itemName} ready`);
  if (state.trainingOverrideLabel) pieces.push(state.trainingOverrideLabel);
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
  // inventory mutation goes through ActorEngine (the owned-item mutation authority), never item.update()
  await ActorEngine.updateOwnedItems(actor, [{ _id: itemId, 'system.quantity': nextQuantity }], { source: 'EquipmentSkillHookResolver.consumeEquipmentForSkillUse' });
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
  resolveSkillModifiersFromHooks,
  consumeEquipmentForSkillUse,
  summarizeEquipmentSkillHooks
};

/**
 * SWSE Roll Configuration System
 * Provides hooks, dialogs, and configuration for all roll types
 * @module rolls/roll-config
 */

import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { getCriticalConfirmBonus } from "/systems/foundryvtt-swse/scripts/combat/utils/combat-utils.js";
import { WeaponRangeProfileResolver } from "/systems/foundryvtt-swse/scripts/items/weapon-range-profile-resolver.js";
import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";

/* ============================================================================
   ROLL HOOKS SYSTEM
   ============================================================================ */

/**
 * Standard hook names for roll events
 * @readonly
 * @enum {string}
 */
export const ROLL_HOOKS = Object.freeze({
  // Attack hooks
  PRE_ATTACK: 'swse.preRollAttack',
  POST_ATTACK: 'swse.postRollAttack',

  // Damage hooks
  PRE_DAMAGE: 'swse.preRollDamage',
  POST_DAMAGE: 'swse.postRollDamage',

  // Skill hooks
  PRE_SKILL: 'swse.preRollSkill',
  POST_SKILL: 'swse.postRollSkill',

  // Save/Defense hooks
  PRE_SAVE: 'swse.preRollSave',
  POST_SAVE: 'swse.postRollSave',

  // Initiative hooks
  PRE_INITIATIVE: 'swse.preRollInitiative',
  POST_INITIATIVE: 'swse.postRollInitiative',

  // Force Power hooks
  PRE_FORCE_POWER: 'swse.preRollForcePower',
  POST_FORCE_POWER: 'swse.postRollForcePower',

  // Force Point hooks (existing)
  PRE_FORCE_POINT: 'swse.preForcePointRoll',
  POST_FORCE_POINT: 'swse.postForcePointRoll',

  // Critical confirmation
  PRE_CRIT_CONFIRM: 'swse.preRollCritConfirm',
  POST_CRIT_CONFIRM: 'swse.postRollCritConfirm',

  // Generic roll hook
  PRE_ROLL: 'swse.preRoll',
  POST_ROLL: 'swse.postRoll'
});

/**
 * Call pre-roll hooks and allow modification of roll context
 * @param {string} hookName - The hook name from ROLL_HOOKS
 * @param {Object} context - The roll context object (will be modified in place)
 * @returns {boolean} False if roll should be cancelled
 */
export function callPreRollHook(hookName, context) {
  // Set cancelled flag that hooks can modify
  context._cancelled = false;

  // Call the specific hook
  Hooks.callAll(hookName, context);

  // Also call generic pre-roll hook
  if (hookName !== ROLL_HOOKS.PRE_ROLL) {
    Hooks.callAll(ROLL_HOOKS.PRE_ROLL, context);
  }

  return !context._cancelled;
}

/**
 * Call post-roll hooks with roll results
 * @param {string} hookName - The hook name from ROLL_HOOKS
 * @param {Object} context - The roll context including results
 */
export function callPostRollHook(hookName, context) {
  // Call the specific hook
  Hooks.callAll(hookName, context);

  // Also call generic post-roll hook
  if (hookName !== ROLL_HOOKS.POST_ROLL) {
    Hooks.callAll(ROLL_HOOKS.POST_ROLL, context);
  }
}

/* ============================================================================
   ROLL HISTORY / AUDIT LOG
   ============================================================================ */

/**
 * Roll History Manager - Tracks all rolls for audit/replay
 * @class
 */
export class RollHistory {
  /** @type {Array<Object>} */
  static _log = [];

  /** @type {number} Maximum entries to keep */
  static MAX_ENTRIES = 500;

  /**
   * Record a roll in the history
   * @param {Object} entry - Roll entry data
   * @param {Roll} entry.roll - The Foundry Roll object
   * @param {Actor} entry.actor - The actor who made the roll
   * @param {string} entry.type - Roll type (attack, damage, skill, etc.)
   * @param {Object} [entry.result] - Additional result data
   * @param {Object} [entry.context] - Roll context
   */
  static record({ roll, actor, type, result = {}, context = {} }) {
    const entry = {
      id: foundry.utils.randomID(),
      timestamp: Date.now(),
      actorId: actor?.id,
      actorName: actor?.name || 'Unknown',
      userId: game.user?.id,
      userName: game.user?.name || 'Unknown',
      type,
      formula: roll?.formula,
      total: roll?.total,
      dice: roll?.dice?.map(d => ({
        faces: d.faces,
        results: d.results.map(r => r.result)
      })),
      result,
      context: {
        skillKey: context.skillKey,
        weaponName: context.weapon?.name,
        targetName: context.target?.name,
        modifiers: context.modifiers
      }
    };

    this._log.push(entry);

    // Trim if over max
    if (this._log.length > this.MAX_ENTRIES) {
      this._log = this._log.slice(-this.MAX_ENTRIES);
    }

    // Call hook for external listeners
    Hooks.callAll('swse.rollRecorded', entry);

    return entry;
  }

  /**
   * Get all roll history entries
   * @param {Object} [filter] - Optional filter criteria
   * @param {string} [filter.type] - Filter by roll type
   * @param {string} [filter.actorId] - Filter by actor ID
   * @param {number} [filter.since] - Filter by timestamp (entries after)
   * @returns {Array<Object>}
   */
  static getHistory(filter = {}) {
    let entries = [...this._log];

    if (filter.type) {
      entries = entries.filter(e => e.type === filter.type);
    }
    if (filter.actorId) {
      entries = entries.filter(e => e.actorId === filter.actorId);
    }
    if (filter.since) {
      entries = entries.filter(e => e.timestamp >= filter.since);
    }

    return entries;
  }

  /**
   * Get the last N rolls
   * @param {number} [count=10] - Number of entries
   * @returns {Array<Object>}
   */
  static getRecent(count = 10) {
    return this._log.slice(-count);
  }

  /**
   * Export history as JSON
   * @returns {string}
   */
  static export() {
    return JSON.stringify(this._log, null, 2);
  }

  /**
   * Clear all history
   */
  static clear() {
    this._log = [];
  }

  /**
   * Get statistics about rolls
   * @returns {Object}
   */
  static getStats() {
    const stats = {
      total: this._log.length,
      byType: {},
      byActor: {},
      averageByType: {},
      criticalHits: 0,
      criticalMisses: 0
    };

    for (const entry of this._log) {
      // Count by type
      stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;

      // Count by actor
      stats.byActor[entry.actorName] = (stats.byActor[entry.actorName] || 0) + 1;

      // Track totals for averages
      if (!stats.averageByType[entry.type]) {
        stats.averageByType[entry.type] = { sum: 0, count: 0 };
      }
      if (entry.total != null) {
        stats.averageByType[entry.type].sum += entry.total;
        stats.averageByType[entry.type].count++;
      }

      // Track crits (d20 results)
      const d20Die = entry.dice?.find(d => d.faces === 20);
      if (d20Die) {
        const d20Result = d20Die.results[0];
        if (d20Result === 20) {stats.criticalHits++;}
        if (d20Result === 1) {stats.criticalMisses++;}
      }
    }

    // Calculate averages
    for (const [type, data] of Object.entries(stats.averageByType)) {
      stats.averageByType[type] = data.count > 0
        ? (data.sum / data.count).toFixed(2)
        : 0;
    }

    return stats;
  }
}

/* ============================================================================
   ROLL MODIFIERS DIALOG
   ============================================================================ */

/**
 * Roll modifier options for dialogs
 * @readonly
 */
export const ROLL_MODIFIERS = Object.freeze({
  // Cover options
  cover: {
    none: { label: 'No Cover', value: 0 },
    partial: { label: 'Partial Cover (+2)', value: 2 },
    cover: { label: 'Cover (+5)', value: 5 },
    improved: { label: 'Improved Cover (+10)', value: 10 }
  },

  // Concealment options
  concealment: {
    none: { label: 'No Concealment', missChance: 0 },
    partial: { label: 'Concealment (20%)', missChance: 20 },
    total: { label: 'Total Concealment (50%)', missChance: 50 }
  },

  // Situational modifiers
  situational: {
    aiming: { label: 'Aiming (+2)', value: 2 },
    charging: { label: 'Charging (+2 attack, -2 Ref)', attackValue: 2, reflexPenalty: -2 },
    flanking: { label: 'Flanking (+2)', value: 2 },
    prone: { label: 'Prone (-2 melee, +2 ranged)', meleeValue: -2, rangedValue: 2 },
    higherGround: { label: 'Higher Ground (+1)', value: 1 },
    pointBlank: { label: 'Point Blank Shot (+1)', value: 1 }
  }
  // Note: SWSE does not have advantage/disadvantage. Some species have reroll abilities
  // which are handled separately by the SpeciesRerollHandler.
});

/**
 * Show a roll modifiers dialog before making a roll
 * @param {Object} options - Dialog options
 * @param {string} options.title - Dialog title
 * @param {string} options.rollType - Type of roll (attack, skill, save, etc.)
 * @param {Actor} options.actor - The actor making the roll
 * @param {Item} [options.weapon] - The weapon being used (for attacks)
 * @param {boolean} [options.showCover=true] - Show cover options
 * @param {boolean} [options.showConcealment=true] - Show concealment options
 * @param {boolean} [options.showForcePoint=true] - Show Force Point option
 * @returns {Promise<Object|null>} The selected modifiers or null if cancelled
 */
function escapeHTML(value = '') {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

function normalizeKey(value = '') {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function actorHasNamedItem(actor, names = []) {
  const wanted = new Set(names.map(normalizeKey));
  for (const item of actor?.items ?? []) {
    if (wanted.has(normalizeKey(item?.name))) return true;
    const stable = normalizeKey(item?.system?.slug ?? item?.system?.key ?? item?.flags?.swse?.stableKey ?? '');
    if (stable && wanted.has(stable)) return true;
  }
  return false;
}

function isSkillTrained(actor, skillKey) {
  const skill = actor?.system?.skills?.[skillKey];
  const derived = Array.isArray(actor?.system?.derived?.skills?.list)
    ? actor.system.derived.skills.list.find(s => s?.key === skillKey)
    : actor?.system?.derived?.skills?.[skillKey];
  return skill?.trained === true || derived?.trained === true;
}

function getForcePointState(actor) {
  const fp = actor?.system?.forcePoints ?? {};
  const value = Number(fp.value ?? fp.current ?? 0) || 0;
  const max = Number(fp.max ?? fp.maximum ?? value) || value;
  return { value, max, has: value > 0 };
}

function getFightDefensivelyActionMode() {
  try {
    return game.settings.get('foundryvtt-swse', 'fightDefensivelyActionMode') || 'default';
  } catch (_err) {
    return 'default';
  }
}

function fightDefensivelyModeLabel(mode) {
  if (mode === 'swift') return 'Swift-action house rule';
  if (mode === 'rai') return 'RAI: attack-compatible stance';
  return 'Default RAW: standard-action stance';
}

function isRangedWeapon(weapon = {}) {
  const system = weapon?.system ?? weapon ?? {};
  const branch = String(system.meleeOrRanged ?? system.weaponRangeType ?? system.rangeType ?? '').toLowerCase();
  if (branch === 'ranged') return true;
  if (branch === 'melee') return false;
  const range = String(system.range ?? '').toLowerCase();
  return range && range !== 'melee';
}

function isMeleeWeapon(weapon = {}) {
  return !isRangedWeapon(weapon);
}

function weaponProperties(weapon = {}) {
  const props = weapon?.system?.properties;
  if (Array.isArray(props)) return props.map(p => String(p).toLowerCase());
  return String(props ?? '').split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
}

function weaponSupportsAutofire(weapon = {}) {
  const props = weaponProperties(weapon);
  return weapon?.system?.autofire === true || props.some(p => p.includes('autofire'));
}

function selectedTargetRows() {
  const targets = Array.from(game.user?.targets ?? []);
  return targets.map(token => ({
    id: token?.id ?? token?.document?.id ?? '',
    name: token?.name ?? token?.document?.name ?? token?.actor?.name ?? 'Target',
    defense: Number(token?.actor?.system?.defenses?.reflex?.total ?? token?.actor?.system?.derived?.defenses?.reflex?.total ?? 10) || 10
  }));
}

function combatantRows() {
  return Array.from(game.combat?.combatants ?? [])
    .filter(c => c?.actor)
    .map(c => ({
      id: c.actor.id,
      name: c.name ?? c.actor.name,
      defense: Number(c.actor.system?.defenses?.reflex?.total ?? c.actor.system?.derived?.defenses?.reflex?.total ?? 10) || 10
    }));
}

async function buildWeaponRangeProfile(weapon) {
  try {
    const fromSystem = weapon?.system?.ranges ? {
      profileSlug: weapon?.system?.rangeProfile ?? weapon?.system?.weaponCategory ?? '',
      profileName: weapon?.system?.rangeProfileName ?? 'Custom Range',
      range: weapon?.system?.range ?? '',
      ranges: weapon.system.ranges
    } : null;
    if (fromSystem?.ranges && Object.keys(fromSystem.ranges).length) return fromSystem;
    return await WeaponRangeProfileResolver.resolveForWeapon(weapon);
  } catch (_err) {
    return null;
  }
}

function formatBandChip(label, band) {
  if (!band) return '';
  const mod = Number(band.attackMod ?? 0) || 0;
  return `<span class="swse-roll-config-chip"><b>${escapeHTML(label)}</b> ${escapeHTML(band.min)}-${escapeHTML(band.max)} ${mod ? `(${mod})` : ''}</span>`;
}

function optionCard(option) {
  const id = escapeHTML(option.id);
  const label = escapeHTML(option.label ?? option.id);
  const summary = escapeHTML(option.summary ?? option.warning ?? '');
  if (option.control === 'slider') {
    return `<label class="swse-roll-config-option swse-roll-config-option--slider">
      <span><b>${label}</b>${summary ? `<small>${summary}</small>` : ''}</span>
      <input type="number" name="combatOptions.${id}" min="${Number(option.min ?? 0)}" max="${Number(option.max ?? 0)}" step="${Number(option.step ?? 1)}" value="${Number(option.value ?? 0)}" ${option.disabled ? 'disabled' : ''}/>
    </label>`;
  }
  return `<label class="swse-roll-config-option">
    <input type="checkbox" name="combatOptions.${id}" ${option.checked ? 'checked' : ''} ${option.disabled ? 'disabled' : ''}/>
    <span><b>${label}</b>${summary ? `<small>${summary}</small>` : ''}</span>
  </label>`;
}


function signNumber(value) {
  const n = Number(value) || 0;
  return `${n >= 0 ? '+' : ''}${n}`;
}

const ABILITY_ROLL_ACCENTS = Object.freeze({
  str: '255,138,61',
  dex: '97,214,111',
  con: '255,209,102',
  int: '76,201,240',
  wis: '199,125,255',
  cha: '255,92,190'
});

function normalizeAbilityKey(abilityKey) {
  const raw = String(abilityKey ?? '').trim().toLowerCase().replace(/[^a-z]/g, '');
  if (!raw) return '';
  const aliases = {
    strength: 'str',
    dexterity: 'dex',
    constitution: 'con',
    intelligence: 'int',
    wisdom: 'wis',
    charisma: 'cha'
  };
  const key = aliases[raw] ?? raw.slice(0, 3);
  return Object.prototype.hasOwnProperty.call(ABILITY_ROLL_ACCENTS, key) ? key : '';
}

function getAbilityRollAccent(abilityKey) {
  const key = normalizeAbilityKey(abilityKey);
  return ABILITY_ROLL_ACCENTS[key] ?? '100,220,160';
}

function getActorLevel(actor) {
  return Number(actor?.system?.level ?? actor?.system?.details?.level ?? actor?.system?.classes?.level ?? 0) || 0;
}

function abilityScoreToMod(value) {
  const score = Number(value);
  return Number.isFinite(score) ? Math.floor((score - 10) / 2) : null;
}

function getAbilityModifier(actor, abilityKey) {
  const key = normalizeAbilityKey(abilityKey);
  if (!key) return 0;

  const attrs = actor?.system?.attributes?.[key] ?? {};
  const ability = actor?.system?.abilities?.[key] ?? {};
  const derivedAttr = actor?.system?.derived?.attributes?.[key] ?? {};
  const derivedAbility = actor?.system?.derived?.abilities?.[key] ?? {};

  const directCandidates = [
    attrs.mod,
    attrs.modifier,
    derivedAttr.mod,
    derivedAttr.modifier,
    ability.mod,
    ability.modifier,
    derivedAbility.mod,
    derivedAbility.modifier
  ];
  for (const candidate of directCandidates) {
    const n = Number(candidate);
    if (Number.isFinite(n)) return n;
  }

  const scoreCandidates = [
    attrs.total,
    attrs.value,
    ability.total,
    ability.value
  ];
  for (const candidate of scoreCandidates) {
    const mod = abilityScoreToMod(candidate);
    if (mod !== null) return mod;
  }

  const rebuiltScore = Number(attrs.base ?? ability.base ?? 10)
    + Number(attrs.racial ?? attrs.species ?? ability.racial ?? ability.species ?? 0)
    + Number(attrs.enhancement ?? attrs.misc ?? ability.enhancement ?? ability.misc ?? 0)
    + Number(attrs.temp ?? ability.temp ?? 0);
  const rebuiltMod = abilityScoreToMod(rebuiltScore);
  return rebuiltMod ?? 0;
}

function getSkillData(actor, skillKey) {
  const key = String(skillKey ?? '');
  const direct = actor?.system?.skills?.[key] ?? {};
  const derivedByKey = actor?.system?.derived?.skillsByKey?.[key] ?? actor?.system?.derived?.skills?.[key] ?? {};
  const derivedList = Array.isArray(actor?.system?.derived?.skills?.list)
    ? actor.system.derived.skills.list.find(s => s?.key === key) ?? {}
    : {};
  return { direct, derivedByKey, derivedList };
}

function getSkillAbilityKey(actor, skillKey) {
  const { direct, derivedByKey, derivedList } = getSkillData(actor, skillKey);
  const fallbackBySkill = {
    acrobatics: 'dex', climb: 'str', deception: 'cha', endurance: 'con', gatherInformation: 'cha',
    initiative: 'dex', jump: 'str', mechanics: 'int', perception: 'wis', persuasion: 'cha',
    pilot: 'dex', ride: 'dex', stealth: 'dex', survival: 'wis', swim: 'str',
    treatInjury: 'wis', useComputer: 'int', useTheForce: 'cha'
  };
  return direct.selectedAbility
    || direct.ability
    || direct.abilityKey
    || direct.attribute
    || derivedByKey.selectedAbility
    || derivedByKey.ability
    || derivedByKey.abilityKey
    || derivedList.selectedAbility
    || derivedList.ability
    || derivedList.abilityKey
    || fallbackBySkill[skillKey]
    || 'str';
}

function getSkillComponentTotal(actor, skillKey) {
  const { direct, derivedByKey, derivedList } = getSkillData(actor, skillKey);
  const abilityKey = getSkillAbilityKey(actor, skillKey);
  const abilityMod = getAbilityModifier(actor, abilityKey);
  const halfLevel = Math.floor(getActorLevel(actor) / 2);
  const trained = (direct.trained === true || derivedByKey.trained === true || derivedList.trained === true) ? 5 : 0;
  const focus = (direct.focused === true || derivedByKey.focused === true || derivedList.focused === true) ? 5 : 0;
  const misc = Number(direct.miscMod ?? derivedByKey.miscMod ?? derivedList.miscMod ?? 0) || 0;
  const species = Number(direct.speciesBonus ?? derivedByKey.speciesBonus ?? derivedList.speciesBonus ?? 0) || 0;
  const armor = Number(derivedByKey.armorPenalty ?? derivedList.armorPenalty ?? 0) || 0;
  const condition = Number(derivedByKey.conditionPenalty ?? derivedList.conditionPenalty ?? 0) || 0;
  return abilityMod + halfLevel + trained + focus + misc + species + armor + condition;
}

function getSkillTotal(actor, skillKey) {
  const key = String(skillKey ?? '');
  if (!key) return 0;
  const componentTotal = getSkillComponentTotal(actor, key);

  // Use the Force is especially sensitive to stale legacy totals because Force
  // Focus/Skill Focus can be represented both as a checkbox and as an item bonus.
  // The roll dialog should show the RAW component total: ability + half level +
  // trained + focus + misc/penalties, not duplicated passive effects.
  if (key === 'useTheForce') return componentTotal;

  const { direct, derivedByKey, derivedList } = getSkillData(actor, key);
  const candidates = [derivedByKey?.total, derivedList?.total, direct?.total, direct?.value, direct?.mod];
  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n)) return n;
  }
  return componentTotal;
}

function getWeaponAttackBonus(actor, weapon) {
  const system = weapon?.system ?? {};
  const candidates = [
    system.attackBonus,
    system.attack?.bonus,
    system.equippedAttackBonus,
    system.derived?.attackBonus,
    system.derived?.attack?.bonus,
    weapon?.flags?.swse?.attackBonus
  ];
  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n)) return n;
  }
  const ability = isRangedWeapon(weapon) ? 'dex' : 'str';
  const bab = Number(actor?.system?.derived?.bab?.total ?? actor?.system?.bab?.total ?? actor?.system?.baseAttackBonus ?? 0) || 0;
  return bab + getAbilityModifier(actor, ability) + (Number(system.enhancementBonus ?? system.attackEnhancement ?? 0) || 0);
}

function getDamageModifier(weapon) {
  const system = weapon?.system ?? {};
  const candidates = [system.damageBonus, system.damage?.bonus, system.derived?.damageBonus, system.damageModifier];
  for (const candidate of candidates) {
    const n = Number(candidate);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function getRollBaseTotal(model) {
  if (model.rollType === 'skill' || model.rollType === 'force' || model.rollType === 'force-power') return getSkillTotal(model.actor, model.skillKey || 'useTheForce');
  if (model.rollType === 'attack') return getWeaponAttackBonus(model.actor, model.weapon);
  if (model.rollType === 'damage') return getDamageModifier(model.weapon);
  if (model.rollType === 'initiative') return getSkillTotal(model.actor, 'initiative');
  return getAbilityModifier(model.actor, model.abilityKey);
}

function getRollAccent(model) {
  if (model.rollType === 'attack') return model.ranged ? '255,100,140' : '232,64,96';
  if (model.rollType === 'damage') return '255,140,60';
  if (model.rollType === 'force' || model.rollType === 'force-power' || model.skillKey === 'useTheForce') return '180,140,255';
  if (model.rollType === 'initiative') return '255,180,60';
  if (model.rollType === 'ability') return getAbilityRollAccent(model.abilityKey);
  return '127,230,255';
}

function getRollIcon(model) {
  if (model.rollType === 'attack') return model.ranged ? '⊕' : '⚔';
  if (model.rollType === 'damage') return '◆';
  if (model.rollType === 'force' || model.rollType === 'force-power' || model.skillKey === 'useTheForce') return '◇';
  if (model.rollType === 'initiative') return '▶';
  if (model.rollType === 'ability') return '⬡';
  return '◈';
}

function getTake10State(model) {
  const attackLike = model.rollType === 'attack' || model.rollType === 'damage' || model.rollType === 'initiative';
  const forceLike = model.rollType === 'force' || model.rollType === 'force-power' || model.skillKey === 'useTheForce';
  return {
    available: !attackLike && !forceLike,
    note: attackLike ? 'Unavailable for attack, damage, and initiative rolls.' : forceLike ? 'Usually unavailable for active Force power use in combat.' : 'Available when the character is not threatened or distracted.'
  };
}

function buildCheckModeCards(model) {
  const base = Number(model.baseTotal ?? 0) || 0;
  const take10 = getTake10State(model);
  const take20Available = take10.available && model.rollType !== 'ability';
  return `<section class="swse-roll-config-panel swse-roll-config-panel--checks">
    <h4>Check Mode</h4>
    <input type="hidden" name="checkMode" value="roll" data-rcd-check-mode />
    <div class="rcd-check-cards" data-rcd-check-cards>
      <button type="button" class="rcd-check-card rcd-check-active" data-check-mode="roll">
        <span class="rcd-check-name">Roll</span>
        <span class="rcd-check-total">1d20 ${signNumber(base)}</span>
        <span class="rcd-check-note">Roll normally and apply selected modifiers.</span>
      </button>
      <button type="button" class="rcd-check-card ${take10.available ? '' : 'rcd-check-disabled'}" data-check-mode="take10" ${take10.available ? '' : 'disabled'}>
        <span class="rcd-check-name">Take 10</span>
        <span class="rcd-check-total">${10 + base}</span>
        <span class="rcd-check-note">${escapeHTML(take10.note)}</span>
      </button>
      <button type="button" class="rcd-check-card ${take20Available ? '' : 'rcd-check-disabled'}" data-check-mode="take20" ${take20Available ? '' : 'disabled'}>
        <span class="rcd-check-name">Take 20</span>
        <span class="rcd-check-total">${20 + base}</span>
        <span class="rcd-check-note">Requires time and no consequence for failure.</span>
      </button>
    </div>
  </section>`;
}

function buildResourceCards(model, showForcePoint) {
  const fpDisabled = !showForcePoint || !model.fp.has ? 'disabled' : '';
  return `<section class="swse-roll-config-panel swse-roll-config-panel--resources">
    <h4>Resources</h4>
    <input type="hidden" name="useForcePoint" value="" data-rcd-force-point />
    <div class="rcd-resources">
      <button type="button" class="rcd-resource ${fpDisabled ? 'rcd-resource-disabled' : ''}" data-resource-toggle="forcePoint" ${fpDisabled}>
        <span class="rcd-res-header"><span class="rcd-res-icon">✦</span><span class="rcd-res-name">Force Point</span></span>
        <span class="rcd-res-detail">${model.fp.value}/${model.fp.max} available. Add the system Force Point bonus during roll execution.</span>
      </button>
      <button type="button" class="rcd-resource rcd-resource-disabled" disabled>
        <span class="rcd-res-header"><span class="rcd-res-icon">◆</span><span class="rcd-res-name">Destiny Point</span></span>
        <span class="rcd-res-detail">Reserved for Destiny workflows. Not spent by this modifier dialog.</span>
      </button>
    </div>
  </section>`;
}

function buildRollModeRow(model) {
  const publicSelected = (game.settings?.get?.('core', 'rollMode') ?? 'publicroll') === 'publicroll' ? 'active' : '';
  return `<section class="swse-roll-config-panel swse-roll-config-panel--roll-mode">
    <h4>Roll Mode</h4>
    <div class="rcd-roll-mode">
      <button type="button" class="rcd-mode-btn ${publicSelected}" data-roll-mode="publicroll">Public</button>
      <button type="button" class="rcd-mode-btn" data-roll-mode="gmroll">GM</button>
      <button type="button" class="rcd-mode-btn" data-roll-mode="blindroll">Blind GM</button>
      <button type="button" class="rcd-mode-btn" data-roll-mode="selfroll">Self</button>
    </div>
    <input type="hidden" name="rollMode" value="${escapeHTML(game.settings?.get?.('core', 'rollMode') ?? 'publicroll')}" data-rcd-roll-mode />
  </section>`;
}

function buildRollPreviewRail(model) {
  const source = model.weaponName || model.skillKey || model.abilityKey || model.title;
  const base = Number(model.baseTotal ?? 0) || 0;
  const dc = model.targetRows?.[0]?.defense ?? 15;
  const hitChance = Math.max(5, Math.min(95, (21 - Math.max(1, Number(dc) - base)) * 5));
  const breakdownRows = model.breakdown?.length ? model.breakdown : [{ label: 'Base Bonus', value: base }];
  return `<aside class="rcd-rail">
    <section class="rcd-rail-sec rcd-rail-sec--preview">
      <div class="rcd-rail-lbl">Projected Outcome</div>
      <div class="rcd-preview-formula" data-rcd-formula>1d20 ${signNumber(base)}</div>
      <div class="rcd-preview-total" data-rcd-preview-total>${signNumber(base)}</div>
      <div class="rcd-preview-label">Current Modifier</div>
      <div class="rcd-preview-dc pending" data-rcd-dc-state>Target/DC: ${escapeHTML(dc)} · preview only</div>
      <div class="rcd-preview-prob">Estimated roll chance</div>
      <div class="rcd-prob-bar"><span class="rcd-prob-fill" data-rcd-prob-fill style="width:${hitChance}%"></span></div>
    </section>
    <section class="rcd-rail-sec">
      <div class="rcd-rail-lbl">Source Intel</div>
      <div class="swse-roll-config-source"><b>${escapeHTML(source)}</b><span>${escapeHTML(model.actorName || 'No actor')}</span></div>
      ${model.rangeProfile ? `<p class="swse-roll-config-note">Range profile: ${escapeHTML(model.rangeProfile.profileName ?? model.rangeProfile.profileSlug ?? 'Custom')}</p>` : ''}
      ${model.weapon ? `<p class="swse-roll-config-note">${model.ranged ? 'Ranged' : 'Melee'} attack profile. Combat options below are filtered from known actor/item capabilities.</p>` : ''}
    </section>
    <section class="rcd-rail-sec">
      <div class="rcd-rail-lbl">Breakdown</div>
      <div class="rcd-breakdown" data-rcd-breakdown>
        ${breakdownRows.map(row => `<div class="rcd-bd-row"><span class="rcd-bd-label">${escapeHTML(row.label)}</span><span class="rcd-bd-val">${signNumber(row.value ?? 0)}</span></div>`).join('')}
        <div class="rcd-bd-row"><span class="rcd-bd-label">Custom</span><span class="rcd-bd-val" data-rcd-custom-bd>+0</span></div>
        <div class="rcd-bd-row"><span class="rcd-bd-label">Situational</span><span class="rcd-bd-val" data-rcd-situational-bd>+0</span></div>
        <div class="rcd-bd-total"><span class="rcd-bd-total-label">Total</span><span class="rcd-bd-total-val" data-rcd-bd-total>${signNumber(base)}</span></div>
      </div>
    </section>
  </aside>`;
}

function wireRollConfigDialog(html) {
  const root = html?.[0] ?? html;
  const form = root?.querySelector?.('.swse-roll-config-v2');
  if (!form) return;
  const shell = form.closest('.swse-roll-config-shell') ?? form;
  const base = Number(form.dataset.baseTotal ?? 0) || 0;
  const sign = value => `${value >= 0 ? '+' : ''}${value}`;
  const update = () => {
    const custom = Number(form.querySelector('[name="customModifier"]')?.value ?? 0) || 0;
    let situational = 0;
    for (const name of ['aiming','charging','flanking','higherGround','pointBlank']) {
      if (form.querySelector(`[name="${name}"]`)?.checked) {
        situational += name === 'higherGround' || name === 'pointBlank' ? 1 : 2;
      }
    }
    const total = base + custom + situational;
    form.querySelector('[data-rcd-custom-bd]')?.replaceChildren(document.createTextNode(sign(custom)));
    form.querySelector('[data-rcd-situational-bd]')?.replaceChildren(document.createTextNode(sign(situational)));
    form.querySelector('[data-rcd-bd-total]')?.replaceChildren(document.createTextNode(sign(total)));
    form.querySelector('[data-rcd-preview-total]')?.replaceChildren(document.createTextNode(sign(total)));
    form.querySelector('[data-rcd-formula]')?.replaceChildren(document.createTextNode(`1d20 ${sign(total)}`));
  };
  shell.querySelectorAll('[data-check-mode]').forEach(btn => btn.addEventListener('click', event => {
    const card = event.currentTarget;
    if (card.disabled) return;
    shell.querySelectorAll('[data-check-mode]').forEach(other => other.classList.toggle('rcd-check-active', other === card));
    const input = form.querySelector('[data-rcd-check-mode]');
    if (input) input.value = card.dataset.checkMode || 'roll';
  }));
  shell.querySelectorAll('[data-resource-toggle="forcePoint"]').forEach(btn => btn.addEventListener('click', event => {
    const card = event.currentTarget;
    if (card.disabled) return;
    card.classList.toggle('rcd-res-active');
    const input = form.querySelector('[data-rcd-force-point]');
    if (input) input.value = card.classList.contains('rcd-res-active') ? 'on' : '';
  }));
  shell.querySelectorAll('[data-roll-mode]').forEach(btn => btn.addEventListener('click', event => {
    const target = event.currentTarget;
    shell.querySelectorAll('[data-roll-mode]').forEach(other => other.classList.toggle('active', other === target));
    const input = form.querySelector('[data-rcd-roll-mode]');
    if (input) input.value = target.dataset.rollMode || 'publicroll';
  }));
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();
}

async function buildRollConfigModel(options = {}) {
  const actor = options.actor ?? null;
  const weapon = options.weapon ?? options.item ?? null;
  const rollType = options.rollType ?? 'attack';
  const skillKey = options.skillKey ?? options.skill ?? null;
  const abilityKey = options.abilityKey ?? options.ability ?? (skillKey ? actor?.system?.skills?.[skillKey]?.ability : null);
  const fp = getForcePointState(actor);
  const targetRows = selectedTargetRows();
  const rangeProfile = weapon ? await buildWeaponRangeProfile(weapon) : null;
  const ranged = weapon ? isRangedWeapon(weapon) : false;
  const melee = weapon ? isMeleeWeapon(weapon) : false;
  const combatOptions = weapon ? CombatOptionResolver.summarizeAttackOptions(actor, weapon, { attackType: ranged ? 'ranged' : 'melee' }) : [];

  const baseTotal = Number(options.baseBonus ?? getRollBaseTotal({ actor, weapon, rollType, skillKey, abilityKey, ranged, melee })) || 0;
  const breakdown = [];
  if (rollType === 'skill' || rollType === 'force' || rollType === 'force-power') {
    const key = skillKey || 'useTheForce';
    const { direct, derivedByKey, derivedList } = getSkillData(actor, key);
    const ability = abilityKey ?? getSkillAbilityKey(actor, key);
    const abilityMod = getAbilityModifier(actor, ability);
    const trained = isSkillTrained(actor, key) ? 5 : 0;
    const focus = (direct.focused === true || derivedByKey.focused === true || derivedList.focused === true) ? 5 : 0;
    const halfLevel = Math.floor(getActorLevel(actor) / 2);
    breakdown.push({ label: `${String(ability ?? '').toUpperCase() || 'Ability'} Modifier`, value: abilityMod });
    if (halfLevel) breakdown.push({ label: 'Half Level', value: halfLevel });
    if (trained) breakdown.push({ label: 'Trained', value: trained });
    if (focus) breakdown.push({ label: 'Focus', value: focus });
    const misc = baseTotal - abilityMod - halfLevel - trained - focus;
    if (misc) breakdown.push({ label: 'Other Bonuses', value: misc });
  } else if (rollType === 'attack') {
    const bab = Number(actor?.system?.derived?.bab?.total ?? actor?.system?.bab?.total ?? actor?.system?.baseAttackBonus ?? 0) || 0;
    const ability = ranged ? 'dex' : 'str';
    const abilityMod = getAbilityModifier(actor, ability);
    if (bab) breakdown.push({ label: 'Base Attack Bonus', value: bab });
    if (abilityMod) breakdown.push({ label: `${ability.toUpperCase()} Modifier`, value: abilityMod });
    const misc = baseTotal - bab - abilityMod;
    if (misc) breakdown.push({ label: 'Weapon / Other', value: misc });
  } else if (rollType === 'ability') {
    breakdown.push({ label: `${String(abilityKey ?? '').toUpperCase() || 'Ability'} Modifier`, value: baseTotal });
  } else {
    breakdown.push({ label: 'Base Bonus', value: baseTotal });
  }

  return {
    title: options.title ?? 'Roll Configuration',
    actor,
    actorName: actor?.name ?? '',
    rollType,
    skillKey,
    abilityKey,
    weapon,
    weaponName: weapon?.name ?? '',
    ranged,
    melee,
    supportsAutofire: weaponSupportsAutofire(weapon),
    hasBurstFire: actorHasNamedItem(actor, ['Burst Fire']),
    hasRapidShot: actorHasNamedItem(actor, ['Rapid Shot']),
    hasPowerAttack: actorHasNamedItem(actor, ['Power Attack']),
    hasFlurry: actorHasNamedItem(actor, ['Flurry', 'Rapid Strike']),
    hasDoubleStrike: actorHasNamedItem(actor, ['Double Strike', 'Double Attack']),
    hasTripleStrike: actorHasNamedItem(actor, ['Triple Strike', 'Triple Attack']),
    trainedAcrobatics: isSkillTrained(actor, 'acrobatics'),
    fightDefensivelyMode: getFightDefensivelyActionMode(),
    fp,
    targetRows,
    combatantRows: combatantRows(),
    rangeProfile,
    combatOptions,
    baseTotal,
    breakdown,
    accentRgb: getRollAccent({ rollType, ranged, skillKey, abilityKey }),
    abilityAccentKey: normalizeAbilityKey(abilityKey),
    icon: getRollIcon({ rollType, ranged, skillKey, abilityKey })
  };
}

function buildTargetPanel(model) {
  const needsTarget = ['attack', 'force', 'force-power', 'save', 'damage', 'ability'].includes(String(model.rollType));
  if (!needsTarget) return '';
  const targetOptions = model.targetRows.map(t => `<option value="${escapeHTML(t.id)}">${escapeHTML(t.name)} · Ref ${escapeHTML(t.defense)}</option>`).join('');
  const combatantOptions = model.combatantRows.map(t => `<option value="${escapeHTML(t.id)}">${escapeHTML(t.name)} · Ref ${escapeHTML(t.defense)}</option>`).join('');
  return `<section class="swse-roll-config-panel">
    <h4>Target Context</h4>
    <div class="swse-roll-config-grid swse-roll-config-grid--target">
      <label>Mode
        <select name="targetMode">
          <option value="token" ${model.targetRows.length ? 'selected' : ''}>Selected token</option>
          <option value="combatant">Pick from combatants</option>
          <option value="manual" ${model.targetRows.length ? '' : 'selected'}>Manual defense/DC</option>
          <option value="none">No target · GM adjudication</option>
        </select>
      </label>
      <label>Selected Token
        <select name="targetTokenId"><option value="">None</option>${targetOptions}</select>
      </label>
      <label>Combatant
        <select name="targetActorId"><option value="">None</option>${combatantOptions}</select>
      </label>
      <label>Defense
        <select name="targetDefenseType">
          <option value="reflex">Reflex</option>
          <option value="fortitude">Fortitude</option>
          <option value="will">Will</option>
          <option value="dc">Static DC</option>
        </select>
      </label>
      <label>Manual Value
        <input type="number" name="targetDefenseValue" value="${model.targetRows[0]?.defense ?? ''}" placeholder="e.g. 18" />
      </label>
      <label>Range Band
        <select name="rangeBand">
          <option value="pointBlank">Point Blank</option>
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
          <option value="custom">Custom / GM</option>
        </select>
      </label>
    </div>
    <p class="swse-roll-config-note">Tokens are optional. Manual and GM-adjudication modes support theater-of-the-mind play.</p>
  </section>`;
}

function buildWeaponPanel(model) {
  if (!model.weapon) return '';
  const rangeChips = model.rangeProfile?.ranges
    ? [formatBandChip('PB', model.rangeProfile.ranges.pb), formatBandChip('Short', model.rangeProfile.ranges.short), formatBandChip('Medium', model.rangeProfile.ranges.medium), formatBandChip('Long', model.rangeProfile.ranges.long)].filter(Boolean).join('')
    : '';
  const optionCards = model.combatOptions.map(optionCard).join('');
  const rangedPanel = model.ranged ? `<div class="swse-roll-config-subpanel">
      <h5>Ranged Options</h5>
      ${rangeChips ? `<div class="swse-roll-config-chips">${rangeChips}</div>` : ''}
      <label class="swse-roll-config-option"><input type="checkbox" name="attackOptions.autofire" ${model.supportsAutofire ? '' : 'disabled'} /> <span><b>Autofire</b><small>${model.supportsAutofire ? 'Weapon supports autofire.' : 'Unavailable for this weapon.'}</small></span></label>
      <label class="swse-roll-config-option"><input type="checkbox" name="attackOptions.burstFire" ${(model.supportsAutofire && model.hasBurstFire) ? '' : 'disabled'} /> <span><b>Burst Fire</b><small>${model.hasBurstFire ? 'Unlocked by feat.' : 'Requires Burst Fire.'}</small></span></label>
      <label class="swse-roll-config-option"><input type="checkbox" name="attackOptions.rapidShot" ${model.hasRapidShot ? '' : 'disabled'} /> <span><b>Rapid Shot</b><small>${model.hasRapidShot ? '-2 attack, +1 damage die.' : 'Requires Rapid Shot.'}</small></span></label>
    </div>` : '';
  const meleePanel = model.melee ? `<div class="swse-roll-config-subpanel">
      <h5>Melee Options</h5>
      <label>Grip
        <select name="grip">
          <option value="one-handed">One-handed</option>
          <option value="two-handed">Two-handed</option>
          <option value="dual-wield">Dual wielding</option>
        </select>
      </label>
      <label class="swse-roll-config-option"><input type="checkbox" name="attackOptions.powerAttack" ${model.hasPowerAttack ? '' : 'disabled'} /> <span><b>Power Attack</b><small>${model.hasPowerAttack ? 'Trade accuracy for damage.' : 'Requires Power Attack.'}</small></span></label>
      <label class="swse-roll-config-option"><input type="checkbox" name="attackOptions.flurry" ${model.hasFlurry ? '' : 'disabled'} /> <span><b>Flurry / Rapid Strike</b><small>${model.hasFlurry ? 'Unlocked melee multi-strike option.' : 'Requires unlock.'}</small></span></label>
      <label class="swse-roll-config-option"><input type="checkbox" name="attackOptions.doubleStrike" ${model.hasDoubleStrike ? '' : 'disabled'} /> <span><b>Double Strike</b><small>${model.hasDoubleStrike ? 'Full-round multiattack.' : 'Unlocks contextually later.'}</small></span></label>
      <label class="swse-roll-config-option"><input type="checkbox" name="attackOptions.tripleStrike" ${model.hasTripleStrike ? '' : 'disabled'} /> <span><b>Triple Strike</b><small>${model.hasTripleStrike ? 'Full-round multiattack.' : 'Unlocks contextually later.'}</small></span></label>
    </div>` : '';

  return `<section class="swse-roll-config-panel">
    <h4>Weapon Profile</h4>
    <div class="swse-roll-config-source"><b>${escapeHTML(model.weaponName)}</b><span>${model.ranged ? 'Ranged' : 'Melee'} · ${escapeHTML(model.weapon?.system?.weaponCategory ?? model.weapon?.system?.rangeProfileName ?? '')}</span></div>
    ${rangedPanel}${meleePanel}
    ${optionCards ? `<div class="swse-roll-config-subpanel"><h5>Unlocked Attack Options</h5>${optionCards}</div>` : ''}
  </section>`;
}

function buildDefenseActionPanel(model) {
  if (model.rollType !== 'attack') return '';
  const fdBonus = model.trainedAcrobatics ? 5 : 2;
  const tdBonus = model.trainedAcrobatics ? 10 : 5;
  const mode = model.fightDefensivelyMode || 'default';
  const fdDisabled = mode === 'default' ? 'disabled' : '';
  const fdNote = mode === 'default'
    ? `Use the Fight Defensively combat-action toggle first. If you attack afterward, the active stance applies -5 attack and +${fdBonus} Reflex; the GM adjudicates RAW action timing.`
    : `Toggle this stance for this attack: -5 attack, +${fdBonus} dodge Reflex until your next turn (${fightDefensivelyModeLabel(mode)}).`;
  return `<section class="swse-roll-config-panel">
    <h4>Defensive Stance</h4>
    <label class="swse-roll-config-option ${fdDisabled ? 'swse-roll-config-option--disabled' : ''}"><input type="checkbox" name="fightingDefensively" ${fdDisabled} /> <span><b>Fight Defensively</b><small>${fdNote}${model.trainedAcrobatics ? ' Acrobatics trained.' : ''}</small></span></label>
    <label class="swse-roll-config-option swse-roll-config-option--disabled"><input type="checkbox" disabled /> <span><b>Total Defense</b><small>Use the Total Defense combat-action toggle. It overrides Fight Defensively, grants +${tdBonus} dodge Reflex, and does not hard-block rolls; GM adjudicates later attacks.</small></span></label>
  </section>`;
}

function buildForcePointPanel(model, showForcePoint) {
  if (!showForcePoint) return '';
  const disabled = model.fp.has ? '' : 'disabled';
  const label = model.rollType === 'force' || model.rollType === 'force-power'
    ? 'Spend Force Point on this Force power / Use the Force check'
    : 'Spend Force Point on this roll';
  return `<section class="swse-roll-config-panel swse-roll-config-panel--resource">
    <h4>Resources</h4>
    <label class="swse-roll-config-option"><input type="checkbox" name="useForcePoint" ${disabled} /> <span><b>Force Point</b><small>${escapeHTML(label)} · ${model.fp.value}/${model.fp.max} available.</small></span></label>
  </section>`;
}

function readNestedFormEntries(form, prefix) {
  const out = {};
  const data = new FormData(form);
  for (const [key, value] of data.entries()) {
    if (!key.startsWith(`${prefix}.`)) continue;
    const id = key.slice(prefix.length + 1);
    out[id] = value === 'on' ? true : value;
  }
  return out;
}

/**
 * Show a contextual Roll Configurator V2 before making a roll.
 * Backward compatible return shape: customModifier, cover, concealment,
 * situationalBonus, coverBonus, missChance, useForcePoint, twoHanded.
 */
export async function showRollModifiersDialog(options = {}) {
  const {
    title = 'Roll Modifiers',
    rollType = 'attack',
    actor,
    weapon,
    showCover = true,
    showConcealment = true,
    showForcePoint = true
  } = options;

  const model = await buildRollConfigModel({ ...options, title, rollType, actor, weapon });
  const abilityAccentClass = model.rollType === 'ability' && model.abilityAccentKey ? ` swse-roll-config-shell--ability swse-roll-config-ability--${model.abilityAccentKey}` : '';
  const abilityData = model.rollType === 'ability' && model.abilityAccentKey ? ` data-ability="${escapeHTML(model.abilityAccentKey)}"` : '';
  const content = `<div class="swse-roll-config-shell rcd${abilityAccentClass}"${abilityData} style="--accent-rgb:${escapeHTML(model.accentRgb)}">
    <header class="rcd-header">
      <div class="rcd-header-bg"></div>
      <div class="rcd-header-content">
        <span class="rcd-type-chip">${escapeHTML(model.icon)} ${escapeHTML(rollType)}</span>
        <span class="rcd-roll-name">${escapeHTML(title)}</span>
        <span class="rcd-actor">${escapeHTML(model.actorName || 'No actor')}</span>
      </div>
    </header>
    <div class="rcd-formula-strip">
      <span class="rcd-formula-text" data-rcd-formula>1d20 ${signNumber(model.baseTotal)}</span>
      <span class="rcd-formula-base-mod">base ${signNumber(model.baseTotal)}</span>
      <span class="rcd-formula-chips"><span class="rcd-fchip">${escapeHTML(rollType)}</span>${model.weaponName ? `<span class="rcd-fchip">${escapeHTML(model.ranged ? 'ranged' : 'melee')}</span>` : ''}</span>
    </div>
    <div class="rcd-body">
      <form class="swse-roll-config-v2" data-base-total="${Number(model.baseTotal) || 0}">
        <main class="rcd-main">
          <section class="swse-roll-config-panel swse-roll-config-panel--summary">
            <h4>Source</h4>
            <div class="swse-roll-config-source"><b>${escapeHTML(model.weaponName || model.skillKey || model.abilityKey || title)}</b><span>${escapeHTML(model.actorName || 'No actor')}</span></div>
          </section>
          ${buildCheckModeCards(model)}
          ${buildTargetPanel(model)}
          ${buildWeaponPanel(model)}
          ${buildDefenseActionPanel(model)}
          ${showCover && rollType === 'attack' ? `<section class="swse-roll-config-panel"><h4>Cover / Concealment</h4><div class="swse-roll-config-grid"><label>Cover<select name="cover"><option value="none">No Cover</option><option value="partial">Partial Cover (+2 Ref)</option><option value="cover">Cover (+5 Ref)</option><option value="improved">Improved Cover (+10 Ref)</option></select></label>${showConcealment ? `<label>Concealment<select name="concealment"><option value="none">No Concealment</option><option value="partial">Concealment (20%)</option><option value="total">Total Concealment (50%)</option></select></label>` : ''}</div></section>` : ''}
          ${buildResourceCards(model, showForcePoint)}
          ${buildRollModeRow(model)}
          <section class="swse-roll-config-panel">
            <h4>Situational</h4>
            <div class="swse-roll-config-grid">
              <label>Custom Modifier<input type="number" name="customModifier" value="0" /></label>
              <label>Note<input type="text" name="rollNote" placeholder="Optional GM/player note" /></label>
            </div>
            <div class="swse-roll-config-subpanel">
              <h5>Quick Toggles</h5>
              <label class="swse-roll-config-option"><input type="checkbox" name="aiming" /> <span><b>Aiming</b><small>+2 attack when the action applies.</small></span></label>
              <label class="swse-roll-config-option"><input type="checkbox" name="charging" /> <span><b>Charging</b><small>+2 attack, usually -2 defenses until next turn.</small></span></label>
              <label class="swse-roll-config-option"><input type="checkbox" name="flanking" /> <span><b>Flanking</b><small>+2 melee attack when applicable.</small></span></label>
              <label class="swse-roll-config-option"><input type="checkbox" name="higherGround" /> <span><b>Higher Ground</b><small>+1 when applicable.</small></span></label>
              <label class="swse-roll-config-option"><input type="checkbox" name="pointBlank" /> <span><b>Point Blank</b><small>+1 attack/damage in close range.</small></span></label>
            </div>
          </section>
        </main>
        ${buildRollPreviewRail(model)}
      </form>
    </div>
  </div>`;

  return new Promise(resolve => {
    new SWSEDialogV2({
      title,
      content,
      buttons: {
        roll: {
          icon: '<i class="fa-solid fa-dice-d20"></i>',
          label: 'Roll',
          callback: html => {
            const root = html instanceof HTMLElement ? html : html?.[0];
            const form = root?.querySelector?.('form');
            const data = new FormDataEntries(form);
            const customModifier = parseInt(data.get('customModifier'), 10) || 0;
            const cover = data.get('cover') || 'none';
            const concealment = data.get('concealment') || 'none';
            const combatOptions = readNestedFormEntries(form, 'combatOptions');
            const attackOptions = readNestedFormEntries(form, 'attackOptions');
            const targetMode = data.get('targetMode') || 'none';
            const defenseValue = Number(data.get('targetDefenseValue'));
            const targetContext = {
              mode: targetMode,
              tokenId: data.get('targetTokenId') || null,
              actorId: data.get('targetActorId') || null,
              defenseType: data.get('targetDefenseType') || 'reflex',
              defenseValue: Number.isFinite(defenseValue) ? defenseValue : null,
              coverBonus: ROLL_MODIFIERS.cover[cover]?.value || 0,
              concealment,
              rangeBand: data.get('rangeBand') || null,
              label: targetMode === 'manual' ? 'Manual Target' : targetMode === 'none' ? 'GM adjudication' : ''
            };
            const result = {
              cover,
              concealment,
              customModifier,
              useForcePoint: data.get('useForcePoint') === 'on',
              checkMode: data.get('checkMode') || 'roll',
              rollMode: data.get('rollMode') || '',
              forcePointMode: data.get('useForcePoint') === 'on' ? (rollType === 'force' || rollType === 'force-power' ? 'force-power' : 'roll') : 'none',
              twoHanded: data.get('grip') === 'two-handed',
              grip: data.get('grip') || null,
              rangeBand: data.get('rangeBand') || null,
              targetContext,
              combatOptions,
              attackOptions,
              fightingDefensively: data.get('fightingDefensively') === 'on',
              rollNote: data.get('rollNote') || '',
              situational: {
                aiming: data.get('aiming') === 'on',
                charging: data.get('charging') === 'on',
                flanking: data.get('flanking') === 'on',
                higherGround: data.get('higherGround') === 'on',
                pointBlank: data.get('pointBlank') === 'on',
                prone: data.get('prone') === 'on'
              }
            };
            result.situationalBonus = 0;
            if (result.situational.aiming) result.situationalBonus += 2;
            if (result.situational.charging) result.situationalBonus += 2;
            if (result.situational.flanking) result.situationalBonus += 2;
            if (result.situational.higherGround) result.situationalBonus += 1;
            if (result.situational.pointBlank) result.situationalBonus += 1;
            result.coverBonus = ROLL_MODIFIERS.cover[result.cover]?.value || 0;
            result.missChance = ROLL_MODIFIERS.concealment[result.concealment]?.missChance || 0;
            resolve(result);
          }
        },
        cancel: { icon: '<i class="fa-solid fa-times"></i>', label: 'Cancel', callback: () => resolve(null) }
      },
      default: 'roll',
      render: html => wireRollConfigDialog(html)
    }, {
      id: 'swse-roll-configurator-v2',
      classes: ['swse-roll-config-dialog-v2'],
      width: 940,
      height: 680,
      resizable: true
    }).render(true);
  });
}

/**
 * Simple FormData helper for older browsers
 */
class FormDataEntries {
  constructor(form) {
    this._data = new FormData(form);
  }
  get(name) {
    return this._data.get(name);
  }
}

/* ============================================================================
   TALENT DAMAGE BONUS CACHE
   ============================================================================ */

/**
 * Cache for talent damage bonuses to avoid recalculation
 * @class
 */
export class TalentBonusCache {
  /** @type {Map<string, {bonuses: Object, timestamp: number}>} */
  static _cache = new Map();

  /** @type {number} Cache TTL in milliseconds (5 seconds) */
  static CACHE_TTL = 5000;

  /**
   * Generate cache key for an actor
   * @param {Actor} actor
   * @returns {string}
   */
  static _getCacheKey(actor) {
    // Key based on actor ID and item count (items affect bonuses)
    const itemsHash = actor.items.size;
    const effectsHash = actor.effects.size;
    return `${actor.id}-${itemsHash}-${effectsHash}`;
  }

  /**
   * Get cached bonuses for an actor
   * @param {Actor} actor
   * @returns {Object|null}
   */
  static get(actor) {
    const key = this._getCacheKey(actor);
    const cached = this._cache.get(key);

    if (!cached) {return null;}

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this._cache.delete(key);
      return null;
    }

    return cached.bonuses;
  }

  /**
   * Set cached bonuses for an actor
   * @param {Actor} actor
   * @param {Object} bonuses
   */
  static set(actor, bonuses) {
    const key = this._getCacheKey(actor);
    this._cache.set(key, {
      bonuses,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate cache for an actor
   * @param {Actor} actor
   */
  static invalidate(actor) {
    const key = this._getCacheKey(actor);
    this._cache.delete(key);
  }

  /**
   * Clear all cached data
   */
  static clear() {
    this._cache.clear();
  }
}

// Invalidate cache when actor items change
Hooks.on('createItem', (item) => {
  if (item.parent) {TalentBonusCache.invalidate(item.parent);}
});
Hooks.on('deleteItem', (item) => {
  if (item.parent) {TalentBonusCache.invalidate(item.parent);}
});
Hooks.on('updateItem', (item) => {
  if (item.parent) {TalentBonusCache.invalidate(item.parent);}
});
Hooks.on('updateActor', (actor) => {
  TalentBonusCache.invalidate(actor);
});

/* ============================================================================
   CRITICAL CONFIRMATION
   ============================================================================ */

/**
 * SWSE Critical Hit Rules:
 * - Natural 20 ALWAYS hits and is an automatic critical (no confirmation needed)
 * - Natural 20 deals double damage and bypasses Reflex Defense
 * - Expanded threat ranges (e.g., 19-20 from Critical Strike feat) DO require confirmation
 * - Confirmation roll: roll attack again, if it beats target Reflex, crit is confirmed
 * - Unconfirmed crits from expanded ranges are treated as normal hits
 */

/**
 * Determine if a critical hit needs confirmation
 * @param {number} d20Result - The natural d20 result
 * @param {number} critRange - The weapon's threat range (default 20)
 * @returns {Object} { isThreat, needsConfirmation, isNat20 }
 */
export function analyzeCriticalThreat(d20Result, critRange = 20) {
  const isNat20 = d20Result === 20;
  const isThreat = d20Result >= critRange;

  // Nat 20 is always a confirmed crit - no confirmation needed
  // Expanded threat range (not nat 20) needs confirmation
  const needsConfirmation = isThreat && !isNat20;

  return {
    isThreat,
    isNat20,
    needsConfirmation,
    autoConfirmed: isNat20
  };
}

/**
 * Roll a critical hit confirmation (only for expanded threat ranges, NOT nat 20)
 * @param {Object} options
 * @param {Actor} options.actor - The attacking actor
 * @param {Item} options.weapon - The weapon used
 * @param {number} options.attackBonus - The attack bonus used
 * @param {number} options.targetDefense - The target's Reflex defense
 * @param {number} [options.fpBonus=0] - Force Point bonus already applied
 * @param {number} options.originalD20 - The original d20 result (for context)
 * @returns {Promise<Object>} { roll, confirmed, d20, total }
 */
export async function rollCriticalConfirmation({ actor, weapon, attackBonus, targetDefense, fpBonus = 0, originalD20 }) {
  // Create roll context for hooks
  const context = {
    actor,
    weapon,
    attackBonus,
    targetDefense,
    fpBonus,
    modifiers: {}
  };

  // Call pre-roll hook
  if (!callPreRollHook(ROLL_HOOKS.PRE_CRIT_CONFIRM, context)) {
    return { roll: null, confirmed: false, cancelled: true };
  }

  // Calculate confirmation bonus (base attack bonus + critical confirmation bonus from rules)
  const critConfirmBonus = getCriticalConfirmBonus(actor, weapon) || 0;
  const totalBonus = attackBonus + critConfirmBonus;
  const formula = `1d20 + ${totalBonus}`;

  let roll;
  try {
    roll = await RollEngine.safeRoll(formula);
    if (!roll) {
      SWSELogger.error('Critical confirmation roll failed: RollEngine returned null');
      ui.notifications.error('Critical confirmation roll failed');
      return { roll: null, confirmed: false, error: 'RollEngine failure' };
    }
  } catch (err) {
    SWSELogger.error('Critical confirmation roll failed:', err);
    ui.notifications.error('Critical confirmation roll failed');
    return { roll: null, confirmed: false, error: err };
  }

  const d20 = roll.dice[0].results[0].result;
  const confirmed = roll.total >= targetDefense;

  // Record in history
  RollHistory.record({
    roll,
    actor,
    type: 'critConfirm',
    result: { confirmed, targetDefense },
    context
  });

  // Create chat message
  const html = `
    <div class="swse-crit-confirm-card ${confirmed ? 'confirmed' : 'failed'}">
      <div class="crit-header">
        <i class="fa-solid fa-crosshairs"></i>
        Critical Confirmation
      </div>
      <div class="crit-result">
        <div class="roll-total">${roll.total}</div>
        <div class="roll-d20">d20: ${d20}</div>
        <div class="roll-formula">${formula}</div>
      </div>
      <div class="crit-vs">
        vs Reflex ${targetDefense}
      </div>
      <div class="crit-outcome ${confirmed ? 'success' : 'failure'}">
        ${confirmed
          ? '<i class="fa-solid fa-circle-check"></i> CRITICAL HIT CONFIRMED!'
          : '<i class="fa-solid fa-circle-xmark"></i> Critical not confirmed (normal hit)'}
      </div>
    </div>
  `;

  await createChatMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: html,
    rolls: [roll]
  });

  // Show 3D dice if available
  if (game.dice3d) {
    await game.dice3d.showForRoll(roll, game.user, true);
  }

  // Call post-roll hook
  const result = { roll, confirmed, d20, total: roll.total, targetDefense };
  callPostRollHook(ROLL_HOOKS.POST_CRIT_CONFIRM, { ...context, result });

  return result;
}

/* ============================================================================
   CONCEALMENT CHECK
   ============================================================================ */

/**
 * Roll a concealment miss chance check
 * @param {number} missChance - The miss chance percentage (20 or 50)
 * @param {Actor} [actor] - Optional actor for chat message
 * @returns {Promise<Object>} { roll, hit, missChance }
 */
export async function rollConcealmentCheck(missChance, actor = null) {
  if (missChance <= 0) {
    return { roll: null, hit: true, missChance: 0 };
  }

  const roll = await RollEngine.safeRoll('1d100');
  if (!roll) {
    return { roll: null, hit: true, missChance: missChance };
  }

  const hit = roll.total > missChance;

  // Create chat message
  const html = `
    <div class="swse-concealment-card ${hit ? 'hit' : 'miss'}">
      <div class="concealment-header">
        <i class="fa-solid fa-eye-slash"></i>
        Concealment Check
      </div>
      <div class="concealment-result">
        <div class="roll-total">${roll.total}</div>
        <div class="miss-chance">Need: >${missChance}%</div>
      </div>
      <div class="concealment-outcome ${hit ? 'success' : 'failure'}">
        ${hit
          ? '<i class="fa-solid fa-check"></i> Attack hits!'
          : '<i class="fa-solid fa-times"></i> Concealment causes miss!'}
      </div>
    </div>
  `;

  await createChatMessage({
    speaker: actor ? ChatMessage.getSpeaker({ actor }) : ChatMessage.getSpeaker(),
    content: html,
    rolls: [roll]
  });

  return { roll, hit, missChance };
}

/* ============================================================================
   EXPORTS
   ============================================================================ */

export default {
  ROLL_HOOKS,
  ROLL_MODIFIERS,
  callPreRollHook,
  callPostRollHook,
  RollHistory,
  TalentBonusCache,
  showRollModifiersDialog,
  analyzeCriticalThreat,
  rollCriticalConfirmation,
  rollConcealmentCheck
};

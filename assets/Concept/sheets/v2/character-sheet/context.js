/**
 * Context preparation for SWSEV2CharacterSheet
 *
 * Contains helpers that support the _prepareContext method.
 * The main _prepareContext method remains on the sheet class for V2 compatibility,
 * but delegates to these helpers for specific concerns.
 */

import { warnSheetFallback } from "/systems/foundryvtt-swse/scripts/debug/contract-warning-helper.js";
import {
  getTimeClass,
  getTimeLabel,
  classifyActionType,
  getActionTypeLabel,
  categorizeSkillUse
} from "./utils.js";

// PHASE 10: normalizeDerivedState() removed
// This function was exported but never imported or called anywhere.
// Derived normalization is now handled directly in character-actor.js computeCharacterDerived()

// PHASE 10: enrichSkillUses() removed
// This function was exported but never imported or called anywhere.
// Skill enrichment is handled directly in character-sheet.js during skills panel preparation


// PHASE 10: buildXpContext() removed
// This function was exported but never imported or called anywhere.
// XP context building is handled directly in character-sheet.js _prepareContext()

/**
 * PHASE 7.5: Build canonical attributes view-model for all sheet displays
 *
 * Canonical sheet source for ability/attribute data. ALL ability displays must consume this bundle:
 * - abilities panel
 * - ability breakdown displays
 * - any status/condition showing ability scores
 *
 * @param {Actor} actor - The character actor
 * @returns {Object} Unified attributes view-model {str, dex, con, int, wis, cha}
 */
export function buildAttributesViewModel(actor) {
  const abilityKeys = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  const abilityLabels = {
    'str': 'Strength',
    'dex': 'Dexterity',
    'con': 'Constitution',
    'int': 'Intelligence',
    'wis': 'Wisdom',
    'cha': 'Charisma'
  };

  const derived = actor.system?.derived ?? {};
  const result = {};

  for (const key of abilityKeys) {
    const derivedAttr = derived.attributes?.[key] ?? { total: 10, mod: 0 };
    const value = derivedAttr.total ?? 10;
    const modifier = derivedAttr.mod ?? Math.floor((value - 10) / 2);
    const modifierClass = modifier > 0 ? 'positive' : modifier < 0 ? 'negative' : 'zero';

    result[key] = {
      key,
      label: abilityLabels[key],
      value,
      modifier,
      modifierClass
    };
  }

  return result;
}

/**
 * PHASE 7.5: Build canonical identity summary view-model
 *
 * Canonical sheet source for character identity. ALL identity displays must consume this bundle:
 * - biography panel
 * - header identity strip
 * - character record summary
 *
 * @param {Actor} actor - The character actor
 * @returns {Object} Unified identity view-model {className, classDisplay, species, level, etc}
 */
export function buildIdentityViewModel(actor) {
  const system = actor.system;
  const derived = system?.derived ?? {};
  const identity = derived.identity ?? {};

  return {
    name: actor.name || 'Unnamed',
    className: identity.className ?? system.class?.name ?? system.className ?? system.class ?? '—',
    classDisplay: identity.classDisplay ?? '—',
    species: identity.species ?? system.species?.name ?? system.species ?? '—',
    level: Number(system.level) || 1,
    size: identity.size ?? system.size ?? '—',
    gender: identity.gender ?? system.gender ?? '—',
    background: identity.background ?? system.background?.name ?? system.background ?? '—',
    homeworld: system.planetOfOrigin ?? '—',
    profession: system.profession ?? '—',
    age: system.flags?.swse?.character?.age ?? '—',
    height: system.flags?.swse?.character?.height ?? '—',
    weight: system.flags?.swse?.character?.weight ?? '—',
    destinyPoints: identity.destinyPoints ?? { value: 0, max: 0 },
    forcePoints: identity.forcePoints ?? { value: 0, max: 0 }
  };
}

/**
 * PHASE 7.5: Build canonical HP view-model for all sheet displays
 *
 * Canonical sheet source for HP data. ALL HP displays must consume this bundle:
 * - HP bar (header)
 * - HP numeric display
 * - resource detail panel
 * - any status/condition display showing HP
 *
 * @param {Actor} actor - The character actor
 * @returns {Object} Unified HP view-model {current, max, temp, percent, label, segments}
 */
export function buildHpViewModel(actor) {
  const current = Number(actor.system.hp?.value ?? 0);
  const max = Math.max(1, Number(actor.system.hp?.max ?? 1));
  const temp = Number(actor.system.hp?.temp ?? 0);
  const percent = Math.max(0, Math.min(100, Math.round((current / max) * 100)));

  return {
    current,
    max,
    temp,
    percent,
    label: `${current}/${max}`,
    filledSegments: Math.round((current / max) * 20)
  };
}

/**
 * Build header HP segments for tactical bar
 * PHASE 7.5: Consumes canonical buildHpViewModel() — same source as all other HP displays
 *
 * @param {Actor} actor - The character actor
 * @returns {Array} Array of segment objects
 */
export function buildHeaderHpSegments(actor) {
  const hp = buildHpViewModel(actor);

  const hpColorClassForIndex = (index) => {
    if (index < 4) return "seg--red";
    if (index < 8) return "seg--orange";
    if (index < 12) return "seg--yellow";
    if (index < 16) return "seg--yellowgreen";
    return "seg--green";
  };

  return Array.from({ length: 20 }, (_, index) => ({
    filled: index < hp.filledSegments,
    colorClass: hpColorClassForIndex(index)
  }));
}

/**
 * PHASE 7.5: Build canonical defenses view-model for all sheet displays
 *
 * Canonical sheet source for defense data. ALL defense displays must consume this bundle:
 * - header defense pills
 * - defense partial/tab
 * - combat summary defense values
 * - any status/condition showing defenses
 *
 * @param {Object} derived - Derived state from actor.system.derived
 * @returns {Object} Unified defenses view-model {fort, ref, will, flatFooted}
 */
export function buildDefensesViewModel(derived) {
  const defenseDefs = [
    { key: 'fortitude', derivedKey: 'fortitude', fallbackKeys: ['fort'], label: 'Fortitude', abbrev: 'Fort' },
    { key: 'reflex', derivedKey: 'reflex', fallbackKeys: ['ref'], label: 'Reflex', abbrev: 'Ref' },
    { key: 'will', derivedKey: 'will', fallbackKeys: [], label: 'Will', abbrev: 'Will' },
    { key: 'flatFooted', derivedKey: 'flatFooted', fallbackKeys: ['flatfooted', 'ff'], label: 'Flat-Footed', abbrev: 'FF' }
  ];

  const defenses = derived?.defenses ?? {};
  const normalizeDefense = (value) => {
    if (value && typeof value === 'object') {
      return {
        base: Number(value.base ?? 10) || 10,
        total: Number(value.total ?? value.value ?? value.base ?? 10) || 10,
        adjustment: Number(value.adjustment ?? value.stateBonus ?? 0) || 0
      };
    }

    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return { base: 10, total: numericValue, adjustment: numericValue - 10 };
    }

    return { base: 10, total: 10, adjustment: 0 };
  };

  const result = {};
  for (const def of defenseDefs) {
    const rawDefense = [def.derivedKey, ...(def.fallbackKeys || [])]
      .map((k) => defenses?.[k])
      .find((value) => value !== undefined && value !== null);
    const defenseData = normalizeDefense(rawDefense);

    result[def.key] = {
      label: def.label,
      abbrev: def.abbrev,
      total: defenseData.total,
      adjustment: defenseData.adjustment,
      base: defenseData.base
    };
  }

  return result;
}

// PHASE 10: buildDspContext() removed
// This function was exported but never imported or called anywhere.
// DSP context is built directly using DSPEngine throughout the codebase

// PHASE 10: loadCombatActions() removed
// This function was exported but never imported or called anywhere.
// Combat actions are loaded and organized directly in character-sheet.js

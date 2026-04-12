/**
 * Context preparation for SWSEV2CharacterSheet
 *
 * Contains helpers that support the _prepareContext method.
 * The main _prepareContext method remains on the sheet class for V2 compatibility,
 * but delegates to these helpers for specific concerns.
 */

import { ExtraSkillUseRegistry } from "/systems/foundryvtt-swse/scripts/utils/extra-skill-use-registry.js";
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import { XP_LEVEL_THRESHOLDS } from "/systems/foundryvtt-swse/scripts/engine/shared/xp-system.js";
import {
  getTimeClass,
  getTimeLabel,
  classifyActionType,
  getActionTypeLabel,
  categorizeSkillUse
} from "./utils.js";

/**
 * Normalize derived state to ensure all expected properties exist with safe defaults
 * @param {Object} rawDerived - Raw derived state from actor.system.derived
 * @returns {Object} Normalized derived state
 */
export function normalizeDerivedState(rawDerived) {
  const derived = foundry.utils.duplicate(rawDerived ?? {});

  // Initialize nested structures
  derived.talents ??= {};
  derived.talents.groups ??= [];
  derived.talents.list ??= [];

  derived.skills ??= [];

  derived.attacks ??= {};
  derived.attacks.list ??= [];

  derived.actions ??= {};
  derived.actions.groups ??= [];

  derived.identity ??= {};
  derived.identity.halfLevel ??= 0;

  derived.encumbrance ??= {};
  derived.encumbrance.state ??= "normal";
  derived.encumbrance.label ??= "Unencumbered";
  derived.encumbrance.total ??= 0;
  derived.encumbrance.lightLoad ??= 0;
  derived.encumbrance.mediumLoad ??= 0;
  derived.encumbrance.heavyLoad ??= 0;

  // Defense and damage thresholds
  derived.damageThreshold ??= 10;
  derived.damage ??= {};
  derived.damage.conditionHelpless ??= false;

  return derived;
}

/**
 * Build skill uses array with enriched metadata from ExtraSkillUseRegistry
 * @param {Object} skill - Skill object from context
 * @param {Actor} actor - The character actor
 */
export async function enrichSkillUses(skill, actor) {
  if (!skill || !actor) return;

  try {
    await ExtraSkillUseRegistry.initialize();
    const skillUses = await ExtraSkillUseRegistry.getForSkill(skill.key, { actor });

    const normalizedUses = skillUses.map(use => {
      const timeClass = getTimeClass(use.time);
      const timeLabel = getTimeLabel(use.time);
      const actionType = classifyActionType(use);
      const actionTypeLabel = getActionTypeLabel(use);
      const isBlocked = use.trainedOnly && !skill.trained;

      return {
        key: use.key,
        useKey: use.key,
        label: use.label,
        name: use.name,
        dc: use.dc,
        time: use.time,
        description: use.description || use.effect || '',
        effect: use.effect,
        trainedOnly: use.trainedOnly,
        timeClass,
        timeLabel,
        actionType,
        actionTypeLabel,
        requiresTrained: use.trainedOnly,
        skillTrained: skill.trained,
        isBlocked,
        canUseNow: !isBlocked,
        blockedReason: isBlocked ? "Requires training" : "",
        sourceType: use.sourceType ?? use.source ?? (use.trainedOnly ? "trained" : "core"),
        sourceLabel: use.sourceLabel ?? use.sourceName ?? (use.trainedOnly ? "Trained Use" : "Core Use"),
        category: categorizeSkillUse(use, skill.key)
      };
    });

    // Group by category
    const grouped = {};
    normalizedUses.forEach(use => {
      const cat = use.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(use);
    });

    skill.extraUses = normalizedUses;
    skill.extraUsesGrouped = grouped;
    skill.extraUsesCount = normalizedUses.length;
    skill.hasExtraUses = normalizedUses.length > 0;
  } catch (err) {
    console.warn('[SWSE] Failed to load extra skill uses:', err);
    skill.extraUses = [];
    skill.extraUsesGrouped = {};
    skill.extraUsesCount = 0;
    skill.hasExtraUses = false;
  }
}

/**
 * Build class display string from progression data
 * @param {Actor} actor - The character actor
 * @returns {string} Formatted class display (e.g. "Jedi 3 / Soldier 2")
 */
export async function buildClassDisplay(actor) {
  let classDisplay = '—';
  const classLevels = actor.system.progression?.classLevels ?? [];

  if (classLevels.length > 0) {
    try {
      const { PROGRESSION_RULES } = await import(
        "/systems/foundryvtt-swse/scripts/engine/progression/data/progression-data.js"
      );
      const classes = PROGRESSION_RULES.classes || {};
      classDisplay = classLevels
        .map(cl => {
          const className = classes[cl.class]?.name || cl.class || 'Unknown';
          return `${className} ${cl.level}`;
        })
        .join(' / ');
    } catch (err) {
      classDisplay = classLevels
        .map(cl => `${cl.class} ${cl.level}`)
        .join(' / ');
    }
  }

  return classDisplay;
}

/**
 * Build XP context data
 * @param {Actor} actor - The character actor
 * @param {Object} derived - Derived state
 * @returns {Object} XP context object
 */
export function buildXpContext(actor, derived) {
  const xpSystem = CONFIG.SWSE?.system?.xpProgression || 'milestone';
  const xpEnabled = xpSystem !== 'disabled';
  const xpDerived = derived.xp ?? { total: 0, progressPercent: 0, xpToNext: 0, level: actor.system.level ?? 1 };
  const xpDisplayLevel = Math.max(1, Number(actor.system.level ?? xpDerived.level ?? 1));
  // Phase 3D: Prefer derived.xp.total, fall back to canonical system.xp.total (not system.experience)
  const xpTotal = Number(xpDerived.total ?? actor.system?.xp?.total ?? 0) || 0;
  const xpPercent = Math.max(0, Math.min(100, Math.round(Number(xpDerived.progressPercent ?? 0) || 0)));
  const nextLevelAtDisplay = XP_LEVEL_THRESHOLDS[Math.min(20, xpDisplayLevel + 1)] ?? null;
  const xpLevelReady = xpPercent >= 100;
  const xpSegments = Array.from({ length: 20 }, (_, index) => ({
    index,
    filled: ((index + 1) / 20) * 100 <= xpPercent + 0.0001
  }));

  return {
    enabled: xpEnabled,
    level: xpDisplayLevel,
    total: xpTotal,
    nextLevelAt: nextLevelAtDisplay,
    xpToNext: nextLevelAtDisplay !== null ? Math.max(0, nextLevelAtDisplay - xpTotal) : 0,
    percentRounded: xpPercent,
    segments: xpSegments,
    stateClass: xpLevelReady ? 'state--ready-levelup' : xpPercent >= 75 ? 'state--nearly-ready' : 'state--in-progress'
  };
}

/**
 * Build header HP segments for tactical bar
 * @param {Actor} actor - The character actor
 * @returns {Array} Array of segment objects
 */
export function buildHeaderHpSegments(actor) {
  const hpCurrentRaw = Number(actor.system.hp?.value ?? 0);
  const hpMaxRaw = Math.max(1, Number(actor.system.hp?.max ?? 1));
  const hpRatio = Math.max(0, Math.min(1, hpCurrentRaw / hpMaxRaw));
  const hpFilledSegments = Math.round(hpRatio * 20);

  const hpColorClassForIndex = (index) => {
    if (index < 4) return "seg-red";
    if (index < 8) return "seg-orange";
    if (index < 12) return "seg-yellow";
    if (index < 16) return "seg-yellowgreen";
    return "seg-green";
  };

  return Array.from({ length: 20 }, (_, index) => ({
    filled: index < hpFilledSegments,
    colorClass: hpColorClassForIndex(index)
  }));
}

/**
 * Build Dark Side Points context
 * @param {Actor} actor - The character actor
 * @returns {Object} DSP context
 */
export function buildDspContext(actor) {
  const dspValue = DSPEngine.getValue(actor);
  const dspMax = DSPEngine.getMax(actor);
  const dspSegments = [];
  for (let i = 1; i <= dspMax; i++) {
    dspSegments.push({
      index: i,
      filled: i <= dspValue,
      color: i <= dspValue ? '#E74C3C' : '#4A90E2'
    });
  }
  return { value: dspValue, max: dspMax, segments: dspSegments };
}

/**
 * Load combat actions from data file and organize by economy type
 * @returns {Object} Organized combat actions by economy
 */
export async function loadCombatActions() {
  let combatActions = { groups: [] };
  try {
    const response = await fetch('/systems/foundryvtt-swse/data/combat-actions.json');
    if (response.ok) {
      const actionsData = await response.json();

      const grouped = {};
      const economyOrder = ['full-round', 'standard', 'move', 'swift', 'free', 'reaction'];

      for (const action of actionsData) {
        if (!action.action?.type) continue;
        const economy = action.action.type.toLowerCase().replace(/[\s+]/g, '-');
        if (!grouped[economy]) {
          grouped[economy] = [];
        }
        grouped[economy].push({
          id: action.name.toLowerCase().replace(/\s+/g, '-'),
          name: action.name,
          type: action.action.type,
          cost: action.action.cost,
          notes: action.notes,
          hasRelatedSkills: action.relatedSkills && action.relatedSkills.length > 0
        });
      }

      for (const eco of economyOrder) {
        if (grouped[eco]) {
          combatActions.groups.push({
            label: eco.charAt(0).toUpperCase() + eco.slice(1).replace('-', ' '),
            count: grouped[eco].length,
            subgroups: [{
              label: eco.charAt(0).toUpperCase() + eco.slice(1).replace('-', ' '),
              count: grouped[eco].length,
              items: grouped[eco]
            }]
          });
        }
      }
    }
  } catch (err) {
    console.warn('[SWSE] Failed to load combat actions:', err);
  }
  return combatActions;
}

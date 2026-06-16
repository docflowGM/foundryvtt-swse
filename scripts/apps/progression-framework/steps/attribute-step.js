/**
 * Attribute step — hydrated attribute assignment with lock + reroll + auto-assign support.
 */

import { ProgressionStepPlugin } from './step-plugin-base.js';
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';
import { SettingsHelper } from '/systems/foundryvtt-swse/scripts/utils/settings-helper.js';
import { AttributeMentorDialog } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/dialogs/attribute-mentor-dialog.js';
import {
  buildAttributePlanningProfile,
  buildSuggestedAttributeBuilds,
  planPointBuyAllocation,
  planPooledAssignment
} from '/systems/foundryvtt-swse/scripts/engine/suggestion/attribute-planner.js';
import { getStepGuidance } from './mentor-step-integration.js';
import { buildLevelUpEntitlementManifest } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/levelup-entitlement-manifest.js';

const POINT_BUY_BASE = 8;
const POINT_BUY_COST = Object.freeze({
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 6,
  15: 8,
  16: 10,
  17: 13,
  18: 16
});

/** Default attribute generation config (actor / non-droid). */
export const ACTOR_ATTRIBUTE_GENERATION_CONFIG = Object.freeze({
  abilityCount: 6,
  abilityKeys: ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'],
  abilitySystemKeys: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
  standardRollCount: 6,
  organicDiceCount: 21,
  organicGroupCount: 6,
  organicDropCount: 3,
  arrays: {
    standard: [15, 14, 13, 12, 10, 8],
    highPower: [16, 14, 12, 12, 10, 8]
  }
});

/** Droid attribute generation config: droids have no Constitution score. */
export const DROID_ATTRIBUTE_GENERATION_CONFIG = Object.freeze({
  abilityCount: 5,
  abilityKeys: ['STR', 'DEX', 'INT', 'WIS', 'CHA'],
  abilitySystemKeys: ['str', 'dex', 'int', 'wis', 'cha'],
  standardRollCount: 5,
  organicDiceCount: 18,
  organicGroupCount: 5,
  organicDropCount: 3,
  arrays: {
    standard: [15, 14, 13, 12, 10],
    highPower: [16, 14, 12, 10, 8]
  }
});

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function rollDie(sides = 6) {
  return Math.floor(Math.random() * sides) + 1;
}

function rollNd6DropLowest(n = 4, dropLowest = 1) {
  const rolls = Array.from({ length: n }, () => rollDie(6)).sort((a, b) => a - b);
  return rolls.slice(dropLowest).reduce((sum, v) => sum + v, 0);
}

function makePoolId(index) {
  return `attr-pool-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}


const ATTRIBUTE_V2_META = Object.freeze({
  str: {
    fullName: 'Strength',
    series: 'physical',
    colorClass: 'str',
    detail: 'Physical power, melee pressure, carrying capacity, and the raw leverage behind athletic actions.'
  },
  dex: {
    fullName: 'Dexterity',
    series: 'physical',
    colorClass: 'dex',
    detail: 'Reflexes, hand-eye coordination, ranged accuracy, initiative, stealth, and evasive movement.'
  },
  con: {
    fullName: 'Constitution',
    series: 'physical',
    colorClass: 'con',
    detail: "Stamina, durability, poison resistance, disease resistance, and the body's capacity to keep fighting."
  },
  int: {
    fullName: 'Intelligence',
    series: 'mental',
    colorClass: 'int',
    detail: 'Education, technical reasoning, knowledge breadth, and the number of skills a character can support.'
  },
  wis: {
    fullName: 'Wisdom',
    series: 'mental',
    colorClass: 'wis',
    detail: 'Awareness, intuition, discipline, perception, survival instincts, and many Force-facing instincts.'
  },
  cha: {
    fullName: 'Charisma',
    series: 'mental',
    colorClass: 'cha',
    detail: 'Presence, confidence, deception, persuasion, command bearing, and social pressure under stress.'
  }
});

const ATTRIBUTE_V2_METHOD_COPY = Object.freeze({
  'point-buy': { label: 'Point Buy', icon: 'fa-coins', sub: 'budgeted calibration' },
  array: { label: 'Standard Array', icon: 'fa-grip', sub: 'fixed values' },
  standard: { label: 'Standard Roll', icon: 'fa-dice-d6', sub: '4d6 drop lowest' },
  organic: { label: 'Organic Roll', icon: 'fa-dice', sub: 'dice distribution' },
  'species-fixed': { label: 'Species Fixed', icon: 'fa-dna', sub: 'canonical override' },
  'levelup-increase': { label: 'Level Increase', icon: 'fa-arrow-up', sub: '+1 to two abilities' }
});

const ATTRIBUTE_V2_AFFECTS = Object.freeze({
  str: [
    'Melee attack and damage pressure',
    'Athletics, jump, climb, and carry logic',
    'Grapple checks and raw-force moments'
  ],
  dex: [
    'Reflex Defense and flat-footed pressure',
    'Initiative, ranged accuracy, and pilot feel',
    'Stealth, Acrobatics, and evasive movement'
  ],
  con: [
    'Fortitude Defense and endurance',
    'Hit point durability and staying power',
    'Toxin, disease, fatigue, and harsh-environment resistance'
  ],
  int: [
    'Starting trained skill pressure',
    'Knowledge, Mechanics, and Use Computer breadth',
    'Technical planning and puzzle-solving builds'
  ],
  wis: [
    'Will Defense and awareness',
    'Perception, Survival, and Treat Injury pressure',
    'Force-facing intuition for many traditions'
  ],
  cha: [
    'Persuasion, Deception, and command presence',
    'Force presence for many traditions',
    'Social pressure under stress'
  ]
});


export class AttributeStep extends ProgressionStepPlugin {
  constructor(descriptor) {
    super(descriptor);
    this._committed = false;
    this._attributes = null;
    this._method = 'point-buy';
    this._arrayType = 'standard';
    this._focusedAbility = 'str';
    this._scorePool = [];
    this._selectedPoolId = null;
    this._dragPoolId = null;
    this._speciesFixedOverrideRequested = false;
  }

  _getAbilityMeta(key) {
    const abilityKey = String(key || '').toLowerCase();
    return ATTRIBUTE_V2_META[abilityKey] || {
      fullName: abilityKey.toUpperCase(),
      series: 'physical',
      colorClass: abilityKey,
      detail: ''
    };
  }

  _setFocusedAbility(key, shell = null) {
    const abilityKey = String(key || '').toLowerCase();
    if (!abilityKey) return;
    this._focusedAbility = abilityKey;
    const meta = this._getAbilityMeta(abilityKey);
    if (shell) {
      shell.focusedItem = {
        id: abilityKey,
        key: abilityKey,
        name: meta.fullName || abilityKey.toUpperCase(),
        type: 'attribute'
      };
    }
  }

  _isDroidContext(shell) {
    const session = shell?.progressionSession || {};
    const actor = shell?.actor || null;
    return session?.subtype === 'droid'
      || session?.droidContext?.isDroid === true
      || actor?.type === 'droid'
      || actor?.system?.isDroid === true
      || session?.draftSelections?.droid?.isDroid === true;
  }

  getGenerationConfig(shell) {
    const sessionConfig = shell?.progressionSession?.droidContext?.attributeGenerationConfig;
    if (this._isDroidContext(shell)) {
      return {
        ...DROID_ATTRIBUTE_GENERATION_CONFIG,
        ...(sessionConfig && typeof sessionConfig === 'object' ? sessionConfig : {}),
        abilityCount: 5,
        abilityKeys: ['STR', 'DEX', 'INT', 'WIS', 'CHA'],
        abilitySystemKeys: ['str', 'dex', 'int', 'wis', 'cha'],
        standardRollCount: 5,
        organicDiceCount: 18,
        organicGroupCount: 5,
        organicDropCount: 3,
      };
    }
    return sessionConfig ?? ACTOR_ATTRIBUTE_GENERATION_CONFIG;
  }

  getPointBuyPool(shell) {
    if (this._isDroidContext(shell)) {
      return Number(shell?.progressionSession?.droidContext?.pointBuyPool || 20);
    }
    return shell?.progressionSession?.droidContext?.pointBuyPool
      ?? HouseRuleService.getNumber('livingPointBuyPool', HouseRuleService.getNumber('pointBuyPool', 25));
  }

  _getAbilityKeys(shell) {
    return this.getGenerationConfig(shell)?.abilitySystemKeys ?? ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  }

  _getExcludedSet(shell) {
    const excluded = shell?.progressionSession?.droidContext?.excludedAbilities ?? [];
    const normalized = excluded.map(k => String(k).toLowerCase());
    if (this._isDroidContext(shell) && !normalized.includes('con')) normalized.push('con');
    return new Set(normalized);
  }

  _getAssignableAbilityKeys(shell) {
    const excluded = this._getExcludedSet(shell);
    return this._getAbilityKeys(shell).filter(key => !excluded.has(key));
  }


  _isLevelUpAbilityIncreaseMode(shell) {
    const mode = shell?.mode || shell?.progressionSession?.mode || shell?.progressionSession?.draftSelections?.mode;
    if (mode && mode !== 'levelup') return false;
    try {
      const manifest = buildLevelUpEntitlementManifest(shell?.actor || null, shell?.progressionSession || null);
      return manifest?.abilityIncreases?.required === true;
    } catch (_err) {
      return false;
    }
  }

  _getLevelUpAbilityIncreaseCount(shell) {
    try {
      const manifest = buildLevelUpEntitlementManifest(shell?.actor || null, shell?.progressionSession || null);
      return Math.max(0, Number(manifest?.abilityIncreases?.count || 0) || 0);
    } catch (_err) {
      return 0;
    }
  }

  _getActorAbilityBase(shell, key) {
    const system = shell?.actor?.system || {};
    const ability = system.attributes?.[key]
      || system.abilities?.[key]
      || system.stats?.abilities?.[key]
      || {};
    const derived = system.derived?.abilities?.[key] || {};
    const value = ability.base
      ?? ability.value
      ?? ability.total
      ?? ability.score
      ?? derived.base
      ?? derived.value
      ?? derived.total
      ?? derived.score
      ?? 10;
    return Number(value) || 10;
  }

  _normalizeLevelUpIncreases(raw = null, shell = null) {
    const increases = raw?.increases || raw?.abilityIncreases || raw || {};
    const out = {};
    for (const key of this._getAbilityKeys(shell)) {
      out[key] = Math.max(0, Math.min(1, Number(increases?.[key] ?? 0) || 0));
    }
    return out;
  }

  _getLevelUpIncreaseSpent(shell) {
    return Object.values(this._normalizeLevelUpIncreases(this._attributes, shell))
      .reduce((sum, value) => sum + (Number(value) || 0), 0);
  }

  _getSpeciesAttributeOverride(shell) {
    const pending = shell?.progressionSession?.draftSelections?.pendingSpeciesContext
      ?? shell?.committedSelections?.get?.('pendingSpeciesContext')
      ?? null;
    return pending?.metadata?.attributeGenerationOverride || null;
  }

  _isSpeciesFixedMode() {
    return this._method === 'species-fixed';
  }

  _getSpeciesFixedScores(shell) {
    const override = this._getSpeciesAttributeOverride(shell);
    return override?.fixedScores && typeof override.fixedScores === 'object' ? override.fixedScores : null;
  }

  _getSpeciesFixedAllocationStatus(shell) {
    const override = this._getSpeciesAttributeOverride(shell);
    const fixedScores = this._getSpeciesFixedScores(shell);
    if (!override || !fixedScores || !this._attributes) {
      return { total: 0, spent: 0, remaining: 0, maxPerAbility: 0, allocations: {}, complete: true };
    }

    const allowed = Array.isArray(override.bonusChoices) && override.bonusChoices.length
      ? override.bonusChoices.map(key => String(key).toLowerCase())
      : this._getAssignableAbilityKeys(shell);
    const total = Number(override.allocationPoints ?? override.bonusValue ?? 2) || 2;
    const maxPerAbility = Number(override.maxPerAbility ?? 1) || 1;
    const allocations = {};
    let spent = 0;
    for (const key of allowed) {
      const base = Number(fixedScores[key] ?? 0);
      const current = Number(this._attributes[key] ?? base);
      const amount = Math.max(0, current - base);
      if (amount > 0) allocations[key] = amount;
      spent += amount;
    }
    return { total, spent, remaining: Math.max(0, total - spent), maxPerAbility, allocations, complete: spent === total };
  }

  _canAdjustSpeciesFixed(shell, key, delta) {
    if (this._committed || !this._isSpeciesFixedMode()) return false;
    const override = this._getSpeciesAttributeOverride(shell);
    const fixedScores = this._getSpeciesFixedScores(shell);
    if (!override || !fixedScores) return false;
    const allowed = Array.isArray(override.bonusChoices) && override.bonusChoices.length
      ? override.bonusChoices.map(value => String(value).toLowerCase())
      : this._getAssignableAbilityKeys(shell);
    const ability = String(key || '').toLowerCase();
    if (!allowed.includes(ability)) return false;

    const status = this._getSpeciesFixedAllocationStatus(shell);
    const base = Number(fixedScores[ability] ?? 0);
    const current = Number(this._attributes?.[ability] ?? base);
    const currentAllocation = Math.max(0, current - base);
    const nextAllocation = currentAllocation + Number(delta || 0);
    if (nextAllocation < 0 || nextAllocation > status.maxPerAbility) return false;
    const nextSpent = status.spent - currentAllocation + nextAllocation;
    return nextSpent <= status.total;
  }

  _handleSpeciesFixedDelta(key, delta, shell) {
    const ability = String(key || '').toLowerCase();
    if (!this._canAdjustSpeciesFixed(shell, ability, delta)) return;
    this._attributes = {
      ...this._attributes,
      [ability]: Number(this._attributes[ability] ?? this._getSpeciesFixedScores(shell)?.[ability] ?? 0) + Number(delta || 0),
    };
    this._setFocusedAbility(ability, shell);
    shell.render();
  }

  async _requestSpeciesFixedOverride(shell) {
    if (this._speciesFixedOverrideRequested) return;
    this._speciesFixedOverrideRequested = true;

    const actor = shell?.actor ?? null;
    const override = this._getSpeciesAttributeOverride(shell) || {};
    const requestId = `attribute-override-${actor?.id || game?.user?.id || 'unknown'}`;
    const request = {
      id: requestId,
      type: 'attribute-generation-override',
      ownerActorId: actor?.id || null,
      ownerActorName: actor?.name || 'New Character',
      requestedBy: game?.user?.id || null,
      requestedByName: game?.user?.name || 'Player',
      requestedAt: Date.now(),
      costCredits: 0,
      draftData: {
        name: `Attribute method override: ${actor?.name || 'New Character'}`,
        details: `${override.label || 'Species fixed array'} was overridden so the player can use a normal attribute generation method.`,
      },
      metadata: {
        source: 'progression-attribute-step',
        speciesAttributeOverride: override,
      },
    };

    try {
      const approvals = SettingsHelper.getArray('pendingCustomPurchases', []);
      const existingIndex = approvals.findIndex(item => item?.id === requestId || (item?.type === request.type && item?.ownerActorId === request.ownerActorId));
      if (existingIndex >= 0) approvals[existingIndex] = { ...approvals[existingIndex], ...request };
      else approvals.push(request);
      await SettingsHelper.set('pendingCustomPurchases', approvals);
    } catch (err) {
      console.warn('[AttributeStep] Failed to record GM approval request for attribute override:', err);
    }

    try {
      const gmIds = (game?.users?.contents || game?.users || [])
        .filter(user => user?.isGM)
        .map(user => user.id);
      if (gmIds.length && globalThis.ChatMessage?.create) {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker?.({ actor }) || {},
          whisper: gmIds,
          content: `<strong>GM approval requested:</strong> ${game?.user?.name || 'A player'} overrode the ${override.label || 'species fixed attribute array'} for ${actor?.name || 'a new character'}. Review it in the GM Datapad approvals page.`,
        });
      }
    } catch (err) {
      console.warn('[AttributeStep] Failed to whisper GMs about attribute override:', err);
    }

    ui?.notifications?.info?.('GM approval requested for the attribute-generation override.');
  }

  _getSpeciesMods(shell) {
    const pending =
      shell?.progressionSession?.draftSelections?.pendingSpeciesContext ??
      shell?.committedSelections?.get?.('pendingSpeciesContext') ??
      null;

    const species =
      shell?.progressionSession?.draftSelections?.species ??
      shell?.progressionSession?.committedSelections?.get?.('species') ??
      shell?.committedSelections?.get?.('species') ??
      null;

    const candidates = [
      pending?.abilities,
      pending?.abilityScores,
      pending?.abilityMods,
      pending?.mods?.abilities,
      pending?.modifiers?.abilities,
      pending?.ledger?.abilities,
      pending?.ledger?.abilityScores,
      pending?.resolved?.abilities,
      pending?.grants?.abilities,
      species?.pendingContext?.abilities,
      species?.pendingContext?.abilityScores,
      species?.abilityScores,
      species?.abilityMods,
      species?.speciesData?.abilityScores,
      species?.speciesData?.abilityMods,
      species?.values,
    ];

    const out = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    for (const raw of candidates) {
      if (!raw || typeof raw !== 'object') continue;
      for (const key of Object.keys(out)) {
        const value = raw[key] ?? raw[key.toUpperCase()] ?? raw[key === 'cha' ? 'charisma' : key];
        const number = Number(value);
        if (Number.isFinite(number) && number !== 0) out[key] = number;
      }
    }
    return out;
  }

  _normalizeIncomingAttributes(raw, shell) {
    if (!raw) return null;
    const values = raw.values ?? raw;
    const keys = this._getAbilityKeys(shell);
    const out = {};
    for (const key of keys) {
      const val = values[key];
      out[key] = Number.isFinite(Number(val)) ? Number(val) : (this._getExcludedSet(shell).has(key) ? 0 : POINT_BUY_BASE);
    }
    return out;
  }

  _buildInitialPointBuy(shell) {
    const excluded = this._getExcludedSet(shell);
    const out = {};
    for (const key of this._getAbilityKeys(shell)) {
      out[key] = excluded.has(key) ? 0 : POINT_BUY_BASE;
    }
    return out;
  }

  _buildUnassignedAttributes(shell) {
    const excluded = this._getExcludedSet(shell);
    const out = {};
    for (const key of this._getAbilityKeys(shell)) {
      out[key] = excluded.has(key) ? 0 : null;
    }
    return out;
  }

  _rollStandard(shell) {
    return Array.from({ length: this._getAssignableAbilityKeys(shell).length }, () => rollNd6DropLowest(4, 1));
  }

  _rollOrganic(shell) {
    const diceCount = this.getGenerationConfig(shell)?.organicDiceCount ?? 18;
    return Array.from({ length: diceCount }, () => rollDie(6)).sort((a, b) => b - a);
  }

  _randomPointBuy(shell) {
    const attrs = this._buildInitialPointBuy(shell);
    const pool = this.getPointBuyPool(shell);
    const keys = this._getAssignableAbilityKeys(shell);

    while (this._getPointBuySpent(attrs) < pool) {
      const candidates = keys.filter(key => this._canAdjustPointBuy(attrs, key, +1, pool));
      if (!candidates.length) break;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      attrs[pick] += 1;
    }

    return attrs;
  }

  _getPointBuySpent(attrs) {
    return Object.entries(attrs).reduce((sum, [_key, value]) => {
      if (!Number.isFinite(Number(value)) || Number(value) <= 0) return sum;
      const score = Number(value);
      return sum + ((POINT_BUY_COST[score] ?? POINT_BUY_COST[18]) - POINT_BUY_COST[POINT_BUY_BASE]);
    }, 0);
  }

  _canAdjustPointBuy(attrs, key, delta, pool) {
    const current = Number(attrs[key] ?? POINT_BUY_BASE);
    const next = current + delta;
    if (next < POINT_BUY_BASE || next > 18) return false;

    const clone = { ...attrs, [key]: next };
    return this._getPointBuySpent(clone) <= pool;
  }

  _modifier(score) {
    if (!Number.isFinite(Number(score))) return null;
    return Math.floor((Number(score) - 10) / 2);
  }

  _resetPooledMethod(shell, values = []) {
    const normalized = [...values]
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    this._attributes = this._buildUnassignedAttributes(shell);
    this._scorePool = normalized.map((value, index) => ({
      id: makePoolId(index),
      value,
      assignedTo: null
    }));
    this._selectedPoolId = this._scorePool[0]?.id ?? null;
    this._dragPoolId = null;
    this._committed = false;
  }

  _rebuildPoolFromAttributes(shell) {
    if (!this._attributes) return;
    const keys = this._getAssignableAbilityKeys(shell);
    this._scorePool = keys
      .map((ability, index) => {
        const value = Number(this._attributes?.[ability]);
        if (!Number.isFinite(value)) return null;
        return {
          id: makePoolId(index),
          value,
          assignedTo: ability
        };
      })
      .filter(Boolean);
    this._selectedPoolId = null;
    this._dragPoolId = null;
    this._speciesFixedOverrideRequested = false;
  }

  _getAssignmentsPerAbility(shell) {
    return this._method === 'organic' ? 3 : 1;
  }

  _normalizeAbilityKey(value) {
    return String(value || '').trim().toLowerCase();
  }

  _normalizePoolAssignments(shell) {
    if (!Array.isArray(this._scorePool)) return;
    const assignable = new Set(this._getAssignableAbilityKeys(shell).map(key => this._normalizeAbilityKey(key)));
    for (const item of this._scorePool) {
      const normalized = this._normalizeAbilityKey(item?.assignedTo);
      item.assignedTo = normalized && assignable.has(normalized) ? normalized : null;
    }
  }

  _getAssignedPoolItems(ability) {
    const abilityKey = this._normalizeAbilityKey(ability);
    return this._scorePool.filter(item => this._normalizeAbilityKey(item?.assignedTo) === abilityKey);
  }

  _recomputeAttributesFromPool(shell) {
    this._normalizePoolAssignments(shell);
    const attributes = this._buildUnassignedAttributes(shell);
    const assignableKeys = this._getAssignableAbilityKeys(shell);
    const slotsPerAbility = this._getAssignmentsPerAbility(shell);

    for (const ability of assignableKeys) {
      const assigned = this._getAssignedPoolItems(ability);
      if (!assigned.length) {
        attributes[ability] = null;
        continue;
      }

      const value = assigned.reduce((sum, item) => sum + Number(item.value || 0), 0);
      attributes[ability] = this._method === 'organic'
        ? (assigned.length === slotsPerAbility ? value : null)
        : value;
    }

    this._attributes = attributes;
  }

  _autoAssignCurrent(shell) {
    const pendingData = this._getPendingData(shell);
    const profile = buildAttributePlanningProfile({ actor: shell?.actor, pendingData, shell });

    if (this._method === 'point-buy') {
      this._attributes = planPointBuyAllocation(profile, this.getPointBuyPool(shell), {
        style: profile.recommendedStyle || 'balanced'
      });
      this._committed = false;
      return;
    }

    if (!Array.isArray(this._scorePool) || !this._scorePool.length) return;

    if (this._method === 'organic') {
      const organicPlan = planPooledAssignment(this._scorePool.map(item => item.value), profile, 'organic', {
        style: profile.recommendedStyle || 'balanced'
      });
      this._applyPooledAssignmentPlan(organicPlan, shell, 'organic');
    } else {
      const standardPlan = planPooledAssignment(this._scorePool.map(item => item.value), profile, 'standard', {
        style: profile.recommendedStyle || 'balanced'
      });
      this._applyPooledAssignmentPlan(standardPlan, shell, 'standard');
    }
  }

  _applyPooledAssignmentPlan(plan, shell, mode = 'standard') {
    const cleanPool = this._scorePool.map(item => ({ ...item, assignedTo: null }));
    const byValue = [...cleanPool].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
    const used = new Set();
    const assignable = new Set(this._getAssignableAbilityKeys(shell).map(key => this._normalizeAbilityKey(key)));
    const assignableKeys = Array.from(assignable);
    const slotsPerAbility = mode === 'organic' ? 3 : 1;

    for (const [ability, assignedValues] of Object.entries(plan || {})) {
      const abilityKey = this._normalizeAbilityKey(ability);
      if (!assignable.has(abilityKey)) continue;

      const values = mode === 'organic'
        ? (Array.isArray(assignedValues) ? assignedValues : [])
        : [assignedValues];

      for (const value of values) {
        const idx = byValue.findIndex((item, i) => !used.has(i) && Number(item.value) === Number(value));
        if (idx >= 0) {
          used.add(idx);
          byValue[idx].assignedTo = abilityKey;
        }
      }
    }

    // The shared attribute planner may still return a six-stat plan when the
    // live actor has not become a droid document yet. Fill any droid-only gaps
    // from the remaining generated values so STR/DEX/INT/WIS/CHA can lock
    // without waiting for a nonexistent Constitution assignment.
    for (const abilityKey of assignableKeys) {
      while (byValue.filter(item => item.assignedTo === abilityKey).length < slotsPerAbility) {
        const nextIndex = byValue.findIndex((item, i) => !used.has(i) && !item.assignedTo);
        if (nextIndex < 0) break;
        used.add(nextIndex);
        byValue[nextIndex].assignedTo = abilityKey;
      }
    }

    this._scorePool = byValue;
    this._selectedPoolId = null;
    this._dragPoolId = null;
    this._recomputeAttributesFromPool(shell);
    this._committed = false;
  }

  _getPendingData(shell) {
    return shell?.buildIntent?.toCharacterData?.() || {};
  }

  _getCurrentMethodValues(shell) {
    if (this._method === 'point-buy') return [];
    if (Array.isArray(this._scorePool) && this._scorePool.length) {
      return this._scorePool.map(item => Number(item.value)).filter(value => Number.isFinite(value));
    }
    return this._buildGeneratedValuesForCurrentMethod(shell);
  }

  _buildMentorIntro(shell) {
    const guidance = getStepGuidance(shell?.actor, 'attribute', shell);
    const methodLabel = this._method === 'point-buy'
      ? 'point-buy budget'
      : this._method === 'array'
        ? 'live array values'
        : this._method === 'standard'
          ? 'rolled results'
          : 'organic dice pool';
    return `${guidance || 'Attribute choices shape the whole build.'} I built these options from your ${methodLabel}, so you can apply one and still tweak it afterward.`;
  }

  _generateMentorBuilds(shell) {
    return buildSuggestedAttributeBuilds({
      actor: shell?.actor,
      pendingData: this._getPendingData(shell),
      shell,
      method: this._method,
      pool: this.getPointBuyPool(shell),
      values: this._getCurrentMethodValues(shell),
      arrayType: this._arrayType
    });
  }

  async _applyMentorBuild(build, shell) {
    if (!build) return;

    if (this._method === 'point-buy') {
      this._attributes = { ...build.baseScores };
      this._committed = false;
      shell.render();
      return;
    }

    if (build.assignment) {
      this._applyPooledAssignmentPlan(build.assignment, shell, this._method === 'organic' ? 'organic' : 'standard');
      shell.render();
    }
  }

  _setSelectedPoolItem(poolId) {
    if (!poolId) {
      this._selectedPoolId = null;
      this._dragPoolId = null;
      return;
    }

    const item = this._scorePool.find(entry => entry.id === poolId);
    this._selectedPoolId = item ? poolId : null;
    this._dragPoolId = item ? poolId : null;
  }

  _assignSelectedPoolToAbility(ability, shell) {
    if (this._method === 'point-buy' || !this._selectedPoolId || this._committed) return;

    const selected = this._scorePool.find(item => item.id === this._selectedPoolId);
    if (!selected) return;

    const abilityKey = String(ability || '').toLowerCase();
    if (!this._getAssignableAbilityKeys(shell).includes(abilityKey)) return;

    const slotsPerAbility = this._getAssignmentsPerAbility(shell);

    if (slotsPerAbility === 1) {
      const currentOccupant = this._scorePool.find(item => this._normalizeAbilityKey(item?.assignedTo) === abilityKey && item.id !== selected.id);
      const previousAbility = this._normalizeAbilityKey(selected.assignedTo);

      if (currentOccupant) currentOccupant.assignedTo = null;
      if (previousAbility && previousAbility !== abilityKey && currentOccupant) {
        currentOccupant.assignedTo = previousAbility;
      }

      selected.assignedTo = abilityKey;
      this._recomputeAttributesFromPool(shell);
    } else {
      const assignedItems = this._getAssignedPoolItems(abilityKey).filter(item => item.id !== selected.id);
      if (!selected.assignedTo && assignedItems.length >= slotsPerAbility) {
        ui?.notifications?.warn?.('That attribute already has three dice assigned. Clear it or move a die first.');
        return;
      }

      if (selected.assignedTo !== abilityKey && assignedItems.length >= slotsPerAbility) {
        ui?.notifications?.warn?.('That attribute already has three dice assigned.');
        return;
      }

      selected.assignedTo = abilityKey;
      this._recomputeAttributesFromPool(shell);
    }

    this._setFocusedAbility(abilityKey, shell);
    this._committed = false;
  }

  _clearAbilityAssignment(ability, shell) {
    if (this._method === 'point-buy' || this._committed) return;
    const abilityKey = String(ability || '').toLowerCase();
    if (!this._getAssignableAbilityKeys(shell).includes(abilityKey)) return;

    this._scorePool.forEach(entry => {
      if (this._normalizeAbilityKey(entry?.assignedTo) === abilityKey) entry.assignedTo = null;
    });
    this._recomputeAttributesFromPool(shell);
    this._committed = false;
  }

  _areAllPooledAbilitiesAssigned(shell) {
    this._normalizePoolAssignments(shell);
    const slotsPerAbility = this._getAssignmentsPerAbility(shell);
    return this._getAssignableAbilityKeys(shell).every((key) => {
      const assigned = this._getAssignedPoolItems(key).length;
      return assigned >= slotsPerAbility && Number.isFinite(Number(this._attributes?.[key]));
    });
  }

  _buildGeneratedValuesForCurrentMethod(shell) {
    if (this._method === 'array') {
      const arr = this.getGenerationConfig(shell)?.arrays?.[this._arrayType]
        ?? ACTOR_ATTRIBUTE_GENERATION_CONFIG.arrays.standard;
      return [...arr];
    }
    if (this._method === 'standard') return this._rollStandard(shell);
    if (this._method === 'organic') return this._rollOrganic(shell);
    return [];
  }

  async onStepEnter(shell) {
    if (this._isLevelUpAbilityIncreaseMode(shell)) {
      const existingLevelUp = shell?.progressionSession?.draftSelections?.attributes || null;
      this._attributes = this._normalizeLevelUpIncreases(existingLevelUp, shell);
      this._scorePool = [];
      this._selectedPoolId = null;
      const needed = this._getLevelUpAbilityIncreaseCount(shell);
      this._committed = needed > 0 && this._getLevelUpIncreaseSpent(shell) === needed && existingLevelUp?.mode === 'levelup-ability-increase';
      return;
    }

    const existing = this._normalizeIncomingAttributes(
      shell?.progressionSession?.draftSelections?.attributes,
      shell
    );

    if (existing) {
      this._attributes = existing;
      this._rebuildPoolFromAttributes(shell);
      this._committed = true;
      return;
    }

    const override = this._getSpeciesAttributeOverride(shell);
    if (override?.mode === 'fixed-array-plus-choice' && override.fixedScores) {
      this._method = 'species-fixed';
      this._attributes = { ...override.fixedScores, ...(override.finalScores || {}) };
      this._scorePool = [];
      this._selectedPoolId = null;
      this._committed = false;
      return;
    }

    if (!this._attributes) {
      this._attributes = this._buildInitialPointBuy(shell);
      this._scorePool = [];
      this._selectedPoolId = null;
      this._committed = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Action Handling
  // ---------------------------------------------------------------------------

  /**
   * Handle delegated attribute actions (lock)
   * @param {string} action - The action name ('attribute-lock')
   * @param {Event} event - The triggering event
   * @param {Element} target - The element that triggered the action
   * @param {Object} shell - The progression shell context
   * @returns {boolean} - True if action was handled
   */
  async handleAction(action, event, target, shell) {
    if (action === 'attribute-override-species-fixed') {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      await this._requestSpeciesFixedOverride(shell);
      this._method = 'point-buy';
      this._attributes = this._buildInitialPointBuy(shell);
      this._scorePool = [];
      this._selectedPoolId = null;
      this._committed = false;
      shell?.render?.();
      return true;
    }

    if (action !== 'attribute-lock') {
      return false;
    }

    event?.preventDefault?.();
    event?.stopPropagation?.();

    // Handle lock/unlock toggle
    if (this._committed) {
      // Unlock
      this._committed = false;
      shell?.render?.();
    } else {
      // Lock
      await this._performLock(shell);
    }

    return true;
  }

  /**
   * Execute the lock operation with validation
   * @private
   */
  async _performLock(shell) {
    if (!this._attributes) {
      ui?.notifications?.warn?.('Assign your attributes first.');
      return;
    }

    if (this._isLevelUpAbilityIncreaseMode(shell)) {
      const needed = this._getLevelUpAbilityIncreaseCount(shell);
      const increases = this._normalizeLevelUpIncreases(this._attributes, shell);
      const spent = Object.values(increases).reduce((sum, value) => sum + (Number(value) || 0), 0);
      if (spent !== needed) {
        ui?.notifications?.warn?.(`Choose exactly ${needed} different abilities to increase.`);
        return;
      }
      await this.onItemCommitted(increases, shell);
      shell?.render?.();
      return;
    }

    if (this._isSpeciesFixedMode()) {
      const status = this._getSpeciesFixedAllocationStatus(shell);
      if (!status.complete) {
        ui?.notifications?.warn?.(`Distribute all ${status.total} clone attribute increase points before locking.`);
        return;
      }
    } else if (this._method === 'point-buy') {
      const spent = this._getPointBuySpent(this._attributes);
      const pool = this.getPointBuyPool(shell);
      if (spent > pool) {
        ui?.notifications?.warn?.(`Point buy exceeds pool (${spent}/${pool}).`);
        return;
      }
    } else if (!this._areAllPooledAbilitiesAssigned(shell)) {
      ui?.notifications?.warn?.('Assign every generated score before locking attributes.');
      return;
    }

    const normalized = {};
    for (const key of this._getAbilityKeys(shell)) {
      const value = this._attributes[key];
      normalized[key] = Number.isFinite(Number(value)) ? Number(value) : 0;
    }

    await this.onItemCommitted(normalized, shell);
    shell?.render?.();
  }

  async afterRender(shell, workSurfaceEl) {
    if (!workSurfaceEl) return;

    workSurfaceEl.querySelectorAll('.attr-method-btn').forEach(btn => {
      btn.addEventListener('click', () => this._handleMethodChange(btn.dataset.method, shell));
    });

    workSurfaceEl.querySelectorAll('.attr-array-type-btn').forEach(btn => {
      btn.addEventListener('click', () => this._handleArrayTypeChange(btn.dataset.arrayType, shell));
    });

    workSurfaceEl.querySelectorAll('[data-ability-row]').forEach(row => {
      row.addEventListener('click', () => {
        const abilityKey = String(row.dataset.abilityRow || '').toLowerCase();
        this._setFocusedAbility(abilityKey, shell);
        if (this._method !== 'point-buy' && this._selectedPoolId) {
          this._assignSelectedPoolToAbility(abilityKey, shell);
        }
        shell.render();
      });
    });

    workSurfaceEl.querySelectorAll('[data-ability][data-delta]').forEach(btn => {
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        this._handlePointBuyDelta(btn.dataset.ability, Number(btn.dataset.delta), shell);
      });
    });

    workSurfaceEl.querySelectorAll('[data-score-pool-id]').forEach(btn => {
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        if (this._committed) return;
        this._setSelectedPoolItem(btn.dataset.scorePoolId);
        shell.render();
      });

      btn.addEventListener('dragstart', ev => {
        if (this._committed) return;
        const poolId = btn.dataset.scorePoolId;
        this._setSelectedPoolItem(poolId);
        ev.dataTransfer?.setData('text/plain', poolId);
      });
    });

    workSurfaceEl.querySelectorAll('[data-ability-row]').forEach(row => {
      row.addEventListener('dragover', ev => {
        if (this._committed || this._method === 'point-buy') return;
        ev.preventDefault();
        row.classList.add('prog-attribute-row--drop-ready');
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('prog-attribute-row--drop-ready');
      });

      row.addEventListener('drop', ev => {
        if (this._committed || this._method === 'point-buy') return;
        ev.preventDefault();
        row.classList.remove('prog-attribute-row--drop-ready');
        const poolId = ev.dataTransfer?.getData('text/plain') || this._dragPoolId || this._selectedPoolId;
        if (!poolId) return;
        this._setSelectedPoolItem(poolId);
        this._assignSelectedPoolToAbility(row.dataset.abilityRow, shell);
        shell.render();
      });
    });

    workSurfaceEl.querySelectorAll('[data-clear-ability]').forEach(btn => {
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        this._clearAbilityAssignment(btn.dataset.clearAbility, shell);
        shell.render();
      });
    });

    workSurfaceEl.querySelector('[data-attr-reroll]')?.addEventListener('click', () => {
      this._rerollCurrent(shell);
    });

    workSurfaceEl.querySelector('[data-attr-auto-assign]')?.addEventListener('click', () => {
      this._autoAssignCurrent(shell);
      shell.render();
    });

  }

  _handleMethodChange(method, shell) {
    this._method = method;
    this._committed = false;

    if (method === 'point-buy') {
      this._attributes = this._buildInitialPointBuy(shell);
      this._scorePool = [];
      this._selectedPoolId = null;
    } else {
      this._resetPooledMethod(shell, this._buildGeneratedValuesForCurrentMethod(shell));
    }

    console.debug('[AttributeStep] method changed', {
      method,
      attributes: this._attributes,
      scorePool: this._scorePool
    });
    shell.render();
  }

  _handleArrayTypeChange(arrayType, shell) {
    this._arrayType = arrayType || 'standard';
    this._committed = false;
    if (this._method === 'array') {
      this._resetPooledMethod(shell, this._buildGeneratedValuesForCurrentMethod(shell));
    }
    console.debug('[AttributeStep] array type changed', {
      arrayType,
      attributes: this._attributes,
      scorePool: this._scorePool
    });
    shell.render();
  }

  _handlePointBuyDelta(key, delta, shell) {
    if (this._committed) return;
    if (this._isLevelUpAbilityIncreaseMode(shell)) {
      const ability = String(key || '').toLowerCase();
      if (!this._getAbilityKeys(shell).includes(ability)) return;
      const needed = this._getLevelUpAbilityIncreaseCount(shell);
      const current = this._normalizeLevelUpIncreases(this._attributes, shell);
      const oldValue = Number(current[ability] || 0);
      const nextValue = delta > 0 ? 1 : 0;
      const spentWithout = Object.entries(current)
        .filter(([k]) => k !== ability)
        .reduce((sum, [, value]) => sum + (Number(value) || 0), 0);
      if (nextValue > oldValue && spentWithout + nextValue > needed) return;
      this._attributes = { ...current, [ability]: nextValue };
      this._setFocusedAbility(ability, shell);
      shell.render();
      return;
    }
    if (this._isSpeciesFixedMode()) {
      this._handleSpeciesFixedDelta(key, delta, shell);
      return;
    }
    if (this._method !== 'point-buy') return;

    const pool = this.getPointBuyPool(shell);
    if (!this._canAdjustPointBuy(this._attributes, key, delta, pool)) return;

    this._attributes = { ...this._attributes, [key]: Number(this._attributes[key] ?? POINT_BUY_BASE) + delta };
    this._setFocusedAbility(key, shell);
    shell.render();
  }

  _rerollCurrent(shell) {
    this._committed = false;

    if (this._isSpeciesFixedMode()) return;

    if (this._method === 'point-buy') {
      this._attributes = this._randomPointBuy(shell);
    } else {
      this._resetPooledMethod(shell, this._buildGeneratedValuesForCurrentMethod(shell));
    }

    console.debug('[AttributeStep] rerolled current method', {
      method: this._method,
      attributes: this._attributes,
      scorePool: this._scorePool
    });

    shell.render();
  }

  async onAskMentor(shell) {
    const builds = this._generateMentorBuilds(shell);
    if (!builds.length) {
      ui?.notifications?.warn?.('No attribute builds are available yet for this method.');
      return;
    }

    const dialog = new AttributeMentorDialog({
      builds,
      method: this._method,
      pointBuyPool: this._method === 'point-buy' ? this.getPointBuyPool(shell) : null,
      intro: this._buildMentorIntro(shell),
      onApply: async (build) => {
        await this._applyMentorBuild(build, shell);
      }
    });

    await dialog.render(true);
  }

  getMentorContext(shell) {
    return getStepGuidance(shell?.actor, 'attribute', shell)
      || 'Think in breakpoints, not just raw numbers. A strong build either amplifies your species strengths or patches its weak spots.';
  }

  getMentorMode() {
    return 'interactive';
  }

  getSelection() {
    const selected = this._attributes
      ? Object.entries(this._attributes).filter(([_, value]) => Number.isFinite(Number(value)) && Number(value) > 0).map(([key]) => key)
      : [];

    return {
      selected,
      count: selected.length,
      isComplete: this._committed,
    };
  }

  async onItemCommitted(attributes, shell) {
    if (this._isLevelUpAbilityIncreaseMode(shell)) {
      const increases = this._normalizeLevelUpIncreases(attributes, shell);
      this._attributes = increases;
      this._committed = true;
      const finalValues = {};
      const modifiers = {};
      for (const key of this._getAbilityKeys(shell)) {
        const base = this._getActorAbilityBase(shell, key);
        const finalScore = base + (Number(increases[key] || 0) || 0);
        finalValues[key] = finalScore;
        modifiers[key] = Math.floor((finalScore - 10) / 2);
      }
      await this._commitNormalized(shell, 'attributes', {
        mode: 'levelup-ability-increase',
        increases,
        values: finalValues,
        finalValues,
        modifiers,
        abilityIncreaseLevel: buildLevelUpEntitlementManifest(shell?.actor || null, shell?.progressionSession || null)?.characterLevel || null,
      });
      return;
    }

    this._attributes = { ...attributes };
    this._committed = true;
    const speciesMods = this._isSpeciesFixedMode()
      ? { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
      : this._getSpeciesMods(shell);
    const finalValues = {};
    const modifiers = {};
    for (const key of this._getAbilityKeys(shell)) {
      const base = Number(attributes?.[key] ?? 0) || 0;
      const finalScore = base + (Number(speciesMods?.[key] ?? 0) || 0);
      finalValues[key] = finalScore;
      modifiers[key] = Math.floor((finalScore - 10) / 2);
    }
    await this._commitNormalized(shell, 'attributes', {
      values: attributes,
      baseValues: attributes,
      speciesMods,
      finalValues,
      modifiers,
      abilityKeys: this._getAbilityKeys(shell),
      excludedAbilities: Array.from(this._getExcludedSet(shell)),
      isDroidAttributeSet: this._isDroidContext(shell),
    });
  }

  validate(shell = null) {
    if (!this._attributes) {
      return { isValid: false, errors: ['Attributes not yet assigned'], warnings: [] };
    }

    if (this._isLevelUpAbilityIncreaseMode(shell)) {
      const needed = this._getLevelUpAbilityIncreaseCount(shell);
      const spent = this._getLevelUpIncreaseSpent(shell);
      if (spent !== needed) {
        return { isValid: false, errors: [`Choose exactly ${needed} different abilities to increase`], warnings: [] };
      }
      if (!this._committed) {
        return { isValid: false, errors: ['Click Lock Attributes to continue'], warnings: [] };
      }
      return { isValid: true, errors: [], warnings: [] };
    }

    if (this._isSpeciesFixedMode()) {
      const status = this._getSpeciesFixedAllocationStatus(shell);
      if (!status.complete) {
        return { isValid: false, errors: [`Distribute ${status.remaining} more clone attribute increase point${status.remaining === 1 ? '' : 's'}`], warnings: [] };
      }
    } else if (this._method === 'point-buy') {
      const spent = this._getPointBuySpent(this._attributes);
      const pool = this.getPointBuyPool(shell);
      if (spent > pool) {
        return { isValid: false, errors: [`Point buy exceeds pool (${spent}/${pool})`], warnings: [] };
      }
    } else if (!this._areAllPooledAbilitiesAssigned(shell)) {
      return { isValid: false, errors: ['Assign all generated scores before continuing'], warnings: [] };
    }

    if (!this._committed) {
      return { isValid: false, errors: ['Click Lock Attributes to continue'], warnings: [] };
    }

    return { isValid: true, errors: [], warnings: [] };
  }

  getBlockingIssues(shell = null) {
    if (this._isLevelUpAbilityIncreaseMode(shell)) {
      const needed = this._getLevelUpAbilityIncreaseCount(shell);
      const spent = this._getLevelUpIncreaseSpent(shell);
      if (spent !== needed) return [`Choose exactly ${needed} different abilities to increase`];
      if (!this._committed) return ['Click Lock Attributes to continue'];
      return [];
    }

    if (this._isSpeciesFixedMode()) {
      const status = this._getSpeciesFixedAllocationStatus(shell);
      if (!status.complete) return [`Distribute ${status.remaining} more clone attribute increase point${status.remaining === 1 ? '' : 's'}`];
    } else if (this._method !== 'point-buy' && !this._areAllPooledAbilitiesAssigned(shell)) {
      return ['Assign every generated score before locking attributes'];
    }
    if (!this._committed) return ['Click Lock Attributes to continue'];
    return [];
  }

  getRemainingPicks(shell = null) {
    if (this._isLevelUpAbilityIncreaseMode(shell)) {
      const needed = this._getLevelUpAbilityIncreaseCount(shell);
      const spent = this._getLevelUpIncreaseSpent(shell);
      return [{
        label: 'Ability increases remaining',
        count: Math.max(0, needed - spent),
        isWarning: spent !== needed || !this._committed,
      }];
    }

    if (this._isSpeciesFixedMode()) {
      const status = this._getSpeciesFixedAllocationStatus(shell);
      if (!status.complete) {
        return [{ label: 'Clone attribute increases remaining', count: status.remaining, isWarning: true }];
      }
    }

    if (!this._isSpeciesFixedMode() && this._method !== 'point-buy') {
      const remaining = this._getAssignableAbilityKeys(shell).filter(key => !Number.isFinite(Number(this._attributes?.[key]))).length;
      if (remaining > 0) {
        return [{ label: 'Generated scores remaining', count: remaining, isWarning: true }];
      }
    }

    if (!this._committed) {
      return [{ label: 'Attribute lock', count: 1, total: 1, isWarning: true }];
    }
    return [];
  }


  _formatModifierDisplay(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '—';
    return numeric > 0 ? `+${numeric}` : `${numeric}`;
  }

  _decorateAbilityForV2(ability = {}, shell = null, method = this._method) {
    const key = String(ability.id || '').toLowerCase();
    const meta = ATTRIBUTE_V2_META[key] || { fullName: ability.label || key.toUpperCase(), series: 'physical', colorClass: key, detail: '' };
    const baseScore = Number(ability.baseDisplay);
    const finalScore = Number(ability.finalDisplay);
    const modifier = Number.isFinite(finalScore) ? this._modifier(finalScore) : null;
    const cost = Number.isFinite(baseScore) && method === 'point-buy'
      ? Math.max(0, (POINT_BUY_COST[baseScore] ?? POINT_BUY_COST[18]) - POINT_BUY_COST[POINT_BUY_BASE])
      : null;
    const assignedPoolItems = Array.isArray(ability.assignedPoolItems)
      ? ability.assignedPoolItems
      : (Array.isArray(ability.assignedValues)
        ? ability.assignedValues.map((value, index) => ({ id: `${key}-assigned-${index}`, value, isSelected: false }))
        : []);
    const assignedText = assignedPoolItems.length
      ? assignedPoolItems.map(item => item.value).join(' + ')
      : null;
    const isExcluded = this._getExcludedSet(shell).has(key);

    return {
      ...ability,
      label: ability.label || key.toUpperCase(),
      fullName: meta.fullName,
      series: meta.series,
      colorClass: meta.colorClass,
      detail: meta.detail,
      modTone: modifier > 0 ? 'pos' : modifier < 0 ? 'neg' : 'zero',
      valueTone: Number.isFinite(finalScore) ? (finalScore >= 12 ? 'pos' : finalScore <= 9 ? 'neg' : 'zero') : 'zero',
      costLabel: cost != null ? `${cost} pt` : null,
      assignedPoolItems,
      assignedText,
      isExcluded,
    };
  }

  _buildAttributeMethodCards(data = {}, shell = null) {
    const config = this.getGenerationConfig(shell);
    const pointBuyPool = Number(data.pointBuyPool || this.getPointBuyPool(shell) || 0) || 0;
    const organicDice = Number(config?.organicDiceCount || 18) || 18;
    const organicDrop = Number(config?.organicDropCount || 0) || 0;
    const rawCards = [
      { id: 'point-buy', label: 'Point Buy', sub: `${pointBuyPool} PT`, icon: 'fa-coins' },
      { id: 'array', label: 'Standard Array', sub: this._arrayType === 'highPower' ? '16·14·12·12·10·8' : '15·14·13·12·10·8', icon: 'fa-grip' },
      { id: 'standard', label: 'Standard Roll', sub: '4d6 ↓1', icon: 'fa-dice-d6' },
      { id: 'organic', label: 'Organic Roll', sub: organicDrop > 0 ? `${organicDice}d6 ↓${organicDrop}` : `${organicDice}d6`, icon: 'fa-dice' }
    ];
    return rawCards.map(card => ({ ...card, isActive: data.method === card.id, disabled: !!data.isCommitted }));
  }

  _buildAttributeDerivedStats(abilities = []) {
    const byKey = new Map(abilities.map(ability => [String(ability.id || '').toLowerCase(), ability]));
    const read = (key) => byKey.get(key)?.modifierFormatted ?? '—';
    const tone = (key) => byKey.get(key)?.modTone ?? 'zero';
    const value = (key) => byKey.get(key)?.finalDisplay ?? '—';
    return [
      { key: 'fort', label: 'Fortitude', value: read('con'), source: 'CON modifier', tone: tone('con') },
      { key: 'ref', label: 'Reflex', value: read('dex'), source: 'DEX modifier', tone: tone('dex') },
      { key: 'will', label: 'Will', value: read('wis'), source: 'WIS modifier', tone: tone('wis') },
      { key: 'init', label: 'Initiative', value: read('dex'), source: 'DEX modifier', tone: tone('dex') },
      { key: 'skills', label: 'Skill Bias', value: read('int'), source: `INT ${value('int')}`, tone: tone('int') },
      { key: 'presence', label: 'Presence', value: read('cha'), source: 'CHA modifier', tone: tone('cha') }
    ];
  }

  _decorateStepDataForV2(data = {}, shell = null) {
    const abilities = (Array.isArray(data.abilities) ? data.abilities : [])
      .map(ability => this._decorateAbilityForV2(ability, shell, data.method));
    const focus = abilities.find(ability => ability.id === this._focusedAbility)
      || abilities.find(ability => !ability.isExcluded)
      || abilities[0]
      || null;
    const methodCopy = ATTRIBUTE_V2_METHOD_COPY[data.method] || ATTRIBUTE_V2_METHOD_COPY[this._method] || ATTRIBUTE_V2_METHOD_COPY['point-buy'];
    const pointStatus = data.pointBuyStatus || { spent: 0, percent: 0, isComplete: false, status: '' };
    const poolAssigned = (Array.isArray(data.scorePool) ? data.scorePool : []).filter(item => item.isUsed).length;
    const poolTotal = Array.isArray(data.scorePool) ? data.scorePool.length : 0;
    const poolPercent = poolTotal ? Math.round((poolAssigned / poolTotal) * 100) : 0;

    return {
      ...data,
      abilities,
      physicalAbilities: abilities.filter(ability => ability.series === 'physical'),
      mentalAbilities: abilities.filter(ability => ability.series === 'mental'),
      focusedAbility: focus,
      methodCopy,
      methodCards: this._buildAttributeMethodCards(data, shell),
      derivedStats: this._buildAttributeDerivedStats(abilities),
      hasGeneratedPool: !!data.showGeneratedPool && poolTotal > 0,
      poolAssigned,
      poolTotal,
      poolPercent,
      pointBuyPercent: pointStatus.percent ?? 0,
      pointBuySpent: pointStatus.spent ?? 0,
      pointBuyRemaining: Number(data.pointBuyPool || 0) - Number(pointStatus.spent || 0),
      lockButtonIcon: data.isCommitted ? 'fa-lock-open' : 'fa-lock',
      lockButtonTone: data.isCommitted ? 'locked' : 'unlocked',
      stepSubtitle: data.attributeIncreaseMode
        ? 'Choose ability increases unlocked by level progression.'
        : 'Assign starting scores. Species modifiers apply automatically.'
    };
  }

  async getStepData(context) {
    const shell = context?.shell;
    if (this._isLevelUpAbilityIncreaseMode(shell)) {
      const needed = this._getLevelUpAbilityIncreaseCount(shell);
      const increases = this._normalizeLevelUpIncreases(this._attributes, shell);
      const spent = Object.values(increases).reduce((sum, value) => sum + (Number(value) || 0), 0);
      const abilities = this._getAbilityKeys(shell).map(key => {
        const base = this._getActorAbilityBase(shell, key);
        const increase = Number(increases[key] || 0) || 0;
        const finalScore = base + increase;
        const modifier = this._modifier(finalScore);
        return {
          id: key,
          label: key.toUpperCase(),
          isFocused: this._focusedAbility === key,
          isUnassigned: false,
          baseDisplay: String(base),
          finalDisplay: String(finalScore),
          speciesMod: increase,
          speciesModClass: increase > 0 ? 'prog-num--pos' : 'prog-num--zero',
          modifierFormatted: Number.isFinite(Number(modifier)) ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : '—',
          modClass: modifier > 0 ? 'prog-num--pos' : modifier < 0 ? 'prog-num--neg' : 'prog-num--zero',
          canAdjust: !this._committed,
          canIncrease: increase < 1 && spent < needed,
          canDecrease: increase > 0,
          assignedValues: [],
          assignmentCapacity: 0,
          assignmentHint: increase > 0 ? '+1 selected' : null,
        };
      });
      return this._decorateStepDataForV2({
        isCommitted: this._committed,
        method: 'levelup-increase',
        abilities,
        scorePool: [],
        pointBuyPool: 0,
        showMethodSelector: false,
        showPointBuy: false,
        showGeneratedPool: false,
        isSpeciesFixed: false,
        attributeIncreaseMode: true,
        secondColumnLabel: 'Increase',
        showUtilityActions: false,
        pointBuyStatus: { spent, percent: needed ? Math.round((spent / needed) * 100) : 100, isComplete: spent === needed, status: `${Math.max(0, needed - spent)} remaining` },
        remainingPoolAssignments: 0,
        currentMethodDescription: `Choose exactly ${needed} different abilities. Each selected ability gains +1.`,
        poolInstruction: spent === needed ? 'Ability increases ready to lock.' : `${Math.max(0, needed - spent)} increase${needed - spent === 1 ? '' : 's'} remaining.`,
        lockButtonLabel: this._committed ? 'Unlock Ability Increases' : 'Lock Ability Increases',
        rerollButtonLabel: 'Reroll',
      }, shell);
    }

    const pointBuyPool = this.getPointBuyPool(shell);
    const speciesMods = this._isSpeciesFixedMode() ? { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } : this._getSpeciesMods(shell);
    const attributeOverride = this._getSpeciesAttributeOverride(shell);
    const excluded = this._getExcludedSet(shell);
    const speciesFixedAllocation = this._isSpeciesFixedMode() ? this._getSpeciesFixedAllocationStatus(shell) : null;
    const speciesFixedScores = this._isSpeciesFixedMode() ? this._getSpeciesFixedScores(shell) : null;

    const spent = this._getPointBuySpent(this._attributes ?? {});
    const percent = pointBuyPool > 0
      ? Math.max(0, Math.min(100, Math.round((spent / pointBuyPool) * 100)))
      : 0;

    const scorePool = this._scorePool.map(item => ({
      id: item.id,
      value: item.value,
      isSelected: item.id === this._selectedPoolId,
      isUsed: !!item.assignedTo,
      assignedLabel: item.assignedTo ? item.assignedTo.toUpperCase() : 'Available',
      assignedTo: item.assignedTo || null,
      isDraggable: !this._committed && this._method !== 'point-buy',
    }));

    const abilities = this._getAbilityKeys(shell).map(key => {
      const baseValue = this._attributes?.[key];
      const hasBase = Number.isFinite(Number(baseValue));
      const base = hasBase ? Number(baseValue) : null;
      const speciesMod = Number(speciesMods[key] ?? 0);
      const finalScore = hasBase ? base + speciesMod : null;
      const modifier = this._modifier(finalScore);
      const assignedPoolItems = this._getAssignedPoolItems(key);
      const assignedPool = assignedPoolItems[0] || null;
      const assignmentCapacity = this._getAssignmentsPerAbility(shell);
      const assignmentDisplay = this._method === 'organic'
        ? `${assignedPoolItems.length}/${assignmentCapacity} dice assigned`
        : (assignedPool ? `Assigned ${assignedPool.value}` : 'Unassigned');

      return {
        id: key,
        label: key.toUpperCase(),
        isFocused: this._focusedAbility === key,
        isUnassigned: !hasBase && !excluded.has(key),
        baseDisplay: hasBase ? String(base) : '—',
        finalDisplay: Number.isFinite(Number(finalScore)) ? String(finalScore) : '—',
        speciesMod,
        speciesModClass: speciesMod > 0 ? 'prog-num--pos' : speciesMod < 0 ? 'prog-num--neg' : 'prog-num--zero',
        modifierFormatted: Number.isFinite(Number(modifier)) ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : '—',
        modClass: modifier > 0 ? 'prog-num--pos' : modifier < 0 ? 'prog-num--neg' : 'prog-num--zero',
        canAdjust: !this._committed && !excluded.has(key) && (
          (this._method === 'point-buy' && !this._isSpeciesFixedMode())
          || (this._isSpeciesFixedMode() && this._canAdjustSpeciesFixed(shell, key, +1))
          || (this._isSpeciesFixedMode() && this._canAdjustSpeciesFixed(shell, key, -1))
        ),
        canIncrease: this._isSpeciesFixedMode() ? this._canAdjustSpeciesFixed(shell, key, +1) : true,
        canDecrease: this._isSpeciesFixedMode() ? this._canAdjustSpeciesFixed(shell, key, -1) : true,
        fixedBaseDisplay: speciesFixedScores?.[key] ?? null,
        allocationAmount: speciesFixedAllocation?.allocations?.[key] ?? 0,
        showClear: !this._committed && this._method !== 'point-buy' && assignedPoolItems.length > 0,
        assignmentHint: this._method !== 'point-buy' && !this._isSpeciesFixedMode() && !excluded.has(key)
          ? assignmentDisplay
          : (this._isSpeciesFixedMode() && (speciesFixedAllocation?.allocations?.[key] ?? 0) > 0
            ? `Clone increase +${speciesFixedAllocation.allocations[key]}`
            : null),
        assignedValues: assignedPoolItems.map(item => item.value),
        assignedPoolItems: assignedPoolItems.map(item => ({
          id: item.id,
          value: item.value,
          isSelected: item.id === this._selectedPoolId,
          assignedTo: item.assignedTo || null,
        })),
        assignmentCapacity,
      };
    });

    const remainingPoolAssignments = this._method !== 'point-buy'
      ? this._getAssignableAbilityKeys(shell).filter(key => !Number.isFinite(Number(this._attributes?.[key]))).length
      : 0;

    return this._decorateStepDataForV2({
      isCommitted: this._committed,
      method: this._method,
      arrayType: this._arrayType,
      abilities,
      scorePool,
      pointBuyPool,
      showMethodSelector: !this._isSpeciesFixedMode(),
      showPointBuy: this._method === 'point-buy' && !this._isSpeciesFixedMode(),
      showGeneratedPool: this._method !== 'point-buy' && !this._isSpeciesFixedMode(),
      showUtilityActions: true,
      isSpeciesFixed: this._isSpeciesFixedMode(),
      attributeOverride,
      speciesFixedAllocation,
      showSpeciesFixedOverride: this._isSpeciesFixedMode() && attributeOverride?.requiresGmApprovalOnOverride !== false,
      showAutoAssign: !this._isSpeciesFixedMode(),
      showArrayTypeSelector: this._method === 'array',
      pointBuyStatus: {
        spent,
        percent,
        isComplete: spent <= pointBuyPool,
        status: spent === pointBuyPool ? 'Pool fully allocated' : `${pointBuyPool - spent} points remaining`
      },
      remainingPoolAssignments,
      currentMethodDescription:
        this._isSpeciesFixedMode()
          ? (attributeOverride?.helpText || `${attributeOverride?.label || 'Species fixed array'} is pre-filled. Distribute the remaining attribute increase points, then lock attributes to continue.`)
          : this._method === 'point-buy'
          ? 'Adjust scores with +/- as needed. Auto Assign uses the suggestion engine, and Ask Mentor can apply a full build while still leaving everything editable.'
          : this._method === 'array'
            ? `Using the ${this._arrayType === 'highPower' ? 'high power' : 'standard'} array. Drag scores onto attributes, use Auto Assign, or ask your mentor for build placements.`
            : this._method === 'standard'
              ? 'Reroll generates six fresh 4d6 drop-lowest scores. Drag a score onto an attribute row, or let Ask Mentor suggest placements from the rolls you have now.'
              : 'Reroll generates the organic dice pool. Drag three dice into each attribute row, or ask your mentor for a suggested allocation from the live dice pool.',
      poolInstruction:
        this._isSpeciesFixedMode()
          ? `Remaining: ${speciesFixedAllocation?.remaining ?? 0}/${speciesFixedAllocation?.total ?? 0}. Use the override button only when the GM is allowing a non-canonical clone attribute method.`
          : this._method === 'point-buy'
          ? 'Use Ask Mentor if you want three live build plans based on the point budget currently available.'
          : this._selectedPoolId
            ? (this._method === 'organic'
              ? 'Selected die is armed. Drag it or click an attribute row to add it. Each attribute needs 3 dice.'
              : 'Selected result is armed. Drag it or click an attribute row to place it.')
            : (this._method === 'organic'
              ? 'Drag three dice into each attribute row. Clear an attribute to reclaim its dice.'
              : 'Drag a generated result onto an attribute row, or click a result and then click an attribute.'),
      lockButtonLabel: this._committed ? 'Unlock Attributes' : 'Lock Attributes',
      rerollButtonLabel: 'Reroll'
    }, shell);
  }

  async renderDetailsPanel(focusedItem = null, shell = null) {
    const stepData = await this.getStepData({ shell });
    const requestedKey = String(focusedItem?.id || focusedItem?.key || this._focusedAbility || '').toLowerCase();
    const ability = stepData.abilities.find(candidate => candidate.id === requestedKey)
      || stepData.focusedAbility
      || stepData.abilities.find(candidate => !candidate.isExcluded)
      || null;

    if (!ability) {
      return {
        template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/empty-state.hbs',
        data: {
          message: 'Select an attribute to see live derivations and calibration guidance.',
          icon: this._descriptor.icon,
        },
      };
    }

    this._setFocusedAbility(ability.id, shell);

    const speciesMod = Number(ability.speciesMod ?? 0) || 0;
    const baseScore = Number.isFinite(Number(ability.baseDisplay)) ? Number(ability.baseDisplay) : ability.baseDisplay ?? '—';
    const finalScore = Number.isFinite(Number(ability.finalDisplay)) ? Number(ability.finalDisplay) : ability.finalDisplay ?? '—';
    const modifier = Number.isFinite(Number(ability.finalDisplay)) ? this._modifier(Number(ability.finalDisplay)) : null;
    const methodDescription = stepData.currentMethodDescription || '';

    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/attribute-details.hbs',
      data: {
        id: ability.id,
        label: ability.fullName || ability.label || ability.id.toUpperCase(),
        shortLabel: ability.label || ability.id.toUpperCase(),
        methodLabel: stepData.methodCopy?.label || 'Attribute Method',
        methodDescription,
        canonicalDescription: ability.detail || this._getAbilityMeta(ability.id).detail || '',
        baseScore,
        speciesMod,
        secondColumnLabel: stepData.secondColumnLabel || 'Species Modifier',
        speciesModClass: ability.speciesModClass || (speciesMod > 0 ? 'prog-num--pos' : speciesMod < 0 ? 'prog-num--neg' : 'prog-num--zero'),
        finalScore,
        modifierFormatted: ability.modifierFormatted || this._formatModifierDisplay(modifier),
        modClass: ability.modClass || (modifier > 0 ? 'prog-num--pos' : modifier < 0 ? 'prog-num--neg' : 'prog-num--zero'),
        affects: ATTRIBUTE_V2_AFFECTS[ability.id] || [],
        assignedText: ability.assignedText || ability.assignmentHint || '',
        costLabel: ability.costLabel || '',
        mentorProse: methodDescription,
        derivedStats: stepData.derivedStats || [],
        hasDerivedStats: (stepData.derivedStats || []).length > 0,
      }
    };
  }

  renderWorkSurface(stepData) {
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/attribute-work-surface.hbs',
      data: stepData
    };
  }
}

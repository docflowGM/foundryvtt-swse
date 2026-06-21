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
  organicDiceCount: 18,
  organicGroupCount: 6,
  organicDropCount: 0,
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
  organicDiceCount: 15,
  organicGroupCount: 5,
  organicDropCount: 0,
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
    this._lastShell = null;
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
        organicDiceCount: 15,
        organicGroupCount: 5,
        organicDropCount: 0,
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
    const configured = this.getGenerationConfig(shell)?.abilitySystemKeys;
    const fallback = this._isDroidContext(shell)
      ? DROID_ATTRIBUTE_GENERATION_CONFIG.abilitySystemKeys
      : ACTOR_ATTRIBUTE_GENERATION_CONFIG.abilitySystemKeys;
    const rawKeys = Array.isArray(configured) && configured.length ? configured : fallback;
    const normalized = rawKeys
      .map(key => String(key || '').trim().toLowerCase())
      .filter(Boolean);
    return normalized.length ? [...new Set(normalized)] : [...fallback];
  }

  _getAbilityIncreaseAllocationMode() {
    const modern = HouseRuleService.getString('abilityIncreaseAllocationMode', 'raw_two_different');
    if (modern === 'allow_stacked_two' || modern === 'raw_two_different') return modern;

    // Legacy fallback for worlds that still only have abilityIncreaseMethod.
    const legacy = HouseRuleService.getString('abilityIncreaseMethod', 'standard');
    return legacy === 'flexible' ? 'allow_stacked_two' : 'raw_two_different';
  }

  _allowsStackedAbilityIncrease() {
    return this._getAbilityIncreaseAllocationMode() === 'allow_stacked_two';
  }

  _getAbilityIncreaseMaxPerAbility(shell) {
    const total = Math.max(1, Number(this._getLevelUpAbilityIncreaseCount(shell) || 2) || 2);
    return this._allowsStackedAbilityIncrease() ? total : 1;
  }

  _abilityIncreaseRuleLabel() {
    return this._allowsStackedAbilityIncrease()
      ? 'Allocate 2 ability points. You may place both points in one ability or split them.'
      : 'Choose 2 different abilities. Each selected ability gains +1.';
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
    if (this.descriptor?.reconciliationContext?.slotType === 'ability-increase') return true;
    if (this._method === 'levelup-increase') return true;

    const session = shell?.progressionSession || {};
    const draftAttributes = session?.draftSelections?.attributes || null;
    if (draftAttributes?.mode === 'levelup-ability-increase') return true;

    const mode = shell?.mode || session?.mode || session?.draftSelections?.mode;
    const sessionId = String(session?.sessionId || '').toLowerCase();
    const looksLikeLevelup = mode === 'levelup' || sessionId.includes('levelup');

    try {
      const manifest = buildLevelUpEntitlementManifest(shell?.actor || null, session || null);
      if (manifest?.abilityIncreases?.required === true) return true;
    } catch (_err) {
      // Fall through to explicit session hints below.
    }

    // Some AppV2 action callbacks receive a thinner shell than the render path.
    // Do not fall back into generated-score validation if the step already
    // entered the level-up ability-increase workflow.
    return looksLikeLevelup && !!draftAttributes?.increases;
  }

  _getLevelUpAbilityIncreaseCount(shell) {
    const reconSlot = this.descriptor?.reconciliationContext;
    if (reconSlot?.slotType === 'ability-increase') {
      return Math.max(1, Number(reconSlot?.count || reconSlot?.openCount || 2) || 2);
    }

    const session = shell?.progressionSession || {};
    const draftAttributes = session?.draftSelections?.attributes || null;
    const explicitCount = Number(
      draftAttributes?.abilityIncreaseCount
      ?? draftAttributes?.count
      ?? draftAttributes?.needed
      ?? draftAttributes?.pointBuyStatus?.needed
    );
    if (Number.isFinite(explicitCount) && explicitCount > 0) return Math.max(1, explicitCount);

    try {
      const manifest = buildLevelUpEntitlementManifest(shell?.actor || null, session || null);
      const manifestCount = Math.max(0, Number(manifest?.abilityIncreases?.count || 0) || 0);
      if (manifestCount > 0) return manifestCount;
    } catch (_err) {
      // Fall through to workflow fallback.
    }

    // If the UI is already in ability-increase mode, use the Saga default.
    // This prevents the lock handler from treating the level-up step as a
    // generated-score attribute creation step when Foundry provides a thin shell.
    if (this._method === 'levelup-increase' || draftAttributes?.mode === 'levelup-ability-increase') return 2;
    return 0;
  }

  _getActorAbilityBase(shell, key) {
    const system = shell?.actor?.system || {};
    const ability = system.attributes?.[key]
      || system.abilities?.[key]
      || system.stats?.abilities?.[key]
      || {};
    const derived = system.derived?.abilities?.[key] || {};

    // Prefer current total when it is explicitly hydrated; otherwise compose the
    // canonical base + racial/enhancement/temp pieces. This makes level-up
    // ability increase previews reflect the actor's actual current score rather
    // than falling back to a stale compatibility mirror.
    const explicitTotal = Number(ability.total ?? derived.total ?? ability.value ?? derived.value ?? ability.score ?? derived.score);
    if (Number.isFinite(explicitTotal) && explicitTotal > 0) return explicitTotal;

    const base = Number(ability.base ?? derived.base ?? 10) || 10;
    const racial = Number(ability.racial ?? ability.species ?? derived.racial ?? derived.species ?? 0) || 0;
    const enhancement = Number(ability.enhancement ?? derived.enhancement ?? 0) || 0;
    const temp = Number(ability.temp ?? derived.temp ?? 0) || 0;
    return base + racial + enhancement + temp;
  }

  _normalizeLevelUpIncreases(raw = null, shell = null) {
    const increases = raw?.increases || raw?.abilityIncreases || raw || {};
    const out = {};
    const maxPerAbility = this._getAbilityIncreaseMaxPerAbility(shell);
    for (const key of this._getAbilityKeys(shell)) {
      out[key] = Math.max(0, Math.min(maxPerAbility, Number(increases?.[key] ?? 0) || 0));
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
    this._focusedAbility = ability;
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


  _formatModifier(score) {
    const mod = this._modifier(score);
    if (!Number.isFinite(Number(mod))) return '—';
    return mod > 0 ? `+${mod}` : `${mod}`;
  }

  _toneForNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number === 0) return 'zero';
    return number > 0 ? 'pos' : 'neg';
  }

  _abilityName(key) {
    const names = {
      str: 'Strength',
      dex: 'Dexterity',
      con: 'Constitution',
      int: 'Intelligence',
      wis: 'Wisdom',
      cha: 'Charisma',
    };
    return names[String(key || '').toLowerCase()] || String(key || '').toUpperCase();
  }

  _abilityDescription(key) {
    const descriptions = {
      str: 'Raw physical power. Strength is the usual basis for melee attack and damage, and it supports athletic skills such as Climb, Jump, and Swim.',
      dex: 'Reflexes, precision, and coordination. Dexterity supports ranged attacks, Reflex Defense, Initiative, Pilot, Stealth, and other agility-driven actions.',
      con: 'Stamina and bodily resilience. Constitution supports hit points, Fortitude Defense, Endurance, and survival under physical stress.',
      int: 'Reasoning, training breadth, and technical skill. Intelligence supports Knowledge skills and helps define how much expertise a character can bring to a build.',
      wis: 'Awareness, discipline, and insight. Wisdom supports Perception, Survival, Will Defense, and the default Force Training capacity rule.',
      cha: 'Presence, will made manifest, and social force. Charisma supports Deception, Persuasion, Gather Information, and Use the Force execution.',
    };
    return descriptions[String(key || '').toLowerCase()] || 'This ability contributes to derived statistics and skill expression.';
  }

  _abilityAffects(key) {
    const affects = {
      str: ['Melee attack rolls', 'Melee damage rolls', 'Climb / Jump / Swim checks', 'Carrying and physical contests'],
      dex: ['Reflex Defense', 'Ranged attack rolls', 'Initiative / Pilot / Stealth checks', 'Many vehicle and mobility actions'],
      con: ['Hit point gains by level', 'Fortitude Defense', 'Endurance checks', 'Poison, disease, and physical resilience'],
      int: ['Knowledge checks', 'Mechanics and Use Computer themes', 'Training breadth and technical identity', 'Tactical and investigative play'],
      wis: ['Will Defense', 'Perception and Survival checks', 'Force Training power count by default', 'Awareness and discipline scenes'],
      cha: ['Use the Force checks', 'Deception / Persuasion / Gather Information', 'Presence and intimidation scenes', 'Force-user execution if house rules point here'],
    };
    return affects[String(key || '').toLowerCase()] || [];
  }

  _methodCopy(method = this._method) {
    const copy = {
      'point-buy': { label: 'Point Buy', sub: 'Budgeted calibration', icon: 'fa-sliders' },
      array: { label: 'Array', sub: 'Assign fixed scores', icon: 'fa-layer-group' },
      standard: { label: 'Standard', sub: '4d6 drop lowest', icon: 'fa-dice-d6' },
      organic: { label: 'Organic', sub: '18 dice matrix', icon: 'fa-dice' },
      'species-fixed': { label: 'Species Fixed', sub: 'Canonical override', icon: 'fa-dna' },
      'levelup-increase': { label: 'Ability Increase', sub: 'Level event', icon: 'fa-arrow-up-right-dots' },
    };
    return copy[method] || { label: 'Attributes', sub: 'Calibration', icon: 'fa-sliders' };
  }

  _methodCards(shell) {
    const methods = ['point-buy', 'array', 'standard', 'organic'];
    return methods.map((id) => {
      const copy = this._methodCopy(id);
      return {
        id,
        label: copy.label,
        sub: copy.sub,
        icon: copy.icon,
        isActive: this._method === id,
        disabled: this._isSpeciesFixedMode() || this._isLevelUpAbilityIncreaseMode(shell) || this._committed,
      };
    });
  }

  _decorateAbilityRow(row, shell, scorePool = []) {
    const key = String(row?.id || '').toLowerCase();
    const finalNumber = Number(row?.finalDisplay);
    const baseNumber = Number(row?.baseDisplay);
    const assignedPoolItems = Array.isArray(row?.assignedPoolItems)
      ? row.assignedPoolItems
      : scorePool.filter(item => String(item?.assignedTo || '').toLowerCase() === key);
    const assignedText = assignedPoolItems.length
      ? assignedPoolItems.map(item => Number(item?.value)).filter(value => Number.isFinite(value)).join(', ')
      : (row?.assignmentHint || '');

    return {
      ...row,
      id: key,
      label: String(row?.label || key).toUpperCase(),
      fullName: row?.fullName || this._abilityName(key),
      colorClass: row?.colorClass || key,
      isExcluded: this._getExcludedSet(shell).has(key),
      modTone: row?.modTone || this._toneForNumber(String(row?.modifierFormatted || '').replace('+', '')),
      valueTone: row?.valueTone || this._toneForNumber(Number.isFinite(finalNumber) ? finalNumber - 10 : 0),
      baseDisplay: row?.baseDisplay ?? (Number.isFinite(baseNumber) ? String(baseNumber) : '—'),
      finalDisplay: row?.finalDisplay ?? (Number.isFinite(finalNumber) ? String(finalNumber) : '—'),
      speciesModClass: row?.speciesModClass || `prog-num--${this._toneForNumber(row?.speciesMod)}`,
      assignedPoolItems,
      assignedText,
    };
  }

  _decorateStepData(base, shell) {
    const scorePool = Array.isArray(base?.scorePool) ? base.scorePool : [];
    const abilities = (Array.isArray(base?.abilities) ? base.abilities : [])
      .map(row => this._decorateAbilityRow(row, shell, scorePool));
    const abilityOrder = new Map(abilities.map((row, index) => [row.id, index]));
    const bySeries = (ids) => ids
      .filter(id => abilityOrder.has(id))
      .sort((a, b) => abilityOrder.get(a) - abilityOrder.get(b))
      .map(id => abilities[abilityOrder.get(id)]);
    const poolTotal = scorePool.length;
    const poolAssigned = scorePool.filter(item => !!item?.assignedTo || item?.isUsed).length;
    const poolPercent = poolTotal > 0 ? Math.round((poolAssigned / poolTotal) * 100) : 0;
    const committed = !!base?.isCommitted;
    const method = base?.method || this._method;
    const methodCopy = this._methodCopy(method);
    const needed = Number(base?.pointBuyStatus?.needed ?? this._getLevelUpAbilityIncreaseCount(shell));
    const spent = Number(base?.pointBuyStatus?.spent ?? 0) || 0;
    const remaining = Number.isFinite(needed) && needed > 0 ? Math.max(0, needed - spent) : null;

    return {
      ...base,
      abilities,
      physicalAbilities: bySeries(['str', 'dex', 'con']),
      mentalAbilities: bySeries(['int', 'wis', 'cha']),
      methodCards: base?.methodCards || this._methodCards(shell),
      methodCopy,
      hasGeneratedPool: !!base?.showGeneratedPool || poolTotal > 0,
      poolTotal,
      poolAssigned,
      poolPercent,
      lockButtonTone: committed ? 'locked' : 'unlocked',
      lockButtonIcon: committed ? 'fa-lock' : 'fa-lock-open',
      stepSubtitle: base?.stepSubtitle || base?.currentMethodDescription || methodCopy.sub,
      statusText: committed ? 'Locked' : 'Unlocked',
      increaseNeeded: needed,
      increaseRemaining: remaining,
    };
  }

  _findAbilityVm(abilityKey, shell) {
    const key = String(abilityKey || this._focusedAbility || 'str').toLowerCase();
    const increasesMode = this._isLevelUpAbilityIncreaseMode(shell);
    const attrs = increasesMode
      ? this._normalizeLevelUpIncreases(this._attributes, shell)
      : (this._attributes || this._buildInitialPointBuy(shell));
    const speciesMods = increasesMode || this._isSpeciesFixedMode()
      ? { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
      : this._getSpeciesMods(shell);
    const base = increasesMode ? this._getActorAbilityBase(shell, key) : Number(attrs?.[key] ?? 0);
    const increase = increasesMode ? Number(attrs?.[key] || 0) || 0 : 0;
    const speciesMod = increasesMode ? increase : Number(speciesMods?.[key] ?? 0) || 0;
    const finalScore = Number.isFinite(base) ? base + speciesMod : null;
    const modifier = this._modifier(finalScore);
    const assignedPoolItems = this._getAssignedPoolItems(key).map(item => ({
      ...item,
      isSelected: item.id === this._selectedPoolId,
    }));
    const cost = !increasesMode && this._method === 'point-buy' && Number.isFinite(Number(base))
      ? (POINT_BUY_COST[Number(base)] ?? null)
      : null;

    return this._decorateAbilityRow({
      id: key,
      label: key.toUpperCase(),
      fullName: this._abilityName(key),
      isFocused: true,
      isUnassigned: !Number.isFinite(Number(finalScore)),
      baseDisplay: Number.isFinite(Number(base)) ? String(base) : '—',
      finalDisplay: Number.isFinite(Number(finalScore)) ? String(finalScore) : '—',
      speciesMod,
      speciesModClass: `prog-num--${this._toneForNumber(speciesMod)}`,
      modifierFormatted: Number.isFinite(Number(modifier)) ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : '—',
      modClass: modifier > 0 ? 'prog-num--pos' : modifier < 0 ? 'prog-num--neg' : 'prog-num--zero',
      assignedPoolItems,
      assignedText: assignedPoolItems.length ? assignedPoolItems.map(item => item.value).join(', ') : null,
      costLabel: cost === null ? null : `${cost} pts`,
    }, shell, []);
  }

  _buildFocusedAbilityDetail(abilityKey, shell) {
    const vm = this._findAbilityVm(abilityKey, shell);
    const key = vm.id;
    const baseScore = vm.baseDisplay;
    const finalScore = vm.finalDisplay;
    const increaseMode = this._isLevelUpAbilityIncreaseMode(shell);
    const derivedStats = [];
    const finalNumber = Number(finalScore);
    const modifier = this._modifier(finalNumber);
    const modFormatted = Number.isFinite(Number(modifier)) ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : '—';

    if (key === 'con' && Number.isFinite(Number(modifier))) {
      derivedStats.push({ label: 'HP / Level', value: modFormatted, source: 'Con modifier', tone: this._toneForNumber(modifier) });
      derivedStats.push({ label: 'Fortitude', value: modFormatted, source: 'Ability modifier', tone: this._toneForNumber(modifier) });
    } else if (key === 'dex' && Number.isFinite(Number(modifier))) {
      derivedStats.push({ label: 'Reflex', value: modFormatted, source: 'Ability modifier', tone: this._toneForNumber(modifier) });
      derivedStats.push({ label: 'Initiative', value: modFormatted, source: 'Ability modifier', tone: this._toneForNumber(modifier) });
    } else if (key === 'wis' && Number.isFinite(Number(modifier))) {
      derivedStats.push({ label: 'Will', value: modFormatted, source: 'Ability modifier', tone: this._toneForNumber(modifier) });
      derivedStats.push({ label: 'Force Training', value: Math.max(1, 1 + modifier), source: 'Default power count', tone: this._toneForNumber(modifier) });
    } else if (key === 'cha' && Number.isFinite(Number(modifier))) {
      derivedStats.push({ label: 'Use the Force', value: modFormatted, source: 'Ability modifier', tone: this._toneForNumber(modifier) });
      derivedStats.push({ label: 'Presence', value: modFormatted, source: 'Social checks', tone: this._toneForNumber(modifier) });
    } else if (Number.isFinite(Number(modifier))) {
      derivedStats.push({ label: 'Check Modifier', value: modFormatted, source: `${this._abilityName(key)} checks`, tone: this._toneForNumber(modifier) });
    }

    return {
      id: key,
      label: this._abilityName(key),
      shortLabel: key.toUpperCase(),
      methodLabel: increaseMode ? 'Level Ability Increase' : this._methodCopy(this._method).label,
      canonicalDescription: this._abilityDescription(key),
      baseScore,
      speciesMod: vm.speciesMod ?? 0,
      secondColumnLabel: increaseMode ? 'Increase' : 'Species Modifier',
      speciesModClass: vm.speciesModClass,
      assignedText: vm.assignedText,
      costLabel: vm.costLabel,
      finalScore,
      modifierFormatted: vm.modifierFormatted,
      modClass: vm.modClass,
      hasDerivedStats: derivedStats.length > 0,
      derivedStats,
      affects: this._abilityAffects(key),
      mentorProse: increaseMode
        ? `You are resolving a level-based ability event. ${this._abilityIncreaseRuleLabel()} Lock the increase so the level-up ledger can record it cleanly.`
        : `Use this rail to compare the current score, species modifier, final value, and the build consequences before locking attributes.`,
    };
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
    this._lastShell = null;
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

    this._focusedAbility = abilityKey;
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

  _ensureReady(shell) {
    this._lastShell = shell || this._lastShell || null;
    const keys = this._getAbilityKeys(shell);
    if (!keys.includes(this._focusedAbility)) this._focusedAbility = keys[0] || 'str';

    if (this._isLevelUpAbilityIncreaseMode(shell)) {
      this._method = 'levelup-increase';
      if (!this._attributes) this._attributes = this._normalizeLevelUpIncreases(null, shell);
      this._scorePool = [];
      this._selectedPoolId = null;
      return;
    }

    if (!this._attributes) {
      this._attributes = this._buildInitialPointBuy(shell);
      this._scorePool = [];
      this._selectedPoolId = null;
      this._committed = false;
    }
  }

  async onStepEnter(shell) {
    this._lastShell = shell || this._lastShell || null;
    if (this._isLevelUpAbilityIncreaseMode(shell)) {
      const existingLevelUp = shell?.progressionSession?.draftSelections?.attributes || null;
      this._attributes = this._normalizeLevelUpIncreases(existingLevelUp, shell);
      this._scorePool = [];
      this._selectedPoolId = null;
      const needed = this._getLevelUpAbilityIncreaseCount(shell);
      this._committed = needed > 0 && this._getLevelUpIncreaseSpent(shell) === needed && existingLevelUp?.mode === 'levelup-ability-increase';
      shell?.setFocusedItem?.(this._buildFocusedAbilityDetail(this._focusedAbility, shell));
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
      shell?.setFocusedItem?.(this._buildFocusedAbilityDetail(this._focusedAbility, shell));
      return;
    }

    const override = this._getSpeciesAttributeOverride(shell);
    if (override?.mode === 'fixed-array-plus-choice' && override.fixedScores) {
      this._method = 'species-fixed';
      this._attributes = { ...override.fixedScores, ...(override.finalScores || {}) };
      this._scorePool = [];
      this._selectedPoolId = null;
      this._committed = false;
      shell?.setFocusedItem?.(this._buildFocusedAbilityDetail(this._focusedAbility, shell));
      return;
    }

    if (!this._attributes) {
      this._attributes = this._buildInitialPointBuy(shell);
      this._scorePool = [];
      this._selectedPoolId = null;
      this._committed = false;
    }
    shell?.setFocusedItem?.(this._buildFocusedAbilityDetail(this._focusedAbility, shell));
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
        ui?.notifications?.warn?.(`${this._abilityIncreaseRuleLabel()}`);
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
        this._focusedAbility = abilityKey;
        if (this._method !== 'point-buy' && this._selectedPoolId) {
          this._assignSelectedPoolToAbility(abilityKey, shell);
        }
        shell?.setFocusedItem?.(this._buildFocusedAbilityDetail(abilityKey, shell));
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
      const maxPerAbility = this._getAbilityIncreaseMaxPerAbility(shell);
      const current = this._normalizeLevelUpIncreases(this._attributes, shell);
      const oldValue = Number(current[ability] || 0);
      const nextValue = Math.max(0, Math.min(maxPerAbility, oldValue + Number(delta || 0)));
      if (nextValue === oldValue) return;
      const spentWithout = Object.entries(current)
        .filter(([k]) => k !== ability)
        .reduce((sum, [, value]) => sum + (Number(value) || 0), 0);
      if (spentWithout + nextValue > needed) return;
      this._attributes = { ...current, [ability]: nextValue };
      this._focusedAbility = ability;
      shell?.setFocusedItem?.(this._buildFocusedAbilityDetail(ability, shell));
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
    this._focusedAbility = key;
    shell?.setFocusedItem?.(this._buildFocusedAbilityDetail(key, shell));
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

  async onItemFocused(itemId, shell) {
    const ability = String(itemId || '').toLowerCase();
    if (!this._getAbilityKeys(shell).includes(ability)) return;
    this._focusedAbility = ability;
    shell?.setFocusedItem?.(this._buildFocusedAbilityDetail(ability, shell));
  }

  renderDetailsPanel(focusedItem, shell = null) {
    shell = shell || this._lastShell || null;
    this._ensureReady(shell);
    const rawAbility = focusedItem?.id || this._focusedAbility || this._getAbilityKeys(shell)[0] || 'str';
    const ability = String(rawAbility || '').toLowerCase();
    if (!this._getAbilityKeys(shell).includes(ability)) return this.renderDetailsPanelEmptyState();
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/details-panel/attribute-details.hbs',
      data: this._buildFocusedAbilityDetail(ability, shell),
    };
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
        abilityIncreaseLevel: this.descriptor?.reconciliationContext?.characterLevel || buildLevelUpEntitlementManifest(shell?.actor || null, shell?.progressionSession || null)?.characterLevel || null,
        characterLevel: this.descriptor?.reconciliationContext?.characterLevel || undefined,
        slotType: this.descriptor?.reconciliationContext?.slotType || undefined,
        slotId: this.descriptor?.reconciliationContext?.slotId || undefined,
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
        return { isValid: false, errors: [`${this._abilityIncreaseRuleLabel()}`], warnings: [] };
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
      if (spent !== needed) return [`${this._abilityIncreaseRuleLabel()}`];
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

  async getStepData(context) {
    const shell = context?.shell || this._lastShell || null;
    this._ensureReady(shell);
    if (this._isLevelUpAbilityIncreaseMode(shell)) {
      const needed = this._getLevelUpAbilityIncreaseCount(shell);
      const maxPerAbility = this._getAbilityIncreaseMaxPerAbility(shell);
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
          canIncrease: increase < maxPerAbility && spent < needed,
          canDecrease: increase > 0,
          assignedValues: [],
          assignmentCapacity: 0,
          assignmentHint: increase > 0 ? `+${increase} selected` : null,
        };
      });
      return this._decorateStepData({
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
        pointBuyStatus: { spent, needed, percent: needed ? Math.round((spent / needed) * 100) : 100, isComplete: spent === needed, status: `${Math.max(0, needed - spent)} remaining` },
        remainingPoolAssignments: 0,
        currentMethodDescription: this._abilityIncreaseRuleLabel(),
        poolInstruction: spent === needed ? 'Ability increases ready to lock.' : `${Math.max(0, needed - spent)} increase${needed - spent === 1 ? '' : 's'} remaining. ${this._allowsStackedAbilityIncrease() ? 'Stacking is allowed by house rule.' : 'RAW requires different abilities.'}`,
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
        assignmentCapacity,
      };
    });

    const remainingPoolAssignments = this._method !== 'point-buy'
      ? this._getAssignableAbilityKeys(shell).filter(key => !Number.isFinite(Number(this._attributes?.[key]))).length
      : 0;

    return this._decorateStepData({
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
              : 'Reroll generates 18 organic dice. Drag three dice into each attribute row, or ask your mentor for a suggested allocation from the live dice pool.',
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

  renderWorkSurface(stepData) {
    let data = stepData && typeof stepData === 'object' ? stepData : {};
    const needsFallback = !Array.isArray(data.physicalAbilities) || !Array.isArray(data.mentalAbilities)
      || (data.physicalAbilities.length === 0 && data.mentalAbilities.length === 0);
    if (needsFallback) {
      try {
        const shell = this._lastShell || null;
        this._ensureReady(shell);
        const keys = this._getAbilityKeys(shell);
        const increasesMode = this._isLevelUpAbilityIncreaseMode(shell);
        const attrs = increasesMode ? this._normalizeLevelUpIncreases(this._attributes, shell) : (this._attributes || this._buildInitialPointBuy(shell));
        const abilities = keys.map((key) => this._findAbilityVm(key, shell));
        const needed = increasesMode ? this._getLevelUpAbilityIncreaseCount(shell) : 0;
        const spent = increasesMode ? Object.values(attrs).reduce((sum, value) => sum + (Number(value) || 0), 0) : 0;
        data = this._decorateStepData({
          ...data,
          isCommitted: this._committed,
          method: increasesMode ? 'levelup-increase' : this._method,
          abilities,
          scorePool: [],
          showMethodSelector: !increasesMode && !this._isSpeciesFixedMode(),
          showPointBuy: !increasesMode && this._method === 'point-buy' && !this._isSpeciesFixedMode(),
          showGeneratedPool: false,
          showUtilityActions: !increasesMode,
          attributeIncreaseMode: increasesMode,
          secondColumnLabel: increasesMode ? 'Increase' : 'Species Modifier',
          pointBuyPool: increasesMode ? 0 : this.getPointBuyPool(shell),
          pointBuyStatus: increasesMode
            ? { spent, needed, percent: needed ? Math.round((spent / needed) * 100) : 100, isComplete: spent === needed, status: `${Math.max(0, needed - spent)} remaining` }
            : data.pointBuyStatus,
          currentMethodDescription: increasesMode ? this._abilityIncreaseRuleLabel() : (data.currentMethodDescription || this._methodCopy(this._method).sub),
          poolInstruction: increasesMode ? `${Math.max(0, needed - spent)} increase${needed - spent === 1 ? '' : 's'} remaining.` : (data.poolInstruction || ''),
          lockButtonLabel: increasesMode ? (this._committed ? 'Unlock Ability Increases' : 'Lock Ability Increases') : (this._committed ? 'Unlock Attributes' : 'Lock Attributes'),
        }, shell);
      } catch (err) {
        console.warn('[AttributeStep] Failed to rebuild fallback attribute work surface data', err);
      }
    }
    return {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/steps/attribute-work-surface.hbs',
      data
    };
  }
}

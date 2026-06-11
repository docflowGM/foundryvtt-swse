/**
 * ForceExecutor — Complete execution flow for Force powers
 *
 * Handles:
 * - Force power activation (use/discard logic)
 * - Force power recovery
 * - Dark Side Point tracking
 * - Natural 20 mechanics
 * - Force Point expenditure
 * - Animation feedback
 * - Chat message generation
 *
 * Routes all mutations through ActorEngine and SWSEChat.
 */

import { ForceEngine } from "/systems/foundryvtt-swse/scripts/engine/force/force-engine.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { RollCore } from "/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js";
import { AnimationEngine } from "/systems/foundryvtt-swse/scripts/engine/animation-engine.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { ForcePowerEffectsEngine } from "/systems/foundryvtt-swse/scripts/engine/force/force-power-effects-engine.js";
import { isForcePowerItem } from "/systems/foundryvtt-swse/scripts/utils/item-classification.js";

export class ForceExecutor {
  /**
   * Activate/recover a force power
   * @param {Actor} actor - Actor activating power
   * @param {string} powerId - Force power item ID
   * @param {boolean} recover - Is this a recovery action?
   * @returns {Object} Activation result
   */
  static async activateForce(actor, powerId, recover = false) {
    try {
      const power = actor.items.get(powerId);
      if (!power || power.type !== "force-power") {
        throw new Error("Force power not found");
      }

      const isDiscarded = power.system?.discarded || false;

      // Validate state
      if (recover && !isDiscarded) {
        throw new Error("Force power is already active");
      }

      if (!recover && isDiscarded) {
        // Already discarded, can't use
        throw new Error("Force power is discarded");
      }

      // Update owned force-power state through the embedded-document path.
      // The older nested actor update shape ({ items: { [id]: ... } }) does
      // not update owned Items reliably in Foundry v13.
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{
        _id: powerId,
        'system.discarded': recover ? false : true,
        [recover ? 'system.lastRecovered' : 'system.lastUsed']: Date.now()
      }], { source: recover ? 'force-power-recover' : 'force-power-use', render: false });

      // Check for dark side usage (optional mechanic)
      const hasDarkSide = power.system?.darkSideOption || false;
      if (hasDarkSide && !recover) {
        // Player used dark side - increase DSP
        await ForceEngine.gainDarkSidePoint(actor, `Used ${power.name} with dark side`);
      }

      // Generate chat message
      await this._generateForceActivationMessage(actor, power, recover);

      // Animate
      const element = document.querySelector(`[data-item-id="${powerId}"]`);
      if (element) {
        if (recover) {
          AnimationEngine.animateForceActivation(element);
        } else {
          AnimationEngine.animateForceDiscard(element);
        }
      }

      return {
        success: true,
        power: power.name,
        recovered: recover,
        darkSideUsed: hasDarkSide && !recover
      };
    } catch (err) {
      console.error("Force activation failed:", err);
      ui?.notifications?.error?.(`Force activation failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Execute Force power roll (check against DC)
   * @param {Actor} actor - Actor using power
   * @param {string} powerId - Force power ID
   * @param {Object} options - Roll options
   * @param {number} options.baseDC - Base DC for the power
   * @param {number} options.bonus - Additional roll bonus
   * @param {boolean} options.useForce - Spend Force Point?
   * @returns {Object} Roll result
   */
  static async executeForcePower(actor, powerId, options = {}) {
    try {
      const power = actor.items.get(powerId);
      if (!power) throw new Error("Force power not found");
      if (power.type !== "force-power") throw new Error(`${power.name} is not a Force power`);

      // Check if power is already discarded. Talent-granted immediate repeats may reuse
      // the just-spent power without requiring it to be ready again.
      const ignoreDiscarded = options.ignoreDiscarded === true || options.freeRepeat === true;
      if (power.system?.discarded && !ignoreDiscarded) {
        throw new Error(`${power.name} is already discarded`);
      }

      const system = power.system ?? {};
      const defaultDC = this._getPowerBaseDC(power);
      const baseDC = Number(options.baseDC ?? defaultDC) || defaultDC;
      const defaultBonus = this._getUseTheForceTotal(actor);
      const baseBonus = Number.isFinite(Number(options.baseBonus))
        ? Number(options.baseBonus)
        : Number.isFinite(Number(options.bonus))
          ? Number(options.bonus)
          : defaultBonus;
      const customModifier = Number(options.customModifier ?? options.situationalModifier ?? 0) || 0;
      const rollBonus = baseBonus + customModifier;
      const useForce = options.useForce === true;

      // Validate Force Point expenditure before rolling.
      if (useForce) {
        if (this._getAvailableForcePoints(actor) <= 0) {
          throw new Error("No Force Points available");
        }
      }
      if (options.moveMassiveObject === true) {
        const required = useForce ? 2 : 1;
        if (this._getAvailableForcePoints(actor) < required) throw new Error(`Move Massive Object requires spending ${required} Force Point${required === 1 ? '' : 's'}`);
      }

      const dcChart = this._getPowerDcRows(power);
      const descriptors = this._getPowerDescriptors(power);
      const primaryDescriptor = this._resolvePrimaryDescriptor(descriptors);
      const talentContext = this._buildForceTalentContext(actor, power, descriptors, options);

      // Roll the force power check through the shared roll execution layer.
      const rollResult = await RollCore.execute({
        actor,
        domain: 'force-power.activation',
        baseBonus: rollBonus,
        rollOptions: {
          baseDice: '1d20',
          useForce,
          forcePointCount: useForce ? 1 : 0
        },
        rollData: actor.getRollData?.() ?? {},
        context: {
          powerId,
          powerName: power.name,
          item: power,
          itemId: powerId,
          sourceItem: power,
          sourceItemId: powerId,
          itemName: power.name,
          category: 'force',
          rollCategory: 'force',
          type: 'force-power',
          forcePower: true,
          baseDC,
          baseBonus,
          customModifier,
          forceDescriptor: primaryDescriptor,
          forceDescriptors: descriptors,
          descriptors,
          tags: descriptors,
          discipline: system.discipline ?? null,
          dcChart,
          forceTalentNotes: talentContext.notes,
          freeActionRepeat: options.freeRepeat === true,
          forceActionLabel: options.freeRepeat === true ? 'Free Action repeat' : null
        }
      });
      if (!rollResult.success || !rollResult.roll) {
        throw new Error(rollResult.error || 'Force power roll failed');
      }

      const roll = rollResult.roll;
      const total = Number(rollResult.finalTotal ?? roll.total ?? 0) || 0;
      const d20 = roll.dice?.find?.(die => Number(die.faces) === 20);
      const d20Result = d20?.results?.find?.(r => r.active !== false) ?? d20?.results?.[0] ?? null;
      const isCritical = Number(d20Result?.result) === 20;
      const isFumble = Number(d20Result?.result) === 1;
      const success = total >= baseDC;
      const forcePointBonus = Number(rollResult.forcePointBonus ?? rollResult.breakdown?.forcePointBonus ?? 0) || 0;

      // Spend Force Points before post-roll temporary FP triggers are granted, so Force Flow
      // cannot immediately pay for the same roll that created it.
      if (useForce && forcePointBonus > 0) {
        await ActorEngine.spendForcePoints(actor, 1);
      }
      if (options.moveMassiveObject === true) {
        await ActorEngine.spendForcePoints(actor, 1);
      }

      if (isFumble) {
        await this.handleForceFlowNaturalOne(actor, { source: power.name, rollType: 'Use the Force' });
      }
      const resolvedTier = this._resolvePowerTier(power, total);
      const resolvedEffect = resolvedTier?.effect || (success ? this._text(system.effect || system.summary || '') : 'Power check failed. No effect resolved.');

      // Handle natural 20 effects
      if (isCritical) {
        await ForceEngine.recordNatural20(actor, power.name);
        await this.grantTelepathicInfluenceForcePoint(actor);
      }

      const telekineticRepeatAction = this._buildTelekineticPowerRepeatAction(actor, power, {
        isCritical,
        isTelekinetic: talentContext.isTelekinetic,
        hasTalent: talentContext.hasTelekineticPower,
        freeRepeat: options.freeRepeat === true
      });

      // Handle dark side consequences (optional)
      if (!success && power.system?.darkSideBacklash) {
        await ForceEngine.gainDarkSidePoint(actor, `Failed use of ${power.name}`);
      }

      // Mark power as used/discarded through the embedded-document path. Do not call
      // activateForce() here because that method posts a simple use/recover message;
      // force power execution should create exactly one rich roll card.
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{
        _id: powerId,
        'system.discarded': true,
        'system.lastUsed': Date.now()
      }], { source: 'force-power-use', render: false });

      // Apply force power effects if successful
      let appliedEffects = [];
      if (success) {
        appliedEffects = await ForcePowerEffectsEngine.applyPowerEffect(actor, power, total, { target: options.target ?? options.targetActor ?? null });
      }

      // Generate rich concept chat message
      await this._generateForcePowerRollMessage(
        actor,
        power,
        roll,
        total,
        baseDC,
        success,
        isCritical,
        {
          baseBonus,
          customModifier,
          forcePointBonus,
          forceDescriptor: primaryDescriptor,
          forceDescriptors: descriptors,
          dcChart,
          resolvedTier,
          resolvedEffect,
          appliedEffects,
          forceTalentNotes: talentContext.notes,
          telekineticPowerRepeatAction,
          freeActionRepeat: options.freeRepeat === true,
          forceActionLabel: options.freeRepeat === true ? 'Free Action repeat' : null
        }
      );

      return {
        success,
        roll: total,
        dc: baseDC,
        isCritical,
        isFumble,
        powerName: power.name,
        forcePowerSpent: forcePointBonus > 0,
        discarded: true,
        resolvedTier,
        resolvedEffect,
        appliedEffects,
        telekineticPowerRepeatAvailable: Boolean(telekineticRepeatAction)
      };
    } catch (err) {
      console.error("Force power execution failed:", err);
      ui?.notifications?.error?.(`Force power failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }


  /**
   * Return true when a Force power has the [Telekinetic] descriptor.
   * Supports both current data (`system.descriptor: ["Telekinetic"]`) and tag/discipline fallbacks.
   * @param {Item|Object} power
   * @returns {boolean}
   */
  static isTelekineticForcePower(power) {
    return this._isTelekineticPower(power);
  }

  /** Return true when a Force power has the [Mind-Affecting] descriptor. */
  static isMindAffectingForcePower(power) {
    const descriptors = this._getPowerDescriptors(power);
    const system = power?.system ?? {};
    const haystack = [
      power?.name,
      system.discipline,
      system.category,
      system.subcategory,
      system.effect,
      system.summary,
      system.description,
      ...(Array.isArray(descriptors) ? descriptors : []),
      ...(Array.isArray(system.tags) ? system.tags : [])
    ].join(' ').toLowerCase();
    return /mind[-\s]?affecting|mind|telepathic|illusion|influence|mind trick|fear/.test(haystack);
  }

  /** Return true when a Force power is a Lightsaber Form Power. */
  static isLightsaberFormPower(power) {
    return this._isLightsaberFormPower(power);
  }

  static _countSpentDescriptorPowers(actor, predicate) {
    return Array.from(actor?.items ?? []).filter(item => isForcePowerItem(item) && item.system?.discarded && predicate.call(this, item)).length;
  }

  /** Count owned copies of a talent, including duplicate embedded Items and "Name (2)" style stacks. */
  static _countOwnedTalent(actor, talentName) {
    if (!actor?.items) return 0;
    const wanted = this._normalizeName(talentName);
    let total = 0;
    for (const item of actor.items) {
      if (item?.type !== 'talent') continue;
      const normalized = this._normalizeName(item.name).replace(/\s*\(\d+\)\s*$/, '');
      if (normalized !== wanted) continue;
      const parenthetical = String(item.name ?? '').match(/\((\d+)\)\s*$/)?.[1];
      const systemQty = Number(item?.system?.quantity ?? item?.system?.rank ?? item?.system?.ranks ?? item?.system?.uses?.max ?? 0) || 0;
      total += Math.max(1, Number(parenthetical ?? systemQty ?? 1) || 1);
    }
    return total;
  }

  /**
   * Count owned copies of Telekinetic Savant. The talent can be selected multiple times.
   * @param {Actor} actor
   * @returns {number}
   */
  static getTelekineticSavantMaxUses(actor) {
    return this._countOwnedTalent(actor, 'Telekinetic Savant');
  }

  static _encounterId() {
    return game?.combat?.started && game.combat?.id ? game.combat.id : 'out-of-combat';
  }

  /** Current encounter-use state for Telekinetic Savant. */
  static getTelekineticSavantState(actor) {
    const max = this.getTelekineticSavantMaxUses(actor);
    const encounterId = this._encounterId();
    const flag = actor?.getFlag?.('foundryvtt-swse', 'telekineticSavantUses') ?? {};
    const used = flag?.encounterId === encounterId ? Math.max(0, Number(flag.used ?? 0) || 0) : 0;
    return { max, used, remaining: Math.max(0, max - used), encounterId };
  }

  static _getEncounterLimitedTalentState(actor, talentName, flagKey) {
    const max = this._countOwnedTalent(actor, talentName);
    const encounterId = this._encounterId();
    const flag = actor?.getFlag?.('foundryvtt-swse', flagKey) ?? {};
    const used = flag?.encounterId === encounterId ? Math.max(0, Number(flag.used ?? 0) || 0) : 0;
    return { max, used, remaining: Math.max(0, max - used), encounterId };
  }

  static getInfluenceSavantState(actor) {
    return this._getEncounterLimitedTalentState(actor, 'Influence Savant', 'influenceSavantUses');
  }

  static getLightsaberFormSavantState(actor) {
    return this._getEncounterLimitedTalentState(actor, 'Lightsaber Form Savant', 'lightsaberFormSavantUses');
  }

  static async _recoverDescriptorPowerViaTalent(actor, powerId, { talentName, flagKey, predicate, descriptorLabel, sourceSlug, icon = '✦' } = {}) {
    try {
      if (!actor) throw new Error('Actor not found');
      const state = this._getEncounterLimitedTalentState(actor, talentName, flagKey);
      if (state.max <= 0) throw new Error(`${talentName} talent not found`);
      if (state.remaining <= 0) throw new Error(`${talentName} has no uses remaining this encounter`);

      const power = actor.items?.get?.(powerId);
      if (!power || !isForcePowerItem(power)) throw new Error('Force power not found');
      if (!power.system?.discarded) throw new Error(`${power.name} is not spent`);
      if (!predicate.call(this, power)) throw new Error(`${power.name} does not have the ${descriptorLabel} descriptor`);

      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{
        _id: power.id,
        'system.discarded': false,
        'system.spent': false,
        'system.lastRecovered': Date.now(),
        'flags.foundryvtt-swse.lastRecoverySource': sourceSlug
      }], { source: `${sourceSlug}-recover`, render: false });

      await actor.setFlag?.('foundryvtt-swse', flagKey, {
        encounterId: state.encounterId,
        used: state.used + 1,
        max: state.max,
        lastPowerId: power.id,
        lastPowerName: power.name,
        lastUsedAt: Date.now()
      });

      await ForcePowerEffectsEngine.removePowerEffects(actor, power);

      await SWSEChat.postHTML({
        actor,
        content: `<div class="swse-force-recovery swse-force-recovery--talent">
          <h3>${actor.name} uses ${talentName}</h3>
          <p><strong>${power.name}</strong> returns to the Force Power Suite without spending a Force Point.</p>
          <p><em>Swift Action · ${descriptorLabel} · ${Math.max(0, state.remaining - 1)}/${state.max} uses remaining this encounter</em></p>
        </div>`
      });

      return { success: true, recovered: 1, powers: [power.name], powerName: power.name, usesRemaining: Math.max(0, state.remaining - 1), usesMax: state.max };
    } catch (err) {
      console.error(`${talentName} recovery failed:`, err);
      return { success: false, error: err.message };
    }
  }

  static async recoverInfluenceSavantPower(actor, powerId) {
    return this._recoverDescriptorPowerViaTalent(actor, powerId, {
      talentName: 'Influence Savant',
      flagKey: 'influenceSavantUses',
      predicate: this.isMindAffectingForcePower,
      descriptorLabel: '[Mind-Affecting]',
      sourceSlug: 'influence-savant',
      icon: '◉'
    });
  }

  /** Recover one spent Lightsaber Form power via Lightsaber Form Savant without spending a Force Point. */
  static async recoverLightsaberFormSavantPower(actor, powerId) {
    return this._recoverDescriptorPowerViaTalent(actor, powerId, {
      talentName: 'Lightsaber Form Savant',
      flagKey: 'lightsaberFormSavantUses',
      predicate: this.isLightsaberFormPower,
      descriptorLabel: '[Lightsaber Form]',
      sourceSlug: 'lightsaber-form-savant',
      icon: '◆'
    });
  }

  /** Recover one spent Telekinetic power via Telekinetic Savant without spending a Force Point. */
  static async recoverTelekineticSavantPower(actor, powerId) {
    return this._recoverDescriptorPowerViaTalent(actor, powerId, {
      talentName: 'Telekinetic Savant',
      flagKey: 'telekineticSavantUses',
      predicate: this.isTelekineticForcePower,
      descriptorLabel: '[Telekinetic]',
      sourceSlug: 'telekinetic-savant',
      icon: '✦'
    });
  }

  static _getTalentFlag(actor, key) {
    return actor?.getFlag?.('foundryvtt-swse', key) ?? actor?.flags?.['foundryvtt-swse']?.[key] ?? {};
  }

  static _getBonusForcePointPool(actor) {
    const pool = actor?.getFlag?.('swse', 'bonusForcePoints') ?? actor?.flags?.swse?.bonusForcePoints ?? {};
    if (Array.isArray(pool.entries) && pool.entries.length) {
      const value = pool.entries.reduce((sum, entry) => sum + Math.max(0, Number(entry?.value ?? 0) || 0), 0);
      return { ...pool, value };
    }
    return { ...pool, value: Math.max(0, Number(pool.value ?? 0) || 0) };
  }

  static _getAvailableForcePoints(actor) {
    return SchemaAdapters.getForcePoints(actor) + Math.max(0, Number(this._getBonusForcePointPool(actor).value ?? 0) || 0);
  }

  static _normalizeBonusForcePointEntries(pool = {}) {
    const entries = Array.isArray(pool.entries) ? pool.entries.map((entry, index) => ({
      id: String(entry?.id ?? `bonus-${index}`),
      source: String(entry?.source ?? 'Bonus Force Point'),
      value: Math.max(0, Number(entry?.value ?? 0) || 0),
      max: Math.max(0, Number(entry?.max ?? entry?.value ?? 0) || 0),
      restrictions: entry?.restrictions ?? entry?.restriction ?? '',
      expires: entry?.expires ?? '',
      encounterId: entry?.encounterId ?? null,
      createdAt: entry?.createdAt ?? null
    })).filter(entry => entry.value > 0) : [];
    const legacyValue = Math.max(0, Number(pool.value ?? 0) || 0);
    const entryTotal = entries.reduce((sum, entry) => sum + entry.value, 0);
    if (!entries.length && legacyValue > 0) {
      entries.push({ id: 'legacy-bonus-force-points', source: Array.isArray(pool.sources) && pool.sources.length ? pool.sources.join(', ') : 'Bonus Force Point', value: legacyValue, max: Math.max(legacyValue, Number(pool.max ?? legacyValue) || legacyValue), restrictions: pool.note ?? '', expires: '', encounterId: null, createdAt: null });
    } else if (legacyValue > entryTotal) {
      entries.push({ id: 'legacy-bonus-force-points', source: 'Bonus Force Point', value: legacyValue - entryTotal, max: legacyValue - entryTotal, restrictions: pool.note ?? '', expires: '', encounterId: null, createdAt: null });
    }
    return entries;
  }

  static _buildBonusForcePointPool(entries = [], existing = {}) {
    const clean = entries.filter(entry => Math.max(0, Number(entry.value) || 0) > 0);
    const value = clean.reduce((sum, entry) => sum + Math.max(0, Number(entry.value) || 0), 0);
    const max = clean.reduce((sum, entry) => sum + Math.max(0, Number(entry.max ?? entry.value) || 0), 0);
    return {
      ...existing,
      value,
      max: Math.max(value, max),
      sources: [...new Set(clean.map(entry => entry.source).filter(Boolean))],
      entries: clean,
      note: existing.note || 'Bonus Force Points are spent before normal Force Points and may have source-specific restrictions.'
    };
  }

  static async _spendForcePointForTalent(actor, talentName) {
    const available = this._getAvailableForcePoints(actor);
    if (available <= 0) throw new Error(`${talentName} requires spending 1 Force Point, but none are available`);
    const result = await ActorEngine.spendForcePoints(actor, 1);
    return result;
  }

  static getForceFlowState(actor) {
    const encounterId = this._encounterId();
    const flag = this._getTalentFlag(actor, 'forceFlowTemporaryForcePoints');
    const total = flag?.encounterId === encounterId ? Math.max(0, Number(flag.total ?? 0) || 0) : 0;
    return { encounterId, total };
  }

  static async handleForceFlowNaturalOne(actor, { source = '', rollType = 'roll' } = {}) {
    try {
      if (!actor || !this._actorHasTalent(actor, 'Force Flow')) return { success: false, reason: 'missing-talent' };
      const state = this.getForceFlowState(actor);
      const pool = this._getBonusForcePointPool(actor);
      const entries = this._normalizeBonusForcePointEntries(pool);
      const id = `force-flow-${state.encounterId}-${Date.now()}`;
      entries.push({
        id,
        source: 'Force Flow',
        value: 1,
        max: 1,
        restrictions: 'Temporary Force Point from Force Flow; lost at the end of the encounter if unused.',
        expires: 'encounter',
        encounterId: state.encounterId,
        createdAt: Date.now()
      });
      await ActorEngine.updateActor(actor, {
        'flags.swse.bonusForcePoints': this._buildBonusForcePointPool(entries, pool)
      }, { source: 'force-flow-temporary-force-point' });
      await actor.setFlag?.('foundryvtt-swse', 'forceFlowTemporaryForcePoints', {
        encounterId: state.encounterId,
        total: state.total + 1,
        lastEntryId: id,
        lastSource: source,
        lastRollType: rollType,
        lastGainedAt: Date.now()
      });
      await SWSEChat.postHTML({
        actor,
        content: `<div class="swse-force-talent-card swse-force-talent-card--force-flow">
          <h3>${actor.name} gains Force Flow</h3>
          <p><strong>Natural 1:</strong> ${source ? `${source} ` : ''}${rollType} grants 1 temporary bonus Force Point.</p>
          <p><em>This bonus Force Point is spent before normal Force Points and is lost at the end of the encounter if not spent.</em></p>
        </div>`
      });
      return { success: true, temporaryForcePoints: state.total + 1 };
    } catch (err) {
      console.error('Force Flow failed:', err);
      return { success: false, error: err.message };
    }
  }

  static async resetForceFlowTemporaryForcePoints(actor, { encounterId = null } = {}) {
    const state = this.getForceFlowState(actor);
    const pool = this._getBonusForcePointPool(actor);
    const entries = this._normalizeBonusForcePointEntries(pool);
    const remainingEntries = entries.filter(entry => !(entry.source === 'Force Flow' && (!encounterId || entry.encounterId === encounterId)));
    const removed = entries.reduce((sum, entry) => {
      if (entry.source === 'Force Flow' && (!encounterId || entry.encounterId === encounterId)) return sum + (Number(entry.value) || 0);
      return sum;
    }, 0);
    if (removed > 0) {
      await ActorEngine.updateActor(actor, {
        'flags.swse.bonusForcePoints': this._buildBonusForcePointPool(remainingEntries, pool)
      }, { source: 'force-flow-end-encounter-reset' });
    }
    if (!encounterId || state.encounterId === encounterId) await actor.unsetFlag?.('foundryvtt-swse', 'forceFlowTemporaryForcePoints');
    return { success: true, removed };
  }

  static getForceTalentActionState(actor) {
    return {
      aversion: { available: this._actorHasTalent(actor, 'Aversion') },
      illusion: {
        available: this._actorHasTalent(actor, 'Illusion'),
        illusionBond: this._actorHasTalent(actor, 'Illusion Bond'),
        masquerade: this._actorHasTalent(actor, 'Masquerade')
      },
      link: { available: this._actorHasTalent(actor, 'Link') },
      suppressForce: { available: this._actorHasTalent(actor, 'Suppress Force') },
      telepathicLink: { available: this._actorHasTalent(actor, 'Telepathic Link') },
      telepathicInfluence: { available: this._actorHasTalent(actor, 'Telepathic Influence') },
      forceFlow: this.getForceFlowState(actor)
    };
  }

  static async activateAversion(actor) {
    try {
      if (!actor) throw new Error('Actor not found');
      if (!this._actorHasTalent(actor, 'Aversion')) throw new Error('Aversion talent not found');
      const fpSpend = await this._spendForcePointForTalent(actor, 'Aversion');
      const remainingFP = fpSpend?.remaining ?? SchemaAdapters.getForcePoints(actor);
      const effectData = {
        name: 'Aversion',
        icon: 'icons/magic/control/fear-fright-white.webp',
        origin: actor.uuid,
        disabled: false,
        duration: { rounds: 999, startRound: game?.combat?.round ?? null, startTurn: game?.combat?.turn ?? null },
        changes: [],
        flags: {
          swse: {
            source: 'talent',
            talentName: 'Aversion',
            encounterEffect: true,
            difficultTerrainAura: { radiusSquares: 2, affects: 'enemies', mindAffecting: true }
          }
        },
        description: 'Until the end of the encounter, all squares within 2 squares of you are difficult terrain for your enemies. Mind-Affecting effect.'
      };
      await ActorEngine.createEmbeddedDocuments(actor, 'ActiveEffect', [effectData], { source: 'aversion-talent' });
      await actor.setFlag?.('foundryvtt-swse', 'aversionActive', { encounterId: this._encounterId(), activatedAt: Date.now() });
      await SWSEChat.postHTML({
        actor,
        content: `<div class="swse-force-talent-card swse-force-talent-card--aversion">
          <h3>${actor.name} radiates Aversion</h3>
          <p><strong>Swift Action · Force Point spent.</strong> Enemies treat all squares within 2 squares of ${actor.name} as difficult terrain until the end of the encounter.</p>
          <p><em>Mind-Affecting effect · Force Points remaining: ${remainingFP}</em></p>
        </div>`
      });
      return { success: true, forcePointsRemaining: remainingFP };
    } catch (err) {
      console.error('Aversion failed:', err);
      ui?.notifications?.error?.(`Aversion failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  static _illusionSizeOptions() {
    return [
      { value: 'medium-or-smaller', label: 'Medium or smaller', penalty: 0 },
      { value: 'large', label: 'Large', penalty: 0 },
      { value: 'huge', label: 'Huge', penalty: -1 },
      { value: 'gargantuan', label: 'Gargantuan', penalty: -2 },
      { value: 'colossal', label: 'Colossal', penalty: -5 },
      { value: 'colossal-frigate', label: 'Colossal (Frigate) or larger', penalty: -10 }
    ];
  }

  static async promptIllusion(actor, { sourceElement = null } = {}) {
    if (!actor) throw new Error('Actor not found');
    if (!this._actorHasTalent(actor, 'Illusion')) throw new Error('Illusion talent not found');
    const sizeOptions = this._illusionSizeOptions();
    const content = `<form class="swse-dialog swse-illusion-dialog">
      <p>Choose the illusion size. The size penalty is applied to the Use the Force check.</p>
      <div class="form-group">
        <label>Illusion Size</label>
        <select name="size">
          ${sizeOptions.map(option => `<option value="${option.value}">${option.label} (${option.penalty >= 0 ? '+' : ''}${option.penalty})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Target Will Defense / DC <span class="notes">optional</span></label>
        <input type="number" name="targetWill" value="" placeholder="Compare result to Will Defense" />
      </div>
      <div class="form-group">
        <label>Additional Modifier</label>
        <input type="number" name="modifier" value="0" />
      </div>
      <div class="form-group">
        <label>Illusion Description</label>
        <textarea name="description" rows="3" placeholder="Form, location, and complexity"></textarea>
      </div>
      ${this._actorHasTalent(actor, 'Illusion Bond') ? `<label class="checkbox"><input type="checkbox" name="humanoid"> Humanoid illusion: apply Illusion Bond sensory link</label>` : ''}
      ${this._actorHasTalent(actor, 'Masquerade') ? `<label class="checkbox"><input type="checkbox" name="masquerade"> Masquerade: use this Illusion as a deceptive appearance for yourself</label>` : ''}
      <p class="notes"><strong>Cost:</strong> 1 Force Point · <strong>Action:</strong> Standard Action · <strong>Duration:</strong> heroic level minutes · <strong>Descriptor:</strong> Mind-Affecting</p>
    </form>`;

    const result = await SWSEDialogV2.prompt({
      title: 'Illusion — Use the Force Check',
      content,
      label: 'Roll Illusion',
      callback: (html) => {
        const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
        const form = root?.querySelector?.('form') ?? root;
        const fd = new FormData(form);
        const size = String(fd.get('size') || 'medium-or-smaller');
        const option = sizeOptions.find(o => o.value === size) ?? sizeOptions[0];
        return {
          size,
          sizeLabel: option.label,
          sizePenalty: option.penalty,
          targetWill: Number(fd.get('targetWill') || 0) || null,
          modifier: Number(fd.get('modifier') || 0) || 0,
          description: String(fd.get('description') || '').trim(),
          humanoid: fd.get('humanoid') === 'on',
          masquerade: fd.get('masquerade') === 'on',
          sourceElement
        };
      }
    });
    if (!result) return null;
    return this.executeIllusion(actor, result);
  }

  static async executeIllusion(actor, options = {}) {
    try {
      if (!actor) throw new Error('Actor not found');
      if (!this._actorHasTalent(actor, 'Illusion')) throw new Error('Illusion talent not found');
      const fpSpend = await this._spendForcePointForTalent(actor, 'Illusion');
      const remainingFP = fpSpend?.remaining ?? SchemaAdapters.getForcePoints(actor);
      const baseBonus = this._getUseTheForceTotal(actor);
      const sizePenalty = Number(options.sizePenalty ?? 0) || 0;
      const customModifier = Number(options.modifier ?? options.customModifier ?? 0) || 0;
      const rollBonus = baseBonus + sizePenalty + customModifier;
      const baseDC = Number(options.targetWill ?? 0) || 0;

      const rollResult = await RollCore.execute({
        actor,
        domain: 'force-talent.illusion',
        baseBonus: rollBonus,
        rollOptions: { baseDice: '1d20' },
        rollData: actor.getRollData?.() ?? {},
        context: {
          category: 'force',
          rollCategory: 'force',
          type: 'force-talent',
          talentName: 'Illusion',
          itemName: 'Illusion',
          baseBonus,
          customModifier,
          sizePenalty,
          forceDescriptor: 'mind',
          forceDescriptors: ['Mind-Affecting'],
          dc: baseDC || null,
          targetWill: baseDC || null,
          forceActionLabel: 'Standard Action',
          forceTalentNotes: [{
            key: 'illusion-size',
            label: 'Illusion Size',
            action: options.sizeLabel || 'Selected size',
            value: `${sizePenalty >= 0 ? '+' : ''}${sizePenalty} size modifier`
          }]
        }
      });
      if (!rollResult.success || !rollResult.roll) throw new Error(rollResult.error || 'Illusion roll failed');
      const roll = rollResult.roll;
      const total = Number(rollResult.finalTotal ?? roll.total ?? 0) || 0;
      const heroicLevel = this._getHeroicLevel(actor);
      const success = baseDC ? total >= baseDC : null;
      const resolvedEffect = `Illusion lasts ${heroicLevel} minute${heroicLevel === 1 ? '' : 's'}. Compare the Use the Force result (${total}) against each viewer's Will Defense. Physical interaction reveals the illusion.`;
      const d20 = roll.dice?.find?.(die => Number(die.faces) === 20);
      const d20Result = d20?.results?.find?.(r => r.active !== false) ?? d20?.results?.[0] ?? null;
      const isFumble = Number(d20Result?.result) === 1;
      if (isFumble) await this.handleForceFlowNaturalOne(actor, { source: 'Illusion', rollType: 'Use the Force' });

      await SWSEChat.postRoll({
        actor,
        roll,
        flavor: `${actor.name} creates an Illusion`,
        context: {
          category: 'force',
          type: 'force-talent',
          itemName: 'Illusion',
          label: 'Illusion',
          typeChipLabel: 'Force Talent · UTF',
          totalLabel: 'UTF Check',
          dc: baseDC || null,
          success,
          outcomeLabel: success === null ? 'Compare to Will' : success ? 'Deceived' : 'Resisted',
          forceDescriptor: 'mind',
          forceDescriptors: ['Mind-Affecting'],
          forceResolvedEffect: resolvedEffect,
          forceTalentNotes: [
            { key: 'illusion-size', label: 'Size', action: options.sizeLabel || 'Selected size', value: `${sizePenalty >= 0 ? '+' : ''}${sizePenalty} modifier` },
            { key: 'illusion-duration', label: 'Duration', action: 'Heroic level minutes', value: `${heroicLevel} minute${heroicLevel === 1 ? '' : 's'}` },
            ...(options.humanoid ? [{ key: 'illusion-bond', label: 'Illusion Bond', action: 'Humanoid illusion', value: 'You can see and hear as though standing in the illusion's space.' }] : []),
            ...(options.masquerade ? [{ key: 'masquerade', label: 'Masquerade', action: 'Deceptive Appearance', value: 'Use this Use the Force result for your disguise/Deception appearance.' }] : []),
            ...(options.description ? [{ key: 'illusion-description', label: 'Illusion', action: 'Description', value: options.description }] : [])
          ],
          baseBonus,
          customModifier: sizePenalty + customModifier,
          forcePointBonus: 0,
          margin: baseDC ? total - baseDC : null,
          forceActionLabel: 'Standard Action'
        },
        flags: {
          swse: {
            forceTalent: true,
            talentName: 'Illusion',
            targetWill: baseDC || null,
            size: options.sizeLabel || '',
            sizePenalty,
            forcePointSpent: true
          }
        }
      });
      return { success: true, roll: total, dc: baseDC || null, forcePointsRemaining: remainingFP };
    } catch (err) {
      console.error('Illusion failed:', err);
      ui?.notifications?.error?.(`Illusion failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  static async promptLink(actor) {
    if (!actor) throw new Error('Actor not found');
    if (!this._actorHasTalent(actor, 'Link')) throw new Error('Link talent not found');
    const content = `<form class="swse-dialog swse-link-dialog">
      <p>Designate one willing ally within 12 squares and line of sight. The ally must be trained in Use the Force.</p>
      <div class="form-group"><label>Ally Name</label><input name="allyName" type="text" placeholder="Willing trained ally" /></div>
      <p class="notes">Standard Action · one active Link at a time · lasts until encounter end or until ended as a Free Action.</p>
    </form>`;
    const result = await SWSEDialogV2.prompt({
      title: 'Link',
      content,
      label: 'Create Link',
      callback: (html) => {
        const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
        const form = root?.querySelector?.('form') ?? root;
        const fd = new FormData(form);
        return { allyName: String(fd.get('allyName') || '').trim() || 'willing ally' };
      }
    });
    if (!result) return null;
    return this.activateLink(actor, result);
  }

  static async activateLink(actor, { allyName = 'willing ally' } = {}) {
    try {
      if (!actor) throw new Error('Actor not found');
      if (!this._actorHasTalent(actor, 'Link')) throw new Error('Link talent not found');
      await actor.setFlag?.('foundryvtt-swse', 'forceLink', { encounterId: this._encounterId(), allyName, activatedAt: Date.now() });
      await SWSEChat.postHTML({ actor, content: `<div class="swse-force-talent-card swse-force-talent-card--link">
        <h3>${actor.name} creates a Link</h3>
        <p><strong>Standard Action:</strong> ${actor.name} links with <strong>${allyName}</strong>.</p>
        <p>While within 12 squares, either linked character may Aid Another on the other's Use the Force checks as a Reaction. The aiding character takes a -5 penalty on Use the Force checks until the end of their next turn.</p>
      </div>` });
      return { success: true, allyName };
    } catch (err) {
      ui?.notifications?.error?.(`Link failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  static async promptTelepathicLink(actor) {
    if (!actor) throw new Error('Actor not found');
    if (!this._actorHasTalent(actor, 'Telepathic Link')) throw new Error('Telepathic Link talent not found');
    const content = `<form class="swse-dialog swse-telepathic-link-dialog">
      <p>Choose one willing ally with Force Sensitivity. You may maintain one Telepathic Link at a time.</p>
      <div class="form-group"><label>Ally Name</label><input name="allyName" type="text" placeholder="Force-sensitive willing ally" /></div>
      <p class="notes">Swift Action · maintained until ended · one kilometer communication range · once per encounter share a Force Power with consent.</p>
    </form>`;
    const result = await SWSEDialogV2.prompt({
      title: 'Telepathic Link', content, label: 'Establish Link',
      callback: (html) => {
        const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
        const form = root?.querySelector?.('form') ?? root;
        const fd = new FormData(form);
        return { allyName: String(fd.get('allyName') || '').trim() || 'willing ally' };
      }
    });
    if (!result) return null;
    await actor.setFlag?.('foundryvtt-swse', 'telepathicLink', { allyName: result.allyName, encounterId: this._encounterId(), usedSharedPower: false, activatedAt: Date.now() });
    await SWSEChat.postHTML({ actor, content: `<div class="swse-force-talent-card swse-force-talent-card--telepathic-link">
      <h3>${actor.name} establishes a Telepathic Link</h3>
      <p><strong>Swift Action:</strong> linked with <strong>${result.allyName}</strong>. You can communicate telepathically within one kilometer.</p>
      <p>Once per encounter, one linked character may use a Force Power from the other's Force Power Suite with consent.</p>
    </div>` });
    return { success: true, allyName: result.allyName };
  }

  static async promptSuppressForce(actor) {
    if (!actor) throw new Error('Actor not found');
    if (!this._actorHasTalent(actor, 'Suppress Force')) throw new Error('Suppress Force talent not found');
    const content = `<form class="swse-dialog swse-suppress-force-dialog">
      <p>Reaction: spend one use of Mind Trick when a target within 12 squares and line of sight attempts a Use the Force check.</p>
      <div class="form-group"><label>Target Name</label><input name="targetName" type="text" placeholder="Target" /></div>
      <div class="form-group"><label>Target UTF Result</label><input name="targetResult" type="number" value="10" /></div>
      <div class="form-group"><label>Situational Modifier</label><input name="modifier" type="number" value="0" /></div>
    </form>`;
    const result = await SWSEDialogV2.prompt({ title: 'Suppress Force', content, label: 'Roll Suppression', callback: (html) => {
      const root = html instanceof HTMLElement ? html : html?.[0] ?? html;
      const form = root?.querySelector?.('form') ?? root;
      const fd = new FormData(form);
      return { targetName: String(fd.get('targetName') || '').trim() || 'target', targetResult: Number(fd.get('targetResult') || 0) || 0, modifier: Number(fd.get('modifier') || 0) || 0 };
    }});
    if (!result) return null;
    return this.executeSuppressForce(actor, result);
  }

  static async executeSuppressForce(actor, options = {}) {
    try {
      if (!this._actorHasTalent(actor, 'Suppress Force')) throw new Error('Suppress Force talent not found');
      const mindTrick = Array.from(actor?.items ?? []).find(item => isForcePowerItem(item) && /mind\s*trick/i.test(String(item?.name || '')) && !item.system?.discarded);
      if (!mindTrick) throw new Error('Suppress Force requires spending one ready use of Mind Trick');
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: mindTrick.id, 'system.discarded': true, 'system.lastUsed': Date.now(), 'flags.foundryvtt-swse.lastUseSource': 'suppress-force' }], { source: 'suppress-force-mind-trick-use', render: false });
      const baseBonus = this._getUseTheForceTotal(actor);
      const rollResult = await RollCore.execute({ actor, domain: 'force-talent.suppress-force', baseBonus: baseBonus + (Number(options.modifier) || 0), rollOptions: { baseDice: '1d20' }, rollData: actor.getRollData?.() ?? {}, context: { category: 'force', rollCategory: 'force', type: 'force-talent', talentName: 'Suppress Force', itemName: 'Suppress Force', baseBonus, customModifier: Number(options.modifier) || 0, dc: Number(options.targetResult) || null, forceDescriptor: 'mind', forceDescriptors: ['Mind-Affecting'], forceActionLabel: 'Reaction' } });
      if (!rollResult.success || !rollResult.roll) throw new Error(rollResult.error || 'Suppress Force roll failed');
      const total = Number(rollResult.finalTotal ?? rollResult.roll.total ?? 0) || 0;
      const targetResult = Number(options.targetResult) || 0;
      const success = targetResult ? total >= targetResult : null;
      await SWSEChat.postRoll({ actor, roll: rollResult.roll, flavor: `${actor.name} uses Suppress Force`, context: { category: 'force', type: 'force-talent', itemName: 'Suppress Force', label: 'Suppress Force', typeChipLabel: 'Force Talent · Reaction', totalLabel: 'UTF Check', dc: targetResult || null, success, outcomeLabel: success === null ? 'Compare UTF' : success ? 'Negated' : 'Not negated', forceDescriptors: ['Mind-Affecting'], forceResolvedEffect: success ? `${options.targetName}'s Use the Force check is negated and the attempted action fails.` : `If this result does not equal or exceed ${options.targetName}'s UTF result, the action proceeds.`, forceTalentNotes: [{ key: 'mind-trick-spent', label: 'Mind Trick', action: 'Spent', value: 'One use of Mind Trick was expended for this Reaction.' }], forceActionLabel: 'Reaction' } });
      return { success: true, roll: total, dc: targetResult || null };
    } catch (err) {
      ui?.notifications?.error?.(`Suppress Force failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  static async grantTelepathicInfluenceForcePoint(actor) {
    try {
      if (!actor || !this._actorHasTalent(actor, 'Telepathic Influence')) return { success: false, reason: 'missing-talent' };
      await SWSEChat.postHTML({ actor, content: `<div class="swse-force-talent-card swse-force-talent-card--telepathic-influence">
        <h3>${actor.name} may grant Telepathic Influence</h3>
        <p><strong>Natural 20:</strong> Instead of regaining all spent Force Powers, ${actor.name} may grant one ally within 12 squares a temporary Force Point until the end of the encounter.</p>
        <p><em>Choose the ally manually; temporary Force Point expires if unused.</em></p>
      </div>` });
      return { success: true };
    } catch (err) { return { success: false, error: err.message }; }
  }

  static _getHeroicLevel(actor) {
    const candidates = [
      actor?.system?.details?.level,
      actor?.system?.level,
      actor?.system?.derived?.level,
      actor?.system?.classes?.total,
      actor?.system?.progression?.level
    ];
    for (const candidate of candidates) {
      const n = Number(candidate);
      if (Number.isFinite(n) && n > 0) return Math.max(1, Math.floor(n));
    }
    return 1;
  }

  /**
   * Mass recovery of discarded Force powers
   * Typically occurs during a rest or via meditation
   * @param {Actor} actor - Actor recovering powers
   * @param {Array<string>} powerIds - Array of power IDs to recover (or null for all)
   * @returns {Object} Recovery result
   */
  static async recoverForcePowers(actor, powerIds = null) {
    try {
      let powersToRecover = [];

      if (powerIds && powerIds.length > 0) {
        // Recover specific powers — spend a Force Point through the shared spender so bonus Force Points are consumed first.
        const spend = await ActorEngine.spendForcePoints(actor, 1);
        if (!spend?.spent) {
          ui?.notifications?.warn?.('No Force Points left!');
          return { success: false, error: 'No Force Points available' };
        }
        const selected = powerIds.map(id => actor.items.get(id)).filter(p => p && (p.system?.discarded || p.system?.spent));
        powersToRecover = [...selected];
        if (this._actorHasTalent(actor, 'Recall')) {
          const selectedIds = new Set(selected.map(p => p.id));
          const extra = actor.items.find(item => isForcePowerItem(item) && (item.system?.discarded || item.system?.spent) && !selectedIds.has(item.id));
          if (extra) powersToRecover.push(extra);
        }
      } else {
        // Recover all discarded force powers (rest / natural 20)
        powersToRecover = actor.items.filter(item => isForcePowerItem(item) && item.system?.discarded);
      }

      if (powersToRecover.length === 0) {
        throw new Error("No force powers to recover");
      }

      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', powersToRecover.map(power => ({
        _id: power.id,
        'system.discarded': false,
        'system.spent': false,
        'system.lastRecovered': Date.now()
      })), { source: 'force-power-recover-all', render: false });

      // Remove any active effects from recovered powers
      for (const power of powersToRecover) {
        await ForcePowerEffectsEngine.removePowerEffects(actor, power);
      }

      // Generate chat message
      await SWSEChat.postHTML({
        actor,
        content: `<div class="swse-force-recovery">
          <h3>${actor.name} recovers Force powers</h3>
          <ul>
            ${powersToRecover.map(p => `<li>${p.name}</li>`).join("")}
          </ul>
        </div>`
      });

      return {
        success: true,
        recovered: powersToRecover.length,
        powers: powersToRecover.map(p => p.name)
      };
    } catch (err) {
      console.error("Force recovery failed:", err);
      ui?.notifications?.error?.(`Force recovery failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  static _text(value = '') {
    if (value && typeof value === 'object') {
      value = value.value ?? value.description ?? value.text ?? value.label ?? '';
    }
    const text = String(value ?? '');
    if (!text) return '';
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.innerHTML = text;
      return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
    }
    return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  static _getUseTheForceTotal(actor) {
    const candidates = [
      actor?.system?.derived?.skillsByKey?.useTheForce?.total,
      actor?.system?.derived?.skills?.useTheForce?.total,
      actor?.system?.skills?.useTheForce?.total,
      actor?.system?.skills?.useTheForce?.value,
      actor?.system?.skills?.useTheForce?.mod
    ];
    for (const candidate of candidates) {
      const n = Number(candidate);
      if (Number.isFinite(n)) return n;
    }
    return 0;
  }

  static _getPowerBaseDC(power) {
    const system = power?.system ?? {};
    const firstChartDc = Array.isArray(system.dcChart) ? system.dcChart.find(row => row?.dc != null)?.dc : null;
    return Number(system.useTheForce ?? system.dc ?? system.DC ?? firstChartDc ?? 10) || 10;
  }

  static _getPowerDcRows(power) {
    const chart = Array.isArray(power?.system?.dcChart) ? power.system.dcChart : [];
    return chart
      .map(row => ({
        dc: Number(row?.dc ?? row?.DC ?? row?.target ?? row?.threshold),
        effect: this._text(row?.effect || row?.description || row?.text || row?.label || '')
      }))
      .filter(row => Number.isFinite(row.dc) && row.effect)
      .sort((a, b) => a.dc - b.dc);
  }

  static _resolvePowerTier(power, total) {
    const numericTotal = Number(total);
    if (!Number.isFinite(numericTotal)) return null;
    let best = null;
    for (const row of this._getPowerDcRows(power)) {
      if (numericTotal >= row.dc) best = row;
    }
    return best;
  }

  static _getPowerDescriptors(power) {
    const system = power?.system ?? {};
    const raw = [];
    const add = value => {
      if (Array.isArray(value)) value.forEach(add);
      else if (value != null && String(value).trim()) raw.push(String(value).trim());
    };
    add(system.descriptor);
    add(system.descriptors);
    add(system.tags);
    add(system.discipline);
    return [...new Set(raw)].slice(0, 6);
  }

  static _resolvePrimaryDescriptor(descriptors = []) {
    const joined = descriptors.join(' ').toLowerCase();
    if (joined.includes('dark')) return 'dark';
    if (joined.includes('tele') || joined.includes('tk') || joined.includes('move')) return 'tk';
    if (joined.includes('mind') || joined.includes('affect')) return 'mind';
    if (joined.includes('form') || joined.includes('lightsaber')) return 'form';
    if (joined.includes('light')) return 'light';
    if (joined.includes('control') || joined.includes('alter') || joined.includes('sense')) return 'light';
    return 'light';
  }


  static _normalizeName(value = '') {
    return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  static _actorHasTalent(actor, talentName) {
    const wanted = this._normalizeName(talentName);
    return Array.from(actor?.items ?? []).some(item => item?.type === 'talent' && this._normalizeName(item.name) === wanted);
  }

  static _getWisdomModifier(actor) {
    const candidates = [
      actor?.system?.derived?.attributes?.wis?.mod,
      actor?.system?.attributes?.wis?.mod,
      actor?.system?.abilities?.wis?.mod,
      actor?.system?.abilities?.wisdom?.modifier,
      actor?.system?.attributes?.wis?.total,
      actor?.system?.abilities?.wis?.total,
      actor?.system?.abilities?.wis?.value,
      actor?.system?.abilities?.wis?.base,
      actor?.system?.abilities?.wisdom?.score
    ];
    for (const candidate of candidates) {
      const n = Number(candidate);
      if (!Number.isFinite(n)) continue;
      if (n > 5) return Math.floor((n - 10) / 2);
      return n;
    }
    return 0;
  }

  static _isTelekineticPower(power, descriptors = null) {
    const system = power?.system ?? {};
    const values = descriptors ?? this._getPowerDescriptors(power);
    const haystack = [
      power?.name,
      system.discipline,
      system.category,
      system.powerType,
      ...(Array.isArray(values) ? values : []),
      ...(Array.isArray(system.tags) ? system.tags : []),
      system.effect,
      system.special
    ].join(' ').toLowerCase();
    return /telekinetic|\btk\b|move object|force slam|force thrust|force disarm|force grip|repulse|ballistakinesis|detonate|force blast/.test(haystack);
  }

  static _isLightsaberFormPower(power, descriptors = null) {
    const system = power?.system ?? {};
    const values = descriptors ?? this._getPowerDescriptors(power);
    const haystack = [
      power?.name,
      power?.type,
      system.type,
      system.discipline,
      system.category,
      system.subcategory,
      system.powerType,
      system.form,
      system.lightsaberForm,
      ...(Array.isArray(values) ? values : []),
      ...(Array.isArray(system.tags) ? system.tags : []),
      system.effect,
      system.special
    ].join(' ').toLowerCase();
    return /lightsaber[-\s]?form|form power|shii-cho|makashi|soresu|ataru|shien|djem so|niman|juyo|vaapad/.test(haystack);
  }

  static _isAreaForcePower(power, descriptors = null) {
    const system = power?.system ?? {};
    const values = descriptors ?? this._getPowerDescriptors(power);
    const haystack = [
      power?.name,
      system.target,
      system.range,
      system.area,
      system.effect,
      system.special,
      ...(Array.isArray(values) ? values : []),
      ...(Array.isArray(system.tags) ? system.tags : [])
    ].join(' ').toLowerCase();
    return /area|burst|cone|radius|splash|blast|line|all creatures|all enemies|all opponents|all adjacent|\d+\s*x\s*\d+/.test(haystack);
  }

  static _buildForceTalentContext(actor, power, descriptors = [], options = {}) {
    const notes = [];
    const hasDisciplinedStrike = this._actorHasTalent(actor, 'Disciplined Strike');
    const hasTelekineticPower = this._actorHasTalent(actor, 'Telekinetic Power');
    const isArea = this._isAreaForcePower(power, descriptors);
    const isTelekinetic = this._isTelekineticPower(power, descriptors);

    if (hasDisciplinedStrike && isArea) {
      const excludeCount = Math.max(1, this._getWisdomModifier(actor));
      notes.push({
        key: 'disciplined-strike',
        label: 'Disciplined Strike',
        value: `May exclude up to ${excludeCount} target${excludeCount === 1 ? '' : 's'} from this area Force Power.`,
        action: 'Target exclusion',
        count: excludeCount
      });
    }

    if (options.freeRepeat === true) {
      notes.push({
        key: 'telekinetic-power-repeat',
        label: 'Telekinetic Power',
        value: 'This activation is the immediate Free Action repeat granted by Telekinetic Power.',
        action: 'Free Action'
      });
    }

    const hasMoveMassiveObject = this._actorHasTalent(actor, 'Move Massive Object');
    const isMoveObject = /move\s*object/i.test(String(power?.name || ''));
    if (hasMoveMassiveObject && isMoveObject) {
      notes.push({
        key: 'move-massive-object',
        label: 'Move Massive Object',
        action: options.moveMassiveObject === true ? 'Area Attack enabled' : 'Available',
        value: options.moveMassiveObject === true
          ? 'Force Point spent to make an Area Attack with a Large or larger object. Area: Large 2x2, Huge 3x3, Gargantuan 4x4, Colossal+ 6x6.'
          : 'May spend a Force Point when activating Move Object to make an Area Attack with a Large or larger object.'
      });
    }

    return { notes, hasDisciplinedStrike, hasTelekineticPower, isArea, isTelekinetic, hasMoveMassiveObject, isMoveObject };
  }

  static _buildTelekineticPowerRepeatAction(actor, power, context = {}) {
    if (!context.isCritical || !context.isTelekinetic || !context.hasTalent || context.freeRepeat) return null;
    return {
      actorId: actor?.id ?? '',
      itemId: power?.id ?? '',
      powerName: power?.name ?? 'Force Power',
      label: `Use ${power?.name ?? 'Force Power'} again`,
      hint: 'Telekinetic Power: natural 20 on a Telekinetic Force Power lets you use it again immediately as a Free Action.'
    };
  }

  /**
   * Generate Force power activation message
   * @private
   */
  static async _generateForceActivationMessage(actor, power, recovered) {
    try {
      const content = `
        <div class="swse-force-message">
          <h3>${actor.name} ${recovered ? "recovers" : "uses"} ${power.name}</h3>
          <div class="power-details">
            <strong>Type:</strong> ${power.system?.powerType || "Unknown"}<br>
            <strong>Range:</strong> ${power.system?.range || "Personal"}<br>
            <strong>Duration:</strong> ${power.system?.duration || "Instant"}
          </div>
          ${power.system?.description ? `<p>${power.system.description}</p>` : ""}
        </div>
      `;

      await SWSEChat.postHTML({
        actor,
        content
      });
    } catch (err) {
      console.error("Force message generation failed:", err);
    }
  }

  /**
   * Generate Force power roll message
   * @private
   */
  static async _generateForcePowerRollMessage(
    actor,
    power,
    roll,
    total,
    baseDC,
    success,
    isCritical,
    extra = {}
  ) {
    try {
      const resolvedTier = extra.resolvedTier ?? this._resolvePowerTier(power, total);
      const resolvedEffect = extra.resolvedEffect || resolvedTier?.effect || (success ? this._text(power.system?.effect || power.system?.summary || '') : 'Power check failed. No effect resolved.');
      const dcChart = extra.dcChart?.length ? extra.dcChart : this._getPowerDcRows(power);
      const forceDescriptors = extra.forceDescriptors?.length ? extra.forceDescriptors : this._getPowerDescriptors(power);
      const forceDescriptor = extra.forceDescriptor || this._resolvePrimaryDescriptor(forceDescriptors);
      const margin = Number(total) - Number(baseDC);

      await SWSEChat.postRoll({
        actor,
        roll,
        flavor: `${actor.name} uses ${power.name}`,
        context: {
          category: 'force',
          type: 'force-power',
          itemName: power.name,
          sourceItemId: power.id,
          powerId: power.id,
          label: power.name,
          typeChipLabel: 'Force Power · UTF',
          totalLabel: 'UTF Check',
          dc: baseDC,
          success,
          outcomeLabel: success ? 'Resolved' : 'Failed',
          forceDescriptor,
          forceDescriptors,
          dcChart,
          forceResolvedTier: resolvedTier?.dc ? `DC ${resolvedTier.dc}` : '',
          forceResolvedEffect: resolvedEffect,
          baseBonus: extra.baseBonus,
          customModifier: extra.customModifier,
          forcePointBonus: extra.forcePointBonus,
          appliedEffectCount: Array.isArray(extra.appliedEffects) ? extra.appliedEffects.length : 0,
          forceTalentNotes: extra.forceTalentNotes ?? [],
          telekineticPowerRepeatAction: extra.telekineticPowerRepeatAction ?? null,
          freeActionRepeat: extra.freeActionRepeat === true,
          forceActionLabel: extra.forceActionLabel ?? '',
          margin
        },
        flags: {
          swse: {
            forcePower: true,
            powerId: power.id,
            powerName: power.name,
            dc: baseDC,
            success,
            resolvedEffect,
            resolvedTierDc: resolvedTier?.dc ?? null,
            isCritical,
            telekineticPowerRepeatAvailable: Boolean(extra.telekineticPowerRepeatAction),
            disciplinedStrike: Array.isArray(extra.forceTalentNotes) && extra.forceTalentNotes.some(note => note?.key === 'disciplined-strike')
          }
        }
      });
    } catch (err) {
      console.error("Force roll message generation failed:", err);
    }
  }
}


let forceExecutorChatHooksRegistered = false;

export function registerForceExecutorChatHooks() {
  if (forceExecutorChatHooksRegistered) return;
  forceExecutorChatHooksRegistered = true;

  Hooks.on('deleteCombat', async (combat) => {
    try {
      const combatants = Array.from(combat?.combatants ?? []);
      const actors = [...new Map(combatants.map(c => [c?.actor?.id, c?.actor]).filter(([id, actor]) => id && actor)).values()];
      for (const actor of actors) {
        await ForceExecutor.resetForceFlowTemporaryForcePoints(actor, { encounterId: combat?.id ?? null });
        await actor.unsetFlag?.('foundryvtt-swse', 'telekineticSavantUses');
        await actor.unsetFlag?.('foundryvtt-swse', 'influenceSavantUses');
        await actor.unsetFlag?.('foundryvtt-swse', 'lightsaberFormSavantUses');
        await actor.unsetFlag?.('foundryvtt-swse', 'aversionActive');
        await actor.unsetFlag?.('foundryvtt-swse', 'forceLink');
        await actor.unsetFlag?.('foundryvtt-swse', 'telepathicLink');
        await actor.unsetFlag?.('swse', 'encounterUses.guardianSpirit.vitalEncouragement');
        await actor.unsetFlag?.('swse', 'encounterUses.guardianSpirit.crucialAdvice');
        await actor.unsetFlag?.('swse', 'guardianSpirit');
      }
    } catch (err) {
      console.warn('SWSE | Force talent encounter cleanup failed', err);
    }
  });

  Hooks.on('renderChatMessageHTML', (message, html) => {
    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;

    root.querySelectorAll?.('[data-action="telekinetic-power-repeat"]').forEach(button => {
      if (button.dataset.swseBound === 'true') return;
      button.dataset.swseBound = 'true';
      button.addEventListener('click', async event => {
        event.preventDefault();
        const actorId = button.dataset.actorId;
        const itemId = button.dataset.itemId;
        const actor = game.actors?.get(actorId) ?? canvas?.tokens?.controlled?.[0]?.actor ?? null;
        if (!actor || !itemId) {
          ui?.notifications?.warn?.('Could not resolve actor or Force Power for Telekinetic Power.');
          return;
        }
        button.disabled = true;
        try {
          const result = await ForceExecutor.executeForcePower(actor, itemId, {
            freeRepeat: true,
            ignoreDiscarded: true,
            useForce: false
          });
          if (result?.success) {
            ui?.notifications?.info?.('Telekinetic Power repeat resolved as a Free Action.');
          } else {
            button.disabled = false;
            ui?.notifications?.warn?.(result?.error || 'Telekinetic Power repeat failed.');
          }
        } catch (err) {
          button.disabled = false;
          ui?.notifications?.error?.(`Telekinetic Power repeat failed: ${err.message}`);
        }
      });
    });
  });
}

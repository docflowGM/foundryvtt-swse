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

      // Check if power is already discarded
      if (power.system?.discarded) {
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
        const fpValue = SchemaAdapters.getForcePoints(actor);
        if (fpValue <= 0) {
          throw new Error("No Force Points available");
        }
      }

      const dcChart = this._getPowerDcRows(power);
      const descriptors = this._getPowerDescriptors(power);
      const primaryDescriptor = this._resolvePrimaryDescriptor(descriptors);

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
          dcChart
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
      const resolvedTier = this._resolvePowerTier(power, total);
      const resolvedEffect = resolvedTier?.effect || (success ? this._text(system.effect || system.summary || '') : 'Power check failed. No effect resolved.');

      // Handle natural 20 effects
      if (isCritical) {
        await ForceEngine.recordNatural20(actor, power.name);
      }

      // Handle dark side consequences (optional)
      if (!success && power.system?.darkSideBacklash) {
        await ForceEngine.gainDarkSidePoint(actor, `Failed use of ${power.name}`);
      }

      // Spend Force Point if RollCore successfully included the Force Point bonus.
      const forcePointBonus = Number(rollResult.forcePointBonus ?? rollResult.breakdown?.forcePointBonus ?? 0) || 0;
      if (useForce && forcePointBonus > 0) {
        const currentFP = SchemaAdapters.getForcePoints(actor);
        await ActorEngine.updateActor(actor, SchemaAdapters.setForcePointsUpdate(Math.max(0, currentFP - 1)), {
          source: 'force-power-force-point-spend'
        });
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
        appliedEffects = await ForcePowerEffectsEngine.applyPowerEffect(actor, power, total);
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
          appliedEffects
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
        appliedEffects
      };
    } catch (err) {
      console.error("Force power execution failed:", err);
      ui?.notifications?.error?.(`Force power failed: ${err.message}`);
      return { success: false, error: err.message };
    }
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
        // Recover specific powers — spend a Force Point if the actor has one
        const fpValue = SchemaAdapters.getForcePoints(actor);
        if (fpValue <= 0) {
          ui?.notifications?.warn?.('No Force Points left!');
          return { success: false, error: 'No Force Points available' };
        }
        await ActorEngine.updateActor(actor, SchemaAdapters.setForcePointsUpdate(Math.max(0, fpValue - 1)), {
          source: 'force-power-fp-recover'
        });
        powersToRecover = powerIds.map(id => actor.items.get(id)).filter(p => p && p.system?.discarded);
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
            isCritical
          }
        }
      });
    } catch (err) {
      console.error("Force roll message generation failed:", err);
    }
  }
}

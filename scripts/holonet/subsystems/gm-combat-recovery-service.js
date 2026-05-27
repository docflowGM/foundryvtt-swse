/**
 * GM Combat & Recovery Service
 *
 * GM-facing command surface over existing combat/recovery authorities.
 * This service does not invent recovery rules: HP/CT/SW mutations route through
 * ActorEngine, RecoveryMechanics, GMHealingTrigger, and SecondWindEngine.
 *
 * Important boundary: droids and vehicles are visible in the console but are
 * excluded from rest recovery. Droid/vehicle recovery must be repair-style GM
 * action, not organic rest healing.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { GMHealingTrigger } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-healing-trigger.js';
import { SecondWindEngine } from '/systems/foundryvtt-swse/scripts/engine/combat/SecondWindEngine.js';
import { HealingRules } from '/systems/foundryvtt-swse/scripts/houserules/adapters/HealingRules.js';
import { StatusEffectsMechanics } from '/systems/foundryvtt-swse/scripts/houserules/houserule-status-effects.js';

const MANAGED_ACTOR_TYPES = new Set(['character', 'npc', 'droid', 'vehicle', 'beast']);
const SYSTEM_ID = 'foundryvtt-swse';

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clampPercent(value, max) {
  const denominator = Math.max(1, safeNumber(max, 1));
  return Math.max(0, Math.min(100, Math.round((safeNumber(value, 0) / denominator) * 100)));
}

export class GMCombatRecoveryService {
  static async buildViewModel() {
    const actors = this.getManagedActors();
    const cards = actors.map((actor) => this.buildActorCard(actor));
    const metrics = this.buildMetrics(cards);
    const rules = this.buildRuleSummary();
    const statusEffects = this.buildStatusEffectOptions();

    return {
      pageTitle: 'Combat & Recovery',
      pageDescription: 'GM command console for healing, rest, encounter reset, condition cleanup, status effects, and repair visibility.',
      combatRecovery: {
        metrics,
        rules,
        actors: cards,
        organicActors: cards.filter((card) => card.kind === 'organic'),
        droidActors: cards.filter((card) => card.kind === 'droid'),
        vehicleActors: cards.filter((card) => card.kind === 'vehicle'),
        activeCombatants: cards.filter((card) => card.inCombat),
        partyActors: cards.filter((card) => card.partyActor),
        selectedTargetModes: this.buildTargetModes(cards),
        defaultTargetMode: 'party',
        statusEffects,
        statusEffectsEnabled: statusEffects.length > 0,
        needsAttention: cards.filter((card) => card.needsAttention),
        hasActiveCombat: Boolean(game.combat?.started || game.combat?.active),
        activeCombatLabel: game.combat?.started || game.combat?.active
          ? `${game.combat?.combatants?.size ?? game.combat?.combatants?.length ?? 0} active combatants`
          : 'No active combat'
      },
      // Legacy compatibility for older template fragments or badge callers.
      healingSummary: {
        eligible: metrics.restEligible,
        ineligible: Math.max(0, cards.length - metrics.restEligible),
        eligibleActors: cards.filter((card) => card.restEligible),
        ineligibleActors: cards.filter((card) => !card.restEligible)
      },
      eligible: metrics.restEligible,
      ineligible: Math.max(0, cards.length - metrics.restEligible),
      eligibleActors: cards.filter((card) => card.restEligible),
      ineligibleActors: cards.filter((card) => !card.restEligible)
    };
  }

  static getManagedActors() {
    const actors = Array.from(game.actors ?? [])
      .filter((actor) => MANAGED_ACTOR_TYPES.has(actor?.type) || actor?.system?.isDroid === true || actor?.system?.isVehicle === true);

    const activeIds = new Set(Array.from(game.combat?.combatants ?? []).map((combatant) => combatant?.actor?.id).filter(Boolean));
    return actors.sort((a, b) => {
      const combatDelta = Number(activeIds.has(b.id)) - Number(activeIds.has(a.id));
      if (combatDelta !== 0) return combatDelta;
      const typeDelta = this.getTypeRank(a) - this.getTypeRank(b);
      if (typeDelta !== 0) return typeDelta;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }

  static buildTargetModes(cards) {
    return [
      {
        id: 'party',
        label: 'Whole Party',
        description: 'Player-owned party actors. Droids/vehicles remain excluded from rest benefits.',
        count: cards.filter((card) => card.partyActor).length
      },
      {
        id: 'selected',
        label: 'Checked Actors',
        description: 'Only actors checked in the roster cards.',
        count: 0
      },
      {
        id: 'active-combat',
        label: 'Active Combatants',
        description: 'Actors currently present in the active combat tracker.',
        count: cards.filter((card) => card.inCombat).length
      },
      {
        id: 'all-managed',
        label: 'All Managed Roster',
        description: 'Every visible managed actor in this recovery console.',
        count: cards.length
      }
    ];
  }

  static getPartyActors() {
    return this.getManagedActors().filter((actor) => this.isPartyActor(actor));
  }

  static isPartyActor(actor) {
    if (!actor) return false;
    if (actor.hasPlayerOwner === true) return true;
    if (this.getOwnerNames(actor).length > 0) return true;
    // Character actors without a current owner are still treated as party candidates
    // so a GM can recover newly-created or unassigned PCs from the party target.
    return actor.type === 'character';
  }

  static resolveTargetActors({ targetMode = 'party', actorIds = [] } = {}) {
    const ids = Array.isArray(actorIds) ? actorIds.filter(Boolean).map(String) : [];
    const selectedActors = ids.map((id) => game.actors?.get(id)).filter(Boolean);
    let actors;
    let label;

    switch (targetMode) {
      case 'selected':
        actors = selectedActors;
        label = selectedActors.length === 1 ? selectedActors[0].name : `${selectedActors.length} checked actors`;
        break;
      case 'active-combat':
        actors = this.getActiveCombatActors();
        label = 'active combatants';
        break;
      case 'all-managed':
        actors = this.getManagedActors();
        label = 'all managed roster actors';
        break;
      case 'party':
      default:
        actors = this.getPartyActors();
        label = 'whole party';
        break;
    }

    const unique = [];
    const seen = new Set();
    for (const actor of actors ?? []) {
      if (!actor?.id || seen.has(actor.id)) continue;
      seen.add(actor.id);
      unique.push(actor);
    }

    return {
      targetMode,
      actorIds: unique.map((actor) => actor.id),
      actors: unique,
      label,
      count: unique.length
    };
  }

  static getTypeRank(actor) {
    if (this.isDroid(actor)) return 2;
    if (this.isVehicle(actor)) return 3;
    if (actor?.type === 'npc') return 1;
    return 0;
  }

  static buildActorCard(actor) {
    const hp = actor.system?.hp ?? {};
    const hpValue = safeNumber(hp.value, 0);
    const hpMax = safeNumber(hp.max, 0);
    const hpTemp = safeNumber(hp.temp ?? hp.temporary, 0);
    const conditionCurrent = safeNumber(actor.system?.conditionTrack?.current, 0);
    const conditionPersistent = actor.system?.conditionTrack?.persistent === true;
    const swUses = safeNumber(actor.system?.secondWind?.uses, 0);
    const swMax = safeNumber(actor.system?.secondWind?.max, 0);
    const isDroid = this.isDroid(actor);
    const isVehicle = this.isVehicle(actor);
    const inCombat = Array.from(game.combat?.combatants ?? []).some((combatant) => combatant?.actor?.id === actor.id);
    const wounded = hpMax > 0 && hpValue > 0 && hpValue < hpMax;
    const downed = hpMax > 0 && hpValue <= 0;
    const ctImpaired = conditionCurrent > 0;
    const swSpent = swMax > 0 && swUses < swMax;
    const restEligible = this.isRestEligible(actor);
    const repairEligible = isDroid || isVehicle;
    const kind = isDroid ? 'droid' : (isVehicle ? 'vehicle' : 'organic');
    const ownerNames = this.getOwnerNames(actor);
    const partyActor = this.isPartyActor(actor);
    const activeStatusEffects = this.getActorStatusEffects(actor);
    const activeEffects = Array.from(actor.effects ?? []).map((effect) => ({
      id: effect.id,
      name: effect.name ?? effect.label ?? 'Effect',
      disabled: effect.disabled === true
    }));

    return {
      id: actor.id,
      uuid: actor.uuid,
      name: actor.name,
      img: actor.img,
      type: actor.type,
      typeLabel: this.getTypeLabel(actor),
      kind,
      kindLabel: isDroid ? 'Droid' : (isVehicle ? 'Vehicle / Ship' : 'Organic'),
      ownerLabel: ownerNames.length ? ownerNames.join(', ') : 'GM / unassigned',
      partyActor,
      hpValue,
      hpMax,
      hpTemp,
      hpPercent: clampPercent(hpValue, hpMax),
      hpLabel: hpMax > 0 ? `${hpValue}/${hpMax}` : '—',
      conditionCurrent,
      conditionLabel: conditionCurrent > 0 ? `-${conditionCurrent}` : '0',
      conditionPersistent,
      conditionTone: conditionPersistent ? 'critical' : (conditionCurrent > 0 ? 'warning' : 'stable'),
      secondWindUses: swUses,
      secondWindMax: swMax,
      secondWindLabel: swMax > 0 ? `${swUses}/${swMax}` : '—',
      secondWindSpent: swSpent,
      inCombat,
      wounded,
      downed,
      ctImpaired,
      restEligible,
      repairEligible,
      isDroid,
      isVehicle,
      activeEffects,
      activeEffectCount: activeEffects.length,
      activeStatusEffects,
      activeStatusEffectCount: activeStatusEffects.length,
      needsAttention: wounded || downed || ctImpaired || conditionPersistent || swSpent,
      statusChips: this.buildStatusChips({ inCombat, wounded, downed, ctImpaired, conditionPersistent, swSpent, restEligible, repairEligible, isDroid, isVehicle }),
      restNote: this.getRestNote(actor),
      actionTone: downed ? 'critical' : (ctImpaired || wounded || swSpent ? 'warning' : 'stable')
    };
  }

  static buildStatusChips(flags) {
    const chips = [];
    if (flags.inCombat) chips.push({ label: 'Combat', tone: 'info' });
    if (flags.downed) chips.push({ label: 'Down / Disabled', tone: 'critical' });
    if (flags.wounded) chips.push({ label: 'Wounded', tone: 'warning' });
    if (flags.ctImpaired) chips.push({ label: 'CT Impaired', tone: 'warning' });
    if (flags.conditionPersistent) chips.push({ label: 'Persistent CT', tone: 'critical' });
    if (flags.swSpent) chips.push({ label: 'Second Wind Spent', tone: 'info' });
    if (flags.isDroid) chips.push({ label: 'No Rest: Droid', tone: 'muted' });
    if (flags.isVehicle) chips.push({ label: 'No Rest: Vehicle', tone: 'muted' });
    if (flags.restEligible) chips.push({ label: 'Rest Eligible', tone: 'stable' });
    if (flags.repairEligible) chips.push({ label: 'Repair Only', tone: 'info' });
    if (!chips.length) chips.push({ label: 'Nominal', tone: 'stable' });
    return chips;
  }

  static buildStatusEffectOptions() {
    try {
      return StatusEffectsMechanics.getAvailableEffects()
        .map((effect) => ({
          id: effect.id,
          name: effect.name || effect.id,
          description: effect.description || '',
          label: effect.description ? `${effect.name || effect.id} - ${effect.description}` : (effect.name || effect.id)
        }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    } catch (err) {
      SWSELogger.warn('[GMCombatRecoveryService] Could not build status effect options:', err);
      return [];
    }
  }

  static getActorStatusEffects(actor) {
    const available = new Map(this.buildStatusEffectOptions().map((effect) => [String(effect.id), effect]));
    return Array.from(actor?.effects ?? [])
      .map((effect) => {
        const effectId = effect?.getFlag?.(SYSTEM_ID, 'statusEffect')
          ?? effect?.flags?.[SYSTEM_ID]?.statusEffect
          ?? effect?.flags?.swse?.statusEffect
          ?? (Array.isArray(effect?.statuses) ? effect.statuses.find((status) => available.has(String(status))) : null);
        if (!effectId) return null;
        const definition = available.get(String(effectId));
        return {
          id: String(effectId),
          effectId: String(effectId),
          documentId: effect.id,
          name: definition?.name || effect.name || effect.label || String(effectId),
          description: definition?.description || '',
          disabled: effect.disabled === true
        };
      })
      .filter(Boolean);
  }

  static findStatusEffect(effectId) {
    if (!effectId) return null;
    return this.buildStatusEffectOptions().find((effect) => String(effect.id) === String(effectId)) ?? null;
  }

  static async applyStatusEffectToActors({ actors = [], target = null, effectId = '' } = {}) {
    const effect = this.findStatusEffect(effectId);
    if (!effect) return { success: false, error: 'Choose a valid status effect to apply.' };

    const affected = [];
    const skipped = [];
    for (const actor of actors) {
      if (!actor) continue;
      try {
        if (StatusEffectsMechanics.hasEffect(actor, effect.id)) {
          skipped.push({ id: actor.id, name: actor.name, reason: 'already_active' });
          continue;
        }
        const applied = await StatusEffectsMechanics.applyEffect(actor, effect.id);
        if (applied) affected.push({ id: actor.id, name: actor.name, effectId: effect.id });
        else skipped.push({ id: actor.id, name: actor.name, reason: 'apply_failed' });
      } catch (err) {
        skipped.push({ id: actor.id, name: actor.name, reason: err.message || 'apply_failed' });
      }
    }

    Hooks.callAll('swseGmCombatRecoveryCompleted', {
      action: 'apply-status-effect',
      target,
      effectId: effect.id,
      affected,
      skipped
    });

    const targetLabel = target?.label ? ` to ${target.label}` : '';
    return {
      success: true,
      action: 'apply-status-effect',
      target,
      effect,
      affected,
      skipped,
      message: `Applied ${effect.name}${targetLabel}: ${affected.length} affected, ${skipped.length} skipped.`
    };
  }

  static async removeStatusEffectFromActors({ actors = [], target = null, effectId = '' } = {}) {
    const effect = this.findStatusEffect(effectId);
    if (!effect) return { success: false, error: 'Choose a valid status effect to remove.' };

    const affected = [];
    const skipped = [];
    for (const actor of actors) {
      if (!actor) continue;
      try {
        if (!StatusEffectsMechanics.hasEffect(actor, effect.id)) {
          skipped.push({ id: actor.id, name: actor.name, reason: 'not_active' });
          continue;
        }
        const removed = await StatusEffectsMechanics.removeEffect(actor, effect.id);
        if (removed) affected.push({ id: actor.id, name: actor.name, effectId: effect.id });
        else skipped.push({ id: actor.id, name: actor.name, reason: 'remove_failed' });
      } catch (err) {
        skipped.push({ id: actor.id, name: actor.name, reason: err.message || 'remove_failed' });
      }
    }

    Hooks.callAll('swseGmCombatRecoveryCompleted', {
      action: 'remove-status-effect',
      target,
      effectId: effect.id,
      affected,
      skipped
    });

    const targetLabel = target?.label ? ` from ${target.label}` : '';
    return {
      success: true,
      action: 'remove-status-effect',
      target,
      effect,
      affected,
      skipped,
      message: `Removed ${effect.name}${targetLabel}: ${affected.length} affected, ${skipped.length} skipped.`
    };
  }

  static async clearStatusEffectsFromActors({ actors = [], target = null } = {}) {
    const available = new Set(this.buildStatusEffectOptions().map((effect) => String(effect.id)));
    if (!available.size) return { success: false, error: 'Status effects are disabled or no status effect list is available.' };

    const affected = [];
    const skipped = [];
    for (const actor of actors) {
      if (!actor) continue;
      const ids = Array.from(actor.effects ?? [])
        .filter((effect) => {
          const effectId = effect?.getFlag?.(SYSTEM_ID, 'statusEffect')
            ?? effect?.flags?.[SYSTEM_ID]?.statusEffect
            ?? effect?.flags?.swse?.statusEffect
            ?? (Array.isArray(effect?.statuses) ? effect.statuses.find((status) => available.has(String(status))) : null);
          return effectId && available.has(String(effectId));
        })
        .map((effect) => effect.id)
        .filter(Boolean);
      if (!ids.length) {
        skipped.push({ id: actor.id, name: actor.name, reason: 'no_status_effects' });
        continue;
      }
      try {
        await ActorEngine.deleteActiveEffects(actor, ids, { source: 'gm-combat-recovery-clear-status-effects' });
        affected.push({ id: actor.id, name: actor.name, removed: ids.length });
      } catch (err) {
        skipped.push({ id: actor.id, name: actor.name, reason: err.message || 'clear_failed' });
      }
    }

    Hooks.callAll('swseGmCombatRecoveryCompleted', {
      action: 'clear-status-effects',
      target,
      affected,
      skipped
    });

    const targetLabel = target?.label ? ` from ${target.label}` : '';
    const removedCount = affected.reduce((sum, row) => sum + safeNumber(row.removed, 0), 0);
    return {
      success: true,
      action: 'clear-status-effects',
      target,
      affected,
      skipped,
      message: `Cleared ${removedCount} status effect${removedCount === 1 ? '' : 's'}${targetLabel}: ${affected.length} actor${affected.length === 1 ? '' : 's'} affected, ${skipped.length} skipped.`
    };
  }

  static buildMetrics(cards) {
    return {
      total: cards.length,
      activeCombatants: cards.filter((card) => card.inCombat).length,
      wounded: cards.filter((card) => card.wounded).length,
      downed: cards.filter((card) => card.downed).length,
      conditionImpaired: cards.filter((card) => card.ctImpaired).length,
      persistentCondition: cards.filter((card) => card.conditionPersistent).length,
      secondWindSpent: cards.filter((card) => card.secondWindSpent).length,
      restEligible: cards.filter((card) => card.restEligible).length,
      droids: cards.filter((card) => card.isDroid).length,
      vehicles: cards.filter((card) => card.isVehicle).length,
      needsAttention: cards.filter((card) => card.needsAttention).length,
      actionable: cards.filter((card) => card.needsAttention || card.inCombat).length
    };
  }

  static buildRuleSummary() {
    const recoveryEnabled = HealingRules.recoveryEnabled();
    const requiresFullRest = HealingRules.recoveryRequiresFullRest();
    const secondWindLabel = SecondWindEngine.getRecoveryLabel?.() ?? 'Campaign setting';

    return {
      recoveryEnabled,
      recoveryLabel: recoveryEnabled ? 'Recovery enabled' : 'Recovery disabled',
      recoveryHpType: HealingRules.getRecoveryHPType(),
      recoveryRequiresFullRest: requiresFullRest,
      recoveryRestLabel: requiresFullRest ? 'HP recovery requires extended rest' : 'HP recovery can apply after short or extended rest',
      vitalityEnabled: HealingRules.recoveryVitalityEnabled(),
      secondWindLabel,
      droidRestBoundary: 'Droids and vehicles are excluded from rest recovery. Use repair/reboot actions instead.'
    };
  }

  static getOwnerNames(actor) {
    return Array.from(game.users ?? [])
      .filter((user) => !user.isGM && (user.character?.id === actor.id || Number(actor.ownership?.[user.id] ?? 0) >= 3))
      .map((user) => user.name)
      .filter(Boolean);
  }

  static getTypeLabel(actor) {
    if (this.isDroid(actor)) return 'Droid';
    if (this.isVehicle(actor)) return actor.type === 'vehicle' ? 'Vehicle / Ship' : 'Vehicle';
    if (actor.type === 'npc') return 'NPC';
    if (actor.type === 'beast') return 'Beast';
    return 'Character';
  }

  static isDroid(actor) {
    return actor?.type === 'droid' || actor?.system?.isDroid === true || actor?.system?.details?.species?.toString?.().toLowerCase?.() === 'droid';
  }

  static isVehicle(actor) {
    return actor?.type === 'vehicle' || actor?.type === 'starship' || actor?.system?.isVehicle === true || actor?.system?.isStarship === true;
  }

  static isRestEligible(actor) {
    if (!actor) return false;
    if (this.isDroid(actor) || this.isVehicle(actor)) return false;
    if (!['character', 'npc', 'beast'].includes(actor.type)) return false;
    const hpValue = safeNumber(actor.system?.hp?.value, 0);
    return hpValue > 0;
  }

  static getRestNote(actor) {
    if (this.isDroid(actor)) return 'Droids cannot benefit from resting. Use repair/reboot actions.';
    if (this.isVehicle(actor)) return 'Vehicles and ships cannot benefit from organic rest. Use repair actions.';
    if (!this.isRestEligible(actor)) return 'Not currently eligible for natural rest recovery.';
    return 'Eligible for organic rest recovery.';
  }

  static async executeGroupAction(action, options = {}) {
    if (!game.user?.isGM) return { success: false, error: 'Only GMs can use combat recovery actions.' };

    const target = this.resolveTargetActors(options);
    if (!target.actors.length) {
      return { success: false, error: 'No actors matched the selected combat recovery target.' };
    }

    switch (action) {
      case 'natural-healing':
        return this.triggerNaturalHealing({ actors: target.actors, target });
      case 'heal-target':
        return this.applyHitPointDeltaToActors({ actors: target.actors, target, amount: options.amount, mode: 'heal' });
      case 'repair-target':
        return this.applyHitPointDeltaToActors({ actors: target.actors, target, amount: options.amount, mode: 'repair' });
      case 'damage-target':
        return this.applyHitPointDeltaToActors({ actors: target.actors, target, amount: options.amount, mode: 'damage' });
      case 'apply-status-effect':
        return this.applyStatusEffectToActors({ actors: target.actors, target, effectId: options.effectId });
      case 'remove-status-effect':
        return this.removeStatusEffectFromActors({ actors: target.actors, target, effectId: options.effectId });
      case 'clear-status-effects':
        return this.clearStatusEffectsFromActors({ actors: target.actors, target });
      case 'short-rest':
        return this.performRest({ restType: 'short-rest', isFullRest: false, duration: 60, actors: target.actors, target, ...options });
      case 'extended-rest':
        return this.performRest({ restType: 'extended-rest', isFullRest: true, duration: 480, actors: target.actors, target, ...options });
      case 'encounter-reset':
        return this.resetSecondWindForActors({ triggerEvent: 'encounter', actors: target.actors, restTriggered: false, target });
      case 'reset-condition':
        return this.resetConditionForActors({ actors: target.actors, target });
      case 'reset-second-wind':
        return this.resetSecondWindForActors({ triggerEvent: 'gm-override', actors: target.actors, restTriggered: false, ignoreTiming: true, target });
      case 'full-organic-recovery':
        return this.fullOrganicRecovery({ actors: target.actors, target });
      default:
        return { success: false, error: `Unknown combat recovery group action: ${action}` };
    }
  }

  static async triggerNaturalHealing({ actors = this.getPartyActors(), target = null } = {}) {
    const result = await GMHealingTrigger.triggerNaturalHealing({
      actors,
      isFullRest: true,
      skipHolonetNotification: false,
      skipMechanicalRecoveryHook: true
    });
    const targetLabel = target?.label ? ` for ${target.label}` : '';
    return {
      success: result.success !== false,
      action: 'natural-healing',
      target,
      healed: result.healed ?? [],
      skipped: result.skipped ?? [],
      message: result.error || `Natural healing${targetLabel} complete: ${result.totalHealed ?? 0} healed, ${result.totalSkipped ?? 0} skipped.`
    };
  }

  static async applyHitPointDeltaToActors({ actors = [], target = null, amount = 0, mode = 'heal' } = {}) {
    const value = Math.max(0, safeNumber(amount, 0));
    if (value <= 0) return { success: false, error: 'Enter a positive HP amount for the target action.' };

    const affected = [];
    const skipped = [];
    const targetLabel = target?.label ? ` for ${target.label}` : '';

    for (const actor of actors) {
      if (!actor) continue;
      try {
        if (mode === 'heal') {
          if (this.isDroid(actor) || this.isVehicle(actor)) {
            skipped.push({ id: actor.id, name: actor.name, reason: 'repair_required' });
            continue;
          }
          const result = await ActorEngine.applyHealing(actor, value, 'gm-combat-recovery-target-heal');
          affected.push({ id: actor.id, name: actor.name, hp: result.applied ?? value });
        } else if (mode === 'repair') {
          if (!this.isDroid(actor) && !this.isVehicle(actor)) {
            skipped.push({ id: actor.id, name: actor.name, reason: 'organic_healing_required' });
            continue;
          }
          const result = await ActorEngine.applyHealing(actor, value, 'gm-combat-recovery-target-repair');
          affected.push({ id: actor.id, name: actor.name, hp: result.applied ?? value });
        } else if (mode === 'damage') {
          const result = await ActorEngine.applyDamage(actor, {
            amount: value,
            type: 'gm-override',
            source: 'gm-combat-recovery-target-damage'
          });
          affected.push({ id: actor.id, name: actor.name, hp: result.applied ?? value });
        }
      } catch (err) {
        skipped.push({ id: actor.id, name: actor.name, reason: err.message || `${mode}_failed` });
      }
    }

    Hooks.callAll('swseGmCombatRecoveryCompleted', {
      action: `${mode}-target`,
      target,
      amount: value,
      affected,
      skipped
    });

    const verb = mode === 'repair' ? 'Repair' : (mode === 'damage' ? 'Damage' : 'Heal');
    return {
      success: true,
      action: `${mode}-target`,
      target,
      affected,
      skipped,
      message: `${verb} target${targetLabel}: ${affected.length} affected, ${skipped.length} skipped.`
    };
  }

  static async performRest({ restType, isFullRest, duration, actors = this.getPartyActors(), target = null }) {
    const healed = [];
    const skipped = [];
    const canApplyHpRecovery = HealingRules.recoveryEnabled() && (isFullRest || !HealingRules.recoveryRequiresFullRest());

    if (canApplyHpRecovery) {
      const { RecoveryMechanics } = await import('/systems/foundryvtt-swse/scripts/houserules/houserule-recovery.js');
      for (const actor of actors) {
        if (!this.isRestEligible(actor)) {
          skipped.push({ id: actor.id, name: actor.name, reason: this.getRestSkipReason(actor) });
          continue;
        }
        try {
          const beforeHp = safeNumber(actor.system?.hp?.value, 0);
          const result = await RecoveryMechanics.performRecovery(actor, { source: `gm-combat-recovery-${restType}` });
          const afterHp = safeNumber(actor.system?.hp?.value, beforeHp);
          if (result?.success) {
            healed.push({
              id: actor.id,
              name: actor.name,
              hpRecovered: Math.max(0, afterHp - beforeHp),
              vitalityRecovered: result.vitalityRecovered ?? 0
            });
          } else {
            skipped.push({ id: actor.id, name: actor.name, reason: result?.message || result?.error || 'recovery_failed' });
          }
        } catch (err) {
          SWSELogger.error(`[GMCombatRecoveryService] Rest recovery failed for ${actor.name}:`, err);
          skipped.push({ id: actor.id, name: actor.name, reason: err.message || 'error' });
        }
      }
    } else {
      for (const actor of actors) {
        if (!this.isRestEligible(actor)) skipped.push({ id: actor.id, name: actor.name, reason: this.getRestSkipReason(actor) });
      }
    }

    const secondWind = await this.resetSecondWindForActors({
      triggerEvent: restType,
      actors,
      restTriggered: true,
      target
    });

    Hooks.callAll('restCompleted', {
      isFullRest,
      duration,
      restType,
      triggeredByGM: true,
      triggerTime: Date.now(),
      skipMechanicalRecovery: true,
      actorIds: actors.map(actor => actor?.id).filter(Boolean),
      healed,
      skipped,
      secondWind
    });

    Hooks.callAll('swseGmCombatRecoveryCompleted', {
      action: restType,
      isFullRest,
      duration,
      target,
      healed,
      skipped,
      secondWind
    });

    const targetLabel = target?.label ? ` for ${target.label}` : '';
    return {
      success: true,
      action: restType,
      target,
      healed,
      skipped,
      secondWind,
      message: `${isFullRest ? 'Extended' : 'Short'} rest${targetLabel} resolved: ${healed.length} recovered, ${secondWind.updated ?? 0} second wind reset, ${skipped.length} skipped.`
    };
  }

  static async resetConditionForActors({ actors = [], target = null } = {}) {
    let updated = 0;
    let skipped = 0;
    const details = [];

    for (const actor of actors) {
      if (!actor) {
        skipped += 1;
        continue;
      }
      try {
        await ActorEngine.setConditionStep(actor, 0, 'gm-combat-recovery-target-reset-condition');
        updated += 1;
        details.push({ id: actor.id, name: actor.name, reset: true });
      } catch (err) {
        skipped += 1;
        details.push({ id: actor.id, name: actor.name, reason: err.message || 'reset_condition_failed' });
      }
    }

    const targetLabel = target?.label ? ` for ${target.label}` : '';
    return {
      success: true,
      action: 'reset-condition',
      target,
      updated,
      skipped,
      details,
      message: `Condition reset${targetLabel}: ${updated} updated, ${skipped} skipped.`
    };
  }

  static async resetSecondWindForActors({ triggerEvent, actors, restTriggered = false, ignoreTiming = false, target = null }) {
    if (!ignoreTiming && !SecondWindEngine.shouldResetSecondWind(triggerEvent)) {
      return { success: true, updated: 0, skipped: actors.length, reason: `Second Wind does not reset on ${triggerEvent}.`, message: `Second Wind does not reset on ${triggerEvent}.` };
    }

    let updated = 0;
    let skipped = 0;
    const details = [];

    for (const actor of actors) {
      if (!actor) {
        skipped += 1;
        continue;
      }
      if (restTriggered && (this.isDroid(actor) || this.isVehicle(actor))) {
        skipped += 1;
        details.push({ id: actor.id, name: actor.name, reason: 'rest_excluded_droid_or_vehicle' });
        continue;
      }
      try {
        await ActorEngine.resetSecondWind(actor);
        updated += 1;
        details.push({ id: actor.id, name: actor.name, reset: true });
      } catch (err) {
        skipped += 1;
        details.push({ id: actor.id, name: actor.name, reason: err.message || 'reset_failed' });
      }
    }

    const targetLabel = target?.label ? ` for ${target.label}` : '';
    return { success: true, updated, skipped, details, target, message: `Second Wind reset${targetLabel}: ${updated} updated, ${skipped} skipped.` };
  }

  static getActiveCombatActors() {
    return Array.from(game.combat?.combatants ?? [])
      .map((combatant) => combatant?.actor)
      .filter(Boolean);
  }

  static async fullOrganicRecovery({ actors = this.getPartyActors(), target = null } = {}) {
    const recovered = [];
    const skipped = [];

    for (const actor of actors) {
      if (!this.isRestEligible(actor)) {
        skipped.push({ id: actor.id, name: actor.name, reason: this.getRestSkipReason(actor) });
        continue;
      }

      try {
        const hpValue = safeNumber(actor.system?.hp?.value, 0);
        const hpMax = safeNumber(actor.system?.hp?.max, 0);
        const healAmount = Math.max(0, hpMax - hpValue);
        if (healAmount > 0) await ActorEngine.applyHealing(actor, healAmount, 'gm-combat-full-organic-recovery');
        await ActorEngine.setConditionStep(actor, 0, 'gm-combat-full-organic-recovery');
        await ActorEngine.resetSecondWind(actor);
        recovered.push({ id: actor.id, name: actor.name, hpRecovered: healAmount });
      } catch (err) {
        skipped.push({ id: actor.id, name: actor.name, reason: err.message || 'full_recovery_failed' });
      }
    }

    Hooks.callAll('swseGmCombatRecoveryCompleted', {
      action: 'full-organic-recovery',
      target,
      recovered,
      skipped
    });

    const targetLabel = target?.label ? ` for ${target.label}` : '';
    return {
      success: true,
      action: 'full-organic-recovery',
      target,
      healed: recovered,
      skipped,
      message: `GM full organic recovery${targetLabel} complete: ${recovered.length} recovered, ${skipped.length} skipped.`
    };
  }

  static getRestSkipReason(actor) {
    if (this.isDroid(actor)) return 'droid_no_rest_recovery';
    if (this.isVehicle(actor)) return 'vehicle_no_rest_recovery';
    if (!['character', 'npc', 'beast'].includes(actor?.type)) return 'unsupported_actor_type';
    if (safeNumber(actor?.system?.hp?.value, 0) <= 0) return 'not_alive_or_disabled';
    return 'not_eligible';
  }

  static async executeActorAction(actorId, action, { amount = 0 } = {}) {
    if (!game.user?.isGM) return { success: false, error: 'Only GMs can use combat recovery actions.' };
    const actor = game.actors?.get(actorId);
    if (!actor) return { success: false, error: 'Actor not found.' };

    const value = Math.max(0, safeNumber(amount, 0));

    try {
      switch (action) {
        case 'heal': {
          if (this.isDroid(actor) || this.isVehicle(actor)) {
            return { success: false, error: `${actor.name} cannot receive organic healing. Use Repair instead.` };
          }
          const result = await ActorEngine.applyHealing(actor, value, 'gm-combat-recovery-heal');
          return { success: true, message: `${actor.name} healed ${result.applied ?? value} HP.` };
        }
        case 'repair': {
          if (!this.isDroid(actor) && !this.isVehicle(actor)) {
            return { success: false, error: `${actor.name} is not a droid or vehicle. Use Heal instead.` };
          }
          const result = await ActorEngine.applyHealing(actor, value, 'gm-combat-recovery-repair');
          return { success: true, message: `${actor.name} repaired ${result.applied ?? value} HP.` };
        }
        case 'damage': {
          const result = await ActorEngine.applyDamage(actor, {
            amount: value,
            type: 'gm-override',
            source: 'gm-combat-recovery-damage'
          });
          return { success: true, message: `${actor.name} took ${result.applied ?? value} HP damage.` };
        }
        case 'improve-condition': {
          await ActorEngine.applyConditionShift(actor, -1, 'gm-combat-recovery');
          return { success: true, message: `${actor.name} condition improved.` };
        }
        case 'worsen-condition': {
          await ActorEngine.applyConditionShift(actor, 1, 'gm-combat-recovery');
          return { success: true, message: `${actor.name} condition worsened.` };
        }
        case 'reset-condition': {
          await ActorEngine.setConditionStep(actor, 0, 'gm-combat-recovery-reset-condition');
          return { success: true, message: `${actor.name} condition track reset.` };
        }
        case 'reset-second-wind': {
          await ActorEngine.resetSecondWind(actor);
          return { success: true, message: `${actor.name} second wind reset.` };
        }
        case 'repair-full': {
          if (!this.isDroid(actor) && !this.isVehicle(actor)) {
            return { success: false, error: `${actor.name} is not a droid or vehicle.` };
          }
          const hpValue = safeNumber(actor.system?.hp?.value, 0);
          const hpMax = safeNumber(actor.system?.hp?.max, 0);
          const amountToRepair = Math.max(0, hpMax - hpValue);
          if (amountToRepair > 0) await ActorEngine.applyHealing(actor, amountToRepair, 'gm-combat-recovery-repair-full');
          await ActorEngine.setConditionStep(actor, 0, 'gm-combat-recovery-repair-full');
          return { success: true, message: `${actor.name} repaired to full operational status.` };
        }
        case 'apply-status-effect':
          return this.applyStatusEffectToActors({ actors: [actor], target: { label: actor.name, actors: [actor] }, effectId: options.effectId });
        case 'remove-status-effect':
          return this.removeStatusEffectFromActors({ actors: [actor], target: { label: actor.name, actors: [actor] }, effectId: options.effectId });
        case 'clear-status-effects':
          return this.clearStatusEffectsFromActors({ actors: [actor], target: { label: actor.name, actors: [actor] } });
        case 'short-rest':
          return this.executeGroupAction('short-rest', { targetMode: 'selected', actorIds: [actor.id] });
        case 'extended-rest':
          return this.executeGroupAction('extended-rest', { targetMode: 'selected', actorIds: [actor.id] });
        case 'encounter-reset':
          return this.executeGroupAction('encounter-reset', { targetMode: 'selected', actorIds: [actor.id] });
        case 'full-organic-recovery':
          return this.executeGroupAction('full-organic-recovery', { targetMode: 'selected', actorIds: [actor.id] });
        default:
          return { success: false, error: `Unknown actor action: ${action}` };
      }
    } catch (err) {
      SWSELogger.error(`[GMCombatRecoveryService] Actor action ${action} failed for ${actor.name}:`, err);
      return { success: false, error: err.message || String(err) };
    }
  }
}

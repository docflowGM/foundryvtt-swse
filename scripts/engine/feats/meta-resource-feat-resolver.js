/**
 * MetaResourceFeatResolver
 *
 * Small feat-rule bridge for resources that already have canonical engines
 * elsewhere: Force Points, Destiny Points, and Second Wind. This module does
 * not spend resources or create new resource systems. It reads explicit feat
 * metadata first, then falls back to narrow feat-name checks for older pack
 * rows that have not been normalized yet.
 */

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function getActorFeatItems(actor) {
  if (!actor?.items) return [];
  const items = typeof actor.items.filter === 'function'
    ? actor.items.filter(item => item?.type === 'feat')
    : Array.from(actor.items).filter(item => item?.type === 'feat');
  return items.filter(item => item?.system?.disabled !== true);
}



function actorForcePoints(actor) {
  return Number(actor?.system?.forcePoints?.value ?? actor?.system?.forcePoints ?? 0) || 0;
}

function buildRollJson(roll) {
  try { return typeof roll?.toJSON === 'function' ? roll.toJSON() : null; }
  catch (_err) { return null; }
}

function getForcePowerItems(actor) {
  try {
    return Array.from(actor?.items ?? []).filter(item => item?.type === 'force-power');
  } catch (_err) {
    return [];
  }
}

function getResourceRules(item, key) {
  const resourceRules = item?.system?.abilityMeta?.resourceRules;
  if (!resourceRules || typeof resourceRules !== 'object') return [];
  const rules = resourceRules[key];
  return Array.isArray(rules) ? rules : [];
}

export class MetaResourceFeatResolver {
  static getFeatItems(actor) {
    return getActorFeatItems(actor);
  }

  static hasFeat(actor, featName) {
    const target = normalizeName(featName);
    return getActorFeatItems(actor).some(item => normalizeName(item?.name) === target);
  }

  static countFeat(actor, featName) {
    const target = normalizeName(featName);
    return getActorFeatItems(actor).filter(item => normalizeName(item?.name) === target).length;
  }

  static getForcePointMaxBonus(actor) {
    let total = 0;
    for (const item of getActorFeatItems(actor)) {
      const rules = getResourceRules(item, 'forcePoints');
      for (const rule of rules) {
        if (rule?.type !== 'MAX_BONUS') continue;
        const value = Number(rule.value ?? 0);
        if (Number.isFinite(value)) total += value;
      }
    }

    // Compatibility fallback for unnormalized actors/packs.
    if (!total && this.hasFeat(actor, 'Force Boon')) total += 3;
    return total;
  }

  static getForcePointDieSize(actor) {
    let dieSize = 6;
    for (const item of getActorFeatItems(actor)) {
      const rules = getResourceRules(item, 'forcePoints');
      for (const rule of rules) {
        if (rule?.type !== 'DIE_SIZE') continue;
        const value = Number(rule.value ?? rule.dieSize ?? 0);
        if (Number.isFinite(value)) dieSize = Math.max(dieSize, value);
      }
    }

    if (this.hasFeat(actor, 'Strong in the Force')) dieSize = Math.max(dieSize, 8);
    return dieSize;
  }

  static getSecondWindRules(actor) {
    const rules = {
      extraUseMultiplier: 0,
      allowAboveHalfHp: false,
      ignoreEncounterCap: false,
      freeAction: false,
      conditionRecoverySteps: 0,
      regainForcePowerOnUse: false,
      grantMoveActionOnUse: false,
      grantMovementOnUse: false,
      displayNotes: []
    };

    for (const item of getActorFeatItems(actor)) {
      const itemRules = getResourceRules(item, 'secondWind');
      for (const rule of itemRules) {
        switch (rule?.type) {
          case 'EXTRA_DAILY_USE_MULTIPLIER':
            rules.extraUseMultiplier += Number(rule.value ?? 1) || 1;
            break;
          case 'ALLOW_ABOVE_HALF_HP':
            rules.allowAboveHalfHp = true;
            break;
          case 'IGNORE_ENCOUNTER_CAP':
            rules.ignoreEncounterCap = true;
            break;
          case 'ACTION_COST':
            if (rule.action === 'free') rules.freeAction = true;
            break;
          case 'CONDITION_RECOVERY_ON_USE':
            rules.conditionRecoverySteps += Number(rule.steps ?? 1) || 1;
            break;
          case 'REGAIN_FORCE_POWER_ON_USE':
            rules.regainForcePowerOnUse = true;
            break;
          case 'GRANT_MOVE_ACTION_ON_USE':
            rules.grantMoveActionOnUse = true;
            break;
          case 'GRANT_MOVEMENT_ON_USE':
            rules.grantMovementOnUse = true;
            break;
          case 'DISPLAY_NOTE':
            if (rule.note) rules.displayNotes.push({ sourceName: item.name, note: rule.note });
            break;
          default:
            break;
        }
      }
    }

    // Compatibility fallbacks for unnormalized actors/packs (only for feats not yet normalized with resourceRules)
    if (this.hasFeat(actor, 'Vitality Surge')) rules.allowAboveHalfHp = true;
    if (this.hasFeat(actor, 'Fast Surge')) rules.freeAction = true;

    return rules;
  }

  /**
   * Read damage-based feat rules (e.g., condition track modifications on damage threshold)
   * @param {Actor} actor - Target actor
   * @returns {Object} Rules object with damage-based feat behaviors
   */
  static getDamageRules(actor) {
    const rules = {
      preventFirstThresholdExceedance: false,
      capIonDamageCtToOneStep: false
    };

    for (const item of getActorFeatItems(actor)) {
      const itemRules = getResourceRules(item, 'damage');
      for (const rule of itemRules) {
        switch (rule?.type) {
          case 'PREVENT_FIRST_THRESHOLD_EXCEEDANCE_PER_ENCOUNTER':
            rules.preventFirstThresholdExceedance = true;
            break;
          case 'CAP_ION_DAMAGE_CT_TO_1_STEP':
            rules.capIonDamageCtToOneStep = true;
            break;
          default:
            break;
        }
      }
    }

    return rules;
  }

  /**
   * Read condition track interaction feat rules
   * @param {Actor} actor - Target actor
   * @returns {Object} Rules object with condition track interaction behaviors
   */
  static getConditionTrackRules(actor) {
    const rules = {
      moveTargetCtOnCoupDeGrace: false,
      spendCtToReduceDamage: false,
      damageReductionAmount: 10,
      swiftActionConditionRecovery: false,
      swiftActionCost: 2
    };

    for (const item of getActorFeatItems(actor)) {
      const itemRules = getResourceRules(item, 'conditionTrack');
      for (const rule of itemRules) {
        switch (rule?.type) {
          case 'MOVE_TARGET_CT_ON_COUP_DE_GRACE':
            rules.moveTargetCtOnCoupDeGrace = true;
            break;
          case 'SPEND_CT_TO_REDUCE_DAMAGE':
            rules.spendCtToReduceDamage = true;
            rules.damageReductionAmount = Number(rule.damageReduction ?? 10);
            break;
          case 'SWIFT_ACTION_CONDITION_RECOVERY':
            rules.swiftActionConditionRecovery = true;
            rules.swiftActionCost = Number(rule.swiftActionCost ?? 2);
            break;
          default:
            break;
        }
      }
    }

    return rules;
  }

  static getAttackRerollRules(actor) {
    const rules = [];
    for (const item of getActorFeatItems(actor)) {
      const itemRules = item?.system?.abilityMeta?.attackRerolls;
      if (!Array.isArray(itemRules)) continue;
      for (const rule of itemRules) {
        if (rule?.type && String(rule.type).toUpperCase() !== 'ATTACK_REROLL') continue;
        rules.push({
          id: rule.id ?? `${item.id}-attack-reroll`,
          sourceId: item.id,
          sourceName: item.name,
          label: rule.label ?? item.name,
          cost: rule.cost ?? 'forcePoint',
          outcome: this.normalizeRerollOutcome(rule.outcome),
          description: rule.description ?? item.system?.description?.value ?? '',
          rule
        });
      }
    }
    if (!rules.length && this.hasFeat(actor, 'Instinctive Attack')) {
      const item = getActorFeatItems(actor).find(feat => normalizeName(feat?.name) === 'instinctive attack');
      rules.push({
        id: `${item?.id ?? 'instinctive-attack'}-attack-reroll`,
        sourceId: item?.id ?? '',
        sourceName: 'Instinctive Attack',
        label: 'Instinctive Attack',
        cost: 'forcePoint',
        outcome: 'keepBetter',
        description: 'Spend a Force Point to reroll an attack and take the better result.'
      });
    }
    return rules;
  }

  static buildAttackRerollChatOptions(actor, weapon, roll, context = {}) {
    const rules = this.getAttackRerollRules(actor);
    if (!rules.length || !roll) return [];
    const formula = roll.formula ?? context.formula ?? '1d20';
    const isHit = context.isHit;

    return rules
      .filter(rule => {
        // Filter based on trigger requirement
        const trigger = rule.rule?.trigger;
        if (trigger === 'missedAttack' && isHit !== false) {
          // Only show missed attack rerolls when attack actually missed
          return false;
        }
        return true;
      })
      .map(rule => ({
        ...rule,
        actorId: actor?.id ?? '',
        weaponId: weapon?.id ?? context.weaponId ?? '',
        originalTotal: roll.total,
        formula,
        outcomeLabel: rule.outcome === 'keepBetter' ? 'Keep better result' : 'Must accept reroll',
        canUse: rule.cost !== 'forcePoint' || actorForcePoints(actor) > 0,
        disabledReason: rule.cost === 'forcePoint' && actorForcePoints(actor) <= 0 ? 'No Force Points remaining' : null
      }));
  }

  static normalizeRerollOutcome(value) {
    const normalized = normalizeName(value).replace(/\s+/g, '');
    if (normalized === 'keepbetter' || normalized === 'better' || normalized === 'best') return 'keepBetter';
    return 'keepSecond';
  }

  static async resolveAttackRerollButton(button, { message = null } = {}) {
    if (!(button instanceof HTMLElement)) return null;
    const actor = game.actors?.get?.(button.dataset.actorId);
    if (!actor) {
      ui?.notifications?.warn?.('Attack reroll actor could not be resolved.');
      return null;
    }
    if (!actor.isOwner) {
      ui?.notifications?.warn?.('You do not control this actor.');
      return null;
    }

    const sourceName = button.dataset.sourceName || 'Attack Reroll';
    const cost = button.dataset.cost || 'forcePoint';
    if (cost === 'forcePoint' && actorForcePoints(actor) <= 0) {
      ui?.notifications?.warn?.(`${sourceName} requires a Force Point.`);
      return null;
    }

    const formula = button.dataset.formula || '1d20';
    const originalTotal = Number(button.dataset.originalTotal || 0);
    const outcome = this.normalizeRerollOutcome(button.dataset.outcome);
    const newRoll = await globalThis.SWSE?.RollEngine?.safeRoll?.(formula, actor.getRollData?.() ?? {}, {
      actor,
      domain: 'attack.reroll',
      context: { rerollSource: sourceName, sourceMessageId: message?.id ?? null }
    }) ?? await (await import('/systems/foundryvtt-swse/scripts/engine/roll-engine.js')).RollEngine.safeRoll(formula, actor.getRollData?.() ?? {});

    if (!newRoll) {
      ui?.notifications?.error?.('Attack reroll failed.');
      return null;
    }

    if (cost === 'forcePoint') {
      const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
      const spend = await ActorEngine.spendForcePoints(actor, 1);
      if (!spend?.spent) {
        ui?.notifications?.warn?.(`${sourceName} requires a Force Point.`);
        return null;
      }
    }

    const rerollTotal = Number(newRoll.total ?? 0);
    const finalTotal = outcome === 'keepBetter' ? Math.max(originalTotal, rerollTotal) : rerollTotal;
    const usedNew = finalTotal === rerollTotal;

    // Apply reflex defense penalty if applicable (Desperate Gambit)
    if (cost === 'reflexDefensePenalty' && button.dataset.rule) {
      const ruleData = JSON.parse(button.dataset.rule);
      const d20 = Number(button.dataset.d20 ?? 0);
      const isNat1 = d20 === 1;
      const penaltyValue = isNat1 ? -5 : -2;

      const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
      const existing = Array.isArray(actor.system?.activeEffects) ? actor.system.activeEffects : [];
      const effectId = `reflex-penalty-${normalizeName(sourceName)}`;
      const newEffect = {
        id: effectId,
        name: sourceName,
        target: 'defense.reflex',
        type: 'untyped',
        value: penaltyValue,
        roundsRemaining: 1,
        enabled: true,
        sourceId: button.dataset.sourceId,
        sourceName: sourceName,
        description: `${sourceName}: ${penaltyValue} to Reflex Defense for 1 round.${isNat1 ? ' (Natural 1 penalty)' : ''}`
      };
      const filtered = existing.filter(effect => !String(effect?.id ?? '').startsWith(effectId));
      await ActorEngine.updateActor(actor, { 'system.activeEffects': [...filtered, newEffect] });
    }

    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-check"></i> Reroll used';

    const { createChatMessage } = await import('/systems/foundryvtt-swse/scripts/core/document-api-v13.js');
    const rolls = buildRollJson(newRoll) ? [buildRollJson(newRoll)] : [];
    await createChatMessage({
      user: game.user?.id,
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="swse-chat-card swse-attack-reroll-card">
          <header class="card-header">
            <h3>${sourceName}: Attack Reroll</h3>
            <div class="card-subtitle">${cost === 'forcePoint' ? 'Force Point spent' : 'Reroll'}</div>
          </header>
          <div class="card-content">
            <div><strong>Original:</strong> ${originalTotal}</div>
            <div><strong>Reroll:</strong> ${rerollTotal}</div>
            <div><strong>Result:</strong> ${finalTotal} ${outcome === 'keepBetter' ? (usedNew ? '(reroll kept)' : '(original kept)') : '(must accept reroll)'}</div>
          </div>
        </div>
      `,
      rolls,
      flags: { swse: { attackReroll: true, sourceName, outcome, originalTotal, rerollTotal, finalTotal, sourceMessageId: message?.id ?? null } }
    });

    return { actor, message, sourceName, originalTotal, newRoll, finalTotal, outcome };
  }

  static getTemporaryDefenseRules(actor) {
    const rules = [];
    for (const item of getActorFeatItems(actor)) {
      const forceRules = getResourceRules(item, 'forcePoints');
      for (const rule of forceRules) {
        if (rule?.type !== 'SPEND_FOR_TEMP_DEFENSE') continue;
        rules.push({
          id: rule.id ?? `${item.id}-temp-defense`,
          sourceId: item.id,
          sourceName: item.name,
          label: rule.label ?? item.name,
          cost: rule.cost ?? 'forcePoint',
          value: Number(rule.value ?? 0) || 0,
          duration: rule.duration ?? '1round',
          targets: Array.isArray(rule.targets) ? rule.targets : ['defense.reflex', 'defense.fortitude', 'defense.will'],
          description: rule.description ?? item.system?.description?.value ?? ''
        });
      }
    }
    return rules;
  }

  static async applyTemporaryDefenseRule(actor, ruleOrId = null) {
    const rule = typeof ruleOrId === 'object'
      ? ruleOrId
      : this.getTemporaryDefenseRules(actor).find(candidate => !ruleOrId || candidate.id === ruleOrId || candidate.sourceId === ruleOrId);
    if (!actor || !rule) return { success: false, reason: 'Temporary defense rule not found.' };
    if (rule.cost === 'forcePoint' && actorForcePoints(actor) <= 0) {
      return { success: false, reason: `${rule.sourceName} requires a Force Point.` };
    }

    const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
    if (rule.cost === 'forcePoint') {
      const spend = await ActorEngine.spendForcePoints(actor, 1);
      if (!spend?.spent) return { success: false, reason: `${rule.sourceName} requires a Force Point.` };
    }

    const existing = Array.isArray(actor.system?.activeEffects) ? actor.system.activeEffects : [];
    const effectId = `temp-defense-${rule.sourceId || normalizeName(rule.sourceName)}`;
    const targets = Array.isArray(rule.targets) && rule.targets.length ? rule.targets : ['defense.reflex', 'defense.fortitude', 'defense.will'];
    const newEffects = targets.map(target => ({
      id: `${effectId}-${normalizeName(target)}`,
      name: rule.sourceName,
      target,
      type: 'untyped',
      value: Number(rule.value || 0),
      roundsRemaining: 1,
      enabled: true,
      sourceId: rule.sourceId,
      sourceName: rule.sourceName,
      description: rule.description || `${rule.sourceName}: +${rule.value} to defenses for 1 round.`
    }));
    const filtered = existing.filter(effect => !String(effect?.id ?? '').startsWith(effectId));
    await ActorEngine.updateActor(actor, { 'system.activeEffects': [...filtered, ...newEffects] });

    return { success: true, rule, effects: newEffects };
  }

  static getForcefulRecoveryPending(actor) {
    return actor?.getFlag?.('foundryvtt-swse', 'forcefulRecoveryPending') ?? actor?.flags?.['foundryvtt-swse']?.forcefulRecoveryPending ?? null;
  }

  static getRecoverableForcePowers(actor) {
    return getForcePowerItems(actor).filter(power => power?.system?.discarded === true);
  }

  static async recoverForcefulRecoveryPower(actor, powerId) {
    if (!actor) return { success: false, reason: 'Actor not found.' };
    const pending = this.getForcefulRecoveryPending(actor);
    if (!pending) return { success: false, reason: 'No Forceful Recovery is pending.' };
    const power = actor.items?.get?.(powerId) ?? getForcePowerItems(actor).find(item => item.id === powerId || item._id === powerId);
    if (!power || power.type !== 'force-power') return { success: false, reason: 'Force power not found.' };
    if (power.system?.discarded !== true) return { success: false, reason: `${power.name} is not expended.` };

    const { ForceExecutor } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-executor.js');
    const result = await ForceExecutor.recoverForcePowers(actor, [power.id]);
    if (!result?.success) return result;
    await actor.unsetFlag?.('foundryvtt-swse', 'forcefulRecoveryPending');
    return { ...result, powerName: power.name };
  }


  static getDestinyRules(actor) {
    const rules = [];
    for (const item of getActorFeatItems(actor)) {
      for (const rule of getResourceRules(item, 'destinyPoints')) {
        rules.push({ ...rule, sourceId: item.id, sourceName: item.name });
      }
    }
    return rules;
  }
}

export default MetaResourceFeatResolver;

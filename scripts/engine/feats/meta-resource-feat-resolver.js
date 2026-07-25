/**
 * MetaResourceFeatResolver
 *
 * Small feat-rule bridge for resources that already have canonical engines
 * elsewhere: Force Points, Destiny Points, and Second Wind. This module does
 * not spend resources or create new resource systems. It reads explicit feat
 * metadata first, then falls back to narrow feat-name checks for older pack
 * rows that have not been normalized yet.
 */

import { EncounterUseTracker } from "/systems/foundryvtt-swse/scripts/engine/feats/encounter-use-tracker.js";
import { isForcePowerItem } from "/systems/foundryvtt-swse/scripts/utils/item-classification.js";
import { AttackOutcomeResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/attack-outcome-resolver.js";
import { AttackRollDiagnostics } from "/systems/foundryvtt-swse/scripts/engine/combat/attack-roll-diagnostics.js";
import { getAttackEntry, getActiveRevision, appendRevision } from "/systems/foundryvtt-swse/scripts/engine/combat/full-attack-message-state.js";
import { renderFullAttackCardContent } from "/systems/foundryvtt-swse/scripts/engine/combat/full-attack-card-renderer.js";
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

function normalizeToken(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function getWeaponText(weapon = null) {
  const system = weapon?.system ?? {};
  const fields = [
    weapon?.name,
    system.weaponType,
    system.weaponGroup,
    system.group,
    system.category,
    system.subtype,
    system.type,
    system.damageType,
    system.damage?.type,
    system.traits,
    system.properties
  ];
  const flat = [];
  for (const field of fields) {
    if (Array.isArray(field)) flat.push(...field);
    else if (field && typeof field === 'object') flat.push(...Object.values(field));
    else if (field !== undefined && field !== null) flat.push(field);
  }
  return flat.map(normalizeToken).filter(Boolean).join(' ');
}

function getAttackType(weapon = null, context = {}) {
  const explicit = normalizeToken(context.attackType ?? context.rangeType ?? context.weaponType ?? '');
  if (explicit.includes('ranged')) return 'ranged';
  if (explicit.includes('melee')) return 'melee';
  const text = getWeaponText(weapon);
  if (text.includes('ranged') || text.includes('pistol') || text.includes('rifle') || text.includes('blaster') || text.includes('bowcaster') || text.includes('grenade')) return 'ranged';
  if (text.includes('melee') || text.includes('lightsaber') || text.includes('unarmed') || text.includes('blade')) return 'melee';
  return 'unknown';
}

function textIncludesAny(text, values = []) {
  const wanted = (Array.isArray(values) ? values : [values]).map(normalizeToken).filter(Boolean);
  if (!wanted.length) return false;
  return wanted.some(value => text.includes(value));
}

function attackRerollRuleMatches(rule = {}, weapon = null, context = {}) {
  if (rule.requiresAttackType && getAttackType(weapon, context) !== String(rule.requiresAttackType).toLowerCase()) return false;
  const text = getWeaponText(weapon);
  if (rule.requiresVehicleWeapon && !text.includes('vehicle')) return false;
  if (rule.requiresWeaponText && !textIncludesAny(text, rule.requiresWeaponText)) return false;
  if (rule.requiresDamageType && !textIncludesAny(text, rule.requiresDamageType)) return false;
  if (rule.excludesDamageType && textIncludesAny(text, rule.excludesDamageType)) return false;
  return true;
}

function getForcePowerItems(actor) {
  try {
    return Array.from(actor?.items ?? []).filter(item => isForcePowerItem(item));
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

  static getHitPointMaxBonus(actor) {
    let total = 0;
    const level = Math.max(1, Number(actor?.system?.level ?? actor?.system?.details?.level ?? actor?.system?.progression?.level ?? 1) || 1);

    for (const item of getActorFeatItems(actor)) {
      const rules = getResourceRules(item, 'hitPoints');
      for (const rule of rules) {
        const value = Number(rule.value ?? 0);
        if (!Number.isFinite(value) || value === 0) continue;
        switch (rule?.type) {
          case 'MAX_BONUS_PER_LEVEL':
            total += value * level;
            break;
          case 'MAX_BONUS':
            total += value;
            break;
          default:
            break;
        }
      }
    }

    // Compatibility fallback for older embedded actors that still have the feat
    // but not the normalized resourceRules payload.
    const hasNormalizedToughness = getActorFeatItems(actor).some(item => {
      if (normalizeName(item?.name) !== 'toughness') return false;
      return getResourceRules(item, 'hitPoints').length > 0;
    });
    if (!hasNormalizedToughness && this.hasFeat(actor, 'Toughness')) total += level;

    return total;
  }

  static getDamageThresholdRules(actor) {
    const rules = {
      flatBonus: 0,
      useWillAsBase: false,
      useBestFortitudeOrWill: false,
      displayNotes: []
    };

    for (const item of getActorFeatItems(actor)) {
      const itemRules = getResourceRules(item, 'damageThreshold');
      for (const rule of itemRules) {
        switch (rule?.type) {
          case 'FLAT_BONUS': {
            const value = Number(rule.value ?? 0);
            if (Number.isFinite(value)) rules.flatBonus += value;
            break;
          }
          case 'USE_WILL_AS_BASE':
            rules.useWillAsBase = true;
            rules.useBestFortitudeOrWill = rule.useBest !== false;
            break;
          case 'DISPLAY_NOTE':
            if (rule.note) rules.displayNotes.push({ sourceName: item.name, note: rule.note });
            break;
          default:
            break;
        }
      }
    }

    // Compatibility fallback for older embedded actors/packs. Improved Damage
    // Threshold is intentionally not name-fallbacked here because older actor
    // items often already expose it as a defense.damageThreshold modifier.
    if (!rules.useWillAsBase && this.hasFeat(actor, 'Fight Through Pain')) {
      rules.useWillAsBase = true;
      rules.useBestFortitudeOrWill = true;
    }

    return rules;
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
      extraHealing: 0,
      halfHealingForMovement: false,
      delayedHealing: null,
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
          case 'EXTRA_HEALING': {
            const value = Number(rule.value ?? 0);
            if (Number.isFinite(value)) rules.extraHealing += value;
            break;
          }
          case 'EXTRA_HEALING_CON_MOD_MULTIPLIER': {
            const multiplier = Number(rule.multiplier ?? 1) || 1;
            const minimum = Number(rule.minimum ?? 0) || 0;
            const conMod = Number(actor?.system?.derived?.attributes?.con?.mod ?? actor?.system?.abilities?.con?.mod ?? actor?.system?.attributes?.con?.mod ?? 0) || 0;
            rules.extraHealing += Math.max(minimum, conMod * multiplier);
            break;
          }
          case 'HALF_HEALING_FOR_MOVEMENT':
            rules.halfHealingForMovement = true;
            rules.grantMovementOnUse = true;
            break;
          case 'DELAYED_HEALING_ON_USE':
            rules.delayedHealing = {
              amountPerTurn: Number(rule.amountPerTurn ?? 5) || 5,
              limit: rule.limit ?? 'fullHpOrEncounterEnd',
              oncePer: rule.oncePer ?? 'day',
              source: rule.source ?? 'Regenerative Healing'
            };
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
        if (!attackRerollRuleMatches(rule.rule ?? {}, weapon, context)) return false;

        // Filter based on trigger requirement
        const trigger = rule.rule?.trigger;
        if (trigger === 'missedAttack' && isHit !== false) {
          // Only show missed attack rerolls when attack actually missed
          return false;
        }

        // Filter based on encounter-limited availability (read-only check)
        if (rule.rule?.oncePer) {
          const featureKey = `reroll-attack-${rule.id}`;
          if (!EncounterUseTracker.canUse(actor, featureKey, { oncePer: rule.rule.oncePer })) {
            // Already used this encounter, hide from options
            return false;
          }
        }

        return true;
      })
      .map(rule => ({
        ...rule,
        actorId: actor?.id ?? '',
        weaponId: weapon?.id ?? context.weaponId ?? '',
        originalTotal: roll.total,
        // Carried through so resolveAttackRerollButton() can build a fresh
        // AttackOutcomeResolver verdict for the reroll instead of only
        // replacing the total and leaving stale hit/critical metadata.
        originalNaturalD20: roll.dice?.[0]?.results?.[0]?.result ?? null,
        targetDefense: Number.isFinite(Number(context.targetDefense)) ? Number(context.targetDefense) : null,
        criticalThreshold: Number.isFinite(Number(context.criticalThreshold)) ? Number(context.criticalThreshold) : 20,
        critMultiplier: Number.isFinite(Number(context.critMultiplier)) ? Number(context.critMultiplier) : 2,
        formula,
        outcomeLabel: rule.outcome === 'keepBetter' ? 'Keep better result' : 'Must accept reroll',
        canUse: rule.cost !== 'forcePoint' || actorForcePoints(actor) > 0,
        disabledReason: rule.cost === 'forcePoint' && actorForcePoints(actor) <= 0 ? 'No Force Points remaining' : null,
        ruleId: rule.id,
        oncePer: rule.rule?.oncePer ?? null
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

    // Build a completely fresh AttackOutcomeResolver verdict for whichever
    // roll (original or reroll) backs finalTotal. This replaces the stale
    // hit/critical/damage-multiplier metadata from the original attack
    // entirely rather than merging any of its fields — a reroll that flips
    // miss->hit (or hit->miss, or crit->normal, etc.) must not carry over
    // the old verdict.
    const originalNaturalD20Raw = Number(button.dataset.originalNaturalD20);
    const originalNaturalD20 = Number.isFinite(originalNaturalD20Raw) ? originalNaturalD20Raw : null;
    const rerollNaturalD20 = newRoll.dice?.[0]?.results?.[0]?.result ?? null;
    const finalNaturalD20 = usedNew ? rerollNaturalD20 : originalNaturalD20;
    const targetDefenseRaw = button.dataset.targetDefense;
    const targetDefense = targetDefenseRaw !== undefined && targetDefenseRaw !== '' && targetDefenseRaw !== 'null'
      ? Number(targetDefenseRaw)
      : null;
    const criticalThreshold = Number.isFinite(Number(button.dataset.criticalThreshold)) ? Number(button.dataset.criticalThreshold) : 20;
    const critMultiplier = Number.isFinite(Number(button.dataset.critMultiplier)) ? Number(button.dataset.critMultiplier) : 2;
    const newOutcome = AttackOutcomeResolver.resolve({
      naturalD20: finalNaturalD20,
      total: finalTotal,
      targetDefense,
      criticalThreshold,
      critMultiplier
    });

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
        roundsRemaining: 2,
        enabled: true,
        sourceId: button.dataset.sourceId,
        sourceName: sourceName,
        description: `${sourceName}: ${penaltyValue} to Reflex Defense until end of next turn.${isNat1 ? ' (Natural 1 penalty)' : ''}`
      };
      const filtered = existing.filter(effect => !String(effect?.id ?? '').startsWith(effectId));
      await ActorEngine.updateActor(actor, { 'system.activeEffects': [...filtered, newEffect] });
    }

    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-check"></i> Reroll used';

    const { createChatMessage } = await import('/systems/foundryvtt-swse/scripts/core/document-api-v13.js');
    const rolls = buildRollJson(newRoll) ? [buildRollJson(newRoll)] : [];
    const outcomeLabel = newOutcome.hit === null
      ? ''
      : newOutcome.critical
        ? 'Critical Hit'
        : newOutcome.hit
          ? 'Hit'
          : 'Miss';
    const revision = (Number(message?.getFlag?.('swse', 'revision')) || 0) + 1;
    const newMessage = await createChatMessage({
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
            ${outcomeLabel ? `<div><strong>Outcome:</strong> ${outcomeLabel}</div>` : ''}
          </div>
        </div>
      `,
      rolls,
      flags: {
        swse: {
          attackReroll: true,
          sourceName,
          outcome,
          originalTotal,
          rerollTotal,
          finalTotal,
          // The full replacement AttackOutcomeResolver verdict — the
          // authoritative source for any downstream consumer (damage
          // workflow, GM review) instead of the original message's now-
          // stale hit/critical data.
          attackOutcome: newOutcome,
          weaponId: button.dataset.weaponId || null,
          sourceMessageId: message?.id ?? null,
          revision,
          authoritative: true
        }
      }
    });

    // Mark the original attack message as superseded so it cannot be used
    // as a second, independently-actionable outcome (Phase 3 rolling-system
    // alignment). Best-effort: the new reroll result above is already
    // created and returned regardless of whether this update succeeds.
    if (message?.id && newMessage?.id) {
      try {
        await message.update({
          'flags.swse.authoritative': false,
          'flags.swse.superseded': true,
          'flags.swse.supersededBy': newMessage.id,
          'flags.swse.supersededReason': 'reroll',
          content: `${message.content ?? ''}<div class="swse-superseded-banner"><i class="fa-solid fa-rotate"></i> Superseded by a reroll — see the newer message for the current result.</div>`
        });
      } catch (err) {
        console.warn('[SWSE] Failed to mark original attack message as superseded after reroll; treat the newest reroll message as authoritative.', err);
        ui?.notifications?.warn?.('Reroll succeeded, but the original attack card could not be updated. The reroll result above is authoritative.');
      }
    }

    AttackRollDiagnostics.record({
      domain: 'combat.attack.reroll',
      attackType: actor?.type === 'vehicle' ? 'vehicle' : 'character',
      actor,
      naturalD20: finalNaturalD20,
      finalTotal,
      outcome: newOutcome,
      transactions: { forcePointSpent: cost === 'forcePoint' }
    });

    return { actor, message, newMessage, sourceName, originalTotal, newRoll, finalTotal, outcome, attackOutcome: newOutcome, revision };
  }

  /**
   * Interactive per-attack reroll for one row of a combined Full Attack
   * chat card (Phase 5 rolling-system alignment). Distinct from
   * resolveAttackRerollButton() above (which creates a brand-new message
   * and marks the whole original message superseded) because a combined
   * card holds N independent attacks in ONE message — this updates only
   * the ONE attack's stored revision (via full-attack-message-state.js's
   * appendRevision(), which validates the expected revision before
   * writing, so a stale card can't clobber a newer reroll) and leaves
   * every sibling attack's state untouched.
   *
   * Reuses the same eligibility/policy authority as the single-attack
   * path: the button's data attributes come from
   * MetaResourceFeatResolver.buildAttackRerollChatOptions() (via
   * full-attack-executor.js#_postCombinedCard, which stores that exact
   * per-attack reroll-options array on the attack entry — see
   * full-attack-card-renderer.js). Eligibility is re-validated here at
   * execution time (feat still present, oncePer limit not yet consumed,
   * Force Points still available), which is a stronger check than the
   * single-attack path currently performs — an intentional Phase 5
   * hardening, not an inconsistency introduced by accident.
   *
   * @param {HTMLElement} button
   * @param {{message: ChatMessage}} context
   * @returns {Promise<Object|null>}
   */
  static async resolveFullAttackRerollButton(button, { message = null } = {}) {
    if (!(button instanceof HTMLElement) || !message) return null;
    const actor = game.actors?.get?.(button.dataset.actorId);
    if (!actor) {
      ui?.notifications?.warn?.('Attack reroll actor could not be resolved.');
      return null;
    }
    if (!actor.isOwner) {
      ui?.notifications?.warn?.('You do not control this actor.');
      return null;
    }

    const attackInstanceId = button.dataset.attackInstanceId;
    const expectedRevision = Number(button.dataset.expectedRevision ?? 0);
    if (!attackInstanceId) {
      ui?.notifications?.warn?.('This reroll button is missing its attack reference.');
      return null;
    }

    const sourceName = button.dataset.sourceName || 'Attack Reroll';
    const ruleId = button.dataset.ruleId || '';
    const cost = button.dataset.cost || 'forcePoint';
    const outcome = this.normalizeRerollOutcome(button.dataset.outcome);

    // Re-validate eligibility at execution time, not just at render time:
    // the granting feat must still be on the actor, and any oncePer
    // encounter-use limit must not have been consumed since the card was
    // rendered (e.g. by a different attack's reroll in the same sequence
    // using the same limited feature).
    const currentRules = this.getAttackRerollRules(actor);
    const stillEligible = currentRules.some(rule => rule.id === ruleId || rule.sourceId === button.dataset.sourceId);
    if (!stillEligible) {
      ui?.notifications?.warn?.(`${sourceName} is no longer available for this actor.`);
      return null;
    }
    if (button.dataset.oncePer) {
      const featureKey = `reroll-attack-${ruleId}`;
      if (!EncounterUseTracker.canUse(actor, featureKey, { oncePer: button.dataset.oncePer })) {
        ui?.notifications?.warn?.(`${sourceName} has already been used this encounter.`);
        return null;
      }
    }
    if (cost === 'forcePoint' && actorForcePoints(actor) <= 0) {
      ui?.notifications?.warn?.(`${sourceName} requires a Force Point.`);
      return null;
    }

    // Stale-card protection: read the CURRENTLY STORED state before
    // spending anything. If a concurrent action (another reroll, a page
    // from a different client) already advanced this attack past the
    // revision this button was rendered for, refuse rather than silently
    // overwriting a newer result.
    const entry = getAttackEntry(message, attackInstanceId);
    if (!entry) {
      ui?.notifications?.warn?.('This attack could not be found on the current card.');
      return null;
    }
    if (entry.activeRevision !== expectedRevision) {
      ui?.notifications?.warn?.('This attack has already been updated by a newer action. Reopen the card to see the current result.');
      return { ok: false, conflict: 'stale-revision' };
    }
    const activeRevision = getActiveRevision(entry);
    // Damage applications are recorded in entry.damageApplications[] (via
    // full-attack-message-state.js#recordDamageApplication), not as a flag
    // on the revision's own damageContext — checking damageApplications
    // directly, rather than a damageContext.applied flag nothing sets, is
    // what actually detects "damage has already been applied for this
    // attack."
    if (Array.isArray(entry.damageApplications) && entry.damageApplications.length > 0) {
      // No rule in this codebase permits rerolling an attack after its
      // damage has already been applied — reject clearly rather than
      // silently changing hit/critical state under already-resolved
      // damage.
      ui?.notifications?.warn?.('Damage has already been applied for this attack; it cannot be rerolled.');
      return { ok: false, conflict: 'damage-already-applied' };
    }

    const formula = button.dataset.formula || activeRevision?.rollResult?.formula || '1d20';
    const newRoll = await globalThis.SWSE?.RollEngine?.safeRoll?.(formula, actor.getRollData?.() ?? {}, {
      actor,
      domain: 'attack.reroll',
      context: { rerollSource: sourceName, sequenceId: button.dataset.sequenceId ?? null, attackInstanceId, sourceMessageId: message?.id ?? null }
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

    const originalTotal = Number(button.dataset.originalTotal ?? activeRevision?.rollResult?.total ?? 0);
    const rerollTotal = Number(newRoll.total ?? 0);
    const finalTotal = outcome === 'keepBetter' ? Math.max(originalTotal, rerollTotal) : rerollTotal;
    const usedNew = finalTotal === rerollTotal;

    const originalNaturalD20Raw = Number(button.dataset.originalNaturalD20 ?? activeRevision?.rollResult?.naturalD20);
    const originalNaturalD20 = Number.isFinite(originalNaturalD20Raw) ? originalNaturalD20Raw : null;
    const rerollNaturalD20 = newRoll.dice?.[0]?.results?.[0]?.result ?? null;
    const finalNaturalD20 = usedNew ? rerollNaturalD20 : originalNaturalD20;
    const targetDefenseRaw = button.dataset.targetDefense;
    const targetDefense = targetDefenseRaw !== undefined && targetDefenseRaw !== '' && targetDefenseRaw !== 'null'
      ? Number(targetDefenseRaw)
      : (activeRevision?.outcome?.targetDefense ?? null);
    const criticalThreshold = Number.isFinite(Number(button.dataset.criticalThreshold)) ? Number(button.dataset.criticalThreshold) : 20;
    const critMultiplier = Number.isFinite(Number(button.dataset.critMultiplier)) ? Number(button.dataset.critMultiplier) : (activeRevision?.outcome?.critMultiplier ?? 2);

    // A completely fresh AttackOutcomeResolver verdict — never merges
    // stale hit/critical fields from the previous revision.
    const newOutcome = AttackOutcomeResolver.resolve({
      naturalD20: finalNaturalD20,
      total: finalTotal,
      targetDefense,
      criticalThreshold,
      critMultiplier
    });

    const revisionData = {
      rollInstanceId: foundry.utils?.randomID?.() ?? null,
      rollResult: { naturalD20: finalNaturalD20, total: finalTotal, formula },
      // Preserve the exact component ledger from the resolved attack —
      // rerolling changes the die and (via AttackOutcomeResolver) the
      // outcome, never the resolved formula components themselves (Phase
      // 3/4's "reroll preserves resolved formula components" invariant,
      // extended here to full-attack rows).
      componentLedger: activeRevision?.componentLedger ?? [],
      transactions: { forcePointSpent: cost === 'forcePoint' },
      rerollSource: { ruleId, sourceId: button.dataset.sourceId ?? null, sourceName },
      resultPolicy: outcome,
      outcome: { ...newOutcome, targetDefense, critMultiplier },
      damageContext: activeRevision?.damageContext ?? null
    };

    button.disabled = true;

    let persisted;
    try {
      persisted = await appendRevision(message, attackInstanceId, expectedRevision, revisionData);
      if (persisted?.ok) {
        // Rebuild the whole card content from the message's OWN
        // now-updated stored state (not from any in-memory HTML) so
        // sibling rows are reproduced verbatim and only this row reflects
        // the new revision.
        const attacksFlag = message.getFlag('swse', 'attacks') ?? [];
        const updatedAttacks = attacksFlag.map(a => (a.attackInstanceId === attackInstanceId ? { ...persisted.entry, sequenceId: button.dataset.sequenceId ?? null, criticalThreshold } : { ...a, sequenceId: button.dataset.sequenceId ?? null }));
        const packageType = message.getFlag('swse', 'packageType');
        const breakdown = message.getFlag('swse', 'breakdown') ?? [];
        const target = updatedAttacks[0]?.targetUuid && typeof fromUuidSync === 'function' ? fromUuidSync(updatedAttacks[0].targetUuid) : null;
        const content = renderFullAttackCardContent(actor, target, packageType, updatedAttacks, breakdown);
        await message.update({ content });
      }
    } catch (err) {
      console.warn('[SWSE] Full-attack reroll succeeded but the combined card could not be updated.', err);
      ui?.notifications?.warn?.(`Reroll succeeded (new total ${finalTotal}), but the card could not be updated. The result was recorded in diagnostics.`);
      AttackRollDiagnostics.record({
        domain: 'combat.attack.fullAttackReroll',
        attackType: 'character',
        actor,
        naturalD20: finalNaturalD20,
        finalTotal,
        outcome: newOutcome,
        transactions: { forcePointSpent: cost === 'forcePoint' }
      });
      return { ok: false, conflict: 'render-failed', actor, attackInstanceId, finalTotal, outcome: newOutcome };
    }

    if (!persisted?.ok) {
      if (persisted?.conflict === 'stale-revision') {
        ui?.notifications?.warn?.('This attack was updated by another action while this reroll was in progress. The Force Point spent was not refunded automatically — check the card before spending another.');
      }
      return persisted ?? { ok: false, conflict: 'unknown' };
    }

    AttackRollDiagnostics.record({
      domain: 'combat.attack.fullAttackReroll',
      attackType: 'character',
      actor,
      naturalD20: finalNaturalD20,
      finalTotal,
      outcome: newOutcome,
      transactions: { forcePointSpent: cost === 'forcePoint' }
    });

    return { ok: true, actor, message, attackInstanceId, revision: persisted.revision, finalTotal, outcome: newOutcome };
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

  /* ---------------------------------------- */
  /* CUSTOMIZATION CAPABILITIES              */
  /* ---------------------------------------- */

  static getCustomizationCapabilities(actor) {
    const capabilities = [];
    if (!actor) return capabilities;

    for (const item of getActorFeatItems(actor)) {
      const caps = item?.system?.abilityMeta?.customizationCapabilities ?? [];
      if (Array.isArray(caps)) {
        capabilities.push(...caps);
      }
    }
    return capabilities;
  }

  static hasCustomizationCapability(actor, capabilityType) {
    const capabilities = this.getCustomizationCapabilities(actor);
    return capabilities.some(c => c?.type === capabilityType);
  }

  static canActorPerformTechSpecialistModifications(actor) {
    if (!actor) return false;
    return this.hasCustomizationCapability(actor, 'TECH_SPECIALIST_MODIFICATIONS');
  }

  /* ---------------------------------------- */
  /* GRAPPLE RESISTANCE RULES                */
  /* ---------------------------------------- */

  static getGrappleResistanceBonus(actor, context = {}) {
    if (!actor) return 0;
    const mode = context.mode;
    if (mode !== 'resistGrab' && mode !== 'resistGrapple') return 0;

    let totalBonus = 0;
    for (const item of getActorFeatItems(actor)) {
      const grappleRules = item?.system?.abilityMeta?.grappleRules ?? [];
      if (Array.isArray(grappleRules)) {
        for (const rule of grappleRules) {
          if (rule.type === 'RESIST_GRAB_AND_GRAPPLE') {
            totalBonus += rule.bonus ?? 0;
          }
        }
      }
    }
    return totalBonus;
  }

  static getForcefulRecoveryPending(actor) {
    return actor?.getFlag?.('foundryvtt-swse', 'forcefulRecoveryPending') ?? actor?.flags?.['foundryvtt-swse']?.forcefulRecoveryPending ?? null;
  }

  static getRecoverableForcePowers(actor) {
    return getForcePowerItems(actor).filter(power => power?.system?.discarded === true || power?.system?.spent === true);
  }

  static async recoverForcefulRecoveryPower(actor, powerId) {
    if (!actor) return { success: false, reason: 'Actor not found.' };
    const pending = this.getForcefulRecoveryPending(actor);
    if (!pending) return { success: false, reason: 'No Forceful Recovery is pending.' };
    const power = actor.items?.get?.(powerId) ?? getForcePowerItems(actor).find(item => item.id === powerId || item._id === powerId);
    if (!power || !isForcePowerItem(power)) return { success: false, reason: 'Force power not found.' };
    if (power.system?.discarded !== true && power.system?.spent !== true) return { success: false, reason: `${power.name} is not expended.` };

    const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
    const { ForcePowerEffectsEngine } = await import('/systems/foundryvtt-swse/scripts/engine/force/force-power-effects-engine.js');
    const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');

    await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{
      _id: power.id,
      'system.discarded': false,
      'system.spent': false,
      'system.lastRecovered': Date.now(),
      'flags.foundryvtt-swse.lastRecoverySource': 'forceful-recovery'
    }], { source: 'forceful-recovery', render: false });

    await ForcePowerEffectsEngine.removePowerEffects(actor, power);
    await actor.unsetFlag?.('foundryvtt-swse', 'forcefulRecoveryPending');
    await SWSEChat.postHTML({
      actor,
      content: `<div class="swse-force-recovery swse-force-recovery--forceful-recovery">
        <h3>${actor.name} uses Forceful Recovery</h3>
        <p><strong>${power.name}</strong> returns to the Force Power Suite after catching a Second Wind.</p>
      </div>`
    });
    return { success: true, recovered: 1, powers: [power.name], powerName: power.name };
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

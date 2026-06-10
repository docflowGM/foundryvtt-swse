/**
 * SWSE Grappling System
 *
 * Phase 3A: this remains the UI/roll adapter, but state mutation is delegated
 * to GrappleStateEngine so Grabbed/Grappled/Pinned are no longer scattered
 * ad-hoc ActiveEffect writes.
 */

import { SWSERoll } from '../rolls/enhanced-rolls.js';
import { createChatMessage } from '../../core/document-api-v13.js';
import { SchemaAdapters } from '../../utils/schema-adapters.js';
import { ActorAbilityBridge } from '../../adapters/ActorAbilityBridge.js';
import MetaResourceFeatResolver from '/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js';
import { buildVirtualUnarmedWeapon } from '/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js';
import { buildDamagePacket } from '/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js';
import { GrappleStateEngine } from '/systems/foundryvtt-swse/scripts/engine/combat/grapple-state-engine.js';
import { GrappleLegalityEngine } from '/systems/foundryvtt-swse/scripts/engine/combat/grapple-legality-engine.js';
import { CombatStatusResolver } from '/systems/foundryvtt-swse/scripts/combat/combat-status.js';
import { DamageSystem } from '/systems/foundryvtt-swse/scripts/combat/damage-system.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { getEffectiveHalfLevel } from '/systems/foundryvtt-swse/scripts/actors/derived/level-split.js';

function swseNormalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function swseActorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function swseActorHasTalent(actor, name) {
  const wanted = swseNormalizeName(name);
  return swseActorItems(actor).some(item => item?.type === 'talent' && item?.system?.disabled !== true && swseNormalizeName(item.name) === wanted);
}

function swseTalentGrappleBonus(actor, mode) {
  let total = 0;
  for (const item of swseActorItems(actor)) {
    if (!['talent', 'feat'].includes(item?.type) || item?.system?.disabled === true) continue;
    const rules = item?.system?.abilityMeta?.grappleRules ?? [];
    if (!Array.isArray(rules)) continue;
    for (const rule of rules) {
      if (rule?.type !== 'GRAPPLE_BONUS') continue;
      const modes = Array.isArray(rule.modes) ? rule.modes : [rule.mode ?? rule.context].filter(Boolean);
      if (modes.length && !modes.includes(mode)) continue;
      const bonus = Number(rule.bonus ?? rule.value ?? 0);
      if (Number.isFinite(bonus)) total += bonus;
    }
  }
  return total;
}

function swseGrabAttackPenalty(actor) {
  if (swseActorHasTalent(actor, 'Grabber')) return 0;
  if (swseActorHasTalent(actor, 'Entangler')) return -2;
  return -5;
}


const ADVANCED_GRAPPLE_MANEUVERS = Object.freeze({
  trip: {
    key: 'trip',
    feat: 'Trip',
    label: 'Trip',
    actionLabel: 'Trip Grappled Opponent',
    requiresState: 'grappled',
    opposed: true,
    summary: 'Knock a grappled opponent Prone after winning an opposed grapple check.'
  },
  throw: {
    key: 'throw',
    feat: 'Throw',
    label: 'Throw',
    actionLabel: 'Throw Grappled Opponent',
    requiresState: 'grappled',
    opposed: true,
    damage: true,
    clearsGrapple: true,
    gmMovement: true,
    summary: 'Throw a grappled opponent up to 1 square beyond reach and deal unarmed/claw damage. Movement remains GM/player adjudicated.'
  },
  crush: {
    key: 'crush',
    feat: 'Crush',
    label: 'Crush',
    actionLabel: 'Crush Pinned Opponent',
    requiresTargetState: 'pinned',
    damage: true,
    summary: 'Deal unarmed/claw damage to a pinned opponent. Rancor Crush adds a -1 CT step when present.'
  }
});

function swseActorHasFeatExact(actor, name) {
  const wanted = swseNormalizeName(name);
  return ActorAbilityBridge.getFeats(actor).some(feat => {
    const names = [feat?.name, feat?.system?.slug, feat?.system?.key, feat?.system?.id].map(swseNormalizeName).filter(Boolean);
    return names.includes(wanted);
  });
}

function actorLabel(actor, fallback = 'Actor') {
  return escapeHTML(actor?.name ?? fallback);
}

function resultTotal(roll) {
  return Number(roll?.total ?? roll?.roll?.total ?? 0) || 0;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function actorId(actor) {
  return actor?.id ?? actor?._id ?? '';
}

function firstD20(roll) {
  return Number(roll?.dice?.[0]?.results?.[0]?.result ?? roll?.terms?.find?.(t => t?.faces === 20)?.results?.[0]?.result ?? 0) || 0;
}

function targetedActor() {
  try {
    const targets = Array.from(game?.user?.targets ?? []);
    return targets[0]?.actor ?? null;
  } catch (_err) {
    return null;
  }
}

function selectedActor() {
  try {
    return canvas?.tokens?.controlled?.[0]?.actor ?? null;
  } catch (_err) {
    return null;
  }
}

export class SWSEGrappling {

  static init() {
    globalThis.SWSE ??= {};
    globalThis.SWSE.Grappling = SWSEGrappling;
    globalThis.SWSE.GrappleStateEngine = GrappleStateEngine;
    globalThis.SWSE.GrappleLegalityEngine = GrappleLegalityEngine;
    globalThis.SWSEGrappling = SWSEGrappling;
  }

  static getSelectedActor() {
    return selectedActor();
  }

  static getTargetActor(options = {}) {
    return options?.target?.actor ?? options?.target ?? targetedActor();
  }

  // ---------------------------------------------------------------------------
  // RAW STEP 1: Attempt Grab (Attack vs Reflex Defense)
  // ---------------------------------------------------------------------------

  static async attemptGrab(attacker, target = null, options = {}) {
    target = target?.actor ?? target ?? this.getTargetActor(options);
    if (!attacker || !target) {
      ui?.notifications?.warn?.('Select one target before attempting a grab.');
      return null;
    }
    const legality = GrappleLegalityEngine.validateInitiate(attacker, target, {
      ...(options ?? {}),
      ruleData: options.ruleData ?? {},
      maxTargetSizeDelta: options.maxTargetSizeDelta ?? options.ruleData?.maxTargetSizeDelta ?? 1,
      requiresReach: options.requiresReach ?? options.ruleData?.requiresReach ?? true,
      requiresFreeLimb: options.requiresFreeLimb ?? options.ruleData?.requiresFreeLimb ?? false
    });
    if (options.skipLegalityConfirm !== true && !await GrappleLegalityEngine.confirm(legality, { actionName: 'Attempt Grab' })) return null;

    const weapon = this._getUnarmedAttack(attacker);
    const grabPenalty = Number(options.grabPenalty ?? swseGrabAttackPenalty(attacker)) || 0;
    const attackResult = await SWSERoll.rollAttack(attacker, weapon, {
      customModifier: grabPenalty,
      maneuver: 'grab',
      actionId: 'grab',
      combatOptions: { grab: true },
      target,
      combatContext: options.combatContext ?? null,
      workflowContext: options.workflowContext ?? options.combatContext ?? null
    });
    const roll = attackResult?.roll ?? attackResult;
    const total = Number(attackResult?.total ?? attackResult?.roll?.total ?? roll?.total ?? 0);
    const d20 = firstD20(roll);

    const baseReflex = Number(target.system?.defenses?.reflex?.total ?? target.system?.defenses?.reflex ?? 10) || 10;
    const grappleResistance = Number(MetaResourceFeatResolver.getGrappleResistanceBonus(target, { mode: 'resistGrab' }) ?? 0) || 0;
    const reflex = baseReflex + grappleResistance;
    const hit = d20 === 20 || (d20 !== 1 && total >= reflex);

    const result = { attacker, target, roll, total, d20, reflex, hit, baseReflex, grappleResistance, grabPenalty };

    if (hit) {
      await GrappleStateEngine.advancePair(attacker, target, 'grabbed', {
        actionId: options.actionId ?? 'grab',
        workflowId: options.workflowContext?.workflowId ?? options.combatContext?.workflowId ?? null
      });
      ui?.notifications?.info?.(`${attacker.name} grabs ${target.name}!`);
    }

    await this._createGrabMessage(result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // RAW STEP 2: Opposed Grapple Check
  // ---------------------------------------------------------------------------

  static async grappleCheck(attacker, defender, options = {}) {
    defender = defender?.actor ?? defender ?? this.getTargetActor(options);
    if (!attacker || !defender) {
      ui?.notifications?.warn?.('Select one target before making a grapple check.');
      return null;
    }

    const legality = GrappleLegalityEngine.validateExistingGrapple(attacker, defender, {
      ...(options ?? {}),
      ruleData: options.ruleData ?? {},
      maxTargetSizeDelta: options.maxTargetSizeDelta ?? options.ruleData?.maxTargetSizeDelta ?? 1
    });
    if (options.skipLegalityConfirm !== true && !await GrappleLegalityEngine.confirm(legality, { actionName: 'Opposed Grapple Check' })) return null;

    const atk = await this._rollGrappleBonus(attacker, { mode: 'attackGrapple' });
    const def = await this._rollGrappleBonus(defender, { mode: 'resistGrapple' });

    const atkRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${atk}`, {}, { domain: 'combat.grapple.attack' });
    const defRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${def}`, {}, { domain: 'combat.grapple.defense' });

    const attackerWins = Number(atkRoll.total ?? 0) > Number(defRoll.total ?? 0);
    const isTie = Number(atkRoll.total ?? 0) === Number(defRoll.total ?? 0);

    const result = {
      attacker,
      defender,
      attackerRoll: atkRoll,
      defenderRoll: defRoll,
      attackerBonus: atk,
      defenderBonus: def,
      actionId: options.actionId ?? 'grapple-check',
      attackerWins,
      isTie
    };

    await this._createGrappleCheckMessage(result);

    if (isTie) return result;

    if (attackerWins) {
      await GrappleStateEngine.advancePair(attacker, defender, 'grappled', {
        actionId: options.actionId ?? 'grapple-check',
        workflowId: options.workflowContext?.workflowId ?? options.combatContext?.workflowId ?? null
      });
      ui?.notifications?.info?.(`${attacker.name} has grappled ${defender.name}!`);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Attempt Pin (requires Pin feat)
  // ---------------------------------------------------------------------------

  static async attemptPin(attacker, defender, options = {}) {
    defender = defender?.actor ?? defender ?? this.getTargetActor(options);
    if (!attacker || !defender) {
      ui?.notifications?.warn?.('Select one target before attempting a pin.');
      return null;
    }

    if (!this._hasFeat(attacker, 'Pin')) {
      ui?.notifications?.warn?.(`${attacker.name} lacks the Pin feat.`);
      return null;
    }

    if (!GrappleStateEngine.hasState(attacker, 'grappled') || !GrappleStateEngine.hasState(defender, 'grappled')) {
      ui?.notifications?.warn?.('Both creatures must already be Grappled.');
      return null;
    }

    const check = await this.grappleCheck(attacker, defender, { ...options, actionId: options.actionId ?? 'pin' });

    if (check?.attackerWins) {
      await GrappleStateEngine.advancePair(attacker, defender, 'pinned', {
        actionId: options.actionId ?? 'pin',
        workflowId: options.workflowContext?.workflowId ?? options.combatContext?.workflowId ?? null
      });
      ui?.notifications?.info?.(`${attacker.name} pins ${defender.name}!`);
      await this._createPinResultMessage(attacker, defender);
      return { ...check, pinned: true };
    }

    return check;
  }


  // ---------------------------------------------------------------------------
  // Advanced Grapple Maneuvers (Trip, Throw, Crush)
  // ---------------------------------------------------------------------------

  static getAvailableAdvancedManeuvers(actor, target = null, options = {}) {
    const includeUnsafe = options.includeUnsafe === true;
    const actorGrappled = GrappleStateEngine.hasState(actor, 'grappled');
    const targetGrappled = GrappleStateEngine.hasState(target, 'grappled');
    const targetPinned = GrappleStateEngine.hasState(target, 'pinned');
    const rows = [];

    for (const maneuver of Object.values(ADVANCED_GRAPPLE_MANEUVERS)) {
      if (!swseActorHasFeatExact(actor, maneuver.feat)) continue;
      let legal = true;
      let reason = '';
      if (maneuver.requiresState === 'grappled' && !(actorGrappled && targetGrappled)) {
        legal = false;
        reason = 'Both creatures must be Grappled.';
      }
      if (maneuver.requiresTargetState === 'pinned' && !targetPinned) {
        legal = false;
        reason = 'Target must be Pinned.';
      }
      if (legal) {
        const legality = GrappleLegalityEngine.validateAdvancedManeuver(actor, target, maneuver.key, {
          ruleData: options.ruleData ?? {},
          maxTargetSizeDelta: options.maxTargetSizeDelta ?? options.ruleData?.maxTargetSizeDelta ?? 1,
          requiresFreeLimb: options.requiresFreeLimb ?? options.ruleData?.requiresFreeLimb ?? false
        });
        if (legality.allowed === false) {
          legal = false;
          reason = legality.reason;
        } else if (legality.warnings?.length) {
          reason = legality.warnings.join(' ');
        }
      }
      if (legal || includeUnsafe) rows.push({ ...maneuver, legal, reason });
    }

    return rows;
  }

  static async performAdvancedGrappleManeuver(attacker, defender, mode, options = {}) {
    const key = String(mode ?? options.grappleMode ?? '').trim().toLowerCase();
    if (key === 'trip') return await this.tripGrappledOpponent(attacker, defender, options);
    if (key === 'throw') return await this.throwGrappledOpponent(attacker, defender, options);
    if (key === 'crush') return await this.crushPinnedOpponent(attacker, defender, options);
    ui?.notifications?.warn?.('Unknown advanced grapple maneuver.');
    return null;
  }

  static async tripGrappledOpponent(attacker, defender, options = {}) {
    defender = defender?.actor ?? defender ?? this.getTargetActor(options);
    if (!await this._validateAdvancedManeuver(attacker, defender, 'trip', options)) return null;

    const check = await this._opposedGrappleForManeuver(attacker, defender, 'trip', options);
    if (!check?.attackerWins) {
      await this._createAdvancedManeuverMessage({ attacker, defender, maneuver: 'trip', check, success: false });
      return check;
    }

    await CombatStatusResolver.setStatus(defender, { prone: true, source: 'grapple-trip' });
    const result = { ...check, maneuver: 'trip', tripped: true };
    await this._createAdvancedManeuverMessage({ attacker, defender, maneuver: 'trip', check, success: true, effects: ['Prone'] });
    Hooks.callAll('swse.grappleManeuver', { attacker, defender, maneuver: 'trip', result });
    ui?.notifications?.info?.(`${attacker.name} trips ${defender.name}; target is Prone.`);
    return result;
  }

  static async throwGrappledOpponent(attacker, defender, options = {}) {
    defender = defender?.actor ?? defender ?? this.getTargetActor(options);
    if (!await this._validateAdvancedManeuver(attacker, defender, 'throw', options)) return null;

    const check = await this._opposedGrappleForManeuver(attacker, defender, 'throw', options);
    if (!check?.attackerWins) {
      await this._createAdvancedManeuverMessage({ attacker, defender, maneuver: 'throw', check, success: false });
      return check;
    }

    const damage = await this._rollAndApplyGrappleDamage(attacker, defender, {
      ...options,
      source: 'grapple-throw',
      sourceLabel: 'Throw',
      workflowContext: options.workflowContext ?? options.combatContext ?? null
    });
    await GrappleStateEngine.clearPair(attacker, defender, { quiet: true });

    const result = { ...check, maneuver: 'throw', thrown: true, damage };
    await this._createAdvancedManeuverMessage({
      attacker,
      defender,
      maneuver: 'throw',
      check,
      success: true,
      damage,
      effects: ['Grapple released', 'GM moves target up to 1 square beyond reach']
    });
    Hooks.callAll('swse.grappleManeuver', { attacker, defender, maneuver: 'throw', result });
    ui?.notifications?.info?.(`${attacker.name} throws ${defender.name}. Move the target at the table, then confirm final position.`);
    return result;
  }

  static async crushPinnedOpponent(attacker, defender, options = {}) {
    defender = defender?.actor ?? defender ?? this.getTargetActor(options);
    if (!await this._validateAdvancedManeuver(attacker, defender, 'crush', options)) return null;

    const damage = await this._rollAndApplyGrappleDamage(attacker, defender, {
      ...options,
      source: 'grapple-crush',
      sourceLabel: 'Crush',
      workflowContext: options.workflowContext ?? options.combatContext ?? null
    });

    let rancorCrush = null;
    if (swseActorHasFeatExact(attacker, 'Rancor Crush')) {
      rancorCrush = await ActorEngine.applyConditionShift(defender, 1, 'Rancor Crush');
    }

    const result = { maneuver: 'crush', crushed: true, attacker, defender, damage, rancorCrush };
    await this._createAdvancedManeuverMessage({
      attacker,
      defender,
      maneuver: 'crush',
      success: true,
      damage,
      effects: rancorCrush ? ['Rancor Crush: target moves -1 step on the Condition Track'] : []
    });
    Hooks.callAll('swse.grappleManeuver', { attacker, defender, maneuver: 'crush', result });
    ui?.notifications?.info?.(`${attacker.name} crushes ${defender.name}.${rancorCrush ? ' Rancor Crush worsens the target condition.' : ''}`);
    return result;
  }

  static async _validateAdvancedManeuver(attacker, defender, mode, options = {}) {
    const maneuver = ADVANCED_GRAPPLE_MANEUVERS[mode];
    if (!maneuver) {
      ui?.notifications?.warn?.('Unknown advanced grapple maneuver.');
      return false;
    }
    if (!attacker || !defender) {
      ui?.notifications?.warn?.(`Select one target before using ${maneuver.actionLabel}.`);
      return false;
    }
    if (actorId(attacker) && actorId(attacker) === actorId(defender)) {
      ui?.notifications?.warn?.('A creature cannot use a grapple maneuver on itself.');
      return false;
    }
    if (!swseActorHasFeatExact(attacker, maneuver.feat)) {
      ui?.notifications?.warn?.(`${attacker.name} lacks the ${maneuver.feat} feat.`);
      return false;
    }
    if (maneuver.requiresState === 'grappled' && (!GrappleStateEngine.hasState(attacker, 'grappled') || !GrappleStateEngine.hasState(defender, 'grappled'))) {
      ui?.notifications?.warn?.(`${maneuver.actionLabel} requires both creatures to already be Grappled.`);
      return false;
    }
    if (maneuver.requiresTargetState === 'pinned' && !GrappleStateEngine.hasState(defender, 'pinned')) {
      ui?.notifications?.warn?.(`${maneuver.actionLabel} requires the target to be Pinned.`);
      return false;
    }
    const legality = GrappleLegalityEngine.validateAdvancedManeuver(attacker, defender, mode, {
      maxTargetSizeDelta: maneuver.maxTargetSizeDelta ?? 1,
      requiresFreeLimb: maneuver.requiresFreeLimb === true
    });
    if (options.skipLegalityConfirm !== true && !await GrappleLegalityEngine.confirm(legality, { actionName: maneuver.actionLabel })) return false;
    return true;
  }

  static async _opposedGrappleForManeuver(attacker, defender, maneuver, options = {}) {
    const atk = await this._rollGrappleBonus(attacker, { mode: `${maneuver}Grapple` });
    const def = await this._rollGrappleBonus(defender, { mode: 'resistGrapple' });
    const attackerRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${atk}`, {}, { domain: `combat.grapple.${maneuver}` });
    const defenderRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${def}`, {}, { domain: `combat.grapple.resist.${maneuver}` });
    const attackerWins = resultTotal(attackerRoll) > resultTotal(defenderRoll);
    return {
      attacker,
      defender,
      maneuver,
      actionId: options.actionId ?? `grapple-${maneuver}`,
      attackerRoll,
      defenderRoll,
      attackerBonus: atk,
      defenderBonus: def,
      attackerWins,
      isTie: resultTotal(attackerRoll) === resultTotal(defenderRoll)
    };
  }

  static async _rollAndApplyGrappleDamage(attacker, defender, options = {}) {
    const weapon = buildVirtualUnarmedWeapon(attacker, {
      name: options.sourceLabel ? `${options.sourceLabel} Damage` : 'Grapple Damage',
      id: `swse-virtual-${options.source ?? 'grapple-damage'}`
    });
    const strength = Number(SchemaAdapters.getAbilityMod(attacker, 'str') ?? 0) || 0;
    const baseFormula = String(weapon?.system?.damage ?? '1d4').trim() || '1d4';
    const formula = strength ? `${baseFormula} ${strength >= 0 ? '+' : '-'} ${Math.abs(strength)}` : baseFormula;
    const roll = await globalThis.SWSE.RollEngine.safeRoll(formula, attacker?.getRollData?.() ?? {}, {
      actor: attacker,
      domain: 'combat.grapple.damage',
      context: { targetId: actorId(defender), source: options.source ?? 'grapple-damage' }
    });
    const packet = buildDamagePacket({
      attacker,
      target: defender,
      weapon,
      amount: resultTotal(roll),
      roll,
      workflowContext: options.workflowContext ?? options.combatContext ?? null,
      options: {
        source: options.source ?? 'grapple-damage',
        damageType: 'bludgeoning',
        hit: true,
        sourceActor: attacker,
        weapon
      }
    });
    const applied = await DamageSystem.applyPacketToActor(defender, packet);
    return { roll, packet, applied, formula, total: resultTotal(roll) };
  }

  // ---------------------------------------------------------------------------
  // Escape Grapple
  // ---------------------------------------------------------------------------

  static async escapeGrapple(escaper, grappler = null, options = {}) {
    grappler = grappler?.actor ?? grappler ?? this.getTargetActor(options);
    if (!escaper || !grappler) {
      ui?.notifications?.warn?.('Select the grappler before escaping.');
      return null;
    }

    const escapeMode = await this._resolveEscapeMode(escaper, options);
    if (!escapeMode) return null;

    const result = escapeMode === 'acrobatics'
      ? await this._escapeWithAcrobatics(escaper, grappler, options)
      : await this._escapeWithGrapple(escaper, grappler, options);

    if (result?.escaped) {
      await GrappleStateEngine.clearPair(escaper, grappler, { quiet: true });
      ui?.notifications?.info?.(`${escaper.name} escapes the grapple!`);
      await this._createGrappleReleasedMessage(escaper, grappler, 'escapes from');
    }

    return result;
  }


  static async _resolveEscapeMode(actor, options = {}) {
    const requested = String(options.escapeMode ?? options.mode ?? '').trim().toLowerCase();
    if (['grapple', 'acrobatics'].includes(requested)) return requested;
    if (options.promptEscapeMode === false) return 'grapple';
    if (typeof Dialog === 'undefined') return 'grapple';

    const acrobatics = actor?.system?.skills?.acrobatics ?? actor?.system?.derived?.skills?.acrobatics ?? null;
    const trained = acrobatics?.trained === true || acrobatics?.isTrained === true;
    const acrobaticsHint = trained ? 'Acrobatics' : 'Acrobatics (if allowed/trained)';

    return await new Promise(resolve => {
      new Dialog({
        title: 'Escape Grapple',
        content: `<p>Choose how ${escapeHTML(actor?.name ?? 'this actor')} attempts to escape.</p>`,
        buttons: {
          grapple: {
            label: 'Opposed Grapple',
            callback: () => resolve('grapple')
          },
          acrobatics: {
            label: acrobaticsHint,
            callback: () => resolve('acrobatics')
          }
        },
        default: 'grapple',
        close: () => resolve(null)
      }).render(true);
    });
  }

  static async _escapeWithGrapple(escaper, grappler, options = {}) {
    const escaperBonus = await this._rollGrappleBonus(escaper, { mode: 'escapeGrapple' });
    const grapplerBonus = await this._rollGrappleBonus(grappler, { mode: 'resistEscape' });
    const escaperRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${escaperBonus}`, {}, { domain: 'combat.grapple.escape' });
    const grapplerRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${grapplerBonus}`, {}, { domain: 'combat.grapple.resistEscape' });
    const escaped = Number(escaperRoll.total ?? 0) > Number(grapplerRoll.total ?? 0);
    const result = {
      escaper,
      grappler,
      escapeMode: 'grapple',
      escaperRoll,
      grapplerRoll,
      escaperBonus,
      grapplerBonus,
      escaped,
      isTie: Number(escaperRoll.total ?? 0) === Number(grapplerRoll.total ?? 0)
    };
    await this._createEscapeMessage(result);
    return result;
  }

  static async _escapeWithAcrobatics(escaper, grappler, options = {}) {
    const skillResult = await SWSERoll.rollSkill(escaper, 'acrobatics', {
      showDialog: options.showDialog !== false,
      actionType: options.actionType ?? 'standard',
      sourceType: 'combat.grapple.escape',
      sourceLabel: 'Escape Grapple',
      skillUse: { key: 'escape-grapple', label: 'Escape Grapple' },
      useKey: 'escape-grapple'
    });
    if (!skillResult) return null;
    const grapplerBonus = await this._rollGrappleBonus(grappler, { mode: 'resistEscape' });
    const grapplerRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${grapplerBonus}`, {}, { domain: 'combat.grapple.resistEscape' });
    const escaped = Number(skillResult.total ?? skillResult.roll?.total ?? 0) > Number(grapplerRoll.total ?? 0);
    const result = {
      escaper,
      grappler,
      escapeMode: 'acrobatics',
      escaperRoll: skillResult.roll ?? skillResult,
      grapplerRoll,
      escaperBonus: Number(skillResult.skillTotal ?? 0) || null,
      grapplerBonus,
      escaped,
      isTie: Number(skillResult.total ?? skillResult.roll?.total ?? 0) === Number(grapplerRoll.total ?? 0)
    };
    await this._createEscapeMessage(result);
    return result;
  }

  static async releaseGrapple(actor, target = null) {
    target = target?.actor ?? target ?? this.getTargetActor();
    if (!actor || !target) {
      ui?.notifications?.warn?.('Select the grapple target to release.');
      return null;
    }
    await GrappleStateEngine.clearPair(actor, target, { quiet: true });
    ui?.notifications?.info?.(`${actor.name} releases ${target.name}.`);
    await this._createGrappleReleasedMessage(actor, target, 'releases');
    return { released: true, actor, target };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  static async _rollGrappleBonus(actor, context = {}) {
    const bab = Number(SchemaAdapters.getBAB(actor) ?? 0) || 0;
    const str = Number(SchemaAdapters.getAbilityMod(actor, 'str') ?? 0) || 0;
    const dex = Number(SchemaAdapters.getAbilityMod(actor, 'dex') ?? 0) || 0;
    const ability = context.useDex === true ? dex : Math.max(str, dex);
    const sizeMod = this._sizeMod(actor.system?.size ?? actor.system?.traits?.size ?? actor.system?.droidSize);
    const halfLevel = Number(getEffectiveHalfLevel(actor) ?? 0) || 0;

    const speciesCombat = actor.system?.speciesCombatBonuses || actor.system?.speciesTraitBonuses?.combat || {};
    const speciesGrapple = Number(speciesCombat.grapple ?? 0) || 0;

    let bonus = bab + ability + halfLevel + sizeMod + speciesGrapple;
    bonus += swseTalentGrappleBonus(actor, context.mode);

    if (context.mode === 'resistGrapple') {
      bonus += Number(MetaResourceFeatResolver.getGrappleResistanceBonus(actor, { mode: 'resistGrapple' }) ?? 0) || 0;
    }

    return bonus;
  }

  static _sizeMod(size) {
    const table = {
      fine: -16, diminutive: -12, tiny: -8, small: -4,
      medium: 0, large: 4, huge: 8, gargantuan: 12, colossal: 16
    };
    return table[String(size ?? 'medium').toLowerCase()] ?? 0;
  }

  static _getUnarmedAttack(actor) {
    return buildVirtualUnarmedWeapon(actor, { name: 'Unarmed Grab', id: 'swse-virtual-unarmed-grab' });
  }

  static async _applyState(actor, state, sourceActor) {
    return await GrappleStateEngine.setState(actor, state, sourceActor);
  }

  static async _clearState(actor) {
    return await GrappleStateEngine.clearState(actor, { quiet: true });
  }

  static _hasFeat(actor, name) {
    const wanted = swseNormalizeName(name);
    return ActorAbilityBridge.getFeats(actor).some(f => {
      const normalized = swseNormalizeName(f?.name);
      return normalized === wanted || normalized.startsWith(`${wanted} `) || normalized.endsWith(` ${wanted}`);
    });
  }

  static _hasGrappledState(actor) {
    return GrappleStateEngine.hasState(actor, 'grappled');
  }

  // ---------------------------------------------------------------------------
  // Chat Messages
  // ---------------------------------------------------------------------------

  static _button(action, actor, target, label, attrs = {}) {
    const actionCost = attrs['action-cost'] ?? attrs.actionCost ?? (action === 'release' ? 'free' : 'standard');
    const actionName = attrs['action-name'] ?? attrs.actionName ?? label ?? 'Grapple Action';
    const mergedAttrs = { ...(attrs ?? {}) };
    delete mergedAttrs.actionCost;
    delete mergedAttrs.actionName;
    mergedAttrs['action-cost'] = actionCost;
    mergedAttrs['action-name'] = actionName;
    const extraAttrs = Object.entries(mergedAttrs || {})
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => ` data-${escapeHTML(String(key).replace(/[A-Z]/g, c => `-${c.toLowerCase()}`))}="${escapeHTML(value)}"`)
      .join('');
    return `<button type="button" class="swse-grapple-action" data-grapple-action="${escapeHTML(action)}" data-actor-id="${escapeHTML(actorId(actor))}" data-target-id="${escapeHTML(actorId(target))}"${extraAttrs}>${escapeHTML(label)}</button>`;
  }


  static _advancedManeuverButtons(actor, target, options = {}) {
    const includePin = options.includePin === true;
    const includeCrush = options.includeCrush === true;
    const parts = [];
    if (includePin && this._hasFeat(actor, 'Pin')) {
      parts.push(this._button('pin', actor, target, 'Attempt Pin'));
    }
    if (swseActorHasFeatExact(actor, 'Trip')) {
      parts.push(this._button('trip', actor, target, 'Trip'));
    }
    if (swseActorHasFeatExact(actor, 'Throw')) {
      parts.push(this._button('throw', actor, target, 'Throw'));
    }
    if (includeCrush && swseActorHasFeatExact(actor, 'Crush')) {
      parts.push(this._button('crush', actor, target, swseActorHasFeatExact(actor, 'Rancor Crush') ? 'Crush + Rancor Crush' : 'Crush'));
    }
    return parts.join('\n');
  }

  static async _createPinResultMessage(attacker, defender) {
    const actions = `<div class="swse-chat-card__actions">
      ${this._advancedManeuverButtons(attacker, defender, { includeCrush: true })}
      ${this._button('escape', defender, attacker, 'Escape (Grapple)', { 'escape-mode': 'grapple' })}
      ${this._button('escape', defender, attacker, 'Escape (Acrobatics)', { 'escape-mode': 'acrobatics' })}
      ${this._button('release', attacker, defender, 'Release')}
    </div>`;
    const html = `
      <section class="swse-chat-card swse-grapple-pin-card">
        <header class="swse-chat-card__header"><strong>${actorLabel(attacker)} pins ${actorLabel(defender)}</strong></header>
        <div class="swse-chat-card__body">
          <p>${actorLabel(defender)} is now <strong>Pinned</strong>. Pin is represented as grapple state, not condition-track damage.</p>
          ${actions}
        </div>
      </section>
    `;
    await createChatMessage({ speaker: ChatMessage.getSpeaker({ actor: attacker }), content: html });
  }

  static async _createAdvancedManeuverMessage({ attacker, defender, maneuver, check = null, success = false, damage = null, effects = [] } = {}) {
    const config = ADVANCED_GRAPPLE_MANEUVERS[maneuver] ?? { label: maneuver ?? 'Grapple Maneuver' };
    const attackerTotal = check ? resultTotal(check.attackerRoll) : null;
    const defenderTotal = check ? resultTotal(check.defenderRoll) : null;
    const outcome = success
      ? `${attacker?.name ?? 'Actor'} succeeds with ${config.label}.`
      : `${attacker?.name ?? 'Actor'} fails to ${String(config.label ?? maneuver).toLowerCase()}.`;
    const damageText = damage ? `<p><strong>Damage:</strong> ${Number(damage.total ?? damage.roll?.total ?? 0) || 0} (${escapeHTML(damage.formula ?? '')})</p>` : '';
    const effectText = effects.length ? `<ul>${effects.map(effect => `<li>${escapeHTML(effect)}</li>`).join('')}</ul>` : '';
    const retry = success ? '' : `<div class="swse-chat-card__actions">${this._button(maneuver, attacker, defender, `Retry ${config.label}`)}</div>`;
    const html = `
      <section class="swse-chat-card swse-grapple-maneuver-card">
        <header class="swse-chat-card__header"><strong>${actorLabel(attacker)} uses ${escapeHTML(config.label)} on ${actorLabel(defender)}</strong></header>
        <div class="swse-chat-card__body">
          ${check ? `<p>${actorLabel(attacker)}: <strong>${attackerTotal}</strong></p><p>${actorLabel(defender)}: <strong>${defenderTotal}</strong></p>` : ''}
          <p class="${success ? 'success' : 'failure'}"><strong>${escapeHTML(outcome)}</strong></p>
          ${damageText}
          ${effectText}
          ${retry}
        </div>
      </section>
    `;
    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html,
      rolls: damage?.roll ? [damage.roll] : []
    });
  }

  static async _createGrabMessage(data) {
    const { attacker, target, roll, total, reflex, hit, d20, grabPenalty, grappleResistance } = data;
    const actions = hit
      ? `<div class="swse-chat-card__actions">
          ${this._button('grapple-check', attacker, target, 'Opposed Grapple')}
          ${this._button('escape', target, attacker, 'Escape (Grapple)', { 'escape-mode': 'grapple' })}
          ${this._button('escape', target, attacker, 'Escape (Acrobatics)', { 'escape-mode': 'acrobatics' })}
          ${this._button('release', attacker, target, 'Release')}
        </div>`
      : '';

    const html = `
      <section class="swse-chat-card swse-grab-card">
        <header class="swse-chat-card__header">
          <strong>${escapeHTML(attacker.name)} attempts to Grab ${escapeHTML(target.name)}</strong>
        </header>
        <div class="swse-chat-card__body">
          <p><strong>Attack Roll:</strong> ${Number(total) || 0} ${d20 ? `(d20=${d20})` : ''}</p>
          <p><strong>Grab Modifier:</strong> ${grabPenalty >= 0 ? '+' : ''}${grabPenalty}</p>
          <p><strong>Target Reflex:</strong> ${Number(reflex) || 10}${grappleResistance ? ` (${grappleResistance >= 0 ? '+' : ''}${grappleResistance} grapple resistance)` : ''}</p>
          <p class="${hit ? 'success' : 'failure'}"><strong>${hit ? 'Grabbed!' : 'Miss!'}</strong></p>
          ${actions}
        </div>
      </section>
    `;

    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html,
      rolls: roll ? [roll] : []
    });
  }

  static async _createGrappleCheckMessage(result) {
    const { attacker, defender, attackerRoll, defenderRoll, attackerWins, isTie } = result;
    const attackerTotal = Number(attackerRoll?.total ?? 0) || 0;
    const defenderTotal = Number(defenderRoll?.total ?? 0) || 0;
    const winnerText = isTie ? 'Tie — no state change.' : (attackerWins ? `${attacker.name} wins!` : `${defender.name} wins!`);
    const actions = attackerWins
      ? `<div class="swse-chat-card__actions">
          ${this._advancedManeuverButtons(attacker, defender, { includePin: result?.actionId !== 'pin' })}
          ${this._button('escape', defender, attacker, 'Escape (Grapple)', { 'escape-mode': 'grapple' })}
          ${this._button('escape', defender, attacker, 'Escape (Acrobatics)', { 'escape-mode': 'acrobatics' })}
          ${this._button('release', attacker, defender, 'Release')}
        </div>`
      : '';

    const html = `
      <section class="swse-chat-card swse-grapple-check-card">
        <header class="swse-chat-card__header">
          <strong>${escapeHTML(attacker.name)} vs ${escapeHTML(defender.name)} — Grapple Check</strong>
        </header>
        <div class="swse-chat-card__body">
          <p>${escapeHTML(attacker.name)}: <strong>${attackerTotal}</strong></p>
          <p>${escapeHTML(defender.name)}: <strong>${defenderTotal}</strong></p>
          <p class="${attackerWins ? 'success' : 'failure'}"><strong>${escapeHTML(winnerText)}</strong></p>
          ${actions}
        </div>
      </section>
    `;

    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html
    });
  }


  static async _createEscapeMessage(result) {
    const { escaper, grappler, escapeMode, escaperRoll, grapplerRoll, escaped, isTie } = result;
    const escaperTotal = Number(escaperRoll?.total ?? 0) || 0;
    const grapplerTotal = Number(grapplerRoll?.total ?? 0) || 0;
    const modeLabel = escapeMode === 'acrobatics' ? 'Acrobatics' : 'Opposed Grapple';
    const outcome = escaped ? `${escaper.name} escapes!` : (isTie ? 'Tie — the grapple holds.' : `${grappler.name} keeps control.`);
    const html = `
      <section class="swse-chat-card swse-grapple-escape-card">
        <header class="swse-chat-card__header">
          <strong>${escapeHTML(escaper.name)} attempts to escape ${escapeHTML(grappler.name)}</strong>
        </header>
        <div class="swse-chat-card__body">
          <p><strong>Method:</strong> ${escapeHTML(modeLabel)}</p>
          <p>${escapeHTML(escaper.name)}: <strong>${escaperTotal}</strong></p>
          <p>${escapeHTML(grappler.name)}: <strong>${grapplerTotal}</strong></p>
          <p class="${escaped ? 'success' : 'failure'}"><strong>${escapeHTML(outcome)}</strong></p>
          ${escaped ? '' : `<div class="swse-chat-card__actions">
            ${this._button('escape', escaper, grappler, 'Try Grapple Escape', { 'escape-mode': 'grapple' })}
            ${this._button('escape', escaper, grappler, 'Try Acrobatics Escape', { 'escape-mode': 'acrobatics' })}
            ${this._button('release', grappler, escaper, 'Release')}
          </div>`}
        </div>
      </section>
    `;
    await createChatMessage({ speaker: ChatMessage.getSpeaker({ actor: escaper }), content: html });
  }

  static async _createGrappleReleasedMessage(actor, target, verb = 'releases') {
    const html = `
      <section class="swse-chat-card swse-grapple-release-card">
        <header class="swse-chat-card__header"><strong>Grapple Released</strong></header>
        <div class="swse-chat-card__body">
          <p>${escapeHTML(actor?.name ?? 'Actor')} ${escapeHTML(verb)} ${escapeHTML(target?.name ?? 'target')}.</p>
        </div>
      </section>
    `;
    await createChatMessage({ speaker: ChatMessage.getSpeaker({ actor }), content: html });
  }
}

SWSEGrappling.init();

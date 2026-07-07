import { SWSEGrappling } from "/systems/foundryvtt-swse/scripts/combat/systems/grappling-system.js";
import { GrappleStateEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/grapple-state-engine.js";
import { rollAttack } from "/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { buildVirtualUnarmedWeapon, increaseDamageDie } from "/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js";
import { buildDamagePacket } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js";
import { DamageSystem } from "/systems/foundryvtt-swse/scripts/combat/damage-system.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";

function normalizeFeatName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function actorHasFeat(actor, featName) {
  const wanted = normalizeFeatName(featName);
  try {
    return Array.from(actor?.items ?? []).some(item => item?.type === 'feat'
      && item?.system?.disabled !== true
      && normalizeFeatName(item?.name) === wanted);
  } catch (_err) {
    return false;
  }
}

function actorGrappleRules(actor) {
  const rules = [];
  try {
    for (const item of Array.from(actor?.items ?? [])) {
      if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) continue;
      const grappleRules = item?.system?.abilityMeta?.grappleRules;
      if (!Array.isArray(grappleRules)) continue;
      for (const rule of grappleRules) rules.push({ ...rule, sourceName: item.name, sourceId: item.id });
    }
  } catch (_err) {
    // Treat malformed actor/items as having no grapple rules.
  }
  return rules;
}

function findGrappleRule(actor, type, predicate = null) {
  return actorGrappleRules(actor).find(rule => rule?.type === type && (!predicate || predicate(rule)));
}

function actorHasGrappleCapability(actor, type, fallbackFeatName, predicate = null) {
  return !!findGrappleRule(actor, type, predicate) || actorHasFeat(actor, fallbackFeatName);
}

function actorFrom(value) {
  return value?.actor ?? value ?? null;
}

function uniqueActors(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const actor = actorFrom(value);
    if (!actor?.id || seen.has(actor.id)) continue;
    seen.add(actor.id);
    out.push(actor);
  }
  return out;
}

function selectedTargets() {
  try {
    return Array.from(game?.user?.targets ?? []).map(token => token?.actor).filter(Boolean);
  } catch (_err) {
    return [];
  }
}

function strengthModifier(actor) {
  const value = actor?.system?.abilities?.str?.mod
    ?? actor?.system?.abilities?.strength?.mod
    ?? actor?.system?.attributes?.str?.mod
    ?? actor?.system?.stats?.str?.mod
    ?? 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function resultTotal(roll) {
  return Number(roll?.total ?? roll?.roll?.total ?? 0) || 0;
}

function formulaWithModifier(baseFormula, modifier) {
  const base = String(baseFormula ?? '1').trim() || '1';
  const value = Number(modifier) || 0;
  if (!value) return base;
  return `${base} ${value >= 0 ? '+' : '-'} ${Math.abs(value)}`;
}

function cloneWeapon(weapon) {
  const cloner = globalThis.foundry?.utils?.deepClone;
  return cloner ? cloner(weapon) : JSON.parse(JSON.stringify(weapon));
}

function hasSuccessfulGrab(result) {
  return result?.hit === true || result?.grabbed === true || result?.success === true;
}

async function postGrappleFeatDamageMessage({ actor, title, body, rolls = [], flags = {} } = {}) {
  return createChatMessage({
    speaker: ChatMessage.getSpeaker?.({ actor }) ?? { alias: actor?.name ?? 'Actor' },
    content: `<section class="swse-chat-card swse-grapple-feat-card"><header class="swse-chat-card__header"><strong>${title}</strong></header><div class="swse-chat-card__body">${body}</div></section>`,
    rolls: rolls.filter(Boolean),
    flags: { 'foundryvtt-swse': { grappleFeatAction: true, ...flags } }
  });
}

export class GrappleFeatActions {
  static canUse(actor, featName) {
    if (!actor) return false;
    const normalized = normalizeFeatName(featName);
    switch (normalized) {
      case 'grappling strike':
        return false;
      case 'multi grab':
        return actorHasGrappleCapability(actor, 'MULTI_GRAB', 'Multi-Grab');
      case 'grab back':
        return actorHasGrappleCapability(actor, 'REACTION_GRAB_BACK', 'Grab Back');
      case 'bone crusher':
        return actorHasGrappleCapability(actor, 'CONDITION_SHIFT_ON_GRAPPLE_DAMAGE', 'Bone Crusher');
      case 'grapple resistance':
        return actorHasGrappleCapability(actor, 'RESIST_GRAB_AND_GRAPPLE', 'Grapple Resistance');
      case 'pincer':
        return actorHasGrappleCapability(actor, 'PIN_MAINTENANCE_AND_CRUSH', 'Pincer');
      case 'slammer':
        return actorHasGrappleCapability(actor, 'SLAMMER_SPECIAL_ATTACK', 'Slammer');
      case 'knock heads':
        return actorHasGrappleCapability(actor, 'GRAPPLE_ADVISORY_RIDER', 'Knock Heads', rule => rule.id === 'knockHeadsMultiGrabRider' || rule.source === 'Knock Heads');
      default:
        return actorHasFeat(actor, featName);
    }
  }

  /**
   * Grappling Strike was present in generated/bad data, but it is not a valid
   * SWSE feat for this ruleset. Keep the helper as a safe no-op so stale UI
   * buttons or macros do not route into a fake feat implementation.
   */
  static async grapplingStrike(_attacker, _target = null, _options = {}) {
    ui?.notifications?.warn?.('Grappling Strike is not a valid SWSE feat in this system.');
    return null;
  }

  /**
   * Multi-Grab: attempt grab against up to two chosen adjacent targets.
   *
   * Adjacency/anatomy remains GM/player assisted; callers may pass explicit
   * targets or rely on current token targets. Each attempt uses the canonical
   * SWSEGrappling.attemptGrab path.
   */
  static async multiGrab(attacker, targets = null, options = {}) {
    const rule = findGrappleRule(attacker, 'MULTI_GRAB');
    const candidates = uniqueActors(Array.isArray(targets) ? targets : selectedTargets());
    const maxTargets = Math.max(1, Number(options.maxTargets ?? rule?.maxTargets ?? 2) || 2);
    const chosen = candidates.filter(actor => actor?.id !== attacker?.id).slice(0, maxTargets);

    if (!attacker || !chosen.length) {
      ui?.notifications?.warn?.('Select one or two targets before using Multi-Grab.');
      return [];
    }
    if (!rule && !actorHasFeat(attacker, 'Multi-Grab')) {
      ui?.notifications?.warn?.(`${attacker.name} lacks the Multi-Grab feat.`);
      return [];
    }

    const results = [];
    for (const target of chosen) {
      const result = await SWSEGrappling.attemptGrab(attacker, target, {
        ...options,
        actionId: options.actionId ?? 'multi-grab',
        source: rule?.source ?? 'Multi-Grab'
      });
      results.push(result);
    }

    const grabbedTargets = results.filter(hasSuccessfulGrab).map(result => result.target).filter(Boolean);
    if (grabbedTargets.length >= 2 && this.canUse(attacker, 'Knock Heads')) {
      if (options.applyKnockHeads === true) {
        results.knockHeads = await this.knockHeads(attacker, grabbedTargets, options);
      } else {
        ui?.notifications?.info?.(`${attacker.name} can use Knock Heads after this Multi-Grab.`);
      }
    }

    return results;
  }

  static getGrappleRiders(actor, context = {}) {
    const trigger = normalizeFeatName(context.trigger ?? context.grappleTrigger ?? '');
    return actorGrappleRules(actor).filter(rule => {
      if (rule?.type !== 'GRAPPLE_ADVISORY_RIDER' && rule?.type !== 'CONDITION_SHIFT_ON_GRAPPLE_MANEUVER' && rule?.type !== 'CONDITION_SHIFT_ON_GRAPPLE_DAMAGE') return false;
      if (!trigger) return true;
      return normalizeFeatName(rule.trigger ?? rule.maneuver ?? '') === trigger;
    });
  }

  static getKnockHeadsRiders(actor, context = {}) {
    const successCount = Number(context.successfulGrabCount ?? context.grabbedTargets?.length ?? 0) || 0;
    if (successCount < 2) return [];
    return actorGrappleRules(actor)
      .filter(rule => rule?.id === 'knockHeadsMultiGrabRider' || rule?.source === 'Knock Heads')
      .map(rule => ({
        id: rule.id ?? 'knockHeadsMultiGrabRider',
        source: rule.sourceName ?? rule.source ?? 'Knock Heads',
        type: 'knockHeadsMultiGrabRider',
        damageFormula: `1d6 + ${strengthModifier(actor)}`,
        damageType: rule.damage?.damageType ?? 'bludgeoning',
        damageThresholdModifier: Number(rule.damageThresholdModifier ?? -5) || -5,
        preserveGrabbedState: rule.preserveGrabbedState !== false,
        requiresTargetsAdjacentToActorAndEachOther: rule.requiresTargetsAdjacentToActorAndEachOther === true,
        rule
      }));
  }

  static async knockHeads(attacker, targets = null, options = {}) {
    const rule = findGrappleRule(attacker, 'GRAPPLE_ADVISORY_RIDER', candidate => candidate.id === 'knockHeadsMultiGrabRider' || candidate.source === 'Knock Heads');
    const chosen = uniqueActors(Array.isArray(targets) ? targets : selectedTargets())
      .filter(actor => actor?.id !== attacker?.id)
      .slice(0, 2);

    if (!attacker || chosen.length < 2) {
      ui?.notifications?.warn?.('Select two grabbed targets before using Knock Heads.');
      return null;
    }
    if (!rule && !actorHasFeat(attacker, 'Knock Heads')) {
      ui?.notifications?.warn?.(`${attacker.name} lacks the Knock Heads feat.`);
      return null;
    }

    const str = strengthModifier(attacker);
    const formula = formulaWithModifier(rule?.damage?.dice ?? '1d6', str);
    const thresholdModifier = Number(rule?.damageThresholdModifier ?? -5) || -5;
    const weapon = buildVirtualUnarmedWeapon(attacker, { name: 'Knock Heads', id: 'swse-virtual-knock-heads' });
    const results = [];

    for (const target of chosen) {
      const roll = await RollEngine.safeRoll(formula, attacker?.getRollData?.() ?? {}, {
        actor: attacker,
        domain: 'combat.grapple.knockHeads',
        context: { targetId: target.id ?? target._id ?? null, source: 'Knock Heads' }
      });
      const total = resultTotal(roll);
      const thresholdMeasuredDamage = Math.max(0, total - thresholdModifier);
      const packet = buildDamagePacket({
        attacker,
        target,
        weapon,
        amount: total,
        roll,
        workflowContext: options.workflowContext ?? options.combatContext ?? null,
        options: {
          source: 'grapple-knock-heads',
          damageType: rule?.damage?.damageType ?? 'bludgeoning',
          hit: true,
          sourceActor: attacker,
          weapon,
          applyOptions: {
            thresholdDamageOverride: thresholdMeasuredDamage,
            thresholdMeasuredDamage
          }
        }
      });
      const applied = await DamageSystem.applyPacketToActor(target, packet);
      results.push({ target, roll, total, applied, thresholdMeasuredDamage });
    }

    await postGrappleFeatDamageMessage({
      actor: attacker,
      title: `${attacker.name} uses Knock Heads`,
      body: `<p>Each target takes <strong>${formula}</strong> bludgeoning damage. Damage Threshold is treated as 5 lower by measuring each damage roll as +5 for threshold comparison. Both targets remain Grabbed.</p><ul>${results.map(result => `<li>${result.target?.name ?? 'Target'}: ${result.total} damage; threshold measured as ${result.thresholdMeasuredDamage}.</li>`).join('')}</ul>`,
      rolls: results.map(result => result.roll),
      flags: { source: 'Knock Heads', targetIds: chosen.map(target => target.id ?? target._id ?? null) }
    });

    return { attacker, targets: chosen, formula, results, thresholdModifier };
  }

  /**
   * Grab Back: reaction helper for grabbing an enemy after their failed grab/grapple.
   * Trigger detection belongs in ReactionEngine/event wiring; this helper performs
   * the canonical counter-grab once the reaction is selected.
   */
  static async grabBack(defender, attacker = null, options = {}) {
    attacker = actorFrom(attacker) ?? SWSEGrappling.getTargetActor?.(options);
    if (!defender || !attacker) {
      ui?.notifications?.warn?.('Select the triggering opponent before using Grab Back.');
      return null;
    }
    if (!actorHasGrappleCapability(defender, 'REACTION_GRAB_BACK', 'Grab Back')) {
      ui?.notifications?.warn?.(`${defender.name} lacks the Grab Back feat.`);
      return null;
    }

    return SWSEGrappling.attemptGrab(defender, attacker, {
      ...options,
      actionId: options.actionId ?? 'grab-back',
      source: 'Grab Back'
    });
  }

  /**
   * Pincer: helper for maintaining a Pin and optionally applying Crush.
   *
   * The existing grapple system owns Pin and Crush. This helper only checks the
   * feat and target state, then delegates to those canonical methods.
   */
  static async pincer(attacker, defender = null, options = {}) {
    defender = actorFrom(defender) ?? SWSEGrappling.getTargetActor?.(options);
    if (!attacker || !defender) {
      ui?.notifications?.warn?.('Select one pinned target before using Pincer.');
      return null;
    }
    if (!actorHasGrappleCapability(attacker, 'PIN_MAINTENANCE_AND_CRUSH', 'Pincer')) {
      ui?.notifications?.warn?.(`${attacker.name} lacks the Pincer feat.`);
      return null;
    }
    if (!GrappleStateEngine.hasState(defender, 'pinned')) {
      ui?.notifications?.warn?.(`${defender.name} must already be Pinned for Pincer.`);
      return null;
    }

    const maintain = options.skipMaintainCheck === true
      ? { attackerWins: true, pinned: true, skipped: true }
      : await SWSEGrappling.attemptPin(attacker, defender, {
        ...options,
        actionId: options.actionId ?? 'pincer-maintain',
        actionType: 'swift'
      });

    if (!maintain?.attackerWins && !maintain?.pinned) return { maintain, crush: null };

    const crush = options.applyCrush === false
      ? null
      : await SWSEGrappling.crushPinnedOpponent(attacker, defender, {
        ...options,
        actionId: options.crushActionId ?? 'pincer-crush',
        actionType: 'swift'
      });

    return { maintain, crush };
  }

  static async slammer(attacker, defender = null, options = {}) {
    defender = actorFrom(defender) ?? SWSEGrappling.getTargetActor?.(options);
    if (!attacker || !defender) {
      ui?.notifications?.warn?.('Select one target before using Slammer.');
      return null;
    }
    if (!actorHasGrappleCapability(attacker, 'SLAMMER_SPECIAL_ATTACK', 'Slammer')) {
      ui?.notifications?.warn?.(`${attacker.name} lacks the Slammer feat.`);
      return null;
    }

    const slammerRule = findGrappleRule(attacker, 'SLAMMER_SPECIAL_ATTACK');
    const weapon = cloneWeapon(buildVirtualUnarmedWeapon(attacker, { name: 'Slammer', id: 'swse-virtual-slammer' }));
    if (actorHasFeat(attacker, 'Crush') || slammerRule?.crushFeatAddsUnarmedDamageDie === true) {
      weapon.system.damage = increaseDamageDie(weapon.system.damage, 1);
      weapon.flags.swse.slammerCrushExtraDie = true;
    }
    weapon.system.attackOptions = {
      ...(weapon.system.attackOptions ?? {}),
      slammer: true
    };

    const attack = await rollAttack(attacker, weapon, {
      ...options,
      actionId: options.actionId ?? 'slammer',
      target: defender,
      combatOptions: { ...(options.combatOptions ?? {}), slammer: true },
      workflowContext: options.workflowContext ?? options.combatContext ?? null
    });

    if (!attack || attack.isHit !== true) {
      await postGrappleFeatDamageMessage({
        actor: attacker,
        title: `${attacker.name} uses Slammer`,
        body: `<p>${defender.name} was not hit; no Slammer damage is applied.</p>`,
        flags: { source: 'Slammer', targetId: defender.id ?? defender._id ?? null, hit: false }
      });
      return { attacker, defender, attack, hit: false, damage: null, persistent: null };
    }

    const strength = strengthModifier(attacker) * Math.max(1, Number(slammerRule?.damageAbilityMultiplier ?? 2) || 2);
    const formula = formulaWithModifier(weapon.system.damage ?? '1d4', strength);
    const roll = await RollEngine.safeRoll(formula, attacker?.getRollData?.() ?? {}, {
      actor: attacker,
      domain: 'combat.grapple.slammer.damage',
      context: { targetId: defender.id ?? defender._id ?? null, source: 'Slammer' }
    });
    const total = resultTotal(roll);
    const packet = buildDamagePacket({
      attacker,
      target: defender,
      weapon,
      amount: total,
      roll,
      workflowContext: attack.workflowContext ?? options.workflowContext ?? options.combatContext ?? null,
      options: {
        source: 'grapple-slammer',
        damageType: 'bludgeoning',
        hit: true,
        sourceActor: attacker,
        weapon
      }
    });
    const damage = await DamageSystem.applyPacketToActor(defender, packet);
    let persistent = null;
    if (damage?.resolution?.thresholdExceeded === true && slammerRule?.persistentConditionOnThreshold !== false) {
      persistent = await ActorEngine.setConditionPersistent(defender, true, 'Slammer');
    }

    await postGrappleFeatDamageMessage({
      actor: attacker,
      title: `${attacker.name} uses Slammer`,
      body: `<p>${defender.name} takes <strong>${total}</strong> bludgeoning damage from Slammer (${formula}).${persistent ? ' The target gains a Persistent Condition because the damage exceeded Damage Threshold.' : ''}</p>`,
      rolls: [roll],
      flags: { source: 'Slammer', targetId: defender.id ?? defender._id ?? null, hit: true, persistent: Boolean(persistent) }
    });

    return { attacker, defender, attack, hit: true, damage: { roll, total, packet, applied: damage, formula }, persistent };
  }

  static registerGlobals() {
    globalThis.SWSE ??= {};
    globalThis.SWSE.GrappleFeatActions = GrappleFeatActions;
    if (globalThis.game?.swse) game.swse.GrappleFeatActions = GrappleFeatActions;
  }
}

export function registerGrappleFeatActions() {
  GrappleFeatActions.registerGlobals();
}

export default GrappleFeatActions;

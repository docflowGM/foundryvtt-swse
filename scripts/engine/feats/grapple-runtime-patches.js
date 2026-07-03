import { SWSEGrappling } from "/systems/foundryvtt-swse/scripts/combat/systems/grappling-system.js";
import { GrappleStateEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/grapple-state-engine.js";
import { GrappleLegalityEngine } from "/systems/foundryvtt-swse/scripts/engine/combat/grapple-legality-engine.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

const ADVANCED_GRAPPLE_MANEUVERS = Object.freeze({
  trip: {
    key: 'trip',
    feat: 'Trip',
    label: 'Trip',
    actionLabel: 'Trip Grappled Opponent',
    requiresState: 'grappled',
    unlockRule: 'UNLOCK_GRAPPLE_MANEUVER'
  },
  throw: {
    key: 'throw',
    feat: 'Throw',
    label: 'Throw',
    actionLabel: 'Throw Grappled Opponent',
    requiresState: 'grappled',
    unlockRule: 'UNLOCK_GRAPPLE_MANEUVER'
  },
  crush: {
    key: 'crush',
    feat: 'Crush',
    label: 'Crush',
    actionLabel: 'Crush Pinned Opponent',
    requiresTargetState: 'pinned',
    unlockRule: 'UNLOCK_GRAPPLE_MANEUVER'
  }
});

let registered = false;

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function actorHasFeat(actor, name) {
  const wanted = normalizeName(name);
  return actorItems(actor).some(item => item?.type === 'feat'
    && item?.system?.disabled !== true
    && normalizeName(item?.name) === wanted);
}

function grappleRules(actor) {
  const out = [];
  for (const item of actorItems(actor)) {
    if (!['feat', 'talent'].includes(item?.type) || item?.system?.disabled === true) continue;
    const rules = item?.system?.abilityMeta?.grappleRules;
    if (!Array.isArray(rules)) continue;
    for (const rule of rules) out.push({ ...rule, sourceName: item.name, sourceId: item.id });
  }
  return out;
}

function findGrappleRule(actor, type, predicate = null) {
  return grappleRules(actor).find(rule => rule?.type === type && (!predicate || predicate(rule)));
}

function hasManeuverUnlock(actor, maneuver) {
  return !!findGrappleRule(actor, 'UNLOCK_GRAPPLE_MANEUVER', rule => String(rule?.maneuver ?? '').toLowerCase() === maneuver)
    || actorHasFeat(actor, ADVANCED_GRAPPLE_MANEUVERS[maneuver]?.feat ?? maneuver);
}

function hasRancorCrush(actor) {
  return !!findGrappleRule(actor, 'CONDITION_SHIFT_ON_GRAPPLE_MANEUVER', rule => String(rule?.maneuver ?? '').toLowerCase() === 'crush')
    || actorHasFeat(actor, 'Rancor Crush');
}

function resultTotal(roll) {
  return Number(roll?.total ?? roll?.roll?.total ?? 0) || 0;
}

function actorId(actor) {
  return actor?.id ?? actor?._id ?? '';
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

function actorLabel(actor, fallback = 'Actor') {
  return escapeHTML(actor?.name ?? fallback);
}

export function registerGrappleRuntimePatches() {
  if (registered) return;
  registered = true;

  const originalHasFeat = SWSEGrappling._hasFeat?.bind(SWSEGrappling);
  SWSEGrappling._hasFeat = function patchedHasFeat(actor, name) {
    const normalized = normalizeName(name);
    if (['pin', 'trip', 'throw', 'crush'].includes(normalized) && hasManeuverUnlock(actor, normalized)) return true;
    return originalHasFeat ? originalHasFeat(actor, name) : actorHasFeat(actor, name);
  };

  SWSEGrappling.grappleCheck = async function patchedGrappleCheck(attacker, defender, options = {}) {
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

    const attackerTotal = resultTotal(atkRoll);
    const defenderTotal = resultTotal(defRoll);
    const isTie = attackerTotal === defenderTotal;
    const attackerWins = attackerTotal >= defenderTotal;
    const result = {
      attacker,
      defender,
      attackerRoll: atkRoll,
      defenderRoll: defRoll,
      attackerBonus: atk,
      defenderBonus: def,
      actionId: options.actionId ?? 'grapple-check',
      attackerWins,
      isTie,
      tiePolicy: isTie ? 'attacker-meets-beats' : null
    };

    await this._createGrappleCheckMessage(result);

    if (attackerWins) {
      await GrappleStateEngine.advancePair(attacker, defender, 'grappled', {
        actionId: options.actionId ?? 'grapple-check',
        workflowId: options.workflowContext?.workflowId ?? options.combatContext?.workflowId ?? null
      });
      ui?.notifications?.info?.(`${attacker.name} has grappled ${defender.name}!`);
    }

    return result;
  };

  SWSEGrappling.getAvailableAdvancedManeuvers = function patchedGetAvailableAdvancedManeuvers(actor, target = null, options = {}) {
    const includeUnsafe = options.includeUnsafe === true;
    const actorGrappled = GrappleStateEngine.hasState(actor, 'grappled');
    const targetGrappled = GrappleStateEngine.hasState(target, 'grappled');
    const targetPinned = GrappleStateEngine.hasState(target, 'pinned');
    const rows = [];

    for (const maneuver of Object.values(ADVANCED_GRAPPLE_MANEUVERS)) {
      if (!hasManeuverUnlock(actor, maneuver.key)) continue;
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
  };

  SWSEGrappling._validateAdvancedManeuver = async function patchedValidateAdvancedManeuver(attacker, defender, mode, options = {}) {
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
    if (!hasManeuverUnlock(attacker, maneuver.key)) {
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
  };

  SWSEGrappling._opposedGrappleForManeuver = async function patchedOpposedGrappleForManeuver(attacker, defender, maneuver, options = {}) {
    const atk = await this._rollGrappleBonus(attacker, { mode: `${maneuver}Grapple` });
    const def = await this._rollGrappleBonus(defender, { mode: 'resistGrapple' });
    const attackerRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${atk}`, {}, { domain: `combat.grapple.${maneuver}` });
    const defenderRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${def}`, {}, { domain: `combat.grapple.resist.${maneuver}` });
    const attackerTotal = resultTotal(attackerRoll);
    const defenderTotal = resultTotal(defenderRoll);
    const isTie = attackerTotal === defenderTotal;
    return {
      attacker,
      defender,
      maneuver,
      actionId: options.actionId ?? `grapple-${maneuver}`,
      attackerRoll,
      defenderRoll,
      attackerBonus: atk,
      defenderBonus: def,
      attackerWins: attackerTotal >= defenderTotal,
      isTie,
      tiePolicy: isTie ? 'attacker-meets-beats' : null
    };
  };

  SWSEGrappling.crushPinnedOpponent = async function patchedCrushPinnedOpponent(attacker, defender, options = {}) {
    defender = defender?.actor ?? defender ?? this.getTargetActor(options);
    if (!await this._validateAdvancedManeuver(attacker, defender, 'crush', options)) return null;

    const damage = await this._rollAndApplyGrappleDamage(attacker, defender, {
      ...options,
      source: 'grapple-crush',
      sourceLabel: 'Crush',
      workflowContext: options.workflowContext ?? options.combatContext ?? null
    });

    let rancorCrush = null;
    const rancorRule = findGrappleRule(attacker, 'CONDITION_SHIFT_ON_GRAPPLE_MANEUVER', rule => String(rule?.maneuver ?? '').toLowerCase() === 'crush');
    if (rancorRule || hasRancorCrush(attacker)) {
      const steps = Math.max(1, Number(rancorRule?.steps ?? 1) || 1);
      rancorCrush = await ActorEngine.applyConditionShift(defender, steps, rancorRule?.source ?? 'Rancor Crush');
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
  };

  SWSEGrappling._advancedManeuverButtons = function patchedAdvancedManeuverButtons(actor, target, options = {}) {
    const includePin = options.includePin === true;
    const includeCrush = options.includeCrush === true;
    const parts = [];
    if (includePin && this._hasFeat(actor, 'Pin')) {
      parts.push(this._button('pin', actor, target, 'Attempt Pin'));
    }
    if (hasManeuverUnlock(actor, 'trip')) {
      parts.push(this._button('trip', actor, target, 'Trip'));
    }
    if (hasManeuverUnlock(actor, 'throw')) {
      parts.push(this._button('throw', actor, target, 'Throw'));
    }
    if (includeCrush && hasManeuverUnlock(actor, 'crush')) {
      parts.push(this._button('crush', actor, target, hasRancorCrush(actor) ? 'Crush + Rancor Crush' : 'Crush'));
    }
    return parts.join('\n');
  };

  const originalCreateGrappleCheckMessage = SWSEGrappling._createGrappleCheckMessage?.bind(SWSEGrappling);
  SWSEGrappling._createGrappleCheckMessage = async function patchedCreateGrappleCheckMessage(result) {
    if (!result?.isTie || !result?.tiePolicy) return originalCreateGrappleCheckMessage?.(result);
    const { attacker, defender, attackerRoll, defenderRoll, attackerWins } = result;
    const attackerTotal = Number(attackerRoll?.total ?? 0) || 0;
    const defenderTotal = Number(defenderRoll?.total ?? 0) || 0;
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
          <p class="success"><strong>${actorLabel(attacker)} wins the tie by meet-or-beat.</strong></p>
          ${actions}
        </div>
      </section>
    `;
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: attacker }), content: html });
  };
}

export default registerGrappleRuntimePatches;

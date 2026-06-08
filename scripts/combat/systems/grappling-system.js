/**
 * SWSE Grappling System (R1 — Strict RAW)
 * Integrated with:
 * - SWSECombat (attack coordinator)
 * - SWSERoll (dice & FP system)
 * - DamageSystem (damage application)
 * - ActiveEffectsManager (states: Grabbed, Grappled, Pinned)
 * - combat-utils (size modifiers, bonuses)
 */

import { computeAttackBonus } from '../utils/combat-utils.js';
import { SWSERoll } from '../rolls/enhanced-rolls.js';
import { createChatMessage } from '../../core/document-api-v13.js';
import { DamageSystem } from '../damage-system.js';
import { ActorEngine } from '../../actors/engine/actor-engine.js';
import { SchemaAdapters } from '../../utils/schema-adapters.js';
import { ActorAbilityBridge } from '../../adapters/ActorAbilityBridge.js';
import MetaResourceFeatResolver from '/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js';
import { buildVirtualUnarmedWeapon } from '/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js';


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

export class SWSEGrappling {

  static init() {
    // Grappling system initialized (no additional setup required)
  }

  static getSelectedActor() {
    return canvas.tokens.controlled[0]?.actor ?? null;
  }

  // ---------------------------------------------------------------------------
  // RAW STEP 1: Attempt Grab (Attack vs Reflex Defense)
  // ---------------------------------------------------------------------------

  static async attemptGrab(attacker, target) {
    if (!attacker || !target) {return;}

    const weapon = this._getUnarmedAttack(attacker);
    const grabPenalty = swseGrabAttackPenalty(attacker);
    const attackResult = await SWSERoll.rollAttack(attacker, weapon, {
      customModifier: grabPenalty,
      maneuver: 'grab',
      actionId: 'grab',
      combatOptions: { grab: true },
      target
    });
    const roll = attackResult?.roll ?? attackResult;
    const total = Number(attackResult?.total ?? attackResult?.roll?.total ?? roll?.total ?? 0);

    // Hit resolution pipeline
    const baseReflex = target.system.defenses?.reflex?.total ?? 10;
    const grappleResistance = MetaResourceFeatResolver.getGrappleResistanceBonus(target, { mode: 'resistGrab' });
    const reflex = baseReflex + grappleResistance;
    const hit = (total >= reflex) || roll.dice[0].results[0].result === 20;

    const result = { attacker, target, roll, total, reflex, hit, baseReflex, grappleResistance };

    if (hit) {
      await this._applyState(target, 'grabbed', attacker);
      ui.notifications.info(`${attacker.name} grabs ${target.name}!`);
    }

    await this._createGrabMessage(result);
    return result;
  }

  // ---------------------------------------------------------------------------
  // RAW STEP 2 (Next Round): Opposed Grapple Check
  // ---------------------------------------------------------------------------

  static async grappleCheck(attacker, defender, options = {}) {
    const atk = await this._rollGrappleBonus(attacker, { mode: 'attackGrapple' });
    const def = await this._rollGrappleBonus(defender, { mode: 'resistGrapple' });

    const atkRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${atk}`, {}, { domain: 'combat.grapple.attack' });
    const defRoll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${def}`, {}, { domain: 'combat.grapple.defense' });

    const attackerWins = atkRoll.total > defRoll.total;

    const result = {
      attacker,
      defender,
      attackerRoll: atkRoll,
      defenderRoll: defRoll,
      attackerWins,
      isTie: atkRoll.total === defRoll.total
    };

    await this._createGrappleCheckMessage(result);

    if (result.isTie) {return result;}

    if (attackerWins) {
      await this._applyState(attacker, 'grappled', defender);
      await this._applyState(defender, 'grappled', attacker);
      ui.notifications.info(`${attacker.name} has grappled ${defender.name}!`);
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Attempt Pin (requires Pin feat)
  // ---------------------------------------------------------------------------

  static async attemptPin(attacker, defender) {
    if (!this._hasFeat(attacker, 'Pin')) {
      ui.notifications.warn(`${attacker.name} lacks the Pin feat.`);
      return false;
    }

    if (!this._hasGrappledState(attacker) || !this._hasGrappledState(defender)) {
      ui.notifications.warn(`Both creatures must already be Grappled.`);
      return false;
    }

    const check = await this.grappleCheck(attacker, defender);

    if (check.attackerWins) {
      await this._applyState(defender, 'pinned', attacker);
      ui.notifications.info(`${attacker.name} pins ${defender.name}!`);
      return true;
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Escape Grapple
  // ---------------------------------------------------------------------------

  static async escapeGrapple(escaper, grappler) {
    const result = await this.grappleCheck(escaper, grappler);

    if (result.attackerWins) {
      await this._clearState(escaper);
      await this._clearState(grappler);
      ui.notifications.info(`${escaper.name} escapes the grapple!`);
      return true;
    }

    return false;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  static async _rollGrappleBonus(actor, context = {}) {
    const lvl = actor.system.level ?? 1;
    const bab = SchemaAdapters.getBAB(actor);
    const str = SchemaAdapters.getAbilityMod(actor, 'str');
    const sizeMod = this._sizeMod(actor.system.size);

    const speciesCombat = actor.system?.speciesCombatBonuses || actor.system?.speciesTraitBonuses?.combat || {};
    const speciesGrapple = speciesCombat.grapple || 0;

    let bonus = bab + str + sizeMod + speciesGrapple;
    bonus += swseTalentGrappleBonus(actor, context.mode);

    if (context.mode === 'resistGrapple') {
      bonus += MetaResourceFeatResolver.getGrappleResistanceBonus(actor, { mode: 'resistGrapple' });
    }

    return bonus;
  }

  static _sizeMod(size) {
    const table = {
      fine: -16, diminutive: -12, tiny: -8, small: -4,
      medium: 0, large: 4, huge: 8, gargantuan: 12, colossal: 16
    };
    return table[size?.toLowerCase()] ?? 0;
  }

  static _getUnarmedAttack(actor) {
    return buildVirtualUnarmedWeapon(actor, { name: 'Unarmed Grab' });
  }

  static async _applyState(actor, state, sourceActor) {
    let effectData;

    switch (state) {
      case 'grabbed':
        effectData = {
          label: 'Grabbed',
          icon: 'icons/svg/net.svg',
          origin: sourceActor.uuid,
          changes: [{
            key: 'system.defenses.reflex.bonus',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: -5
          }],
          flags: { swse: { grapple: 'grabbed', source: sourceActor.id } }
        };
        break;

      case 'grappled':
        effectData = {
          label: 'Grappled',
          icon: 'icons/svg/anchor.svg',
          origin: sourceActor.uuid,
          changes: [{
            key: 'system.defenses.reflex.bonus',
            mode: CONST.ACTIVE_EFFECT_MODES.ADD,
            value: -5
          }],
          flags: { swse: { grapple: 'grappled', source: sourceActor.id } }
        };
        break;

      case 'pinned':
        effectData = {
          label: 'Pinned',
          icon: 'icons/svg/trap.svg',
          origin: sourceActor.uuid,
          changes: [
            { key: 'system.defenses.reflex.bonus', mode: CONST.ACTIVE_EFFECT_MODES.ADD, value: -10 },
            { key: 'system.conditionTrack.current', mode: 'OVERRIDE', value: 5 }
          ],
          flags: { swse: { grapple: 'pinned', source: sourceActor.id } }
        };
        break;
    }

    await ActorEngine.createEmbeddedDocuments(actor, 'ActiveEffect', [effectData]);
  }

  static async _clearState(actor) {
    const effects = actor.effects.filter(e => e.flags?.swse?.grapple);
    await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', effects.map(e => e.id));
  }

  static _hasFeat(actor, name) {
    return ActorAbilityBridge.getFeats(actor).some(f => f.name.toLowerCase().includes(name.toLowerCase()));
  }

  static _hasGrappledState(actor) {
    return actor.effects.some(e => e.flags?.swse?.grapple === 'grappled');
  }

  // ---------------------------------------------------------------------------
  // Chat Messages
  // ---------------------------------------------------------------------------

  static async _createGrabMessage(data) {
    const { attacker, target, roll, total, reflex, hit } = data;

    const html = `
      <div class="swse-grab-card">
        <h3>${attacker.name} attempts to Grab ${target.name}</h3>
        <div>Attack Roll: ${total} (d20=${roll.dice[0].results[0].result})</div>
        <div>Target Reflex: ${reflex}</div>
        <div class="${hit ? 'success' : 'failure'}">${hit ? 'Grabbed!' : 'Miss!'}</div>
      </div>
    `;

    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html,
      rolls: [roll]
    });
  }

  static async _createGrappleCheckMessage(result) {
    const { attacker, defender, attackerRoll, defenderRoll, attackerWins } = result;

    const html = `
      <div class="swse-grapple-check-card">
        <h3>${attacker.name} vs ${defender.name} — Grapple Check</h3>
        <div>${attacker.name}: ${attackerRoll.total}</div>
        <div>${defender.name}: ${defenderRoll.total}</div>
        <div class="${attackerWins ? 'success' : 'failure'}">
          ${attackerWins ? `${attacker.name} wins!` : `${defender.name} wins!`}
        </div>
      </div>
    `;

    await createChatMessage({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html
    });
  }
}

window.SWSEGrappling = SWSEGrappling;

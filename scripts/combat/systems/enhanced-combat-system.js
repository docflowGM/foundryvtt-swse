import { computeAttackBonus, computeDamageBonus, getCoverBonus, getConcealmentMissChance, checkConcealmentHit, getFlankingBonus } from "../utils/combat-utils.js";
import { SWSERoll } from "../rolls/enhanced-rolls.js";
import { DamageSystem } from "../damage-system.js";

export class SWSECombat {

  static getSelectedActor() { return canvas.tokens.controlled[0]?.actor ?? null; }

  static async rollAttack(attacker, weapon, target = null, opts = {}) {
    if (!attacker || !weapon) return;

    if (!target) {
      const t = [...game.user.targets];
      if (t.length === 1) target = t[0].actor;
    }

    const attackerToken = attacker.getActiveTokens()[0];
    const targetToken = target?.getActiveTokens()[0];

    const atkBonus = computeAttackBonus(attacker, weapon);
    const { roll } = await SWSERoll.rollAttack(attacker, weapon, { fpBefore: true });

    const d20 = roll.dice[0].results[0].result;
    const total = roll.total;

    const result = {
      attacker,
      weapon,
      target,
      roll,
      d20,
      total,
      critThreat: d20 >= (weapon.system?.critRange || 20),
      natural20: d20 === 20,
      natural1: d20 === 1,
      hit: false,
      hitContext: null
    };

    if (target) {
      const context = {
        attacker,
        weapon,
        target,
        roll,
        totalAttack: total,
        defenseType: "reflex",
        defenseValue: target.system.defenses?.reflex?.total ?? 10,
        modifiers: {},
        hit: null
      };

      const coverType = "none";
      const coverBonus = getCoverBonus(coverType);
      context.modifiers.coverBonus = coverBonus;
      context.defenseValue += coverBonus;

      const concealment = "none";
      const concealChance = getConcealmentMissChance(concealment);
      context.modifiers.concealChance = concealChance;

      if (attackerToken && targetToken && this._checkFlanking(attackerToken, targetToken))
        atkBonus + getFlankingBonus(true);

      Hooks.callAll("swse.preHitResolution", context);

      if (context.hit === null) {
        if (result.natural1) context.hit = false;
        else if (result.natural20) context.hit = true;
        else context.hit = total >= context.defenseValue;
      }

      if (context.hit && concealChance > 0 && !checkConcealmentHit(concealChance))
        context.hit = false;

      result.hit = context.hit;
      result.hitContext = context;
    }

    await this._createAttackCard(result);
    return result;
  }

  static async rollFullAttack(attacker, weapon, target = null, opts = {}) {
    const attacks = [];

    const doubleFeat = attacker.items.find(i => i.type === "feat" && i.name.toLowerCase().includes("double attack"));
    const tripleFeat = attacker.items.find(i => i.type === "feat" && i.name.toLowerCase().includes("triple attack"));

    let count = 1;
    let penalty = 0;

    if (doubleFeat) { count = 2; penalty = -5; }
    if (tripleFeat && doubleFeat) { count = 3; penalty = -10; }

    for (let i = 0; i < count; i++) {
      const r = await this.rollAttack(attacker, weapon, target, { ...opts, multipleAttackPenalty: penalty });
      attacks.push(r);
      if (i < count - 1) await new Promise(r => setTimeout(r, 300));
    }

    return { attacks, count, penalty };
  }

  static async rollDamage(attacker, weapon, target = null, opts = {}) {
    const dmgBonus = computeDamageBonus(attacker, weapon);
    const base = weapon.system?.damage ?? "1d6";
    const formula = `${base} + ${dmgBonus}`;
    const roll = await globalThis.SWSE.RollEngine.safeRoll(formula).evaluate({ async: true });

    const result = {
      attacker,
      weapon,
      target,
      roll,
      total: roll.total,
      formula,
      applied: false
    };

    await this._createDamageCard(result);
    return result;
  }

  static async applyDamage(attackerId, targetId, weaponId, amount) {
    const attacker = game.actors.get(attackerId);
    const target = game.actors.get(targetId);
    if (!attacker || !target) return;

    if (!(game.user.isGM || attacker.isOwner)) {
      return ui.notifications.warn("You do not have permission to apply this damage.");
    }

    await DamageSystem.applyToSelected(amount, { checkThreshold: true });
  }

  static async _createAttackCard(result) {
    const { attacker, weapon, target, roll, total, hit, hitContext, d20, critThreat } = result;

    let html = `
      <div class="swse-attack-card">
        <h3>${attacker.name} attacks with ${weapon.name}</h3>
        <div class="roll-line">Attack Roll: ${total} (d20=${d20})</div>
    `;

    if (target) {
      html += `
        <div class="target-line">Target: ${target.name}</div>
        <div class="def-line">Defense: ${hitContext.defenseValue}</div>
        <div class="hit-line">${hit ? "✔ HIT" : "✘ MISS"}</div>
      `;
      if (critThreat && hit) html += `<div class="crit-threat">⚠ Critical Threat!</div>`;
      if (hit) {
        html += `
          <button class="swse-roll-damage-btn"
                  data-attacker="${attacker.id}"
                  data-weapon="${weapon.id}"
                  data-target="${target.id}">
            Roll Damage
          </button>
        `;
      }
    }

    html += `</div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll
    });
  }

  static async _createDamageCard(result) {
    const { attacker, target, weapon, roll, total } = result;

    let html = `
      <div class="swse-damage-card">
        <h3>${weapon.name} Damage</h3>
        <div class="roll-line">Damage: ${total}</div>
    `;

    if (target) {
      html += `
        <button class="swse-apply-damage-btn"
                data-attacker="${attacker.id}"
                data-target="${target.id}"
                data-weapon="${weapon.id}"
                data-amount="${total}">
          Apply Damage
        </button>
      `;
    }

    html += `</div>`;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html,
      roll
    });
  }

  static _checkFlanking(attackerToken, targetToken) {
    const dist = canvas.grid.measureDistance(attackerToken, targetToken);
    if (dist > 5) return false;

    const allies = canvas.tokens.placeables.filter(t =>
      t !== attackerToken &&
      t.actor?.system &&
      t.document.disposition === attackerToken.document.disposition &&
      canvas.grid.measureDistance(t, targetToken) <= 5
    );

    for (const ally of allies) {
      const ang1 = Math.atan2(attackerToken.center.y - targetToken.center.y, attackerToken.center.x - targetToken.center.x);
      const ang2 = Math.atan2(ally.center.y - targetToken.center.y, ally.center.x - targetToken.center.x);
      const diff = Math.abs(ang1 - ang2);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff > 2.3) return true;
    }
    return false;
  }

  static init() {
    Hooks.on("renderChatMessage", (msg, html) => {
      html.find(".swse-roll-damage-btn").click(async ev => {
        const btn = ev.currentTarget;
        const attacker = game.actors.get(btn.dataset.attacker);
        const weapon = attacker.items.get(btn.dataset.weapon);
        const target = game.actors.get(btn.dataset.target);
        await SWSECombat.rollDamage(attacker, weapon, target);
      });

      html.find(".swse-apply-damage-btn").click(async ev => {
        const btn = ev.currentTarget;
        await SWSECombat.applyDamage(
          btn.dataset.attacker,
          btn.dataset.target,
          btn.dataset.weapon,
          parseInt(btn.dataset.amount)
        );
      });
    });
  }
}

window.SWSECombat = SWSECombat;

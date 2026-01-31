/**
 * SWSE Vehicle Combat Coordinator
 *
 * Delegates:
 *  - Attack rolls → SWSERoll
 *  - Hit resolution → Middleware (H3)
 *  - Damage → DamageSystem
 *  - CT changes → Active Effects (via vehicle-shared.js)
 *  - Dogfighting → vehicle-dogfighting.js
 *  - Collision → vehicle-collisions.js
 *  - Weapons → vehicle-weapons.js
 */

import { computeVehicleAttackBonus, computeVehicleReflexDefense, computeVehicleDamage } from "./vehicle-calculations.js";
import { computeVehicleDefensiveStats } from "./vehicle-calculations.js";
import { SWSEDogfighting } from "./vehicle-dogfighting.js";
import { SWSEVehicleCollisions } from "./vehicle-collisions.js";
import { SWSEVehicleWeapons } from "./vehicle-weapons.js";
import { measureSquares, createVehicleCTEffect } from "./vehicle-shared.js";
import { SWSERoll } from "../../rolls/enhanced-rolls.js";
import { DamageSystem } from "../../damage-system.js";

export class SWSEVehicleCombat {

  static getSelectedVehicle() {
    return canvas.tokens.controlled[0]?.actor ?? null;
  }

  // ---------------------------------------------------------------------------
  // Attack Sequence (Coordinator)
  // ---------------------------------------------------------------------------

  static async vehicleAttack(attacker, weapon, target, opts = {}) {
    const bonusData = computeVehicleAttackBonus(attacker, weapon, attacker);
    const { bonus } = bonusData;

    const attackRoll = await SWSERoll.rollAttack(attacker, weapon, { fpBefore: true });
    const d20 = attackRoll.roll.dice[0].results[0].result;
    const total = attackRoll.roll.total;

    const defData = computeVehicleReflexDefense(target);
    let defense = defData.reflex;

    const ctx = {
      attacker,
      target,
      weapon,
      roll: attackRoll.roll,
      totalAttack: total,
      defenseType: "reflex",
      defenseValue: defense,
      hit: null
    };

    Hooks.callAll("swse.preVehicleHitResolution", ctx);

    if (ctx.hit === null) {
      ctx.hit = (d20 === 20) || (total >= ctx.defenseValue);
    }

    const html = `
      <div class="swse-vehicle-attack">
        <h3>${attacker.name} fires ${weapon.name} at ${target.name}</h3>
        <div>Attack: ${total} (d20=${d20})</div>
        <div>Defense (Reflex): ${ctx.defenseValue}</div>
        <div class="${ctx.hit ? "success" : "failure"}">${ctx.hit ? "HIT!" : "MISS"}</div>
        ${ctx.hit ? `<button class="swse-vehicle-roll-dmg"
                            data-att="${attacker.id}"
                            data-tgt="${target.id}"
                            data-wpn="${weapon.id}">Roll Damage</button>` : ""}
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html,
      rolls: [attackRoll.roll],
    });

    return ctx;
  }

  // ---------------------------------------------------------------------------
  // Roll Vehicle Damage
  // ---------------------------------------------------------------------------

  static async vehicleDamage(attacker, weapon, target, opts = {}) {
    const dmgData = computeVehicleDamage(attacker, weapon, opts);
    const roll = await globalThis.SWSE.RollEngine.safeRoll(dmgData.formula).evaluate({ async: true });

    const html = `
      <div class="swse-vehicle-damage">
        <h3>${weapon.name} Damage</h3>
        <div>Damage Total: ${roll.total}</div>
        <button class="swse-vehicle-apply-dmg"
                data-att="${attacker.id}"
                data-tgt="${target.id}"
                data-amount="${roll.total}">
          Apply Damage
        </button>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: attacker }),
      content: html,
      rolls: [roll],
    });

    return roll;
  }

  // ---------------------------------------------------------------------------
  // Apply Damage
  // ---------------------------------------------------------------------------

  static async applyVehicleDamage(attackerId, targetId, amount) {
    const attacker = game.actors.get(attackerId);
    const target = game.actors.get(targetId);
    if (!attacker || !target) return;

    if (!(game.user.isGM || attacker.isOwner)) {
      return ui.notifications.warn("You do not have permission to apply this damage.");
    }

    await DamageSystem.applyToSelected(amount, { checkThreshold: true });
  }

  // ---------------------------------------------------------------------------
  // Collision / Dogfight API
  // ---------------------------------------------------------------------------

  static async initiateDogfight(attacker, target) {
    return await SWSEDogfighting.initiateDogfight(attacker, target);
  }

  static async breakDogfight(attacker, target) {
    return await SWSEDogfighting.breakFree(attacker, target);
  }

  static async vehicleRam(attacker, target) {
    return await SWSEVehicleCollisions.ram(attacker, target);
  }

  // ---------------------------------------------------------------------------
  // Chat Handlers
  // ---------------------------------------------------------------------------

  static init() {
    Hooks.on("renderChatMessageHTML", (msg, html, user) => {
      html.querySelector(".swse-vehicle-roll-dmg")?.addEventListener("click", async ev => {
        const btn = ev.currentTarget;
        const att = game.actors.get(btn.dataset.att);
        const tgt = game.actors.get(btn.dataset.tgt);
        const wpn = att.items.get(btn.dataset.wpn);
        await SWSEVehicleCombat.vehicleDamage(att, wpn, tgt);
      });

      html.querySelector(".swse-vehicle-apply-dmg")?.addEventListener("click", async ev => {
        const btn = ev.currentTarget;
        await SWSEVehicleCombat.applyVehicleDamage(
          btn.dataset.att,
          btn.dataset.tgt,
          parseInt(btn.dataset.amount, 10)
        );
      });
    });
  }
}

window.SWSEVehicleCombat = SWSEVehicleCombat;

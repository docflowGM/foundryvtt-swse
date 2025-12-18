import { swseLogger } from "../../utils/logger.js";
import { rollDamage } from "./damage.js";
import { computeAttackBonus, computeDamageBonus } from "./attack-utils.js"; // You will get this file from me next if needed.

/**
 * SWSERoll — Unified SWSE Rolling Engine for v13+
 * - Modular FP middleware
 * - Centralized attack math (Attack System C)
 * - Hybrid skill breakdown (Skill Mode 3)
 * - FP timing = BEFORE roll
 * - Full Condition Track penalties & Active Effect handling
 * - Clean, modern chat cards
 */
export class SWSERoll {

  /* ------------------------------------------------------------------------ */
  /* UTILITY                                                                 */
  /* ------------------------------------------------------------------------ */

  static getSelectedActor() {
    return canvas.tokens.controlled[0]?.actor ?? null;
  }

  /**
   * Resolve Force Point usage BEFORE the roll.
   * Uses Force Point Middleware (FP-O3).
   * @returns {Promise<number>} bonus from FP
   */
  static async promptForcePointUse(actor, reason = "") {
    const fp = actor.system.forcePoints;
    if (!fp || fp.value <= 0) return 0;

    const confirmed = await new Promise(resolve => {
      new Dialog({
        title: "Spend a Force Point?",
        content: `
          <p>Spend a Force Point to boost your ${reason}?</p>
          <p>FP: ${fp.value}/${fp.max}</p>
          <p>Die: <strong>${fp.die || "1d6"}</strong></p>
        `,
        buttons: {
          yes: { label: "Use Force Point", callback: () => resolve(true) },
          no:  { label: "No", callback: () => resolve(false) }
        },
        default: "no"
      }).render(true);
    });

    if (!confirmed) return 0;

    // Build FP context (middleware pattern)
    const fpContext = {
      numDice: this._determineBaseFPDice(actor),
      die: actor.system.forcePoints?.die || "d6",
      keep: "highest", // RAW
      flatBonus: 0,
      multiplier: 1,
      reason
    };

    // Allow talents, feats, and AE middleware to modify FP roll
    Hooks.callAll("swse.preForcePointRoll", actor, fpContext);

    // Perform the roll
    const formula = `${fpContext.numDice}${fpContext.die}`;
    const roll = await globalThis.SWSE.RollEngine.safeRoll(formula).evaluate({ async: true });

    const diceResults = roll.dice[0].results.map(r => r.result);
    let result = 0;

    switch (fpContext.keep) {
      case "lowest":
        result = Math.min(...diceResults);
        break;
      case "sum":
        result = diceResults.reduce((a, b) => a + b, 0);
        break;
      case "all":
        result = diceResults; // Developer mode
        break;
      case "highest":
      default:
        result = Math.max(...diceResults);
        break;
    }

    result = result * fpContext.multiplier + fpContext.flatBonus;

    // Spend FP
    await actor.update({
      "system.forcePoints.value": Math.max(0, actor.system.forcePoints.value - 1)
    });

    // Chat message
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `
        <div class="swse-forcepoint-roll">
          <h3>Force Point Used</h3>
          <p>Rolled: ${formula}</p>
          <p>Result Applied: <strong>+${result}</strong></p>
          <p>FP Remaining: ${actor.system.forcePoints.value}/${actor.system.forcePoints.max}</p>
        </div>
      `
    });

    return result;
  }

  static _determineBaseFPDice(actor) {
    const lvl = actor.system.level ?? 1;
    if (lvl >= 15) return 3;
    if (lvl >= 8) return 2;
    return 1;
  }

  /* ------------------------------------------------------------------------ */
  /* ATTACK ROLLS (Attack System C — Hybrid)                                 */
  /* ------------------------------------------------------------------------ */

  static async rollAttack(actor, weapon, options = {}) {
    if (!actor || !weapon) {
      ui.notifications.error("Attack failed: missing actor or weapon.");
      return null;
    }

    // FP before roll
    const fpBonus = await this.promptForcePointUse(actor, "attack roll");

    // Use centralized attack engine
    const atkBonus = computeAttackBonus(actor, weapon);
    const bonusString = `${atkBonus >= 0 ? "+" : ""}${atkBonus}`;

    const formula = `1d20 + ${atkBonus} + ${fpBonus}`;
    const roll = await globalThis.SWSE.RollEngine.safeRoll(formula).evaluate({ async: true });

    const d20 = roll.dice[0].results[0].result;
    const isCritThreat = d20 >= (weapon.system?.critRange || 20);

    const html = `
      <div class="swse-attack-card ${isCritThreat ? "crit-threat" : ""}">
        <div class="attack-header">
          <img src="${weapon.img}" height="40" /> 
          <h3>${weapon.name} — Attack</h3>
        </div>

        <div class="attack-result">
          <div class="roll-total">${roll.total}</div>
          <div class="roll-d20">d20: ${d20}</div>
          <div class="roll-formula">${formula}</div>
          <div class="roll-bonus">Attack Bonus: ${bonusString}${fpBonus ? `, FP +${fpBonus}` : ""}</div>
        </div>

        ${isCritThreat ? "<div class='crit-banner'>CRITICAL THREAT!</div>" : ""}

        <button class="swse-roll-damage" data-weapon-id="${weapon.id}">
          <i class="fas fa-burst"></i> Roll Damage
        </button>
      </div>
    `;

    const message = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: html,
      roll
    });

    if (game.dice3d) game.dice3d.showForRoll(roll, game.user, true);

    return { roll, message, isCritThreat };
  }

  /* ------------------------------------------------------------------------ */
  /* DAMAGE ROLLS                                                             */
  /* ------------------------------------------------------------------------ */

  static async rollDamage(actor, weapon, options = {}) {
    return await rollDamage(actor, weapon, options);
  }

  /* ------------------------------------------------------------------------ */
  /* SKILL CHECKS (Skill System 3 — Hybrid Breakdown)                         */
  /* ------------------------------------------------------------------------ */

  static async rollSkill(actor, skillKey) {
    const skill = actor.system.skills[skillKey];
    if (!skill) {
      return ui.notifications.warn(`Skill ${skillKey} not found.`);
    }

    const fpBonus = await this.promptForcePointUse(actor, `${skillKey} check`);
    const total = skill.total + fpBonus;
    const formula = `1d20 + ${total}`;

    const roll = await globalThis.SWSE.RollEngine.safeRoll(formula).evaluate({ async: true });
    const d20 = roll.dice[0].results[0].result;

    // Breakdown components
    const parts = [];

    const halfLevel = Math.floor(actor.system.level / 2);
    parts.push(`½ Level +${halfLevel}`);

    if (skill.trained) parts.push(`Trained +5`);
    if (skill.focused) parts.push(`Skill Focus +5`);

    const abilityMod = actor.system.abilities[skill.ability]?.mod ?? 0;
    parts.push(`${skill.ability.toUpperCase()} ${abilityMod >= 0 ? "+" : ""}${abilityMod}`);

    const misc = skill.misc ?? 0;
    if (misc) parts.push(`Misc ${misc >= 0 ? "+" : ""}${misc}`);

    const condition = actor.system.conditionTrack?.penalty ?? 0;
    if (condition) parts.push(`Condition ${condition}`);

    if (fpBonus) parts.push(`FP +${fpBonus}`);

    const html = `
      <div class="swse-skill-card">
        <h3>${skillKey.toUpperCase()} Check</h3>
        <div class="roll-total">${roll.total}</div>
        <div class="roll-formula">${formula}</div>
        <div class="roll-breakdown">${parts.join(", ")}</div>
      </div>
    `;

    const msg = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: html,
      roll
    });

    if (game.dice3d) game.dice3d.showForRoll(roll, game.user, true);

    return { roll, msg };
  }
}

/* -------------------------------------------------------------------------- */
/* CHAT BUTTONS                                                               */
/* -------------------------------------------------------------------------- */

Hooks.on("renderChatMessageHTML", (message, html) => {
  $(html).find(".swse-roll-damage").on("click", async ev => {
    const weaponId = ev.currentTarget.dataset.weaponId;
    const actor = game.actors.get(message.speaker.actor);
    const weapon = actor?.items.get(weaponId);
    if (actor && weapon) await SWSERoll.rollDamage(actor, weapon);
  });
});

// Expose globally for macros
window.SWSERoll = SWSERoll;

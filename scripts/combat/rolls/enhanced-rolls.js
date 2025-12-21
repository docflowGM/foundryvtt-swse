import { swseLogger } from "../../utils/logger.js";
import { rollDamage } from "./damage.js";
import { computeAttackBonus, computeDamageBonus } from "../utils/combat-utils.js";

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

  /* ------------------------------------------------------------------------ */
  /* FORCE POWER ROLLS (Use the Force + DC Chart Evaluation)                 */
  /* ------------------------------------------------------------------------ */

  /**
   * Parse and roll damage dice from effect strings
   * @param {string} effectText - Effect text like "6d6 lightning damage + stun"
   * @returns {Object|null} - {formula, roll, total, type} or null if no damage found
   */
  static async _parsePowerDamage(effectText) {
    if (!effectText) return null;

    // Match damage patterns like "2d6", "4d6", "6d6 lightning", "8d6 damage"
    const damagePattern = /(\d+d\d+)(?:\s+(?:lightning|energy|fire|cold|sonic|force)?\s*(?:damage|healing))?/i;
    const match = effectText.match(damagePattern);

    if (!match) return null;

    const formula = match[1];
    const damageRoll = await globalThis.SWSE.RollEngine.safeRoll(formula).evaluate({ async: true });

    // Determine damage type
    let damageType = "damage";
    if (/healing/i.test(effectText)) damageType = "healing";
    else if (/lightning/i.test(effectText)) damageType = "lightning";
    else if (/energy/i.test(effectText)) damageType = "energy";
    else if (/fire/i.test(effectText)) damageType = "fire";
    else if (/cold/i.test(effectText)) damageType = "cold";
    else if (/sonic/i.test(effectText)) damageType = "sonic";
    else if (/force/i.test(effectText)) damageType = "force";

    return {
      formula,
      roll: damageRoll,
      total: damageRoll.total,
      type: damageType
    };
  }

  static async rollUseTheForce(actor, power) {
    if (!actor || !power) {
      ui.notifications.error("Use the Force failed: missing actor or power.");
      return null;
    }

    const skill = actor.system.skills.useTheForce;
    if (!skill) {
      ui.notifications.warn("Use the Force skill not found.");
      return null;
    }

    // FP before roll
    const fpBonus = await this.promptForcePointUse(actor, "Use the Force check");
    const total = skill.total + fpBonus;
    const formula = `1d20 + ${total}`;

    const roll = await globalThis.SWSE.RollEngine.safeRoll(formula).evaluate({ async: true });
    const d20 = roll.dice[0].results[0].result;

    // Evaluate DC chart if present
    const dcChart = power.system.dcChart || [];
    let resultTier = null;

    if (dcChart.length > 0) {
      // Find highest DC threshold that was met
      const sorted = [...dcChart].sort((a, b) => b.dc - a.dc);
      resultTier = sorted.find(tier => roll.total >= tier.dc);
    }

    // Roll damage if present in the result
    let damageResult = null;
    if (resultTier?.effect) {
      damageResult = await this._parsePowerDamage(resultTier.effect);
    }

    // Build breakdown components
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

    // Build chat card
    const darkSideWarning = power.system.discipline === "dark-side"
      ? `<div class="dark-side-warning"><i class="fas fa-skull"></i> Dark Side Power - Using gains 1 Dark Side Point</div>`
      : "";

    // Damage display section
    const damageHTML = damageResult
      ? `
        <div class="damage-roll ${damageResult.type}">
          <div class="damage-header">
            <i class="fas fa-${damageResult.type === 'healing' ? 'heart' : 'burst'}"></i>
            ${damageResult.type === 'healing' ? 'Healing' : 'Damage'} Roll
          </div>
          <div class="damage-total">${damageResult.total}</div>
          <div class="damage-formula">${damageResult.formula}</div>
          <div class="damage-type">${damageResult.type}</div>
        </div>
      `
      : "";

    const resultHTML = resultTier
      ? `
        <div class="power-result success">
          <h4><i class="fas fa-check-circle"></i> DC ${resultTier.dc} Achieved</h4>
          <p class="effect-description">${resultTier.description}</p>
          <p class="effect-short"><strong>Effect:</strong> ${resultTier.effect}</p>
          ${damageHTML}
        </div>
      `
      : dcChart.length > 0
      ? `
        <div class="power-result failure">
          <h4><i class="fas fa-times-circle"></i> Failed to Meet Minimum DC</h4>
          <p>Minimum DC required: ${Math.min(...dcChart.map(t => t.dc))}</p>
        </div>
      `
      : `
        <div class="power-result info">
          <p>${power.system.effect || ""}</p>
          ${power.system.special ? `<p class="special"><strong>Special:</strong> ${power.system.special}</p>` : ""}
        </div>
      `;

    const html = `
      <div class="swse-force-power-card">
        <div class="power-header">
          <img src="${power.img}" height="50" />
          <div class="power-title">
            <h3>${power.name}</h3>
            <span class="power-level">Level ${power.system.powerLevel || 1}</span>
            <span class="power-discipline">${power.system.discipline || "universal"}</span>
          </div>
        </div>

        ${darkSideWarning}

        <div class="utf-result">
          <div class="roll-total">${roll.total}</div>
          <div class="roll-d20">d20: ${d20}${d20 === 20 ? " <i class='fas fa-star'></i>" : ""}</div>
          <div class="roll-formula">${formula}</div>
          <div class="roll-breakdown">${parts.join(", ")}</div>
        </div>

        ${resultHTML}

        <div class="power-details">
          <p><strong>Time:</strong> ${power.system.time || "Standard Action"}</p>
          <p><strong>Range:</strong> ${power.system.range || "—"}</p>
          ${power.system.target ? `<p><strong>Target:</strong> ${power.system.target}</p>` : ""}
          ${power.system.duration ? `<p><strong>Duration:</strong> ${power.system.duration}</p>` : ""}
        </div>
      </div>
    `;

    const message = await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: html,
      roll
    });

    if (game.dice3d) {
      await game.dice3d.showForRoll(roll, game.user, true);
      // Also show damage roll if it exists
      if (damageResult?.roll) {
        await game.dice3d.showForRoll(damageResult.roll, game.user, true);
      }
    }

    return { roll, message, diceTotal: d20, resultTier, damageResult };
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

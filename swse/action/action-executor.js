/**
 * SWSE Action Execution Engine
 * AUTO-GENERATED
 */

import { SWSERoll } from "../rolls/swse-roll.js";

export class SWSEActionExecutor {
  static async execute(actor, action) {
    if (!actor) return ui.notifications.warn("No actor provided.");

    Hooks.callAll("swse.preExecuteAction", { actor, action });

    const type = action?.type ?? action?.system?.type;
    let result;

    switch (type) {
      case "melee":
        result = await this._executeMelee(actor, action);
        break;
      case "ranged":
        result = await this._executeRanged(actor, action);
        break;
      case "skill":
        result = await this._executeSkill(actor, action);
        break;
      case "vehicle":
        result = await this._executeVehicle(actor, action);
        break;
      case "grapple":
        result = await this._executeGrapple(actor, action);
        break;
      case "script":
        result = await this._executeScript(actor, action);
        break;
      default:
        ui.notifications.warn(`Unknown action type: ${type}`);
        return;
    }

    Hooks.callAll("swse.postExecuteAction", { actor, action, result });

    return result;
  }

  static async _executeMelee(actor, action) {
    const target = game.user.targets.first()?.actor;
    if (!target) return ui.notifications.warn("Select a target.");

    const bonus = action.system?.attackBonus ?? 0;

    const result = await CONFIG.SWSE.Hit.resolve({
      attacker: actor,
      target,
      attackBonus: bonus,
      defenseType: "reflex",
      context: { action }
    });

    this._postHitToChat(actor, target, action, result);
    return result;
  }

  static async _executeRanged(actor, action) {
    const target = game.user.targets.first()?.actor;
    if (!target) return ui.notifications.warn("Select a target.");

    const bonus = action.system?.attackBonus ?? 0;

    const result = await CONFIG.SWSE.Hit.resolve({
      attacker: actor,
      target,
      attackBonus: bonus,
      defenseType: "reflex",
      context: { action }
    });

    this._postHitToChat(actor, target, action, result);
    return result;
  }

  static async _executeSkill(actor, action) {
    const skillId = action.system?.skill;
    if (!skillId) return ui.notifications.warn("No skill specified.");

    const roll = await SWSERoll.quick(`1d20 + @skills.${skillId}.mod`, actor.getRollData());

    const html = `
      <h2>${action.name}</h2>
      <p><b>Skill:</b> ${skillId}</p>
      <p><b>Total:</b> ${roll.total}</p>
    `;

    CONFIG.SWSE.Utils.postChat(actor.name, html);
    return roll;
  }

  static async _executeVehicle(actor, action) {
    const target = game.user.targets.first()?.actor;

    const result = await CONFIG.SWSE.VehicleHit.resolve({
      attacker: actor,
      target,
      weapon: action.system,
      attackBonus: action.system?.attackBonus ?? 0,
      context: { action }
    });

    this._postVehicleHit(actor, target, action, result);
    return result;
  }

  static async _executeGrapple(actor, action) {
    const target = game.user.targets.first()?.actor;
    if (!target) return ui.notifications.warn("Select a target.");

    const mode = action.system?.mode;

    switch (mode) {
      case "attemptGrab":
        return CONFIG.SWSE.Grapple.attemptGrab(actor, target);
      case "opposed":
        return CONFIG.SWSE.Grapple.opposedCheck(actor, target);
      case "pin":
        return CONFIG.SWSE.Grapple.pin(actor, target);
      case "escape":
        return CONFIG.SWSE.Grapple.escape(actor, target);
      case "damage":
        return CONFIG.SWSE.Grapple.damage(actor, target);
      default:
        ui.notifications.warn("Unknown grapple action mode.");
    }
  }

  static async _executeScript(actor, action) {
    const script = action.system?.script;
    if (!script) return ui.notifications.warn("No script found.");

    // eslint-disable-next-line no-eval
    return eval(script);
  }

  static _postHitToChat(attacker, target, action, result) {
    const html = `
      <h2>${action.name}</h2>
      <p><b>${attacker.name}</b> attacks <b>${target.name}</b></p>
      <p><b>Attack Roll:</b> ${result.roll.total} vs ${result.defense}</p>
      <p><b>Hit:</b> ${result.hit ? "Yes" : "No"}</p>
    `;
    CONFIG.SWSE.Utils.postChat(attacker.name, html);
  }

  static _postVehicleHit(attacker, target, action, result) {
    const html = `
      <h2>${action.name}</h2>
      <p><b>${attacker.name}</b> fires at <b>${target.name}</b></p>
      <p>Attack: ${result.roll.total} vs ${result.defense}</p>
      <p>Hit: ${result.hit ? "Yes" : "No"}</p>
      <p>Damage: ${result.damage ?? 0}</p>
      <p>Threshold: ${result.threshold ? "Exceeded" : "No"}</p>
    `;
    CONFIG.SWSE.Utils.postChat(attacker.name, html);
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Action = SWSEActionExecutor;
});

// ============================================
// FILE: rolls/saves.js
// Saving throw rolls via RollCore (V2 Unified)
// ============================================

import RollCore from "/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Roll a saving throw via RollCore
 * In SWSE, "saves" are defense checks
 * @param {Actor} actor - The actor making the save
 * @param {string} type - Save type (fortitude, reflex, will)
 * @param {Object} options - Additional options
 * @param {boolean} options.useForce - Spend a Force Point
 * @returns {Promise<Roll|null>} The save roll or null if failed
 */
export async function rollSave(actor, type, options = {}) {
  const utils = game.swse.utils;

  if (!actor) {
    ui.notifications.warn('No actor specified for save roll');
    return null;
  }

  // In SWSE, "saves" are just defense checks
  const def = actor.system?.derived?.defenses?.[type];
  if (!def) {
    ui.notifications.warn(game.i18n.format('SWSE.Notifications.Rolls.DefenseNotFound', { type }));
    return null;
  }

  // === UNIFIED ROLL EXECUTION via RollCore ===
  const domain = `save.${type}`;
  const rollResult = await RollCore.execute({
    actor,
    domain,
    rollOptions: {
      baseDice: '1d20',
      useForce: options.useForce || false
    },
    context: { saveType: type }
  });

  if (!rollResult.success) {
    ui.notifications.error(`Save roll failed: ${rollResult.error}`);
    return null;
  }

  // === RENDER TO CHAT ===
  if (rollResult.roll) {
    const typeLabel = utils.string.capitalize(type);
    await rollResult.roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: `<strong>${typeLabel} Save</strong><br/>Modifier: ${rollResult.modifierTotal}
               ${rollResult.forcePointBonus > 0 ? `<br/>+ ${rollResult.forcePointBonus} (Force)` : ''}`
    }, { create: true });
  }

  return rollResult.roll;
}

/**
 * Compare save roll against DC
 * @param {Roll} saveRoll - The save roll
 * @param {number} dc - Difficulty class
 * @returns {boolean} True if save succeeded
 */
export function checkSaveSuccess(saveRoll, dc) {
  const success = saveRoll.total >= dc;

  if (success) {
    ui.notifications.info(game.i18n.format('SWSE.Notifications.Rolls.SaveSucceeded', { total: saveRoll.total, dc }));
  } else {
    ui.notifications.warn(game.i18n.format('SWSE.Notifications.Rolls.SaveFailed', { total: saveRoll.total, dc }));
  }

  return success;
}

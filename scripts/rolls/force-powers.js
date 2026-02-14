// ============================================
// FILE: rolls/force-powers.js
// Force Power rolling and effects
// ============================================

/**
 * Roll a force power use
 * @param {Actor} actor - The actor using the force power
 * @param {string} itemId - The force power item ID
 * @returns {Promise<Roll>} The force power roll
 */
export async function rollForcePower(actor, itemId) {
  if (!actor) {
    ui.notifications.warn('No actor specified for force power roll');
    return null;
  }

  const item = actor.items?.get(itemId);

  if (!item) {
    ui.notifications.warn(`Force power item ${itemId} not found`);
    return null;
  }

  if (!['forcepower', 'force-power'].includes(item.type)) {
    ui.notifications.warn(`Item ${item.name} is not a force power`);
    return null;
  }

  // Get force points available
  const forcePoints = actor.system?.forcePoints?.value ?? 0;
  const powerCost = item.system?.cost ?? 1;

  // Check force points (optional warning, still allows roll)
  if (forcePoints < powerCost) {
    ui.notifications.warn(
      `${actor.name} has only ${forcePoints} Force Points (need ${powerCost} for ${item.name})`
    );
  }

  // Determine roll modifier
  // Use Force skill modifier if available
  const forceSkill = actor.system?.skills?.force;
  const forceMod = forceSkill?.total ?? 0;

  // Power DC if specified in item
  const powerDC = item.system?.dc ?? 15;

  const roll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${forceMod}`).evaluate({ async: true });

  const success = roll.total >= powerDC;
  const flavor = `<strong>${item.name}</strong> (Force Power)<br/>DC: ${powerDC} | Force Cost: ${powerCost} <br/><em>${success ? '✓ Success' : '✗ Failed'}</em>`;

  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: flavor
  }, { create: true });

  return roll;
}

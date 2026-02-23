// ============================================
// FILE: rolls/force-powers.js
// Force Power rolling via RollCore (V2 Unified)
// ============================================

import RollCore from "../engines/roll/roll-core.js";
import { swseLogger } from "../utils/logger.js";

/**
 * Roll a force power use via RollCore
 * @param {Actor} actor - The actor using the force power
 * @param {string} itemId - The force power item ID
 * @param {Object} options - Additional options
 * @param {boolean} options.useForce - Spend Force Points (automatic for Force Powers)
 * @returns {Promise<Roll|null>} The force power roll or null if failed
 */
export async function rollForcePower(actor, itemId, options = {}) {
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

  // Check force points (warning only for now)
  if (forcePoints < powerCost) {
    ui.notifications.warn(
      `${actor.name} has only ${forcePoints} Force Points (need ${powerCost} for ${item.name})`
    );
  }

  // Power DC if specified in item
  const powerDC = item.system?.dc ?? 15;

  // === UNIFIED ROLL EXECUTION via RollCore ===
  const domain = 'force-power';
  const rollResult = await RollCore.execute({
    actor,
    domain,
    rollOptions: {
      baseDice: '1d20',
      useForce: options.useForce || false
    },
    context: { itemId, itemName: item.name, powerDC }
  });

  if (!rollResult.success) {
    ui.notifications.error(`Force power roll failed: ${rollResult.error}`);
    return null;
  }

  // === RENDER TO CHAT ===
  if (rollResult.roll) {
    const success = rollResult.roll.total >= powerDC;
    const flavor = `<strong>${item.name}</strong> (Force Power)<br/>
                    DC: ${powerDC} | Force Cost: ${powerCost}<br/>
                    <em>${success ? '✓ Success' : '✗ Failed'}</em>`;

    await rollResult.roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor }),
      flavor: flavor
    }, { create: true });
  }

  return rollResult.roll;
}

/* ============= Narration (Phase 5) ============= */

/**
 * Narrate a force power result based on roll total and effect tier from dcChart
 * SAFETY: Does NOT extract or execute formulas from item descriptions
 */
export async function narrateForcePowerResult(actor, powerItem, roll) {
  if (!actor || !powerItem || !roll) return;

  try {
    const { ActionChatEngine } = await import("../chat/action-chat-engine.js");

    const total = roll.total;
    const chart = powerItem?.system?.dcChart ?? powerItem?.system?.dcchart ?? null;

    const effectText = _pickEffectFromChart(chart, total);
    if (!effectText) {
      await ActionChatEngine.narrationForcePower(actor, powerItem.name, total, {});
      return;
    }

    // SAFETY: No formula extraction from item descriptions
    // Use explicit itemFormula field if damage needs to be rolled
    let extra = `It does ${effectText}`;
    if (powerItem.system?.itemFormula) {
      try {
        const r = new Roll(powerItem.system.itemFormula, actor.getRollData?.() ?? {});
        await r.evaluate({ async: true });
        extra = `It does ${effectText} (rolled ${powerItem.system.itemFormula} = ${r.total}).`;
      } catch (err) {
        swseLogger.warn('[ForcePowers] Item formula evaluation failed:', err);
      }
    }

    await ActionChatEngine.narrationForcePower(actor, powerItem.name, total, { extra });
  } catch (err) {
    swseLogger.warn('[ForcePowers] Narration failed:', err);
  }
}

/**
 * Pick effect text from DC chart based on roll
 * @private
 */
function _pickEffectFromChart(dcChart, rollTotal) {
  if (!Array.isArray(dcChart) || typeof rollTotal !== "number") return null;

  const sorted = dcChart
    .map((e) => ({ dc: Number(e.dc), text: e.description ?? e.effect ?? "" }))
    .filter((e) => Number.isFinite(e.dc) && e.text)
    .sort((a, b) => a.dc - b.dc);

  let best = null;
  for (const e of sorted) {
    if (rollTotal >= e.dc) best = e;
  }
  return best?.text ?? null;
}

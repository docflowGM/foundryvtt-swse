// ============================================
// FILE: rolls/force-powers.js
// Force Power rolling and effects
// ============================================

import { RollEngine } from '../engine/roll-engine.js';

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

/* ============= Phase 4: Narration ============= */

function _pickEffectFromChart(dcChart, rollTotal) {
  if (!Array.isArray(dcChart) || typeof rollTotal !== "number") return null;

  // Expect entries: { dc: number, description/effect: string }
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

function _extractFirstDiceExpression(text) {
  // Minimal dice expression finder: 2d6+3, 4d6, 1d20+@mod won't be rolled here.
  const m = String(text).match(/\b\d+d\d+(?:\s*[+\-]\s*\d+)?\b/i);
  return m ? m[0].replace(/\s+/g, "") : null;
}

/**
 * Narrate a force power result based on roll total and effect tier from dcChart
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

    // Optional: if effect includes dice, roll it and include total.
    let extra = `It does ${effectText}`;
    const diceExpr = _extractFirstDiceExpression(effectText);
    if (diceExpr) {
      try {
        const r = await RollEngine.safeRoll(diceExpr, actor.getRollData?.() ?? {});
        if (r) extra = `It does ${effectText} (rolled ${diceExpr} = ${r.total}).`;
      } catch {
        // ignore
      }
    }

    await ActionChatEngine.narrationForcePower(actor, powerItem.name, total, { extra });
  } catch {
    // Narration engine not available; continue anyway
  }
}

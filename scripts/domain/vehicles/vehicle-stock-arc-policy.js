/**
 * Arc policy for published stock weapons - owner ruling V-P6C-01 (2026-11-03).
 *
 * Authority hierarchy (vehicle-stock-weapon-groups.js determineStockArc):
 *   1. a published arc the system understands (fixed-forward, forward-firing) is ENFORCED by the preflight geometry;
 *   2. an arc the source is confirmed to leave unstated imposes NO automated restriction (this is not a published 360-degree
 *      arc: it is the absence of a rule, and the system does not invent one);
 *   3. a stated arc the system cannot interpret (turret, articulated, axial, flank...) is refused;
 *   4. an arc never reviewed is refused until the source is reviewed;
 *   5. certified aftermarket installations always keep their certified mount and arc (this module is not consulted).
 *
 * The policy below only governs case 2. 'unrestricted' is the DEFAULT; a world can choose 'gm-per-attack' to require a GM
 * adjudication (with an audit receipt) for source-unstated arcs.
 */
export const STOCK_ARC_POLICY = Object.freeze({ GM_PER_ATTACK: 'gm-per-attack', UNRESTRICTED: 'unrestricted' });
export const STOCK_ARC_POLICY_SETTING = 'vehicleStockSilentArcPolicy';

export function getStockSilentArcPolicy() {
  let v;
  try { v = globalThis.game?.settings?.get?.('foundryvtt-swse', STOCK_ARC_POLICY_SETTING); } catch { v = undefined; }
  return v === STOCK_ARC_POLICY.GM_PER_ATTACK ? STOCK_ARC_POLICY.GM_PER_ATTACK : STOCK_ARC_POLICY.UNRESTRICTED;
}

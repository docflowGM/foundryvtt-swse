/**
 * Arc policy for published stock weapons. Published SWSE statblocks do not state firing arcs (the canonical records are
 * source-silent), so an arc-dependent stock attack cannot be proven from the source. This is a project policy decision
 * for the owner (register: V-P6C-01); the default is the existing fail-closed behavior.
 *
 *   'gm-per-attack'  (default) - a source-silent arc blocks the stock attack unless a GM adjudicates it for that attack
 *                                (vehicle-evidence-runtime-gate.js, with an audit receipt);
 *   'unrestricted'             - a source-silent arc imposes no restriction (no published rule restricts it); targets,
 *                                crew station, permissions and every other check still apply.
 */
export const STOCK_ARC_POLICY = Object.freeze({ GM_PER_ATTACK: 'gm-per-attack', UNRESTRICTED: 'unrestricted' });
export const STOCK_ARC_POLICY_SETTING = 'vehicleStockSilentArcPolicy';

export function getStockSilentArcPolicy() {
  let v;
  try { v = globalThis.game?.settings?.get?.('foundryvtt-swse', STOCK_ARC_POLICY_SETTING); } catch { v = undefined; }
  return v === STOCK_ARC_POLICY.UNRESTRICTED ? STOCK_ARC_POLICY.UNRESTRICTED : STOCK_ARC_POLICY.GM_PER_ATTACK;
}

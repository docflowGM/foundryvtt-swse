/**
 * Typed JATM regimen entitlements for Force Point spending on Block/Deflect (03B, FP-RD-001).
 * Source: Jedi Academy Training Manual pp.11-13 (Force regimens; Sparring Practice;
 * Training Remote; Vo'ren's Third Cadence). Pure module: no imports.
 *
 * Printed facts encoded here (and nothing else):
 *  - benefits last 24 hours from regimen completion; one regimen active per 24h;
 *    a failed regimen gives no benefit for 24h (p.11);
 *  - Sparring Practice DC18/23/28: FP on the UTF check to activate Block does not count toward
 *    the one-FP-per-round limit; DC23 also 1, DC28 2 temporary FP usable only on Block activation checks;
 *  - Training Remote: the same for Deflect;
 *  - Vo'ren's Third Cadence DC33: FP on Block/Deflect activation checks even off turn, not counting
 *    toward the round limit (lower DC tiers grant only the Redirect Shot bonus: no FP entitlement).
 * Duration is campaign time (game.time.worldTime); with no world clock nothing is granted.
 * Regimens are keyed by normalized printed name (no fabricated canonical ids).
 */
export const REGIMEN_DURATION_SECONDS = 24 * 60 * 60;

export const REGIMEN_CONTRACTS = Object.freeze({
  sparringpractice: { talents: ['block'], noncountingFloor: 18, temporaryFp: { 23: 1, 28: 2 }, offTurnFloor: null },
  trainingremote: { talents: ['deflect'], noncountingFloor: 18, temporaryFp: { 23: 1, 28: 2 }, offTurnFloor: null },
  vorensthirdcadence: { talents: ['block', 'deflect'], noncountingFloor: 33, temporaryFp: {}, offTurnFloor: 33 }
});

export const regimenKeyFor = (name) => String(name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

export function worldTimeNow() {
  const t = Number(globalThis.game?.time?.worldTime);
  return Number.isFinite(t) ? t : null;
}

/** Build the entitlement (and temporary entries) for a completed regimen, or null if it grants none. */
export function buildRegimenEntitlement({ regimenName, tierFloor, grantId, worldTime }) {
  const key = regimenKeyFor(regimenName);
  const contract = REGIMEN_CONTRACTS[key];
  const floor = Number(tierFloor);
  if (!contract || !Number.isFinite(floor) || worldTime == null || !Number.isFinite(Number(worldTime)) || !grantId) return null;
  const noncounting = floor >= contract.noncountingFloor;
  const offTurn = contract.offTurnFloor != null && floor >= contract.offTurnFloor;
  const tempCount = Object.entries(contract.temporaryFp).filter(([f]) => floor >= Number(f)).reduce((n, [, v]) => Math.max(n, v), 0);
  if (!noncounting && !offTurn && tempCount === 0) return null;
  const expiresWorldTime = Number(worldTime) + REGIMEN_DURATION_SECONDS;
  return {
    entitlement: { grantId, regimenKey: key, regimenName, tierFloor: floor, talents: [...contract.talents], noncounting, offTurn, completedWorldTime: Number(worldTime), expiresWorldTime },
    temporaryEntries: tempCount > 0 ? [{
      id: `${grantId}-temp`, source: `Force Regimen: ${regimenName}`, value: tempCount, max: tempCount,
      restrictions: '', expires: null, expiresWorldTime,
      entitlement: { kind: 'regimen-reaction', grantId, regimenKey: key, talents: [...contract.talents] }
    }] : []
  };
}

/** Is this stored entitlement currently valid for the given talent? */
export function evaluateRegimenEntitlement(actor, { talent, worldTime = worldTimeNow() } = {}) {
  const e = actor?.getFlag?.('swse', 'regimenEntitlement') ?? actor?.flags?.swse?.regimenEntitlement;
  const none = { valid: false };
  if (!e || worldTime == null || !talent) return none;
  if (!Number.isFinite(Number(e.expiresWorldTime)) || worldTime >= Number(e.expiresWorldTime) || worldTime < Number(e.completedWorldTime)) return none;
  const contract = REGIMEN_CONTRACTS[e.regimenKey];
  if (!contract || !contract.talents.includes(talent) || !(e.talents ?? []).includes(talent)) return none;
  // The stored tier is re-checked against the printed contract; a hand-edited flag cannot widen it.
  const noncounting = e.noncounting === true && Number(e.tierFloor) >= contract.noncountingFloor;
  const offTurn = e.offTurn === true && contract.offTurnFloor != null && Number(e.tierFloor) >= contract.offTurnFloor;
  return { valid: true, grantId: e.grantId, regimenKey: e.regimenKey, tierFloor: Number(e.tierFloor), noncounting, offTurn };
}

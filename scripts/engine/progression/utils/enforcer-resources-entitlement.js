/**
 * The Force Unleashed Campaign Guide p.44 — Enforcer Resources.
 * Each Enforcer level confers restricted/military equipment worth
 * heroic level × 2,000 credits, placed in a civilized accessible location.
 * The player can defer receiving it and carry the value to the NEXT
 * Enforcer level. It is never actor currency or an unrestricted purchase.
 *
 * This owns only grant accounting: no equipment Item is invented or auto-issued
 * without a source-verified equipment selection and delivery workflow.
 */
export const ENFORCER_RESOURCES_FLAG = 'flags.swse.classFeatures.enforcer.resources';
const int = n => Number.isInteger(Number(n)) ? Number(n) : NaN;

export function planEnforcerResourceEntitlement({ existing = [], classLevel, heroicLevel, sessionId }) {
  const level = int(classLevel), heroic = int(heroicLevel);
  if (!Number.isInteger(level) || level < 1 || level > 10) throw new Error('Invalid Enforcer class level');
  if (!Number.isInteger(heroic) || heroic < level) throw new Error('Heroic level unavailable for Enforcer Resources');
  if (!Array.isArray(existing)) throw new Error('Invalid Enforcer Resources ledger');
  if (existing.some(entry => Number(entry.enforcerClassLevel) === level)) {
    throw new Error(`Enforcer Resources for class level ${level} have already been recorded`);
  }
  const copy = existing.map(entry => ({...entry}));
  const pendingDeferral = copy.filter(entry => entry.status === 'deferred-to-next-level');
  const unexpected = pendingDeferral.filter(entry => Number(entry.enforcerClassLevel) !== level - 1);
  if (unexpected.length) throw new Error('Unresolved Enforcer Resources deferral from a nonadjacent class level');
  const carry = pendingDeferral.reduce((n, entry) => {
    const value = int(entry.amountCredits);
    if (!Number.isFinite(value) || value < 0) throw new Error('Invalid deferred Enforcer Resources value');
    entry.status = 'carried-forward';
    return n + value;
  },0);
  const amount = heroic * 2000;
  const entitlement = {
    enforcerClassLevel:level,
    heroicLevel:heroic,
    amountCredits:amount+carry,
    newValueCredits:amount,
    carriedValueCredits:carry,
    status:'awaiting-equipment-selection',
    delivery:'civilized-accessible-location',
    equipmentRestriction:['restricted','military'],
    sourceSession:String(sessionId || 'unidentified-session'),
  };
  copy.push(entitlement);
  return { entries:copy, current:entitlement };
}

export function pendingEnforcerResources(actor) {
  const entries = actor?.flags?.swse?.classFeatures?.enforcer?.resources || [];
  if (!Array.isArray(entries)) throw new Error('Malformed Enforcer Resources actor ledger');
  return entries;
}

/**
 * Trusted stock (factory) weapon-group authority.
 *
 * A stock attack is trusted only when ALL of these are re-derived at the moment of use (nothing is read from a name, a
 * caller option or an editable Item field as proof):
 *   - the vehicle's publication record verifies (digest) and names the same source entry as the Item's flag;
 *   - the Item's group key exists in that record and passes the strict executability assessment
 *     (vehicle-stock-weapon-groups.js: plain x2 damage, a single pilot/gunner operator, printed attack total that
 *     reconciles with the printed crew Base Attack + the vehicle's Intelligence modifier);
 *   - the Item still mirrors that group (name, mount identity, operator, damage).
 * The authority returns the operator and the arc evidence from the SOURCE; the arc itself is never published, so it is
 * reported as source-silent and handled by the arc policy in the attack preflight.
 */
import { resolveStockWeapon } from './vehicle-weapon-damage.js';

/**
 * Size of the STATIC registry of pre-bound stock groups: intentionally empty. No group is trusted because a registry
 * says so (actor names, user-set source keys and printed names prove nothing). Trust is DERIVED at use from the
 * digest-verified record by resolveTrustedStockAttackGroup() below.
 */
export const TRUSTED_STOCK_WEAPON_GROUP_COUNT = 0;

/** @returns {null | {bindingVerified:true, sourceComplete:true, weaponGroupKey:string, sourceEntryKey:string, operator:string, arcEvidence:{state:string}, attackBonusEvidence:{state:string, value:number}}} */
export function resolveTrustedStockAttackGroup(vehicle, weapon) {
  if (!vehicle || weapon?.actor !== vehicle) return null;
  const s = resolveStockWeapon(weapon);
  if (!s?.ok) return null;
  return {
    bindingVerified: true, sourceComplete: true,
    weaponGroupKey: s.group.groupKey, sourceEntryKey: s.record.identity.sourceEntryKey, operator: s.operator,
    arcEvidence: { state: s.arcState }, attackBonusEvidence: { state: 'PRINTED_VALUE', value: s.group.attackBonusPrinted }
  };
}

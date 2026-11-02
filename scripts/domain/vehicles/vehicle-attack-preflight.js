/**
 * Phase 2C immediate strict stock gate (deployment DENY; custom ships scoped).
 * Called before any vehicle attack ammunition/action costs or rolls.
 * An installed shipyard modification is NOT a canonical stock group and must
 * continue through ordinary equipment/crew governance. An untouched stock
 * weapon on that same ship is still subject to strict source verification.
 */
import { classifyInstalledVehicleWeapon } from './vehicle-attack-provenance.js';
import { resolveTrustedStockAttackGroup } from './vehicle-stock-attack-authority.js';
import { authorizeVehicleArcEvidence } from './vehicle-evidence-runtime-gate.js';
import { isTargetWithinVehicleArc } from './vehicle-firing-arc-geometry.js';
import { STOCK_ARC_POLICY, getStockSilentArcPolicy } from './vehicle-stock-arc-policy.js';

const block = reason => ({ok:false,reason,strictStockEnforcement:true});
const nonempty = x => typeof x === 'string' && x.trim().length > 0;

/** Pure classification/precheck. `sourceLookup` is injected only by the
 * programmatic test seam; the Foundry-facing wrapper below NEVER accepts a
 * roll-option evidence object or a caller-supplied source lookup. */
export function classifyVehicleAttackPreflight({vehicle,weapon,sourceLookup=resolveTrustedStockAttackGroup}) {
  const provenance = classifyInstalledVehicleWeapon(vehicle,weapon);
  if (provenance.kind === 'UNRESOLVED') return block(provenance.reason);
  if (provenance.kind === 'SHIPYARD_MODIFICATION')
    return {ok:true,kind:'CUSTOM_MODIFICATION',provenance,sourceAuthority:'SHIPYARD_INSTALLATION_NOT_PUBLISHED_STOCK'};
  if (provenance.kind === 'CERTIFIED_INSTALLATION')
    return {ok:true,kind:'CERTIFIED_INSTALLATION',provenance,sourceAuthority:'P2_CERTIFIED_LEDGER_INSTALLATION'};
  const trusted = sourceLookup(vehicle,weapon);
  if (!trusted || trusted.bindingVerified !== true || trusted.sourceComplete !== true ||
      !nonempty(trusted.weaponGroupKey) || !nonempty(trusted.sourceEntryKey))
    return block('CANONICAL_STOCK_ATTACK_UNBOUND');
  return {ok:true,kind:'TRUSTED_STOCK',provenance,source:trusted};
}

/**
 * Roll-time policy: all vehicle domain attacks are examined. Nonvehicle
 * personal attacks bypass the stock vehicle gate and retain their own rules.
 * The present 318-book source review alone NEVER automatically authorizes a
 * stock attack. Future bound groups get the D02/D03 policy gates below.
 */
/** May this user fire a weapon of this vehicle (and, for a named gunner, act as that gunner)? GMs always may. */
function userMayOperate(user, vehicle, operatorActor) {
  if (!user) return false;
  if (user.isGM === true) return true;
  const owns = doc => doc?.isOwner === true || (typeof doc?.testUserPermission === 'function' && doc.testUserPermission(user, 'OWNER') === true);
  return owns(vehicle) && (!operatorActor || owns(operatorActor));
}

export async function authorizeVehicleAttackBeforeCosts({vehicle,weapon,target,attackId,crewStationResolved,gmDecision=null,user=globalThis.game?.user ?? null,operatorActor=null,stockArcPolicy=getStockSilentArcPolicy()}) {
  const base = classifyVehicleAttackPreflight({vehicle,weapon});
  if (!base.ok) return base;
  if (base.kind==='CUSTOM_MODIFICATION') return base;
  if (base.kind==='CERTIFIED_INSTALLATION') {
    // P6B weapon slice: the acting user must be allowed to operate this vehicle (and the named gunner, if any).
    if (!userMayOperate(user, vehicle, operatorActor)) return block('ATTACK_USER_NOT_AUTHORIZED');
    // A certified mount still needs a target, a resolved crew station and a legal arc.
    if (!target || !nonempty(target.id)) return block('TARGET_UNRESOLVED');
    if (crewStationResolved !== true) return block('CREW_STATION_UNRESOLVED');
    if (!nonempty(attackId) || !nonempty(vehicle?.id)) return block('ATTACK_SCOPE_UNRESOLVED');
    if (!isTargetWithinVehicleArc(vehicle,target,base.provenance.mount.arc)) return block('TARGET_OUTSIDE_CERTIFIED_MOUNT_ARC');
    return base;
  }

  const source = base.source;
  // Published stock weapons: the same operator permission applies as for installed weapons.
  if (!userMayOperate(user, vehicle, operatorActor)) return block('ATTACK_USER_NOT_AUTHORIZED');
  if (!target || !nonempty(target.id)) return block('TARGET_UNRESOLVED');
  if (crewStationResolved !== true) return block('CREW_STATION_UNRESOLVED');
  if (!nonempty(attackId) || !nonempty(vehicle?.id)) return block('ATTACK_SCOPE_UNRESOLVED');
  const scope={vehicleId:vehicle.id,attackId,weaponGroupKey:source.weaponGroupKey,targetId:target.id};
  if (source.attackBonusEvidence?.state === 'PUBLISHED_CONFLICT') {
    // The computed vehicle INT math cannot consume a printed-flat override.
    // Keep this attack blocked until the published conflict/crew math is
    // reconciled; no GM choice may be silently treated as a flat modifier.
    return block('PUBLISHED_ATTACK_CONFLICT_REQUIRES_FORMULA_RECONCILIATION');
  }
  // The source never states a stock weapon's firing arc. Under the 'unrestricted' policy (owner decision V-P6C-01) a
  // source-silent arc restricts nothing; under the default policy only an explicit GM adjudication can allow the attack.
  if (source.arcEvidence?.state==='SOURCE_SILENT_CONFIRMED' && stockArcPolicy===STOCK_ARC_POLICY.UNRESTRICTED)
    return {ok:true,kind:'TRUSTED_STOCK',sourceEntryKey:source.sourceEntryKey,weaponGroupKey:source.weaponGroupKey,
      operator:source.operator,arcAuthority:'POLICY_SOURCE_SILENT_UNRESTRICTED',receiptDocumentId:null};
  const arc=await authorizeVehicleArcEvidence({
    ...scope,sourceComplete:true,crewStationResolved:true,targetResolved:true,
    arcEvidence:source.arcEvidence?.state,arc:source.arcEvidence?.value,
    gmDecision
  });
  if (arc.status!=='ALLOW_VERIFIED_ARC' && arc.status!=='ALLOW_GM_INSTANCE_EXCEPTION')
    return block(arc.reason ?? 'ARC_UNRESOLVED');
  const effectiveArc=arc.selectedArc ?? arc.arc;
  if (!isTargetWithinVehicleArc(vehicle,target,effectiveArc)) return block('TARGET_OUTSIDE_VERIFIED_FIRE_ARC');
  return {ok:true,kind:'TRUSTED_STOCK',sourceEntryKey:source.sourceEntryKey,
    weaponGroupKey:source.weaponGroupKey,operator:source.operator,arcAuthority:arc.status,receiptDocumentId:arc.receiptDocumentId ?? null};
}
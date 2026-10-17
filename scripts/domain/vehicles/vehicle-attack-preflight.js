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
export async function authorizeVehicleAttackBeforeCosts({vehicle,weapon,target,attackId,crewStationResolved,gmDecision=null}) {
  const base = classifyVehicleAttackPreflight({vehicle,weapon});
  if (!base.ok) return base;
  if (base.kind==='CUSTOM_MODIFICATION') return base;

  const source = base.source;
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
    weaponGroupKey:source.weaponGroupKey,receiptDocumentId:arc.receiptDocumentId ?? null};
}
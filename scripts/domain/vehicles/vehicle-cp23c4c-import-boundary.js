/**
 * CP23-C4C — canonical SotG source import boundary.
 *
 * A CP23-C3 document is not a deployable vehicle template. In particular,
 * VehicleImportEngine's generic normalizer assumes legacy string Initiative
 * and will silently replace approved numeric Initiative with "+0".
 * Its other empty-data defaults also change SOURCE_SILENT into fabricated
 * vehicle facts. Until a certified source-to-runtime translator and
 * authenticated native pack transaction exist, block installation BEFORE
 * normalization or ActorEngine.updateActor.
 *
 * This guard is independent of the editable Actor/source metadata and
 * provides NO positive stock trust or actor hydration authority.
 */
import { CP23C4B_WORLD_ANCHORS } from './vehicle-cp23c4b-source-anchors.generated.js';

export const CP23C4C_BLOCKED_SOURCE_PACKS=Object.freeze([
  'foundryvtt-swse.sotg-canonical-stock-source',
  'foundryvtt-swse.sotg-cp23b-isolated-proposals',
  'foundryvtt-swse.sotg-cp23c3-source-stage'
]);

const sourceDocumentIds=new Set(CP23C4B_WORLD_ANCHORS.entries.map(x=>x.sourceDocumentId));
const denied=reason=>Object.freeze({
  status:'CP23C4C_INSTALLATION_BLOCKED',
  reason,canonicalSourceBindingAuthenticated:false,
  nativeSourcePackVerified:false,
  durableGMInstallationReceipt:false,
  productionHydrationPermitted:false,
  physicalMountCertified:false,foundryStockAttackTrusted:false
});

/**
 * A reserved source document ID alone is sufficient to refuse import,
 * even when a caller strips its .pack metadata or supplies a forged Actor.
 * Unreserved legacy imports retain their existing behavior but gain no trust.
 */
export function classifyCP23C4CSourceImport(sourceActor) {
  if(!sourceActor||typeof sourceActor!=='object')return denied('SOURCE_DOCUMENT_REQUIRED');
  // Test BOTH Foundry id and serialized _id: a forged/cloned document may
  // expose mismatching fields. Neither is ever an authority to import.
  if((typeof sourceActor.id==='string'&&sourceDocumentIds.has(sourceActor.id)) ||
     (typeof sourceActor._id==='string'&&sourceDocumentIds.has(sourceActor._id)) ||
     (typeof sourceActor.pack==='string'&&
       CP23C4C_BLOCKED_SOURCE_PACKS.includes(sourceActor.pack))){
    return denied('STAGED_CANONICAL_SOURCE_MUST_NOT_ENTER_LEGACY_NORMALIZER');
  }
  return Object.freeze({
    status:'NOT_A_CP23_CANONICAL_SOURCE',
    reason:'LEGACY_IMPORT_POLICY_UNCHANGED_NO_STOCK_AUTHORITY',
    canonicalSourceBindingAuthenticated:false,
    nativeSourcePackVerified:false,
    durableGMInstallationReceipt:false,
    productionHydrationPermitted:false,
    physicalMountCertified:false,foundryStockAttackTrusted:false
  });
}
export function assertCP23C4CNoStagedSourceImport(sourceActor) {
  const finding=classifyCP23C4CSourceImport(sourceActor);
  if(finding.status==='CP23C4C_INSTALLATION_BLOCKED')
    throw new Error('CP23C4C_STAGED_CANONICAL_SOURCE_IMPORT_FORBIDDEN: '+finding.reason);
  return finding;
}
/**
 * Read-only diagnostic for source->legacy normalizer loss.
 * Exposes changed/synthesized fields to migration tooling without applying
 * them, creating a trust receipt, or promoting weapon-attack permissions.
 */
export function inspectCP23C4CNormalizationLoss(originalSystem,normalizedSystem) {
  if(!originalSystem||typeof originalSystem!=='object'||
     !normalizedSystem||typeof normalizedSystem!=='object')
    return denied('INVALID_SOURCE_OR_NORMALIZED_PAYLOAD');
  const own=(v,k)=>Object.prototype.hasOwnProperty.call(v,k);
  const fields=['initiative','reflexDefense','flatFooted','fortitudeDefense',
    'hp','shields','crew','cargo','weapons','hyperdrive_class','backup_class',
    'passengers','consumables','type','size','category','domain'];
  const synthesized=[],changed=[];
  for(const key of fields) {
    if(!own(normalizedSystem,key))continue;
    if(!own(originalSystem,key)){
      synthesized.push(key);
    }else if(JSON.stringify(originalSystem[key])!==JSON.stringify(normalizedSystem[key])){
      changed.push(key);
    }
  }
  return Object.freeze({
    status:'CP23C4C_NORMALIZER_SOURCE_LOSS_DIAGNOSTIC',
    reason:'UNREVIEWED_DEFAULTS_OR_COERCIONS_NEVER_PROVE_CANONICAL_STOCK',
    synthesizedFields:Object.freeze(synthesized),
    changedFields:Object.freeze(changed),
    sourceFactsPreserved:synthesized.length===0&&changed.length===0,
    canonicalSourceBindingAuthenticated:false,
    nativeSourcePackVerified:false,
    durableGMInstallationReceipt:false,
    productionHydrationPermitted:false,
    physicalMountCertified:false,foundryStockAttackTrusted:false
  });
}

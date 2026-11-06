/**
 * CP22 authoritative publication READ PATH. CP21 decisions are compiled from
 * immutable CP16 + owner-approved CP21 into one generated source mirror.
 * This module is a source-facing reference, never installed Actor authority.
 *
 * Do not pass editable Actor.system.stockSourceEntryKey to an attack gate.
 * Installation, provenance, Pure/Modified mutation invalidation, and physical
 * weapon certification remain independent trust requirements.
 */
import {CP22_SOTG_REFERENCE_CATALOG} from './vehicle-cp22-source-catalog.generated.js';

const catalog=CP22_SOTG_REFERENCE_CATALOG;
const byKey=new Map(catalog.records.map(record=>[record.sourceEntryKey,record]));
const byCandidate=new Map(catalog.legacyPackCandidates.map(record=>[
  record.packName+':'+record.documentId,record
]));

function clone(value) {
  return value===undefined?undefined:JSON.parse(JSON.stringify(value));
}
const denied=(reason)=>({
  status:'NOT_VERIFIED_FOR_OPERATION',reason,
  mechanicalCertificationGranted:false,foundryStockAttackTrusted:false,
  actorMutationAllowed:false,productionHydrationPermitted:false
});
function parentOf(root,path) {
  if(typeof path!=='string'||!path.startsWith('/'))throw Error('CP21_BAD_FIELD_POINTER');
  const keys=path.slice(1).split('/');
  if(keys.some(k=>!k||k==='__proto__'||k==='constructor'||k==='prototype'))
    throw Error('CP21_UNSAFE_FIELD_POINTER');
  let node=root;
  for(const key of keys.slice(0,-1)) {
    if(!Object.prototype.hasOwnProperty.call(node??{},key))throw Error('CP21_MISSING_FIELD_PARENT');
    node=node[key];
  }
  const key=keys.at(-1);
  if(!Object.prototype.hasOwnProperty.call(node??{},key))throw Error('CP21_MISSING_FIELD');
  return [node,key];
}
/**
 * An immutable SOURCE-BOOK lookup: never accepts Foundry Actors or packs and
 * never produces an installed weapon, bonus modifier or combat permission.
 * Resolves all fifteen original-vs-effective CP21 views using the same
 * source records pinned by the audit, with preimage checks on every override.
 */
export function resolveCP21ApprovedPublicationReference(sourceEntryKey) {
  if(typeof sourceEntryKey!=='string'||!sourceEntryKey.trim())return denied('NO_PUBLICATION_SOURCE_KEY');
  const original=byKey.get(sourceEntryKey);
  if(!original)return denied('NOT_IN_OWNER_APPROVED_SOURCE_SET');
  const decision=original.approvedDecision;
  if(decision.approvalState!=='APPROVED'||
     decision.effectiveProjectionState!=='APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED'||
     decision.physicalMountCertificateGranted!==false||
     decision.foundryAutomatedAttackGranted!==false||
     decision.productionHydrationPermitted!==false)
    return denied('OWNER_APPROVAL_OR_RUNTIME_BOUNDARY_INVALID');
  const effectiveFacts=clone(original.originalPrintedFacts);
  const effectiveAttackGroups=clone(original.originalAttackGroups);
  try {
    for(const x of decision.fieldOverrides) {
      const [parent,key]=parentOf(effectiveFacts,x.path);
      if(JSON.stringify(parent[key])!==JSON.stringify(x.originalValue))throw Error('CP21_FIELD_PREIMAGE_DRIFT');
      parent[key]=clone(x.newValue);
    }
    for(const x of decision.attackGroupOverrides) {
      if(!Number.isInteger(x.rowIndex)||x.rowIndex<0||x.rowIndex>=effectiveAttackGroups.length)
        throw Error('CP21_ROW_INDEX_INVALID');
      const row=effectiveAttackGroups[x.rowIndex];
      const wasPresent=Object.prototype.hasOwnProperty.call(row,x.field);
      if(wasPresent!==x.originalPresent||
         (wasPresent&&JSON.stringify(row[x.field])!==JSON.stringify(x.originalValue)))
        throw Error('CP21_WEAPON_PREIMAGE_DRIFT');
      row[x.field]=clone(x.newValue);
    }
    if(decision.policies.some(p=>p.runtimePermission!==false))throw Error('CP21_POLICY_ATTEMPTED_RUNTIME_GRANT');
  }catch(error){return denied(error.message);}
  return {
    status:'APPROVED_PUBLICATION_REFERENCE_ONLY',
    sourceEntryKey:original.sourceEntryKey,
    printedName:original.printedName,printedPage:original.printedPage,
    sourcePdfSha256:catalog.sourcePdfSha256,
    decisionId:decision.decisionId,
    originalPrintedFacts:clone(original.originalPrintedFacts),
    originalAttackGroups:clone(original.originalAttackGroups),
    originalFieldStates:clone(original.sourceFieldStates),
    effectiveFacts,
    effectiveAttackGroups,
    printedAlternatives:clone(decision.printedAlternatives),
    unresolvedCanonicalScopes:clone(decision.unresolvedCanonicalScopes),
    approvedPolicies:clone(decision.policies),
    legacyMissingRowKeys:clone(decision.legacyMissingRowKeys),
    mechanicalCertificationGranted:false,
    foundryStockAttackTrusted:false,
    actorMutationAllowed:false,
    productionHydrationPermitted:false,
    configurationSourceBindingVerified:false
  };
}
/**
 * Legacy vehicle pack hints are diagnostics, NOT provenance.
 * A match requires the exact observed pack, _id and name and still has no
 * authority to import the effective facts into an Actor or fire any weapon.
 */
export function inspectCP21LegacyPackCandidate({packName,documentId,name}={}) {
  if(typeof packName!=='string'||typeof documentId!=='string'||typeof name!=='string')
    return null;
  const candidate=byCandidate.get(packName+':'+documentId);
  if(!candidate||candidate.name!==name)return null;
  const reference=resolveCP21ApprovedPublicationReference(candidate.sourceEntryKey);
  if(reference.status!=='APPROVED_PUBLICATION_REFERENCE_ONLY')return null;
  return {
    ...denied('LEGACY_PACK_HAS_NO_VERIFIED_CANONICAL_SOURCE_BINDING'),
    status:'LEGACY_PACK_MATCH_UNVERIFIED_SOURCE_BINDING',
    decisionId:reference.decisionId,
    printedName:reference.printedName,
    printedPage:reference.printedPage,
    message:'CP21 approved source ruling exists for this book ship. This legacy pack record is NOT verified as the canonical source: its effective rules are NOT applied by this import, and stock attacks remain blocked.'
  };
}

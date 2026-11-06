#!/usr/bin/env node
/**
 * CP23-C2 deterministic, never-installable source identity preflight.
 * No registered source compendium, world Actor write, receipt issue, or
 * automatic weapon permission is performed.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
export const DRAFT_PATH='data/audits/vehicles/swse-sotg-cp23b-isolated-source-actor-proposals.json';
export const DRAFT_SHA='a9170481f9c0bb34fe31741b7194ac54e2933501';
export const ANCHOR_PATH='data/audits/vehicles/swse-sotg-cp23c-source-draft-parity-anchors.json';
export const ANCHOR_SHA='062daf6070534b1bdf40688db5cbce44f6cc091d';
export const OUTPUT='data/audits/vehicles/swse-sotg-cp23c2-native-install-readiness.json';
const gitBlob=data=>createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
function valid(ok,reason){if(!ok)throw Error(reason);}
const transient=s=>[
  ...(Object.hasOwn(s.hp??{},'value')?['system.hp.value']:[]),
  ...(Object.hasOwn(s.hp??{},'temp')?['system.hp.temp']:[]),
  ...(Object.hasOwn(s.shields??{},'value')?['system.shields.value']:[])
];
export function buildCP23C2Readiness(repoRoot=root) {
  const draftBytes=readFileSync(repoRoot+'/'+DRAFT_PATH);
  const anchorBytes=readFileSync(repoRoot+'/'+ANCHOR_PATH);
  valid(gitBlob(draftBytes)===DRAFT_SHA,'PINNED_CP23B_DRAFT_BLOB_CHANGED');
  valid(gitBlob(anchorBytes)===ANCHOR_SHA,'PINNED_CP23C1_ANCHOR_BLOB_CHANGED');
  const draft=JSON.parse(draftBytes.toString('utf8'));
  const anchors=JSON.parse(anchorBytes.toString('utf8'));
  const system=JSON.parse(readFileSync(repoRoot+'/system.json','utf8'));
  valid(draft.proposalCount===15&&draft.proposals.length===15&&anchors.entries.length===15,'SOURCE_COUNT_CHANGED');
  valid(draft.productionPackFilesChanged===false&&draft.releaseDeploymentPermitted===false&&
    draft.canonicalPackBindingsAuthenticated===0&&anchors.durableWorldReceiptsIssued===0,
    'EXISTING_SOURCE_AUTHORITY_ESCALATED');
  valid(!system.packs?.some(p=>p.name==='sotg-cp23b-isolated-proposals'),
    'PROPOSAL_PACK_REGISTERED_REQUIRES_NEW_AUTHORITY_REVIEW');
  const records=draft.proposals.map((p,i)=>{
    const a=anchors.entries[i];
    valid(p.queuePosition===i+1&&p.sourceEntryKey===a.sourceEntryKey&&
      p.decisionId===a.decisionId&&p.draftActor._id===a.isolationId,
      'SOURCE_ANCHOR_IDENTITY_DRIFT');
    valid(p.draftActor.system.weapons.length===0&&p.installedWeaponsCertified===0&&
      p.physicalMountCertified===false&&p.stockAttackTrusted===false,
      'UNTRUSTED_WEAPON_INTRODUCED');
    return {
      queuePosition:p.queuePosition,sourceEntryKey:p.sourceEntryKey,
      decisionId:p.decisionId,draftId:a.isolationId,
      immutableDraftFingerprintFnv64:a.canonicalDraftFingerprintFnv64,
      supportedTransientGameplayPaths:transient(p.draftActor.system),
      configurationKeysRemainImmutable:true,
      registeredPackProvenance:'NOT_REGISTERED',
      worldImportResult:'NOT_EXECUTED',
      GMOwnedReceipt:'NOT_ISSUED',
      unresolvedPhysicalMounts:p.sourceWeaponGroupCount,
      stockAttackAuthorized:false
    };
  });
  valid(new Set(records.map(x=>x.sourceEntryKey)).size===15,'DUPLICATE_CANONICAL_ID');
  return {
    schema:'swse.vehicle.sotg.cp23c2.native-import-readiness.v1',
    phase:'CP23-C2-READONLY-AUTHENTICATED-INSTALLATION-PREFLIGHT',
    sourceDraftPath:DRAFT_PATH,sourceDraftGitBlob:DRAFT_SHA,
    parityAnchorPath:ANCHOR_PATH,parityAnchorGitBlob:ANCHOR_SHA,
    registeredPackRequired:'foundryvtt-swse.sotg-cp23b-isolated-proposals',
    registeredPackIsPresentInSystemManifest:false,
    sourceIdentityCount:15,approvedRules:15,issueableGMReceipts:0,
    installedNativeActorsCertified:0,trustedPhysicalWeaponGroups:0,
    stockAttackPermissions:0,completeCP23C2:false,
    ownerApprovalNeededForDeployment:true,
    transientGameplayPaths:['system.hp.value','system.hp.temp','system.shields.value'],
    neverTreatAsProof:['Actor.flags','Actor.system.stockSourceEntryKey',
      'packDocument.name','legacyPackId','unregisteredCP23BDraftParity',
      'userProvidedProvenance'],
    records
  };
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
  const expected=JSON.stringify(buildCP23C2Readiness(),null,2)+'\n';
  if(process.argv.includes('--check')){
    valid(readFileSync(root+'/'+OUTPUT,'utf8')===expected,'CP23C2_PRELIMINARY_READINESS_DRIFT');
    console.log('PASS CP23-C2: 15 unregistered source records, state-scoped comparison and zero receipts/attacks');
  }else if(process.argv.includes('--write')){
    writeFileSync(root+'/'+OUTPUT,expected,'utf8');
    console.log('WROTE '+OUTPUT);
  }else throw Error('Choose --check or --write; this command cannot deploy packs');
}

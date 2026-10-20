#!/usr/bin/env node
/**
 * CP23-C1: reproduce non-authorizing source-draft integrity anchors.
 * FNV64 is an inexpensive STRUCTURAL DRIFT indicator, not a signature,
 * permission grant, or authentication proof.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {draftCP23CSnapshot,canonicalCP23CJson}
 from '../../../scripts/domain/vehicles/vehicle-cp23c-source-integrity.js';

export const CP23B_PINNED_BLOB='a9170481f9c0bb34fe31741b7194ac54e2933501';
export const INPUT_PATH='data/audits/vehicles/swse-sotg-cp23b-isolated-source-actor-proposals.json';
export const OUTPUT_PATH='data/audits/vehicles/swse-sotg-cp23c-source-draft-parity-anchors.json';
const root=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const invariant=(v,code)=>{if(!v)throw Error(code);};
const gitBlob=v=>createHash('sha1').update('blob '+v.length+'\0').update(v).digest('hex');
export function fnv64UTF16(value){
  let n=0xcbf29ce484222325n;
  for(let i=0;i<value.length;i++)
    n=BigInt.asUintN(64,(n^BigInt(value.charCodeAt(i)))*0x100000001b3n);
  return n.toString(16).padStart(16,'0');
}
export function buildCP23CSourceIntegrity({repoRoot=root}={}){
  const bytes=readFileSync(repoRoot+'/'+INPUT_PATH);
  invariant(gitBlob(bytes)===CP23B_PINNED_BLOB,'CP23B_SOURCE_PROPOSALS_CHANGED');
  const source=JSON.parse(bytes.toString('utf8'));
  invariant(source.proposalCount===15&&source.proposals.length===15&&
    source.canonicalPackBindingsAuthenticated===0&&source.releaseDeploymentPermitted===false&&
    source.trustedStockAttacksAdded===0,'CP23B_AUTHORITY_DRIFT');
  const entries=source.proposals.map((proposal,i)=>{
    const snapshot=draftCP23CSnapshot(proposal);
    invariant(proposal.queuePosition===i+1,'CP23C_ORDER_DRIFT');
    invariant(snapshot.sourceEntryKey===proposal.sourceEntryKey,'CP23C_ENTRY_KEY_DRIFT');
    invariant(snapshot.installedPhysicalWeaponCount===0&&!snapshot.canonicalBindingAuthenticated,
      'CP23C_UNEXPECTED_INSTALLATION_OR_MOUNT');
    return {
      queuePosition:proposal.queuePosition,
      sourceEntryKey:proposal.sourceEntryKey,
      decisionId:proposal.decisionId,
      isolationId:proposal.draftActor._id,
      canonicalDraftFingerprintFnv64:fnv64UTF16(canonicalCP23CJson(snapshot.sourceActor)),
      sourceGroupCount:proposal.sourceWeaponGroupCount,
      installedWeaponCount:proposal.draftActor.system.weapons.length,
      receiptIssueAllowed:false,
      expectedState:'UNARMED_DRAFT_PARITY_ONLY',
      unresolvedBlockers:[
        'NOT_IN_REGISTERED_CANONICAL_FOUNDRY_PACK',
        'NO_VERIFIED_INSTALL_TRANSACTION',
        'NO_MECHANICAL_MOUNT_CERTIFICATE',
        'MUTATION_LIFECYCLE_E2E_NOT_VERIFIED'
      ]
    };
  });
  invariant(new Set(entries.map(e=>e.sourceEntryKey)).size===15,'CP23C_DUPLICATE_SOURCE_IDENTITIES');
  return {
    schema:'swse.vehicle.sotg.cp23c.source-draft-parity-anchor.v1',
    phase:'CP23-C1-PROVENANCE-INTEGRITY-PREFLIGHT',
    inputCp23bPath:INPUT_PATH,
    inputCp23bBlob:CP23B_PINNED_BLOB,
    hashPurpose:'DETERMINISTIC_UTF16_FNV64_DRIFT_DETECTION_NOT_AUTHENTICATION',
    sourcePdfSha256:source.sourcePdfSha256,
    sourceCount:15,
    authenticatedInstallations:0,
    durableWorldReceiptsIssued:0,
    physicalMountCertificatesAdded:0,
    foundryStockAttackGrants:0,
    liveFoundryV13ActorInstallations:0,
    registeredProposalPack:false,
    entries
  };
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
  const text=JSON.stringify(buildCP23CSourceIntegrity(),null,2)+'\n';
  if(process.argv.includes('--check')){
    invariant(readFileSync(root+'/'+OUTPUT_PATH,'utf8')===text,'CP23C_PARITY_LEDGER_DRIFT');
    console.log('PASS CP23-C1: 15 source draft fingerprints; no authenticated installs or trusted attacks');
  }else if(process.argv.includes('--write')){
    writeFileSync(root+'/'+OUTPUT_PATH,text,'utf8');
    console.log('WROTE '+OUTPUT_PATH);
  }else throw Error('Only --check and --write are supported: no installation pathway');
}

#!/usr/bin/env node
/**
 * CP23-C4B deterministic world/source identity catalogue builder.
 * Two pinned, unregistered audit inputs. No pack registration or receipts.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
const stagePath='data/audits/vehicles/swse-sotg-cp23c3-unregistered-native-stage.json';
const draftPath='data/audits/vehicles/swse-sotg-cp23b-isolated-source-actor-proposals.json';
const stageSha='6c3e3ded146a300c4d16af66b9db2cff7e88145e';
const draftSha='a9170481f9c0bb34fe31741b7194ac54e2933501';
const output='scripts/domain/vehicles/vehicle-cp23c4b-source-anchors.generated.js';
const PACK='foundryvtt-swse.sotg-canonical-stock-source';
const gitBlob=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const must=(x,msg)=>{if(!x)throw Error(msg);};

export function buildCP23C4BAnchors(dir=root){
  const stageBytes=readFileSync(dir+'/'+stagePath);
  const draftBytes=readFileSync(dir+'/'+draftPath);
  must(gitBlob(stageBytes)===stageSha,'PINNED_CP23C3_STAGE_CHANGED');
  must(gitBlob(draftBytes)===draftSha,'PINNED_CP23B_DRAFT_CHANGED');
  const stage=JSON.parse(stageBytes.toString('utf8'));
  const drafts=JSON.parse(draftBytes.toString('utf8'));
  const system=JSON.parse(readFileSync(dir+'/system.json','utf8'));
  must(stage.stagedDocuments?.length===15&&drafts.proposals?.length===15,
    'SOURCE_POPULATION_CHANGED');
  must(stage.registeredInSystemJson===false&&stage.released===false&&
    stage.physicalMountCertificates===0&&stage.stockAttackPermissions===0&&
    !system.packs?.some(p=>p.name==='sotg-canonical-stock-source'||
      p.name===stage.stagePackName),'UNREVIEWED_SOURCE_PACK_REGISTRATION');
  const entries=stage.stagedDocuments.map((m,i)=>{
    const p=drafts.proposals[i];
    must(m.order===i+1&&p.queuePosition===i+1&&
      m.sourceEntryKey===p.sourceEntryKey&&
      m.decisionId===p.decisionId&&
      m.documentId===p.draftActor._id&&m.name===p.draftActor.name,
      'SOURCE_DOCUMENT_IDENTITY_OR_ORDER_CHANGED');
    const content=readFileSync(dir+'/'+m.file);
    must(gitBlob(content)===m.stagedJsonGitBlobSha,
      'SOURCE_DOCUMENT_BLOB_CHANGED:'+m.documentId);
    const doc=JSON.parse(content.toString('utf8'));
    must(doc._key==='!actors!'+doc._id,
      'MALFORMED_NATIVE_STAGING_DOCUMENT');
    // Compare the staged native payload to the exact CP23B Actor draft.
    const {_key,...clean}=doc;
    must(JSON.stringify(clean)===JSON.stringify(p.draftActor),
      'SOURCE_DRAFT_NATIVE_PAYLOAD_CHANGED:'+m.documentId);
    must(clean.system.weapons.length===0&&
      !Object.hasOwn(clean.system,'stockSourceEntryKey')&&
      p.physicalMountCertified===false&&p.stockAttackTrusted===false&&
      p.releaseDeploymentPermitted===false,
      'SOURCE_MOUNT_OR_PERMISSION_PROMOTED');
    return {order:m.order,sourceEntryKey:m.sourceEntryKey,
      decisionId:m.decisionId,sourceDocumentId:m.documentId,
      name:m.name,sourceDocumentGitBlobSha:m.stagedJsonGitBlobSha,
      sourceAttackRows:m.sourceAttackRows,draftActor:p.draftActor};
  });
  must(new Set(entries.map(x=>x.sourceEntryKey)).size===15,
    'SOURCE_IDENTITY_NOT_UNIQUE');
  return {
    schema:'swse.vehicle.sotg.cp23c4b.world-installation-identity-anchors.v1',
    stageManifestGitBlobSha:stageSha,cp23BProposalGitBlobSha:draftSha,
    sourcePackID:PACK,
    status:'AUDIT_ONLY_UNREGISTERED_PACK_NO_PROVENANCE_ISSUER',
    count:entries.length,entries
  };
}
const deepFreezeSource=`function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
`;
export function renderCP23C4BAnchors(dir=root){
  const data=buildCP23C4BAnchors(dir);
  return `/** GENERATED from pinned CP23B + CP23C3 unregistered source evidence.
 * NEVER a native source-pack certificate or runtime stock attack authority.
 * Rebuild: node tools/audits/vehicles/build_sotg_cp23c4b_world_anchors.mjs --write
 */
${deepFreezeSource}export const CP23C4B_WORLD_ANCHORS=deepFreeze(${JSON.stringify(data,null,2)});
`;
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url))){
  const result=renderCP23C4BAnchors();
  if(process.argv.includes('--check')){
    must(readFileSync(root+'/'+output,'utf8')===result,
      'CP23C4B_GENERATED_SOURCE_ANCHORS_DRIFT');
    console.log('PASS CP23-C4B: 15 independent source/world ID anchors, 15 native stage blobs, no registered pack or receipts');
  }else if(process.argv.includes('--write')){
    writeFileSync(root+'/'+output,result,'utf8');
  }else throw Error('Use --check or --write; no production install mode');
}

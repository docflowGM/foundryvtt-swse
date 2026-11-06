#!/usr/bin/env node
/**
 * CP23-C3: build/check 15 unregistered, unarmed native source-pack JSON files.
 *
 * Audit staging ONLY. Neither --check nor --write touches system.json,
 * production packs, ActorEngine, the world, or runtime stock attack authority.
 */
import {readFileSync,writeFileSync,mkdirSync,readdirSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join,basename} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
export const INPUT='data/audits/vehicles/swse-sotg-cp23b-isolated-source-actor-proposals.json';
export const INPUT_GIT_BLOB='a9170481f9c0bb34fe31741b7194ac54e2933501';
export const STAGE='data/audits/vehicles/sotg-cp23c3-native-source-stage/';
export const OUTPUT='data/audits/vehicles/swse-sotg-cp23c3-unregistered-native-stage.json';
export const STAGE_PACK_NAME='sotg-cp23c3-source-stage';

const invariant=(yes,reason)=>{if(!yes)throw Error(reason);};
const gitBlob=data=>createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function buildCP23C3SourceStage({repoRoot=root}={}){
  const bytes=readFileSync(join(repoRoot,INPUT));
  invariant(gitBlob(bytes)===INPUT_GIT_BLOB,'PINNED_CP23B_SOURCE_BLOB_CHANGED');
  const source=JSON.parse(bytes.toString('utf8'));
  const system=JSON.parse(readFileSync(join(repoRoot,'system.json'),'utf8'));
  invariant(source.proposalCount===15&&source.proposals?.length===15,
    'SOURCE_PROPOSAL_SET_CHANGED');
  invariant(source.releaseDeploymentPermitted===false&&
    source.canonicalPackBindingsAuthenticated===0&&
    source.trustedStockAttacksAdded===0&&
    source.productionPackFilesChanged===false,'STAGING_SOURCE_AUTHORITY_ESCALATED');
  invariant(!system.packs?.some(p=>p.name===STAGE_PACK_NAME||
      p.name==='sotg-cp23b-isolated-proposals'||
      String(p.path??'').includes('sotg-cp23c3-native-source-stage')),
    'STAGING_SOURCE_WAS_REGISTERED_FOR_RELEASE');
  const documents=new Map();
  const stagedDocuments=source.proposals.map((p,i)=>{
    invariant(p.queuePosition===i+1&&p.draftState==='NOT_DEPLOYABLE_SOURCE_PROPOSAL_ONLY'&&
      p.physicalMountCertified===false&&p.stockAttackTrusted===false&&
      p.releaseDeploymentPermitted===false&&p.provenanceAuthentication==='NOT_VERIFIED',
      'PROPOSAL_ORDER_OR_AUTHORIZATION_DRIFT');
    const actor=p.draftActor;
    invariant(actor?.type==='vehicle'&&/^[A-Za-z0-9]{16}$/.test(actor._id)&&
      actor._id==='sotgcp23b'+String(i+1).padStart(7,'0')&&
      actor.name===actor.system?.model&&
      actor.system?.sourcebook==='Starships of the Galaxy'&&
      actor.system?.page===p.printedPage&&
      Array.isArray(actor.system?.weapons)&&actor.system.weapons.length===0&&
      !Object.hasOwn(actor.system,'stockSourceEntryKey'),
      'NON_DEPLOYABLE_SOURCE_DOCUMENT_IDENTITY_OR_WEAPONS_CHANGED');
    invariant(p.sourceWeaponGroupCount===p.sourceWeaponGroupEvidence?.length&&
      p.sourceWeaponGroupCount>0&&p.installedWeaponsCertified===0,
      'WEAPON_EVIDENCE_WAS_PROMOTED_TO_HARDWARE');
    const document={...actor,_key:'!actors!'+actor._id};
    const content=JSON.stringify(document)+'\n';
    const file=STAGE+actor._id+'.json';
    invariant(!documents.has(file),'DUPLICATE_SOURCE_DOCUMENT');
    documents.set(file,content);
    return {
      order:i+1,sourceEntryKey:p.sourceEntryKey,decisionId:p.decisionId,
      name:actor.name,printedPage:p.printedPage,documentId:actor._id,
      file,sourceAttackRows:p.sourceWeaponGroupCount,
      stagedJsonGitBlobSha:gitBlob(Buffer.from(content,'utf8')),
      weaponCount:0
    };
  });
  invariant(documents.size===15&&new Set(stagedDocuments.map(x=>x.sourceEntryKey)).size===15,
    'STAGED_SOURCE_NOT_UNIQUE');
  const manifest={
    schema:'swse.vehicle.sotg.cp23c3.unregistered-native-source-stage.v1',
    phase:'CP23-C3-STAGED-CANONICAL-SOURCE-PACK-NOT_REGISTERED',
    sourceInput:{path:INPUT,gitBlobSha:INPUT_GIT_BLOB},
    stageDirectory:STAGE,stagePackName:STAGE_PACK_NAME,
    sourcePdfSha256:source.sourcePdfSha256,
    proposalCount:15,nativeDocumentCount:15,
    registeredInSystemJson:false,released:false,
    worldActorInstallations:0,durableGMReceiptsIssued:0,
    physicalMountCertificates:0,stockAttackPermissions:0,
    stagedDocuments
  };
  return {manifest,documents};
}

function run(){
  const {manifest,documents}=buildCP23C3SourceStage();
  const bytes=JSON.stringify(manifest,null,2)+'\n';
  if(process.argv.includes('--check')){
    const folder=join(root,STAGE);
    const names=readdirSync(folder).filter(n=>n.endsWith('.json')).sort();
    const expected=[...documents.keys()].map(file=>basename(file)).sort();
    invariant(same(names,expected),'STAGE_FOLDER_FILE_SET_CHANGED');
    for(const [file,content] of documents){
      invariant(lstatSync(join(root,file)).isFile(),'STAGE_FILE_NOT_A_REGULAR_FILE:'+file);
      invariant(readFileSync(join(root,file),'utf8')===content,
        'STAGED_ACTOR_DOCUMENT_DRIFT:'+file);
    }
    invariant(readFileSync(join(root,OUTPUT),'utf8')===bytes,
      'STAGING_MANIFEST_DRIFT');
    console.log('PASS CP23-C3: 15 original approved source IDs, 15 Git-pinned unarmed native staging records, no registered/released pack');
  }else if(process.argv.includes('--write')){
    mkdirSync(join(root,STAGE),{recursive:true});
    for(const [file,content] of documents)
      writeFileSync(join(root,file),content,'utf8');
    writeFileSync(join(root,OUTPUT),bytes,'utf8');
    console.log('WROTE CP23-C3 audit-only staging JSON files (not released)');
  }else throw Error('Only --check/--write to audit paths; no deployment mode');
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url)))
  run();

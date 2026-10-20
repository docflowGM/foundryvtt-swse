#!/usr/bin/env node
/**
 * CP23-B: generate / verify isolated, NON-DEPLOYABLE vehicle Actor proposals.
 *
 * Input authority: immutable CP22 generated source catalogue, which embeds
 * the CP21 owner-approved effective rule decisions, plus CP23-A reconciliation.
 * Does NOT overwrite /packs, does not authenticate a native v13 pack, does
 * not trust a physical weapon or mutate a Foundry Actor.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CP22_SOTG_REFERENCE_CATALOG as catalog }
  from '../../../scripts/domain/vehicles/vehicle-cp22-source-catalog.generated.js';

export const SOURCE_CATALOG_BLOB = '44952f95d2101ca6f683885d07167c1ad65289c2';
export const RECONCILIATION_BLOB = 'ff91bd185a64838c75d2104f2bf4e53d2a0629a2';
export const OUTPUT_PATH = 'data/audits/vehicles/swse-sotg-cp23b-isolated-source-actor-proposals.json';

const gitBlob=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const clone=x=>JSON.parse(JSON.stringify(x));
const validInteger=x=>typeof x==='number'&&Number.isInteger(x)?x:null;
const invariant=(condition,why)=>{if(!condition)throw Error(why);};
function approveFacts(record){
  const facts=clone(record.originalPrintedFacts);
  for(const op of record.approvedDecision.fieldOverrides){
    const keys=op.path.split('/').slice(1);
    invariant(keys.length>0&&keys.every(x=>x&&!['__proto__','constructor','prototype'].includes(x)),
      'BAD_APPROVED_FIELD_POINTER');
    let current=facts;
    for(const key of keys.slice(0,-1)){
      invariant(Object.hasOwn(current??{},key),'UNKNOWN_APPROVED_FIELD_PARENT');
      current=current[key];
    }
    const key=keys.at(-1);
    invariant(Object.hasOwn(current??{},key)&&equal(current[key],op.originalValue),
      'APPROVED_FIELD_PREIMAGE_CHANGED:'+op.path);
    current[key]=clone(op.newValue);
  }
  return facts;
}
function approveAttackRows(record){
  const result=clone(record.originalAttackGroups);
  for(const op of record.approvedDecision.attackGroupOverrides){
    const row=result[op.rowIndex];
    invariant(row&&Object.hasOwn(row,op.field)===op.originalPresent,
      'APPROVED_ATTACK_ROW_KEY_DRIFT');
    if(op.originalPresent)
      invariant(equal(row[op.field],op.originalValue),'APPROVED_ATTACK_ROW_PREIMAGE_DRIFT');
    row[op.field]=clone(op.newValue);
  }
  return result;
}

export function buildCP23BProposals({repoRoot=resolve(fileURLToPath(new URL('../../../',import.meta.url)))}={}){
  const catalogPath=repoRoot+'/scripts/domain/vehicles/vehicle-cp22-source-catalog.generated.js';
  const sourceBytes=readFileSync(catalogPath);
  invariant(gitBlob(sourceBytes)===SOURCE_CATALOG_BLOB,'PINNED_CP22_SOURCE_CHANGED');
  const reconPath=repoRoot+'/data/audits/vehicles/swse-sotg-cp23-source-pack-reconciliation.json';
  const reconBytes=readFileSync(reconPath);
  invariant(gitBlob(reconBytes)===RECONCILIATION_BLOB,'PINNED_CP23A_RECONCILIATION_CHANGED');
  const reconciliation=JSON.parse(reconBytes.toString('utf8'));
  invariant(catalog.records.length===15&&reconciliation.records.length===15,
    'EXPECTED_15_SOURCE_IDENTITIES');
  invariant(reconciliation.reconciledSourceCount===0,'UNEXPECTED_AUTHENTICATED_PACK_BINDING');
  const proposals=catalog.records.map((rec,i)=>{
    const facts=approveFacts(rec),original=rec.originalPrintedFacts;
    const def=facts.defenses??{},dur=facts.durability??{};
    const op=rec.approvedDecision.fieldOverrides.find(x=>
      x.path==='/initiative'||x.path==='/skills/initiative');
    const initiative=op?.newValue??facts.initiative;
    invariant(Number.isInteger(initiative),'MISSING_VALID_INITIATIVE');
    const legacy=reconciliation.records[i];
    invariant(rec.sourceEntryKey===legacy.sourceEntryKey&&
      rec.approvedDecision.order===i+1&&
      rec.approvedDecision.approvalState==='APPROVED'&&
      rec.approvedDecision.physicalMountCertificateGranted===false&&
      rec.approvedDecision.foundryAutomatedAttackGranted===false&&
      rec.approvedDecision.productionHydrationPermitted===false,
      'OWNER_AUTHORITY_OR_ORDER_CHANGED');
    const system={
      model:rec.printedName,
      sourcebook:'Starships of the Galaxy',page:rec.printedPage,
      initiative,
      ...(validInteger(facts.sensesPerception)!==null?
        {senses:'Perception +'+facts.sensesPerception}:{}),
      ...(validInteger(def.reflex)!==null?{reflexDefense:def.reflex}:{}),
      ...(validInteger(def.flatFootedReflex)!==null?{flatFooted:def.flatFootedReflex}:{}),
      ...(validInteger(def.fortitude)!==null?{fortitudeDefense:def.fortitude}:{}),
      ...(validInteger(def.armorBonus)!==null?{armorBonus:def.armorBonus}:{}),
      ...(validInteger(def.damageReduction)!==null?{damageReduction:def.damageReduction}:{}),
      ...(validInteger(dur.threshold)!==null?{damageThreshold:dur.threshold}:{}),
      ...(validInteger(dur.hitPoints)!==null?
        {hp:{value:dur.hitPoints,max:dur.hitPoints,temp:0}}:{}),
      ...(validInteger(def.shieldRating)!==null?
        {shields:{value:def.shieldRating,max:def.shieldRating},
          shieldRating:def.shieldRating}:{}),
      attributes:Object.fromEntries(['str','dex','int']
        .filter(k=>validInteger(facts.abilities?.[k])!==null)
        .map(k=>[k,{base:facts.abilities[k],racial:0,temp:0}])),
      ...(typeof facts.crew?.quality==='string'?
        {crewQuality:facts.crew.quality}:{}),
      ...(validInteger(facts.crew?.count)!==null?
        {vehicleCrewCount:facts.crew.count}:{}),
      weapons:[],
      vehicleArmamentSourceStatus:'SOURCE_ATTACK_GROUPS_NOT_INSTALLED_OR_CERTIFIED'
    };
    const id='sotgcp23b'+String(i+1).padStart(7,'0');
    invariant(id.length===16,'BAD_ISOLATED_DRAFT_ID');
    return {
      queuePosition:i+1,sourceEntryKey:rec.sourceEntryKey,
      decisionId:rec.approvedDecision.decisionId,
      draftState:'NOT_DEPLOYABLE_SOURCE_PROPOSAL_ONLY',
      printedPage:rec.printedPage,
      proposedPack:'sotg-cp23b-isolated-proposals',
      draftActor:{_id:id,name:rec.printedName,type:'vehicle',
        img:'icons/svg/mystery-man.svg',system},
      sourceWeaponGroupEvidence:approveAttackRows(rec),
      originalWeaponGroupEvidence:rec.originalAttackGroups,
      sourceWeaponGroupCount:rec.originalAttackGroups.length,
      installedWeaponsCertified:0,
      proposedOriginalPrintedFacts:original,
      approvedEffectiveFacts:facts,
      unresolvedRules:rec.approvedDecision.unresolvedCanonicalScopes,
      approvedPolicies:rec.approvedDecision.policies,
      legacyCandidate:legacy.candidate?
        {packName:legacy.candidate.packName,
          documentId:legacy.candidate.documentId,
          legacyName:legacy.candidate.legacyName}:null,
      provenanceAuthentication:'NOT_VERIFIED',
      nativeV13Roundtrip:'NOT_EXECUTED',
      worldActorCreation:'NOT_EXECUTED',
      physicalMountCertified:false,
      stockAttackTrusted:false,
      releaseDeploymentPermitted:false
    };
  });
  invariant(new Set(proposals.map(p=>p.draftActor._id)).size===15,'DUPLICATE_DRAFT_ACTOR_ID');
  invariant(proposals.filter(x=>x.legacyCandidate).length===13,'PACK_CANDIDATE_COUNT_CHANGED');
  invariant(proposals.every(x=>x.draftActor.system.weapons.length===0&&
    !Object.hasOwn(x.draftActor.system,'stockSourceEntryKey')&&
    x.physicalMountCertified===false&&x.releaseDeploymentPermitted===false),
    'UNAUTHORIZED_WEAPON_OR_STOCK_SOURCE_BINDING');
  return {
    schema:'swse.vehicle.sotg.cp23b.isolated-document-proposal.v1',
    stage:'CP23-B-STOCK-SOURCE-DOCUMENT-DRAFTS',
    inputBlobs:{
      cp22Catalog:{path:'scripts/domain/vehicles/vehicle-cp22-source-catalog.generated.js',
        sha:SOURCE_CATALOG_BLOB},
      cp23aReconciliation:{path:'data/audits/vehicles/swse-sotg-cp23-source-pack-reconciliation.json',
        sha:RECONCILIATION_BLOB}
    },
    sourcePdfSha256:catalog.sourcePdfSha256,
    proposedPackId:'sotg-cp23b-isolated-proposals',
    proposalCount:15,legacyCandidateCount:13,
    canonicalPackBindingsAuthenticated:0,
    physicalMountCertificationsIssued:0,
    trustedStockAttacksAdded:0,
    productionPackFilesChanged:false,
    releaseDeploymentPermitted:false,
    nativeFoundryV13RoundtripCompleted:false,
    proposals
  };
}
function main(){
  const root=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
  const expected=JSON.stringify(buildCP23BProposals({repoRoot:root}),null,2)+'\n';
  const target=root+'/'+OUTPUT_PATH;
  if(process.argv.includes('--check')){
    invariant(readFileSync(target,'utf8')===expected,'CP23B_DRAFT_DOCUMENT_PROJECTION_DRIFT');
    console.log('PASS CP23-B: 15 isolated source-backed drafts; 13 legacy hints; all weapons uninstalled; zero runtime authority');
  }else if(process.argv.includes('--write')){
    writeFileSync(target,expected,'utf8');
    console.log('WROTE '+OUTPUT_PATH);
  }else throw Error('Use --check or --write only; no production staging or deployment option exists');
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(fileURLToPath(import.meta.url)))
  main();

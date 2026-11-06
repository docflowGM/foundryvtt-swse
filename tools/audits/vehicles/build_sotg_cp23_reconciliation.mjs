#!/usr/bin/env node
/**
 * CP23 reproducible source-to-legacy-pack reconciliation preflight.
 * Stages an AUDIT LEDGER ONLY; never changes a pack, actor, mount or trust
 * registry. Legacy pack tuples are observations, not canonical proof.
 */
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {CP22_SOTG_REFERENCE_CATALOG as catalog} from '../../../scripts/domain/vehicles/vehicle-cp22-source-catalog.generated.js';

const expectedCatalogBlob="44952f95d2101ca6f683885d07167c1ad65289c2";
const expectedPacks=[
  {
    "packName": "vehicles-starfighters",
    "sourceGitBlob": "46e982f935a1a14b45bb860c3685c08f0cb42c95",
    "documentCount": 85
  },
  {
    "packName": "vehicles-capital-ships",
    "sourceGitBlob": "8f333b91b684e90f50384dd61a39e5fa80b27994",
    "documentCount": 63
  },
  {
    "packName": "vehicles-space-transports",
    "sourceGitBlob": "65f516504a7ecfa007924e8161c3a876954f13d3",
    "documentCount": 108
  }
];
const root=process.cwd();
const dest='data/audits/vehicles/swse-sotg-cp23-source-pack-reconciliation.json';
const fail=(condition,description)=>{if(!condition)throw Error(description);};
const blob=bytes=>createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
const has=(o,k)=>Object.prototype.hasOwnProperty.call(o??{},k);
const toInteger=x=>typeof x==='number'&&Number.isInteger(x)?x:
    typeof x==='string'&&/^[+-]?\d+$/.test(x.trim())?Number(x):null;
const difference=(field,approved,legacy)=>({
  field,approvedSourceValue:approved,legacyValue:legacy??null,
  state:approved===null?'SOURCE_UNRESOLVED':
    toInteger(approved)===toInteger(legacy)&&toInteger(approved)!==null?
      'MATCH':'LEGACY_VALUE_DIFFERS_OR_MISSING'
});
const init=record=>{
  const override=record.approvedDecision.fieldOverrides.find(
    x=>x.path==='/initiative'||x.path==='/skills/initiative');
  return toInteger(override?.newValue??record.originalPrintedFacts?.skills?.initiative??
    record.originalPrintedFacts?.initiative);
};
export function buildCP23Reconciliation(rootDir=root){
  const sourceBytes=fs.readFileSync(rootDir+'/scripts/domain/vehicles/vehicle-cp22-source-catalog.generated.js');
  fail(blob(sourceBytes)===expectedCatalogBlob,'CP22_SOURCE_CATALOG_DRIFT');
  fail(catalog.records.length===15&&catalog.legacyPackCandidates.length===13,'CP22_REFERENCE_CARDINALITY');
  const packs=Object.fromEntries(expectedPacks.map(spec=>{
    const file=rootDir+'/packs/'+spec.packName+'.db',bytes=fs.readFileSync(file);
    fail(blob(bytes)===spec.sourceGitBlob,'LEGACY_PACK_SOURCE_BLOB_DRIFT:'+spec.packName);
    const rows=bytes.toString('utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
    fail(rows.length===spec.documentCount,'LEGACY_PACK_DOCUMENT_COUNT_DRIFT:'+spec.packName);
    const index=new Map(rows.map(x=>[x._id,x]));
    fail(index.size===rows.length,'DUPLICATE_PACK_DOCUMENT_ID:'+spec.packName);
    return [spec.packName,{rows,index}];
  }));
  const identities=catalog.records.map((record,i)=>{
    const decision=record.approvedDecision;
    fail(decision.order===i+1&&record.sourceEntryKey===decision.sourceEntryKey&&
      decision.approvalState==='APPROVED'&&decision.physicalMountCertificateGranted===false,
      'CP21_APPROVAL_OR_ORDER_DRIFT');
    const hint=catalog.legacyPackCandidates.find(z=>z.sourceEntryKey===record.sourceEntryKey);
    const legacy=hint?packs[hint.packName]?.index.get(hint.documentId):null;
    if(hint)fail(legacy?.name===hint.name&&legacy.type==='vehicle',
      'LEGACY_PACK_CANDIDATE_IDENTITY_DRIFT:'+record.sourceEntryKey);
    const facts=record.originalPrintedFacts;
    const flatOverride=decision.fieldOverrides.find(x=>x.path==='/defenses/flatFootedReflex');
    const expected={
      initiative:init(record),
      reflexDefense:toInteger(facts.defenses?.reflex),
      flatFootedReflex:toInteger(flatOverride?.newValue??facts.defenses?.flatFootedReflex),
      sourceAttackGroupCount:record.originalAttackGroups.length
    };
    const comparison=legacy?[
      difference('initiative',expected.initiative,legacy.system?.initiative),
      difference('reflexDefense',expected.reflexDefense,legacy.system?.reflexDefense),
      difference('flatFootedReflex',expected.flatFootedReflex,legacy.system?.flatFooted)
    ]:[];
    return {
      queuePosition:i+1,decisionId:decision.decisionId,sourceEntryKey:record.sourceEntryKey,
      printedName:record.printedName,printedPage:record.printedPage,
      sourcePdfSha256:catalog.sourcePdfSha256,expected,
      candidate:hint?{
        packName:hint.packName,documentId:hint.documentId,legacyName:hint.name,
        sourcebook:legacy.system.sourcebook,page:legacy.system.page,
        stockSourceEntryKey:has(legacy.system,'stockSourceEntryKey')?legacy.system.stockSourceEntryKey:null,
        legacyAttackRowCount:legacy.system.weapons?.length??null
      }:null,
      scalarComparisons:comparison,
      attackRows:{
        publishedAttackGroupCount:record.originalAttackGroups.length,
        legacyInstalledRowCount:legacy?.system?.weapons?.length??null,
        countsEquivalent:false,
        reason:'SOURCE_ATTACK_GROUPS_DO_NOT_PROVE_INSTALLED_PHYSICAL_MOUNTS'
      },
      blockers:hint?[
        'LEGACY_DOCUMENT_HAS_NO_CANONICAL_SOURCE_BINDING',
        'PHYSICAL_GROUP_MAPPING_NOT_CERTIFIED',
        'REAL_FOUNDRY_V13_IMPORT_PROVENANCE_NOT_CERTIFIED'
      ]:[
        'NO_EXACT_LEGACY_PACK_DOCUMENT_CANDIDATE',
        'PHYSICAL_GROUP_MAPPING_NOT_CERTIFIED',
        'REAL_FOUNDRY_V13_IMPORT_PROVENANCE_NOT_CERTIFIED'
      ],
      status:hint?'REQUIRES_AUTHENTICATED_SOURCE_REBUILD':'NO_LEGACY_PACK_CANDIDATE',
      compendiumMutationAllowed:false,foundryRuntimeStockAttackTrusted:false
    };
  });
  fail(new Set(identities.map(x=>x.sourceEntryKey)).size===15,'DUPLICATE_SOURCE_KEY');
  fail(identities.filter(x=>x.candidate).length===13,'LEGACY_CANDIDATE_COUNT');
  fail(identities.filter(x=>!x.candidate).length===2,'UNMAPPED_SOURCE_COUNT');
  fail(identities.every(x=>!x.candidate||
    (x.candidate.sourcebook===''&&x.candidate.page===null&&
      x.candidate.stockSourceEntryKey===null)),'UNEXPECTED_LEGACY_SOURCE_BINDING');
  return {
    schema:'swse.vehicle.sotg.cp23.source-pack-reconciliation.v1',
    phase:'CP23-RECONCILIATION_PREFLIGHT',
    sourceCatalogBlobSha:expectedCatalogBlob,
    ownerApprovedCount:15,sourceIdentityCount:identities.length,
    legacyCandidateCount:13,unmappedSourceCount:2,reconciledSourceCount:0,
    originalVehiclePackSources:expectedPacks.map(spec=>({
      packName:spec.packName,sourcePath:'packs/'+spec.packName+'.db',
      sourceGitBlob:spec.sourceGitBlob,documentCount:spec.documentCount
    })),
    trustedPhysicalWeaponGroupsAdded:0,
    stockRuntimeAttackPermissionsAdded:0,
    legacyPacksEdited:false,foundryActorImportsExecuted:false,
    records:identities
  };
}
const expected=JSON.stringify(buildCP23Reconciliation(),null,2)+'\n';
if(process.argv.includes('--check')){
  fail(fs.readFileSync(root+'/'+dest,'utf8')===expected,'CP23_RECONCILIATION_LEDGER_DRIFT');
  console.log('PASS CP23: 15 source approvals, 13 legacy candidates, 2 absent, zero bound source packs or weapon groups');
}else if(process.argv.includes('--write')){
  fs.writeFileSync(root+'/'+dest,expected,'utf8');
  console.log('WROTE '+dest);
}else throw Error('Choose --check or --write');

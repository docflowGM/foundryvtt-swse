#!/usr/bin/env node
/**
 * CP22 deterministic compiler. Never writes actor packs or authorization.
 * The runtime reference is generated from the immutable source ledger and
 * owner-adjudicated CP21 decision manifest; a -check run rejects drift.
 */
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const dir='data/audits/vehicles/';
const origin=JSON.parse(fs.readFileSync(path.join(root,dir,'swse-phase2b-sotg-cp16-per-entry-certification-ledger.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,dir,'swse-sotg-cp21-owner-approved-adjudications.json'),'utf8'));
const sourcePath='scripts/domain/vehicles/vehicle-cp22-source-catalog.generated.js';
const candidates=[
  {
    "decisionId": "SOTG-CP21-D01",
    "sourceEntryKey": "sotg-advanced-v-19-torrent-starfighter",
    "packName": "vehicles-starfighters",
    "documentId": "0320533019f46bf9",
    "name": "Advanced V-19 Torrent Starfighter",
    "sourcebook": "",
    "page": null,
    "weaponCount": 0
  },
  {
    "decisionId": "SOTG-CP21-D02",
    "sourceEntryKey": "sotg-recusant-class-light-destroyer",
    "packName": "vehicles-capital-ships",
    "documentId": "4a12db341764d71c",
    "name": "Recusant-Class Light Destroyer",
    "sourcebook": "",
    "page": null,
    "weaponCount": 5
  },
  {
    "decisionId": "SOTG-CP21-D03",
    "sourceEntryKey": "sotg-kuat-drive-yards-pellaeon-class-star-destroyer",
    "packName": "vehicles-capital-ships",
    "documentId": "9d7f42e1fb7dcda9",
    "name": "Pellaeon-Class Star Destroyer",
    "sourcebook": "",
    "page": null,
    "weaponCount": 5
  },
  {
    "decisionId": "SOTG-CP21-D04",
    "sourceEntryKey": "sotg-immobilizer-418-interdictor-class-heavy-cruiser",
    "packName": "vehicles-capital-ships",
    "documentId": "c1728af79988eab9",
    "name": "Immobilizer 418 Interdictor-Class Heavy Cruiser",
    "sourcebook": "",
    "page": null,
    "weaponCount": 0
  },
  {
    "decisionId": "SOTG-CP21-D05",
    "sourceEntryKey": "sotg-junker-tye-wing",
    "packName": "vehicles-starfighters",
    "documentId": "6b2f0741da3cdda3",
    "name": "Junker TYE-Wing",
    "sourcebook": "",
    "page": null,
    "weaponCount": 0
  },
  {
    "decisionId": "SOTG-CP21-D06",
    "sourceEntryKey": "sotg-koensayr-manufacturing-btl-58-k-wing",
    "packName": "vehicles-starfighters",
    "documentId": "e757ca9a96c28a41",
    "name": "K-Wing Assault Starfighter",
    "sourcebook": "",
    "page": null,
    "weaponCount": 0
  },
  {
    "decisionId": "SOTG-CP21-D09",
    "sourceEntryKey": "sotg-eclipse",
    "packName": "vehicles-capital-ships",
    "documentId": "bd0c972f8a5599ab",
    "name": "Eclipse-Class Star Dreadnought",
    "sourcebook": "",
    "page": null,
    "weaponCount": 6
  },
  {
    "decisionId": "SOTG-CP21-D10",
    "sourceEntryKey": "sotg-theta-class-shuttle",
    "packName": "vehicles-space-transports",
    "documentId": "fa1f202bc57c3636",
    "name": "Theta-Class Shuttle",
    "sourcebook": "",
    "page": null,
    "weaponCount": 0
  },
  {
    "decisionId": "SOTG-CP21-D11",
    "sourceEntryKey": "sotg-sienar-fleet-systems-tie-bomber",
    "packName": "vehicles-starfighters",
    "documentId": "2ec63b561379cc09",
    "name": "TIE Bomber",
    "sourcebook": "",
    "page": null,
    "weaponCount": 0
  },
  {
    "decisionId": "SOTG-CP21-D12",
    "sourceEntryKey": "sotg-incom-t-65xj3-x-wing-starfighter",
    "packName": "vehicles-starfighters",
    "documentId": "622924c83d0c90be",
    "name": "T-65XJ3 X-Wing Starfighter",
    "sourcebook": "",
    "page": null,
    "weaponCount": 0
  },
  {
    "decisionId": "SOTG-CP21-D13",
    "sourceEntryKey": "sotg-incom-subpro-arc-170-starfighter",
    "packName": "vehicles-starfighters",
    "documentId": "a9b019928bcb59bc",
    "name": "ARC-170 Starfighter",
    "sourcebook": "",
    "page": null,
    "weaponCount": 0
  },
  {
    "decisionId": "SOTG-CP21-D14",
    "sourceEntryKey": "sotg-alliance-a-wing-starfighter",
    "packName": "vehicles-starfighters",
    "documentId": "9a8e2af942c66079",
    "name": "A-Wing Starfighter",
    "sourcebook": "",
    "page": null,
    "weaponCount": 0
  },
  {
    "decisionId": "SOTG-CP21-D15",
    "sourceEntryKey": "sotg-baudo-class-star-yacht",
    "packName": "vehicles-space-transports",
    "documentId": "fd61d4e5c62bc61e",
    "name": "Baudo-Class Star Yacht",
    "sourcebook": "",
    "page": null,
    "weaponCount": 0
  }
];
function invariant(ok,description){if(!ok)throw Error(description)}
// No network/crypto plugin dependency: read candidate source packs and ensure
// each id/name remains present, but NEVER treat the match as source authority.
const bookRecords=manifest.approvedDecisions.map((decision,index)=>{
  const record=origin.entries[decision.cp16Index];
  invariant(decision.order===index+1&&decision.approvalState==='APPROVED','Decision order/approval failed');
  invariant(record?.sourceEntryKey===decision.sourceEntryKey,'Original canonical ledger mismatch');
  invariant(decision.printedName===record.printedName,'Published name mismatch');
  invariant(decision.physicalMountCertificateGranted===false&&decision.foundryAutomatedAttackGranted===false,'Unauthorized runtime promotion');
  return {sourceEntryKey:decision.sourceEntryKey,cp16Index:decision.cp16Index,printedName:record.printedName,
    printedPage:record.printedStatblockStartPage,originalPrintedFacts:record.printedFacts,
    originalAttackGroups:record.mountAndFiringGroups,sourceFieldStates:record.fieldGroups,
    approvedDecision:decision};
});
invariant(bookRecords.length===15,'Expected fifteen approved records');
for(const packName of new Set(candidates.map(x=>x.packName))){
  const raw=fs.readFileSync(path.join(root,'packs',packName+'.db'),'utf8');
  const entries=raw.split(/\r?\n/).filter(Boolean).map(JSON.parse);
  for(const c of candidates.filter(x=>x.packName===packName)){
    const item=entries.find(v=>v._id===c.documentId);
    invariant(item?.name===c.name,'Legacy pack candidate changed');
    invariant((item?.system?.sourcebook??null)===''&&item?.system?.page===null,'Candidate became source-certified without remapping');
    invariant(item?.system?.weapons?.length===c.weaponCount,'Legacy pack mount count changed');
    invariant(c.sourceEntryKey===bookRecords[Number(c.decisionId.slice(-2))-1].sourceEntryKey,'Pack mapping key mismatch');
  }
}
invariant(candidates.length===13,'Expected thirteen warning-only pack candidates');
const data={schema:'swse.vehicle.sotg.cp22.readonly-source-catalog.v1',sourcePdfSha256:manifest.sourcePdfSha256,
  cp21ManifestSha:"98eb063d8f05c602806c708024f5108596abfd2e",cp16LedgerSha:"d08ca75b0b30e8b44896588edf3c5ce1cd335557",
  decisionCount:15,records:bookRecords,
  legacyPackCandidates:candidates.map(x=>({...x,sourceBindingVerified:false,legacyPackCandidateOnly:true}))};
const result=`/**
 * GENERATED ONLY. CP22 read-only SotG source reference compiled from the
 * immutable CP16 ledger and owner-approved CP21 adjudications.
 *
 * Rebuild: node tools/audits/vehicles/compile_sotg_cp22_reference.mjs --write
 * Verify:  node tools/audits/vehicles/compile_sotg_cp22_reference.mjs --check
 *
 * This is a published BOOK REFERENCE, not authenticated Foundry world-Actor
 * installation provenance. It must never enter the trusted stock registry.
 */
function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
export const CP22_SOTG_REFERENCE_CATALOG = deepFreeze(${JSON.stringify(data,null,2)});
`;
const target=path.join(root,sourcePath);
if(process.argv.includes('--write')){fs.writeFileSync(target,result);console.log('Generated '+sourcePath);}
else if(process.argv.includes('--check')){
  invariant(fs.readFileSync(target,'utf8')===result,'Generated catalog drifted from CP16+CP21 source. Rebuild and inspect.');
  console.log('PASS CP22: exactly one reproducible 15-ship publication catalog, 13 legacy pack hints, no production authorization');
}else{throw Error('Choose --write or --check');}

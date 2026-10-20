import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const prefix='data/audits/vehicles/';
const current=JSON.parse(readFileSync(prefix+'swse-universal-phase1d-knights-of-the-old-republic.json','utf8'));
const previous=JSON.parse(readFileSync(prefix+'swse-universal-phase1c-clone-wars.json','utf8'));
const prior=JSON.parse(readFileSync(prefix+'swse-phase2b-kotor-cp3-book-source-closure-ledger.json','utf8'));
const core=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(x=>x.sourceBook==='Knights of the Old Republic Campaign Guide');
const byKey=(a)=>a.map(x=>x.sourceEntryKey).sort();
test('1-D: 32 inherited spacecraft, seven new ground/air vehicle claims, 39 total',()=>{
 assert.equal(current.existingSpacecraft.length,32);assert.equal(current.newVehicleEntries.length,7);
 assert.equal(current.counts.inheritedSpacecraftPublicationClaims,32);
 assert.equal(current.counts.newOtherVehiclePublicationClaims,7);
 assert.equal(current.counts.allBookVehiclePublicationClaims,39);
 assert.equal(current.counts.cumulativeKnownUniversalPublicationClaims,previous.counts.cumulativeKnownUniversalPublicationClaims+7);
 assert.equal(current.mechanicsTransferredThisPhase,0);assert.equal(current.productionPackFilesChanged,false);
});
test('prior source identities and printed page assignments remain unchanged',()=>{
 assert.deepEqual(byKey(current.existingSpacecraft),byKey(core));
 assert.deepEqual(byKey(current.existingSpacecraft),byKey(prior.entries));
 for(const row of current.existingSpacecraft){
  const old=prior.entries.find(x=>x.sourceEntryKey===row.sourceEntryKey);
  assert.equal(row.printedStatblockStartPage,old.printedStatblockStartPage);
  assert.equal(row.pdfPhysicalPage,old.phase1PdfPhysicalPage);
  assert.equal(row.printedName,core.find(x=>x.sourceEntryKey===row.sourceEntryKey).name);
 }
});
test('all 39 publication entries are uniquely keyed, classified and PDF sourced',()=>{
 assert.equal(current.sourcePdfSha256,prior.sourcePdfSha256);
 const records=[...current.existingSpacecraft,...current.newVehicleEntries];
 assert.equal(new Set(records.map(x=>x.sourceBook+':'+x.sourceEntryKey)).size,39);
 for(const row of records){
  assert.equal(row.sourceBook,'Knights of the Old Republic Campaign Guide');
  assert.equal(row.provenance.sourcePdfSha256,prior.sourcePdfSha256);
  assert.ok(row.printedName&&row.printedTypeLine&&row.classification.primaryCategory);
  assert.ok(Array.isArray(row.classification.mobilityDomains)&&row.classification.mobilityDomains.length>0);
  assert.ok(Number.isInteger(row.printedStatblockStartPage));
  assert.equal(row.pdfPhysicalPage,row.printedStatblockStartPage+1);
 }
});
test('six civilian vehicles on pages 92-95, Basilisk on 203, with exact printed types',()=>{
 const rows=current.newVehicleEntries;
 assert.deepEqual(rows.map(x=>x.printedStatblockStartPage),[92,93,93,94,94,95,203]);
 for(const x of rows){
  assert.equal(x.reviewStatus,'PDF_VISUALLY_VERIFIED');
  assert.equal(x.hydrationStatus,'PHASE2_NOT_STARTED');
  assert.equal(x.existingCanonicalShip,false);
  assert.equal(x.provenance.pdfReviewMethod,'DIRECT_RENDERED_PDF_VISUAL_CHECK');
 }
 const urban=rows.find(x=>x.sourceEntryKey==='kotor-aratech-urban-navigator-speeder-bike');
 assert.equal(urban.printedTypeLine,'Large air vehicle (speeder)');
 assert.equal(urban.classification.primaryCategory,'air-speeder-bike');
 assert.deepEqual(urban.classification.mobilityDomains,['air']);
 const basilisk=rows.find(x=>x.sourceEntryKey==='kotor-basilisk-war-droid');
 assert.equal(basilisk.printedTypeLine,'Huge air vehicle (droid)');
 assert.deepEqual(basilisk.classification.mobilityDomains,['air','space']);
 assert.ok(basilisk.sourceSection.includes('Mandalorians'));
 assert.equal(basilisk.pdfPhysicalPage,204);
});
test('nonvehicle droids and vehicle modifications do not create false census entries',()=>{
 assert.ok(current.sourceIdentityPolicies.some(x=>x.subject==='SoroSuub Twin-228 cargo pod'&&x.status==='NOT_ADDITIONAL_VEHICLE'));
 assert.ok(current.sourceIdentityPolicies.some(x=>x.status==='EXCLUDE_NONVEHICLE_NPC_DROID_BLOCKS'));
 assert.ok(current.sourceIdentityPolicies.some(x=>x.subject==='Basilisk War Droid'&&x.status==='INCLUDE_AS_VEHICLE'));
 assert.equal(current.counts.newVehicleClassifications['vehicle-droid'],1);
 assert.equal(current.counts.newVehicleClassifications['ground-speeder-bike'],2);
 assert.equal(current.counts.newVehicleClassifications['landspeeder'],2);
});

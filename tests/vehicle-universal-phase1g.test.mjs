import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root='data/audits/vehicles/';
const current=JSON.parse(readFileSync(root+'swse-universal-phase1g-galaxy-at-war.json','utf8'));
const previous=JSON.parse(readFileSync(root+'swse-universal-phase1f-scum-and-villainy.json','utf8'));
const historic=JSON.parse(readFileSync(root+'swse-phase2b-galaxy-at-war-book-source-closure-ledger.json','utf8'));
const ships=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(x=>x.sourceBook==='Galaxy at War');
const sourceSha='9829bea74df5dddad946b1f5514caf1838328333979eb573f9b565334258aa4a';
const rows=[...current.existingSpacecraft,...current.newVehicleEntries];
const keys=a=>a.map(x=>x.sourceEntryKey).sort();
test('Phase 1-G adds six actual statblocks, preserving five historical ships',()=>{
 assert.equal(historic.entries.length,5);
 assert.equal(ships.length,5);
 assert.equal(current.existingSpacecraft.length,5);
 assert.equal(current.newVehicleEntries.length,6);
 assert.equal(current.counts.inheritedSpacecraftPublicationClaims,5);
 assert.equal(current.counts.newOtherVehiclePublicationClaims,6);
 assert.equal(current.counts.allBookVehiclePublicationClaims,11);
 assert.equal(current.counts.cumulativeKnownUniversalPublicationClaims,previous.counts.cumulativeKnownUniversalPublicationClaims+6);
 assert.equal(current.mechanicsTransferredThisPhase,0);
 assert.equal(current.productionPackFilesChanged,false);
});
test('historical ship keys, names, printed pages and PDF hash are unchanged',()=>{
 assert.deepEqual(keys(current.existingSpacecraft),keys(historic.entries));
 assert.deepEqual(keys(current.existingSpacecraft),keys(ships));
 assert.equal(current.sourcePdfSha256,historic.sourcePdfSha256);
 assert.equal(current.sourcePdfSha256,sourceSha);
 for(const row of current.existingSpacecraft){
  const old=historic.entries.find(x=>x.sourceEntryKey===row.sourceEntryKey);
  const canon=ships.find(x=>x.sourceEntryKey===row.sourceEntryKey);
  assert.equal(row.printedName,old.printedName);
  assert.equal(row.printedName,canon.name);
  assert.equal(row.printedStatblockStartPage,old.printedStatblockStartPage);
  assert.equal(row.pdfPhysicalPage,old.phase1PdfPhysicalPage);
  assert.equal(row.printedTypeLine,old.printedFacts.printedTypeLine);
  assert.equal(row.existingCanonicalShip,true);
 }
});
test('six PDF-verified statblocks have correct keys, names, type lines, and pages',()=>{
 const expected=[
  ['gaw-freeco-speeder','Freeco Speeder','Huge ground vehicle (speeder)',62,6],
  ['gaw-shelter-speeder','Shelter Speeder','Huge air vehicle',63,4],
  ['gaw-wlo-5-speeder-tank','WLO-5 Speeder Tank','Gargantuan ground vehicle (speeder)',63,6],
  ['gaw-drop-pod','Drop Pod','Gargantuan air vehicle',64,2],
  ['gaw-t8-loading-vehicle','T8 Loading Vehicle','Large ground vehicle (wheeled)',179,1],
  ['gaw-ground-armored-tank','Ground Armored Tank','Huge ground vehicle (speeder)',216,10]
 ];
 for(const [id,name,type,page,cl] of expected){
  const row=current.newVehicleEntries.find(x=>x.sourceEntryKey===id);
  assert.ok(row,'Missing '+id);
  assert.equal(row.printedName,name);
  assert.equal(row.printedTypeLine,type);
  assert.equal(row.printedStatblockStartPage,page);
  assert.equal(row.pdfPhysicalPage,page+1);
  assert.equal(row.provenance.printedChallengeLevel,cl);
  assert.equal(row.reviewStatus,'PDF_VISUALLY_VERIFIED');
  assert.equal(row.hydrationStatus,'PHASE2_NOT_STARTED');
  assert.equal(row.existingCanonicalShip,false);
 }
});
test('all publication entries are distinct and have source provenance and domains',()=>{
 assert.equal(rows.length,11);
 assert.equal(new Set(rows.map(x=>x.sourceBook+':'+x.sourceEntryKey)).size,11);
 for(const row of rows){
  assert.equal(row.sourceBook,'Galaxy at War');
  assert.equal(row.pdfPhysicalPage,row.printedStatblockStartPage+1);
  assert.ok(row.printedName.length>2);
  assert.ok(row.printedTypeLine.length>5);
  assert.ok(row.classification.primaryCategory);
  assert.ok(row.classification.mobilityDomains.length);
  assert.equal(row.provenance.sourcePdfSha256,sourceSha);
 }
 assert.equal(current.counts.newVehicleClassifications['repulsorlift-tank'],2);
 assert.deepEqual(current.newVehicleEntries.find(x=>x.sourceEntryKey==='gaw-drop-pod').classification.mobilityDomains,['air','orbital-descent']);
});
test('explicitly reject nonstatblock variants and inflated encounter counts',()=>{
 assert.ok(current.identityDecisions.some(x=>x.subject==='WLO-5 Speeder Tank pirate modifications'&&x.status==='EXCLUDE_NONSTATBLOCK_CONFIGURATION'));
 assert.ok(current.identityDecisions.some(x=>x.subject.includes('GAT) x4')&&x.status==='COUNT_ONE_PUBLICATION_STATBLOCK'));
 assert.ok(current.identityDecisions.some(x=>x.status==='EXCLUDE_DESIGN_AND_INSTALLATION_RULES'));
 assert.ok(current.identityDecisions.some(x=>x.status==='EXCLUDE_NONVEHICLE_ACTORS'));
 assert.ok(current.process.discoveryMethod.includes('225-page'));
});

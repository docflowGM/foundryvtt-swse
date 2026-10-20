import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root='data/audits/vehicles/';
const current=JSON.parse(readFileSync(root+'swse-universal-phase1f-scum-and-villainy.json','utf8'));
const previous=JSON.parse(readFileSync(root+'swse-universal-phase1e-force-unleashed.json','utf8'));
const historic=JSON.parse(readFileSync(root+'swse-phase2b-scum-and-villainy-book-source-closure-ledger.json','utf8'));
const amendment=JSON.parse(readFileSync(root+'swse-phase2c-cp3-318-census-overlay.json','utf8'));
const shipRows=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(r=>r.sourceBook==='Scum and Villainy');
const byKey=arr=>arr.map(x=>x.sourceEntryKey).sort();
test('1-F tracks eleven inherited ships, one existing amendment, and one new station',()=>{
 assert.equal(historic.entries.length,11);
 assert.equal(shipRows.length,11);
 assert.equal(current.existingSpacecraft.length,11);
 assert.equal(current.approvedSupplementalSpacecraft.length,1);
 assert.equal(current.newVehicleEntries.length,1);
 assert.equal(current.counts.allBookVehiclePublicationClaims,13);
 assert.equal(current.counts.newOtherVehiclePublicationClaims,1);
 assert.equal(current.counts.cumulativeKnownUniversalPublicationClaims,previous.counts.cumulativeKnownUniversalPublicationClaims+1);
 assert.equal(current.mechanicsTransferredThisPhase,0);
 assert.equal(current.productionPackFilesChanged,false);
});
test('all 11 inherited ship identities and original source pages remain unchanged',()=>{
 assert.equal(current.sourcePdfSha256,historic.sourcePdfSha256);
 assert.deepEqual(byKey(current.existingSpacecraft),byKey(historic.entries));
 assert.deepEqual(byKey(current.existingSpacecraft),byKey(shipRows));
 for(const v of current.existingSpacecraft){
  const original=historic.entries.find(x=>x.sourceEntryKey===v.sourceEntryKey);
  const currentShip=shipRows.find(x=>x.sourceEntryKey===v.sourceEntryKey);
  assert.equal(v.printedStatblockStartPage,original.printedStatblockStartPage);
  assert.equal(v.pdfPhysicalPage,original.phase1PdfPhysicalPage);
  assert.equal(v.printedName,currentShip.name);
  assert.equal(v.provenance.sourcePdfSha256,historic.sourcePdfSha256);
 }
});
test('Hornet is inherited from the approved 318 amendment, not added a second time',()=>{
 const approved=amendment.supplementalEntries.find(x=>x.sourceEntryKey==='sav-tenloss-corporation-hornet-class-interceptor');
 const [hornet]=current.approvedSupplementalSpacecraft;
 assert.ok(approved);
 assert.equal(hornet.sourceEntryKey,approved.sourceEntryKey);
 assert.equal(hornet.printedName,approved.printedName);
 assert.equal(hornet.printedStatblockStartPage,approved.printedStatblockPage);
 assert.equal(hornet.pdfPhysicalPage,approved.pdfPhysicalPage);
 assert.equal(hornet.provenance.sourcePdfSha256,approved.pdfSha256);
 assert.equal(hornet.amendmentStatus,'APPROVED_318_BASELINE_ALREADY_COUNTED');
 assert.equal(hornet.existingCanonicalShip,false);
});
test('new StarForge Station is separate, a complete printed vehicle-style statblock on p130',()=>{
 const [s]=current.newVehicleEntries;
 assert.equal(s.sourceEntryKey,'sav-starforge-station');
 assert.equal(s.printedName,'StarForge Station');
 assert.equal(s.printedTypeLine,'Colossal (station) space station');
 assert.equal(s.printedStatblockStartPage,130);
 assert.equal(s.pdfPhysicalPage,131);
 assert.equal(s.classification.primaryCategory,'space-station');
 assert.deepEqual(s.classification.mobilityDomains,['space']);
 assert.equal(s.classification.statblockActorType,'vehicle');
 assert.equal(s.provenance.printedChallengeLevel,20);
 assert.equal(s.provenance.sourcePdfSha256,historic.sourcePdfSha256);
 assert.equal(s.reviewStatus,'PDF_VISUALLY_VERIFIED');
 assert.equal(s.hydrationStatus,'PHASE2_NOT_STARTED');
 assert.ok(!current.existingSpacecraft.some(x=>x.sourceEntryKey===s.sourceEntryKey));
});
test('all thirteen source entries are unique; narrative points and droid NPCs excluded',()=>{
 const all=[...current.existingSpacecraft,...current.approvedSupplementalSpacecraft,...current.newVehicleEntries];
 assert.equal(all.length,13);
 assert.equal(new Set(all.map(x=>x.sourceBook+':'+x.sourceEntryKey)).size,13);
 for(const x of all){
  assert.equal(x.sourceBook,'Scum and Villainy');
  assert.equal(x.pdfPhysicalPage,x.printedStatblockStartPage+1);
  assert.ok(x.printedName?.length>3);
  assert.ok(x.printedTypeLine?.length>3);
  assert.ok(x.classification?.primaryCategory);
  assert.ok(x.classification?.mobilityDomains?.length>0);
  assert.equal(x.provenance.sourcePdfSha256,historic.sourcePdfSha256);
 }
 assert.ok(current.identityDecisions.some(x=>x.subject==='Point Nadir'&&x.status==='EXCLUDE_NONSTATBLOCK'));
 assert.ok(current.identityDecisions.some(x=>x.status==='EXCLUDE_DROID_NPC_STATBLOCKS'));
 assert.ok(current.identityDecisions.some(x=>x.subject==='StarForge Station versus Rakatan Star Forge'&&x.status==='DISTINCT_PUBLICATION_IDENTITY'));
 assert.ok(current.process.discoveryMethod.includes('225 physical pages'));
});

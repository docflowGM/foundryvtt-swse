import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base='data/audits/vehicles/';
const now=JSON.parse(readFileSync(base+'swse-universal-phase1c-clone-wars.json','utf8'));
const old=JSON.parse(readFileSync(base+'swse-phase2b-clone-wars-cp5-book-source-closure-ledger.json','utf8'));
const before=JSON.parse(readFileSync(base+'swse-universal-phase1b-starships-of-the-galaxy.json','utf8'));
const canonical=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(r=>r.sourceBook==='Clone Wars Campaign Guide');
test('1-C enumerates 41 inherited spacecraft plus exactly 26 other vehicles',()=>{
 assert.equal(old.entries.length,41);assert.equal(canonical.length,41);
 assert.equal(now.existingSpacecraft.length,41);assert.equal(now.newVehicleEntries.length,26);
 assert.equal(now.counts.allBookVehiclePublicationClaims,67);
 assert.equal(now.counts.cumulativeKnownUniversalPublicationClaims,before.counts.cumulativeKnownUniversalPublicationEntries+26);
 assert.deepEqual(now.existingSpacecraft.map(x=>x.sourceEntryKey).sort(),canonical.map(x=>x.sourceEntryKey).sort());
 assert.deepEqual(now.existingSpacecraft.map(x=>x.sourceEntryKey).sort(),old.entries.map(x=>x.sourceEntryKey).sort());
 assert.equal(now.mechanicsTransferredThisPhase,0);assert.equal(now.productionPackFilesChanged,false);
});
test('all 67 claims unique, classification explicit, source PDF checksum matches',()=>{
 assert.equal(now.sourcePdfSha256,old.sourcePdfSha256);
 const all=[...now.existingSpacecraft,...now.newVehicleEntries];
 assert.equal(new Set(all.map(x=>x.sourceBook+':'+x.sourceEntryKey)).size,67);
 for(const row of all){
  assert.equal(row.sourceBook,'Clone Wars Campaign Guide');
  assert.ok(row.printedName?.length>3);assert.ok(row.printedTypeLine?.length>3);
  assert.ok(row.classification.primaryCategory);
  assert.ok(row.classification.mobilityDomains.length>0);
  assert.equal(row.provenance.sourcePdfSha256,old.sourcePdfSha256);
  assert.ok(row.printedStatblockStartPage>=76&&row.printedStatblockStartPage<=221);
 }
 for(const row of now.newVehicleEntries){
  assert.equal(row.pdfPhysicalPage,row.printedStatblockStartPage+1);
  assert.equal(row.reviewStatus,'PDF_VISUALLY_VERIFIED');
  assert.equal(row.hydrationStatus,'PHASE2_NOT_STARTED');
  assert.equal(row.existingCanonicalShip,false);
 }
});
test('four distinct new-vehicle sections all covered with printed page locations',()=>{
 const s=now.newVehicleEntries;
 assert.equal(s.filter(x=>x.sourceSection==='Jedi Vehicles and Starships').length,1);
 assert.equal(s.filter(x=>x.sourceSection==='Republic Vehicles').length,12);
 assert.equal(s.filter(x=>x.sourceSection==='Confederacy Vehicles').length,11);
 assert.equal(s.filter(x=>x.sourceSection==='Kashyyyk Vehicles and Starships').length,2);
 const pages=s.map(x=>x.printedStatblockStartPage);
 assert.deepEqual(pages,[138,163,163,164,165,165,166,167,167,168,168,169,170,198,199,200,200,201,201,202,202,202,203,203,219,220]);
});
test('separately printed walking/wheeled variants; single published SPHA record',()=>{
 const x=now.newVehicleEntries;
 const wheels=x.filter(y=>y.classification.primaryCategory==='wheel-bike');
 assert.equal(wheels.length,2);
 for(const w of wheels)assert.deepEqual(w.classification.mobilityDomains,['ground-wheeled','ground-walking']);
 assert.equal(x.filter(y=>y.sourceEntryKey==='cw-self-propelled-heavy-artillery').length,1);
 assert.equal(x.find(y=>y.sourceEntryKey==='cw-manta-droid-subfighter').printedTypeLine,'Huge water vehicle (speeder)');
 assert.equal(x.find(y=>y.sourceEntryKey==='cw-raddaugh-gnasp-fluttercraft').classification.primaryCategory,'ornithopter');
 assert.ok(!x.some(y=>/Octuptarra Combat Tri-Droid|Ultra Droideka/.test(y.printedName)));
});
test('source-provenance anomalies for inherited inverted printed pages preserved',()=>{
 const s=now.existingSpacecraft.filter(x=>/Sheathipede|Punworcca/.test(x.printedName));
 assert.equal(s.length,2);
 assert.ok(s.every(x=>x.provenance.sourceEvidence?.printedPageMismatch||x.provenance.sourceEvidence?.phase1PrintedPageDiscrepancy));
 assert.equal(now.sourceIdentityPolicies.length,8);
});

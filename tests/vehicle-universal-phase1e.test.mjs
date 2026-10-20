import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base='data/audits/vehicles/';
const current=JSON.parse(readFileSync(base+'swse-universal-phase1e-force-unleashed.json','utf8'));
const prev=JSON.parse(readFileSync(base+'swse-universal-phase1d-knights-of-the-old-republic.json','utf8'));
const prior=JSON.parse(readFileSync(base+'swse-phase2b-force-unleashed-book-source-closure-ledger.json','utf8'));
const old=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(x=>x.sourceBook==='Force Unleashed Campaign Guide');
const sortedKeys=rows=>rows.map(x=>x.sourceEntryKey).sort();
test('1-E has 19 inherited ships and 15 new other vehicles (34 total)',()=>{
 assert.equal(prior.entries.length,19);
 assert.equal(old.length,19);
 assert.equal(current.counts.inheritedSpacecraftPublicationClaims,19);
 assert.equal(current.counts.newOtherVehiclePublicationClaims,15);
 assert.equal(current.counts.allBookVehiclePublicationClaims,34);
 assert.equal(current.existingSpacecraft.length,19);
 assert.equal(current.newVehicleEntries.length,15);
 assert.equal(current.counts.cumulativeKnownUniversalPublicationClaims,prev.counts.cumulativeKnownUniversalPublicationClaims+15);
 assert.equal(current.mechanicsTransferredThisPhase,0);
 assert.equal(current.productionPackFilesChanged,false);
});
test('all inherited publication identities, printed pages and PDF provenance remain unchanged',()=>{
 assert.deepEqual(sortedKeys(current.existingSpacecraft),sortedKeys(old));
 assert.deepEqual(sortedKeys(current.existingSpacecraft),sortedKeys(prior.entries));
 assert.equal(current.sourcePdfSha256,prior.sourcePdfSha256);
 for(const rec of current.existingSpacecraft){
  const claim=old.find(x=>x.sourceEntryKey===rec.sourceEntryKey);
  const original=prior.entries.find(x=>x.sourceEntryKey===rec.sourceEntryKey);
  assert.equal(claim.name,rec.printedName);
  assert.equal(claim.printedPage,rec.printedStatblockStartPage);
  assert.equal(original.phase1PdfPhysicalPage,rec.pdfPhysicalPage);
  assert.equal(rec.provenance.sourcePdfSha256,prior.sourcePdfSha256);
 }
});
test('all 34 vehicle publication records unique and source located',()=>{
 const all=[...current.existingSpacecraft,...current.newVehicleEntries];
 assert.equal(new Set(all.map(x=>x.sourceBook+':'+x.sourceEntryKey)).size,34);
 for(const x of all){
  assert.equal(x.sourceBook,'Force Unleashed Campaign Guide');
  assert.equal(x.pdfPhysicalPage,x.printedStatblockStartPage+1);
  assert.ok(x.printedName?.trim());
  assert.ok(x.printedTypeLine?.trim());
  assert.ok(x.classification?.primaryCategory);
  assert.ok(x.classification?.mobilityDomains?.length);
  assert.equal(x.provenance.sourcePdfSha256,prior.sourcePdfSha256);
 }
 for(const x of current.newVehicleEntries){
  assert.equal(x.reviewStatus,'PDF_VISUALLY_VERIFIED');
  assert.equal(x.hydrationStatus,'PHASE2_NOT_STARTED');
  assert.equal(x.existingCanonicalShip,false);
 }
});
test('full book sweep includes 7 chapter vehicles, 2 adventure stats and 6 imperial statblocks',()=>{
 const rows=current.newVehicleEntries;
 assert.equal(rows.filter(x=>x.sourceSection.startsWith('Chapter VII —')).length,7);
 assert.equal(rows.filter(x=>x.sourceSection.startsWith('Chapter VIII —')).length,2);
 assert.equal(rows.filter(x=>x.sourceSection.startsWith('Chapter X —')).length,6);
 assert.deepEqual(rows.map(x=>x.printedStatblockStartPage),[110,110,111,112,112,113,113,142,142,200,201,201,202,202,203]);
 const x34=rows.find(x=>x.sourceEntryKey==='fucg-modified-sorosuub-x-34-speeder-escort');
 const bike=rows.find(x=>x.sourceEntryKey==='fucg-aratech-74-z-speeder-bike');
 assert.equal(x34.printedStatblockStartPage,142);
 assert.equal(bike.printedStatblockStartPage,142);
});
test('special classifications, named variants and source-only chassis are handled consistently',()=>{
 const rows=current.newVehicleEntries,find=k=>rows.find(x=>x.sourceEntryKey===k);
 assert.equal(find('fucg-armored-groundcar').classification.primaryCategory,'wheeled-groundcar');
 assert.equal(find('fucg-flare-s-swoop').printedTypeLine,'Large air vehicle (speeder)');
 assert.equal(find('fucg-zephyr-g-swoop').printedTypeLine,'Large ground vehicle (speeder)');
 assert.equal(find('fucg-a5-juggernaut').printedTypeLine,'Colossal wheeled ground vehicle');
 assert.equal(find('fucg-at-kt').classification.primaryCategory,'walker');
 assert.equal(find('fucg-at-ct').classification.primaryCategory,'walker');
 assert.equal(find('fucg-mobile-command-base').classification.primaryCategory,'tracked-vehicle');
 assert.equal(find('fucg-tx-130t-fighter-tank').printedStatblockStartPage,203);
 assert.ok(current.sourceIdentityPolicies.some(x=>x.subject==='Arrow-23 civilian model'&&x.status==='DO_NOT_SPLIT_UNPRINTED_VARIANT'));
 assert.ok(current.sourceIdentityPolicies.some(x=>x.subject==='Speeder trucks in convoy'&&x.status==='NO_NEW_STATBLOCK'));
});

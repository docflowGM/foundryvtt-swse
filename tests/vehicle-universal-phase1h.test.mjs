import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root='data/audits/vehicles/';
const current=JSON.parse(readFileSync(root+'swse-universal-phase1h-galaxy-of-intrigue.json','utf8'));
const previous=JSON.parse(readFileSync(root+'swse-universal-phase1g-galaxy-at-war.json','utf8'));
const historic=JSON.parse(readFileSync(root+'swse-phase2b-galaxy-of-intrigue-book-source-closure-ledger.json','utf8'));
const ships=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(r=>r.sourceBook==='Galaxy of Intrigue');
const sourceSha='c43531ac33c6e6bd84c18ff8e26a472dc8ef95ebb46948beb3beb29be384da21';
const rows=[...current.existingSpacecraft,...current.newVehicleEntries];
const keys=arr=>arr.map(x=>x.sourceEntryKey).sort();
test('1-H retains six inherited ships and adds two ground vehicles',()=>{
 assert.equal(historic.entries.length,6);
 assert.equal(ships.length,6);
 assert.equal(current.existingSpacecraft.length,6);
 assert.equal(current.newVehicleEntries.length,2);
 assert.equal(current.counts.inheritedSpacecraftPublicationClaims,6);
 assert.equal(current.counts.newOtherVehiclePublicationClaims,2);
 assert.equal(current.counts.allBookVehiclePublicationClaims,8);
 assert.equal(current.counts.cumulativeKnownUniversalPublicationClaims,previous.counts.cumulativeKnownUniversalPublicationClaims+2);
 assert.equal(current.mechanicsTransferredThisPhase,0);
 assert.equal(current.productionPackFilesChanged,false);
});
test('historical spacecraft keys, names, source pages, and PDF hash remain preserved',()=>{
 assert.equal(current.sourcePdfSha256,sourceSha);
 assert.equal(current.sourcePdfSha256,historic.sourcePdfSha256);
 assert.deepEqual(keys(current.existingSpacecraft),keys(historic.entries));
 assert.deepEqual(keys(current.existingSpacecraft),keys(ships));
 for(const x of current.existingSpacecraft){
  const old=historic.entries.find(v=>v.sourceEntryKey===x.sourceEntryKey);
  const canonical=ships.find(v=>v.sourceEntryKey===x.sourceEntryKey);
  assert.equal(x.printedName,old.printedName);
  assert.equal(x.printedName,canonical.name);
  assert.equal(x.printedTypeLine,old.printedFacts.printedTypeLine);
  assert.equal(x.printedStatblockStartPage,old.printedStatblockStartPage);
  assert.equal(x.pdfPhysicalPage,old.phase1PdfPhysicalPage);
  assert.equal(x.existingCanonicalShip,true);
 }
});
test('two printed-page-71 landspeeders retain distinct identity and vehicle type',()=>{
 const expected=[
  ['goi-corona-limited-luxury-groundspeeder','Corona Limited Luxury Groundspeeder','Huge ground vehicle (speeder)',4],
  ['goi-sorosuub-jg-8-luxury-landspeeder','SoroSuub JG-8 Luxury Landspeeder','Large ground vehicle (speeder)',2]
 ];
 for(const [key,name,type,cl] of expected){
  const x=current.newVehicleEntries.find(r=>r.sourceEntryKey===key);
  assert.ok(x,'Missing '+key);
  assert.equal(x.printedName,name);
  assert.equal(x.printedTypeLine,type);
  assert.equal(x.printedStatblockStartPage,71);
  assert.equal(x.pdfPhysicalPage,72);
  assert.equal(x.classification.primaryCategory,'landspeeder');
  assert.deepEqual(x.classification.mobilityDomains,['ground','repulsorlift']);
  assert.equal(x.provenance.printedChallengeLevel,cl);
  assert.equal(x.reviewStatus,'PDF_VISUALLY_VERIFIED');
  assert.equal(x.existingCanonicalShip,false);
  assert.equal(x.hydrationStatus,'PHASE2_NOT_STARTED');
 }
});
test('publication records are unique, typed, and source-proven',()=>{
 assert.equal(rows.length,8);
 assert.equal(new Set(rows.map(x=>x.sourceBook+':'+x.sourceEntryKey)).size,8);
 for(const row of rows){
  assert.equal(row.sourceBook,'Galaxy of Intrigue');
  assert.equal(row.pdfPhysicalPage,row.printedStatblockStartPage+1);
  assert.ok(row.printedName.length>4);
  assert.ok(row.printedTypeLine.length>4);
  assert.ok(row.classification.primaryCategory);
  assert.ok(row.classification.mobilityDomains.length>0);
  assert.equal(row.provenance.sourcePdfSha256,sourceSha);
 }
 assert.equal(current.counts.newVehicleClassifications.landspeeder,2);
});
test('same-book cosmetic variants, external vehicle referrals, droid actors excluded',()=>{
 assert.ok(current.identityDecisions.some(x=>x.subject==='Corona Limited 500 colors'&&x.status==='EXCLUDE_NONSTATBLOCK_COSMETIC_VARIANTS'));
 assert.ok(current.identityDecisions.some(x=>x.subject==='Modified Sienar Fleet Systems Lambda-class Shuttle'&&x.status==='PRESERVE_INHERITED_ADVENTURE_SHIP'));
 assert.ok(current.identityDecisions.some(x=>x.status==='EXCLUDE_EXTERNAL_STATS_REFERENCE'));
 assert.ok(current.identityDecisions.some(x=>x.status==='EXCLUDE_NONVEHICLE_DROID_ACTORS'));
 assert.ok(current.process.discoveryMethod.includes('226 physical'));
});

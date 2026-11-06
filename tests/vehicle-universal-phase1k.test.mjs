import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base='data/audits/vehicles/';
const current=JSON.parse(readFileSync(base+'swse-universal-phase1k-rebellion-era-campaign-guide.json','utf8'));
const previous=JSON.parse(readFileSync(base+'swse-universal-phase1j-legacy-era-campaign-guide.json','utf8'));
const historic=JSON.parse(readFileSync(base+'swse-phase2b-rebellion-era-cp3-book-source-closure-ledger.json','utf8'));
const ships=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(x=>x.sourceBook==='Rebellion Era Campaign Guide');
const sha='60248fe2cb17e40c3245b28e99722ac858b2762cb21560170058ceeb30d8fee8';
const all=[...current.existingSpacecraft,...current.newVehicleEntries];
const keys=arr=>arr.map(x=>x.sourceEntryKey).sort();
test('Phase 1-K totals: 35 old, 18 new, 53 source identities, running 411',()=>{
 assert.equal(historic.entries.length,35);
 assert.equal(ships.length,35);
 assert.equal(current.existingSpacecraft.length,35);
 assert.equal(current.newVehicleEntries.length,18);
 assert.equal(current.counts.inheritedSpacecraftPublicationClaims,35);
 assert.equal(current.counts.newOtherVehiclePublicationClaims,18);
 assert.equal(current.counts.allBookVehiclePublicationClaims,53);
 assert.equal(current.counts.cumulativeKnownUniversalPublicationClaims,previous.counts.cumulativeKnownUniversalPublicationClaims+18);
 assert.deepEqual(current.counts.newVehicleClassifications,{'ground-speeder':9,airspeeder:2,'tracked-vehicle':4,walker:2,'aerial-artillery':1});
 assert.equal(current.mechanicsTransferredThisPhase,0);
 assert.equal(current.productionPackFilesChanged,false);
});
test('all 35 historical ships preserve printed identity, type, page and primary PDF SHA',()=>{
 assert.equal(current.sourcePdfSha256,sha);
 assert.equal(historic.sourcePdfSha256,sha);
 assert.deepEqual(keys(current.existingSpacecraft),keys(historic.entries));
 assert.deepEqual(keys(current.existingSpacecraft),keys(ships));
 for(const e of current.existingSpacecraft){
  const old=historic.entries.find(x=>x.sourceEntryKey===e.sourceEntryKey);
  const ship=ships.find(x=>x.sourceEntryKey===e.sourceEntryKey);
  assert.ok(old&&ship);
  assert.equal(e.printedName,old.printedName);
  assert.equal(e.printedName,ship.name);
  assert.equal(e.printedTypeLine,old.printedFacts.type);
  assert.equal(e.printedTypeLine,ship.printedFacts.type);
  assert.equal(e.printedStatblockStartPage,old.printedStatblockStartPage);
  assert.equal(e.printedStatblockStartPage,ship.printedPage);
  assert.equal(e.pdfPhysicalPage,old.phase1PdfPhysicalPage);
  assert.equal(e.existingCanonicalShip,true);
 }
});
test('18 new source statblocks preserve exact names, CL and printed pages',()=>{
 const expected=[
 ['Bantha-II Cargo Skiff',60,3,'Huge ground vehicle (speeder)'],
 ['Storm IV Twin-Pod Cloud Car',61,6,'Gargantuan air vehicle (airspeeder)'],
 ['Talon I Combat Cloud Car',61,7,'Gargantuan air vehicle (airspeeder)'],
 ['9000 Z004 Landspeeder',62,2,'Large ground vehicle (speeder)'],
 ['Air-2 Swoop',62,2,'Large ground vehicle (speeder)'],
 ['MPTL-2a Mobile Proton Torpedo Launcher',110,8,'Gargantuan ground vehicle (tracked)'],
 ['Gallofree HTT-26 Heavy Troop Transport',111,8,'Gargantuan ground vehicle (speeder)'],
 ['Ultra-Light Assault Vehicle (ULAV)',111,5,'Huge ground vehicle (speeder)'],
 ['Mekuun Heavy Tracker',112,8,'Colossal ground vehicle (speeder)'],
 ['T2-B Repulsor Tank',112,7,'Huge ground vehicle (speeder)'],
 ['T4-B Heavy Tank',113,12,'Gargantuan ground vehicle (tracked)'],
 ['AT-AA Anti-Aircraft Platform',131,10,'Colossal ground vehicle (walker)'],
 ['AT-PT All-Terrain Personal Transport',132,6,'Large ground vehicle (walker)'],
 ['Lancet Aerial Artillery',133,12,'Gargantuan air vehicle'],
 ['TIE ap-1 Mauler',135,7,'Huge ground vehicle (tracked)'],
 ['TIE Crawler',135,6,'Huge ground vehicle (tracked)'],
 ['Canderous-class Assault Tank',153,10,'Gargantuan ground vehicle (speeder)'],
 ['F9-TZ Transport',154,8,'Gargantuan ground vehicle (speeder)']
 ];
 assert.equal(expected.length,18);
 for(const [name,page,cl,type] of expected){
  const e=current.newVehicleEntries.find(x=>x.printedName===name);
  assert.ok(e,'Missing '+name);
  assert.equal(e.printedTypeLine,type);
  assert.equal(e.printedStatblockStartPage,page);
  assert.equal(e.pdfPhysicalPage,page+1);
  assert.equal(e.provenance.printedChallengeLevel,cl);
  assert.equal(e.reviewStatus,'PDF_VISUALLY_VERIFIED');
  assert.equal(e.existingCanonicalShip,false);
  assert.equal(e.hydrationStatus,'PHASE2_NOT_STARTED');
 }
});
test('all 53 identities are distinct with primary-source provenance and normalized category',()=>{
 assert.equal(all.length,53);
 assert.equal(new Set(all.map(x=>x.sourceBook+':'+x.sourceEntryKey)).size,53);
 for(const e of all){
  assert.equal(e.sourceBook,'Rebellion Era Campaign Guide');
  assert.equal(e.pdfPhysicalPage,e.printedStatblockStartPage+1);
  assert.equal(e.provenance.sourcePdfSha256,sha);
  assert.ok(e.classification.primaryCategory);
  assert.ok(e.classification.mobilityDomains.length>0);
 }
 assert.equal(current.process.entirePdfPageCount,161);
 assert.equal(current.process.primaryPdfPagesConfirmed.length,13);
});
test('OCR ambiguities and independent TIE crawler correctly resolved from printed PDF',()=>{
 const [mauler,crawler]=['TIE ap-1 Mauler','TIE Crawler'].map(name=>current.newVehicleEntries.find(x=>x.printedName===name));
 assert.ok(mauler&&crawler);
 assert.notEqual(mauler.sourceEntryKey,crawler.sourceEntryKey);
 assert.equal(mauler.provenance.printedChallengeLevel,7);
 assert.equal(crawler.provenance.printedChallengeLevel,6);
 assert.equal(mauler.printedStatblockStartPage,135);
 assert.equal(crawler.printedStatblockStartPage,135);
 assert.ok(current.identityDecisions.some(x=>x.status==='PRESERVE_THREE_DISTINCT_SOURCE_IDENTITIES'));
 assert.ok(current.identityDecisions.some(x=>x.status==='PRESERVE_PRINTED_AIR_VEHICLE_AND_CL12'));
});
test('nonstatblock variants, droid actors, and configuration modes fail closed',()=>{
 for(const code of ['EXCLUDE_NARRATIVE_ONLY_VARIANTS','EXCLUDE_CONFIGURATION_AS_NEW_VEHICLE','EXCLUDE_EXTERNAL_REFERENCES_AND_UNSTATTED_CARRIED_CRAFT','EXCLUDE_DROID_ACTOR_NOT_VEHICLE','EXCLUDE_DROID_ACTORS','EXCLUDE_NONINDEPENDENT_REFERENCES']){
  assert.ok(current.identityDecisions.some(x=>x.status===code),'Missing '+code);
 }
 assert.equal(current.process.mechanicalTranscriptionNotAuthorizedThisPhase,true);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root='data/audits/vehicles/';
const now=JSON.parse(readFileSync(root+'swse-universal-phase1j-legacy-era-campaign-guide.json','utf8'));
const previous=JSON.parse(readFileSync(root+'swse-universal-phase1i-jedi-academy-training-manual.json','utf8'));
const historical=JSON.parse(readFileSync(root+'swse-phase2b-legacy-era-cp4-book-source-closure-ledger.json','utf8'));
const ships=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(x=>x.sourceBook==='Legacy Era Campaign Guide');
const hash='344d172e21daa7fdb3e0b032671e6833122f95d1175cf943bb1bb4a8110c561d';
const rows=[...now.existingSpacecraft,...now.newVehicleEntries];
const sortedKeys=a=>a.map(x=>x.sourceEntryKey).sort();

test('1-J reconciles all 39 inherited ships plus ten independent vehicles',()=>{
 assert.equal(historical.entries.length,39);
 assert.equal(ships.length,39);
 assert.equal(now.existingSpacecraft.length,39);
 assert.equal(now.newVehicleEntries.length,10);
 assert.equal(now.counts.inheritedSpacecraftPublicationClaims,39);
 assert.equal(now.counts.newOtherVehiclePublicationClaims,10);
 assert.equal(now.counts.allBookVehiclePublicationClaims,49);
 assert.equal(now.counts.cumulativeKnownUniversalPublicationClaims,previous.counts.cumulativeKnownUniversalPublicationClaims+10);
 assert.deepEqual(now.counts.newVehicleClassifications,{'speeder-bike':3,'airspeeder':2,walker:2,'space-station':3});
 assert.equal(now.mechanicsTransferredThisPhase,0);
 assert.equal(now.productionPackFilesChanged,false);
});
test('all inherited spacecraft retain exact canonical keys, printed names, types, pages and source hash',()=>{
 assert.equal(now.sourcePdfSha256,hash);
 assert.equal(historical.sourcePdfSha256,hash);
 assert.deepEqual(sortedKeys(now.existingSpacecraft),sortedKeys(historical.entries));
 assert.deepEqual(sortedKeys(now.existingSpacecraft),sortedKeys(ships));
 for(const entry of now.existingSpacecraft){
  const old=historical.entries.find(x=>x.sourceEntryKey===entry.sourceEntryKey);
  const ship=ships.find(x=>x.sourceEntryKey===entry.sourceEntryKey);
  assert.ok(old && ship);
  assert.equal(entry.printedName,old.printedName);
  assert.equal(entry.printedName,ship.name);
  assert.equal(entry.printedTypeLine,old.printedFacts.type);
  assert.equal(entry.printedTypeLine,ship.printedFacts.type);
  assert.equal(entry.printedStatblockStartPage,old.printedStatblockStartPage);
  assert.equal(entry.printedStatblockStartPage,ship.printedPage);
  assert.equal(entry.pdfPhysicalPage,old.phase1PdfPhysicalPage);
  assert.equal(entry.existingCanonicalShip,true);
 }
});
test('ten new models have exact independently printed names, vehicle types, page and CL',()=>{
 const expected=[
 ['le-model-67-shrieker-speeder-bike','Model 67 Shrieker Speeder Bike','Large ground vehicle (speeder)',80,6,'speeder-bike'],
 ['le-quickfire-speeder-bike','QuickFire Speeder Bike','Large ground vehicle (speeder)',81,7,'speeder-bike'],
 ['le-gpe-3300-airspeeder','GPE-3300 Airspeeder','Huge air vehicle (airspeeder)',81,6,'airspeeder'],
 ['le-veltiss-2-airspeeder','Veltiss-2 Airspeeder','Large air vehicle (airspeeder)',82,6,'airspeeder'],
 ['le-golan-viii-space-defense-platform','Golan VIII Space Defense Platform','Colossal (station) space station',152,25,'space-station'],
 ['le-rendili-star-drive-mobile-spacedock-220','Rendili Star Drive Mobile Spacedock 220','Colossal (station) space station',153,20,'space-station'],
 ['le-kybuck-speeder-bike','Kybuck Speeder Bike','Large ground vehicle (speeder)',184,5,'speeder-bike'],
 ['le-all-terrain-riot-control-transport-at-rct','All Terrain Riot Control Transport (AT-RCT)','Huge ground vehicle (walker)',184,8,'walker'],
 ['le-all-terrain-armored-heavy-transport-at-aht','All Terrain Armored Heavy Transport (AT-AHT)','Colossal ground vehicle (walker)',185,14,'walker'],
 ['le-the-wheel','The Wheel','Colossal (station) space station',205,19,'space-station']
 ];
 assert.equal(expected.length,10);
 for(const [key,name,type,page,cl,category] of expected){
  const e=now.newVehicleEntries.find(x=>x.sourceEntryKey===key);
  assert.ok(e,'Missing '+key);
  assert.equal(e.printedName,name);
  assert.equal(e.printedTypeLine,type);
  assert.equal(e.printedStatblockStartPage,page);
  assert.equal(e.pdfPhysicalPage,page+1);
  assert.equal(e.provenance.printedChallengeLevel,cl);
  assert.equal(e.classification.primaryCategory,category);
  assert.equal(e.existingCanonicalShip,false);
  assert.equal(e.reviewStatus,'PDF_VISUALLY_VERIFIED');
  assert.equal(e.hydrationStatus,'PHASE2_NOT_STARTED');
 }
});
test('all 49 records uniquely map to correct printed/source PDF identities',()=>{
 assert.equal(rows.length,49);
 assert.equal(new Set(rows.map(x=>x.sourceBook+':'+x.sourceEntryKey)).size,49);
 for(const e of rows){
  assert.equal(e.sourceBook,'Legacy Era Campaign Guide');
  assert.equal(e.pdfPhysicalPage,e.printedStatblockStartPage+1);
  assert.ok(e.printedName.length>2);
  assert.ok(e.printedTypeLine.length>4);
  assert.ok(e.classification.primaryCategory);
  assert.ok(e.classification.mobilityDomains.length);
  assert.equal(e.provenance.sourcePdfSha256,hash);
 }
 assert.equal(now.process.entirePdfPageCount,225);
 assert.ok(now.process.primaryPdfPagesConfirmed.includes(205));
});
test('station mobility differences preserve stationary Wheel and mobile combat stations',()=>{
 const stationRows=now.newVehicleEntries.filter(x=>x.classification.primaryCategory==='space-station');
 assert.equal(stationRows.length,3);
 assert.deepEqual(new Set(stationRows.map(x=>x.printedName)),new Set(['The Wheel','Golan VIII Space Defense Platform','Rendili Star Drive Mobile Spacedock 220']));
 const wheel=stationRows.find(x=>x.printedName==='The Wheel');
 assert.equal(wheel.classification.stationMobility,'stationary');
 assert.match(wheel.provenance.printedMovementObservation,/Fly 0/);
 for(const s of stationRows.filter(x=>x!==wheel))assert.match(s.classification.stationMobility,/hyperdrive/);
 assert.ok(now.identityDecisions.some(x=>x.status==='PRESERVE_NONMOBILE_STATION_AS_VEHICLE_RECORD'));
 assert.ok(now.identityDecisions.some(x=>x.status==='PRESERVE_MOBILE_STATIONS_AS_STATIONS'));
});
test('exclude narrative vessel references, carried craft, and legacy vehicle templates',()=>{
 for(const status of ['EXCLUDE_UNSTATTED_CARRIED_CRAFT','EXCLUDE_REFERENCES_WITHOUT_INDEPENDENT_STATBLOCK','EXCLUDE_TEMPLATES_NOT_INDEPENDENT_MODELS','EXCLUDE_VEHICLE_BUILD_RULES_NOT_STATBLOCKS','EXCLUDE_IMAGE_OR_NARRATIVE_ONLY']){
  assert.ok(now.identityDecisions.some(x=>x.status===status),'Missing exclusion '+status);
 }
 assert.equal(now.process.mechanicalTranscriptionNotAuthorizedThisPhase,true);
});

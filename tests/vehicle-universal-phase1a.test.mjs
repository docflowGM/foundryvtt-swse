import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const ledger=JSON.parse(readFileSync('data/audits/vehicles/swse-universal-phase1a-core-rulebook.json','utf8'));
const ships=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(r=>r.sourceBook==='Core Rulebook');
const old=JSON.parse(readFileSync('data/audits/vehicles/swse-phase2b-core-rulebook-book-source-closure-ledger.json','utf8'));
test('Core full vehicle enumeration retains 10 ship identities and adds 7 nonship statblocks',()=>{
 assert.equal(ledger.counts.existingShipPublicationEntries,10);
 assert.equal(ledger.counts.newGroundOrAirVehicleEntries,7);
 assert.equal(ledger.counts.allCoreVehicleStatblockEntries,17);
 assert.equal(ships.length,10);assert.equal(old.entries.length,10);
 const actualShipKeys=ships.map(r=>r.sourceEntryKey).sort();
 const inherited=ledger.existingStarships.map(r=>r.sourceEntryKey).sort();
 assert.deepEqual(inherited,actualShipKeys);
 assert.deepEqual(inherited,old.entries.map(r=>r.sourceEntryKey).sort());
 assert.equal(ledger.mechanicalStatsTranscribedInThisPhase,0);
});
test('provenance and physical page match exact primary PDF fingerprint',()=>{
 assert.equal(ledger.sourcePdfSha256,old.sourcePdfSha256);
 const rows=[...ledger.existingStarships,...ledger.groundAndAirVehicles];
 assert.equal(rows.length,17);
 assert.equal(new Set(rows.map(r=>r.sourceEntryKey)).size,17);
 for(const row of rows){
  assert.equal(row.sourceBook,'Core Rulebook');
  assert.ok(row.printedStatblockStartPage>=175&&row.printedStatblockStartPage<=183);
  assert.equal(row.pdfPhysicalPage,row.printedStatblockStartPage+1);
  assert.ok(row.printedName?.trim());
  assert.ok(row.classification?.primaryCategory);
  assert.ok(row.classification?.mobilityDomain);
  assert.equal(row.provenance.sourcePdfSha256,old.sourcePdfSha256);
 }
});
test('seven new independent vehicle claims: 2 walkers, 3 speeders/tanks, 2 airspeeders',()=>{
 const rows=ledger.groundAndAirVehicles;
 // GitHub's rolling validation uses Node 20; Object.groupBy is newer.
 // Count the original Phase 1A categories without changing the source audit.
 const tally=rows.reduce((groups,row)=>{
  const key=row.classification.primaryCategory;
  (groups[key]??=[]).push(row);
  return groups;
 },Object.create(null));
 assert.equal(tally.walker.length,2);
 assert.equal(tally.speeder.length,1);
 assert.equal(tally['speeder-bike'].length,1);
 assert.equal(tally['repulsorlift-tank'].length,1);
 assert.equal(tally.airspeeder.length,2);
 assert.ok(rows.every(r=>r.existingCanonicalShip===false&&r.hydrationStatus==='PHASE2_NOT_STARTED'));
 assert.deepEqual(rows.map(r=>r.printedStatblockStartPage),[175,175,176,176,176,177,177]);
});
test('hybrid Vulture fighter/walker is counted only as an inherited ship',()=>{
 const v=ledger.existingStarships.filter(x=>x.sourceEntryKey==='core-vulture-class-droid-starfighter');
 assert.equal(v.length,1);
 assert.equal(v[0].classification.mobilityDomain,'space-and-ground-walker');
 assert.ok(!ledger.groundAndAirVehicles.some(x=>x.sourceEntryKey==='core-vulture-class-droid-starfighter'));
});

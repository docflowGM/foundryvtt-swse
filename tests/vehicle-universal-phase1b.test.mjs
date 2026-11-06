import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ledger=JSON.parse(readFileSync('data/audits/vehicles/swse-universal-phase1b-starships-of-the-galaxy.json','utf8'));
const ships=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse)
  .filter(r=>r.sourceBook==='Starships of the Galaxy');
const old=JSON.parse(readFileSync('data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json','utf8'));

test('SotG Phase1B inherits 104 source reviewed starships unchanged and adds 1 escape craft',()=>{
 assert.equal(ledger.counts.existingShipPublicationEntries,104);
 assert.equal(ledger.counts.newVehicleEntries,1);
 assert.equal(ledger.counts.allBookVehicleStatblockEntries,105);
 assert.equal(ships.length,104);
 assert.equal(old.entries.length,104);
 assert.equal(ledger.mechanicsTransferredThisPhase,0);
 assert.equal(ledger.productionPackFilesChanged,false);
 assert.deepEqual(ledger.existingStarships.map(x=>x.sourceEntryKey).sort(),ships.map(x=>x.sourceEntryKey).sort());
 assert.deepEqual(ledger.existingStarships.map(x=>x.sourceEntryKey).sort(),old.entries.map(x=>x.sourceEntryKey).sort());
});

test('PDF provenance and identity are complete and collision-free',()=>{
 assert.equal(ledger.sourcePdfSha256,old.sourcePdfSha256);
 const rows=[...ledger.existingStarships,...ledger.newVehicleEntries];
 assert.equal(rows.length,105);
 assert.equal(new Set(rows.map(x=>x.sourceEntryKey)).size,105);
 for (const row of rows){
  assert.equal(row.sourceBook,'Starships of the Galaxy');
  assert.equal(row.pdfPhysicalPage,row.printedStatblockStartPage+1);
  assert.equal(row.provenance.sourcePdfSha256,old.sourcePdfSha256);
  assert.ok(row.printedName?.trim());
  assert.ok(row.printedTypeLine?.trim());
  assert.ok(row.classification.primaryCategory);
  assert.ok(row.classification.mobilityDomains.length>=1);
 }
});

test('Escape Pod is an actual printed independent statblock on p50',()=>{
 const [escape]=ledger.newVehicleEntries;
 assert.equal(escape.sourceEntryKey,'sotg-escape-pod');
 assert.equal(escape.printedName,'Escape Pod');
 assert.equal(escape.printedTypeLine,'Huge starfighter');
 assert.equal(escape.printedStatblockStartPage,50);
 assert.equal(escape.pdfPhysicalPage,51);
 assert.equal(escape.classification.primaryCategory,'escape-craft');
 assert.equal(escape.classification.printedCategory,'starfighter');
 assert.equal(escape.existingCanonicalShip,false);
 assert.equal(escape.hydrationStatus,'PHASE2_NOT_STARTED');
 assert.equal(escape.provenance.pdfVisualCheck,'RENDERED_PDF_PHYSICAL_PAGE_51_CONFIRMED');
 assert.equal(ledger.candidateDispositions.filter(x=>x.status==='ADD_NEW_PUBLISHED_VEHICLE_STATBLOCK').length,1);
});

test('existing Vulture hybrid and four station vessels are classified once',()=>{
 const hybrid=ledger.existingStarships.filter(x=>x.classification.hybrid);
 const station=ledger.existingStarships.filter(x=>x.classification.primaryCategory==='space-station');
 assert.equal(hybrid.length,1);
 assert.equal(hybrid[0].sourceEntryKey,'sotg-baktoid-armor-workshop-vulture-class-starfighter');
 assert.ok(hybrid[0].classification.secondaryCategories.includes('walker'));
 assert.equal(station.length,4);
 const total=Object.values(ledger.counts.inheritedClassification).reduce((a,b)=>a+b,0);
 assert.equal(total,104);
});

test('chassis archetypes and lifeboat accessories are not false vehicle statblocks',()=>{
 for(const name of ['Small Lifeboats','Large Lifeboats','Stock Ship Types tables']){
  const row=ledger.candidateDispositions.find(x=>x.candidate===name);
  assert.equal(row.status,'EXCLUDE_INDEPENDENT_STATBLOCK');
 }
 assert.equal(ledger.counts.cumulativeKnownUniversalPublicationEntries,326);
});

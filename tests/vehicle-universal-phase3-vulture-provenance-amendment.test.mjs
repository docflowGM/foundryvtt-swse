import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveUniversalVehicleProvenance,resolveUniversalVehicleProvenanceEntries} from '../tools/lib/universal-vehicle-source-provenance.mjs';
const dir='data/audits/vehicles/';
const readJSON=path=>JSON.parse(readFileSync(path,'utf8'));
const amendment=readJSON(dir+'swse-universal-phase3-vulture-provenance-amendment.json');
const key=amendment.sourceEntryKey;
const legacy=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse);
const census=readFileSync(dir+'swse-universal-phase1-publication-census.ndjson','utf8').trim().split('\n').map(JSON.parse);
const phase1=readJSON(dir+'swse-universal-phase1a-core-rulebook.json').existingStarships;
const core=readJSON(dir+'swse-universal-phase2a-core-rulebook-staged.json').records;
const old=(data)=>data.find(x=>(x.identity?.sourceEntryKey??x.sourceEntryKey)===key);
test('frozen historical audit evidence stays immutable, and source PDF checksum authorizes only the explicit Vulture amendment',()=>{
 assert.equal(amendment.disposition,'APPROVED_SOURCE_FACT_CORRECTION');
 assert.equal(amendment.sourcePdfSha256,'509c4a701a83cebf00ba91574eec88d60d1ea96d4849d22d2c5f1f176bc32fd9');
 assert.equal(old(census).printedStatblockStartPage,180);
 assert.equal(old(phase1).pdfPhysicalPage,181);
 assert.equal(old(core).publication.page,180);
 assert.equal(old(legacy).printedPage,180);
 assert.equal(amendment.correctedPublishedClaim.printedName,'"Vulture" Droid Starfighter');
});
test('four authoritative effective projections reconcile original page and title without replacing original source keys',()=>{
 for(const [records,kind] of [[census,'phase1-census'],[phase1,'phase1-ledger'],[core,'phase2-staged'],[legacy,'historic-ship']]){
  const original=JSON.stringify(records);
  const resolved=resolveUniversalVehicleProvenanceEntries(records,amendment,kind);
  assert.equal(resolved.length,records.length);
  assert.equal(JSON.stringify(records),original,'historical input was mutated');
  assert.deepEqual(resolved.map(x=>x.identity?.sourceEntryKey??x.sourceEntryKey),records.map(x=>x.identity?.sourceEntryKey??x.sourceEntryKey));
  const fixed=old(resolved),prior=old(records);
  assert.notDeepEqual(fixed,prior);
  if(kind==='phase2-staged'){
   assert.equal(fixed.identity.name,'"Vulture" Droid Starfighter');
   assert.equal(fixed.publication.page,181);
   assert.equal(fixed.publication.printedTitle,'"Vulture" Droid Starfighter');
   assert.deepEqual(fixed.armament,prior.armament);
   assert.deepEqual(fixed.movement,prior.movement);
  } else if(kind==='historic-ship'){
   assert.equal(fixed.name,'"Vulture" Droid Starfighter');
   assert.equal(fixed.printedPage,181);
   assert.equal(fixed.sourceEvidence.pdfPhysicalPage,182);
   assert.deepEqual(fixed.printedFacts,prior.printedFacts);
   assert.deepEqual(fixed.sourceAttackGroups,prior.sourceAttackGroups);
  } else {
   assert.equal(fixed.printedName,'"Vulture" Droid Starfighter');
   assert.equal(fixed.printedStatblockStartPage,181);
   assert.equal(fixed.pdfPhysicalPage,182);
  }
  for(let i=0;i<records.length;i++)if((records[i].identity?.sourceEntryKey??records[i].sourceEntryKey)!==key)
   assert.strictEqual(resolved[i],records[i],'unrelated source entries must be unchanged references');
 }
});
test('tampered book, PDF hash, source key and old page each fail closed',()=>{
 assert.throws(()=>resolveUniversalVehicleProvenance({...old(census),printedStatblockStartPage:181},amendment,'phase1-census'),/anchor mismatch/);
 assert.throws(()=>resolveUniversalVehicleProvenance({...old(census),sourcePdfSha256:'wrong'},amendment,'phase1-census'),/anchor mismatch/);
 assert.throws(()=>resolveUniversalVehicleProvenance({...old(census),sourceBook:'wrong'},amendment,'phase1-census'),/book mismatch/);
 assert.throws(()=>resolveUniversalVehicleProvenance(old(census),{...amendment,sourcePdfSha256:'wrong'},'phase1-census'),/Unapproved/);
 assert.throws(()=>resolveUniversalVehicleProvenance(old(census),amendment,'other'),/Unknown vehicle/);
 assert.throws(()=>resolveUniversalVehicleProvenanceEntries([...census,old(census)],amendment,'phase1-census'),/Duplicate publication/);
});

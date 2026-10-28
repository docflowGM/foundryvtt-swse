import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync('data/audits/vehicles/swse-universal-phase2a-core-rulebook-staged.json','utf8'));
const phase1=JSON.parse(readFileSync('data/audits/vehicles/swse-universal-phase1a-core-rulebook.json','utf8'));
test('Core Phase 2-A is explicitly partial and source-backed',()=>{
 assert.equal(data.status,'PARTIAL_2_OF_17');assert.equal(data.records.length,2);assert.equal(data.remaining,15);
 assert.equal(data.sourcePdfSha256,phase1.sourcePdfSha256);
 assert.deepEqual(data.records.map(x=>x.identity.sourceEntryKey),['core-at-at','core-at-st']);
 for(const x of data.records){
  const origin=phase1.groundAndAirVehicles.find(y=>y.sourceEntryKey===x.identity.sourceEntryKey);
  assert.equal(x.publication.page,origin.printedStatblockStartPage);assert.equal(x.publication.printedTypeLine,origin.printedTypeLine);
  assert.equal(x.schemaVersion,'swse.vehicle.phase0b.draft-0.5');
  assert.equal(x.rules.reviewStatus,'source-reviewed-partial-weapon-mapping');
  assert.ok(x.defenses.reflex>0&&x.durability.hitPoints>0&&x.challenge.cl>0);
  assert.ok(x.armament.firingGroups.every(g=>g.mountKeys.length===0));
  assert.ok(!('weaponMounts' in x.armament));
  assert.ok(x.exceptions.unmappedFacts.length>0);
 }
});
test('AT-AT and AT-ST source-critical defenses, movement and weapons are not conflated',()=>{
 const [at,st]=data.records;
 assert.deepEqual([at.challenge.cl,at.durability.hitPoints,at.defenses.damageReduction,at.movement.speedModes[0].squaresPerMove],[14,300,20,4]);
 assert.deepEqual([st.challenge.cl,st.durability.hitPoints,st.defenses.damageReduction,st.movement.speedModes[0].squaresPerMove],[8,120,10,6]);
 assert.equal(at.armament.firingGroups.length,2);assert.equal(st.armament.firingGroups.length,3);
});

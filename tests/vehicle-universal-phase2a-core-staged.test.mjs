import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const location='data/audits/vehicles/';
const data=JSON.parse(readFileSync(location+'swse-universal-phase2a-core-rulebook-staged.json','utf8'));
const phase1=JSON.parse(readFileSync(location+'swse-universal-phase1a-core-rulebook.json','utf8'));
const schema=JSON.parse(readFileSync(location+'swse-phase0b-vehicle.schema.json','utf8'));
const ships=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(x=>x.sourceBook==='Core Rulebook');
const expected=[...phase1.groundAndAirVehicles,...phase1.existingStarships];
const byKey=new Map(data.records.map(x=>[x.identity.sourceEntryKey,x]));

test('all 17 Core published vehicle identities are source-hydrated; no hidden missing 15',()=>{
 assert.equal(data.records.length,17);
 assert.equal(data.mechanicalSourceEntries,17);
 assert.equal(data.unresolvedStrictMountCertifications,17);
 assert.equal(data.productionPacksChanged,false);
 assert.equal(data.generatedActorsChanged,false);
 assert.equal(data.sourcePdfSha256,phase1.sourcePdfSha256);
 assert.equal(new Set(byKey.keys()).size,17);
 assert.deepEqual([...byKey.keys()].sort(),expected.map(x=>x.sourceEntryKey).sort());
 assert.equal(data.records.filter(x=>phase1.existingStarships.some(y=>y.sourceEntryKey===x.identity.sourceEntryKey)).length,10);
 assert.equal(data.records.filter(x=>phase1.groundAndAirVehicles.some(y=>y.sourceEntryKey===x.identity.sourceEntryKey)).length,7);
});

test('all 17 record shapes comply with universal v0.5 required groups, closed top-level keys, and source identity',()=>{
 for(const record of data.records){
  const origin=expected.find(y=>y.sourceEntryKey===record.identity.sourceEntryKey);
  assert.ok(origin,record.identity.sourceEntryKey);
  assert.equal(record.schemaVersion,'swse.vehicle.phase0b.draft-0.5');
  assert.equal(record.recordType,'vehicle-source-entry');
  assert.equal(record.publication.book,'Core Rulebook');
  assert.equal(record.publication.page,origin.printedStatblockStartPage);
  assert.equal(record.publication.printedTypeLine,origin.printedTypeLine);
  assert.equal(record.identity.name,origin.printedName);
  assert.equal(record.classification.primaryCategory,origin.classification.primaryCategory);
  assert.ok(record.classification.mobilityDomains.length>0);
  assert.ok(Number.isInteger(record.challenge.cl));
  assert.ok(Number.isInteger(record.durability.hitPoints)&&record.durability.hitPoints>0);
  assert.ok(Number.isInteger(record.durability.damageThreshold)&&record.durability.damageThreshold>0);
  assert.ok(record.abilities.skills?.length>0);
  assert.ok(record.movement.speedModes?.length>0);
  assert.equal(record.rules.reviewStatus.includes('certified'),false,record.identity.sourceEntryKey);
  assert.ok(!('weaponMounts' in record.armament),record.identity.sourceEntryKey);
  for(const k of schema.required)assert.ok(Object.hasOwn(record,k),record.identity.sourceEntryKey+': '+k);
  assert.deepEqual(Object.keys(record).filter(k=>!Object.hasOwn(schema.properties,k)),[]);
  for(const [group,properties] of Object.entries(record)){
   if(group==='fieldStates'||typeof properties!=='object'||properties===null||Array.isArray(properties))continue;
   const allowed=schema.properties[group]?.properties;
   if(allowed)assert.deepEqual(Object.keys(properties).filter(k=>!Object.hasOwn(allowed,k)),[],record.identity.sourceEntryKey+' '+group);
  }
 }
});

test('five additional nonship entries match scanned printed Core pp176-178',()=>{
 const facts=[
 ['core-sorosuub-x-34-landspeeder',1,40,5,12,0],
 ['core-aratech-74-z-speeder-bike',4,40,5,12,1],
 ['core-aat-1',8,180,15,6,4],
 ['core-modified-incom-t-47-airspeeder',6,60,10,16,3],
 ['core-laat-i-gunship',12,160,15,12,4]
 ];
 for(const [key,cl,hp,dr,speed,groups] of facts){
  const x=byKey.get(key);assert.ok(x,key);
  assert.equal(x.challenge.cl,cl);assert.equal(x.durability.hitPoints,hp);
  assert.equal(x.defenses.damageReduction,dr);
  assert.equal(x.movement.speedModes.find(s=>s.scale==='character').squaresPerMove,speed);
  assert.equal(x.armament.firingGroups.length,groups);
  for(const group of x.armament.firingGroups)assert.deepEqual(group.mountKeys,[]);
 }
 assert.equal(byKey.get('core-laat-i-gunship').defenses.shieldRating,15);
 assert.equal(byKey.get('core-aat-1').capacity.passengerCount,6);
 assert.equal(byKey.get('core-sorosuub-x-34-landspeeder').capacity.passengerCount,1);
 assert.deepEqual(byKey.get('core-sorosuub-x-34-landspeeder').armament.firingGroups,[]);
 assert.ok(byKey.get('core-modified-incom-t-47-airspeeder').text.mechanicalNotes.includes('Harpoon'));
});

test('ten historical ship facts preserve certified source values and printed source conflicts',()=>{
 assert.equal(ships.length,10);
 for(const old of ships){
  const x=byKey.get(old.sourceEntryKey);assert.ok(x,old.sourceEntryKey);
  assert.equal(x.challenge.cl,old.printedFacts.challengeLevel);
  assert.equal(x.publication.page,old.printedPage);
  const known=old.printedFacts.defenses;
  if(known?.reflex!==undefined)assert.equal(x.defenses.reflex,known.reflex);
  if(known?.shieldRating!==null&&known?.shieldRating!==undefined)assert.equal(x.defenses.shieldRating,known.shieldRating);
  if(old.printedFacts.durability?.hitPoints!==undefined)assert.equal(x.durability.hitPoints,old.printedFacts.durability.hitPoints);
  if(old.printedFacts.durability?.threshold!==undefined)assert.equal(x.durability.damageThreshold,old.printedFacts.durability.threshold);
  assert.equal(x.armament.firingGroups.length,(old.sourceAttackGroups||old.attackGroups||[]).length);
  if(old.sourceConflicts?.length)assert.ok(x.exceptions.ambiguities?.length>=old.sourceConflicts.length);
 }
});

test('exceptional printed vehicles retain specialized capabilities rather than fabricated mounts',()=>{
 const fighter=byKey.get('core-tie-fighter');
 assert.equal(fighter.defenses.shieldRating,0);
 assert.equal(fighter.hyperspace.capability,'unavailable');
 const vulture=byKey.get('core-vulture-class-droid-starfighter');
 assert.deepEqual(vulture.classification.mobilityDomains,['space','ground']);
 assert.ok(vulture.movement.speedModes.some(s=>s.mode==='walking'&&s.squaresPerMove===6));
 assert.equal(vulture.crew.crewCount,0);
 const imperial=byKey.get('core-imperial-i-class-star-destroyer');
 assert.equal(imperial.armament.firingGroups.length,4);
 assert.ok(imperial.armament.firingGroups.every(g=>g.mountKeys.length===0));
 assert.equal(imperial.durability.hitPoints,2100);
});

test('two earlier walker records are preserved and still distinguish AT-AT / AT-ST',()=>{
 const [at,st]=data.records;
 assert.deepEqual([at.identity.sourceEntryKey,st.identity.sourceEntryKey],['core-at-at','core-at-st']);
 assert.deepEqual([at.challenge.cl,at.durability.hitPoints,at.defenses.damageReduction,at.movement.speedModes[0].squaresPerMove],[14,300,20,4]);
 assert.deepEqual([st.challenge.cl,st.durability.hitPoints,st.defenses.damageReduction,st.movement.speedModes[0].squaresPerMove],[8,120,10,6]);
 assert.equal(at.armament.firingGroups.length,2);
 assert.equal(st.armament.firingGroups.length,3);
});

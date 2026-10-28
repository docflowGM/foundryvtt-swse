
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='data/audits/vehicles/';
const load=path=>JSON.parse(readFileSync(path,'utf8'));
const d=load(root+'swse-universal-phase2d-kotor-staged.json');
const ledger=load(root+'swse-universal-phase1d-knights-of-the-old-republic.json');
const fixture=load(root+'swse-universal-phase2d-kotor-new-fixtures.json');
const schema=load(root+'swse-phase0b-vehicle.schema.json');
const old=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(x=>x.sourceBook==='Knights of the Old Republic Campaign Guide');
const byId=new Map(d.records.map(x=>[x.identity.sourceEntryKey,x]));

function schemaCheck(value,node,path){
 if(node.$ref)return schemaCheck(value,schema.$defs[node.$ref.split('/').at(-1)],path);
 if(node.anyOf){for(const v of node.anyOf){try{schemaCheck(value,v,path);return;}catch{}}assert.fail(path+': no matching anyOf alternative');}
 if(Object.hasOwn(node,'const'))assert.deepEqual(value,node.const,path+': const');
 if(node.enum)assert.ok(node.enum.includes(value),path+': invalid enum '+String(value));
 const types=node.type===undefined?[]:Array.isArray(node.type)?node.type:[node.type];
 if(types.length)assert.ok(types.some(t=>t==='null'?value===null:t==='integer'?Number.isInteger(value):t==='array'?Array.isArray(value):t==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):typeof value===t),path+': invalid type');
 if(typeof value==='string'&&node.minLength!==undefined)assert.ok(value.length>=node.minLength,path);
 if(Array.isArray(value)){if(node.minItems!==undefined)assert.ok(value.length>=node.minItems,path+': minItems');if(node.maxItems!==undefined)assert.ok(value.length<=node.maxItems,path+': maxItems');if(node.items)value.forEach((v,i)=>schemaCheck(v,node.items,path+'['+i+']'));}
 else if(value!==null&&typeof value==='object'){
  for(const k of node.required||[])assert.ok(Object.hasOwn(value,k),path+': missing '+k);
  for(const [k,v] of Object.entries(value)){
   if(node.properties?.[k])schemaCheck(v,node.properties[k],path+'.'+k);
   else if(node.additionalProperties===false)assert.fail(path+': disallowed '+k);
   else if(node.additionalProperties&&typeof node.additionalProperties==='object')schemaCheck(v,node.additionalProperties,path+'.'+k);
  }
 }
}
test('entire book exactly 39 distinct publication claims from frozen Phase 1 ledger',()=>{
 assert.equal(d.records.length,39);assert.equal(byId.size,39);
 assert.equal(old.length,32);assert.equal(ledger.existingSpacecraft.length,32);
 assert.equal(ledger.newVehicleEntries.length,7);assert.equal(fixture.records.length,7);
 assert.deepEqual([...byId.keys()].sort(),[...ledger.existingSpacecraft,...ledger.newVehicleEntries].map(x=>x.sourceEntryKey).sort());
 assert.deepEqual(d.summary,{publicationRecords:39,inheritedSpacecraft:32,newOtherVehicles:7,sourceAttackGroups:73,strictMountCertificationsNew:0,pendingSpecialRuleRecords:22});
 assert.equal(d.sourcePdfSha256,ledger.sourcePdfSha256);
 assert.equal(d.productionPacksChanged,false);assert.equal(d.generatedActorsChanged,false);
});
test('all 39 vehicle source records satisfy full recursive draft v0.5 schema',()=>{
 for(const row of d.records)schemaCheck(row,schema,row.identity.sourceEntryKey);
});
test('32 inherited ship identities preserve verified printed mechanics and independently reviewed attack groups',()=>{
 for(const s of old){
  const r=byId.get(s.sourceEntryKey),claim=ledger.existingSpacecraft.find(x=>x.sourceEntryKey===s.sourceEntryKey);
  assert.ok(r,s.sourceEntryKey);assert.ok(claim,s.sourceEntryKey);
  assert.equal(r.publication.page,claim.printedStatblockStartPage);
  assert.equal(r.identity.name,claim.printedName);
  assert.equal(r.publication.printedTypeLine,s.printedFacts.type);
  assert.deepEqual(r.classification.mobilityDomains,claim.classification.mobilityDomains);
  assert.equal(r.challenge.cl,s.printedFacts.cl);
  assert.equal(r.defenses.reflex,s.printedFacts.defenses.reflex);
  assert.equal(r.defenses.fortitude,s.printedFacts.defenses.fortitude);
  assert.equal(r.durability.hitPoints,s.printedFacts.durability.hitPoints);
  assert.equal(r.durability.damageThreshold,s.printedFacts.durability.threshold);
  assert.equal(r.defenses.damageReduction,s.printedFacts.durability.damageReduction);
  assert.equal(r.combat.baseAttackBonusPrinted,s.printedFacts.combat.baseAttackBonus);
  assert.equal(r.combat.grappleBonusPrinted,s.printedFacts.combat.grappleBonus);
  assert.equal(r.armament.firingGroups.length,(s.sourceAttackGroups||[]).length);
  assert.equal(r.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  assert.ok(!Object.hasOwn(r.armament,'weaponMounts'));
  if(s.sourceConflicts?.length)assert.equal(r.exceptions.ambiguities?.length,s.sourceConflicts.length);
  if(typeof s.printedFacts.emplacementPoints==='number')assert.equal(r.modifications.emplacementPointsTotal,s.printedFacts.emplacementPoints);
 }
});
test('seven newly rendered-page-transcribed records retain exact source stats and locations',()=>{
 for(const [i,claim] of ledger.newVehicleEntries.entries()){
  const s=fixture.records[i],r=byId.get(claim.sourceEntryKey);
  assert.equal(s.sourceEntryKey,claim.sourceEntryKey);assert.equal(s.printedPage,claim.printedStatblockStartPage);
  assert.equal(s.pdfPhysicalPage,claim.pdfPhysicalPage);
  assert.equal(s.sourcePdfSha256,ledger.sourcePdfSha256);
  assert.equal(r.publication.printedTypeLine,claim.printedTypeLine);
  assert.equal(r.identity.name,claim.printedName);
  assert.equal(r.challenge.cl,s.cl);assert.equal(r.defenses.reflex,s.reflex);
  assert.equal(r.defenses.fortitude,s.fortitude);
  assert.equal(r.durability.hitPoints,s.hp);assert.equal(r.durability.damageThreshold,s.threshold);
  assert.deepEqual([r.abilities.str,r.abilities.dex,r.abilities.int],[s.str,s.dex,s.int]);
  assert.equal(r.crew.crewCount,s.crew);
  assert.equal(r.capacity.passengerCount,s.passengers);
  assert.equal(r.armament.firingGroups.length,s.ranged.length);
  assert.equal(r.movement.maxVelocityKmh,s.maxKmh);
  assert.equal(r.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
 }
});
test('Basilisk is single vehicle-droid with dual-scale movement, substitution rule, and four unbound weapons',()=>{
 const r=byId.get('kotor-basilisk-war-droid');
 assert.deepEqual(r.classification.mobilityDomains,['air','space']);
 assert.equal(r.classification.primaryCategory,'vehicle-droid');
 assert.equal(r.publication.page,203);
 assert.equal(r.challenge.cl,6);
 assert.deepEqual(r.movement.speedModes.map(x=>[x.scale,x.squaresPerMove]),[['character',12],['starship',3]]);
 assert.equal(r.crew.crewCount,1);assert.equal(r.capacity.passengerCount,1);
 assert.equal(r.armament.firingGroups.length,4);
 assert.deepEqual(r.armament.carriedPayloads.map(x=>x.value),[4,2]);
 assert.equal(r.combat.meleeAttackLine,'claws +11');
 assert.ok(r.text.mechanicalNotes.includes('substitute'));
 assert.equal(r.economics.priceNew.status,'not-for-sale');
 assert.ok(r.economics.notes.includes('70000'));
 assert.equal(d.records.filter(x=>x.identity.sourceEntryKey===r.identity.sourceEntryKey).length,1);
});
test('six civilian vehicles remain unarmed; cargo pod and printed repair benefit are separately retained',()=>{
 const unarmed=fixture.records.slice(0,6);
 assert.equal(unarmed.length,6);
 for(const e of unarmed){const r=byId.get(e.sourceEntryKey);assert.deepEqual(r.armament.firingGroups,[]);assert.equal(r.fieldStates['/armament/weaponMounts'],'explicitly-none');}
 const urban=byId.get('kotor-aratech-urban-navigator-speeder-bike');
 assert.deepEqual(urban.classification.mobilityDomains,['air']);
 assert.equal(urban.capacity.passengerCount,1);
 const racer=byId.get('kotor-lhosan-industries-swoop-racer');
 assert.equal(racer.movement.maxVelocityKmh,850);
 const tt=byId.get('kotor-sorosuub-tt-6-landspeeder');
 assert.ok(tt.text.mechanicalNotes.includes('+2 equipment bonus'));
 const twin=byId.get('kotor-sorosuub-twin-228-airspeeder');
 assert.equal(twin.capacity.cargo.value,60);
 assert.ok(twin.capacity.storageNotes.includes('460 kg'));
 assert.ok(twin.economics.notes.includes('1000'));
});
test('73 published attack groups do not become fabricated physical mount identities',()=>{
 const inherited=old.reduce((n,x)=>n+(x.sourceAttackGroups?.length||0),0);
 assert.equal(inherited,69);assert.equal(d.records.reduce((n,x)=>n+x.armament.firingGroups.length,0),73);
 for(const r of d.records)for(const g of r.armament.firingGroups){assert.deepEqual(g.mountKeys,[]);assert.ok(g.specialNotes.includes('Physical mounts and firing arcs not established'));}
});

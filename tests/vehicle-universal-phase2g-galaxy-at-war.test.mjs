import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='data/audits/vehicles/';
const json=path=>JSON.parse(readFileSync(path,'utf8'));
const data=json(root+'swse-universal-phase2g-galaxy-at-war-staged.json');
const provenance=json(root+'swse-universal-phase1g-galaxy-at-war.json');
const fixture=json(root+'swse-universal-phase2g-galaxy-at-war-fixtures.json');
const schema=json(root+'swse-phase0b-vehicle.schema.json');
const ships=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(x=>x.sourceBook==='Galaxy at War');
const byKey=new Map(data.records.map(x=>[x.identity.sourceEntryKey,x]));

function validate(value,node,path){
 if(node.$ref)return validate(value,schema.$defs[node.$ref.split('/').at(-1)],path);
 if(node.anyOf){for(const option of node.anyOf){try{validate(value,option,path);return;}catch{}}assert.fail(path+': no matching anyOf schema');}
 if(Object.hasOwn(node,'const'))assert.deepEqual(value,node.const,path+' const');
 if(node.enum)assert.ok(node.enum.includes(value),path+' enum '+String(value));
 const types=node.type===undefined?[]:Array.isArray(node.type)?node.type:[node.type];
 if(types.length)assert.ok(types.some(t=>t==='null'?value===null:t==='integer'?Number.isInteger(value):t==='array'?Array.isArray(value):t==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):typeof value===t),path+' invalid type');
 if(typeof value==='string'&&node.minLength!==undefined)assert.ok(value.length>=node.minLength,path+' minLength');
 if(Array.isArray(value)){if(node.minItems!==undefined)assert.ok(value.length>=node.minItems,path+' minItems');if(node.maxItems!==undefined)assert.ok(value.length<=node.maxItems,path+' maxItems');if(node.items)value.forEach((v,i)=>validate(v,node.items,path+'['+i+']'));}
 else if(value!==null&&typeof value==='object'&&!Array.isArray(value)){
  for(const k of node.required||[])assert.ok(Object.hasOwn(value,k),path+' missing '+k);
  for(const [k,v] of Object.entries(value)){
   if(node.properties?.[k])validate(v,node.properties[k],path+'.'+k);
   else if(node.additionalProperties===false)assert.fail(path+' unexpected '+k);
   else if(node.additionalProperties&&typeof node.additionalProperties==='object')validate(v,node.additionalProperties,path+'.'+k);
  }
 }
}

test('whole Galaxy at War book has exactly five historical ships and six newly transcribed vehicles',()=>{
 assert.equal(ships.length,5);assert.equal(provenance.existingSpacecraft.length,5);
 assert.equal(provenance.newVehicleEntries.length,6);assert.equal(fixture.records.length,6);
 assert.equal(data.records.length,11);assert.equal(byKey.size,11);
 assert.deepEqual([...byKey.keys()].sort(),[...provenance.existingSpacecraft,...provenance.newVehicleEntries].map(x=>x.sourceEntryKey).sort());
 assert.deepEqual(data.summary,{publicationRecords:11,historicalShips:5,newVehicles:6,sourceAttackGroups:17,newSourceAttackGroups:4,strictPhysicalMountCertificationsNew:0});
 assert.equal(data.sourcePdfSha256,provenance.sourcePdfSha256);
 assert.equal(fixture.sourcePdfSha256,provenance.sourcePdfSha256);
 assert.equal(data.productionPacksChanged,false);assert.equal(data.generatedActorsChanged,false);
});

test('all 11 universal source records validate recursively against existing Phase 0B draft v0.5 schema',()=>{
 for(const x of data.records)validate(x,schema,x.identity.sourceEntryKey);
});

test('five historical spacecraft preserve prior source identity and CL, HP, damage, defenses and attack group counts',()=>{
 for(const old of ships){
  const row=byKey.get(old.sourceEntryKey);
  const claim=provenance.existingSpacecraft.find(x=>x.sourceEntryKey===old.sourceEntryKey);
  assert.ok(row,old.sourceEntryKey);assert.ok(claim,old.sourceEntryKey);
  assert.equal(row.identity.name,old.name);
  assert.equal(row.publication.page,old.printedPage);
  assert.equal(row.publication.printedTypeLine,old.printedFacts.printedTypeLine);
  assert.deepEqual(row.classification.mobilityDomains,claim.classification.mobilityDomains);
  assert.equal(row.challenge.cl,old.printedFacts.challengeLevel);
  assert.equal(row.armament.firingGroups.length,old.sourceAttackGroups.length);
  assert.equal(row.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  assert.equal(Object.hasOwn(row.armament,'weaponMounts'),false);
  assert.ok(row.durability.hitPoints>0);assert.ok(row.durability.damageThreshold>0);
  assert.ok(row.defenses.reflex>0);assert.ok(row.movement.speedModes.length>0);
  assert.ok(row.crew.raw?.length>0);
 }
});

test('six printed new statblocks exactly retain ledger key, source page, statistics, and zero-weapon entries',()=>{
 for(const [i,entry] of provenance.newVehicleEntries.entries()){
  const f=fixture.records[i],r=byKey.get(entry.sourceEntryKey);
  assert.ok(r,entry.sourceEntryKey);
  assert.equal(f.sourceEntryKey,entry.sourceEntryKey);
  assert.equal(f.printedPage,entry.printedStatblockStartPage);
  assert.equal(f.pdfPhysicalPage,entry.pdfPhysicalPage);
  assert.equal(f.sourcePdfSha256,provenance.sourcePdfSha256);
  assert.equal(r.publication.printedTypeLine,entry.printedTypeLine);
  assert.deepEqual(r.classification.mobilityDomains,entry.classification.mobilityDomains);
  assert.equal(r.challenge.cl,f.cl);assert.equal(r.durability.hitPoints,f.hp);
  assert.equal(r.durability.damageThreshold,f.dt);
  assert.deepEqual([r.defenses.reflex,r.defenses.reflexFlatFooted,r.defenses.fortitude,r.defenses.damageReduction],[f.ref,f.ff,f.fort,f.dr]);
  assert.deepEqual([r.abilities.str,r.abilities.dex,r.abilities.int],f.abilities);
  assert.equal(r.movement.speedModes[0].squaresPerMove,f.speed);
  assert.equal(r.movement.maxVelocityKmh,f.km);
  assert.equal(r.armament.firingGroups.length,f.weapons.length);
  if(f.crewCount!==null)assert.equal(r.crew.crewCount,f.crewCount);
  assert.equal(r.capacity.passengerCount,f.pass);
  assert.equal(r.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
 }
});

test('source exceptional rules and anomalies survive without guessing corrected mechanics',()=>{
 const corona=byKey.get('gaw-corona-class-armed-transport');
 assert.equal(corona.economics.priceNew.amountCredits,3700000);
 assert.equal(corona.economics.priceUsed.amountCredits,2000000);
 assert.deepEqual(corona.capacity.carriedCraft.map(x=>x.count),[6,12]);
 assert.equal(corona.armament.firingGroups.length,4);
 assert.ok(corona.exceptions.specialRules.some(x=>x.summary.includes('-20')));
 const citadel=byKey.get('gaw-koensayr-ilh-kk-citadel-class-cruiser');
 assert.deepEqual([citadel.challenge.cl,citadel.durability.hitPoints,citadel.defenses.shieldRating],[7,120,30]);
 assert.equal(citadel.armament.firingGroups.length,4);
 assert.ok(citadel.combat.rangedAttackLine.includes('tractor beam +3'));
 assert.equal(citadel.armament.firingGroups[3].attackBonusPrinted,1);
 assert.equal(citadel.hyperspace.primaryMultiplier,2);
 const y=byKey.get('gaw-yu-410-light-freighter');
 assert.equal(y.defenses.damageReduction,15);
 assert.equal(Object.hasOwn(y.defenses,'shieldRating'),false);
 assert.equal(y.fieldStates['/defenses/shieldRating'],'not-stated');
 assert.ok(y.exceptions.ambiguities.some(x=>x.includes('DR')));
 assert.equal(y.abilities.initiativePrinted,-5);
 assert.equal(y.abilities.skills.find(x=>x.name==='Initiative').printedModifier,-2);
 assert.equal(y.abilities.skills.find(x=>x.name==='Pilot').printedModifier,-5);
 assert.deepEqual([y.abilities.str,y.abilities.dex,y.abilities.int],[42,10,14]);
 const if120=byKey.get('gaw-imperial-landing-craft');
 assert.deepEqual(if120.capacity.carriedCraft.map(x=>x.count),[12,2,1]);
 assert.equal(if120.abilities.skills.find(x=>x.name==='Use Computer').printedModifier,8);
});

test('six new vehicles retain specific source capabilities and printed ambiguities',()=>{
 const freeco=byKey.get('gaw-freeco-speeder');
 assert.equal(freeco.challenge.cl,6);
 assert.equal(freeco.armament.firingGroups[0].attackBonusPrinted,7);
 assert.ok(freeco.armament.firingGroups[0].specialNotes.includes('autofire'));
 const shelter=byKey.get('gaw-shelter-speeder');
 assert.equal(shelter.capacity.passengerCount,4);
 assert.equal(shelter.capacity.passengerGroups[0].count,2);
 assert.ok(shelter.text.mechanicalNotes.includes('+5 equipment bonus'));
 assert.deepEqual(shelter.movement.speedModes.map(x=>x.scale),['character','starship']);
 assert.deepEqual(shelter.armament.firingGroups,[]);
 const wlo=byKey.get('gaw-wlo-5-speeder-tank');
 assert.equal(wlo.economics.priceNew.status,'ambiguous');
 assert.equal(wlo.economics.priceNew.raw,'115,00 credits');
 assert.equal(wlo.economics.priceUsed.amountCredits,65000);
 assert.ok(wlo.text.mechanicalNotes.includes('pirate-added'));
 const pod=byKey.get('gaw-drop-pod');
 assert.equal(pod.crew.crewCount,0);assert.equal(pod.capacity.passengerCount,0);
 assert.equal(pod.capacity.carriedCraft[0].count,1);
 assert.ok(pod.capacity.carriedCraft[0].name.includes('Gargantuan'));
 assert.equal(pod.capacity.consumables,null);
 assert.equal(pod.hyperspace.capability,undefined);
 assert.equal(pod.movement.speedModes.length,2);
 const t8=byKey.get('gaw-t8-loading-vehicle');
 assert.equal(t8.movement.speedModes[0].mode,'wheeled');
 assert.deepEqual(t8.armament.firingGroups,[]);
 assert.equal(t8.economics.priceNew.amountCredits,5000);
 const gat=byKey.get('gaw-ground-armored-tank');
 assert.equal(gat.defenses.vehicularCombatIncluded,true);
 assert.equal(gat.crew.autonomy,'droid-brain');
 assert.equal(Object.hasOwn(gat.crew,'crewCount'),false);
 assert.equal(gat.armament.firingGroups.length,2);
 assert.ok(gat.exceptions.specialRules.some(x=>x.summary.includes('Shock and Awe')));
 assert.equal(data.records.filter(x=>x.identity.sourceEntryKey==='gaw-ground-armored-tank').length,1);
});

test('all 17 source attack groups are non-executable; physical mounts, arcs and stock attack bindings are not granted',()=>{
 assert.equal(ships.reduce((n,s)=>n+s.sourceAttackGroups.length,0),13);
 assert.equal(fixture.records.reduce((n,r)=>n+r.weapons.length,0),4);
 assert.equal(data.records.reduce((n,r)=>n+r.armament.firingGroups.length,0),17);
 assert.equal(data.summary.strictPhysicalMountCertificationsNew,0);
 for(const r of data.records)for(const g of r.armament.firingGroups){
  assert.deepEqual(g.mountKeys,[]);
  assert.ok(g.specialNotes.includes('Physical mounts, arcs'));
  assert.ok(g.label?.length>0);
 }
});

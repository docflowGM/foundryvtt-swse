import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='data/audits/vehicles/';
const load=path=>JSON.parse(readFileSync(path,'utf8'));
const data=load(root+'swse-universal-phase2f-scum-and-villainy-staged.json');
const provenance=load(root+'swse-universal-phase1f-scum-and-villainy.json');
const fixture=load(root+'swse-universal-phase2f-scum-and-villainy-fixtures.json');
const overlay=load(root+'swse-phase2c-cp3-318-census-overlay.json');
const schema=load(root+'swse-phase0b-vehicle.schema.json');
const historical=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(x=>x.sourceBook==='Scum and Villainy');
const byKey=new Map(data.records.map(x=>[x.identity.sourceEntryKey,x]));

function validate(value,node,path){
 if(node.$ref)return validate(value,schema.$defs[node.$ref.split('/').at(-1)],path);
 if(node.anyOf){for(const option of node.anyOf){try{validate(value,option,path);return;}catch{}}assert.fail(path+': no matching anyOf schema');}
 if(Object.hasOwn(node,'const'))assert.deepEqual(value,node.const,path+' constant');
 if(node.enum)assert.ok(node.enum.includes(value),path+' enum '+String(value));
 const types=node.type===undefined?[]:Array.isArray(node.type)?node.type:[node.type];
 if(types.length)assert.ok(types.some(t=>t==='null'?value===null:t==='integer'?Number.isInteger(value):t==='array'?Array.isArray(value):t==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):typeof value===t),path+': type '+typeof value);
 if(typeof value==='string'&&node.minLength!==undefined)assert.ok(value.length>=node.minLength,path+' string length');
 if(Array.isArray(value)){if(node.minItems!==undefined)assert.ok(value.length>=node.minItems,path+' minimum items');if(node.maxItems!==undefined)assert.ok(value.length<=node.maxItems,path+' maximum items');if(node.items)value.forEach((v,i)=>validate(v,node.items,path+'['+i+']'));}
 else if(value!==null&&typeof value==='object'){
  for(const k of node.required||[])assert.ok(Object.hasOwn(value,k),path+': missing '+k);
  for(const [k,v] of Object.entries(value)){
   if(node.properties?.[k])validate(v,node.properties[k],path+'.'+k);
   else if(node.additionalProperties===false)assert.fail(path+': unexpected '+k);
   else if(node.additionalProperties&&typeof node.additionalProperties==='object')validate(v,node.additionalProperties,path+'.'+k);
  }
 }
}

test('complete Scum and Villainy census: 11 old + 1 approved Hornet + 1 new station, no overlap',()=>{
 assert.equal(historical.length,11);
 assert.equal(provenance.existingSpacecraft.length,11);
 assert.equal(provenance.approvedSupplementalSpacecraft.length,1);
 assert.equal(provenance.newVehicleEntries.length,1);
 assert.equal(data.records.length,13);assert.equal(byKey.size,13);
 assert.deepEqual([...byKey.keys()].sort(),[...provenance.existingSpacecraft,...provenance.approvedSupplementalSpacecraft,...provenance.newVehicleEntries].map(x=>x.sourceEntryKey).sort());
 assert.deepEqual(data.summary,{publicationRecords:13,historicalSpacecraft:11,previouslyApprovedHornet:1,newStarForgeStation:1,sourceAttackGroups:24,strictPhysicalMountCertificationsNew:0,sourceExceptionsPending:3});
 assert.equal(data.sourcePdfSha256,provenance.sourcePdfSha256);
 assert.equal(data.productionPacksChanged,false);assert.equal(data.generatedActorsChanged,false);
});

test('all 13 complete source records comply recursively with unchanged universal draft v0.5 schema',()=>{
 for(const record of data.records)validate(record,schema,record.identity.sourceEntryKey);
});

test('historical 11 preserve original book/page identity, printed core mechanics, and source attack groups',()=>{
 for(const source of historical){
  const row=byKey.get(source.sourceEntryKey);
  const printed=source.printedFacts;
  const claim=provenance.existingSpacecraft.find(x=>x.sourceEntryKey===source.sourceEntryKey);
  assert.ok(row,source.sourceEntryKey);assert.ok(claim,source.sourceEntryKey);
  assert.equal(row.identity.name,claim.printedName);
  assert.equal(row.publication.page,source.printedPage);
  assert.equal(row.publication.printedTypeLine,printed.printedTypeLine);
  assert.deepEqual(row.classification.mobilityDomains,claim.classification.mobilityDomains);
  assert.equal(row.challenge.cl,printed.challengeLevel);
  assert.equal(row.defenses.reflex,printed.defenses.reflex);
  assert.equal(row.defenses.fortitude,printed.defenses.fortitude);
  if(typeof printed.defenses.shieldRating==='number')assert.equal(row.defenses.shieldRating,printed.defenses.shieldRating);
  assert.equal(row.defenses.damageReduction,printed.durability.damageReduction);
  assert.equal(row.durability.hitPoints,printed.durability.hitPoints);
  assert.equal(row.durability.damageThreshold,printed.durability.threshold);
  assert.equal(row.abilities.str,printed.abilities.strength);
  assert.equal(row.combat.baseAttackBonusPrinted,printed.baseAttackBonus);
  assert.equal(row.combat.grappleBonusPrinted,printed.grappleBonus);
  assert.equal(row.armament.firingGroups.length,source.sourceAttackGroups.length);
  assert.equal(row.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  assert.ok(!Object.hasOwn(row.armament,'weaponMounts'));
  assert.ok(row.movement.speedModes.length>0,source.sourceEntryKey+': lost speed');
  assert.ok(row.crew.crewCount>=0,source.sourceEntryKey+': missing crew');
  if(source.sourceConflicts?.length)assert.equal(row.exceptions.ambiguities.length,source.sourceConflicts.length);
 }
 const clutch=byKey.get('sav-clutch-ugly-fighter');
 assert.equal(clutch.hyperspace.capability,'unavailable');
 assert.ok(clutch.combat.rangedAttackLine.includes('ion cannons +7'));
 assert.ok(clutch.armament.firingGroups.some(g=>g.attackBonusPrinted===5&&g.label.includes('ion')));
 assert.equal(clutch.economics.priceUsed.amountCredits,45000);
 assert.ok(!Object.hasOwn(clutch.economics,'priceNew'));
 const y164=byKey.get('sav-y164-thalassian-slave-transport');
 assert.deepEqual(y164.movement.speedModes.map(x=>[x.scale,x.squaresPerMove]),[['starship',1]]);
});

test('Hornet remains approved 318-baseline supplement, never a new discovery or two separate hulls',()=>{
 const h=byKey.get('sav-tenloss-corporation-hornet-class-interceptor');
 const approved=overlay.supplementalEntries.find(x=>x.sourceEntryKey===h.identity.sourceEntryKey);
 assert.ok(approved);
 assert.equal(h.publication.page,125);
 assert.equal(approved.printedCL,12);
 assert.equal(h.challenge.cl,12);
 assert.deepEqual([h.durability.hitPoints,h.defenses.shieldRating,h.durability.damageThreshold],[50,35,41]);
 assert.equal(h.armament.firingGroups.length,2);
 assert.deepEqual(h.armament.firingGroups.map(g=>g.attackBonusPrinted),[6,6]);
 assert.ok(h.armament.firingGroups[0].specialNotes.includes('10d10x2'));
 assert.ok(h.armament.firingGroups[1].specialNotes.includes('5d10x2'));
 assert.ok(h.armament.notes.includes('replace each other'));
 assert.ok(h.exceptions.specialRules.some(x=>x.summary.includes('6d10x2')&&x.summary.includes('ignoring SR')));
 assert.equal(h.fieldStates['/hyperspace/capability'],'not-stated');
 assert.ok(!Object.hasOwn(h.hyperspace,'capability'));
 assert.equal(data.records.filter(x=>x.identity.sourceEntryKey===h.identity.sourceEntryKey).length,1);
});

test('StarForge Station verified printed page 130: CL 20, crew, cargo, indefinite provisions, shipyard and weapons',()=>{
 const s=byKey.get('sav-starforge-station'),src=fixture.entries.find(x=>x.sourceEntryKey==='sav-starforge-station');
 assert.ok(s);assert.ok(src);assert.equal(src.printedPage,130);assert.equal(src.pdfPhysicalPage,131);
 assert.equal(s.publication.page,130);
 assert.equal(s.publication.printedTypeLine,'Colossal (station) space station');
 assert.equal(s.classification.primaryCategory,'space-station');
 assert.deepEqual(s.classification.mobilityDomains,['space']);
 assert.equal(s.challenge.cl,20);
 assert.deepEqual([s.defenses.reflex,s.defenses.fortitude,s.defenses.damageReduction,s.defenses.shieldRating],[16,74,20,200]);
 assert.deepEqual([s.durability.hitPoints,s.durability.damageThreshold],[3000,574]);
 assert.equal(s.abilities.str,138);
 assert.deepEqual(s.movement.speedModes.map(x=>[x.scale,x.squaresPerMove]),[['starship',1]]);
 assert.deepEqual([s.geometry.starshipScaleWidthSquares,s.geometry.starshipScaleLengthSquares],[2,2]);
 assert.equal(s.crew.crewCount,1850);
 assert.equal(s.capacity.passengerCount,10000);
 assert.equal(s.capacity.cargo.value,25000000);
 assert.equal(s.capacity.consumables.raw,'unlimited');
 assert.deepEqual(s.capacity.carriedCraft.map(x=>x.count),[600,60,12]);
 assert.equal(s.hyperspace.primaryMultiplier,6);
 assert.equal(s.economics.priceNew.status,'not-for-sale');
 assert.equal(s.armament.firingGroups.length,1);
 assert.equal(s.armament.firingGroups[0].attackBonusPrinted,12);
 assert.ok(s.armament.firingGroups[0].specialNotes.includes('-8'));
 assert.ok(s.armament.firingGroups[0].specialNotes.includes('7d10x5'));
 assert.equal(s.abilities.initiativePrinted,-4);
 assert.equal(s.abilities.skills.find(x=>x.name==='Initiative').printedModifier,-5);
 assert.equal(s.abilities.perceptionPrinted,6);
 assert.equal(s.abilities.skills.find(x=>x.name==='Perception').printedModifier,5);
 assert.ok(s.exceptions.specialRules.some(x=>x.key==='starforge-shipyard'));
 assert.ok(s.exceptions.specialRules.some(x=>x.key==='starforge-capital-weapon-penalty'));
});

test('24 source attack groups retain labels, station and damage evidence without fabricated physical mount authority',()=>{
 assert.equal(historical.reduce((n,x)=>n+x.sourceAttackGroups.length,0),21);
 assert.equal(data.records.reduce((n,x)=>n+x.armament.firingGroups.length,0),24);
 for(const row of data.records)for(const group of row.armament.firingGroups){
  assert.deepEqual(group.mountKeys,[]);
  assert.ok(group.specialNotes.includes('Physical mounts, arcs'));
  assert.ok(group.label.length);
 }
 assert.equal(data.summary.strictPhysicalMountCertificationsNew,0);
});

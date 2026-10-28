import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = path => JSON.parse(readFileSync(path,'utf8'));
const base='data/audits/vehicles/';
const data=read(base+'swse-universal-phase2b-starships-of-the-galaxy-staged.json');
const provenance=read(base+'swse-universal-phase1b-starships-of-the-galaxy.json');
const schema=read(base+'swse-phase0b-vehicle.schema.json');
const ships=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(x=>x.sourceBook==='Starships of the Galaxy');
const byId=new Map(data.records.map(x=>[x.identity.sourceEntryKey,x]));
const refs=new Map(ships.map(x=>[x.sourceEntryKey,x]));

function checkSchema(value,node,path='$'){
 if(node.$ref) return checkSchema(value,schema.$defs[node.$ref.slice('#/$defs/'.length)],path);
 if(node.anyOf){if(!node.anyOf.some(n=>{try{checkSchema(value,n,path);return true;}catch{return false;}}))throw new Error(path+': failed anyOf');return;}
 if(node.const!==undefined)assert.deepEqual(value,node.const,path+'.const');
 if(node.enum)assert.ok(node.enum.includes(value),path+': invalid enum '+String(value));
 if(node.type){const names=Array.isArray(node.type)?node.type:[node.type];const fits=names.some(t=>t==='null'?value===null:t==='array'?Array.isArray(value):t==='object'?!!value&&typeof value==='object'&&!Array.isArray(value):t==='integer'?Number.isInteger(value):typeof value===t);assert.ok(fits,path+': type '+JSON.stringify(names)+' got '+typeof value);}
 if(typeof value==='string'&&node.minLength!==undefined)assert.ok(value.length>=node.minLength,path+'.minLength');
 if(Array.isArray(value)){if(node.minItems!==undefined)assert.ok(value.length>=node.minItems,path+'.minItems');if(node.maxItems!==undefined)assert.ok(value.length<=node.maxItems,path+'.maxItems');if(node.items)for(const [i,v] of value.entries())checkSchema(v,node.items,path+'['+i+']');}
 if(value&&typeof value==='object'&&!Array.isArray(value)){for(const k of node.required||[])assert.ok(Object.hasOwn(value,k),path+': missing '+k);for(const [k,v] of Object.entries(value)){const sub=node.properties?.[k];if(sub)checkSchema(v,sub,path+'.'+k);else if(node.additionalProperties===false)throw new Error(path+': unexpected '+k);else if(node.additionalProperties&&typeof node.additionalProperties==='object')checkSchema(v,node.additionalProperties,path+'.'+k);}}
}

test('Starships of the Galaxy entire publication is staged: 104 inherited, 1 new Escape Pod, 105 distinct keys',()=>{
 assert.equal(data.records.length,105);
 assert.equal(ships.length,104);
 assert.equal(provenance.existingStarships.length,104);
 assert.equal(provenance.newVehicleEntries.length,1);
 assert.equal(data.counts.total,105);
 assert.equal(data.counts.old,104);
 assert.equal(data.counts.new,1);
 assert.equal(new Set(byId.keys()).size,105);
 const expected=[...provenance.existingStarships,...provenance.newVehicleEntries].map(x=>x.sourceEntryKey).sort();
 assert.deepEqual([...byId.keys()].sort(),expected);
 assert.equal(data.sourcePdfSha256,provenance.sourcePdfSha256);
 assert.equal(data.productionPacksChanged,false);
 assert.equal(data.generatedActorsChanged,false);
});
test('all 105 full universal records satisfy Phase 0B draft v0.5 JSON schema, including nested objects',()=>{
 for(const record of data.records)checkSchema(record,schema,'entry:'+record.identity.sourceEntryKey);
});
test('104 inherited ships retain precise source CL, HP, DT, defenses, grouping, identity, and location',()=>{
 for(const old of ships){
  const row=byId.get(old.sourceEntryKey);
  const origin=provenance.existingStarships.find(x=>x.sourceEntryKey===old.sourceEntryKey);
  assert.ok(row,old.sourceEntryKey);
  assert.equal(row.identity.name,old.name);
  assert.equal(row.publication.page,old.printedPage);
  assert.equal(row.publication.printedTypeLine,old.printedFacts.type);
  assert.equal(row.classification.primaryCategory,origin.classification.primaryCategory);
  assert.deepEqual(row.classification.mobilityDomains,origin.classification.mobilityDomains);
  assert.equal(row.challenge.cl,old.printedFacts.cl);
  assert.equal(row.durability.hitPoints,old.printedFacts.durability.hitPoints);
  assert.equal(row.durability.damageThreshold,old.printedFacts.durability.threshold);
  assert.equal(row.defenses.reflex,old.printedFacts.defenses.reflex);
  assert.equal(row.defenses.fortitude,old.printedFacts.defenses.fortitude);
  assert.equal(row.defenses.damageReduction,old.printedFacts.defenses.damageReduction);
  if(typeof old.printedFacts.defenses.shieldRating==='number')assert.equal(row.defenses.shieldRating,old.printedFacts.defenses.shieldRating);
  assert.equal(row.combat.rangedAttackLine,old.printedFacts.combat.ranged);
  assert.equal(row.armament.firingGroups.length,(old.sourceAttackGroups||[]).length);
  assert.ok(!Object.hasOwn(row.armament,'weaponMounts'),old.sourceEntryKey);
  assert.equal(row.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  if(old.approvedEffectiveFacts)assert.ok(row.exceptions.ambiguities?.some(x=>x.toLowerCase().includes('approved effective')),old.sourceEntryKey);
 }
});
test('weapon attack group inventory carries all 258 old PDF-reviewed groups without claiming independent mounts or arcs',()=>{
 assert.equal(data.records.reduce((sum,r)=>sum+r.armament.firingGroups.length,0),258);
 assert.equal(data.counts.attackGroups,258);
 assert.equal(data.counts.strictWeaponMountsCertified,0);
 for(const row of data.records)for(const group of row.armament.firingGroups){
   assert.deepEqual(group.mountKeys,[]);
   assert.ok(group.specialNotes.includes('mounts/arcs uncertified'));
   assert.ok(group.label?.length>0);
 }
 const explicitlyUnarmed=ships.filter(x=>!(x.sourceAttackGroups||[]).length);
 assert.equal(explicitlyUnarmed.length,3);
 for(const old of explicitlyUnarmed){
  const row=byId.get(old.sourceEntryKey);
  assert.deepEqual(row.armament.firingGroups,[]);
  assert.equal(row.fieldStates['/armament/weaponMounts'],'explicitly-none');
 }
});
test('Escape Pod newly transcribed against PDF printed page 50, not a lifeboat template or invented weapon',()=>{
 const pod=byId.get('sotg-escape-pod');assert.ok(pod);
 assert.equal(pod.publication.page,50);
 assert.equal(pod.publication.printedTypeLine,'Huge starfighter');
 assert.equal(pod.challenge.cl,1);
 assert.deepEqual([pod.defenses.reflex,pod.defenses.fortitude,pod.durability.hitPoints,pod.durability.damageThreshold],[10,25,40,35]);
 assert.equal(pod.defenses.damageReduction,10);
 assert.deepEqual(pod.movement.speedModes.map(s=>s.squaresPerMove),[8,1]);
 assert.equal(pod.movement.maxVelocityKmh,250);
 assert.equal(pod.crew.crewCount,0);
 assert.equal(pod.capacity.passengerCount,8);
 assert.equal(pod.economics.priceNew.amountCredits,1200);
 assert.deepEqual(pod.armament.firingGroups,[]);
 assert.equal(pod.fieldStates['/armament/weaponMounts'],'explicitly-none');
});
test('known special identities remain one per printed statblock: hybrid, four stations, two variable-crew corvettes',()=>{
 assert.equal(data.records.filter(r=>r.classification.primaryCategory==='space-station').length,4);
 assert.equal(data.records.filter(r=>r.classification.mobilityDomains.some(d=>d.startsWith('ground'))&&r.classification.mobilityDomains.includes('space')).length,1);
 for(const [suffix,crew] of [['cr90-corvette',48],['cr70-corvette',30]]){
  const row=data.records.find(r=>r.identity.sourceEntryKey.endsWith(suffix));
  assert.ok(row);assert.equal(row.crew.crewCount,crew);
  assert.ok(row.crew.crewDescriptor.includes('Variable source crew'));
 }
});

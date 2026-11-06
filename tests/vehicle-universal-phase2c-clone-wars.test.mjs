import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='data/audits/vehicles/';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const staged=read(root+'swse-universal-phase2c-clone-wars-staged.json');
const provenance=read(root+'swse-universal-phase1c-clone-wars.json');
const fixtures=read(root+'swse-universal-phase2c-clone-wars-new-fixtures.json');
const schema=read(root+'swse-phase0b-vehicle.schema.json');
const ships=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(x=>x.sourceBook==='Clone Wars Campaign Guide');
const records=new Map(staged.records.map(x=>[x.identity.sourceEntryKey,x]));

function assertValid(value,node,path){
 if(node.$ref)return assertValid(value,schema.$defs[node.$ref.split('/').at(-1)],path);
 if(node.anyOf){let ok=false;for(const variant of node.anyOf){try{assertValid(value,variant,path);ok=true;break;}catch{}}assert.ok(ok,path+': no allowed variant');return;}
 if(Object.hasOwn(node,'const'))assert.deepEqual(value,node.const,path+': const');
 if(node.enum)assert.ok(node.enum.includes(value),path+': enum '+JSON.stringify(value));
 const types=node.type===undefined?[]:Array.isArray(node.type)?node.type:[node.type];
 if(types.length)assert.ok(types.some(t=>t==='null'?value===null:t==='integer'?Number.isInteger(value):t==='array'?Array.isArray(value):t==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):typeof value===t),path+': invalid type '+typeof value);
 if(typeof value==='string'&&node.minLength!==undefined)assert.ok(value.length>=node.minLength,path+': too short');
 if(Array.isArray(value)){if(node.minItems!==undefined)assert.ok(value.length>=node.minItems,path+': too few');if(node.maxItems!==undefined)assert.ok(value.length<=node.maxItems,path+': too many');if(node.items)value.forEach((v,i)=>assertValid(v,node.items,path+'['+i+']'));}
 if(value!==null&&typeof value==='object'&&!Array.isArray(value)){
  for(const key of node.required||[])assert.ok(Object.hasOwn(value,key),path+': missing '+key);
  for(const [key,v] of Object.entries(value)){
   if(node.properties?.[key])assertValid(v,node.properties[key],path+'.'+key);
   else if(node.additionalProperties===false)assert.fail(path+': unsupported '+key);
   else if(node.additionalProperties&&typeof node.additionalProperties==='object')assertValid(v,node.additionalProperties,path+'.'+key);
  }
 }
}

test('Clone Wars is all 67 source publication identities, without invented extras or duplicate hybrid/configuration variants',()=>{
 assert.equal(staged.records.length,67);
 assert.equal(ships.length,41);
 assert.equal(provenance.existingSpacecraft.length,41);
 assert.equal(provenance.newVehicleEntries.length,26);
 assert.equal(fixtures.records.length,26);
 assert.equal(records.size,67);
 assert.deepEqual([...records.keys()].sort(),[...provenance.existingSpacecraft,...provenance.newVehicleEntries].map(x=>x.sourceEntryKey).sort());
 assert.deepEqual(staged.summary,{publicationRecords:67,inheritedSpacecraft:41,newOtherVehicles:26,attackGroups:124,strictMountCertificationsNew:0,sourceBackedScannedNew:26});
 assert.equal(staged.sourcePdfSha256,provenance.sourcePdfSha256);
 assert.equal(staged.productionPacksChanged,false);assert.equal(staged.generatedActorsChanged,false);
});

test('all 67 staged records comply recursively with the existing universal draft v0.5 schema',()=>{
 for(const record of staged.records)assertValid(record,schema,record.identity.sourceEntryKey);
});

test('all 41 historical ships preserve printed facts, publication keys and weapon group counts without new mount authority',()=>{
 for(const source of ships){
  const row=records.get(source.sourceEntryKey);
  const claim=provenance.existingSpacecraft.find(e=>e.sourceEntryKey===source.sourceEntryKey);
  assert.ok(row,source.sourceEntryKey);
  assert.equal(row.identity.name,claim.printedName);
  assert.equal(row.publication.page,claim.printedStatblockStartPage);
  assert.equal(row.publication.printedTypeLine,source.printedFacts.type);
  assert.equal(row.challenge.cl,source.printedFacts.cl);
  assert.equal(row.durability.hitPoints,source.printedFacts.durability.hitPoints);
  assert.equal(row.durability.damageThreshold,source.printedFacts.durability.threshold);
  assert.equal(row.defenses.reflex,source.printedFacts.defenses.reflex);
  assert.deepEqual(row.classification.mobilityDomains,claim.classification.mobilityDomains);
  assert.equal(row.armament.firingGroups.length,(source.sourceAttackGroups||[]).length);
  assert.equal(row.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  assert.ok(!Object.hasOwn(row.armament,'weaponMounts'));
  if(source.approvedEffectiveFacts)assert.ok(row.exceptions.ambiguities?.length,source.sourceEntryKey);
 }
});

test('new 26 source evidence pairs each stable key with the exact printed page and mechanical headings',()=>{
 for(const [i,e] of provenance.newVehicleEntries.entries()){
  const spec=fixtures.records[i],row=records.get(e.sourceEntryKey);
  assert.equal(spec.sourceEntryKey,e.sourceEntryKey);
  assert.equal(spec.printedPage,e.printedStatblockStartPage);
  assert.equal(spec.pdfPhysicalPage,e.pdfPhysicalPage);
  assert.equal(spec.sourcePdfSha256,provenance.sourcePdfSha256);
  assert.equal(row.identity.name,e.printedName);
  assert.equal(row.publication.page,e.printedStatblockStartPage);
  assert.equal(row.publication.printedTypeLine,e.printedTypeLine);
  assert.equal(row.challenge.cl,spec.c);
  assert.equal(row.durability.hitPoints,spec.hp);
  assert.equal(row.durability.damageThreshold,spec.dt);
  assert.equal(row.defenses.reflex,spec.ref);
  assert.equal(row.defenses.fortitude,spec.fort);
  assert.equal(row.abilities.str,spec.ab[0]);
  assert.equal(row.abilities.dex,spec.ab[1]);
  assert.equal(row.abilities.int,spec.ab[2]);
  assert.equal(row.armament.firingGroups.length,spec.weapons.length);
  assert.equal(row.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  assert.ok(!Object.hasOwn(row.armament,'weaponMounts'));
 }
});

test('printed special cases are conserved without splitting one source statblock into multiple vehicles',()=>{
 const atap=records.get('cw-all-terrain-attack-pod-at-ap');
 assert.equal(atap.crew.crewCount,3);assert.equal(atap.durability.hitPoints,180);
 const atrt=records.get('cw-all-terrain-recon-transport-at-rt');
 assert.equal(atrt.durability.hitPoints,60);assert.equal(atrt.defenses.fortitude,16);
 const barc=records.get('cw-barc-speeder');assert.equal(barc.durability.hitPoints,45);
 const spha=records.get('cw-self-propelled-heavy-artillery');
 assert.equal(spha.challenge.cl,16);assert.equal(spha.armament.firingGroups.length,6);
 assert.ok(spha.text.mechanicalNotes.includes('mutually exclusive'));
 assert.equal(staged.records.filter(x=>x.identity.sourceEntryKey==='cw-self-propelled-heavy-artillery').length,1);
 const manta=records.get('cw-manta-droid-subfighter');
 assert.ok(manta.classification.mobilityDomains.some(x=>x.includes('water')));
 assert.ok(!manta.classification.mobilityDomains.includes('space'));
 const gr=records.get('cw-grievous-wheel-bike-modified-tsmeu-6');
 const stock=records.get('cw-tsmeu-6-personal-wheel-bike');
 assert.equal(gr.capacity.passengerCount,0);assert.equal(stock.capacity.passengerCount,1);
 assert.equal(gr.armament.firingGroups.length,1);assert.equal(stock.armament.firingGroups.length,0);
 assert.ok(gr.movement.speedModes.some(x=>x.mode==='walking'&&x.squaresPerMove===6));
 assert.ok(stock.movement.speedModes.some(x=>x.mode==='walking'&&x.squaresPerMove===6));
 const water=records.get('cw-oevvaor-jet-catamaran');
 assert.equal(water.movement.maxVelocityKmh,370);assert.equal(water.classification.primaryCategory,'water-speeder');
 const dc=records.get('cw-daystar-dc0052-intergalactic-speeder');
 assert.equal(dc.challenge.cl,1);assert.equal(dc.capacity.cargo.value,3);assert.equal(dc.armament.firingGroups.length,0);
 assert.equal(dc.capacity.consumables,null);
 const gnasp=records.get('cw-raddaugh-gnasp-fluttercraft');
 assert.equal(gnasp.combat.rangedAttackLine,'laser cannon tail-gun +7');
 assert.equal(gnasp.armament.firingGroups[0].attackBonusPrinted,5);
});

test('all source attack groups remain non-executable, retaining printed operator and damage evidence',()=>{
 assert.equal(ships.reduce((sum,x)=>sum+(x.sourceAttackGroups?.length||0),0),79);
 assert.equal(fixtures.records.reduce((sum,x)=>sum+x.weapons.length,0),45);
 assert.equal(staged.records.reduce((sum,x)=>sum+x.armament.firingGroups.length,0),124);
 for(const row of staged.records)for(const group of row.armament.firingGroups){
  assert.deepEqual(group.mountKeys,[]);
  assert.ok(group.specialNotes.includes('Physical mounts, arcs'));
  assert.ok(group.label.length);
 }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const dir='data/audits/vehicles/';
const json=path=>JSON.parse(readFileSync(path,'utf8'));
const stage=json(dir+'swse-universal-phase2e-force-unleashed-staged.json');
const provenance=json(dir+'swse-universal-phase1e-force-unleashed.json');
const fixtures=json(dir+'swse-universal-phase2e-force-unleashed-new-fixtures.json');
const schema=json(dir+'swse-phase0b-vehicle.schema.json');
const historical=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(r=>r.sourceBook==='Force Unleashed Campaign Guide');
const keyed=new Map(stage.records.map(x=>[x.identity.sourceEntryKey,x]));

function check(value,node,path){
 if(node.$ref)return check(value,schema.$defs[node.$ref.split('/').at(-1)],path);
 if(node.anyOf){for(const x of node.anyOf){try{check(value,x,path);return;}catch{}}assert.fail(path+': union mismatch');}
 if(Object.hasOwn(node,'const'))assert.deepEqual(value,node.const,path+'.const');
 if(node.enum)assert.ok(node.enum.includes(value),path+': enum mismatch '+String(value));
 const ts=node.type===undefined?[]:Array.isArray(node.type)?node.type:[node.type];
 if(ts.length)assert.ok(ts.some(t=>t==='null'?value===null:t==='integer'?Number.isInteger(value):t==='array'?Array.isArray(value):t==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):typeof value===t),path+': type mismatch');
 if(typeof value==='string'&&node.minLength!==undefined)assert.ok(value.length>=node.minLength,path+': minLength');
 if(Array.isArray(value)){if(node.minItems!==undefined)assert.ok(value.length>=node.minItems,path+': minItems');if(node.maxItems!==undefined)assert.ok(value.length<=node.maxItems,path+': maxItems');if(node.items)value.forEach((v,i)=>check(v,node.items,path+'['+i+']'));}
 if(value!==null&&typeof value==='object'&&!Array.isArray(value)){
  for(const k of node.required||[])assert.ok(Object.hasOwn(value,k),path+': missing '+k);
  for(const [k,v] of Object.entries(value)){if(node.properties?.[k])check(v,node.properties[k],path+'.'+k);else if(node.additionalProperties===false)assert.fail(path+': unexpected '+k);else if(node.additionalProperties&&typeof node.additionalProperties==='object')check(v,node.additionalProperties,path+'.'+k);}
 }
}

test('Force Unleashed entire publication census is 34 distinct frozen identities: 19 ships and 15 new',()=>{
 assert.equal(stage.records.length,34);assert.equal(keyed.size,34);
 assert.equal(historical.length,19);
 assert.equal(provenance.existingSpacecraft.length,19);
 assert.equal(provenance.newVehicleEntries.length,15);
 assert.equal(fixtures.records.length,15);
 assert.deepEqual([...keyed.keys()].sort(),[...provenance.existingSpacecraft,...provenance.newVehicleEntries].map(x=>x.sourceEntryKey).sort());
 assert.deepEqual(stage.summary,{publicationRecords:34,inheritedSpacecraft:19,newGroundAirMilitaryVehicles:15,sourceAttackGroups:58,strictMountCertificationsNew:0,pdfVisualNew:15,pendingSpecialRuleRecords:15});
 assert.equal(stage.sourcePdfSha256,provenance.sourcePdfSha256);
 assert.equal(fixtures.sourcePdfSha256,provenance.sourcePdfSha256);
 assert.equal(stage.productionPacksChanged,false);assert.equal(stage.generatedActorsChanged,false);
});

test('each of 34 universal records validates recursively against draft v0.5 schema',()=>{
 for(const r of stage.records)check(r,schema,r.identity.sourceEntryKey);
});

test('all 19 historical spacecraft remain byte-source-identity matched and mechanically tied to prior source authority',()=>{
 for(const source of historical){
  const r=keyed.get(source.sourceEntryKey),p=source.printedFacts;
  const ledgerRow=provenance.existingSpacecraft.find(x=>x.sourceEntryKey===source.sourceEntryKey);
  assert.ok(r,source.sourceEntryKey);assert.ok(ledgerRow,source.sourceEntryKey);
  assert.equal(r.identity.name,source.name);
  assert.equal(r.publication.page,source.printedPage);
  assert.equal(r.publication.printedTypeLine,p.type);
  assert.deepEqual(r.classification.mobilityDomains,ledgerRow.classification.mobilityDomains);
  assert.equal(r.challenge.cl,p.cl);
  assert.equal(r.defenses.reflex,p.defenses.reflex);
  assert.equal(r.defenses.fortitude,p.defenses.fortitude);
  assert.equal(r.defenses.damageReduction,p.durability.damageReduction);
  assert.equal(r.durability.hitPoints,p.durability.hitPoints);
  assert.equal(r.durability.damageThreshold,p.durability.threshold);
  assert.equal(r.combat.baseAttackBonusPrinted,p.combat.baseAttackBonus);
  assert.equal(r.combat.grappleBonusPrinted,p.combat.grappleBonus);
  assert.equal(r.armament.firingGroups.length,source.sourceAttackGroups.length);
  assert.equal(r.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  assert.ok(!Object.hasOwn(r.armament,'weaponMounts'));
  if(source.sourceConflicts?.length)assert.equal(r.exceptions.ambiguities.length,source.sourceConflicts.length);
 }
});

test('15 primary scan fixtures bind exact source key, printed page, classification and mechanics',()=>{
 for(const [i,claim] of provenance.newVehicleEntries.entries()){
  const s=fixtures.records[i],r=keyed.get(claim.sourceEntryKey);
  assert.ok(r,claim.sourceEntryKey);
  assert.equal(s.sourceEntryKey,claim.sourceEntryKey);
  assert.equal(s.printedPage,claim.printedStatblockStartPage);
  assert.equal(s.pdfPhysicalPage,claim.pdfPhysicalPage);
  assert.equal(s.sourcePdfSha256,provenance.sourcePdfSha256);
  assert.equal(r.publication.printedTypeLine,claim.printedTypeLine);
  assert.equal(r.identity.name,claim.printedName);
  assert.equal(r.challenge.cl,s.cl);
  assert.equal(r.durability.hitPoints,s.hp);
  assert.equal(r.durability.damageThreshold,s.dt);
  assert.equal(r.defenses.reflex,s.def[0]);
  assert.equal(r.defenses.reflexFlatFooted,s.def[1]);
  assert.equal(r.defenses.fortitude,s.def[2]);
  assert.equal(r.defenses.damageReduction,s.dr);
  assert.equal(r.abilities.str,s.abi[0]);
  assert.equal(r.abilities.dex,s.abi[1]);
  assert.equal(r.abilities.int,s.abi[2]);
  assert.equal(r.crew.crewCount,s.crew);
  assert.equal(r.capacity.passengerCount,s.pass);
  assert.equal(r.armament.firingGroups.length,s.weapons.length);
  assert.equal(r.movement.maxVelocityKmh,s.km);
  assert.deepEqual(r.classification.mobilityDomains,claim.classification.mobilityDomains);
  assert.equal(r.rules.reviewStatus,'partial-source-probe');
 }
});

test('printed competing readings and stock/optional distinctions stay visible, not auto-resolved',()=>{
 const armored=keyed.get('fucg-armored-groundcar');
 assert.equal(armored.classification.primaryCategory,'wheeled-groundcar');
 assert.equal(armored.abilities.initiativePrinted,10);
 assert.equal(armored.abilities.skills.find(s=>s.name==='Initiative').printedModifier,8);
 const truck=keyed.get('fucg-a-a5-speeder-truck');
 assert.equal(truck.abilities.initiativePrinted,3);
 assert.equal(truck.abilities.skills.find(s=>s.name==='Initiative').printedModifier,-3);
 assert.equal(truck.capacity.cargo.value,25);
 assert.deepEqual([truck.geometry.characterScaleWidthSquares,truck.geometry.starshipScaleWidthSquares],[4,1]);
 assert.equal(truck.movement.speedModes.length,1);
 const escort=keyed.get('fucg-modified-sorosuub-x-34-speeder-escort');
 assert.equal(escort.abilities.initiativePrinted,3);
 assert.equal(escort.abilities.skills.find(s=>s.name==='Initiative').printedModifier,9);
 const fre=keyed.get('fucg-kaac-freerunner');
 assert.equal(fre.armament.firingGroups.length,2);
 assert.ok(fre.combat.rangedAttackLine.includes('blaster cannons +3'));
 assert.equal(fre.armament.firingGroups[1].attackBonusPrinted,4);
 const zephyr=keyed.get('fucg-zephyr-g-swoop');
 assert.equal(zephyr.capacity.cargo.value,100);
 assert.ok(zephyr.exceptions.unmappedFacts.some(x=>x.includes('stock models have no cargo')));
 const flare=keyed.get('fucg-flare-s-swoop');
 assert.ok(!Object.hasOwn(flare.defenses,'shieldRating'));
 assert.ok(flare.text.mechanicalNotes.includes('SR 5'));
 const tx=keyed.get('fucg-tx-130t-fighter-tank');
 assert.equal(tx.defenses.shieldRating,5);
 assert.ok(tx.combat.rangedAttackLine.includes('+1'));
 assert.deepEqual(tx.armament.firingGroups.map(x=>x.attackBonusPrinted),[2,2]);
});

test('military modes and independent source identities remain distinct and non-executable',()=>{
 const a5=keyed.get('fucg-a5-juggernaut');
 assert.deepEqual(a5.classification.mobilityDomains,['ground-wheeled']);
 assert.deepEqual([a5.geometry.characterScaleWidthSquares,a5.geometry.characterScaleLengthSquares],[6,14]);
 const kt=keyed.get('fucg-at-kt'),ct=keyed.get('fucg-at-ct');
 assert.equal(kt.challenge.cl,10);assert.equal(ct.challenge.cl,10);
 assert.equal(kt.defenses.fortitude,20);assert.equal(ct.defenses.fortitude,23);
 assert.equal(kt.armament.firingGroups.length,2);
 assert.equal(ct.armament.firingGroups.length,1);
 assert.ok(ct.text.mechanicalNotes.includes('throw'));
 const base=keyed.get('fucg-mobile-command-base');
 assert.deepEqual(base.classification.mobilityDomains,['ground-tracked']);
 assert.equal(base.durability.hitPoints,270);
 assert.equal(base.economics.priceNew.status,'not-for-sale');
 const command=keyed.get('fucg-command-speeder');
 assert.ok(command.economics.notes.includes('40000'));
 const stock74=keyed.get('fucg-aratech-74-z-speeder-bike');
 assert.equal(stock74.publication.page,142);
 assert.notEqual(stock74.identity.sourceEntryKey,'core-aratech-74-z-speeder-bike');
});

test('all 58 source attack groups have no physical mount keys or executable binding',()=>{
 assert.equal(historical.reduce((n,s)=>n+s.sourceAttackGroups.length,0),41);
 assert.equal(fixtures.records.reduce((n,s)=>n+s.weapons.length,0),17);
 assert.equal(stage.records.reduce((n,s)=>n+s.armament.firingGroups.length,0),58);
 for(const r of stage.records)for(const w of r.armament.firingGroups){assert.deepEqual(w.mountKeys,[]);assert.ok(w.specialNotes.includes('Physical mounts, arcs'));assert.ok(w.label.length>0);}
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='data/audits/vehicles/';
const json=path=>JSON.parse(readFileSync(path,'utf8'));
const specs=[
 ['h','galaxy-of-intrigue','Galaxy of Intrigue',8,6,2],
 ['i','jedi-academy-training-manual','Jedi Academy Training Manual',1,1,0],
 ['j','legacy-era-campaign-guide','Legacy Era Campaign Guide',49,39,10],
 ['k','rebellion-era-campaign-guide','Rebellion Era Campaign Guide',53,35,18],
 ['l','threats-of-the-galaxy','Threats of the Galaxy',5,1,4],
 ['m','unknown-regions','Unknown Regions',26,12,13],
 ['n','scavengers-guide-to-droids',"Scavenger's Guide to Droids",1,0,1],
];
const datasets=specs.map(([letter,slug,book,total,old,newCount])=>({
 letter,slug,book,total,old,newCount,
 stage:json(root+'swse-universal-phase2'+letter+'-'+slug+'-staged.json'),
 phase1:json(root+'swse-universal-phase1'+letter+'-'+slug+'.json'),
}));
const schema=json(root+'swse-phase0b-vehicle.schema.json');
const canonical=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse);

function assertSchema(value,node,path){
 if(node.$ref)return assertSchema(value,schema.$defs[node.$ref.split('/').at(-1)],path);
 if(node.anyOf){for(const branch of node.anyOf){try{assertSchema(value,branch,path);return;}catch{}}assert.fail(path+': no matching schema variant');}
 if(Object.hasOwn(node,'const'))assert.deepEqual(value,node.const,path+' const');
 if(node.enum)assert.ok(node.enum.includes(value),path+' enum');
 const t=node.type===undefined?[]:Array.isArray(node.type)?node.type:[node.type];
 if(t.length)assert.ok(t.some(type=>type==='null'?value===null:type==='integer'?Number.isInteger(value):type==='array'?Array.isArray(value):type==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):typeof value===type),path+': incompatible type');
 if(typeof value==='string'&&node.minLength!==undefined)assert.ok(value.length>=node.minLength,path+': minLength');
 if(Array.isArray(value)){if(node.minItems!==undefined)assert.ok(value.length>=node.minItems,path+': minItems');if(node.maxItems!==undefined)assert.ok(value.length<=node.maxItems,path+': maxItems');value.forEach((v,i)=>node.items&&assertSchema(v,node.items,path+'['+i+']'));}
 else if(value!==null&&typeof value==='object'){
   for(const k of node.required||[])assert.ok(Object.hasOwn(value,k),path+': missing '+k);
   for(const [k,v] of Object.entries(value)){
     if(node.properties?.[k])assertSchema(v,node.properties[k],path+'.'+k);
     else if(node.additionalProperties===false)assert.fail(path+': unknown property '+k);
     else if(node.additionalProperties&&typeof node.additionalProperties==='object')assertSchema(v,node.additionalProperties,path+'.'+k);
   }
 }
}
test('remaining seven books hold exactly 143 publication record identities, with matching frozen census and no duplicate book keys',()=>{
 assert.equal(datasets.reduce((sum,x)=>sum+x.stage.records.length,0),143);
 const keys=[];
 for(const d of datasets){
  assert.equal(d.phase1.sourceBook,d.book);
  assert.equal(d.stage.sourceBook,d.book);
  assert.equal(d.stage.records.length,d.total,d.book);
  assert.equal(d.phase1.existingSpacecraft.length,d.old,d.book);
  assert.equal(d.phase1.newVehicleEntries.length,d.newCount,d.book);
  const other=d.phase1.approvedSupplementalSpacecraft||[];
  assert.equal(other.length,d.total-d.old-d.newCount,d.book);
  assert.equal(d.stage.sourcePdfSha256,d.phase1.sourcePdfSha256);
  assert.equal(d.stage.productionPacksChanged,false);
  assert.equal(d.stage.generatedActorsChanged,false);
  const expected=[...d.phase1.existingSpacecraft,...other,...d.phase1.newVehicleEntries];
  assert.deepEqual(d.stage.records.map(r=>r.identity.sourceEntryKey).sort(),expected.map(e=>e.sourceEntryKey).sort(),d.book);
  keys.push(...d.stage.records.map(r=>r.identity.sourceEntryKey));
 }
 assert.equal(new Set(keys).size,143);
});
test('all 143 new source records satisfy the existing draft v0.5 nested JSON schema, preserving non-equivalence of unknown and zero',()=>{
 for(const d of datasets)for(const r of d.stage.records){
  assertSchema(r,schema,r.identity.sourceEntryKey);
  assert.equal(r.publication.book,d.book);
  assert.ok(r.publication.page>0);
  assert.ok(Number.isInteger(r.challenge.cl)&&r.challenge.cl>=0,r.identity.sourceEntryKey+': missing CL');
  assert.ok(Number.isInteger(r.durability.hitPoints)&&r.durability.hitPoints>0,r.identity.sourceEntryKey+': missing printed HP');
  assert.ok(Number.isInteger(r.defenses.reflex)&&r.defenses.reflex>0,r.identity.sourceEntryKey+': missing printed Ref');
  assert.equal(r.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  assert.equal(r.rules.reviewStatus,'partial-source-probe');
  assert.equal(Object.hasOwn(r.armament,'weaponMounts'),false);
  for(const a of r.armament.firingGroups){
   assert.deepEqual(a.mountKeys,[]);
   assert.ok(a.label?.length);
  }
 }
});
test('historical spacecraft remain linked by identical source keys and do not mutate canonical ship authority',()=>{
 for(const d of datasets){
   const historical=canonical.filter(x=>x.sourceBook===d.book);
   assert.equal(historical.length,d.old,d.book);
   for(const x of historical){
     const r=d.stage.records.find(y=>y.identity.sourceEntryKey===x.sourceEntryKey);
     assert.ok(r,x.sourceEntryKey);
     assert.equal(r.challenge.cl,x.printedFacts.cl??x.printedFacts.challengeLevel,x.sourceEntryKey);
     assert.equal(r.armament.firingGroups.length,(x.sourceAttackGroups||[]).length,x.sourceEntryKey);
   }
 }
});
test('specific printed anomalies and statblock identities survive source staging without inventing gameplay mechanics',()=>{
 const lookup=(letter,id)=>datasets.find(x=>x.letter===letter).stage.records.find(x=>x.identity.sourceEntryKey===id);
 const bantha=lookup('k','re-bantha-ii-cargo-skiff');
 assert.deepEqual([bantha.challenge.cl,bantha.durability.hitPoints,bantha.capacity.passengerCount],[3,60,16]);
 assert.equal(bantha.abilities.str,34);
 assert.equal(bantha.armament.firingGroups.length,0);
 const air=lookup('k','re-air-2-swoop');
 assert.equal(air.durability.hitPoints,50);assert.equal(air.defenses.reflex,16);
 assert.equal(air.movement.speedModes[0].squaresPerMove,16);
 const cand=lookup('k','re-canderous-class-assault-tank');
 assert.equal(cand.durability.hitPoints,250);assert.equal(cand.defenses.shieldRating,10);
 const crawler=lookup('k','re-tie-crawler');
 assert.deepEqual([crawler.challenge.cl,crawler.durability.hitPoints,crawler.armament.firingGroups.length],[6,60,2]);
 const wheel=lookup('j','le-the-wheel');
 assert.equal(wheel.challenge.cl,19);assert.equal(wheel.durability.hitPoints,2900);
 const jatm=lookup('i','jatm-chu-unthor');
 assert.equal(jatm.challenge.cl,15);assert.equal(jatm.durability.hitPoints,2800);
 const ferr=lookup('h','goi-republic-engineering-corporation-ferret-class-reconnaissance-vessel');
 assert.deepEqual([ferr.challenge.cl,ferr.durability.hitPoints,ferr.defenses.reflex],[12,120,15]);
 const prow=lookup('h','goi-republic-engineering-corporation-prowler-class-reconnaissance-vessel');
 assert.deepEqual([prow.challenge.cl,prow.durability.hitPoints,prow.defenses.reflex],[12,150,16]);
 const probe=lookup('n','sgtd-dp-2-probe-droid');
 assert.equal(probe.challenge.cl,6);assert.ok(probe.classification.mobilityDomains.length);
 const ur=datasets.find(x=>x.letter==='m');
 assert.equal(ur.stage.records.length,26);
 assert.equal((ur.phase1.approvedSupplementalSpacecraft||[]).length,1);
});
test('all 429 known publication claims have a stage-data source record across all 14 books',()=>{
 const earlier=[
  root+'swse-universal-phase2a-core-rulebook-staged.json',
  root+'swse-universal-phase2b-starships-of-the-galaxy-staged.json',
  root+'swse-universal-phase2c-clone-wars-staged.json',
  root+'swse-universal-phase2d-kotor-staged.json',
  root+'swse-universal-phase2e-force-unleashed-staged.json',
  root+'swse-universal-phase2f-scum-and-villainy-staged.json',
  root+'swse-universal-phase2g-galaxy-at-war-staged.json'];
 const data=earlier.map(json),counts=data.map(d=>d.records.length);
 assert.deepEqual(counts,[17,105,67,39,34,13,11]);
 assert.equal(counts.reduce((a,b)=>a+b,0),286);
 const all=data.flatMap(d=>d.records).concat(datasets.flatMap(d=>d.stage.records));
 assert.equal(all.length,429);
 assert.equal(new Set(all.map(r=>r.identity.sourceEntryKey)).size,429);
});

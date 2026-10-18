import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PILOT_SOURCE_DOCUMENTS,verifyPilotVehiclePacksAtRuntime}
  from '../scripts/domain/vehicles/vehicle-cp9b-runtime-pack-verifier.js';

const inputs={};
for(const file of ['vehicles-space-transports','vehicles-capital-ships']){
  inputs[file]=readFileSync(new URL('../packs/'+file+'.db',import.meta.url),'utf8')
    .trim().split(/\r?\n/).map(JSON.parse);
}
function simulatedGame(overrides={}) {
  const map=new Map();
  for(const spec of PILOT_SOURCE_DOCUMENTS){
    const id=spec.pack.split('.').at(-1);
    const row=structuredClone(inputs[id].find(x=>x._id===spec.id));
    const doc={...row,id:row._id,uuid:'Compendium.'+spec.pack+'.'+row._id};
    if(!map.has(spec.pack))map.set(spec.pack,new Map());
    map.get(spec.pack).set(doc.id,doc);
  }
  for(const [pack,records] of map)for(const [id,doc] of records){
    if(overrides[doc.id])overrides[doc.id](doc,records);
  }
  return {packs:{get:name=>map.has(name)?{getDocument:async id=>map.get(name).get(id)??null}:null}};
}
test('installed full pilot compendium docs match source fields but grant no world clone authority',async()=>{
  const x=await verifyPilotVehiclePacksAtRuntime(simulatedGame());
  assert.equal(x.sourceDocumentsMatched,4);
  assert.equal(x.allFourPackDocumentsMatch,true);
  assert.equal(x.actorInstanceBindingAuthorized,false);
  assert.equal(x.strictStockAttackGroupsAuthorized,0);
});
test('missing Foundry pack fails closed even if source .db contains the ship',async()=>{
  const x=await verifyPilotVehiclePacksAtRuntime({packs:{get:()=>null}});
  assert.equal(x.sourceDocumentsMatched,0);
  assert.equal(x.allFourPackDocumentsMatch,false);
});
test('editable flags or names cannot stand in for a real compendium record',async()=>{
  const x=await verifyPilotVehiclePacksAtRuntime(simulatedGame({
    '4d5b3422047f5eb8':(doc)=>{doc.system.weapons[0].firingArc='turret';}
  }));
  assert.equal(x.allFourPackDocumentsMatch,false);
  assert.equal(x.sourceDocumentsMatched,3);
  assert.equal(x.results.find(r=>r.id==='4d5b3422047f5eb8').reason,'SOURCE_FIELD_PROBE_MISMATCH');
});
test('published no-carried-craft is explicit None rather than null',async()=>{
  const x=await verifyPilotVehiclePacksAtRuntime(simulatedGame({
    '97c5c070d93b7a0a':(doc)=>{doc.system.carried_craft=null;}
  }));
  assert.equal(x.allFourPackDocumentsMatch,false);
});

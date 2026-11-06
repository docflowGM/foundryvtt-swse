import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PILOT_SOURCE_DOCUMENTS} from '../scripts/domain/vehicles/vehicle-cp9b-runtime-pack-verifier.js';
import {probeControlledVehicleImport} from '../scripts/domain/vehicles/vehicle-cp9c-actor-provenance-probe.js';

function fixture(id='4d5b3422047f5eb8'){
  const claim=PILOT_SOURCE_DOCUMENTS.find(x=>x.id===id);
  const file=claim.pack.endsWith('vehicles-capital-ships')?'vehicles-capital-ships':'vehicles-space-transports';
  const source=readFileSync(new URL('../packs/'+file+'.db',import.meta.url),'utf8').trim()
    .split(/\r?\n/).map(JSON.parse).find(x=>x._id===id);
  const doc={...structuredClone(source),id,pack:claim.pack};
  const actor={...structuredClone(source),id:'NEW_WORLD_VEHICLE',name:'Player Callsign',items:[],
    system:structuredClone(source.system)};
  const packs=new Map([[claim.pack,{getDocument:async n=>n===id?doc:null}]]);
  const game={actors:{get:n=>n===actor.id?actor:null},packs:{get:n=>packs.get(n)??null}};
  return {actor,doc,game,claim};
}
const check=(f,mode='replace')=>probeControlledVehicleImport({
  actor:f.actor,sourceDocument:f.doc,game:f.game,mode
});
test('real pack document and matching installed group pass inspection but never authorize a stock attack',async()=>{
  const f=fixture(),result=await check(f);
  assert.equal(result.verified,true);
  assert.equal(result.physicalStockGroups,1);
  assert.equal(result.stockAttackAuthorityGranted,false);
  assert.equal(result.operationalCertification,false);
});
test('all three source-certified unarmed ships preserve explicit empty weapons',async()=>{
  for(const id of PILOT_SOURCE_DOCUMENTS.filter(x=>x.weapons===0).map(x=>x.id)){
    const f=fixture(id),result=await check(f);
    assert.equal(result.verified,true,id+':'+result.reason);
    assert.equal(result.physicalStockGroups,0);
  }
});
test('merge cannot authenticate replacement provenance',async()=>{
  const f=fixture();
  assert.equal((await check(f,'merge')).reason,'REPLACE_REQUIRED_MERGE_NOT_SOURCE_IDENTITY');
});
test('forge source document outside registered pack cannot authenticate import',async()=>{
  const f=fixture(),fake={...f.doc};
  const result=await probeControlledVehicleImport({actor:f.actor,sourceDocument:fake,game:f.game,mode:'replace'});
  assert.equal(result.reason,'SOURCE_DOCUMENT_NOT_PACK_IDENTITY');
});
test('match actor source key but change mount identity, arc or station must block',async()=>{
  for(const [key,value] of [['mountId','fake'],['firingArc','turret'],['operatorStation','pilot'],['printedAttackTotal','+42']]){
    const f=fixture();f.actor.system.weapons[0][key]=value;
    const result=await check(f);
    assert.equal(result.verified,false,key);
    assert.match(result.reason,/INSTALLED_PHYSICAL_GROUP_DRIFT/,key);
  }
});
test('extra owned weapons, even identical name, prevent clean stock snapshot classification',async()=>{
  const f=fixture();f.actor.items=[{id:'legacy-copy',name:'Double Laser Cannons',type:'weapon',system:{mounted:true}}];
  assert.equal((await check(f)).reason,'OWNED_WEAPON_ITEM_REQUIRES_RECONCILIATION');
});
test('editable stock actor key never substitutes for a missing live compendium pack',async()=>{
  const f=fixture();f.game.packs.get=()=>null;
  assert.equal((await check(f)).reason,'SOURCE_PACK_NOT_REGISTERED');
});
test('unknown values retain their null semantics and published None is not null',async()=>{
  const f=fixture('97c5c070d93b7a0a');
  assert.equal(f.actor.system.vehicleHasNavicomputer,null);
  f.actor.system.carried_craft=null;
  assert.equal((await check(f)).reason,'PUBLISHED_CARRIED_CRAFT_ABSENCE_MISMATCH');
});
test('import wizard records only read-only diagnostics, not writable stock permission flags',()=>{
  const code=readFileSync(new URL('../scripts/apps/vehicle-import-wizard.js',import.meta.url),'utf8');
  assert.match(code,/await probeControlledVehicleImport/);
  assert.doesNotMatch(code,/setFlag\(.*(?:stock|trusted|certified)/);
  const authority=readFileSync(new URL('../scripts/domain/vehicles/vehicle-stock-attack-authority.js',import.meta.url),'utf8');
  assert.match(authority,/TRUSTED_STOCK_WEAPON_GROUP_COUNT = 0/);
});
test('VehicleImportEngine retains source-only evidence without a legacy overlay',()=>{
  const code=readFileSync(new URL('../scripts/engine/import/vehicle-import-engine.js',import.meta.url),'utf8');
  assert.match(code,/const universal=sourceActor\.flags\?\.swse\?\.universalVehicleSource;/);
  assert.match(code,/system:duplicate\(system\),/);
  assert.match(code,/'flags\.swse\.universalVehicleSource':duplicate\(universal\)/);
  assert.match(code,/Array\.isArray\(system\?\.weapons\)&&system\.weapons\.length===0/);
  assert.doesNotMatch(code,/normalizeVehicleImportData\(/);
});

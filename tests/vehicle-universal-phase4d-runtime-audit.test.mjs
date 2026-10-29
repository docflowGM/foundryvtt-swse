import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {UNIVERSAL_VEHICLE_PACKS} from '../scripts/domain/vehicles/universal-vehicle-pack-registry.js';
import {
  VEHICLE_4D_EXPECTED_COUNT, auditUniversalVehicleActor,
  auditUniversalVehicleRuntime, openUniversalVehicleSampleSheet
} from '../scripts/domain/vehicles/vehicle-phase4d-runtime-audit.js';

const COUNTS={
  'vehicles-starfighters':132,'vehicles-space-transports':101,'vehicles-capital-ships':84,
  'vehicles-stations':8,'vehicles-walkers':15,'vehicles-airspeeders':20,
  'vehicles-speeders':41,'vehicles-tracked':10,'vehicles-wheeled':9,
  'vehicles-ground-armor':7,'vehicles-hybrids':2
};
const clone=x=>structuredClone(x);
function actor(pack,key,id,{initiative=-5,shield=null}={}){
  const book='Mock Source',page=81;
  const source={
    recordType:'vehicle-source-entry',identity:{sourceEntryKey:key},
    publication:{book,page},classification:{primaryCategory:pack.categories[0]},
    abilities:{initiativePrinted:initiative},
    durability:{hitPoints:125},defenses:{reflex:16,fortitude:28,shieldRating:shield},
    armament:{firingGroups:[{mountKeys:[]}]}
  };
  const sys={
    vehicleSourceEntryKey:key,vehicleSourceBook:book,vehicleSourcePage:page,
    vehiclePackName:pack.name,vehicleSourcePrimaryCategory:pack.categories[0],
    initiative,hp:{value:125,max:125},reflexDefense:16,fortitudeDefense:28,
    weapons:[],vehiclePublishedShieldStatus:shield===null?'unknown':'published'
  };
  if(shield!==null){sys.shieldRating=shield;sys.shields={value:shield,max:shield};}
  const raw={
    _id:id,name:key,type:'vehicle',system:sys,items:[],effects:[],
    flags:{swse:{
      canonicalPublication:{
        sourceEntryKey:key,sourceBook:book,printedPage:page,
        sourceCertification:'SOURCE_ONLY',
        foundryStockAttackTrusted:false,physicalMountCertification:false
      },
      universalVehicleSource:{schema:'swse.vehicle.universal.actor-source.v1',source}
    }}
  };
  return {...raw,id, toObject(){return clone(raw);}};
}
function mockGame({skip=null,reduce=null,override=null,generation=13,gm=true,mapIndex=false}={}){
  const packs=new Map();
  let global=0;
  for(const p of UNIVERSAL_VEHICLE_PACKS){
    if(p.name===skip)continue;
    const docs=Array.from({length:COUNTS[p.name]},(_,i)=>
      actor(p,'phase4d-'+String(global++).padStart(4,'0'),String(global).padStart(16,'0')));
    if(reduce===p.name)docs.pop();
    if(override?.pack===p.name)override.change(docs);
    const byId=new Map(docs.map(x=>[x.id,x]));
    packs.set('foundryvtt-swse.'+p.name,{
      documentName:'Actor',
      async getIndex(){const data=docs.map(d=>({_id:d._id,system:clone(d.system),name:d.name}));return mapIndex?new Map(data.map(x=>[x._id,x])):data;},
      async getDocument(id){return byId.get(id)??null;}
    });
  }
  return {user:{isGM:gm},system:{id:'foundryvtt-swse'},release:{generation},packs};
}

test('Phase 4D inspector has exactly eleven required packs and 429 required docs',()=>{
  assert.equal(UNIVERSAL_VEHICLE_PACKS.length,11);
  assert.equal(Object.values(COUNTS).reduce((a,b)=>a+b,0),VEHICLE_4D_EXPECTED_COUNT);
});
test('one Actor document validates numeric negative Initiative and unknown shield',()=>{
  const a=actor(UNIVERSAL_VEHICLE_PACKS[0],'mock-one','0123456789abcdef');
  const r=auditUniversalVehicleActor(a,{packName:UNIVERSAL_VEHICLE_PACKS[0].name,sourceKey:'mock-one'});
  assert.equal(r.certified,true);
  assert.equal(r.publishedInitiative,-5);
  assert.equal(r.shieldStatus,'unknown');
  const b=clone(a.toObject());
  b.system.shields={value:0,max:0};b.system.shieldRating=0;
  assert.equal(auditUniversalVehicleActor(b,{packName:UNIVERSAL_VEHICLE_PACKS[0].name}).certified,true);
  b.system.shields.max=25;
  assert.equal(auditUniversalVehicleActor(b,{packName:UNIVERSAL_VEHICLE_PACKS[0].name}).errors.some(e=>e.code==='UNKNOWN_SR_COERCED'),true);
});
test('source-only attacks and published defenses cannot be falsified',()=>{
  const p=UNIVERSAL_VEHICLE_PACKS[0];
  const a=actor(p,'mock-two','0123456789abcdef',{shield:0});
  assert.equal(auditUniversalVehicleActor(a,{packName:p.name}).certified,true);
  a.system.initiative='+0';
  a.flags.swse.canonicalPublication.foundryStockAttackTrusted=true;
  a.system.weapons=[{name:'fictional'}];
  const errors=auditUniversalVehicleActor(a,{packName:p.name}).errors.map(e=>e.code);
  assert.ok(errors.includes('INITIATIVE_DRIFT'));
  assert.ok(errors.includes('UNAUTHORIZED_STOCK_TRUST'));
  assert.ok(errors.includes('EXECUTABLE_STOCK_ATTACK_RISK'));
});
test('all 429 mocked native documents pass readback and report no release certification',async()=>{
  const report=await auditUniversalVehicleRuntime({context:mockGame()});
  assert.equal(report.status,'RUNTIME_DATA_VERIFIED');
  assert.equal(report.counts.verified,429);
  assert.equal(report.counts.indexed,429);
  assert.equal(report.counts.uniqueSourceKeys,429);
  assert.equal(report.counts.uniqueActorIds,429);
  assert.equal(report.exactReleaseCertified,false);
  assert.equal(report.worldActorsCreated,0);
});
test('native audit verifies all 429 when getIndex returns a Foundry Map/Collection',async()=>{
  const report=await auditUniversalVehicleRuntime({context:mockGame({mapIndex:true})});
  assert.equal(report.status,'RUNTIME_DATA_VERIFIED');
  assert.equal(report.counts.verified,429);
});

test('missing native pack and missing Actor block a full runtime pass',async()=>{
  const missing=await auditUniversalVehicleRuntime({context:mockGame({skip:'vehicles-hybrids'})});
  assert.equal(missing.status,'BLOCKED');
  assert.ok(missing.failures.some(e=>e.code==='PACK_MISSING'));
  const shortened=await auditUniversalVehicleRuntime({context:mockGame({reduce:'vehicles-starfighters'})});
  assert.equal(shortened.status,'BLOCKED');
  assert.ok(shortened.failures.some(e=>e.code==='CATALOG_TOTAL_MISMATCH'));
  await assert.rejects(auditUniversalVehicleRuntime({context:mockGame({reduce:'vehicles-starfighters'}),strict:true}),
    /VEHICLE_PHASE4D_RUNTIME_GATE_FAILED/);
});
test('index-only inspection cannot masquerade as runtime certification',async()=>{
  const report=await auditUniversalVehicleRuntime({context:mockGame(),inspectAllDocuments:false});
  assert.equal(report.status,'INCOMPLETE_INDEX_ONLY');
  assert.equal(report.counts.indexed,429);
  assert.equal(report.counts.hydrated,0);
});
test('GM and V13 checks fail closed; no world mutation APIs in audit',async()=>{
  await assert.rejects(auditUniversalVehicleRuntime({context:mockGame({gm:false})}),/VEHICLE_PHASE4D_GM_ONLY/);
  await assert.rejects(openUniversalVehicleSampleSheet('example',{context:mockGame({gm:false})}),/VEHICLE_PHASE4D_GM_ONLY/);
  const invalid=await auditUniversalVehicleRuntime({context:mockGame({generation:14})});
  assert.equal(invalid.status,'BLOCKED');
  assert.ok(invalid.failures.some(e=>e.code==='WRONG_FOUNDRY_GENERATION'));
  const source=readFileSync('scripts/domain/vehicles/vehicle-phase4d-runtime-audit.js','utf8');
  assert.equal(source.includes('Actor.create('),false);
  assert.equal(source.includes('createEmbeddedDocuments('),false);
  assert.equal(source.includes('ActorEngine.updateActor('),false);
  assert.equal(source.includes('game.settings.set('),false);
  const bootstrap=readFileSync('index.js','utf8');
  assert.ok(bootstrap.includes('globalThis.SWSE.debug.vehicles'));
  assert.ok(bootstrap.includes('auditUniversalVehicleRuntime(options)'));
});

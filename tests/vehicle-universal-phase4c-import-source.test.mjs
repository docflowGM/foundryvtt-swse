import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {buildUniversalVehiclePackSources} from '../tools/build-universal-vehicle-pack-sources.mjs';
import {assertCP23C4CNoStagedSourceImport} from '../scripts/domain/vehicles/vehicle-cp23c4c-import-boundary.js';

const actors=[...buildUniversalVehiclePackSources().output.values()].flat();
const sample=predicate=>structuredClone(actors.find(predicate));
const engine=()=>{
  const code=readFileSync('scripts/engine/import/vehicle-import-engine.js','utf8')
    .replace(/^import .*;\s*$/gm,'')
    .replace(/\bexport\s+/g,'');
  const writes=[];
  const ctx={
    foundry:{utils:{deepClone:structuredClone}},
    normalizeVehicleImportData(){throw new Error('LEGACY_NORMALIZER_MUST_NOT_RUN');},
    assertCP23C4CNoStagedSourceImport,
    ActorEngine:{async updateActor(actor,update,options){writes.push({actor,update,options});}}
  };
  runInNewContext(code+'\nglobalThis.engine=VehicleImportEngine;',ctx);
  return {VehicleImportEngine:ctx.engine,writes};
};
const target=()=>({id:'world-target',type:'vehicle',system:{initiative:'+0',shields:{value:0,max:0}}});

test('new actor source import preserves numeric Initiative and missing shields, never runs legacy normalizer',async()=>{
  const source=sample(d=>!Object.hasOwn(d.system,'shields')&&d.system.initiative!==0);
  assert.ok(source);
  const original=structuredClone(source);
  const {VehicleImportEngine,writes}=engine();
  const t=target();
  const plan=VehicleImportEngine.buildImportPlan(t,source,{mode:'replace'});
  assert.equal(plan.system.initiative,source.system.initiative);
  assert.equal(typeof plan.system.initiative,'number');
  assert.equal(Object.hasOwn(plan.system,'shields'),false);
  assert.equal(Object.hasOwn(plan.system,'hyperdrive_class'),false);
  assert.deepEqual(JSON.parse(JSON.stringify(plan.system.weapons)),[]);
  assert.deepEqual(JSON.parse(JSON.stringify(plan['flags.swse.universalVehicleSource'])),source.flags.swse.universalVehicleSource);
  assert.deepEqual(source,original);
  await VehicleImportEngine.apply(t,source,{mode:'replace'});
  assert.equal(writes.length,1);
  assert.equal(writes[0].options.source,'vehicle-import-wizard');
});

test('unknown published shield data stays unknown even if Foundry adds zero-only UI placeholders',()=>{
  const canonical=sample(d=>d.system.vehiclePublishedShieldStatus==='unknown');
  assert.ok(canonical);
  const {VehicleImportEngine}=engine();
  const hydrated=structuredClone(canonical);
  hydrated.system.shields={value:0,max:0};
  hydrated.system.shieldRating=0;
  const plan=VehicleImportEngine.buildImportPlan(target(),hydrated,{mode:'replace'});
  assert.equal(plan.system.vehiclePublishedShieldStatus,'unknown');
  assert.equal(typeof plan['flags.swse.universalVehicleSource'].source.defenses.shieldRating,'undefined');
  const tampered=structuredClone(hydrated);
  tampered.system.shields.max=10;
  assert.throws(()=>VehicleImportEngine.buildImportPlan(target(),tampered),
    /UNIVERSAL_VEHICLE_SOURCE_INVALID_OR_UNTRUSTED/);
});

test('positive and explicit-zero SR survive without converting unknown data',()=>{
  const chosen=[sample(d=>d.system.shieldRating===0),sample(d=>d.system.shieldRating>0)];
  assert.ok(chosen.every(Boolean));
  const {VehicleImportEngine}=engine();
  for(const actor of chosen){
    const plan=VehicleImportEngine.buildImportPlan(target(),actor,{mode:'replace'});
    assert.equal(plan.system.shieldRating,actor.system.shieldRating);
    assert.equal(plan.system.shields.max,actor.system.shieldRating);
  }
});

test('tampered universal sources and partial merge are rejected, no weapon trust',()=>{
  const clean=sample(d=>d.system.shieldRating>0);
  const {VehicleImportEngine}=engine();
  assert.throws(()=>VehicleImportEngine.buildImportPlan(target(),clean,{mode:'merge'}),/UNIVERSAL_VEHICLE_SOURCE_REPLACE_ONLY/);
  const variants=[
    d=>{d.system.initiative='+0';},
    d=>{d.system.weapons=[{name:'fabricated'}];},
    d=>{d.flags.swse.canonicalPublication.foundryStockAttackTrusted=true;},
    d=>{d.flags.swse.canonicalPublication.sourceEntryKey='wrong';},
    d=>{d.system.shields.max=0;},
    d=>{d.flags.swse.universalVehicleSource.source.armament.weaponMounts=[{}];},
    d=>{d._id='forged';}
  ];
  for(const mutate of variants){
    const changed=structuredClone(clean);
    mutate(changed);
    assert.throws(()=>VehicleImportEngine.buildImportPlan(target(),changed,{mode:'replace'}),/UNIVERSAL_VEHICLE_SOURCE_INVALID_OR_UNTRUSTED/);
  }
});

test('canonical import refuses nonvehicle and pre-armed targets to prevent surviving weapons',()=>{
  const source=sample(d=>d.system.vehiclePublishedShieldStatus==='published');
  const {VehicleImportEngine}=engine();
  const wrong={id:'world-npc',type:'npc',system:{}};
  assert.throws(()=>VehicleImportEngine.buildImportPlan(wrong,source),
    /UNIVERSAL_VEHICLE_TARGET_TYPE_REQUIRED/);
  const equipped={id:'world-armed',type:'vehicle',items:{size:1},system:{}};
  assert.throws(()=>VehicleImportEngine.buildImportPlan(equipped,source),
    /UNIVERSAL_VEHICLE_REQUIRES_EMPTY_TARGET_ITEMS/);
});

test('legacy CP23-C4C reserved source documents are still denied before universal import',()=>{
  const item=sample(d=>d.system.shieldRating>0);
  item.pack='foundryvtt-swse.sotg-canonical-stock-source';
  const {VehicleImportEngine}=engine();
  assert.throws(()=>VehicleImportEngine.buildImportPlan(target(),item),/CP23C4C_STAGED_CANONICAL_SOURCE_IMPORT_FORBIDDEN/);
});

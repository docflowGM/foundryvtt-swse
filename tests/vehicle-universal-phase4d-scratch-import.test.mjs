import test from 'node:test';
import assert from 'node:assert/strict';
import {buildUniversalVehiclePackSources} from '../tools/build-universal-vehicle-pack-sources.mjs';
import {assessUniversalVehicleWorldImport,runUniversalVehicleScratchImport} from '../scripts/domain/vehicles/vehicle-phase4d-scratch-import.js';

const all=[...buildUniversalVehiclePackSources().output.values()].flat();
const clone=structuredClone;
const sample=()=>clone(all.find(x=>x.system.vehiclePublishedShieldStatus==='unknown'&&x.system.initiative!==0));
const ctx=({gm=true,release=13,actors}={})=>({
  user:{isGM:gm},system:{id:'foundryvtt-swse'},release:{generation:release},actors
});
function harness({failUpdate=false,failDelete=false}={}){
  const source=sample();
  const created=[];
  const actors={async create(data){
    const doc={id:'mock-world-actor',name:data.name,type:data.type,system:data.system,
      flags:data.flags,items:{size:0},async delete(){if(failDelete)throw new Error('Mock delete denied');this.deleted=true;}};
    created.push(doc);
    return doc;
  }};
  const importEngine={async apply(target,document){
    if(failUpdate)throw new Error('Mock governed update rejected');
    target.system=clone(document.system);
    target.flags=clone(document.flags);
    return {actor:target};
  }};
  return {source,created,actors,importEngine,context:ctx({actors:{get:id=>created.find(x=>x.id===id)}})};
}

test('world import evaluator preserves printed initiative, hull, defenses, source flag and unavailable SR',()=>{
  const source=sample();
  const world={system:clone(source.system),flags:clone(source.flags),items:{size:0}};
  const result=assessUniversalVehicleWorldImport(world,source);
  assert.equal(result.valid,true);
  assert.deepEqual(result.failures,[]);
  world.system.initiative='+0';
  world.system.shields={value:25,max:25};
  world.flags.swse.canonicalPublication.foundryStockAttackTrusted=true;
  const fail=assessUniversalVehicleWorldImport(world,source);
  assert.equal(fail.valid,false);
  assert.ok(fail.failures.includes('NUMERIC_INITIATIVE_LOST'));
  assert.ok(fail.failures.includes('UNKNOWN_SR_FABRICATED'));
  assert.ok(fail.failures.includes('STOCK_ATTACK_TRUST_PROMOTED'));
});

test('scratch import requires explicit GM write opt-in',async()=>{
  const h=harness();
  await assert.rejects(runUniversalVehicleScratchImport({
    sourceDocument:h.source,importEngine:h.importEngine,actors:h.actors,context:h.context
  }),/VEHICLE_PHASE4D_EXPLICIT_WRITE_OPT_IN_REQUIRED/);
  await assert.rejects(runUniversalVehicleScratchImport({
    allowWrite:true,sourceDocument:h.source,importEngine:h.importEngine,actors:h.actors,
    context:ctx({gm:false,actors:h.context.actors})
  }),/VEHICLE_PHASE4D_GM_ONLY/);
  assert.equal(h.created.length,0);
});

test('test-world scratch Actor import validates and always deletes temporary Actor',async()=>{
  const h=harness();
  const result=await runUniversalVehicleScratchImport({
    sourceKey:h.source.system.vehicleSourceEntryKey,allowWrite:true,
    sourceDocument:h.source,importEngine:h.importEngine,actors:h.actors,context:h.context
  });
  assert.equal(result.status,'ACTOR_ENGINE_SCRATCH_PASSED');
  assert.equal(result.created,true);
  assert.equal(result.deleted,true);
  assert.equal(result.assessment.valid,true);
  assert.equal(result.runtimeCertified,false);
  assert.equal(h.created.length,1);
  assert.equal(h.created[0].deleted,true);
});

test('governance update failure still deletes the scratch Actor',async()=>{
  const h=harness({failUpdate:true});
  const result=await runUniversalVehicleScratchImport({
    sourceKey:h.source.system.vehicleSourceEntryKey,allowWrite:true,
    sourceDocument:h.source,importEngine:h.importEngine,actors:h.actors,context:h.context
  });
  assert.equal(result.status,'BLOCKED');
  assert.equal(result.deleted,true);
  assert.ok(result.errors.some(x=>x.includes('governed update rejected')));
  assert.equal(h.created[0].deleted,true);
});

test('failed scratch deletion reports exact Actor id for manual cleanup',async()=>{
  const h=harness({failDelete:true});
  const result=await runUniversalVehicleScratchImport({
    sourceKey:h.source.system.vehicleSourceEntryKey,allowWrite:true,
    sourceDocument:h.source,importEngine:h.importEngine,actors:h.actors,context:h.context
  });
  assert.equal(result.status,'MANUAL_CLEANUP_REQUIRED');
  assert.equal(result.actorId,'mock-world-actor');
  assert.equal(result.deleted,false);
  assert.ok(result.errors.some(x=>x.startsWith('SCRATCH_CLEANUP_FAILED:')));
});

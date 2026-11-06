import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {
  CP23C4C_BLOCKED_SOURCE_PACKS,classifyCP23C4CSourceImport,
  assertCP23C4CNoStagedSourceImport,inspectCP23C4CNormalizationLoss
} from '../scripts/domain/vehicles/vehicle-cp23c4c-import-boundary.js';
import {CP23C4B_WORLD_ANCHORS}
  from '../scripts/domain/vehicles/vehicle-cp23c4b-source-anchors.generated.js';
import {TRUSTED_STOCK_WEAPON_GROUP_COUNT,resolveTrustedStockAttackGroup}
  from '../scripts/domain/vehicles/vehicle-stock-attack-authority.js';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const text=p=>readFileSync(join(root,p),'utf8');
const pureClone=x=>structuredClone(x);

function actualNormalizer(){
  const complete=text('scripts/engine/import/vehicle-import-normalizer.js');
  // The final named-export block must be removed (not converted to an
  // invalid standalone object literal in the isolated test VM).
  const tail=complete.lastIndexOf('\nexport {');
  assert.ok(tail>0,'normalizer exports changed; review VM harness');
  const code=complete.slice(0,tail)
    .replace(/^import .*;\s*$/gm,'')
    .replace(/^export\s+/gm,'');
  const ctx={
    SWSELogger:{warn(){},debug(){},error(){}},
    parseVehicleSpeedText(){return {
      status:'needs-source-review',
      character:null,starship:null,
      fightingSpace:null,modes:[]
    };}
  };
  runInNewContext(code+'\nglobalThis.__normalizer=normalizeVehicleImportData;',ctx);
  return ctx.__normalizer;
}
const normalizeVehicleImportData=actualNormalizer();

function actualImporter(){
  const code=text('scripts/engine/import/vehicle-import-engine.js')
    .replace(/^import .*;\s*$/gm,'')
    .replace(/\bexport\s+/g,'');
  const writes=[];
  const ctx={
    foundry:{utils:{deepClone:pureClone}},
    ActorEngine:{async updateActor(...args){writes.push(args);return {actor:args[0]};}},
    normalizeVehicleImportData,
    assertCP23C4CNoStagedSourceImport
  };
  runInNewContext(code+'\nglobalThis.__engine=VehicleImportEngine;',ctx);
  return {engine:ctx.__engine,writes};
}
const fixture=(i=0)=>{
  const p=CP23C4B_WORLD_ANCHORS.entries[i];
  return {
    source:{...pureClone(p.draftActor),pack:'foundryvtt-swse.sotg-canonical-stock-source'},
    target:{id:'world_source_target',type:'vehicle',system:{initiative:'legacy'}}
  };
};

test('all fifteen reserved native documents cannot be installed, even with pack stripped',async()=>{
  assert.equal(CP23C4B_WORLD_ANCHORS.count,15);
  assert.equal(CP23C4C_BLOCKED_SOURCE_PACKS.length,3);
  const {engine,writes}=actualImporter();
  for(let i=0;i<15;i++){
    const {source,target}=fixture(i);
    const nativeId=source._id;
    assert.equal(classifyCP23C4CSourceImport(source).status,
      'CP23C4C_INSTALLATION_BLOCKED');
    assert.throws(()=>assertCP23C4CNoStagedSourceImport(source),
      /CP23C4C_STAGED_CANONICAL_SOURCE_IMPORT_FORBIDDEN/);
    for(const mode of ['replace','merge']){
      assert.throws(()=>engine.buildImportPlan(target,source,{mode}),
        /CP23C4C_STAGED_CANONICAL_SOURCE_IMPORT_FORBIDDEN/);
      await assert.rejects(engine.apply(target,source,{mode}),
        /CP23C4C_STAGED_CANONICAL_SOURCE_IMPORT_FORBIDDEN/);
    }
    delete source.pack;
    assert.equal(source._id,nativeId);
    assert.throws(()=>engine.buildImportPlan(target,source,{mode:'replace'}),
      /CP23C4C_STAGED_CANONICAL_SOURCE_IMPORT_FORBIDDEN/);
    source._id='not-the-pinned-source';
    source.pack='foundryvtt-swse.sotg-canonical-stock-source';
    assert.throws(()=>engine.buildImportPlan(target,source,{mode:'replace'}),
      /CP23C4C_STAGED_CANONICAL_SOURCE_IMPORT_FORBIDDEN/);
  }
  assert.equal(writes.length,0);
  assert.equal(TRUSTED_STOCK_WEAPON_GROUP_COUNT,0);
});

test('real current normalizer demonstrably loses approved numeric initiative in all 15 source drafts',()=>{
  for(const [i,entry] of CP23C4B_WORLD_ANCHORS.entries.entries()){
    const before=entry.draftActor.system;
    assert.equal(typeof before.initiative,'number');
    const after=normalizeVehicleImportData(pureClone(before),{sourceName:entry.name});
    assert.equal(after.initiative,'+0',entry.name);
    assert.notEqual(after.initiative,before.initiative,entry.name);
    const drift=inspectCP23C4CNormalizationLoss(before,after);
    assert.equal(drift.status,'CP23C4C_NORMALIZER_SOURCE_LOSS_DIAGNOSTIC');
    assert.ok(drift.changedFields.includes('initiative'),entry.name);
    assert.equal(drift.sourceFactsPreserved,false);
    assert.equal(drift.productionHydrationPermitted,false);
    assert.equal(drift.foundryStockAttackTrusted,false);
    assert.equal(resolveTrustedStockAttackGroup({system:before},{id:'spoof'}),null);
  }
});

test('real normalizer invents defaults for source-silent fields, not canonical proof',()=>{
  const noShields=CP23C4B_WORLD_ANCHORS.entries.find(e=>
    !Object.hasOwn(e.draftActor.system,'shields'));
  assert.ok(noShields);
  const sys=pureClone(noShields.draftActor.system);
  const normalized=normalizeVehicleImportData(sys,{sourceName:noShields.name});
  const drift=inspectCP23C4CNormalizationLoss(sys,normalized);
  assert.ok(drift.synthesizedFields.includes('shields'));
  assert.ok(drift.synthesizedFields.includes('cargo'));
  assert.ok(drift.synthesizedFields.includes('hyperdrive_class'));
  assert.equal(Object.hasOwn(sys,'shields'),false);
  assert.equal(Object.hasOwn(sys,'hyperdrive_class'),false);
  assert.deepEqual({value:normalized.shields.value,max:normalized.shields.max},
    {value:0,max:0});
});

test('unreserved legacy vehicle imports now fail closed after owner-approved clean break',async()=>{
  const {engine,writes}=actualImporter();
  const source={id:'abc123',pack:'foundryvtt-swse.vehicles-starfighters',
    type:'vehicle',name:'Legacy Uncertified',img:'icons/svg/ship.svg',
    system:{model:'Legacy Uncertified',initiative:'+3',weapons:[]}};
  const target={id:'world-old',type:'vehicle',system:{}};
  assert.equal(classifyCP23C4CSourceImport(source).status,'NOT_A_CP23_CANONICAL_SOURCE');
  assert.throws(()=>engine.buildImportPlan(target,source,{mode:'replace'}),
    /UNIVERSAL_VEHICLE_SOURCE_REQUIRED/);
  await assert.rejects(engine.apply(target,source,{mode:'replace'}),
    /UNIVERSAL_VEHICLE_SOURCE_REQUIRED/);
  assert.equal(writes.length,0);
  assert.equal(TRUSTED_STOCK_WEAPON_GROUP_COUNT,0);
});

test('normalization loss API has no capability to issue receipts or installation authority',()=>{
  const invalid=inspectCP23C4CNormalizationLoss(null,null);
  assert.equal(invalid.status,'CP23C4C_INSTALLATION_BLOCKED');
  const drift=inspectCP23C4CNormalizationLoss({initiative:8},
    {initiative:'+0',shields:{value:0,max:0}});
  assert.deepEqual(Array.from(drift.changedFields),['initiative']);
  assert.deepEqual(Array.from(drift.synthesizedFields),['shields']);
  assert.equal(drift.durableGMInstallationReceipt,false);
  assert.equal(drift.nativeSourcePackVerified,false);
  assert.equal(drift.physicalMountCertified,false);
  const source=text('scripts/domain/vehicles/vehicle-cp23c4c-import-boundary.js');
  // Documentation comments may name ActorEngine; executable source must not.
  const executable=source.split(String.fromCharCode(10)).filter(line=>
    !line.trim().startsWith('*') && !line.trim().startsWith('//')).join(String.fromCharCode(10));
  assert.equal(executable.includes('ActorEngine.updateActor('),false);
  assert.equal(executable.includes('game.settings.set('),false);
  assert.equal(executable.includes('createEmbeddedDocuments('),false);
  const importer=text('scripts/engine/import/vehicle-import-engine.js');
  assert.ok(importer.includes('assertCP23C4CNoStagedSourceImport(sourceActor)'));
  assert.equal(importer.includes('normalizeVehicleImportData('),false);
  assert.ok(importer.includes('UNIVERSAL_VEHICLE_SOURCE_REQUIRED'));
  assert.ok(importer.includes('return {actor:targetActor,update};'));
});

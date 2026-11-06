import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, mkdtempSync, rmSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {PACKS,projectVehicleActor,buildUniversalVehiclePackSources,writeUniversalVehiclePackSources} from '../tools/build-universal-vehicle-pack-sources.mjs';

const {output,manifest}=buildUniversalVehiclePackSources();
const all=[...output.values()].flat();
const canonical=readFileSync('data/canonical/vehicles/vehicles.json','utf8').trim().split('\n').map(JSON.parse);
const byKey=new Map(canonical.map(r=>[r.identity.sourceEntryKey,r]));

test('Phase 4B 429/429 source identities appear exactly once in eleven disjoint packs',()=>{
  assert.equal(output.size,11);
  assert.equal(all.length,429);
  assert.equal(new Set(all.map(x=>x._id)).size,429);
  assert.equal(new Set(all.map(x=>x.flags.swse.canonicalPublication.sourceEntryKey)).size,429);
  assert.deepEqual(all.map(x=>x.flags.swse.canonicalPublication.sourceEntryKey).sort(),canonical.map(r=>r.identity.sourceEntryKey).sort());
  assert.equal(Object.values(manifest.packs).reduce((n,v)=>n+v.documents,0),429);
  const listed=Object.values(PACKS).flat();
  assert.equal(listed.length,new Set(listed).size);
  for(const [pack,docs] of output) {
    assert.deepEqual(docs.map(x=>x.flags.swse.canonicalPublication.sourceEntryKey),docs.map(x=>x.flags.swse.canonicalPublication.sourceEntryKey).slice().sort());
    assert.equal(manifest.packs[pack].documents,docs.length);
    assert.equal(createHash('sha256').update(docs.map(d=>JSON.stringify(d)).join('\n')+'\n').digest('hex'),manifest.packs[pack].sha256);
  }
});

test('Every document is a Foundry vehicle with stable provenance and no certified stock attacks',()=>{
  for(const doc of all){
    assert.match(doc._id,/^[0-9a-f]{16}$/);
    assert.equal(doc.type,'vehicle');
    assert.deepEqual(doc.system.weapons,[]);
    assert.deepEqual(doc.items,[]);
    assert.equal(doc.flags.swse.canonicalPublication.foundryStockAttackTrusted,false);
    assert.equal(doc.flags.swse.canonicalPublication.physicalMountCertification,false);
    const key=doc.flags.swse.canonicalPublication.sourceEntryKey;
    const source=byKey.get(key);
    assert.deepEqual(doc.flags.swse.universalVehicleSource.source,source);
    assert.equal(doc.flags.swse.universalVehicleSource.recordDigest,createHash('sha256').update(JSON.stringify(source)).digest('hex'));
    assert.equal(doc.system.initiative,source.abilities.initiativePrinted);
    assert.equal(doc.system.hp.max,source.durability.hitPoints);
    assert.equal(doc.system.reflexDefense,source.defenses.reflex);
    assert.equal(doc.system.fortitudeDefense,source.defenses.fortitude);
    assert.deepEqual(doc.system.sourceAttackGroups,source.armament.firingGroups);
    assert.ok(doc.system.sourceAttackGroups.every(g=>g.mountKeys.length===0));
    assert.ok(PACKS[doc.system.vehiclePackName].includes(source.classification.primaryCategory));
    assert.deepEqual(projectVehicleActor(source,doc.system.vehiclePackName),doc);
  }
});

test('Unknown shields stay unknown, explicit printed zero stays zero, values remain numeric',()=>{
  let unknown=0,zero=0,positive=0;
  for(const doc of all){
    const source=byKey.get(doc.flags.swse.canonicalPublication.sourceEntryKey);
    const value=source.defenses?.shieldRating;
    if(typeof value!=='number'){
      unknown++;
      assert.equal(Object.hasOwn(doc.system,'shields'),false,doc.name);
      assert.equal(Object.hasOwn(doc.system,'shieldRating'),false,doc.name);
    }else{
      if(value===0)zero++;else positive++;
      assert.equal(doc.system.shields.max,value,doc.name);
      assert.equal(doc.system.shieldRating,value,doc.name);
    }
    assert.equal(typeof doc.system.initiative,'number');
  }
  assert.ok(unknown>0&&positive>0);
  assert.ok(zero>=0);
});

test('Vulture source amendment retained; hybrid/multimode publication creates one Actor',()=>{
  const find=key=>all.find(d=>d.flags.swse.canonicalPublication.sourceEntryKey===key);
  const core=find('core-vulture-class-droid-starfighter');
  assert.ok(core);
  assert.equal(core.system.vehicleSourcePage,181);
  assert.equal(core.name,'"Vulture" Droid Starfighter');
  assert.ok(find('sotg-baktoid-armor-workshop-vulture-class-starfighter'));
  const hybrid=find('sgtd-dp-2-probe-droid');
  assert.equal(hybrid.system.vehicleBucket,'hybrids');
  assert.equal(hybrid.system.vehiclePackName,'vehicles-hybrids');
  assert.equal(hybrid.system.vehicleMovementModes.length,2);
  assert.ok(find('sav-tenloss-corporation-hornet-class-interceptor'));
  assert.ok(find('cw-tx-130t-saber-class-fighter-tank'));
  assert.ok(find('fucg-tx-130t-fighter-tank'));
});

test('Write mode is deterministic and outputs 11 exact source streams; no production mutation',()=>{
  const tmp=mkdtempSync(path.join(os.tmpdir(),'swse-vehicle-4b-test-'));
  try{
    const result=writeUniversalVehiclePackSources({outDir:tmp});
    assert.deepEqual(result,manifest);
    for(const [name,docs] of output){
      const read=readFileSync(path.join(tmp,name+'.db'),'utf8');
      assert.equal(read,docs.map(d=>JSON.stringify(d)).join('\n')+'\n');
    }
    assert.equal(JSON.parse(readFileSync(path.join(tmp,'manifest.json'),'utf8')).total,429);
  }finally{rmSync(tmp,{recursive:true,force:true});}
});

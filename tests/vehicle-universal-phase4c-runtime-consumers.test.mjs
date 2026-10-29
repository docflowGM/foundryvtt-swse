import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {UNIVERSAL_VEHICLE_PACKS,UNIVERSAL_VEHICLE_PACK_NAMES,getUniversalVehiclePackForCategory} from '../scripts/domain/vehicles/universal-vehicle-pack-registry.js';
import {buildUniversalVehiclePackSources} from '../tools/build-universal-vehicle-pack-sources.mjs';
import {STORE_PACKS} from '../scripts/engine/store/store-constants.js';

const built=buildUniversalVehiclePackSources(),all=[...built.output.values()].flat();
const packNames=UNIVERSAL_VEHICLE_PACK_NAMES;
const legacyNames=['vehicles','vehicles-canonical-ships','vehicles-weapon-emplacements'];

test('registered manifest, generated pack taxonomy and store share one active catalog',()=>{
  const system=JSON.parse(readFileSync('system.json','utf8'));
  const actual=system.packs.filter(p=>p.type==='Actor' && (p.name.startsWith('vehicles-')||p.name==='vehicles')).map(p=>p.name);
  assert.equal(actual.length,11);
  assert.deepEqual([...actual].sort(),[...packNames].sort());
  assert.deepEqual(STORE_PACKS.VEHICLE_PACKS.map(id=>id.split('.').at(-1)).sort(),[...packNames].sort());
  assert.equal(STORE_PACKS.VEHICLES_CANONICAL,undefined);
  for(const name of legacyNames)assert.equal(actual.includes(name),false);
  for(const spec of UNIVERSAL_VEHICLE_PACKS){
    const descriptor=system.packs.find(p=>p.name===spec.name);
    assert.equal(descriptor.type,'Actor');
    assert.equal(descriptor.path,'packs/'+spec.name);
    assert.equal(descriptor.label,spec.label);
  }
  assert.equal(new Set(Object.values(built.manifest.packs).flatMap(x=>x.categoryNames)).size,31);
  assert.equal(all.length,429);
});

test('runtime-ready source-backed Actor projection does not synthesize missing gameplay facts',()=>{
  let unknown=0,positive=0,zero=0,priced=0;
  for(const doc of all){
    const source=doc.flags.swse.universalVehicleSource.source;
    assert.equal(doc.system.vehicleSourceEntryKey,source.identity.sourceEntryKey);
    assert.equal(getUniversalVehiclePackForCategory(source.classification.primaryCategory).name,doc.system.vehiclePackName);
    assert.equal(doc.system.vehicleBucket,doc.system.vehiclePackName.replace('vehicles-',''));
    assert.equal(doc.system.initiative,source.abilities.initiativePrinted);
    assert.equal(doc.system.hp.max,source.durability.hitPoints);
    assert.equal(doc.system.reflexDefense,source.defenses.reflex);
    assert.equal(doc.system.fortitudeDefense,source.defenses.fortitude);
    assert.deepEqual(doc.system.weapons,[]);
    assert.deepEqual(doc.items,[]);
    assert.equal(doc.system.sourcebook,source.publication.book);
    assert.equal(doc.system.page,source.publication.page);
    assert.equal(doc.system.type,source.publication.printedTypeLine);
    const sr=source.defenses.shieldRating;
    if(typeof sr!=='number'){
      unknown++;
      assert.equal(doc.system.vehiclePublishedShieldStatus,'unknown');
      assert.equal(Object.hasOwn(doc.system,'shields'),false);
    }else{
      if(sr===0)zero++;else positive++;
      assert.equal(doc.system.vehiclePublishedShieldStatus,'published');
      assert.equal(doc.system.shields.max,sr);
    }
    for(const key of ['str','dex','int','con','wis','cha']){
      if(typeof source.abilities[key]==='number')assert.equal(doc.system.attributes[key].base,source.abilities[key]);
      else assert.equal(doc.system.attributes?.[key],undefined);
    }
    if(source.economics?.priceNew?.status==='priced'){
      priced++;
      assert.equal(doc.system.cost,source.economics.priceNew.amountCredits);
    }else assert.equal(Object.hasOwn(doc.system,'cost'),false);
    const character=source.movement.speedModes.find(m=>m.scale==='character'&&typeof m.squaresPerMove==='number');
    const starship=source.movement.speedModes.find(m=>m.scale==='starship'&&typeof m.squaresPerMove==='number');
    if(character)assert.equal(doc.system.characterScaleSpeed,character.squaresPerMove);
    else assert.equal(Object.hasOwn(doc.system,'characterScaleSpeed'),false);
    if(starship)assert.equal(doc.system.starshipScaleSpeed,starship.squaresPerMove);
    else assert.equal(Object.hasOwn(doc.system,'starshipScaleSpeed'),false);
  }
  assert.equal(unknown,143);assert.equal(zero,5);assert.equal(positive,281);assert.equal(priced,271);
});

function mockBrowser({missing=null,truncate=false}={}){
  const docs=new Map();
  const packs=new Map();
  for(const [name,actors] of built.output){
    if(name===missing)continue;
    const entries=truncate&&name===packNames[0]?actors.slice(0,-1):actors;
    const collection={
      documentName:'Actor',
      metadata:{label:UNIVERSAL_VEHICLE_PACKS.find(x=>x.name===name).label},
      async getIndex(){return entries.map(d=>({_id:d._id,name:d.name,img:d.img,system:d.system}));},
      async getDocument(id){return entries.find(d=>d._id===id)??null;}
    };
    docs.set(name,entries);packs.set('foundryvtt-swse.'+name,collection);
  }
  const code=readFileSync('scripts/core/vehicle-pack-data-loader.js','utf8')
    .replace(/^import .*;\s*$/gm,'').replace(/\bexport\s+/g,'');
  const ctx={
    UNIVERSAL_VEHICLE_PACK_NAMES:packNames,
    getUniversalVehiclePack:name=>UNIVERSAL_VEHICLE_PACKS.find(p=>p.name===name)??null,
    game:{system:{id:'foundryvtt-swse'},packs},
    Hooks:{once(){}}
  };
  runInNewContext(code+'\nglobalThis.Browser=VehiclePackDataLoader;',ctx);
  return ctx.Browser;
}

test('vehicle browser lists all 429 once, preserving same-name publication variants and unknown SR',async()=>{
  const Browser=mockBrowser();
  assert.deepEqual(Array.from(Browser.PACK_NAMES),Array.from(packNames));
  const results=await Browser.loadVehicleIndex();
  assert.equal(results.length,429);
  assert.equal(new Set(results.map(x=>x.sourceEntryKey)).size,429);
  const unknown=results.find(x=>x.srStatus==='unknown');
  assert.ok(unknown);
  assert.equal(unknown.sr,null);
  const vulture=results.find(x=>x.sourceEntryKey==='core-vulture-class-droid-starfighter');
  assert.equal(vulture.sourcePage,181);
  assert.equal(vulture.sourceBook,'Core Rulebook');
  const selected=await Browser.loadVehicleDocument(vulture);
  assert.equal(selected.flags.swse.canonicalPublication.sourceEntryKey,vulture.sourceEntryKey);
  assert.equal(await Browser.loadVehicleIndex(),results);
});

test('vehicle browser fails closed when required pack or publication identity is missing',async()=>{
  await assert.rejects(mockBrowser({missing:packNames[0]}).loadVehicleIndex(),/UNIVERSAL_VEHICLE_PACK_MISSING/);
  await assert.rejects(mockBrowser({truncate:true}).loadVehicleIndex(),/UNIVERSAL_VEHICLE_INCOMPLETE_CATALOG/);
});

test('wizard and V2 sheet are bound to source-only evidence, never invented SR zero',()=>{
  const wizard=readFileSync('scripts/apps/vehicle-import-wizard.js','utf8');
  const template=readFileSync('templates/apps/vehicle-import-wizard.hbs','utf8');
  const context=readFileSync('scripts/sheets/v2/vehicle-sheet/vehicle-context-builder.js','utf8');
  const sheet=readFileSync('templates/actors/vehicle/v2/partials/vehicle-sheet-content.hbs','utf8');
  const release=readFileSync('tools/release/build-packs.mjs','utf8');
  assert.equal(template.includes('data-mode="merge"'),false);
  assert.equal(wizard.includes('rows.slice(0, 250)'),false);
  assert.ok(wizard.includes("this.state.mode = 'replace'"));
  assert.ok(context.includes("unknownPublishedSR ? 'Unknown'"));
  assert.ok(context.includes('vehiclePublication'));
  assert.ok(sheet.includes('vehiclePublication.attackStatus'));
  assert.ok(release.includes('buildUniversalVehiclePackSources(root)'));
  assert.ok(release.includes('const vehicleDocs=vehicleSources.output.get(pack.name)'));
});

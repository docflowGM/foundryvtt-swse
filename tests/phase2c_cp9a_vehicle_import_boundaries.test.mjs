import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function buildImporter() {
  const file=readFileSync(new URL('../scripts/engine/import/vehicle-weapon-import-normalizer.js',import.meta.url),'utf8');
  const exportTail=file.lastIndexOf('\nexport {');
  assert.ok(exportTail>0);
  const body=file.slice(0,exportTail)
    .replace(/^import .*;\s*$/gm,'')
    .replace(/^export /gm,'');
  const log={debug(){},warn(){},error(){}};
  const env={
    SWSELogger:log,
    ActorEngine:{async createEmbeddedDocuments(actor,type,items){return items;}},
    formatVehicleAttackSummary(x){
      if(x===undefined||x===null||x==='')return null;
      return typeof x==='number'&&Number.isInteger(x)?(x>=0?'+'+x:String(x)):String(x);
    },
    numericVehicleAttackBonus(x){return x===null?null:Number(x);},
  };
  runInNewContext(body+'\nglobalThis.__exports={parseVehicleWeaponEntry,buildVehicleWeaponItemData,normalizeVehicleWeaponImportData,extractVehicleWeaponSources,createVehicleWeaponItems};',env);
  return env.__exports;
}
const {parseVehicleWeaponEntry,buildVehicleWeaponItemData,normalizeVehicleWeaponImportData}=buildImporter();
const physical={
  id:'4d5b3422047f5eb8-weapon-1',name:'Double Laser Cannons',
  sourceEntryKey:'sotg-ghtroc-industries-class-720-freighter',
  sourceWeaponGroupKey:'sotg-ghtroc-industries-class-720-freighter::ranged-01',
  operatorStation:'gunner',arc:'Forward',damage:'4d10x2',
  printedAttackTotal:'+1',range:'Laser Cannons'
};
const makeActor=(weapons)=>({type:'vehicle',system:{weapons},items:[]});
test('published Ghtroc numeric attack TOTAL is retained but never becomes weapon enhancement',()=>{
  const parsed=parseVehicleWeaponEntry(physical,0);
  assert.equal(parsed.attackSummary,'+1');
  assert.equal(parsed.sourceRowId,physical.id);
  assert.equal(parsed.sourceEntryKey,physical.sourceEntryKey);
  assert.equal(parsed.sourceWeaponGroupKey,physical.sourceWeaponGroupKey);
  const item=buildVehicleWeaponItemData(parsed);
  assert.equal(item.system.printedAttackTotal,'+1');
  assert.equal(Object.hasOwn(item.system,'bonus'),false);
  assert.equal(Object.hasOwn(item.system,'attackBonus'),false);
  assert.equal(item.system.vehicleMount.sourceRowId,physical.id);
  assert.equal(item.system.vehicleMount.operatorStation,'gunner');
});
test('the already represented source-bound physical row cannot generate a second Item',async()=>{
 const actor=makeActor([physical]);
 const response=await normalizeVehicleWeaponImportData(actor,{createItems:true,preserveSource:true});
 assert.equal(response.parseStats.total,1);
 assert.equal(response.items.length,0);
 assert.equal(response.parseStats.deduped,1);
 assert.equal(response.mounts[0].sourceRowId,physical.id);
});
test('legacy non-certified row remains a candidate for normal Item hydration',async()=>{
 const actor=makeActor([{name:'Ion Cannon',arc:'Forward',damage:'3d10x2',attackBonus:'+4'}]);
 const response=await normalizeVehicleWeaponImportData(actor,{createItems:true,preserveSource:true});
 assert.equal(response.items.length,1);
 assert.equal(response.items[0].system.printedAttackTotal,'+4');
 assert.equal(Object.hasOwn(response.items[0].system,'attackBonus'),false);
});
test('unarmed source does not fabricate weapon Items',async()=>{
 const response=await normalizeVehicleWeaponImportData(makeActor([]));
 assert.equal(response.items.length,0);
 assert.equal(response.parseStats.total,0);
});
test('spoofed source key on row is never an independent authority to fire',async()=>{
 const spoof={...physical,sourceEntryKey:'some-edited-claim'};
 const response=await normalizeVehicleWeaponImportData(makeActor([spoof]));
 assert.equal(response.items.length,0);
 // Neither importer nor a source key is a trusted runtime binding.
 const authority=readFileSync(new URL('../scripts/domain/vehicles/vehicle-stock-attack-authority.js',import.meta.url),'utf8');
 assert.match(authority,/TRUSTED_STOCK_WEAPON_GROUP_COUNT = 0/);
 assert.match(authority,/return null;/);
});
test('pre-create normalization hooks the Actor lifecycle, not Item lifecycle',()=>{
 const hooks=readFileSync(new URL('../scripts/actors/vehicle/vehicle-precreate-hooks.js',import.meta.url),'utf8');
 const precreate=hooks.slice(hooks.indexOf('// PRE-CREATE: Normalize vehicle data'));
 assert.match(precreate,/Hooks\.on\('preCreateActor'/);
 assert.doesNotMatch(precreate,/Hooks\.on\('preCreateItem'/);
 assert.match(precreate,/document\.updateSource\(\{ system: normalized \}\)/);
});
test('new code does not create a second vehicle attack formula or bypass action costs',()=>{
 const importSource=readFileSync(new URL('../scripts/engine/import/vehicle-weapon-import-normalizer.js',import.meta.url),'utf8');
 const gate=readFileSync(new URL('../scripts/combat/rolls/attacks.js',import.meta.url),'utf8');
 assert.doesNotMatch(importSource,/system:\s*\{[^}]*attackBonus:\s*bonus/s);
 assert.match(gate,/authorizeVehicleAttackBeforeCosts/);
 assert.match(gate,/if \(!sourceGate\.ok\)/);
});

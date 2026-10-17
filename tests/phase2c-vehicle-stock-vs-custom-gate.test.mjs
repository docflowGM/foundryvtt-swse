import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyInstalledVehicleWeapon} from '../scripts/domain/vehicles/vehicle-attack-provenance.js';
import {classifyVehicleAttackPreflight,authorizeVehicleAttackBeforeCosts} from '../scripts/domain/vehicles/vehicle-attack-preflight.js';
import {TRUSTED_STOCK_WEAPON_GROUP_COUNT} from '../scripts/domain/vehicles/vehicle-stock-attack-authority.js';

function vehicle(){
 const modifications=[{id:'laser-add-01',name:'Custom Turbolaser',category:'weapons',weaponType:'turbolaser'}];
 return {id:'vehicle-a',type:'vehicle',system:{sourceEntryKey:'sotg-pretend-claim',weapons:[
  {name:'Stock Laser',arc:'forward',attackBonus:'+1'},
  {name:'Custom Turbolaser',sourceModificationId:'laser-add-01',arc:'aft'},
  {name:'Fake Custom',sourceModificationId:'not-installed'}
 ],modificationData:{modifications},shipyard:{installedModifications:modifications}},items:{get(){return null;},*[Symbol.iterator](){}}};
}
const weapon=(index,name)=>({id:`system-weapons-${index}`,name,type:'system-vehicle-weapon',system:{}});
const known={sourceEntryKey:'sotg-example',weaponGroupKey:'stock-laser',sourceComplete:true,bindingVerified:true,arcEvidence:{state:'PRINTED_VALUE',value:'forward'}};

test('immediate strict deployment: no stock weapon may trust a user-set Actor source key',async()=>{
 const v=vehicle(),w=weapon(0,'Stock Laser');
 assert.equal(TRUSTED_STOCK_WEAPON_GROUP_COUNT,0);
 const result=await authorizeVehicleAttackBeforeCosts({vehicle:v,weapon:w});
 assert.equal(result.reason,'CANONICAL_STOCK_ATTACK_UNBOUND');
 assert.equal(result.ok,false);
});
test('custom modification row is exempt from printed stock verification, not declared canonical',async()=>{
 const v=vehicle(),w=weapon(1,'Custom Turbolaser');
 const p=classifyInstalledVehicleWeapon(v,w);
 assert.equal(p.kind,'SHIPYARD_MODIFICATION');
 const res=await authorizeVehicleAttackBeforeCosts({vehicle:v,weapon:w});
 assert.equal(res.kind,'CUSTOM_MODIFICATION');
 assert.equal(res.ok,true);
 assert.equal(res.sourceAuthority,'SHIPYARD_INSTALLATION_NOT_PUBLISHED_STOCK');
});
test('modified vessel does not exempt its unchanged stock weapons',()=>{
 const v=vehicle();
 assert.equal(classifyInstalledVehicleWeapon(v,weapon(0,'Stock Laser')).kind,'STOCK_CANDIDATE');
 assert.equal(classifyVehicleAttackPreflight({vehicle:v,weapon:weapon(0,'Stock Laser')}).ok,false);
});
test('forged sourceModificationId without installed mod remains strictly stock',()=>{
 const v=vehicle();
 assert.equal(classifyInstalledVehicleWeapon(v,weapon(2,'Fake Custom')).kind,'STOCK_CANDIDATE');
 assert.equal(classifyVehicleAttackPreflight({vehicle:v,weapon:weapon(2,'Fake Custom')}).ok,false);
});
test('only one installed bookkeeping record or wrong mod category is not sufficient',()=>{
 const v=vehicle(),w=weapon(1,'Custom Turbolaser');
 v.system.shipyard.installedModifications=[];
 assert.equal(classifyInstalledVehicleWeapon(v,w).kind,'STOCK_CANDIDATE');
 v.system.shipyard.installedModifications=v.system.modificationData.modifications;
 v.system.modificationData.modifications[0].category='defense';
 assert.equal(classifyInstalledVehicleWeapon(v,w).kind,'STOCK_CANDIDATE');
});
test('no whole-ship customBuild or modified flag can bypass stock policy',()=>{
 const v=vehicle();v.system.buildMetadata={customBuild:true,modifiedInShipyard:true};
 assert.equal(classifyVehicleAttackPreflight({vehicle:v,weapon:weapon(0,'Stock Laser')}).reason,'CANONICAL_STOCK_ATTACK_UNBOUND');
});
test('missing/mismatched install identity fails rather than trusting roll options',()=>{
 const v=vehicle();
 assert.equal(classifyInstalledVehicleWeapon(v,weapon(1,'Different Weapon')).kind,'UNRESOLVED');
 assert.equal(classifyInstalledVehicleWeapon(v,weapon(99,'No Such Weapon')).kind,'UNRESOLVED');
 assert.equal(classifyInstalledVehicleWeapon(v,{id:'outsider',name:'Stock Laser'}).kind,'UNRESOLVED');
});
test('owned-Item custom install must match mod records and exact owned Item',async()=>{
 const v=vehicle();
 const owned={id:'item-01',name:'Custom Turbolaser',system:{vehicleMount:{sourceModificationId:'laser-add-01'}}};
 v.items={get(id){return id==='item-01'?owned:null;}};
 assert.equal(classifyInstalledVehicleWeapon(v,owned).kind,'SHIPYARD_MODIFICATION');
 assert.equal((await authorizeVehicleAttackBeforeCosts({vehicle:v,weapon:owned})).kind,'CUSTOM_MODIFICATION');
 assert.equal(classifyInstalledVehicleWeapon(v,{...owned}).kind,'UNRESOLVED');
});
test('test lookup can represent future verified stock mapping; runtime may not take caller mapping',()=>{
 const v=vehicle(),w=weapon(0,'Stock Laser');
 const res=classifyVehicleAttackPreflight({vehicle:v,weapon:w,sourceLookup:()=>known});
 assert.equal(res.ok,true);assert.equal(res.kind,'TRUSTED_STOCK');
 // The public Foundry entry has no injection parameter: it cannot use this untrusted test claim.
});
test('even future stock trusted mapping with missing source, group or complete evidence blocks',()=>{
 const v=vehicle(),w=weapon(0,'Stock Laser');
 for(const record of [{...known,bindingVerified:false},{...known,sourceComplete:false},{...known,weaponGroupKey:null},{...known,sourceEntryKey:null}]){
  assert.equal(classifyVehicleAttackPreflight({vehicle:v,weapon:w,sourceLookup:()=>record}).ok,false);
 }
});
test('custom actor-owned non-shipyard weapon never gets automatic source exception',()=>{
 const v=vehicle(),own={id:'item-02',name:'Other Laser',system:{}};
 v.items={get(id){return id==='item-02'?own:null;}};
 assert.equal(classifyInstalledVehicleWeapon(v,own).kind,'STOCK_CANDIDATE');
});
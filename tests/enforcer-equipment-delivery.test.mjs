import test from 'node:test';
import assert from 'node:assert/strict';
import {
  enforcerEligibleInventory,planEnforcerEquipmentDelivery,planEnforcerEquipmentDeferral,
} from '../scripts/engine/progression/utils/enforcer-equipment-delivery-plan.js';

const doc=(id,type,name,cost)=>({
 id,type,name,toObject:()=>({_id:id,type,name,system:{cost},flags:{core:{sourceId:`Compendium.test.Item.${id}`}}}),
});
const listing=(id,type='equipment',cost=4000,availability='Restricted')=>({
 id,name:id,type,availability,cost,costStatus:'priced',
 doc:doc(id,type,id,cost),
});
const index={allItems:[
 listing('kit','equipment',4000),
 listing('armor','armor',6000,'Military'),
 listing('speeder','vehicle',10000,'Military'),
 listing('normal','equipment',500,'Standard'),
 listing('illegal','weapon',2000,'Illegal'),
 listing('free','equipment',0,'Military'),
]};
const resolveSourceDocument = item => item?.doc?.toObject?.() ?? null;
const eligible = index => enforcerEligibleInventory(index, resolveSourceDocument);
const delivery = args => delivery({...args, resolveSourceDocument});
const ledger=[{enforcerClassLevel:2,heroicLevel:9,amountCredits:18000,
 status:'awaiting-equipment-selection',delivery:'civilized-accessible-location'}];

test('Enforcer equipment delivery uses source identities, published cost, availability and NO credit debit',()=>{
 assert.deepEqual(new Set(eligible(index).map(x=>x.id)),new Set(['kit','armor','speeder']));
 const plan=delivery({
  actor:{id:'PC1'},entries:ledger,classLevel:2,index,
  selected:[{id:'kit',quantity:2},{id:'speeder',quantity:1}],
  location:'Coruscant Police Precinct',approvalUserId:'GM',
 });
 assert.equal(plan.total,18000);
 assert.equal(plan.budget,18000);
 assert.equal(plan.add.length,1);
 assert.equal(plan.add[0].system.quantity,2);
 assert.equal(plan.create.length,1);
 assert.equal(plan.create[0].type,'vehicle');
 assert.equal(plan.next[0].status,'delivered');
 assert.equal(plan.next[0].usedValueCredits,18000);
 assert.equal(plan.next[0].unusedValueCredits,0);
 assert.equal(plan.next[0].deliveredItems.length,2);
 assert.equal(ledger[0].status,'awaiting-equipment-selection');
 assert.equal(plan.add[0].flags.swse.enforcerResources.sourceId,'kit');
 assert.equal(plan.create[0].data.flags.swse.enforcerResources.sourceId,'speeder');
});

test('Enforcer delivery denies unsupported equipment, unknown pricing, overspending, duplicate and replayed claims',()=>{
 const opts={actor:{id:'PC1'},entries:ledger,classLevel:2,index,
 location:'Civilized Base',approvalUserId:'GM'};
 for(const selected of [
  [{id:'normal',quantity:1}], [{id:'illegal',quantity:1}],
  [{id:'free',quantity:1}], [{id:'unknown',quantity:1}],
  [{id:'kit',quantity:5}], [{id:'kit',quantity:1},{id:'kit',quantity:1}],
  [{id:'kit',quantity:0}],
 ])assert.throws(()=>delivery({...opts,selected}));
 assert.throws(()=>delivery({...opts,selected:[{id:'kit',quantity:1}],location:''}),/location/);
 assert.throws(()=>delivery({...opts,selected:[{id:'kit',quantity:1}],
  entries:[{...ledger[0],status:'delivered'}]}),/already resolved/);
});
test('GM may defer full untouched resources once, preserving next-level carry accounting',()=>{
 const result=planEnforcerEquipmentDeferral({entries:ledger,classLevel:2});
 assert.equal(result.current.status,'deferred-to-next-level');
 assert.equal(result.current.amountCredits,18000);
 assert.equal(ledger[0].status,'awaiting-equipment-selection');
 assert.throws(()=>planEnforcerEquipmentDeferral({entries:result.entries,classLevel:2}),/already resolved/);
 assert.throws(()=>planEnforcerEquipmentDeferral({
  entries:[...ledger,{enforcerClassLevel:3,status:'awaiting-equipment-selection',amountCredits:20000}],
  classLevel:2,
 }),/only be deferred/);
 assert.throws(()=>planEnforcerEquipmentDeferral({
  entries:[{...ledger[0],enforcerClassLevel:10}],classLevel:10,
 }),/only be deferred/);
});
test('GM dialog and public API route equipment decisions to governed class feature actions',()=>{
 // Keep application wiring explicit; the data plan is independently tested.
 // The UI cannot grant arbitrary actor credits or bypass canonical inventory.
 const codePromise=import('node:fs').then(async fs=>{
  const path=await import('node:path'),url=await import('node:url');
  const root=path.resolve(path.dirname(url.fileURLToPath(import.meta.url)),'..');
  const index=fs.readFileSync(path.join(root,'index.js'),'utf8');
  const ui=fs.readFileSync(path.join(root,'scripts/apps/enforcer-resource-delivery-dialog.js'),'utf8');
  assert.match(index,/enforcerResources:\s*\{ open: openEnforcerResourceDelivery/);
  assert.match(ui,/EnforcerEquipmentDelivery\.deliver/);
  assert.match(ui,/EnforcerEquipmentDelivery\.defer/);
  assert.doesNotMatch(ui,/system\.credits/);
 });
 return codePromise;
});

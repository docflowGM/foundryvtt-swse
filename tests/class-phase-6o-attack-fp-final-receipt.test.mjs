import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerFoundryPathLoader} from './helpers/foundry-shim/register.mjs';
import {installFoundryShimGlobals} from './helpers/foundry-shim/globals.mjs';

globalThis.window=globalThis.window??{};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry=globalThis.foundry??{};
globalThis.foundry.applications=globalThis.foundry.applications??{};
globalThis.foundry.applications.api=globalThis.foundry.applications.api??{
  ApplicationV2:class{},HandlebarsApplicationMixin:Base=>class extends Base{}
};
globalThis.ui={notifications:{error(){},warn(){},info(){}}};
globalThis.ChatMessage={getSpeaker:()=>({}),create:async()=>({id:'chat'})};

const events=[];
globalThis.Hooks={callAll(name,receipt){if(name==='swse.resourceSpent')events.push(receipt);},on(){},once(){}};
const {ActorEngine}=await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const {createForcePointTransaction}=await import('/systems/foundryvtt-swse/scripts/combat/rolls/force-point-transaction.js');

const originals={spend:ActorEngine.spendForcePoints,gain:ActorEngine.gainForcePoints,update:ActorEngine.updateActor};
ActorEngine.spendForcePoints=async(a,n,options)=>{
  assert.equal(options?.deferResourceEvent,true,'attack is provisional until rolled');
  assert.equal(n,1);
  if(a.system.forcePoints.value<1)return {spent:0,remaining:0};
  a.system.forcePoints.value-=n;
  return {spent:n,normalSpent:n,remaining:a.system.forcePoints.value};
};
ActorEngine.gainForcePoints=async(a,n)=>{
 a.system.forcePoints.value+=n;
 return {gained:n,remaining:a.system.forcePoints.value};
};
ActorEngine.updateActor=async(a,set)=>{
 for(const [path,value] of Object.entries(set)){
   if(path==='flags.swse.bonusForcePoints')a.flags.swse.bonusForcePoints=value;
 }
 return a;
};
const actor=()=>({
 id:'a1',uuid:'Actor.a1',name:'Test Jedi',
 flags:{swse:{}},
 system:{forcePoints:{value:3,max:6}},
 getFlag(scope,key){return this.flags?.[scope]?.[key];}
});
const makeTx=a=>createForcePointTransaction({actor:a,result:6,formula:'1d6',
 reason:'test attack roll',roll:{total:6}});
function reset(){events.length=0;}

try {
  await test('provisional attack FP spend that rolls back never triggers Temptation',async()=>{
    reset();const a=actor();const tx=makeTx(a);
    assert.equal(await tx.commit(),true);
    assert.equal(a.system.forcePoints.value,2);
    assert.equal(events.length,0);
    assert.equal(await tx.rollback(),true);
    assert.equal(a.system.forcePoints.value,3);
    assert.equal(events.length,0);
    assert.equal(await tx.announce(),false);
  });

  await test('attack FP event is emitted only after announce; repeated calls emit once',async()=>{
    reset();const a=actor();const tx=makeTx(a);
    assert.equal(await tx.commit(),true);
    assert.equal(events.length,0);
    assert.equal(await tx.announce(),true);
    assert.equal(events.length,1);
    assert.equal(events[0].committed,true);
    assert.equal(events[0].spent,1);
    assert.equal(events[0].resource,'force');
    assert.equal(events[0].actorId,'Actor.a1');
    assert.equal(events[0].source,'ForcePointTransaction.finalized');
    assert.equal(await tx.announce(),true);
    assert.equal(await tx.finalize(),true);
    assert.equal(events.length,1);
    assert.equal(await tx.rollback(),false);
  });

  await test('explicit transaction finalize emits one event even without chat',async()=>{
    reset();const a=actor();const tx=makeTx(a);
    assert.equal(await tx.commit(),true);
    assert.equal(events.length,0);
    assert.equal(tx.finalize(),true);
    assert.equal(events.length,1);
    assert.equal(tx.finalSpendDispatched,true);
    assert.ok(tx.finalSpendReceiptId);
    await tx.announce();
    assert.equal(events.length,1);
  });

  await test('cannot emit on never-committed, failed or already-rolled-back spend',async()=>{
    reset();const a=actor();const tx=makeTx(a);
    assert.equal(tx.finalize(),false);
    assert.equal(await tx.announce(),false);
    assert.equal(events.length,0);
    a.system.forcePoints.value=0;
    assert.equal(await tx.commit(),false);
    assert.equal(events.length,0);
  });

  await test('real attack transaction uses deferred receipt in the shared attack pipeline',()=>{
    const file=readFileSync(new URL('../scripts/combat/rolls/force-point-transaction.js',import.meta.url),'utf8');
    assert.match(file,/ActorEngine.spendForcePoints\(actor, 1, \{ deferResourceEvent: true \}\)/);
    assert.match(file,/publishFinalResourceSpend\(tx\)/);
    assert.equal((file.match(/publishFinalResourceSpend\(tx\);/g)||[]).length,2,
      'only finalize and announce dispatch a committed spend');
    const attacks=readFileSync(new URL('../scripts/combat/rolls/attacks.js',import.meta.url),'utf8');
    assert.match(attacks,/if \(fpTx\)/);
    assert.match(attacks,/fpTx\.rollback\(\)/);
  });
} finally {
 ActorEngine.spendForcePoints=originals.spend;
 ActorEngine.gainForcePoints=originals.gain;
 ActorEngine.updateActor=originals.update;
}

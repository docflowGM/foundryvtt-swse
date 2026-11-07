import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerFoundryPathLoader} from './helpers/foundry-shim/register.mjs';
import {installFoundryShimGlobals} from './helpers/foundry-shim/globals.mjs';

globalThis.window=globalThis.window??{};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.applications=globalThis.foundry.applications??{};
globalThis.foundry.applications.api=globalThis.foundry.applications.api??{
 ApplicationV2:class {}, HandlebarsApplicationV2:class {}, HandlebarsApplicationMixin:Base=>class extends Base {}
};
globalThis.ChatMessage=globalThis.ChatMessage??{getSpeaker:()=>({}),create:async()=>({})};
const {graftRealForcePointMethods,setPath}=await import('./helpers/real-force-point-engine.mjs');
const events=[];
globalThis.Hooks=globalThis.Hooks??{};
const originalCallAll=globalThis.Hooks.callAll;
globalThis.Hooks.callAll=(name,evt)=>{
  if(name==='swse.resourceSpent')events.push(evt);
  return originalCallAll?.(name,evt);
};

const writer=async(actor,set)=>{
 for(const [path,value] of Object.entries(set))setPath(actor,path,value);
 return actor;
};
const {fake:engine,restore}=await graftRealForcePointMethods(writer);
const actor=(fp=3,bonus=2)=>({
 id:'owned-actor',uuid:'Actor.owned-actor',name:'Watchcircle Test',
 flags:{swse:{bonusForcePoints:{value:bonus,max:bonus,
  entries:bonus?[{id:'temp-1',value:bonus,max:bonus,source:'temporary'}]:[]}}},
 system:{forcePoints:{value:fp,max:5}},
 getFlag(scope,key){return this.flags?.[scope]?.[key];}
});

try {
 await test('normalOnly spends permanent FP and leaves all bonus points untouched',async()=>{
  events.length=0;
  const a=actor(3,2),before=JSON.stringify(a.flags.swse.bonusForcePoints);
  const result=await engine.spendForcePoints(a,1,{normalOnly:true,source:'Watchcircle Initiate'});
  assert.equal(result.spent,1);
  assert.equal(result.normalSpent,1);
  assert.equal(result.bonusSpent,0);
  assert.equal(result.remaining,2);
  assert.equal(a.system.forcePoints.value,2);
  assert.equal(JSON.stringify(a.flags.swse.bonusForcePoints),before);
  assert.equal(events.length,1);
  assert.equal(events[0].resource,'force');
  assert.equal(events[0].actorId,a.uuid);
  assert.equal(events[0].committed,true);
  assert.equal(events[0].spent,1);
 });

 await test('normalOnly does not spend available bonus points if normal pool is empty',async()=>{
  events.length=0;
  const a=actor(0,3);
  const before=JSON.stringify(a.flags.swse.bonusForcePoints);
  const r=await engine.spendForcePoints(a,1,{normalOnly:true});
  assert.equal(r.spent,0);
  assert.equal(a.system.forcePoints.value,0);
  assert.equal(JSON.stringify(a.flags.swse.bonusForcePoints),before);
  assert.equal(events.length,0);
 });

 await test('default spend still uses bonus FP first and emits one receipt',async()=>{
  events.length=0;
  const a=actor(3,2);
  const r=await engine.spendForcePoints(a,1);
  assert.equal(r.spent,1);
  assert.equal(r.normalSpent,0);
  assert.equal(r.bonusSpent,1);
  assert.equal(a.system.forcePoints.value,3);
  assert.equal(a.flags.swse.bonusForcePoints.value,1);
  assert.equal(events.length,1);
 });

 await test('Watchcircle Initiate uses normalOnly authority, not direct FP mutation',()=>{
  const src=readFileSync(new URL('../scripts/engine/talent/consular-talent-actions.js',import.meta.url),'utf8');
  const start=src.indexOf('static async _spendNormalForcePoint(');
  const end=src.indexOf('static async _grantNormalForcePoint(',start);
  const method=src.slice(start,end);
  assert.ok(start>0&&end>start);
  assert.match(method,/ActorEngine.spendForcePoints\(actor, 1, \{/);
  assert.match(method,/normalOnly: true/);
  assert.match(method,/receipt\?\.normalSpent !== 1/);
  assert.doesNotMatch(method,/ActorEngine.updateActor\(/);
 });
} finally {
 restore();
 globalThis.Hooks.callAll=originalCallAll;
}

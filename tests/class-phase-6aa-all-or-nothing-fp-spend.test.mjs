import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

globalThis.window=globalThis.window??{};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry.applications=globalThis.foundry.applications??{};
globalThis.foundry.applications.api=globalThis.foundry.applications.api??{
  ApplicationV2:class {}, HandlebarsApplicationV2:class {},
  HandlebarsApplicationMixin:Base=>class extends Base {}
};
globalThis.ChatMessage=globalThis.ChatMessage??{getSpeaker:()=>({}),create:async()=>({})};
const {graftRealForcePointMethods,setPath}=await import('./helpers/real-force-point-engine.mjs');

const events=[];
const oldCallAll=globalThis.Hooks.callAll;
globalThis.Hooks.callAll=(type,event)=>{
 if(type==='swse.resourceSpent')events.push(event);
};
let mutations=0;
const {fake:engine,restore}=await graftRealForcePointMethods(async(a,payload)=>{
 mutations++;
 for(const [path,value] of Object.entries(payload))setPath(a,path,value);
 return a;
});
const actor=(fp=1,bonus=0)=>({
 id:'strict-fp-actor',uuid:'Actor.strict-fp-actor',name:'Strict Payment',
 system:{forcePoints:{value:fp,max:6}},
 flags:{swse:{bonusForcePoints:{value:bonus,max:bonus,
  entries:bonus?[{id:'bonus-1',source:'test',value:bonus,max:bonus}]:[]}}},
 getFlag(scope,name){return this.flags?.[scope]?.[name];}
});
const reset=()=>{events.length=0;mutations=0};

try {
 await test('strict insufficient FP cost does not partially spend or emit Temptation receipt',async()=>{
  reset();
  const a=actor(1,0),before=JSON.stringify(a);
  const result=await engine.spendForcePoints(a,2,{requireFullAmount:true,source:'ReactionEngine.test'});
  assert.equal(result.spent,0);
  assert.equal(result.rejected,true);
  assert.equal(result.reason,'full-force-point-payment-required');
  assert.equal(mutations,0);
  assert.equal(events.length,0);
  assert.equal(JSON.stringify(a),before);
 });

 await test('strict payment combines bonus-first and normal pool only when full cost can be paid',async()=>{
  reset();
  const a=actor(1,1);
  const result=await engine.spendForcePoints(a,2,{requireFullAmount:true,source:'ReactionEngine.test'});
  assert.equal(result.spent,2);
  assert.equal(result.bonusSpent,1);
  assert.equal(result.normalSpent,1);
  assert.equal(a.system.forcePoints.value,0);
  assert.equal(a.flags.swse.bonusForcePoints.value,0);
  assert.equal(mutations,1);
  assert.equal(events.length,1);
  assert.equal(events[0].committed,true);
  assert.equal(events[0].spent,2);
  assert.equal(events[0].actorId,a.uuid);
 });

 await test('strict normalOnly never silently spends bonus pool when normal FP is short',async()=>{
  reset();
  const a=actor(0,3);
  const before=JSON.stringify(a);
  const r=await engine.spendForcePoints(a,1,{requireFullAmount:true,normalOnly:true});
  assert.equal(r.spent,0);
  assert.equal(r.rejected,true);
  assert.equal(events.length,0);
  assert.equal(mutations,0);
  assert.equal(JSON.stringify(a),before);
 });

 await test('non-strict callers retain existing partial-spend behavior (separate refactor scope)',async()=>{
  reset();
  const a=actor(1,0);
  const r=await engine.spendForcePoints(a,2);
  assert.equal(r.spent,1);
  assert.equal(a.system.forcePoints.value,0);
  assert.equal(events.length,1);
 });

 await test('reaction engine requires exact paid amount through canonical ActorEngine option',()=>{
  const src=readFileSync(new URL('../scripts/engine/combat/reactions/reaction-engine.js',import.meta.url),'utf8');
  const anchor=src.indexOf('const payment = await ActorEngine.spendForcePoints(');
  const after=src.indexOf('if (payment?.spent !== requiredForcePoints)',anchor);
  assert.ok(anchor>0&&after>anchor);
  assert.match(src.slice(anchor,after),/requireFullAmount: true/);
  const ae=readFileSync(new URL('../scripts/governance/actor-engine/actor-engine.js',import.meta.url),'utf8');
  const method=ae.slice(ae.indexOf('async spendForcePoints('),ae.indexOf('async spendDestinyPoints('));
  assert.match(method,/actualSpent !== amount/);
  assert.ok(method.indexOf('actualSpent !== amount')<method.indexOf('await this.updateActor(actor, update)'),
    'reject incomplete strict spend before mutation');
  assert.ok(method.indexOf('actualSpent !== amount')<method.indexOf("'swse.resourceSpent'"),
    'reject incomplete strict spend before receipt publication');
 });
} finally {
 restore();
 globalThis.Hooks.callAll=oldCallAll;
}

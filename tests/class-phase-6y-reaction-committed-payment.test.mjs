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
globalThis.Hooks=globalThis.Hooks??{};
globalThis.Hooks.once=globalThis.Hooks.once??(()=>{});

const { ReactionEngine }=await import('/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-engine.js');
const { ReactionRegistry }=await import('/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-registry.js');
const { SWSEChat }=await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { graftRealForcePointMethods,setPath }=await import('./helpers/real-force-point-engine.mjs');

const emitted=[],order=[];
const oldCallAll=globalThis.Hooks.callAll;
const oldPost=SWSEChat.postHTML;
globalThis.Hooks.callAll=(name,evt)=>{
 if(name==='swse.resourceSpent'){emitted.push(evt);order.push('receipt');}
};
SWSEChat.postHTML=async()=>{order.push('chat');};

const writer=async(actor,set)=>{
 for(const [path,value] of Object.entries(set))setPath(actor,path,value);
 order.push('write');
 return actor;
};
const {restore}=await graftRealForcePointMethods(writer);
const actor=(normal=2,bonus=0)=>({
 id:'reaction-actor',uuid:'Actor.reaction-actor',name:'Reaction Test',
 isOwner:true,items:[],flags:{swse:{bonusForcePoints:{value:bonus,max:bonus,
 entries:bonus?[{id:'bonus-1',value:bonus,max:bonus,source:'temporary'}]:[]}}},
 system:{forcePoints:{value:normal,max:5},derived:{reactions:[key]}},
 getFlag(scope,key){return this.flags?.[scope]?.[key];}
});
const key='testPaidClassReaction6Y';
const setReaction=({cost=1,handler=async()=>({success:true})}={})=>{
 ReactionRegistry.registerReaction(key,{
  key,label:'Test Class Reaction',trigger:'ON_ATTACK_DECLARED',
  description:'Test',conditions:{},usage:{perRound:false,perEncounter:false},
  cost:{action:'reaction',forcePoints:cost,talentResources:null},handler
 });
};
const run=(defender,forcePointCost=0)=>ReactionEngine.resolveReaction({
 reactionKey:key,defender,attacker:{id:'attacker'},forcePointCost,
 attackContext:{trigger:'ON_ATTACK_DECLARED'}
});

try {
 await test('registered cost cannot be bypassed; paid receipt precedes handler',async()=>{
  order.length=0;emitted.length=0;
  const a=actor(1,1);
  setReaction({cost:1,handler:async()=>{
   order.push('handler');
   assert.equal(a.flags.swse.bonusForcePoints.value,0);
   assert.equal(a.system.forcePoints.value,1);
   return {success:true,resultMessage:'resolved'};
  }});
  const res=await run(a);
  assert.equal(res.success,true);
  assert.equal(a.system.forcePoints.value,1,'bonus-first pool must be preserved');
  assert.equal(emitted.length,1);
  assert.equal(emitted[0].spent,1);
  assert.equal(emitted[0].committed,true);
  assert.equal(emitted[0].actorId,a.uuid);
  assert.ok(order.indexOf('receipt')>=0 && order.indexOf('receipt')<order.indexOf('handler'));
 });

 await test('unpaid reaction is blocked before handler runs',async()=>{
  order.length=0;emitted.length=0;
  setReaction({cost:1,handler:async()=>{order.push('handler');return {success:true};}});
  const res=await run(actor(0,0));
  assert.equal(res.success,false);
  assert.doesNotMatch(String(res.error),/already running/);
  assert.equal(order.includes('handler'),false);
  assert.equal(emitted.length,0);
 });

 await test('failed paid attempt remains spent but never reports success or consumes a usage activation',async()=>{
  order.length=0;emitted.length=0;
  setReaction({cost:1,handler:async()=>{throw new Error('reaction roll failed')}});
  const a=actor(1,0);
  const res=await run(a);
  assert.equal(res.success,false);
  assert.match(res.error,/reaction roll failed/);
  assert.equal(a.system.forcePoints.value,0);
  assert.equal(emitted.length,1,'a genuinely committed failed attempt still spends FP');
 });

 await test('zero-cost reaction remains free; caller cost cannot lower registered cost',async()=>{
  order.length=0;emitted.length=0;
  setReaction({cost:0,handler:async()=>{order.push('free-handler');return {success:true}}});
  assert.equal((await run(actor(0,0))).success,true);
  assert.equal(emitted.length,0);
  setReaction({cost:1,handler:async()=>{order.push('paid-handler');return {success:true}}});
  assert.equal((await run(actor(0,0),0)).success,false);
  assert.equal(order.includes('paid-handler'),false);
 });

 await test('chat delivery failure does not change paid mechanical success',async()=>{
  const original=SWSEChat.postHTML;
  SWSEChat.postHTML=async()=>{throw new Error('chat display unavailable');};
  try {
    setReaction({cost:0,handler:async()=>({success:true,resultMessage:'resolved'})});
    const res=await run(actor(0,0));
    assert.equal(res.success,true,'chat presentation cannot roll back the handler');
  } finally {
    SWSEChat.postHTML=original;
  }
 });

 await test('reaction engine calls supported postHTML API, not missing postMessage',()=>{
  const engineSource=readFileSync(new URL('../scripts/engine/combat/reactions/reaction-engine.js',import.meta.url),'utf8');
  const chatSource=readFileSync(new URL('../scripts/chat/swse-chat.js',import.meta.url),'utf8');
  assert.match(engineSource,/SWSEChat\.postHTML\(/);
  assert.doesNotMatch(engineSource,/SWSEChat\.postMessage\(/);
  assert.match(chatSource,/static async postHTML\(/);
  assert.doesNotMatch(chatSource,/static async postMessage\(/);
  assert.match(engineSource,/escapeReactionText\(message\)/,
    'reaction messages must escape untrusted result text');
 });

 await test('invalid reaction cost fails closed',async()=>{
  order.length=0;emitted.length=0;
  setReaction({cost:-1,handler:async()=>{order.push('handler');}});
  assert.equal((await run(actor())).success,false);
  assert.equal(order.includes('handler'),false);
  assert.equal(emitted.length,0);
 });

 await test('legacy Force/Destiny fallback handlers delegate to canonical spend authority',()=>{
  const source=readFileSync(new URL('../scripts/engine/combat/reactions/reaction-registry.js',import.meta.url),'utf8');
  const begin=source.indexOf('async "force-point"(');
  const end=source.indexOf('\n};\n\nHooks.once(',begin);
  assert.ok(begin>0 && end>begin);
  const section=source.slice(begin,end);
  assert.match(section,/ActorEngine\.spendForcePoints\(/);
  assert.match(section,/ActorEngine\.spendDestinyPoints\(/);
  assert.match(section,/payment\?\.spent !== 1/g);
  assert.doesNotMatch(section,/ActorEngine\.apply\(/);
  assert.doesNotMatch(section,/"system\.(?:forcePoints|destinyPoints)\.value"\s*:/);
 });
} finally {
 restore();
 SWSEChat.postHTML=oldPost;
 globalThis.Hooks.callAll=oldCallAll;
 delete ReactionRegistry.registry[key];
}

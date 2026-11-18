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

const { ReactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-engine.js');
const { ReactionRegistry } = await import('/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-registry.js');
const { SWSEChat } = await import('/systems/foundryvtt-swse/scripts/chat/swse-chat.js');
const { graftRealForcePointMethods, setPath } = await import('./helpers/real-force-point-engine.mjs');

const key='admissionProof6Z';
const receipts=[];
let called=0;
const oldPost=SWSEChat.postHTML;
const oldCallAll=globalThis.Hooks.callAll;
SWSEChat.postHTML=async()=>({});
globalThis.Hooks.callAll=(event,payload)=>{ if(event==='swse.resourceSpent')receipts.push(payload); };
const { restore }=await graftRealForcePointMethods(async(a,set)=>{
 for(const [k,v] of Object.entries(set))setPath(a,k,v);
 return a;
});

const actor=({owns=true,disabled=false,derived=true,fp=2}={})=>({
 id:'admission-target',uuid:'Actor.admission-target',name:'Admitted',
 isOwner:true,
 system:{forcePoints:{value:fp,max:3},derived:{reactions:owns&&derived?[key]:[]}},
 flags:{swse:{bonusForcePoints:{value:0,max:0,entries:[]}}},
 items:owns&&!derived?[{id:'feat-rxn',type:'feat',name:'Registered Reaction',
  system:{disabled,abilityMeta:{reactionKey:key}}}]:[],
 getFlag(scope,flag){return this.flags?.[scope]?.[flag];}
});
const register=({conditions={},cost=1,trigger='ON_ATTACK_DECLARED'}={})=>{
 ReactionRegistry.registerReaction(key,{
  key,label:'Test Reaction',trigger,description:'Test only',conditions,
  usage:{perRound:false,perEncounter:false},
  cost:{action:'reaction',forcePoints:cost},
  handler:async()=>{called++; return {success:true,resultMessage:'done'};}
 });
};
const roll=(defender,context={})=>ReactionEngine.resolveReaction({
 reactionKey:key,defender,attacker:{id:'attack-source'},
 attackContext:{
  trigger:'ON_ATTACK_DECLARED',attackType:'ranged',
  damageType:'energy',damageTypes:['energy'],originalDamageTypes:['energy'],
  sonicCannotBeDeflected:false,cannotBeNegatedBy:[],...context
 }
});
const clear=()=>{called=0;receipts.length=0;};

try {
 await test('global registry registration without defender ownership is insufficient',async()=>{
  clear();register();
  const a=actor({owns:false});
  const result=await roll(a);
  assert.equal(result.success,false);
  assert.match(result.error,/does not own/);
  assert.equal(a.system.forcePoints.value,2);
  assert.equal(called,0);
  assert.equal(receipts.length,0);
 });

 await test('owned Item reaction is accepted, disabled item is rejected',async()=>{
  clear();register({cost:0});
  assert.equal((await roll(actor({derived:false}))).success,true);
  assert.equal(called,1);
  clear();
  const denied=await roll(actor({derived:false,disabled:true}));
  assert.equal(denied.success,false);
  assert.match(denied.error,/does not own/);
  assert.equal(called,0);
 });

 await test('owned keyed reaction rejects wrong trigger before committing paid FP',async()=>{
  clear();register({trigger:'ON_ATTACK_MISSED'});
  const a=actor();
  const result=await roll(a);
  assert.equal(result.success,false);
  assert.match(result.error,/not eligible/);
  assert.equal(a.system.forcePoints.value,2);
  assert.equal(called,0);
  assert.equal(receipts.length,0);
 });

 await test('wrong attack form, damage type and negation restrictions fail closed',async()=>{
  clear();register({conditions:{validAttackTypes:['melee'],validDamageTypes:['energy']}});
  assert.equal((await roll(actor())).success,false);
  register({conditions:{validAttackTypes:['ranged'],validDamageTypes:['force']}});
  assert.equal((await roll(actor())).success,false);
  register({conditions:{validAttackTypes:['ranged'],validDamageTypes:['energy']}});
  const def=ReactionRegistry.getReaction(key);
  def.negationAbility='deflect';
  const blocked=await roll(actor(),{cannotBeNegatedBy:['deflect']});
  assert.equal(blocked.success,false);
  assert.equal(called,0);
  assert.equal(receipts.length,0);
 });

 await test('weapon-required reactions match a real attacker weapon, never untrusted names',async()=>{
  clear();register({cost:0,conditions:{requiresWeaponText:['lightsaber']}});
  const absent=await roll(actor(),{weapon:null});
  assert.equal(absent.success,false);
  assert.equal(called,0);
  const wrong=await roll(actor(),{weapon:{name:'Ranged Blaster',system:{weaponType:'pistol'}}});
  assert.equal(wrong.success,false);
  assert.equal(called,0);
  const good=await roll(actor(),{weapon:{name:'Training Lightsaber',system:{weaponType:'lightsaber'}}});
  assert.equal(good.success,true);
  assert.equal(called,1);
 });

 await test('eligible owned paid reaction emits one committed receipt before executing',async()=>{
  clear();register({conditions:{validAttackTypes:['ranged'],validDamageTypes:['energy']}});
  const a=actor();
  const result=await roll(a);
  assert.equal(result.success,true);
  assert.equal(a.system.forcePoints.value,1);
  assert.equal(receipts.length,1);
  assert.equal(receipts[0].committed,true);
  assert.equal(receipts[0].actorId,a.uuid);
  assert.equal(called,1);
 });

 await test('non-owner is refused without spending FP',async()=>{
  clear();register();
  const a=actor();a.isOwner=false;
  const prior=globalThis.game?.user?.isGM;
  if(globalThis.game?.user)globalThis.game.user.isGM=false;
  try {
   const result=await roll(a);
   assert.equal(result.success,false);
   assert.match(result.error,/cannot control/);
   assert.equal(receipts.length,0);
   assert.equal(called,0);
  } finally {
   if(globalThis.game?.user)globalThis.game.user.isGM=prior;
  }
 });

 await test('both chat renderers and the click bridge preserve typed eligibility context',()=>{
  const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
  const attack=source('scripts/combat/rolls/attacks.js');
  const rollEngine=source('scripts/engine/rolls/swse-roll-engine.js');
  const template=source('templates/chat/holo-roll.hbs');
  const fullAttack=source('scripts/engine/combat/full-attack-card-renderer.js');
  const bridge=source('scripts/ui/chat/chat-interaction-bridge.js');
  for(const text of [attack,rollEngine,template,fullAttack,bridge]){
   assert.match(text,/attackType|attack-type/);
   assert.match(text,/damageTypes|damage-types/);
   assert.match(text,/cannotBeNegatedBy|cannot-be-negated-by/);
  }
  assert.match(bridge,/sonicCannotBeDeflected: button\.dataset\.swseSonicCannotBeDeflected === 'true'/);
  assert.match(template,/data-swse-original-damage-types=/);
  assert.match(fullAttack,/data-swse-original-damage-types=/);
  assert.match(template,/data-swse-weapon-id=/);
  assert.match(fullAttack,/data-swse-weapon-id=/);
  assert.match(bridge,/attacker\?\.items\?\.get\?\./);
 });
} finally {
 delete ReactionRegistry.registry[key];
 restore();
 SWSEChat.postHTML=oldPost;
 globalThis.Hooks.callAll=oldCallAll;
}

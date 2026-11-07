import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerFoundryPathLoader} from './helpers/foundry-shim/register.mjs';
import {installFoundryShimGlobals} from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader();
installFoundryShimGlobals();

const {admitClassImmuneActiveEffects,typedActiveEffectDescriptors}=await import(
  '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-feature-effect-admission.js'
);
const actor=(cls,darkSide=0)=>({
 items:cls?[{type:'class',name:cls,system:{
  classId:({'Force Disciple':'ef6fe8fdbbd884b4','Jedi Master':'07a64453f95e04f2',
    'Sith Lord':'2f7cfdc115c640a5'})[cls],level:1}}]:[],
 system:{darkSide:{value:darkSide},attributes:{wis:{base:12}}}
});
const effect=(name,flags={},system={})=>({name,flags,system});

test('exact descriptor flags classify typed effects without broad name or prose heuristics',()=>{
 assert.deepEqual(typedActiveEffectDescriptors(effect('Frightening rumors')),{mindAffecting:false,fear:false});
 assert.deepEqual(typedActiveEffectDescriptors(effect('Mislead',{swse:{mindAffecting:true}})),{mindAffecting:true,fear:false});
 assert.deepEqual(typedActiveEffectDescriptors(effect('Daze',{swse:{tags:['Mind-Affecting']}})),{mindAffecting:true,fear:false});
 assert.deepEqual(typedActiveEffectDescriptors(effect('Fear',{'foundryvtt-swse':{effectTags:['fear']}})),{mindAffecting:false,fear:true});
 assert.deepEqual(typedActiveEffectDescriptors(effect('Not a descriptor',{swse:{note:'Mind-Affecting fear',tags:['fearsome']}})),{mindAffecting:false,fear:false});
});

test('Force Disciple rejects typed mind effects but preserves unrelated effects and source text',()=>{
 const d=actor('Force Disciple');
 const mind=effect('Dampen Presence',{swse:{mindAffecting:true,memorySuppressed:true}});
 const neutral=effect('Might',{swse:{tags:['enhancement']}});
 const namedOnly=effect('Mind-Affecting Wording',{},{}); // Not an explicit descriptor.
 const gate=admitClassImmuneActiveEffects(d,[mind,neutral,namedOnly]);
 assert.deepEqual(gate.permitted,[neutral,namedOnly]);
 assert.equal(gate.suppressed.length,1);
 assert.match(gate.suppressed[0].reason,/Indomitable/);
 assert.equal(admitClassImmuneActiveEffects(actor(null),[mind]).permitted.length,1);
 const spoof={items:[{type:'feat',name:'Force Disciple',system:{level:5}}]};
 assert.equal(admitClassImmuneActiveEffects(spoof,[mind]).permitted.length,1);
});

test('Fearless guards Jedi Master or active Sith Lord; suspended Sith Lord is not immune',()=>{
 const fear=effect('Frightening Cleave',{swse:{fear:true}});
 const mind=effect('Affect Mind',{swse:{descriptors:['mind-affecting']}});
 for(const a of [actor('Jedi Master'),actor('Sith Lord',12)]){
  const g=admitClassImmuneActiveEffects(a,[fear,mind]);
  assert.deepEqual(g.permitted,[mind]);
  assert.equal(g.suppressed[0].descriptor,'Fear');
 }
 assert.deepEqual(admitClassImmuneActiveEffects(actor('Sith Lord',11),[fear]).permitted,[fear]);
});

test('ActorEngine gates both canonical effect creation entries BEFORE embedded document mutation',()=>{
 const src=readFileSync(new URL('../scripts/governance/actor-engine/actor-engine.js',import.meta.url),'utf8');
 const a=src.indexOf('async createEmbeddedDocuments(actor, embeddedName, data, options = {})');
 const b=src.indexOf('async deleteEmbeddedDocuments(',a);
 const body=src.slice(a,b);
 assert.ok(a>=0&&b>a);
 assert.ok(body.indexOf('admitClassImmuneActiveEffects(actor, data)')>=0);
 assert.ok(body.indexOf('admitClassImmuneActiveEffects(actor, data)')<body.indexOf('actor.createEmbeddedDocuments(embeddedName, safeData, options)'));
 const c=src.indexOf('async createActiveEffects(actor, effectData, options = {})');
 const d=src.indexOf('async deleteActiveEffects(',c);
 const other=src.slice(c,d);
 assert.ok(c>=0&&d>c);
 assert.ok(other.indexOf('admitClassImmuneActiveEffects(actor, effectData)')>=0);
 assert.ok(other.indexOf('admitClassImmuneActiveEffects(actor, effectData)')<other.indexOf("actor.createEmbeddedDocuments('ActiveEffect', normalizedEffectData, options)"));
 assert.match(body,/if \(!admission\.permitted\.length\) return \[\]/);
 assert.match(other,/if \(!admission\.permitted\.length\) return \[\]/);
});

test('effect wrapper routes through ActorEngine createEmbeddedDocuments rather than bypassing class gate',()=>{
 const src=readFileSync(new URL('../scripts/core/document-api-v13.js',import.meta.url),'utf8');
 const start=src.indexOf('export async function createEffectOnActor(');
 const end=src.indexOf('export async function deleteEffectFromActor(',start);
 const body=src.slice(start,end);
 assert.match(body,/ActorEngine\.createEmbeddedDocuments\(actor, 'ActiveEffect', dataArray, options\)/);
});

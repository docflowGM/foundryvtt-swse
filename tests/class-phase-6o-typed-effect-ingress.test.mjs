import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerFoundryPathLoader} from './helpers/foundry-shim/register.mjs';
import {installFoundryShimGlobals} from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader();installFoundryShimGlobals();

const {
  typedEffectContext,resolveForceClassTypedEffectImmunity,
  filterForceClassImmuneActiveEffects
} = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/force-class-effect-ingress.js');
const pack=readFileSync(new URL('../packs/classes.db',import.meta.url),'utf8')
  .trim().split(/\r?\n/).map(JSON.parse);
const classDoc=name=>({type:'class',name,system:{classId:pack.find(x=>x.name===name)._id,level:1}});
const target=(name,score=12)=>({name,items:[classDoc(name)],system:{
  darkSide:{value:score},attributes:{wis:{base:12}}
}});
const effect=(name,tags)=>({name,flags:{swse:{effectTags:tags}}});

test('every explicitly Fear-tagged effect is rejected on Jedi Master and active Sith Lord',()=>{
 for(const name of ['Jedi Master','Sith Lord']){
   const who=target(name);
   const {accepted,suppressed}=filterForceClassImmuneActiveEffects(who,[
     effect('Cowering',['fear']),effect('Attack bonus',['morale'])
   ]);
   assert.equal(accepted.length,1);
   assert.equal(accepted[0].name,'Attack bonus');
   assert.equal(suppressed.length,1);
   assert.equal(suppressed[0].decision.reason,'fearless-class-feature');
 }
});

test('suspended Sith Lord and unrelated actors receive fear effects normally',()=>{
 const sith=target('Sith Lord',11);
 assert.equal(resolveForceClassTypedEffectImmunity(sith,effect('Terrifying effect',['fear'])).immune,false);
 const unrelated=target('Jedi Knight');
 assert.equal(resolveForceClassTypedEffectImmunity(unrelated,effect('Terrifying effect',['fear'])).immune,false);
});

test('Indomitable blocks explicitly Mind-Affecting; no inference from names or themes',()=>{
 const who=target('Force Disciple');
 assert.equal(resolveForceClassTypedEffectImmunity(who,effect('Suggestion',['mind-affecting'])).immune,true);
 assert.equal(resolveForceClassTypedEffectImmunity(who,{
  name:'Hypnotic Tone',flags:{'foundryvtt-swse':{mindAffecting:true}}
 }).immune,true);
 assert.equal(resolveForceClassTypedEffectImmunity(who,effect('Fearsome Reputation',['charisma'])).immune,false);
 assert.equal(resolveForceClassTypedEffectImmunity(who,{name:'Mind Strike',description:'Mind Affecting'}).immune,false);
 assert.equal(resolveForceClassTypedEffectImmunity(target('Jedi Master'),effect('Calm',['mind-affecting'])).immune,false);
});

test('mixed incoming batch is filtered, preserving unchanged eligible effect references',()=>{
 const who=target('Force Disciple');
 const permitted={name:'Shield',flags:{swse:{tags:['defense']}}};
 const denied={name:'Compulsion',flags:{swse:{effectTags:['mind_affecting']}}};
 const data=[permitted,denied];
 const plan=filterForceClassImmuneActiveEffects(who,data);
 assert.deepEqual(plan.accepted,[permitted]);
 assert.equal(plan.accepted[0],permitted);
 assert.equal(data.length,2);
 assert.equal(typedEffectContext(denied).mindAffecting,false);
 assert.equal(plan.suppressed.length,1);
});

test('mutation ingress checks apply BEFORE ActiveEffect documents and condition updates',()=>{
 const actorEngine=readFileSync(new URL('../scripts/governance/actor-engine/actor-engine.js',import.meta.url),'utf8');
 const condition=readFileSync(new URL('../scripts/engine/combat/ConditionEngine.js',import.meta.url),'utf8');
 const a=actorEngine.slice(actorEngine.indexOf('async createActiveEffects('),actorEngine.indexOf('async deleteActiveEffects('));
 const b=actorEngine.slice(actorEngine.indexOf('async createEmbeddedDocuments('),actorEngine.indexOf('async deleteEmbeddedDocuments('));
 assert.ok(a.indexOf('filterForceClassImmuneActiveEffects(')>-1);
 assert.ok(b.indexOf('filterForceClassImmuneActiveEffects(')>-1);
 assert.ok(a.indexOf('filterForceClassImmuneActiveEffects(')<a.indexOf("actor.createEmbeddedDocuments('ActiveEffect'"));
 assert.ok(b.indexOf('filterForceClassImmuneActiveEffects(')<b.indexOf('actor.createEmbeddedDocuments(embeddedName'));
 const start=condition.indexOf('static async applyConditionStep(');
 const body=condition.slice(start,condition.indexOf('static async improveCondition(',start));
 assert.ok(body.indexOf('resolveForceClassTypedEffectImmunity(')<body.indexOf('ActorEngine.setConditionStep('));
 assert.doesNotMatch(a,/actor\.update\(/);
});

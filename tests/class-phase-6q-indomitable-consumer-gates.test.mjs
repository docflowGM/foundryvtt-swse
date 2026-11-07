import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerFoundryPathLoader} from './helpers/foundry-shim/register.mjs';
import {installFoundryShimGlobals} from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader();
installFoundryShimGlobals();

const {resolveForceDiscipleIndomitable}=await import(
  '/systems/foundryvtt-swse/scripts/engine/progression/utils/force-disciple-features.js'
);
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const disciple=(level=1)=>({
 items:[{type:'class',name:'Force Disciple',
   system:{classId:'ef6fe8fdbbd884b4',level}}],
 system:{darkSide:{value:0},attributes:{wis:{base:12}}}
});

test('Indomitable class authority is independent of caster, roll and target Will Defense',()=>{
 for(const level of [1,2,5]){
   assert.equal(resolveForceDiscipleIndomitable(disciple(level),{mindAffecting:true}).immune,true);
 }
 assert.equal(resolveForceDiscipleIndomitable(disciple(),{mindAffecting:false}).immune,false);
 const falseClass={items:[{type:'feat',name:'Force Disciple',system:{level:5}}]};
 assert.equal(resolveForceDiscipleIndomitable(falseClass,{mindAffecting:true}).immune,false);
});

test('live Consular Adept/Master Negotiator applies immunity before any CT or effect write',()=>{
 const source=read('scripts/engine/talent/consular-talent-actions.js');
 const start=source.indexOf('static async resolveAdeptNegotiator(');
 const stop=source.indexOf('static async promptSkilledAdvisor(',start);
 assert.ok(start>0&&stop>start,'active Consular resolver located');
 const body=source.slice(start,stop);
 const gate=body.indexOf('resolveForceDiscipleIndomitable(targetActor, { mindAffecting: true })');
 const applied=body.indexOf('ConditionEngine.applyConditionStep(');
 const flagged=body.indexOf('targetActor.setFlag(');
 const effect=body.indexOf('createEffectOnActor(');
 assert.ok(gate>=0&&applied>gate&&flagged>gate&&effect>gate);
 assert.match(body,/if \(immunity\.immune\) \{/);
 assert.match(body,/return \{ success:false,immune:true/);
 assert.match(body,/No Condition Track movement or Broken Resolve is applied/);
});

test('live Sentinel Dampen Presence checks immunity before memory-effect creation',()=>{
 const source=read('scripts/engine/talent/sentinel-talent-actions.js');
 const start=source.indexOf('static async promptDampenPresence(');
 const stop=source.indexOf('static async promptDarkRetaliation(',start);
 assert.ok(start>0&&stop>start);
 const body=source.slice(start,stop);
 const guard=body.indexOf('resolveForceDiscipleIndomitable(target.actor, { mindAffecting:true })');
 const effect=body.indexOf('createEffectOnActor(');
 assert.ok(guard>=0&&effect>guard,'immunity must precede ActiveEffect creation');
 assert.match(body,/if \(immune\) \{/);
 assert.match(body,/return \{ success:false,immune:true,roll:total,dc \}/);
 assert.match(body,/Mind-Affecting/);
});

test('all unaffected Consular/ Sentinel talents remain unaffected by the narrow gate',()=>{
 const c=read('scripts/engine/talent/consular-talent-actions.js');
 const s=read('scripts/engine/talent/sentinel-talent-actions.js');
 assert.equal((c.match(/resolveForceDiscipleIndomitable\(/g)||[]).length,1);
 assert.equal((s.match(/resolveForceDiscipleIndomitable\(/g)||[]).length,1);
 const target=disciple();
 const nonmind={sourceItem:{name:'Force Lightning',system:{tags:['dark-side']}}};
 assert.equal(resolveForceDiscipleIndomitable(target,nonmind).immune,false);
});

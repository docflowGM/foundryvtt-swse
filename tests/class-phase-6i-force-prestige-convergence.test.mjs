import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  forceDiscipleClassLevel,
  isExplicitMindAffecting,
  resolveForceDiscipleIndomitable,
  planForceDiscipleProphetAward,
} from '../scripts/engine/progression/utils/force-disciple-features.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url),'utf8');
const classes = read('packs/classes.db').trim().split(/\r?\n/).map(JSON.parse);
const classRow = name => {
  const matches=classes.filter(c=>c.name===name);
  assert.equal(matches.length,1, `unique class: ${name}`);
  return matches[0].system;
};
const featureLevels=(name,type)=>classRow(name).level_progression.flatMap(row=>
  row.features.filter(f=>f.type===type).map(()=>row.level));
const classItem=(name,level, extra={})=>({
  type:'class',name,system:{classId:name.toLowerCase().replace(/\s+/g,'_'),level,...extra}
});
const actor=(classes=[],destiny=true,dp=0,max=0)=>({
  items:classes,
  system:{destiny:{hasDestiny:destiny},destinyPoints:{value:dp,max}},
  flags:{swse:{}}
});
const manifest=(classLevel=1,characterLevel=13,className='Force Disciple')=>({
  kind:'swse-level-up-entitlement-manifest',
  className,classLevel,characterLevel,
  context:{mode:'levelup',eventType:'advanceOneLevel',selectedClassNextLevel:classLevel,enteringLevel:characterLevel}
});

test('Force Adept, Jedi Knight and Imperial Knight preserve printed talent/Force Technique cadence',()=>{
  const specifications={
    'Force Adept':{bab:[0,1,2,3,3,4,5,6,6,7],def:[2,2,4],hit:8},
    'Jedi Knight':{bab:[1,2,3,4,5,6,7,8,9,10],def:[2,2,2],hit:10},
    'Imperial Knight':{bab:[1,2,3,4,5,6,7,8,9,10],def:[2,2,2],hit:10},
  };
  for(const [name,config] of Object.entries(specifications)){
    const c=classRow(name);
    assert.deepEqual(c.level_progression.map(r=>r.level),[1,2,3,4,5,6,7,8,9,10]);
    assert.deepEqual(c.level_progression.map(r=>r.bab),config.bab);
    assert.equal(c.hit_die,config.hit);
    assert.deepEqual([c.defenses.fortitude,c.defenses.reflex,c.defenses.will],config.def);
    assert.deepEqual(featureLevels(name,'talent_choice'),[1,3,5,7,9]);
    assert.deepEqual(featureLevels(name,'force_technique_choice'),[2,4,6,8,10]);
    assert.deepEqual(featureLevels(name,'force_secret_choice'),[]);
  }
});

test('Force Disciple has one Prophet + Indomitable unlock, odd-level talents, secrets at levels 2-5',()=>{
  const c=classRow('Force Disciple');
  assert.equal(c.level_progression.length,5);
  assert.deepEqual(c.level_progression.map(r=>r.bab),[0,1,2,3,3]);
  assert.deepEqual([c.defenses.fortitude,c.defenses.reflex,c.defenses.will],[3,3,6]);
  assert.equal(c.hit_die,8);
  assert.equal(c.force_point_base,7);
  assert.deepEqual(featureLevels('Force Disciple','talent_choice'),[1,3,5]);
  assert.deepEqual(featureLevels('Force Disciple','force_secret_choice'),[2,3,4,5]);
  assert.deepEqual(featureLevels('Force Disciple','force_technique_choice'),[]);
  const feature=(name)=>c.level_progression.flatMap(r=>r.features.filter(f=>f.name===name).map(()=>r.level));
  assert.deepEqual(feature('Indomitable'),[1]);
  assert.deepEqual(feature('Prophet'),[1]);
});

test('Indomitable never infers class ownership from a name on a feat or a conflicting class id',()=>{
  assert.equal(forceDiscipleClassLevel(actor([classItem('Force Disciple',2)])),2);
  assert.equal(forceDiscipleClassLevel(actor([{type:'feat',name:'Force Disciple',system:{level:5}}])),0);
  assert.equal(forceDiscipleClassLevel(actor([{type:'class',name:'Force Disciple',system:{classId:'jedi',level:5}}])),0);
  assert.equal(forceDiscipleClassLevel(actor([classItem('Force Disciple',2,{disabled:true})])),0);
});

test('Indomitable protects ONLY explicitly Mind-Affecting effects',()=>{
  const disciple=actor([classItem('Force Disciple',1)]);
  assert.equal(resolveForceDiscipleIndomitable(disciple,{mindAffecting:true}).immune,true);
  assert.equal(resolveForceDiscipleIndomitable(disciple,{sourceItem:{system:{tags:['Mind-Affecting']}}}).immune,true);
  assert.equal(isExplicitMindAffecting({effectTags:['mind-affecting','dark-side']}),true);
  for(const context of [
    {sourceItem:{name:'Mind Trick',system:{tags:[]}}},
    {sourceItem:{name:'Fearsome Blade',system:{tags:[]}}},
    {sourceItem:{system:{description:'fear causes damage'}}},
    {effectType:'mind-shield'},
    {tags:['telekinetic']},
  ])assert.equal(resolveForceDiscipleIndomitable(disciple,context).immune,false);
  assert.equal(resolveForceDiscipleIndomitable(actor([classItem('Force Adept',10)]),{mindAffecting:true}).immune,false);
});

test('Prophet awards exactly two TOTAL Destiny Points for a valid Force Disciple level-up',()=>{
  const a=actor([classItem('Force Disciple',1)],true,3,7);
  const plan=planForceDiscipleProphetAward({actor:a,manifest:manifest(2,14)});
  assert.equal(plan.allowed,true,plan.reason);
  assert.equal(plan.grant,2);
  assert.equal(plan.updates['system.destinyPoints.value'],5);
  assert.equal(plan.updates['system.destinyPoints.max'],9);
  assert.equal(plan.updates['flags.swse.forceDiscipleProphetAwards']['2'].visionRequested,false);
  assert.equal(a.system.destinyPoints.value,3,'pure plan must not mutate');
  assert.equal(planForceDiscipleProphetAward({actor:a,manifest:manifest(2,14),visionRequested:true}).grant,1);
});

test('immediate prophetic vision sacrifices extra DP and records GM-adjudicated state',()=>{
  const a=actor([classItem('Force Disciple',0)],true,0,0);
  const plan=planForceDiscipleProphetAward({actor:a,manifest:manifest(1,13),visionRequested:true});
  assert.equal(plan.allowed,true);
  assert.equal(plan.grant,1);
  assert.equal(plan.visionPendingGm,true);
  assert.equal(plan.updates['flags.swse.forceDiscipleProphetAwards']['1'].pendingGmVision,true);
});

test('Prophet fails closed for missing Destiny, forged event, duplicate and post-level-up repeat',()=>{
  const a=actor([classItem('Force Disciple',1)],true,2,2);
  const m=manifest(2,14);
  assert.equal(planForceDiscipleProphetAward({actor:a,manifest:m}).allowed,true);
  a.flags.swse.forceDiscipleProphetAwards={'2':{grant:2}};
  assert.equal(planForceDiscipleProphetAward({actor:a,manifest:m}).reason,'already-awarded');
  a.flags.swse.forceDiscipleProphetAwards={};
  assert.equal(planForceDiscipleProphetAward({actor:a,manifest:manifest(3,14)}).reason,'class-level-not-pending');
  assert.equal(planForceDiscipleProphetAward({actor:a,manifest:manifest(2,14,'Jedi Knight')}).allowed,false);
  assert.equal(planForceDiscipleProphetAward({actor:actor([classItem('Force Disciple',1)],false),manifest:m}).reason,'actor-has-no-destiny');
  const invalid=actor([classItem('Force Disciple',1)],true,2,2);
  invalid.system.destinyPoints.value='unknown';
  assert.equal(planForceDiscipleProphetAward({actor:invalid,manifest:m}).reason,'destiny-pool-unverified');
  const after=actor([classItem('Force Disciple',2)],true,4,4);
  assert.equal(planForceDiscipleProphetAward({actor:after,manifest:m}).reason,'class-level-not-pending');
});

test('production level-up economy consumes entitlement manifest and commits Prophet in one plan',()=>{
  const economy=read('scripts/apps/progression-framework/shell/mutation/progression-economy-plan-builder.js');
  assert.match(economy,/planSet\['flags\.swse\.levelUpEntitlementManifest'\]/);
  assert.match(economy,/planForceDiscipleProphetAward\(/);
  assert.match(economy,/if \(prophet\.allowed\) Object\.assign\(set, prophet\.updates\)/);
  assert.doesNotMatch(economy,/ActorEngine\.(?:updateActor|apply)\(/,'builder must remain pure');
});

test('Indomitable is routed at the existing Force-effect suppression boundary',()=>{
  const protection=read('scripts/engine/combat/damage-type-rules.js');
  const i=protection.indexOf('export function targetSuppressesForceEffect(');
  const body=protection.slice(i,protection.indexOf('export function applyDamageTypeProtectionToPacket(',i));
  assert.match(body,/resolveForceDiscipleIndomitable\(target,/);
  assert.match(body,/if \(mind\.immune\) return/);
  assert.ok(body.indexOf('if (mind.immune)') < body.indexOf('isYuuzhanVongActor(target)'));
  const power=read('scripts/engine/force/force-power-effects-engine.js');
  assert.match(power,/targetSuppressesForceEffect\(/);
});

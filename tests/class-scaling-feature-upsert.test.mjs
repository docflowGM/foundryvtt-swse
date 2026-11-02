import test from 'node:test';
import assert from 'node:assert/strict';
import { planScalingClassFeatureUpdate } from '../scripts/engine/progression/utils/class-scaling-feature-upsert.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const feature=(key,value,level,name='Contraband')=>({
 name,classLevel:level,system:{featureKey:key,value,unit:'credits',progressionFeatureType:'scaling_feature'},
});
const item=(id,key,value,level=2)=>({
 _id:id,type:'feat',name:'Contraband',system:{sourceType:'class-feature',featureKey:key,value,grantedClassLevel:level},
});

test('Improviser upgrades one existing Contraband feature rather than creating five independent items',()=>{
 const key='improviser.contraband';
 assert.equal(planScalingClassFeatureUpdate([],feature(key,2000,2)),null);
 const result=planScalingClassFeatureUpdate([item('a1',key,2000)],feature(key,4000,4));
 assert.deepEqual(result,{found:true,update:{
  _id:'a1',name:'Contraband','system.value':4000,'system.unit':'credits',
  'system.grantedClassLevel':4,'system.featureKey':key,
 }});
 assert.deepEqual(planScalingClassFeatureUpdate([item('a1',key,4000,4)],feature(key,4000,4)),{found:true,update:null});
});

test('Infiltrator Unarmed Stun replaces an existing feature label and the typed dice count',()=>{
 const old=item('stun','infiltrator.unarmedStun',1,2);
 old.name='Unarmed Stun (+1 die)';
 const next=feature('infiltrator.unarmedStun',2,6,'Unarmed Stun (+2 dice)');
 next.system.unit='extra-damage-dice';
 const update=planScalingClassFeatureUpdate([old],next).update;
 assert.equal(update._id,'stun');
 assert.equal(update.name,'Unarmed Stun (+2 dice)');
 assert.equal(update['system.value'],2);
 assert.equal(update['system.unit'],'extra-damage-dice');
});

test('refuse regressions, duplicate feature IDs, and unverified ordinary feats sharing the name',()=>{
 const key='improviser.contraband';
 assert.throws(()=>planScalingClassFeatureUpdate([item('a',key,4000)],feature(key,2000,2)),/regress/);
 assert.throws(()=>planScalingClassFeatureUpdate([item('a',key,2000),item('b',key,2000)],feature(key,4000,4)),/Duplicate/);
 assert.throws(()=>planScalingClassFeatureUpdate([],{...feature(key,4000,4),system:{featureKey:key,value:NaN,progressionFeatureType:'scaling_feature'}}),/invalid/);
 assert.equal(planScalingClassFeatureUpdate([{_id:'unrelated',type:'feat',name:'Contraband',system:{}}],feature(key,2000,2)),null);
});

test('manifest and finalizer propagate featureKey, and use transactional ActorEngine update.items',()=>{
 const manifest=fs.readFileSync(path.join(root,'scripts/engine/progression/utils/levelup-entitlement-manifest.js'),'utf8');
 const finalizer=fs.readFileSync(path.join(root,'scripts/apps/progression-framework/shell/progression-finalizer.js'),'utf8');
 assert.match(manifest,/featureKey: feature\?\.featureKey \|\| null/);
 assert.match(finalizer,/planScalingClassFeatureUpdate\(actor\?\.items \|\| \[\], feature\)/);
 assert.match(finalizer,/updates\.push\(plan\.update\)/);
 assert.match(finalizer,/_compileAutomaticClassFeatureItems\(actor, levelUpManifest, sessionState, update\.items\)/);
});

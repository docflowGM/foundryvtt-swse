import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  planForceDiscipleProphetDestinyGrant,
  isForceDiscipleClass,
} from '../scripts/engine/progression/utils/force-disciple-prophet-destiny.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const actor=(overrides={})=>({
  id:'hero',
  system:{
    level:12, destiny:{hasDestiny:true,fulfilled:false},
    destinyPoints:{value:1,max:5},progression:{},
    ...overrides,
  },
});
const plan=(params={})=>planForceDiscipleProphetDestinyGrant({
 actor:actor(),selectedClass:{name:'Force Disciple'},mode:'levelup',
 targetLevel:13,sessionId:'levelup-session-13',...params,
});

test('Prophet awards exactly TWO Destiny Points during each Force Disciple level-up',()=>{
 const fragment=plan();
 assert.equal(fragment['system.destinyPoints.value'],3);
 assert.equal(fragment['system.destinyPoints.max'],7);
 assert.deepEqual(fragment['system.progression.lastProphetDestinyGrant'],{
  source:'forceDisciple.prophet',targetLevel:13,sessionId:'levelup-session-13',
  amount:2,previousValue:1,previousMax:5,newValue:3,newMax:7,
 });
 assert.equal(isForceDiscipleClass({name:'Force Disciple'}),true);
 assert.equal(isForceDiscipleClass({system:{class_name:'Force Disciple'}}),true);
 assert.equal(isForceDiscipleClass({name:'Force Adept'}),false);
});

test('Prophet adds to remaining points; it does not refill spent points or assume a baseline grant',()=>{
 const result=plan({actor:actor({destinyPoints:{value:0,max:4}})});
 assert.equal(result['system.destinyPoints.value'],2);
 assert.equal(result['system.destinyPoints.max'],6);
 const unbalanced=plan({actor:actor({destinyPoints:{value:6,max:4}})});
 assert.equal(unbalanced['system.destinyPoints.value'],8);
 assert.equal(unbalanced['system.destinyPoints.max'],8);
});

test('Prophet never grants on other classes, chargen, or actors without an active Destiny',()=>{
 assert.equal(plan({selectedClass:{name:'Soldier'}}),null);
 assert.equal(plan({selectedClass:{name:'Force Adept'}}),null);
 assert.equal(plan({selectedClass:{name:'Force Disciple'},mode:'chargen'}),null);
 assert.equal(plan({actor:actor({destiny:{hasDestiny:false}})}),null);
 assert.equal(plan({actor:actor({destiny:{hasDestiny:true,fulfilled:true}})}),null);
 assert.equal(plan({actor:actor({destiny:null})}),null);
});

test('committed level receipt prevents replay; invalid level jumps or resource totals fail closed',()=>{
 const committed=actor({
  level:13,destinyPoints:{value:3,max:7},
  progression:{lastProphetDestinyGrant:{targetLevel:13,amount:2}},
 });
 assert.equal(plan({actor:committed}),null);
 assert.throws(()=>plan({targetLevel:14}),/exactly one new character level/);
 assert.throws(()=>plan({actor:actor({destinyPoints:{value:-1,max:5}})}),/valid current points/);
 assert.throws(()=>plan({actor:actor({destinyPoints:{value:1,max:NaN}})}),/valid point maximum/);
 assert.throws(()=>plan({actor:actor({destinyPoints:{value:1.2,max:5}})}),/valid current points/);
});

test('only the canonical level-up economy compiles Prophet; no automated vision spending',()=>{
 const source=fs.readFileSync(
  path.join(ROOT,'scripts/apps/progression-framework/shell/mutation/progression-economy-plan-builder.js'),'utf8');
 assert.match(source,/planForceDiscipleProphetDestinyGrant\(\{/);
 assert.match(source,/if \(prophetGrant\) Object\.assign\(set,prophetGrant\)/);
 assert.match(source,/static buildLevelUpSet\(/);
 assert.doesNotMatch(source,/sacrificeExtraDestinyPointForVision|spendDestinyPoints\(/);
 const helper=fs.readFileSync(
  path.join(ROOT,'scripts/engine/progression/utils/force-disciple-prophet-destiny.js'),'utf8');
 assert.doesNotMatch(helper,/ActorEngine\.|actor\.update\(|spendDestinyPoint\(/);
});

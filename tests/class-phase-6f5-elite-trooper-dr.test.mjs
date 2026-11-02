import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  eliteTrooperClassLevel,eliteTrooperDamageReduction,
  eliteTrooperDamageReductionEntry,
} from '../scripts/engine/combat/class-elite-trooper-dr.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const actor=level=>({
  id:'elite',items:[{type:'class',name:'Elite Trooper',system:{level}}],
});

test('Core table DR 1/2/3/4/5 applies at even Elite Trooper class levels',()=>{
 for(let level=0;level<=10;level++){
   const expected=Math.floor(level/2);
   assert.equal(eliteTrooperDamageReduction(actor(level)),expected,'level '+level);
   const entry=eliteTrooperDamageReductionEntry(actor(level));
   if(expected===0)assert.equal(entry,null);
   else assert.deepEqual(entry,{
      value:expected,exceptions:[],source:'Elite Trooper — Damage Reduction',
   });
 }
 assert.equal(eliteTrooperDamageReduction(actor(15)),5);
});

test('a different class or a non-class item cannot grant Elite Trooper DR',()=>{
 const nonowner={items:[
   {type:'feat',name:'Elite Trooper',system:{level:10}},
   {type:'class',name:'Soldier',system:{level:12}},
 ]};
 assert.equal(eliteTrooperClassLevel(nonowner),0);
 assert.equal(eliteTrooperDamageReduction(nonowner),0);
 assert.equal(eliteTrooperDamageReduction(null),0);
 const owned={items:{contents:[
   {type:'class',system:{class_name:'Elite Trooper',level:6}},
 ]}};
 assert.equal(eliteTrooperDamageReduction(owned),3);
});

test('DR is wired into canonical highest-only DR and informational paths, not applied directly to HP',()=>{
 const code=fs.readFileSync(
  path.join(root,'scripts/engine/combat/resolvers/damage-reduction-resolver.js'),'utf8');
 assert.match(code,/eliteTrooperDamageReductionEntry\(actor\)/);
 assert.match(code,/entries\.push\(eliteTrooperDR\)/);
 assert.match(code,/eliteTrooperDamageReduction\(actor\)/);
 assert.match(code,/if \(entry\.value > drValue\)/);
 assert.match(code,/this\._shouldBypassDR\(weapon\)/);
 const helper=fs.readFileSync(
  path.join(root,'scripts/engine/combat/class-elite-trooper-dr.js'),'utf8');
 assert.doesNotMatch(helper,/actor\.update\(|applyDamage\(|system\.hp\.value\s*=/);
});

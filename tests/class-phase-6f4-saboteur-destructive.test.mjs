import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  resolveSaboteurDestructive,saboteurClassLevel,
} from '../scripts/engine/combat/class-saboteur-destructive.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const saboteur=level=>({
  id:'hero',items:[{id:'owned',type:'class',name:'Saboteur',system:{level}}],
});
const result=(level,targetCategory,other={})=>resolveSaboteurDestructive({
  attacker:saboteur(level),targetCategory,...other,
});

test('Saboteur Destructive starts at class level 2; higher levels remain x2',()=>{
 assert.equal(saboteurClassLevel(saboteur(1)),1);
 for(const level of [0,1]){
   assert.equal(result(level,'vehicle').multiplier,1);
 }
 for(const level of [2,3,5,10]){
   assert.deepEqual(
     {applies:result(level,'vehicle').applies,multiplier:result(level,'vehicle').multiplier},
     {applies:true,multiplier:2},
   );
 }
 assert.equal(saboteurClassLevel({id:'x',items:[{type:'class',name:'Soldier',system:{level:10}}]}),0);
});

test('any actual vehicle qualifies; droids, characters and beasts do not',()=>{
 assert.equal(result(2,'vehicle',{target:{type:'vehicle',system:{crew:3}}}).multiplier,2);
 for(const targetCategory of ['droid','organic','character','beast','unknown','']){
   assert.equal(result(10,targetCategory,{unattendedTarget:true}).multiplier,1);
 }
});

test('unattended objects/devices qualify only with explicit unattended evidence',()=>{
 for(const targetCategory of ['object','device']){
   assert.equal(result(2,targetCategory).multiplier,1);
   assert.equal(result(2,targetCategory,{target:{system:{unattended:true}}}).multiplier,2);
   assert.equal(result(2,targetCategory,{target:{system:{isUnattended:true}}}).multiplier,2);
   assert.equal(result(2,targetCategory,{target:{flags:{swse:{unattended:true}}}}).multiplier,2);
   assert.equal(result(2,targetCategory,{unattendedTarget:true}).multiplier,2);
   assert.equal(result(2,targetCategory,{target:{system:{unattended:false}}}).multiplier,1);
 }
});

test('feature cannot be obtained from an inventory item or a different class',()=>{
 const actor={items:[
   {type:'feat',name:'Saboteur',system:{level:10}},
   {type:'class',name:'Soldier',system:{level:12}},
 ]};
 assert.equal(resolveSaboteurDestructive({attacker:actor,targetCategory:'vehicle'}).applies,false);
 const trueOwner={items:{contents:[{type:'class',system:{class_name:'Saboteur',level:4}}]}};
 assert.equal(resolveSaboteurDestructive({attacker:trueOwner,targetCategory:'vehicle'}).multiplier,2);
 assert.equal(resolveSaboteurDestructive({attacker:saboteur(-2),targetCategory:'vehicle'}).multiplier,1);
});

test('canonical damage-packet builder applies the multiplier before target mitigation and provides trace flags',()=>{
 const code=fs.readFileSync(path.join(root,'scripts/engine/combat/damage-packet-builder.js'),'utf8');
 assert.match(code,/resolveSaboteurDestructive\(\{/);
 assert.match(code,/const rawAmount = baseRollAmount \* destructive\.multiplier/);
 assert.match(code,/buildBaseDamagePacket\(\{ attacker, target, weapon, rawAmount/);
 assert.match(code,/finalizeDamagePacketForTarget\(weaponPacket, target\)/);
 assert.match(code,/saboteurDestructiveApplied:true/);
 const labels=fs.readFileSync(path.join(root,'data/class-features.json'),'utf8');
 assert.match(labels,/"cf\.saboteur\.destructive"/);
});

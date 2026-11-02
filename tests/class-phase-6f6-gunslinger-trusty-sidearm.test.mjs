import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunslingerClassLevel,trustySidearmDamageBonus} from '../scripts/engine/combat/class-gunslinger-trusty-sidearm.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const actor=level=>({id:'gun',items:[{id:'class',type:'class',name:'Gunslinger',system:{level}}]});

test('Trusty Sidearm scales +1 through +5 at even Gunslinger class levels only',()=>{
 for(let level=0;level<=10;level++){
  const expected=Math.floor(level/2);
  assert.equal(trustySidearmDamageBonus(actor(level),{isPistol:true}),expected,'level '+level);
  assert.equal(trustySidearmDamageBonus(actor(level),{isPistol:false}),0);
 }
 assert.equal(trustySidearmDamageBonus(actor(13),{isPistol:true}),5);
});

test('unowned or spoofed class items never grant Trusty Sidearm',()=>{
 const fake={items:[{type:'talent',name:'Gunslinger',system:{level:10}},
  {type:'class',name:'Soldier',system:{level:15}}]};
 assert.equal(gunslingerClassLevel(fake),0);
 assert.equal(trustySidearmDamageBonus(fake,{isPistol:true}),0);
 assert.equal(trustySidearmDamageBonus(null,{isPistol:true}),0);
 const genuine={items:{contents:[{type:'class',system:{class_name:'Gunslinger',level:6}}]}};
 assert.equal(trustySidearmDamageBonus(genuine,{isPistol:true}),3);
});

test('combat composition adds the bonus to additive total once, BEFORE critical multiplier',()=>{
 const code=fs.readFileSync(path.join(root,'scripts/engine/combat/combat-roll-math.js'),'utf8');
 assert.match(code,/isPistolWeapon\(weapon\)/);
 assert.match(code,/trustySidearmDamageBonus\(actor,\{isPistol:isPistolWeapon\(weapon\)\}\)/);
 assert.match(code,/scopedFeatDamage \+ trustySidearm/);
 assert.match(code,/components\['Trusty Sidearm'\] = trustySidearm/);
 const formula=code.slice(code.indexOf('export function buildDamageFormula('));
 assert.match(formula,/const bonusTotal = Number\(composition\?\.bonus\?\.total/);
 assert.match(formula,/formula = \`\(\\$\{formula\}\) \* \\$\{multiplier\}\`/);
 assert.doesNotMatch(formula,/trustySidearm/);
});

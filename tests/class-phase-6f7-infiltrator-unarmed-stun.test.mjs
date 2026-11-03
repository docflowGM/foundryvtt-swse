import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
 infiltratorClassLevel,isInfiltratorUnarmedStrike,
 infiltratorUnarmedStunDice,canDeclareInfiltratorUnarmedStun,
} from '../scripts/engine/combat/class-infiltrator-unarmed-stun.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const actor=level=>({items:[{type:'class',name:'Infiltrator',system:{level}}]});
const unarmed={type:'weapon',name:'Unarmed Strike',system:{isUnarmed:true}};
const claws={type:'weapon',name:'Claw',system:{naturalWeapon:true}};
const blaster={type:'weapon',name:'Blaster Pistol',system:{weaponGroup:'pistols'}};

test('stun is declared at Infiltrator level 2/6/10, never automatic',()=>{
 for(let level=0;level<=10;level++){
  const expected=level>=10?3:level>=6?2:level>=2?1:0;
  assert.equal(infiltratorUnarmedStunDice(actor(level),unarmed,'stun'),expected);
  assert.equal(infiltratorUnarmedStunDice(actor(level),unarmed,'normal'),0);
  assert.equal(canDeclareInfiltratorUnarmedStun(actor(level),unarmed),expected>0);
 }
});
test('natural weapons, guns and class-like feats are not eligible',()=>{
 assert.equal(isInfiltratorUnarmedStrike(unarmed),true);
 assert.equal(isInfiltratorUnarmedStrike(claws),false);
 assert.equal(isInfiltratorUnarmedStrike(blaster),false);
 assert.equal(infiltratorUnarmedStunDice(actor(10),claws,'stun'),0);
 assert.equal(infiltratorUnarmedStunDice(actor(10),blaster,'stun'),0);
 assert.equal(infiltratorClassLevel({items:[{type:'feat',name:'Infiltrator',system:{level:10}}]}),0);
 const migrated={items:{contents:[{type:'class',system:{class_name:'Infiltrator',level:6}}]}};
 assert.equal(infiltratorUnarmedStunDice(migrated,unarmed,'stun'),2);
});
test('attack dialog offers Infiltrator stun, declares and validates before action spend',()=>{
 const ui=read('scripts/rolls/roll-config.js');
 assert.match(ui,/buildDamageModeChoices\(weapon = \{\}, actor = null\)/);
 assert.match(ui,/weaponHasStunSetting\(weapon\) \|\| canDeclareInfiltratorUnarmedStun\(actor,weapon\)/);
 assert.match(ui,/damageModeChoices: buildDamageModeChoices\(weapon,actor\)/);
 const attacks=read('scripts/combat/rolls/attacks.js');
 assert.match(attacks,/const infiltratorStun = damageMode === 'stun' && canDeclareInfiltratorUnarmedStun\(actor,weapon\)/);
 assert.match(attacks,/assertAttackFormResolvable\(weaponRuntime, \{ damageMode: weaponProfileMode/);
 assert.ok(attacks.indexOf('assertAttackFormResolvable(weaponRuntime, { damageMode: weaponProfileMode')
   <attacks.indexOf('spendCoreAttackOptionCosts(actor, weapon, rollOptions)'));
 assert.match(attacks,/resolveCanonicalDamage\(weapon, \{ actor, weaponForm:/);
});
test('damage mode and class bonus survive canonical damage resolution and composition',()=>{
 const resolver=read('scripts/items/weapon-runtime/attack-consumer.js');
 assert.match(resolver,/const infiltratorStun = damageMode === 'stun'/);
 assert.match(resolver,/const profileMode = infiltratorStun \? 'normal' : damageMode/);
 assert.match(resolver,/damageMode: infiltratorStun \? 'stun' : dp\.damageMode/);
 assert.match(resolver,/damageTypes: Object\.freeze\(infiltratorStun \? \['stun'\] : types\)/);
 const dmg=read('scripts/combat/rolls/damage.js');
 assert.match(dmg,/resolveCanonicalDamage\(weapon, \{ \.\.\.rollContext, actor \}\)/);
 const math=read('scripts/engine/combat/combat-roll-math.js');
 assert.match(math,/const infiltratorDice = infiltratorUnarmedStunDice\(actor,weapon,/);
 assert.match(math,/extraWeaponDice = Number\(optionModifiers\.damageExtraWeaponDice \|\| 0\) \+ infiltratorDice/);
 assert.match(math,/id: 'infiltrator-unarmed-stun'/);
 const formula=math.slice(math.indexOf('export function buildDamageFormula('));
 assert.match(formula,/buildExtraWeaponDiceFormula\(stepped, dice\.extraWeaponDice \|\| 0\)/);
 assert.match(formula,/const preMultiplier = bonusTotal !== 0/);
 assert.match(formula,/const multiplier = Number\(composition\?\.critical\?\.multiplier/);
});

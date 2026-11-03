import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  masterSaboteurClassLevel,canMasterSaboteurReroll,
  rollMasterSaboteurMechanicsCheck,masterSaboteurRerollSummary,
} from '../scripts/engine/combat/class-master-saboteur-reroll.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const actor=level=>({id:'sabo',items:[{id:'cls',type:'class',name:'Saboteur',system:{level}}]});
const rolls=values=>{
 let calls=0;
 return {rollD20:async()=>{
   const value=values[calls++];
   return {total:value,formula:'1d20'};
 },get calls(){return calls;}};
};

test('Master Saboteur is unlocked at class level 10, not overall level 10',()=>{
 assert.equal(masterSaboteurClassLevel(actor(9)),9);
 assert.equal(canMasterSaboteurReroll(actor(9),'disable-device'),false);
 assert.equal(canMasterSaboteurReroll(actor(10),'disable-device'),true);
 assert.equal(canMasterSaboteurReroll(actor(10),'handle-explosives'),true);
 assert.equal(canMasterSaboteurReroll(actor(10),'jury-rig'),false);
 assert.equal(canMasterSaboteurReroll(actor(10),'repair'),false);
 assert.equal(canMasterSaboteurReroll(actor(10),'use-computer'),false);
 assert.equal(canMasterSaboteurReroll(null,'disable-device'),false);
 const other={items:[{type:'feat',name:'Saboteur',system:{level:10}},
   {type:'class',name:'Soldier',system:{level:17}}]};
 assert.equal(canMasterSaboteurReroll(other,'disable-device'),false);
});

test('both qualifying Mechanics uses keep the better d20 and expose an audit receipt',async()=>{
 for(const application of ['disable-device','handle-explosives']){
  for(const [a,b,selected,kept] of [[3,17,17,'reroll'],[19,4,19,'original'],[12,12,12,'original']]){
    const roller=rolls([a,b]);
    const result=await rollMasterSaboteurMechanicsCheck({
      actor:actor(10),application,rollD20:roller.rollD20,
    });
    assert.equal(roller.calls,2);
    assert.equal(result.roll.total,selected);
    assert.equal(result.rerolled,true);
    assert.equal(result.kept,kept);
    assert.deepEqual(masterSaboteurRerollSummary(result),{
      source:'Saboteur — Master Saboteur',
      original:a,reroll:b,kept,selected,
    });
  }
 }
});

test('ineligible applications and class levels never produce an extra roll',async()=>{
 for(const [owner,application] of [[actor(9),'disable-device'],
   [actor(10),'jury-rig'],[actor(10),'repair'],[actor(10),'use-computer']]){
    const roller=rolls([8,20]);
    const result=await rollMasterSaboteurMechanicsCheck({
      actor:owner,application,rollD20:roller.rollD20,
    });
    assert.equal(roller.calls,1);
    assert.equal(result.roll.total,8);
    assert.equal(result.rerolled,false);
    assert.equal(masterSaboteurRerollSummary(result),null);
  }
});

test('malformed dice responses fail rather than granting an invented success',async()=>{
 await assert.rejects(rollMasterSaboteurMechanicsCheck({
   actor:actor(10),application:'disable-device',rollD20:async()=>({}),
 }),/invalid total/);
 let count=0;
 await assert.rejects(rollMasterSaboteurMechanicsCheck({
   actor:actor(10),application:'handle-explosives',
   rollD20:async()=>({total:++count===1?8:NaN}),
 }),/invalid total/);
 await assert.rejects(rollMasterSaboteurMechanicsCheck({
   actor:actor(10),application:'disable-device',
 }),/roll authority/);
});

test('both Mechanics consumers use the selected better die for DC and mishap calculation',()=>{
 const s=fs.readFileSync(path.join(ROOT,'scripts/skills/skill-uses.js'),'utf8');
 const start=s.indexOf('export class MechanicsUses {');
 const end=s.indexOf('  /**\n   * JURY-RIG',start);
 assert.ok(start>=0 && end>start);
 const mechanics=s.slice(start,end);
 assert.match(mechanics,/application:'disable-device'/);
 assert.match(mechanics,/application:'handle-explosives'/);
 assert.equal((mechanics.match(/const roll=masterSaboteurRoll\.roll/g)||[]).length,2);
 assert.equal((mechanics.match(/const checkResult = roll\.total \+ mechanicsBonus/g)||[]).length,2);
 assert.match(mechanics,/const springsOrFails = \(dc - checkResult\) >= 5/);
 assert.match(mechanics,/const failureMargin = dc - checkResult/);
 assert.equal((mechanics.match(/masterSaboteurRerollSummary\(masterSaboteurRoll\)/g)||[]).length,2);
 assert.equal((mechanics.match(/masterSaboteur d20/gi)||[]).length,2);
 assert.match(mechanics,/masterSaboteur,/);
 const juryRig=s.slice(end,s.indexOf('  /**\n   * REPAIR',end));
 assert.doesNotMatch(juryRig,/masterSaboteurRoll/);
});

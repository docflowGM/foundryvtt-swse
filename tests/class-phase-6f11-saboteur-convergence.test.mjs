import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {
  planQuickSabotage, executeQuickSabotage,
} from '../scripts/engine/progression/utils/saboteur-quick-sabotage.js';
import {
  canMasterSaboteurReroll, rollMasterSaboteurMechanicsCheck,
  masterSaboteurRerollSummary,
} from '../scripts/engine/combat/class-master-saboteur-reroll.js';

const source=fs.readFileSync(new URL('../scripts/skills/skill-uses.js',import.meta.url),'utf8');
const owner=level=>({
  name:'Saboteur test actor',
  items:[{id:'class',type:'class',name:'Saboteur',system:{level}}],
  system:{skills:{mechanics:{total:8}}},
});

function integratedCheck({level=10,complexity='complex',dice=[4,18],spendFailure=0}={}){
  const actor=owner(level),plan=planQuickSabotage(actor,complexity),history=[];
  let index=0;
  const perform=async()=>{
    history.push('check-start');
    const rolled=await rollMasterSaboteurMechanicsCheck({
      actor,application:'disable-device',
      rollD20:async()=>{history.push('d20');return {total:dice[index++]};},
    });
    const dc={simple:15,tricky:20,complex:25}[complexity];
    const total=rolled.roll.total+8;
    return {
      total,success:total>=dc,springsOrFails:dc-total>=5,
      masterSaboteur:masterSaboteurRerollSummary(rolled),
      action:plan.actionLabel,
    };
  };
  return {
    actor,plan,history,
    execute:()=>executeQuickSabotage({
      actor,plan,
      spend:async(_a,type,metadata)=>{
        history.push('spend-'+type+'-'+metadata.swiftIndex);
        if(spendFailure===metadata.swiftIndex)return {committed:false,permitted:false};
        return {committed:true,rollback:async()=>{history.push('rollback-'+metadata.swiftIndex);return true;}};
      },
      perform,
    }),
  };
}

test('Saboteur 10 complex device: two swift actions, then two dice, keep better, then consequences',async()=>{
  const x=integratedCheck();
  const result=await x.execute();
  assert.deepEqual(x.history,['spend-swift-1','spend-swift-2','check-start','d20','d20']);
  assert.deepEqual(result,{
    total:26,success:true,springsOrFails:false,
    masterSaboteur:{
      source:'Saboteur — Master Saboteur',
      original:4,reroll:18,kept:'reroll',selected:18,
    },
    action:'Two Swift Actions',
  });
});

test('Saboteur 10 simple device: one swift and a Master Saboteur reroll',async()=>{
  const x=integratedCheck({complexity:'simple',dice:[19,2]});
  const result=await x.execute();
  assert.deepEqual(x.history,['spend-swift-1','check-start','d20','d20']);
  assert.equal(result.masterSaboteur.kept,'original');
  assert.equal(result.total,27);
  assert.equal(result.action,'Swift Action');
});

test('Saboteur level 8 complex device: two swift, no Master Saboteur reroll',async()=>{
  const x=integratedCheck({level:8,dice:[1,19]});
  const result=await x.execute();
  assert.deepEqual(x.history,['spend-swift-1','spend-swift-2','check-start','d20']);
  assert.equal(result.masterSaboteur,null);
  assert.equal(result.springsOrFails,true);
});

test('Saboteur level 3 normal device: no swift, no reroll',async()=>{
  const x=integratedCheck({level:3,complexity:'tricky',dice:[12,20]});
  const result=await x.execute();
  assert.deepEqual(x.history,['check-start','d20']);
  assert.equal(result.action,'Full-Round Action');
  assert.equal(result.masterSaboteur,null);
});

test('second swift expenditure refused: no die is rolled, first swift is refunded',async()=>{
  const x=integratedCheck({spendFailure:2});
  await assert.rejects(x.execute(),/not committed/);
  assert.deepEqual(x.history,['spend-swift-1','spend-swift-2','rollback-1']);
});

test('Master Saboteur applies to explosives; Quick Sabotage does not',()=>{
  const a=owner(10);
  assert.equal(canMasterSaboteurReroll(a,'handle-explosives'),true);
  const skillUses=source.slice(source.indexOf('  static async handleExplosives('),source.indexOf('  /**\n   * JURY-RIG'));
  assert.match(skillUses,/application:'handle-explosives'/);
  assert.match(skillUses,/const roll=masterSaboteurRoll\.roll/);
  assert.match(skillUses,/const failureMargin = dc - checkResult/);
  assert.doesNotMatch(skillUses,/executeQuickSabotage|planQuickSabotage|ActionEconomyConsumption\.spend/);
  assert.match(skillUses,/Action: Full-Round Action/);
});

test('production Disable Device cost and reroll live in one callback with auditable order',()=>{
  const start=source.indexOf('  static async disableDevice(');
  const end=source.indexOf('  static async handleExplosives(',start);
  assert.ok(start>=0&&end>start);
  const code=source.slice(start,end);
  for(const fragment of [
    'const quickSabotage=planQuickSabotage(actor,complexity);',
    "const performCheck=async()=>{",
    "application:'disable-device'",
    "const roll=masterSaboteurRoll.roll;",
    "const masterSaboteur=masterSaboteurRerollSummary(masterSaboteurRoll);",
    "const checkResult = roll.total + mechanicsBonus;",
    'const springsOrFails = (dc - checkResult) >= 5;',
    "action: quickSabotage.actionLabel,",
    "masterSaboteur,",
    "spend:(owner,type,meta)=>ActionEconomyConsumption.spend(owner,type,meta)",
    "perform:performCheck",
  ])assert.ok(code.includes(fragment),'Missing production convergence: '+fragment);
  assert.ok(code.indexOf('perform:performCheck')>code.indexOf('const performCheck=async()=>{'));
  // The callback is handed to the cost owner, not invoked before spending.
  assert.doesNotMatch(code,/await performCheck\(\)/);
  assert.ok(code.includes('if(!quickSabotage.quick)return performCheck();'));
  assert.match(code,/Master Saboteur d20: \$\{masterSaboteur\.original\}/);
  assert.match(code,/Required: \$\{usesImprovisedTools \? 'Improvised Tools \(Quick Sabotage\)' : 'Security Kit'\}/);
});

test('both source-branch regression test suites remain available in combined branch',()=>{
  const dir=fileURLToPath(new URL('./',import.meta.url));
  assert.ok(fs.existsSync(dir+'class-phase-6f8-master-saboteur-reroll.test.mjs'));
  assert.ok(fs.existsSync(dir+'class-phase-6f10-quick-sabotage.test.mjs'));
});

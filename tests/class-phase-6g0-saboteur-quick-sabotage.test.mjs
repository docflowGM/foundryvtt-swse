import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  planQuickSabotage,quickSabotageClassLevel,
} from '../scripts/engine/skills/class-saboteur-quick-sabotage.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const actor=level=>({id:'saboteur',items:[
  {type:'class',name:'Saboteur',system:{level}},
]});
const plan=(level,complexity,hasSecurityKit=true)=>planQuickSabotage({
  actor:actor(level),complexity,hasSecurityKit,
});

test('Quick Sabotage preserves printed full-round/swift/two-swift progression',()=>{
  const levels=[
    {level:3,simple:'full-round',tricky:'full-round',complex:'full-round'},
    {level:4,simple:'swift',tricky:'full-round',complex:'full-round'},
    {level:5,simple:'swift',tricky:'full-round',complex:'full-round'},
    {level:6,simple:'swift',tricky:'swift',complex:'full-round'},
    {level:7,simple:'swift',tricky:'swift',complex:'full-round'},
    {level:8,simple:'swift',tricky:'swift',complex:'two-swift-actions'},
    {level:10,simple:'swift',tricky:'swift',complex:'two-swift-actions'},
  ];
  for(const {level,...expectation} of levels){
    for(const [complexity,actionType] of Object.entries(expectation)){
      const result=plan(level,complexity);
      assert.equal(result.allowed,true);
      assert.equal(result.actionType,actionType,'level '+level+' '+complexity);
      assert.equal(result.swiftActions,actionType==='two-swift-actions'?2:actionType==='swift'?1:0);
    }
  }
  assert.equal(plan(8,'complex').swiftActions,2);
});

test('Quick Sabotage permits improvised tools only from Saboteur level 4',()=>{
  const ordinary=plan(3,'simple',false);
  assert.equal(ordinary.allowed,false);
  assert.match(ordinary.reason,/Security Kit required/);
  for(const level of [4,6,8]){
    const noKit=plan(level,'complex',false);
    assert.equal(noKit.allowed,true);
    assert.equal(noKit.usesImprovisedTools,true);
    assert.equal(noKit.required,'Improvised tools');
    assert.equal(plan(level,'complex',true).usesImprovisedTools,false);
    assert.equal(plan(level,'complex',true).required,'Security Kit');
  }
  const unknown=planQuickSabotage({actor:actor(8),complexity:'tricky'});
  assert.equal(unknown.kitAvailabilityKnown,false);
  assert.equal(unknown.kitVerified,false);
  assert.match(unknown.required,/GM verify/);
});

test('invalid complexity and class spoofing do not invent swift actions',()=>{
  const noClass={items:[{type:'feat',name:'Saboteur',system:{level:10}},
    {type:'class',name:'Scoundrel',system:{level:12}}]};
  assert.equal(quickSabotageClassLevel(noClass),0);
  assert.equal(planQuickSabotage({actor:noClass,complexity:'simple',hasSecurityKit:true}).actionType,'full-round');
  assert.equal(planQuickSabotage({actor:noClass,complexity:'simple',hasSecurityKit:false}).allowed,false);
  const owned={items:{contents:[{type:'class',system:{class_name:'Saboteur',level:6}}]}};
  assert.equal(planQuickSabotage({actor:owned,complexity:'tricky',hasSecurityKit:true}).actionType,'swift');
  for(const complexity of ['unknown','',null,3]){
    assert.equal(planQuickSabotage({actor:actor(10),complexity,hasSecurityKit:true}).allowed,false);
  }
});

test('Disable Device receives action type and tool proof before rolling; no fake action spend',()=>{
  const code=fs.readFileSync(path.join(root,'scripts/skills/skill-uses.js'),'utf8');
  const a=code.indexOf('export class MechanicsUses {');
  const b=code.indexOf('  /**\n   * HANDLE EXPLOSIVES',a);
  assert.ok(a>=0 && b>a);
  const body=code.slice(a,b);
  assert.match(body,/const quickSabotage=planQuickSabotage\(\{/);
  assert.match(body,/if\(!quickSabotage\.allowed\)/);
  assert.ok(body.indexOf('if(!quickSabotage.allowed)') < body.indexOf("RollEngine.safeRoll('1d20')"));
  assert.match(body,/actionType==='two-swift-actions'/);
  assert.match(body,/swiftActions:quickSabotage\.swiftActions,committed:false/);
  assert.match(body,/Action: \$\{actionLabel\} \(GM-managed\)/);
  assert.match(body,/Required: \$\{toolsLabel\}/);
  assert.match(body,/quickSabotage,/);
  const explosions=code.slice(b,code.indexOf('  /**\n   * JURY-RIG',b));
  assert.doesNotMatch(explosions,/planQuickSabotage\(/);
});

test('real extra-skill-use catalog presents class-adjusted time without claiming spent actions',()=>{
  const registry=fs.readFileSync(path.join(root,'scripts/utils/extra-skill-use-registry.js'),'utf8');
  assert.match(registry,/return this\._applyQuickSabotage\(this\._applyMedicalSecretEnhancements\(withAccess, actor\), actor\)/);
  assert.match(registry,/const match = String\(item\?\.label \?\? ''\)\.trim\(\)\.match\(/);
  assert.match(registry,/planQuickSabotage\(\{actor,complexity:match\[1\],hasSecurityKit:null\}\)/);
  assert.match(registry,/rule\.actionType === 'two-swift-actions' \? '2 swift actions'/);
  assert.match(registry,/quickSabotage: \{ \.\.\.rule, actionCostCommitted:false \}/);
  assert.match(registry,/classFeatureSource: 'Saboteur — Quick Sabotage'/);
  assert.match(registry,/if \(!actor \|\| item\?\.skillKey !== 'mechanics'\) return item/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 actorIdentity,planTemptationMark,planTemptationSpend,currentTemptations,
 expireTemptationEntries,TEMPTATION_PATH,TEMPTATION_EVENTS_PATH
} from '../scripts/engine/progression/utils/sith-lord-temptation-state.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const combat={id:'enc-1',round:2,turn:3,started:true,combatant:{id:'c-sith'}};
const caster={id:'sith',uuid:'Actor.sith'};
const victim={id:'target',uuid:'Actor.target',flags:{swse:{classFeatures:{sithLord:{temptation:[],temptationEvents:[]}}}}};
const receipt=(resource='force',id='receipt-1')=>({
 actorId:'Actor.target',resource,spent:1,committed:true,receiptId:id
});
const setup=()=>{
 victim.flags.swse.classFeatures.sithLord.temptation=[];
 victim.flags.swse.classFeatures.sithLord.temptationEvents=[];
 return victim;
};

test('Temptation is a check-vs-Will, not an immediate consequence',()=>{
 setup();
 const bad=planTemptationMark({caster,target:victim,combat,checkTotal:19,willDefense:20,confirmedLineOfSight:true});
 assert.equal(bad.allowed,false);
 assert.equal(bad.reason,'persuasion-failed');
 assert.equal(planTemptationMark({caster,target:victim,combat,checkTotal:21,willDefense:20}).reason,'GM-line-of-sight-not-confirmed');
 const ok=planTemptationMark({caster,target:victim,combat,checkTotal:21,willDefense:20,confirmedLineOfSight:true});
 assert.equal(ok.allowed,true);
 assert.equal(ok.entry.sourceActorId,'Actor.sith');
 assert.equal(ok.entry.targetActorId,'Actor.target');
 assert.equal(ok.entry.sourceCombatantId,'c-sith');
 assert.equal(ok.updates[TEMPTATION_PATH].length,1);
 assert.ok(!Object.keys(ok.updates).some(x=>x.startsWith('system.darkSide')||x.startsWith('system.conditionTrack')));
});

test('successful mark requires true spent Force/Destiny receipt, target and encounter',()=>{
 setup();
 const ok=planTemptationMark({caster,target:victim,combat,checkTotal:25,willDefense:20,confirmedLineOfSight:true});
 victim.flags.swse.classFeatures.sithLord.temptation=ok.updates[TEMPTATION_PATH];
 const force=planTemptationSpend({target:victim,combat,event:receipt('force')});
 assert.equal(force.eligible,true);
 assert.equal(force.consequences[0].steps,1);
 const destiny=planTemptationSpend({target:victim,combat,event:receipt('destiny','receipt-2')});
 assert.equal(destiny.eligible,true);
 assert.equal(destiny.consequences[0].steps,2);
 assert.equal(planTemptationSpend({target:victim,combat,event:{...receipt(),spent:0}}).eligible,false);
 assert.equal(planTemptationSpend({target:victim,combat,event:{...receipt(),committed:false}}).eligible,false);
 assert.equal(planTemptationSpend({target:victim,combat,event:{...receipt(),actorId:'Actor.other'}}).eligible,false);
 assert.equal(planTemptationSpend({target:victim,combat:{...combat,id:'other'},event:receipt()}).eligible,false);
 victim.flags.swse.classFeatures.sithLord.temptationEvents=[{receiptId:'receipt-1'}];
 assert.equal(planTemptationSpend({target:victim,combat,event:receipt()}).reason,'duplicate-spend-receipt');
});

test('source next turn expires active Temptation, not any earlier actor turn',()=>{
 setup();
 const ok=planTemptationMark({caster,target:victim,combat,checkTotal:25,willDefense:20,confirmedLineOfSight:true});
 victim.flags.swse.classFeatures.sithLord.temptation=ok.updates[TEMPTATION_PATH];
 const wrong=expireTemptationEntries(victim,{...combat,combatant:{id:'c-other'}},{nextTurn:true});
 assert.equal(wrong.changed,false);
 const next=expireTemptationEntries(victim,{...combat,round:3,combatant:{id:'c-sith'}},{nextTurn:true});
 assert.equal(next.changed,true);
 assert.equal(next.entries[0].state,'expired');
 const end=expireTemptationEntries(victim,{...combat,id:'enc-2'},{encounterEnd:true});
 assert.equal(end.changed,true);
});

test('state does not accept character aliases or cosmetic named class',()=>{
 assert.equal(actorIdentity({id:'real',uuid:'Actor.real'}),'Actor.real');
 const counterfeit=planTemptationMark({caster,target:{...caster},combat,
   checkTotal:23,willDefense:10,confirmedLineOfSight:true});
 assert.equal(counterfeit.allowed,false);
});

test('runtime event receipts originate only from post-commit spend authorities',()=>{
 const ae=read('scripts/governance/actor-engine/actor-engine.js');
 const fp=ae.slice(ae.indexOf('async spendForcePoints('),ae.indexOf('async spendDestinyPoints('));
 const dp=ae.slice(ae.indexOf('async spendDestinyPoints('),ae.indexOf('async applySecondWind('));
 assert.ok(fp.indexOf("await this.updateActor(actor, update)")<fp.indexOf("swse.resourceSpent"));
 assert.ok(dp.indexOf("'system.destinyPoints.value': newDP")<dp.indexOf("swse.resourceSpent"));
 assert.match(fp,/committed: true/);
 assert.match(dp,/committed: true/);
 const base=read('scripts/actors/base/swse-actor-base.js');
 assert.match(base,/ActorEngine.spendDestinyPoints\(this, 1\)/);
 const engine=read('scripts/engine/force/force-engine.js');
 assert.match(engine,/ActorEngine.spendForcePoints\(actor, 1\)/);
});

test('paid Force Point roll event happens after successful d20, never on provisional refund',()=>{
 const core=read('scripts/engine/roll/roll-core.js');
 const coordinator=read('scripts/engine/force/force-point-spend-coordinator.js');
 const ae=read('scripts/governance/actor-engine/actor-engine.js');
 assert.match(coordinator,/deferResourceEvent:true/);
 assert.match(ae,/if\(options\?\.deferResourceEvent!==true\)/);
 const roll=core.slice(core.indexOf('static async execute('),core.indexOf('static async _handleTakeX('));
 assert.ok(roll.indexOf('roll = await this._executeRollWithSerenity(') <
   roll.indexOf("source: 'RollCore.execute'"));
 assert.ok(roll.indexOf("source: 'RollCore.execute'") <
   roll.indexOf('return {\n        success: true'));
 assert.ok(roll.includes("forcePointDetails?.success===true"));
});

test('runtime action and target choice remain separate; no fake immediate DSP',()=>{
 const service=read('scripts/engine/combat/sith-lord-temptation-service.js');
 const boot=read('index.js');
 assert.match(service,/ActionEconomyConsumption.spend\(sith,'standard'/);
 assert.match(service,/rollSkill\(sith,'persuasion'/);
 assert.match(service,/planTemptationMark\(/);
 assert.match(service,/planTemptationSpend\(/);
 assert.match(service,/DSPEngine.getNextValue\(target,event.steps\)/);
 assert.match(service,/ConditionTrackRules.resolveConditionShift\(target,event.steps\)/);
 assert.match(service,/eventKey:x.receiptId\+':'\+x.id/);
 assert.match(service,/registerSithLordTemptationHooks/);
 assert.match(service,/pending-target-choice/);
 assert.match(boot,/registerSithLordTemptationHooks\(\)/);
 assert.match(boot,/sithLordTemptation:/);
 assert.doesNotMatch(service,/target.update\(/);
});

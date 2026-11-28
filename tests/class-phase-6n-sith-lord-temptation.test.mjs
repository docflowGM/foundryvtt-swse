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

test('Force and Destiny triggers originate only from their own finalized receipts (separate ledgers, no legacy hook)',()=>{
 // Integration note (Class/Force x Force V2): 6N's swse.resourceSpent emitters (ActorEngine Force/Destiny, RollCore) and
 // deferResourceEvent are replaced by durable outboxes recorded in ActorEngine.finalize{Force,Destiny}PointSpend. Behavior is
 // proven in class-force-v2-temptation-trigger.test.mjs; these are structural guards on the same design.
 const ae=read('scripts/governance/actor-engine/actor-engine.js');
 const pl=read('scripts/governance/actor-engine/point-ledgers.js'); // 3N-AE.4: ledger operations live here (delegates remain in ActorEngine)
 assert.doesNotMatch(ae,/swse\.resourceSpent/,'no ad-hoc spend event exists anywhere in ActorEngine');
 assert.doesNotMatch(ae,/deferResourceEvent/);
 const fp=pl.slice(pl.indexOf('async function spendForcePoints('),pl.indexOf('async function rollbackForcePointSpend('));
 assert.match(fp,/spendEvidence: captureSpendEvidence\(actor, 'force'\)/,'spend-time evidence is captured on the receipt');
 const fin=pl.slice(pl.indexOf('async function finalizeForcePointSpend('),pl.indexOf('async function dispatchForcePointTriggers('));
 assert.match(fin,/state: 'finalized', \.\.\.\(trigger/,'the trigger is recorded in the same write that finalizes the receipt');
 assert.ok(fin.indexOf("await engine.updateActor(actor, { 'flags.swse.forcePointLedger'")<fin.indexOf('engine.dispatchForcePointTriggers('),
   'finality is persisted before any delivery');
 assert.match(fin,/firstFinalization/,'only the first committed->finalized transition delivers');
 // Destiny: its OWN ledger, atomic with the debit, its own finalize/outbox; never the Force Point ledger.
 const dp=pl.slice(pl.indexOf('async function spendDestinyPoints('),pl.indexOf('async function rollbackDestinyPointSpend('));
 assert.match(dp,/'system\.destinyPoints\.value': newDP,\s*'flags\.swse\.destinyPointLedger'/,'pool debit and Destiny receipt are ONE write');
 assert.doesNotMatch(dp,/forcePointLedger/,'a Destiny spend never touches the Force Point ledger');
 assert.match(dp,/spendEvidence: captureSpendEvidence\(actor, 'destiny'\)/);
 const dfin=pl.slice(pl.indexOf('async function finalizeDestinyPointSpend('),pl.indexOf('async function dispatchDestinyPointTriggers('));
 assert.match(dfin,/state: 'finalized', \.\.\.\(trigger/);
 assert.doesNotMatch(dfin,/forcePointLedger/);
 const base=read('scripts/actors/base/swse-actor-base.js');
 assert.match(base,/ActorEngine.spendDestinyPoints\(this, 1\)/);
 assert.match(base,/finalizeDestinyPointSpend\(this, receipt\)/,'the Destiny spend is settled after its use');
 const svc=read('scripts/engine/combat/sith-lord-temptation-service.js');
 assert.match(svc,/registerSpendTriggerConsumer\('force'/);
 assert.match(svc,/registerSpendTriggerConsumer\('destiny'/);
 assert.doesNotMatch(svc,/swse\.resourceSpent/,'the legacy hook listener is gone');
});

test('paid Force Point roll finalizes through the V2 receipt; no coordinator deferral or RollCore emitter remains',()=>{
 const core=read('scripts/engine/roll/roll-core.js');
 const coordinator=read('scripts/engine/force/force-point-spend-coordinator.js');
 assert.doesNotMatch(coordinator,/deferResourceEvent/);
 assert.doesNotMatch(core,/swse\.resourceSpent/,'RollCore emits no second receipt');
 const roll=core.slice(core.indexOf('static async execute('),core.indexOf('static async _handleTakeX('));
 assert.ok(roll.indexOf('roll = await this._executeRollWithSerenity(') <
   roll.indexOf('ActorEngine.finalizeForcePointSpend('),'finality only after the paid d20 executed');
});

test('truncated condition consequence cannot silently close a pending Temptation choice',()=>{
 const service=read('scripts/engine/combat/sith-lord-temptation-service.js');
 const start=service.indexOf('const shift=ConditionTrackRules.resolveConditionShift(target,event.steps)');
 const end=service.indexOf("set['system.conditionTrack.current']=shift.next",start);
 assert.ok(start>=0&&end>start);
 const gate=service.slice(start,end);
 assert.match(gate,/shift\.appliedShift<event\.steps/);
 assert.match(gate,/throw new Error\('Temptation condition consequence cannot fully apply/);
 // The mutation which marks a spend resolved follows the eligibility check.
 assert.ok(end<service.indexOf("state:'resolved'",end));
});

test('runtime action and target choice remain separate; no fake immediate DSP',()=>{
 const service=read('scripts/engine/combat/sith-lord-temptation-service.js');
 const boot=read('index.js');
 assert.match(service,/ActionEconomyConsumption.spend\(sith,'standard'/);
 assert.match(service,/rollSkill\(sith,'persuasion'/);
 assert.match(service,/planTemptationMark\(/);
 assert.match(service,/planTemptationSpendFromEvidence\(/);
 assert.match(service,/DSPEngine.getNextValue\(target,event.steps\)/);
 assert.match(service,/ConditionTrackRules.resolveConditionShift\(target,event.steps\)/);
 assert.match(service,/eventKey:x.receiptId\+':'\+x.id/);
 assert.match(service,/registerSithLordTemptationHooks/);
 assert.match(service,/pending-target-choice/);
 assert.match(boot,/registerSithLordTemptationHooks\(\)/);
 assert.match(boot,/sithLordTemptation:/);
 assert.doesNotMatch(service,/target.update\(/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
 temptationActionTurnStamp,sameTemptationActionTurn
} from '../scripts/engine/progression/utils/sith-lord-temptation-state.js';

const combat=()=>({
 id:'combat-a',started:true,round:3,turn:2,combatant:{id:'sith-c'}
});

test('a current, unchanged Sith Lord turn accepts its saved action identity',()=>{
 const current=combat();
 const stamp=temptationActionTurnStamp(current);
 assert.deepEqual(stamp,{
  encounterId:'combat-a',round:3,turn:2,combatantId:'sith-c'
 });
 assert.equal(Object.isFrozen(stamp),true);
 assert.equal(sameTemptationActionTurn(stamp,current),true);
 assert.equal(sameTemptationActionTurn(stamp,{...current,combatant:{id:'sith-c'}}),true);
});

test('the same Sith Lord returning next round cannot apply a previous turn Persuasion result',()=>{
 const current=combat(),stamp=temptationActionTurnStamp(current);
 assert.equal(sameTemptationActionTurn(stamp,{...current,round:4}),false);
 assert.equal(sameTemptationActionTurn(stamp,{...current,round:5}),false);
 assert.equal(sameTemptationActionTurn(stamp,{...current,turn:1}),false);
 // Even another combatant occupying the same numeric slot is not this turn.
 assert.equal(sameTemptationActionTurn(stamp,{...current,combatant:{id:'other-c'}}),false);
 assert.equal(sameTemptationActionTurn(stamp,{...current,id:'combat-b'}),false);
 assert.equal(sameTemptationActionTurn(stamp,{...current,started:false}),false);
 assert.equal(sameTemptationActionTurn(stamp,{...current,round:NaN}),false);
});

test('invalid combat snapshots do not create a usable Temptation action identity',()=>{
 const current=combat();
 assert.equal(temptationActionTurnStamp({...current,turn:-1}),null);
 assert.equal(temptationActionTurnStamp({...current,turn:1.5}),null);
 assert.equal(temptationActionTurnStamp({...current,combatant:null}),null);
 assert.equal(temptationActionTurnStamp({...current,started:false}),null);
 assert.equal(temptationActionTurnStamp({...current,round:-1}),null);
 assert.equal(sameTemptationActionTurn(null,current),false);
 assert.equal(sameTemptationActionTurn({encounterId:'combat-a',
  round:3,turn:2,combatantId:'sith-c'},null),false);
});

test('production activation snapshots the turn before paying the standard action',()=>{
 const service=readFileSync(
  new URL('../scripts/engine/combat/sith-lord-temptation-service.js',import.meta.url),'utf8');
 const start=service.indexOf('static async activate(');
 const end=service.indexOf('/** An authenticated post-spend event',start);
 assert.ok(start>0&&end>start);
 const body=service.slice(start,end);
 const snapshot=body.indexOf('const turnStamp=temptationActionTurnStamp(combat)');
 const spend=body.indexOf("ActionEconomyConsumption.spend(sith,'standard'");
 const roll=body.indexOf("rollSkill(sith,'persuasion'");
 const staged=body.indexOf('return {readyToMark:true,checkTotal,willDefense:will,turnStamp}');
 const targetLock=body.indexOf('return await locked(target,async()=>{');
 const refresh=body.indexOf('const currentCombat=activeCombat()',targetLock);
 const same=body.indexOf('sameTemptationActionTurn(attempt.turnStamp,currentCombat)',targetLock);
 const replan=body.lastIndexOf('const plan=planTemptationMark(');
 const write=body.indexOf('await ActorEngine.applyMutationPlan(target,{',targetLock);
 assert.ok(snapshot>=0&&snapshot<spend&&spend<roll&&roll<staged);
 assert.ok(staged<targetLock&&targetLock<refresh&&refresh<same&&same<replan&&replan<write);
 assert.match(body,/sameTemptationActionTurn\(turnStamp,activeCombat\(\)\)/);
 assert.match(body,/Temptation action turn changed before target mutation/);
 assert.match(body,/Temptation post-roll outcome requires GM review/);
 assert.doesNotMatch(body,/target\.update\(/);
});

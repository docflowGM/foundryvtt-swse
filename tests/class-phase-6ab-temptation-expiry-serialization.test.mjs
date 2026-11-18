import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 actorIdentity,expireTemptationEntries,TEMPTATION_PATH
} from '../scripts/engine/progression/utils/sith-lord-temptation-state.js';
import {createTemptationActorSerializer} from
 '../scripts/engine/progression/utils/temptation-actor-serializer.js';

const combat={
 id:'combat-expiry',started:true,round:4,turn:2,combatant:{id:'sith-combatant'}
};
const mark=(round,turn,id)=>({
 id,sourceActorId:'Actor.sith',targetActorId:'Actor.target',
 sourceCombatantId:'sith-combatant',encounterId:'combat-expiry',
 createdRound:round,createdTurn:turn,state:'active'
});
const actor=()=>({
 id:'target',uuid:'Actor.target',
 flags:{swse:{classFeatures:{sithLord:{
  temptation:[mark(3,1,'old')],
  temptationEvents:[{eventKey:'old-receipt',state:'pending-target-choice'}]
 }}}}
});
const updateMarks=(target,entries)=>{
 target.flags.swse.classFeatures.sithLord.temptation=entries;
};

test('fresh replan under actor queue preserves a newer mark and expired old mark',async()=>{
 const target=actor();
 const queue=createTemptationActorSerializer();
 const staleBeforeLock=expireTemptationEntries(target,combat,{nextTurn:true});
 assert.deepEqual(staleBeforeLock.entries.map(x=>x.id),['old']);
 let releaseFirst;
 const held=new Promise(resolve=>{releaseFirst=resolve;});
 let entered;
 const firstEntered=new Promise(resolve=>{entered=resolve;});
 const first=queue(actorIdentity(target),async()=>{
  entered();
  await held;
  // Another legitimate operation completed before expiry obtained this
  // target's queue slot. The new mark starts on the current source turn.
  updateMarks(target,[...target.flags.swse.classFeatures.sithLord.temptation,
   mark(4,2,'new')]);
 });
 await firstEntered;
 let expiryRan=false;
 const expiry=queue(actorIdentity(target),async()=>{
  expiryRan=true;
  const fresh=expireTemptationEntries(target,combat,{nextTurn:true});
  if(fresh.changed)updateMarks(target,fresh.entries);
 });
 assert.equal(expiryRan,false);
 releaseFirst();
 await Promise.all([first,expiry]);
 const rows=target.flags.swse.classFeatures.sithLord.temptation;
 assert.deepEqual(rows.map(x=>[x.id,x.state]),[
  ['old','expired'],['new','active']
 ]);
 assert.deepEqual(target.flags.swse.classFeatures.sithLord.temptationEvents,
  [{eventKey:'old-receipt',state:'pending-target-choice'}]);
 assert.deepEqual(staleBeforeLock.entries.map(x=>x.id),['old'],
  'pre-lock snapshot would drop new rows on write');
});

test('failed queued operation cannot prevent later expiration planning',async()=>{
 const target=actor();
 const queue=createTemptationActorSerializer();
 const broken=queue(actorIdentity(target),async()=>{throw Error('receipt write failed');});
 const expiry=queue(actorIdentity(target),async()=>{
  const plan=expireTemptationEntries(target,combat,{nextTurn:true});
  if(plan.changed)updateMarks(target,plan.entries);
  return plan.changed;
 });
 await assert.rejects(broken,/receipt write failed/);
 assert.equal(await expiry,true);
 assert.equal(target.flags.swse.classFeatures.sithLord.temptation[0].state,'expired');
});

test('production expiry computes plan only after target lock is acquired',()=>{
 const src=readFileSync(
  new URL('../scripts/engine/combat/sith-lord-temptation-service.js',import.meta.url),'utf8');
 const start=src.indexOf('static async expireCombat(');
 const end=src.indexOf('\nlet registered=false;',start);
 const body=src.slice(start,end);
 const lock=body.indexOf('await locked(target,async()=>{');
 const plan=body.indexOf('const plan=expireTemptationEntries(target,combat,{encounterEnd,nextTurn});');
 const mutation=body.indexOf('await ActorEngine.applyMutationPlan(target,{');
 assert.ok(start>0&&end>start&&lock>=0&&plan>lock&&mutation>plan);
 const before=body.slice(0,lock);
 assert.doesNotMatch(before,/expireTemptationEntries\(target/);
 assert.match(body,/if\(!plan.changed\)return;/);
 assert.match(body,/transactional:true/);
 assert.doesNotMatch(body,/target\.update\(/);
});

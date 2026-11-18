import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 actorIdentity,planTemptationMark,TEMPTATION_PATH
} from '../scripts/engine/progression/utils/sith-lord-temptation-state.js';
import {createTemptationActorSerializer} from
 '../scripts/engine/progression/utils/temptation-actor-serializer.js';

const target=()=>({
 id:'target',uuid:'Actor.target',
 flags:{swse:{classFeatures:{sithLord:{temptation:[],temptationEvents:[]}}}}
});
const caster=id=>({id,uuid:'Actor.'+id});
const combat=id=>({
 id:'combat-mark',started:true,round:3,turn:1,combatant:{id}
});

test('separate Sith Lords targeting the same actor preserve both marks',async()=>{
 const queue=createTemptationActorSerializer();
 const t=target(),a=caster('sith-a'),b=caster('sith-b');
 let unblock;
 const hold=new Promise(resolve=>{unblock=resolve;});
 let begun;
 const firstStarted=new Promise(resolve=>{begun=resolve;});
 const first=queue(actorIdentity(t),async()=>{
  const p=planTemptationMark({
   caster:a,target:t,combat:combat('combatant-a'),checkTotal:25,
   willDefense:20,confirmedLineOfSight:true
  });
  assert.equal(p.allowed,true);
  begun();
  await hold;
  t.flags.swse.classFeatures.sithLord.temptation=p.updates[TEMPTATION_PATH];
 });
 await firstStarted;
 const second=queue(actorIdentity(t),async()=>{
  const p=planTemptationMark({
   caster:b,target:t,combat:combat('combatant-b'),checkTotal:24,
   willDefense:20,confirmedLineOfSight:true
  });
  assert.equal(p.allowed,true);
  t.flags.swse.classFeatures.sithLord.temptation=p.updates[TEMPTATION_PATH];
 });
 unblock();
 await Promise.all([first,second]);
 assert.deepEqual(
  t.flags.swse.classFeatures.sithLord.temptation.map(x=>x.sourceActorId),
  ['Actor.sith-a','Actor.sith-b']);
});

test('two reciprocal caster/target operations have no nested-lock deadlock',async()=>{
 const queue=createTemptationActorSerializer();
 const a=caster('sith-a'),b=caster('sith-b');
 // The caster phase resolves and RELEASES before its target phase starts.
 const prepare=actor=>queue(actorIdentity(actor),async()=>{
  await Promise.resolve();
  return {checkTotal:25};
 });
 const [ap,bp]=await Promise.all([prepare(a),prepare(b)]);
 const results=await Promise.all([
  queue(actorIdentity(b),async()=>({from:a.id,to:b.id,check:ap.checkTotal})),
  queue(actorIdentity(a),async()=>({from:b.id,to:a.id,check:bp.checkTotal}))
 ]);
 assert.deepEqual(results,[
  {from:'sith-a',to:'sith-b',check:25},
  {from:'sith-b',to:'sith-a',check:25}
 ]);
});

test('production activation releases caster queue before target mark transaction',()=>{
 const src=readFileSync(new URL(
  '../scripts/engine/combat/sith-lord-temptation-service.js',import.meta.url),'utf8');
 const start=src.indexOf('static async activate(');
 const end=src.indexOf('/** An authenticated post-spend event',start);
 const method=src.slice(start,end);
 const casterStart=method.indexOf('const attempt=await locked(sith,async()=>{');
 const casterEnd=method.indexOf('if(attempt?.readyToMark!==true)return attempt;');
 const targetStart=method.indexOf('return await locked(target,async()=>{');
 const replan=method.lastIndexOf('const plan=planTemptationMark(');
 const update=method.indexOf('await ActorEngine.applyMutationPlan(target,{');
 assert.ok(start>=0&&end>start&&casterStart>=0);
 assert.ok(casterEnd>casterStart);
 assert.ok(targetStart>casterEnd,'target lock is not nested inside caster lock');
 assert.ok(replan>targetStart&&update>replan,'replan after target lock');
 assert.match(method,/checkTotal:attempt\.checkTotal/);
 assert.match(method,/willDefense:attempt\.willDefense/);
 assert.match(method,/Temptation authority changed before target mutation/);
 assert.match(method,/Temptation post-roll outcome requires GM review/);
 assert.doesNotMatch(method,/target\.update\(/);
});

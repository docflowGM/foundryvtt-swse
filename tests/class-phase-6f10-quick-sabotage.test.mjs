import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {saboteurLevel,planQuickSabotage,executeQuickSabotage}
  from '../scripts/engine/progression/utils/saboteur-quick-sabotage.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const actor=n=>({id:'saboteur',items:[{type:'class',name:'Saboteur',system:{level:n}}]});

test('Quick Sabotage source progression: simple at 4, tricky at 6, complex two swift at 8',()=>{
 const expected={
  1:[0,0,0],3:[0,0,0],4:[1,0,0],5:[1,0,0],
  6:[1,1,0],7:[1,1,0],8:[1,1,2],10:[1,1,2],
 };
 for(const [level,actions] of Object.entries(expected)){
   assert.deepEqual(['simple','tricky','complex'].map(x=>planQuickSabotage(actor(+level),x).swiftActions),actions);
   assert.equal(planQuickSabotage(actor(+level),'simple').improvisedSecurityKitAllowed,+level>=4);
 }
 assert.equal(saboteurLevel(null),0);
 assert.equal(planQuickSabotage(actor(8),'complex').actionLabel,'Two Swift Actions');
 assert.throws(()=>planQuickSabotage(actor(8),'unknown'),/known device complexity/);
});

test('only owned Saboteur class Items prove Quick Sabotage',()=>{
 const falseOwner={items:[{type:'feat',name:'Saboteur',system:{level:10}},
   {type:'class',name:'Soldier',system:{level:17}}]};
 assert.equal(planQuickSabotage(falseOwner,'simple').swiftActions,0);
 const trueOwner={items:{contents:[{type:'class',system:{class_name:'Saboteur',level:8}}]}};
 assert.equal(planQuickSabotage(trueOwner,'complex').swiftActions,2);
});

test('single-swift success spends before the check and preserves its result',async()=>{
 const log=[];
 const output=await executeQuickSabotage({
   actor:actor(4),plan:planQuickSabotage(actor(4),'simple'),
   spend:async (_a,type,meta)=>{
     log.push('spend-'+type+'-'+meta.swiftIndex);
     return {committed:true,rollback:async()=>{log.push('rollback');return true;}};
   },
   perform:async()=>{log.push('check');return {success:true,dc:15};},
 });
 assert.deepEqual(log,['spend-swift-1','check']);
 assert.deepEqual(output,{success:true,dc:15});
});

test('two swift actions must both commit before any device check',async()=>{
 const log=[];
 const result=await executeQuickSabotage({
   actor:actor(8),plan:planQuickSabotage(actor(8),'complex'),
   spend:async (_a,type,meta)=>{
     log.push('spend'+meta.swiftIndex);
     return {committed:true,rollback:async()=>{log.push('rollback'+meta.swiftIndex);return true;}};
   },
   perform:async()=>{log.push('check');return 'success';},
 });
 assert.equal(result,'success');
 assert.deepEqual(log,['spend1','spend2','check']);
});

test('second swift refused: original swift is rolled back; no roll occurs',async()=>{
 const log=[];
 await assert.rejects(executeQuickSabotage({
   actor:actor(8),plan:planQuickSabotage(actor(8),'complex'),
   spend:async (_a,_type,meta)=>{
     log.push('spend'+meta.swiftIndex);
     if(meta.swiftIndex===2)return {committed:false,permitted:false};
     return {committed:true,rollback:async()=>{log.push('rollback');return true;}};
   },
   perform:async()=>{log.push('check');},
 }),/not committed/);
 assert.deepEqual(log,['spend1','spend2','rollback']);
});

test('mechanics failure rolls back any committed swift spends; bad rollback is flagged',async()=>{
 const log=[];
 await assert.rejects(executeQuickSabotage({
   actor:actor(4),plan:planQuickSabotage(actor(4),'simple'),
   spend:async()=>({committed:true,rollback:async()=>{log.push('rollback');return true;}}),
   perform:async()=>{throw new Error('dice service unavailable');},
 }),/dice service unavailable/);
 assert.deepEqual(log,['rollback']);
 await assert.rejects(executeQuickSabotage({
   actor:actor(4),plan:planQuickSabotage(actor(4),'simple'),
   spend:async()=>({committed:true,rollback:async()=>false}),
   perform:async()=>{throw new Error('chat failure');},
 }),/INDETERMINATE; GM review/);
});

test('out-of-combat canonical no-op is accepted; other uncommitted spends fail closed',async()=>{
 const a=actor(4),p=planQuickSabotage(a,'simple');
 assert.equal(await executeQuickSabotage({
   actor:a,plan:p,spend:async()=>({committed:false,noOp:true,reason:'out-of-combat'}),
   perform:async()=>42,
 }),42);
 await assert.rejects(executeQuickSabotage({
   actor:a,plan:p,spend:async()=>({committed:false,noOp:true,reason:'economy-modules-unavailable'}),
   perform:async()=>42,
 }),/not committed/);
});

test('only disable-device consumer receives Quick Sabotage, without speeding explosives or repair',()=>{
 const s=fs.readFileSync(path.join(root,'scripts/skills/skill-uses.js'),'utf8');
 const start=s.indexOf('static async disableDevice(');
 const end=s.indexOf('static async handleExplosives(',start);
 const disable=s.slice(start,end);
 assert.match(disable,/planQuickSabotage\(actor,complexity\)/);
 assert.match(disable,/usesImprovisedTools && !quickSabotage\.improvisedSecurityKitAllowed/);
 assert.match(disable,/ActionEconomyConsumption\.spend\(owner,type,meta\)/);
 assert.match(disable,/perform:performCheck/);
 assert.match(disable,/Action: \${quickSabotage\.actionLabel}/);
 const other=s.slice(end,s.indexOf('static async juryRig(',end));
 assert.doesNotMatch(other,/planQuickSabotage|executeQuickSabotage/);
});

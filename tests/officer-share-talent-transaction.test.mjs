import test from 'node:test';
import assert from 'node:assert/strict';
import { executeOfficerShareTalentTransaction } from '../scripts/engine/combat/officer-share-talent-transaction.js';

const clone=value=>JSON.parse(JSON.stringify(value));
const makeActor=id=>({id,uuid:'Actor.'+id,state:{items:[],usage:[]}});
function context({failure=null,rollbackInexact=null,spendResult={committed:true,engineResult:{allowed:true}},turnOkay=true}={}) {
 const officer=makeActor('officer'),ally1=makeActor('ally1'),ally2=makeActor('ally2');
 const log=[];
 const actorEngine={
   async captureRecoverySnapshot(actor){log.push('capture:'+actor.id);return clone(actor.state);},
   async applyMutationPlan(actor,plan,opts){
     assert.equal(opts.transactional,true);
     log.push('write:'+actor.id);
     if(plan.add?.items)actor.state.items.push(...clone(plan.add.items));
     if(plan.set?.['flags.swse.classFeatures.officer.dailyShares'])
       actor.state.usage=clone(plan.set['flags.swse.classFeatures.officer.dailyShares']);
     if(failure===actor.id)throw new Error('simulated failure '+actor.id);
   },
   async restoreSnapshotVerified(actor,snapshot){
     log.push('restore:'+actor.id);
     actor.state=clone(snapshot);
     return {verdict:actor.id===rollbackInexact?'INEXACT':'EXACT'};
   },
 };
 let spendCount=0;
 const args={
   officer,additions:[{actor:ally1,item:{id:'shared1'}},{actor:ally2,item:{id:'shared2'}}],
   usage:[{talentId:'T',day:15}],actorEngine,
   validateBeforeSpend:()=>{
     log.push('validate-turn');
     if(!turnOkay)throw new Error('turn advanced');
   },
   spendStandardAction:async()=>{spendCount++;log.push('spend');return spendResult;},
 };
 return {officer,ally1,ally2,log,args,get spendCount(){return spendCount;}};
}

test('two recipient legs, Officer ledger, and V2 spend commit exactly once',async()=>{
 const x=context();
 await executeOfficerShareTalentTransaction(x.args);
 assert.equal(x.spendCount,1);
 assert.deepEqual(x.ally1.state.items,[{id:'shared1'}]);
 assert.deepEqual(x.ally2.state.items,[{id:'shared2'}]);
 assert.deepEqual(x.officer.state.usage,[{talentId:'T',day:15}]);
 assert.deepEqual(x.log.slice(0,3),['capture:officer','capture:ally1','capture:ally2']);
 assert.deepEqual(x.log.slice(-5),['write:ally1','write:ally2','write:officer','validate-turn','spend']);
});

test('failed second recipient write is included in exact rollback of all touched actors',async()=>{
 const x=context({failure:'ally2'});
 await assert.rejects(executeOfficerShareTalentTransaction(x.args),/simulated failure ally2/);
 assert.deepEqual(x.ally1.state.items,[]);
 assert.deepEqual(x.ally2.state.items,[]);
 assert.deepEqual(x.officer.state.usage,[]);
 assert.equal(x.spendCount,0);
 assert.ok(x.log.includes('restore:ally2'));
 assert.ok(x.log.includes('restore:ally1'));
 assert.ok(!x.log.includes('restore:officer')); // officer not touched yet
});

test('failed Officer ledger write rolls back both recipients and Officer',async()=>{
 const x=context({failure:'officer'});
 await assert.rejects(executeOfficerShareTalentTransaction(x.args),/simulated failure officer/);
 for(const actor of [x.officer,x.ally1,x.ally2])
   assert.deepEqual(actor.state,{items:[],usage:[]});
 assert.equal(x.spendCount,0);
 assert.ok(x.log.includes('restore:officer'));
});

test('noncommitted V2 spend and advanced turn both trigger exact reversal',async()=>{
 const x=context({spendResult:{committed:false,engineResult:{allowed:false}}});
 await assert.rejects(executeOfficerShareTalentTransaction(x.args),/standard action was not committed/);
 for(const actor of [x.officer,x.ally1,x.ally2])
   assert.deepEqual(actor.state,{items:[],usage:[]});
 assert.equal(x.spendCount,1);
 const y=context({turnOkay:false});
 await assert.rejects(executeOfficerShareTalentTransaction(y.args),/turn advanced/);
 assert.equal(y.spendCount,0);
 for(const actor of [y.officer,y.ally1,y.ally2])
   assert.deepEqual(actor.state,{items:[],usage:[]});
});

test('inexact rollback is never reported as a compensated Share Talent failure',async()=>{
 const x=context({failure:'ally2',rollbackInexact:'ally2'});
 await assert.rejects(executeOfficerShareTalentTransaction(x.args),/INDETERMINATE; GM review required/);
});

test('recipients who own the talent do not receive duplicate Items',async()=>{
 const x=context();
 x.args.additions[0].item=null;
 await executeOfficerShareTalentTransaction(x.args);
 assert.deepEqual(x.ally1.state.items,[]);
 assert.deepEqual(x.ally2.state.items,[{id:'shared2'}]);
 assert.deepEqual(x.officer.state.usage,[{talentId:'T',day:15}]);
});

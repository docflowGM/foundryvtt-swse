#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>JSON.parse(readFileSync(new URL('../../../'+path,import.meta.url),'utf8'));
const base='data/audits/droids/';
const census=read(base+'component-122-identity-source-coverage.json');
const ledger=read(base+'component-mechanical-certification-ledger.json');
const batches=['001','002','003','004','005'].map(n=>read(base+'component-mechanical-certification-batch-'+n+'.json'));
const baseline=new Map(census.rows.map(x=>[x.canonicalId,x.canonicalName]));
const decisions=batches.flatMap((packet,index)=>packet.records.map(r=>({
 id:r.canonicalId,name:r.canonicalName,batch:'MECH-00'+(index+1),
 decision:index===0?(r.certification?.sourceMechanicsStatus==='CERTIFIED'?'PASS':'HOLD')
 :index===1?r.adjudication?.decision:index===2?r.decision:r.certification?.decision,
 holdReason:index===1?r.adjudication?.holdReason:index===2?r.hold?.reason:r.certification?.holdReason
})));
assert.equal(baseline.size,122);
assert.equal(decisions.length,122);
assert.equal(new Set(decisions.map(r=>r.id)).size,122);
for(const x of decisions){
 assert.equal(baseline.get(x.id),x.name,'Canonical identity mismatch '+x.id);
 assert(['PASS','HOLD'].includes(x.decision),'Invalid decision '+x.id);
 if(x.decision==='HOLD')assert(x.holdReason?.length>=15,'No hold reason '+x.id);
}
const good=decisions.filter(x=>x.decision==='PASS'),hold=decisions.filter(x=>x.decision==='HOLD');
assert.equal(good.length,99);assert.equal(hold.length,23);
assert.deepEqual(batches.map(x=>x.records.length),[25,25,25,25,22]);
assert.deepEqual(batches.map((x,i)=>x.records.filter(r=>(i===0?(r.certification?.sourceMechanicsStatus==='CERTIFIED'?'PASS':'HOLD'):i===1?r.adjudication?.decision:i===2?r.decision:r.certification?.decision)==='PASS').length),[25,19,17,18,20]);
assert.equal(ledger.counts.totalSourceMechanicalCertified,99);
assert.equal(ledger.counts.sourceMechanicsOnHold,23);
assert.equal(ledger.counts.sourceMechanicsNotYetEvaluated,0);
assert.equal(ledger.counts.remainingSourceMechanicalNotYetCertified,23);
assert.equal(new Set(ledger.certifiedIdentityIds).size,99);
assert.equal(new Set(ledger.heldIdentityIds).size,23);
assert.deepEqual(new Set(ledger.certifiedIdentityIds),new Set(good.map(x=>x.id)));
assert.deepEqual(new Set(ledger.heldIdentityIds),new Set(hold.map(x=>x.id)));
assert.equal(ledger.identitySourceDecisions.length,122);
assert.equal(ledger.sourceAuditHolds.length,23);
for(const record of ledger.identitySourceDecisions){
 const truth=decisions.find(x=>x.id===record.canonicalId);
 assert(truth&&record.canonicalName===truth.name&&record.sourceDecision===truth.decision);
 assert.equal(record.sourceBatch,truth.batch);
}
for(const name of ['productionRegistryCertified','applicationParityCertified','foundryRuntimeCertified'])assert.equal(ledger.counts[name],0);
console.log('PASS MECH census: 122 unique identities evaluated; 99 published-source PASS, 23 source HOLD, zero unreviewed. No production, app or Foundry certificates claimed.');

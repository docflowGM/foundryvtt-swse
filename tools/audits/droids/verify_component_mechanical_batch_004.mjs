#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load = p => JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const p=load('../../../data/audits/droids/component-mechanical-certification-batch-004.json');
const f=load('../../../data/audits/droids/component-mechanical-certification-batch-004-fixtures.json');
const d=load('../../../data/audits/droids/component-mechanical-certification-ledger-delta-004.json');
assert.equal(p.records.length,25);
assert.equal(new Set(p.records.map(r=>r.canonicalId)).size,25);
const passed=p.records.filter(r=>r.certification.decision==='PASS');
const held=p.records.filter(r=>r.certification.decision==='HOLD');
assert.equal(passed.length,18); assert.equal(held.length,7);
assert.equal(f.cases.length,25); assert.equal(d.candidateIdentities.length,25);
assert.equal(d.newlySourceCertifiedIds.length,18); assert.equal(d.newHolds.length,7);
for(const r of p.records){
 assert(r.source.length>0);
 assert(r.source.every(s=>Number.isInteger(s.printedPage)&&Number.isInteger(s.pdfPage1Based)&&s.pdfPage1Based===s.printedPage+1));
 const x=r.printed;
 for (const key of ['priceWeightAvailability','host','prerequisites','mechanics','modificationAuthority']) assert(x[key]);
 assert.equal(r.certification.printedRulesComplete,r.certification.decision==='PASS');
 assert(!r.certification.productionCertified&&!r.certification.applicationParityCertified&&!r.certification.foundryRuntimeCertified);
 if(r.certification.decision==='HOLD')assert(r.certification.holdReason);
}
for(const [i,c] of f.cases.entries()){
 assert.equal(c.canonicalId,p.records[i].canonicalId);
 for(const x of ['garage','chargen','follower','store','foundry'])assert.equal(c[x],'NOT_EXECUTED');
}
assert.equal(p.records.find(r=>r.canonicalName==='Blaster Recharge Interface').printed.mechanics.sourceExample.hpCost,8);
assert.equal(p.records.find(r=>r.canonicalName==='Droid Oil Bath').printed.priceWeightAvailability.tableCredits,500);
assert.equal(p.records.find(r=>r.canonicalName==='Emergency Oxygen Supply').printed.priceWeightAvailability.weightUnit,'NOT_PRINTED');
assert.equal(p.records.find(r=>r.canonicalName==='Internal Defenses').printed.mechanics.maxAttackUses,10);
assert.equal(d.cumulativeIfBatches1Through4Integrated.sourceMechanicallyCertified,79);
assert.equal(d.cumulativeIfBatches1Through4Integrated.onHold,21);
console.log('PASS MECH004: 25 unique; 18 source PASS, 7 source HOLD; cumulative 79/122 only once MECH003 and MECH004 are applied.');

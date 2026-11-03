#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const p=load('../../../data/audits/droids/component-mechanical-certification-batch-002.json'),a=load('../../../data/audits/droids/component-mechanical-certification-batch-001.json'),ledger=load('../../../data/audits/droids/component-mechanical-certification-ledger.json'),fx=load('../../../data/audits/droids/component-mechanical-certification-batch-002-fixtures.json'),census=load('../../../data/audits/droids/component-122-identity-source-coverage.json');
const canon=new Map(census.rows.map(r=>[r.canonicalId,r.canonicalName])),used=new Set(a.records.map(r=>r.canonicalId));
assert.equal(p.records.length,25);
assert.equal(new Set(p.records.map(r=>r.canonicalId)).size,25);
assert.equal(p.records.filter(r=>r.adjudication.decision==='PASS').length,19);
assert.equal(p.records.filter(r=>r.adjudication.decision==='HOLD').length,6);
assert.equal(p.records.filter(r=>r.category==='LOCOMOTION'&&r.adjudication.decision==='HOLD').length,5);
for(const r of p.records){
 assert.equal(canon.get(r.canonicalId),r.canonicalName);assert(!used.has(r.canonicalId));
 assert(r.sourcePages.length>0);for(const s of r.sourcePages){assert(Number.isInteger(s.printedPage));assert.equal(s.pdfPage1Based,s.printedPage+1);}
 assert(r.printed.price&&r.printed.weight&&r.printed.host&&r.printed.mechanics&&r.printed.installation);
 assert(!r.implementation.foundryV13Tested&&!r.implementation.registryCertified);
 if(r.adjudication.decision==='HOLD')assert(r.adjudication.holdReason);
}
assert.deepEqual(Object.values(p.authority.sizeCostFactors),[20,10,5,2,1,2,5,10,20]);
for(const [tier,c,w] of [[2,1000,100],[3,2500,250],[4,4000,400],[5,6250,650]]){const r=p.records.find(x=>x.canonicalName==='Hardened Systems x'+tier);assert.equal(r.printed.price.baseCredits,c);assert.equal(r.printed.weight.baseKg,w);}
for(const [sr,c,w] of [[5,2500,10],[10,5000,20],[15,7500,30],[20,10000,40]]){const r=p.records.find(x=>x.canonicalName==='Shield Generator, SR '+sr);assert.equal(r.printed.price.baseCredits,c);assert.equal(r.printed.weight.baseKg,w);}
assert.equal(p.records.find(x=>x.canonicalName==='Synchronized Fire Circuits').printed.mechanics.totalAidBonus,4);
assert.equal(p.records.find(x=>x.canonicalName==='Remote Receiver').printed.price.credits,-500);
assert.equal(p.records.find(x=>x.canonicalName==='Diagnostics Package').printed.mechanics.equipmentBonus,2);
assert.equal(p.records.find(x=>x.canonicalName==='Secondary Battery').printed.price.credits,400);
assert.equal(fx.cases.length,25);assert.equal(ledger.batches.find(x=>x.id==='MECH-002')?.certifiedPrintedMechanics,19);
assert.equal(ledger.counts.totalSourceMechanicalCertified,99);
assert.equal(new Set(ledger.certifiedIdentityIds).size,99);
const official=load('../../../data/audits/droids/droid-component-official-errata-authority-001.json');
assert.equal(official.corrections.synchronizedFireCircuits.errataReplacementTotalBonus,5);
assert.equal(official.corrections.synchronizedFireCircuits.baseBookPreErrataAidAnotherBonus,4);
assert.equal(ledger.errataAuthority.overlayPath,'data/audits/droids/droid-component-official-errata-authority-001.json');
console.log('PASS MECH002 historical 19 base-book PASS/6 HOLD; Synchronized Fire +4 in archival packet is superseded by official +5');

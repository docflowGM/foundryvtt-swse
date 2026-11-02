#!/usr/bin/env node
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const p=load('../../../data/audits/droids/component-122-identity-source-coverage.json');
assert.equal(p.rows.length,122);
assert.equal(new Set(p.rows.map(r=>r.canonicalId)).size,122);
assert.equal(p.rows.filter(r=>r.baselineDisposition==='KEEP').length,92);
assert.equal(p.rows.filter(r=>r.baselineDisposition==='EDIT').length,7);
assert.equal(p.rows.filter(r=>r.baselineDisposition==='ADD').length,23);
assert.equal(p.counts.withOneOrMoreSourceFactReviews,122);
assert.equal(p.counts.mechanicallyCertified,0);
const byPath=new Map();
for(const row of p.rows){
 assert(row.sourceFacts.evidencePacket&&row.sourceFacts.evidenceRecordLabel);
 assert(!row.certification.completeSourceMechanical&&!row.certification.productionMigration&&!row.certification.foundryRuntime);
 const rel=row.sourceFacts.evidencePacket;
 if(!byPath.has(rel)){
   const url=new URL('../../../'+rel,import.meta.url);
   assert(existsSync(url),'Missing evidence packet: '+rel);
   byPath.set(rel,load('../../../'+rel));
 }
 const evidence=byPath.get(rel),label=row.sourceFacts.evidenceRecordLabel;
 const texts=(evidence.records||[]).map(r=>r.name||r.publishedIdentity||r.canonicalPrintedName||r.canonicalCandidateId);
 assert(texts.some(x=>String(x).toLowerCase()===String(label).toLowerCase()),'Unresolved evidence label: '+rel+' '+label);
}
console.log('PASS: 122/122 two-book identities mapped to existing source fact records, zero mechanical/runtime certificates');

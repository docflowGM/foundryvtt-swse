#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const load = path => JSON.parse(readFileSync(new URL(path, import.meta.url),'utf8'));
const sprint3=load('../../../data/audits/droids/component-source-facts-sprint-003.json');
const rollup=load('../../../data/audits/droids/component-source-fact-review-rollup.json');
const sprint1=load('../../../data/audits/droids/component-source-facts-sgd-sprint-001.json');
const sprint2=load('../../../data/audits/droids/component-source-facts-sprint-002.json');
const backlog=load('../../../data/audits/droids/component-canonical-migration-backlog.json');
const adds=backlog.rows.filter(x=>x.classification==='ADD');
assert.equal(adds.length,23);
assert.equal(sprint1.records.length,8);
assert.equal(sprint2.records.length,8);
assert.equal(sprint3.records.length,11);
assert.equal(rollup.reviewedAdds.length,23);
assert.equal(new Set(rollup.reviewedAdds.map(x=>x.backlogId)).size,23);
assert.equal(new Set(sprint3.records.map(x=>x.backlogId)).size,11);
assert.equal(sprint3.summary.sourceFactSetsCumulative,27);
assert.equal(rollup.counts.sourceFactRecordsAcrossSprints,27);
const known=new Map(adds.map(x=>[x.id,x.canonicalPrintedName]));
const inSprint3=new Map(sprint3.records.map(x=>[x.backlogId,x]));
for(const r of sprint3.records){
  assert.equal(known.get(r.backlogId),r.name);
  assert(r.source.length>0);
  for(const s of r.source){
    assert.equal(s.book,sprint3.book);
    assert.equal(s.pdfPage1Based,s.printedPage+1);
    assert.equal(s.verification,'PDF page rendered and visually inspected 2026-11-02');
  }
  assert(r.table && r.mechanics && r.blockers.length>0);
  assert.equal(r.completeMechanicalCertification,false);
  assert.equal(r.productionMigrationStatus,'NOT_CREATED');
  assert.equal(r.foundryRuntimeCertified,false);
}
const sprint2Names=new Set(sprint2.records.map(x=>x.name));
const sprint1Names=new Set(sprint1.records.map(x=>x.name));
for(const r of rollup.reviewedAdds){
  assert.equal(known.get(r.backlogId),r.canonicalPrintedName);
  if(r.sourceFactPacket.endsWith('sprint-003.json')) assert(inSprint3.has(r.backlogId));
  else if(r.sourceFactPacket.endsWith('sprint-002.json')) assert(sprint2Names.has(r.canonicalPrintedName));
  else assert(sprint1Names.has(r.canonicalPrintedName));
  assert.equal(r.productionStatus,'NOT_CREATED');
}
assert.equal(rollup.reviewedAdds.filter(x=>x.hostClassification.endsWith('_NOT_DROID_BODY')).length,5);
assert.equal(sprint3.records.filter(x=>x.hostClass.endsWith('_NOT_DROID_BODY')).length,4);
assert.equal(sprint3.summary.publishedMissingAddStillUnreviewed,0);
assert.equal(rollup.counts.fullMechanicalCertifications,0);
assert.equal(rollup.counts.runtimeCertifications,0);
console.log('PASS: 23/23 missing ADD source-reviewed across 27 source-fact sets; 5 non-body assets; 0 mechanical/runtime certifications');

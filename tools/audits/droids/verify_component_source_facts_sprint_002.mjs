import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const p=load('../../../data/audits/droids/component-source-facts-sprint-002.json');
const b=load('../../../data/audits/droids/component-canonical-migration-backlog.json');
const old=load('../../../data/audits/droids/component-source-facts-sgd-sprint-001.json');
const adds=b.rows.filter(r=>r.classification==='ADD');
assert.equal(adds.length,23);assert.equal(p.records.length,8);
assert.equal(new Set(p.records.map(r=>r.id)).size,8);assert.equal(new Set(p.records.map(r=>r.name)).size,8);
assert.equal(new Set(p.records.map(r=>r.backlogId)).size,8);
const index=new Map(adds.map(r=>[r.id,r.canonicalPrintedName]));
for(const r of p.records){
 assert.equal(index.get(r.backlogId),r.name);
 assert(r.source.length>0);
 for(const s of r.source)assert.equal(s.pdfPage1Based,s.printedPage+1);
 assert.equal(r.certifications.completeSourceMechanical,false);
 assert.equal(r.certifications.garageChargenStoreParity,false);
 assert.equal(r.certifications.foundryRuntime,false);
 assert.equal(r.registry.production,'NOT_CREATED');
}
const earlier=adds.filter(r=>r.sourceMechanicsReviewed!=='NOT_YET_SOURCE_REVIEWED').length;
assert.equal(earlier,4);assert.equal(p.records.filter(r=>r.sourceConflict).length,1);
assert.equal(p.counts.totalSourceFactSetsIncludingPrevious,old.records.length+p.records.length);
assert.equal(p.counts.missingAddReviewedNow,earlier+p.records.length);
assert.equal(p.counts.missingAddUnreviewedNow,adds.length-earlier-p.records.length);
assert.equal(p.counts.fullMechanicalCertifications,0);assert.equal(p.counts.productionRegistryEdits,0);
console.log('PASS: 8 PDF-review records; 1 explicit conflict; 12/23 missing ADDs reviewed, 11 outstanding; 0 runtime certifications');

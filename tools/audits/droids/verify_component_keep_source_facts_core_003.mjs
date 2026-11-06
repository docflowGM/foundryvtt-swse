#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const p=JSON.parse(readFileSync(new URL('../../../data/audits/droids/component-keep-source-facts-core-003.json',import.meta.url),'utf8'));
assert.equal(p.sprint,'KEEP-003');
assert.equal(p.records.length,16);
assert.equal(new Set(p.records.map(r=>r.id)).size,16);
assert.equal(p.records.filter(r=>r.group==='base_locomotion').length,5);
assert.equal(p.records.filter(r=>r.group==='appendage').length,5);
assert.equal(p.records.filter(r=>r.group.endsWith('_enhancement')).length,6);
assert.equal(p.findings.length,10);
for(const r of p.records){
 assert(r.sourceFactsPdfVerified&&!r.completeSourceMechanicalCertified&&!r.productionRegistryMigrated&&!r.foundryRuntimeCertified);
 assert(r.source.length>0);
 for(const s of r.source)assert.equal(s.pdfPage1Based,s.printedPage+1);
}
assert.equal(p.records.find(r=>r.id==='mount').printed.mediumCostCredits,50);
assert.equal(p.records.find(r=>r.id==='mount').printed.mediumWeightKg,10);
assert.equal(p.records.find(r=>r.id==='jump-servos').printed.tablePrice,'2 * appendage cost');
assert.equal(p.records.find(r=>r.id==='climbing-claws').printed.descriptionPrice,'2 * walking locomotion cost');
assert.equal(p.counts.cumulativeComponentSourceFactRows,62);
assert.equal(p.counts.fullMechanicalCertifications,0);
console.log('PASS KEEP-003: 16 source reviews, 10 findings, contradictory price bases retained; 0 runtime certs');

#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const p=JSON.parse(readFileSync(new URL('../../../data/audits/droids/component-keep-source-facts-core-001.json',import.meta.url),'utf8'));
assert.equal(p.sprint,'KEEP-001');
assert.equal(p.records.length,10);
assert.equal(new Set(p.records.map(r=>r.publishedIdentity)).size,10);
assert.equal(p.findings.length,9);
for(const r of p.records) {
 assert(r.identityPresenceReviewed&&r.publishedSourceFactsVerified);
 assert(!r.completeSourceMechanicalCertification&&!r.productionRegistryChanged&&!r.foundryRuntimeCertified);
 assert(r.source.length>0);
 for(const s of r.source){assert.equal(s.pdfPage1Based,s.printedPage+1);assert.equal(s.book,p.book)}
}
const get=id=>p.records.find(r=>r.canonicalCandidateId===id);
assert.equal(get('synchronized-fire-circuits').table.costCredits,150);
assert(get('synchronized-fire-circuits').issueIds.includes('K001-AID-BONUS-PLUS-ONE'));
assert.equal(get('remote-receiver').table.costCredits,-500);
assert.equal(get('droid-caller').hostClass,'EXTERNAL_HANDHELD_ITEM_NOT_DROID_BODY');
assert.equal(get('backup-processor').table.weightKg,null);
assert.equal(p.summary.cumulativeSourceFactSets,37);
assert.equal(p.summary.fullMechanicalCertifications,0);
console.log('PASS KEEP-001: 10 Core source fact reviews; 9 findings; source page mapping correct; 0 runtime certificates');

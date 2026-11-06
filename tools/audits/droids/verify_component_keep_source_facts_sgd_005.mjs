#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const p=JSON.parse(readFileSync(new URL('../../../data/audits/droids/component-keep-source-facts-sgd-005.json',import.meta.url),'utf8'));
assert.equal(p.records.length,8);assert.equal(new Set(p.records.map(x=>x.id)).size,8);
for(const r of p.records){assert.equal(r.repository.rawCatalog,'ABSENT_EXACT_ID');assert.equal(r.repository.overlay,'PRESENT');assert(r.certification.sourceFactsReviewed);assert(!r.certification.mechanicalComplete&&!r.certification.productionMigrated&&!r.certification.foundryRuntimePassed);for(const s of r.source)assert.equal(s.pdfPage1Based,s.printedPage+1);}
assert.equal(p.summary.cumulativeFactRows,82);assert.equal(p.summary.foundryRuntimeCertifications,0);
console.log('PASS KEEP-005: 8 overlay-only priced rows, source-page offsets and no runtime certificates');

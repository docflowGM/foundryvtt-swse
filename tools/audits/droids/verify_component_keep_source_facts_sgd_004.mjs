#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const p=JSON.parse(readFileSync(new URL('../../../data/audits/droids/component-keep-source-facts-sgd-004.json',import.meta.url),'utf8'));
assert.equal(p.sprint,'KEEP-004');
assert.equal(p.records.length,12);
assert.equal(new Set(p.records.map(x=>x.id)).size,12);
assert.equal(p.findings.length,17);
assert.equal(p.records.filter(x=>x.repository.catalogLayer==='OVERLAY_ONLY').length,4);
assert.equal(p.records.filter(x=>x.repository.primaryIssue==='SOURCE_PRICE_CONFLICT').length,2);
for(const x of p.records){assert(x.certification.publishedFactsReviewed);assert(!x.certification.completeMechanical&&!x.certification.productionMigrated&&!x.certification.foundryRuntime);for(const s of x.source)assert.equal(s.pdfPage1Based,s.printedPage+1);}
assert.equal(p.counts.cumulativeSourceFactRows,74);
assert.equal(p.counts.fullMechanicalCertifications,0);
console.log('PASS KEEP-004: 12 printed source rows, 17 findings, 4 overlay price gaps, 2 source conflicts; no runtime certifications');

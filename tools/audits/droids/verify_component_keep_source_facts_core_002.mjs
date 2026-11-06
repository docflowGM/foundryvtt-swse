#!/usr/bin/env node
import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const p=JSON.parse(readFileSync(new URL('../../../data/audits/droids/component-keep-source-facts-core-002.json',import.meta.url),'utf8'));
assert.equal(p.records.length,9);assert.equal(new Set(p.records.map(r=>r.id)).size,9);
assert.equal(p.records.filter(r=>r.id.startsWith('hardened-systems-')).length,4);
assert.equal(p.records.filter(r=>r.id.startsWith('sr')).length,4);
assert.deepEqual(p.records.filter(r=>r.id.startsWith('hardened-systems-')).map(r=>r.sourceTable.kgPerCostFactor),[100,250,400,650]);
for(const r of p.records){assert(r.sourceVerified);assert(r.source.every(x=>x.pdfPage1Based===x.printedPage+1));assert(!r.foundryRuntimeCertified&&!r.productionChanged);}
assert.equal(p.summary.pricingAuthorityMismatches,7);
console.log('PASS KEEP-002 nine source-fact rows, four hardening and four shield variants; seven factor discrepancies');

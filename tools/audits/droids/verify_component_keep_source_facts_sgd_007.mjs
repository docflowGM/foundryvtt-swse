#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const p=JSON.parse(readFileSync(new URL('../../../data/audits/droids/component-keep-source-facts-sgd-007.json',import.meta.url),'utf8'));
assert.equal(p.sprint,'KEEP-007');assert.equal(p.records.length,9);
assert.equal(new Set(p.records.map(r=>r.id)).size,9);
assert.equal(p.records.filter(r=>!r.repo.rawPresent&&r.repo.overlayPresent).length,8);
assert.equal(p.findings.length,11);
for(const r of p.records){assert(r.sourceFactsVerified);assert(!r.completeMechanicalCertified&&!r.productionRegistryMigrated&&!r.foundryRuntimeCertified);for(const s of r.source)assert.equal(s.pdfPage1Based,s.printedPage+1);}
const sh=p.records.find(x=>x.id==='shield-expansion-module');
assert.equal(sh.printed.costFormulaCredits,'50 * currentShieldRating * sizeCostFactor');
assert.equal(p.counts.cumulativeRows,99);assert.equal(p.counts.mechanicalCertificates,0);
assert.equal(p.taxonomy.reference[0].printedPage,51);
console.log('PASS KEEP-007: 9 source-fact records, 8 overlay-only, 11 findings; zero certification promotions');

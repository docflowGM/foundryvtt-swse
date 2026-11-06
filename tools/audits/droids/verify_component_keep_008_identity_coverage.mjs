#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load = p => JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const a=load('../../../data/audits/droids/component-keep-source-facts-armor-and-uncovered-008.json'), c=load('../../../data/audits/droids/component-keep-source-facts-coverage-008.json');
assert.equal(a.records.length,16);assert.equal(new Set(a.records.map(x=>x.canonicalId)).size,16);
assert.equal(a.records.filter(x=>x.kind==='built_in_armor').length,13);
assert.equal(a.findings.length,10);assert.equal(c.rows.length,92);
assert.equal(new Set(c.rows.map(x=>x.canonicalId)).size,92);
assert.equal(c.counts.priorDirectNameMatches,74);assert.equal(c.counts.priorExplicitAliasMatches,2);
assert.equal(c.counts.priorMissingSourceRecords,16);assert.equal(c.counts.keepSourceFactCoverage,92);
assert.equal(c.counts.remainingKeepWithoutSourceFact,0);
for(const x of c.rows){assert(x.evidencePacket&&x.evidenceRecordLabel);assert(x.fullMechanicalCertification===false&&x.foundryRuntime===false);}
for(const x of a.records){assert(x.status.sourceFactReviewed&&!x.status.completeMechanicalCertificate&&!x.status.productionMigration);for(const s of x.source)assert.equal(s.pdfPage1Based,s.printedPage+1);}
assert.equal(a.records.find(x=>x.name==='Crystadurium Plating').printed.special.reductionPerDamageDie,1);
assert.equal(a.records.find(x=>x.name==='Duravlex Shell').printed.special.bonusToFortitude,10);
assert.equal(a.records.find(x=>x.name==='Self-Destruct System').printed.mediumExample.credits,720);
console.log('PASS KEEP008: 16 new, 92 of 92 canonical KEEP source fact coverage; 0 runtime certifications');

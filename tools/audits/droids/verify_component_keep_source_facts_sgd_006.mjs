#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const x=JSON.parse(readFileSync(new URL('../../../data/audits/droids/component-keep-source-facts-sgd-006.json',import.meta.url),'utf8'));
assert.equal(x.sprint,'KEEP-006'); assert.equal(x.records.length,8);
assert.equal(new Set(x.records.map(r=>r.id)).size,8);
assert.equal(x.findings.length,11); assert.equal(x.acceptanceFixtures.length,10);
assert.equal(x.counts.cumulativeSourceFactRows,90);
for(const r of x.records) {
 assert(r.sourceFactsVisuallyVerified);assert(!r.mechanicallyCertified&&!r.productionMigrated&&!r.foundryRuntimeCertified);
 assert(r.source.length>0);
 for(const s of r.source) assert.equal(s.pdfPage1Based,s.printedPage+1);
}
const core=x.records.find(r=>r.id==='hidden-core');
assert.equal(core.publication.protectedVariantCredits,400);
assert.equal(core.mechanics.wipeRecovery.check,'Use Computer DC20');
const jam=x.records.find(r=>r.id==='remote-receiver-jammer');
assert.equal(jam.hostClass,'PORTABLE_BACKPACK_TRANSMITTER_HANDHELD_CONTROLLER_NOT_BODY');
assert.equal(jam.mechanics.activationAction,'standard');
const reader=x.records.find(r=>r.id==='credit-reader');
assert.equal(reader.publication.priceCredits,50); assert.equal(reader.registry.defaultSharedPricePossible,0);
for(const f of x.acceptanceFixtures){
 assert.equal(f.status,'SPECIFICATION_ONLY');
 assert([f.garage,f.chargen,f.follower,f.store,f.foundry].every(s=>s==='NOT_TESTED'));
}
assert.equal(x.counts.productionChanges,0);
console.log('PASS KEEP-006: eight reviewed components, eleven risk findings, ten unexecuted acceptance cases; no runtime certification');

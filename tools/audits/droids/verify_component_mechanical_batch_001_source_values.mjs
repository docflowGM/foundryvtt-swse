#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const packet=load('../../../data/audits/droids/component-mechanical-certification-batch-001.json');
const tests=load('../../../data/audits/droids/component-mechanical-certification-batch-001-acceptance.json');
assert.equal(tests.fixtures.length,25);
assert.equal(new Set(tests.fixtures.map(x=>x.componentId)).size,25);
assert.equal(packet.records.length,25);
const byName=new Map(packet.records.map(x=>[x.canonicalName,x]));
const sizeNames=["fine","diminutive","tiny","small","medium","large","huge","gargantuan","colossal"];
assert.deepEqual(tests.factorsVerifiedAgainst.map.map(x=>x.ratio),[20,10,5,2,1,2,5,10,20]);
for(const f of tests.fixtures){
 const r=byName.get(f.name);assert(r,'Unknown source identity '+f.name);
 assert.equal(r.canonicalId,f.componentId);assert.equal(r.certification.sourceMechanicsStatus,'CERTIFIED');
 assert(!r.certification.productionDefinitionsCertified&&!r.certification.appParityCertified&&!r.certification.foundryRuntimeCertified);
 assert(r.sourcePages.every(p=>Number.isInteger(p.printedPage)&&Number.isInteger(p.pdfPage1Based)&&p.pdfPage1Based===p.printedPage+1));
 const e=f.expected;
 if(f.ruleKind==='ARMOR'){
  assert.equal(r.price.baseCredits,e.baseCredits);assert.equal(r.weight.baseKg,e.baseKg);
  assert.equal(r.mechanics.reflexArmorBonus,e.reflexArmorBonus);assert.equal(r.mechanics.maxDexterityBonus,e.maxDex);
  assert.equal(r.host.armorClass,e.armorClass);assert.equal(r.availability,e.availability);
  assert.equal(e.smallPriceCredits,2*e.baseCredits);assert.equal(e.hugePriceCredits,5*e.baseCredits);
  assert.equal(e.smallWeightKg,2*e.baseKg);assert.equal(e.hugeWeightKg,5*e.baseKg);
  assert.equal(r.mechanics.doesNotStackWithWornArmorBonus,true);
 } else if(f.ruleKind==='APPENDAGE'){
  assert.equal(r.price.baseCredits,e.baseCredits);assert.equal(r.weight.baseKg,e.baseKg);
  assert.deepEqual(sizeNames.map(s=>r.mechanics.unarmedDamageBySize[s]),e.nineSizeUnarmedDamage);
  assert.equal(r.mechanics.appendageCountDoesNotIncreaseActionsOrAttacks,true);
 } else {
  assert.equal(r.price.credits,e.credits);assert.equal(r.weight.kg,e.kg);assert.equal(r.availability,e.availability);
 }
 assert.equal(f.executionStatus.garage,'NOT_EXECUTED');assert.equal(f.executionStatus.foundryV13,'NOT_EXECUTED');
}
assert.equal(tests.counts.appTestsExecuted,0);
console.log('PASS: 25 independent printed table fixtures; no application/runtime certificates');

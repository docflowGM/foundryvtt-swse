#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const p=JSON.parse(readFileSync(new URL('../../../data/audits/droids/droid-component-official-errata-authority-001.json',import.meta.url),'utf8'));
const e=p.corrections.accessoryWeight;
assert.equal(p.phase,'ERRATA-001');
assert.equal(e.sourceClassConfirmedTargets.length,21);
assert.equal(new Set(e.sourceClassConfirmedTargets).size,21);
assert.equal(new Set(e.sgdSystemsRequiringHostScopeReview).size,e.sgdSystemsRequiringHostScopeReview.length);
assert.deepEqual(Object.values(e.costFactorBySize),[20,10,5,2,1,2,5,10,20]);
assert.deepEqual(Object.values(e.accessoryWeightFactorBySize),[0.1,0.2,0.4,1,1,2,5,10,20]);
for(const f of p.sourceValueFixtures){
 const a=e.costFactorBySize[f.size],w=e.accessoryWeightFactorBySize[f.size];
 assert(Math.abs(f.expectedCostCredits-f.printedBaseCredits*a)<1e-7);
 assert(Math.abs(f.expectedAccessoryWeightKg-f.baseKg*w)<1e-7);
 assert(Math.abs(f.supersededPreErrataWeightKg-f.baseKg*a)<1e-7);
}
const sf=p.corrections.synchronizedFireCircuits;
assert.equal(sf.baseBookPreErrataAidAnotherBonus,4);
assert.equal(sf.errataReplacementTotalBonus,5);
assert.equal(sf.ordinaryAidAnotherBonus,2);
assert(sf.bonusIsReplacementNotAdditional);
assert.equal(p.corrections.startingSystemsCarryingCapacity.encumbranceAddedForStartingSystemsKg,0);
assert.equal(p.corrections.unarmedProficiency.weaponType,'light simple weapon');
assert.equal(p.historicalCertificationReconciliation.oldSourcePassCount,99);
assert.equal(p.historicalCertificationReconciliation.oldSourceHoldCount,23);
assert.equal(p.certification.productionChanges,0);
assert.equal(p.certification.foundryRuntimeTestsRun,0);
console.log('PASS ERRATA-001: original-plus-official authority, 21 Core accessory targets, seven price/weight fixtures, Synchronized Fire +5, zero production claims');
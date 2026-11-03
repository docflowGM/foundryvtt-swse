#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=path=>JSON.parse(readFileSync(new URL('../../../'+path,import.meta.url),'utf8'));
const base='data/audits/droids/';
const p=load(base+'droid-component-sgd-errata-host-002.json');
const f=load(base+'droid-component-sgd-errata-host-002-fixtures.json');
const c=load(base+'component-122-identity-source-coverage.json');
const e=load(base+'droid-component-official-errata-authority-001.json');
const l=load(base+'component-mechanical-certification-ledger.json');
const canon=new Map(c.rows.map(r=>[r.canonicalId,r.canonicalName]));
const prior=new Set(e.corrections.accessoryWeight.sgdSystemsRequiringHostScopeReview);
assert.equal(prior.size,15);
assert.equal(p.records.length,15);
assert.equal(new Set(p.records.map(r=>r.canonicalId)).size,15);
assert.equal(new Set(p.records.map(r=>r.name)).size,15);
assert.deepEqual(new Set(p.records.map(r=>r.name)),prior);
const statuses=['APPLY_ACCESSORY_WEIGHT_ERRATA','EXCLUDE_FROM_ACCESSORY_ERRATA','HOLD_HOST_SCOPE'];
for(const r of p.records){
 assert.equal(canon.get(r.canonicalId),r.name);
 assert(statuses.includes(r.officialErrata.accessoryWeightEligibility));
 assert(r.source.every(s=>Number.isInteger(s.printedPage)&&s.pdfPage1Based===s.printedPage+1));
 assert.equal(r.officialErrata.priceFormulaUnchanged,true);
 assert.equal(r.verdict.productionCertified,false);
 assert.equal(r.verdict.foundryRuntime,false);
 if(r.officialErrata.accessoryWeightEligibility==='EXCLUDE_FROM_ACCESSORY_ERRATA')assert.equal(r.tableSubcategory,'LOCOMOTION');
 if(r.officialErrata.accessoryWeightEligibility==='HOLD_HOST_SCOPE')assert.equal(r.verdict.sourceHostAndWeightScope,'HOLD_SCOPE');
}
for(const [name,num] of [['APPLY_ACCESSORY_WEIGHT_ERRATA',10],['EXCLUDE_FROM_ACCESSORY_ERRATA',3],['HOLD_HOST_SCOPE',2]])
 assert.equal(p.records.filter(r=>r.officialErrata.accessoryWeightEligibility===name).length,num);
assert.equal(f.integratedAccessoryFixtures.length,108);
assert.equal(f.locomotionFixtures.length,9);
assert.equal(f.blockedHostFixtures.length,2);
const sizes={fine:[20,0.1],diminutive:[10,0.2],tiny:[5,0.4],small:[2,1],medium:[1,1],large:[2,2],huge:[5,5],gargantuan:[10,10],colossal:[20,20]};
const table={
 'Laminanium Plating':{light:[3000,15],heavy:[20000,15]},
 'Collapsible Construction':{standard:[2000,10]},
 'Courier Compartments':{standard:[null,2,200]},
 'Electric Defense Grid':{standard:[3000,100]},
 'Hidden Holster':{standard:[500,2]},
 'Holographic Image Disguiser':{basic:[20000,20]},
 'Internal Defenses':{standard:[10,1]},
 'Internal Grapple Gun':{standard:[100,2]},
 'Radiant Heat Element':{standard:[null,20,200]},
 'Shield Expansion Module':{sr5:[250,10],sr20:[1000,40]}
};
const targetSet=new Set(p.records.filter(r=>r.officialErrata.accessoryWeightEligibility==='APPLY_ACCESSORY_WEIGHT_ERRATA').map(r=>r.name));
assert.deepEqual(new Set(Object.keys(table)),targetSet);
const ids=new Set();
for(const r of f.integratedAccessoryFixtures){
 assert(!ids.has(r.caseId));ids.add(r.caseId);
 const v=table[r.component]?.[r.variant],factors=sizes[r.size];assert(v&&factors);
 assert.equal(r.sourceArithmetic.credits,v[2]??v[0]*factors[0]);
 assert(Math.abs(r.sourceArithmetic.kg-v[1]*factors[1])<1e-9);
 assert.equal(r.priceCostFactor,factors[0]);
 assert.equal(r.weightAccessoryFactor,factors[1]);
 assert.equal(r.validation,'RULE_EXPECTATION_NOT_EXECUTED');
}
const loco={'Burrower Drive':[200,50],'Gyroscopic Stabilizers':[2,4],'Underwater Drive':[20,10]};
for(const r of f.locomotionFixtures){
 const t=loco[r.component],v=sizes[r.size];assert(t&&v);
 assert.equal(r.expectedKg,t[1]*v[0]);assert.equal(r.expectedCredits,t[0]*v[0]*r.chosenSpeedSquares**2);
 assert.equal(r.errataApplied,false);
}
assert.deepEqual(new Set(f.blockedHostFixtures.map(r=>r.component)),new Set(['Silence-Bubble Generator','Micro Shield']));
assert.equal(f.integratedAccessoryFixtures.find(x=>x.component==='Shield Expansion Module'&&x.variant==='sr5'&&x.size==='small')?.sourceArithmetic.kg,10);
assert.equal(f.integratedAccessoryFixtures.find(x=>x.component==='Courier Compartments'&&x.size==='tiny')?.sourceArithmetic.kg,0.8);
assert.equal(l.counts.totalSourceMechanicalCertified,99);
assert.equal(l.counts.sourceMechanicsOnHold,23);
assert.equal(f.summary.applicationExecuted,0);
assert.equal(f.summary.foundryExecuted,0);
console.log('PASS SGD-HOST-002: 15 original SGD host reviews, 10 accessory errata cases, 3 locomotion exclusions, 2 scope holds; 119 source-value fixtures, 0 runtime tests');

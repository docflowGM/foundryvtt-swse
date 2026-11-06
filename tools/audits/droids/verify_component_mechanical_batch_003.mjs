#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const folder=path.dirname(new URL(import.meta.url).pathname);
const repoData=path.resolve(folder,'../../../data/audits/droids');
const dataFolder=fs.existsSync(path.join(repoData,'component-mechanical-certification-batch-003.json'))?repoData:folder;
const read=f=>JSON.parse(fs.readFileSync(path.join(dataFolder,f),'utf8'));
const a=read('component-mechanical-certification-batch-003.json');
const f=read('component-mechanical-certification-batch-003-fixtures.json');
const delta=read('component-mechanical-certification-ledger-delta-003.json');
const r=a.records;
const first=path.join(dataFolder,'component-mechanical-certification-batch-001.json');
const second=path.join(dataFolder,'component-mechanical-certification-batch-002.json');
const baseline=path.join(dataFolder,'component-122-identity-source-coverage.json');
if(fs.existsSync(first)&&fs.existsSync(second)&&fs.existsSync(baseline)){
 const oldIds=new Set([...JSON.parse(fs.readFileSync(first)).records,...JSON.parse(fs.readFileSync(second)).records].map(x=>x.canonicalId));
 const canonical=new Set(JSON.parse(fs.readFileSync(baseline)).rows.map(x=>x.canonicalId));
 for(const item of r){assert(canonical.has(item.canonicalId));assert(!oldIds.has(item.canonicalId));}
}

assert.equal(r.length,25);
assert.equal(new Set(r.map(x=>x.canonicalId)).size,25);
assert.equal(new Set(r.map(x=>x.canonicalName)).size,25);
assert.equal(r.filter(x=>x.decision==='PASS').length,17);
assert.equal(r.filter(x=>x.decision==='HOLD').length,8);
assert.deepEqual(Object.keys(f.expectedByName).sort(),r.map(x=>x.canonicalName).sort());
for(const x of r){
 assert.equal(x.decision,f.expectedByName[x.canonicalName],`Decision changed: ${x.canonicalName}`);
 assert.equal(x.canonicalId,'droid-'+x.canonicalName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''));
 assert.equal(x.source.pages.length>0,true);
 assert.equal(x.source.pages.every(s=>Number.isInteger(s.printedPage)&&Number.isInteger(s.pdfPage1Based)&&s.pdfPage1Based===s.printedPage+1),true);
 assert.ok(x.published.price);assert.ok(x.published.weight);assert.ok(x.published.host);assert.ok(x.published.prerequisites);
 assert.ok(x.published.installation);assert.ok(x.published.mechanics);assert.ok(x.published.availability!==undefined);
 assert.equal(x.production.definitionCertified,false);assert.equal(x.production.foundryRuntimeCertified,false);
 assert.equal(x.published.weight.kind==='NOT_SPECIFIED'&&x.published.weight.kg!==null,false);
 if(x.decision==='HOLD')assert.ok(x.hold?.reason?.length>15&&x.hold.unresolvedFields?.length>0);
 else assert.equal(x.hold,null);
}
const by=new Map(r.map(x=>[x.canonicalName,x]));
assert.equal(by.get('Spring-Loaded Mechanism').published.price.credits,150);
assert.equal(by.get('Spring-Loaded Mechanism').published.weight.kg,3);
assert.equal(by.get('Locked Access').published.availability,'Licensed');
assert.equal(by.get('Stabilized Mount').published.price.mediumCredits,50);
assert.equal(by.get('Stabilized Mount').published.weight.mediumKg,10);
assert.deepEqual(by.get('Translator Unit').published.variants.map(x=>x.intelligenceDC),[20,15,10,5]);
assert.deepEqual(by.get('Translator Unit').published.variants.map(x=>x.credits),[200,500,1000,2000]);
assert.deepEqual(by.get('Translator Unit').published.variants.map(x=>x.kg),[1,2,4,8]);
assert.deepEqual(by.get('Quick-Release Coupling').published.variants.map(x=>x.kind),['tool','appendage']);
assert.equal(by.get('Remote Limb Control').decision,'HOLD');
assert.equal(by.get('Rocket Arm').decision,'HOLD');
assert.equal(by.get('Personality Downloader').decision,'HOLD');
assert.equal(by.get('Gyroscopic Stabilizers').published.price.expression,'2 * size factor * selected speed squared');
assert.equal(by.get('Tactician Battle Computer').published.availability,'Restricted');
assert.equal(by.get('Tactician Battle Computer').published.mechanics.bonusToNextEligibleRangedAttack,2);
assert.deepEqual(by.get('Laminanium Plating').published.variants.map(x=>x.baseCredits),[3000,20000]);
assert.equal(by.get('Communications Jammer').published.mechanics.local.radiusKm,1);
assert.equal(by.get('Communications Jammer').published.mechanics.local.check,'Use Computer DC25');
assert.equal(a.cumulative.totalCertified,61);
assert.equal(a.cumulative.sourceHoldAfter,14);
assert.equal(a.cumulative.mechanicallyUnreviewed,47);
assert.equal(delta.newCertifiedIds.length,17);
assert.equal(delta.newHeldIds.length,8);
assert.equal(new Set([...delta.newCertifiedIds,...delta.newHeldIds]).size,25);
assert.equal(delta.nextCounts.notEvaluated,47);
assert.equal(a.cumulative.productionCertified,0);
assert.equal(f.checks.executedAppTests,0);
console.log('PASS MECH-003: 25 unique, 17 source PASS, 8 HOLD; cumulative 61/122 certified, 14 HOLD, 47 mechanically unreviewed. Standalone Node validator executed successfully; application/Foundry not executed.');

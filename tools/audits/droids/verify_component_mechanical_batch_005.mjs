#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'../../..');
const get=p=>JSON.parse(fs.readFileSync(path.join(ROOT,p),'utf8'));
const folder='data/audits/droids/';
const data=get(folder+'component-mechanical-certification-batch-005.json');
const fixtures=get(folder+'component-mechanical-certification-batch-005-fixtures.json');
const delta=get(folder+'component-mechanical-certification-ledger-delta-005.json');
const p3=get(folder+'component-mechanical-certification-batch-003.json');
const p4=get(folder+'component-mechanical-certification-batch-004.json');
const coreIds=[...p3.records,...p4.records].map(x=>x.canonicalId);
const r=data.records;
assert.equal(r.length,22);
assert.equal(new Set(r.map(x=>x.canonicalId)).size,22);
assert.equal(new Set([...coreIds,...r.map(x=>x.canonicalId)]).size,72);
assert.equal(r.filter(x=>x.certification.decision==='PASS').length,20);
assert.equal(r.filter(x=>x.certification.decision==='HOLD').length,2);
assert.deepEqual(r.filter(x=>x.certification.decision==='HOLD').map(x=>x.canonicalName),['Taser','Video Screen']);
assert.equal(fixtures.cases.length,22);
assert.equal(delta.newCertifiedIds.length,20);
assert.equal(delta.newHeldIds.length,2);
assert.equal(data.counts.sourcePassedCumulativeIfBatches3And4Applied,99);
assert.equal(data.counts.sourceHeldCumulativeIfBatches3And4Applied,23);
assert.equal(data.counts.sourceUnreviewedAfterBatch,0);
for(let i=0;i<r.length;i++){
 const x=r[i];
 assert.equal(x.canonicalId,'droid-'+x.canonicalName.toLowerCase().replace(/[^a-z0-9]+/g,'-'));
 assert.equal(x.evidence.pages.length>0,true);
 assert(x.evidence.pages.every(s=>Number.isInteger(s.printedPage)&&s.pdfPage1Based===s.printedPage+1));
 for(const v of ['cost','weight','availability','host','prerequisites','mechanics']) assert(x.published[v]!==undefined,'Missing '+v+' for '+x.canonicalName);
 assert.equal(x.certification.sourceMechanicsCertified,x.certification.decision==='PASS');
 assert.equal(x.certification.productionDefinitionCertified,false);
 assert.equal(x.certification.foundryRuntimeCertified,false);
 assert.equal(fixtures.cases[i].canonicalId,x.canonicalId);
 for(const key of ['garage','chargen','follower','store','foundry']) assert.equal(fixtures.cases[i][key],'NOT_EXECUTED');
 if(x.certification.decision==='HOLD') assert(x.certification.holdReason.length>30);
}
const byName=new Map(r.map(x=>[x.canonicalName,x]));
const expected={
 'Multifunction Apparatus':[80,15],
 'Multispectrum Searchlight':[100,2],
 'Radiant Heat Element':[200,20],
 'Remote Viewer':[1000,20],
 'Rental Restraining Bolt':[10,.5],
 'Repulsorcam':[1000,20],
 'Scomp Link':[100,1],
 'Silence-Bubble Generator':[3500,20],
 'Space-Beacon Launcher':[5000,10],
 'Survival Kit':[100,1],
 'Taser':[250,2],
 'Voice-Print Command Lock':[400,1],
 'Weapon Detector':[1500,5],
 'Sensor Booster':[200,5],
 'Sensor Countermeasure Package':[1000,2],
 'YV Sensor Package':[1000,3],
 'Droid Battle Station':[50000,5000],
 'Droid Command Station':[10000,1000],
 'Droid Recharge Station':[4000,500],
 'Droid Socket':[10000,1000]
};
for(const [name,[credits,kg]] of Object.entries(expected)){
 const x=byName.get(name);
 assert(x,name);
 assert.equal(x.published.cost.credits??x.published.cost.baseCredits??x.published.cost.creditsPer100Droids,credits,name+' price');
 assert.equal(x.published.weight.kg??x.published.weight.baseKg,kg,name+' weight');
}
assert.equal(byName.get('Shield Expansion Module').published.cost.baseCreditsPerSR,50);
assert.equal(byName.get('Shield Expansion Module').published.weight.baseKgPerSR,2);
assert.equal(byName.get('Video Screen').published.cost.creditsPerSquareMm,1);
assert.equal(byName.get('Video Screen').published.weight.kgPerSquareMm,.01);
assert.equal(byName.get('Taser').certification.decision,'HOLD');
assert.equal(byName.get('Droid Socket').hostClass,'VEHICLE_OR_STARSHIP_SOCKET');
assert.equal(byName.get('Droid Battle Station').published.mechanics.chooseDroidCommanderTalentsOnInstall,2);
assert.equal(byName.get('Repulsorcam').published.mechanics.separateRechargerCredits,150);
assert.equal(byName.get('Scomp Link').published.mechanics.equipmentBonus,2);
assert.equal(byName.get('Sensor Countermeasure Package').published.mechanics.visualDetectionUnaffected,true);
console.log('PASS MECH-005: 22 unique, 20 source PASS, 2 HOLD; local 5-batch aggregate 99 PASS, 23 HOLD, 122 evaluated. Zero runtime certs.');

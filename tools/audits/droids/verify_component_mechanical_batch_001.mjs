#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const a=load('../../../data/audits/droids/component-mechanical-certification-batch-001.json'),c=load('../../../data/audits/droids/component-mechanical-certification-ledger.json');
const baseline=load('../../../data/audits/droids/component-122-identity-source-coverage.json');
assert.equal(a.records.length,25);assert.equal(new Set(a.records.map(r=>r.canonicalId)).size,25);
const b=new Map(baseline.rows.map(r=>[r.canonicalId,r.canonicalName]));
assert(a.records.every(r=>b.get(r.canonicalId)===r.canonicalName));
assert.equal(a.records.filter(r=>r.group==='BUILT_IN_ARMOR').length,13);
assert.equal(a.records.filter(r=>r.group==='APPENDAGE').length,5);
assert.equal(a.records.filter(r=>r.group==='SENSOR').length,2);
assert.equal(a.records.filter(r=>!['BUILT_IN_ARMOR','APPENDAGE','SENSOR'].includes(r.group)).length,5);
assert.deepEqual(Object.values(a.sourceAuthority.costFactorTable.factors),[20,10,5,2,1,2,5,10,20]);
for(const r of a.records){
 assert(r.sourcePages.length>0&&r.sourcePages.every(s=>Number.isInteger(s.printedPage)&&Number.isInteger(s.pdfPage1Based)&&s.pdfPage1Based===s.printedPage+1));
 assert(r.sourcePages.every(s=>s.verification==='PDF_RENDERED_VISUAL_2026_11_02'));
 assert(r.price&&r.weight&&r.availability!==undefined&&r.host&&r.installation&&r.mechanics);
 assert(Object.values({p:r.certification.printedIdentity,n:r.certification.sourceNumericFacts,h:r.certification.sourcePrerequisitesAndHost,a:r.certification.sourceActionAndResourceRules,e:r.certification.sourceEffectsAndExceptions}).every(Boolean));
 assert.equal(r.certification.sourceMechanicsStatus,'CERTIFIED');
 assert(!r.certification.productionDefinitionsCertified&&!r.certification.appParityCertified&&!r.certification.foundryRuntimeCertified);
}
for(const r of a.records.filter(r=>r.group==='APPENDAGE')){
 assert.equal(Object.keys(r.mechanics.unarmedDamageBySize).length,9);
 assert.equal(r.mechanics.appendageCountDoesNotIncreaseActionsOrAttacks,true);
}
const rarer=a.records.find(r=>r.canonicalName==='Crystadurium Plating');assert.equal(rarer.mechanics.special.subtractPerDamageDie,1);
const inc=a.records.find(r=>r.canonicalName==='Credit Reader');assert.equal(inc.price.credits,50);
assert.equal(c.batches.find(x=>x.id==='MECH-001')?.certifiedPrintedMechanics,25);
assert.equal(c.counts.sourceMechanicallyReviewed,122);
assert.equal(c.counts.foundryRuntimeCertified,0);
const official=load('../../../data/audits/droids/droid-component-official-errata-authority-001.json');
assert.equal(official.corrections.accessoryWeight.accessoryWeightFactorBySize.tiny,0.4);
assert.equal(official.corrections.accessoryWeight.sourceClassConfirmedTargetCount,21);
assert.equal(c.errataAuthority.overlayPath,'data/audits/droids/droid-component-official-errata-authority-001.json');
console.log('PASS MECH001 archival 25 base-book claims; official errata weight corrections are mandatory for current source use');

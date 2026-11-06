#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const p=read('../../../data/audits/droids/component-edit-families-source-facts-c2-001.json');
const q=read('../../../data/audits/droids/component-canonical-migration-backlog.json');
const c=read('../../../data/audits/droids/component-source-facts-sprint-002.json');
const edits=q.rows.filter(x=>x.classification==='EDIT');
assert.equal(edits.length,7);assert.equal(p.records.length,7);
const ids=new Set(), names=new Set(), known=new Map(edits.map(x=>[x.id,x.canonicalPrintedName]));
for(const r of p.records){
 assert.equal(known.get(r.backlogId),r.canonicalPrintedName);
 assert(!ids.has(r.backlogId));assert(!names.has(r.canonicalPrintedName));
 ids.add(r.backlogId);names.add(r.canonicalPrintedName);
 assert(r.identityVerified&&r.sourceFactsPdfVerified);
 assert(!r.completeMechanicalCertified&&!r.productionMigrated&&!r.foundryRuntimeCertified);
 for(const x of r.source)assert.equal(x.pdfPage1Based,x.printedPage+1);
}
const trans=p.records.find(x=>x.canonicalPrintedName==='Translator Unit');
assert.deepEqual(trans.sourceVariants.map(x=>x.languageIdentificationDC),[20,15,10,5]);
assert.deepEqual(trans.sourceVariants.map(x=>x.priceCredits),[200,500,1000,2000]);
const battery=p.records.find(x=>x.canonicalPrintedName==='Secondary Battery');
assert.equal(battery.table.credits,400);assert.equal(battery.table.weightKg,4);
const courier=c.records.find(x=>x.name==='Courier Compartments');
assert.equal(courier.installation.textEnumeratesLocations,4);
assert.deepEqual(courier.installation.placements.map(x=>x.body),['torso','arm','leg','head']);
console.log('PASS: 7 EDIT families source-reviewed; 4 Translator Unit tiers; corrected Courier four mounts; no runtime certification');

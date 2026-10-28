import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root='data/audits/vehicles/';
const suffixes=["a-core-rulebook","b-starships-of-the-galaxy","c-clone-wars","d-knights-of-the-old-republic","e-force-unleashed","f-scum-and-villainy","g-galaxy-at-war","h-galaxy-of-intrigue","i-jedi-academy-training-manual","j-legacy-era-campaign-guide","k-rebellion-era-campaign-guide","l-threats-of-the-galaxy","m-unknown-regions","n-scavengers-guide-to-droids"];
const groups=[["existingStarships","historical"],["existingSpacecraft","historical"],["approvedSupplementalSpacecraft","supplement"],["newVehicleEntries","discovery"],["groundAndAirVehicles","discovery"]];
const rows=readFileSync(root+'swse-universal-phase1-publication-census.ndjson','utf8').trim().split('\n').map(JSON.parse);
const close=JSON.parse(readFileSync(root+'swse-universal-phase1-closeout.json','utf8'));
test('all Phase 1 publication identities are unique and partition correctly',()=>{
 assert.equal(rows.length,429);
 assert.equal(new Set(rows.map(x=>x.sourceEntryKey)).size,429);
 for(const [status,count] of Object.entries({historical:316,supplement:2,discovery:111}))assert.equal(rows.filter(x=>x.publicationStatus===status).length,count);
 assert.equal(close.books.reduce((n,b)=>n+b.claims,0),429);
});
test('manifest matches each ledger without losing source provenance or mobility',()=>{
 const expected=[];
 for(const suffix of suffixes){
  const originLedger=root+'swse-universal-phase1'+suffix+'.json';
  const doc=JSON.parse(readFileSync(originLedger,'utf8'));
  for(const [group,status] of groups)for(const e of doc[group]||[]){
   assert.equal(e.provenance.sourcePdfSha256,doc.sourcePdfSha256);
   expected.push({sourceEntryKey:e.sourceEntryKey,printedName:e.printedName,sourceBook:e.sourceBook,printedStatblockStartPage:e.printedStatblockStartPage,pdfPhysicalPage:e.pdfPhysicalPage,sourcePdfSha256:doc.sourcePdfSha256,printedTypeLine:e.printedTypeLine,normalizedCategory:e.classification.primaryCategory,mobilityDomains:e.classification.mobilityDomains??[e.classification.mobilityDomain],publicationStatus:status,originLedger});
  }
 }
 assert.deepEqual(rows,expected);
 for(const e of rows){assert.ok(e.printedTypeLine&&e.printedName&&e.normalizedCategory);assert.ok(e.mobilityDomains.length);assert.match(e.sourcePdfSha256,/^[a-f0-9]{64}$/);}
});
test('eleven historic printed-type omissions now agree with source evidence',()=>{
 const core=JSON.parse(readFileSync(root+'swse-universal-phase1a-core-rulebook.json','utf8'));
 const ships=readFileSync('data/canonical/vehicles/ships.json','utf8').trim().split('\n').map(JSON.parse).filter(x=>x.sourceBook==='Core Rulebook');
 assert.equal(core.existingStarships.length,10);
 for(const e of core.existingStarships)assert.equal(e.printedTypeLine,ships.find(x=>x.sourceEntryKey===e.sourceEntryKey)?.printedFacts?.printedTypeLine);
 const threat=JSON.parse(readFileSync(root+'swse-universal-phase1l-threats-of-the-galaxy.json','utf8')).existingSpacecraft[0];
 const old=JSON.parse(readFileSync(root+'swse-phase2b-threats-of-the-galaxy-book-source-closure-ledger.json','utf8'));
 assert.equal(threat.printedTypeLine,old.entries.find(x=>x.sourceEntryKey===threat.sourceEntryKey)?.printedFacts?.printedTypeLine);
});

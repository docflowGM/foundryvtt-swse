import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildPhase3AcceptedSourcePreview} from '../tools/build-universal-vehicle-phase3-source-preview.mjs';
const readJSON=p=>JSON.parse(readFileSync('data/audits/vehicles/'+p,'utf8'));
const {records,effectiveCensus,summary}=buildPhase3AcceptedSourcePreview();
test('Phase 3 source gate authorizes source-only SSOT preparation, never pack registration or Actor import',()=>{
 const risk=readJSON('swse-universal-phase3-targeted-exceptions.json');
 assert.equal(risk.globalGate.phase3SourceAcceptance,'ACCEPTED_FOR_PHASE4A_SOURCE_PREPARATION');
 assert.deepEqual(risk.globalGate.unresolvedCriticalProvenance,[]);
 assert.equal(risk.globalGate.phase4CanonicalSsotAuthorized,true);
 assert.equal(risk.globalGate.phase4NativePackRegistrationAuthorized,false);
 assert.equal(risk.globalGate.phase4ActorImportAuthorized,false);
 assert.equal(risk.globalGate.phase4CutoverAuthorized,false);
 assert.equal(risk.phase4CutoverAuthorized,false);
 assert.deepEqual(summary,{
  acceptedFor:'Phase 4A source-only canonical assembly',
  sourceRecords:429,sourceBooks:14,pdfFieldQAVerified:48,namedTargetedRisks:10,
  approvedProvenanceAmendments:1,physicalMountCertificationsPromoted:0,
  productionNativePacksChanged:false,phase4ImportAuthorized:false,phase4CutoverAuthorized:false
 });
});
test('Phase 4A input preview joins exactly 429 distinct publication keys and retains all 48 verified records',()=>{
 assert.equal(records.length,429);assert.equal(effectiveCensus.length,429);
 assert.equal(new Set(records.map(r=>r.identity.sourceEntryKey)).size,429);
 assert.deepEqual(records.map(x=>x.identity.sourceEntryKey).sort(),effectiveCensus.map(x=>x.sourceEntryKey).sort());
 const queue=readJSON('swse-universal-phase3-source-pdf-qa-queue.json');
 assert.deepEqual(queue.pdfFieldQA,{total:48,verified:48,pending:0});
 for(const x of queue.records)assert.ok(records.some(r=>r.identity.sourceEntryKey===x.sourceEntryKey));
});
test('Effective Vulture has exact printed page and header but retains original movement, attacks and zero physical trust',()=>{
 const core=readJSON('swse-universal-phase2a-core-rulebook-staged.json').records.find(x=>x.identity.sourceEntryKey==='core-vulture-class-droid-starfighter');
 const v=records.find(x=>x.identity.sourceEntryKey==='core-vulture-class-droid-starfighter');
 const cv=effectiveCensus.find(x=>x.sourceEntryKey===v.identity.sourceEntryKey);
 assert.equal(core.publication.page,180);
 assert.equal(v.publication.page,181);
 assert.equal(v.publication.printedTitle,'"Vulture" Droid Starfighter');
 assert.equal(v.identity.name,cv.printedName);
 assert.equal(cv.pdfPhysicalPage,182);
 assert.deepEqual(v.combat,core.combat);
 assert.deepEqual(v.armament,core.armament);
 assert.deepEqual(v.movement,core.movement);
 assert.equal(Object.hasOwn(v.armament,'weaponMounts'),false);
});
test('No source preview ever assigns physical mounts or mutates the frozen Phase 1 evidence',()=>{
 for(const row of records){
  assert.equal(Object.hasOwn(row.armament??{},'weaponMounts'),false);
  assert.ok((row.armament?.firingGroups??[]).every(g=>Array.isArray(g.mountKeys)&&g.mountKeys.length===0));
 }
 const raw=readFileSync('data/audits/vehicles/swse-universal-phase1-publication-census.ndjson','utf8').trim().split('\n').map(JSON.parse);
 assert.equal(raw.find(x=>x.sourceEntryKey==='core-vulture-class-droid-starfighter').printedStatblockStartPage,180);
 assert.equal(effectiveCensus.find(x=>x.sourceEntryKey==='core-vulture-class-droid-starfighter').printedStatblockStartPage,181);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root='data/audits/vehicles/';
const j=p=>JSON.parse(readFileSync(root+p,'utf8'));
const risk=j('swse-universal-phase3-targeted-exceptions.json');
const queue=j('swse-universal-phase3-source-pdf-qa-queue.json');
const stages=[
 'a-core-rulebook','b-starships-of-the-galaxy','c-clone-wars','d-kotor','e-force-unleashed','f-scum-and-villainy','g-galaxy-at-war',
 'h-galaxy-of-intrigue','i-jedi-academy-training-manual','j-legacy-era-campaign-guide','k-rebellion-era-campaign-guide',
 'l-threats-of-the-galaxy','m-unknown-regions','n-scavengers-guide-to-droids'
].map(id=>j('swse-universal-phase2'+id+'-staged.json'));
test('Global phase-3 focused QA scope remains 429 distinct source identities and 48/48 primary-PDF new-field checks',()=>{
 const records=stages.flatMap(x=>x.records);
 assert.equal(stages.length,14);
 assert.equal(records.length,429);
 assert.equal(new Set(records.map(x=>x.identity.sourceEntryKey)).size,429);
 assert.deepEqual(queue.pdfFieldQA,{total:48,verified:48,pending:0});
 assert.equal(queue.records.length,48);
 assert.ok(queue.records.every(x=>x.status==='pdf-field-verified'));
});
test('Ten targeted named risks have source-evidence reviewed, without weapon trust promotion',()=>{
 assert.equal(risk.cases.length,10);
 assert.equal(new Set(risk.cases.map(x=>x.id)).size,10);
 assert.deepEqual(risk.remainingTargetedCandidates,[]);
 for(const row of risk.cases){
  assert.ok(row.sourceEntryKey);
  assert.ok(row.sourcePdfSha256);
  assert.ok(row.sourceEvidence);
  assert.equal(row.allowExecutableAttacks,false);
  assert.equal(row.requiresRuntimeConsumer,true);
 }
 assert.equal(risk.strictPhysicalMountCertificationPromoted,0);
});
test('Core Vulture provenance mismatch blocks Phase 3 global acceptance and all Phase 4 cutover permissions',()=>{
 const r=risk.cases.find(x=>x.id==='P3R-CORE-SOTG-VULTURE');
 assert.equal(r.sourceFieldQAAccepted,false);
 assert.equal(r.printedFacts.coreFrozenCensusPrintedPage,180);
 assert.equal(r.printedFacts.coreStatblockPrintedPage,181);
 assert.equal(r.provenanceAmendmentRecommended.keepSourceEntryKey,'core-vulture-class-droid-starfighter');
 assert.deepEqual(risk.globalGate.unresolvedCriticalProvenance,['P3R-CORE-SOTG-VULTURE']);
 assert.equal(risk.globalGate.phase3SourceAcceptance,'HOLD');
 assert.equal(risk.globalGate.phase4CanonicalSsotAuthorized,false);
 assert.equal(risk.globalGate.mechanicalWeaponMountPromotionAuthorized,false);
 assert.equal(risk.globalGate.migrationRuntimeAuthorized,false);
 assert.equal(risk.phase4CutoverAuthorized,false);
});
test('Targeted source QA did not itself change production actors or activate source weapon mounts',()=>{
 for(const stage of stages){
  assert.equal(stage.productionPacksChanged,false);
  assert.equal(stage.generatedActorsChanged,false);
  for(const r of stage.records){
   if(!r.armament||!r.armament.firingGroups)continue;
   assert.equal(Object.hasOwn(r.armament,'weaponMounts'),false);
   assert.ok(r.armament.firingGroups.every(g=>Array.isArray(g.mountKeys)&&g.mountKeys.length===0));
  }
 }
});
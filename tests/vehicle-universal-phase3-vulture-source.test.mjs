import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync('data/audits/vehicles/'+p,'utf8'));
const core=read('swse-universal-phase2a-core-rulebook-staged.json');
const sotg=read('swse-universal-phase2b-starships-of-the-galaxy-staged.json');
const risk=read('swse-universal-phase3-targeted-exceptions.json');
const census=readFileSync('data/audits/vehicles/swse-universal-phase1-publication-census.ndjson','utf8').trim().split('\n').map(JSON.parse);
const coreKey='core-vulture-class-droid-starfighter',sotgKey='sotg-baktoid-armor-workshop-vulture-class-starfighter';
const ca=core.records.find(r=>r.identity.sourceEntryKey===coreKey);
const sb=sotg.records.find(r=>r.identity.sourceEntryKey===sotgKey);
const row=risk.cases.find(r=>r.id==='P3R-CORE-SOTG-VULTURE');
test('Vulture has two publication claims in separate books; flight/walker modes do not multiply identities',()=>{
 assert.ok(ca);assert.ok(sb);assert.ok(row);
 assert.equal(core.records.length,17);assert.equal(sotg.records.length,105);
 assert.equal(ca.challenge.cl,7);assert.equal(sb.challenge.cl,7);
 assert.equal(ca.publication.printedTypeLine,'Huge starfighter/ground vehicle (walker)');
 assert.equal(sb.publication.printedTypeLine,'Huge starfighter/ground vehicle (walker)');
 for(const rec of [ca,sb]){
  assert.equal(rec.movement.speedModes.find(x=>x.mode==='walking').squaresPerMove,6);
  assert.equal(rec.movement.speedModes.find(x=>x.scale==='starship').squaresPerMove,4);
  assert.equal(rec.movement.speedModes.find(x=>x.scale==='character'&&x.mode!=='walking').squaresPerMove,16);
  assert.equal(rec.armament.firingGroups.length,2);
  assert.equal(Object.hasOwn(rec.armament,'weaponMounts'),false);
  assert.ok(rec.armament.firingGroups.every(x=>x.mountKeys.length===0));
 }
 assert.equal(sb.geometry.characterScaleWidthSquares,3);
 assert.equal(sb.geometry.characterScaleLengthSquares,3);
 assert.equal(sb.geometry.starshipScaleWidthSquares,1);
});
test('Frozen Core page and title discrepancy remains visible while approved effective provenance is source-accepted',()=>{
 const a=census.find(x=>x.sourceEntryKey===coreKey),b=census.find(x=>x.sourceEntryKey===sotgKey);
 assert.ok(a);assert.ok(b);
 assert.equal(a.printedStatblockStartPage,180);
 assert.equal(a.pdfPhysicalPage,181);
 assert.equal(a.printedName,'Vulture-class Droid Starfighter');
 assert.equal(ca.publication.page,180);
 assert.equal(row.printedFacts.coreStatblockPrintedPage,181);
 assert.equal(row.printedFacts.corePdfPhysicalPage,182);
 assert.equal(row.provenanceAmendmentRecommended.correctPrintedPage,181);
 assert.equal(row.provenanceAmendmentRecommended.keepSourceEntryKey,coreKey);
 assert.equal(row.sourceFieldQAAccepted,true);
 assert.equal(row.phase3GlobalProvenanceGate,'resolved-by-approved-additive-amendment');
 assert.equal(b.printedStatblockStartPage,78);
 assert.equal(sb.publication.page,78);
});
test('neither publication enables stock weapon attacks or silently authorizes V2 actor migration',()=>{
 assert.equal(row.allowExecutableAttacks,false);
 assert.equal(risk.phase4CutoverAuthorized,false);
 assert.equal(ca.fieldStates['rules.strictMechanicalCertification'],'not-yet-reviewed');
 assert.equal(sb.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
 assert.equal(sotg.productionPacksChanged,false);assert.equal(sotg.generatedActorsChanged,false);
});

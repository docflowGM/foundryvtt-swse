import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='data/audits/vehicles/';
const json=p=>JSON.parse(readFileSync(p,'utf8'));
const stage=json(root+'swse-universal-phase2h-galaxy-of-intrigue-staged.json');
const phase1=json(root+'swse-universal-phase1h-galaxy-of-intrigue.json');
const queue=json(root+'swse-universal-phase3-source-pdf-qa-queue.json');
const byId=id=>stage.records.find(r=>r.identity.sourceEntryKey===id);
const corona=byId('goi-corona-limited-luxury-groundspeeder');
const jg8=byId('goi-sorosuub-jg-8-luxury-landspeeder');
const pdfSha='c43531ac33c6e6bd84c18ff8e26a472dc8ef95ebb46948beb3beb29be384da21';

test('Phase 3H preserves 8 source identities, six historical ships, and primary-PDF provenance',()=>{
 assert.equal(stage.records.length,8);
 assert.equal(phase1.newVehicleEntries.length,2);
 assert.equal(phase1.existingSpacecraft.length,6);
 assert.deepEqual(stage.records.map(x=>x.identity.sourceEntryKey).sort(),[...phase1.existingSpacecraft,...phase1.newVehicleEntries].map(x=>x.sourceEntryKey).sort());
 assert.equal(stage.sourcePdfSha256,pdfSha);
 assert.equal(phase1.sourcePdfSha256,pdfSha);
 assert.equal(stage.productionPacksChanged,false);
 assert.equal(stage.generatedActorsChanged,false);
 assert.equal(stage.summary.groups,stage.records.reduce((n,r)=>n+r.armament.firingGroups.length,0));
 assert.deepEqual(stage.summary.missingHP,[]);
 assert.deepEqual(stage.summary.missingRef,[]);
});
test('Corona direct PDF p72 comparison excludes Sabaoth Frigate statblock contamination',()=>{
 assert.ok(corona);
 assert.deepEqual([corona.challenge.cl,corona.publication.page,corona.classification.size],[4,71,'huge']);
 assert.deepEqual([corona.geometry.characterScaleWidthSquares,corona.geometry.characterScaleLengthSquares,corona.geometry.coverCrew],[3,3,'total']);
 assert.deepEqual([corona.movement.speedModes[0].scale,corona.movement.speedModes[0].squaresPerMove,corona.movement.maxVelocityKmh],['character',12,300]);
 assert.equal(corona.movement.speedModes[0].raw,'Speed 12 squares (max. velocity 300 km/h)');
 assert.deepEqual([corona.defenses.reflex,corona.defenses.reflexFlatFooted,corona.defenses.fortitude,corona.defenses.armorBonus,corona.defenses.damageReduction],[14,11,24,3,5]);
 assert.deepEqual([corona.durability.hitPoints,corona.durability.damageThreshold],[90,34]);
 assert.deepEqual([corona.abilities.initiativePrinted,corona.abilities.perceptionPrinted,corona.abilities.str,corona.abilities.dex,corona.abilities.int,corona.abilities.con],[7,6,38,16,14,null]);
 assert.deepEqual(corona.abilities.skills.map(x=>[x.name,x.printedModifier]),[['Initiative',7],['Mechanics',6],['Perception',6],['Pilot',7],['Use Computer',6]]);
 assert.deepEqual([corona.combat.baseAttackBonusPrinted,corona.combat.grappleBonusPrinted],[2,26]);
 assert.deepEqual([corona.crew.crewCount,corona.capacity.passengerCount,corona.capacity.cargo.value,corona.capacity.cargo.unit,corona.capacity.consumables.value],[1,6,300,'kg',2]);
 assert.deepEqual([corona.economics.availability,corona.economics.priceNew.amountCredits,corona.economics.priceUsed.amountCredits],['Licensed',70000,20000]);
 assert.deepEqual(corona.hyperspace,{});
 assert.deepEqual(corona.armament.firingGroups,[]);
 assert.equal(corona.fieldStates['/armament/weaponMounts'],'not-stated');
 assert.equal(corona.fieldStates['/hyperspace/capability'],'not-stated');
});
test('JG-8 direct PDF p72 source QA and no invented weapon authorization',()=>{
 assert.ok(jg8);
 assert.deepEqual([jg8.challenge.cl,jg8.publication.page,jg8.classification.size],[2,71,'large']);
 assert.deepEqual([jg8.geometry.characterScaleWidthSquares,jg8.geometry.coverCrew],[2,'+5']);
 assert.deepEqual([jg8.movement.speedModes[0].mode,jg8.movement.speedModes[0].scale,jg8.movement.maxVelocityKmh],['flying','character',450]);
 assert.deepEqual([jg8.defenses.reflex,jg8.defenses.fortitude,jg8.defenses.damageReduction,jg8.durability.hitPoints,jg8.durability.damageThreshold],[14,15,5,55,20]);
 assert.deepEqual([jg8.abilities.initiativePrinted,jg8.abilities.perceptionPrinted,jg8.abilities.str,jg8.abilities.dex,jg8.abilities.int],[8,6,21,16,14]);
 assert.deepEqual(jg8.abilities.skills.map(x=>x.printedModifier),[8,6,6,8,6]);
 assert.deepEqual([jg8.crew.crewCount,jg8.capacity.passengerCount,jg8.capacity.cargo.value,jg8.capacity.consumables.value],[1,1,50,1]);
 assert.deepEqual([jg8.economics.priceNew.amountCredits,jg8.economics.priceUsed.amountCredits],[45000,12500]);
 assert.deepEqual(jg8.armament.firingGroups,[]);
});
test('48-entry queue closes only two new PDF field checks, preserving all strict mechanical gates',()=>{
 const books=[['h','galaxy-of-intrigue'],['i','jedi-academy-training-manual'],['j','legacy-era-campaign-guide'],['k','rebellion-era-campaign-guide'],['l','threats-of-the-galaxy'],['m','unknown-regions'],['n','scavengers-guide-to-droids']];
 const expected=books.flatMap(([letter,slug])=>json(root+'swse-universal-phase1'+letter+'-'+slug+'.json').newVehicleEntries.map(r=>r.sourceEntryKey));
 assert.equal(queue.records.length,48);
 assert.deepEqual(queue.records.map(r=>r.sourceEntryKey).sort(),expected.sort());
 assert.equal(queue.pdfFieldQA.total,48); assert.equal(queue.pdfFieldQA.verified+queue.pdfFieldQA.pending,48); assert.ok(queue.pdfFieldQA.verified>=2);
 const verified=queue.records.filter(r=>r.status==='pdf-field-verified'&&r.sourceBook==='Galaxy of Intrigue');
 assert.deepEqual(verified.map(x=>x.sourceEntryKey).sort(),[corona.identity.sourceEntryKey,jg8.identity.sourceEntryKey].sort());
 for(const rec of verified){assert.equal(rec.sourcePdfSha256,pdfSha);assert.equal(rec.pdfPhysicalPage,72);assert.equal(rec.strictMechanicalCertification,'not-certified')}
 for(const rec of [corona,jg8]){
  assert.equal(rec.rules.reviewStatus,'partial-source-probe');
  assert.equal(rec.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  assert.equal(Object.hasOwn(rec.armament,'weaponMounts'),false);
 }
});

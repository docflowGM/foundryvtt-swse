import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root='data/audits/vehicles/';
const json=p=>JSON.parse(readFileSync(root+p,'utf8'));
const stage=json('swse-universal-phase2f-scum-and-villainy-staged.json');
const ledger=json('swse-universal-phase1f-scum-and-villainy.json');
const overlay=json('swse-phase2c-cp3-318-census-overlay.json');
const reviewed=json('swse-universal-phase3-targeted-exceptions.json');
const byKey=k=>stage.records.find(x=>x.identity.sourceEntryKey===k);
const riskById=id=>reviewed.cases.find(x=>x.id===id);
const star=byKey('sav-starforge-station'),hornet=byKey('sav-tenloss-corporation-hornet-class-interceptor');
const pdfSha='74f222e9b10c17b6c8dae13fe4c97edb49d6d3c1fc278c3653ad72050db41399';

test('Scum and Villainy risk check remains within 13 established publication claims, including one prior supplemental Hornet',()=>{
 assert.equal(stage.records.length,13);
 assert.equal(ledger.existingSpacecraft.length,11);
 assert.equal(ledger.newVehicleEntries.length,1);
 assert.equal(ledger.approvedSupplementalSpacecraft.length,1);
 assert.equal(stage.sourcePdfSha256,pdfSha);
 assert.equal(ledger.sourcePdfSha256,pdfSha);
 assert.equal(new Set(stage.records.map(x=>x.identity.sourceEntryKey)).size,13);
 assert.equal(overlay.supplementalEntries.filter(e=>e.sourceEntryKey===hornet.identity.sourceEntryKey).length,1);
 assert.equal(reviewed.phase4CutoverAuthorized,false);
 assert.equal(reviewed.strictPhysicalMountCertificationPromoted,0);
});
test('StarForge original PDF contradiction and smaller-target modifier are preserved without resolution by default',()=>{
 assert.equal(star.challenge.cl,20);
 assert.equal(star.publication.page,130);
 assert.equal(star.publication.printedTypeLine,'Colossal (station) space station');
 assert.equal(star.abilities.initiativePrinted,-4);
 assert.equal(star.abilities.skills.find(x=>x.name==='Initiative').printedModifier,-5);
 assert.equal(star.abilities.perceptionPrinted,6);
 assert.equal(star.abilities.skills.find(x=>x.name==='Perception').printedModifier,5);
 assert.equal(star.armament.firingGroups.length,1);
 assert.equal(star.armament.firingGroups[0].attackBonusPrinted,12);
 assert.equal(star.armament.firingGroups[0].groupKind,'weapon-battery');
 assert.equal(star.armament.firingGroups[0].batteryMembershipStatus,'printed');
 assert.match(star.armament.firingGroups[0].specialNotes,/-20 against smaller-than-Colossal/);
 assert.match(star.exceptions.ambiguities.join(' '),/both printed values preserved/);
 const row=riskById('P3R-SAV-STARFORGE');
 assert.equal(row.sourcePdfSha256,pdfSha);
 assert.equal(row.sourceReconciliation,'verified-preserve-contradictions');
 assert.equal(row.printedFacts.sourceAttackGroupCount,1);
 assert.equal(row.printedFacts.declaredBatteries,5);
 assert.equal(row.allowExecutableAttacks,false);
});
test('Hornet alternates are exclusive published loadouts and overload belongs only to the default',()=>{
 const overlayHornet=overlay.supplementalEntries.find(x=>x.sourceEntryKey===hornet.identity.sourceEntryKey);
 assert.ok(overlayHornet);
 assert.equal(hornet.publication.page,125);
 assert.equal(hornet.challenge.cl,12);
 assert.equal(hornet.armament.firingGroups.length,2);
 assert.deepEqual(hornet.armament.firingGroups.map(x=>x.attackBonusPrinted),[6,6]);
 assert.deepEqual(overlayHornet.configurationVariants.map(x=>x.configurationKey),['default','alternate']);
 assert.equal(overlayHornet.configurationVariants[0].onNaturalOne.damageToOwnShip,'6d10x2');
 assert.equal(overlayHornet.configurationVariants[0].onNaturalOne.ignoresShieldRating,true);
 assert.equal(overlayHornet.configurationVariants[0].onNaturalOne.destroysCannons,true);
 assert.equal(overlayHornet.configurationVariants[1].onNaturalOne,null);
 assert.equal(hornet.hyperspace.capability,undefined);
 assert.equal(hornet.fieldStates['/hyperspace/capability'],'not-stated');
 const row=riskById('P3R-SAV-HORNET');
 assert.equal(row.sourcePdfSha256,pdfSha);
 assert.equal(row.sourceFieldQAAccepted,true);
 assert.equal(row.allowExecutableAttacks,false);
});
test('both reviewed exceptions retain fail-closed physical mount and runtime boundaries',()=>{
 for(const item of [star,hornet]){
  assert.equal(item.rules.reviewStatus,'partial-source-probe');
  assert.equal(item.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  assert.equal(Object.hasOwn(item.armament,'weaponMounts'),false);
  assert.ok(item.armament.firingGroups.every(g=>Array.isArray(g.mountKeys)&&g.mountKeys.length===0));
 }
 assert.ok(reviewed.cases.every(c=>c.requiresRuntimeConsumer&&c.allowExecutableAttacks===false));
 assert.equal(stage.productionPacksChanged,false);
 assert.equal(stage.generatedActorsChanged,false);
});

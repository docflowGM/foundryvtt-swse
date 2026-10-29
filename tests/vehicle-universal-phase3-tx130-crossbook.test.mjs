import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root='data/audits/vehicles/';
const j=p=>JSON.parse(readFileSync(root+p,'utf8'));
const f=j('swse-universal-phase2e-force-unleashed-staged.json');
const c=j('swse-universal-phase2c-clone-wars-staged.json');
const risk=j('swse-universal-phase3-targeted-exceptions.json');
const force=f.records.find(x=>x.identity.sourceEntryKey==='fucg-tx-130t-fighter-tank');
const clone=c.records.find(x=>x.identity.sourceEntryKey==='cw-tx-130t-saber-class-fighter-tank');
const entry=risk.cases.find(x=>x.id==='P3R-FU-TX130-CROSSBOOK');
test('TX-130 source publications remain two separate claims across original books',()=>{
 assert.ok(force);assert.ok(clone);assert.ok(entry);
 assert.notEqual(force.identity.sourceEntryKey,clone.identity.sourceEntryKey);
 assert.equal(f.records.length,34);assert.equal(c.records.length,67);
 assert.equal(force.publication.book,'Force Unleashed Campaign Guide');
 assert.equal(force.publication.page,203);
 assert.equal(clone.publication.book,'Clone Wars Campaign Guide');
 assert.equal(clone.publication.page,169);
 assert.equal(force.challenge.cl,8);assert.equal(clone.challenge.cl,7);
 assert.equal(force.movement.maxVelocityKmh,193);assert.equal(clone.movement.maxVelocityKmh,200);
 assert.deepEqual([force.crew.crewCount,clone.crew.crewCount],[2,3]);
 assert.deepEqual([force.capacity.passengerCount,clone.capacity.passengerCount],[5,2]);
 assert.deepEqual([force.capacity.cargo.value,clone.capacity.cargo.value],[100,750]);
 assert.deepEqual([force.armament.carriedPayloads[0].value,clone.armament.carriedPayloads[0].value],[8,16]);
 assert.equal(entry.sourcePdfSha256,'0ef4b47b2bf55091c13c1960e4ea367675cb7d84a776f0b9f6dc8fc27c57840c');
});
test('Force Unleashed separately preserves +1 Ranged summary and +2 detailed weapon rows',()=>{
 assert.match(force.combat.rangedAttackLine,/laser cannons \+1 AND medium concussion missiles \+1/);
 assert.deepEqual(force.armament.firingGroups.map(x=>x.attackBonusPrinted),[2,2]);
 assert.match(force.exceptions.specialRules[0].summary,/preserve both/);
 assert.equal(force.armament.firingGroups.length,2);
 assert.equal(clone.armament.firingGroups.length,4);
 assert.match(clone.combat.rangedAttackLine,/OR Ranged laser cannons \+1/);
 assert.match(clone.combat.rangedAttackLine,/composite beam cannon \+1/);
 assert.equal(entry.sourceReconciliation,'verified-independent-cross-book-publication-claims');
});
test('Both TX-130T source claims are not executable or globally deduplicated',()=>{
 for(const v of [force,clone]){
  assert.equal(v.rules.reviewStatus,'partial-source-probe');
  assert.equal(v.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  assert.equal(Object.hasOwn(v.armament,'weaponMounts'),false);
  assert.ok(v.armament.firingGroups.every(g=>Array.isArray(g.mountKeys)&&g.mountKeys.length===0));
 }
 assert.equal(entry.allowExecutableAttacks,false);
 assert.equal(risk.phase4CutoverAuthorized,false);
 assert.equal(f.productionPacksChanged,false);
 assert.equal(c.productionPacksChanged,false);
});
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const j=p=>JSON.parse(readFileSync('data/audits/vehicles/'+p,'utf8'));
const s=j('swse-universal-phase2l-threats-of-the-galaxy-staged.json');
const l=j('swse-universal-phase1l-threats-of-the-galaxy.json');
const q=j('swse-universal-phase3-source-pdf-qa-queue.json');
const g=id=>s.records.find(x=>x.identity.sourceEntryKey==='tog-'+id);
test('four Threats of the Galaxy source-field claims visually verified against original PDF with no new ship identity',()=>{
 assert.equal(s.records.length,5);assert.equal(l.newVehicleEntries.length,4);assert.equal(l.existingSpacecraft.length,1);
 assert.deepEqual(s.records.map(x=>x.identity.sourceEntryKey).sort(),[...l.existingSpacecraft,...l.newVehicleEntries].map(x=>x.sourceEntryKey).sort());
 assert.equal(s.sourcePdfSha256,'63e62aa5acca70469b22a957c4e72a0a099d57fa99f7023a915ed5f584d1d62f');
 assert.equal(q.pdfFieldQA.total,48);assert.ok(q.pdfFieldQA.verified>=47);assert.equal(q.pdfFieldQA.verified+q.pdfFieldQA.pending,48);
 assert.equal(s.summary.groups,s.records.reduce((n,r)=>n+r.armament.firingGroups.length,0));
});
test('Hounds Tooth, Bloodfin and Raptor field-level PDF details preserved',()=>{
 const h=g('hounds-tooth');
 assert.equal(h.armament.firingGroups[2].label,'Ion cannon');
 assert.equal(h.armament.carriedPayloads[0].value,6);
 assert.equal(h.capacity.carriedCraft[0].count,1);
 assert.equal(h.economics.priceNew.status,'not-for-sale');
 const b=g('bloodfin-razalon-fc-20-speeder-bike');
 assert.equal(b.defenses.shieldRating,0);assert.equal(b.economics.priceUsed.amountCredits,1000);assert.equal(b.capacity.consumables,null);
 const r=g('modified-r-2000-raptor-speeder-bike');
 assert.equal(r.armament.firingGroups.length,1);assert.equal(r.armament.firingGroups[0].attackBonusPrinted,8);
 assert.equal(r.economics.priceUsed.amountCredits,7000);
});
test('Nebulon-Q incomplete stage restored without inventing combat capability',()=>{
 const x=g('nebulon-q-swoop');
 assert.deepEqual([x.challenge.cl,x.movement.speedModes[0].squaresPerMove,x.movement.maxVelocityKmh,x.combat.baseAttackBonusPrinted,x.combat.grappleBonusPrinted],[2,12,600,3,16]);
 assert.deepEqual([x.abilities.str,x.abilities.dex,x.abilities.int,x.abilities.skills.length],[16,24,16,5]);
 assert.deepEqual([x.crew.crewCount,x.capacity.cargo.value,x.economics.priceNew.amountCredits,x.economics.priceUsed.amountCredits],[1,2,5500,1050]);
 assert.equal(x.armament.firingGroups.length,0);
});
test('all four PDF claims still fail-closed for physical mounts, arcs, operator runtime',()=>{
 for(const e of l.newVehicleEntries){
  const x=s.records.find(r=>r.identity.sourceEntryKey===e.sourceEntryKey),v=q.records.find(r=>r.sourceEntryKey===e.sourceEntryKey);
  assert.equal(v.status,'pdf-field-verified');
  assert.equal(v.strictMechanicalCertification,'not-certified');
  assert.equal(x.rules.reviewStatus,'partial-source-probe');
  assert.equal(x.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  assert.ok(!Object.hasOwn(x.armament,'weaponMounts'));assert.ok(x.armament.firingGroups.every(a=>a.mountKeys?.length===0));
 }
});
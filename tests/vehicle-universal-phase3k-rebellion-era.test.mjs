import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const j=p=>JSON.parse(readFileSync('data/audits/vehicles/'+p,'utf8'));
const s=j('swse-universal-phase2k-rebellion-era-campaign-guide-staged.json');
const l=j('swse-universal-phase1k-rebellion-era-campaign-guide.json');
const q=j('swse-universal-phase3-source-pdf-qa-queue.json');
const get=id=>{let x=s.records.find(r=>r.identity.sourceEntryKey==='re-'+id);assert.ok(x,id);return x;};
test('Rebellion original PDF source page field QA does not mutate publication keys or inherited ships',()=>{
 assert.equal(s.records.length,53);assert.equal(l.existingSpacecraft.length,35);assert.equal(l.newVehicleEntries.length,18);
 assert.deepEqual(s.records.map(r=>r.identity.sourceEntryKey).sort(),[...l.existingSpacecraft,...l.newVehicleEntries].map(r=>r.sourceEntryKey).sort());
 assert.equal(s.sourcePdfSha256,'60248fe2cb17e40c3245b28e99722ac858b2762cb21560170058ceeb30d8fee8');
 assert.equal(s.summary.groups,s.records.reduce((a,r)=>a+r.armament.firingGroups.length,0));
 assert.equal(q.pdfFieldQA.total,48);assert.ok(q.pdfFieldQA.verified>=43);assert.equal(q.pdfFieldQA.verified+q.pdfFieldQA.pending,48);
});
test('Rebellion source columns and numeric mechanical fields repaired',()=>{
 assert.equal(get('storm-iv-twin-pod-cloud-car').armament.firingGroups.length,1);
 assert.equal(get('talon-i-combat-cloud-car').crew.crewCount,1);
 assert.deepEqual([get('9000-z004-landspeeder').movement.speedModes[0].squaresPerMove,get('9000-z004-landspeeder').capacity.cargo.value],[12,30]);
 assert.equal(get('mptl-2a-mobile-proton-torpedo-launcher').armament.carriedPayloads[0].value,30);
 assert.deepEqual([get('gallofree-htt-26-heavy-troop-transport').movement.speedModes[0].squaresPerMove,get('gallofree-htt-26-heavy-troop-transport').combat.grappleBonusPrinted],[6,30]);
 assert.deepEqual([get('ultra-light-assault-vehicle-ulav').abilities.str,get('ultra-light-assault-vehicle-ulav').abilities.dex,get('ultra-light-assault-vehicle-ulav').capacity.passengerCount,get('ultra-light-assault-vehicle-ulav').armament.firingGroups.length],[34,22,0,3]);
 assert.equal(get('t2-b-repulsor-tank').armament.firingGroups.length,1);
 assert.equal(get('t4-b-heavy-tank').movement.maxVelocityKmh,40);
 assert.deepEqual([get('at-aa-anti-aircraft-platform').abilities.initiativePrinted,get('at-aa-anti-aircraft-platform').movement.maxVelocityKmh,get('at-aa-anti-aircraft-platform').crew.crewCount,get('at-aa-anti-aircraft-platform').armament.firingGroups.length],[-5,60,3,2]);
 assert.equal(Object.hasOwn(get('at-aa-anti-aircraft-platform').defenses,'shieldRating'),false);
 assert.equal(get('at-pt-all-terrain-personal-transport').armament.firingGroups.length,2);
 assert.equal(get('at-pt-all-terrain-personal-transport').capacity.cargo.unit,'kg');
 assert.equal(get('lancet-aerial-artillery').armament.firingGroups.length,2);
 assert.deepEqual([get('canderous-class-assault-tank').movement.maxVelocityKmh,get('f9-tz-transport').abilities.str],[50,38]);
});
test('18 original PDF field certifications remain fail-closed with 35 existing ship source records untouched',()=>{
 for(const e of l.newVehicleEntries){
  const r=s.records.find(x=>x.identity.sourceEntryKey===e.sourceEntryKey);
  const proof=q.records.find(x=>x.sourceEntryKey===e.sourceEntryKey);
  assert.equal(proof.status,'pdf-field-verified');assert.equal(proof.strictMechanicalCertification,'not-certified');
  assert.equal(r.rules.reviewStatus,'partial-source-probe');assert.equal(r.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  assert.equal(Object.hasOwn(r.armament,'weaponMounts'),false);
  assert.ok(r.armament.firingGroups.every(x=>Array.isArray(x.mountKeys)&&x.mountKeys.length===0));
 }
});
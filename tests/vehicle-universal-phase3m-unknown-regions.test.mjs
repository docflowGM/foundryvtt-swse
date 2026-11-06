import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const j=p=>JSON.parse(readFileSync('data/audits/vehicles/'+p,'utf8'));
const s=j('swse-universal-phase2m-unknown-regions-staged.json');
const l=j('swse-universal-phase1m-unknown-regions.json');
const q=j('swse-universal-phase3-source-pdf-qa-queue.json');
const g=id=>{const x=s.records.find(x=>x.identity.sourceEntryKey==='ur-'+id);assert.ok(x,id);return x;};
test('Unknown Regions 13 PDF source QA claims preserve all 26 publication identities',()=>{
 assert.equal(s.records.length,26);
 assert.equal(l.existingSpacecraft.length,12);
 assert.equal(l.newVehicleEntries.length,13);
 assert.equal((l.approvedSupplementalSpacecraft||[]).length,1);
 assert.deepEqual(s.records.map(x=>x.identity.sourceEntryKey).sort(),[...l.existingSpacecraft,...l.approvedSupplementalSpacecraft,...l.newVehicleEntries].map(x=>x.sourceEntryKey).sort());
 assert.equal(s.sourcePdfSha256,'43a69aa7974ed4aeb52b57ba28b3466c2ed9f54bd73fe5d5295b744bfe1bd55b');
 assert.equal(q.pdfFieldQA.total,48);assert.equal(q.pdfFieldQA.verified+q.pdfFieldQA.pending,48);assert.ok(q.pdfFieldQA.verified>=25);
 assert.equal(s.summary.groups,s.records.reduce((a,r)=>a+r.armament.firingGroups.length,0));
});
test('original PDF ground vehicle two-column separation',()=>{
 assert.equal(g('gallis-tech-48-roller-wheel-bike').armament.firingGroups.length,0);
 assert.equal(g('tangan-industries-aerosled-mark-iii').armament.firingGroups.length,1);
 assert.equal(g('all-terrain-roller').armament.firingGroups.length,0);
 assert.equal(g('all-terrain-roller').geometry.characterScaleWidthSquares,1);
 assert.equal(g('compact-assault-vehicle-wheeled-px-10').economics.priceNew.status,'not-for-sale');
 assert.match(g('compact-assault-vehicle-wheeled-px-10').economics.notes,/black.market/i);
 assert.equal(g('land-crawler').movement.speedModes[0].squaresPerMove,6);
 assert.equal(g('land-crawler').movement.maxVelocityKmh,95);
 assert.equal(g('land-crawler').capacity.cargo.value,5);
 assert.equal(g('land-crawler').armament.firingGroups.length,0);
 assert.equal(g('jaffryes-universal-automotive-ark-ii-series-landmaster').armament.firingGroups.length,1);
 assert.equal(g('hyrotii-corporation-mobile-recon-research-vehicle').armament.firingGroups.length,1);
 assert.equal(g('hyrotii-corporation-mobile-recon-research-vehicle').capacity.carriedCraft[0].count,2);
 assert.equal(g('srv-1-scout-and-retrieval-vehicle').armament.firingGroups.length,1);
 assert.equal(g('srv-1-scout-and-retrieval-vehicle').armament.firingGroups[0].label,'Medium blaster cannon');
});
test('Landing Sphere not contaminated by Star Seeder frigate weapons/shields/hyperdrive',()=>{
 const x=g('landing-sphere');assert.equal(x.challenge.cl,2);assert.equal(x.publication.page,58);
 assert.equal(x.defenses.reflex,12);assert.equal(x.durability.hitPoints,100);
 assert.equal(Object.hasOwn(x.defenses,'shieldRating'),false);
 assert.deepEqual(x.hyperspace,{});
 assert.deepEqual(x.armament.firingGroups,[]);
 assert.deepEqual(x.economics,{});
 assert.equal(x.crew.crewCount,1);
 assert.equal(x.capacity.passengerCount,7);
 assert.equal(x.fieldStates['/defenses/shieldRating'],'not-stated');
});
test('13 new book source claims all visually PDF reviewed but remain non-executable',()=>{
 for(const e of l.newVehicleEntries){
  const x=s.records.find(r=>r.identity.sourceEntryKey===e.sourceEntryKey);
  const proof=q.records.find(r=>r.sourceEntryKey===e.sourceEntryKey);
  assert.equal(proof.status,'pdf-field-verified');
  assert.equal(proof.strictMechanicalCertification,'not-certified');
  assert.equal(x.rules.reviewStatus,'partial-source-probe');
  assert.equal(x.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
  assert.ok(!Object.hasOwn(x.armament,'weaponMounts'));
  assert.ok(x.armament.firingGroups.every(f=>f.mountKeys?.length===0));
 }
});

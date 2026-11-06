import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync('data/audits/vehicles/'+p,'utf8'));
const s=load('swse-universal-phase2j-legacy-era-campaign-guide-staged.json');
const l=load('swse-universal-phase1j-legacy-era-campaign-guide.json');
const q=load('swse-universal-phase3-source-pdf-qa-queue.json');
const x=id=>s.records.find(v=>v.identity.sourceEntryKey==='le-'+id);
test('Legacy Era PDF fields and publication claims',()=>{
 assert.equal(s.records.length,49);assert.equal(l.newVehicleEntries.length,10);
 assert.deepEqual(s.records.map(r=>r.identity.sourceEntryKey).sort(),[...l.existingSpacecraft,...l.newVehicleEntries].map(r=>r.sourceEntryKey).sort());
 assert.equal(s.sourcePdfSha256,'344d172e21daa7fdb3e0b032671e6833122f95d1175cf943bb1bb4a8110c561d');
 assert.equal(q.pdfFieldQA.total,48);assert.equal(q.pdfFieldQA.verified+q.pdfFieldQA.pending,48);assert.ok(q.pdfFieldQA.verified>=12);
 assert.equal(s.summary.groups,s.records.reduce((a,r)=>a+r.armament.firingGroups.length,0));
 assert.equal(s.productionPacksChanged,false);assert.equal(s.generatedActorsChanged,false);
});
test('ground and air page boundaries are not cross-mapped',()=>{
 assert.equal(x('model-67-shrieker-speeder-bike').armament.firingGroups.length,0);
 assert.deepEqual([x('quickfire-speeder-bike').armament.firingGroups.length,x('gpe-3300-airspeeder').armament.firingGroups.length,x('veltiss-2-airspeeder').armament.firingGroups.length],[1,0,0]);
 assert.deepEqual(x('all-terrain-riot-control-transport-at-rct').armament.firingGroups.map(a=>a.label),['Double medium blaster cannons','Suppression cannons']);
 assert.deepEqual(x('all-terrain-armored-heavy-transport-at-aht').armament.firingGroups.map(a=>a.label),['Heavy laser cannons','Heavy blaster cannons']);
 assert.match(x('all-terrain-armored-heavy-transport-at-aht').capacity.storageNotes,/8 speeder bikes OR 3 AT-RCTs/);
});
test('space station source attack groups and source restrictions',()=>{
 assert.deepEqual([x('golan-viii-space-defense-platform').armament.firingGroups.length,x('rendili-star-drive-mobile-spacedock-220').armament.firingGroups.length,x('the-wheel').armament.firingGroups.length],[4,3,4]);
 for(const name of ['golan-viii-space-defense-platform','rendili-star-drive-mobile-spacedock-220']){
  const rec=x(name);assert.equal(rec.movement.speedModes[0].squaresPerMove,1);assert.equal(rec.movement.speedModes[0].scale,'starship');assert.match(rec.text.sourceNotes,/source note only|restriction/);
 }
 assert.equal(x('golan-viii-space-defense-platform').abilities.skills.find(z=>z.name==='Use Computer').printedModifier,6);
 assert.deepEqual(x('golan-viii-space-defense-platform').capacity.carriedCraft.map(z=>z.count),[20,24,150]);
 assert.deepEqual(x('rendili-star-drive-mobile-spacedock-220').capacity.carriedCraft.map(z=>z.count),[20,150]);
 assert.deepEqual(x('the-wheel').armament.firingGroups.map(g=>g.label),['Turbolaser battery','Point-defense laser cannon battery','Ion cannon battery','Tractor beam battery']);
});
test('ten source-field certifications do not enable attack runtime or reinterpret 39 inherited ships',()=>{
 const ids=new Set(l.newVehicleEntries.map(e=>e.sourceEntryKey));
 const verified=q.records.filter(r=>r.sourceBook==='Legacy Era Campaign Guide');
 assert.equal(verified.length,10);assert.ok(verified.every(r=>r.status==='pdf-field-verified'&&r.strictMechanicalCertification==='not-certified'));
 for(const rec of s.records.filter(r=>ids.has(r.identity.sourceEntryKey))){
 assert.equal(rec.rules.reviewStatus,'partial-source-probe');
 assert.equal(rec.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
 assert.ok(!Object.hasOwn(rec.armament,'weaponMounts'));
 assert.ok(rec.armament.firingGroups.every(g=>Array.isArray(g.mountKeys)&&g.mountKeys.length===0));
 }
 assert.equal(s.records.filter(r=>!ids.has(r.identity.sourceEntryKey)).length,39);
});

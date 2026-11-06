import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const j=p=>JSON.parse(readFileSync('data/audits/vehicles/'+p,'utf8'));
const s=j('swse-universal-phase2i-jedi-academy-training-manual-staged.json'),l=j('swse-universal-phase1i-jedi-academy-training-manual.json');
const q=j('swse-universal-phase3-source-pdf-qa-queue.json');
const r=s.records[0];
test('Jedi Academy regression preserves one historical publication identity and zero new QA entries',()=>{
 assert.equal(s.records.length,1);assert.equal(l.existingSpacecraft.length,1);assert.equal(l.newVehicleEntries.length,0);
 assert.equal(r.identity.sourceEntryKey,l.existingSpacecraft[0].sourceEntryKey);
 assert.equal(s.sourcePdfSha256,'c4dce616776949aa0501b8932012b82d6fd1cd1c27e9646f0a772ab596b4cea9');
 assert.deepEqual(q.pdfFieldQA,{total:48,verified:48,pending:0});
});
test('Chu-unthor narrow original PDF corrections do not promote physical mount trust',()=>{
 assert.deepEqual([r.geometry.starshipScaleWidthSquares,r.geometry.starshipScaleLengthSquares],[2,2]);
 assert.equal(Object.hasOwn(r.geometry,'characterScaleWidthSquares'),false);
 assert.equal(r.hyperspace.backupMultiplier,18);
 assert.equal(r.abilities.skills.find(x=>x.name==='Use Computer').printedModifier,12);
 assert.equal(r.movement.speedModes[0].scale,'starship');
 assert.match(r.capacity.storageNotes,/various shuttlecraft/);
 assert.equal(r.armament.firingGroups.length,1);
 assert.equal(r.fieldStates['/rules/strictMechanicalCertification'],'not-yet-reviewed');
 assert.equal(r.rules.reviewStatus,'partial-source-probe');
 assert.ok(r.armament.firingGroups.every(x=>x.mountKeys?.length===0));
 assert.equal(Object.hasOwn(r.armament,'weaponMounts'),false);
});
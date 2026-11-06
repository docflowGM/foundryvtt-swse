import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assembleUniversalVehicleCanonical, verifyUniversalVehicleCanonical} from '../tools/build-universal-vehicle-canonical.mjs';

const {records,ndjson,manifest}=assembleUniversalVehicleCanonical();

test('Phase 4A canonical generated files match the effective accepted source bytes',()=>{
  assert.deepEqual(verifyUniversalVehicleCanonical(),manifest);
  assert.equal(readFileSync('data/canonical/vehicles/vehicles.json','utf8'),ndjson);
  assert.equal(readFileSync('data/canonical/vehicles/vehicles.manifest.json','utf8'),JSON.stringify(manifest,null,2)+'\n');
  assert.equal(createHash('sha1').update('blob '+Buffer.byteLength(ndjson)+'\0').update(ndjson).digest('hex'),manifest.sourceFileGitBlobSha1);
});

test('Phase 4A has 429 separate publication keys across all fourteen books',()=>{
  assert.equal(records.length,429);
  assert.equal(new Set(records.map(r=>r.identity.sourceEntryKey)).size,429);
  assert.equal(new Set(records.map(r=>r.publication.book)).size,14);
  assert.deepEqual(records.map(r=>r.identity.sourceEntryKey),records.map(r=>r.identity.sourceEntryKey).slice().sort());
  assert.equal(Object.values(manifest.categoryCounts).reduce((a,b)=>a+b,0),429);
  assert.equal(manifest.pdfFieldQAVerified,48);
  assert.equal(manifest.targetedExceptionsReviewed,10);
});

test('Phase 4A maintains corrected Vulture and separate published TX-130Ts and Hornet',()=>{
  const find=k=>records.find(r=>r.identity.sourceEntryKey===k);
  const core=find('core-vulture-class-droid-starfighter');
  assert.equal(core.identity.name,'"Vulture" Droid Starfighter');
  assert.equal(core.publication.page,181);
  assert.match(core.publication.entryNotes,/P3R-CORE-VULTURE-PROVENANCE-001/);
  assert.ok(find('sotg-baktoid-armor-workshop-vulture-class-starfighter'));
  assert.ok(find('sav-tenloss-corporation-hornet-class-interceptor'));
  assert.ok(find('cw-tx-130t-saber-class-fighter-tank'));
  assert.ok(find('fucg-tx-130t-fighter-tank'));
});

test('Phase 4A source remains unarmed and cutover-blocked',()=>{
  for(const r of records){
    assert.equal(Object.hasOwn(r.armament??{},'weaponMounts'),false,r.identity.sourceEntryKey);
    for(const group of r.armament?.firingGroups??[]) assert.deepEqual(group.mountKeys,[],r.identity.sourceEntryKey);
  }
  assert.equal(manifest.certification,'SOURCE_ONLY');
  assert.equal(manifest.installedMountsPromoted,0);
  assert.equal(manifest.sourceAttackGroupsExecutable,false);
  assert.equal(manifest.nativePacksRegistered,false);
  assert.equal(manifest.actorsImported,false);
  assert.equal(manifest.productionCutoverAuthorized,false);
});

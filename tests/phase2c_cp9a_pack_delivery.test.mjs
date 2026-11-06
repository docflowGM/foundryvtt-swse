import test from 'node:test';
import assert from 'node:assert/strict';
import {auditVehiclePackDelivery} from '../tools/audits/vehicles/audit_phase2c_cp9_pack_delivery.mjs';

test('source-backed .db ships are NOT independently deployed v13 LevelDB packs',()=>{
  const report=auditVehiclePackDelivery(new URL('../',import.meta.url).pathname);
  assert.equal(report.manifestShips.length,2);
  for(const ship of report.manifestShips){
    assert.equal(ship.packKind,'Actor');
    assert.equal(ship.manifestPathCorrect,true);
    assert.equal(ship.legacyDbSourceExists,true);
    assert.equal(ship.liveFoundryPackDocumentVerified,false);
    assert.equal(ship.v13LevelDbDirectoryExists,false);
  }
  assert.equal(report.deploymentReady,false);
  assert.equal(report.stockAttackRuntimeCertificationAllowed,false);
});
test('the standard zip build does not contain pack files',()=>{
  const report=auditVehiclePackDelivery(new URL('../',import.meta.url).pathname);
  assert.equal(report.releaseBuildIncludesPacks,false);
  assert.ok(report.reasons.includes('ZIP_PACKAGE_LIST_DOES_NOT_INCLUDE_PACKS'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gitBlobSha } from '../tools/audits/vehicles/audit_phase2c_cp7_stock_bindings.mjs';
import { validateRemediationManifest, inspectRepository } from '../tools/audits/vehicles/verify_phase2c_cp8_remediation_manifest.mjs';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('../data/audits/vehicles/swse-phase2c-cp8-stock-pack-remediation-manifest.json', import.meta.url)));
const ledgerPath = 'data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json';
const ledger = JSON.parse(readFileSync(new URL('../'+ledgerPath, import.meta.url)));
const pinned = [ledgerPath, ...manifest.inputBaseline.packs.map(x=>x.path)];
const blobs = Object.fromEntries(pinned.map(p=>[p,gitBlobSha(readFileSync(new URL('../'+p, import.meta.url)))]));
const packs = Object.fromEntries(manifest.inputBaseline.packs.map(({path})=>
  [path,readFileSync(new URL('../'+path, import.meta.url),'utf8').trim().split(/\r?\n/).map(JSON.parse)]));
const check = (patch={}) => validateRemediationManifest({
  manifest:patch.manifest??structuredClone(manifest),
  sourceLedger:patch.sourceLedger??structuredClone(ledger),
  packs:patch.packs??structuredClone(packs),
  blobShas:patch.blobShas??{...blobs}
});
const bad = (result, term) => assert.ok(result.errors.some(x=>x.includes(term)),JSON.stringify(result.errors));

test('CP8A pinned live repository inputs and source-proposal parity pass',()=>{
  const r=inspectRepository(new URL('../',import.meta.url).pathname);
  assert.equal(r.ok,true,JSON.stringify(r.errors));
  assert.equal(r.candidates,4);
  assert.equal(r.trustedRuntimeBindings,0);
});
test('exact baseline 4 pilot targets have nonzero corrections',()=>{
  assert.equal(manifest.entries.length,4);
  assert.deepEqual(manifest.entries.map(x=>x.candidatePack.documentId).sort(),
    ['97c5c070d93b7a0a','18cd29422b66693d','4d5b3422047f5eb8','28f748f51896aa1b'].sort());
  assert.ok(manifest.entries.every(x=>x.suggestedFieldCorrections.length>0));
});
test('reject source or pack blob change',()=>{
  const b={...blobs,[ledgerPath]:'0'.repeat(40)};
  bad(check({blobShas:b}),'INPUT_GIT_BLOB_CHANGED');
});
test('do not accept a changed source identity or certificate',()=>{
  const l=structuredClone(ledger);const record=l.entries.find(x=>x.sourceEntryKey===manifest.entries[0].sourceEntryKey);
  record.fullFieldCertified=false;
  bad(check({sourceLedger:l}),'SOURCE_IDENTITY_OR_CERTIFICATE_MISMATCH');
});
test('source and target pack document identity must match',()=>{
  const p=structuredClone(packs), e=manifest.entries[0];
  p[e.candidatePack.path].find(x=>x._id===e.candidatePack.documentId).name='Renamed without audit';
  bad(check({packs:p}),'PACK_DOCUMENT_IDENTITY_NOT_UNIQUE');
});
test('reject stale old-field snapshots before any data migration',()=>{
  const p=structuredClone(packs),e=manifest.entries[0];
  p[e.candidatePack.path].find(x=>x._id===e.candidatePack.documentId).system.hitPoints=123456;
  bad(check({packs:p}),'STALE_OBSERVED_VALUE');
});
test('reject a proposed direct weapon-row mutation',()=>{
  const m=structuredClone(manifest),e=m.entries.find(x=>x.deferredGroupHydration.length>0);
  e.suggestedFieldCorrections.push({path:'system.weapons',observed:[],expected:[{name:'made up'}],action:'REMEDIATE'});
  bad(check({manifest:m}),'UNREVIEWED_WEAPON_ROW_MUTATION');
});
test('reject inferred installed weapon group identities',()=>{
  const m=structuredClone(manifest),g=m.entries.find(x=>x.deferredGroupHydration.length>0).deferredGroupHydration[0];
  g.installedPackWeaponRowId='fabricated';
  bad(check({manifest:m}),'PREMATURE_TRUSTED_WEAPON_BINDING');
});
test('printed Ghtroc group remains one fixed-forward gunner-operated double-laser mount',()=>{
  const g=manifest.entries.find(x=>x.deferredGroupHydration.length>0).deferredGroupHydration[0];
  assert.equal(g.sourcePrintedGroup.station,'gunner');
  assert.equal(g.sourcePrintedGroup.hardwareCount,1);
  assert.equal(g.sourcePrintedGroup.damage,'4d10x2');
  assert.equal(g.sourcePrintedGroup.attackBonus,1);
  assert.match(g.sourcePrintedGroup.firingArc,/fixed-forward/);
  assert.equal(g.bindingStatus,'NOT_ISSUED');
});
test('CR70 range and typical crew both retained (not silently collapsed)',()=>{
  const cr=manifest.entries.find(x=>x.sourceEntryKey.includes('cr70-corvette'));
  assert.deepEqual(cr.targetProfile.crew.range,[18,150]);
  assert.equal(cr.targetProfile.crew.typical,30);
  const fix=cr.suggestedFieldCorrections.find(x=>x.path==='system.vehicleCrewCount');
  assert.equal(fix.expected,30);
});
test('retain immediate strict stock gate and all decision constraints',()=>{
  assert.deepEqual(manifest.policy.decisions,['P2C-D01','P2C-D02','P2C-D03','P2C-D04-DENY']);
  assert.equal(manifest.policy.runtimeTrustedWeaponBindingsIssued,0);
  assert.equal(manifest.policy.vehicleDroidModificationRefactorAuthorized,false);
  assert.equal(check().ok,true);
});

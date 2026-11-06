import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateRemediationManifest } from '../tools/audits/vehicles/verify_phase2c_cp8_remediation_manifest.mjs';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('../data/audits/vehicles/swse-phase2c-cp8-stock-pack-remediation-manifest.json', import.meta.url)));
const ledgerPath = 'data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json';
const ledger = JSON.parse(readFileSync(new URL('../'+ledgerPath, import.meta.url)));
const pinned = [ledgerPath, ...manifest.inputBaseline.packs.map(x=>x.path)];
// CP8A is a frozen PRE-MUTATION audit. Once the four ship records were
// corrected in CP8B, the live pack blobs intentionally changed. Rewind only
// the audited pilot fields into a synthetic, isolated historical fixture.
// Never claim this recreates the complete original Git blobs.
const blobs = {
  [ledgerPath]: manifest.sourceAuthority.ledgerGitBlobSha,
  ...Object.fromEntries(manifest.inputBaseline.packs.map(p => [p.path,p.gitBlobSha]))
};
const packs = Object.fromEntries(manifest.inputBaseline.packs.map(({path})=>
  [path,readFileSync(new URL('../'+path, import.meta.url),'utf8').trim().split(/\r?\n/).map(JSON.parse)]));
const meta = JSON.parse(readFileSync(new URL('../data/audits/vehicles/swse-phase2c-cp8b-derived-metadata-remediation.json',import.meta.url)));
function restore(row, c) {
  const keys=c.path.split('.');
  let node=row;
  for(const k of keys.slice(0,-1)){node[k]??={};node=node[k];}
  const field=keys.at(-1);
  if(c.observedState==='MISSING')delete node[field];
  else node[field]=structuredClone(c.observed);
}
for(const entry of manifest.entries){
  const row=packs[entry.candidatePack.path].find(x=>x._id===entry.candidatePack.documentId);
  for(const c of entry.suggestedFieldCorrections)restore(row,c);
  const d=meta.entries.find(x=>x.sourceEntryKey===entry.sourceEntryKey);
  for(const c of d.proposedDerivedCorrections)restore(row,c);
  if(d.sourceProof.printedArmament)row.system.weapons=[];
}
const check = (patch={}) => validateRemediationManifest({
  manifest:patch.manifest??structuredClone(manifest),
  sourceLedger:patch.sourceLedger??structuredClone(ledger),
  packs:patch.packs??structuredClone(packs),
  blobShas:patch.blobShas??{...blobs}
});
const bad = (result, term) => assert.ok(result.errors.some(x=>x.includes(term)),JSON.stringify(result.errors));

test('archived CP8A four-record pre-mutation fixture validates without granting attack authority',()=>{
  const r=check();
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

test('absent pack property is distinguishable from explicitly stored null',()=>{
  const p=structuredClone(packs),e=manifest.entries.find(x=>x.sourceEntryKey.includes('cr70-corvette'));
  const row=p[e.candidatePack.path].find(x=>x._id===e.candidatePack.documentId);
  assert.equal(Object.hasOwn(row.system.attributes.str,'value'),false);
  row.system.attributes.str.value=null;
  bad(check({packs:p}),'STALE_OBSERVED_VALUE');
});
test('Ghtroc printed attack total reconciles with crew BAB and vehicle INT',()=>{
  const g=manifest.entries.find(x=>x.sourceEntryKey.includes('ghtroc-industries'));
  const p=g.targetProfile;
  const vehicleIntModifier=Math.floor((p.abilities.int-10)/2);
  assert.equal(p.combat.baseAttackBonus,0);
  assert.equal(p.crew.quality,'normal');
  assert.equal(vehicleIntModifier,1);
  assert.equal(Number(g.deferredGroupHydration[0].sourcePrintedGroup.attackBonus),
               p.combat.baseAttackBonus+vehicleIntModifier);
  assert.equal(g.deferredGroupHydration[0].sourcePrintedGroup.autofireBonus,-4);
  assert.equal(-4-1,-5,'autofire adjustment is -5, not another weapon enhancement');
});

test('MISSING historical field is omitted, never filled with fake observed null',()=>{
  const missing=manifest.entries.flatMap(e=>e.suggestedFieldCorrections)
    .filter(c=>c.observedState==='MISSING');
  assert.ok(missing.length>0);
  assert.ok(missing.every(c=>!Object.hasOwn(c,'observed')));
  assert.equal(check().ok,true);
});
test('audit rejects an observed:null entry for genuinely missing historical field',()=>{
  const m=structuredClone(manifest);
  const c=m.entries.flatMap(e=>e.suggestedFieldCorrections).find(x=>x.observedState==='MISSING');
  c.observed=null;
  bad(check({manifest:m}),'STALE_OBSERVED_VALUE');
});
test('audit distinguishes explicit source null from absent historical key',()=>{
  const m=structuredClone(manifest);
  const c=m.entries.flatMap(e=>e.suggestedFieldCorrections).find(x=>x.observedState==='NULL');
  assert.ok(c && Object.hasOwn(c,'observed') && c.observed===null);
  delete c.observed;
  bad(check({manifest:m}),'STALE_OBSERVED_VALUE');
});

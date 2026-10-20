import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {CP22_SOTG_REFERENCE_CATALOG} from '../scripts/domain/vehicles/vehicle-cp22-source-catalog.generated.js';
import {probeCP23LegacyPackImport,observeCP23ImportedVehicle}
  from '../scripts/domain/vehicles/vehicle-cp23-pack-provenance-probe.js';
import {TRUSTED_STOCK_WEAPON_GROUP_COUNT,resolveTrustedStockAttackGroup}
  from '../scripts/domain/vehicles/vehicle-stock-attack-authority.js';

const repo=resolve(new URL('../',import.meta.url).pathname);
const path='data/audits/vehicles/swse-sotg-cp23-source-pack-reconciliation.json';
const report=JSON.parse(readFileSync(join(repo,path),'utf8'));
const builder=join(repo,'tools/audits/vehicles/build_sotg_cp23_reconciliation.mjs');
function fixture(index=0){
  const c=CP22_SOTG_REFERENCE_CATALOG.legacyPackCandidates[index];
  const pack='foundryvtt-swse.'+c.packName;
  const doc={id:c.documentId,name:c.name,type:'vehicle',pack,system:{
    sourcebook:'',page:null,weapons:[],initiative:'+5',flatFooted:12,reflexDefense:23
  }};
  const actor={id:'world-vehicle-1',type:'vehicle',system:structuredClone(doc.system)};
  const game={system:{id:'foundryvtt-swse'},actors:{get:k=>k===actor.id?actor:null},
    packs:{get:id=>id===pack?{getDocument:async key=>key===doc.id?doc:null}:null}};
  return {c,doc,actor,game};
}
const probe=x=>probeCP23LegacyPackImport({
  actor:x.actor,sourceDocument:x.doc,packName:x.c.packName,
  mode:'replace',game:x.game
});
test('15 ordered CP21 sources have 13 quarantined legacy candidates and 2 unmatched',()=>{
  assert.equal(report.ownerApprovedCount,15);
  assert.equal(report.records.length,15);
  assert.equal(report.legacyCandidateCount,13);
  assert.equal(report.unmappedSourceCount,2);
  assert.equal(report.reconciledSourceCount,0);
  assert.deepEqual(report.records.filter(x=>!x.candidate).map(x=>x.queuePosition),[7,8]);
  assert.deepEqual(report.records.map(x=>x.queuePosition),Array.from({length:15},(_,i)=>i+1));
  assert.equal(new Set(report.records.map(x=>x.sourceEntryKey)).size,15);
  for(const x of report.records){
    assert.ok(x.blockers.includes('PHYSICAL_GROUP_MAPPING_NOT_CERTIFIED'));
    assert.equal(x.attackRows.countsEquivalent,false);
    assert.equal(x.foundryRuntimeStockAttackTrusted,false);
    assert.equal(x.compendiumMutationAllowed,false);
  }
  assert.equal(report.trustedPhysicalWeaponGroupsAdded,0);
  assert.equal(report.stockRuntimeAttackPermissionsAdded,0);
  assert.equal(report.legacyPacksEdited,false);
  assert.equal(report.foundryActorImportsExecuted,false);
  assert.equal(TRUSTED_STOCK_WEAPON_GROUP_COUNT,0);
});
test('approved source scalar reconciliation never promotes row count into a hardware count',()=>{
  const by=n=>report.records[n-1];
  assert.equal(by(1).expected.initiative,12);
  assert.equal(by(1).candidate.legacyAttackRowCount,0);
  assert.equal(by(2).expected.sourceAttackGroupCount,5);
  assert.equal(by(2).candidate.legacyAttackRowCount,5);
  assert.equal(by(2).attackRows.countsEquivalent,false);
  assert.equal(by(3).expected.flatFootedReflex,14);
  assert.equal(by(4).expected.reflexDefense,17);
  assert.equal(by(5).expected.initiative,2);
  assert.equal(by(6).expected.initiative,6);
  assert.equal(by(11).scalarComparisons[0].state,'MATCH');
  assert.equal(by(13).scalarComparisons[0].state,'MATCH');
  assert.equal(by(15).expected.sourceAttackGroupCount,1);
  assert.equal(by(15).candidate.legacyAttackRowCount,0);
});
test('native legacy pack may be genuinely observed, but cannot authenticate canonical source',async()=>{
  const f=fixture();
  const x=await probe(f);
  assert.equal(x.status,'CP23_LEGACY_NATIVE_PACK_SNAPSHOT_OBSERVED');
  assert.equal(x.observedLegacyPack,true);
  assert.equal(x.sourceDocumentId,f.doc.id);
  assert.equal(x.canonicalSourceBindingGranted,false);
  assert.equal(x.strictMechanicalCertified,false);
  assert.equal(x.stockAttackAuthorityGranted,false);
  assert.equal(x.productionHydrationPermitted,false);
  assert.equal(resolveTrustedStockAttackGroup(f.actor,{id:'spoofed-stock-weapon'}),null);
});
test('merge, fake pack, copied document, fake world Actor and changed metadata all fail closed',async()=>{
  {
    const f=fixture();
    assert.equal((await probeCP23LegacyPackImport({actor:f.actor,sourceDocument:f.doc,mode:'merge',packName:f.c.packName,game:f.game})).reason,'REPLACE_REQUIRED');
  }
  {
    const f=fixture();f.game.packs.get=()=>null;
    assert.equal((await probe(f)).reason,'NATIVE_PACK_NOT_REGISTERED');
  }
  {
    const f=fixture(),forgery={...f.doc};
    assert.equal((await probeCP23LegacyPackImport({actor:f.actor,sourceDocument:forgery,mode:'replace',packName:f.c.packName,game:f.game})).reason,'PACK_DOCUMENT_OBJECT_IDENTITY_MISMATCH');
  }
  {
    const f=fixture();f.game.actors.get=()=>null;
    assert.equal((await probe(f)).reason,'ACTOR_NOT_PRESENT_IN_WORLD_COLLECTION');
  }
  {
    const f=fixture();f.doc.system.stockSourceEntryKey=f.c.sourceEntryKey;
    assert.equal((await probe(f)).reason,'UNEXPECTED_SOURCE_FIELDS_REQUIRE_REAUDIT');
  }
  {
    const f=fixture();f.actor.system.initiative='+999';
    const z=await probe(f);
    assert.equal(z.reason,'IMPORTED_ACTOR_LEGACY_SNAPSHOT_DRIFT');
    assert.deepEqual(z.driftFields,['initiative']);
    assert.equal(z.stockAttackAuthorityGranted,false);
  }
});
test('Foundry wrapper ignores caller-supplied fake game context and uses real global',async()=>{
  const f=fixture();
  const previous=globalThis.game;
  try{
    globalThis.game={system:f.game.system,actors:{get:()=>null},packs:f.game.packs};
    const x=await observeCP23ImportedVehicle({actor:f.actor,sourceDocument:f.doc,
      packName:f.c.packName,mode:'replace',game:f.game});
    assert.equal(x.reason,'ACTOR_NOT_PRESENT_IN_WORLD_COLLECTION');
  }finally{
    if(previous===undefined)delete globalThis.game;else globalThis.game=previous;
  }
});
test('reconciliation manifest regeneration is byte-for-byte reproducible and rejects altered legacy pack input',()=>{
  const run=spawnSync(process.execPath,[builder,'--check'],{cwd:repo,encoding:'utf8'});
  assert.equal(run.status,0,run.stdout+'\n'+run.stderr);
  const tmp=mkdtempSync(join(tmpdir(),'sotg-cp23-'));
  try{
    mkdirSync(join(tmp,'data/audits/vehicles'),{recursive:true});
    mkdirSync(join(tmp,'scripts/domain/vehicles'),{recursive:true});
    mkdirSync(join(tmp,'packs'),{recursive:true});
    for(const name of [
      'packs/vehicles-starfighters.db','packs/vehicles-capital-ships.db',
      'packs/vehicles-space-transports.db',
      'scripts/domain/vehicles/vehicle-cp22-source-catalog.generated.js',path]){
      cpSync(join(repo,name),join(tmp,name));
    }
    const pass=spawnSync(process.execPath,[builder,'--check'],{cwd:tmp,encoding:'utf8'});
    assert.equal(pass.status,0,pass.stderr);
    const pack=join(tmp,'packs/vehicles-starfighters.db');
    const source=readFileSync(pack,'utf8');
    writeFileSync(pack,source.replace('Advanced V-19 Torrent Starfighter','FORGED V-19'), 'utf8');
    const fail=spawnSync(process.execPath,[builder,'--check'],{cwd:tmp,encoding:'utf8'});
    assert.notEqual(fail.status,0);
    assert.match(fail.stderr,/LEGACY_PACK_SOURCE_BLOB_DRIFT/);
  }finally{rmSync(tmp,{recursive:true,force:true});}
});
test('CP23 wizard remains observation-only; canonical source import is blocked before legacy normalization',()=>{
  const wizard=readFileSync(join(repo,'scripts/apps/vehicle-import-wizard.js'),'utf8');
  const authority=readFileSync(join(repo,'scripts/domain/vehicles/vehicle-stock-attack-authority.js'),'utf8');
  const engine=readFileSync(join(repo,'scripts/engine/import/vehicle-import-engine.js'),'utf8');
  assert.match(wizard,/observeCP23ImportedVehicle/);
  assert.match(wizard,/await observeCP23ImportedVehicle/);
  assert.match(wizard,/await VehicleImportEngine\.apply/);
  assert.match(authority,/TRUSTED_STOCK_WEAPON_GROUP_COUNT = 0/);
  assert.match(authority,/return null/);
  // CP23-C4C deliberately blocks canonical stage docs before legacy
  // normalization; the engine still never authenticates a source or grants
  // a stock weapon from an import. This is a denial, not an authority path.
  assert.ok(engine.includes('assertCP23C4CNoStagedSourceImport(sourceActor)'));
  assert.ok(engine.indexOf('assertCP23C4CNoStagedSourceImport(sourceActor)') <
    engine.indexOf('normalizeVehicleImportData(rawSystem)'));
  assert.doesNotMatch(engine,/setCP23Trusted|issueVerifiedReceipt|grantStockAttack/);
  assert.doesNotMatch(wizard,/setFlag\(.*(?:stock|trusted|certified)/);
});

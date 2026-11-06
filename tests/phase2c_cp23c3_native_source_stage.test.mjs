import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,cpSync,rmSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildCP23C3SourceStage,INPUT,OUTPUT,STAGE,STAGE_PACK_NAME}
  from '../tools/audits/vehicles/build_sotg_cp23c3_native_stage.mjs';
import {TRUSTED_STOCK_WEAPON_GROUP_COUNT,resolveTrustedStockAttackGroup}
  from '../scripts/domain/vehicles/vehicle-stock-attack-authority.js';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const {manifest,documents}=buildCP23C3SourceStage();
const committed=JSON.parse(readFileSync(join(root,OUTPUT),'utf8'));

test('fifteen CP21-approved source identities are staged as EXACTLY fifteen unarmed Actor JSON files',()=>{
  assert.deepEqual(manifest,committed);
  assert.equal(manifest.nativeDocumentCount,15);
  assert.equal(manifest.stagedDocuments.length,15);
  assert.equal(documents.size,15);
  assert.equal(new Set(manifest.stagedDocuments.map(x=>x.sourceEntryKey)).size,15);
  assert.equal(new Set(manifest.stagedDocuments.map(x=>x.documentId)).size,15);
  assert.deepEqual(readdirSync(join(root,STAGE)).filter(x=>x.endsWith('.json')).sort(),
    [...documents.keys()].map(x=>x.split('/').at(-1)).sort());
  for(const [i,meta] of manifest.stagedDocuments.entries()){
    assert.equal(meta.order,i+1);
    assert.equal(meta.file,STAGE+meta.documentId+'.json');
    assert.equal(meta.weaponCount,0);
    assert.ok(meta.sourceAttackRows>0);
    assert.equal(meta.decisionId,'SOTG-CP21-D'+String(i+1).padStart(2,'0'));
    assert.equal(meta.documentId,'sotgcp23b'+String(i+1).padStart(7,'0'));
    assert.equal(readFileSync(join(root,meta.file),'utf8'),documents.get(meta.file));
    const doc=JSON.parse(documents.get(meta.file));
    assert.equal(doc._key,'!actors!'+doc._id);
    assert.equal(doc.name,meta.name);
    assert.equal(doc.type,'vehicle');
    assert.equal(doc.system.sourcebook,'Starships of the Galaxy');
    assert.equal(doc.system.page,meta.printedPage);
    assert.equal(doc.system.weapons.length,0);
    assert.equal(Object.hasOwn(doc.system,'stockSourceEntryKey'),false);
  }
});

test('all source pack permissions remain denied, including a copied actor and source key',()=>{
  assert.equal(manifest.registeredInSystemJson,false);
  assert.equal(manifest.released,false);
  assert.equal(manifest.worldActorInstallations,0);
  assert.equal(manifest.durableGMReceiptsIssued,0);
  assert.equal(manifest.physicalMountCertificates,0);
  assert.equal(manifest.stockAttackPermissions,0);
  assert.equal(TRUSTED_STOCK_WEAPON_GROUP_COUNT,0);
  const forged=JSON.parse([...documents.values()][0]);
  forged.system.stockSourceEntryKey=manifest.stagedDocuments[0].sourceEntryKey;
  assert.equal(resolveTrustedStockAttackGroup(forged,{_id:'spoofed-mount'}),null);
  const system=JSON.parse(readFileSync(join(root,'system.json'),'utf8'));
  assert.equal(system.packs?.some(p=>p.name===STAGE_PACK_NAME),false);
});

test('regeneration is byte-for-byte identical to the committed canonical source stage',()=>{
  const result=spawnSync(process.execPath,
    ['tools/audits/vehicles/build_sotg_cp23c3_native_stage.mjs','--check'],
    {cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr+result.stdout);
  assert.deepEqual(buildCP23C3SourceStage().manifest,committed);
});

test('pinned original source rejects silent provenance change and unreviewed registration',()=>{
  const tmp=mkdtempSync(join(tmpdir(),'cp23c3-'));
  try{
    for(const p of [INPUT,'system.json']){
      mkdirSync(join(tmp,p.split('/').slice(0,-1).join('/')),{recursive:true});
      cpSync(join(root,p),join(tmp,p));
    }
    assert.deepEqual(buildCP23C3SourceStage({repoRoot:tmp}).manifest,committed);
    const systemPath=join(tmp,'system.json');
    const sys=JSON.parse(readFileSync(systemPath,'utf8'));
    sys.packs.push({name:STAGE_PACK_NAME,path:'packs/unapproved'});
    writeFileSync(systemPath,JSON.stringify(sys),'utf8');
    assert.throws(()=>buildCP23C3SourceStage({repoRoot:tmp}),
      /STAGING_SOURCE_WAS_REGISTERED_FOR_RELEASE/);
    cpSync(join(root,'system.json'),systemPath);
    const sourcePath=join(tmp,INPUT);
    writeFileSync(sourcePath,readFileSync(sourcePath,'utf8').replace(
      '"proposalCount": 15','"proposalCount": 14'),'utf8');
    assert.throws(()=>buildCP23C3SourceStage({repoRoot:tmp}),
      /PINNED_CP23B_SOURCE_BLOB_CHANGED/);
  }finally{rmSync(tmp,{recursive:true,force:true});}
});

test('source stage builder has no production pack/Actor write or trusted weapon authority',()=>{
  const code=readFileSync(join(root,
    'tools/audits/vehicles/build_sotg_cp23c3_native_stage.mjs'),'utf8');
  assert.doesNotMatch(code,/ActorEngine\.updateActor|game\.settings\.set|createEmbeddedDocuments/);
  assert.match(code,/no deployment mode/);
  const importer=readFileSync(join(root,'scripts/engine/import/vehicle-import-engine.js'),'utf8');
  assert.doesNotMatch(importer,/CP23C3|cp23c3|sotg-cp23c3-source-stage/);
});

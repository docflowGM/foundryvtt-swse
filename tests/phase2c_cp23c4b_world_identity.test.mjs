import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CP23C4B_WORLD_ANCHORS}
 from '../scripts/domain/vehicles/vehicle-cp23c4b-source-anchors.generated.js';
import {
  CP23C4B_SOURCE_PACK,CP23C4B_STATUS,
  inspectCP23C4BWorldInstallationCandidate,verifyCP23C4BClaimedReceipt
} from '../scripts/domain/vehicles/vehicle-cp23c4b-world-binding.js';
import {CP23C2_STATUS}
 from '../scripts/domain/vehicles/vehicle-cp23c2-installation-preflight.js';
import {TRUSTED_STOCK_WEAPON_GROUP_COUNT,resolveTrustedStockAttackGroup}
 from '../scripts/domain/vehicles/vehicle-stock-attack-authority.js';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const clone=x=>structuredClone(x);
function fixture(i=0){
  const entry=CP23C4B_WORLD_ANCHORS.entries[i];
  const sourceDraft=clone(entry.draftActor);
  const native={
    id:entry.sourceDocumentId,
    name:entry.name,
    type:'vehicle',
    pack:CP23C4B_SOURCE_PACK,
    system:sourceDraft.system,
    toObject(){return clone(sourceDraft);}
  };
  const worldId='world_SotG_'+String(i+1).padStart(3,'0');
  const actor={
    id:worldId,name:sourceDraft.name,type:'vehicle',
    img:sourceDraft.img,system:clone(sourceDraft.system),items:[],
    toObject(){return clone({_id:this.id,name:this.name,type:this.type,img:this.img,
      system:this.system,items:this.items});}
  };
  const game={
    system:{id:'foundryvtt-swse'},
    world:{id:'world_one'},
    user:{id:'gm_main',isGM:true},
    users:{activeGM:{id:'gm_main'}},
    actors:{get:id=>id===actor.id?actor:null},
    packs:{get:pack=>pack===CP23C4B_SOURCE_PACK?
      {documentName:'Actor',getDocument:async id=>id===native.id?native:null}:null}
  };
  const args={actor,sourceDocument:native,mode:'replace',preserve:{},game};
  return {entry,native,actor,game,args};
}
const check=f=>inspectCP23C4BWorldInstallationCandidate(f.args);

test('all 15 source-native/world-Actor IDs are distinct, preserving exact pinned original sources',async()=>{
  assert.equal(CP23C4B_WORLD_ANCHORS.count,15);
  assert.equal(CP23C4B_WORLD_ANCHORS.entries.length,15);
  assert.equal(CP23C4B_WORLD_ANCHORS.status,
    'AUDIT_ONLY_UNREGISTERED_PACK_NO_PROVENANCE_ISSUER');
  assert.ok(Object.isFrozen(CP23C4B_WORLD_ANCHORS.entries[0].draftActor.system));
  assert.equal(new Set(CP23C4B_WORLD_ANCHORS.entries.map(x=>x.sourceEntryKey)).size,15);
  for(let i=0;i<15;i++){
    const f=fixture(i);
    const x=await check(f);
    assert.notEqual(f.actor.id,f.native.id);
    assert.equal(x.status,CP23C4B_STATUS.MATCH);
    assert.equal(x.reason,'NO_REGISTERED_PACK_BYTE_CERTIFICATE_OR_GOVERNED_IMPORT_RECEIPT');
    assert.equal(x.actorId,f.actor.id);
    assert.equal(x.sourceDocumentId,f.native.id);
    assert.equal(x.sourceEntryKey,f.entry.sourceEntryKey);
    assert.equal(x.sourceDraftGitBlobSha,f.entry.sourceDocumentGitBlobSha);
    assert.equal(x.sourceParity,CP23C2_STATUS.EXACT);
    assert.equal(x.installedParity,CP23C2_STATUS.EXACT);
    assert.equal(x.observedPackAndWorldReferences,true);
    assert.equal(x.verifiedInstallationReceipt,false);
    assert.equal(x.provenanceAuthenticated,false);
    assert.equal(x.installTransactionAuthenticated,false);
    assert.equal(x.compiledPackBytesAuthenticated,false);
    assert.equal(x.foundryStockAttackTrusted,false);
    assert.equal(x.physicalMountCertified,false);
    assert.equal(x.productionHydrationPermitted,false);
    assert.equal(resolveTrustedStockAttackGroup(f.actor,{id:'forge'}),null);
  }
  assert.equal(TRUSTED_STOCK_WEAPON_GROUP_COUNT,0);
});

test('world state HP and shield changes remain compare-only and confer no rights',async()=>{
  const f=fixture(0);
  f.actor.system.hp.value=30;
  f.actor.system.hp.temp=10;
  f.actor.system.shields.value=0;
  const x=await check(f);
  assert.equal(x.status,CP23C4B_STATUS.MATCH);
  assert.equal(x.installedParity,CP23C2_STATUS.TRANSIENT);
  assert.deepEqual(x.permittedTransientPaths,
    ['system.hp.value','system.hp.temp','system.shields.value']);
  assert.equal(x.provenanceAuthenticated,false);
  assert.equal(x.foundryStockAttackTrusted,false);
});

test('world membership and live Document instance are required, independent of source ID',async()=>{
  const f=fixture();
  f.game.actors.get=()=>({...f.actor});
  assert.equal((await check(f)).reason,'WORLD_ACTOR_REFERENCE_NOT_AUTHENTICATED');
  const g=fixture();
  g.actor.toObject=()=>({...clone(g.entry.draftActor),_id:'wrongId'});
  assert.equal((await check(g)).reason,'WORLD_ACTOR_DOCUMENT_IDENTITY_MISMATCH');
  const h=fixture();
  h.native.toObject=()=>({...clone(h.entry.draftActor),_id:'otherSource'});
  assert.equal((await check(h)).reason,'SOURCE_DOCUMENT_SHAPE_OR_ID_MISMATCH');
});
test('source pack registration/name/document and native read identity mismatches fail closed',async()=>{
  for(const change of [
    f=>f.game.packs.get=()=>null,
    f=>f.game.packs.get=()=>({documentName:'Item',getDocument:async()=>f.native}),
    f=>f.native.pack='legacy.other',
    f=>f.native.id='notFromAudit',
    f=>f.native.name='Counterfeit ship',
    f=>f.game.packs.get=()=>({documentName:'Actor',getDocument:async()=>({...f.native})}),
    f=>f.game.packs.get=()=>({documentName:'Actor',getDocument:async()=>{throw Error('unreadable');}})
  ]){
    const f=fixture();change(f);
    const x=await check(f);
    assert.equal(x.status,CP23C4B_STATUS.DENIED);
    assert.equal(x.verifiedInstallationReceipt,false);
  }
});

test('GM, world and import-mode restrictions all fail closed',async()=>{
  for(const change of [
    f=>f.args.mode='merge',
    f=>f.args.preserve={name:true},
    f=>f.game.user.isGM=false,
    f=>f.game.user.id='secondGM',
    f=>f.game.users.activeGM=null,
    f=>f.game.world.id='',
    f=>f.game.system.id='different-system',
    f=>f.actor.type='npc'
  ]){
    const f=fixture();change(f);
    const x=await check(f);
    assert.equal(x.status,CP23C4B_STATUS.DENIED);
    assert.equal(x.foundryStockAttackTrusted,false);
  }
});
test('source data and world configuration mutation, embedded Items, mod state and copies cannot pass',async()=>{
  const mutations=[
    f=>f.native.system.initiative+=1,
    f=>f.actor.system.initiative+=1,
    f=>f.actor.system.hp.max+=1,
    f=>f.actor.system.shields.max+=1,
    f=>f.actor.system.shipyard={source:'forged'},
    f=>f.actor.system.customization={mode:'modified'},
    f=>f.actor.system.weapons=[{id:'GUN'}],
    f=>f.actor.system.stockSourceEntryKey=f.entry.sourceEntryKey,
    f=>f.actor.items=[{id:'embedded-weapon'}],
    f=>f.actor.name='Not the original source',
    f=>f.actor.img='icons/svg/sword.svg',
    f=>f.actor.system.hp.value=-1,
    f=>f.actor.system.hp.value=f.actor.system.hp.max+1
  ];
  for(const fn of mutations){
    const f=fixture();
    fn(f);
    // Real native sources are immutable snapshots, so source edits must be
    // reflected in their toObject() result before they can be compared.
    const x=await check(f);
    assert.equal(x.status,CP23C4B_STATUS.DENIED,fn.toString());
    assert.equal(x.verifiedInstallationReceipt,false);
    assert.equal(x.foundryStockAttackTrusted,false);
  }
});
test('GM identity/world Actor changes while pack read is pending deny provenance',async()=>{
  const f=fixture();
  f.game.packs.get=()=>({documentName:'Actor',getDocument:async()=>{
    f.game.actors.get=()=>null;
    return f.native;
  }});
  assert.equal((await check(f)).reason,'WORLD_ACTOR_OR_GM_CHANGED_DURING_NATIVE_READ');
  const g=fixture();
  g.game.packs.get=()=>({documentName:'Actor',getDocument:async()=>{
    g.game.users.activeGM.id='differentGM';
    return g.native;
  }});
  assert.equal((await check(g)).reason,'WORLD_ACTOR_OR_GM_CHANGED_DURING_NATIVE_READ');
});

test('claimed receipts from flags, settings, forged signatures or stale version are NEVER verified',()=>{
  const f=fixture();
  const forged=[
    {state:'VERIFIED',actorId:f.actor.id,sourceId:f.native.id},
    {status:'AUTHENTICATED',version:'CP23C4B',physicalMountCertified:true},
    {signature:'anything',nativePackSha:'any',allowed:true},
    {legacyObservation:{sequence:1,authenticatedSourceInstallation:false}},
    null
  ];
  for(const receipt of forged){
    const decision=verifyCP23C4BClaimedReceipt(receipt,f.actor,f.game);
    assert.equal(decision.status,CP23C4B_STATUS.DENIED);
    assert.equal(decision.reason,'VERIFIED_RECEIPT_ISSUER_NOT_DEPLOYED');
    assert.equal(decision.verifiedInstallationReceipt,false);
    assert.equal(decision.foundryStockAttackTrusted,false);
  }
});

test('catalogue derives from immutable CP23B/C3 stage and no pack/receipt issuer is registered',()=>{
  const expected=JSON.parse(readFileSync(root+
    '/data/audits/vehicles/swse-sotg-cp23c3-unregistered-native-stage.json','utf8'));
  assert.equal(CP23C4B_WORLD_ANCHORS.stageManifestGitBlobSha,
    '6c3e3ded146a300c4d16af66b9db2cff7e88145e');
  assert.equal(CP23C4B_WORLD_ANCHORS.cp23BProposalGitBlobSha,
    'a9170481f9c0bb34fe31741b7194ac54e2933501');
  assert.deepEqual(CP23C4B_WORLD_ANCHORS.entries.map(x=>x.sourceDocumentGitBlobSha),
    expected.stagedDocuments.map(x=>x.stagedJsonGitBlobSha));
  const sys=JSON.parse(readFileSync(root+'/system.json','utf8'));
  assert.equal(sys.packs?.some(p=>p.name==='sotg-canonical-stock-source'),false);
  const verifier=readFileSync(root+
    '/scripts/domain/vehicles/vehicle-cp23c4b-world-binding.js','utf8');
  assert.doesNotMatch(verifier,/game\.settings\.set|ActorEngine\.updateActor|createEmbeddedDocuments/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {
  CP23C4_NAMESPACE,CP23C4_KEY,CP23C4_SCHEMA,
  emptyCP23C4Ledger,registerCP23C4ObservationSetting,
  readCP23C4ObservationLedger,recordCP23C4UnverifiedImport,
  validateCP23C4Ledger
} from '../scripts/domain/vehicles/vehicle-cp23c4-gm-observation-ledger.js';
import {CP22_SOTG_REFERENCE_CATALOG}
 from '../scripts/domain/vehicles/vehicle-cp22-source-catalog.generated.js';
import {TRUSTED_STOCK_WEAPON_GROUP_COUNT,resolveTrustedStockAttackGroup}
 from '../scripts/domain/vehicles/vehicle-stock-attack-authority.js';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const candidate=CP22_SOTG_REFERENCE_CATALOG.legacyPackCandidates[0];
const copy=x=>structuredClone(x);
function fixture(){
  const registers=new Map();
  let store=emptyCP23C4Ledger(),writeCount=0;
  const packId=CP23C4_NAMESPACE+'.'+candidate.packName;
  const sourceDocument={
    id:candidate.documentId,name:candidate.name,
    type:'vehicle',pack:packId,system:{sourcebook:'',page:null,weapons:[]}
  };
  const actor={id:'worldActor1',type:'vehicle',name:'Imported ship',
    system:{stockSourceEntryKey:candidate.sourceEntryKey},items:[]};
  const game={
    system:{id:CP23C4_NAMESPACE},
    world:{id:'world_test_1'},
    user:{id:'activeGM',isGM:true},
    users:{activeGM:{id:'activeGM'}},
    actors:{get:id=>id===actor.id?actor:null},
    packs:{get:key=>key===packId?{
      getDocument:async id=>id===sourceDocument.id?sourceDocument:null
    }:null},
    settings:{
      settings:{has:key=>registers.has(key)},
      register:(namespace,key,def)=>{assert.equal(namespace,CP23C4_NAMESPACE);registers.set(namespace+'.'+key,def);},
      get:(namespace,key)=>{assert.ok(registers.has(namespace+'.'+key));return copy(store);},
      set:async(namespace,key,value)=>{
        assert.equal(namespace+'.'+key,CP23C4_NAMESPACE+'.'+CP23C4_KEY);
        writeCount++;
        store=copy(value);
      }
    }
  };
  const args={actor,sourceDocument,packName:candidate.packName,mode:'replace',game};
  return {game,actor,sourceDocument,args,registers,store:()=>copy(store),
    inject:value=>{store=copy(value);},writes:()=>writeCount};
}
test('CP23-C4 adds one hidden world setting; it never registers a source pack or actor flag',()=>{
  const f=fixture();
  assert.equal(registerCP23C4ObservationSetting(f.game),true);
  assert.equal(registerCP23C4ObservationSetting(f.game),true);
  const def=f.registers.get(CP23C4_NAMESPACE+'.'+CP23C4_KEY);
  assert.equal(f.registers.size,1);
  assert.equal(def.scope,'world');
  assert.equal(def.config,false);
  assert.equal(def.type,Object);
  assert.equal(def.default.schema,CP23C4_SCHEMA);
  assert.deepEqual(def.default,emptyCP23C4Ledger());
  assert.equal(validateCP23C4Ledger(def.default),true);
  assert.equal(TRUSTED_STOCK_WEAPON_GROUP_COUNT,0);
});
test('a genuine native legacy pack reference can record ONLY an untrusted observation',async()=>{
  const f=fixture();registerCP23C4ObservationSetting(f.game);
  const outcome=await recordCP23C4UnverifiedImport(f.args);
  assert.equal(outcome.status,'UNVERIFIED_OBSERVATION_RECORDED');
  assert.equal(outcome.authenticatedSourceInstallation,false);
  assert.equal(outcome.durableVerifiedSourceReceipt,false);
  assert.equal(outcome.foundryStockAttackTrusted,false);
  assert.equal(f.writes(),1);
  const log=f.store();
  assert.equal(log.revision,1);
  assert.equal(log.observations.length,1);
  const event=log.observations[0];
  assert.equal(event.state,'UNVERIFIED_LEGACY_NATIVE_IMPORT');
  assert.equal(event.actorId,f.actor.id);
  assert.equal(event.worldId,'world_test_1');
  assert.equal(event.gmUserId,'activeGM');
  assert.equal(event.candidateSourceKey,candidate.sourceEntryKey);
  assert.equal(event.packName,candidate.packName);
  assert.equal(event.sourceDocumentId,candidate.documentId);
  assert.equal(event.authenticatedSourceInstallation,false);
  assert.equal(event.durableVerifiedSourceReceipt,false);
  assert.equal(event.foundryStockAttackTrusted,false);
  const read=readCP23C4ObservationLedger(f.game);
  assert.equal(read.status,'UNVERIFIED_OBSERVATIONS_ONLY');
  assert.equal(read.authenticatedSourceInstallation,false);
  read.observations[0].state='FORGED_TRUST';
  assert.equal(f.store().observations[0].state,'UNVERIFIED_LEGACY_NATIVE_IMPORT');
  assert.equal(resolveTrustedStockAttackGroup(f.actor,{id:'fakeWeapon'}),null);
});
test('only active GM may write a world observation; passive GM and player cannot',async()=>{
  for(const change of [
    f=>f.game.user.isGM=false,
    f=>f.game.user.id='passiveGM',
    f=>f.game.users.activeGM=null,
    f=>f.game.world=null,
    f=>f.game.system.id='wrong-system'
  ]){
    const f=fixture();registerCP23C4ObservationSetting(f.game);change(f);
    const x=await recordCP23C4UnverifiedImport(f.args);
    assert.equal(x.status,'DENIED');
    assert.equal(x.reason,'ACTIVE_GM_WORLD_REQUIRED');
    assert.equal(f.writes(),0);
  }
});
test('forged pack, copied source document, unsupported actor or wrong mode are denied',async()=>{
  const checks=[
    f=>f.args.mode='other',
    f=>f.args.mode='',
    f=>f.game.actors.get=()=>null,
    f=>f.actor.type='npc',
    f=>f.sourceDocument.id='counterfeit',
    f=>f.args.packName='not-an-observed-native-pack',
    f=>f.sourceDocument.pack='forged.local',
    f=>f.game.packs.get=()=>null,
    f=>f.game.packs.get=()=>({getDocument:async()=>({...f.sourceDocument})}),
  ];
  for(const alter of checks){
    const f=fixture();registerCP23C4ObservationSetting(f.game);alter(f);
    const status=await recordCP23C4UnverifiedImport(f.args);
    assert.equal(status.status,'DENIED');
    assert.equal(f.writes(),0);
  }
});
test('world actor / GM identity changes during async pack read invalidate observation',async()=>{
  const f=fixture();registerCP23C4ObservationSetting(f.game);
  f.game.packs.get=()=>({getDocument:async()=>{
    f.game.actors.get=()=>null;
    return f.sourceDocument;
  }});
  const o=await recordCP23C4UnverifiedImport(f.args);
  assert.equal(o.reason,'WORLD_IDENTITY_CHANGED_DURING_READ');
  assert.equal(f.writes(),0);
});
test('concurrent local observations are serialized with monotonically increasing sequence',async()=>{
  const f=fixture();registerCP23C4ObservationSetting(f.game);
  const r=await Promise.all(Array.from({length:5},()=>recordCP23C4UnverifiedImport(f.args)));
  assert.deepEqual(r.map(x=>x.sequence),[1,2,3,4,5]);
  assert.equal(f.store().revision,5);
  assert.deepEqual(f.store().observations.map(x=>x.sequence),[1,2,3,4,5]);
  assert.equal(f.writes(),5);
});
test('invalid data, attempted promotions and setting storage failure never become source authority',async()=>{
  {
    const f=fixture();registerCP23C4ObservationSetting(f.game);
    f.inject({schema:CP23C4_SCHEMA,revision:1,observations:[{
      state:'AUTHENTICATED',sequence:1,foundryStockAttackTrusted:true
    }]});
    const deny=await recordCP23C4UnverifiedImport(f.args);
    assert.equal(deny.status,'DENIED');
    assert.equal(deny.reason,'INVALID_OR_UNREGISTERED_WORLD_LEDGER');
    assert.equal(readCP23C4ObservationLedger(f.game).status,'DENIED');
    assert.equal(f.writes(),0);
  }
  {
    const f=fixture();registerCP23C4ObservationSetting(f.game);
    f.game.settings.set=async()=>{throw Error('disk failed');};
    const deny=await recordCP23C4UnverifiedImport(f.args);
    assert.equal(deny.reason,'WORLD_LEDGER_WRITE_FAILED');
    assert.equal(deny.foundryStockAttackTrusted,false);
  }
  {
    const f=fixture();registerCP23C4ObservationSetting(f.game);
    f.game.settings.set=async()=>{}; // Pretends to write but does not
    const deny=await recordCP23C4UnverifiedImport(f.args);
    assert.equal(deny.reason,'POST_WRITE_WORLD_LEDGER_READBACK_MISMATCH');
  }
});
test('CP23-C4 is wired after ActorEngine import but never changes ActorEngine or stock authority',()=>{
  const idx=readFileSync(join(root,'index.js'),'utf8');
  const wiz=readFileSync(join(root,'scripts/apps/vehicle-import-wizard.js'),'utf8');
  const importer=readFileSync(join(root,'scripts/engine/import/vehicle-import-engine.js'),'utf8');
  const authority=readFileSync(join(root,'scripts/domain/vehicles/vehicle-stock-attack-authority.js'),'utf8');
  assert.match(idx,/registerCP23C4ObservationSetting\(\)/);
  assert.ok(wiz.indexOf('await VehicleImportEngine.apply') <
    wiz.indexOf('await recordCP23C4UnverifiedImport'));
  assert.match(wiz,/recordCP23C4UnverifiedImport/);
  assert.doesNotMatch(importer,/CP23C4|cp23c4/);
  assert.equal(TRUSTED_STOCK_WEAPON_GROUP_COUNT,0);
  assert.match(authority,/return null/);
});

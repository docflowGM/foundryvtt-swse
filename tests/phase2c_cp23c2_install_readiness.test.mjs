import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,cpSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {CP23C2_STATUS,assessCP23C2ConfigurationParity,
  inspectCP23C2NativeInstallCandidate}
 from '../scripts/domain/vehicles/vehicle-cp23c2-installation-preflight.js';
import {buildCP23C2Readiness,DRAFT_PATH,ANCHOR_PATH,OUTPUT}
 from '../tools/audits/vehicles/build_sotg_cp23c2_readiness.mjs';
import {TRUSTED_STOCK_WEAPON_GROUP_COUNT,resolveTrustedStockAttackGroup}
 from '../scripts/domain/vehicles/vehicle-stock-attack-authority.js';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const read=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
const M=read(DRAFT_PATH);
const report=read(OUTPUT);
const clone=x=>structuredClone(x);
const fixture=(i=0)=>{
  const proposal=M.proposals[i];
  const actor={...clone(proposal.draftActor),id:proposal.draftActor._id,items:[]};
  return {proposal,actor};
};
const preflight=({proposal,actor,sourceDocument,mode='replace',game}={})=>
  inspectCP23C2NativeInstallCandidate({proposal,actor,sourceDocument,mode,game});

test('all 15 owner-approved source drafts retain distinct identities and no outside-Actor receipt',()=>{
  assert.deepEqual(buildCP23C2Readiness(root),report);
  assert.equal(report.sourceIdentityCount,15);
  assert.equal(report.records.length,15);
  assert.equal(report.issueableGMReceipts,0);
  assert.equal(report.installedNativeActorsCertified,0);
  assert.equal(report.registeredPackIsPresentInSystemManifest,false);
  assert.equal(report.stockAttackPermissions,0);
  assert.equal(report.completeCP23C2,false);
  assert.equal(TRUSTED_STOCK_WEAPON_GROUP_COUNT,0);
  assert.equal(new Set(report.records.map(x=>x.sourceEntryKey)).size,15);
  for(const [i,p] of M.proposals.entries()){
    assert.equal(report.records[i].sourceEntryKey,p.sourceEntryKey);
    assert.equal(report.records[i].registeredPackProvenance,'NOT_REGISTERED');
    assert.equal(report.records[i].GMOwnedReceipt,'NOT_ISSUED');
    assert.equal(report.records[i].stockAttackAuthorized,false);
    const status=assessCP23C2ConfigurationParity(p,fixture(i).actor);
    assert.equal(status.status,CP23C2_STATUS.EXACT);
    assert.equal(status.canonicalSourceBindingAuthenticated,false);
    assert.equal(status.durableGMWorldReceiptIssued,false);
    assert.equal(status.foundryStockAttackTrusted,false);
  }
});

test('only current HP, temporary HP and current shields may vary within explicit bounds',()=>{
  const {proposal,actor}=fixture();
  assert.equal(proposal.draftActor.system.hp.value,125);
  assert.equal(proposal.draftActor.system.shields.value,30);
  actor.system.hp.value=1;
  actor.system.hp.temp=3;
  actor.system.shields.value=0;
  const state=assessCP23C2ConfigurationParity(proposal,actor);
  assert.equal(state.status,CP23C2_STATUS.TRANSIENT);
  assert.deepEqual(state.permittedTransientPaths,
    ['system.hp.value','system.hp.temp','system.shields.value']);
  assert.equal(state.foundryStockAttackTrusted,false);
  assert.equal(state.actorMutationAllowed,false);
  assert.equal(state.productionHydrationPermitted,false);
  const again=assessCP23C2ConfigurationParity(proposal,fixture().actor);
  assert.equal(again.status,CP23C2_STATUS.EXACT);
});

test('out-of-range HP/shields and nonexistent previously silent state fields do not pass',()=>{
  const p=M.proposals[0];
  const attacks=[
    a=>a.system.hp.value=-1,
    a=>a.system.hp.value=a.system.hp.max+1,
    a=>a.system.hp.value='100',
    a=>a.system.hp.temp=-1,
    a=>a.system.hp.temp=1.5,
    a=>a.system.shields.value=31,
    a=>a.system.shields.value=NaN,
    a=>{delete a.system.hp.value;},
    a=>{delete a.system.shields.value;},
    a=>{a.system.hp.max+=1;},
    a=>{a.system.shields.max+=1;}
  ];
  for(const change of attacks){
    const a=fixture().actor;change(a);
    const s=assessCP23C2ConfigurationParity(p,a);
    assert.notEqual(s.status,CP23C2_STATUS.EXACT,change.toString());
    assert.notEqual(s.status,CP23C2_STATUS.TRANSIENT,change.toString());
    assert.equal(s.foundryStockAttackTrusted,false);
  }
  const noShield=M.proposals.find(x=>!Object.hasOwn(x.draftActor.system,'shields'));
  assert.ok(noShield);
  const a={...clone(noShield.draftActor),items:[],id:noShield.draftActor._id};
  a.system.shields={value:0,max:0};
  assert.equal(assessCP23C2ConfigurationParity(noShield,a).status,CP23C2_STATUS.DRIFT);
});

test('configuration changes, installed weapons, owned Items, clones and editable spoofed flags invalidate parity',()=>{
  const {proposal}=fixture();
  const alterations=[
    a=>a.system.initiative=999,
    a=>a.system.reflexDefense=0,
    a=>a.system.shipyard={type:'modified'},
    a=>a.system.installedSystems=[{id:'engine'}],
    a=>a.system.crewPositions={pilot:'someone'},
    a=>a.system.abilities={dex:50},
    a=>a.system.weapons.push({name:'forged stock laser'}),
    a=>a.system.stockSourceEntryKey=proposal.sourceEntryKey,
    a=>a.system.provenance={owner:'GM'},
    a=>a.system.hp={value:50,max:1,temp:1},
    a=>a.items.push({id:'mounted gun'}),
    a=>a.name='New Name',
    a=>a._id='different-record',
    a=>a.id='different-record',
    a=>a.img='icons/svg/d20.svg',
    a=>a.type='character'
  ];
  for(const change of alterations){
    const x=fixture().actor;change(x);
    const result=assessCP23C2ConfigurationParity(proposal,x);
    assert.equal(result.status,CP23C2_STATUS.DRIFT,change.toString());
    assert.equal(result.canonicalSourceBindingAuthenticated,false);
    assert.equal(result.foundryStockAttackTrusted,false);
  }
});

test('malformed drafts and non-document candidates fail closed',()=>{
  const p=clone(M.proposals[0]);p.physicalMountCertified=true;
  const outcome=assessCP23C2ConfigurationParity(p,fixture().actor);
  assert.equal(outcome.status,CP23C2_STATUS.INVALID);
  assert.equal(outcome.durableGMWorldReceiptIssued,false);
  assert.equal(assessCP23C2ConfigurationParity(M.proposals[0],{}).status,CP23C2_STATUS.INVALID);
});

test('native pack preflight denies unknown GM, forged Actor world membership, merge, and missing pack',async()=>{
  const {proposal,actor}=fixture();
  const name='foundryvtt-swse.sotg-cp23b-isolated-proposals';
  const sourceDocument={...clone(proposal.draftActor),id:proposal.draftActor._id,
    pack:name,items:[]};
  const game={user:{id:'gm',isGM:true},system:{id:'foundryvtt-swse'},
    actors:{get:id=>id===actor.id?actor:null},
    packs:{get:()=>null}};
  const check=async overrides=>preflight({proposal,actor,sourceDocument,game,...overrides});
  assert.equal((await check()).reason,'CANONICAL_SOURCE_PACK_NOT_REGISTERED');
  assert.equal((await check({mode:'merge'})).reason,'REPLACE_REQUIRED');
  assert.equal((await check({game:{...game,user:{id:'p',isGM:false}}})).reason,'GM_CONTEXT_REQUIRED');
  assert.equal((await check({game:{...game,actors:{get:()=>null}}})).reason,'ACTOR_NOT_AUTHENTICATED_IN_WORLD');
  assert.equal((await check({sourceDocument:{...sourceDocument,id:'fake'}})).reason,'SOURCE_DOCUMENT_NOT_EXPECTED_PROPOSAL');
});

test('even a mock fully matching pack and GM world cannot mint provenance or stock authority',async()=>{
  const {proposal,actor}=fixture();
  const full='foundryvtt-swse.sotg-cp23b-isolated-proposals';
  const sourceDocument={...clone(proposal.draftActor),id:proposal.draftActor._id,
    pack:full,items:[]};
  const game={user:{id:'gm',isGM:true},system:{id:'foundryvtt-swse'},
    actors:{get:id=>id===actor.id?actor:null},
    packs:{get:key=>key===full?{getDocument:async id=>id===sourceDocument.id?sourceDocument:null}:null}};
  const result=await preflight({proposal,actor,sourceDocument,game});
  assert.equal(result.status,'CP23C2_OBSERVATION_ONLY');
  assert.equal(result.observedNativePackSnapshot,true);
  assert.equal(result.canonicalSourceBindingAuthenticated,false);
  assert.equal(result.durableGMWorldReceiptIssued,false);
  assert.equal(result.foundryStockAttackTrusted,false);
  assert.equal(resolveTrustedStockAttackGroup(actor,{id:'spoofed'}),null);
  actor.system.hp.value=10;
  assert.equal((await preflight({proposal,actor,sourceDocument,game})).configurationParity,
    CP23C2_STATUS.TRANSIENT);
  actor.system.weapons.push({id:'gun'});
  assert.equal((await preflight({proposal,actor,sourceDocument,game})).reason,
    'WORLD_ACTOR_CONFIGURATION_NOT_APPROVED_DRAFT');
  const x=fixture().actor;
  const fake={...sourceDocument};
  const nonIdentical=await preflight({proposal,actor:x,sourceDocument:fake,
    game:{...game,actors:{get:id=>id===x.id?x:null}}});
  assert.equal(nonIdentical.reason,'NATIVE_SOURCE_DOCUMENT_IDENTITY_DRIFT');
});

test('preflight manifest detects source drift and cannot deploy registered pack',()=>{
  const result=spawnSync(process.execPath,[
    'tools/audits/vehicles/build_sotg_cp23c2_readiness.mjs','--check'
  ],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stdout+result.stderr);
  const tmp=mkdtempSync(join(tmpdir(),'cp23c2-'));
  try{
    for(const p of [DRAFT_PATH,ANCHOR_PATH,'system.json']){
      mkdirSync(join(tmp,p.split('/').slice(0,-1).join('/')),{recursive:true});
      cpSync(join(root,p),join(tmp,p));
    }
    assert.deepEqual(buildCP23C2Readiness(tmp),report);
    const path=join(tmp,'system.json');
    const sys=JSON.parse(readFileSync(path,'utf8'));
    sys.packs.push({name:'sotg-cp23b-isolated-proposals',path:'unsafe'});
    writeFileSync(path,JSON.stringify(sys),'utf8');
    assert.throws(()=>buildCP23C2Readiness(tmp),/PROPOSAL_PACK_REGISTERED/);
  }finally{rmSync(tmp,{recursive:true,force:true});}
});

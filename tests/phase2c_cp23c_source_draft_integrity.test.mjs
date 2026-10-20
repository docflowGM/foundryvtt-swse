import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,cpSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {canonicalCP23CJson,draftCP23CSnapshot,evaluateCP23CDraftParity,CP23C_RECEIPT_STATE}
 from '../scripts/domain/vehicles/vehicle-cp23c-source-integrity.js';
import {fnv64UTF16,buildCP23CSourceIntegrity,INPUT_PATH,OUTPUT_PATH}
 from '../tools/audits/vehicles/build_sotg_cp23c_integrity_anchors.mjs';
import {TRUSTED_STOCK_WEAPON_GROUP_COUNT}
 from '../scripts/domain/vehicles/vehicle-stock-attack-authority.js';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const drafts=JSON.parse(readFileSync(join(root,INPUT_PATH),'utf8'));
const ledger=JSON.parse(readFileSync(join(root,OUTPUT_PATH),'utf8'));
const clone=value=>structuredClone(value);
const makeActor=proposal=>({...clone(proposal.draftActor),items:[]});
const probe=(proposal,mutate)=>{const actor=makeActor(proposal);mutate?.(actor);
  return evaluateCP23CDraftParity(proposal,actor);};

test('all fifteen anchored CP23B source proposals have exact conservative parity but no installed status',()=>{
  assert.deepEqual(buildCP23CSourceIntegrity({repoRoot:root}),ledger);
  assert.equal(ledger.sourceCount,15);
  assert.equal(ledger.authenticatedInstallations,0);
  assert.equal(ledger.durableWorldReceiptsIssued,0);
  assert.equal(ledger.foundryStockAttackGrants,0);
  assert.equal(ledger.physicalMountCertificatesAdded,0);
  assert.equal(ledger.liveFoundryV13ActorInstallations,0);
  assert.equal(ledger.registeredProposalPack,false);
  assert.equal(TRUSTED_STOCK_WEAPON_GROUP_COUNT,0);
  for(const [i,proposal] of drafts.proposals.entries()){
    const anchor=ledger.entries[i];
    const snapshot=draftCP23CSnapshot(proposal);
    assert.equal(anchor.queuePosition,i+1);
    assert.equal(anchor.sourceEntryKey,proposal.sourceEntryKey);
    assert.equal(anchor.isolationId,proposal.draftActor._id);
    assert.equal(anchor.canonicalDraftFingerprintFnv64,
      fnv64UTF16(canonicalCP23CJson(snapshot.sourceActor)));
    assert.equal(anchor.receiptIssueAllowed,false);
    assert.deepEqual(anchor.unresolvedBlockers,[
      'NOT_IN_REGISTERED_CANONICAL_FOUNDRY_PACK',
      'NO_VERIFIED_INSTALL_TRANSACTION',
      'NO_MECHANICAL_MOUNT_CERTIFICATE',
      'MUTATION_LIFECYCLE_E2E_NOT_VERIFIED']);
    const outcome=probe(proposal);
    assert.equal(outcome.state,CP23C_RECEIPT_STATE.MATCH);
    assert.equal(outcome.sourceInstalled,false);
    assert.equal(outcome.stockAttackTrusted,false);
    assert.equal(outcome.physicalMountCertified,false);
    assert.equal(outcome.productionHydrationPermitted,false);
  }
});

test('mutation of ANY draft system / owned Item / actor identity is fail-closed',()=>{
  const proposal=drafts.proposals[0];
  const cases=[
    a=>a.system.initiative=999,
    a=>a.system.hp.value-=1,
    a=>a.system.hp.max+=1,
    a=>a.system.shields.value-=1,
    a=>a.system.shieldRating+=10,
    a=>a.system.reflexDefense+=1,
    a=>a.system.attributes.dex.base+=2,
    a=>a.system.vehicleCrewCount=2,
    a=>a.system.crewPositions={pilot:'arbitrary'},
    a=>a.system.shipyard={unapproved:true},
    a=>a.system.modificationData={mode:'modified'},
    a=>a.system.weapons=[{id:'forged',name:'Laser',attackBonus:999}],
    a=>a.system.stockSourceEntryKey=proposal.sourceEntryKey,
    a=>a.items.push({id:'weapon-x',type:'vehicle-weapon',system:{mountId:'fake'}}),
    a=>a._id='another-actor-id',
    a=>a.name='Renamed Fighter',
    a=>a.img='icons/svg/d20.svg'
  ];
  for(const fn of cases){
    const result=probe(proposal,fn);
    assert.equal(result.state,CP23C_RECEIPT_STATE.DRIFT,fn.toString());
    assert.equal(result.sourceInstalled,false);
    assert.equal(result.stockAttackTrusted,false);
    assert.equal(result.physicalMountCertified,false);
  }
});

test('unknown and forged source proposals are rejected without fallback trust',()=>{
  const input=drafts.proposals[0];
  for(const mutate of [
    p=>p.draftActor.system.weapons=[{name:'cannon'}],
    p=>p.draftActor.system.stockSourceEntryKey=p.sourceEntryKey,
    p=>p.physicalMountCertified=true,
    p=>p.stockAttackTrusted=true,
    p=>p.releaseDeploymentPermitted=true,
    p=>p.provenanceAuthentication='TRUSTED',
    p=>p.nativeV13Roundtrip='SUCCESS',
    p=>p.draftActor._id='not16',
    p=>p.draftActor.name='forged',
    p=>p.draftActor.system.page=999
  ]){
    const forged=clone(input);mutate(forged);
    const status=evaluateCP23CDraftParity(forged,makeActor(forged));
    assert.equal(status.state,CP23C_RECEIPT_STATE.INVALID);
    assert.equal(status.stockAttackTrusted,false);
  }
  assert.equal(evaluateCP23CDraftParity(input,{id:'mock'}).state,
    CP23C_RECEIPT_STATE.INVALID);
});

test('canonical JSON ignores key insertion order but retains arrays and catches unsupported states',()=>{
  assert.equal(canonicalCP23CJson({b:1,a:{z:2,c:3}}),
    canonicalCP23CJson({a:{c:3,z:2},b:1}));
  assert.notEqual(canonicalCP23CJson({a:[1,2]}),canonicalCP23CJson({a:[2,1]}));
  assert.throws(()=>canonicalCP23CJson({a:undefined}),/CP23C_UNDEFINED/);
  assert.throws(()=>canonicalCP23CJson({a:NaN}),/CP23C_NONFINITE/);
});

test('input byte modification invalidates the CP23C source anchor regardless of matching draft actor',()=>{
  const temp=mkdtempSync(join(tmpdir(),'cp23c-drift-'));
  try{
    mkdirSync(join(temp,'data/audits/vehicles'),{recursive:true});
    cpSync(join(root,INPUT_PATH),join(temp,INPUT_PATH));
    assert.deepEqual(buildCP23CSourceIntegrity({repoRoot:temp}),ledger);
    const changed=join(temp,INPUT_PATH);
    const content=readFileSync(changed,'utf8');
    writeFileSync(changed,content.replace('"proposalCount": 15','"proposalCount": 14'),'utf8');
    assert.throws(()=>buildCP23CSourceIntegrity({repoRoot:temp}),/CP23B_SOURCE_PROPOSALS_CHANGED/);
  }finally{rmSync(temp,{force:true,recursive:true});}
});

test('CP23C builder check and central evidence authority are read-only',()=>{
  const t=spawnSync(process.execPath,[
    'tools/audits/vehicles/build_sotg_cp23c_integrity_anchors.mjs','--check'
  ],{cwd:root,encoding:'utf8'});
  assert.equal(t.status,0,t.stderr+t.stdout);
  const authority=readFileSync(join(root,'scripts/domain/vehicles/vehicle-evidence-authority.js'),'utf8');
  assert.match(authority,/evaluateCP23CDraftParity/);
  const runtime=readFileSync(join(root,'scripts/domain/vehicles/vehicle-cp23c-source-integrity.js'),'utf8');
  assert.doesNotMatch(runtime,/ActorEngine|game\.settings\.set|actor\.update|createEmbeddedDocuments/);
  assert.equal(TRUSTED_STOCK_WEAPON_GROUP_COUNT,0);
});

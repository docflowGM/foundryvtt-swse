import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,cpSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildCP23BProposals,OUTPUT_PATH}
  from '../tools/audits/vehicles/build_sotg_cp23b_proposals.mjs';
import {CP22_SOTG_REFERENCE_CATALOG}
  from '../scripts/domain/vehicles/vehicle-cp22-source-catalog.generated.js';
import {TRUSTED_STOCK_WEAPON_GROUP_COUNT,resolveTrustedStockAttackGroup}
  from '../scripts/domain/vehicles/vehicle-stock-attack-authority.js';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const committed=JSON.parse(readFileSync(join(root,OUTPUT_PATH),'utf8'));
const generated=buildCP23BProposals({repoRoot:root});
const get=n=>committed.proposals[n-1];

test('CP23-B proposals contain exactly the 15 approved source identities in order',()=>{
  assert.deepEqual(committed,generated);
  assert.equal(committed.proposalCount,15);
  assert.equal(committed.legacyCandidateCount,13);
  assert.equal(committed.proposals.filter(p=>p.legacyCandidate===null).length,2);
  assert.deepEqual(committed.proposals.filter(p=>!p.legacyCandidate).map(p=>p.queuePosition),[7,8]);
  assert.equal(new Set(committed.proposals.map(p=>p.sourceEntryKey)).size,15);
  assert.equal(new Set(committed.proposals.map(p=>p.draftActor._id)).size,15);
  for(const [i,p] of committed.proposals.entries()){
    const src=CP22_SOTG_REFERENCE_CATALOG.records[i];
    assert.equal(p.queuePosition,i+1);
    assert.equal(p.sourceEntryKey,src.sourceEntryKey);
    assert.equal(p.decisionId,src.approvedDecision.decisionId);
    assert.equal(p.draftActor._id,'sotgcp23b'+String(i+1).padStart(7,'0'));
    assert.equal(p.draftActor.name,src.printedName);
    assert.equal(p.draftActor.system.sourcebook,'Starships of the Galaxy');
    assert.equal(p.draftActor.system.page,src.printedPage);
    assert.deepEqual(p.originalWeaponGroupEvidence,src.originalAttackGroups);
    assert.equal(p.sourceWeaponGroupCount,p.sourceWeaponGroupEvidence.length);
    assert.equal(p.draftActor.type,'vehicle');
    assert.equal(p.draftState,'NOT_DEPLOYABLE_SOURCE_PROPOSAL_ONLY');
  }
});

test('approved CP21 effective values projected from the existing book source, never from legacy Actor',()=>{
  assert.equal(get(1).draftActor.system.initiative,12);
  assert.equal(get(1).draftActor.system.hp.max,125);
  assert.equal(get(1).draftActor.system.shieldRating,30);
  assert.equal(get(2).draftActor.system.initiative,-2);
  assert.deepEqual(get(2).sourceWeaponGroupEvidence.slice(3).map(r=>r.attackBonus),[14,12]);
  assert.equal(get(3).draftActor.system.flatFooted,14);
  assert.equal(get(4).sourceWeaponGroupEvidence[1].areaPrintedWeaponRow,'3x3 starship squares');
  assert.equal(get(4).originalWeaponGroupEvidence[1].areaPrintedWeaponRow,'4x4 starship squares');
  assert.equal(get(5).draftActor.system.initiative,2);
  assert.equal(get(6).draftActor.system.initiative,6);
  assert.equal(get(8).approvedPolicies[0].detail.ammoTypeEquivalence,'UNRESOLVED');
  assert.equal(get(9).approvedPolicies[0].detail.conditionalAttackBonus,-5);
  assert.equal(get(10).approvedEffectiveFacts.sensesPerception,6);
  assert.equal(get(11).draftActor.system.initiative,4);
  assert.equal(get(12).sourceWeaponGroupEvidence[1].weaponLabel,'heavy proton torpedoes');
  assert.equal(get(12).approvedEffectiveFacts.payload,'12 heavy proton torpedoes');
  assert.equal(get(14).approvedPolicies[0].detail.jammer.damageAttack,false);
  assert.equal(Object.hasOwn(get(15).originalWeaponGroupEvidence[0],'hardwareCount'),false);
  assert.equal(get(15).sourceWeaponGroupEvidence[0].hardwareCount,1);
  assert.equal(get(15).draftActor.system.weapons.length,0);
});

test('every isolated proposal denies production and runtime authority even when source attack groups exist',()=>{
  assert.equal(committed.canonicalPackBindingsAuthenticated,0);
  assert.equal(committed.physicalMountCertificationsIssued,0);
  assert.equal(committed.trustedStockAttacksAdded,0);
  assert.equal(committed.productionPackFilesChanged,false);
  assert.equal(committed.releaseDeploymentPermitted,false);
  assert.equal(committed.nativeFoundryV13RoundtripCompleted,false);
  assert.equal(TRUSTED_STOCK_WEAPON_GROUP_COUNT,0);
  for(const p of committed.proposals){
    assert.equal(p.draftActor.system.weapons.length,0);
    assert.equal(p.draftActor.system.vehicleArmamentSourceStatus,'SOURCE_ATTACK_GROUPS_NOT_INSTALLED_OR_CERTIFIED');
    assert.equal(p.installedWeaponsCertified,0);
    assert.equal(p.physicalMountCertified,false);
    assert.equal(p.stockAttackTrusted,false);
    assert.equal(p.releaseDeploymentPermitted,false);
    assert.equal(p.nativeV13Roundtrip,'NOT_EXECUTED');
    assert.equal(p.provenanceAuthentication,'NOT_VERIFIED');
    assert.equal(p.worldActorCreation,'NOT_EXECUTED');
    assert.equal(Object.hasOwn(p.draftActor.system,'stockSourceEntryKey'),false);
    assert.equal(Object.hasOwn(p.draftActor.system,'weaponGroupKey'),false);
    assert.equal(Object.hasOwn(p.draftActor.system,'stockSourceClaimVersion'),false);
    assert.equal(resolveTrustedStockAttackGroup(p.draftActor,{id:'fake-weapon'}),null);
    assert.ok(p.sourceWeaponGroupCount>0);
  }
});

test('unknown or unprinted source values stay unknown rather than zeroed',()=>{
  const tye=get(5);
  assert.equal(Object.hasOwn(tye.draftActor.system,'shieldRating'),false);
  assert.equal(Object.hasOwn(tye.draftActor.system,'shields'),false);
  assert.equal(Object.hasOwn(tye.draftActor.system,'hyperdrive_class'),false);
  assert.equal(Object.hasOwn(tye.draftActor.system,'stockSourceEntryKey'),false);
  assert.equal(Object.hasOwn(get(15).originalWeaponGroupEvidence[0],'hardwareCount'),false);
  const arc=get(13);
  assert.equal(Object.hasOwn(arc.originalWeaponGroupEvidence[0],'sourcePage'),false);
  assert.equal(Object.hasOwn(arc.sourceWeaponGroupEvidence[0],'sourcePage'),false);
});

test('exact output regeneration and immutable CP22/CP23A anchor checks',()=>{
  const check=spawnSync(process.execPath,['tools/audits/vehicles/build_sotg_cp23b_proposals.mjs','--check'],{cwd:root,encoding:'utf8'});
  assert.equal(check.status,0,check.stdout+'\n'+check.stderr);
  const tmp=mkdtempSync(join(tmpdir(),'cp23b-test-'));
  try{
    for(const p of [
      'scripts/domain/vehicles/vehicle-cp22-source-catalog.generated.js',
      'data/audits/vehicles/swse-sotg-cp23-source-pack-reconciliation.json']){
      mkdirSync(join(tmp,p.split('/').slice(0,-1).join('/')),{recursive:true});
      cpSync(join(root,p),join(tmp,p));
    }
    assert.deepEqual(buildCP23BProposals({repoRoot:tmp}),committed);
    const altered=join(tmp,'data/audits/vehicles/swse-sotg-cp23-source-pack-reconciliation.json');
    writeFileSync(altered,readFileSync(altered,'utf8').replace('"sourceIdentityCount": 15','"sourceIdentityCount": 16'),'utf8');
    assert.throws(()=>buildCP23BProposals({repoRoot:tmp}),/PINNED_CP23A_RECONCILIATION_CHANGED/);
  }finally{rmSync(tmp,{recursive:true,force:true});}
});

test('CP23-B proposes source data only; production pack and import engine remain separate',()=>{
  const compiler=readFileSync(join(root,'tools/audits/vehicles/build_sotg_cp23b_proposals.mjs'),'utf8');
  const importer=readFileSync(join(root,'scripts/engine/import/vehicle-import-engine.js'),'utf8');
  assert.doesNotMatch(compiler,/compilePack|extractPack|ActorEngine.updateActor|\\.setFlag/);
  assert.doesNotMatch(importer,/CP23B|cp23b|sotgcp23b/);
  assert.match(compiler,/no production staging or deployment option exists/);
});

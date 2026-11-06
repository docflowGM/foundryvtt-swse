import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {join,dirname} from 'node:path';
import {
  validateEvidenceClaim,assessSourceCompleteness,decideArcDependentAttack,
  decideConflictedAttackValue,assessStrictMechanicalCertification,validateSupplementalCensus
} from '../tools/audits/vehicles/phase2c-authority-policy.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const overlay=JSON.parse(readFileSync(join(root,'data/audits/vehicles/swse-phase2c-cp3-318-census-overlay.json'),'utf8'));
const approvals=JSON.parse(readFileSync(join(root,'data/audits/vehicles/swse-phase2c-cp3-approved-decisions.json'),'utf8'));
const contract=JSON.parse(readFileSync(join(root,'data/audits/vehicles/swse-phase2c-cp3-authority-contract.json'),'utf8'));
const historicalKeys=Array.from({length:316},(_,i)=>`historic-test-only-${i}`); // fixture, not claimed to be actual Phase 1 keys
const scope={vehicleId:'ship1',attackId:'atk1',weaponGroupKey:'laser1',targetId:'target1'};
const context={verifiedUserIsGM:true,userId:'gm1',instanceId:'scene1'};
const override={...scope,approvedByUserId:'gm1',instanceId:'scene1',reason:'GM decision for this encounter',receiptId:'receipt1',selectedArc:'aft'};
const conflict={state:'PUBLISHED_CONFLICT',alternatives:[{value:7,sourceField:'Ranged',printedPage:67},{value:5,sourceField:'ion cannon detail',printedPage:67}]};

test('all three policies explicitly approved and not production-hydration authorization',()=>{
 assert.deepEqual(approvals.decisions.map(d=>d.id),['P2C-D01','P2C-D02','P2C-D03']);
 assert(approvals.decisions.every(d=>d.decision==='APPROVED'));
 assert.equal(approvals.productionMutationAuthorizedByThisCheckpoint,false);
 assert.equal(contract.runtimeIntegrationGuardrails.productionConsumerNotYetWired,true);
});
test('original 316 + exactly two unique append-only identities = 318',()=>{
 assert.equal(validateSupplementalCensus(historicalKeys,overlay).status,'APPROVED_SUPPLEMENTAL_CENSUS');
 assert.equal(overlay.supplementalEntries.length,2);
 assert.equal(overlay.supplementalEntries[1].configurationVariants.length,2);
});
test('reject roster collision, duplicate supplemental key or mutation flag',()=>{
 const x=structuredClone(overlay);x.supplementalEntries[0].sourceEntryKey=historicalKeys[0];
 assert.equal(validateSupplementalCensus(historicalKeys,x).status,'BLOCK');
 const y=structuredClone(overlay);y.existing316EntriesModified=1;
 assert.equal(validateSupplementalCensus(historicalKeys,y).status,'BLOCK');
});
test('Deep-X two named cannons do not become 2 attack groups or proven separate mounts',()=>{
 const [ship]=overlay.supplementalEntries;
 assert.equal(ship.attacks.length,1);assert.equal(ship.attacks[0].sourceGroupCount,1);
 assert.equal(ship.attacks[0].printedWeaponCount,2);
 assert.equal(ship.attacks[0].physicalMountTopology,'SOURCE_SILENT_CONFIRMED');
});
test('Hornet alternate loadout remains same published identity; hyperdrive is silent',()=>{
 const ship=overlay.supplementalEntries[1];
 assert.equal(ship.printedFacts.hyperdrive.evidenceState,'SOURCE_SILENT_CONFIRMED');
 assert.equal(ship.attacks.length,2);assert.equal(ship.configurationVariants.length,2);
 assert.equal(ship.configurationVariants[0].onNaturalOne.damageToOwnShip,'6d10x2');
 assert.equal(ship.configurationVariants[1].onNaturalOne,null);
});
test('numeric zero is a valid printed number, not absence',()=>{
 assert.equal(validateEvidenceClaim({state:'PRINTED_VALUE',value:0}).valid,true);
 assert.equal(validateEvidenceClaim({state:'EXPLICIT_NONE',value:0}).valid,false);
});
test('source silent does not silently become zero/null/none',()=>{
 assert.equal(validateEvidenceClaim({state:'SOURCE_SILENT_CONFIRMED'}).valid,true);
 assert.equal(validateEvidenceClaim({state:'SOURCE_SILENT_CONFIRMED',value:0}).valid,false);
 assert.equal(validateEvidenceClaim({state:'SOURCE_SILENT_CONFIRMED',value:null}).valid,false);
});
test('conditional published fact must have configuration scope',()=>{
 assert.equal(validateEvidenceClaim({state:'CONFIGURATION_CONDITIONAL',value:35}).valid,false);
 assert.equal(validateEvidenceClaim({state:'CONFIGURATION_CONDITIONAL',configurationKey:'stock',value:35}).valid,true);
});
test('source complete is independent of source-silent mounts',()=>{
 const x=assessSourceCompleteness({statblockReviewed:true,immediateNarrativeReviewed:true,claims:[{state:'PRINTED_VALUE',value:3},{state:'SOURCE_SILENT_CONFIRMED'}]});
 assert.equal(x.status,'SOURCE_COMPLETE');assert.equal(x.strictMechanicalCertified,false);
});
test('source not reviewed cannot become source-complete',()=>{
 assert.equal(assessSourceCompleteness({statblockReviewed:true,immediateNarrativeReviewed:true,claims:[{state:'NOT_REVIEWED'}]}).status,'BLOCK');
});
test('printed arc can be used without GM exception when crew and target are resolved',()=>{
 const x=decideArcDependentAttack({...scope,sourceComplete:true,crewStationResolved:true,targetResolved:true,arcEvidence:'PRINTED_VALUE',arc:'port'});
 assert.equal(x.status,'ALLOW_VERIFIED_ARC');
});
test('invalid printed arc label does not pass as a known physical arc',()=>{
 const x=decideArcDependentAttack({...scope,sourceComplete:true,crewStationResolved:true,targetResolved:true,arcEvidence:'PRINTED_VALUE',arc:'unknown'});
 assert.equal(x.status,'BLOCK');
});
test('unknown arc rejects automatic targeting; no implicit forward/turret arc',()=>{
 const x=decideArcDependentAttack({...scope,sourceComplete:true,crewStationResolved:true,targetResolved:true,arcEvidence:'SOURCE_SILENT_CONFIRMED'});
 assert.equal(x.status,'BLOCK');
});
test('trusted GM can make exact-attack, instance-scoped arc exception with receipt',()=>{
 const x=decideArcDependentAttack({...scope,sourceComplete:true,crewStationResolved:true,targetResolved:true,arcEvidence:'SOURCE_SILENT_CONFIRMED',context,override});
 assert.equal(x.status,'ALLOW_GM_INSTANCE_EXCEPTION');
 assert.equal(x.receipt.instanceId,'scene1');assert.equal(x.receipt.MUST_PERSIST_BY_TRUSTED_FOUNDRY_ADAPTER,true);
 assert.equal(x.operationalCertificationGranted,false);
});
test('GM exception fails for unverified caller, mismatched attack, or missing crew',()=>{
 const opts={...scope,sourceComplete:true,crewStationResolved:true,targetResolved:true,arcEvidence:'SOURCE_SILENT_CONFIRMED',context,override};
 assert.equal(decideArcDependentAttack({...opts,context:{...context,verifiedUserIsGM:false}}).status,'BLOCK');
 assert.equal(decideArcDependentAttack({...opts,attackId:'different'}).status,'BLOCK');
 assert.equal(decideArcDependentAttack({...opts,crewStationResolved:false}).status,'BLOCK');
});
test('published conflict preserves alternative values and rejects preferred-line default',()=>{
 const before=structuredClone(conflict);
 assert.equal(validateEvidenceClaim(conflict).valid,true);
 const x=decideConflictedAttackValue({...scope,conflict});
 assert.equal(x.status,'BLOCK');assert.deepEqual(conflict,before);
});
test('GM conflict choice must be printed alternative and produce noncanonical receipt',()=>{
 const opts={...scope,conflict,context,override:{...override,selectedValue:5}};
 const result=decideConflictedAttackValue(opts);
 assert.equal(result.status,'ALLOW_GM_INSTANCE_ADJUDICATION');
 assert.equal(result.receipt.selectedValue,5);assert.equal(result.canonicalValueSelected,false);
 assert.equal(decideConflictedAttackValue({...opts,override:{...opts.override,selectedValue:99}}).status,'BLOCK');
 assert.equal(decideConflictedAttackValue({...opts,context:{...context,verifiedUserIsGM:false}}).status,'BLOCK');
});
test('no GM instance override counts as strict certification',()=>{
 const x=assessStrictMechanicalCertification({sourceComplete:true,allRequiredConsumerFieldsValidated:true,sourceConflictsResolvedWithAuthority:true,requiredOperationalCapabilitiesValidated:true,usesGmInstanceOverride:true});
 assert.equal(x.strictMechanicalCertified,false);
 assert(x.blockers.includes('TEMPORARY_GM_OVERRIDE_NOT_CERTIFICATION'));
});
test('contract still blocks production implementation and schema freeze',()=>{
 assert.equal(contract.runtimeIntegrationGuardrails.schemaFrozen,false);
 assert.equal(contract.runtimeIntegrationGuardrails.hydrationApproved,false);
 assert.equal(contract.attackTopology.attackGroupNotPhysicalMount,true);
});
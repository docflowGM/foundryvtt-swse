import test from 'node:test';
import assert from 'node:assert/strict';
import { auditBindingCandidate, gitBlobSha, PILOT_CANDIDATES, PINNED_INPUTS } from '../tools/audits/vehicles/audit_phase2c_cp7_stock_bindings.mjs';
const c=PILOT_CANDIDATES[2];
const printed={sourceEntryKey:c.sourceEntryKey,fullFieldCertified:true,fullWeaponMountReconciled:true,printedStatblockStartPage:88,
  printedFacts:{type:'Colossal space transport',abilities:{str:40,dex:14,int:13},durability:{hitPoints:110},defenses:{shieldRating:15},crew:{count:2}},
  mountAndFiringGroups:[{weaponLabel:'double laser cannons',firingArc:'fixed-forward'}]};
const actor={_id:c.packId,name:c.packName,system:{attributes:{str:{base:40},dex:{base:4},int:{base:10}},hitPoints:110,shieldRating:15,crew:'2 (Normal Crew Quality)',size:'gargantuan',weapons:[],sourcebook:'',page:null}};
const evaluate=(p=printed,rows=[actor])=>auditBindingCandidate({candidate:c,source:p,packRows:rows});
test('first four strict-source candidate IDs are distinct',()=>assert.equal(new Set(PILOT_CANDIDATES.map(x=>x.sourceEntryKey)).size,4));
test('pinned input paths have Git object IDs',()=>{for(const x of Object.values(PINNED_INPUTS))assert.match(x,/^[0-9a-f]{40}$/);});
test('Git blob SHA uses the actual Git object format',()=>assert.equal(gitBlobSha('test\n'),'9daeafb9864cf43055ae93beb0afd6c7d144bfa4'));
test('Ghtroc baseline has exact discrepancy fields',()=>{const r=evaluate();for(const code of ['INT_MISMATCH','DEX_MISMATCH','SIZE_MISMATCH','STOCK_WEAPON_GROUP_COUNT_MISMATCH','PACK_SOURCE_POINTER_MISSING'])assert.ok(r.blockers.some(x=>x.code===code),code);assert.equal(r.trustedRuntimeWeaponGroups,0);});
test('not certified source is never promoted',()=>{const r=evaluate({...printed,fullFieldCertified:false});assert.ok(r.blockers.some(x=>x.code==='SOURCE_STRICT_CERTIFICATE_MISSING'));});
test('missing certified source blocks',()=>assert.equal(evaluate(null).blockers[0].code,'CERTIFIED_SOURCE_IDENTITY_NOT_FOUND'));
test('renamed / swapped pack does not bind',()=>assert.equal(evaluate(printed,[{...actor,name:'Some ship'}]).blockers[0].code,'PACK_IDENTITY_NOT_UNIQUE_OR_MISMATCHED'));
test('missing pack document does not bind',()=>assert.equal(evaluate(printed,[]).blockers[0].code,'PACK_IDENTITY_NOT_UNIQUE_OR_MISMATCHED'));
test('unknown duplicate ID fails closed',()=>assert.equal(evaluate(printed,[actor,actor]).blockers[0].code,'PACK_IDENTITY_NOT_UNIQUE_OR_MISMATCHED'));
test('fixing a weapon count does not establish physical group mapping',()=>{const row={...actor,system:{...actor.system,weapons:[{name:'double laser cannons'}]}};assert.ok(evaluate(printed,[row]).blockers.some(x=>x.code==='ATTACK_GROUP_PHYSICAL_BINDING_NOT_CERTIFIED'));});
test('repairing selected fields is not enough for full certification',()=>{const r=evaluate(printed,[{...actor,system:{...actor.system,attributes:{str:{base:40},dex:{base:14},int:{base:13}},size:'colossal',sourcebook:'Starships of the Galaxy',page:88,weapons:[{name:'double laser cannons'}]}}]);assert.equal(r.fieldParityCertified,false);assert.equal(r.trustedRuntimeWeaponGroups,0);});
test('stock-unarmed record does not generate an attack binding',()=>{const src={...printed,mountAndFiringGroups:[]};const row={...actor,system:{...actor.system,weapons:[]}};const r=evaluate(src,[row]);assert.equal(r.publishedAttackGroups,0);assert.equal(r.trustedRuntimeWeaponGroups,0);});
test('printed zero shield rating is preserved rather than confused with unknown',()=>{const src={...printed,printedFacts:{...printed.printedFacts,defenses:{shieldRating:0}}};const row={...actor,system:{...actor.system,shieldRating:0}};const r=evaluate(src,[row]);assert.ok(!r.blockers.some(x=>x.code==='SHIELD_RATING_MISMATCH'));});

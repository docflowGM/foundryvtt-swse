import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatVehicleAttackSummary, numericVehicleAttackBonus,resolvePrintedShieldEvidence
} from '../scripts/domain/vehicles/vehicle-evidence-import.js';
import {
  authorizeVehicleArcEvidence,authorizeVehicleConflictEvidence,VEHICLE_EVIDENCE_RECEIPT_FLAG
} from '../scripts/domain/vehicles/vehicle-evidence-runtime-gate.js';
import { validateEvidenceClaim } from '../scripts/domain/vehicles/vehicle-evidence-authority.js';

const scope={vehicleId:'ship',attackId:'attack-001',weaponGroupKey:'laser',targetId:'target'};
const base={...scope,sourceComplete:true,crewStationResolved:true,targetResolved:true};
const conflict={state:'PUBLISHED_CONFLICT',alternatives:[
  {value:-2,sourceField:'Ranged',printedPage:125},{value:3,sourceField:'detailed cannon',printedPage:125}
]};
const oldGlobals={game:globalThis.game,foundry:globalThis.foundry,ChatMessage:globalThis.ChatMessage};
function mockFoundry({gm=true,persist=true,combat=true}={}){
  const receipts=[];
  globalThis.game={user:{id:'gm-1',isGM:gm},combat:combat?{id:'combat-01'}:null,scenes:{current:{id:'scene-01'}}};
  globalThis.foundry={utils:{randomID:()=>`receipt-${receipts.length+1}`}};
  globalThis.ChatMessage={async create(data){if(!persist)throw Error('socket rejected');receipts.push(data);return {id:`msg-${receipts.length}`};}};
  return receipts;
}
test.after(()=>{Object.assign(globalThis,oldGlobals)});

test('negative, zero, and positive attack bonuses are preserved exactly',()=>{
  assert.equal(formatVehicleAttackSummary(-16),'-16');
  assert.equal(formatVehicleAttackSummary('-2'),'-2');
  assert.equal(formatVehicleAttackSummary(0),'+0');
  assert.equal(formatVehicleAttackSummary('+12'),'+12');
  assert.equal(numericVehicleAttackBonus(-16),-16);
  assert.equal(numericVehicleAttackBonus('laser battery +3 / +5'),null);
});
test('unknown or malformed attack bonus never becomes +0',()=>{
  assert.equal(formatVehicleAttackSummary(undefined),null);
  assert.equal(formatVehicleAttackSummary(null),null);
  assert.equal(numericVehicleAttackBonus('unknown'),null);
  assert.equal(numericVehicleAttackBonus(''),null);
  assert.equal(formatVehicleAttackSummary(1.5),null);
});
test('shield printed zero, explicit none, silence and conflict are all distinct',()=>{
  assert.deepEqual(resolvePrintedShieldEvidence({state:'PRINTED_VALUE',value:0}),{status:'SOURCE_VALUE',shieldRating:0});
  assert.deepEqual(resolvePrintedShieldEvidence({state:'EXPLICIT_NONE'}),{status:'EXPLICIT_NONE',shieldRating:null});
  const silent=resolvePrintedShieldEvidence({state:'SOURCE_SILENT_CONFIRMED'});
  assert.equal(silent.status,'SOURCE_SILENT_CONFIRMED');assert.equal(Object.hasOwn(silent,'shieldRating'),false);
  const c=resolvePrintedShieldEvidence(conflict);
  assert.equal(c.status,'PUBLISHED_CONFLICT');assert.equal(Object.hasOwn(c,'shieldRating'),false);
  assert.equal(resolvePrintedShieldEvidence({state:'NOT_REVIEWED'}).status,'BLOCK');
});
test('untrusted user cannot authorize source-silent firing arc or conflict',async()=>{
  mockFoundry({gm:false});
  assert.equal((await authorizeVehicleArcEvidence({...base,arcEvidence:'SOURCE_SILENT_CONFIRMED',gmDecision:{confirmed:true,selectedArc:'aft',reason:'adjudicated'}})).status,'BLOCK');
  assert.equal((await authorizeVehicleConflictEvidence({...scope,conflict,gmDecision:{confirmed:true,selectedValue:-2,reason:'adjudicated'}})).status,'BLOCK');
});
test('known printed arc gives provisional eligibility without GM receipt',async()=>{
  delete globalThis.game;
  const r=await authorizeVehicleArcEvidence({...base,arcEvidence:'PRINTED_VALUE',arc:'port'});
  assert.equal(r.status,'ALLOW_VERIFIED_ARC');assert.equal(r.requiresGeometryCheck,true);
});
test('source silent auto-targeting blocked without explicit GM confirmation',async()=>{
  const records=mockFoundry();
  const x=await authorizeVehicleArcEvidence({...base,arcEvidence:'SOURCE_SILENT_CONFIRMED'});
  assert.equal(x.status,'BLOCK');assert.equal(records.length,0);
});
test('a GM-selected arc is persisted as GM-only ChatMessage before allowance',async()=>{
  const records=mockFoundry();
  const x=await authorizeVehicleArcEvidence({...base,arcEvidence:'SOURCE_SILENT_CONFIRMED',gmDecision:{confirmed:true,selectedArc:'aft',reason:'ship diagram at table'}});
  assert.equal(x.status,'ALLOW_GM_INSTANCE_EXCEPTION');assert.equal(x.receiptDocumentId,'msg-1');
  assert.equal(x.operationalCertificationGranted,false);
  assert.equal(records.length,1);assert.deepEqual(records[0].whisper,['gm-1']);
  const rec=records[0].flags[VEHICLE_EVIDENCE_RECEIPT_FLAG.scope][VEHICLE_EVIDENCE_RECEIPT_FLAG.key];
  assert.equal(rec.instanceId,'combat:combat-01');assert.equal(rec.attackId,scope.attackId);
  assert.equal(rec.sourceAuthorityMutated,false);assert.equal(rec.certificationIssued,false);
});
test('receipt persistence failure blocks the exception',async()=>{
  mockFoundry({persist:false});
  const x=await authorizeVehicleArcEvidence({...base,arcEvidence:'SOURCE_SILENT_CONFIRMED',gmDecision:{confirmed:true,selectedArc:'aft',reason:'GM adjudication'}});
  assert.equal(x.reason,'GM_RECEIPT_PERSISTENCE_FAILED');
});
test('GM conflict choice limited to printed alternatives and receipt persisted',async()=>{
  const records=mockFoundry();
  const x=await authorizeVehicleConflictEvidence({...scope,conflict,gmDecision:{confirmed:true,selectedValue:-2,reason:'use printed Ranged'}});
  assert.equal(x.status,'ALLOW_GM_INSTANCE_ADJUDICATION');assert.equal(x.selectedValue,-2);
  assert.equal(x.receiptDocumentId,'msg-1');assert.equal(records.length,1);
  assert.equal(validateEvidenceClaim(conflict).valid,true);
  const invalid=await authorizeVehicleConflictEvidence({...scope,conflict,gmDecision:{confirmed:true,selectedValue:99,reason:'unprinted'}});
  assert.equal(invalid.status,'BLOCK');assert.equal(records.length,1);
});
test('missing incident/scene, spoofed GM context, and unresolved crew are blocked',async()=>{
  const records=mockFoundry();
  globalThis.game.combat=null;globalThis.game.scenes.current=null;
  assert.equal((await authorizeVehicleArcEvidence({...base,arcEvidence:'SOURCE_SILENT_CONFIRMED',gmDecision:{confirmed:true,selectedArc:'aft',reason:'GM'}})).status,'BLOCK');
  globalThis.game.scenes.current={id:'scene-01'};
  assert.equal((await authorizeVehicleArcEvidence({...base,crewStationResolved:false,arcEvidence:'SOURCE_SILENT_CONFIRMED',gmDecision:{confirmed:true,selectedArc:'aft',reason:'GM'}})).status,'BLOCK');
  assert.equal(records.length,0);
});

const {isTargetWithinVehicleArc} = await import('../scripts/domain/vehicles/vehicle-firing-arc-geometry.js');
function tokenActor(x,y,rotation=0){return {getActiveTokens:()=>[{center:{x,y},document:{rotation}}]};}
test('arc geometry never guesses a default; explicit turrets work with resolved tokens',()=>{
  const a=tokenActor(0,0,0), b=tokenActor(10,0);
  assert.equal(isTargetWithinVehicleArc(a,b,undefined),false);
  assert.equal(isTargetWithinVehicleArc(a,b,'unknown'),false);
  assert.equal(isTargetWithinVehicleArc(a,b,'forward'),true);
  assert.equal(isTargetWithinVehicleArc(a,b,'aft'),false);
  assert.equal(isTargetWithinVehicleArc(a,b,'turret'),true);
  assert.equal(isTargetWithinVehicleArc(a,b,'omni'),true);
  assert.equal(isTargetWithinVehicleArc(a,b,'all'),false);
});
test('arc geometry rejects missing tokens, undefined geometry, and coincident centers',()=>{
  const a=tokenActor(0,0),b=tokenActor(0,0);
  assert.equal(isTargetWithinVehicleArc(a,b,'turret'),false);
  assert.equal(isTargetWithinVehicleArc({getActiveTokens:()=>[]},tokenActor(10,0),'forward'),false);
  assert.equal(isTargetWithinVehicleArc(a,tokenActor(10,0),'forward',Infinity),false);
});
import test from 'node:test';
import assert from 'node:assert/strict';
import { planEnforcerResourceEntitlement } from '../scripts/engine/progression/utils/enforcer-resources-entitlement.js';
import { auditLevelUpActorAfterFinalization } from '../scripts/engine/progression/utils/levelup-finalization-audit.js';

test('each Enforcer level grants restricted/military equipment value = new HEROIC level × 2,000, not currency', () => {
  const first=planEnforcerResourceEntitlement({existing:[],classLevel:1,heroicLevel:8,sessionId:'one'});
  assert.equal(first.current.amountCredits,16000);
  assert.equal(first.current.status,'awaiting-equipment-selection');
  assert.deepEqual(first.current.equipmentRestriction,['restricted','military']);
  assert.equal(first.current.delivery,'civilized-accessible-location');
  const second=planEnforcerResourceEntitlement({existing:first.entries,classLevel:2,heroicLevel:9,sessionId:'two'});
  assert.equal(second.current.amountCredits,18000);
  assert.equal(second.entries.length,2);
  assert.equal(second.entries[0].amountCredits,16000);
  assert.equal(second.entries[0].status,'awaiting-equipment-selection');
});

test('explicitly deferred resources carry forward ONCE to the next Enforcer class level', () => {
  const previous=[{enforcerClassLevel:1,amountCredits:16000,status:'deferred-to-next-level'}];
  const next=planEnforcerResourceEntitlement({existing:previous,classLevel:2,heroicLevel:9,sessionId:'two'});
  assert.equal(next.current.newValueCredits,18000);
  assert.equal(next.current.carriedValueCredits,16000);
  assert.equal(next.current.amountCredits,34000);
  assert.equal(next.entries[0].status,'carried-forward');
  assert.equal(previous[0].status,'deferred-to-next-level','pure planning must not mutate actor flags');
  const third=planEnforcerResourceEntitlement({existing:next.entries,classLevel:3,heroicLevel:10,sessionId:'three'});
  assert.equal(third.current.amountCredits,20000,'previous carry must not be re-added');
});

test('fail closed on duplicate levels, missing heroic-level authority, malformed deferral',()=>{
  const args={existing:[],classLevel:1,heroicLevel:8,sessionId:'one'};
  const first=planEnforcerResourceEntitlement(args);
  assert.throws(()=>planEnforcerResourceEntitlement({...args,existing:first.entries}),/already been recorded/);
  assert.throws(()=>planEnforcerResourceEntitlement({...args,heroicLevel:0}),/Heroic level/);
  assert.throws(()=>planEnforcerResourceEntitlement({...args,classLevel:11}),/Invalid Enforcer/);
  assert.throws(()=>planEnforcerResourceEntitlement({...args,classLevel:3,existing:[{enforcerClassLevel:1,amountCredits:2000,status:'deferred-to-next-level'}]}),/nonadjacent/);
});

test('finalization audit requires Enforcer resource ledger and rejects currency-only substitutes',()=>{
 const m={className:'Enforcer',classId:'Enforcer',classLevel:1,characterLevel:8,
  choices:{},classSkills:[],automaticClassFeatures:[]};
 const a={items:[],flags:{swse:{classFeatures:{enforcer:{resources:[]}}}},system:{
  level:8,progression:{classLevels:[{classId:'Enforcer',level:1}]},forcePoints:{max:1,value:1},
  credits:{value:16000},
 }};
 const draft={draftSelections:{feats:[],talents:[]}};
 assert.ok(auditLevelUpActorAfterFinalization(a,m,draft).errors.some(x=>/Enforcer Resources/.test(x)));
 a.flags.swse.classFeatures.enforcer.resources=planEnforcerResourceEntitlement({
  existing:[],classLevel:1,heroicLevel:8,sessionId:'test'
 }).entries;
 assert.deepEqual(auditLevelUpActorAfterFinalization(a,m,draft).errors,[]);
});

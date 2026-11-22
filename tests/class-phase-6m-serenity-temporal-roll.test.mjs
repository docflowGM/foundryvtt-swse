import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  readSerenityState,planSerenityTransition,serenityTranceActive,
  serenityNatural20Eligible,serenityConsumedState
} from '../scripts/engine/progression/utils/serenity-state.js';
const combat={id:'enc-1',started:true,round:4};
const actor = (state=null)=>({id:'master',flags:{swse:{classFeatures:{jediMaster:{serenity:state}}}}});
const read = p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('enter full-round, remain aware in trance, exit swift, first qualifying NEXT round',()=>{
  const a=actor();
  const entered=planSerenityTransition(a,combat,'enter');
  assert.equal(entered.allowed,true);
  assert.equal(entered.actionType,'full-round');
  a.flags.swse.classFeatures.jediMaster.serenity=entered.next;
  assert.equal(serenityTranceActive(a,combat),true);
  assert.equal(planSerenityTransition(a,combat,'enter').allowed,false);
  const exited=planSerenityTransition(a,combat,'exit');
  assert.equal(exited.allowed,true);
  assert.equal(exited.actionType,'swift');
  assert.equal(exited.next.eligibleRound,5);
  a.flags.swse.classFeatures.jediMaster.serenity=exited.next;
  assert.equal(serenityTranceActive(a,combat),false);
  assert.equal(serenityNatural20Eligible(a,combat,'combat.attack','1d20 + 10'),false);
  combat.round=5;
  assert.equal(serenityNatural20Eligible(a,combat,'combat.attack','1d20 + 10'),true);
  assert.equal(serenityNatural20Eligible(a,combat,'skill.useTheForce','1d20 + 11'),true);
  assert.equal(serenityNatural20Eligible(a,combat,'force-power.activation','1d20 + 11'),true);
  assert.equal(serenityNatural20Eligible(a,combat,'skill.deception','1d20 + 11'),false);
  assert.equal(serenityNatural20Eligible(a,combat,'combat.damage','2d8 + 11'),false);
  assert.equal(serenityNatural20Eligible(a,combat,'combat.attack','1d20 + 1d4'),false);
  const consumed=serenityConsumedState(readSerenityState(a),combat.round);
  a.flags.swse.classFeatures.jediMaster.serenity=consumed;
  assert.equal(serenityNatural20Eligible(a,combat,'combat.attack','1d20 + 10'),false);
  combat.round=6;
  assert.equal(planSerenityTransition(a,combat,'enter').allowed,true);
});

test('wrong encounter, stale round, missing ID do not grant a natural 20',()=>{
  const a=actor({phase:'prepared',encounterId:'enc-1',exitRound:2,eligibleRound:3,consumed:false});
  assert.equal(serenityNatural20Eligible(a,{...combat,round:4},'combat.attack','1d20 + 8'),false);
  assert.equal(serenityNatural20Eligible(a,{...combat,id:'enc-2',round:3},'combat.attack','1d20 + 8'),false);
  assert.equal(planSerenityTransition(a,{round:3,started:true},'enter').allowed,false);
});

test('Serenity is an actual evaluated d20 (maximize), not a plus-20 check modifier',()=>{
  const core=read('scripts/engine/roll/roll-core.js');
  const service=read('scripts/engine/combat/jedi-master-serenity-service.js');
  assert.match(core,/JediMasterSerenityService\.roll\(/);
  assert.match(core,/await roll\.evaluate\(evaluateOptions\)/);
  assert.match(service,/rollFactory\(\{maximize:true\}\)/);
  assert.match(service,/Number\(result\?\.result\)!==20/);
  assert.match(core,/serenityNatural20Eligible\(actor, globalThis\.game\?\.combat, domain, baseDice\)/);
  assert.doesNotMatch(service,/\+20\s*bonus/);
});

test('Dexterity denial has no double-count with Pin or nonproficient shields',()=>{
  const defense=read('scripts/actors/derived/defense-calculator.js');
  assert.match(defense,/serenityTranceActive\(actor, globalThis\.game\?\.combat\)/);
  assert.match(defense,/reflexAbilityKey === 'dex'/);
  assert.match(defense,/pinnedReflexDexReduction === 0 && shieldReflexDexReduction === 0/);
  assert.match(defense,/serenityDexReduction: -serenityDexReduction/);
});

test('all mutations use ActorEngine and V2 action economy; API is registered',()=>{
  const service=read('scripts/engine/combat/jedi-master-serenity-service.js');
  const boot=read('index.js');
  assert.match(service,/ActionEconomyConsumption\.spend\(actor,plan\.actionType/);
  assert.match(service,/ActorEngine\.applyMutationPlan\(actor/);
  assert.match(service,/registerJediMasterSerenityCleanup/);
  assert.match(boot,/jediMasterSerenity: \{ open: openJediMasterSerenity \}/);
  assert.match(boot,/registerJediMasterSerenityCleanup\(\)/);
  assert.doesNotMatch(service,/actor\.update\(/);
});

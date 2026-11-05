import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rules = JSON.parse(readFileSync(new URL('../data/class-features.json',import.meta.url),'utf8'));
const byId = id => rules.abilities.find(entry => entry.id === id);

test('Jedi Master Serenity preserves printed aware trance rather than invented helpless state', () => {
  const entry=byId('cf.jediMaster.serenity');
  assert.ok(entry);
  assert.equal(entry.executionModel,'ACTIVE');
  assert.equal(entry.subType,'STUB','metadata must not claim a working runtime action');
  assert.match(entry.summary,/lose Dexterity bonus to Reflex Defense/);
  assert.doesNotMatch(entry.summary,/helpless/i);
  assert.ok(!entry.abilityMeta.tags.includes('helpless'));
  assert.ok(entry.abilityMeta.effects.some(effect=>effect.type==='loseDexterityBonusToReflexDefense'&&effect.whileActive===true));
  assert.ok(!entry.abilityMeta.effects.some(effect=>effect.type==='setHelplessExceptAwareness'));
  assert.deepEqual(entry.abilityMeta.actions.map(action=>action.type),['fullRound','swift']);
  assert.deepEqual(entry.abilityMeta.rollOverride.appliesTo,['attackRoll','useTheForce']);
  assert.equal(entry.abilityMeta.rollOverride.timing,'followingRoundFirst');
  assert.equal(entry.abilityMeta.rollOverride.treatAs,'natural20');
});

test('Sith Lord Temptation is delayed and the target chooses its resource-spend consequence', () => {
  const entry=byId('cf.sithLord.temptation');
  assert.ok(entry);
  assert.equal(entry.subType,'STUB');
  assert.equal(entry.abilityMeta.action.type,'standard');
  assert.equal(entry.abilityMeta.resolution.check,'persuasion');
  assert.equal(entry.abilityMeta.resolution.vs,'defense.will');
  assert.equal(entry.abilityMeta.targeting.requiresLineOfSight,true);
  assert.equal(entry.abilityMeta.consequences.trigger,'targetSpendsForceOrDestinyPoint');
  assert.equal(entry.abilityMeta.consequences.choiceOwner,'target');
  assert.deepEqual(entry.abilityMeta.consequences.forcePoint,{darkSideScore:1,conditionSteps:-1});
  assert.deepEqual(entry.abilityMeta.consequences.destinyPoint,{darkSideScore:2,conditionSteps:-2});
  assert.equal(entry.abilityMeta.consequences.onSuccessOnly,true);
});

test('both apex classes are Fearless and retain Force Secret choice data without duplication',()=>{
  for(const [classId,fearId,secretId] of [
    ['jediMaster','cf.jediMaster.fearless','cf.jediMaster.force-secret-choice'],
    ['sithLord','cf.sithLord.fearless','cf.sithLord.force-secret-choice']
  ]){
    const fear=byId(fearId),secret=byId(secretId);
    assert.equal(fear.classId,classId);
    assert.equal(fear.abilityMeta.rules[0].type,'IMMUNE_FEAR');
    assert.equal(secret.abilityMeta.choice.pool,'forceSecrets');
    assert.equal(secret.abilityMeta.choice.grant,1);
    assert.equal(secret.executionModel,'ACTIVE');
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  followerCapLimit, evaluateFollowerCap, canAddRecruitingSlot, ownedRecruitingTalentNames,
  armorLadderGrants, sharedBenefitSet, effectiveFollowerGrantConfig, planSharedBenefitReconcile,
  ARMOR_LADDER, DEFAULT_FOLLOWER_CAP,
} from '../scripts/domain/followers/follower-house-rules.js';
import { FOLLOWER_TALENT_CONFIG } from '../scripts/engine/crew/follower-talent-config.js';

const slot = (talentName, id, extra = {}) => ({ id, talentName, ...extra });
const talents = (...names) => names.map(name => ({ type: 'talent', name }));
const [L, M, H] = ARMOR_LADDER;

test('cap setting: 3/6/9/unlimited, default 3, junk falls back to 3', () => {
  assert.equal(DEFAULT_FOLLOWER_CAP, '3');
  assert.deepEqual(['3', '6', '9', 'unlimited', undefined, 'x', 12].map(followerCapLimit), [3, 6, 9, Infinity, 3, 3, 3]);
});
test('cap counts only talent-recruited slots across the three talents', () => {
  const slots = [slot('Inspire Loyalty', 'a'), slot('Commanding Officer', 'b'), slot('Reconnaissance Team Leader', 'c'),
    slot('Akk Dog Master', 'd'), slot(null, 'e', { sourceType: 'gm-grant' }), slot('Commanding Officer', 'f', { sourceType: 'gm-grant' })];
  assert.deepEqual(evaluateFollowerCap(slots, 3), { limit: 3, used: 3, over: false, excessSlotIds: [] });
  assert.equal(canAddRecruitingSlot(slots, 'Inspire Loyalty', 3), false);
  assert.equal(canAddRecruitingSlot(slots, 'Inspire Loyalty', 6), true);
  assert.equal(canAddRecruitingSlot(slots, 'Akk Dog Master', 3), true, 'other follower talents are not governed');
  assert.equal(canAddRecruitingSlot(slots, 'Inspire Loyalty', Infinity), true);
});
test('lowering the cap reports excess slots in order and deletes nothing', () => {
  const slots = ['a', 'b', 'c', 'd'].map((id, i) => slot(['Inspire Loyalty', 'Commanding Officer'][i % 2], id));
  const before = JSON.stringify(slots);
  assert.deepEqual(evaluateFollowerCap(slots, 3), { limit: 3, used: 4, over: true, excessSlotIds: ['d'] });
  assert.equal(JSON.stringify(slots), before);
  assert.equal(evaluateFollowerCap(slots, Infinity).over, false);
});
test('distinct recruiting talents only; repeats do not add a benefit set', () => {
  assert.deepEqual(ownedRecruitingTalentNames([...talents('Inspire Loyalty', 'Inspire Loyalty', 'Akk Dog Master', 'Commanding Officer'), { type: 'feat', name: 'Inspire Loyalty' }]),
    ['Inspire Loyalty', 'Commanding Officer']);
});
test('armor grants stack Light -> Medium -> Heavy and respect held feats', () => {
  assert.deepEqual(armorLadderGrants(0), []);
  assert.deepEqual(armorLadderGrants(1), [L]);
  assert.deepEqual(armorLadderGrants(2), [L, M]);
  assert.deepEqual(armorLadderGrants(3), [L, M, H]);
  assert.deepEqual(armorLadderGrants(5), [L, M, H], 'never beyond Heavy');
  assert.deepEqual(armorLadderGrants(2, [L]), [M, H], 'a held Light advances the ladder');
  assert.deepEqual(armorLadderGrants(2, [L, M, H]), []);
});
test('sharing OFF leaves the printed per-talent config untouched', () => {
  for (const name of Object.keys(FOLLOWER_TALENT_CONFIG)) {
    const base = FOLLOWER_TALENT_CONFIG[name];
    assert.equal(effectiveFollowerGrantConfig(base, name, ['Inspire Loyalty', 'Commanding Officer'], { shared: false }), base);
  }
});
test('sharing ON: every follower gets the combined benefits; armor choice becomes cumulative grants', () => {
  const owned = ['Inspire Loyalty', 'Reconnaissance Team Leader', 'Commanding Officer'];
  for (const name of owned) {
    const cfg = effectiveFollowerGrantConfig(FOLLOWER_TALENT_CONFIG[name], name, owned, { shared: true });
    assert.deepEqual(cfg.additionalSkills.sort(), ['Perception', 'Stealth']);
    assert.ok(cfg.additionalFeats.includes('Weapon Proficiency (Rifles)'));
    assert.ok(cfg.additionalFeats.includes('Skill Training (Stealth)'));
    assert.equal(cfg.armorProficiencyChoice, false);
    assert.equal(cfg.armorLadderGrants, 2, 'Inspire Loyalty + Commanding Officer = two grants');
    assert.equal(cfg.maxCount, 3, 'printed per-talent maximum is preserved');
  }
});
test('sharing ON with one talent equals that talent alone; armor stays one grant', () => {
  const cfg = effectiveFollowerGrantConfig(FOLLOWER_TALENT_CONFIG['Inspire Loyalty'], 'Inspire Loyalty', ['Inspire Loyalty'], { shared: true });
  assert.deepEqual(cfg.additionalSkills, ['Perception']);
  assert.equal(cfg.armorLadderGrants, 1);
});
test('non-recruiting talents are never widened', () => {
  const base = FOLLOWER_TALENT_CONFIG['Akk Dog Master'];
  assert.equal(effectiveFollowerGrantConfig(base, 'Akk Dog Master', ['Inspire Loyalty'], { shared: true }), base);
  assert.equal(sharedBenefitSet(['Attract Minion']).talents.length, 0);
});
test('reconcile: turning sharing ON adds missing benefits and records only what it placed', () => {
  const plan = planSharedBenefitReconcile({
    shared: true, ownedTalentNames: ['Inspire Loyalty', 'Commanding Officer'],
    followerFeatNames: ['Weapon Proficiency (Simple Weapons)', M], followerTrainedSkillNames: [],
  });
  assert.deepEqual(plan.addFeats.sort(), [L, 'Weapon Proficiency (Rifles)', H].sort(), 'a held Medium is skipped: Light is still missing, then Heavy');
  assert.deepEqual(plan.addSkills, ['Perception']);
  assert.deepEqual(plan.removeFeats, []);
});
test('reconcile: never duplicates a held feat or trained skill', () => {
  const plan = planSharedBenefitReconcile({
    shared: true, ownedTalentNames: ['Reconnaissance Team Leader'],
    followerFeatNames: ['Skill Training (Perception)', 'Skill Training (Stealth)'], followerTrainedSkillNames: ['Perception', 'Stealth'],
  });
  assert.deepEqual([plan.addFeats, plan.addSkills], [[], []]);
  assert.deepEqual(plan.record, { feats: [], skills: [] }, 'earned benefits are not claimed by the house rule');
});
test('reconcile: sharing OFF removes only house-rule-placed benefits', () => {
  const plan = planSharedBenefitReconcile({
    shared: false, ownedTalentNames: ['Inspire Loyalty', 'Commanding Officer'],
    followerFeatNames: [L, M, 'Weapon Proficiency (Rifles)', 'Toughness'], followerTrainedSkillNames: ['Perception', 'Stealth'],
    recorded: { feats: [M, 'Weapon Proficiency (Rifles)'], skills: ['Stealth'] },
  });
  assert.deepEqual(plan.removeFeats.sort(), [M, 'Weapon Proficiency (Rifles)'].sort());
  assert.deepEqual(plan.removeSkills, ['Stealth']);
  assert.deepEqual(plan.addFeats, []);
  assert.deepEqual(plan.record, { feats: [], skills: [] });
});
test('reconcile: losing a talent removes only its placed benefits; idempotent when already applied', () => {
  const owned = ['Commanding Officer'];
  const first = planSharedBenefitReconcile({ shared: true, ownedTalentNames: ['Inspire Loyalty', 'Commanding Officer'], followerFeatNames: [], followerTrainedSkillNames: [] });
  const feats = [...first.addFeats];
  const again = planSharedBenefitReconcile({ shared: true, ownedTalentNames: ['Inspire Loyalty', 'Commanding Officer'], followerFeatNames: feats, followerTrainedSkillNames: first.addSkills, recorded: first.record });
  assert.deepEqual([again.addFeats, again.removeFeats, again.addSkills, again.removeSkills], [[], [], [], []]);
  const lost = planSharedBenefitReconcile({ shared: true, ownedTalentNames: owned, followerFeatNames: feats, followerTrainedSkillNames: first.addSkills, recorded: first.record });
  assert.deepEqual(lost.removeFeats, [M]);
  assert.deepEqual(lost.removeSkills, ['Perception']);
});
test('wiring: cap guards both slot-creation paths; creators and step use the effective config', () => {
  const read = p => fs.readFileSync(p, 'utf8');
  const hooks = read('scripts/infrastructure/hooks/follower-hooks.js');
  assert.equal((hooks.match(/canAddRecruitingSlot\(slots, /g) || []).length, 2);
  assert.match(hooks, /_reportOverCap\(actor, filtered\)/);
  assert.match(read('scripts/apps/follower-creator.js'), /resolveEffectiveGrantConfig\(owner, this\._getFollowerGrantConfig/);
  assert.match(read('scripts/apps/progression-framework/steps/follower-steps/follower-step-base.js'), /resolveEffectiveGrantConfig\(this\.getOwnerActor\(shell\)/);
  assert.match(read('scripts/core/settings.js'), /registerFollowerHouseRuleSettings\(\)/);
  const settings = read('scripts/infrastructure/hooks/follower-house-rule-settings.js');
  assert.equal((settings.match(/scope: 'world'/g) || []).length, 2);
});

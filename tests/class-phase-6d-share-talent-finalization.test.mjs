import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLevelUpRequiredSelections } from '../scripts/engine/progression/utils/levelup-finalization-audit.js';

test('Officer even-level Share Talent fails closed until the dedicated previously-owned-talent picker exists', () => {
  const manifest = {
    className: 'Officer', classLevel: 2, characterLevel: 8,
    choices: { talentChoices: 0, shareTalentChoices: 1, classFeatChoices: 0 },
  };
  const blank = { draftSelections: { feats: [], talents: [] } };
  const wrongOrdinaryTalent = { draftSelections: { feats: [], talents: [{ id: 'wrong', name: 'New Talent', slotType: 'class' }] } };
  for(const state of [blank, wrongOrdinaryTalent]){
    const errors = validateLevelUpRequiredSelections(manifest, state);
    assert.ok(errors.some(x => /Share Talent requires the dedicated existing-talent picker/.test(x)));
    assert.ok(!errors.some(x => /Choose 1 talent/.test(x)));
  }
});

test('Officer odd-level normal talent is still required and no Share Talent is invented', () => {
  const manifest = {
    className: 'Officer', classLevel: 3, characterLevel: 9,
    choices: { talentChoices: 1, shareTalentChoices: 0, classFeatChoices: 0 },
  };
  const blank = { draftSelections: { feats: [], talents: [] } };
  assert.ok(validateLevelUpRequiredSelections(manifest,blank).some(x=>/Choose 1 talent/.test(x)));
  const selected = { draftSelections: { feats: [], talents: [{name: 'Deployment Tactics',slotType:'class'}] } };
  assert.ok(validateLevelUpRequiredSelections(manifest,selected).every(x=>!x.includes('Share Talent')&&!x.includes('Choose 1 talent')));
});

test('other class choices do not require Share Talent', () => {
  const manifest = { className:'Improviser',classLevel:4,characterLevel:10,choices:{classFeatChoices:0,talentChoices:0,shareTalentChoices:0} };
  assert.deepEqual(validateLevelUpRequiredSelections(manifest,{draftSelections:{}}),[]);
});

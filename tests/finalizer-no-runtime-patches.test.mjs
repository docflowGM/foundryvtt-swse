import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader(); installFoundryShimGlobals();
// Finding F-PRG-002 (3G): ProgressionFinalizer and FeatChoiceResolver used to depend on methods attached by import-time runtime patches that were
// only loaded through the Squad Actions macro menu. They are now ordinary code; this test imports NOTHING but the production modules.
const { ProgressionFinalizer } = await import('../scripts/apps/progression-framework/shell/progression-finalizer.js');
const { FeatChoiceResolver } = await import('../scripts/engine/progression/feats/feat-choice-resolver.js');

test('the finalizer defines the Force-knowledge post-apply methods itself', () => {
  assert.equal(typeof ProgressionFinalizer._applyForceKnowledgePostApply, 'function');
  const set = {};
  ProgressionFinalizer._applyForceKnowledgePostApply(set, { system: {}, items: [] }, {});   // non-Force path is a no-op
  assert.deepEqual(set, {});
  const entry = ProgressionFinalizer._buildForceKnowledgePostApplyEntry({ name: 'Force Technique X' }, { id: 'a' }, 'sel1', 's1');
  assert.equal(entry.name, 'Force Technique X'); assert.equal(entry.selectionId, 'sel1'); assert.equal(entry.source, 'progression-finalizer');
});

test('object-shaped skill values and stored choices resolve without the choice-resolution patch', () => {
  assert.equal(ProgressionFinalizer._canonicalSkillKey({ name: 'Use the Force' }), ProgressionFinalizer._canonicalSkillKey('Use the Force'));
  const feat = { name: 'Skill Focus', flags: { swse: { selectedChoice: 'Stealth' } } };
  assert.equal(FeatChoiceResolver.getStoredChoice(null, feat), 'Stealth');
  const patch = FeatChoiceResolver.buildChoicePatch({ name: 'Skill Focus' }, 'Stealth');
  assert.equal(patch.system.selectedChoice, 'Stealth'); assert.equal(patch.flags.swse.selectedChoice, 'Stealth');
  assert.deepEqual(ProgressionFinalizer._extractSkillFocusKeysFromSelections({ feats: [feat] }), [ProgressionFinalizer._canonicalSkillKey('Stealth')].filter(Boolean));
});

test('the patch modules are gone and nothing wraps these methods at import time', () => {
  assert.ok(!fs.existsSync('scripts/apps/progression-framework/shell/progression-finalizer-force-knowledge-patch.js'));
  assert.ok(!fs.existsSync('scripts/apps/progression-framework/shell/choice-resolution-finalization-patch.js'));
  assert.ok(!/force-knowledge-patch|choice-resolution-finalization-patch/.test(fs.readFileSync('scripts/talents/squad-actions-init.js', 'utf8')));
});

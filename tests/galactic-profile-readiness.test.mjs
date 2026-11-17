import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from './helpers/session-harness.mjs';
import { createOfflineResolvers, loadProfilesDoc } from './helpers/galactic-profile-fixtures.mjs';

const { ProgressionFinalizer } = await import('../scripts/apps/progression-framework/shell/progression-finalizer.js');
const { compileProfile } = await import('../scripts/engine/progression/profile/galactic-profile-compiler.js');
const { applyCompiledProfile } = await import('../scripts/engine/progression/profile/galactic-profile-apply.js');
const { resolvers } = await createOfflineResolvers();
const doc = loadProfilesDoc();
const byId = id => doc.profiles.find(p => p.profileId === id);
const settings = { droidConstructionCredits: 1000 };

async function applied(profileId) {
  const p = byId(profileId);
  const s = await createSession(p.subtype);
  if (p.subtype === 'droid') s.droidContext = { creationMode: 'custom', degree: '1st-degree', size: 'medium' };
  const c = await compileProfile(p, { sessionSubtype: p.subtype, resolvers, settings });
  assert.equal(c.ok, true, JSON.stringify(c.blocked));
  assert.equal(applyCompiledProfile(s, c).ok, true);
  return s;
}

test('V2 finalizer readiness accepts an applied heroic profile (resolved wallet counts as resolved credits)', async () => {
  const s = await applied('noble_leader');
  assert.equal(s.draftSelections.survey, null, 'no starting-credit survey exists: the profile wallet alone resolves credits');
  assert.doesNotThrow(() => ProgressionFinalizer._validateReadiness({ mode: 'chargen', actor: { id: 'a', type: 'character', items: [] }, progressionSession: s }));
});

test('V2 finalizer readiness accepts every applicable droid with its PROVISIONAL build (no extra confirmation required)', async () => {
  for (const id of doc.profiles.filter(p => p.subtype === 'droid').map(p => p.profileId)) {
    const s = await applied(id);
    assert.equal(s.draftSelections.droid.buildState.isFinalized, false);
    assert.doesNotThrow(() => ProgressionFinalizer._validateReadiness({ mode: 'chargen', actor: { id: 'd', type: 'droid', items: [], system: { isDroid: true } }, progressionSession: s }), id);
  }
});

test('readiness still FAILS CLOSED for a droid whose build is deferred, and for a session with no resolved credits', async () => {
  const s = await applied('droid_soldier_dex_security_enforcer');
  s.draftSelections.droid = { ...s.draftSelections.droid, buildState: { mode: 'deferred', isDeferred: true, isFinalized: false } };
  assert.throws(() => ProgressionFinalizer._validateReadiness({ mode: 'chargen', actor: { id: 'd', type: 'droid', items: [], system: { isDroid: true } }, progressionSession: s }), /droid build is pending/);
  const h = await applied('noble_leader');
  h.draftSelections.profileApplication = { ...h.draftSelections.profileApplication, economy: { ...h.draftSelections.profileApplication.economy, walletResolved: false } };
  assert.throws(() => ProgressionFinalizer._validateReadiness({ mode: 'chargen', actor: { id: 'a', type: 'character', items: [] }, progressionSession: h }), /starting credits must be rolled or otherwise resolved/);
});

test('V2 droid builder validator accepts the compiled droid draft for all eight droids', async () => {
  const { DroidBuilderAdapter } = await import('../scripts/apps/progression-framework/steps/droid-builder-adapter.js');
  for (const id of doc.profiles.filter(p => p.subtype === 'droid').map(p => p.profileId)) {
    const s = await applied(id);
    const v = DroidBuilderAdapter.validateDroidBuild(s.draftSelections.droid);
    assert.equal(v.isValid, true, `${id}: ${JSON.stringify(v.issues)}`);
  }
});

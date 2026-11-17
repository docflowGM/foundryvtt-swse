import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from './helpers/session-harness.mjs';
import { createOfflineResolvers, loadProfilesDoc } from './helpers/galactic-profile-fixtures.mjs';

const { compileProfile } = await import('../scripts/engine/progression/profile/galactic-profile-compiler.js');
const { applyCompiledProfile, getProfileApplication, isOverridden, fingerprint, filterActiveStepsForProfile } = await import('../scripts/engine/progression/profile/galactic-profile-apply.js');
const { resolvers } = await createOfflineResolvers();
const doc = loadProfilesDoc();
const settings = { droidConstructionCredits: 1000 };
const byId = id => doc.profiles.find(p => p.profileId === id);
const compile = p => compileProfile(p, { sessionSubtype: p.subtype, resolvers, settings });
const clone = v => JSON.parse(JSON.stringify(v));

test('Apply writes the draft through the real session and records bookkeeping only (no second copy of the character)', async () => {
  const s = await createSession('actor');
  const c = await compile(byId('noble_leader'));
  assert.equal(c.ok, true);
  const r = applyCompiledProfile(s, c);
  assert.equal(r.ok, true);
  assert.equal(s.draftSelections.class.id, c.draft.class.id);
  assert.deepEqual(s.draftSelections.attributes.values, byId('noble_leader').choices.attributes.base);
  const app = getProfileApplication(s);
  assert.equal(app.profileId, 'noble_leader');
  assert.equal(app.subtype, 'actor');
  assert.equal(app.economy.walletCredits, 625);
  assert.ok(app.owned.class && app.owned.attributes && app.owned.skills);
  assert.equal(Object.keys(app).includes('draft'), false, 'no shadow draft in the application record');
});

test('Apply is idempotent: same profile twice duplicates nothing and does not touch the session', async () => {
  const s = await createSession('actor');
  const c = await compile(byId('noble_leader'));
  applyCompiledProfile(s, c);
  const snap = JSON.stringify(s.draftSelections);
  const again = applyCompiledProfile(s, c);
  assert.deepEqual([again.ok, again.changed], [true, false]);
  assert.equal(JSON.stringify(s.draftSelections), snap);
});

test('Apply refuses blocked compiles and subtype mismatches and never mutates the session', async () => {
  const s = await createSession('actor');
  const before = JSON.stringify(s.draftSelections);
  assert.equal(applyCompiledProfile(s, await compile(byId('scout_sniper'))).code, 'COMPILE_BLOCKED');
  const droid = await compile(byId('droid_scout_int_astromech_pathfinder'));
  assert.equal(droid.ok, true);
  assert.equal(applyCompiledProfile(s, droid).code, 'SUBTYPE_MISMATCH');
  assert.equal(JSON.stringify(s.draftSelections), before);
});

test('Apply is atomic: a rejected commit restores the previous draft exactly', async () => {
  const s = await createSession('actor');
  const first = await compile(byId('noble_leader'));
  applyCompiledProfile(s, first);
  const before = JSON.stringify(s.draftSelections);
  const real = s.commitSelection.bind(s);
  s.commitSelection = (step, key, value, opts) => (key === 'skills' ? false : real(step, key, value, opts));
  const r = applyCompiledProfile(s, await compile(byId('scoundrel_pistoleer')));
  assert.equal(r.ok, false);
  assert.equal(r.code, 'COMMIT_REJECTED');
  assert.equal(JSON.stringify(s.draftSelections), before);
});

test('switching profiles: unedited profile-owned values are replaced, player edits are kept and reported', async () => {
  const s = await createSession('actor');
  applyCompiledProfile(s, await compile(byId('noble_leader')));
  assert.equal(isOverridden(s, 'skills'), false);
  // the player changes their skills
  s.commitSelection('skills-step', 'skills', { trained: ['climb'], source: 'player' }, { replace: true });
  assert.equal(isOverridden(s, 'skills'), true);
  const r = applyCompiledProfile(s, await compile(byId('scoundrel_pistoleer')));
  assert.equal(r.ok, true);
  assert.ok(r.kept.includes('skills'), 'edited skills kept');
  assert.deepEqual(s.draftSelections.skills.trained, ['climb'], 'player skills untouched');
  assert.equal(s.draftSelections.class.id, (await compile(byId('scoundrel_pistoleer'))).draft.class.id, 'unedited class replaced');
  assert.equal(getProfileApplication(s).profileId, 'scoundrel_pistoleer');
  assert.ok(getProfileApplication(s).overrides.includes('skills'));
  // kept edited keys are no longer claimed as profile-owned
  assert.equal('skills' in getProfileApplication(s).owned, false);
});

test('one-item arrays REPLACE on Apply (no identity merge into the previous profile\'s list)', async () => {
  const s = await createSession('actor');
  const a = await compile(byId('noble_leader'));
  applyCompiledProfile(s, a);
  const b = await compile(byId('soldier_gunner'));
  assert.equal(b.ok, true);
  applyCompiledProfile(s, b);
  assert.deepEqual(s.draftSelections.talents.map(t => t.id), b.draft.talents.map(t => t.id));
});

test('droid Apply seeds the provisional custom build and syncs the (non-persisted) droid context', async () => {
  const s = await createSession('droid');
  s.droidContext = { creationMode: 'standard-model', degree: '1st-degree', size: 'medium' };
  const c = await compile(byId('droid_soldier_dex_security_enforcer'));
  assert.equal(applyCompiledProfile(s, c).ok, true);
  assert.equal(s.draftSelections.droid.creationMode, 'custom');
  assert.equal(s.draftSelections.droid.buildState.isFinalized, false);
  assert.equal(s.droidContext.creationMode, 'custom');
  assert.equal(s.droidContext.degree, '4th-degree');
  assert.equal('con' in s.draftSelections.attributes.values, false);
});

test('profileApplication persists through the existing snapshot and restores into a new session', async () => {
  const { SessionStorage } = await import('../scripts/apps/progression-framework/shell/session-storage.js');
  const s = await createSession('actor');
  applyCompiledProfile(s, await compile(byId('noble_leader')));
  const snapshot = clone(SessionStorage._compileSessionData(s, 'chargen'));
  assert.ok(snapshot.draftSelections.profileApplication);
  const fresh = await createSession('actor');
  assert.equal(SessionStorage.restoreIntoSession(fresh, snapshot), true);
  assert.equal(getProfileApplication(fresh).profileId, 'noble_leader');
  assert.equal(fingerprint(fresh.draftSelections.attributes), getProfileApplication(fresh).owned.attributes, 'ownership fingerprints survive resume');
  assert.deepEqual(getProfileApplication(fresh).economy, getProfileApplication(s).economy);
});

test('traversal filter: profile-satisfied steps are skipped, l1-survey always, and an edit releases the lock', async () => {
  const s = await createSession('actor');
  const all = ['intro', 'species', 'attribute', 'class', 'l1-survey', 'background', 'skills', 'general-feat', 'class-talent', 'languages', 'summary'];
  assert.deepEqual(filterActiveStepsForProfile(all, s), all, 'no profile: untouched');
  const c = await compile(byId('noble_leader'));
  assert.ok(c.locks.includes('species') && c.locks.includes('class') && c.locks.includes('attribute') && c.locks.includes('class-talent'));
  applyCompiledProfile(s, c);
  const open = filterActiveStepsForProfile(all, s);
  assert.deepEqual(open, ['intro', 'skills', 'general-feat', 'languages', 'summary'].filter(x => open.includes(x)));
  assert.equal(open.includes('class'), false);
  assert.equal(open.includes('l1-survey'), false);
  assert.equal(open.includes('general-feat'), true, 'feat count is V2-owned: not locked by array length');
  s.commitSelection('attribute-step', 'attributes', { values: { ...s.draftSelections.attributes.values, str: 18 } }, { replace: true });
  assert.equal(filterActiveStepsForProfile(all, s).includes('attribute'), true, 'edited key releases its lock');
});

test('locks persist with the application and survive resume', async () => {
  const { SessionStorage } = await import('../scripts/apps/progression-framework/shell/session-storage.js');
  const s = await createSession('actor');
  applyCompiledProfile(s, await compile(byId('noble_leader')));
  const fresh = await createSession('actor');
  SessionStorage.restoreIntoSession(fresh, clone(SessionStorage._compileSessionData(s, 'chargen')));
  assert.deepEqual(getProfileApplication(fresh).locks, getProfileApplication(s).locks);
});

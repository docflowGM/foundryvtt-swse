import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSession } from './helpers/session-harness.mjs';
import { createOfflineResolvers, loadProfilesDoc, loadSchema, loadCatalog } from './helpers/galactic-profile-fixtures.mjs';

const { ProfileClassStep, ProfileArchetypeStep, ProfileReviewStep } = await import('../scripts/apps/progression-framework/steps/galactic-profile-step.js');
const { GalacticProfileRegistry } = await import('../scripts/engine/progression/profile/galactic-profile-registry.js');
const { GalacticProfileService } = await import('../scripts/engine/progression/profile/galactic-profile-service.js');
const { compileProfile } = await import('../scripts/engine/progression/profile/galactic-profile-compiler.js');
const { applyCompiledProfile, getProfileApplication } = await import('../scripts/engine/progression/profile/galactic-profile-apply.js');
const { resolvers } = await createOfflineResolvers();
const doc = loadProfilesDoc();

// Test seam: prime the registry cache exactly as a successful load would (no network).
GalacticProfileRegistry._clearCache();
GalacticProfileRegistry._loaded = GalacticProfileRegistry.validateDocument(doc, loadSchema());
GalacticProfileRegistry._catalog = loadCatalog().profiles;

const makeShell = async subtype => {
  const session = await createSession(subtype);
  const calls = { render: 0, persist: 0 };
  return { calls, shell: { actor: { id: 'a', type: subtype === 'droid' ? 'droid' : 'character', items: [] }, progressionSession: session, steps: [], currentStepIndex: 0, mentor: {},
    requestRender: async () => { calls.render += 1; }, _persistSessionSnapshot: async () => { calls.persist += 1; }, _initializeSteps: async () => {}, _activateStep: async () => {} } };
};
const step = (Cls, id, shell) => { const s = new Cls({ stepId: id }); s._shell = shell; return s; };

test('entering the class step selects NOTHING (no implicit first class or profile)', async () => {
  const { shell } = await makeShell('actor');
  const s = step(ProfileClassStep, 'profile-class', shell);
  await s._ensureProfileData(shell);
  const data = await s.getStepData(shell);
  assert.equal(data.selectedClass, null);
  assert.equal(data.selectedClassId, null);
  assert.equal(s.getSelection().isComplete, false);
  assert.ok(s.getBlockingIssues().length > 0);
  assert.equal(shell.progressionSession.profileSelection.templateId ?? null, null);
  assert.deepEqual(data.classes.map(c => c.name).sort(), ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier']);
  assert.ok(data.classes.every(c => c.selected === false));
});

test('only EXACT-subtype profiles are offered: actor never sees droids; droid sees exactly its eight; nonheroic only nonheroic', async () => {
  for (const [subtype, n] of [['actor', 23], ['droid', 8], ['nonheroic', 8], ['beast', 2]]) {
    const { shell } = await makeShell(subtype);
    const s = step(ProfileClassStep, 'profile-class', shell);
    await s._ensureProfileData(shell);
    assert.equal(s._profiles.length, n, subtype);
    assert.ok(s._profiles.every(p => p.subtype === subtype));
  }
  const { shell } = await makeShell('standard');
  const s = step(ProfileClassStep, 'profile-class', shell);
  await s._ensureProfileData(shell);
  assert.equal(s._profiles.length, 0, 'unknown/aliased subtype offers nothing');
});

test('explicit class then profile choice; changing class invalidates a stale profile choice', async () => {
  const { shell } = await makeShell('actor');
  const cls = step(ProfileClassStep, 'profile-class', shell);
  const arch = step(ProfileArchetypeStep, 'profile-archetype', shell);
  await cls._selectProfileClass(shell, 'noble');
  assert.equal(shell.progressionSession.profileSelection.classId, 'noble');
  assert.equal(shell.progressionSession.profileSelection.templateId ?? null, null, 'no auto archetype');
  const view = await arch.getStepData(shell);
  assert.equal(view.archetypes.length, 4);
  assert.equal(view.selectedTemplateId, null);
  await arch._selectProfile(shell, 'noble_leader');
  assert.equal(shell.progressionSession.profileSelection.templateId, 'noble_leader');
  await cls._selectProfileClass(shell, 'scout');
  assert.equal(shell.progressionSession.profileSelection.templateId, null, 'stale archetype cleared on class change');
  assert.equal(await cls._selectProfileClass(shell, 'no-such-class'), false);
  assert.equal(await arch._selectProfile(shell, 'droid_scout_dex_recon_probe'), false, 'a droid profile cannot be chosen in an actor session');
});

test('Review: no onStepExit apply; Next stays blocked until the explicit Apply; Back/Close never apply', async () => {
  assert.equal(Object.prototype.hasOwnProperty.call(ProfileReviewStep.prototype, 'onStepExit'), false);
  const { shell } = await makeShell('actor');
  const review = step(ProfileReviewStep, 'profile-review', shell);
  await review._ensureProfileData(shell);
  shell.progressionSession.profileSelection = { classId: 'noble', templateId: 'noble_leader' };
  assert.deepEqual(review.getBlockingIssues(), ['Apply the profile to continue.']);
  assert.equal(review.validate().isValid, false);
  await review.onStepExit?.(shell);
  assert.equal(getProfileApplication(shell.progressionSession), null, 'exit/Back/Close do not apply');
  // explicit apply (offline compile standing in for the Foundry-only service wiring)
  const original = GalacticProfileService.applyForShell;
  GalacticProfileService.applyForShell = async (sh, id) => {
    const profile = doc.profiles.find(p => p.profileId === id);
    const compiled = await compileProfile(profile, { sessionSubtype: sh.progressionSession.subtype, resolvers, settings: { droidConstructionCredits: 1000 } });
    if (!compiled.ok) return { ok: false, code: 'COMPILE_BLOCKED', compiled };
    return { ...applyCompiledProfile(sh.progressionSession, compiled), compiled };
  };
  try {
    assert.equal(await review.handleAction('profile-apply', null, null, shell), true);
    assert.deepEqual(review.getBlockingIssues(), []);
    assert.equal(getProfileApplication(shell.progressionSession).profileId, 'noble_leader');
    // a rapid second click while applying, or a repeat, changes nothing
    const snap = JSON.stringify(shell.progressionSession.draftSelections);
    await review.handleAction('profile-apply', null, null, shell);
    assert.equal(JSON.stringify(shell.progressionSession.draftSelections), snap);
  } finally { GalacticProfileService.applyForShell = original; }
});

test('a blocked profile cannot be applied and leaves the session untouched', async () => {
  const { shell } = await makeShell('actor');
  const review = step(ProfileReviewStep, 'profile-review', shell);
  await review._ensureProfileData(shell);
  shell.progressionSession.profileSelection = { classId: 'scout', templateId: 'scout_sniper' };
  const original = GalacticProfileService.applyForShell;
  GalacticProfileService.applyForShell = async (sh, id) => {
    const compiled = await compileProfile(doc.profiles.find(p => p.profileId === id), { sessionSubtype: 'actor', resolvers, settings: { droidConstructionCredits: 1000 } });
    return compiled.ok ? applyCompiledProfile(sh.progressionSession, compiled) : { ok: false, code: 'COMPILE_BLOCKED', compiled };
  };
  globalThis.ui = { notifications: { warn() {}, info() {} } };
  try {
    const before = JSON.stringify(shell.progressionSession.draftSelections);
    assert.equal(await review.handleAction('profile-apply', null, null, shell), false);
    assert.equal(JSON.stringify(shell.progressionSession.draftSelections), before);
    assert.equal(review.getBlockingIssues().length, 1);
  } finally { GalacticProfileService.applyForShell = original; }
});

test('source contracts: no template system, Apply action present, droid splash uses the shared picker', () => {
  const src = fs.readFileSync(new URL('../scripts/apps/progression-framework/steps/galactic-profile-step.js', import.meta.url), 'utf8');
  assert.equal(/Template(Registry|Adapter|Validator|TraversalPolicy|Initializer)/.test(src), false);
  assert.match(src, /action === 'profile-apply'/);
  assert.equal(/groups\[0\]|templates\[0\]|profiles\[0\]/.test(src), false, 'no implicit first-item selection');
  const intro = fs.readFileSync(new URL('../scripts/apps/progression-framework/steps/intro-step.js', import.meta.url), 'utf8');
  assert.equal(/droid-select-standard|TemplateInitializer/.test(intro), false);
  const hbs = fs.readFileSync(new URL('../templates/apps/progression-framework/steps/intro-work-surface.hbs', import.meta.url), 'utf8');
  assert.equal(hbs.includes('droid-select-standard'), false);
  const review = fs.readFileSync(new URL('../templates/apps/progression-framework/steps/galactic-profile-review-work-surface.hbs', import.meta.url), 'utf8');
  assert.match(review, /data-action="profile-apply"/);
});

test('perf: class and archetype steps render from the catalog alone; the full profile document loads only at Review', async () => {
  const savedLoaded = GalacticProfileRegistry._loaded; const savedFetch = globalThis.fetch;
  GalacticProfileRegistry._loaded = null;                       // full profiles NOT loaded
  const requested = [];
  globalThis.fetch = async url => { requested.push(String(url)); return { ok: true, json: async () => ({ mentors: {} }) }; };
  try {
    const { shell } = await makeShell('actor');
    const cls = step(ProfileClassStep, 'profile-class', shell);
    const arch = step(ProfileArchetypeStep, 'profile-archetype', shell);
    await cls.preload(shell);
    await cls.getStepData(shell);
    await cls._selectProfileClass(shell, 'jedi');
    const view = await arch.getStepData(shell);
    assert.equal(view.archetypes.length, 4);
    assert.ok(view.archetypes[0].abilities.length === 6 && view.archetypes[0].species, 'cards are fully populated from the catalog preview');
    assert.equal(requested.some(u => u.includes('galactic-profiles.json') || u.includes('schema')), false, `full profiles must not load before Review (requested: ${requested})`);
    assert.equal(GalacticProfileRegistry._loaded, null);
  } finally { GalacticProfileRegistry._loaded = savedLoaded; globalThis.fetch = savedFetch; }
});

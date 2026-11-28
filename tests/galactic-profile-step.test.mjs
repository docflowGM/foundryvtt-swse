import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createSession } from './helpers/session-harness.mjs';
import { createOfflineResolvers, loadProfilesDoc, loadSchema, loadCatalog } from './helpers/galactic-profile-fixtures.mjs';

const { ProfileArchetypeStep, ProfileReviewStep } = await import('../scripts/apps/progression-framework/steps/galactic-profile-step.js');
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

test('unified gallery initially shows all subtype-compatible profiles with no implicit selection', async () => {
  const { shell } = await makeShell('actor');
  const picker = step(ProfileArchetypeStep, 'profile-archetype', shell);
  const data = await picker.getStepData(shell);
  assert.equal(data.browseClassId, 'all');
  assert.equal(data.selectedPreview, null);
  assert.equal(data.archetypes.length, 23);
  assert.equal(picker.getSelection().isComplete, false);
  assert.ok(picker.getBlockingIssues().length > 0);
  assert.equal(shell.progressionSession.profileSelection?.templateId ?? null, null);
  assert.equal(shell.progressionSession.profileSelection?.classId ?? null, null, 'browsing commits no class identity');
  assert.deepEqual(data.classes.map(c => c.name).sort(), ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier']);
  assert.ok(data.classes.every(c => c.selected === false));
  assert.ok(data.archetypes.every(c => typeof c.searchText === 'string' && c.searchText.includes(c.archetype.toLocaleLowerCase())), 'cards carry derived search text');
});

test('only EXACT-subtype profiles are offered: actor never sees droids; droid sees exactly its eight; nonheroic only nonheroic', async () => {
  for (const [subtype, n] of [['actor', 23], ['droid', 8], ['nonheroic', 8], ['beast', 2]]) {
    const { shell } = await makeShell(subtype);
    const s = step(ProfileArchetypeStep, 'profile-archetype', shell);
    await s._ensureProfileData(shell);
    assert.equal(s._profiles.length, n, subtype);
    assert.equal((await s.getStepData(shell)).archetypes.length, n, `${subtype} gallery shows exactly its catalogue`);
    assert.ok(s._profiles.every(p => p.subtype === subtype));
  }
  const { shell } = await makeShell('standard');
  const s = step(ProfileArchetypeStep, 'profile-archetype', shell);
  await s._ensureProfileData(shell);
  assert.equal(s._profiles.length, 0, 'unknown/aliased subtype offers nothing');
  const empty = await s.getStepData(shell);
  assert.equal(empty.allProfileCount, 0, 'an empty catalogue is reported so the gallery can show its own message');
  assert.equal(empty.archetypes.length, 0);
});

test('class filter changes visible cards without committing or clearing character identity', async () => {
  const { shell } = await makeShell('actor');
  const picker = step(ProfileArchetypeStep, 'profile-archetype', shell);
  assert.equal(await picker._setBrowseClass(shell, 'jedi'), true);
  let data = await picker.getStepData(shell);
  assert.equal(data.archetypes.length, 4);
  assert.equal(data.browseLabel, 'Jedi');
  assert.equal(shell.progressionSession.profileSelection?.templateId ?? null, null, 'browsing selects nothing');
  assert.equal(shell.progressionSession.profileSelection?.classId ?? null, null, 'browsing commits no class');
  assert.equal(await picker._selectProfile(shell, 'jedi_guardian'), true);
  data = await picker.getStepData(shell);
  assert.equal(data.selectedPreview.id, 'jedi_guardian');
  assert.equal(shell.progressionSession.profileSelection.classId, 'jedi');
  assert.equal(await picker._setBrowseClass(shell, 'noble'), true);
  data = await picker.getStepData(shell);
  assert.equal(data.archetypes.length, 4);
  assert.equal(data.selectedPreview.id, 'jedi_guardian', 'filter must not discard the chosen profile');
  assert.equal(shell.progressionSession.profileSelection.templateId, 'jedi_guardian');
  assert.equal(data.archetypes.some(c => c.selected), false, 'the chosen card is simply not in this filtered view');
  assert.equal(await picker._setBrowseClass(shell, 'all'), true);
  data = await picker.getStepData(shell);
  assert.equal(data.archetypes.length, 23);
  assert.equal(data.archetypes.find(c => c.selected)?.id, 'jedi_guardian');
  assert.equal(await picker._setBrowseClass(shell, 'bad-class'), false);
  assert.equal(data.browseClassId, 'all', 'an invalid class never changes the filter');
});

test('selecting another profile switches the committed choice; a droid profile cannot be chosen in an actor session', async () => {
  const { shell } = await makeShell('actor');
  const picker = step(ProfileArchetypeStep, 'profile-archetype', shell);
  await picker._selectProfile(shell, 'jedi_guardian');
  await picker._selectProfile(shell, 'jedi_consular');
  assert.equal(shell.progressionSession.profileSelection.templateId, 'jedi_consular');
  assert.equal(picker.getSelection().isComplete, true);
  assert.deepEqual(picker.getBlockingIssues(), []);
  assert.equal(await picker._selectProfile(shell, 'droid_scout_dex_recon_probe'), false);
  assert.equal(shell.progressionSession.profileSelection.templateId, 'jedi_consular', 'a rejected choice changes nothing');
});

test('the retired Class step and its action are gone; only the gallery selection actions remain', async () => {
  const mod = await import('../scripts/apps/progression-framework/steps/galactic-profile-step.js');
  assert.equal('ProfileClassStep' in mod, false);
  const { shell } = await makeShell('actor');
  const picker = step(ProfileArchetypeStep, 'profile-archetype', shell);
  assert.equal(await picker.handleAction('profile-select-class', null, { dataset: { profileClassId: 'jedi' } }, shell), false, 'unknown action is ignored');
  assert.equal(shell.progressionSession.profileSelection?.classId ?? null, null);
  assert.equal(await picker.handleAction('profile-filter-class', null, { dataset: { profileClassId: 'scout' } }, shell), true);
  assert.equal((await picker.getStepData(shell)).archetypes.length, 5);
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

test('perf: the gallery renders and filters from the catalog alone; the full profile document loads only at Review', async () => {
  const savedLoaded = GalacticProfileRegistry._loaded; const savedFetch = globalThis.fetch;
  GalacticProfileRegistry._loaded = null;                       // full profiles NOT loaded
  const requested = [];
  globalThis.fetch = async url => { requested.push(String(url)); return { ok: true, json: async () => ({ mentors: {} }) }; };
  try {
    const { shell } = await makeShell('actor');
    const arch = step(ProfileArchetypeStep, 'profile-archetype', shell);
    await arch.preload(shell);
    await arch.getStepData(shell);
    await arch._setBrowseClass(shell, 'jedi');
    const view = await arch.getStepData(shell);
    assert.equal(view.archetypes.length, 4);
    assert.ok(view.archetypes[0].abilities.length === 6 && view.archetypes[0].species, 'cards are fully populated from the catalog preview');
    await arch._selectProfile(shell, 'jedi_guardian');
    assert.equal((await arch.getStepData(shell)).selectedPreview.id, 'jedi_guardian');
    assert.equal(requested.some(u => u.includes('galactic-profiles.json') || u.includes('schema')), false, `full profiles must not load before Review (requested: ${requested})`);
    assert.equal(GalacticProfileRegistry._loaded, null);
  } finally { GalacticProfileRegistry._loaded = savedLoaded; globalThis.fetch = savedFetch; }
});

// ---- Gallery search: DOM-level behaviour with a minimal fake element graph ----
const fakeGallery = (cardDefs, initialValue = '') => {
  const cards = cardDefs.map(([id, text]) => ({ dataset: { profileTemplateId: id, profileSearchText: text }, hidden: false }));
  const results = { textContent: '' };
  const empty = { hidden: true };
  const listeners = {};
  let bindCount = 0;
  const input = { value: initialValue, dataset: {}, addEventListener: (type, fn) => { bindCount += 1; listeners[type] = fn; } };
  const root = {
    querySelector: sel => (sel.includes('search') ? input : sel.includes('results') ? results : sel.includes('empty') ? empty : null),
    querySelectorAll: () => cards,
  };
  const element = { querySelector: sel => (sel === '.prog-galactic-profile--archetype' ? root : null) };
  return { cards, results, empty, input, listeners, element, bindCount: () => bindCount };
};

test('gallery search hides/shows existing cards only: counts, empty state, no selection change, no fetch', async () => {
  const savedFetch = globalThis.fetch; let fetched = 0;
  globalThis.fetch = async () => { fetched += 1; return { ok: true, json: async () => ({ mentors: {} }) }; };
  try {
    const { shell } = await makeShell('actor');
    const picker = step(ProfileArchetypeStep, 'profile-archetype', shell);
    await picker._selectProfile(shell, 'noble_leader');
    const dom = fakeGallery([['jedi_guardian', 'guardian jedi human'], ['noble_leader', 'leader noble'], ['scout_sniper', 'sniper scout']]);
    shell.element = dom.element;
    await picker.onDataReady(shell);
    await picker.onDataReady(shell); // a second onDataReady on the same DOM must not stack a second handler
    assert.equal(dom.bindCount(), 1, 'exactly one input listener per rendered input');
    assert.equal(dom.results.textContent, '3 profiles found');
    assert.equal(dom.empty.hidden, true);
    const before = fetched;

    dom.input.value = 'GUARDIAN';
    dom.listeners.input();
    assert.deepEqual(dom.cards.map(c => c.hidden), [false, true, true], 'case-insensitive match; others hidden');
    assert.equal(dom.results.textContent, '1 profile found', 'singular label');
    assert.equal(picker._gallerySearch, 'GUARDIAN');
    assert.equal(shell.progressionSession.profileSelection.templateId, 'noble_leader', 'searching never changes the selected profile');

    dom.input.value = 'zzz-nothing';
    dom.listeners.input();
    assert.equal(dom.cards.every(c => c.hidden), true);
    assert.equal(dom.results.textContent, '0 profiles found');
    assert.equal(dom.empty.hidden, false, 'search-miss message shown');

    dom.input.value = '';
    dom.listeners.input();
    assert.equal(dom.cards.some(c => c.hidden), false, 'clearing restores every card');
    assert.equal(dom.empty.hidden, true);
    assert.equal(fetched, before, 'search never fetches or compiles anything');

    // A re-render (class filter / selection) builds a fresh input: the query is restored, listener bound once.
    dom.input.value = 'sniper';
    dom.listeners.input();
    const rerendered = fakeGallery([['scout_sniper', 'sniper scout'], ['scout_engineer', 'engineer scout']]);
    shell.element = rerendered.element;
    await picker.onDataReady(shell);
    assert.equal(rerendered.input.value, 'sniper', 'search text survives a re-render');
    assert.deepEqual(rerendered.cards.map(c => c.hidden), [false, true]);
    assert.equal(Object.keys(rerendered.listeners).length, 1, 'exactly one input listener (no duplicate handlers)');
  } finally { globalThis.fetch = savedFetch; }
});

test('a genuinely empty catalogue never shows the search-miss message', async () => {
  const { shell } = await makeShell('actor');
  const picker = step(ProfileArchetypeStep, 'profile-archetype', shell);
  const dom = fakeGallery([]);
  shell.element = dom.element;
  await picker.onDataReady(shell);
  assert.equal(dom.empty.hidden, true);
  assert.equal(dom.results.textContent, '0 profiles found');
});

test('browse filter and selection never apply a profile or touch the actor', async () => {
  const { shell, calls } = await makeShell('actor');
  const picker = step(ProfileArchetypeStep, 'profile-archetype', shell);
  const draftBefore = JSON.stringify(shell.progressionSession.draftSelections);
  await picker._setBrowseClass(shell, 'jedi');
  await picker._selectProfile(shell, 'jedi_guardian');
  await picker._setBrowseClass(shell, 'all');
  assert.equal(getProfileApplication(shell.progressionSession), null, 'no profile applied by browsing or selecting');
  assert.equal(JSON.stringify(shell.progressionSession.draftSelections), draftBefore, 'draft selections untouched');
  assert.equal(calls.persist, 0, 'no snapshot writes from browsing');
  assert.ok(calls.render >= 3, 'each browse/select requests a re-render');
});

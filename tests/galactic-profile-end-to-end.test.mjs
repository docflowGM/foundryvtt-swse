import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from './helpers/session-harness.mjs';
import { installPackShim, installFetchShim } from './helpers/pack-shim.mjs';
import { loadProfilesDoc, loadSchema } from './helpers/galactic-profile-fixtures.mjs';

/**
 * End-to-end through the PRODUCTION path (offline): GalacticProfileService.applyForShell -> real ProgressionSession ->
 * real ProgressionFinalizer._compileMutationPlan (+ DroidSubtypeAdapter for droids), with V2's real registries,
 * class-grant ledger and economy builder. Only compendium document loading is stubbed. No ActorEngine/Actor is involved:
 * "actor untouched" is asserted on the plain actor object handed to the finalizer.
 */
installPackShim();
installFetchShim();
const { GalacticProfileRegistry } = await import('../scripts/engine/progression/profile/galactic-profile-registry.js');
const { GalacticProfileService } = await import('../scripts/engine/progression/profile/galactic-profile-service.js');
const { ProgressionFinalizer } = await import('../scripts/apps/progression-framework/shell/progression-finalizer.js');
const { DroidSubtypeAdapter } = await import('../scripts/apps/progression-framework/adapters/default-subtypes.js');
const { getProfileApplication, filterActiveStepsForProfile, isOverridden } = await import('../scripts/engine/progression/profile/galactic-profile-apply.js');
ProgressionFinalizer._loadCanonicalItemData = async e => ({ _id: 'x', name: e.name, type: /rifle|pistol|blade|saber/i.test(e.name) ? 'weapon' : 'equipment', system: {}, flags: {} });

const doc = loadProfilesDoc(); const schema = loadSchema();
const clone = v => JSON.parse(JSON.stringify(v));
const byId = id => clone(doc.profiles.find(p => p.profileId === id));
const prime = (...profiles) => {
  const d = clone(doc);
  for (const p of profiles) d.profiles = d.profiles.filter(x => x.profileId !== p.profileId).concat(p);
  GalacticProfileRegistry._loaded = GalacticProfileRegistry.validateDocument(d, schema);
};

async function boot(subtype) {
  const actor = { id: 'a', name: 'New', type: subtype === 'droid' ? 'droid' : 'character', items: [], system: { level: 0, credits: 0, skills: {}, attributes: {}, abilities: {}, ...(subtype === 'droid' ? { isDroid: true } : {}) }, flags: {}, img: 'x' };
  const session = await createSession(subtype);
  if (subtype === 'droid') session.droidContext = { creationMode: 'standard-model', degree: '1st-degree', size: 'medium' };
  const shell = { actor, progressionSession: session, steps: [], currentStepIndex: 0, _initializeSteps: async () => {}, _persistSessionSnapshot: async () => {} };
  return { actor, session, shell };
}
const plan = async ({ actor, session }) => ProgressionFinalizer._compileMutationPlan({ mode: 'chargen', sessionId: 'S', actor, progressionSession: session }, actor);
const names = (p, type) => p.add.items.filter(i => i.type === type).map(i => i.name);
const dupes = list => list.filter((n, i) => list.indexOf(n) !== i);

test('apply → plan: exact wallet, class + V2 class-granted feats exactly once, kit, selections, nothing duplicated, actor untouched', async () => {
  prime(); const b = await boot('actor'); const before = JSON.stringify(b.actor);
  const res = await GalacticProfileService.applyForShell(b.shell, 'noble_leader');
  assert.equal(res.ok, true, JSON.stringify(res.compiled?.blocked));
  const p = await plan(b);
  assert.equal(JSON.stringify(b.actor), before);
  assert.equal(p.set['system.credits'], 625);
  assert.deepEqual(names(p, 'class'), ['Noble']);
  assert.ok(names(p, 'feat').includes('Weapon Proficiency (Pistols)') && names(p, 'feat').includes('Weapon Proficiency (Simple Weapons)'), 'V2 class grants present');
  assert.ok(names(p, 'feat').includes('Improved Defenses') && names(p, 'talent').includes('Born Leader'));
  for (const t of ['feat', 'talent', 'class']) assert.deepEqual(dupes(names(p, t)), [], `no duplicate ${t}`);
  assert.equal(p.add.items.filter(i => i.flags?.swse?.progression?.selectionKey === 'galactic-profile-equipment').length, 3);
  // V2 itself leaves the Human's second general feat to the player: the step is OPEN, not silently filled
  assert.deepEqual(getProfileApplication(b.session).open.map(o => o.stepId), ['general-feat']);
});

test('player edits after Apply win in the plan and release their step lock; unedited profile values remain', async () => {
  prime(); const b = await boot('actor');
  await GalacticProfileService.applyForShell(b.shell, 'noble_leader');
  const profileSkills = [...b.session.draftSelections.skills.trained];
  const mine = ['climb', 'swim'];
  b.session.commitSelection('skills-step', 'skills', { trained: mine, source: 'player' }, { replace: true });
  assert.equal(isOverridden(b.session, 'skills'), true);
  assert.equal(filterActiveStepsForProfile(['skills', 'class', 'attribute'], b.session).includes('skills'), true, 'edited key is visible again');
  assert.equal(filterActiveStepsForProfile(['skills', 'class', 'attribute'], b.session).includes('class'), false, 'unedited class stays satisfied');
  const p = await plan(b);
  const trainedKeys = Object.keys(p.set).filter(k => /^system\.skills\.[a-zA-Z]+\.trained$/.test(k) && p.set[k] === true).map(k => k.split('.')[2]).sort();
  assert.deepEqual(trainedKeys, [...mine].sort());
  assert.equal(trainedKeys.some(k => profileSkills.includes(k) && !mine.includes(k)), false, 'profile skills do not leak back in');
});

test('re-applying the same profile is a no-op and compiles an identical plan', async () => {
  prime(); const b = await boot('actor');
  await GalacticProfileService.applyForShell(b.shell, 'noble_leader');
  const a = await plan(b);
  const again = await GalacticProfileService.applyForShell(b.shell, 'noble_leader');
  assert.equal(again.changed, false);
  const c = await plan(b);
  const sig = x => JSON.stringify({ c: x.set['system.credits'], i: x.add.items.map(i => [i.type, i.name, i.system?.quantity ?? null]) });
  assert.equal(sig(a), sig(c));
});

test('switching between two unedited profiles yields exactly the plan of applying the second fresh (no leftovers)', async () => {
  prime();
  const sw = await boot('actor');
  await GalacticProfileService.applyForShell(sw.shell, 'noble_leader');
  const sres = await GalacticProfileService.applyForShell(sw.shell, 'scoundrel_pistoleer');
  assert.equal(sres.ok, true, JSON.stringify(sres.compiled?.blocked));
  const fresh = await boot('actor');
  await GalacticProfileService.applyForShell(fresh.shell, 'scoundrel_pistoleer');
  const sig = x => JSON.stringify({ c: x.set['system.credits'], i: x.add.items.map(i => [i.type, i.name, i.system?.quantity ?? null]).sort() });
  assert.equal(sig(await plan(sw)), sig(await plan(fresh)));
  assert.equal(getProfileApplication(sw.session).profileId, 'scoundrel_pistoleer');
});

test('Wealth, zero balance and background credits never alter the authored final wallet (production path)', async () => {
  const wealth = byId('noble_leader'); wealth.choices.talents = [{ name: 'Wealth', sourceIds: ['wealth'] }]; wealth.choices.wallet.credits = 465;
  prime(wealth); let b = await boot('actor');
  assert.equal((await GalacticProfileService.applyForShell(b.shell, 'noble_leader')).ok, true);
  assert.equal((await plan(b)).set['system.credits'], 465);
  const zero = byId('noble_leader'); zero.choices.wallet.credits = 0;
  prime(zero); b = await boot('actor');
  await GalacticProfileService.applyForShell(b.shell, 'noble_leader');
  const p = await plan(b);
  assert.equal(p.set['system.credits'], 0);
  assert.ok(p.add.items.length > 0);
});

test('droid: applied through the service, the plan + adapter give exact class credits, one ledger, V2 class grants once, base/racial once', async () => {
  prime(); const b = await boot('droid');
  const res = await GalacticProfileService.applyForShell(b.shell, 'droid_soldier_dex_security_enforcer');
  assert.equal(res.ok, true, JSON.stringify(res.compiled?.blocked));
  assert.equal(b.session.droidContext.creationMode, 'custom', 'the profile forces custom, never standard-model');
  const p = await plan(b);
  const final = await new DroidSubtypeAdapter().contributeMutationPlan(p, b.session, b.actor);
  assert.equal(final.set['system.credits'], 875, 'class starting credits net of purchases, NOT + the 1000 construction budget');
  assert.deepEqual(final.set['system.droidCredits'], { base: 1000, spent: 1000, remaining: 0, allowOverflow: false });
  assert.ok(Object.keys(final.set['system.installedSystems']).length >= 8);
  assert.equal(final.set['system.attributes.dex.base'], 15);
  assert.equal(final.set['system.attributes.dex.racial'], 2);
  assert.equal(final.set['system.attributes.con.base'], 0);
  const feats = names(final, 'feat');
  for (const g of ['Armor Proficiency (Light)', 'Armor Proficiency (Medium)', 'Weapon Proficiency (Pistols)', 'Weapon Proficiency (Rifles)', 'Weapon Proficiency (Simple Weapons)']) assert.equal(feats.filter(n => n === g).length, 1, `${g} exactly once`);
  assert.deepEqual(dupes(feats), []);
  assert.equal(final.add.items.some(i => /plasteel|comlink|sensor|darkvision|heuristic/i.test(i.name) && i.type !== 'equipment'), false);
  assert.equal(final.add.items.filter(i => /Plasteel Shell|Internal Comlink|Darkvision|Improved Sensor/i.test(i.name)).length, 0, 'integrated hardware is never an external item');
});

test('all eight droids: apply + plan + adapter agree with the authored final scores and the exact 1000-credit build', async () => {
  prime();
  const fs = await import('node:fs');
  const evidence = JSON.parse(fs.readFileSync(new URL('../data/galactic-profiles/v3/galactic-profiles.evidence.json', import.meta.url), 'utf8')).profiles;
  for (const p of doc.profiles.filter(x => x.subtype === 'droid')) {
    const b = await boot('droid');
    const res = await GalacticProfileService.applyForShell(b.shell, p.profileId);
    assert.equal(res.ok, true, `${p.profileId} ${JSON.stringify(res.compiled?.blocked)}`);
    const final = await new DroidSubtypeAdapter().contributeMutationPlan(await plan(b), b.session, b.actor);
    const authored = evidence[p.profileId].build.attributes.scores;
    for (const k of ['str', 'dex', 'int', 'wis', 'cha']) assert.equal(final.set[`system.attributes.${k}.base`] + (final.set[`system.attributes.${k}.racial`] ?? 0), authored[k], `${p.profileId} ${k}`);
    assert.equal(final.set['system.droidCredits'].spent, 1000);
    assert.equal(final.set['system.credits'], evidence[p.profileId].build.startingPackage.wallet.credits);
    assert.deepEqual(dupes(names(final, 'feat')), [], p.profileId);
  }
});

test('a blocked profile cannot be applied through the service; the session and plan stay empty', async () => {
  prime(); const b = await boot('actor');
  const before = JSON.stringify(b.session.draftSelections);
  const res = await GalacticProfileService.applyForShell(b.shell, 'scout_sniper');
  assert.equal(res.ok, false);
  assert.equal(res.code, 'COMPILE_BLOCKED');
  assert.equal(JSON.stringify(b.session.draftSelections), before);
});

test('nonheroic: the NPC/nonheroic lane applies a profile into a real class item (isNonheroic, level 1), no talents, exact wallet and kit', async () => {
  prime();
  const actor = { id: 'n1', name: 'New NPC', type: 'npc', items: [], system: { level: 0, credits: 0, skills: {}, attributes: {}, abilities: {}, swse: { progressionSubtype: 'nonheroic' } }, flags: {}, img: 'x' };
  const session = await createSession('nonheroic');
  await session.subtypeAdapter.seedSession(session, actor, 'chargen');     // what the shell does on open
  assert.equal(session.nonheroicContext.hasNonheroic, true, 'implicit nonheroic class seeded for an NPC lane');
  const shell = { actor, progressionSession: session, steps: [], currentStepIndex: 0, _initializeSteps: async () => {}, _persistSessionSnapshot: async () => {} };
  const res = await GalacticProfileService.applyForShell(shell, 'nonheroic_worker');
  assert.equal(res.ok, true, JSON.stringify(res.compiled?.blocked));
  const p = await plan({ actor, session });
  const cls = p.add.items.find(i => i.type === 'class');
  assert.equal(cls.system.isNonheroic, true);
  assert.equal(cls.system.level, 1, 'V-NH-1: first nonheroic class item is level 1, not the model\'s 0');
  assert.deepEqual(names(p, 'talent'), []);
  assert.equal(p.set['system.credits'], 125);
  assert.equal(p.add.items.filter(i => i.flags?.swse?.progression?.selectionKey === 'galactic-profile-equipment').length, 3);
  const adapted = await session.subtypeAdapter.contributeMutationPlan(p, session, actor);
  assert.equal(adapted.nonheroic?.isNonheroic, true);
  await assert.doesNotReject(session.subtypeAdapter.validateReadiness(session, actor));
  // the lane is exact: an actor-lane session never offers/applies it
  const actorSession = await createSession('actor');
  const wrong = await GalacticProfileService.applyForShell({ ...shell, progressionSession: actorSession }, 'nonheroic_worker');
  assert.equal(wrong.ok, false);
  assert.ok(wrong.compiled.blocked.some(b => b.code === 'SUBTYPE_MISMATCH'));
});

test('the nonheroic entry point exists, is GM-only, and opens the NPC/nonheroic lane with the profile picker', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../scripts/infrastructure/hooks/directory-hooks.js', import.meta.url), 'utf8');
  assert.match(src, /game\.user\?\.isGM/);
  assert.match(src, /launchNewProgression\(\{ actorType: 'npc', subtype: 'nonheroic', profilePicker: true \}\)/);
  assert.equal(/subtype: 'beast'/.test(src), false, 'no beast lane while beasts are blocked');
});

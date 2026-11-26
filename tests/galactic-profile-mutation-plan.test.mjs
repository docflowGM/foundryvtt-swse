import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession } from './helpers/session-harness.mjs';
import { createOfflineResolvers, loadProfilesDoc } from './helpers/galactic-profile-fixtures.mjs';

const { ProgressionFinalizer } = await import('../scripts/apps/progression-framework/shell/progression-finalizer.js');
const { compileProfile } = await import('../scripts/engine/progression/profile/galactic-profile-compiler.js');
const { applyCompiledProfile } = await import('../scripts/engine/progression/profile/galactic-profile-apply.js');
const { DroidSubtypeAdapter } = await import('../scripts/apps/progression-framework/adapters/default-subtypes.js');
const { resolvers } = await createOfflineResolvers();
const doc = loadProfilesDoc();
const byId = id => JSON.parse(JSON.stringify(doc.profiles.find(p => p.profileId === id)));
const settings = { droidConstructionCredits: 1000 };

// The ONLY stub: compendium document loading (needs a live Foundry world). Everything else is the real finalizer.
const loaded = [];
ProgressionFinalizer._loadCanonicalItemData = async e => { loaded.push(e.itemId); return { _id: 'compendium-id', name: e.name, type: /rifle|pistol|saber|blaster/i.test(e.name) ? 'weapon' : 'equipment', system: { quantity: 1 }, flags: {} }; };

async function planFor(profile, { actor } = {}) {
  const session = await createSession(profile.subtype);
  if (profile.subtype === 'droid') session.droidContext = { creationMode: 'custom', degree: '1st-degree', size: 'medium' };
  const compiled = await compileProfile(profile, { sessionSubtype: profile.subtype, resolvers, settings });
  assert.equal(compiled.ok, true, JSON.stringify(compiled.blocked));
  assert.equal(applyCompiledProfile(session, compiled).ok, true);
  const a = actor ?? { id: 'a1', name: 'New', type: profile.subtype === 'droid' ? 'droid' : 'character', items: [], system: { level: 0, credits: 0 }, flags: {}, img: 'icons/svg/mystery-man.svg' };
  const before = JSON.stringify(a);
  const state = { mode: 'chargen', sessionId: 'S', actor: a, progressionSession: session };
  const plan = await ProgressionFinalizer._compileMutationPlan(state, a);
  assert.equal(JSON.stringify(a), before, 'compiling the plan never mutates the actor');
  return { plan, session, actor: a, state };
}

test('the real finalizer compiles an applied profile into ONE plan: exact credits, class item with full system, kit, feat, talent', async () => {
  const { plan } = await planFor(byId('noble_leader'));
  assert.equal(plan.set['system.credits'], 625);
  const items = plan.add.items;
  const cls = items.find(i => i.type === 'class');
  assert.equal(cls.name, 'Noble');
  assert.ok(Object.keys(cls.system).length > 0, 'class item carries the registry system');
  assert.deepEqual(items.filter(i => i.flags?.swse?.progression?.selectionKey === 'galactic-profile-equipment').map(i => i.name).sort(), ['Comlink, Short-Range', 'Heavy Blaster Pistol', 'Medpac']);
  assert.ok(items.some(i => i.type === 'feat' && i.name === 'Improved Defenses'));
  assert.ok(items.some(i => i.type === 'talent' && i.name === 'Born Leader'));
});

test('a resolved zero balance is WRITTEN as 0 (not skipped, not recomputed from class credits)', async () => {
  const p = byId('noble_leader'); p.choices.wallet.credits = 0;
  const { plan } = await planFor(p, { actor: { id: 'a1', name: 'N', type: 'character', items: [], system: { level: 0, credits: 99999 }, flags: { swse: { chargenStore: { initialized: true, startingCredits: 4000, lastStagedCredits: 4000 } } }, img: 'icons/svg/mystery-man.svg' } });
  assert.equal(plan.set['system.credits'], 0);
});

test('the Wealth talent never changes the authored balance (GP-RD-004)', async () => {
  const p = byId('noble_leader');
  p.choices.talents = [{ name: 'Wealth', sourceIds: ['wealth'] }];
  p.choices.wallet.credits = 465;
  const { plan } = await planFor(p);
  assert.equal(plan.set['system.credits'], 465);
});

test('a Jedi profile kit lightsaber is the ONLY lightsaber in the plan (class starter is superseded)', async () => {
  const { plan } = await planFor(byId('jedi_defender'));
  const sabers = plan.add.items.filter(i => /lightsaber/i.test(i.name));
  assert.equal(sabers.length, 1);
  assert.equal(sabers[0].flags.swse.progression.selectionKey, 'galactic-profile-equipment');
  assert.equal(plan.set['system.credits'], 475);
});

test('Force powers withheld by V2 entitlement are NOT in the plan (Jedi Defender has no Force Training)', async () => {
  const { plan } = await planFor(byId('jedi_defender'));
  assert.equal(plan.add.items.some(i => i.type === 'forcepower'), false);
});

test('equipment quantities come from the profile and each item is loaded exactly once per compile', async () => {
  loaded.length = 0;
  const { plan } = await planFor(byId('soldier_gunner'));
  const kit = plan.add.items.filter(i => i.flags?.swse?.progression?.selectionKey === 'galactic-profile-equipment');
  assert.equal(kit.length, byId('soldier_gunner').choices.equipment.length);
  assert.equal(loaded.length, kit.length);
  for (const [i, e] of byId('soldier_gunner').choices.equipment.entries()) assert.equal(kit[i].system.quantity, e.qty);
});

test('preview and final compile produce an identical plan for an immutable build (parity)', async () => {
  const strip = plan => JSON.stringify({ credits: plan.set['system.credits'], items: plan.add.items.map(i => [i.type, i.name, i.system?.quantity ?? null]) });
  const a = await planFor(byId('scoundrel_pistoleer'));
  const b = await planFor(byId('scoundrel_pistoleer'));
  assert.equal(strip(a.plan), strip(b.plan));
});

test('droid: the subtype adapter seeds the installed ledger and build into the SAME plan, exactly once, with no hardware item duplication', async () => {
  const profile = byId('droid_soldier_dex_security_enforcer');
  const { plan, session, actor } = await planFor(profile);
  const adapter = new DroidSubtypeAdapter();
  const finalPlan = await adapter.contributeMutationPlan(plan, session, actor);
  assert.ok(Object.keys(finalPlan.set['system.installedSystems']).length >= 8, 'ledger seeded');
  assert.equal(finalPlan.set['system.droidDegree'], '4th-degree');
  assert.equal(finalPlan.set['system.attributes.con.base'], 0, 'V2 forces CON=0; the profile never supplied one');
  assert.equal(finalPlan.set['system.attributes.dex.racial'], 2, 'degree modifier applied once, by V2');
  assert.equal(finalPlan.set['system.attributes.int.racial'], -2);
  assert.equal(plan.set['system.credits'], 875, 'exact final class-credit balance; construction credits are separate');
  const hardware = new Set(['plasteel-shell', 'internal-comlink', 'improved-sensor-package', 'darkvision', 'heuristic', 'walking']);
  assert.equal(plan.add.items.some(i => hardware.has(String(i.flags?.swse?.progression?.selectionId))), false, 'integrated hardware is never an external item');
  const again = await adapter.contributeMutationPlan(JSON.parse(JSON.stringify(plan)), session, actor);
  assert.deepEqual(Object.keys(again.set['system.installedSystems']).sort(), Object.keys(finalPlan.set['system.installedSystems']).sort(), 'deterministic / idempotent ledger identities');
});

test('an unloadable profile item aborts plan compilation before any mutation (fail closed)', async () => {
  const saved = ProgressionFinalizer._loadCanonicalItemData;
  ProgressionFinalizer._loadCanonicalItemData = async () => null;
  try {
    const session = await createSession('actor');
    const compiled = await compileProfile(byId('noble_leader'), { sessionSubtype: 'actor', resolvers, settings });
    applyCompiledProfile(session, compiled);
    const a = { id: 'a1', name: 'N', type: 'character', items: [], system: { level: 0 }, flags: {}, img: 'x' };
    await assert.rejects(ProgressionFinalizer._compileMutationPlan({ mode: 'chargen', sessionId: 'S', actor: a, progressionSession: session }, a), /aborted before any mutation/);
  } finally { ProgressionFinalizer._loadCanonicalItemData = saved; }
});

test('droid attribute modifiers are applied EXACTLY ONCE: plan base + V2 racial == the authored final scores, for all eight droids', async () => {
  const fs = await import('node:fs');
  const evidence = JSON.parse(fs.readFileSync(new URL('../data/galactic-profiles/v3/galactic-profiles.evidence.json', import.meta.url), 'utf8')).profiles;
  for (const p of doc.profiles.filter(x => x.subtype === 'droid')) {
    const { plan, session, actor } = await planFor(JSON.parse(JSON.stringify(p)));
    const final = await new DroidSubtypeAdapter().contributeMutationPlan(plan, session, actor);
    const authored = evidence[p.profileId].build.attributes.scores;
    for (const k of ['str', 'dex', 'int', 'wis', 'cha']) {
      const total = final.set[`system.attributes.${k}.base`] + (final.set[`system.attributes.${k}.racial`] ?? 0);
      assert.equal(total, authored[k], `${p.profileId} ${k}`);
    }
    assert.equal(final.set['system.attributes.con.base'], 0);
  }
});

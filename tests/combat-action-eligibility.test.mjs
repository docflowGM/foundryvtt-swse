import assert from 'node:assert/strict';
import test from 'node:test';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Combat Action Eligibility and Unlock Convergence.
//   discovery (the catalog lists it) != eligibility (the actor earned it) != availability (economy / resources / context right now)
// Every case here drives the production modules; nothing is faked at the consumer.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.applications = globalThis.foundry.applications ?? {};
globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} };
const notes = { warn: [], error: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
globalThis.ChatMessage = globalThis.ChatMessage ?? { getSpeaker: () => ({}), create: async () => ({}) };

const {
  evaluateCombatActionEligibility: evaluate, authorizeCombatActionExecution: authorize,
  parseRequirementText, catalogRequirementsOf, ELIGIBILITY_STATE: S, ENTITLEMENT: E
} = await import('/systems/foundryvtt-swse/scripts/engine/combat/features/combat-action-eligibility.js');
const { AbilityCombatActionResolver } = await import('/systems/foundryvtt-swse/scripts/engine/combat/ability-combat-action-resolver.js');
const { buildCombatActionLibrary } = await import('/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/combat-action-library-context.js');
const fs = await import('node:fs');

// ---- fixtures -------------------------------------------------------------------------------------------------------------------------------
const items = (list) => { const a = [...list]; a.get = (id) => a.find((i) => String(i.id) === String(id)); return a; };
const feat = (id, name, extra = {}) => ({ id, name, type: 'feat', system: { ...extra.system }, flags: {}, ...extra.top });
const talent = (id, name, extra = {}) => ({ id, name, type: 'talent', system: { ...extra.system }, flags: {} });
const actor = (list = [], { type = 'character', system = {}, id = 'a1' } = {}) => ({ id, type, name: 'Tester', items: items(list), system: { skills: {}, ...system }, flags: {} });
const organic = (list = []) => actor(list);
const droid = (list = []) => actor(list, { type: 'droid', system: { isDroid: true } });
const npcDroidFollower = (list = []) => actor(list, { type: 'npc', system: { isDroid: true, isFollower: true } });

// the REAL pack rows, normalized the way CombatActionsMapper does
const packRow = (name) => {
  const line = fs.readFileSync('packs/combat-actions.db', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)).find((d) => d.name === name);
  assert.ok(line, `pack row ${name}`);
  const s = line.system;
  return { key: s.key, name: line.name, origin: 'catalog', actionType: s.actionType, requirements: s.requirements ?? [], requiredContext: s.requiredContext ?? s.requirements ?? [], restriction: s.restriction, executable: s.executable !== false };
};
const catalog = (name) => packRow(name);
const ev = (a, row) => evaluate(a, row);

// ---- 1. general actions stay available to everyone ------------------------------------------------------------------------------------------
test('general combat actions are unlocked for organic, droid and npc-droid actors', () => {
  for (const name of ['Second Wind', 'Aid another', 'Fight defensively', 'Full attack', 'Attack (single)', 'Aim', 'Charge']) {
    const row = catalog(name);
    for (const a of [organic(), droid(), npcDroidFollower()]) {
      const r = ev(a, row);
      assert.equal(r.state, S.UNLOCKED, `${name} for ${a.type}`);
      assert.deepEqual(r.entitlement, [E.GENERAL]);
      assert.equal(r.execution.allowed, true);
    }
  }
});

// ---- 2. catalog feat entitlements ----------------------------------------------------------------------------------------------------------
test('a catalog feat action is locked without the feat, unlocked with it, locked again when the feat is lost', () => {
  const row = catalog('Crush Pinned Opponent');
  assert.deepEqual(catalogRequirementsOf(row).filter((q) => q.kind !== 'context').map((q) => [q.kind, q.name]), [['feat', 'Crush']]);
  const without = ev(organic(), row);
  assert.equal(without.state, S.LOCKED);
  assert.equal(without.execution.allowed, false);
  assert.match(without.reason, /Crush feat/);
  const crush = feat('f1', 'Crush');
  const withFeat = organic([crush]);
  assert.equal(ev(withFeat, row).state, S.UNLOCKED);
  withFeat.items.splice(0, 1); // losing the feat
  assert.equal(ev(withFeat, row).state, S.LOCKED);
});

test('Throw requires BOTH Throw and Trip; Pin and Trip each require their own feat', () => {
  const t = catalog('Throw Grappled Opponent');
  assert.equal(ev(organic([feat('a', 'Throw')]), t).state, S.LOCKED);
  assert.equal(ev(organic([feat('b', 'Trip')]), t).state, S.LOCKED);
  assert.equal(ev(organic([feat('a', 'Throw'), feat('b', 'Trip')]), t).state, S.UNLOCKED);
  assert.equal(ev(organic([feat('p', 'Pin')]), catalog('Pin Grappled Opponent')).state, S.UNLOCKED);
  assert.equal(ev(organic([feat('p', 'Pin')]), catalog('Trip Grappled Opponent')).state, S.LOCKED);
});

test('Burst Fire: the feat entitlement is read from the structured requiredContext, the weapon context is not an entitlement', () => {
  const row = catalog('Burst Fire');
  assert.equal(ev(organic(), row).state, S.LOCKED);
  assert.equal(ev(organic([feat('b', 'Burst Fire')]), row).state, S.UNLOCKED);
});

test('target-state preconditions (already Grappled / Pinned) are context, never an entitlement and never unresolved', () => {
  for (const text of ['Both creatures are already Grappled', 'Target is Pinned', 'Target must already be grappled by this actor']) assert.equal(parseRequirementText(text).kind, 'context', text);
  const r = ev(organic([feat('p', 'Pin')]), catalog('Pin Grappled Opponent'));
  assert.deepEqual(r.unresolved, []);
});

test('a talent requirement follows the same contract as a feat requirement', () => {
  const row = { key: 't', name: 'T', origin: 'catalog', requirements: ['Sample talent'] };
  assert.equal(ev(organic(), row).state, S.LOCKED);
  assert.equal(ev(organic([talent('t1', 'Sample')]), row).state, S.UNLOCKED);
  assert.equal(ev(organic([feat('t1', 'Sample')]), row).state, S.LOCKED, 'a feat does not satisfy a talent requirement');
});

// ---- 3. Droid rules ------------------------------------------------------------------------------------------------------------------------
test('Droid-only catalog action: organic locked; Droid and NPC-type Droid follower unlocked (Droid rules profile, not actor.type)', () => {
  const row = { ...catalog('Feign Haywire') };
  assert.equal(row.restriction, 'Droids only', 'the pack row carries the structured restriction (it was prose-only in the notes)');
  assert.equal(ev(organic(), row).state, S.LOCKED);
  assert.equal(ev(droid(), row).state, S.UNLOCKED);
  const f = npcDroidFollower();
  assert.equal(f.type, 'npc');
  assert.equal(ev(f, row).state, S.UNLOCKED, 'a Droid follower stored as an npc follows Droid rules');
  const nonDroidNamedDroid = actor([], { type: 'character', system: {} }); nonDroidNamedDroid.name = 'Droid Hunter';
  assert.equal(ev(nonDroidNamedDroid, row).state, S.LOCKED, 'a name or species string is not Droid-rules evidence');
});

test('contradictory Droid evidence fails closed', () => {
  const a = actor([], { type: 'droid', system: { isDroid: false } });
  assert.equal(ev(a, catalog('Feign Haywire')).state, S.LOCKED);
});

// ---- 4. owned feat / talent cards: ownership, droid-only rule metadata, unresolved choice -------------------------------------------------------
const abilityRow = (item, extra = {}) => ({ key: `ability:${item.id}:x`, origin: 'ability', itemId: item.id, sourceName: item.name, sourceActionId: 'x', ...extra });

test('an owned feat/talent card is unlocked while the item is owned and locked once it is gone', () => {
  const f = feat('f1', 'Rapid Shot'); const t = talent('t1', 'Some Talent');
  const a = organic([f, t]);
  assert.deepEqual(ev(a, abilityRow(f)).entitlement, [E.FEAT]);
  assert.deepEqual(ev(a, abilityRow(t)).entitlement, [E.TALENT]);
  assert.equal(ev(a, abilityRow(f)).state, S.UNLOCKED);
  a.items.splice(0, 2);
  assert.equal(ev(a, abilityRow(f)).state, S.LOCKED);
  assert.equal(ev(a, abilityRow(t)).state, S.LOCKED);
});

test('an unresolved required choice never grants execution; a resolved one does', () => {
  const f = feat('f1', 'Weapon Group Feat');
  const row = abilityRow(f, { requiresSelectedChoice: true });
  const unresolved = ev(organic([f]), row);
  assert.equal(unresolved.state, S.UNLOCKED, 'owned, so it is the actor\'s action');
  assert.equal(unresolved.execution.allowed, false);
  assert.ok(unresolved.entitlement.includes(E.CHOICE));
  const resolved = feat('f1', 'Weapon Group Feat', { system: { selectedChoice: 'pistols' } });
  assert.equal(ev(organic([resolved]), row).execution.allowed, true);
});

test('a droid-only feat card (structured requiresDroid on the rule) is locked for an organic owner and unlocked for a Droid', () => {
  const f = feat('f1', 'Distracting Droid', { system: { abilityMeta: { actionRules: [{ type: 'AREA_SKILL_ATTACK_ACTION', actionKey: 'distracting-droid', requiresDroid: true }] } } });
  const row = abilityRow(f, { sourceActionId: 'distracting-droid' });
  assert.equal(ev(organic([f]), row).state, S.LOCKED);
  assert.equal(ev(droid([f]), row).state, S.UNLOCKED);
  assert.equal(ev(npcDroidFollower([f]), row).state, S.UNLOCKED);
  // a same-named feat WITHOUT that metadata is not silently treated as droid-only: the name is not evidence
  const plain = feat('f2', 'Distracting Droid');
  assert.equal(ev(organic([plain]), abilityRow(plain, { sourceActionId: 'distracting-droid' })).state, S.UNLOCKED);
});

test('actor-owned species abilities are the actor\'s own; the item must still be owned', () => {
  const sp = { id: 's1', type: 'combat-action', name: 'Species Thing', system: {}, flags: { swse: { isSpeciesAbility: true } } };
  const a = organic([sp]);
  assert.equal(ev(a, { origin: 'actor-item', itemId: 's1', sourceName: 'Species Thing' }).entitlement[0], E.SPECIES);
  a.items.splice(0, 1);
  assert.equal(ev(a, { origin: 'actor-item', itemId: 's1' }).state, S.LOCKED);
});

// ---- 5. installed Droid hardware -----------------------------------------------------------------------------------------------------------
test('a component-granted action needs installed, operable hardware (never granted by an Item or a draft record)', () => {
  const row = { origin: 'component', componentRef: { ruleId: 'shield-generator' }, name: 'Shield Surge' };
  const ledger = { instanceId: 'i1', canonicalId: 'shield-generator', enabled: true, sources: [], primarySource: { kind: 'installed-ledger' } };
  const authorizeComponent = (a, ref) => (a.type === 'droid' && ref.ruleId === 'shield-generator' ? { ok: true, status: 'OPERABLE', reason: null, component: ledger } : { ok: false, status: a.type === 'droid' ? 'DRAFT' : 'NOT_DROID', reason: a.type === 'droid' ? 'draft only' : 'not a droid' });
  assert.equal(evaluate(droid(), row, { authorizeComponent }).state, S.UNLOCKED);
  assert.equal(evaluate(organic(), row, { authorizeComponent }).state, S.LOCKED);
  const draft = evaluate(actor([], { type: 'droid', system: { isDroid: true, droidSystems: {} } }), { ...row, componentRef: { ruleId: 'other' } }, { authorizeComponent });
  assert.equal(draft.state, S.LOCKED);
  assert.equal(draft.execution.allowed, false);
});

test('the production component gate refuses an organic and an uninstalled droid component', () => {
  const r = evaluate(organic(), { origin: 'component', componentRef: { ruleId: 'x' } });
  assert.equal(r.state, S.LOCKED);
  const d = evaluate(droid(), { origin: 'component', componentRef: { ruleId: 'x' } });
  assert.notEqual(d.state, S.UNLOCKED);
  assert.equal(d.execution.allowed, false);
});

// ---- 6. unresolved evidence fails closed ---------------------------------------------------------------------------------------------------
test('an unrecognised STRUCTURED requirement is unresolved and not executable; unrecognised context text is ignored', () => {
  const strict = ev(organic(), { origin: 'catalog', key: 'k', requirements: ['Medical Kit'] });
  assert.equal(strict.state, S.UNRESOLVED);
  assert.equal(strict.execution.allowed, false);
  assert.deepEqual(strict.unresolved, ['Medical Kit']);
  const ctxOnly = ev(organic(), { origin: 'catalog', key: 'k', requirements: [], requiredContext: ['GM confirms the path'] });
  assert.equal(ctxOnly.state, S.UNLOCKED);
  assert.equal(ev(organic(), { key: 'k' }).state, S.UNRESOLVED, 'a row with no origin has no evidence');
});

test('skill-training requirements use the actor skill record; a missing record is unresolved, not assumed', () => {
  const row = { origin: 'catalog', key: 'k', requirements: ['Trained in Treat Injury'] };
  assert.equal(ev(actor([], { system: { skills: { treatInjury: { trained: true } } } }), row).state, S.UNLOCKED);
  assert.equal(ev(actor([], { system: { skills: { treatInjury: { trained: false } } } }), row).state, S.LOCKED);
  assert.equal(ev(actor([], { system: { skills: {} } }), row).state, S.UNRESOLVED);
});

// ---- 7. same-name actions with distinct canonical identity stay distinct --------------------------------------------------------------------
test('same-name actions with different identities stay distinct in eligibility and in the library', () => {
  const f1 = feat('f1', 'Alpha'); const f2 = feat('f2', 'Beta');
  const a = organic([f1]);
  const r1 = ev(a, abilityRow(f1, { name: 'Strike', key: 'ability:f1:strike' }));
  const r2 = ev(a, abilityRow(f2, { name: 'Strike', key: 'ability:f2:strike' }));
  assert.equal(r1.state, S.UNLOCKED);
  assert.equal(r2.state, S.LOCKED, 'the second Strike belongs to a feat this actor does not own');
});

// ---- 8. EXECUTION boundary ------------------------------------------------------------------------------------------------------------------
const live = (a, catalogRows = []) => ({
  catalogRow: (key) => catalogRows.find((r) => r.key === key) ?? null,
  abilityRow: (key) => AbilityCombatActionResolver.getActions(a).find((r) => r.key === key) ?? null,
  combinedRow: () => null
});

test('direct execution of a locked catalog action is refused, whatever the caller claims about it', () => {
  const crush = catalog('Crush Pinned Opponent');
  const a = organic();
  const gate = authorize(a, crush.key, live(a, [crush]));
  assert.equal(gate.allowed, false);
  assert.equal(gate.state, S.LOCKED);
  const withFeat = organic([feat('f1', 'Crush')]);
  assert.equal(authorize(withFeat, crush.key, live(withFeat, [crush])).allowed, true);
});

test('a stale ability key is refused once the granting feat is gone; a key the actor never had is refused', () => {
  const f = feat('f1', 'Weapon Focus', { system: { abilityMeta: { combatActions: [{ id: 'x', name: 'X', actionType: 'standard' }] } } });
  const a = organic([f]);
  const key = AbilityCombatActionResolver.getActions(a)[0].key;
  assert.equal(authorize(a, key, live(a)).allowed, true);
  a.items.splice(0, 1);
  assert.equal(authorize(a, key, live(a)).allowed, false, 'stale sheet');
  assert.equal(authorize(a, 'ability:nope:zzz', live(a)).allowed, false, 'macro-fabricated key');
});

test('execution refuses an owned ability whose required choice is unresolved', () => {
  const f = feat('f1', 'Choice Feat', { system: { abilityMeta: { requiresSelectedChoice: true, combatActions: [{ id: 'x', name: 'X', actionType: 'standard' }] } } });
  const a = organic([f]);
  const key = AbilityCombatActionResolver.getActions(a)[0].key;
  assert.equal(authorize(a, key, live(a)).allowed, false);
});

test('an unknown plain key is not executable: it defines no entitlement and grants nothing', () => {
  const a = organic();
  assert.equal(authorize(a, 'made-up-action', live(a)).allowed, false);
});

test('the sheet runs the eligibility gate before any workflow (source contract)', () => {
  const src = fs.readFileSync('scripts/sheets/v2/character-like-sheet.js', 'utf8');
  const start = src.indexOf('async _runCanonicalCombatAction(');
  const body = src.slice(start, start + 2500);
  assert.match(body, /gateCombatActionRequest\(/);
  assert.ok(body.indexOf('gateCombatActionRequest(') < body.indexOf('CombatWorkflowRegistry.getDefault()'), 'the gate comes before the registry');
});

// ---- 9. multiattack execution boundary (Double / Triple Attack) ----------------------------------------------------------------------------
test('Double/Triple Attack cannot be forced through the router without the feat (the fallback plan must not grant it)', async () => {
  const { weaponItem, installReadinessEnvironment, ownAndReady } = await import('./helpers/ready-weapon-fixture.mjs');
  await installReadinessEnvironment();
  const { executeCombatFeatureMultiattack } = await import('/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-handlers.js');
  const w = weaponItem('w1');
  const a = actor([w], { system: { species: 'Human', size: 'medium', skills: {} } });
  w.actor = a;
  ownAndReady(a, w);
  const { getReadiedWeaponSelection } = await import('/systems/foundryvtt-swse/scripts/combat/multi-attack.js');
  assert.equal(getReadiedWeaponSelection(a).primary?.id, 'w1', 'fixture: the weapon is readied');
  notes.warn.length = 0;
  let threw = null;
  try { await executeCombatFeatureMultiattack({ actor: a, element: null, featureId: 'double-attack' }); } catch (err) { threw = err; }
  assert.equal(threw, null, `must refuse cleanly, not proceed into the roll dialog: ${threw?.message}`);
  assert.ok(notes.warn.some((m) => /Double Attack/i.test(m)), `refusal message expected, got ${JSON.stringify(notes.warn)}`);
});

// ---- 10. library: My Actions / All Rules -----------------------------------------------------------------------------------------------------
const libRow = (o) => ({ key: o.key, name: o.name, laneKey: o.lane ?? 'standard', actionType: o.lane ?? 'standard', executable: true, sourceName: 'x', eligibility: o.eligibility, ...o });
const unlocked = { state: S.UNLOCKED, entitlement: ['general'], basis: [], missing: [], unresolved: [], reason: '', execution: { allowed: true, reason: '' } };
const locked = { state: S.LOCKED, entitlement: ['feat'], basis: [], missing: ['Crush feat'], unresolved: [], reason: 'Requires Crush feat.', execution: { allowed: false, reason: 'Requires Crush feat.' } };
const unresolvedE = { state: S.UNRESOLVED, entitlement: [], basis: [], missing: [], unresolved: ['Medical Kit'], reason: 'Eligibility not established: Medical Kit.', execution: { allowed: false, reason: 'Eligibility not established: Medical Kit.' } };

test('My Actions is the default; locked actions are excluded from it and appear only in All Rules without an executable control', () => {
  const groups = [{ key: 'standard', items: [
    libRow({ key: 'a', name: 'Attack', eligibility: unlocked }),
    libRow({ key: 'b', name: 'Crush Pinned Opponent', eligibility: locked }),
    libRow({ key: 'c', name: 'Treat Poison', eligibility: unresolvedE }),
    libRow({ key: 'd', name: 'Spent Thing', eligibility: unlocked, canUseNow: false, unavailableReason: 'Standard action unavailable' })
  ] }];
  const lib = buildCombatActionLibrary(groups);
  assert.equal(lib.defaultScope, 'mine');
  const mine = lib.items.filter((i) => i.scope === 'mine').map((i) => i.key);
  assert.deepEqual(mine.sort(), ['a', 'c', 'd']);
  const ref = lib.items.filter((i) => i.scope === 'reference');
  assert.deepEqual(ref.map((i) => i.key), ['b']);
  assert.equal(ref[0].canUse, false);
  assert.equal(ref[0].showUse, false, 'a locked entry has no executable control');
  assert.match(ref[0].prerequisites.join(' '), /Crush feat/);
  const spent = lib.items.find((i) => i.key === 'd');
  assert.equal(spent.availability, 'unavailable', 'spent actions stay visible but disabled');
  assert.equal(spent.showUse, true); assert.equal(spent.canUse, false);
  const unres = lib.items.find((i) => i.key === 'c');
  assert.equal(unres.canUse, false); assert.equal(unres.eligibilityState, 'unresolved');
  assert.deepEqual(lib.counts.mine, { total: 3, available: 1, unavailable: 2 });
  assert.equal(lib.counts.reference, 1);
});

test('passive riders are never listed as library actions', () => {
  const groups = [{ key: 'passive', items: [libRow({ key: 'p', name: 'Passive Thing', lane: 'passive', eligibility: unlocked })] }, { key: 'standard', items: [libRow({ key: 'a', name: 'Attack', eligibility: unlocked })] }];
  const lib = buildCombatActionLibrary(groups);
  assert.deepEqual(lib.items.map((i) => i.key), ['a']);
});

test('building the library never mutates its input rows or the actor', () => {
  const rows = [libRow({ key: 'a', name: 'Attack', eligibility: unlocked })];
  const before = JSON.stringify(rows);
  buildCombatActionLibrary([{ key: 'standard', items: rows }]);
  assert.equal(JSON.stringify(rows), before);
});

test('the Combat Action Library template defaults to My Actions, hides Use for reference entries and shows prerequisites', () => {
  const t = fs.readFileSync('templates/actors/character/v2-concept/partials/panels/combat-action-library.hbs', 'utf8');
  assert.match(t, /data-cal-scope/);
  assert.deepEqual(buildCombatActionLibrary([]).scopes.map((x) => x.label), ['My Actions', 'All Rules']);
  assert.equal(buildCombatActionLibrary([]).defaultScope, 'mine');
  assert.match(t, /\{\{#if a\.showUse\}\}/, 'the Use button is conditional on showUse');
  assert.match(t, /a\.prerequisites/);
  assert.match(t, /data-scope="\{\{a\.scope\}\}"/);
});

test('the catalog mapper carries the structured requirements and restriction to the sheet (they were merged into requiredContext)', async () => {
  const { CombatActionsMapper } = await import('/systems/foundryvtt-swse/scripts/combat/utils/combat-actions-mapper.js');
  const pack = fs.readFileSync('packs/combat-actions.db', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const crush = pack.find((d) => d.name === 'Crush Pinned Opponent');
  const norm = CombatActionsMapper._normalizeAction(crush);
  assert.deepEqual(norm.requirements, ['Crush feat', 'Target is Pinned']);
  const haywire = CombatActionsMapper._normalizeAction(pack.find((d) => d.name === 'Feign Haywire'));
  assert.equal(haywire.restriction, 'Droids only');
});

test('every catalog action in the pack is classified: general, entitlement-gated, or reported unresolved (nothing is silently ignored)', () => {
  const pack = fs.readFileSync('packs/combat-actions.db', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const gated = {}; const unresolved = [];
  for (const d of pack) {
    const s = d.system;
    const row = { key: s.key, origin: 'catalog', requirements: s.requirements ?? [], requiredContext: s.requiredContext ?? [], restriction: s.restriction };
    const r = evaluate(organic(), row);
    if (r.state === S.UNRESOLVED) unresolved.push(d.name);
    else if (r.state === S.LOCKED) gated[d.name] = r.missing;
  }
  assert.deepEqual(gated, {
    'Burst Fire': ['Burst Fire feat'], 'Crush Pinned Opponent': ['Crush feat'], 'Feign Haywire': ['Droid rules'],
    'Pin Grappled Opponent': ['Pin feat'], 'Throw Grappled Opponent': ['Throw feat', 'Trip feat'], 'Trip Grappled Opponent': ['Trip feat']
  });
  assert.deepEqual(unresolved, [], 'no pack action carries an unrecognised structured requirement');
});

test('All Rules browsing is pure: building and filtering the library never writes to the actor', () => {
  const a = organic([feat('f1', 'Crush')]);
  const snapshot = JSON.stringify(a);
  const rows = [libRow({ key: 'x', name: 'X', eligibility: ev(a, catalog('Crush Pinned Opponent')) }), libRow({ key: 'y', name: 'Y', eligibility: ev(a, catalog('Burst Fire')) })];
  const lib = buildCombatActionLibrary([{ key: 'standard', items: rows }]);
  assert.deepEqual(lib.items.map((i) => [i.key, i.scope]).sort(), [['x', 'mine'], ['y', 'reference']]);
  assert.equal(JSON.stringify(a), snapshot);
});

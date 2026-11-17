/**
 * NPC V2 Convergence regression suite (NPC-001 .. NPC-007).
 *
 * Real production modules are exercised wherever the Node harness can load
 * them: the Nonheroic class model/rules, the session seeder, the real
 * ProgressionSession + NonheroicSubtypeAdapter, the trained-skill allowance,
 * the level-split authority, the NPC mode adapter, the real
 * ProgressionFinalizer feat-plan compiler and the finalization prerequisite
 * validator. UI classes that need a live Foundry window (steps, level-up entry
 * dialog) are covered by source-contract checks plus the live-Foundry
 * procedure in docs/audits/npc-v2-convergence-report.md.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

registerFoundryPathLoader();
installFoundryShimGlobals();

// Minimal browser/AppV2 globals so the real ProgressionSession + adapter registry import.
globalThis.window = globalThis.window || globalThis;
globalThis.document = globalThis.document || { addEventListener() {}, createElement() { return { style: {}, classList: { add() {} } }; } };
globalThis.localStorage = globalThis.localStorage || { getItem() { return null; }, setItem() {}, removeItem() {} };
class AppV2 { static DEFAULT_OPTIONS = {}; static PARTS = {}; }
globalThis.foundry.applications = {
  api: { ApplicationV2: AppV2, HandlebarsApplicationMixin: (B) => class extends B {}, DialogV2: class {}, DocumentSheetV2: class {} },
  sheets: { ActorSheetV2: class {}, ItemSheetV2: class {} },
  ux: {}, handlebars: {},
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const sys = (rel) => import(`/systems/foundryvtt-swse/${rel}`);

const model = await sys('scripts/engine/progression/utils/nonheroic-class-model.js');
const allowanceMod = await sys('scripts/engine/progression/utils/trained-skill-allowance.js');
const { seedNonheroicSession } = await sys('scripts/apps/progression-framework/adapters/nonheroic-session-seeder.js');
const { ProgressionSession } = await sys('scripts/apps/progression-framework/shell/progression-session.js');
const { NonheroicSubtypeAdapter } = await sys('scripts/apps/progression-framework/adapters/default-subtypes.js');
const { getLevelSplit } = await sys('scripts/actors/derived/level-split.js');
const npcMode = await sys('scripts/actors/npc/npc-mode-adapter.js');
const { SnapshotManager } = await sys('scripts/engine/progression/utils/snapshot-manager.js');
const { getFeatSelectionScopeKey } = await sys('scripts/engine/progression/feats/feat-shape.js');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const classItem = (name, level, { nonheroic = false, id = name.toLowerCase() } = {}) => ({
  id, name, type: 'class',
  system: { level, isNonheroic: nonheroic, classId: id },
});
const npcActor = (items = [], extra = {}) => ({
  id: 'npc-1', name: 'Test NPC', type: 'npc',
  items: Object.assign([...items], { some(fn) { return Array.prototype.some.call(this, fn); } }),
  system: { level: 0, ...(extra.system || {}) }, flags: extra.flags || {},
});
const withFilter = (actor) => { actor.items.filter = Array.prototype.filter.bind(actor.items); actor.items.find = Array.prototype.find.bind(actor.items); return actor; };
const newSession = (actor, mode = 'chargen', subtype = 'nonheroic') => new ProgressionSession({ actor, mode, subtype });
const feat = (name, choice = null, extra = {}) => ({
  id: `feat-${name.toLowerCase().replace(/\W+/g, '-')}`, name, type: 'feat',
  slotType: model.NONHEROIC_STARTING_FEAT_SLOT_TYPE, source: model.NONHEROIC_STARTING_FEAT_SOURCE,
  system: choice ? { selectedChoice: choice } : {}, ...extra,
});

// ---------------------------------------------------------------------------
// NPC-001 / NPC-T01 / NPC-T02 — canonical Nonheroic class identity
// ---------------------------------------------------------------------------
test('NPC-T01/T02: fresh Nonheroic chargen commits a canonical Nonheroic class selection (no manual class step)', async () => {
  const actor = withFilter(npcActor());
  const session = newSession(actor);
  await seedNonheroicSession(session, actor, 'chargen');

  const cls = session.draftSelections.class;
  assert.ok(cls, 'class selection must be committed by the seeder');
  assert.equal(cls.id, 'nonheroic');
  assert.equal(cls.name, 'Nonheroic');
  assert.equal(cls.system.isNonheroic, true);
  assert.equal(cls.system.classId, 'nonheroic');
  assert.equal(cls.system.level, 1);
  assert.equal(cls.system.babProgression, 'nonheroic');
  assert.equal(cls.system.hitDie, '1d4');
  assert.ok(model.isNonheroicClassRef(cls));
  assert.equal(session.nonheroicContext.hasNonheroic, true);
  assert.equal(session.nonheroicContext.isImplicit, true);

  // Idempotent: re-seeding does not replace/duplicate the committed class.
  const before = session.draftSelections.class;
  await seedNonheroicSession(session, actor, 'chargen');
  assert.equal(session.draftSelections.class, before);
});

test('NPC-001: the class-selection step stays suppressed for Nonheroic chargen; heroic chargen is untouched', async () => {
  const adapter = new NonheroicSubtypeAdapter();
  const actor = withFilter(npcActor());
  const session = newSession(actor);
  await seedNonheroicSession(session, actor, 'chargen');
  const steps = await adapter.contributeActiveSteps(['species', 'class', 'attribute', 'skills', 'general-feat', 'class-feat', 'languages', 'summary'], session, actor);
  assert.ok(!steps.includes('class'), 'manual class step suppressed');
  assert.ok(!steps.includes('class-feat'), 'no class-feat slot for Nonheroic');
  assert.ok(steps.includes('general-feat'), 'ordinary level-1 general feat kept as its own step (NPC-T04)');
  assert.ok(steps.includes('nonheroic-starting-feats'));
  assert.ok(steps.indexOf('nonheroic-starting-feats') < steps.indexOf('general-feat'), 'starting feats precede the general feat');

  const heroic = withFilter(npcActor());
  const heroicSession = newSession(heroic, 'chargen', 'heroic');
  await seedNonheroicSession(heroicSession, heroic, 'chargen');
  assert.equal(heroicSession.draftSelections.class, null, 'heroic chargen must never receive an implicit Nonheroic class');
  assert.equal(heroicSession.nonheroicContext.hasNonheroic, false);
});

test('NPC-001: readiness fails closed when the canonical Nonheroic class is missing; passes when present', async () => {
  const adapter = new NonheroicSubtypeAdapter();
  const actor = withFilter(npcActor());
  const session = newSession(actor);
  await seedNonheroicSession(session, actor, 'chargen');

  session.draftSelections.class = null; // simulate lost class state
  session.draftSelections.feats = [
    feat('Armor Proficiency (Light)'), feat('Skill Focus', 'perception'), feat('Skill Focus', 'stealth'),
  ];
  await assert.rejects(() => adapter.validateReadiness(session, actor), /canonical Nonheroic class selection missing/);

  await seedNonheroicSession(session, actor, 'chargen');
  await adapter.validateReadiness(session, actor); // does not throw
});

test('NPC-006: imported-statblock / standard subtypes are NOT handled as calculated Nonheroic', () => {
  const adapter = new NonheroicSubtypeAdapter();
  assert.equal(adapter.handles('nonheroic'), true);
  assert.equal(adapter.handles('imported-statblock'), false);
  assert.equal(adapter.handles('standard'), false);
});

test('NPC-006: seeder never invents an implicit Nonheroic track for imported/standard NPCs', async () => {
  const actor = withFilter(npcActor());
  const session = newSession(actor, 'levelup', 'imported-statblock');
  await seedNonheroicSession(session, actor, 'levelup');
  assert.equal(session.nonheroicContext.hasNonheroic, false);
  assert.equal(session.draftSelections.class, null);
});

// ---------------------------------------------------------------------------
// NPC-002 — RAW starting feats (Core Rulebook p.277)
// ---------------------------------------------------------------------------
test('NPC-T03: the starting-feat rule is exactly the nine printed options, three picks', () => {
  const rule = model.NONHEROIC_STARTING_FEAT_RULE;
  assert.equal(rule.count, 3);
  assert.deepEqual(rule.options.map((o) => o.key).sort(), [
    'armor-proficiency-light', 'armor-proficiency-medium',
    'skill-focus', 'skill-training',
    'weapon-proficiency-advanced-melee', 'weapon-proficiency-heavy-weapons',
    'weapon-proficiency-pistols', 'weapon-proficiency-rifles', 'weapon-proficiency-simple',
  ]);
  assert.deepEqual(rule.options.filter((o) => o.repeatable).map((o) => o.key).sort(), ['skill-focus', 'skill-training']);
  // The printed text is in the repo; assert the rule matches it.
  const core = read('reference/sourcebooks/Core Rulebook_djvu.txt');
  const block = core.replace(/\s+/g, ' ').slice(core.replace(/\s+/g, ' ').indexOf('A nonheroic character gains three starting feats'), core.replace(/\s+/g, ' ').indexOf('A nonheroic character gains three starting feats') + 700);
  for (const text of ['Armor Proficiency (light)', 'Armor Proficiency (medium)', 'Skill Focus', 'Skill Training', 'advanced melee weapons', 'heavy weapons', 'pistols', 'rifles', 'simple weapons']) {
    assert.ok(block.includes(text), `Core text lists ${text}`);
  }
});

test('NPC-T05: feats outside the printed list are rejected (the old local allowlist is gone)', () => {
  for (const illegal of ['Alertness', 'Cleave', 'Dodge', 'Far Shot', 'Power Attack', 'Toughness', 'Weapon Focus', 'Improved Initiative', 'Quick Draw', 'Blind-Fight', 'Shield Proficiency', 'Armor Proficiency (Heavy)', 'Martial Arts I']) {
    assert.equal(model.isNonheroicStartingFeatFamily(illegal), false, illegal);
  }
  const res = model.validateNonheroicStartingFeats([feat('Alertness'), feat('Armor Proficiency (Light)'), feat('Skill Training', 'acrobatics')]);
  assert.equal(res.valid, false);
  assert.match(res.errors.join(' '), /Alertness is not a legal Nonheroic starting feat/);
  const src = read('scripts/apps/progression-framework/steps/nonheroic-starting-feats-step.js');
  assert.doesNotMatch(src, /NONHEROIC_LEGAL_FEAT_FAMILIES|_isNonheroicLegalFeatName/, 'hand-maintained allowlist removed');
});

test('NPC-T03: legal combinations; weapon proficiency groups; exactly three', () => {
  const ok = model.validateNonheroicStartingFeats([
    feat('Armor Proficiency (Light)'), feat('Weapon Proficiency', 'pistols'), feat('Weapon Proficiency', { group: 'rifles' }),
  ]);
  assert.deepEqual(ok, { valid: true, errors: [] });
  assert.equal(model.validateNonheroicStartingFeats([feat('Armor Proficiency (Light)')]).valid, false, 'fewer than three');
  assert.equal(model.validateNonheroicStartingFeats([feat('Armor Proficiency (Light)'), feat('Armor Proficiency (Medium)'), feat('Skill Focus', 'a'), feat('Skill Training', 'b')]).valid, false, 'more than three');
  // exotic / lightsaber proficiency is not on the printed list
  assert.equal(model.validateNonheroicStartingFeats([feat('Weapon Proficiency', 'lightsabers'), feat('Armor Proficiency (Light)'), feat('Armor Proficiency (Medium)')]).valid, false);
  // legacy per-group compendium names are honored
  assert.equal(model.matchNonheroicStartingFeatOption('Weapon Proficiency (Simple Weapons)')?.key, 'weapon-proficiency-simple');
});

test('NPC-T06/T07: Skill Training and Skill Focus are repeatable with DISTINCT scopes only', () => {
  const distinct = model.validateNonheroicStartingFeats([feat('Skill Training', 'perception'), feat('Skill Training', 'stealth'), feat('Skill Focus', 'perception')]);
  assert.equal(distinct.valid, true, 'same skill under different feats, and different skills under the same feat, are legal');

  const sameScope = model.validateNonheroicStartingFeats([feat('Skill Focus', 'stealth'), feat('Skill Focus', 'stealth'), feat('Armor Proficiency (Light)')]);
  assert.equal(sameScope.valid, false);
  assert.match(sameScope.errors.join(' '), /more than once for the same skill/);

  const noScope = model.validateNonheroicStartingFeats([feat('Skill Focus'), feat('Skill Training', 'a'), feat('Armor Proficiency (Light)')]);
  assert.equal(noScope.valid, false);
  assert.match(noScope.errors.join(' '), /requires a skill choice/);

  // identity = feat identity + scope, never feat id alone
  const a = feat('Skill Focus', 'perception'); const b = feat('Skill Focus', { value: 'Stealth' });
  assert.notEqual(model.getStartingFeatSelectionKey(a), model.getStartingFeatSelectionKey(b));
  assert.equal(a.id, b.id, 'same feat document id');
});

test('NPC-T05: non-repeatable feats cannot be duplicated', () => {
  const dup = model.validateNonheroicStartingFeats([feat('Armor Proficiency (Light)'), feat('Armor Proficiency (Light)'), feat('Skill Training', 'x')]);
  assert.equal(dup.valid, false);
  assert.match(dup.errors.join(' '), /cannot be selected more than once/);
  const dupGroup = model.validateNonheroicStartingFeats([feat('Weapon Proficiency', 'pistols'), feat('Weapon Proficiency', 'Pistols'), feat('Skill Training', 'x')]);
  assert.equal(dupGroup.valid, false);
});

test('NPC-T04: Nonheroic readiness validates ONLY the three class starting feats; the general feat is not counted', async () => {
  const adapter = new NonheroicSubtypeAdapter();
  const actor = withFilter(npcActor());
  const session = newSession(actor);
  await seedNonheroicSession(session, actor, 'chargen');
  const general = { id: 'feat-alertness', name: 'Alertness', type: 'feat', slotType: 'heroic', source: 'heroic', system: {} };
  session.draftSelections.feats = [general, feat('Armor Proficiency (Light)'), feat('Skill Focus', 'perception'), feat('Skill Training', 'stealth')];
  await adapter.validateReadiness(session, actor); // 3 starting + 1 general: valid
  session.draftSelections.feats = [general, feat('Armor Proficiency (Light)'), feat('Skill Focus', 'perception')];
  await assert.rejects(() => adapter.validateReadiness(session, actor), /Select 1 more starting feat/);
  session.draftSelections.feats = [feat('Cleave'), feat('Armor Proficiency (Light)'), feat('Skill Focus', 'perception')];
  await assert.rejects(() => adapter.validateReadiness(session, actor), /Cleave is not a legal Nonheroic starting feat/);
});

test('NPC-T08: the real session keeps two Skill Focus selections (distinct scopes) instead of deduping them', async () => {
  const session = newSession(withFilter(npcActor()));
  const picks = [feat('Skill Focus', 'perception'), feat('Skill Focus', 'stealth'), feat('Armor Proficiency (Light)')];
  assert.equal(session.commitSelection('nonheroic-starting-feats', 'feats', picks), true);
  const stored = session.draftSelections.feats;
  assert.equal(stored.length, 3);
  assert.deepEqual(stored.filter((f) => f.name === 'Skill Focus').map((f) => f.system.selectedChoice).sort(), ['perception', 'stealth']);
  // singleton merge path also keeps distinct scopes
  session.commitSelection('x', 'feats', [feat('Skill Focus', 'acrobatics')]);
  assert.equal(session.draftSelections.feats.filter((f) => f.name === 'Skill Focus').length, 3);
  assert.equal(getFeatSelectionScopeKey({ skill: 'Gather Information' }), 'gather_information');
});

// ---------------------------------------------------------------------------
// NPC-003 — trained-skill entitlement from PENDING INT
// ---------------------------------------------------------------------------
const allowance = (int, extra = {}) => allowanceMod.resolveTrainedSkillAllowance({
  classModel: model.getNonheroicClassModel(),
  attributeSelection: { values: { int } },
  speciesSelection: extra.species || null,
  pendingSpeciesContext: extra.ctx || null,
  // stale actor data must be ignored when a pending selection exists
  character: { abilities: { int: { mod: 5, base: 20 } }, ...(extra.character || {}) },
});

test('NPC-T09/T10/T11: Nonheroic skill allowance from pending INT (8 -> 1, 10 -> 1, 16 -> 4)', () => {
  assert.equal(allowance(8), 1, 'INT 8: 1 + (-1) floors at the minimum of 1');
  assert.equal(allowance(10), 1, 'INT 10: 1 + 0');
  assert.equal(allowance(16), 4, 'INT 16: 1 + 3');
  assert.equal(allowance(7), 1);
});

test('NPC-T12: pending INT change recalculates; stale actor INT is ignored; species adjustments apply', () => {
  assert.equal(allowance(10), 1);
  assert.equal(allowance(14), 3);
  assert.equal(allowance(10, { species: { abilityScores: { int: 2 } } }), 2, 'species +2 INT -> 12 -> +1');
  assert.equal(allowance(10, { species: { name: 'Human' } }), 2, 'Human bonus trained skill');
  const ctx = { traits: [{ classification: 'grant', source: 'bonusTrainedSkill', grants: [{ grantType: 'trainedSkill', frequency: 'choice' }] }] };
  assert.equal(allowance(10, { species: { name: 'Altiri' }, ctx }), 2);
  // no pending attribute selection -> falls back to the actor record (last resort)
  assert.equal(allowanceMod.resolveTrainedSkillAllowance({ classModel: model.getNonheroicClassModel(), character: { abilities: { int: { base: 16 } } } }), 4);
});

test('NPC-003: readiness refuses a skill list that exceeds the entitlement recomputed from pending INT', async () => {
  const adapter = new NonheroicSubtypeAdapter();
  const actor = withFilter(npcActor());
  const session = newSession(actor);
  await seedNonheroicSession(session, actor, 'chargen');
  session.draftSelections.feats = [feat('Armor Proficiency (Light)'), feat('Skill Focus', 'perception'), feat('Skill Training', 'stealth')];
  session.draftSelections.attributes = { values: { int: 16 } };
  session.draftSelections.skills = { trained: ['a', 'b', 'c', 'd'] };
  await adapter.validateReadiness(session, actor); // 4 of 4
  session.draftSelections.attributes = { values: { int: 10 } }; // INT lowered before finalization
  await assert.rejects(() => adapter.validateReadiness(session, actor), /4 trained skills selected but only 1 are allowed/);
});

test('NPC-003: the Nonheroic skills branch no longer reads the stale actor ability mod', () => {
  const src = read('scripts/apps/progression-framework/steps/skills-step.js');
  assert.doesNotMatch(src, /character\.abilities\?\.int\?\.mod \|\| 0/);
  assert.match(src, /resolveTrainedSkillAllowance/);
});

// ---------------------------------------------------------------------------
// NPC-004 — level bookkeeping
// ---------------------------------------------------------------------------
test('NPC-T13: Nonheroic 3 / Soldier 2 keeps the level split; total actor level is never used as a class level', async () => {
  const actor = withFilter(npcActor([classItem('Nonheroic', 3, { nonheroic: true, id: 'nonheroic' }), classItem('Soldier', 2)], { system: { level: 5 } }));
  const split = getLevelSplit(actor);
  assert.deepEqual({ h: split.heroicLevel, n: split.nonheroicLevel, t: split.totalLevel }, { h: 2, n: 3, t: 5 });

  const session = newSession(actor, 'levelup', 'nonheroic');
  await seedNonheroicSession(session, actor, 'levelup');
  const ctx = session.nonheroicContext;
  assert.equal(ctx.totalNonheroicLevel, 3);
  assert.equal(ctx.heroicLevel, 2);
  assert.equal(ctx.totalClassLevel, 5);
  assert.equal(ctx.nonheroicClasses.length, 1);
  assert.equal(ctx.nonheroicClasses[0].level, 3);
  assert.equal(ctx.isImplicit, false);
  assert.equal(model.getNonheroicClassModel().levelProgression[2].bab, 2, 'Nonheroic BAB table (level 3 = +2)');
  assert.equal(session.draftSelections.class, null, 'no class committed for an existing track');
});

test('NPC-004: a class item with no readable level is reported, not fabricated; actor total is not substituted', async () => {
  const noLevel = { id: 'x', name: 'Nonheroic', type: 'class', system: { isNonheroic: true } };
  const actor = withFilter(npcActor([noLevel], { system: { level: 9 } }));
  const session = newSession(actor, 'levelup', 'nonheroic');
  await seedNonheroicSession(session, actor, 'levelup');
  assert.equal(session.nonheroicContext.nonheroicClasses[0].level, 0);
  assert.equal(session.nonheroicContext.nonheroicClasses[0].levelMissing, true);
  assert.equal(session.nonheroicContext.hasMissingClassLevels, true);
  assert.equal(session.nonheroicContext.totalNonheroicLevel, 0);
});

test('NPC-004: a heroic NPC leveling under the Nonheroic adapter is never turned into an implicit Nonheroic', async () => {
  const actor = withFilter(npcActor([classItem('Soldier', 2)], { system: { level: 2 } }));
  const session = newSession(actor, 'levelup', 'nonheroic');
  await seedNonheroicSession(session, actor, 'levelup');
  assert.equal(session.nonheroicContext.hasNonheroic, false);
  assert.equal(session.nonheroicContext.heroicLevel, 2);
});

// ---------------------------------------------------------------------------
// NPC-005 — one transition policy
// ---------------------------------------------------------------------------
test('NPC-T14/T15/T16: heroic/nonheroic transition policy', () => {
  const t = (heroicLevel, nonheroicLevel, target) => model.evaluateNonheroicTransition({ heroicLevel, nonheroicLevel, target });
  assert.equal(t(0, 1, 'nonheroic').allowed, true, 'Nonheroic 1 -> Nonheroic 2');
  assert.equal(t(0, 3, 'heroic').allowed, true, 'Nonheroic 3 -> Soldier 1');
  assert.equal(t(0, 3, 'heroic').code, 'nonheroic-to-heroic');
  assert.equal(t(2, 3, 'heroic').allowed, true, 'Nonheroic 3 / Soldier 2 -> Soldier 3');
  assert.equal(t(2, 0, 'heroic').allowed, true, 'returning heroic advancement');
  const rejected = t(2, 0, 'nonheroic');
  assert.equal(rejected.allowed, false, 'heroic NPC cannot add Nonheroic');
  assert.match(rejected.reason, /heroic class levels/);
  assert.equal(t(2, 3, 'nonheroic').allowed, false, 'mixed NPC cannot add more Nonheroic (ClassStep never offered it)');
  assert.equal(t(0, 0, 'bogus').allowed, false);
});

test('NPC-005: the entry dialog and ClassStep consume the SAME policy function', () => {
  const entry = read('scripts/apps/levelup/npc-levelup-entry.js');
  const classStep = read('scripts/apps/progression-framework/steps/class-step.js');
  assert.match(entry, /evaluateNonheroicTransition/);
  assert.match(classStep, /evaluateNonheroicTransition/);
  assert.doesNotMatch(entry, /Mixed progression is legal but uncommon\. Continue\?<\/p>'\s*\}\);\s*if \(!ok\) \{return;\}\s*\}\s*\n\s*try \{\s*\n\s*if \(!\(await this\._authorizeProgressionStart\('nonheroic'\)\)\)/, 'Nonheroic entry no longer merely confirms an uncompletable mixed route');
  assert.match(read('templates/apps/npc-levelup-entry.hbs'), /nonheroicTransitionReason/);
});

// ---------------------------------------------------------------------------
// NPC-006 — identity and statblock authority
// ---------------------------------------------------------------------------
test('NPC-T17: heroic NPC identity comes from class items even with no descriptive metadata', () => {
  const actor = withFilter(npcActor([classItem('Soldier', 3)]));
  const state = npcMode.getNpcProfileState(actor);
  assert.equal(state.kind, 'heroic');
  assert.equal(state.identityConflicts.length, 0);
  assert.equal(state.identityAmbiguous, false);
  assert.equal(actor.type, 'npc');
});

test('NPC-T17: Nonheroic class items classify as nonheroic; mixed classes are heroic by identity', () => {
  assert.equal(npcMode.getNpcKind(withFilter(npcActor([classItem('Nonheroic', 2, { nonheroic: true, id: 'nonheroic' })]))), 'nonheroic');
  assert.equal(npcMode.getNpcKind(withFilter(npcActor([classItem('Nonheroic', 3, { nonheroic: true, id: 'nonheroic' }), classItem('Soldier', 2)]))), 'heroic');
});

test('NPC-T19: profile/class identity conflicts are reported, never silently resolved', () => {
  const actor = withFilter(npcActor([classItem('Soldier', 3)], { system: { npcProfile: { kind: 'nonheroic' } } }));
  const state = npcMode.getNpcProfileState(actor);
  assert.equal(state.kind, 'nonheroic', 'explicit declaration is not overwritten');
  assert.equal(state.identityConflicts.length, 1);
  assert.equal(state.identityConflicts[0].code, 'profile-vs-class-items');
  assert.equal(state.identityConflicts[0].declared, 'nonheroic');
  assert.equal(state.identityConflicts[0].derived, 'heroic');
  const meta = withFilter(npcActor([classItem('Soldier', 3)], { flags: { swse: { sourcePack: 'swse.nonheroic-units' } } }));
  assert.equal(npcMode.getNpcProfileState(meta).identityConflicts[0].code, 'metadata-vs-class-items');
});

test('NPC-006: an NPC with no identity data is ambiguous and is NOT defaulted to Nonheroic', () => {
  const state = npcMode.getNpcProfileState(withFilter(npcActor()));
  assert.equal(state.identityAmbiguous, true);
  assert.notEqual(state.kind, 'nonheroic');
  const src = read('scripts/apps/progression-framework/progression-entry.js');
  assert.doesNotMatch(src, /return 'nonheroic';\s*\n\}/, 'fallback `return "nonheroic"` removed');
  assert.match(src, /identity-ambiguous/);
  assert.match(src, /statblock-conversion-required/);
});

test('NPC-T18: an imported statblock keeps statblock authority and calculation mode; classes do not flip it', () => {
  const imported = withFilter(npcActor([classItem('Soldier', 2)], {
    system: { npcProfile: { sourceAuthority: 'statblock' } },
    flags: { swse: { import: { raw: { hp: 33 } } } },
  }));
  const state = npcMode.getNpcProfileState(imported);
  assert.equal(state.sourceAuthority, 'statblock');
  assert.equal(npcMode.resolveNpcCalculationMode(imported), 'statblock');
  assert.equal(npcMode.isNpcStatblockMode(imported), true);
  // Entry dialog requires explicit GM authorization before conversion.
  const entry = read('scripts/apps/levelup/npc-levelup-entry.js');
  assert.match(entry, /_requiresStatblockConversion/);
  assert.match(entry, /Convert Statblock NPC to Calculated Progression\?/);
  assert.ok(entry.indexOf('createSnapshot(this.actor, `Statblock before conversion') < entry.indexOf("'system.npcProfile.sourceAuthority': 'progression'"), 'snapshot precedes the authority change');
  assert.match(entry, /source: 'npc-levelup-entry\.statblock-conversion'/, 'authority change is an ActorEngine mutation');
});

test('NPC-T17: new NPCs are created with an explicit track and the npc document type', () => {
  const src = read('scripts/apps/progression-framework/progression-entry.js');
  assert.match(src, /options\.actorType === 'npc'/);
  assert.match(src, /New NPCs must be created as Heroic or Nonheroic/);
  assert.match(src, /sourceAuthority: 'progression'/);
  const hooks = read('scripts/infrastructure/hooks/directory-hooks.js');
  assert.match(hooks, /actorType: 'npc', subtype: track/);
  assert.match(hooks, /game\.user\?\.isGM/);
});

// ---------------------------------------------------------------------------
// NPC-007 — retire the legacy packet builders; snapshots live in SnapshotManager
// ---------------------------------------------------------------------------
test('NPC-007: npc-progression-engine.js is gone and nothing references it', () => {
  assert.equal(fs.existsSync(path.join(ROOT, 'scripts/engine/progression/npc-progression-engine.js')), false);
  const hits = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.git', 'packs', 'reference', 'docs', 'assets'].includes(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(js|mjs|hbs|json)$/.test(e.name) && !p.endsWith('npc-v2-convergence.test.mjs')) {
        if (/NpcProgressionEngine|npc-progression-engine|buildHeroicLevelPacket|buildNonheroicLevelPacket/.test(fs.readFileSync(p, 'utf8'))) hits.push(path.relative(ROOT, p));
      }
    }
  };
  walk(path.join(ROOT, 'scripts')); walk(path.join(ROOT, 'templates')); walk(path.join(ROOT, 'tests'));
  assert.deepEqual(hits, []);
  assert.equal(JSON.parse(read('system.json')).id, 'foundryvtt-swse');
});

test('NPC-T21: snapshot helpers moved to SnapshotManager (hasSnapshots / info / revert)', async () => {
  const snaps = [{ timestamp: 10, label: 'Before Heroic Level-Up to 2', level: 1 }, { timestamp: 20, label: 'Latest', level: 2 }];
  const actor = { name: 'N', getFlag: () => null, flags: {} };
  const orig = { getSnapshots: SnapshotManager.getSnapshots, restoreSnapshot: SnapshotManager.restoreSnapshot };
  try {
    SnapshotManager.getSnapshots = () => snaps;
    assert.equal(SnapshotManager.hasSnapshots(actor), true);
    assert.equal(SnapshotManager.getLatestSnapshotInfo(actor).label, 'Latest');
    let restoredTs = null;
    SnapshotManager.restoreSnapshot = async (_a, ts) => { restoredTs = ts; return true; };
    assert.equal(await SnapshotManager.revertToLatestSnapshot(actor), true);
    assert.equal(restoredTs, 20);
    SnapshotManager.restoreSnapshot = async () => false;
    await assert.rejects(() => SnapshotManager.revertToLatestSnapshot(actor), /Snapshot restoration failed/);
    SnapshotManager.getSnapshots = () => [];
    assert.equal(SnapshotManager.hasSnapshots(actor), false);
    assert.equal(await SnapshotManager.revertToLatestSnapshot(actor), false);
  } finally {
    Object.assign(SnapshotManager, orig);
  }
});

// ---------------------------------------------------------------------------
// Finalization: scoped feat persistence (NPC-T08/T26) via the REAL finalizer compiler
// ---------------------------------------------------------------------------
test('NPC-T08/T26: the real feat plan builder keeps two scoped Skill Focus items, preserves choice + provenance, and is idempotent', async () => {
  const { FeatTalentPlanBuilder } = await sys('scripts/apps/progression-framework/shell/mutation/feat-talent-plan-builder.js');
  const { ProgressionContentAuthority } = await sys('scripts/engine/progression/content/progression-content-authority.js');
  // Content documents live in compendia the harness has no access to: the builder's
  // documented fallback (rawEntry-as-item) is what runs here.
  const origInit = ProgressionContentAuthority.initialize; const origFeat = ProgressionContentAuthority.getFeatDocument;
  ProgressionContentAuthority.initialize = async () => {};
  ProgressionContentAuthority.getFeatDocument = async () => null;
  try {
    const selections = {
      feats: [
        { ...feat('Skill Focus', 'perception'), grantSource: 'class:nonheroic' },
        { ...feat('Skill Focus', 'stealth'), grantSource: 'class:nonheroic' },
        { ...feat('Skill Training', 'perception'), grantSource: 'class:nonheroic' },
        { ...feat('Armor Proficiency (Light)'), grantSource: 'class:nonheroic' },
      ],
    };
    const actor = { items: [] };
    const plan = await FeatTalentPlanBuilder.build({ actor, selections, sessionState: { sessionId: 'sess-1' } });
    assert.equal(plan.items.length, 4, 'both Skill Focus instances survive (previously the 2nd was dropped by name-only dedupe)');
    const focus = plan.items.filter((i) => i.name === 'Skill Focus');
    assert.deepEqual(focus.map((i) => i.system.selectedChoice).sort(), ['perception', 'stealth']);
    assert.equal(new Set(focus.map((i) => i.flags.swse.progression.selectionId)).size, 2, 'distinct per-scope selection identity');
    for (const item of plan.items) assert.equal(item.system.acquisition.grantSource, 'class:nonheroic', 'provenance preserved');
    assert.equal(plan.items.every((i) => i.system.grantedByClass !== true), true, 'starting picks are not auto-granted exemptions');

    // Idempotent re-finalization: items already on the actor (same session) are not granted twice.
    const owned = { items: plan.items.map((i) => ({ ...i, flags: i.flags })) };
    const again = await FeatTalentPlanBuilder.build({ actor: owned, selections, sessionState: { sessionId: 'sess-1' } });
    assert.equal(again.items.length, 0, 'duplicate finalization does not double-grant');

    // A different session may not re-add an already-owned (feat, scope) either.
    const other = await FeatTalentPlanBuilder.build({ actor: owned, selections, sessionState: { sessionId: 'sess-2' } });
    assert.equal(other.items.length, 0);
    // ...but a NEW scope is still granted.
    const next = await FeatTalentPlanBuilder.build({ actor: owned, selections: { feats: [feat('Skill Focus', 'acrobatics')] }, sessionState: { sessionId: 'sess-3' } });
    assert.equal(next.items.length, 1);
  } finally {
    ProgressionContentAuthority.initialize = origInit; ProgressionContentAuthority.getFeatDocument = origFeat;
  }
});

test('NPC-T25: the existing finalization prerequisite validator re-checks feats; Nonheroic starting picks are not auto-granted exemptions', () => {
  const v = read('scripts/engine/progression/validation/finalization-prerequisite-validator.js');
  assert.match(v, /key: 'feats'/);
  const step = read('scripts/apps/progression-framework/steps/nonheroic-starting-feats-step.js');
  assert.doesNotMatch(step, /grantedByClass|autoGranted|multiclassStartingFeat/, 'starting picks must stay subject to prerequisite re-check');
  assert.match(step, /grantSource: 'class:nonheroic'/);
});

// ---------------------------------------------------------------------------
// NPC-T22 / T24 / T27 — dependent protection, session recovery, save/reload authority
// ---------------------------------------------------------------------------
test('NPC-T22: owner-synced minions stay Nonheroic-implicit with manual level-up disabled and no independent class progression', async () => {
  const minion = withFilter(npcActor([], {
    system: { level: 3, isMinion: true, npcProfile: { kind: 'minion', mode: 'owner-sync', owner: { actorId: 'owner-1' } } },
  }));
  const state = npcMode.getNpcProfileState(minion);
  assert.equal(state.kind, 'minion');
  assert.equal(state.mode, 'owner-sync');
  const session = newSession(minion, 'levelup', 'minion');
  await seedNonheroicSession(session, minion, 'levelup');
  assert.equal(session.nonheroicContext.isMinion, true);
  assert.equal(session.nonheroicContext.manualLevelUpAllowed, false);
  // No class item is ever committed for a dependent in levelup, and the entry blocks owner-synced NPCs.
  assert.equal(session.draftSelections.class, null);
  const entry = read('scripts/apps/levelup/npc-levelup-entry.js');
  assert.match(entry, /Owner-synced minions\/privateers do not level manually/);
  assert.match(read('scripts/apps/progression-framework/progression-entry.js'), /Minions do not level up manually/);
});

test('NPC-T24: a recovered (JSON round-tripped) chargen session keeps the Nonheroic class and scoped feat picks', async () => {
  const actor = withFilter(npcActor());
  const first = newSession(actor);
  await seedNonheroicSession(first, actor, 'chargen');
  first.commitSelection('nonheroic-starting-feats', 'feats', [feat('Skill Focus', 'perception'), feat('Skill Focus', 'stealth'), feat('Armor Proficiency (Light)')]);
  const restoredDraft = JSON.parse(JSON.stringify(first.draftSelections));

  const second = newSession(actor);
  for (const key of ['class', 'feats']) assert.equal(second.commitSelection('recovery', key, restoredDraft[key]), true);
  await seedNonheroicSession(second, actor, 'chargen'); // re-seed after restore
  assert.equal(second.draftSelections.class.id, 'nonheroic');
  assert.equal(second.draftSelections.feats.length, 3);
  assert.deepEqual(model.validateNonheroicStartingFeats(second.draftSelections.feats), { valid: true, errors: [] });
});

test('NPC-T27: a finalized Nonheroic 1 NPC resolves to nonheroic / progression authority with a 0-heroic/1-nonheroic split', async () => {
  const selection = model.buildNonheroicClassSelection({ level: 1 });
  // The finalizer embeds `clazz.system` verbatim as the class item's system data.
  const embedded = { id: 'item-1', name: selection.name, type: 'class', system: selection.system };
  const finalized = withFilter(npcActor([embedded], {
    system: { level: 1, npcProfile: { kind: 'nonheroic', legalProfile: 'nonheroic', mode: 'progression', sourceAuthority: 'progression' } },
  }));
  const state = npcMode.getNpcProfileState(finalized);
  assert.equal(state.kind, 'nonheroic');
  assert.equal(state.sourceAuthority, 'progression');
  assert.equal(state.identityConflicts.length, 0);
  assert.equal(npcMode.resolveNpcCalculationMode(finalized), 'progression');
  const split = getLevelSplit(finalized);
  assert.deepEqual({ h: split.heroicLevel, n: split.nonheroicLevel, t: split.totalLevel }, { h: 0, n: 1, t: 1 });
  assert.equal(embedded.system.isNonheroic, true);
  assert.equal(embedded.system.classId, 'nonheroic');
  assert.equal(embedded.system.level, 1);
  // Nonheroic mechanics carried by the class record: d4 HP, +0 BAB at level 1, no heroic defense bonus.
  assert.equal(embedded.system.hitDie, '1d4');
  assert.equal(embedded.system.levelProgression[0].bab, 0);
  assert.deepEqual(embedded.system.defenses, { fortitude: 0, reflex: 0, will: 0 });
  assert.equal(embedded.system.grants_force_points, false);
  assert.deepEqual(embedded.system.talentTrees, []);
});

test('NPC-001: the synthetic Nonheroic model keeps its fully merged system block when overridden (committed class is not a stub)', () => {
  const m = model.getNonheroicClassModel({ system: { level: 3 } });
  assert.equal(m.system.level, 3);
  assert.equal(m.system.isNonheroic, true);
  assert.equal(m.system.classId, 'nonheroic');
  assert.equal(m.system.hitDie, '1d4');
  assert.equal(m.system.babProgression, 'nonheroic');
});

/**
 * Talent progression policy: canonical class-based progression (default) vs the Talent Wiki house rule.
 *
 * Owner ruling 2026-11-14 (RECON-001): ordinary talents come from the progression table of the class
 * being advanced (Core Rulebook pp. 15, 37-39, 54-55); Force-sensitive characters may spend a
 * class-granted talent on a Force talent tree (Core p. 100). The previous implementation (class-table
 * talents PLUS a heroic talent at odd character levels) is preserved as the `talentWiki` house rule.
 *
 * TALENT WIKI BASELINE: the expected strings in section A were captured by running this harness
 * against the code BEFORE the refactor (commit 28154d6). They must not be edited to make a change pass.
 *
 * TEST SCOPE: unit / integration-with-stubs (see tests/helpers/talent-progression-harness.mjs).
 * NOT covered: Foundry V13 rendering, real ActorEngine writes, the finalizer commit.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as H from './helpers/talent-progression-harness.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { ProgressionReconciler } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');
const { FEAT_TALENT_RULE_KEYS } = await import('/systems/foundryvtt-swse/scripts/houserules/house-rule-grant-table.js');

let passed = 0;
const check = async (name, fn) => { H.resetRules(); await fn(); passed += 1; console.log(`PASS ${name}`); };
const wiki = () => H.setRule('talentWiki', true);

const BUILDS = {
  jedi20: Array(20).fill('Jedi'),
  jedi1soldier1: ['Jedi', 'Soldier'],
  soldier3scout1: ['Soldier', 'Soldier', 'Soldier', 'Scout'],
  jedi7knight3: [...Array(7).fill('Jedi'), 'Jedi Knight', 'Jedi Knight', 'Jedi Knight'],
  scoundrel2noble2soldier2: ['Scoundrel', 'Noble', 'Scoundrel', 'Noble', 'Soldier', 'Soldier'],
  soldier7crimelord3: [...Array(7).fill('Soldier'), 'Crime Lord', 'Crime Lord', 'Crime Lord'],
};
const fmt = (walk) => walk.events.map(e => `${e.level}:${e.className[0]}${e.classLevel}=${e.heroic}h${e.class}c`).join(' ');
const odd20 = (heroicEvery) => Array.from({ length: 20 }, (_, i) => `${i + 1}:J${i + 1}=${(heroicEvery || i % 2 === 0) ? 1 : 0}h${i % 2 === 0 ? 1 : 0}c`).join(' ');

// Captured from the pre-refactor implementation (see header). total, per-level heroic/class awards.
const WIKI_BASELINE = {
  plain: {
    jedi20: [20, odd20(false)],
    jedi1soldier1: [3, '1:J1=1h1c 2:S1=0h1c'],
    soldier3scout1: [5, '1:S1=1h1c 2:S2=0h0c 3:S3=1h1c 4:S1=0h1c'],
    jedi7knight3: [11, '1:J1=1h1c 2:J2=0h0c 3:J3=1h1c 4:J4=0h0c 5:J5=1h1c 6:J6=0h0c 7:J7=1h1c 8:J1=0h1c 9:J2=1h0c 10:J3=0h1c'],
    scoundrel2noble2soldier2: [6, '1:S1=1h1c 2:N1=0h1c 3:S2=1h0c 4:N2=0h0c 5:S1=1h1c 6:S2=0h0c'],
    soldier7crimelord3: [12, '1:S1=1h1c 2:S2=0h0c 3:S3=1h1c 4:S4=0h0c 5:S5=1h1c 6:S6=0h0c 7:S7=1h1c 8:C1=0h1c 9:C2=1h1c 10:C3=0h1c'],
  },
  talentEveryLevel: {
    jedi20: [30, odd20(true)],
    jedi1soldier1: [4, '1:J1=1h1c 2:S1=1h1c'],
    soldier3scout1: [7, '1:S1=1h1c 2:S2=1h0c 3:S3=1h1c 4:S1=1h1c'],
    jedi7knight3: [16, '1:J1=1h1c 2:J2=1h0c 3:J3=1h1c 4:J4=1h0c 5:J5=1h1c 6:J6=1h0c 7:J7=1h1c 8:J1=1h1c 9:J2=1h0c 10:J3=1h1c'],
    scoundrel2noble2soldier2: [9, '1:S1=1h1c 2:N1=1h1c 3:S2=1h0c 4:N2=1h0c 5:S1=1h1c 6:S2=1h0c'],
    soldier7crimelord3: [17, '1:S1=1h1c 2:S2=1h0c 3:S3=1h1c 4:S4=1h0c 5:S5=1h1c 6:S6=1h0c 7:S7=1h1c 8:C1=1h1c 9:C2=1h1c 10:C3=1h1c'],
  },
};
const SOLDIER_TREES = ['Ambusher', 'Armor Specialist', 'Brawler', 'Brute Squad', 'Commando', 'Mercenary', 'Rocket Jumper', 'Squad Leader', 'Trooper', 'Weapon Specialist'];
const JEDI_ONLY_TREES = ['Jedi Consular', 'Jedi Guardian', 'Jedi Sentinel', 'Lightsaber Combat'];
const FORCE_TREES = ['Alter', 'Control', 'Dark Side', 'Guardian Spirit', 'Light Side', 'Sense'];
const sorted = (list) => [...list].sort();
const WIKI_POOL_BASELINE = {
  jedi3_general: sorted([...FORCE_TREES, ...JEDI_ONLY_TREES]),
  jedi3_class: sorted([...FORCE_TREES, ...JEDI_ONLY_TREES]),
  soldier3_onJedi1_general: sorted([...SOLDIER_TREES, ...JEDI_ONLY_TREES]),
  soldier3_onJedi1_class: sorted(SOLDIER_TREES),
  soldierFS_class: sorted(SOLDIER_TREES),
  soldierFS_general: sorted([...SOLDIER_TREES, ...FORCE_TREES]),
};

// ---------------------------------------------------------------- A. Talent Wiki reproduces the previous behavior
await check('A1. Talent Wiki ON: award count and timing equal the pre-refactor baseline for every build', () => {
  wiki();
  for (const [name, order] of Object.entries(BUILDS)) {
    const walk = H.walkBuild(order);
    assert.equal(walk.total, WIKI_BASELINE.plain[name][0], name);
    assert.equal(fmt(walk), WIKI_BASELINE.plain[name][1], name);
  }
});

await check('A2. Talent Wiki ON + Talent Every Level: equal to the pre-refactor baseline', () => {
  wiki(); H.setRule('talentEveryLevel', true);
  for (const [name, order] of Object.entries(BUILDS)) {
    const walk = H.walkBuild(order);
    assert.equal(walk.total, WIKI_BASELINE.talentEveryLevel[name][0], name);
    assert.equal(fmt(walk), WIKI_BASELINE.talentEveryLevel[name][1], name);
  }
});

await check('A3. Talent Wiki ON: heroic and class selection pools equal the pre-refactor baseline', async () => {
  wiki();
  const pools = {
    jedi3_general: await H.treePool('general', H.actorOf({ Jedi: 2 }), 'Jedi'),
    jedi3_class: await H.treePool('class', H.actorOf({ Jedi: 2 }), 'Jedi'),
    soldier3_onJedi1_general: await H.treePool('general', H.actorOf({ Jedi: 1, Soldier: 2 }), 'Soldier'),
    soldier3_onJedi1_class: await H.treePool('class', H.actorOf({ Jedi: 1, Soldier: 2 }), 'Soldier'),
    soldierFS_class: await H.treePool('class', H.actorOf({ Soldier: 2 }, { feats: ['Force Sensitivity'] }), 'Soldier'),
    soldierFS_general: await H.treePool('general', H.actorOf({ Soldier: 2 }, { feats: ['Force Sensitivity'] }), 'Soldier'),
  };
  assert.deepEqual(pools, WIKI_POOL_BASELINE);
});

await check('A4. Talent Wiki ON: existing Class/Heroic terminology is kept', async () => {
  wiki();
  const step = new H.ClassTalentStep({ stepId: 'class-talent' });
  await step._getAvailableTrees({ actor: H.actorOf({ Soldier: 2 }), progressionSession: H.sessionFor('Soldier') }, H.ALL_TREES);
  assert.equal(step.getRemainingPicks()[0].label, 'Class Talent');
  assert.deepEqual(step.getBlockingIssues(), ['Select a Class Talent']);
  const general = new H.GeneralTalentStep({ stepId: 'general-talent' });
  assert.equal(general.getRemainingPicks()[0].label, 'Heroic Talent');
});

// ---------------------------------------------------------------- B. Canonical progression (default)
await check('B1. canonical is the default: talentWiki registered OFF, mode reads canonical', () => {
  assert.equal(H.TalentCadenceEngine.getProgressionMode(), 'canonical');
  assert.equal(H.TalentCadenceEngine.heroicTalentLaneEnabled(), false);
  const settingsSrc = fs.readFileSync(path.join(ROOT, 'scripts/houserules/houserule-settings.js'), 'utf8');
  assert.match(settingsSrc, /register\('talentWiki', \{[^}]*name: 'Talent Wiki'[^}]*type: Boolean,\s*default: false/s);
  const defaults = fs.readFileSync(path.join(ROOT, 'scripts/utils/settings-defaults.js'), 'utf8');
  assert.match(defaults, /talentWiki: false/);
});

await check('B2. single-class Jedi 1-20: one talent at each odd Jedi level, never a heroic-lane talent', () => {
  const walk = H.walkBuild(BUILDS.jedi20);
  assert.equal(walk.total, 10);
  assert.deepEqual(walk.events.filter(e => e.class > 0).map(e => e.classLevel), [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]);
  assert.ok(walk.events.every(e => e.heroic === 0));
});

await check('B3. Jedi 1 / Soldier 1 (heroic level 2) has exactly two talents, one per granting class', () => {
  const walk = H.walkBuild(BUILDS.jedi1soldier1);
  assert.equal(walk.total, 2);
  assert.deepEqual(walk.events.map(e => [e.className, e.classLevel, e.class, e.heroic]), [['Jedi', 1, 1, 0], ['Soldier', 1, 1, 0]]);
  const award = H.levelUpAward(H.actorOf({ Jedi: 1 }), 'Soldier');
  assert.equal(award.manifest.className, 'Soldier');
  assert.equal(award.manifest.classLevel, 1);
  assert.equal(award.manifest.heroicTalent.count, 0);
});

await check('B4. multiclass timing and first level in a new class', () => {
  assert.equal(H.walkBuild(BUILDS.soldier3scout1).total, 3); // Soldier 1, Soldier 3, Scout 1
  assert.equal(H.walkBuild(BUILDS.scoundrel2noble2soldier2).total, 3); // Scoundrel 1, Noble 1, Soldier 1
  // odd character level with an even class level grants nothing (Soldier 2 at character level 3)
  const a = H.levelUpAward(H.actorOf({ Scout: 1, Soldier: 1 }), 'Soldier');
  assert.equal(a.manifest.characterLevel, 3);
  assert.deepEqual([a.heroic, a.class, a.generalStep, a.classStep], [0, 0, false, false]);
});

await check('B5. prestige classes follow their own published progression tables', () => {
  const knight = H.walkBuild(BUILDS.jedi7knight3);
  assert.equal(knight.total, 6);
  assert.deepEqual(knight.events.filter(e => e.className === 'Jedi Knight' && e.class).map(e => e.classLevel), [1, 3]);
  const crimeLord = H.walkBuild(BUILDS.soldier7crimelord3);
  assert.deepEqual(crimeLord.events.filter(e => e.className === 'Crime Lord').map(e => e.class), [1, 1, 1], 'class data, not an assumed odd-level schedule');
  assert.equal(crimeLord.total, 7);
});

await check('B6. no general/heroic talent step ever opens, in chargen or level-up', () => {
  for (const cls of ['Jedi', 'Soldier', 'Scout', 'Noble', 'Scoundrel']) {
    const c = H.chargenSteps(cls);
    assert.deepEqual([c.generalStep, c.classStep], [false, true], cls);
  }
  for (const owned of [{}, { Jedi: 2 }, { Soldier: 4 }, { Jedi: 1, Soldier: 1 }]) {
    const a = H.levelUpAward(H.actorOf(owned), 'Jedi');
    assert.equal(a.heroic, 0); assert.equal(a.generalStep, false);
  }
  H.setRule('talentEveryLevel', true); // fails closed without Talent Wiki (RECON-005)
  assert.equal(H.chargenSteps('Jedi').generalStep, false);
  assert.equal(H.levelUpAward(H.actorOf({ Jedi: 1 }), 'Jedi').heroic, 0);
  assert.equal(H.TalentCadenceEngine.grantsClassTalent(2, false), 0);
});

await check('B7. Soldier 3 cannot ordinarily spend its talent on a Jedi-only tree (Jedi 1 / Soldier 2 actor)', async () => {
  const pool = await H.treePool('class', H.actorOf({ Jedi: 1, Soldier: 2 }), 'Soldier');
  assert.deepEqual(pool, sorted(SOLDIER_TREES));
  for (const tree of JEDI_ONLY_TREES) assert.ok(!pool.includes(tree), tree);
});

await check('B8. Force-sensitive character may spend a class talent on Force talent trees (Core p. 100), never on Jedi-only trees', async () => {
  const fsJediSoldier = await H.treePool('class', H.actorOf({ Jedi: 1, Soldier: 2 }, { feats: ['Force Sensitivity'] }), 'Soldier');
  assert.deepEqual(fsJediSoldier, sorted([...SOLDIER_TREES, ...FORCE_TREES]));
  const fsSoldier = await H.treePool('class', H.actorOf({ Soldier: 2 }, { feats: ['Force Sensitivity'] }), 'Soldier');
  assert.deepEqual(fsSoldier, sorted([...SOLDIER_TREES, ...FORCE_TREES]));
  // pending Force Sensitivity selection in the same progression session counts too
  const step = new H.ClassTalentStep({ stepId: 'class-talent' });
  const session = H.sessionFor('Soldier'); session.draftSelections.feats = [{ name: 'Force Sensitivity' }];
  const pending = (await step._getAvailableTrees({ actor: H.actorOf({ Soldier: 2 }), progressionSession: session }, H.ALL_TREES)).map(t => t.name).sort();
  assert.deepEqual(pending, sorted([...SOLDIER_TREES, ...FORCE_TREES]));
});

await check('B9. granting-class tree permissions: Jedi and prestige pools are the granting class only', async () => {
  assert.deepEqual(await H.treePool('class', H.actorOf({ Jedi: 2 }), 'Jedi'), WIKI_POOL_BASELINE.jedi3_class);
  const soldierInJedi = await H.treePool('class', H.actorOf({ Soldier: 1, Jedi: 2 }), 'Jedi');
  assert.ok(!soldierInJedi.some(t => SOLDIER_TREES.includes(t)), 'earlier Soldier levels do not widen a Jedi award');
  const knight = await H.treePool('class', H.actorOf({ Jedi: 7 }), 'Jedi Knight');
  assert.ok(knight.includes('Lightsaber Forms') && !knight.includes('Commando'));
});

await check('B10. UI labels the granting class and class level', async () => {
  const step = new H.ClassTalentStep({ stepId: 'class-talent' });
  await step._getAvailableTrees({ actor: H.actorOf({ Soldier: 2 }), progressionSession: H.sessionFor('Soldier') }, H.ALL_TREES);
  assert.equal(step.getRemainingPicks()[0].label, 'Soldier Talent — Soldier Level 3');
  assert.deepEqual(step.getBlockingIssues(), ['Select a Soldier Talent']);
  assert.equal(step.getFooterConfig().statusText, 'Soldier Talent not yet chosen');
});

// ---------------------------------------------------------------- C. Configuration
await check('C1. toggling: enabling Talent Wiki activates the heroic lane; disabling restores canonical for future awards', () => {
  const actor = H.actorOf({ Jedi: 2 });
  assert.equal(H.levelUpAward(actor, 'Jedi').heroic, 0);
  wiki();
  assert.equal(H.levelUpAward(actor, 'Jedi').heroic, 1);
  H.setRule('talentWiki', false);
  assert.equal(H.levelUpAward(actor, 'Jedi').heroic, 0);
  assert.equal(H.levelUpAward(actor, 'Jedi').class, 1, 'class-table award is unaffected by the toggle');
});

await check('C2. integrated with the existing house-rule infrastructure; the setting has one reader', () => {
  assert.ok(FEAT_TALENT_RULE_KEYS.includes('talentWiki'), 'reconciliation memo key covers the setting');
  const files = {
    manifest: 'scripts/houserules/houserules-manifest.js',
    gm: 'scripts/ui/shell/gm/GMHouseRulesSurfaceService.js',
    app: 'scripts/apps/house-rules-app.js',
  };
  for (const [k, f] of Object.entries(files)) assert.match(fs.readFileSync(path.join(ROOT, f), 'utf8'), /talentWiki/, k);
  const readers = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js') && /getBoolean\('talentWiki'|settings\.get\([^)]*'talentWiki'/.test(fs.readFileSync(full, 'utf8'))) readers.push(path.relative(ROOT, full));
    }
  };
  walk(path.join(ROOT, 'scripts'));
  assert.deepEqual(readers, ['scripts/houserules/adapters/FeatRulesAdapter.js']);
});

await check('C3. both modes share one commit authority: no mode-specific finalizer/mutation path', () => {
  const finalizer = fs.readFileSync(path.join(ROOT, 'scripts/apps/progression-framework/shell/progression-finalizer.js'), 'utf8');
  assert.ok(!/talentWiki|heroicTalentLaneEnabled/.test(finalizer));
  const audit = fs.readFileSync(path.join(ROOT, 'scripts/engine/progression/utils/levelup-finalization-audit.js'), 'utf8');
  assert.ok(!/talentWiki|heroicTalentLaneEnabled/.test(audit));
});

await check('C4. no ordinary advancement grants a talent twice: canonical never stacks a heroic award on a class award', () => {
  for (const order of Object.values(BUILDS)) {
    for (const e of H.walkBuild(order).events) assert.ok(e.heroic + e.class <= 1, JSON.stringify(e));
  }
});

// ---------------------------------------------------------------- D. Reconciliation follows the ruling
const reconcileActor = (classLevels) => {
  const actor = H.actorOf(classLevels);
  actor._stats = { modifiedTime: 1 };
  actor.system.hp = {};
  actor.system.progression = { classLevels: Object.entries(classLevels).map(([c, level]) => ({ class: c, classId: c.toLowerCase(), level })) };
  return ProgressionReconciler.safeReconcileActor(actor, { output: 'report', fresh: true });
};

await check('D1. canonical: a Jedi 1 / Soldier 1 actor owes two class-table talents, audited (no RECON-001 deferral)', () => {
  const r = reconcileActor({ Jedi: 1, Soldier: 1 });
  assert.equal(r.slots.classTalents.length, 2);
  assert.equal(r.slots.heroicTalents.length, 0);
  assert.ok(r.slots.classTalents.every(s => !(s.rulesDeferred || []).includes('RECON-001')));
});

await check('D2. Talent Wiki: multiclass talent auditing stays deferred exactly as before (RECON-001)', () => {
  wiki();
  const r = reconcileActor({ Jedi: 1, Soldier: 1 });
  assert.ok(r.slots.classTalents.every(s => s.status !== 'open'));
  assert.ok(r.slots.classTalents.some(s => (s.rulesDeferred || []).includes('RECON-001')));
});

console.log(`\n${passed} talent progression policy checks passed`);

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Talent-tree membership and declared-pack completion guards.
//
// This covers the resolutions recorded in
// docs/audits/talent-tree-membership-completion-*.json, one assertion per
// repaired category rather than only the final failure count, plus the two
// packs that used to ship as zero-byte files.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readPack = (name) =>
  fs.readFileSync(path.join(ROOT, 'packs', name), 'utf8')
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

const talents = readPack('talents.db');
const trees = readPack('talent_trees.db');
const classes = readPack('classes.db');
const talentsById = new Map(talents.map(d => [d._id, d]));
const treesById = new Map(trees.map(t => [t._id, t]));
const claimsOf = (id) => trees.filter(t => (t.system?.talentIds ?? []).includes(id));

/* ------------------------------------------------------------------ *
 * 1. The audit itself passes with no hard failures.
 * ------------------------------------------------------------------ */
{
  const result = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'audit-talent-tree-membership.mjs')], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, `audit-talent-tree-membership failed:\n${result.stdout}${result.stderr}`);
  assert.match(result.stdout, /PASS: talent\/tree membership audit found no hard failures/);
  for (const category of [
    'duplicateTalentIds',
    'duplicateTalentNamesWithinTree',
    'treeClaimsMissingTalents',
    'duplicateTreeSideTalentClaims',
    'talentsUnclaimedByTree',
    'talentsSelfClaimUnknownTree',
    'talentsSelfClaimTreeThatDoesNotClaimThem',
    'classRefsMissingTrees',
  ]) {
    assert.match(result.stdout, new RegExp(`^${category}: 0$`, 'm'), `${category} is not zero`);
  }
}

/* ------------------------------------------------------------------ *
 * 2. The duplicate-name rule is scoped, not disabled: two documents with
 *    the same name inside one tree must still fail.
 * ------------------------------------------------------------------ */
{
  const source = fs.readFileSync(path.join(ROOT, 'tools', 'audit-talent-tree-membership.mjs'), 'utf8');
  assert.match(source, /treeKeyForTalent/);
  assert.match(source, /duplicateTalentNamesWithinTree: getDuplicates\(talentNameMap\)/);

  const fixture = fs.mkdtempSync(path.join(ROOT, '.tmp-membership-fixture-'));
  try {
    fs.mkdirSync(path.join(fixture, 'packs'));
    fs.mkdirSync(path.join(fixture, 'tools'));
    fs.copyFileSync(
      path.join(ROOT, 'tools', 'audit-talent-tree-membership.mjs'),
      path.join(fixture, 'tools', 'audit-talent-tree-membership.mjs')
    );

    // Two same-named talents inside one tree.
    const tree = {
      _id: 'aaaaaaaaaaaaaaaa',
      name: 'Fixture Tree',
      type: 'talenttree',
      system: { talent_tree: 'Fixture Tree', talentIds: ['bbbbbbbbbbbbbbbb', 'cccccccccccccccc'] },
    };
    const twin = (id) => ({
      _id: id,
      name: 'Twinned Talent',
      type: 'talent',
      system: { treeId: tree._id, talent_tree: 'Fixture Tree' },
    });
    fs.writeFileSync(
      path.join(fixture, 'packs', 'talents.db'),
      [twin('bbbbbbbbbbbbbbbb'), twin('cccccccccccccccc')].map(d => JSON.stringify(d)).join('\n') + '\n'
    );
    fs.writeFileSync(path.join(fixture, 'packs', 'talent_trees.db'), JSON.stringify(tree) + '\n');
    fs.writeFileSync(path.join(fixture, 'packs', 'classes.db'), '');

    const result = spawnSync(
      process.execPath,
      [path.join(fixture, 'tools', 'audit-talent-tree-membership.mjs')],
      { cwd: fixture, encoding: 'utf8' }
    );
    assert.notEqual(result.status, 0, 'a same-tree duplicate name must still fail the audit');
    assert.match(result.stdout, /^duplicateTalentNamesWithinTree: 1$/m);
  } finally {
    fs.rmSync(fixture, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------ *
 * 3. Duplicate names across different trees are retained, not deleted.
 * ------------------------------------------------------------------ */
{
  const CANONICAL_CROSS_TREE_NAMES = [
    ['12b7eb5d32bd440e', '5e4a7f98b1e74326'], // Adept Spellcaster
    ['181da7f36b9fba9d', 'a6ad65c1275faa33'], // Force Treatment
    ['4fc3fe4c1e7f9ba0', 'd9e707f23fffc2af'], // Armor Mastery
    ['5ec84c7e500601e4', 'ecb678c47bb2cb43'], // Multiattack Proficiency (rifles)
    ['6021056231839e7c', 'f0851e0e5a1ac771'], // Multiattack Proficiency (advanced melee)
    ['7aa4ca13a96d8770', 'adfb725d20faade5'], // Ruthless
    ['9211e3f6268b3413', 'b7d5a1bc3d40b964'], // Keep It Together
    ['b265aa9dd35c4c5b', 'e6055a514a784387'], // Akk Dog Master
    ['e19c06b6dfc7a703', 'ec12ce36ff7048f2'], // Seize the Moment
  ];
  for (const [a, b] of CANONICAL_CROSS_TREE_NAMES) {
    assert.ok(talentsById.has(a), `${a} was deleted; same-name talents in different trees are canonical`);
    assert.ok(talentsById.has(b), `${b} was deleted; same-name talents in different trees are canonical`);
    assert.notEqual(
      talentsById.get(a).system.treeId,
      talentsById.get(b).system.treeId,
      `${talentsById.get(a).name} still has both copies in one tree`
    );
  }

  // The corrupt Force Meld copy is retired and nothing references it.
  assert.ok(!talentsById.has('7f47394dfbc94269'), 'the corrupt Force Meld duplicate is back');
  assert.equal(claimsOf('7f47394dfbc94269').length, 0);
  assert.ok(talentsById.has('816ac9cc1e6c413b'), 'the canonical Force Meld document was removed');

  // The Provocateur "Seize the Moment" sits in the tree its authority names.
  const provocateur = trees.find(t => t.name === 'Provocateur');
  assert.ok(provocateur, 'the Provocateur tree is missing');
  assert.equal(talentsById.get('ec12ce36ff7048f2').system.treeId, provocateur._id);
  assert.equal(talentsById.get('ec12ce36ff7048f2').system.talent_tree, 'Provocateur');
  assert.equal(talentsById.get('e19c06b6dfc7a703').system.treeId, '3caa80f6bef04200');
}

/* ------------------------------------------------------------------ *
 * 4. Cross-tree claims: exactly one tree claims each talent, and it is
 *    the tree the talent document itself names.
 * ------------------------------------------------------------------ */
{
  const PREVIOUSLY_CROSS_CLAIMED = {
    '5d4a63123e5a5eb4': 'Jedi Guardian',
    '9461c7aa79dd07c6': 'Jedi Guardian',
    '816ac9cc1e6c413b': 'Jedi Guardian',
    '4c236343b01ea763': 'Armor Specialist',
    '9379daa94a228c04': 'Lightsaber Combat',
    '72c644f7a09b1186': 'Lightsaber Combat',
    e8bf1222fd6289e4: 'Lightsaber Combat',
    bcd9981b3c6a46dc: 'Lightsaber Combat',
    e54ecc0ff06e61f3: 'Lightsaber Combat',
    '941c1dfd00e697da': 'Lightsaber Combat',
    b788095a71a47be7: 'Lightsaber Combat',
  };
  for (const [id, treeName] of Object.entries(PREVIOUSLY_CROSS_CLAIMED)) {
    const claims = claimsOf(id);
    assert.equal(claims.length, 1, `${talentsById.get(id)?.name} is claimed by ${claims.length} trees`);
    assert.equal(claims[0].name, treeName);
  }
}

/* ------------------------------------------------------------------ *
 * 5. Self-claim mismatches: the document's tree now claims it back.
 * ------------------------------------------------------------------ */
{
  const RECONCILED = {
    a1355dcae60772f5: 'Jedi Sentinel',   // Sense Primal Force
    ce151ce88fd55934: 'Jedi Sentinel',   // Prime Targets
    bab9a1ce285f98b9: 'Beastwarden',     // Charm Beast
  };
  for (const [id, treeName] of Object.entries(RECONCILED)) {
    const claims = claimsOf(id);
    assert.equal(claims.length, 1, `${talentsById.get(id)?.name} is claimed by ${claims.length} trees`);
    assert.equal(claims[0].name, treeName);
  }

  // No talent anywhere is left unclaimed or claimed by more than one tree.
  const claimCounts = new Map();
  for (const tree of trees) {
    for (const id of tree.system?.talentIds ?? []) {
      claimCounts.set(id, (claimCounts.get(id) ?? 0) + 1);
    }
  }
  assert.deepEqual([...claimCounts.values()].filter(n => n > 1), []);
  assert.deepEqual(talents.filter(t => !claimCounts.has(t._id)).map(t => t.name), []);
}

/* ------------------------------------------------------------------ *
 * 6. Class references to trees all resolve, and the two missing trees
 *    were restored rather than the references deleted.
 * ------------------------------------------------------------------ */
{
  const eliteDroid = trees.find(t => t.name === 'Elite Droid');
  assert.ok(eliteDroid, 'the Elite Droid tree document was not restored');
  assert.ok(
    readJson('data/talent_tree_class_map.json')['Elite Droid']?.includes('Independent Droid'),
    'the Elite Droid class map entry is gone'
  );
  const independentDroid = classes.find(c => c.name === 'Independent Droid');
  assert.ok(
    independentDroid.system.talentTreeIds.includes('elite_droid'),
    'the Independent Droid class lost its Elite Droid access declaration'
  );

  const terasKasi = treesById.get('ba726f623e42f849');
  assert.equal(terasKasi.name, 'Master of Teräs Käsi');
  assert.equal(terasKasi.system.talent_tree, 'Master of Teräs Käsi');
  for (const className of ['Martial Arts Master', 'Elite Trooper']) {
    const cls = classes.find(c => c.name === className);
    assert.ok(cls.system.talentTreeIds.includes('master_of_teräs_käsi'));
    assert.ok(
      cls.system.talentTreeSourceIds.includes('ba726f623e42f849'),
      `${className} lost its Teräs Käsi tree id`
    );
  }
}

/* ------------------------------------------------------------------ *
 * 7. The investigation report exists and covers every repaired finding.
 * ------------------------------------------------------------------ */
{
  const dir = path.join(ROOT, 'docs', 'audits');
  const reports = fs.readdirSync(dir).filter(f => /^talent-tree-membership-completion-.*\.json$/.test(f));
  assert.equal(reports.length, 1, 'expected exactly one membership completion report');
  const report = readJson(path.join('docs', 'audits', reports[0]));
  assert.ok(report.authority?.primary);
  assert.equal(report.summary.originalHardFailures, 31);
  assert.equal(report.summary.remainingHardFailures, 0);
  assert.ok(report.findings.length >= 28, `only ${report.findings.length} findings recorded`);
  // Every original category is accounted for by at least one resolution.
  const categories = new Set(report.findings.map(f => f.category));
  for (const category of [
    'duplicateTalentNames',
    'duplicateTreeSideTalentClaims',
    'selfClaimOrUnclaimed',
    'classRefsMissingTrees',
    'checkerCorrection',
  ]) {
    assert.ok(categories.has(category), `no finding recorded for ${category}`);
  }
  for (const finding of report.findings) {
    assert.ok(finding.category, 'a finding has no category');
    assert.ok(finding.resolution, 'a finding has no selected resolution');
    assert.ok(finding.reason && finding.reason.length > 40, 'a finding has no reason for its resolution');
  }
}

/* ------------------------------------------------------------------ *
 * 8. No declared pack is empty, and both generated packs are current.
 * ------------------------------------------------------------------ */
{
  const system = readJson('system.json');
  for (const pack of system.packs) {
    const dbPath = path.join(ROOT, `${pack.path.replace(/\/$/, '')}.db`);
    if (!fs.existsSync(dbPath)) continue;
    assert.notEqual(fs.statSync(dbPath).size, 0, `declared pack ${pack.name} is zero bytes`);
  }

  const manifest = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'check-system-manifest.mjs')], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(manifest.status, 0, manifest.stdout + manifest.stderr);
  assert.doesNotMatch(manifest.stdout, /content gaps/i, 'the manifest still reports content gaps');

  for (const tool of ['build-poisons-pack.mjs', 'build-talent-enhancements-pack.mjs']) {
    const result = spawnSync(process.execPath, [path.join(ROOT, 'tools', tool), '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, `${tool} reports the pack is stale:\n${result.stdout}${result.stderr}`);
  }

  // The poison pack matches the engine's definitions, one document each.
  const { POISON_DEFINITIONS } = await import(
    new URL('../scripts/engine/poison/poison-definitions.js', import.meta.url)
  );
  const poisons = readPack('poisons.db');
  assert.equal(poisons.length, Object.keys(POISON_DEFINITIONS).length);
  assert.deepEqual(
    poisons.map(p => p.system.key).sort(),
    Object.keys(POISON_DEFINITIONS).sort()
  );
  for (const poison of poisons) {
    assert.equal(poison.type, 'poison');
    assert.ok(poison.system.source, `${poison.name} has no source attribution`);
  }

  // The enhancement pack matches its JSON authority and is shaped the way
  // CombatActionsMapper._indexEnhancements() reads it.
  const authority = readJson('data/talent-enhancements.json');
  const expected = Object.values(authority).flatMap(group => group.enhancements ?? []);
  const enhancements = readPack('talent-enhancements.db');
  assert.equal(enhancements.length, expected.length);
  assert.deepEqual(enhancements.map(e => e.name).sort(), expected.map(e => e.name).sort());
  for (const enhancement of enhancements) {
    assert.ok(enhancement.system.actionKey, `${enhancement.name} has no actionKey`);
    assert.ok(enhancement.system.requiredTalent, `${enhancement.name} has no requiredTalent`);
    assert.ok(enhancement.system.effect && typeof enhancement.system.effect === 'object');
    assert.ok(Object.hasOwn(authority, enhancement.system.actionKey));
  }
}

console.log('talent-membership-and-pack-completion: all assertions passed');

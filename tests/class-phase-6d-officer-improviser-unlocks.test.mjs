import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyClassPackProtectedState } from '../tools/lib/class-pack-protected-guard.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const text = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const classes = text('packs/classes.db').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const get = name => {
  const rows = classes.filter(doc => doc.name === name);
  assert.equal(rows.length, 1, `unique class ${name}`);
  return rows[0].system.level_progression;
};

test('Officer printed Core p.221: normal talents on odd levels, separate Share Talent picks at even levels', () => {
  const progression = get('Officer');
  assert.equal(progression.length, 10);
  for (const row of progression) {
    const normal = row.features.filter(feature => feature.type === 'talent_choice');
    const shares = row.features.filter(feature => feature.type === 'share_talent_choice');
    if (row.level % 2 === 1) {
      assert.equal(normal.length, 1, `Officer L${row.level}`);
      assert.equal(shares.length, 0, `Officer L${row.level}`);
    } else {
      assert.equal(normal.length, 0, `Officer L${row.level}`);
      assert.equal(shares.length, 1, `Officer L${row.level}`);
      assert.equal(shares[0].name, 'Share Talent');
      assert.equal(shares[0].value, 1);
      assert.equal(shares[0].selection, 'previously-owned-talent');
      assert.equal(shares[0].uniqueAcrossSelections, true);
      assert.deepEqual(shares[0].eligibleTrees, ['Influence', 'Inspiration', 'Commando', 'Military Tactics']);
    }
  }
});

test('Officer Command Cover is granted once at class level 2, and not awarded as five stacking items', () => {
  const rows = get('Officer');
  const cover = rows.flatMap(row => row.features.filter(f => /command cover/i.test(f.name)).map(f => ({level:row.level,...f})));
  assert.equal(cover.length, 1);
  assert.equal(cover[0].level, 2);
  assert.equal(cover[0].name, 'Command Cover');
  assert.equal(cover[0].featureKey, 'officer.commandCover');
  assert.equal(cover[0].scaling.maximum, 5);
});

test('Improviser Rebellion p.41: Contraband appears only at 2/4/6/8/10 with exact credit thresholds', () => {
  const rows = get('Improviser');
  assert.equal(rows.length, 10);
  for (const row of rows) {
    const entries = row.features.filter(f => f.featureKey === 'improviser.contraband' || /contraband|000 credits/i.test(f.name));
    if (row.level % 2 === 1) {
      assert.equal(entries.length, 0, `odd-level Contraband at ${row.level}`);
      assert.equal(row.features.filter(f => f.type === 'talent_choice').length, 1);
    } else {
      assert.equal(entries.length, 1, `Improviser L${row.level}`);
      assert.deepEqual(entries[0], {
        name: 'Contraband',
        type: 'scaling_feature',
        featureKey: 'improviser.contraband',
        value: row.level * 1000,
        unit: 'credits',
      });
    }
    assert.ok(row.features.every(f => !/^000 credits/.test(f.name) && !/\(\d+$/.test(f.name)), `no comma-split labels at L${row.level}`);
  }
});

test('Share Talent dispatch and level-up entitlements cannot masquerade as ordinary talent acquisition', () => {
  const manifest = text('scripts/engine/progression/utils/levelup-entitlement-manifest.js');
  const dispatcher = text('scripts/engine/progression/engine/feature-dispatcher.js');
  const finalAudit = text('scripts/engine/progression/utils/levelup-finalization-audit.js');
  assert.match(manifest, /share_talent_choice:\s*'shareTalentChoices'/);
  assert.match(dispatcher, /'share_talent_choice':\s*handleShareTalentChoice/);
  assert.match(finalAudit, /shareTalentChoices/);
  assert.match(finalAudit, /dedicated existing-talent picker/);
});

test('all protected class identities and other feature schedules remain source-frozen', () => {
  assert.equal(classes.length, 37);
  const audit = verifyClassPackProtectedState(ROOT);
  assert.equal(audit.ok, true, audit.failures.join('; '));
});

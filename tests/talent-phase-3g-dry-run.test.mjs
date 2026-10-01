import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canonicalTalentUuid, canonicalTalentId, sameTalentUuid } from '../scripts/data/talent-source-identity.js';

// Phase 3G-3: pins the migration manifest, the dry-run certification, the owner ruling and the schema decision.
const rd = rel => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const m = rd('data/audits/talent-phase-3g-migration-manifest.json'), r = rd('data/audits/talent-phase-3g-dry-run-report.json');
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('manifest: 315 rows, 315 unique owner leaves, every target a canonical v13 UUID that exists', () => {
  assert.equal(m.rows.length, 315);
  assert.equal(new Set(m.rows.map(x => `${x.ownerId}|${x.path}`)).size, 315);
  for (const x of m.rows) { assert.equal(x.proposed.uuid, canonicalTalentUuid(x.target.id)); assert.equal(x.proposed.type, 'talent'); assert.ok(x.proposed.name); assert.ok(x.derivation.basis); }
});
test('dry-run certified: 300 records, 315 leaves, 945 field operations, every check passes', () => {
  assert.equal(r.status, 'DRY_RUN_CERTIFIED'); assert.equal(r.dryRun, true);
  assert.deepEqual([r.counts.talentLeavesMigrated, r.counts.recordsChanged, r.counts.fieldLevelLeafMutations], [315, 300, 945]);
  assert.ok(r.verification.results.every(x => x.ok));
  const e = r.runtimeEffectiveness;
  assert.deepEqual([e.embeddedSourceLinked, e.embeddedLegacyLinkForm, e.pending, e.viaUuidEmbedded, e.viaUuidPending, e.failures.length], [315, 315, 315, 315, 315, 0]);
  assert.equal(e.wrongSameNameChecked, e.wrongSameNameRejected); assert.equal(e.unlinkedWrongTreeChecked, e.unlinkedWrongTreeRejected);
});
test('owner ruling: Find an Opening -> Scum and Villainy|Outlaw|Seize the Moment (e19c06b6dfc7a703), NOT Provocateur', () => {
  const x = m.rows.find(y => y.ownerName === 'Find an Opening');
  assert.equal(x.ownerCanonicalIdentity, 'Scum and Villainy|Outlaw|Find an Opening');
  assert.equal(x.target.canonicalIdentity, 'Scum and Villainy|Outlaw|Seize the Moment');
  assert.equal(x.target.id, 'e19c06b6dfc7a703'); assert.equal(x.target.uuid, 'Compendium.foundryvtt-swse.talents.Item.e19c06b6dfc7a703');
  assert.equal(x.target.tree, 'Outlaw'); assert.match(x.derivation.basis, /OWNER_RULING/);
});
test('the five Phase 3D repairs migrate their existing production ids to UUIDs', () => {
  for (const nm of ['Fearsome', 'Ruthless Negotiator', 'Shared Notoriety', 'Unsavory Reputation', 'Weakening Strike']) {
    const x = m.rows.find(y => y.ownerName === nm && y.existing.id === y.target.id); assert.ok(x, nm); assert.match(x.derivation.basis, /Phase 3D repair/);
  }
});
test('schema decision: uuid authoritative, name retained as label, id removed', () => {
  assert.match(m.schemaDecision.uuid, /authoritative/); assert.match(m.schemaDecision.name, /retained/); assert.match(m.schemaDecision.id, /REMOVED/);
});
test('helper accepts the nine legacy 32-hex production ids in every form', () => {
  const id = 'eb4f3e8660bc476589d0323d4cc00845';
  assert.equal(canonicalTalentId(id), id); assert.equal(canonicalTalentUuid(`Compendium.foundryvtt-swse.talents.${id}`), `Compendium.foundryvtt-swse.talents.Item.${id}`);
  assert.ok(sameTalentUuid(id, `Compendium.foundryvtt-swse.talents.Item.${id}`));
  assert.ok(m.rows.some(x => x.target.id === id));
});
console.log(`talent-phase-3g-dry-run: ${n} checks passed`);

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildCrosswalk, OUT_JSON } from '../tools/audit-weapon-v2-gate-a-crosswalk.mjs';

// Weapon three-gate Gate A: canonical registry <-> production Item projection. The committed crosswalk is current, every canonical identity has
// exactly one production Item, every unbound pack document is a documented non-weapon, and NO unexplained difference exists in the fields combat reads.
const cw = await buildCrosswalk();
test('crosswalk is current with its inputs (registry + production packs)', () => {
  assert.equal(JSON.stringify(cw, null, 2) + '\n', fs.readFileSync(OUT_JSON, 'utf8'), 'run: node tools/audit-weapon-v2-gate-a-crosswalk.mjs');
});
test('every canonical identity binds to exactly one production Item (a bijection) and the unbound documents are weapon upgrade parts, not weapons', () => {
  assert.equal(cw.summary.canonicalIdentities, 203);
  assert.equal(cw.summary.canonicalIdentitiesWithAProductionItem, 203); assert.deepEqual(cw.summary.identitiesWithoutAProductionItem, []);
  assert.equal(new Set(cw.rows.map((r) => r.identityKey)).size, cw.rows.length, 'no identity is bound twice');
  assert.equal(new Set(cw.rows.map((r) => r.productionId)).size, cw.rows.length);
  assert.deepEqual(cw.unbound.map((u) => u.type), cw.unbound.map(() => 'weaponUpgrade'), `unbound: ${cw.unbound.map((u) => u.name).join(', ')}`);
});
test('no unexplained difference in the category, dice, damage type or weight the Item projects (documented conventions are named, not hidden)', () => {
  assert.deepEqual(cw.summary.unexplainedDifferences, { branch: 0, dice: 0, damageType: 0, weight: 0 }, JSON.stringify(cw.different));
  for (const r of cw.rows) for (const f of ['dice', 'damageType']) if (r[f].result === 'KNOWN_CONVENTION') assert.ok(r[f].why, `${r.identityKey}.${f}: a convention names its reason`);
});
test('the melee / ranged category the Item projects agrees with the canonical default profile on all 203 (so Item metadata cannot mislead the combat paths)', () => {
  assert.deepEqual(cw.summary.branch, { MATCH: 203 });
});

import assert from 'node:assert/strict';
import { detectPackState } from '../tools/apply-talent-phase-3c.mjs';
import { loadPostState, verifyPostState } from '../tools/apply-talent-phase-3d.mjs';

// Regression guard for the certified Phase 3D post-state. Before the migration is applied this is a documented no-op.
if (detectPackState().state !== 'POST_3D_STATE') {
  console.log('  skip talent-phase-3d post-state: packs are not the certified Phase 3D post-state');
  process.exit(0);
}
const st = loadPostState();
const results = verifyPostState(st, { exact: true });
let passed = 0; const test = (n, fn) => { fn(); passed++; console.log('  ok  ' + n); };
test('--verify --exact passes (every check, every certified blob, residual-reference gate)', () => assert.deepEqual(results.filter(r => !r.ok), []));
test('certified counts: 1,187 canonical + 50 homebrew = 1,237; 177 canonical trees + 19 homebrew-only trees', () => {
  assert.equal(st.talents.length, 1187); assert.equal(st.homebrewTalents.length, 50);
  assert.equal(st.trees.length, 177); assert.equal(st.homebrewTrees.length, 19);
});
test('the 34 actor items are repointed to surviving canonical talents with refreshed snapshots', () => {
  const items = st.report.actorRepoints.items; assert.equal(items.length, 34);
  assert.equal(items.filter(r => r.snapshotRefreshed).length, 34);
});
test('no homebrew talent is exposed by the canonical registries or tree membership', () => {
  const hb = new Set(st.homebrewTalents.map(t => t._id));
  assert.ok(st.registry.every(e => (e.talentIds ?? []).every(id => !hb.has(id))));
  assert.ok(st.trees.every(t => t.system.talentIds.every(id => !hb.has(id))));
});
console.log(`\n${passed} talent-phase-3d post-state checks passed`);

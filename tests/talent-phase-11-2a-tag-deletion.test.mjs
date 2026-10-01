import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

// Phase 11-2A: pins the certified junk-tag deletion (74 DELETE-bucket tags, canonical talents only).
const rd = rel => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const nd = rel => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
const auth = rd('data/audits/archetype-phase-11-2/tag-pruning-pass-1.json'), man = rd('data/audits/talent-phase-11-2a-deletion-manifest.json'), rep = rd('data/audits/talent-phase-11-2a-dry-run-report.json');
let n = 0; const test = (name, fn) => { fn(); n++; console.log('  ok  ' + name); };

test('authority: certified 123/74/125/108 partition of 430 tags; the deletion list is exactly the DELETE bucket', () => {
  assert.deepEqual(auth.counts, { KEEP: 123, DELETE: 74, RECONSIDER: 125, BESPOKE: 108 }); assert.equal(auth.tags.length, 430);
  assert.deepEqual(man.deleteTags, auth.tags.filter(t => t.bucket === 'DELETE').map(t => t.tag).sort()); assert.equal(man.deleteTags.length, 74);
  for (const t of ['tree_6ac3416fb6aada56', 'choice_required', 'feat-chain', 'phase-t27-reviewed', 'contextual']) assert.ok(man.deleteTags.includes(t));
  for (const t of ['runtime', 'category_force_adept', 'striker', 'force', 'light-side']) assert.ok(!man.deleteTags.includes(t), `${t} must not be deleted`);
});
test('dry-run certified: 669 records, 1,681 tag elements, 430 -> 356 raw tags, every gate passes', () => {
  assert.equal(rep.status, 'DRY_RUN_CERTIFIED'); assert.ok(rep.verification.results.every(x => x.ok));
  assert.deepEqual([rep.counts.recordsChanged, rep.counts.tagElementsRemoved, rep.counts.rawTagsBefore, rep.counts.rawTagsAfter], [669, 1681, 430, 356]);
  assert.deepEqual(rep.counts.survivingByBucket, { KEEP: 123, RECONSIDER: 125, BESPOKE: 108 }); assert.equal(man.rows.length, 669); assert.ok(man.rows.every(r => r.path === 'system.tags'));
  assert.equal(rep.runtimeConsumers.exactProbesIdentical, true); assert.equal(rep.runtimeConsumers.treeCreditChanges, 0);
  assert.ok(rep.runtimeConsumers.literalMentionsInTagReadingScripts.every(h => h.triage !== 'UNTRIAGED'));
});
test('manifest rows: only deleted tags removed, survivors keep order, nothing added', () => {
  const del = new Set(man.deleteTags);
  for (const r of man.rows) { assert.deepEqual(r.after, r.before.filter(x => !del.has(x))); assert.ok(r.removed.length && r.removed.every(x => del.has(x))); }
  assert.equal(man.tagElementsRemoved, man.rows.reduce((a, r) => a + r.removed.length, 0));
});
test('suggestion-scoring consumers of deleted bookkeeping tags are reported, not restored', () => {
  const hits = rep.runtimeConsumers.literalMentionsInTagReadingScripts.filter(h => h.file.endsWith('SuggestionScorer.js'));
  assert.ok(hits.length >= 1 && hits.every(h => /defect/i.test(h.triage)));
});
test('state-appropriate gate passes; the applied pack carries none of the 74 tags and homebrew is untouched', () => {
  const st = spawnSync(process.execPath, ['tools/apply-talent-phase-11-2a.mjs', '--status'], { encoding: 'utf8' }); const state = (st.stdout + st.stderr).trim().split(' ').pop();
  const r = spawnSync(process.execPath, ['tools/apply-talent-phase-11-2a.mjs', ...(state === 'POST_11_2A' ? ['--verify', '--exact'] : ['--check'])], { encoding: 'utf8' }); assert.equal(r.status, 0, state + r.stdout + r.stderr);
  if (state === 'POST_11_2A') { const del = new Set(man.deleteTags); assert.ok(nd('packs/talents.db').every(t => (t.system.tags ?? []).every(x => !del.has(x)))); assert.equal(nd('packs/talents-homebrew.db').length, 50); }
});
console.log(`talent-phase-11-2a-tag-deletion: ${n} checks passed`);

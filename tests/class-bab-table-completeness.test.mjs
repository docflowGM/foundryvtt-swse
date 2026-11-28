import assert from 'node:assert/strict';
import fs from 'node:fs';

// DC-A06 data guard: every shipped class carries an exact per-level BAB table (contiguous levels from 1, numeric, never decreasing), so no production
// character depends on a rate-only estimate. The estimation fallbacks in BABCalculator, ActorPrerequisiteSnapshot, PrerequisiteChecker and the suggestion
// utilities are therefore unreachable for shipped data; they also disagree with each other for a `slow` rate (x0.75 vs x0.5), which is why a class added
// WITHOUT an exact table must fail this test instead of silently estimating (rules register DC-A06-RATE).
const rows = fs.readFileSync('packs/classes.db', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
assert.ok(rows.length >= 37);
const problems = [];
for (const r of rows) {
  const s = r.system ?? {};
  const lp = s.levelProgression ?? s.level_progression;
  if (!Array.isArray(lp) || lp.length === 0) { problems.push(`${r.name}: no levelProgression`); continue; }
  let prev = -1;
  lp.forEach((row, i) => {
    const bab = Number(row?.bab ?? row?.baseAttackBonus);
    if (Number(row?.level) !== i + 1) problems.push(`${r.name}: level ${row?.level} at index ${i}`);
    if (!Number.isFinite(bab)) problems.push(`${r.name}: level ${i + 1} has no numeric bab`);
    else { if (bab < prev) problems.push(`${r.name}: BAB decreases at level ${i + 1}`); prev = bab; }
  });
  const rate = String(s.babProgression ?? s.bab_progression ?? '').toLowerCase();
  if (rate && !['fast', 'medium'].includes(rate)) problems.push(`${r.name}: rate "${rate}" is not covered by a certified estimate`);
}
assert.deepEqual(problems, [], 'every class needs an exact BAB table');
process.stdout.write(`class-bab-table-completeness: ok (${rows.length} classes)\n`);

/**
 * Exact BAB lookup for a canonical class model (including synthetic Nonheroic).
 * Source: packs/classes.db via ClassesRegistry, never a guessed progression label.
 * Pure so prestige readiness and validation tests can exercise the same rule.
 */
export function getCanonicalClassBABAtLevel(classModel, level) {
  const className = classModel?.name || '(unresolved class)';
  if (!Number.isInteger(level) || level < 1) {
    throw new Error(`Class BAB: invalid level ${level} for "${className}"`);
  }

  const rows = classModel?.levelProgression;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`Class BAB: no canonical progression table for "${className}"`);
  }

  const row = rows.find(entry => Number(entry?.level) === level);
  if (!row || !Number.isInteger(row.bab) || row.bab < 0) {
    throw new Error(`Class BAB: no canonical BAB row for "${className}" level ${level}`);
  }

  return row.bab;
}

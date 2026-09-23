/**
 * Roll Composition — the final assembly step that consumes:
 *   - a resolved numeric static-modifier total (ModifierEngine's domain,
 *     already a plain number by the time it reaches here);
 *   - resolved FORMULA_TERM contributions (still formula strings);
 *   - resolved BASE_ROLL_TRANSFORM contributions (already applied to the
 *     base formula by roll-transform-resolver.js's applyRollTransforms());
 * and produces one Foundry-compatible formula string, plus a
 * human-readable breakdown for roll dialogs/previews (never pre-rolls the
 * extra terms merely to preview them — the breakdown lists their formula
 * strings verbatim, exactly what buildDamageFormula()'s preview already
 * does for Damage).
 *
 * This is intentionally a pure function: no actor mutation, no Roll
 * execution, no randomness. RollCore/RollEngine remain the only place a
 * real Roll is constructed and evaluated.
 */

export function composeRoll({
  baseFormula,
  baseLabel = 'Base Roll',
  staticModifierTotal = 0,
  staticModifierLabel = 'Static Bonus',
  formulaTerms = [],
  transformedBaseFormula = null
} = {}) {
  const resolvedBase = transformedBaseFormula ?? baseFormula;
  const parts = [resolvedBase];
  const breakdown = [{ label: baseLabel, value: resolvedBase }];

  if (staticModifierTotal) {
    const sign = staticModifierTotal >= 0 ? '+' : '-';
    parts.push(`${sign} ${Math.abs(staticModifierTotal)}`);
    breakdown.push({ label: staticModifierLabel, value: `${sign}${Math.abs(staticModifierTotal)}` });
  }

  for (const term of formulaTerms) {
    parts.push(`+ ${term.formula}`);
    breakdown.push({ label: term.sourceName ?? 'Formula Term', value: `+${term.formula}` });
  }

  return { formula: parts.join(' '), breakdown };
}

export default { composeRoll };

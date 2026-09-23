/**
 * Roll Formula Validator — the one place a candidate FORMULA_TERM or
 * BASE_ROLL_TRANSFORM string is checked before it is allowed to reach a
 * real Roll.
 *
 * Per this authority's first principle (see
 * docs/audits/v2-roll-expression-transform-authority.md, "Foundry grammar"):
 * this module does NOT implement a competing dice parser. It delegates
 * entirely to Foundry's own `Roll.validate(formula)` static method — the
 * same grammar RollCore._executeRoll() ultimately evaluates against, so a
 * string this function accepts is, by construction, a string Foundry
 * itself already considers well-formed. There is no second source of
 * truth to keep in sync.
 *
 * Never evaluates the formula (no dice are rolled here — `Roll.validate`
 * parses without rolling), never uses `eval`/`Function`, and rejects
 * anything that isn't a plain string outright.
 */

/**
 * @param {*} formula - candidate formula/transform string.
 * @returns {{ valid: boolean, reason: string }}
 */
export function validateRollFormula(formula) {
  if (typeof formula !== 'string' || !formula.trim()) {
    return { valid: false, reason: 'Formula must be a non-empty string.' };
  }

  const trimmed = formula.trim();

  // Foundry's Roll class is only defined at runtime inside Foundry itself.
  // A caller that reaches this function outside that environment (e.g. a
  // dev script) gets a fail-closed rejection, never a silent pass.
  if (typeof globalThis.Roll?.validate !== 'function') {
    return { valid: false, reason: 'Roll.validate() is not available in this environment; cannot safely validate a formula without it.' };
  }

  let ok = false;
  try {
    ok = globalThis.Roll.validate(trimmed) === true;
  } catch (err) {
    return { valid: false, reason: `Roll.validate() threw: ${err?.message ?? err}` };
  }

  if (!ok) {
    return { valid: false, reason: `"${trimmed}" is not a formula Roll.validate() accepts.` };
  }

  return { valid: true, reason: 'valid' };
}

/** Convenience boolean form for call sites that only need the yes/no answer. */
export function isValidRollFormula(formula) {
  return validateRollFormula(formula).valid;
}

export default { validateRollFormula, isValidRollFormula };

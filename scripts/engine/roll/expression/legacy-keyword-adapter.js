/**
 * Legacy `*ModifierFormula` Keyword Adapter.
 *
 * `attackModifierFormula`/`damageModifierFormula` (DEFAULT_ATTACK_OPTIONS,
 * combat-option-resolver.js) are NOT arbitrary Foundry Roll formulas
 * despite the field name — they are a small closed vocabulary of keyword
 * strings ("value", "-value", "halfLevel", "halfLevelMinusOne", "level" /
 * "classLevel" / "characterLevel" / "heroicLevel" / "actorLevel", and a
 * "context.<key>" prefix form) that each resolve DETERMINISTICALLY to a
 * plain number. This module is the one canonical, documented,
 * independently-testable specification of that vocabulary — a
 * LEGACY_KEYWORD -> STATIC_MODIFIER compatibility adapter, per this
 * authority's explicit instruction not to reinterpret these fields as real
 * formula syntax.
 *
 * It is a NEW, additive module: `combat-option-resolver.js`'s own inline
 * switch (collectAttackModifiers()) remains the certified, unchanged
 * Attack Bonus/Damage SSOT authority for these fields — reopening it is
 * explicitly out of scope for this phase. `tests/roll-expression-
 * transform-authority.test.mjs` proves this adapter's output is
 * byte-identical to that inline switch for every currently-known keyword,
 * so the two can never silently drift apart; a future consumer that needs
 * this translation outside the certified Attack/Damage path (or a future
 * correction round migrating combat-option-resolver.js itself) has one
 * place to read, not a second copy to reinvent.
 *
 * A string this adapter does not recognize is a fail-closed rejection, not
 * a silent 0 — never guess at an unknown keyword's meaning.
 */

export const KNOWN_LEGACY_MODIFIER_FORMULA_KEYWORDS = Object.freeze([
  'value', '-value', 'halfLevel', 'halfLevelMinusOne',
  'level', 'classLevel', 'characterLevel', 'heroicLevel', 'actorLevel'
]);

const LEVEL_KEYWORDS = new Set(['level', 'classLevel', 'characterLevel', 'heroicLevel', 'actorLevel']);

/**
 * @param {string} keyword - the *ModifierFormula string.
 * @param {object} params
 * @param {number} params.value - the option's selected value (slider value, or 1 for a toggle).
 * @param {number} params.actorLevel - the actor's heroic/character level.
 * @param {(key: string) => number} [params.readContextValue] - resolves a
 *   "context.<key>" keyword's key to a numeric context value; required only
 *   if a context.* keyword is passed.
 * @returns {{ recognized: boolean, staticValue: number, reason: string }}
 */
export function resolveLegacyModifierFormula(keyword, { value = 0, actorLevel = 0, readContextValue = null } = {}) {
  if (typeof keyword !== 'string' || !keyword) {
    return { recognized: false, staticValue: 0, reason: 'Not a string keyword.' };
  }

  if (keyword === 'value') return { recognized: true, staticValue: value, reason: 'value' };
  if (keyword === '-value') return { recognized: true, staticValue: -value, reason: '-value' };
  if (keyword === 'halfLevel') return { recognized: true, staticValue: Math.floor(actorLevel / 2) * value, reason: 'halfLevel' };
  if (keyword === 'halfLevelMinusOne') return { recognized: true, staticValue: Math.max(0, Math.floor(actorLevel / 2) - 1) * value, reason: 'halfLevelMinusOne' };
  if (LEVEL_KEYWORDS.has(keyword)) return { recognized: true, staticValue: actorLevel * value, reason: keyword };

  if (keyword.startsWith('context.')) {
    if (typeof readContextValue !== 'function') {
      return { recognized: false, staticValue: 0, reason: 'context.* keyword requires a readContextValue() resolver.' };
    }
    const key = keyword.slice('context.'.length);
    const contextValue = Number(readContextValue(key) ?? 0);
    if (!Number.isFinite(contextValue)) {
      return { recognized: false, staticValue: 0, reason: `context.${key} did not resolve to a finite number.` };
    }
    return { recognized: true, staticValue: contextValue * value, reason: `context.${key}` };
  }

  return { recognized: false, staticValue: 0, reason: `Unrecognized legacy *ModifierFormula keyword "${keyword}". This is a fail-closed rejection, not a silent 0 — an unknown keyword must never be reinterpreted as a Foundry formula string.` };
}

export default { KNOWN_LEGACY_MODIFIER_FORMULA_KEYWORDS, resolveLegacyModifierFormula };

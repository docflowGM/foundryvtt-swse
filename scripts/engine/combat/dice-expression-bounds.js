/**
 * Exact minimum / maximum of an ordinary damage expression -- a READ-ONLY projection of the formula the damage authority produced
 * (combat-roll-math.js#buildDamageFormula). It owns no rule and rolls nothing.
 *
 * Supported grammar (exactly what buildDamageFormula emits):
 *   expr   := term (('+' | '-') term)*
 *   term   := factor ('*' factor)*
 *   factor := integer | dice | '(' expr ')'
 *   dice   := [N]dM            optionally followed by the reroll mark `rr<n>` / `rr<=n>` (a reroll keeps the achievable range)
 * A product is allowed only when one side is a constant (a weapon / critical multiplier doubles the single roll; two dice expressions
 * multiplied would be a different distribution and are refused). Anything else (variables, "Varies", keep/drop modifiers, @-references,
 * empty or malformed text) yields `null`: the caller must show "Variable / Context Required", never a fabricated range.
 *
 * @param {string} formula
 * @returns {{min:number, max:number, constant:boolean}|null}
 */
export function boundsOfDiceExpression(formula) {
  const src = String(formula ?? '').replace(/\s+/g, '');
  if (!src) return null;
  let i = 0;
  const peek = () => src[i];
  const fail = () => { throw new SyntaxError('unsupported'); };

  const number = () => {
    const m = /^\d+/.exec(src.slice(i));
    if (!m) return null;
    i += m[0].length;
    return Number(m[0]);
  };

  function factor() {
    if (peek() === '(') {
      i += 1;
      const inner = expr();
      if (peek() !== ')') fail();
      i += 1;
      return inner;
    }
    const lead = number();
    if (peek() === 'd' || peek() === 'D') {
      i += 1;
      const sides = number();
      if (!sides || sides < 1) fail();
      const count = lead === null ? 1 : lead;
      if (count < 0) fail();
      // a reroll mark does not change what totals are reachable
      const rr = /^rr(<=)?\d+/.exec(src.slice(i));
      if (rr) i += rr[0].length;
      return { min: count, max: count * sides, constant: false };
    }
    if (lead === null) fail();
    return { min: lead, max: lead, constant: true };
  }

  function term() {
    let acc = factor();
    while (peek() === '*') {
      i += 1;
      const rhs = factor();
      if (!acc.constant && !rhs.constant) fail();
      const products = [acc.min * rhs.min, acc.min * rhs.max, acc.max * rhs.min, acc.max * rhs.max];
      acc = { min: Math.min(...products), max: Math.max(...products), constant: acc.constant && rhs.constant };
    }
    return acc;
  }

  function expr() {
    let acc = term();
    while (peek() === '+' || peek() === '-') {
      const sign = src[i]; i += 1;
      const rhs = term();
      acc = sign === '+'
        ? { min: acc.min + rhs.min, max: acc.max + rhs.max, constant: acc.constant && rhs.constant }
        : { min: acc.min - rhs.max, max: acc.max - rhs.min, constant: acc.constant && rhs.constant };
    }
    return acc;
  }

  try {
    const out = expr();
    if (i !== src.length) return null;
    return { min: out.min, max: out.max, constant: out.constant };
  } catch (_err) {
    return null;
  }
}

export default { boundsOfDiceExpression };

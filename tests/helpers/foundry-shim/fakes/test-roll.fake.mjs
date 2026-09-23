/**
 * TestRoll — a test-only stand-in for Foundry's `Roll` class.
 *
 * This is NOT the real Foundry V13 Roll/DiceTerm implementation and must
 * never be described as one. It exists only because this repo is a
 * Foundry module (not the Foundry application itself), so the real `Roll`
 * class is unavailable under plain Node — the same documented boundary
 * this repo's test harness already accepts for RollEngine/SWSEChat/
 * AmmoSystem (see e.g. tests/stock-droid-damage-math.test.mjs's own
 * "Test 7" precedent).
 *
 * `validate(formula)` reproduces the well-established, versioned Foundry
 * DiceTerm grammar this repo's roll-expression authority targets — dice
 * terms (`NdX`), the keep/drop modifiers (`kh`/`kl`/`dh`/`dl`, count
 * optional), explode (`x`/`xo`), reroll (`r`/`ro`, with an optional
 * comparison+threshold), plain numbers, `+`/`-` combination, and a single
 * level of parenthesization — structurally, not behaviorally: it is a
 * syntax-shape check, sufficient to prove this repo's formula-construction
 * code emits well-formed Foundry-grammar strings, but it is NOT a
 * confirmation that the live Foundry client accepts or executes them
 * identically. `evaluate()` gives each of those same modifiers a
 * best-effort, seed-free simulation (real Math.random() calls, countable
 * for the no-early-randomness regression) so characterization tests can
 * assert totals — again, an approximation for test purposes, not proof of
 * Foundry's own RNG/DiceTerm behavior.
 */

const DIE_MOD = String.raw`(?:kh\d*|kl\d*|dh\d*|dl\d*|xo(?:<=|>=|<|>)?\d*|x(?:<=|>=|<|>)?\d*|ro(?:<=|>=|<|>)?\d*|r(?:<=|>=|<|>)?\d*)`;
const DIE_TERM = String.raw`\d+d\d+(?:${DIE_MOD})*`;
const NUM_TERM = String.raw`\d+(?:\.\d+)?`;
const ATOM = String.raw`(?:\(\s*${DIE_TERM}\s*\)|${DIE_TERM}|${NUM_TERM})`;
const FORMULA_RE = new RegExp(String.raw`^\s*${ATOM}(?:\s*[+\-]\s*${ATOM})*\s*$`, 'i');
const ATOM_SCAN_RE = new RegExp(String.raw`([+\-]?)\s*${ATOM}`, 'gi');
const DIE_TERM_PARSE_RE = new RegExp(String.raw`^(\d+)d(\d+)((?:${DIE_MOD})*)$`, 'i');
const MOD_SCAN_RE = new RegExp(DIE_MOD, 'gi');

export class TestRoll {
  constructor(formula, data = {}) {
    this.formula = String(formula);
    this._data = data;
    this.terms = [];
    this.dice = [];
    this.total = 0;
    this._evaluated = false;
  }

  static validate(formula) {
    if (typeof formula !== 'string' || !formula.trim()) return false;
    return FORMULA_RE.test(formula.trim());
  }

  get evaluated() { return this._evaluated; }

  async evaluate() {
    if (!TestRoll.validate(this.formula)) {
      throw new Error(`TestRoll: "${this.formula}" is not a syntactically valid formula.`);
    }
    let total = 0;
    const dice = [];
    let match;
    ATOM_SCAN_RE.lastIndex = 0;
    while ((match = ATOM_SCAN_RE.exec(this.formula))) {
      const sign = match[1] === '-' ? -1 : 1;
      const atomText = match[0].replace(/^[+\-]\s*/, '').replace(/^\(\s*|\s*\)$/g, '').trim();
      const dieParse = DIE_TERM_PARSE_RE.exec(atomText);
      if (dieParse) {
        const count = Number(dieParse[1]);
        const faces = Number(dieParse[2]);
        const mods = dieParse[3] ?? '';
        const results = [];
        for (let i = 0; i < count; i++) {
          results.push({ result: Math.floor(Math.random() * faces) + 1, active: true });
        }
        this._applyModifiers(results, faces, mods);
        const termTotal = results.filter(r => r.active).reduce((sum, r) => sum + r.result, 0);
        total += sign * termTotal;
        dice.push({ faces, number: count, results });
      } else {
        total += sign * Number(atomText);
      }
    }
    this.total = total;
    this.dice = dice;
    this._evaluated = true;
    return this;
  }

  _applyModifiers(results, faces, modsText) {
    const mods = modsText.match(MOD_SCAN_RE) ?? [];
    for (const mod of mods) {
      const lower = mod.toLowerCase();
      if (lower.startsWith('kh')) {
        const keep = Number(lower.slice(2)) || 1;
        this._keepHighest(results, keep);
      } else if (lower.startsWith('kl')) {
        const keep = Number(lower.slice(2)) || 1;
        this._keepLowest(results, keep);
      } else if (lower.startsWith('dh')) {
        const drop = Number(lower.slice(2)) || 1;
        this._keepLowest(results, Math.max(0, results.length - drop));
      } else if (lower.startsWith('dl')) {
        const drop = Number(lower.slice(2)) || 1;
        this._keepHighest(results, Math.max(0, results.length - drop));
      } else if (lower.startsWith('xo')) {
        this._explode(results, faces, { once: true });
      } else if (lower.startsWith('x')) {
        this._explode(results, faces, { once: false });
      } else if (lower.startsWith('ro')) {
        this._reroll(results, faces, lower.slice(2), { once: true });
      } else if (lower.startsWith('r')) {
        this._reroll(results, faces, lower.slice(1), { once: false });
      }
    }
  }

  _keepHighest(results, keep) {
    const sorted = [...results].sort((a, b) => b.result - a.result);
    const kept = new Set(sorted.slice(0, keep));
    for (const r of results) r.active = kept.has(r);
  }

  _keepLowest(results, keep) {
    const sorted = [...results].sort((a, b) => a.result - b.result);
    const kept = new Set(sorted.slice(0, keep));
    for (const r of results) r.active = kept.has(r);
  }

  _explode(results, faces, { once }) {
    let i = 0;
    let explodedOnce = false;
    while (i < results.length) {
      const r = results[i];
      if (r.active && r.result === faces && (!once || !explodedOnce)) {
        results.push({ result: Math.floor(Math.random() * faces) + 1, active: true });
        if (once) explodedOnce = true;
      }
      i += 1;
    }
  }

  _reroll(results, faces, thresholdText, { once }) {
    const threshold = this._parseThreshold(thresholdText, faces);
    for (const r of results) {
      if (threshold(r.result)) {
        r.result = Math.floor(Math.random() * faces) + 1;
        if (!once && threshold(r.result)) {
          // Unlimited reroll (bare `r`): keep going, bounded to avoid an
          // infinite loop in this test-only simulation.
          let guard = 0;
          while (threshold(r.result) && guard < 50) {
            r.result = Math.floor(Math.random() * faces) + 1;
            guard += 1;
          }
        }
      }
    }
  }

  _parseThreshold(text, faces) {
    if (!text) return value => value === 1; // bare r/ro: no explicit threshold supplied by this repo's callers, default to "reroll a 1" for the test shim only.
    const m = /^(<=|>=|<|>)?(\d+)$/.exec(text);
    if (!m) return () => false;
    const [, cmp, numText] = m;
    const num = Number(numText);
    switch (cmp) {
      case '<=': return value => value <= num;
      case '>=': return value => value >= num;
      case '<': return value => value < num;
      case '>': return value => value > num;
      default: return value => value === num;
    }
  }
}

export default TestRoll;

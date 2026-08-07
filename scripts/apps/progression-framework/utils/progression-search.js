/**
 * progression-search.js — canonical rich search for progression catalogs.
 *
 * Every progression step used to filter its own catalog with a hand-rolled
 * `item.name.toLowerCase().includes(query)` (or, at best, a step-specific
 * ad hoc description check). That let search behavior drift step to step —
 * some searched descriptions, some didn't; none supported anything beyond
 * a plain substring. This module is the ONE implementation every step
 * routes through instead.
 *
 * Two layers, used together:
 *   buildProgressionSearchText(item, extraFields)  — what does this item
 *     say, in searchable normalized text.
 *   compileProgressionSearchQuery(query)           — what is the player
 *     asking for, as a reusable matcher.
 *
 * A step's filter pass compiles the query ONCE, then tests it against every
 * item's search text:
 *
 *   const compiled = compileProgressionSearchQuery(this._searchQuery);
 *   filtered = items.filter(item => compiled.test(buildProgressionSearchText(item)));
 *
 * matchesProgressionSearch() is the single-item convenience wrapper for
 * call sites that only ever check one item (it recompiles the query each
 * call, so prefer the two-layer form above inside a filter loop).
 */

import { normalizeDescriptionCandidate } from '../detail-rail-normalizer.js';

/**
 * Strip HTML/entities from a raw supplemental field. normalizeDescriptionCandidate()
 * already does this for the description/benefit/summary shapes it recognizes;
 * extraFields are step-supplied values (tags, prerequisite text, source
 * names, ...) that may or may not be HTML, so the same light cleanup is
 * applied defensively here.
 * @param {*} value
 * @returns {string}
 */
function stripMarkup(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(stripMarkup).filter(Boolean).join(' ');
  const str = typeof value === 'string' ? value : (typeof value === 'object' ? '' : String(value));
  return str
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Fold diacritics, collapse whitespace, and lowercase. The one normalization
 * every piece of searchable text AND every parsed query term/phrase passes
 * through, so matching is always comparing like to like — including for
 * Boolean/NOT expressions. Diacritic folding must live here, not in a
 * one-sided per-item fallback: NOT only produces a coherent result if the
 * text it's evaluated against and the term it's evaluated for went through
 * the identical normalization. ("Flèche" must match both "fleche" and
 * "NOT fleche" must exclude it — not one but not the other.)
 * @param {string} text
 * @returns {string}
 */
function normalizeWhitespace(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Build normalized, player-facing searchable text for a progression
 * catalog item: name + EVERY description/benefit/summary field it carries
 * (aggregated, not just the first one found — see buildAggregatedDescriptionText())
 * + any narrow supplemental fields the calling step opts into.
 *
 * Deliberately excludes: ids, uuids, sourcebook/internal metadata,
 * execution/mechanics-mode flags, prerequisite *engine* state. A step that
 * wants prerequisite *text* (player-facing, e.g. "Requires: Weapon Focus")
 * passes it explicitly via extraFields — this function never reaches for
 * it on its own.
 *
 * @param {Object} item - A catalog item, or any object with a `name` and/or
 *   description-shaped fields collectDescriptionFieldCandidates() recognizes.
 * @param {Array<*>} [extraFields] - Additional player-facing text this step
 *   wants searchable (tags, short summary, prerequisite line, ...). Each
 *   entry is stringified, HTML-stripped, and folded in.
 * @returns {string} Normalized (lowercase, whitespace-collapsed) text.
 */
/**
 * Every description/benefit/summary-shaped field an item might carry.
 * Unlike extractDescriptionText() (a *display* resolver that intentionally
 * stops at the first usable candidate — description OR benefit, whichever
 * comes first, never both), search must aggregate ALL of them: an item whose
 * description says one thing and whose benefit says another must be
 * searchable by either. Each candidate is normalized independently via
 * normalizeDescriptionCandidate() (shared with the display resolver, so HTML
 * stripping/entity decoding never diverges between the two), then deduped.
 */
function collectDescriptionFieldCandidates(item) {
  return [
    item?.system?.description?.value,
    item?.system?.description?.long,
    item?.system?.description?.short,
    item?.system?.description?.text,
    item?.system?.description?.html,
    item?.system?.description?.plain,
    item?.system?.description,
    item?.system?.benefit?.value,
    item?.system?.benefit,
    item?.system?.details?.description?.value,
    item?.system?.details?.description,
    item?.system?.summary,
    item?.system?.shortSummary,
    item?.description?.value,
    item?.description?.long,
    item?.description?.short,
    item?.description?.text,
    item?.description?.html,
    item?.description?.plain,
    item?.description,
    item?.narrativeDescription,
    item?.fantasy,
    item?.text?.description,
    item?.benefit?.value,
    item?.benefit,
    item?.summary,
    item?.shortSummary,
  ];
}

function buildAggregatedDescriptionText(item) {
  const seen = new Set();
  const parts = [];
  for (const candidate of collectDescriptionFieldCandidates(item)) {
    const normalized = normalizeDescriptionCandidate(candidate);
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      parts.push(normalized);
    }
  }
  return parts.join(' ');
}

export function buildProgressionSearchText(item, extraFields = []) {
  const parts = [
    item?.name,
    buildAggregatedDescriptionText(item),
    ...(Array.isArray(extraFields) ? extraFields : [extraFields]),
  ]
    .map(stripMarkup)
    .filter(Boolean);
  return normalizeWhitespace(parts.join(' '));
}

// ---------------------------------------------------------------------------
// Query grammar
//
//   expr    := orExpr
//   orExpr  := andExpr (OR andExpr)*
//   andExpr := notExpr (AND? notExpr)*      -- AND is optional: implicit AND
//   notExpr := NOT notExpr | atom
//   atom    := '(' expr ')' | phrase | term
//
// Precedence (tightest first): parentheses, NOT, AND, OR — the standard
// search-engine precedence the spec asks for. "stealth OR perception AND
// combat" parses as "stealth OR (perception AND combat)".
// ---------------------------------------------------------------------------

const KEYWORDS = new Set(['and', 'or', 'not']);

/** Escape every regex-significant character except the wildcard markers
 * this function itself is about to translate. Never build a regex from raw
 * user input without this. */
function escapeRegExpLiteral(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Translate a wildcard term (`*` = zero-or-more, `?` = exactly one) into a
 * safe RegExp that matches as a substring of the normalized search text. */
function wildcardToRegExp(term) {
  const pattern = term
    .split(/([*?])/)
    .map(chunk => (chunk === '*' ? '.*' : chunk === '?' ? '.' : escapeRegExpLiteral(chunk)))
    .join('');
  return new RegExp(pattern, 'i');
}

/**
 * Tokenize a raw query string into `{type, value}` tokens:
 * 'lparen' | 'rparen' | 'and' | 'or' | 'not' | 'phrase' | 'term'.
 * An unterminated quote auto-closes at end-of-input rather than throwing —
 * the player is very likely still mid-keystroke.
 */
function tokenize(query) {
  const tokens = [];
  let i = 0;
  const n = query.length;
  while (i < n) {
    const ch = query[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'rparen' }); i++; continue; }
    if (ch === '"') {
      let j = i + 1;
      while (j < n && query[j] !== '"') j++;
      tokens.push({ type: 'phrase', value: query.slice(i + 1, j) });
      i = j < n ? j + 1 : j; // skip closing quote if present; auto-close otherwise
      continue;
    }
    // Plain term: run until whitespace or a paren. Quotes inside a bare
    // term (shouldn't normally happen) just end up part of the term text.
    let j = i;
    while (j < n && !/\s/.test(query[j]) && query[j] !== '(' && query[j] !== ')') j++;
    const raw = query.slice(i, j);
    const lower = raw.toLowerCase();
    if (KEYWORDS.has(lower)) tokens.push({ type: lower });
    else tokens.push({ type: 'term', value: raw });
    i = j;
  }
  return tokens;
}

/** Recursive-descent parser producing a compiled `(text) => boolean` matcher. */
function parseTokens(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const atEnd = () => pos >= tokens.length;

  function parseAtom() {
    const tok = peek();
    if (!tok) throw new Error('unexpected end of query');
    if (tok.type === 'lparen') {
      pos++;
      const inner = parseOr();
      if (!peek() || peek().type !== 'rparen') throw new Error('unbalanced parentheses');
      pos++;
      return inner;
    }
    if (tok.type === 'phrase') {
      pos++;
      const phrase = normalizeWhitespace(tok.value);
      if (!phrase) return () => true; // empty quotes match everything, harmless
      return (text) => text.includes(phrase);
    }
    if (tok.type === 'term') {
      pos++;
      const term = normalizeWhitespace(tok.value);
      if (!term) return () => true;
      if (term.includes('*') || term.includes('?')) {
        const re = wildcardToRegExp(term);
        return (text) => re.test(text);
      }
      return (text) => text.includes(term);
    }
    throw new Error(`unexpected token: ${tok.type}`);
  }

  function parseNot() {
    if (peek()?.type === 'not') {
      pos++;
      const operand = parseNot();
      return (text) => !operand(text);
    }
    return parseAtom();
  }

  function parseAnd() {
    let left = parseNot();
    while (!atEnd() && peek().type !== 'or' && peek().type !== 'rparen') {
      if (peek().type === 'and') pos++; // explicit AND is optional (implicit AND)
      // A NOT/term/phrase/lparen starts the next operand; anything else
      // (a stray rparen/or already excluded above) means we're done here.
      if (atEnd() || peek().type === 'or' || peek().type === 'rparen') break;
      const right = parseNot();
      const prevLeft = left;
      left = (text) => prevLeft(text) && right(text);
    }
    return left;
  }

  function parseOr() {
    let left = parseAnd();
    while (!atEnd() && peek().type === 'or') {
      pos++;
      const right = parseAnd();
      const prevLeft = left;
      left = (text) => prevLeft(text) || right(text);
    }
    return left;
  }

  const matcher = parseOr();
  if (!atEnd()) throw new Error(`unexpected trailing token: ${peek().type}`);
  return matcher;
}

/**
 * Compile a raw player query into a reusable matcher: `{ test(text) }`.
 * `text` must already be normalized (see buildProgressionSearchText()).
 *
 * Never throws. A query that cannot be parsed as the Boolean/wildcard
 * grammar — unbalanced parens, a dangling operator, mid-typing input like
 * `stealth AND` — safely falls back to a plain literal substring match of
 * the (lightly normalized) raw query, so the UI never breaks while the
 * player is still typing.
 *
 * @param {string} query
 * @returns {{ test(text: string): boolean, isFallback: boolean }}
 */
export function compileProgressionSearchQuery(query) {
  const raw = String(query ?? '');
  const normalizedRaw = normalizeWhitespace(raw);
  if (!normalizedRaw) return { test: () => true, isFallback: false };

  try {
    const tokens = tokenize(raw);
    if (!tokens.length) return { test: () => true, isFallback: false };
    const matcher = parseTokens(tokens);
    return { test: (text) => matcher(String(text || '')), isFallback: false };
  } catch (_err) {
    // Safe fallback: treat the whole query as a literal substring. Strip the
    // characters the grammar gives meaning to so e.g. `stealth AND (` degrades
    // to searching for "stealth and" rather than carrying a stray "(" that
    // can never match anything.
    const literal = normalizedRaw.replace(/[()"]/g, ' ').replace(/\s+/g, ' ').trim();
    return { test: (text) => (literal ? String(text || '').includes(literal) : true), isFallback: true };
  }
}

/**
 * Convenience one-shot matcher for a single item. Recompiles the query on
 * every call — fine for occasional checks, but a filter loop over many
 * items should compile once with compileProgressionSearchQuery() and reuse
 * it against buildProgressionSearchText() per item instead.
 * @param {Object} item
 * @param {string} query
 * @param {{extraFields?: Array<*>}} [options]
 * @returns {boolean}
 */
export function matchesProgressionSearch(item, query, { extraFields = [] } = {}) {
  const compiled = compileProgressionSearchQuery(query);
  return compiled.test(buildProgressionSearchText(item, extraFields));
}

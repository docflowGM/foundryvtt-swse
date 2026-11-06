/**
 * Shared, pure helpers for the droid strict authority guards
 * (check-droid-calculation-mode-authority.mjs, check-droid-reconciliation-authority.mjs).
 *
 * A mutating droid service (convertToPlayableDerived, applyReconciliation,
 * rollbackReconciliation) may be invoked only from an EXPLICIT user action.
 * "Explicit" is verified structurally rather than by trusting a whole file:
 *
 *   1. the call sits inside a named, approved handler METHOD of the approved
 *      sheet file (never in prepare/render/context code);
 *   2. that method contains a confirmation dialog (`.confirm(`) BEFORE the call;
 *   3. the handler is reached only from a delegated click listener keyed on a
 *      `[data-action='...']` button (a user click), in the approved dispatch
 *      file, and nowhere else.
 *
 * No file or directory is exempted wholesale. Pure functions over source text.
 */

const METHOD_HEADER = /^[ \t]+(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{[ \t]*$/gm;
const NOT_METHODS = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return']);

/** Blank out comments (same length, so offsets are preserved). */
export function stripComments(source) {
  const blank = text => text.replace(/[^\n]/g, ' ');
  return source
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[ \t;{}()])\/\/[^\n]*/g, (m, lead) => lead + blank(m.slice(lead.length)));
}

/** Index of the brace that closes the `{` at `open` (naive but balanced for template literals). */
function matchingBrace(source, open) {
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}

/** Every class/object method in `source`: { name, start, bodyStart, end }. */
export function listMethods(source) {
  const methods = [];
  METHOD_HEADER.lastIndex = 0;
  let m;
  while ((m = METHOD_HEADER.exec(source))) {
    if (NOT_METHODS.has(m[1])) continue;
    const bodyStart = m.index + m[0].lastIndexOf('{');
    const end = matchingBrace(source, bodyStart);
    if (end > bodyStart) methods.push({ name: m[1], start: m.index, bodyStart, end });
  }
  return methods;
}

/** The innermost method containing `index`, or null. */
export function enclosingMethod(source, index) {
  let best = null;
  for (const method of listMethods(source)) {
    if (index > method.bodyStart && index < method.end && (!best || method.start > best.start)) best = method;
  }
  return best;
}

function callIndices(source, name) {
  const pattern = new RegExp(`(?<![\\w$])${name}\\s*\\(`, 'g');
  const out = [];
  let m;
  while ((m = pattern.exec(source))) out.push(m.index);
  return out;
}

/**
 * Validate the service calls inside the approved SHEET file.
 * @param {string} source             text of the approved sheet file
 * @param {{callNames:string[], approvedMethods:string[]}} rules
 * @returns {{ok:boolean, problems:string[]}}
 */
export function checkApprovedHandlerCalls(rawSource, { callNames, approvedMethods }) {
  const source = stripComments(rawSource);
  const problems = [];
  for (const name of callNames) {
    for (const index of callIndices(source, name)) {
      const method = enclosingMethod(source, index);
      if (!method || !approvedMethods.includes(method.name)) {
        problems.push(`${name}() is called in ${method ? `method "${method.name}"` : 'no method'}, not in an approved handler (${approvedMethods.join(', ')})`);
        continue;
      }
      const before = source.slice(method.bodyStart, index);
      if (!/\.confirm\s*\(/.test(before)) {
        problems.push(`${name}() in "${method.name}" is not preceded by a confirmation dialog`);
      }
    }
  }
  return { ok: problems.length === 0, problems };
}

/**
 * Validate how the approved handlers are REACHED: only from the delegated
 * click dispatch, immediately under a `closest("[data-action='...']")` test.
 * @param {string} source  text of a candidate dispatch file
 * @param {string[]} handlerNames
 */
export function checkHandlerDispatch(rawSource, handlerNames) {
  const source = stripComments(rawSource);
  const problems = [];
  for (const name of handlerNames) {
    const pattern = new RegExp(`this\\.${name}\\s*\\(`, 'g');
    let m;
    while ((m = pattern.exec(source))) {
      const window = source.slice(Math.max(0, m.index - 260), m.index);
      const method = enclosingMethod(source, m.index);
      const keyedOnClick = /closest\(\s*["']\[data-action=/.test(window);
      const inListener = /addEventListener\(\s*["']click["']/.test(source.slice(0, m.index));
      if (!keyedOnClick || !inListener) {
        problems.push(`this.${name}() is not reached through a click-delegated data-action button${method ? ` (in "${method.name}")` : ''}`);
      }
      if (method && /^(?:_?prepare|_?on_?render|getData|_?build.*context)/i.test(method.name) && !keyedOnClick) {
        problems.push(`this.${name}() is invoked from preparation/render code ("${method.name}")`);
      }
    }
  }
  return { ok: problems.length === 0, problems };
}

/**
 * Any call to `callNames` in a file that is NOT the approved sheet or the
 * service's own definition site is a violation (preparation, context
 * builders, engines, other sheets...).
 */
export function hasServiceCall(source, callNames) {
  const code = stripComments(source);
  return callNames.some(name => callIndices(code, name).length > 0);
}

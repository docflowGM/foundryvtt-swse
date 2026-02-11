// scripts/utils/dom-query-shim.js
/**
 * Minimal jQuery-like wrapper used only for legacy Dialog callback compatibility.
 *
 * This is NOT jQuery. It provides a tiny subset of APIs commonly used in old callbacks:
 * - find(selector)
 * - each(fn)
 * - val([value])
 * - text([value])
 * - prop(name[, value])
 * - attr(name[, value])
 * - data(key[, value])
 *
 * The wrapper is intentionally small and DOM-backed.
 */

function asElements(value) {
  if (!value) return [];
  if (value instanceof Element) return [value];
  if (value instanceof NodeList || Array.isArray(value)) return Array.from(value);
  return [];
}

class DomQueryList {
  constructor(elements) {
    this._els = asElements(elements);
    this.length = this._els.length;
    for (let i = 0; i < this._els.length; i++) this[i] = this._els[i];
  }

  each(fn) {
    this._els.forEach((el, i) => fn.call(el, i, el));
    return this;
  }

  find(selector) {
    const results = [];
    for (const el of this._els) results.push(...el.querySelectorAll(selector));
    return new DomQueryList(results);
  }

  closest(selector) {
    const results = this._els.map(el => el.closest(selector)).filter(Boolean);
    return new DomQueryList(results);
  }

  val(value) {
    if (value === undefined) {
      const el = this._els[0];
      if (!el) return undefined;
      // Inputs, selects, textareas
      if ('value' in el) return el.value;
      return el.getAttribute('value');
    }
    this._els.forEach(el => {
      if ('value' in el) el.value = value;
      else el.setAttribute('value', String(value));
    });
    return this;
  }

  text(value) {
    if (value === undefined) return this._els[0]?.textContent ?? '';
    this._els.forEach(el => { el.textContent = String(value); });
    return this;
  }

  prop(name, value) {
    if (!name) return undefined;
    if (value === undefined) return this._els[0]?.[name];
    this._els.forEach(el => { el[name] = value; });
    return this;
  }

  attr(name, value) {
    if (!name) return undefined;
    if (value === undefined) return this._els[0]?.getAttribute(name);
    this._els.forEach(el => el.setAttribute(name, String(value)));
    return this;
  }

  data(key, value) {
    if (!key) return undefined;
    if (value === undefined) return this._els[0]?.dataset?.[key];
    this._els.forEach(el => { if (el.dataset) el.dataset[key] = String(value); });
    return this;
  }
}

export function domQuery(root) {
  return new DomQueryList(root instanceof Element ? [root] : root);
}

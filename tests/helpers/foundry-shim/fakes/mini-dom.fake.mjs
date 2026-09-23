/**
 * Mini DOM — a tiny, self-contained HTMLElement/document stand-in for
 * chat-surface-enhancer.js's test suite (no jsdom dependency in this repo).
 *
 * Implements only what that module's plain-chat upgrade path actually
 * touches: element construction, a real (if small) HTML parser for
 * innerHTML get/set, classList, a dataset proxy that mirrors `data-*`
 * attributes with camelCase<->kebab-case conversion, and querySelector(All)/
 * matches() supporting the selector shapes chat-surface-enhancer.js
 * actually uses against this path — a comma-separated list of single atoms
 * (`.class`, `[attr]`, or a bare tag name). It deliberately does NOT support
 * combinators (descendant/child/`:scope`) or compound selectors
 * (`.class[attr]`) — chat-surface-enhancer.js's dialogue/OOC upgrade path
 * never needs them; a selector that does would need this helper extended,
 * not silently mismatched.
 */

const VOID_TAGS = new Set(['br', 'img', 'hr', 'input', 'meta', 'link']);

function escapeText(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(value) {
  return escapeText(value).replace(/"/g, '&quot;');
}

function camelToKebab(prop) {
  return String(prop).replace(/[A-Z]/g, m => `-${m.toLowerCase()}`);
}

function kebabToCamel(name) {
  return String(name).replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

class FakeTextNode {
  constructor(text) {
    this.nodeType = 3;
    this.text = text;
  }
  get textContent() { return this.text; }
}

function matchesSimpleSelector(el, selector) {
  const sel = selector.trim();
  if (!sel) return false;
  if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
  if (sel.startsWith('[')) return el.hasAttribute(sel.slice(1, -1));
  return el.tagName?.toLowerCase() === sel.toLowerCase();
}

function elementMatches(el, selectorList) {
  return String(selectorList).split(',').some(part => matchesSimpleSelector(el, part));
}

export class FakeElement {
  constructor(tagName = 'div') {
    this.nodeType = 1;
    this.tagName = String(tagName).toUpperCase();
    this._attrs = new Map();
    this._classes = new Set();
    this.childNodes = [];
    this.parentElement = null;
    this._listeners = new Map();
    this.clientWidth = 800;

    const self = this;
    this.classList = {
      add(...names) { for (const n of names) self._classes.add(n); },
      remove(...names) { for (const n of names) self._classes.delete(n); },
      contains(n) { return self._classes.has(n); },
      toString() { return [...self._classes].join(' '); }
    };

    this.dataset = new Proxy({}, {
      get(_, prop) { return self._attrs.get(`data-${camelToKebab(prop)}`); },
      set(_, prop, value) { self._attrs.set(`data-${camelToKebab(prop)}`, String(value)); return true; },
      has(_, prop) { return self._attrs.has(`data-${camelToKebab(prop)}`); },
      deleteProperty(_, prop) { return self._attrs.delete(`data-${camelToKebab(prop)}`); },
      ownKeys() { return [...self._attrs.keys()].filter(k => k.startsWith('data-')).map(k => kebabToCamel(k.slice(5))); },
      getOwnPropertyDescriptor() { return { enumerable: true, configurable: true }; }
    });
  }

  get children() { return this.childNodes.filter(n => n.nodeType === 1); }

  getAttribute(name) {
    if (name === 'class') return this._classes.size ? [...this._classes].join(' ') : null;
    return this._attrs.has(name) ? this._attrs.get(name) : null;
  }

  setAttribute(name, value) {
    if (name === 'class') { this._classes = new Set(String(value).trim().split(/\s+/).filter(Boolean)); return; }
    this._attrs.set(name, String(value));
  }

  hasAttribute(name) {
    if (name === 'class') return this._classes.size > 0;
    return this._attrs.has(name);
  }

  removeAttribute(name) {
    if (name === 'class') { this._classes.clear(); return; }
    this._attrs.delete(name);
  }

  matches(selectorList) { return elementMatches(this, selectorList); }

  querySelectorAll(selectorList) {
    const out = [];
    const walk = node => {
      for (const child of node.childNodes) {
        if (child.nodeType === 1) {
          if (elementMatches(child, selectorList)) out.push(child);
          walk(child);
        }
      }
    };
    walk(this);
    return out;
  }

  querySelector(selectorList) {
    return this.querySelectorAll(selectorList)[0] ?? null;
  }

  closest(selectorList) {
    let node = this;
    while (node) {
      if (node.nodeType === 1 && elementMatches(node, selectorList)) return node;
      node = node.parentElement;
    }
    return null;
  }

  get textContent() {
    let out = '';
    const walk = node => {
      for (const child of node.childNodes) {
        if (child.nodeType === 3) out += child.text;
        else if (child.nodeType === 1) walk(child);
      }
    };
    walk(this);
    return out;
  }

  set textContent(value) {
    this.childNodes = [new FakeTextNode(String(value ?? ''))];
  }

  get innerHTML() {
    return this.childNodes.map(serializeNode).join('');
  }

  set innerHTML(html) {
    const nodes = parseHTML(String(html ?? ''));
    for (const n of nodes) if (n.nodeType === 1) n.parentElement = this;
    this.childNodes = nodes;
  }

  insertAdjacentHTML(position, html) {
    const nodes = parseHTML(String(html ?? ''));
    if (position === 'afterbegin') {
      for (const n of nodes) if (n.nodeType === 1) n.parentElement = this;
      this.childNodes = [...nodes, ...this.childNodes];
    } else if (position === 'beforeend') {
      for (const n of nodes) if (n.nodeType === 1) n.parentElement = this;
      this.childNodes = [...this.childNodes, ...nodes];
    } else if (position === 'afterend' && this.parentElement) {
      for (const n of nodes) if (n.nodeType === 1) n.parentElement = this.parentElement;
      const idx = this.parentElement.childNodes.indexOf(this);
      this.parentElement.childNodes.splice(idx + 1, 0, ...nodes);
    } else if (position === 'beforebegin' && this.parentElement) {
      for (const n of nodes) if (n.nodeType === 1) n.parentElement = this.parentElement;
      const idx = this.parentElement.childNodes.indexOf(this);
      this.parentElement.childNodes.splice(idx, 0, ...nodes);
    }
  }

  addEventListener(type, handler) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(handler);
  }

  removeEventListener() {}

  getBoundingClientRect() { return { width: this.clientWidth, height: 40, top: 0, left: 0 }; }
}

function serializeNode(node) {
  if (node.nodeType === 3) return escapeText(node.text);
  const classAttr = node._classes.size ? [`class="${escapeAttr([...node._classes].join(' '))}"`] : [];
  const otherAttrs = [...node._attrs.entries()].map(([k, v]) => `${k}="${escapeAttr(v)}"`);
  const attrs = [...classAttr, ...otherAttrs].map(a => ` ${a}`).join('');
  const tag = node.tagName.toLowerCase();
  if (VOID_TAGS.has(tag)) return `<${tag}${attrs}>`;
  const inner = node.childNodes.map(serializeNode).join('');
  return `<${tag}${attrs}>${inner}</${tag}>`;
}

const TAG_RE = /^<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

function parseAttrs(raw, el) {
  ATTR_RE.lastIndex = 0;
  let m;
  while ((m = ATTR_RE.exec(raw))) {
    const name = m[1];
    const value = m[2] ?? m[3] ?? m[4] ?? '';
    el.setAttribute(name, value);
  }
}

/** Parses a well-formed HTML fragment (as produced by this codebase's own
 * template strings) into an array of FakeElement/FakeTextNode nodes. Not a
 * general-purpose HTML parser: no comments, no CDATA, no `<script>`
 * special-casing, no implicit tag closing. */
export function parseHTML(html) {
  let i = 0;
  const len = html.length;

  function parseNodes() {
    const nodes = [];
    while (i < len) {
      if (html.startsWith('</', i)) {
        const end = html.indexOf('>', i);
        i = end === -1 ? len : end + 1;
        return nodes;
      }
      if (html[i] === '<') {
        const rest = html.slice(i);
        const tagMatch = TAG_RE.exec(rest);
        if (!tagMatch) {
          const nextTag = html.indexOf('<', i + 1);
          const text = html.slice(i, nextTag === -1 ? len : nextTag);
          if (text) nodes.push(new FakeTextNode(text));
          i = nextTag === -1 ? len : nextTag;
          continue;
        }
        const [full, tagName, attrsRaw, selfClose] = tagMatch;
        i += full.length;
        const el = new FakeElement(tagName);
        parseAttrs(attrsRaw, el);
        if (!selfClose && !VOID_TAGS.has(tagName.toLowerCase())) {
          const children = parseNodes();
          for (const c of children) if (c.nodeType === 1) c.parentElement = el;
          el.childNodes = children;
        }
        nodes.push(el);
        continue;
      }
      const nextTag = html.indexOf('<', i);
      const text = html.slice(i, nextTag === -1 ? len : nextTag);
      if (text) nodes.push(new FakeTextNode(text));
      i = nextTag === -1 ? len : nextTag;
    }
    return nodes;
  }

  return parseNodes();
}

export function createFakeDocument() {
  return { createElement: tag => new FakeElement(tag) };
}

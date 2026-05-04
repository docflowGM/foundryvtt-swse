/**
 * SWSE Ability Keyword Highlighter
 *
 * Controlled SWSE-owned surface pass for ability-name recognition.
 * This is presentation only: it does not create a new ability system, mutate data,
 * or replace template-level semantic classes. Templates should still emit explicit
 * ability classes where they know the ability key; this pass catches plain prose
 * in tooltips, details rails, chat cards, and secondary surfaces.
 */

const ABILITY_WORDS = {
  Strength: 'str',
  Dexterity: 'dex',
  Constitution: 'con',
  Intelligence: 'int',
  Wisdom: 'wis',
  Charisma: 'cha'
};

const SURFACE_SELECTOR = [
  '.swse-sheet-v2-shell',
  '.sheet-shell',
  '.swse-datapad',
  '.swse-ui-shell',
  '.progression-shell',
  '.swse-prog-v2-shell',
  '.swse-chat-card',
  '.swse-roll-card',
  '.swse-damage-log',
  '.swse-discovery-tooltip',
  '.application.swse',
  '.app.swse',
  '.chat-message .swse'
].join(',');

const SKIP_SELECTOR = [
  '.swse-keyword-nohighlight',
  '.swse-ability-keyword',
  '[contenteditable="true"]',
  'script',
  'style',
  'noscript',
  'svg',
  'canvas',
  'input',
  'textarea',
  'select',
  'option'
].join(',');

const WORD_RE = /\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\b/g;

let observer = null;
let scheduled = false;

function getAbilityKey(word) {
  return ABILITY_WORDS[word] || '';
}

function shouldSkipTextNode(node) {
  if (!node?.nodeValue || !WORD_RE.test(node.nodeValue)) {
    WORD_RE.lastIndex = 0;
    return true;
  }
  WORD_RE.lastIndex = 0;

  const parent = node.parentElement;
  if (!parent) return true;
  if (parent.closest(SKIP_SELECTOR)) return true;
  if (!parent.closest(SURFACE_SELECTOR)) return true;
  return false;
}

function highlightTextNode(node) {
  const text = node.nodeValue;
  WORD_RE.lastIndex = 0;
  if (!WORD_RE.test(text)) return;
  WORD_RE.lastIndex = 0;

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let match;

  while ((match = WORD_RE.exec(text)) !== null) {
    const [word] = match;
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const span = document.createElement('span');
    const abilityKey = getAbilityKey(word);
    span.className = `swse-ability-keyword swse-ability-keyword--${abilityKey}`;
    span.dataset.ability = abilityKey;
    span.textContent = word;
    fragment.appendChild(span);
    lastIndex = match.index + word.length;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  node.parentNode?.replaceChild(fragment, node);
}

function scanSurface(root) {
  if (!(root instanceof HTMLElement)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return shouldSkipTextNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) highlightTextNode(node);
}

function scanAll() {
  scheduled = false;
  document.querySelectorAll(SURFACE_SELECTOR).forEach(scanSurface);
}

function scheduleScan() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(scanAll);
}

export class AbilityKeywordHighlighter {
  static init() {
    if (observer) return;
    const start = () => {
      if (observer) return;
      scheduleScan();
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length) {
            scheduleScan();
            return;
          }
        }
      });
      if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    };

    if (globalThis.game?.ready) start();
    else Hooks.once('ready', start);
  }

  static refresh(root = null) {
    if (root instanceof HTMLElement) {
      scanSurface(root);
      return;
    }
    scheduleScan();
  }
}

export default AbilityKeywordHighlighter;

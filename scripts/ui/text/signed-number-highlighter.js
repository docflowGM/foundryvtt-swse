/**
 * SignedNumberHighlighter
 *
 * Scoped enhancer for floating math values in SWSE-owned surfaces.
 * Positive values are green, zero values amber, negative values red.
 * This is intentionally separate from ability colors.
 */

const SIGNED_NUMBER_REGEX = /(^|[\s(:\[,])([+-](?:\d+)(?:\.\d+)?|0)(?=$|[\s),.\];:])/g;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'BUTTON', 'CODE', 'PRE']);
const SKIP_SELECTOR = '[data-swse-signed-enhanced], .swse-signed-number, .swse-ability-word, [data-swse-no-enhance]';

function numberClass(value) {
  const numeric = Number(value);
  if (numeric > 0) return 'swse-signed-number--positive';
  if (numeric < 0) return 'swse-signed-number--negative';
  return 'swse-signed-number--neutral';
}

function shouldSkipTextNode(node) {
  const parent = node?.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.closest(SKIP_SELECTOR)) return true;
  SIGNED_NUMBER_REGEX.lastIndex = 0;
  return !SIGNED_NUMBER_REGEX.test(node.nodeValue || '');
}

function makeSpan(value) {
  const numeric = Number(value);
  const span = document.createElement('span');
  span.className = `swse-signed-number ${numberClass(value)}`;
  span.dataset.sign = numeric > 0 ? 'positive' : numeric < 0 ? 'negative' : 'neutral';
  span.textContent = value;
  return span;
}

function enhanceTextNode(node) {
  const text = node.nodeValue || '';
  SIGNED_NUMBER_REGEX.lastIndex = 0;
  let match;
  let lastIndex = 0;
  const fragment = document.createDocumentFragment();

  while ((match = SIGNED_NUMBER_REGEX.exec(text))) {
    const prefix = match[1] || '';
    const value = match[2];
    const start = match.index;
    const valueStart = start + prefix.length;

    if (valueStart > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, valueStart)));
    }
    fragment.appendChild(makeSpan(value));
    lastIndex = valueStart + value.length;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  node.parentNode.replaceChild(fragment, node);
}

export const SignedNumberHighlighter = {
  enhance(root) {
    if (!(root instanceof HTMLElement)) return;
    if (root.dataset?.swseSignedEnhanced === 'true') return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return shouldSkipTextNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) enhanceTextNode(node);

    root.dataset.swseSignedEnhanced = 'true';
  }
};

export default SignedNumberHighlighter;

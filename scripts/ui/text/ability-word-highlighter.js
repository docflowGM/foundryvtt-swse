/**
 * AbilityWordHighlighter
 *
 * Scoped, idempotent SWSE text enhancer for ability names and abbreviations.
 * It never scans the whole DOM; callers provide a SWSE-owned root such as a
 * chat card, datapad surface, sheet body, or progression surface.
 */

const ABILITY_META = {
  strength: { key: 'strength', short: 'str', label: 'Strength', tooltip: 'Strength' },
  str: { key: 'strength', short: 'str', label: 'Str', tooltip: 'Strength' },
  dexterity: { key: 'dexterity', short: 'dex', label: 'Dexterity', tooltip: 'Dexterity' },
  dex: { key: 'dexterity', short: 'dex', label: 'Dex', tooltip: 'Dexterity' },
  constitution: { key: 'constitution', short: 'con', label: 'Constitution', tooltip: 'Constitution' },
  con: { key: 'constitution', short: 'con', label: 'Con', tooltip: 'Constitution' },
  intelligence: { key: 'intelligence', short: 'int', label: 'Intelligence', tooltip: 'Intelligence' },
  int: { key: 'intelligence', short: 'int', label: 'Int', tooltip: 'Intelligence' },
  wisdom: { key: 'wisdom', short: 'wis', label: 'Wisdom', tooltip: 'Wisdom' },
  wis: { key: 'wisdom', short: 'wis', label: 'Wis', tooltip: 'Wisdom' },
  charisma: { key: 'charisma', short: 'cha', label: 'Charisma', tooltip: 'Charisma' },
  cha: { key: 'charisma', short: 'cha', label: 'Cha', tooltip: 'Charisma' }
};

const ABILITY_REGEX = /\b(Strength|Str|Dexterity|Dex|Constitution|Con|Intelligence|Int|Wisdom|Wis|Charisma|Cha)\b/g;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'BUTTON', 'CODE', 'PRE']);
const SKIP_SELECTOR = '[data-swse-ability-enhanced], .swse-ability-word, .swse-signed-number, [data-swse-no-enhance]';

function shouldSkipTextNode(node) {
  const parent = node?.parentElement;
  if (!parent) return true;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.closest(SKIP_SELECTOR)) return true;
  ABILITY_REGEX.lastIndex = 0;
  return !ABILITY_REGEX.test(node.nodeValue || '');
}

function makeAbilitySpan(text) {
  const meta = ABILITY_META[text.toLowerCase()];
  if (!meta) return document.createTextNode(text);

  const span = document.createElement('span');
  span.className = `swse-ability-word swse-ability--${meta.key}`;
  span.dataset.ability = meta.key;
  span.dataset.abilityShort = meta.short;
  span.dataset.swseTooltip = meta.tooltip;
  span.textContent = text;
  return span;
}

function enhanceTextNode(node) {
  const text = node.nodeValue || '';
  ABILITY_REGEX.lastIndex = 0;
  let match;
  let lastIndex = 0;
  const fragment = document.createDocumentFragment();

  while ((match = ABILITY_REGEX.exec(text))) {
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    fragment.appendChild(makeAbilitySpan(match[0]));
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  node.parentNode.replaceChild(fragment, node);
}

export const AbilityWordHighlighter = {
  enhance(root) {
    if (!(root instanceof HTMLElement)) return;
    if (root.dataset?.swseAbilityEnhanced === 'true') return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return shouldSkipTextNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) enhanceTextNode(node);

    root.dataset.swseAbilityEnhanced = 'true';
  },

  meta: ABILITY_META
};

export default AbilityWordHighlighter;

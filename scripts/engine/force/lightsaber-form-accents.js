// Central visual classification for Lightsaber Form Powers.
// Keep Force picker rows and Force Suite cards using the same form accent keys.

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const FORM_PATTERNS = Object.freeze([
  ['shii-cho', [/\bshii\s*cho\b/, /\bform\s*i\b/, /\bdisarming\s+slash\b/, /\bsarlacc\s+sweep\b/]],
  ['makashi', [/\bmakashi\b/, /\bform\s*ii\b/, /\bcontentious\s+opportunity\b/, /\bmakashi\s+riposte\b/]],
  ['soresu', [/\bsoresu\b/, /\bform\s*iii\b/, /\bcircle\s+of\s+shelter\b/, /\bdeflecting\s+slash\b/]],
  ['ataru', [/\bataru\b/, /\bform\s*iv\b/, /\bhawk\s*bat\s+swoop\b/, /\bsaber\s+swarm\b/]],
  ['shien', [/\bshien\b/, /\bbarrier\s+of\s+blades\b/, /\bshien\s+deflection\b/]],
  ['djem-so', [/\bdjem\s+so\b/, /\bfalling\s+avalanche\b/, /\bfluid\s+riposte\b/]],
  ['niman', [/\bniman\b/, /\bform\s*vi\b/, /\bdraw\s+closer\b/, /\bpushing\s+slash\b/]],
  ['juyo', [/\bjuyo\b/, /\bform\s*vii\b/, /\bassured\s+strike\b/, /\bvornskrs\s+ferocity\b/]],
  ['vaapad', [/\bvaapad\b/, /\bswift\s+flank\b/, /\btempered\s+aggression\b/]],
  ['jarkai', [/\bjar\s*kai\b/, /\btwin\s+strike\b/, /\brising\s+whirlwind\b/]],
  ['trakata', [/\btrakata\b/, /\bpass\s+the\s+blade\b/, /\bunbalancing\s+block\b/]],
  ['sokan', [/\bsokan\b/, /\bhigh\s+ground\s+defense\b/, /\bunhindered\s+charge\b/]],
]);

export function getLightsaberFormAccentKey(...values) {
  const text = normalizeText(values.flat(Infinity).filter(Boolean).join(' '));
  if (!text) return '';
  for (const [key, patterns] of FORM_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(text))) return key;
  }
  return '';
}

export function getLightsaberFormAccentClass(prefix, ...values) {
  const key = getLightsaberFormAccentKey(...values);
  return key ? `${prefix}-${key}` : '';
}

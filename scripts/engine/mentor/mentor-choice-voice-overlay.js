/**
 * MentorChoiceVoiceOverlay
 *
 * Applies mentor voice/style to an already-composed mechanical choice line.
 *
 * Boundary rule:
 * - SuggestionService / SuggestionReasonEngine / class-domain reasons decide the
 *   mechanical truth.
 * - This overlay only shapes delivery: prefix, cadence, brevity, and mild idiom.
 * - It must not decide whether a choice is good, bad, legal, routed, or optimal.
 */

const VOICE_STYLE_ALIASES = {
  jedi: ['miraj', 'sela', 'kyber', 'jedi', 'force'],
  tactical: ['breach', 'korr', 'theron', 'soldier', 'mandalorian'],
  protocol: ['j0', 'j0n1', 'j0-n1', 'axiom', 'delta', 'protocol', 'droid'],
  rogue: ['ol-salty', 'ol-salty', 'salty', 'scoundrel', 'rax', 'rogue', 'pirate'],
  field: ['lead', 'captain', 'scout', 'pathfinder'],
  noble: ['noble', 'vera', 'dezmin', 'tio', 'hutt', 'pegar'],
  sith: ['malbada', 'miedo', 'sith', 'darth'],
  mystical: ['force-adept', 'force-disciple', 'anchorite', 'venn', 'mayu', 'seraphim'],
};

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’'`.]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function compactText(...parts) {
  return parts
    .map(part => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentenceCase(text) {
  const value = String(text || '').trim();
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function ensureSentence(text) {
  const value = sentenceCase(String(text || '').trim());
  if (!value) return '';
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function includesAny(value, needles = []) {
  const text = normalizeKey(value);
  return needles.some(needle => text.includes(normalizeKey(needle)));
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function mentorToken({ mentorId, mentorName, mentor } = {}) {
  const traits = Array.isArray(mentor?.traits) ? mentor.traits.join(' ') : '';
  const voiceProfile = firstString(mentor?.voiceProfile, mentor?.voice_profile, mentor?.voiceStyle, mentor?.style, mentor?.tone);
  return normalizeKey(compactText(
    mentorId,
    mentorName,
    mentor?.id,
    mentor?.mentorId,
    mentor?.mentor_id,
    mentor?.name,
    mentor?.className,
    mentor?.archetype,
    voiceProfile,
    traits
  ));
}

function resolveStyle(options = {}) {
  const token = mentorToken(options);
  if (!token) return 'neutral';
  for (const [style, aliases] of Object.entries(VOICE_STYLE_ALIASES)) {
    if (aliases.some(alias => includesAny(token, [alias]))) return style;
  }
  return 'neutral';
}

function alreadyStyled(line) {
  const lower = String(line || '').trim().toLowerCase();
  return lower.startsWith('assessment:')
    || lower.startsWith('tactical read:')
    || lower.startsWith('field read:')
    || lower.startsWith('fair warning:')
    || lower.startsWith('court read:')
    || lower.startsWith('power read:')
    || lower.startsWith('read the current:');
}

function isCautionLine(line, tone = '') {
  const lower = String(line || '').toLowerCase();
  return tone === 'cautionary'
    || lower.includes('but ')
    || lower.includes('caution')
    || lower.includes('not ready')
    || lower.includes('remaining gates')
    || lower.includes('detour')
    || lower.includes('lateral')
    || lower.includes('shifts emphasis');
}

function prefixFor(style, line, { tone = '', action = null } = {}) {
  if (alreadyStyled(line)) return '';
  const caution = isCautionLine(line, tone);

  switch (style) {
    case 'protocol':
      return 'Assessment:';
    case 'tactical':
      return 'Tactical read:';
    case 'field':
      return 'Field read:';
    case 'rogue':
      return caution ? 'Fair warning:' : (action === 'commit' ? 'Mark it:' : 'Read the table:');
    case 'noble':
      return caution ? 'Advisory note:' : 'Court read:';
    case 'sith':
      return caution ? 'Power has a price:' : 'Power read:';
    case 'mystical':
      return 'Read the current:';
    case 'jedi':
    case 'neutral':
    default:
      return '';
  }
}

function trimForVoice(line, style) {
  const maxLength = style === 'tactical' ? 220 : style === 'protocol' ? 230 : 260;
  if (!line || line.length <= maxLength) return line;
  const sentenceBreak = line.slice(0, maxLength).lastIndexOf('. ');
  if (sentenceBreak > 90) return line.slice(0, sentenceBreak + 1).trim();
  return `${line.slice(0, maxLength - 1).trim()}...`;
}

export class MentorChoiceVoiceOverlay {
  static resolveStyle(options = {}) {
    return resolveStyle(options);
  }

  static apply(line, options = {}) {
    const base = ensureSentence(line);
    if (!base) return '';

    const style = resolveStyle(options);
    const prefix = prefixFor(style, base, options);
    const voiced = prefix ? `${prefix} ${base}` : base;
    return trimForVoice(voiced, style);
  }
}

export default MentorChoiceVoiceOverlay;

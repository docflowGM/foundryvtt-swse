/**
 * SuggestionDetailExplanation
 *
 * Normalizes SuggestionService / SuggestionReasonEngine output for detail rails.
 * This keeps the right rail and mentor reactions reading the same mechanical
 * evidence instead of each step inventing parallel prose.
 */

const GENERIC_REASON_FRAGMENTS = [
  'you meet the requirements',
  'you meet this requirement',
  'this adds to your selections',
  'adds to your selections',
  'this relates to your pattern',
  'this relates to your patterns',
  'this relates to your progression',
  'this reflects the path taking shape',
  'it reflects the path taking shape',
  'legal option',
  'available',
  'high-fit option for your build',
  'good-fit option for your build',
  'this is a viable class choice',
];

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Map) return Array.from(value.values());
  if (value instanceof Set) return Array.from(value);
  return [value];
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032'`]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentenceCase(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ensureSentence(value) {
  const text = sentenceCase(String(value || '').trim().replace(/^because\s+/i, ''));
  if (!text) return '';
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function textFromReason(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(textFromReason).filter(Boolean).join(', ');
  if (typeof value === 'object') {
    return String(
      value.text
      || value.fullReason
      || value.reasonText
      || value.reasonSummary
      || value.shortReason
      || value.summary
      || value.label
      || value.display
      || value.name
      || value.reason
      || value.description
      || ''
    ).trim();
  }
  return String(value).trim();
}

function codeFromReason(value) {
  if (!value || typeof value !== 'object') return '';
  return String(value.code || value.reasonCode || value.id || value.key || '').trim();
}

function domainFromReason(value, fallback = '') {
  if (!value || typeof value !== 'object') return fallback;
  return String(value.domain || value.type || fallback || '').trim();
}

function strengthFromReason(value) {
  const score = Number(value?.strength ?? value?.score ?? value?.weight ?? 0);
  return Number.isFinite(score) ? score : 0;
}

function isGenericReason(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return true;
  return GENERIC_REASON_FRAGMENTS.some(fragment => text === fragment || text.includes(fragment));
}

function suggestionBlock(suggestion) {
  return suggestion?.suggestion || {};
}

function reasonPacketFrom({ suggestion, reasonPacket }) {
  const block = suggestionBlock(suggestion);
  return reasonPacket
    || suggestion?.reasonPacket
    || block.reasonPacket
    || suggestion?.explanation
    || block.explanation
    || {};
}

function reasonObjects(values, bucket, fallbackDomain = '') {
  return asArray(values)
    .map((value) => {
      const text = ensureSentence(textFromReason(value));
      if (!text || isGenericReason(text)) return null;
      return {
        bucket,
        text,
        code: codeFromReason(value),
        domain: domainFromReason(value, fallbackDomain),
        strength: strengthFromReason(value),
      };
    })
    .filter(Boolean);
}

function uniqueReasons(values = [], limit = 4) {
  const seen = new Set();
  const out = [];
  for (const reason of values) {
    const text = ensureSentence(reason?.text || reason);
    const key = normalizeKey(text);
    if (!key || seen.has(key) || isGenericReason(text)) continue;
    seen.add(key);
    out.push(typeof reason === 'object' ? { ...reason, text } : { text });
    if (out.length >= limit) break;
  }
  return out;
}

function directSummaryCandidates({ suggestion, reasonPacket, fallbackSummary }) {
  const packet = reasonPacketFrom({ suggestion, reasonPacket });
  const block = suggestionBlock(suggestion);
  return [
    packet.fullReason,
    packet.reasonText,
    suggestion?.reasonText,
    block.reasonText,
    packet.shortReason,
    packet.reasonSummary,
    suggestion?.reasonSummary,
    block.reasonSummary,
    fallbackSummary,
    textFromReason(suggestion?.reason),
    textFromReason(block.reason),
  ];
}

function classDomainContextFrom({ suggestion, reasonPacket }) {
  const packet = reasonPacketFrom({ suggestion, reasonPacket });
  const block = suggestionBlock(suggestion);
  return packet.classDomainContext
    || suggestion?.classDomainContext
    || suggestion?.classDomain
    || block.classDomainContext
    || block.classDomain
    || null;
}

function collectBucketedReasons({ suggestion, reasonPacket, domain }) {
  const packet = reasonPacketFrom({ suggestion, reasonPacket });
  const block = suggestionBlock(suggestion);
  return {
    primary: uniqueReasons([
      ...reasonObjects(packet.primary, 'primary', domain),
      ...reasonObjects(suggestion?.primaryReasons, 'primary', domain),
      ...reasonObjects(block.primaryReasons, 'primary', domain),
    ], 4),
    secondary: uniqueReasons([
      ...reasonObjects(packet.secondary, 'secondary', domain),
      ...reasonObjects(suggestion?.secondaryReasons, 'secondary', domain),
      ...reasonObjects(block.secondaryReasons, 'secondary', domain),
    ], 4),
    forecast: uniqueReasons([
      ...reasonObjects(packet.forecast, 'forecast', domain),
      ...reasonObjects(suggestion?.forecastReasons, 'forecast', domain),
      ...reasonObjects(block.forecastReasons, 'forecast', domain),
    ], 3),
    opportunity: uniqueReasons([
      ...reasonObjects(packet.opportunity, 'opportunity', domain),
      ...reasonObjects(suggestion?.opportunityReasons, 'opportunity', domain),
      ...reasonObjects(block.opportunityReasons, 'opportunity', domain),
    ], 3),
    caution: uniqueReasons([
      ...reasonObjects(packet.caution, 'caution', domain),
      ...reasonObjects(suggestion?.cautionReasons, 'caution', domain),
      ...reasonObjects(block.cautionReasons, 'caution', domain),
      ...reasonObjects(suggestion?.cautions, 'caution', domain),
      ...reasonObjects(block.cautions, 'caution', domain),
    ], 3),
    bullets: uniqueReasons([
      ...reasonObjects(packet.bullets, 'bullet', domain),
      ...reasonObjects(suggestion?.reasonBullets, 'bullet', domain),
      ...reasonObjects(block.reasonBullets, 'bullet', domain),
      ...reasonObjects(packet.allReasons, 'all', domain),
      ...reasonObjects(suggestion?.reasons, 'all', domain),
      ...reasonObjects(block.reasons, 'all', domain),
    ], 5),
  };
}

export function buildSuggestionDetailExplanation({ item = null, suggestion = null, reasonPacket = null, domain = '', fallbackSummary = '' } = {}) {
  const source = suggestion || item || {};
  const packet = reasonPacketFrom({ suggestion: source, reasonPacket });
  const buckets = collectBucketedReasons({ suggestion: source, reasonPacket: packet, domain });
  const directSummary = directSummaryCandidates({ suggestion: source, reasonPacket: packet, fallbackSummary })
    .map(textFromReason)
    .map(ensureSentence)
    .find(text => text && !isGenericReason(text)) || '';

  const primaryReasons = buckets.primary.length ? buckets.primary : buckets.secondary.slice(0, 2);
  const summary = directSummary || primaryReasons[0]?.text || buckets.bullets[0]?.text || '';
  const bullets = uniqueReasons([
    ...primaryReasons,
    ...buckets.forecast,
    ...buckets.opportunity,
    ...buckets.caution,
    ...buckets.bullets,
  ], 5);
  const evidenceRows = uniqueReasons([
    ...primaryReasons,
    ...buckets.secondary,
    ...buckets.forecast,
    ...buckets.opportunity,
    ...buckets.caution,
  ], 8);

  const classDomainContext = classDomainContextFrom({ suggestion: source, reasonPacket: packet });
  const reasonCodes = uniqueReasons(evidenceRows.map(row => row.code).filter(Boolean), 12).map(row => row.text);
  const hasReasons = !!(summary || bullets.length || evidenceRows.length || classDomainContext);

  return {
    hasReasons,
    summary,
    primaryReasons,
    secondaryReasons: buckets.secondary,
    forecastReasons: buckets.forecast,
    opportunityReasons: buckets.opportunity,
    cautionReasons: buckets.caution,
    bullets,
    bulletTexts: bullets.map(row => row.text),
    evidenceRows,
    reasonCodes,
    classDomainContext,
    mentorLineSeed: summary || primaryReasons[0]?.text || buckets.caution[0]?.text || '',
  };
}

export default buildSuggestionDetailExplanation;

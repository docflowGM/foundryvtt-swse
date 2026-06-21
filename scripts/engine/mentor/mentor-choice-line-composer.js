/**
 * MentorChoiceLineComposer
 *
 * Metadata-first one-line composer for progression choice reactions.
 *
 * This is intentionally small: it does not decide whether a choice is good.
 * SuggestionService / SuggestionReasonEngine own the mechanical truth. This
 * module only chooses the most concrete reason already present on the item or
 * suggestion, then hands the finished mechanical line to MentorChoiceVoiceOverlay
 * for mentor-specific delivery.
 */

import { MentorChoiceVoiceOverlay } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-choice-voice-overlay.js';

const CORE_CLASS_NAMES = ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier'];
const CLASS_ROUTE_AFFINITY = {
  Jedi: ['Jedi Knight', 'Jedi Master', 'Force Disciple', 'Force Adept', 'Imperial Knight', 'Sith Apprentice'],
  Noble: ['Officer', 'Crime Lord', 'Corporate Agent', 'Charlatan', 'Medic', 'Droid Commander'],
  Scoundrel: ['Gunslinger', 'Outlaw', 'Crime Lord', 'Infiltrator', 'Master Privateer', 'Assassin', 'Charlatan'],
  Scout: ['Bounty Hunter', 'Ace Pilot', 'Pathfinder', 'Infiltrator', 'Vanguard', 'Saboteur'],
  Soldier: ['Elite Trooper', 'Officer', 'Vanguard', 'Gladiator', 'Melee Duelist', 'Military Engineer', 'Bounty Hunter'],
};

const CLASS_THEME_LABELS = {
  force: 'a broader Force tradition',
  social: 'leadership and influence',
  ranged: 'ranged pressure',
  exploration: 'survival and mobility',
  combat: 'front-line combat',
  vehicle: 'vehicle mastery',
  stealth: 'infiltration',
  tracking: 'pursuit and tracking',
  leader: 'command',
  support: 'support',
  tech: 'technical problem-solving',
  melee: 'melee pressure',
  general: 'general capability',
};

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

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’'`]/g, '')
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
  const value = sentenceCase(String(text || '').trim().replace(/^because\s+/i, ''));
  if (!value) return '';
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function stripSentencePunctuation(value) {
  return String(value || '').trim().replace(/[.!?]+$/g, '');
}

function itemName(item, fallback = 'this choice') {
  if (!item) return fallback;
  if (typeof item === 'string') return item;
  return item.name
    || item.label
    || item.title
    || item.className
    || item.skillName
    || item.system?.name
    || item.system?.label
    || fallback;
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (value instanceof Map) return Array.from(value.values());
  if (typeof value === 'object') return Object.values(value);
  return [value];
}

function unique(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const text = String(value || '').trim();
    const key = normalizeKey(text);
    if (!text || seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function displayList(values = [], limit = 3) {
  const cleaned = unique(values).slice(0, limit);
  if (!cleaned.length) return '';
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(', ')}, and ${cleaned[cleaned.length - 1]}`;
}

function textFromReason(reason) {
  if (!reason) return '';
  if (typeof reason === 'string') return reason.trim();
  return String(
    reason.text
    || reason.fullReason
    || reason.reasonText
    || reason.reasonSummary
    || reason.shortReason
    || reason.label
    || reason.display
    || reason.name
    || reason.reason
    || ''
  ).trim();
}

function reasonCode(reason) {
  if (!reason || typeof reason === 'string') return '';
  return String(reason.code || reason.reasonCode || reason.id || reason.key || '').toUpperCase();
}

function reasonStrength(reason) {
  const value = Number(reason?.strength ?? reason?.score ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function isGenericText(value) {
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

function collectReasons({ suggestion, reasonPacket }) {
  const packet = reasonPacketFrom({ suggestion, reasonPacket });
  const block = suggestionBlock(suggestion);
  const buckets = [
    ['primary', packet.primary || suggestion?.primaryReasons || block.primaryReasons],
    ['secondary', packet.secondary || suggestion?.secondaryReasons || block.secondaryReasons],
    ['forecast', packet.forecast || suggestion?.forecastReasons || block.forecastReasons],
    ['opportunity', packet.opportunity || suggestion?.opportunityReasons || block.opportunityReasons],
    ['caution', packet.caution || suggestion?.cautionReasons || block.cautionReasons || suggestion?.cautions || block.cautions],
    ['all', packet.allReasons || suggestion?.reasons || block.reasons],
    ['bullet', packet.bullets || suggestion?.reasonBullets || block.reasonBullets],
  ];
  const out = [];
  for (const [bucket, values] of buckets) {
    for (const value of asArray(values)) {
      const text = textFromReason(value);
      if (!text || isGenericText(text)) continue;
      out.push({ bucket, text, code: reasonCode(value), domain: value?.domain || '', strength: reasonStrength(value) });
    }
  }

  const direct = [
    packet.fullReason,
    packet.reasonText,
    suggestion?.reasonText,
    block.reasonText,
    packet.reasonSummary,
    suggestion?.reasonSummary,
    block.reasonSummary,
    packet.shortReason,
    textFromReason(suggestion?.reason),
    textFromReason(block.reason),
  ];
  for (const value of direct) {
    const text = textFromReason(value);
    if (!text || isGenericText(text)) continue;
    out.push({ bucket: 'direct', text, code: '', domain: '', strength: 0.7 });
  }

  const seen = new Set();
  return out
    .filter(reason => {
      const key = normalizeKey(reason.text);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const bucketWeight = { primary: 6, caution: 5, forecast: 4, opportunity: 3, secondary: 2, bullet: 1, all: 0, direct: -1 };
      return (bucketWeight[b.bucket] || 0) - (bucketWeight[a.bucket] || 0) || b.strength - a.strength;
    });
}

function reasonMatches(reason, terms = []) {
  const haystack = `${reason.code || ''} ${reason.domain || ''} ${reason.text || ''}`.toLowerCase();
  return terms.some(term => haystack.includes(String(term).toLowerCase()));
}

function pickReason(reasons, terms = [], bucket = null) {
  return reasons.find(reason => (!bucket || reason.bucket === bucket) && reasonMatches(reason, terms)) || null;
}

function actorClassEntries(actor) {
  return Array.from(actor?.items?.contents || actor?.items || [])
    .filter(item => item?.type === 'class')
    .map(item => ({ name: item?.name, level: Number(item?.system?.level ?? item?.system?.levels ?? 1) || 1 }))
    .filter(entry => entry.name);
}

function primaryBaseClass(actor) {
  return actorClassEntries(actor)
    .filter(entry => CORE_CLASS_NAMES.some(name => normalizeKey(name) === normalizeKey(entry.name)))
    .sort((a, b) => b.level - a.level)[0]?.name || null;
}

function isPrestigeClass(item, suggestion = null) {
  return item?.prestigeClass === true
    || item?.isPrestige === true
    || item?.baseClass === false
    || item?.system?.prestigeClass === true
    || item?.system?.isPrestige === true
    || item?.dataset?.type === 'prestige'
    || suggestion?.prestigeClass === true
    || suggestion?.isPrestige === true
    || suggestion?.baseClass === false
    || suggestion?.system?.prestigeClass === true
    || suggestion?.system?.isPrestige === true
    || suggestion?.suggestion?.isPrestige === true;
}

function classTheme(item, suggestion = null) {
  const raw = String(item?.theme || item?.role || item?.system?.theme || item?.system?.role || suggestion?.theme || suggestion?.role || suggestion?.suggestion?.theme || '').trim();
  if (raw) return CLASS_THEME_LABELS[normalizeKey(raw)] || raw;
  const tags = compactText(item?.tags, item?.system?.tags, suggestion?.tags, suggestion?.reasonText, suggestion?.suggestion?.reason).toLowerCase();
  if (/force|jedi|lightsaber|use the force/.test(tags)) return 'a broader Force tradition';
  if (/pilot|vehicle|starship/.test(tags)) return 'vehicle mastery';
  if (/stealth|infiltration|slicer/.test(tags)) return 'infiltration';
  if (/leader|support|noble|officer/.test(tags)) return 'leadership and influence';
  if (/tech|mechanics|computer/.test(tags)) return 'technical problem-solving';
  if (/ranged|pistol|rifle|gunslinger/.test(tags)) return 'ranged pressure';
  if (/survival|scout|exploration|mobility|fieldcraft/.test(tags)) return 'survival and mobility';
  if (/melee|soldier|duelist|martial/.test(tags)) return 'melee pressure';
  return 'a different play pattern';
}

function missingPrereqs(suggestion = {}) {
  const block = suggestionBlock(suggestion);
  const raw = block.missingPrereqs || suggestion.missingPrereqs || suggestion.missing || [];
  return asArray(raw).map(entry => {
    if (!entry) return null;
    if (typeof entry === 'string') return entry;
    return entry.shortDisplay || entry.display || entry.name || entry.label || entry.reason || entry.description || null;
  }).filter(Boolean);
}

function classRouteMatches(baseClass, className) {
  if (!baseClass || !className) return false;
  return (CLASS_ROUTE_AFFINITY[baseClass] || []).some(route => normalizeKey(route) === normalizeKey(className));
}

function inferClassRouteContext({ actor, item, suggestion, classRouteContext }) {
  const supplied = classRouteContext && typeof classRouteContext === 'object' ? classRouteContext : {};
  const name = itemName(item, suggestion?.name || supplied.className || 'this class');
  const baseClass = supplied.baseClass || primaryBaseClass(actor);
  const classes = supplied.actorClasses || actorClassEntries(actor);
  const alreadyHasClass = supplied.alreadyHasClass ?? classes.some(entry => normalizeKey(entry.name) === normalizeKey(name));
  const isPrestige = supplied.isPrestige ?? isPrestigeClass(item, suggestion);
  const routeMatch = supplied.routeMatch ?? classRouteMatches(baseClass, name);
  const theme = supplied.theme || classTheme(item, suggestion);
  const missing = supplied.missingPrereqs || missingPrereqs(suggestion);
  return { name, baseClass, actorClasses: classes, alreadyHasClass, isPrestige, routeMatch, theme, missingPrereqs: missing };
}

function directReasonText(reason) {
  if (!reason?.text) return '';
  return ensureSentence(reason.text.replace(/^it\s+/i, ''));
}

function actionPrefix(action, name) {
  if (action === 'commit') return `${name} locked in.`;
  if (action === 'uncommit') return `${name} set aside.`;
  return '';
}

function withAction(action, name, sentence) {
  const prefix = actionPrefix(action, name);
  if (!prefix) return ensureSentence(sentence);
  return compactText(prefix, sentence);
}

function composeSpecificClassLine({ action, actor, item, suggestion, reasons, classRouteContext }) {
  const ctx = inferClassRouteContext({ actor, item, suggestion, classRouteContext });
  const { name, baseClass, isPrestige, routeMatch, alreadyHasClass, theme, missingPrereqs: missing } = ctx;
  const nameKey = normalizeKey(name);
  const baseKey = normalizeKey(baseClass);
  const routeReason = pickReason(reasons, ['jedi_knight_route', 'base_to_prestige_route', 'prestige_route', 'route continuation', 'natural advanced route', 'knighthood']);
  const crossRouteReason = pickReason(reasons, ['prestige_cross_route', 'base_class_cross_training', 'cross-training', 'changes the emphasis', 'detour', 'lateral']);
  const prereqReason = pickReason(reasons, ['prestige_now', 'prestige_ready_now', 'class_prereqs', 'prestige_still_locked', 'prerequisite', 'missing', 'gate', 'qualify']);

  if (nameKey === 'jedi-knight' && baseKey === 'jedi') {
    return withAction(action, name, `${name} is not a detour; it is the formal threshold your Jedi training has been pointing toward. You already carry the Force and lightsaber foundation this path asks for.`);
  }

  if (nameKey === 'force-adept' && baseKey === 'jedi') {
    return withAction(action, name, `${name} is viable, but it changes the meaning of your Force path. It moves you outside the Jedi structure toward a broader, more mystical tradition.`);
  }

  if (nameKey === 'scout' && baseKey === 'jedi') {
    return withAction(action, name, `${name} is workable, but it is a lateral survival-and-mobility path. It gives you practical field tools, not deeper Jedi authority.`);
  }

  if (nameKey === 'noble' && baseKey === 'jedi') {
    return withAction(action, name, `${name} can give you leadership and influence, but it does not advance your Jedi Knight route as directly as continuing the Order's path.`);
  }

  if (isPrestige && routeMatch) {
    const mechanical = routeReason?.text && !isGenericText(routeReason.text)
      ? stripSentencePunctuation(routeReason.text)
      : `this is the advanced ${baseClass} route your existing foundation points toward`;
    const prereq = prereqReason?.text ? ` ${stripSentencePunctuation(prereqReason.text)}.` : '';
    return withAction(action, name, `${name} is route continuation, not a random detour; ${mechanical}.${prereq}`);
  }

  if (isPrestige && missing.length) {
    return withAction(action, name, `${name} is worth inspecting, but it is not ready yet. The remaining gates are ${displayList(missing, 3)}.`);
  }

  if (isPrestige && baseClass) {
    const reason = crossRouteReason?.text ? stripSentencePunctuation(crossRouteReason.text) : `it shifts emphasis from your ${baseClass} foundation toward ${theme}`;
    return withAction(action, name, `${name} is viable, but it changes the route. ${sentenceCase(reason)}.`);
  }

  if (!isPrestige && alreadyHasClass) {
    return withAction(action, name, `${name} deepens the class chassis you already rely on instead of opening a side lane.`);
  }

  if (!isPrestige && baseClass && normalizeKey(baseClass) !== nameKey) {
    return withAction(action, name, `${name} is workable, but it is cross-training from your ${baseClass} base. Take it for ${theme}, not because it is the straightest route forward.`);
  }

  return '';
}

function composeMetadataLine({ action, item, suggestion, reasons }) {
  const name = itemName(item, suggestion?.name || 'This choice');
  const prereq = pickReason(reasons, ['prerequisite', 'prereq', 'requires', 'gate', 'bab', 'qualify', 'trained']);
  if (prereq) return withAction(action, name, `${name} has a real gate here: ${stripSentencePunctuation(prereq.text)}.`);

  const owned = pickReason(reasons, ['owned', 'already have', 'already carry', 'synergy', 'matches your current', 'reinforces equipment', 'skill investment', 'class_skill_value']);
  if (owned) return withAction(action, name, `${name} connects to what you already have: ${stripSentencePunctuation(owned.text)}.`);

  const continuation = pickReason(reasons, ['prestige_route_continuation', 'talent_tree_continuation', 'feat_chain', 'chain', 'continuation', 'continues', 'tree']);
  if (continuation) return withAction(action, name, `${name} is a continuation pick: ${stripSentencePunctuation(continuation.text)}.`);

  const caution = pickReason(reasons, ['caution', 'detour', 'risk', 'low', 'locked', 'lateral'], 'caution')
    || reasons.find(reason => reason.bucket === 'caution');
  if (caution) return withAction(action, name, `${name} is viable, but there is a caution: ${stripSentencePunctuation(caution.text)}.`);

  const concrete = reasons.find(reason => ['primary', 'forecast', 'opportunity', 'secondary', 'direct', 'bullet'].includes(reason.bucket));
  if (concrete) return withAction(action, name, directReasonText(concrete));

  return '';
}


export class MentorChoiceLineComposer {
  static compose(context = {}) {
    try {
      const { actor, mentorId, mentorName, mentor, stepId, action, item, suggestion, reasonPacket, classRouteContext } = context;
      const reasons = collectReasons({ suggestion, reasonPacket });
      let line = '';
      let bucketHint = '';

      if (stepId === 'class') {
        line = composeSpecificClassLine({ action, actor, item, suggestion, reasons, classRouteContext });
        bucketHint = /but|caution|not ready|remaining gates/i.test(line) ? 'caution' : 'primary';
      }

      if (!line) {
        line = composeMetadataLine({ action, item, suggestion, reasons });
        bucketHint = reasons[0]?.bucket || '';
      }

      if (!line || isGenericText(line)) return '';
      return MentorChoiceVoiceOverlay.apply(line, { mentorId, mentorName, mentor, action, tone: bucketHint === 'caution' ? 'cautionary' : '' });
    } catch (_) {
      return '';
    }
  }
}

export default MentorChoiceLineComposer;

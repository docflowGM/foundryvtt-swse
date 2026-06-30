import { SKILL_CHALLENGE_EFFECT_TYPES, SKILL_CHALLENGE_STATUS } from './SkillChallengeConstants.js';

function cleanString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function cleanNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cleanArray(value) {
  return Array.isArray(value) ? value : [];
}

function nowIso() {
  return new Date().toISOString();
}

function randomId() {
  if (globalThis.foundry?.utils?.randomID) return `skill-challenge-${globalThis.foundry.utils.randomID()}`;
  return `skill-challenge-${Math.random().toString(36).slice(2, 10)}`;
}


function defaultEffectParameters(type, parameters = {}) {
  const base = parameters && typeof parameters === 'object' ? { ...parameters } : {};
  if (type === SKILL_CHALLENGE_EFFECT_TYPES.CATASTROPHIC_FAILURE) {
    return { threshold: 10, extraFailures: 1, ...base };
  }
  if (type === SKILL_CHALLENGE_EFFECT_TYPES.RESTRICTED_SKILLS) {
    return { mode: 'listedOnly', ...base };
  }
  if (type === SKILL_CHALLENGE_EFFECT_TYPES.TIMED_CHALLENGE) {
    const limit = Math.max(0, cleanNumber(base.limit, cleanNumber(base.remaining, 0)));
    return {
      unit: cleanString(base.unit, 'step'),
      limit,
      remaining: Math.max(0, cleanNumber(base.remaining, limit)),
      autoFailAtZero: base.autoFailAtZero === true,
      ...base
    };
  }
  if (type === SKILL_CHALLENGE_EFFECT_TYPES.RECOVERY) {
    return { recoverFailures: 1, requiresGmApproval: true, ...base };
  }
  if (type === SKILL_CHALLENGE_EFFECT_TYPES.SECOND_EFFORT) {
    return { requiresGmApproval: true, ...base };
  }
  return base;
}

function normalizeStatus(value) {
  const status = cleanString(value, SKILL_CHALLENGE_STATUS.DRAFT);
  return Object.values(SKILL_CHALLENGE_STATUS).includes(status) ? status : SKILL_CHALLENGE_STATUS.DRAFT;
}

/**
 * Builds normalized Skill Challenge state. Phase 3.5B keeps this as plain data
 * so the GM tracker can persist safely without introducing a custom document
 * type or roll automation layer.
 */
export class SkillChallengeState {
  static createId() {
    return randomId();
  }

  static normalize(raw = {}) {
    const targetSuccesses = Math.max(1, cleanNumber(raw.targetSuccesses, 4));
    const failureLimit = Math.max(1, cleanNumber(raw.failureLimit, 3));
    const successes = Math.max(0, cleanNumber(raw.successes, 0));
    const failures = Math.max(0, cleanNumber(raw.failures, 0));
    const timestamp = nowIso();
    const id = cleanString(raw.id, randomId());

    return {
      id,
      name: cleanString(raw.name, 'Untitled Skill Challenge'),
      source: cleanString(raw.source, 'Galaxy of Intrigue'),
      cl: Math.max(0, cleanNumber(raw.cl, 0)),
      complexity: Math.max(0, cleanNumber(raw.complexity, 0)),
      targetSuccesses,
      failureLimit,
      successes: Math.min(successes, targetSuccesses),
      failures: Math.min(failures, failureLimit),
      status: normalizeStatus(raw.status),
      sceneId: cleanString(raw.sceneId),
      gmNotes: cleanString(raw.gmNotes),
      playerBrief: cleanString(raw.playerBrief),
      successText: cleanString(raw.successText),
      failureText: cleanString(raw.failureText),
      primarySkills: cleanArray(raw.primarySkills).map(this.normalizeSkillEntry).filter(entry => entry.slug || entry.label),
      secondarySkills: cleanArray(raw.secondarySkills).map(this.normalizeSkillEntry).filter(entry => entry.slug || entry.label),
      effects: cleanArray(raw.effects).map(this.normalizeEffectEntry).filter(entry => entry.type || entry.label),
      participants: cleanArray(raw.participants).map(this.normalizeParticipant).filter(entry => entry.actorId || entry.name),
      history: cleanArray(raw.history).map(this.normalizeHistoryEntry),
      createdAt: cleanString(raw.createdAt, timestamp),
      updatedAt: cleanString(raw.updatedAt, timestamp)
    };
  }

  static normalizeSkillEntry(entry = {}) {
    const slug = cleanString(entry.slug || entry.id || entry.key);
    return {
      slug,
      label: cleanString(entry.label, slug),
      dc: Math.max(0, cleanNumber(entry.dc, 0)),
      useLimit: entry.useLimit == null ? null : Math.max(0, cleanNumber(entry.useLimit, 0)),
      requiresGmApproval: entry.requiresGmApproval !== false,
      notes: cleanString(entry.notes)
    };
  }

  static normalizeEffectEntry(entry = {}) {
    const type = cleanString(entry.type || entry.id || entry.key);
    return {
      type,
      label: cleanString(entry.label, type),
      enabled: entry.enabled !== false,
      parameters: defaultEffectParameters(type, entry.parameters),
      notes: cleanString(entry.notes)
    };
  }

  static normalizeParticipant(entry = {}) {
    return {
      actorId: cleanString(entry.actorId),
      tokenId: cleanString(entry.tokenId),
      name: cleanString(entry.name, 'Unknown Participant'),
      active: entry.active !== false,
      notes: cleanString(entry.notes)
    };
  }

  static normalizeHistoryEntry(entry = {}) {
    return {
      timestamp: cleanString(entry.timestamp, nowIso()),
      action: cleanString(entry.action, 'manual'),
      actorId: cleanString(entry.actorId),
      actorName: cleanString(entry.actorName),
      skillSlug: cleanString(entry.skillSlug),
      total: entry.total ?? null,
      dc: entry.dc ?? null,
      margin: entry.margin ?? null,
      rollMessageId: cleanString(entry.rollMessageId),
      successesDelta: cleanNumber(entry.successesDelta, 0),
      failuresDelta: cleanNumber(entry.failuresDelta, 0),
      note: cleanString(entry.note || cleanArray(entry.messages).join(' '))
    };
  }

  static progressPips(current = 0, target = 1) {
    const safeTarget = Math.max(1, cleanNumber(target, 1));
    const safeCurrent = Math.max(0, Math.min(safeTarget, cleanNumber(current, 0)));
    return Array.from({ length: safeTarget }, (_value, index) => ({
      index: index + 1,
      filled: index < safeCurrent
    }));
  }
}

export default SkillChallengeState;

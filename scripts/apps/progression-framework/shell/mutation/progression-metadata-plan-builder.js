/**
 * ProgressionMetadataPlanBuilder
 *
 * Domain compiler for final progression receipts/completion bookkeeping.
 *
 * This module is side-effect free. It only returns mutation-plan set fragments.
 */

// Canonical receipt builder. This is the SAME function ProgressionFinalizer uses
// on its inline metadata path, which is what makes this builder behavior-equivalent
// to that inline code. (Previously this imported a non-existent
// levelup-finalization-receipt.js, which is why the builder could never load.)
import { buildLevelUpFinalizationReceipt } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/levelup-finalization-audit.js';
import { buildLevelUpEventContext } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/levelup-event-context.js';

function completedSessionId(sessionState = {}) {
  return sessionState.sessionId || sessionState.progressionSession?.sessionId || 'unknown';
}

function clonePlain(value, fallback) {
  try {
    if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value ?? fallback);
    return JSON.parse(JSON.stringify(value ?? fallback));
  } catch (_err) {
    return fallback;
  }
}

function normalizeLevel(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
}

function parseHpFormula(formula = '') {
  const text = String(formula || '').trim();
  const dieMatch = text.match(/(?:1?d)(4|6|8|10|12)\b/i);
  const modifierMatch = text.match(/(?:1?d(?:4|6|8|10|12))\s*([+-])\s*(\d+)/i);
  const hitDie = dieMatch ? Number(dieMatch[1]) : null;
  const constitutionModifier = modifierMatch
    ? Number(modifierMatch[2]) * (modifierMatch[1] === '-' ? -1 : 1)
    : null;
  return { hitDie, constitutionModifier };
}

function readActorConModifier(actor) {
  if (actor?.type === 'droid' || actor?.system?.isDroid === true) return 0;
  const candidates = [
    actor?.system?.derived?.attributes?.con,
    actor?.system?.attributes?.con,
    actor?.system?.abilities?.con,
  ];
  for (const ability of candidates) {
    const explicit = Number(ability?.mod);
    if (Number.isFinite(explicit)) return explicit;
    const score = Number(ability?.total ?? ability?.value ?? ability?.score ?? ability?.base);
    if (Number.isFinite(score)) return Math.floor((score - 10) / 2);
  }
  return 0;
}

function normalizeHistoryRecord(record = {}) {
  const amount = Math.max(0, Number(record?.amount ?? record?.hpGain ?? record?.gain ?? 0) || 0);
  if (amount <= 0) return null;
  return {
    ...record,
    amount,
    characterLevel: normalizeLevel(record?.characterLevel ?? record?.level ?? record?.newLevel ?? record?.targetLevel) || null,
    level: normalizeLevel(record?.level ?? record?.characterLevel ?? record?.newLevel ?? record?.targetLevel) || null,
  };
}

function historyKey(record = {}, index = 0) {
  const level = normalizeLevel(record?.characterLevel ?? record?.level);
  if (level > 0) return `level:${level}`;
  const timestamp = String(record?.timestamp || '').trim();
  if (timestamp) return `time:${timestamp}`;
  return `legacy:${Number(record?.amount || 0)}:${String(record?.method || '')}:${index}`;
}

function buildHpGainHistory(actor, sessionState = {}) {
  if (sessionState.mode !== 'levelup') return null;

  const selections = sessionState.progressionSession?.draftSelections || {};
  const summary = selections.survey || {};
  const amount = Math.max(0, Number(summary.hpGain || 0) || 0);
  if (amount <= 0) return null;

  const selectedClass = selections.class || null;
  let levelContext = null;
  try {
    levelContext = buildLevelUpEventContext(actor, sessionState.progressionSession, { selectedClass });
  } catch (_err) {
    levelContext = null;
  }

  const characterLevel = normalizeLevel(
    levelContext?.enteringLevel
    ?? sessionState.targetLevel
    ?? sessionState.progressionSession?.targetLevel
    ?? (Number(actor?.system?.level || 0) + 1)
  );
  const parsedFormula = parseHpFormula(summary.hpGainFormula);
  const timestamp = new Date().toISOString();
  const record = {
    characterLevel: characterLevel || null,
    level: characterLevel || null,
    classId: levelContext?.selectedClassId || selectedClass?.id || selectedClass?.classId || selectedClass?.sourceId || null,
    className: levelContext?.selectedClassName || selectedClass?.name || selectedClass?.className || selectedClass?.label || null,
    classLevel: normalizeLevel(levelContext?.selectedClassNextLevel) || null,
    amount,
    method: summary.hpGainMethod || null,
    formula: summary.hpGainFormula || null,
    hitDie: parsedFormula.hitDie,
    constitutionModifier: Number.isFinite(parsedFormula.constitutionModifier)
      ? parsedFormula.constitutionModifier
      : readActorConModifier(actor),
    timestamp,
    source: 'progression-finalizer',
  };

  const existing = clonePlain(actor?.system?.progression?.hpGainHistory, []);
  const normalized = [];
  const append = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      for (const entry of value) append(entry);
      return;
    }
    const entry = normalizeHistoryRecord(value);
    if (entry) normalized.push(entry);
  };
  append(existing);

  const byKey = new Map();
  normalized.forEach((entry, index) => byKey.set(historyKey(entry, index), entry));
  byKey.set(historyKey(record, normalized.length), record);

  return Array.from(byKey.values())
    .sort((a, b) => {
      const aLevel = normalizeLevel(a?.characterLevel ?? a?.level);
      const bLevel = normalizeLevel(b?.characterLevel ?? b?.level);
      if (aLevel && bLevel && aLevel !== bLevel) return aLevel - bLevel;
      return String(a?.timestamp || '').localeCompare(String(b?.timestamp || ''));
    });
}

export class ProgressionMetadataPlanBuilder {
  static buildSet({ actor, sessionState = {}, levelUpManifest = null } = {}) {
    const set = {};
    const completedId = completedSessionId(sessionState);
    const completedAt = new Date().toISOString();

    if (sessionState.mode === 'levelup' && levelUpManifest) {
      set['flags.swse.levelUpEntitlementManifest'] = levelUpManifest;
      set['flags.swse.levelUpFinalizationReceipt'] = buildLevelUpFinalizationReceipt(levelUpManifest, sessionState.progressionSession);
    }

    const hpGainHistory = buildHpGainHistory(actor, sessionState);
    if (hpGainHistory) {
      set['system.progression.hpGainHistory'] = hpGainHistory;
    }

    set[`flags.foundryvtt-swse.progression.${sessionState.mode}.completed`] = {
      completed: true,
      mode: sessionState.mode,
      sessionId: completedId,
      currentStepId: sessionState.progressionSession?.currentStepId || null,
      completedAt,
      source: 'progression-finalizer',
    };
    set['system.progression.lastCompletedMode'] = sessionState.mode;
    set['system.progression.completedSessionId'] = completedId;
    set['system.progression.completedAt'] = completedAt;

    if (sessionState.mode === 'chargen') {
      set['system.progression.chargenComplete'] = true;
      set['flags.foundryvtt-swse.progression.chargen.completedAt'] = completedAt;
    }

    return set;
  }
}

/**
 * Progression Entitlement Calculator
 *
 * Determines the progression choices an actor should have and projects the
 * derived-stat audit from the same canonical class-level authority.
 */

import { runDomainAdapters, applyDomainAdapterRows } from './domain-adapters.js';
import { readHpLedger, auditHp } from '/systems/foundryvtt-swse/scripts/engine/HP/hp-accounting.js';
import { readActorClassLevels } from './class-level-reader.js';
import { getClassLevelProgressionEntry } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/levelup-event-context.js';

// Choice-style class features the slot builders understand. Any other `*_choice`
// feature found in a resolved class's levelProgression is reported as "unaudited"
// instead of being silently ignored.
const AUDITED_CHOICE_TYPES = Object.freeze([
  'feat_choice', 'talent_choice', 'force_secret_choice', 'force_technique_choice',
  'force_power_choice', 'medical_secret_choice', 'starship_maneuver_choice',
]);

function normalizeKey(value) {
  return String(value?.classId || value?.id || value?.name || value?.className || value || '')
    .trim().toLowerCase().replace(/[\u2019']/g, '').replace(/[^a-z0-9]+/g, '');
}

function normalizeLevel(value) {
  const n = Number(value?.level ?? value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Map reader rows onto the summary shape the slot builders already consume. */
function toSummaries(rows = []) {
  return rows.map(row => ({
    itemId: row.itemId,
    classId: row.classId,
    className: row.className,
    level: row.level,
    model: row.model,
    item: row.item,
    resolved: row.resolved,
    sources: row.sources || [row.source],
    isNonheroic: row.isNonheroic,
    isPrestige: row.isPrestige,
    isHeroic: !row.isNonheroic,
  }));
}

function finite(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function isNonheroic(summary = {}) {
  return summary.isNonheroic === true;
}

function conModifier(actor) {
  if (actor?.type === 'droid' || actor?.system?.isDroid) return 0;
  for (const ability of [actor?.system?.derived?.attributes?.con, actor?.system?.attributes?.con, actor?.system?.abilities?.con]) {
    const mod = Number(ability?.mod);
    if (Number.isFinite(mod)) return mod;
    const score = Number(ability?.total ?? ability?.value ?? ability?.score ?? ability?.base);
    if (Number.isFinite(score)) return Math.floor((score - 10) / 2);
  }
  return 0;
}

/** Canonical ClassModel.baseHp; null (never 0) when the model does not carry one. */
function classBaseHp(summary = {}) {
  return finite(summary.model?.baseHp);
}

/** Canonical ClassModel.hitDie; null when the model does not carry a valid die. No name-based defaults. */
function classHitDie(summary = {}) {
  const direct = finite(summary.model?.hitDie);
  return [4, 6, 8, 10, 12].includes(direct) ? direct : null;
}

function hpRecords(actor) {
  const records = [];
  const append = value => {
    if (!value) return;
    if (Array.isArray(value)) return value.forEach(append);
    const amount = Math.max(0, Number(value.amount ?? value.hpGain ?? value.gain ?? 0) || 0);
    if (!amount) return;
    const level = normalizeLevel(value.characterLevel ?? value.level ?? value.newLevel ?? value.targetLevel);
    records.push({ ...value, amount, level });
  };
  append(actor?.system?.progression?.hpGainHistory);
  append(actor?.system?.progression?.lastHpGain);
  const unique = new Map();
  records.forEach((record, index) => unique.set(record.level ? `level:${record.level}` : record.timestamp ? `time:${record.timestamp}` : `legacy:${record.amount}:${index}`, record));
  return Array.from(unique.values());
}

function buildHpAudit(actor, summaries, heroicLevel) {
  const heroic = summaries.filter(summary => !isNonheroic(summary));
  const firstIdentity = normalizeKey(actor?.system?.class);
  const first = heroic.find(summary => normalizeKey(summary) === firstIdentity) || heroic[0] || null;
  const base = first ? classBaseHp(first) : null;
  // Same accounting as ActorEngine.recomputeHP: the CON modifier recorded in the HP ledger is the one already inside
  // the stored maximum; the current modifier is only an estimate used when no ledger exists.
  const ledger = readHpLedger(actor);
  const con = ledger ? ledger.conMod : conModifier(actor);
  const starting = Number.isFinite(base) ? Math.max(1, base + con) : null;
  const expectedRecords = Math.max(0, heroicLevel - 1);
  const records = hpRecords(actor).slice(0, expectedRecords);
  const missing = Math.max(0, expectedRecords - records.length);
  const recorded = records.reduce((sum, record) => sum + record.amount, 0);
  const current = finite(actor?.system?.hp?.max, actor?.system?.derived?.hp?.max, actor?.system?.hitPoints?.max);

  const accounting = auditHp(actor);
  if (starting === null && accounting.status !== 'pending-delta') {
    return { accounting, status: 'unverifiable', current, lower: null, upper: null, exact: null, expectedVerdict: null, label: 'Unverifiable', issue: '', detail: 'HP cannot be verified: no heroic starting-class base HP is available from the class model.' };
  }

  const dice = heroic.map(classHitDie);
  const dieKnown = dice.length > 0 && dice.every(Number.isFinite);
  const maximumGain = dieKnown ? Math.max(...dice.map(die => Math.max(1, die + con))) : null;
  const lower = Number.isFinite(starting) ? starting + recorded + missing : null;
  const upper = !Number.isFinite(starting) ? null : (missing === 0 ? starting + recorded : (maximumGain === null ? null : starting + recorded + (missing * maximumGain)));
  const exact = Number.isFinite(starting) && missing === 0 ? starting + recorded : null;

  // The verdict comes ONLY from the canonical accounting (engine/HP/hp-accounting.js). The reconstruction above
  // (starting HP + recorded gains) is an ESTIMATE shown for context: recorded gains contain the CON modifier of their own
  // level, so after a legitimate CON change it can legitimately differ from the stored maximum. It is never a verdict.
  //   issue        : the ledger shows a recorded contribution (CON / HP feat / hp.bonus) the stored maximum does not reflect
  //   ok           : ledger present and fully accounted
  //   unverifiable : no ledger / incomplete history / above the estimated range (RECON-004) - informational, never an error
  let status = 'unverifiable';
  let issue = '';
  let detail = 'HP history is not fully recorded; the range shown is an estimate and no correction is implied.';
  let expectedVerdict = null;
  if (accounting.status === 'pending-delta') {
    status = 'issue';
    expectedVerdict = accounting.expectedMax;
    issue = `Maximum HP is ${current} but the recorded Constitution / HP-bonus changes imply ${accounting.expectedMax}.`;
    detail = 'Computed from the contributions already recorded in your HP ledger; recorded level gains are never rerolled.';
  } else if (accounting.status === 'consistent') {
    status = 'ok';
    detail = 'Maximum HP is consistent with the recorded HP history and current bonuses.';
  }
  if (status !== 'issue' && Number.isFinite(upper) && Number.isFinite(current) && current > upper) {
    status = 'unverifiable';
    detail = `Current HP ${current} is above the estimated range. Whether that is legal depends on an unresolved rules question (RECON-004), so it is not reported as an error.`;
  }

  // Historical evidence: a recorded gain stands on the rules that were active when it was earned. It is never compared with
  // today's hpGeneration / maxHPLevels, so a legitimate roll, average or maximum is never an error because settings changed later.
  const withRules = records.filter(record => record.houseRules && typeof record.houseRules === 'object').length;
  return {
    accounting,
    historyEvidence: { recorded: records.length, withRules, withoutRules: records.length - withRules },
    status, current, lower, upper, exact: null, estimate: exact, expectedVerdict, expectedRecords, recordCount: records.length, missing,
    label: expectedVerdict !== null ? String(expectedVerdict) : `${lower}${upper === null ? '+' : `-${upper}`} estimated${missing ? `; ${missing} record${missing === 1 ? '' : 's'} missing` : ''}`,
    issue,
    detail,
  };
}

function applyHpAudit(derivedStats, hp) {
  const rows = Array.isArray(derivedStats?.rows) ? [...derivedStats.rows] : [];
  const index = rows.findIndex(row => row?.id === 'hp-max' || row?.type === 'hp');
  const row = {
    ...(index >= 0 ? rows[index] : {}),
    id: 'hp-max', label: 'Hit Points', type: 'hp',
    expected: hp.expectedVerdict ?? hp.lower,
    expectedValue: hp.expectedVerdict ?? hp.lower,
    expectedLabel: hp.label,
    current: hp.current,
    currentValue: hp.current,
    currentLabel: Number.isFinite(hp.current) ? String(hp.current) : 'Unknown',
    status: hp.status,
    issue: hp.issue,
    detail: hp.detail,
    needsAttention: hp.status === 'issue',
    targetTab: 'abilities',
    sheetAnchor: 'derived-class-stats',
  };
  if (index >= 0) rows[index] = row; else rows.unshift(row);
  const issueCount = rows.filter(item => item?.needsAttention === true).length;
  return {
    ...derivedStats,
    rows,
    hpAudit: hp,
    issueCount,
    hasIssues: issueCount > 0,
    status: rows.some(item => item?.status === 'issue') ? 'needs-attention' : rows.some(item => ['warning', 'unavailable', 'unverifiable'].includes(item?.status)) ? 'review' : 'ok',
    expected: { ...(derivedStats?.expected || {}), hpMaxKnownMinimum: hp.lower, hpMaxKnownMaximum: hp.upper, hpMaxExact: hp.expectedVerdict },
    current: { ...(derivedStats?.current || {}), hpMax: hp.current },
    warnings: rows.filter(item => item?.needsAttention && item?.issue).map(item => `${item.label}: ${item.issue}`),
  };
}

function progressionGaps(summaries = []) {
  const gaps = [];
  const unaudited = {};
  for (const summary of summaries) {
    if (!summary.resolved) continue;
    for (let level = 1; level <= summary.level; level += 1) {
      const entry = getClassLevelProgressionEntry(summary.model, level);
      if (!entry) {
        gaps.push({ code: 'class-progression-missing', classId: summary.classId, className: summary.className, classLevel: level });
        continue;
      }
      for (const feature of Array.isArray(entry.features) ? entry.features : []) {
        const type = String(feature?.type || '').toLowerCase();
        if (type.endsWith('_choice') && !AUDITED_CHOICE_TYPES.includes(type)) unaudited[type] = (unaudited[type] || 0) + 1;
      }
    }
  }
  return { gaps, unaudited };
}

export class ProgressionEntitlementCalculator {
  constructor({ helpers = {} } = {}) {
    this.helpers = helpers;
  }

  calculate(actor, options = {}) {
    const classRead = readActorClassLevels(actor);
    const classAuthority = {
      status: classRead.status,
      levelSource: classRead.levelSource,
      conflicts: classRead.conflicts,
      unresolved: classRead.unresolved,
    };
    const established = classRead.status === 'ok';
    const internalClassSummaries = established ? toSummaries(classRead.rows) : [];
    const totalLevel = established ? classRead.totalLevel : 0;
    const totalHeroicLevel = established ? classRead.totalHeroicLevel : 0;
    const hasNonheroic = internalClassSummaries.some(isNonheroic);
    const { gaps, unaudited } = established ? progressionGaps(internalClassSummaries) : { gaps: [], unaudited: {} };

    // Fail closed: with no established class authority NO entitlement is derived.
    const call = (name, ...args) => (established && typeof this.helpers[name] === 'function' ? this.helpers[name](...args) : []);
    const abilityIncreases = call('buildAbilityIncreaseSlots', actor, totalLevel, internalClassSummaries);
    const generalFeats = call('buildGeneralFeatSlots', actor, totalHeroicLevel);
    const classChoices = call('buildClassChoiceSlots', actor, internalClassSummaries);
    const classFeats = classChoices.filter(slot => slot?.type === 'class-feat');
    const classTalents = classChoices.filter(slot => slot?.type === 'class-talent');
    const heroicTalents = [...(classTalents.length > 0 || totalHeroicLevel <= 0 ? [] : call('buildHeroicTalentSlots', actor, totalHeroicLevel))];
    // House-rule entitlements are separate from ordinary slots (see _buildHouseRuleEntitlements).
    const houseRule = established && typeof this.helpers.buildHouseRuleEntitlements === 'function'
      ? this.helpers.buildHouseRuleEntitlements(actor, internalClassSummaries, classTalents)
      : { slots: [], notes: [], missingGrants: [] };
    if (houseRule.slots.length && typeof this.helpers.fillHouseRuleSlots === 'function') this.helpers.fillHouseRuleSlots(actor, houseRule.slots);
    heroicTalents.push(...houseRule.slots);
    const baseDerivedStats = established && typeof this.helpers.buildDerivedStatsAudit === 'function'
      ? this.helpers.buildDerivedStatsAudit(actor, internalClassSummaries, { totalLevel, totalHeroicLevel })
      : { status: 'unavailable', rows: [], hasIssues: false, issueCount: 0 };
    const hpDerivedStats = established
      ? applyHpAudit(baseDerivedStats, buildHpAudit(actor, internalClassSummaries, totalHeroicLevel))
      : baseDerivedStats;
    // Domain adapters (read-only, one canonical authority each); a thrown adapter is diagnostics, never a character error.
    // Adapters are independent of class establishment (a custom droid may have no class); each decides applicability itself.
    const derivedStats = applyDomainAdapterRows(hpDerivedStats, runDomainAdapters(actor));

    return {
      kind: 'swse-progression-entitlement-plan',
      version: 5,
      actorId: actor?.id || null,
      actorName: actor?.name || 'Actor',
      totalLevel,
      totalHeroicLevel,
      mode: options.mode || 'actor-audit',
      classAuthority,
      hasNonheroic,
      internalClassSummaries,
      classSummaries: internalClassSummaries.map(summary => (
        typeof this.helpers.toPublicClassSummary === 'function'
          ? this.helpers.toPublicClassSummary(summary)
          : { itemId: summary.itemId || null, classId: summary.classId || '', className: summary.className || summary.classId || 'Unknown', level: Number(summary.level || 0) || 0 }
      )),
      slots: { abilityIncreases, generalFeats, heroicTalents, classChoices, classFeats, classTalents, derivedStats },
      derivedStats,
      houseRule: { notes: houseRule.notes, missingGrants: houseRule.missingGrants },
      diagnostics: {
        layer: 'entitlement-calculator',
        delegated: true,
        phase: 9,
        classAuthority,
        progressionGaps: gaps,
        unauditedChoiceTypes: unaudited,
        classLevelSources: internalClassSummaries.map(summary => ({
          classId: summary.classId || '',
          className: summary.className || '',
          level: Number(summary.level || 0) || 0,
          sources: Array.from(new Set(Array.isArray(summary.sources) ? summary.sources : [])),
          classProgressionSource: 'class-level-reader',
          cadenceFallback: false,
        })),
        derivedStats: {
          status: derivedStats?.status || 'unavailable',
          rowCount: Array.isArray(derivedStats?.rows) ? derivedStats.rows.length : 0,
          issueCount: Number(derivedStats?.issueCount || 0) || 0,
          source: 'class-model-plus-hp-ledger',
        },
      },
    };
  }
}

export default ProgressionEntitlementCalculator;

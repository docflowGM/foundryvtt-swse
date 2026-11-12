/**
 * Reconciliation findings (Phase 6: actionable, advisory character repair assistant).
 *
 * Pure functions over the reconciliation report. A FINDING is a demonstrable mechanical
 * discrepancy - never "no certification exists" and never "you did not use the wizard".
 * Every finding has a STABLE IDENTITY so it can be ignored persistently:
 *
 *   slot:<slot id>                                  e.g. slot:scout-1-class-talent-1
 *   derived:<row id>:<expected>:<actual>            e.g. derived:bab:4:2
 *
 * The identity of a derived discrepancy embeds the expected and actual values, so if the character
 * levels up and the expected BAB changes, the discrepancy is a NEW finding and legitimately
 * reappears; if nothing changed it stays suppressed.
 *
 * Ignoring a finding only records it in `flags.swse.reconciliationIgnored`. It never changes
 * statistics or items. Resolving is a separate, controlled action (reconciliation-resolvers.js).
 */

export const IGNORE_FLAG_PATH = 'flags.swse.reconciliationIgnored';
export const MAX_IGNORED = 200;

const SLOT_GROUPS = Object.freeze([
  ['abilityIncreases', 'MISSING_ABILITY_INCREASE'],
  ['generalFeats', 'MISSING_GENERAL_FEAT'],
  ['classFeats', 'MISSING_CLASS_FEAT'],
  ['heroicTalents', 'MISSING_HEROIC_TALENT'],
  ['classTalents', 'MISSING_CLASS_TALENT'],
]);

const CODE_FOR_ROW = Object.freeze({
  bab: 'BAB_MISMATCH',
  'fortitude-class-defense': 'DEFENSE_MISMATCH',
  'reflex-class-defense': 'DEFENSE_MISMATCH',
  'will-class-defense': 'DEFENSE_MISMATCH',
  'hp-max': 'HP_BELOW_MINIMUM',
});

function openCount(slot) {
  return Number(slot?.openCount ?? (slot?.status === 'open' ? slot?.count : 0)) || 0;
}

function slotFinding(slot, code) {
  const n = openCount(slot);
  if (slot.houseRule) code = 'MISSING_HOUSE_RULE_TALENT';
  const action = slot.primaryAction || slot.remediation?.primaryAction || null;
  return {
    id: `slot:${slot.id}`,
    subject: `slot:${slot.id}`,
    code,
    severity: 'missing',
    title: slot.label || 'Progression selection',
    explanation: slot.houseRule
      ? 'An enabled house rule (Talent Every Level with the extra level-1 talent) provides an additional talent selection that is not accounted for. It is separate from your ordinary talent selections.'
      : `Your class progression indicates ${n > 1 ? `${n} selections` : 'a selection'} here (${slot.label || slot.source || 'progression choice'}) that ${n > 1 ? 'are' : 'is'} not accounted for. You may have an unspent selection, or it may have been granted another way.`,
    expected: Number(slot.count || n) || n,
    actual: Number(slot.filledCount || 0) || 0,
    source: 'canonical-class-progression',
    resolve: action
      ? {
        kind: 'open-step',
        label: action.label || 'Choose',
        dataset: {
          stepId: action.stepId || '', slotId: slot.id || '', slotType: slot.type || '',
          classId: slot.classId || '', className: slot.className || '',
          classLevel: Number(slot.classLevel || 0) || 0, characterLevel: Number(slot.characterLevel || 0) || 0,
        },
      }
      : { kind: 'none', label: '' },
    ignorable: true,
  };
}

function derivedFinding(row) {
  const code = CODE_FOR_ROW[row.id] || 'DERIVED_STAT_MISMATCH';
  const expected = row.expected ?? row.expectedValue ?? null;
  const actual = row.current ?? row.currentValue ?? null;
  const isHp = code === 'HP_BELOW_MINIMUM';
  return {
    id: `derived:${row.id}:${expected}:${actual}`,
    subject: `derived:${row.id}`,
    code,
    severity: 'invalid',
    title: row.label || 'Derived statistic',
    explanation: isHp
      ? `${row.issue || 'Your maximum HP is lower than expected.'} Review your hit points or level-up history. No automatic correction is offered: the stored maximum can include rolled hit points and bonuses, and the HP rules code and this check use different formulas.`
      : (row.issue || `${row.label || 'This statistic'} does not match your class progression.`),
    expected,
    actual,
    source: 'canonical-class-progression',
    // A repair is offered only when the system can PROVE it yields the correct result. BAB / defense come from the
    // one canonical recalculation. Max HP does not qualify yet (see docs: ActorEngine.recomputeHP and the history-based
    // audit use different formulas), so it is review + ignore only.
    resolve: isHp
      ? { kind: 'none', label: '', reviewOnly: true }
      : { kind: 'recalc', label: 'Recalculate' },
    ignorable: true,
  };
}

/** @returns {Array<object>} findings for every demonstrable, actionable discrepancy in the report. */
export function buildFindings(report) {
  const findings = [];
  const slots = report?.slots || {};
  for (const [group, code] of SLOT_GROUPS) {
    for (const slot of Array.isArray(slots[group]) ? slots[group] : []) {
      if (slot?.status === 'open' && openCount(slot) > 0 && slot.id) findings.push(slotFinding(slot, code));
    }
  }
  // typed auxiliary choices (force secrets, techniques, powers, medical secrets, maneuvers)
  for (const slot of Array.isArray(slots.classChoices) ? slots.classChoices : []) {
    if (slot?.type === 'class-feat' || slot?.type === 'class-talent') continue;
    if (slot?.status === 'open' && openCount(slot) > 0 && slot.id) {
      findings.push(slotFinding(slot, `MISSING_${String(slot.type || 'CHOICE').toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`));
    }
  }
  // Free (automatic) house-rule grants the GM has enabled that this character does not own. The grant is a specific
  // item, never a free selection, so it is reported on its own and never consumes or hides an ordinary entitlement.
  for (const grant of Array.isArray(report?.houseRule?.missingGrants) ? report.houseRule.missingGrants : []) {
    findings.push({
      id: `houserule-grant:${grant.setting}`,
      subject: `houserule-grant:${grant.setting}`,
      code: 'MISSING_HOUSE_RULE_GRANT',
      severity: 'missing',
      title: `House rule: free ${grant.name}`,
      explanation: `Your GM enabled a house rule that gives every character ${grant.name}, but this character does not have it.`,
      expected: 1,
      actual: 0,
      source: `houserule:${grant.setting}`,
      resolve: { kind: 'grant-house-rule', label: 'Add', dataset: { settingKey: grant.setting } },
      ignorable: true,
    });
  }
  for (const row of Array.isArray(report?.derivedStats?.rows) ? report.derivedStats.rows : []) {
    if (row?.needsAttention === true && row.id) findings.push(derivedFinding(row));
  }
  return findings;
}

export function readIgnored(actor) {
  const raw = actor?.flags?.swse?.reconciliationIgnored;
  return Array.isArray(raw) ? raw.filter(r => r && typeof r.id === 'string') : [];
}

/**
 * Split findings by the actor's ignore records.
 *  visible : not ignored  -> drives the header `!`
 *  ignored : currently-present findings the player dismissed
 *  stale   : ignore records whose discrepancy no longer exists (resolved or materially changed)
 */
export function partitionFindings(findings, ignoredRecords = []) {
  const byId = new Map(ignoredRecords.map(r => [r.id, r]));
  const visible = [];
  const ignored = [];
  const present = new Set();
  for (const finding of findings) {
    present.add(finding.id);
    const record = byId.get(finding.id);
    if (record) ignored.push({ ...finding, ignoredRecord: record });
    else visible.push(finding);
  }
  const stale = ignoredRecords.filter(r => !present.has(r.id));
  return { visible, ignored, stale };
}

/** Idempotent: ignoring an already-ignored id changes nothing. Returns the array to persist. */
export function addIgnored(existing, finding, { userId = null, userName = null, now = new Date().toISOString() } = {}) {
  const list = Array.isArray(existing) ? existing.filter(r => r && r.id !== finding.id) : [];
  const prior = Array.isArray(existing) ? existing.find(r => r?.id === finding.id) : null;
  list.push(prior || {
    id: finding.id,
    code: finding.code,
    expected: finding.expected ?? null,
    actual: finding.actual ?? null,
    source: finding.source || null,
    ignoredBy: userId,
    ignoredByName: userName,
    ignoredAt: now,
  });
  return list.slice(-MAX_IGNORED);
}

/** Idempotent restore (also used to prune stale records). */
export function removeIgnored(existing, ids) {
  const drop = new Set(Array.isArray(ids) ? ids : [ids]);
  return (Array.isArray(existing) ? existing : []).filter(r => r && !drop.has(r.id));
}

export default { buildFindings, partitionFindings, addIgnored, removeIgnored, readIgnored, IGNORE_FLAG_PATH };

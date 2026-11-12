/**
 * Progression Reconciliation Report Builder
 *
 * Phase 4 keeps the ambiguous-crediting behavior from Phase 2 and adds a
 * serializable remediation-action skeleton. Reports now say not only what is
 * missing/ambiguous/overfilled, but also what UI action can resolve it.
 */
import { ProgressionTimelineBuilder } from './progression-timeline-builder.js';

/**
 * Rule deferrals. Each entry corresponds to a DEFERRED_RULES_REVIEW item in
 * docs/audits/swse-rules-decisions-pending.md. While a ruling is pending, an
 * affected slot that would be "missing" is reported as unverifiable instead,
 * so a pending rules question can never raise a player-facing alert.
 */
const RULE_DEFERRALS = Object.freeze({
  'RECON-001': 'Multiclass talent entitlement (class-table choices vs heroic cadence) is pending a rules ruling.',
  'RECON-002': 'Droid ability-increase count is pending a rules ruling.',
  'RECON-003': 'Nonheroic and mixed-actor entitlement level basis is pending a rules ruling.',
});

const SLOT_GROUP_KEYS = Object.freeze(['abilityIncreases', 'generalFeats', 'heroicTalents', 'classFeats', 'classTalents']);

export class ProgressionReconciliationReportBuilder {
  build(actor, entitlementPlan = {}, ownership = {}, _options = {}) {
    // Levels and class summaries come from the entitlement plan (class-level-reader). This
    // layer does NOT re-derive them.
    const totalLevel = Number(entitlementPlan?.totalLevel || 0) || 0;
    const totalHeroicLevel = Number(entitlementPlan?.totalHeroicLevel || 0) || 0;
    const classSummaries = Array.isArray(entitlementPlan?.classSummaries) ? entitlementPlan.classSummaries.map(row => ({ ...row })) : [];
    const rawSlots = entitlementPlan?.slots || {};
    const slots = {
      abilityIncreases: this._cloneSlots(rawSlots.abilityIncreases),
      generalFeats: this._cloneSlots(rawSlots.generalFeats),
      heroicTalents: this._cloneSlots(rawSlots.heroicTalents),
      classChoices: this._cloneSlots(rawSlots.classChoices),
      classFeats: this._cloneSlots(rawSlots.classFeats),
      classTalents: this._cloneSlots(rawSlots.classTalents),
      derivedStats: this._cloneDerivedStats(rawSlots.derivedStats || entitlementPlan?.derivedStats),
    };

    const engineFindings = this._collectEngineFindings(entitlementPlan, ownership);

    this._dropFutureSlots(slots, totalLevel);
    const deferredRules = this._applyDeferredRules(slots, actor, entitlementPlan);
    this._markProvenMissing(slots, entitlementPlan?.evidence?.inconsistencies);
    this._applyUnattributedCrediting(slots, ownership);
    this._attachRemediationActions(slots);

    const report = {
      kind: 'swse-actor-progression-reconciliation',
      version: 9,
      actorId: actor?.id || entitlementPlan?.actorId || null,
      actorName: actor?.name || entitlementPlan?.actorName || 'Actor',
      totalLevel,
      totalHeroicLevel,
      classSummaries,
      slots,
      derivedStats: slots.derivedStats,
      ownership: this._publicOwnershipSummary(ownership),
      classification: this._buildClassificationSummary(slots, ownership),
      engineFindings,
      deferredRules,
      coverage: { unauditedChoiceTypes: entitlementPlan?.diagnostics?.unauditedChoiceTypes || {} },
      evidence: entitlementPlan?.evidence || { counts: { certified: 0, stamped: 0, none: 0, untrustedRecords: 0 }, inconsistencies: [], certifiedUnmatched: [], untrustedRecords: [] },
      layers: {
        entitlements: entitlementPlan?.diagnostics || { layer: 'entitlement-calculator' },
        ownership: ownership?.diagnostics || { layer: 'ownership-classifier' },
        report: { layer: 'reconciliation-report-builder', phase: 10, remediationActions: true, timelineBuilder: true },
      },
      warnings: [],
      status: 'ok',
    };

    this._normalizeDerivedStatsAudit(report);

    const counts = this._rollupCounts(report);
    report.rollup = {
      playerActionable: counts.missing > 0 || counts.invalid > 0,
      gmDiagnostic: engineFindings.length > 0,
      counts,
    };
    report.status = report.rollup.playerActionable ? 'needs-attention' : (report.rollup.gmDiagnostic ? 'engine-failure' : 'ok');

    if (counts.missing > 0) report.warnings.push(`${counts.missing} missing progression choice${counts.missing === 1 ? '' : 's'}`);
    if (counts.invalid > 0) report.warnings.push(`${counts.invalid} derived class stat${counts.invalid === 1 ? '' : 's'} disagree with class progression`);

    report.timeline = new ProgressionTimelineBuilder().build(report, { source: 'report-builder' });
    report.layers.timeline = report.timeline?.diagnostics || { layer: 'progression-timeline-builder' };

    return report;
  }

  _collectEngineFindings(plan = {}, ownership = {}) {
    const findings = [];
    const authority = plan?.classAuthority || {};
    for (const conflict of Array.isArray(authority.conflicts) ? authority.conflicts : []) {
      findings.push({ code: conflict.code, severity: 'engine', message: `Class levels disagree (${conflict.code}).`, detail: conflict });
    }
    for (const entry of Array.isArray(authority.unresolved) ? authority.unresolved : []) {
      findings.push({ code: entry.code, severity: 'engine', message: `Class "${entry.className}" is not in the class registry; its entitlements cannot be derived.`, detail: entry });
    }
    for (const gap of Array.isArray(plan?.diagnostics?.progressionGaps) ? plan.diagnostics.progressionGaps : []) {
      findings.push({ code: gap.code, severity: 'engine', message: `${gap.className} level ${gap.classLevel} has no class progression entry.`, detail: gap });
    }
    // Progression-evidence integrity (GM diagnostics only; never worded as a character error).
    const evidence = plan?.evidence || {};
    for (const entry of Array.isArray(evidence.inconsistencies) ? evidence.inconsistencies : []) {
      if (entry.code === 'certified-item-removed') continue; // surfaces as the resulting missing slot + an overlay note
      findings.push({ code: entry.code, severity: 'engine', message: `A certified grant (${entry.name || entry.itemId}) no longer matches current class/level state.`, detail: entry });
    }
    for (const entry of Array.isArray(evidence.certifiedUnmatched) ? evidence.certifiedUnmatched : []) {
      findings.push({ code: 'certified-grant-unmatched', severity: 'engine', message: `Certified grant "${entry.name}" has no corresponding current entitlement slot; it is kept as legal and not reported as extra.`, detail: entry });
    }
    for (const entry of Array.isArray(evidence.untrustedRecords) ? evidence.untrustedRecords : []) {
      findings.push({ code: 'progression-record-untrusted', severity: 'engine', message: `Progression session ${entry.sessionId || '(unknown)'} is recorded as ${entry.outcome}; its grants are not treated as certified.`, detail: entry });
    }
    for (const layer of [plan?.diagnostics, ownership?.diagnostics]) {
      if (layer?.status === 'failed-soft') {
        findings.push({ code: 'layer-failed', severity: 'engine', message: `Reconciliation layer "${layer.layer || 'unknown'}" failed.`, detail: { layer: layer.layer, message: layer.message || '' } });
      }
    }
    return findings;
  }

  /**
   * A trusted certification that lists an awarded item which is no longer on the actor PROVES that
   * entitlement existed (the certified manifest said so) and is now unfilled. That proof does not
   * depend on any pending cadence ruling, so such a slot is `open` (missing), not deferred.
   */
  _provenRemovedKeys(inconsistencies = []) {
    const keys = new Set();
    for (const entry of Array.isArray(inconsistencies) ? inconsistencies : []) {
      if (entry?.code !== 'certified-item-removed' && entry?.code !== 'certified-item-replaced') continue;
      if (entry.slotKind === 'class' && entry.classId) keys.add(`${entry.itemType}:class:${entry.classId}:${entry.classLevel}`);
      else if (entry.slotKind === 'general') keys.add(`${entry.itemType}:general:${entry.characterLevel}`);
    }
    return keys;
  }

  _slotProvenKey(slot = {}) {
    const itemType = slot.type === 'class-feat' || slot.type === 'general-feat' ? 'feat' : 'talent';
    if (slot.type === 'class-feat' || slot.type === 'class-talent') return `${itemType}:class:${slot.classId}:${slot.classLevel}`;
    return `${itemType}:general:${slot.characterLevel}`;
  }

  _markProvenMissing(slots = {}, inconsistencies = []) {
    const proven = this._provenRemovedKeys(inconsistencies);
    if (!proven.size) return;
    for (const group of ['generalFeats', 'heroicTalents', 'classFeats', 'classTalents']) {
      for (const slot of slots[group] || []) {
        if (slot?.status !== 'unverifiable' || !slot.rulesDeferred) continue;
        if (!proven.has(this._slotProvenKey(slot))) continue;
        slot.status = 'open';
        slot.openCount = Number(slot.unverifiableCount || slot.count || 1) || 1;
        slot.unverifiableCount = 0;
        slot.provenBy = 'certified-grant-removed';
        delete slot.rulesDeferred;
        slot.unverifiableReason = '';
      }
    }
    this._syncClassChoiceSlots(slots);
  }

  /** Pending-ruling slots may not read as "missing". See RULE_DEFERRALS. */
  _applyDeferredRules(slots = {}, actor = {}, plan = {}) {
    const isDroid = actor?.type === 'droid' || actor?.system?.isDroid === true;
    const heroicClasses = (Array.isArray(plan?.classSummaries) ? plan.classSummaries : []).filter(row => row.isNonheroic !== true);
    const rulesFor = {
      abilityIncreases: [isDroid ? 'RECON-002' : null, plan?.hasNonheroic ? 'RECON-003' : null],
      generalFeats: [plan?.hasNonheroic ? 'RECON-003' : null],
      heroicTalents: [plan?.hasNonheroic ? 'RECON-003' : null, heroicClasses.length > 1 ? 'RECON-001' : null],
      classTalents: [heroicClasses.length > 1 ? 'RECON-001' : null],
    };
    const applied = new Set();
    for (const [group, ids] of Object.entries(rulesFor)) {
      const active = ids.filter(Boolean);
      if (!active.length) continue;
      for (const slot of slots[group] || []) {
        if (slot?.status !== 'open') continue;
        const n = Number(slot.openCount ?? slot.count ?? 1) || 1;
        slot.status = 'unverifiable';
        slot.unverifiableCount = n;
        slot.openCount = 0;
        slot.rulesDeferred = active;
        slot.unverifiableReason = active.map(id => RULE_DEFERRALS[id]).join(' ');
        active.forEach(id => applied.add(id));
      }
    }
    this._syncClassChoiceSlots(slots);
    return Array.from(applied).map(id => ({ id, reason: RULE_DEFERRALS[id] }));
  }

  _rollupCounts(report = {}) {
    const slots = report.slots || {};
    const otherChoices = (Array.isArray(slots.classChoices) ? slots.classChoices : []).filter(slot => slot?.type !== 'class-feat' && slot?.type !== 'class-talent');
    const sum = (status) => SLOT_GROUP_KEYS.reduce((total, group) => total + this._slotCount(slots[group], status), 0) + this._slotCount(otherChoices, status);
    const derivedRows = Array.isArray(report.derivedStats?.rows) ? report.derivedStats.rows : [];
    return {
      missing: sum('open'),
      invalid: derivedRows.filter(row => row?.needsAttention === true).length,
      unverifiable: sum('unverifiable') + derivedRows.filter(row => row?.needsAttention !== true && ['warning', 'unavailable', 'unverifiable'].includes(row?.status)).length,
      extra: sum('overfilled'),
      engine: Array.isArray(report.engineFindings) ? report.engineFindings.length : 0,
    };
  }

  _dropFutureSlots(slots = {}, actorLevel = 0) {
    if (!actorLevel || actorLevel <= 0) return;
    const withinLevel = slot => {
      const level = this._positiveInteger(slot?.characterLevel ?? slot?.level ?? slot?.sourceLevel);
      return level <= 0 || level <= actorLevel;
    };
    for (const key of ['abilityIncreases', 'generalFeats', 'heroicTalents', 'classChoices', 'classFeats', 'classTalents']) {
      if (Array.isArray(slots[key])) slots[key] = slots[key].filter(withinLevel);
    }
  }

  _positiveInteger(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
  }

  _cloneSlots(slots = []) {
    return (Array.isArray(slots) ? slots : []).map(slot => ({
      ...slot,
      selections: Array.isArray(slot?.selections) ? [...slot.selections] : slot?.selections,
    }));
  }

  _cloneDerivedStats(value = {}) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      kind: source.kind || 'swse-derived-class-stat-audit',
      status: source.status || 'unavailable',
      hasIssues: source.hasIssues === true,
      issueCount: Number(source.issueCount || 0) || 0,
      expected: source.expected && typeof source.expected === 'object' ? { ...source.expected } : {},
      current: source.current && typeof source.current === 'object' ? { ...source.current } : {},
      rows: (Array.isArray(source.rows) ? source.rows : []).map(row => ({
        ...row,
        expected: row?.expected && typeof row.expected === 'object' ? { ...row.expected } : row?.expected,
        current: row?.current && typeof row.current === 'object' ? { ...row.current } : row?.current,
        source: row?.source && typeof row.source === 'object' ? { ...row.source } : row?.source,
        actions: Array.isArray(row?.actions) ? row.actions.map(action => ({ ...action })) : [],
      })),
      classBreakdown: (Array.isArray(source.classBreakdown) ? source.classBreakdown : []).map(row => ({ ...row })),
      warnings: Array.isArray(source.warnings) ? [...source.warnings] : [],
    };
  }

  _normalizeDerivedStatsAudit(report = {}) {
    const audit = report?.derivedStats;
    if (!audit || typeof audit !== 'object' || !Array.isArray(audit.rows)) return;

    const totalLevel = Math.max(0, Number(report.totalLevel || report.totalHeroicLevel || 0) || 0);
    // Hit Points are evaluated once (ProgressionEntitlementCalculator.buildHpAudit); this layer never rewrites that verdict.
    const babRow = audit.rows.find(row => row?.id === 'bab' || row?.type === 'bab');
    // Never touch an already-"unavailable" row: canonical class authority
    // could not resolve BAB for at least one contributing class, and that
    // must never be recomputed/relabeled into a numeric "+N" — not by
    // capping a (fabricated) expected value to totalLevel, and not by the
    // current-vs-expected comparison below silently flipping status back to
    // "ok" because neither of its numeric branches matched a non-finite
    // (unavailable) expected value.
    if (babRow && totalLevel > 0 && !['unavailable', 'unverifiable'].includes(babRow.status)) {
      const expectedRaw = babRow.expected ?? babRow.expectedValue;
      const rawExpected = expectedRaw === null || expectedRaw === undefined || expectedRaw === '' ? NaN : Number(expectedRaw);
      const currentRaw = babRow.current ?? babRow.currentValue;
      const currentBab = currentRaw === null || currentRaw === undefined || currentRaw === '' ? NaN : Number(currentRaw);
      const cappedExpected = Number.isFinite(rawExpected) ? Math.min(rawExpected, totalLevel) : rawExpected;
      if (Number.isFinite(cappedExpected)) {
        babRow.expected = cappedExpected;
        babRow.expectedValue = cappedExpected;
        babRow.expectedLabel = `+${cappedExpected}`;
        if (audit.expected && typeof audit.expected === 'object') audit.expected.bab = cappedExpected;
      }

      if (Number.isFinite(currentBab)) {
        if (currentBab > totalLevel) {
          babRow.status = 'issue';
          babRow.statusLabel = `BAB cannot exceed total character level ${totalLevel}.`;
          babRow.tone = 'warn';
          babRow.needsAttention = true;
          babRow.issue = `BAB cannot exceed total character level ${totalLevel}.`;
        } else if (Number.isFinite(cappedExpected) && currentBab !== cappedExpected) {
          babRow.status = 'issue';
          babRow.statusLabel = `BAB should be ${cappedExpected >= 0 ? '+' : ''}${cappedExpected} from capped class progression but is ${currentBab >= 0 ? '+' : ''}${currentBab}.`;
          babRow.tone = 'warn';
          babRow.needsAttention = true;
          babRow.issue = babRow.statusLabel;
        } else if (Number.isFinite(cappedExpected)) {
          babRow.status = 'ok';
          babRow.statusLabel = 'OK';
          babRow.tone = 'ok';
          babRow.needsAttention = false;
          babRow.issue = '';
        }
      }
    }

    this._refreshDerivedStatsAuditStatus(audit);
  }

  _refreshDerivedStatsAuditStatus(audit = {}) {
    const rows = Array.isArray(audit.rows) ? audit.rows : [];
    const activeIssues = rows.filter(row => row?.needsAttention === true);
    audit.issueCount = activeIssues.length;
    audit.hasIssues = activeIssues.length > 0;
    audit.status = activeIssues.length > 0
      ? 'needs-attention'
      : (rows.some(row => ['warning', 'unavailable', 'unverifiable'].includes(row?.status)) ? 'review' : 'ok');
    audit.warnings = activeIssues.map(row => `${row?.label || 'Derived stat'}: ${row?.issue || row?.statusLabel || 'Review needed'}`);
  }

  /**
   * Unattributed items (no class identity / no usable provenance) cannot prove that any slot
   * is filled, and they are not extras either. Per kind (feats, talents) they are COUNTED against
   * the still-open slots: that many open slots become `unverifiable`, the rest stay `open`.
   * Which individual slot carries the label is positional, but the counts - and therefore the
   * player-facing roll-up - are independent of item order.
   */
  _applyUnattributedCrediting(slots = {}, ownership = {}) {
    const pools = ownership?.rawPools || {};
    const unattributed = (p) => (p?.classUntagged?.length || 0) + (p?.unknown?.length || 0);
    this._creditUnattributed([slots.classFeats, slots.generalFeats], unattributed(pools.featPools), 'feat');
    this._creditUnattributed([slots.classTalents, slots.heroicTalents], unattributed(pools.talentPools), 'talent');
    this._syncClassChoiceSlots(slots);
  }

  _creditUnattributed(slotGroups = [], budget = 0, kind = 'item') {
    let remaining = Math.max(0, Number(budget) || 0);
    if (!remaining) return;
    for (const group of slotGroups) {
      if (!Array.isArray(group)) continue;
      for (const slot of group) {
        if (!remaining) return;
        const open = Number(slot?.openCount ?? (slot?.status === 'open' ? slot?.count : 0)) || 0;
        if (slot?.status !== 'open' || open <= 0 || slot.provenBy) continue; // proven-missing slots are never absorbed by unattributed items
        const take = Math.min(open, remaining);
        remaining -= take;
        slot.status = 'unverifiable';
        slot.unverifiableCount = take;
        slot.openCount = 0;
        slot.unverifiableReason = `An owned ${kind} has no acquisition provenance, so this slot cannot be shown to be unfilled.`;
      }
    }
  }

  /** Defined on the class itself (previously injected by two competing monkeypatch shims). */
  _attachRemediationActions(slots = {}) {
    for (const value of Object.values(slots || {})) {
      if (!Array.isArray(value)) continue;
      for (const slot of value) this._attachSlotRemediation(slot);
    }
  }

  _attachSlotRemediation(slot = {}) {
    if (!slot || typeof slot !== 'object') return;
    const status = slot.status || 'unknown';
    const stepId = this._stepIdForSlot(slot);
    const base = {
      slotId: slot.id || null,
      slotType: slot.type || '',
      slotLabel: slot.label || '',
      stepId,
      classId: slot.classId || '',
      className: slot.className || '',
      classLevel: Number(slot.classLevel || 0) || 0,
      characterLevel: Number(slot.characterLevel || 0) || 0,
      source: slot.source || '',
    };

    const actions = [];
    if (status === 'open') {
      actions.push({
        ...base,
        action: 'resolve-progression-slot',
        actionType: 'open-progression-step',
        label: this._resolveLabelForSlot(slot),
        title: `Resolve ${slot.label || slot.type || 'progression slot'}`,
        routeId: 'progression',
        route: {
          surface: 'progression',
          stepId,
          currentStep: stepId,
          mode: 'reconcile',
          routeIntent: 'progression-reconciliation',
          entryPoint: 'sheet-audit',
        },
      });
    }

    slot.actions = actions;
    slot.primaryAction = actions[0] || null;
    slot.remediation = {
      status,
      required: actions.length > 0,
      primaryAction: actions[0] || null,
      actions,
    };
  }

  _stepIdForSlot(slot = {}) {
    switch (String(slot?.type || '').toLowerCase()) {
      case 'ability-increase': return 'attribute';
      case 'class-feat': return 'class-feat';
      case 'class-talent': return 'class-talent';
      case 'heroic-talent': return 'general-talent';
      case 'general-feat':
      case 'feat': return 'general-feat';
      case 'talent': return 'general-talent';
      default: return String(slot?.stepId || slot?.type || 'summary');
    }
  }

  _resolveLabelForSlot(slot = {}) {
    switch (String(slot?.type || '').toLowerCase()) {
      case 'ability-increase': return 'Resolve Increase';
      case 'class-feat': return 'Choose Class Feat';
      case 'class-talent': return 'Choose Class Talent';
      case 'heroic-talent': return 'Choose Heroic Talent';
      case 'general-feat':
      case 'feat': return 'Choose Feat';
      default: return 'Resolve';
    }
  }

  _syncClassChoiceSlots(slots = {}) {
    if (!Array.isArray(slots.classChoices)) return;
    const byId = new Map();
    for (const slot of [...(slots.classFeats || []), ...(slots.classTalents || [])]) {
      if (slot?.id) byId.set(slot.id, slot);
    }
    slots.classChoices = slots.classChoices.map(slot => byId.get(slot?.id) || slot);
  }

  _slotCount(slots = [], status) {
    return (Array.isArray(slots) ? slots : [])
      .filter(slot => slot?.status === status)
      .reduce((sum, slot) => {
        if (status === 'open') return sum + (Number(slot?.openCount ?? slot?.count ?? 1) || 0);
        if (status === 'unverifiable') return sum + (Number(slot?.unverifiableCount ?? slot?.count ?? 1) || 0);
        if (status === 'overfilled') return sum + (Number(slot?.overfilledCount ?? 1) || 0);
        return sum + 1;
      }, 0);
  }

  _buildClassificationSummary(slots = {}, ownership = {}) {
    const pools = ownership?.rawPools || {};
    const feats = this._summarizeItems([...(pools.featPools?.classUntagged || []), ...(pools.featPools?.unknown || [])]);
    const talents = this._summarizeItems([...(pools.talentPools?.classUntagged || []), ...(pools.talentPools?.unknown || [])]);
    return {
      // Informational only: unattributed items never raise a player-facing finding on their own.
      required: false,
      unclassifiedFeatCount: feats.length,
      unclassifiedTalentCount: talents.length,
      unclassifiedFeats: feats,
      unclassifiedTalents: talents,
    };
  }

  _publicOwnershipSummary(ownership = {}) {
    return {
      kind: ownership?.kind || 'swse-progression-ownership-classification',
      version: ownership?.version || 2,
      items: ownership?.items || { total: 0, byType: {} },
      featPools: ownership?.featPools || { general: [], class: [], classUntagged: [], unknown: [] },
      talentPools: ownership?.talentPools || { general: [], class: [], classUntagged: [], unknown: [] },
      unclassified: ownership?.unclassified || { feats: [], talents: [] },
    };
  }

  _summarizeItems(items = []) {
    return (Array.isArray(items) ? items : []).map(item => ({
      id: item?.id || item?._id || null,
      name: item?.name || 'Unnamed',
      type: item?.type || 'unknown',
      slotType: item?.system?.slotType || item?.flags?.swse?.slotType || item?.flags?.swse?.progression?.slotType || '',
      source: item?.system?.source || item?.system?.sourceType || item?.flags?.swse?.source || item?.flags?.swse?.progression?.source || '',
      selectionKey: item?.flags?.swse?.progression?.selectionKey || item?.system?.progression?.selectionKey || '',
    }));
  }
}

export default ProgressionReconciliationReportBuilder;
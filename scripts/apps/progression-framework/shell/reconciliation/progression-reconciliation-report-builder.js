/**
 * Progression Reconciliation Report Builder
 *
 * Phase 4 keeps the ambiguous-crediting behavior from Phase 2 and adds a
 * serializable remediation-action skeleton. Reports now say not only what is
 * missing/ambiguous/overfilled, but also what UI action can resolve it.
 */
import { ProgressionTimelineBuilder } from './progression-timeline-builder.js';

export class ProgressionReconciliationReportBuilder {
  build(actor, entitlementPlan = {}, ownership = {}, _options = {}) {
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

    this._applyAmbiguousCrediting(slots, ownership);
    this._attachRemediationActions(slots);

    const report = {
      kind: 'swse-actor-progression-reconciliation',
      version: 8,
      actorId: actor?.id || entitlementPlan?.actorId || null,
      actorName: actor?.name || entitlementPlan?.actorName || 'Actor',
      totalLevel: Number(entitlementPlan?.totalLevel || 0) || 0,
      totalHeroicLevel: Number(entitlementPlan?.totalHeroicLevel || entitlementPlan?.totalLevel || 0) || 0,
      classSummaries: Array.isArray(entitlementPlan?.classSummaries) ? entitlementPlan.classSummaries : [],
      slots,
      derivedStats: slots.derivedStats,
      ownership: this._publicOwnershipSummary(ownership),
      classification: this._buildClassificationSummary(slots, ownership),
      layers: {
        entitlements: entitlementPlan?.diagnostics || { layer: 'entitlement-calculator' },
        ownership: ownership?.diagnostics || { layer: 'ownership-classifier' },
        report: {
          layer: 'reconciliation-report-builder',
          phase: 8,
          ambiguousCrediting: true,
          remediationActions: true,
          classProgressionSource: 'class-compendium-ssot',
          cadenceFallback: false,
          derivedStatsAudit: true,
          derivedStatsSanityCaps: true,
          timelineBuilder: true,
        },
      },
      warnings: [],
      status: 'ok',
    };

    this._normalizeDerivedStatsAudit(report);

    const slotGroups = [
      ['ability score increase', report.slots.abilityIncreases],
      ['general feat', report.slots.generalFeats],
      ['heroic talent', report.slots.heroicTalents],
      ['class feat', report.slots.classFeats],
      ['class talent', report.slots.classTalents],
    ];

    const openCounts = slotGroups.map(([label, groupSlots]) => ({
      label,
      count: this._slotCount(groupSlots, 'open'),
    }));
    const ambiguousCounts = slotGroups.map(([label, groupSlots]) => ({
      label,
      count: this._slotCount(groupSlots, 'ambiguous'),
    }));
    const overfilledCounts = slotGroups.map(([label, groupSlots]) => ({
      label,
      count: this._slotCount(groupSlots, 'overfilled'),
    }));

    const derivedIssueCount = Number(report.derivedStats?.issueCount || 0) || 0;

    if (
      openCounts.some(entry => entry.count > 0)
      || ambiguousCounts.some(entry => entry.count > 0)
      || overfilledCounts.some(entry => entry.count > 0)
      || derivedIssueCount > 0
    ) {
      report.status = 'needs-attention';
    }

    for (const { label, count } of openCounts) {
      if (count > 0) report.warnings.push(`${count} missing ${label}${count === 1 ? '' : 's'}`);
    }
    for (const { label, count } of ambiguousCounts) {
      if (count > 0) report.warnings.push(`${count} unclassified ${label}${count === 1 ? '' : 's'} need classification`);
    }
    for (const { label, count } of overfilledCounts) {
      if (count > 0) report.warnings.push(`${count} extra ${label}${count === 1 ? '' : 's'} detected`);
    }
    if (derivedIssueCount > 0) {
      report.warnings.push(`${derivedIssueCount} derived class stat${derivedIssueCount === 1 ? '' : 's'} need review`);
    }

    report.timeline = new ProgressionTimelineBuilder().build(report, { source: 'report-builder' });
    report.layers.timeline = report.timeline?.diagnostics || { layer: 'progression-timeline-builder' };

    return report;
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
    const hpRow = audit.rows.find(row => row?.id === 'hp-max' || row?.type === 'hp');
    if (hpRow) {
      const currentHp = Number(hpRow.current ?? hpRow.currentValue);
      const expectedHp = Number(hpRow.expected ?? hpRow.expectedValue);
      if (Number.isFinite(currentHp) && Number.isFinite(expectedHp)) {
        if (currentHp >= expectedHp) {
          hpRow.status = 'ok';
          hpRow.statusLabel = 'OK';
          hpRow.tone = 'ok';
          hpRow.needsAttention = false;
          hpRow.issue = '';
          hpRow.detail = 'Current HP is at or above the audited minimum. Campaign HP mode and rolled/custom HP may legally exceed this value.';
        } else {
          hpRow.status = 'issue';
          hpRow.statusLabel = 'Current Hit Points is below the known expected minimum.';
          hpRow.tone = 'warn';
          hpRow.needsAttention = true;
          hpRow.issue = 'Current Hit Points is below the known expected minimum.';
        }
      }
    }

    const babRow = audit.rows.find(row => row?.id === 'bab' || row?.type === 'bab');
    if (babRow && totalLevel > 0) {
      const rawExpected = Number(babRow.expected ?? babRow.expectedValue);
      const currentBab = Number(babRow.current ?? babRow.currentValue);
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
        } else {
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
    const activeIssues = rows.filter(row => row?.needsAttention === true || row?.status === 'issue' || row?.status === 'warning' || row?.status === 'unavailable' || !!row?.issue);
    audit.issueCount = activeIssues.length;
    audit.hasIssues = activeIssues.length > 0;
    audit.status = rows.some(row => row?.status === 'issue')
      ? 'needs-attention'
      : (rows.some(row => row?.status === 'warning' || row?.status === 'unavailable') ? 'review' : 'ok');
    audit.warnings = activeIssues.map(row => `${row?.label || 'Derived stat'}: ${row?.issue || row?.statusLabel || 'Review needed'}`);
  }

  _applyAmbiguousCrediting(slots = {}, ownership = {}) {
    const unknownFeats = this._summarizeItems(ownership?.rawPools?.featPools?.unknown || ownership?.featPools?.unknown || []);
    const unknownTalents = this._summarizeItems(ownership?.rawPools?.talentPools?.unknown || ownership?.talentPools?.unknown || []);

    // A dropped/manual feat without acquisition metadata may satisfy a general
    // feat slot or a class feat slot. Class-specific debt gets first review
    // because it is the most common failure mode after compendium class drops.
    this._markAmbiguousSlots([slots.classFeats, slots.generalFeats], unknownFeats, {
      candidateKind: 'feat',
      reason: 'Owned feat has no reliable acquisition metadata; classify it as a general feat or class feat.',
    });

    // A dropped/manual talent without acquisition metadata may satisfy a heroic
    // talent slot or a class talent slot. Class talent debt gets first review
    // for the same class-drop reason.
    this._markAmbiguousSlots([slots.classTalents, slots.heroicTalents], unknownTalents, {
      candidateKind: 'talent',
      reason: 'Owned talent has no reliable acquisition metadata; classify it as a heroic talent or class talent.',
    });

    this._syncClassChoiceSlots(slots);
  }

  _markAmbiguousSlots(slotGroups = [], candidates = [], { candidateKind = 'item', reason = '' } = {}) {
    const queue = [...(Array.isArray(candidates) ? candidates : [])];
    if (!queue.length) return;

    for (const group of slotGroups) {
      if (!Array.isArray(group) || !queue.length) continue;
      for (const slot of group) {
        if (!queue.length) break;
        const openCount = Number(slot?.openCount ?? (slot?.status === 'open' ? slot?.count : 0)) || 0;
        if (slot?.status !== 'open' || openCount <= 0) continue;
        const candidate = queue.shift();
        slot.status = 'ambiguous';
        slot.openCount = 0;
        slot.ambiguousCount = Math.max(1, Math.min(openCount, Number(slot?.count || 1) || 1));
        slot.classificationRequired = true;
        slot.classificationReason = reason;
        slot.classificationKind = candidateKind;
        slot.ambiguousCandidates = [candidate];
        slot.primaryCandidateId = candidate?.id || null;
        slot.primaryCandidateName = candidate?.name || 'Unclassified item';
        slot.candidateNames = [candidate?.name || 'Unclassified item'];
        slot.selections = [candidate?.name || 'Unclassified item'];
      }
    }
  }


  _attachSlotRemediation(slot = {}) {
    if (!slot || typeof slot !== 'object') return;
    const status = slot.status === 'ambiguous' || slot.classificationRequired ? 'ambiguous' : (slot.status || 'unknown');
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
    } else if (status === 'ambiguous') {
      actions.push({
        ...base,
        action: 'classify-progression-slot',
        actionType: 'classify-existing-item',
        label: 'Classify',
        title: `Classify ${slot.primaryCandidateName || slot.label || 'existing item'}`,
        itemId: slot.primaryCandidateId || null,
        itemName: slot.primaryCandidateName || '',
      });
    } else if (status === 'overfilled') {
      actions.push({
        ...base,
        action: 'review-progression-slot',
        actionType: 'review-extra-item',
        label: 'Review',
        title: `Review ${slot.filledByName || slot.label || 'extra item'}`,
        itemId: slot.filledBy || null,
        itemName: slot.filledByName || '',
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
      .filter(slot => {
        if (status === 'ambiguous') return slot?.status === 'ambiguous' || slot?.classificationRequired;
        return slot?.status === status;
      })
      .reduce((sum, slot) => {
        if (status === 'open') return sum + (Number(slot?.openCount ?? slot?.count ?? 1) || 0);
        if (status === 'ambiguous') return sum + (Number(slot?.ambiguousCount ?? slot?.count ?? 1) || 0);
        if (status === 'overfilled') return sum + (Number(slot?.overfilledCount ?? 1) || 0);
        return sum + 1;
      }, 0);
  }

  _buildClassificationSummary(slots = {}, ownership = {}) {
    const featCandidates = this._summarizeItems(ownership?.rawPools?.featPools?.unknown || ownership?.featPools?.unknown || []);
    const talentCandidates = this._summarizeItems(ownership?.rawPools?.talentPools?.unknown || ownership?.talentPools?.unknown || []);
    const ambiguousSlots = [
      ...(slots.generalFeats || []),
      ...(slots.classFeats || []),
      ...(slots.heroicTalents || []),
      ...(slots.classTalents || []),
    ].filter(slot => slot?.status === 'ambiguous' || slot?.classificationRequired);
    return {
      required: ambiguousSlots.length > 0,
      ambiguousSlotCount: ambiguousSlots.reduce((sum, slot) => sum + (Number(slot?.ambiguousCount ?? slot?.count ?? 1) || 0), 0),
      unclassifiedFeatCount: featCandidates.length,
      unclassifiedTalentCount: talentCandidates.length,
      unclassifiedFeats: featCandidates,
      unclassifiedTalents: talentCandidates,
      ambiguousSlots: ambiguousSlots.map(slot => ({
        id: slot.id || null,
        type: slot.type || '',
        label: slot.label || '',
        source: slot.source || '',
        candidateNames: slot.candidateNames || [],
        reason: slot.classificationReason || '',
      })),
    };
  }

  _publicOwnershipSummary(ownership = {}) {
    return {
      kind: ownership?.kind || 'swse-progression-ownership-classification',
      version: ownership?.version || 1,
      items: ownership?.items || { total: 0, byType: {} },
      featPools: ownership?.featPools || { general: [], class: [], unknown: [] },
      talentPools: ownership?.talentPools || { heroic: [], class: [], unknown: [] },
      unclassified: {
        feats: ownership?.featPools?.unknown || [],
        talents: ownership?.talentPools?.unknown || [],
      },
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
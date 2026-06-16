/**
 * Progression Timeline Builder
 *
 * Builds a level-addressed reconciliation queue from the actor-wide
 * reconciliation report. The audit can remain a ledger, but resolver mode uses
 * this ordered queue to replay missing progression choices as normal steps.
 */

const STEP_ORDER = Object.freeze({
  'hp-gain': 10,
  'ability-increase': 20,
  'general-feat': 30,
  'class-feat': 40,
  'heroic-talent': 50,
  'class-talent': 60,
  'force-power': 70,
  'force-technique': 80,
  'force-secret': 90,
  'medical-secret': 100,
  'starship-maneuver': 110,
  'derived-stat-review': 900,
});

const STEP_ID_BY_TYPE = Object.freeze({
  'ability-increase': 'attribute',
  'general-feat': 'general-feat',
  'class-feat': 'class-feat',
  'heroic-talent': 'general-talent',
  'class-talent': 'class-talent',
  'force-power': 'force-powers',
  'force-technique': 'force-techniques',
  'force-secret': 'force-secrets',
  'medical-secret': 'medical-secrets',
  'starship-maneuver': 'starship-maneuvers',
});

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function clonePlain(value) {
  try {
    return foundry?.utils?.deepClone ? foundry.utils.deepClone(value) : JSON.parse(JSON.stringify(value));
  } catch (_err) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_jsonErr) { return value; }
  }
}

export class ProgressionTimelineBuilder {
  build(report = {}, options = {}) {
    const slots = report?.slots || {};
    const tasks = [];

    this._collectSlotGroup(tasks, slots.abilityIncreases, { bucket: 'abilityIncreases' });
    this._collectSlotGroup(tasks, slots.generalFeats, { bucket: 'generalFeats' });
    this._collectSlotGroup(tasks, slots.classFeats, { bucket: 'classFeats' });
    this._collectSlotGroup(tasks, slots.heroicTalents, { bucket: 'heroicTalents' });
    this._collectSlotGroup(tasks, slots.classTalents, { bucket: 'classTalents' });

    // Derived stat rows are review/repair tasks, not choice picker steps yet.
    // Keep them in the briefing/timeline so players understand why HP/BAB/defense
    // drift exists, but do not convert them into synthetic progression picker
    // descriptors until dedicated resolver steps exist.
    this._collectDerivedStatRows(tasks, report?.derivedStats || slots.derivedStats);

    const sortedTasks = tasks
      .map((task, index) => ({ ...task, orderIndex: index }))
      .sort((a, b) => {
        const levelDelta = (a.characterLevel || 9999) - (b.characterLevel || 9999);
        if (levelDelta) return levelDelta;
        const classDelta = (a.classLevel || 0) - (b.classLevel || 0);
        if (classDelta) return classDelta;
        const orderDelta = (STEP_ORDER[a.type] || 500) - (STEP_ORDER[b.type] || 500);
        if (orderDelta) return orderDelta;
        return a.orderIndex - b.orderIndex;
      });

    const levels = this._groupByLevel(sortedTasks);
    const resolutionSteps = sortedTasks
      .filter(task => task.resolutionStepId)
      .map((task, index) => this._toResolutionStep(task, index));

    return {
      kind: 'swse-progression-reconciliation-timeline',
      version: 1,
      actorId: report?.actorId || null,
      actorName: report?.actorName || 'Actor',
      status: sortedTasks.length ? 'needs-attention' : 'ok',
      taskCount: sortedTasks.length,
      choiceTaskCount: resolutionSteps.length,
      reviewTaskCount: sortedTasks.filter(task => !task.resolutionStepId).length,
      levels,
      tasks: sortedTasks,
      resolutionSteps,
      diagnostics: {
        layer: 'progression-timeline-builder',
        phase: 7,
        source: options.source || 'reconciliation-report',
        levelAddressed: true,
        resolutionModel: 'step-sequence',
      },
    };
  }

  _collectSlotGroup(tasks, slots = [], { bucket = '' } = {}) {
    for (const slot of Array.isArray(slots) ? slots : []) {
      const status = String(slot?.status || '').toLowerCase();
      if (!['open', 'ambiguous'].includes(status)) continue;
      tasks.push(this._taskFromSlot(slot, { bucket }));
    }
  }

  _collectDerivedStatRows(tasks, derivedStats = {}) {
    const rows = Array.isArray(derivedStats?.rows) ? derivedStats.rows : [];
    for (const row of rows) {
      if (row?.needsAttention !== true) continue;
      tasks.push({
        id: `derived-stat-${row.id || normalizeKey(row.label)}`,
        type: 'derived-stat-review',
        status: row.status || 'review',
        label: row.label || 'Derived Stat Review',
        detail: row.issue || row.detail || 'Review derived class statistics.',
        characterLevel: normalizeNumber(row.characterLevel, 0),
        classId: '',
        className: '',
        classLevel: 0,
        levelLabel: 'Derived Stats',
        source: row.source || 'Derived class stat audit',
        resolutionStepId: null,
        targetTab: row.targetTab || 'abilities',
        sheetAnchor: row.sheetAnchor || 'derived-class-stats',
        slot: clonePlain(row),
      });
    }
  }

  _taskFromSlot(slot = {}, { bucket = '' } = {}) {
    const type = this._normalizeSlotType(slot.type);
    const characterLevel = normalizeNumber(slot.characterLevel, normalizeNumber(slot.classLevel, 1));
    const classLevel = normalizeNumber(slot.classLevel, 0);
    const classId = String(slot.classId || '').trim();
    const className = String(slot.className || '').trim();
    const resolutionStepId = STEP_ID_BY_TYPE[type] || null;
    const label = slot.label || this._labelForType(type, { characterLevel, className, classLevel });
    return {
      id: slot.id || `${type}-${characterLevel}-${classId || 'character'}-${classLevel || 0}`,
      type,
      bucket,
      status: slot.status || 'open',
      label,
      detail: slot.detail || slot.source || '',
      characterLevel,
      classId,
      className,
      classLevel,
      levelLabel: slot.levelLabel || (characterLevel ? `Level ${characterLevel}` : ''),
      source: slot.source || '',
      resolutionStepId,
      slotId: slot.id || null,
      slot: clonePlain(slot),
      targetTab: slot.tab || null,
      sheetAnchor: slot.sheetAnchor || null,
    };
  }

  _normalizeSlotType(value) {
    const key = String(value || '').toLowerCase().trim();
    if (key === 'feat') return 'general-feat';
    if (key === 'talent') return 'heroic-talent';
    return key;
  }

  _labelForType(type, { characterLevel = 0, className = '', classLevel = 0 } = {}) {
    const level = characterLevel ? `Level ${characterLevel} ` : '';
    switch (type) {
      case 'ability-increase': return `${level}Ability Increase`.trim();
      case 'general-feat': return `${level}General Feat`.trim();
      case 'class-feat': return `${className || 'Class'} ${classLevel || ''} Class Feat`.trim();
      case 'heroic-talent': return `${level}Heroic Talent`.trim();
      case 'class-talent': return `${className || 'Class'} ${classLevel || ''} Class Talent`.trim();
      default: return `${level}${type || 'Progression Task'}`.trim();
    }
  }

  _groupByLevel(tasks = []) {
    const groups = new Map();
    for (const task of tasks) {
      const key = task.characterLevel > 0 ? `level-${task.characterLevel}` : 'review';
      const existing = groups.get(key) || {
        id: key,
        characterLevel: task.characterLevel || 0,
        label: task.characterLevel > 0 ? `Level ${task.characterLevel}` : 'Review',
        tasks: [],
      };
      existing.tasks.push(task);
      groups.set(key, existing);
    }
    return Array.from(groups.values())
      .sort((a, b) => (a.characterLevel || 9999) - (b.characterLevel || 9999));
  }

  _toResolutionStep(task = {}, index = 0) {
    const stepId = task.resolutionStepId;
    const uniqueStepId = `reconcile-${String(stepId || task.type).replace(/[^a-z0-9_-]/gi, '-')}-${task.characterLevel || 0}-${task.classId || 'character'}-${task.classLevel || 0}-${index + 1}`;
    return {
      id: uniqueStepId,
      stepId: uniqueStepId,
      baseStepId: stepId,
      canonicalStepId: stepId,
      label: task.label || this._labelForType(task.type, task),
      icon: this._iconForType(task.type),
      type: task.type,
      characterLevel: task.characterLevel || 0,
      classId: task.classId || '',
      className: task.className || '',
      classLevel: task.classLevel || 0,
      taskId: task.id,
      slotId: task.slotId || null,
      slotType: this._slotTypeForTask(task),
      source: 'reconciliation-timeline',
      status: task.status || 'open',
      reconciliationContext: {
        source: 'reconciliation-timeline',
        taskId: task.id,
        slotId: task.slotId || null,
        slotType: task.type,
        baseStepId: stepId,
        characterLevel: task.characterLevel || 0,
        classId: task.classId || '',
        className: task.className || '',
        classLevel: task.classLevel || 0,
        label: task.label || '',
        status: task.status || 'open',
        count: Number(task.slot?.count || 0) || undefined,
        openCount: Number(task.slot?.openCount || 0) || undefined,
      },
    };
  }

  _slotTypeForTask(task = {}) {
    switch (task.type) {
      case 'class-feat':
      case 'class-talent': return 'class';
      case 'heroic-talent':
      case 'general-feat': return 'heroic';
      default: return task.type || '';
    }
  }

  _iconForType(type) {
    switch (type) {
      case 'ability-increase': return 'fa-chart-bar';
      case 'general-feat': return 'fa-star';
      case 'class-feat': return 'fa-star-half-alt';
      case 'heroic-talent': return 'fa-gem';
      case 'class-talent': return 'fa-gem';
      default: return 'fa-list-check';
    }
  }
}

export default ProgressionTimelineBuilder;

/**
 * Progression Ledger Reconciliation Hotfix
 *
 * Keeps class-level consumers on the same SSOT during the v2 migration:
 * actor.system.progression.classLevels is authoritative when it totals the
 * actor's character level. Owned class Item levels are synchronized to that
 * ledger so class features, audits, and sheet panels agree.
 */

import { ProgressionReconciliationReportBuilder } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/reconciliation/progression-reconciliation-report-builder.js';

let registered = false;
let syncingActors = false;
const syncingActorIds = new Set();

function normalizeKey(value) {
  return String(value?.name ?? value?.label ?? value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function slugKey(value) {
  return String(value?.name ?? value?.label ?? value ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function actorTotalLevel(actor) {
  return positiveInteger(actor?.system?.level ?? actor?.system?.details?.level ?? actor?.system?.progression?.level);
}

function classItemName(item = {}) {
  return String(item?.system?.className || item?.system?.class_name || item?.system?.name || item?.name || '').trim();
}

function classItemIds(item = {}) {
  return [
    item?.system?.classId,
    item?.system?.id,
    item?.system?.sourceId,
    item?.id,
    item?._id,
    item?.name,
    classItemName(item)
  ].flatMap(value => [normalizeKey(value), slugKey(value)]).filter(Boolean);
}

function normalizeClassLevelEntry(entry = {}, fallbackKey = '', source = 'unknown', priority = 99) {
  const classId = entry?.classId ?? entry?.id ?? entry?.sourceId ?? entry?.class ?? fallbackKey;
  const className = entry?.className ?? entry?.name ?? entry?.class ?? entry?.label ?? fallbackKey ?? classId;
  const level = positiveInteger(entry?.level ?? entry?.levels ?? entry?.classLevel ?? entry?.value ?? entry?.rank);
  if (!level) return null;
  const keys = [classId, className, fallbackKey].flatMap(value => [normalizeKey(value), slugKey(value)]).filter(Boolean);
  if (!keys.length) return null;
  return {
    classId: slugKey(classId || className),
    className: String(className || classId || fallbackKey || '').trim(),
    level,
    keys: Array.from(new Set(keys)),
    source,
    priority
  };
}

function collectClassLedgerRows(actor = {}) {
  const rows = [];
  const addRows = (value, source, priority) => {
    if (!value) return;
    if (Array.isArray(value)) {
      for (const entry of value) {
        const row = normalizeClassLevelEntry(entry, '', source, priority);
        if (row) rows.push(row);
      }
      return;
    }
    if (typeof value === 'object') {
      for (const [key, entry] of Object.entries(value)) {
        const row = normalizeClassLevelEntry(
          entry && typeof entry === 'object' ? { classId: key, className: key, ...entry } : { classId: key, className: key, level: entry },
          key,
          source,
          priority
        );
        if (row) rows.push(row);
      }
    }
  };

  addRows(actor?.system?.progression?.classLevels, 'system.progression.classLevels', 0);
  addRows(actor?.system?.progression?.classes, 'system.progression.classes', 1);
  addRows(actor?.system?.classes, 'system.classes', 2);
  return rows;
}

function mergeLedgerRows(rows = []) {
  const byKey = new Map();
  for (const row of rows) {
    const canonicalKey = row.classId || row.keys[0];
    if (!canonicalKey) continue;
    const existing = byKey.get(canonicalKey);
    if (!existing || row.priority < existing.priority || (row.priority === existing.priority && row.level > existing.level)) {
      byKey.set(canonicalKey, row);
      continue;
    }
    for (const key of row.keys) {
      const aliasExisting = byKey.get(key);
      if (!aliasExisting || row.priority < aliasExisting.priority || (row.priority === aliasExisting.priority && row.level > aliasExisting.level)) {
        byKey.set(key, row);
      }
    }
  }

  const unique = [];
  const seen = new Set();
  for (const row of byKey.values()) {
    const identity = row.classId || row.keys.join('|');
    if (seen.has(identity)) continue;
    seen.add(identity);
    unique.push(row);
  }
  return unique;
}

function buildAuthoritativeLedger(actor = {}) {
  const rawRows = collectClassLedgerRows(actor);
  const rows = mergeLedgerRows(rawRows);
  const total = rows.reduce((sum, row) => sum + row.level, 0);
  const actorLevel = actorTotalLevel(actor);
  if (!rows.length || !actorLevel || total !== actorLevel) return { rows: [], rawRows, total, actorLevel, authoritative: false };
  return { rows, rawRows, total, actorLevel, authoritative: true };
}

function findLedgerRowForItem(item, rows = []) {
  const keys = new Set(classItemIds(item));
  return rows.find(row => row.keys.some(key => keys.has(key))) || null;
}

function classItemLevel(item = {}) {
  return positiveInteger(item?.system?.level ?? item?.system?.levels ?? item?.system?.classLevel ?? item?.system?.rank);
}

async function syncActorClassItemsToLedger(actor, { reason = 'progression-ledger-sync' } = {}) {
  if (!actor || syncingActorIds.has(actor.id)) return false;
  const ledger = buildAuthoritativeLedger(actor);
  if (!ledger.authoritative) return false;

  const classItems = Array.from(actor.items ?? []).filter(item => item?.type === 'class');
  const updates = [];
  for (const item of classItems) {
    const row = findLedgerRowForItem(item, ledger.rows);
    if (!row || classItemLevel(item) === row.level) continue;
    updates.push({
      _id: item.id || item._id,
      'system.level': row.level,
      'system.levels': row.level,
      'system.classLevel': row.level,
      'system.className': item?.system?.className || row.className,
      'system.classId': item?.system?.classId || row.classId,
      'flags.swse.progression.ledgerSynced': true,
      'flags.swse.progression.ledgerSyncReason': reason
    });
  }

  if (!updates.length) return false;
  try {
    syncingActorIds.add(actor.id);
    await actor.updateEmbeddedDocuments('Item', updates);
    console.info('[SWSE Progression Hotfix] Synced class item levels to progression ledger', {
      actorId: actor.id,
      actorName: actor.name,
      updates: updates.map(update => ({ id: update._id, level: update['system.level'] })),
      reason
    });
    return true;
  } catch (err) {
    console.warn('[SWSE Progression Hotfix] Failed to sync class item levels', err);
    return false;
  } finally {
    syncingActorIds.delete(actor.id);
  }
}

function syncAllActorsToLedger() {
  if (syncingActors) return;
  syncingActors = true;
  queueMicrotask(async () => {
    try {
      for (const actor of game?.actors ?? []) {
        await syncActorClassItemsToLedger(actor, { reason: 'ready-ledger-scan' });
      }
    } finally {
      syncingActors = false;
    }
  });
}

function installClassItemLedgerSync() {
  Hooks.once('ready', syncAllActorsToLedger);
  Hooks.on('updateActor', (actor, changed = {}) => {
    if (changed?.system?.progression?.classLevels || changed?.system?.progression?.classes || changed?.system?.classes || changed?.system?.level) {
      void syncActorClassItemsToLedger(actor, { reason: 'actor-update' });
    }
  });
  Hooks.on('createItem', item => {
    if (item?.type === 'class' && item?.parent) void syncActorClassItemsToLedger(item.parent, { reason: 'class-item-create' });
  });
  Hooks.on('updateItem', item => {
    if (item?.type === 'class' && item?.parent && !syncingActorIds.has(item.parent.id)) {
      void syncActorClassItemsToLedger(item.parent, { reason: 'class-item-update' });
    }
  });
}

function remediationForSlot(slot = {}, groupKey = '') {
  const status = String(slot?.status || '').toLowerCase();
  const needsClassification = status === 'ambiguous' || slot?.classificationRequired === true;
  const isOverfilled = status === 'overfilled' || Number(slot?.overfilledCount || 0) > 0;
  const label = needsClassification ? 'Classify' : (isOverfilled ? 'Review extra' : 'Resolve');
  const tab = groupKey === 'abilityIncreases' ? 'abilities' : 'talents';
  const sheetAnchor = groupKey === 'abilityIncreases' ? 'ability-increases' : (String(slot?.type || '').includes('feat') ? 'feat-ledger' : 'talent-ledger');
  const action = {
    action: needsClassification ? 'classify-existing-progression-item' : (isOverfilled ? 'review-overfilled-progression-slot' : 'resolve-open-progression-slot'),
    actionType: needsClassification ? 'classification' : (isOverfilled ? 'review' : 'open-progression-step'),
    label,
    tab,
    sheetAnchor,
    slotId: slot?.id || '',
    stepId: slot?.stepId || slot?.type || groupKey,
    routeId: 'sheet'
  };
  return { primaryAction: action, actions: [action] };
}

function installReportBuilderRemediationShim() {
  const proto = ProgressionReconciliationReportBuilder?.prototype;
  if (!proto || typeof proto._attachRemediationActions === 'function') return;
  proto._attachRemediationActions = function attachRemediationActions(slots = {}) {
    for (const [groupKey, groupSlots] of Object.entries(slots || {})) {
      if (!Array.isArray(groupSlots)) continue;
      for (const slot of groupSlots) {
        if (!slot || typeof slot !== 'object') continue;
        const open = Number(slot.openCount ?? (slot.status === 'open' ? slot.count : 0)) || 0;
        const ambiguous = Number(slot.ambiguousCount ?? ((slot.status === 'ambiguous' || slot.classificationRequired) ? slot.count : 0)) || 0;
        const overfilled = Number(slot.overfilledCount ?? (slot.status === 'overfilled' ? 1 : 0)) || 0;
        if (open <= 0 && ambiguous <= 0 && overfilled <= 0) continue;
        const remediation = remediationForSlot(slot, groupKey);
        slot.remediation = { ...(slot.remediation || {}), ...remediation };
        slot.primaryAction = slot.primaryAction || remediation.primaryAction;
        slot.actions = Array.isArray(slot.actions) && slot.actions.length ? slot.actions : remediation.actions;
      }
    }
  };
}

export function registerProgressionLedgerReconciliationHotfix() {
  if (registered) return false;
  registered = true;
  installReportBuilderRemediationShim();
  installClassItemLedgerSync();
  return true;
}

export default registerProgressionLedgerReconciliationHotfix;

/**
 * Class-level reader for reconciliation (Reconciliation V2, Phase 1).
 *
 * ONE reader of an actor's class levels for every reconciliation layer. It does
 * not invent an authority: it reads the two V2 writers' outputs
 * (system.progression.classLevels, written by level-up, and owned `class`
 * Items, written by chargen and level-up), resolves each class through the
 * canonical registry, and REPORTS a conflict when the two disagree. It never
 * resolves a disagreement by precedence, max, or concatenation, and it never
 * reads legacy shapes (system.classes, system.class, progression.classes).
 *
 * Result statuses:
 *   ok         - levels established (one source, or both sources agree)
 *   empty      - the actor has no class levels recorded anywhere
 *   unresolved - at least one class cannot be resolved by the class registry
 *   conflict   - sources disagree (per class, or against system.level)
 */
import { resolveClassModel } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/class-resolution.js';
import { isNonheroicClassRef } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/nonheroic-class-model.js';
import { normalizeClassKey } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/levelup-event-context.js';

const LEDGER_SOURCE = 'system.progression.classLevels';
const ITEM_SOURCE = 'owned class item';

function positiveInteger(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function actorItems(actor) {
  try { return Array.from(actor?.items ?? []); } catch (_err) { return []; }
}

function resolveRow({ classId, className, level, item = null, source }) {
  const ref = { id: classId, classId, name: className, className };
  const model = resolveClassModel(ref) || null;
  const nonheroic = isNonheroicClassRef(ref) || (model ? isNonheroicClassRef(model) : false);
  const key = normalizeClassKey(model?.id || classId || className);
  return {
    key,
    classId: model?.id || key,
    className: model?.name || className || key,
    level,
    model,
    resolved: !!model,
    item,
    itemId: item?.id || item?._id || null,
    source,
    isNonheroic: nonheroic,
    isPrestige: !nonheroic && model?.prestigeClass === true,
  };
}

function readLedger(actor) {
  const raw = actor?.system?.progression?.classLevels;
  if (!Array.isArray(raw)) return [];
  const rows = [];
  for (const entry of raw) {
    const level = positiveInteger(entry?.level);
    const classId = entry?.classId ?? entry?.id ?? '';
    const className = entry?.class ?? entry?.className ?? entry?.name ?? '';
    if (!level || !(classId || className)) continue;
    rows.push(resolveRow({ classId, className, level, source: LEDGER_SOURCE }));
  }
  return rows;
}

function readItems(actor) {
  const rows = [];
  for (const item of actorItems(actor).filter(entry => entry?.type === 'class')) {
    const level = positiveInteger(item?.system?.level);
    const classId = item?.system?.classId ?? '';
    const className = item?.name ?? '';
    if (!level || !(classId || className)) continue;
    rows.push(resolveRow({ classId, className, level, item, source: ITEM_SOURCE }));
  }
  return rows;
}

function sumLevels(rows) {
  return rows.reduce((sum, row) => sum + row.level, 0);
}

function indexByKey(rows) {
  const map = new Map();
  for (const row of rows) {
    const prior = map.get(row.key);
    if (prior) {
      // Two rows for one class inside a single source is itself a conflict; keep the first, flag it.
      row.duplicateOf = prior.key;
    } else {
      map.set(row.key, row);
    }
  }
  return map;
}

/**
 * @param {Actor} actor
 * @returns {{status:string, rows:Array, conflicts:Array, unresolved:Array, totalLevel:number, totalHeroicLevel:number, levelSource:string|null}}
 */
export function readActorClassLevels(actor) {
  const ledger = readLedger(actor);
  const items = readItems(actor);
  const conflicts = [];

  if (!ledger.length && !items.length) {
    return { status: 'empty', rows: [], conflicts, unresolved: [], totalLevel: 0, totalHeroicLevel: 0, levelSource: null };
  }

  // Duplicate class rows inside one source cannot be summed or de-duplicated without guessing.
  for (const [rows, source] of [[ledger, LEDGER_SOURCE], [items, ITEM_SOURCE]]) {
    const seen = new Set();
    for (const row of rows) {
      if (seen.has(row.key)) conflicts.push({ code: 'duplicate-class-row', classKey: row.key, source });
      seen.add(row.key);
    }
  }

  let rows;
  let levelSource;
  if (ledger.length && items.length) {
    const ledgerIndex = indexByKey(ledger);
    const itemIndex = indexByKey(items);
    const keys = new Set([...ledgerIndex.keys(), ...itemIndex.keys()]);
    for (const key of keys) {
      const a = ledgerIndex.get(key);
      const b = itemIndex.get(key);
      if (!a || !b || a.level !== b.level) {
        conflicts.push({ code: 'ledger-item-mismatch', classKey: key, ledgerLevel: a?.level ?? null, itemLevel: b?.level ?? null });
      }
    }
    // When they agree the item row carries the owned Item reference; the ledger supplies nothing the item lacks.
    rows = [...itemIndex.values()].map(row => ({ ...row, sources: [LEDGER_SOURCE, ITEM_SOURCE] }));
    levelSource = `${LEDGER_SOURCE} + ${ITEM_SOURCE}`;
  } else if (ledger.length) {
    rows = [...indexByKey(ledger).values()].map(row => ({ ...row, sources: [LEDGER_SOURCE] }));
    levelSource = LEDGER_SOURCE;
  } else {
    rows = [...indexByKey(items).values()].map(row => ({ ...row, sources: [ITEM_SOURCE] }));
    levelSource = ITEM_SOURCE;
  }

  const totalLevel = sumLevels(rows);
  const actorLevel = positiveInteger(actor?.system?.level);
  if (actorLevel && actorLevel !== totalLevel) {
    conflicts.push({ code: 'actor-level-mismatch', actorLevel, classTotal: totalLevel });
  }

  const unresolved = rows.filter(row => !row.resolved).map(row => ({ code: 'class-unresolved', classKey: row.key, className: row.className }));

  let status = 'ok';
  if (conflicts.length) status = 'conflict';
  else if (unresolved.length) status = 'unresolved';

  const heroic = rows.filter(row => !row.isNonheroic);
  return {
    status,
    rows,
    conflicts,
    unresolved,
    totalLevel,
    totalHeroicLevel: sumLevels(heroic),
    levelSource,
  };
}

export default readActorClassLevels;

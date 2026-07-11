/**
 * ClassPlanBuilder
 *
 * Domain compiler for progression class mutations.
 *
 * This module is intentionally side-effect free. It does not mutate actors or call
 * ActorEngine; it returns mutation-plan fragments for ProgressionFinalizer to
 * merge, validate, and apply.
 */

import { buildLevelUpEventContext } from '/systems/foundryvtt-swse/scripts/engine/progression/utils/levelup-event-context.js';

function clonePlain(value = {}) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value || {});
  return JSON.parse(JSON.stringify(value || {}));
}

function normalizeClassKey(value = null) {
  return String(value?.id || value?.classId || value?.sourceId || value?.name || value?.className || value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function readClassItemLevel(item) {
  return Number(item?.system?.level ?? item?.system?.levels ?? item?.system?.rank ?? 0) || 0;
}

function sanitizeClassSystemForActor(system = {}, isDroidProgression = false) {
  const clone = clonePlain(system || {});
  if (isDroidProgression) {
    clone.forceSensitive = false;
    clone.force_sensitivity = false;
    clone.forceSensitiveClassFeature = false;
  }
  return clone;
}

function buildClassLevelsAfterLevelUp(actor, clazz, levelContext) {
  const selectedKey = levelContext.selectedClassId || normalizeClassKey(clazz);
  const byKey = new Map();
  for (const item of actor?.items?.filter?.((entry) => entry?.type === 'class') || []) {
    const key = normalizeClassKey(item?.system?.classId || item?.system?.sourceId || item?.name || item?.id);
    if (!key) continue;
    byKey.set(key, {
      class: item.name || key,
      classId: item.system?.classId || key,
      level: readClassItemLevel(item),
    });
  }

  const existing = byKey.get(selectedKey);
  byKey.set(selectedKey, {
    class: levelContext.selectedClassName || clazz?.name || clazz?.className || selectedKey,
    classId: clazz?.id || clazz?.classId || clazz?.sourceId || selectedKey,
    level: levelContext.selectedClassNextLevel || (existing?.level || 0) + 1,
  });

  return Array.from(byKey.values()).filter((entry) => entry.level > 0);
}

function buildClassLevelHistoryAfterLevelUp(actor, clazz, levelContext) {
  const existing = Array.isArray(actor?.system?.progression?.classLevelHistory)
    ? actor.system.progression.classLevelHistory
    : [];
  const entry = {
    characterLevel: levelContext.enteringLevel,
    classId: levelContext.selectedClassId || normalizeClassKey(clazz),
    className: levelContext.selectedClassName || clazz?.name || clazz?.className || null,
    classLevel: levelContext.selectedClassNextLevel || 1,
    classType: levelContext.selectedClassType || null,
    transitionKind: levelContext.prestigeTransition?.transitionKind
      || (levelContext.isNewBaseClass ? 'newBaseClass' : levelContext.isReturningClass ? 'returningClass' : 'newClass'),
    timestamp: new Date().toISOString(),
  };

  const withoutDuplicateLevel = existing.filter((item) => Number(item?.characterLevel) !== Number(entry.characterLevel));
  return [...withoutDuplicateLevel, entry].sort((a, b) => Number(a.characterLevel || 0) - Number(b.characterLevel || 0));
}

function className(clazz) {
  return clazz?.name || clazz?.label || String(clazz);
}

function classSelectionId(clazz, levelContext = null) {
  return clazz?.id || clazz?.sourceId || clazz?.classId || clazz?.name || levelContext?.selectedClassId || null;
}

export class ClassPlanBuilder {
  static build({ actor, sessionState = {}, clazz = null, isDroidProgression = false } = {}) {
    const set = {};
    const add = { items: [] };
    const update = { items: [] };
    if (!clazz) return { set, add, update, context: null };

    const classSystemForActor = sanitizeClassSystemForActor(clazz.system || {}, isDroidProgression);
    const classSelectionForActor = isDroidProgression && clazz && typeof clazz === 'object'
      ? { ...clazz, system: classSystemForActor, forceSensitive: false }
      : clazz;
    const sessionId = sessionState.sessionId || 'unknown';

    if (sessionState.mode === 'chargen') {
      set['system.class'] = classSelectionForActor;
      add.items.push({
        name: className(clazz),
        type: 'class',
        system: classSystemForActor,
        flags: {
          swse: {
            progression: {
              sourceSession: sessionId,
              selectionKey: 'class',
              selectionId: classSelectionId(clazz),
            },
          },
        },
      });
      return { set, add, update, context: null };
    }

    if (sessionState.mode !== 'levelup') return { set, add, update, context: null };

    const levelContext = buildLevelUpEventContext(actor, sessionState.progressionSession, { selectedClass: clazz });
    set['system.level'] = levelContext.enteringLevel;
    set['system.progression.classLevels'] = buildClassLevelsAfterLevelUp(actor, clazz, levelContext);
    set['system.progression.lastLeveledClass'] = {
      characterLevel: levelContext.enteringLevel,
      classId: levelContext.selectedClassId,
      className: levelContext.selectedClassName,
      classLevel: levelContext.selectedClassNextLevel,
      timestamp: new Date().toISOString(),
    };
    set['system.progression.classLevelHistory'] = buildClassLevelHistoryAfterLevelUp(actor, clazz, levelContext);

    if (levelContext.existingClassItemId) {
      const classUpdate = {
        _id: levelContext.existingClassItemId,
        'system.level': levelContext.selectedClassNextLevel,
        'system.classId': clazz.id || clazz.classId || clazz.sourceId || levelContext.selectedClassId,
        'flags.swse.progression.lastLeveledAt': new Date().toISOString(),
        'flags.swse.progression.lastSourceSession': sessionId,
      };
      if (isDroidProgression) classUpdate['system.forceSensitive'] = false;
      update.items.push(classUpdate);
    } else {
      add.items.push({
        name: className(clazz),
        type: 'class',
        system: {
          ...classSystemForActor,
          level: levelContext.selectedClassNextLevel || 1,
          classId: clazz.id || clazz.classId || clazz.sourceId || levelContext.selectedClassId,
        },
        flags: {
          swse: {
            progression: {
              sourceSession: sessionId,
              selectionKey: 'class',
              selectionId: classSelectionId(clazz, levelContext),
            },
          },
        },
      });
    }

    return { set, add, update, context: levelContext };
  }
}

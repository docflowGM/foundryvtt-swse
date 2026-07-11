/**
 * FeatTalentPlanBuilder
 *
 * Domain compiler for progression feat/talent item grants.
 *
 * This module is side-effect free except for reading compendium documents through
 * ProgressionContentAuthority. It does not mutate actors, create owned items, or
 * call ActorEngine. It returns item specs for ProgressionFinalizer to merge into
 * the final mutation plan.
 */

import { ProgressionContentAuthority } from '/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js';

function normalizeNameKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
}

function clonePlainObject(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? {}));
}

function mergeObject(target, source, options = {}) {
  if (globalThis.foundry?.utils?.mergeObject) return foundry.utils.mergeObject(target, source, options);
  return { ...(target || {}), ...(source || {}) };
}

function getBlockDeflectGrantNames(entry = {}) {
  const names = [];
  const add = (value) => {
    const text = String(value ?? '').trim();
    if (text && !names.some(name => normalizeNameKey(name) === normalizeNameKey(text))) names.push(text);
  };
  const sources = [
    entry?._data?.actualTalentsToGrant,
    entry?._data?.grants,
    entry?.system?.actualTalentsToGrant,
    entry?.system?.grantsTalents,
    entry?.system?.equivalentTalents,
    entry?.flags?.swse?.actualTalentsToGrant,
    entry?.flags?.swse?.grantsTalents,
  ];
  for (const source of sources) {
    for (const value of Array.isArray(source) ? source : []) add(value);
  }
  const normalizedName = normalizeNameKey(entry?.name || entry?.label || entry);
  const normalizedGrants = names.map(name => normalizeNameKey(name));
  const isCombined = normalizedName === normalizeNameKey('Block & Deflect')
    || entry?.system?.isBlockDeflectCombined === true
    || entry?.system?.flags?.isBlockDeflectCombined === true
    || entry?._data?.isBlockDeflectCombined === true
    || entry?.flags?.swse?.isBlockDeflectCombined === true
    || (normalizedGrants.includes(normalizeNameKey('Block')) && normalizedGrants.includes(normalizeNameKey('Deflect')));
  return isCombined ? ['Block', 'Deflect'] : [];
}

function expandCombinedTalentGrantEntries(entry) {
  const grantNames = getBlockDeflectGrantNames(entry);
  if (!grantNames.length) return [entry];
  return grantNames.map((name) => {
    const cloneSource = entry && typeof entry === 'object' ? entry : { name: String(entry || 'Block & Deflect'), type: 'talent' };
    const clone = clonePlainObject(cloneSource);
    clone.id = name;
    clone._id = null;
    clone.name = name;
    clone.label = name;
    clone.type = clone.type || 'talent';
    clone.system = {
      ...(clone.system || {}),
      isBlockDeflectCombined: false,
      combinedHouseRuleSource: 'Block & Deflect',
    };
    delete clone.system.actualTalentsToGrant;
    delete clone.system.grantsTalents;
    delete clone.system.equivalentTalents;
    if (clone.system.flags) clone.system.flags.isBlockDeflectCombined = false;
    clone.flags = mergeObject(clone.flags || {}, {
      swse: {
        combinedHouseRuleSource: 'Block & Deflect',
        combinedHouseRuleComponent: name,
      },
    }, { inplace: false, recursive: true });
    return clone;
  });
}

function isRepeatableTalentEntry(entry = {}, resolvedData = null) {
  const system = entry?.system || resolvedData?.system || {};
  if (entry?.repeatable === true || resolvedData?.repeatable === true || system.repeatable === true || system.canRepeat === true || system.allowDuplicates === true) return true;
  const text = [
    entry?.name, entry?.description, entry?.benefit, entry?.special,
    resolvedData?.name, resolvedData?.description, resolvedData?.benefit, resolvedData?.special,
    system.description, system.benefit, system.special, system.details, system.summary,
  ].map(value => {
    if (value == null) return '';
    if (typeof value === 'object') return value.value || value.text || value.raw || value.label || value.name || '';
    return String(value);
  }).join(' ').toLowerCase();
  return /(?:can|may)\s+(?:select|take|choose)\s+this\s+talent\s+multiple\s+times/.test(text)
    || /may\s+be\s+taken\s+multiple\s+times/.test(text)
    || /can\s+be\s+taken\s+multiple\s+times/.test(text)
    || /may\s+be\s+selected\s+multiple\s+times/.test(text)
    || /taken\s+multiple\s+times/.test(text);
}

function existingKeySet(actor) {
  return new Set((actor?.items || []).map((item) => `${String(item.type || '').toLowerCase()}::${String(item.name || '').toLowerCase()}`));
}

function existingSessionMarkerSet(actor) {
  return new Set((actor?.items || []).map((item) => {
    const meta = item.flags?.swse?.progression;
    if (!meta?.sourceSession || !meta?.selectionKey || !meta?.selectionId) return null;
    return `${meta.sourceSession}::${meta.selectionKey}::${meta.selectionId}::${meta.countIndex || 0}`;
  }).filter(Boolean));
}

async function resolveDomainDocument(domainKey, rawEntry) {
  if (domainKey === 'feats') return ProgressionContentAuthority.getFeatDocument(rawEntry);
  if (domainKey === 'talents') return ProgressionContentAuthority.getTalentDocument(rawEntry);
  return null;
}

function acquisitionMetaFor(rawEntry, domainKey, sessionId, selectionIdentity) {
  return {
    source: rawEntry?.source || rawEntry?.slotType || domainKey,
    slotType: rawEntry?.slotType || rawEntry?.source || null,
    slotKey: rawEntry?.slotKey || null,
    stepId: rawEntry?.stepId || null,
    classId: rawEntry?.classId || rawEntry?.sourceClassId || null,
    className: rawEntry?.className || rawEntry?.sourceClass || null,
    classLevel: rawEntry?.classLevel || rawEntry?.sourceClassLevel || rawEntry?.grantedClassLevel || null,
    characterLevel: rawEntry?.characterLevel || rawEntry?.sourceCharacterLevel || null,
    sourceSession: sessionId,
    selectionKey: domainKey,
    selectionId: selectionIdentity,
  };
}

function progressionFlagsFor(domainKey, rawEntry, sessionId, selectionIdentity, idx) {
  return {
    swse: {
      progression: {
        sourceSession: sessionId,
        selectionKey: domainKey,
        selectionId: selectionIdentity,
        countIndex: idx,
        source: rawEntry?.source || rawEntry?.slotType || domainKey,
        slotType: rawEntry?.slotType || rawEntry?.source || null,
        slotKey: rawEntry?.slotKey || null,
        stepId: rawEntry?.stepId || null,
        classId: rawEntry?.classId || rawEntry?.sourceClassId || null,
        className: rawEntry?.className || rawEntry?.sourceClass || null,
        classLevel: rawEntry?.classLevel || rawEntry?.sourceClassLevel || rawEntry?.grantedClassLevel || null,
        characterLevel: rawEntry?.characterLevel || rawEntry?.sourceCharacterLevel || null,
      },
    },
  };
}

export class FeatTalentPlanBuilder {
  static expandCombinedTalentGrantEntries(entry) {
    return expandCombinedTalentGrantEntries(entry);
  }

  static isRepeatableTalentEntry(entry = {}, resolvedData = null) {
    return isRepeatableTalentEntry(entry, resolvedData);
  }

  static async build({ actor, selections = {}, sessionState = {} } = {}) {
    await ProgressionContentAuthority.initialize?.();
    const sessionId = sessionState.sessionId || 'unknown';
    const items = [];
    const existingByTypeAndName = existingKeySet(actor);
    const existingBySessionMarker = existingSessionMarkerSet(actor);

    const domainConfig = [
      { key: 'feats', type: 'feat', allowDuplicates: false },
      { key: 'talents', type: 'talent', allowDuplicates: false },
    ];

    for (const domain of domainConfig) {
      const rawValues = Array.isArray(selections[domain.key]) ? selections[domain.key] : [];
      const valuesToProcess = domain.key === 'talents'
        ? rawValues.flatMap((entry) => expandCombinedTalentGrantEntries(entry))
        : rawValues;

      for (const rawEntry of valuesToProcess) {
        const count = Math.max(0, Number(rawEntry?.count ?? 1) || 0);
        if (count <= 0) continue;

        const resolvedDoc = await resolveDomainDocument(domain.key, rawEntry);
        const resolvedData = resolvedDoc?.toObject ? resolvedDoc.toObject() : null;
        const resolvedName = resolvedData?.name || rawEntry?.name || rawEntry?.id || String(rawEntry);
        const selectionIdentity = rawEntry?.selectionId || rawEntry?.id || resolvedName;

        for (let idx = 0; idx < count; idx += 1) {
          const sessionMarker = `${sessionId}::${domain.key}::${selectionIdentity}::${idx}`;
          const dedupeKey = `${domain.type}::${String(resolvedName || '').toLowerCase()}`;
          const allowDuplicateForEntry = domain.allowDuplicates
            || (domain.key === 'talents' && isRepeatableTalentEntry(rawEntry, resolvedData));
          if (existingBySessionMarker.has(sessionMarker)) continue;
          if (!allowDuplicateForEntry && existingByTypeAndName.has(dedupeKey)) continue;

          const baseItem = resolvedData || {
            name: resolvedName,
            type: domain.type,
            system: rawEntry?.system || {},
            img: rawEntry?.img || undefined,
          };

          baseItem.name = resolvedName || baseItem.name;
          baseItem.type = baseItem.type || domain.type;
          baseItem.system = mergeObject(baseItem.system || {}, rawEntry?.system || {}, {
            inplace: false,
            recursive: true,
            overwrite: true,
          });

          const rawSlotType = String(rawEntry?.slotType || rawEntry?.source || '').trim().toLowerCase();
          baseItem.system.acquisition = mergeObject(baseItem.system.acquisition || {}, acquisitionMetaFor(rawEntry, domain.key, sessionId, selectionIdentity), {
            inplace: false,
            recursive: true,
            overwrite: false,
          });
          if (rawSlotType) baseItem.system.slotType = baseItem.system.slotType || rawSlotType;

          if ((domain.key === 'feats' || domain.key === 'talents') && rawSlotType.includes('class')) {
            baseItem.system.sourceType = baseItem.system.sourceType || 'class';
            baseItem.system.grantedByClass = true;
            if (domain.key === 'feats') {
              baseItem.system.locked = true;
              baseItem.system.choiceEditable = false;
            }
          }

          baseItem.flags = mergeObject(baseItem.flags || {}, progressionFlagsFor(domain.key, rawEntry, sessionId, selectionIdentity, idx), {
            inplace: false,
            recursive: true,
          });

          items.push(baseItem);
          existingBySessionMarker.add(sessionMarker);
          if (!allowDuplicateForEntry) existingByTypeAndName.add(dedupeKey);
        }
      }
    }

    return { items, deleteItems: [], postApply: {} };
  }
}

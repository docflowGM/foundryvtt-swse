/**
 * ForcePlanBuilder
 *
 * Domain compiler for Force power/regimen/technique/secret progression grants.
 *
 * This is intentionally side-effect free except for reading compendium documents
 * through ProgressionContentAuthority. It does not mutate actors, create owned
 * items, or call ActorEngine.
 */

import { ProgressionContentAuthority } from '/systems/foundryvtt-swse/scripts/engine/progression/content/progression-content-authority.js';

function mergeObject(target, source, options = {}) {
  if (globalThis.foundry?.utils?.mergeObject) return foundry.utils.mergeObject(target, source, options);
  return { ...(target || {}), ...(source || {}) };
}

function normalizeSlug(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeNameKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '');
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

function isForcePowerMasteryName(name) {
  return normalizeSlug(name) === 'force-power-mastery';
}

function forceKnowledgeEntryName(entry = {}) {
  return String(
    entry?.name
    || entry?.label
    || entry?.title
    || entry?.system?.name
    || entry?.system?.canonicalName
    || entry?.id
    || entry?._id
    || entry?.selectionId
    || (typeof entry === 'string' ? entry : '')
  ).trim();
}

function getForcePowerMasteryChoice(entry = {}) {
  const candidates = [
    entry?.forcePowerMasteryChoice,
    entry?.system?.forcePowerMastery,
    entry?.system?.choice,
    entry?.system?.selectedChoice,
    entry?.flags?.swse?.forcePowerMastery,
    entry?.flags?.swse?.progression?.forcePowerMastery,
    entry?.flags?.['foundryvtt-swse']?.forcePowerMastery,
  ].filter(Boolean);
  for (const candidate of candidates) {
    const slug = normalizeSlug(candidate?.slug || candidate?.powerSlug || candidate?.targetSlug || candidate?.id || candidate?.name || candidate?.label || candidate?.value);
    if (!slug) continue;
    return {
      slug,
      label: String(candidate?.label || candidate?.name || candidate?.powerName || candidate?.targetName || slug).trim() || slug,
      powerId: candidate?.powerId || candidate?.id || candidate?.targetId || null,
      powerName: candidate?.powerName || candidate?.name || candidate?.targetName || candidate?.label || slug,
      isLightsaberFormPower: candidate?.isLightsaberFormPower === true,
    };
  }
  const name = String(entry?.name || '').trim();
  const match = name.match(/Force\s+Power\s+Mastery\s*\(([^)]+)\)/i);
  if (match?.[1]) {
    const slug = normalizeSlug(match[1]);
    if (slug) return { slug, label: match[1].trim(), powerId: null, powerName: match[1].trim(), isLightsaberFormPower: false };
  }
  return null;
}

function getForcePowerMasteryDisplayName(baseName, choice) {
  const rootName = String(baseName || 'Force Power Mastery').replace(/\s*\([^)]*\)\s*$/g, '').trim() || 'Force Power Mastery';
  return choice?.slug ? `${rootName} (${choice.slug})` : rootName;
}

function normalizePendingForceEntry(entry = {}, fallback = {}) {
  const name = forceKnowledgeEntryName(entry) || forceKnowledgeEntryName(fallback);
  return {
    id: entry?.id || entry?._id || entry?.uuid || fallback?.id || fallback?._id || fallback?.uuid || null,
    name,
    selectionId: entry?.selectionId || fallback?.selectionId || entry?.flags?.swse?.progression?.selectionId || null,
    sourceSession: entry?.sourceSession || fallback?.sourceSession || entry?.flags?.swse?.progression?.sourceSession || null,
    source: entry?.source || fallback?.source || 'force-plan-builder',
  };
}

function collectOwnedForcePowerItemIds(actor, rawEntry, removeCount = 0) {
  const count = Math.max(0, Number(removeCount || 0) || 0);
  if (count <= 0) return [];
  const wanted = normalizeNameKey(rawEntry?.name || rawEntry?.label || rawEntry?.id || rawEntry?.selectionId || rawEntry);
  if (!wanted) return [];
  const matches = (actor?.items || []).filter((item) => {
    const type = String(item?.type || '').toLowerCase();
    if (type !== 'force-power' && type !== 'forcepower') return false;
    const candidates = [item.name, item.id, item._id, item.system?.slug, item.system?.powerId];
    return candidates.some(candidate => normalizeNameKey(candidate) === wanted);
  });
  return matches.slice(0, count).map(item => item.id || item._id).filter(Boolean);
}

async function resolveForceDocument(domainKey, rawEntry) {
  if (domainKey === 'forcePowers') return ProgressionContentAuthority.getForceDocument(rawEntry, 'power');
  if (domainKey === 'forceRegimens') return ProgressionContentAuthority.getForceDocument(rawEntry, 'regimen');
  if (domainKey === 'forceTechniques') return ProgressionContentAuthority.getForceDocument(rawEntry, 'technique');
  if (domainKey === 'forceSecrets') return ProgressionContentAuthority.getForceDocument(rawEntry, 'secret');
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

function addForcePostApplyEntry(postApply, domainKey, baseItem, rawEntry, selectionIdentity, sessionId) {
  if (domainKey !== 'forceTechniques' && domainKey !== 'forceSecrets') return;
  const target = domainKey === 'forceTechniques' ? postApply.forceTechniqueEntries : postApply.forceSecretEntries;
  target.push(normalizePendingForceEntry(baseItem, {
    id: rawEntry?.id || rawEntry?._id || rawEntry?.uuid || null,
    name: forceKnowledgeEntryName(rawEntry),
    selectionId: selectionIdentity,
    sourceSession: sessionId,
    source: 'force-plan-builder',
  }));
}

export class ForcePlanBuilder {
  static getForcePowerMasteryChoice(entry = {}) {
    return getForcePowerMasteryChoice(entry);
  }

  static getForcePowerMasteryDisplayName(baseName, choice) {
    return getForcePowerMasteryDisplayName(baseName, choice);
  }

  static collectOwnedForcePowerItemIds(actor, rawEntry, removeCount = 0) {
    return collectOwnedForcePowerItemIds(actor, rawEntry, removeCount);
  }

  static async build({ actor, selections = {}, sessionState = {} } = {}) {
    await ProgressionContentAuthority.initialize?.();
    const sessionId = sessionState.sessionId || 'unknown';
    const items = [];
    const deleteItems = [];
    const postApply = { starshipManeuverNames: [], starshipManeuverRemoveItemIds: [], forceTechniqueEntries: [], forceSecretEntries: [] };
    const existingByTypeAndName = existingKeySet(actor);
    const existingBySessionMarker = existingSessionMarkerSet(actor);

    const domainConfig = [
      { key: 'forcePowers', type: 'force-power', allowDuplicates: true },
      { key: 'forceRegimens', type: 'force-regimen', allowDuplicates: false },
      { key: 'forceTechniques', type: 'force-technique', allowDuplicates: false },
      { key: 'forceSecrets', type: 'force-secret', allowDuplicates: false },
    ];

    for (const domain of domainConfig) {
      const rawValues = Array.isArray(selections[domain.key]) ? selections[domain.key] : [];
      for (const rawEntry of rawValues) {
        const removeCount = Math.max(0, Number(rawEntry?.removeCount || 0) || 0);
        if (domain.key === 'forcePowers' && removeCount > 0) {
          deleteItems.push(...collectOwnedForcePowerItemIds(actor, rawEntry, removeCount));
        }

        const count = Math.max(0, Number(rawEntry?.count ?? 1) || 0);
        if (count <= 0) continue;

        const resolvedDoc = await resolveForceDocument(domain.key, rawEntry);
        const resolvedData = resolvedDoc?.toObject ? resolvedDoc.toObject() : null;
        const resolvedName = resolvedData?.name || rawEntry?.name || rawEntry?.id || String(rawEntry);
        const forcePowerMasteryChoice = domain.key === 'forceTechniques' ? getForcePowerMasteryChoice(rawEntry) : null;
        const isForcePowerMasteryEntry = Boolean(forcePowerMasteryChoice)
          || (domain.key === 'forceTechniques' && isForcePowerMasteryName(resolvedName));
        const storedName = forcePowerMasteryChoice
          ? getForcePowerMasteryDisplayName(resolvedName, forcePowerMasteryChoice)
          : resolvedName;
        const selectionIdentity = rawEntry?.selectionId || (forcePowerMasteryChoice?.slug
          ? `${rawEntry?.id || rawEntry?.techniqueId || rawEntry?.baseTechniqueId || resolvedName}::${forcePowerMasteryChoice.slug}`
          : (rawEntry?.id || storedName));

        for (let idx = 0; idx < count; idx += 1) {
          const sessionMarker = `${sessionId}::${domain.key}::${selectionIdentity}::${idx}`;
          const dedupeKey = `${domain.type}::${String(storedName || '').toLowerCase()}`;
          const allowDuplicateForEntry = domain.allowDuplicates
            || (domain.key === 'forceTechniques' && isForcePowerMasteryEntry && Boolean(forcePowerMasteryChoice));
          if (existingBySessionMarker.has(sessionMarker)) continue;
          if (!allowDuplicateForEntry && existingByTypeAndName.has(dedupeKey)) continue;

          const baseItem = resolvedData || {
            name: storedName,
            type: domain.type,
            system: rawEntry?.system || {},
            img: rawEntry?.img || undefined,
          };

          baseItem.name = storedName || baseItem.name || resolvedName;
          baseItem.type = domain.type;
          baseItem.system = mergeObject(baseItem.system || {}, rawEntry?.system || {}, {
            inplace: false,
            recursive: true,
            overwrite: true,
          });

          if (forcePowerMasteryChoice) {
            baseItem.system.forcePowerMastery = forcePowerMasteryChoice;
            baseItem.system.choice = forcePowerMasteryChoice;
            baseItem.system.selectedChoice = forcePowerMasteryChoice.slug;
          }

          const rawSlotType = String(rawEntry?.slotType || rawEntry?.source || '').trim().toLowerCase();
          baseItem.system.acquisition = mergeObject(baseItem.system.acquisition || {}, acquisitionMetaFor(rawEntry, domain.key, sessionId, selectionIdentity), {
            inplace: false,
            recursive: true,
            overwrite: false,
          });
          if (rawSlotType) baseItem.system.slotType = baseItem.system.slotType || rawSlotType;

          baseItem.flags = mergeObject(baseItem.flags || {}, progressionFlagsFor(domain.key, rawEntry, sessionId, selectionIdentity, idx), {
            inplace: false,
            recursive: true,
          });
          if (forcePowerMasteryChoice) {
            baseItem.flags = mergeObject(baseItem.flags || {}, {
              swse: { forcePowerMastery: forcePowerMasteryChoice },
            }, { inplace: false, recursive: true });
          }

          items.push(baseItem);
          addForcePostApplyEntry(postApply, domain.key, baseItem, rawEntry, selectionIdentity, sessionId);
          existingBySessionMarker.add(sessionMarker);
          if (!allowDuplicateForEntry) existingByTypeAndName.add(dedupeKey);
        }
      }
    }

    return { items, deleteItems, postApply };
  }
}

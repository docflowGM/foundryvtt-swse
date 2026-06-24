/**
 * Level-Up Finalization Audit
 *
 * Validation companion for the receiving-dock manifest.  The manifest says
 * what RAW says this level-up event owes.  This helper verifies two things:
 *
 * 1. Required choices were actually selected before finalization.
 * 2. The actor/plan contains the materialized receipts after finalization.
 *
 * It is intentionally future-actor oriented.  It does not preserve legacy
 * malformed data; it fails loudly when the level-up pipeline would produce an
 * incomplete character.
 */

const FORCE_ARRAY_KEYS = Object.freeze([
  ['forcePowers', 'Force power'],
  ['forceSecrets', 'Force secret'],
  ['forceTechniques', 'Force technique'],
  ['medicalSecrets', 'Medical secret'],
  ['starshipManeuvers', 'Starship maneuver'],
]);

function normalizeText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compactKey(value) {
  return normalizeText(value).replace(/\s+/g, '');
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function entryName(entry) {
  return String(
    entry?.name
    || entry?.label
    || entry?.title
    || entry?.id
    || entry?._id
    || entry?.slug
    || entry?.system?.name
    || entry?.system?.canonicalName
    || (typeof entry === 'string' ? entry : '')
  ).trim();
}

function selectionArray(progressionSession, key) {
  const value = progressionSession?.draftSelections?.[key];
  return Array.isArray(value) ? value : [];
}

function countSelectionEntries(entries) {
  return entries.reduce((sum, entry) => sum + Math.max(1, Number(entry?.count || entry?.quantity || 1) || 1), 0);
}

function isGeneralFeatSelection(entry) {
  const slot = normalizeText(entry?.slotType || entry?.source || entry?.selectionKey || entry?.system?.sourceType);
  const kind = normalizeText(entry?.levelupGrantKind || entry?.system?.levelupGrantKind);
  if (kind.includes('multiclass')) return false;
  return !slot || slot === 'heroic' || slot === 'general' || slot.includes('general');
}

function isClassFeatSelection(entry) {
  const slot = normalizeText(entry?.slotType || entry?.source || entry?.selectionKey || entry?.system?.sourceType);
  const kind = normalizeText(entry?.levelupGrantKind || entry?.system?.levelupGrantKind);
  if (kind.includes('multiclass')) return false;
  return slot === 'class' || slot.includes('class feat') || slot === 'bonus feat';
}

function isMulticlassStartingFeatSelection(entry) {
  const source = normalizeText(entry?.source || entry?.slotType || entry?.levelupGrantKind || entry?.system?.sourceType);
  return entry?.system?.multiclassStartingFeat === true
    || entry?.multiclassStartingFeat === true
    || source.includes('multiclass')
    || source.includes('starting feat');
}

function selectionNames(entries) {
  return asArray(entries).map(entryName).filter(Boolean);
}

function identityCandidates(entry) {
  if (!entry) return [];
  const values = [
    entry?.id,
    entry?._id,
    entry?.uuid,
    entry?.slug,
    entry?.internalId,
    entry?.selectionId,
    entry?.techniqueId,
    entry?.secretId,
    entry?.powerId,
    entry?.baseTechniqueId,
    entry?.baseSecretId,
    entry?.sourceId,
    entry?.system?.id,
    entry?.system?._id,
    entry?.system?.slug,
    entry?.system?.selectionId,
    entry?.system?.sourceId,
    entry?.system?.acquisition?.selectionId,
    entry?.flags?.swse?.progression?.selectionId,
    entry?.flags?.swse?.acquisition?.selectionId,
    entry?.flags?.core?.sourceId,
  ];
  const name = entryName(entry);
  if (name) values.push(name);
  return Array.from(new Set(values.map(compactKey).filter(Boolean)));
}

function itemNames(actor) {
  return (actor?.items || []).map(item => {
    const identities = identityCandidates(item);
    const nameKey = compactKey(entryName(item));
    if (nameKey && !identities.includes(nameKey)) identities.push(nameKey);
    return {
      item,
      name: entryName(item),
      key: nameKey,
      identities,
      type: normalizeText(item?.type).replace(/\s+/g, ''),
      systemType: normalizeText(item?.system?.sourceType || item?.system?.progressionType || item?.system?.executionModel),
    };
  });
}

function hasActorItemNamed(actor, expectedName, expectedKinds = [], expectedRefs = []) {
  const expectedKeys = Array.from(new Set([
    compactKey(expectedName),
    ...asArray(expectedRefs).map(compactKey),
  ].filter(Boolean)));
  if (!expectedKeys.length) return true;
  const kinds = expectedKinds.map(kind => normalizeText(kind).replace(/\s+/g, '')).filter(Boolean);
  return itemNames(actor).some(entry => {
    if (kinds.length && !(kinds.includes(entry.type) || kinds.some(kind => entry.systemType.includes(kind)))) return false;
    return expectedKeys.some(key => entry.identities.includes(key));
  });
}

function hasClassLevel(actor, manifest) {
  const expectedId = compactKey(manifest?.classId || manifest?.className);
  const expectedLevel = Number(manifest?.classLevel || 0) || 0;
  const classLevels = actor?.system?.progression?.classLevels || [];
  if (Array.isArray(classLevels)) {
    return classLevels.some(entry => {
      const entryKey = compactKey(entry?.classId || entry?.class || entry?.name);
      return entryKey === expectedId && Number(entry?.level || 0) >= expectedLevel;
    });
  }
  if (classLevels && typeof classLevels === 'object') {
    const direct = classLevels[manifest?.classId] || classLevels[manifest?.className];
    if (Number(direct?.level || direct || 0) >= expectedLevel) return true;
    return Object.entries(classLevels).some(([key, value]) => compactKey(key) === expectedId && Number(value?.level || value || 0) >= expectedLevel);
  }
  return false;
}

function hasClassSkill(actor, entry) {
  const raw = entry?.key || entry?.id || entry?.name;
  const compact = compactKey(raw);
  if (!compact) return true;
  const skills = actor?.system?.skills || {};
  return Object.entries(skills).some(([key, value]) => compactKey(key) === compact && value?.classSkill === true);
}

function expectedItemChecks(manifest, progressionSession) {
  const checks = [];
  for (const feat of selectionArray(progressionSession, 'feats')) {
    const name = entryName(feat);
    if (name) checks.push({ kind: 'feat', name, itemKinds: ['feat'] });
  }
  for (const talent of selectionArray(progressionSession, 'talents')) {
    const name = entryName(talent);
    if (name) checks.push({ kind: 'talent', name, itemKinds: ['talent'] });
  }
  for (const power of selectionArray(progressionSession, 'forcePowers')) {
    const name = entryName(power);
    if (name) checks.push({ kind: 'force power', name, itemKinds: ['forcepower', 'force-power'] });
  }
  for (const technique of selectionArray(progressionSession, 'forceTechniques')) {
    const name = entryName(technique);
    const refs = identityCandidates(technique);
    if (name || refs.length) checks.push({ kind: 'force technique', name, itemKinds: ['forcetechnique', 'force-technique'], refs });
  }
  for (const secret of selectionArray(progressionSession, 'forceSecrets')) {
    const name = entryName(secret);
    const refs = identityCandidates(secret);
    if (name || refs.length) checks.push({ kind: 'force secret', name, itemKinds: ['forcesecret', 'force-secret'], refs });
  }
  for (const secret of selectionArray(progressionSession, 'medicalSecrets')) {
    const name = entryName(secret);
    if (name) checks.push({ kind: 'medical secret', name, itemKinds: ['feat'] });
  }
  for (const maneuver of selectionArray(progressionSession, 'starshipManeuvers')) {
    const name = entryName(maneuver);
    if (name) checks.push({ kind: 'starship maneuver', name, itemKinds: ['maneuver'] });
  }
  for (const feature of manifest?.automaticClassFeatures || []) {
    const name = entryName(feature);
    if (name) checks.push({ kind: 'automatic class feature', name, itemKinds: ['feat', 'talent'] });
  }
  return checks;
}

export function validateLevelUpRequiredSelections(manifest, progressionSession) {
  const errors = [];
  if (!manifest) return errors;
  const feats = selectionArray(progressionSession, 'feats');
  const talents = selectionArray(progressionSession, 'talents');

  if (manifest.generalFeat?.required === true) {
    const required = Math.max(1, Number(manifest.generalFeat.count || 1) || 1);
    const selected = countSelectionEntries(feats.filter(isGeneralFeatSelection));
    if (selected < required) errors.push(`Choose ${required} general feat${required === 1 ? '' : 's'} for character level ${manifest.characterLevel}`);
  }

  if (manifest.multiclassStartingFeat?.required === true) {
    const required = Math.max(1, Number(manifest.multiclassStartingFeat.count || 1) || 1);
    const selected = countSelectionEntries(feats.filter(isMulticlassStartingFeatSelection));
    if (selected < required) errors.push(`Choose ${required} starting feat${required === 1 ? '' : 's'} from ${manifest.className || 'the new class'}`);
  } else if (Number(manifest.choices?.classFeatChoices || 0) > 0) {
    const required = Number(manifest.choices.classFeatChoices) || 0;
    const selected = countSelectionEntries(feats.filter(isClassFeatSelection));
    if (selected < required) errors.push(`Choose ${required} class bonus feat${required === 1 ? '' : 's'} from ${manifest.className || 'the leveled class'}`);
  }

  if (Number(manifest.choices?.talentChoices || 0) > 0) {
    const required = Number(manifest.choices.talentChoices) || 0;
    const selected = countSelectionEntries(talents);
    if (selected < required) errors.push(`Choose ${required} talent${required === 1 ? '' : 's'} for ${manifest.className || 'the leveled class'}`);
  }

  const keyMap = {
    forcePowerChoices: 'forcePowers',
    forceSecretChoices: 'forceSecrets',
    forceTechniqueChoices: 'forceTechniques',
    medicalSecretChoices: 'medicalSecrets',
    starshipManeuverChoices: 'starshipManeuvers',
  };
  const labelMap = {
    forcePowerChoices: 'Force power',
    forceSecretChoices: 'Force secret',
    forceTechniqueChoices: 'Force technique',
    medicalSecretChoices: 'Medical secret',
    starshipManeuverChoices: 'starship maneuver',
  };
  for (const [choiceKey, selectionKey] of Object.entries(keyMap)) {
    const required = Number(manifest.choices?.[choiceKey] || 0) || 0;
    if (required <= 0) continue;
    const selected = countSelectionEntries(selectionArray(progressionSession, selectionKey));
    if (selected < required) errors.push(`Choose ${required} ${labelMap[choiceKey]}${required === 1 ? '' : 's'}`);
  }

  return errors;
}

export function buildLevelUpFinalizationReceipt(manifest, progressionSession) {
  return {
    kind: 'swse-level-up-finalization-receipt',
    version: 1,
    characterLevel: manifest?.characterLevel || null,
    classId: manifest?.classId || null,
    className: manifest?.className || null,
    classLevel: manifest?.classLevel || null,
    requiredChoices: {
      generalFeat: manifest?.generalFeat || null,
      multiclassStartingFeat: manifest?.multiclassStartingFeat
        ? { required: manifest.multiclassStartingFeat.required, count: manifest.multiclassStartingFeat.count }
        : null,
      choices: manifest?.choices || {},
      abilityIncreases: manifest?.abilityIncreases || null,
    },
    selections: {
      feats: selectionNames(selectionArray(progressionSession, 'feats')),
      talents: selectionNames(selectionArray(progressionSession, 'talents')),
      forcePowers: selectionNames(selectionArray(progressionSession, 'forcePowers')),
      forceSecrets: selectionNames(selectionArray(progressionSession, 'forceSecrets')),
      forceTechniques: selectionNames(selectionArray(progressionSession, 'forceTechniques')),
      medicalSecrets: selectionNames(selectionArray(progressionSession, 'medicalSecrets')),
      starshipManeuvers: selectionNames(selectionArray(progressionSession, 'starshipManeuvers')),
    },
    automaticClassFeatures: selectionNames(manifest?.automaticClassFeatures || []),
    classSkills: (manifest?.classSkills || []).map(entry => ({
      key: entry?.key || entry?.id || entry?.name || null,
      name: entry?.name || entry?.label || entry?.id || null,
      classId: entry?.classId || null,
      className: entry?.className || null,
    })),
    createdAt: new Date().toISOString(),
  };
}

export function auditLevelUpActorAfterFinalization(actor, manifest, progressionSession) {
  const errors = [];
  const warnings = [];
  if (!manifest) return { ok: true, errors, warnings };

  const actorLevel = Number(actor?.system?.level ?? actor?.system?.details?.level ?? 0) || 0;
  if (actorLevel < Number(manifest.characterLevel || 0)) {
    errors.push(`Actor level ${actorLevel || 'missing'} is below expected level ${manifest.characterLevel}`);
  }

  if (!hasClassLevel(actor, manifest)) {
    errors.push(`Class level ledger is missing ${manifest.className || manifest.classId} ${manifest.classLevel}`);
  }

  const fpMax = Number(actor?.system?.forcePoints?.max ?? 0) || 0;
  const fpValue = Number(actor?.system?.forcePoints?.value ?? 0) || 0;
  if (fpMax <= 0) errors.push('Force Point maximum was not materialized');
  if (fpValue !== fpMax) errors.push(`Force Points did not refill to max (${fpValue}/${fpMax})`);

  for (const check of expectedItemChecks(manifest, progressionSession)) {
    if (!hasActorItemNamed(actor, check.name, check.itemKinds, check.refs)) {
      const label = check.name || asArray(check.refs).find(Boolean) || 'unknown selection';
      errors.push(`Missing ${check.kind}: ${label}`);
    }
  }

  for (const entry of manifest.classSkills || []) {
    if (!hasClassSkill(actor, entry)) {
      warnings.push(`Class skill access not marked for ${entry.name || entry.key || entry.id}`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export default {
  validateLevelUpRequiredSelections,
  buildLevelUpFinalizationReceipt,
  auditLevelUpActorAfterFinalization,
};

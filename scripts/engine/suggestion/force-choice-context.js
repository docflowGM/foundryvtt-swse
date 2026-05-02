/**
 * force-choice-context.js
 *
 * Canonical helper for resolving the current Force suite from actor state
 * plus in-progress progression selections. This keeps Force powers, secrets,
 * and techniques on the same pending-state truth surface.
 */

const FORCE_ITEM_TYPES = {
  POWER: 'force-power',
  SECRET: 'force-secret',
  TECHNIQUE: 'force-technique'
};

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeName(value) {
  return String(value || '').trim();
}

function extractName(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') return normalizeName(entry);
  return normalizeName(entry.name || entry.label || entry.id || entry.key || entry.value || null);
}

function collectActorItemNames(actor, type) {
  if (!actor?.items) return [];
  return actor.items
    .filter((item) => item.type === type)
    .map((item) => normalizeName(item.name))
    .filter(Boolean);
}

function collectPendingNames(entries) {
  if (!Array.isArray(entries)) return [];
  const names = [];
  for (const entry of entries) {
    if (entry && typeof entry === 'object' && Number(entry.count || 0) > 1 && extractName(entry)) {
      const name = extractName(entry);
      for (let i = 0; i < Number(entry.count || 0); i += 1) names.push(name);
      continue;
    }
    const name = extractName(entry);
    if (name) names.push(name);
  }
  return names;
}

function toCountMap(names = []) {
  const map = new Map();
  for (const name of names) {
    const key = normalizeName(name);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}

function inferClassName(actor, pendingData = {}) {
  return pendingData?.selectedClass?.name
    || pendingData?.selectedClassName
    || actor?.system?.swse?.class
    || actor?.system?.details?.class
    || null;
}

function inferPrestigeTarget(actor, pendingData = {}) {
  return pendingData?.survey?.prestigeClassTarget
    || pendingData?.prestigeClassTarget
    || pendingData?.mentorBiases?.prestigeClassTarget
    || actor?.system?.swse?.mentorBuildIntentBiases?.prestigeClassTarget
    || null;
}

export class ForceChoiceContext {
  static build(actor, pendingData = {}) {
    const actorPowerNames = collectActorItemNames(actor, FORCE_ITEM_TYPES.POWER);
    const actorSecretNames = collectActorItemNames(actor, FORCE_ITEM_TYPES.SECRET);
    const actorTechniqueNames = collectActorItemNames(actor, FORCE_ITEM_TYPES.TECHNIQUE);

    const pendingPowerNames = collectPendingNames(pendingData.selectedPowers || pendingData.forcePowers || []);
    const pendingSecretNames = collectPendingNames(pendingData.selectedForceSecrets || pendingData.forceSecrets || []);
    const pendingTechniqueNames = collectPendingNames(pendingData.selectedForceTechniques || pendingData.forceTechniques || []);

    const allPowerNames = [...actorPowerNames, ...pendingPowerNames];
    const allSecretNames = [...actorSecretNames, ...pendingSecretNames];
    const allTechniqueNames = [...actorTechniqueNames, ...pendingTechniqueNames];

    const knownPowerSet = new Set(allPowerNames.map((name) => slugify(name)).filter(Boolean));
    const knownSecretSet = new Set(allSecretNames.map((name) => slugify(name)).filter(Boolean));
    const knownTechniqueSet = new Set(allTechniqueNames.map((name) => slugify(name)).filter(Boolean));

    return {
      actorPowerNames,
      actorSecretNames,
      actorTechniqueNames,
      pendingPowerNames,
      pendingSecretNames,
      pendingTechniqueNames,
      allPowerNames,
      allSecretNames,
      allTechniqueNames,
      powerCounts: toCountMap(allPowerNames),
      secretCounts: toCountMap(allSecretNames),
      techniqueCounts: toCountMap(allTechniqueNames),
      knownPowerSet,
      knownSecretSet,
      knownTechniqueSet,
      selectedClassName: inferClassName(actor, pendingData),
      prestigeTarget: inferPrestigeTarget(actor, pendingData),
      survey: pendingData?.survey || null
    };
  }

  static hasTechnique(context, technique) {
    const keys = this._candidateKeys(technique);
    return keys.some((key) => context?.knownTechniqueSet?.has(key));
  }

  static hasSecret(context, secret) {
    const keys = this._candidateKeys(secret);
    return keys.some((key) => context?.knownSecretSet?.has(key));
  }

  static matchedAssociatedPowers(context, techniqueOrSecret) {
    const enriched = techniqueOrSecret?.flags?.swse?.suggestion || techniqueOrSecret?.system?.suggestion || {};
    const associated = [
      ...(enriched.associatedPowers || []),
      ...(enriched.requiredPowers || []),
      ...(enriched.preferredPowers || [])
    ];
    const matches = [];
    for (const powerName of associated) {
      const key = slugify(powerName);
      if (key && context?.knownPowerSet?.has(key)) matches.push(normalizeName(powerName));
    }
    return Array.from(new Set(matches));
  }

  static _candidateKeys(entity) {
    return Array.from(new Set([
      slugify(entity?.id),
      slugify(entity?.name),
      slugify(entity?.label)
    ].filter(Boolean)));
  }
}

export default ForceChoiceContext;

import { ProgressionFinalizer } from '/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js';
import {
  collectKnownForceSecrets,
  collectKnownForceTechniques,
  forceKnowledgeToLedgerEntries,
  forceKnowledgeKey,
} from '/systems/foundryvtt-swse/scripts/utils/force-knowledge.js';

const PATCH_ID = 'progression-finalizer-force-knowledge-post-apply-v2';

function asArray(value) {
  return Array.isArray(value) ? value : [];
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

function normalizePendingEntry(entry = {}, fallback = {}) {
  const name = forceKnowledgeEntryName(entry) || forceKnowledgeEntryName(fallback);
  return {
    id: entry?.id || entry?._id || entry?.uuid || fallback?.id || fallback?._id || fallback?.uuid || null,
    name,
    selectionId: entry?.selectionId || fallback?.selectionId || entry?.flags?.swse?.progression?.selectionId || null,
    sourceSession: entry?.sourceSession || fallback?.sourceSession || entry?.flags?.swse?.progression?.sourceSession || null,
    source: entry?.source || fallback?.source || PATCH_ID,
  };
}

function hasForceKnowledgeEntries(postApply = {}) {
  return asArray(postApply.forceTechniqueEntries).length > 0
    || asArray(postApply.forceSecretEntries).length > 0;
}

function actorIsForceSensitive(actor = null) {
  if (!actor) return false;
  const system = actor.system || {};
  const progression = system.progression || {};
  if (progression.forceSensitive === true || system.forceSensitive === true) return true;
  if (system.skills?.useTheForce?.classSkill === true || system.skills?.useTheForce?.trained === true) return true;
  return Array.from(actor.items || []).some((item) => {
    const name = forceKnowledgeKey(item?.name || item?.system?.name || '');
    const type = String(item?.type || '').trim().toLowerCase();
    return name === 'forcesensitivity'
      || name === 'forcesensitive'
      || type === 'force-power'
      || type === 'forcepower'
      || type === 'force-technique'
      || type === 'forcetechnique'
      || type === 'force-secret'
      || type === 'forcesecret';
  });
}

function mergeKnowledgeEntries(...groups) {
  const out = [];
  const seen = new Set();
  for (const group of groups) {
    for (const raw of asArray(group)) {
      const entry = normalizePendingEntry(raw);
      if (!entry.name && !entry.id) continue;
      const key = forceKnowledgeKey(entry.name || entry.id || entry.selectionId);
      const idKey = entry.id ? `id:${entry.id}` : '';
      const uniqueKey = key || idKey;
      if (uniqueKey && seen.has(uniqueKey)) continue;
      if (uniqueKey) seen.add(uniqueKey);
      if (idKey) seen.add(idKey);
      out.push(entry);
    }
  }
  return out;
}

function buildPendingLedger(postApply = {}) {
  return {
    draftSelections: {
      forceTechniques: asArray(postApply.forceTechniqueEntries),
      forceSecrets: asArray(postApply.forceSecretEntries),
    },
    selections: {
      forceTechniques: asArray(postApply.forceTechniqueEntries),
      forceSecrets: asArray(postApply.forceSecretEntries),
    },
  };
}

export function registerProgressionFinalizerForceKnowledgePatch() {
  if (!ProgressionFinalizer || ProgressionFinalizer.__swseForceKnowledgePatch === PATCH_ID) return;

  if (typeof ProgressionFinalizer._buildForceKnowledgePostApplyEntry !== 'function') {
    ProgressionFinalizer._buildForceKnowledgePostApplyEntry = function buildForceKnowledgePostApplyEntry(baseItem = {}, rawEntry = {}, selectionIdentity = null, sessionId = null) {
      return normalizePendingEntry(baseItem, {
        id: rawEntry?.id || rawEntry?._id || rawEntry?.uuid || null,
        name: forceKnowledgeEntryName(rawEntry),
        selectionId: selectionIdentity,
        sourceSession: sessionId,
        source: 'progression-finalizer',
      });
    };
  }

  ProgressionFinalizer._applyForceKnowledgePostApply = function applyForceKnowledgePostApply(set = {}, actor = null, postApply = {}) {
    // This method is called from the common finalizer path, but Force knowledge
    // reconciliation is only meaningful when actual Force Technique/Secret items
    // were selected. Non-Force chargen must remain a zero-cost no-op here.
    if (!hasForceKnowledgeEntries(postApply)) return;
    if (!actorIsForceSensitive(actor)) return;

    const pendingTechniques = asArray(postApply.forceTechniqueEntries).map(entry => normalizePendingEntry(entry));
    const pendingSecrets = asArray(postApply.forceSecretEntries).map(entry => normalizePendingEntry(entry));

    const pending = buildPendingLedger({
      forceTechniqueEntries: pendingTechniques,
      forceSecretEntries: pendingSecrets,
    });

    const knownTechniques = forceKnowledgeToLedgerEntries(collectKnownForceTechniques(actor, pending));
    const knownSecrets = forceKnowledgeToLedgerEntries(collectKnownForceSecrets(actor, pending));
    const mergedTechniques = mergeKnowledgeEntries(knownTechniques, pendingTechniques);
    const mergedSecrets = mergeKnowledgeEntries(knownSecrets, pendingSecrets);

    if (mergedTechniques.length) {
      set['system.progression.forceTechniques'] = mergedTechniques;
      set['system.forceTechniques.known'] = mergedTechniques;
    }
    if (mergedSecrets.length) {
      set['system.progression.forceSecrets'] = mergedSecrets;
      set['system.forceSecrets.known'] = mergedSecrets;
    }
  };

  ProgressionFinalizer.__swseForceKnowledgePatch = PATCH_ID;
}

registerProgressionFinalizerForceKnowledgePatch();

export default registerProgressionFinalizerForceKnowledgePatch;

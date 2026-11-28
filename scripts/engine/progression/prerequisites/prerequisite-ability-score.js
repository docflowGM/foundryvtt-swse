/**
 * The ONE ability-score read for prerequisite evaluation (PRQ consolidation). Draft attributes of an active progression session win (a character being
 * built is evaluated against the scores being chosen); otherwise SchemaAdapters.getAbilityScore is the canonical authority
 * (docs/systems/ABILITY_SCHEMA_AUTHORITY.md: derived data, then system.attributes reconstruction, then system.abilities as a last-resort fallback).
 * Both the PrerequisiteChecker facade and the canonical PrerequisiteEvaluator call this; neither reads `attributes.<k>.total/.value` itself (those fields
 * do not exist on the real schema, which only has base/racial/enhancement/temp).
 */
import { SchemaAdapters } from '/systems/foundryvtt-swse/scripts/utils/schema-adapters.js';

export function resolvePrerequisiteAbilityScore(actor, abilityKey, pending = {}) {
  const key = String(abilityKey || '').toLowerCase();
  const activeShell = globalThis.game?.__swseActiveProgressionShell;
  const draftAttributes = pending?.attributes
    || pending?.abilityIncreases
    || (activeShell?.actor?.id === actor?.id
      ? activeShell?.progressionSession?.draftSelections?.attributes
      : null);
  const draftFinal = draftAttributes?.finalValues?.[key];
  const draftComputed = Number.isFinite(Number(draftAttributes?.values?.[key]))
    ? Number(draftAttributes.values[key]) + (Number(draftAttributes?.speciesMods?.[key]) || 0)
    : null;
  return draftFinal ?? draftComputed ?? SchemaAdapters.getAbilityScore(actor, key);
}

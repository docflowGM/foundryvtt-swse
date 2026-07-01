/**
 * ReactionRuleAdapter — Phase 10D
 *
 * Converts feat/talent abilityMeta.reactionRules into ReactionRegistry entries.
 * This is intentionally a thin adapter over the existing ReactionEngine and
 * ReactionRegistry. It does not create a parallel reaction system and it does
 * not mutate actors directly.
 */

import { ReactionRegistry } from "/systems/foundryvtt-swse/scripts/engine/combat/reactions/reaction-registry.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function camelize(value) {
  const key = normalizeKey(value);
  return key.replace(/-([a-z0-9])/g, (_match, char) => char.toUpperCase());
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function collectReactionRules(item) {
  const meta = item?.system?.abilityMeta ?? {};
  const rules = [];

  const pushRule = (rule, key = "") => {
    if (!rule || typeof rule !== "object") return;
    rules.push({ ...rule, key: rule.key ?? rule.id ?? rule.reactionKey ?? rule.registryKey ?? key });
  };

  if (Array.isArray(meta.reactionRules)) {
    meta.reactionRules.forEach(rule => pushRule(rule));
  } else if (meta.reactionRules && typeof meta.reactionRules === "object") {
    for (const [key, rule] of Object.entries(meta.reactionRules)) {
      if (Array.isArray(rule)) rule.forEach(entry => pushRule(entry, key));
      else pushRule(rule, key);
    }
  }

  for (const rule of asArray(meta.rules)) {
    if (String(rule?.type ?? "").toUpperCase() === "REACTION") pushRule(rule);
  }

  return rules.filter(rule => rule.key || rule.name || rule.label);
}

function normalizeTrigger(value) {
  const key = String(value ?? "").trim();
  if (!key) return "ON_ATTACK_DECLARED";
  const upper = key.replace(/[\s-]+/g, "_").toUpperCase();
  if (upper.startsWith("ON_")) return upper;
  const aliases = {
    ATTACK_DECLARED: "ON_ATTACK_DECLARED",
    ATTACK_MISSED: "ON_ATTACK_MISSED",
    MISSED_ATTACK: "ON_ATTACK_MISSED",
    DAMAGE_TAKEN: "ON_DAMAGE_TAKEN",
    DAMAGED: "ON_DAMAGE_TAKEN",
    REACTION_SUCCESS: "ON_REACTION_SUCCESS"
  };
  return aliases[upper] ?? upper;
}

function normalizeUsage(rule = {}) {
  const usage = rule.usage && typeof rule.usage === "object" ? { ...rule.usage } : {};
  const oncePer = normalizeKey(rule.oncePer ?? usage.oncePer ?? rule.limit ?? "");
  if (oncePer === "encounter" || oncePer === "per-encounter") {
    usage.perEncounter = true;
    usage.perRound = false;
    usage.maxPerEncounter = Number(rule.maxUses ?? usage.maxPerEncounter ?? 1) || 1;
  } else if (oncePer === "round" || oncePer === "per-round") {
    usage.perRound = true;
    usage.perEncounter = false;
    usage.maxPerRound = Number(rule.maxUses ?? usage.maxPerRound ?? 1) || 1;
  } else if (rule.perEncounter === true) {
    usage.perEncounter = true;
    usage.perRound = false;
    usage.maxPerEncounter = Number(rule.maxPerEncounter ?? rule.maxUses ?? usage.maxPerEncounter ?? 1) || 1;
  } else if (rule.perRound === true) {
    usage.perRound = true;
    usage.perEncounter = false;
    usage.maxPerRound = Number(rule.maxPerRound ?? rule.maxUses ?? usage.maxPerRound ?? 1) || 1;
  }

  return {
    perRound: usage.perRound === true,
    perEncounter: usage.perEncounter === true,
    maxPerRound: usage.maxPerRound ?? (usage.perRound === true ? 1 : null),
    maxPerEncounter: usage.maxPerEncounter ?? (usage.perEncounter === true ? 1 : null)
  };
}

function normalizeCost(rule = {}) {
  const cost = rule.cost && typeof rule.cost === "object" ? { ...rule.cost } : {};
  const forcePoints = Number(rule.forcePointCost ?? rule.forcePoints ?? cost.forcePoints ?? 0);
  return {
    action: cost.action ?? rule.action ?? "reaction",
    forcePoints: Number.isFinite(forcePoints) ? Math.max(0, forcePoints) : 0,
    talentResources: cost.talentResources ?? rule.talentResources ?? null
  };
}

function normalizeConditions(rule = {}) {
  const conditions = rule.conditions && typeof rule.conditions === "object" ? { ...rule.conditions } : {};
  const copyIfPresent = (fromKey, toKey = fromKey) => {
    if (rule[fromKey] !== undefined && conditions[toKey] === undefined) conditions[toKey] = rule[fromKey];
  };

  copyIfPresent("validAttackTypes");
  copyIfPresent("attackTypes", "validAttackTypes");
  copyIfPresent("requiresAttackType", "validAttackTypes");
  copyIfPresent("validDamageTypes");
  copyIfPresent("damageTypes", "validDamageTypes");
  copyIfPresent("excludedDamageTypes");
  copyIfPresent("requiresAttackMissed");
  copyIfPresent("requiresNotFlatFooted");
  copyIfPresent("requiresFightingDefensively");
  copyIfPresent("requiresReactionKey");
  copyIfPresent("requiresWeaponText");

  if (typeof conditions.validAttackTypes === "string") conditions.validAttackTypes = [conditions.validAttackTypes];
  if (typeof conditions.validDamageTypes === "string") conditions.validDamageTypes = [conditions.validDamageTypes];
  if (typeof conditions.excludedDamageTypes === "string") conditions.excludedDamageTypes = [conditions.excludedDamageTypes];
  if (typeof conditions.requiresWeaponText === "string") conditions.requiresWeaponText = [conditions.requiresWeaponText];

  return conditions;
}

function buildMetadataHandler(definition) {
  return async (context = {}) => ({
    success: true,
    modifiedDamage: null,
    additionalRoll: null,
    sourceName: definition.sourceName,
    eventState: "final",
    resolutionLabel: `${definition.label} Available`,
    resultMessage: definition.manualResolution === false
      ? `${definition.label} resolved from metadata.`
      : `${definition.label}: ${definition.description || "Reaction available. Resolve any listed effects manually if no dedicated handler exists."}`,
    reactionResultText: definition.description || definition.resultMessage || "Metadata-backed reaction triggered.",
    context
  });
}

function buildDefinition(rule, item) {
  const sourceName = item?.name ?? rule.sourceName ?? "Reaction Rule";
  const key = camelize(rule.key ?? rule.id ?? rule.reactionKey ?? rule.registryKey ?? sourceName);
  if (!key) return null;

  const definition = {
    key,
    label: rule.label ?? rule.name ?? sourceName,
    trigger: normalizeTrigger(rule.trigger ?? rule.event ?? rule.timing),
    description: rule.description ?? rule.summary ?? item?.system?.description?.value ?? `${sourceName} reaction.`,
    conditions: normalizeConditions(rule),
    usage: normalizeUsage(rule),
    cost: normalizeCost(rule),
    sourceItemId: item?.id ?? item?._id ?? rule.sourceItemId ?? null,
    sourceName,
    sourceRuleId: rule.id ?? rule.key ?? null,
    manualResolution: rule.manualResolution !== false,
    metadataBacked: true
  };
  definition.handler = buildMetadataHandler(definition);
  return definition;
}

export class ReactionRuleAdapter {
  static collectActorReactionDefinitions(actor) {
    const definitions = [];
    for (const item of actorItems(actor)) {
      if (item?.system?.disabled === true) continue;
      for (const rule of collectReactionRules(item)) {
        const definition = buildDefinition(rule, item);
        if (definition) definitions.push(definition);
      }
    }
    return definitions;
  }

  static collectActorReactionKeys(actor) {
    return this.collectActorReactionDefinitions(actor).map(definition => definition.key).filter(Boolean);
  }

  static ensureActorReactionRulesRegistered(actor) {
    const registered = [];
    for (const definition of this.collectActorReactionDefinitions(actor)) {
      const existing = ReactionRegistry.getReaction(definition.key);
      if (existing && existing.metadataBacked !== true) {
        continue;
      }
      try {
        ReactionRegistry.registerReaction(definition.key, definition);
        registered.push(definition.key);
      } catch (err) {
        SWSELogger?.warn?.(`[ReactionRuleAdapter] Failed to register ${definition.key}`, { error: err?.message ?? err });
      }
    }
    return registered;
  }
}

export default ReactionRuleAdapter;

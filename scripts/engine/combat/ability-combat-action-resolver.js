/**
 * AbilityCombatActionResolver
 *
 * Data-driven bridge from owned feat/talent metadata to the character sheet
 * combat-action economy browser. This intentionally does not execute bespoke
 * talent/feat mechanics. It exposes truthful action cards so the Ability
 * Engine-owned item remains the source, while action resolution can remain
 * manual or be delegated to existing engines later.
 */

import featActionsCatalog from "/systems/foundryvtt-swse/data/feat-combat-actions.json" with { type: 'json' };

const ACTION_CARD_FIELDS = [
  "combatActions",
  "actionCards",
  "grantedCombatActions"
];

const ACTION_ECONOMY_ORDER = new Set([
  "full-round",
  "standard",
  "move",
  "swift",
  "free",
  "reaction",
  "passive"
]);

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "action";
}

function normalizeActionEconomy(value) {
  const raw = String(value ?? "standard").toLowerCase().trim();
  if (!raw) return "standard";
  if (raw.includes("full")) return "full-round";
  if (raw.includes("standard")) return "standard";
  if (raw.includes("move")) return "move";
  if (raw.includes("swift")) return "swift";
  if (raw.includes("free")) return "free";
  if (raw.includes("reaction")) return "reaction";
  if (raw.includes("passive")) return "passive";
  return ACTION_ECONOMY_ORDER.has(raw) ? raw : "standard";
}

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function actorItems(actor) {
  try {
    return Array.from(actor?.items ?? []);
  } catch (_err) {
    return [];
  }
}

function hasResolvedChoice(item) {
  const system = item?.system ?? {};
  const choice = system.selectedChoice ?? system.selectedChoices;
  if (Array.isArray(choice)) return choice.length > 0;
  if (choice && typeof choice === "object") return Object.keys(choice).length > 0;
  return choice !== undefined && choice !== null && String(choice).trim() !== "";
}

function choiceLabel(item) {
  const choice = item?.system?.selectedChoice ?? item?.system?.selectedChoices;
  const entry = Array.isArray(choice) ? choice[0] : choice;
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  return entry.label || entry.weapon || entry.group || entry.value || entry.id || "";
}

function cloneData(value) {
  try {
    if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  } catch (_err) {
    // Fall through to JSON clone.
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (_err) {
    return value;
  }
}

function normalizeRelatedSkills(value) {
  const skills = asArray(value).filter(Boolean);
  return skills.map(skill => {
    if (typeof skill === "string") return skill;
    if (typeof skill === "object") return cloneData(skill);
    return String(skill);
  });
}

function normalizeResourceBadges(value) {
  return asArray(value)
    .map(resource => {
      if (typeof resource === "string") return resource;
      if (resource?.label) return String(resource.label);
      if (resource?.name) return String(resource.name);
      if (resource?.type) return String(resource.type);
      return "";
    })
    .filter(Boolean);
}

function collectRawActionCards(item) {
  const meta = item?.system?.abilityMeta ?? {};
  const rawCards = [];

  for (const field of ACTION_CARD_FIELDS) {
    const value = meta[field];
    if (Array.isArray(value)) rawCards.push(...value);
    else if (value && typeof value === "object") rawCards.push(...Object.values(value));
  }

  // Existing feat metadata already has action-economy rules for a few cases.
  // Convert only rules that are safe as manual/reference action cards.
  for (const rule of asArray(meta.actionEconomyRules)) {
    if (!rule || typeof rule !== "object") continue;
    if (String(rule.type || "") === "FULL_ATTACK_AS_STANDARD") {
      rawCards.push({
        id: rule.id || "full-attack-as-standard",
        name: rule.name || `${item.name}: Full Attack`,
        actionType: "standard",
        cost: 1,
        manualResolution: true,
        resolutionMode: "manual",
        useLabel: "Use / Note",
        relatedSkills: [{ skill: "Attack Roll" }],
        notes: rule.description || "Take the Full Attack action as a Standard action under this ability's restrictions.",
        description: rule.description || "Take the Full Attack action as a Standard action under this ability's restrictions.",
        resources: rule.oncePer ? [`Once per ${rule.oncePer}`] : []
      });
    }
  }

  return rawCards.filter(card => card && typeof card === "object");
}


function collectCatalogActionCards(item) {
  const cards = [];
  const itemName = String(item?.name ?? "");
  const itemType = String(item?.type ?? "").toLowerCase();
  for (const [key, action] of Object.entries(featActionsCatalog ?? {})) {
    if (!action || typeof action !== "object") continue;
    const matchesFeat = itemType === "feat" && action.requiredFeat === itemName;
    const matchesTalent = itemType === "talent" && action.requiredTalent === itemName;
    if (!matchesFeat && !matchesTalent) continue;
    cards.push({
      ...cloneData(action),
      id: action.id ?? key,
      key,
      sourceName: itemName,
      sourceType: itemType,
      itemId: item?.id ?? item?._id ?? null
    });
  }
  return cards;
}

function normalizeActionCard(item, rawCard, index = 0) {
  const actionId = normalizeKey(rawCard.id ?? rawCard.key ?? rawCard.name ?? `action-${index}`);
  const itemId = item?.id ?? item?._id ?? normalizeKey(item?.name);
  const sourceType = item?.type ?? rawCard.sourceType ?? "ability";
  const actionType = normalizeActionEconomy(
    rawCard.actionType ?? rawCard.type ?? rawCard.action?.type ?? rawCard.costType ?? "standard"
  );
  const description = String(rawCard.description ?? rawCard.notes ?? rawCard.summary ?? "").trim();
  const manualResolution = rawCard.manualResolution === true || rawCard.resolutionMode === "manual" || rawCard.resolutionMode === "reference";
  const requiresSelectedChoice = rawCard.requiresSelectedChoice === true || item?.system?.abilityMeta?.requiresSelectedChoice === true;
  const selectedChoiceLabel = choiceLabel(item);
  const choiceMissing = requiresSelectedChoice && !hasResolvedChoice(item);
  const notes = rawCard.notes || rawCard.summary || description;

  return {
    key: `ability:${itemId}:${actionId}`,
    id: `ability:${itemId}:${actionId}`,
    sourceActionId: actionId,
    sourceItemId: itemId,
    itemId,
    itemType: sourceType,
    sourceType,
    sourceName: rawCard.sourceName || item?.name || "Ability",
    name: rawCard.name || rawCard.label || actionId,
    label: rawCard.label || rawCard.name || actionId,
    actionType,
    type: actionType,
    cost: rawCard.cost ?? rawCard.actionCost ?? rawCard.action?.cost ?? 1,
    notes: choiceMissing ? `${notes} Resolve this ability's required selection before using it.` : notes,
    description,
    relatedSkills: normalizeRelatedSkills(rawCard.relatedSkills),
    resources: [
      ...normalizeResourceBadges(rawCard.resources ?? rawCard.frequency ?? rawCard.uses),
      ...(selectedChoiceLabel ? [`Choice: ${selectedChoiceLabel}`] : []),
      ...(choiceMissing ? ['Choice required'] : [])
    ],
    executable: rawCard.executable !== false && !choiceMissing,
    useLabel: rawCard.useLabel || (manualResolution ? "Use / Note" : "Use"),
    manualResolution,
    resolutionMode: rawCard.resolutionMode || (manualResolution ? "manual" : "auto"),
    spendAction: rawCard.spendAction !== false,
    isAttack: rawCard.isAttack === true,
    requiresSelectedChoice,
    choiceMissing,
    selectedChoiceLabel,
    disabledReason: choiceMissing ? 'This ability requires a selected choice from chargen/level-up before it can be used.' : '',
    requiredContext: cloneData(rawCard.requiredContext ?? rawCard.requirements ?? []),
    targetHint: rawCard.targetHint || rawCard.target || "",
    ruleData: cloneData(rawCard.ruleData ?? rawCard)
  };
}

export class AbilityCombatActionResolver {
  static getActions(actor, options = {}) {
    const includeFeats = options.includeFeats !== false;
    const includeTalents = options.includeTalents !== false;
    const result = [];
    const seen = new Set();

    for (const item of actorItems(actor)) {
      const type = String(item?.type ?? "").toLowerCase();
      if (type === "feat" && !includeFeats) continue;
      if (type === "talent" && !includeTalents) continue;
      if (type !== "feat" && type !== "talent") continue;

      const rawCards = [...collectRawActionCards(item), ...collectCatalogActionCards(item)];
      rawCards.forEach((rawCard, index) => {
        const card = normalizeActionCard(item, rawCard, index);
        if (!card?.key || seen.has(card.key)) return;
        seen.add(card.key);
        result.push(card);
      });
    }

    return result.sort((a, b) => {
      const typeCompare = normalizeActionEconomy(a.actionType).localeCompare(normalizeActionEconomy(b.actionType));
      if (typeCompare) return typeCompare;
      return String(a.name).localeCompare(String(b.name));
    });
  }
}

export default AbilityCombatActionResolver;

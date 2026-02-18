/**
 * Action Ability Module
 * Reads action items (combat actions, skill applications, ship actions, crew positions, environmental actions)
 * into declarative ability objects for AbilityEngine.
 *
 * Pure data normalization. NO execution logic.
 */

import { AbilityRegistry } from "./ability-registry.js";

/**
 * Determines action subtype from item type.
 * @param {Item} item
 * @returns {string} One of: "skill", "ship", "combat", "force", "environmental"
 */
function _asSubtype(item) {
  const t = item?.type ?? "";

  // Map item types to action subtypes
  if (t === "starshipAction" || t === "shipAction") return "ship";
  if (t === "skillApplication" || t === "skillAction") return "skill";
  if (t === "combatManeuver" || t === "combatAction") return "combat";
  if (t === "forceAction") return "force";
  if (t === "environmentalAction" || t === "movementAction") return "environmental";

  // Fallback: check system flags
  if (item?.system?.actionSubtype) return item.system.actionSubtype;
  return "combat"; // Safe default
}

/**
 * Determines resolution engine from subtype.
 * @param {string} subtype
 * @returns {string} One of: "combat", "vehicle", "skill", "force"
 */
function _resolveEngine(subtype) {
  switch (subtype) {
    case "ship": return "vehicle";
    case "skill": return "skill";
    case "combat": return "combat";
    case "force": return "force";
    case "environmental": return "skill"; // Environmental actions resolve through skill system
    default: return "combat";
  }
}

/**
 * Normalizes action.type field.
 * @param {string} raw
 * @returns {string}
 */
function _normalizeActionType(raw) {
  const valid = ["standard", "move", "swift", "full-round", "reaction", "free", "varies"];
  if (valid.includes(raw)) return raw;
  return "standard"; // Safe default
}

/**
 * Extract action abilities from actor items.
 * @param {Actor} actor
 * @param {{pendingData?: object}} [opts]
 * @returns {Array} Array of raw action ability objects (pre-normalization)
 */
export function getActionAbilitiesForActor(actor, opts = {}) {
  if (!actor) return [];

  const items = actor.items ?? [];
  const out = [];

  for (const item of items) {
    const type = item?.type;

    // Match action-related item types
    const isActionItem = [
      "starshipAction",
      "shipAction",
      "skillApplication",
      "skillAction",
      "combatManeuver",
      "combatAction",
      "forceAction",
      "environmentalAction",
      "movementAction"
    ].includes(type);

    // Also check system.isAction flag
    const hasActionFlag = item?.system?.isAction || item?.flags?.swse?.isAction;

    if (!isActionItem && !hasActionFlag) continue;

    const name = item?.name ?? "Unnamed Action";
    const subtype = _asSubtype(item);
    const description = item?.system?.description?.value ?? "";
    const icon = item?.img ?? "icons/svg/book.svg";

    // Look up registry for metadata
    const reg = AbilityRegistry.find?.("action", name) ?? null;

    // Primary action object
    const actionObj = reg ? {
      type: reg.actionType ?? "standard",
      cost: reg.actionCost ?? null,
    } : {
      type: _normalizeActionType(item?.system?.actionType ?? "standard"),
      cost: item?.system?.actionCost ?? null,
    };

    // Build raw ability
    const raw = {
      id: reg?.id ?? item.id,
      name,
      type: "action",
      subtype,
      icon,
      description,

      // Action economy
      action: actionObj,

      // Crew position (for ship actions)
      crewPosition: item?.system?.crewPosition ?? reg?.crewPosition ?? null,

      // Related skills (gating conditions, DC)
      relatedSkills: Array.isArray(item?.system?.relatedSkills)
        ? item.system.relatedSkills
        : (reg?.relatedSkills ?? []),

      // Effect description
      effect: item?.system?.effect ?? reg?.effect ?? null,

      // Prerequisites (ability scores, feats, etc)
      prerequisites: Array.isArray(item?.system?.prerequisites)
        ? item.system.prerequisites
        : (reg?.prerequisites ?? []),

      // Usage tracking
      usage: item?.system?.usage ?? reg?.usage ?? null,

      // Resolution engine
      resolution: reg?.resolution ?? { engine: _resolveEngine(subtype) },

      // Tags
      tags: reg?.tags ?? [subtype.charAt(0).toUpperCase() + subtype.slice(1), "Action"],

      // Source tracking
      source: { kind: "item", uuid: item.uuid, itemId: item.id },
    };

    out.push(raw);
  }

  return out;
}

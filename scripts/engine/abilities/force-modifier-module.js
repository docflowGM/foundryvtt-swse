/**
 * Force Modifier Module
 * Reads Force Secrets/Techniques into declarative forceModifier abilities
 */

import { AbilityRegistry } from "./ability-registry.js";

function _asSubtype(item) {
  const t = item?.type ?? "";
  if (t === "forceTechnique") return "technique";
  return "secret";
}

export function getForceModifierAbilitiesForActor(actor) {
  if (!actor) return [];
  const items = actor.items ?? [];
  const out = [];

  for (const item of items) {
    const type = item?.type;
    if (type !== "forceSecret" && type !== "forceTechnique") continue;

    const name = item?.name ?? "Force Modifier";
    const subtype = _asSubtype(item);

    // Optional: registry-backed metadata (recommended)
    const reg = AbilityRegistry.find?.("forceModifier", name) ?? null;

    if (reg) {
      out.push({
        id: reg.id ?? item.id,
        name,
        type: "forceModifier",
        subtype,
        hookType: reg.hookType ?? "powerUse",
        activation: reg.activation ?? null,
        scope: reg.scope ?? null,
        modifierRules: reg.modifierRules ?? [],
        resolution: reg.resolution ?? { engine: "force" },
        tags: reg.tags ?? ["Force", subtype === "secret" ? "Secret" : "Technique"],
        source: { kind: "item", uuid: item.uuid, itemId: item.id },
        description: reg.description ?? item?.system?.description?.value ?? "",
      });
    } else {
      // Minimal fallback; dev validator will warn
      out.push({
        id: item.id,
        name,
        type: "forceModifier",
        subtype,
        hookType: null,
        activation: null,
        scope: null,
        modifierRules: [],
        resolution: { engine: "force" },
        tags: ["Force", subtype === "secret" ? "Secret" : "Technique"],
        source: { kind: "item", uuid: item.uuid, itemId: item.id },
        description: item?.system?.description?.value ?? "",
      });
    }
  }

  return out;
}

/**
 * Species Ability Module
 * Reads racial/species abilities into declarative ability objects for AbilityEngine
 */

export function getSpeciesAbilitiesForActor(actor, opts = {}) {
  if (!actor) return [];

  const items = actor.items ?? [];
  const out = [];

  // Look for items marked as species/racial abilities
  for (const item of items) {
    // Species abilities might be stored as special item types
    // Check for trait, racial ability, or similar
    const type = item?.type;

    // Skip non-ability items
    if (!type || !["racialAbility", "trait", "speciesAbility"].includes(type)) {
      // Also check system.isSpeciesAbility or similar flags
      if (!item?.system?.isSpeciesAbility && !item?.flags?.swse?.isSpeciesAbility) continue;
    }

    const name = item?.name ?? "Unnamed Racial Ability";
    const description = item?.system?.description?.value ?? "";
    const actionEconomy = item?.system?.actionEconomy ?? null;
    const icon = item?.img ?? "icons/svg/book.svg";

    out.push({
      id: item.id,
      name,
      type: "racialAbility",
      icon,
      description,
      actionEconomy,
      tags: ["Racial Ability", "Species"],
      source: { kind: "item", uuid: item.uuid, itemId: item.id },
      rollData: null,
      usesData: null,
    });
  }

  return out;
}

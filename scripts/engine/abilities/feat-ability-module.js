/**
 * Feat Ability Module
 * Reads feats into declarative ability objects for AbilityEngine
 */

export function getFeatAbilitiesForActor(actor, opts = {}) {
  if (!actor) return [];

  const items = actor.items ?? [];
  const out = [];

  for (const item of items) {
    if (item?.type !== "feat") continue;

    const name = item?.name ?? "Unnamed Feat";
    const description = item?.system?.description?.value ?? "";
    const actionEconomy = item?.system?.actionEconomy ?? null;
    const icon = item?.img ?? "icons/svg/book.svg";

    out.push({
      id: item.id,
      name,
      type: "feat",
      icon,
      description,
      actionEconomy,
      tags: ["Feat"],
      source: { kind: "item", uuid: item.uuid, itemId: item.id },
      rollData: null,
      usesData: null,
    });
  }

  return out;
}

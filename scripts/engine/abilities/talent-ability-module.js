/**
 * Talent Ability Module
 * Reads talents into declarative ability objects for AbilityEngine
 */

export function getTalentAbilitiesForActor(actor, opts = {}) {
  if (!actor) return [];

  const items = actor.items ?? [];
  const out = [];

  for (const item of items) {
    if (item?.type !== "talent") continue;

    const name = item?.name ?? "Unnamed Talent";
    const description = item?.system?.description?.value ?? "";
    const actionEconomy = item?.system?.actionEconomy ?? null;
    const icon = item?.img ?? "icons/svg/book.svg";

    out.push({
      id: item.id,
      name,
      type: "talent",
      icon,
      description,
      actionEconomy,
      tags: ["Talent"],
      source: { kind: "item", uuid: item.uuid, itemId: item.id },
      rollData: null,
      usesData: null,
    });
  }

  return out;
}

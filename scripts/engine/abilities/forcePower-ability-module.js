/**
 * Force Power Ability Module
 * Reads force powers into declarative ability objects for AbilityEngine
 */

export function getForcePowerAbilitiesForActor(actor, opts = {}) {
  if (!actor) return [];

  const items = actor.items ?? [];
  const out = [];

  for (const item of items) {
    if (item?.type !== "forcePower") continue;

    const name = item?.name ?? "Unnamed Force Power";
    const description = item?.system?.description?.value ?? "";
    const actionEconomy = item?.system?.actionEconomy ?? "standard";
    const icon = item?.img ?? "icons/svg/book.svg";
    const dcChart = item?.system?.dcChart ?? null;

    out.push({
      id: item.id,
      name,
      type: "forcePower",
      icon,
      description,
      actionEconomy,
      tags: ["Force Power"],
      source: { kind: "item", uuid: item.uuid, itemId: item.id, categoryId: item?.system?.categoryId },
      rollData: {
        canRoll: true,
        dcChart,
      },
      usesData: null,
    });
  }

  return out;
}

/**
 * Shared helper for cloning dropped item data before embedded creation.
 *
 * Strips the source `_id` so re-dropping the same compendium item cannot collide
 * on embedded document ids, and records the source UUID separately under
 * `flags.foundryvtt-swse.sourceUuid` for provenance. This mirrors the behaviour
 * already used in DropService and centralizes it for the drop engines.
 *
 * @param {Item|Object} item - The dropped item (document or plain data).
 * @returns {Object} Item data safe to pass to createEmbeddedDocuments.
 */
export function cloneDroppedItemData(item) {
  const data = item?.toObject?.() ?? foundry.utils.deepClone(item ?? {});
  if (data && typeof data === 'object') {
    delete data._id;
    const sourceUuid = item?.uuid ?? null;
    if (sourceUuid) {
      data.flags = data.flags ?? {};
      data.flags['foundryvtt-swse'] = {
        ...(data.flags['foundryvtt-swse'] ?? {}),
        sourceUuid
      };
    }
  }
  return data;
}

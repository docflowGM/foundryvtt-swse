/** Officer Share Talent requires a permanently owned talent, not a borrowed benefit. */
export function isPermanentOfficerTalentItem(item) {
  return item?.type==='talent'
    && item?.system?.sourceType!=='officer-share-talent'
    && item?.system?.temporary!==true
    && item?.flags?.swse?.officerSharedTalent == null;
}

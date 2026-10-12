// Shared READ of an owned item's activation state (not a store or an authority).
export function isItemActivated(item) {
  const system = item?.system ?? {};
  return system.activated === true || system.active === true;
}

export default isItemActivated;

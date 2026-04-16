
/**
 * FIX: Point Buy baseline should be 8, not 10
 */

const POINT_BUY_BASE = 8;

export function initializePointBuyAttributes() {
  return {
    str: POINT_BUY_BASE,
    dex: POINT_BUY_BASE,
    con: POINT_BUY_BASE,
    int: POINT_BUY_BASE,
    wis: POINT_BUY_BASE,
    cha: POINT_BUY_BASE
  };
}

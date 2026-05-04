/**
 * DEPRECATED COMPATIBILITY ROUTER
 *
 * Older callers imported routeCustomization() from this module. The one true
 * first-wave path is now item-customization-router.js / openItemCustomization().
 * Keep this file as a shim so legacy imports do not reopen the retired modal
 * stack.
 */

import { openItemCustomization } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js";

export function routeCustomization(actor, item, options = {}) {
  return openItemCustomization(actor, item, options);
}

export default { routeCustomization };

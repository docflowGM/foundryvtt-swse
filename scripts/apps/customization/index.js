/**
 * CUSTOMIZATION WORKBENCH PUBLIC API
 *
 * Phase 4 consolidation: the public customization launcher is
 * openItemCustomization(). Deprecated workbench classes remain as wrappers only
 * so older imports keep working without reintroducing parallel UI systems.
 */

export {
  openItemCustomization,
  openItemCustomizationByReference,
  openLightsaberWorkbench,
  openWorkbenchForCategory,
  openCustomizationWorkbench,
  installCustomizationLauncherGlobals,
  isCustomizableItem,
  resolveCustomizationCategory,
  normalizeCategory
} from '/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js';

export { default as UnifiedCustomizationWorkbench } from '/systems/foundryvtt-swse/scripts/apps/customization/unified-customization-workbench.js';
export { default as CustomizationWorkbenchApp } from '/systems/foundryvtt-swse/scripts/apps/customization/customization-workbench-app.js';
export { RawCustomizationWorkbenchApp } from '/systems/foundryvtt-swse/scripts/apps/customization/raw-customization-workbench-app.js';

export {
  integrateUnifiedCustomizationWorkbench,
  registerWorkbenchHelpers,
  initializeUnifiedCustomizationWorkbench
} from '/systems/foundryvtt-swse/scripts/apps/customization/unified-workbench-integration.js';

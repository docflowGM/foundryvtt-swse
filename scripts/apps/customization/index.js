/**
 * CUSTOMIZATION WORKBENCH MODULE
 *
 * Unified customization interface for all item types.
 * Consolidates blaster, melee, armor, gear, and lightsaber customization
 * into a single modal with category tabs.
 *
 * Reuses existing per-category engines and ModificationModalShell base.
 * Migrating incrementally: Phase 1 (weapons) → Phase 2 (armor/gear) → Phase 3 (droids/lightsaber)
 */

export { default as UnifiedCustomizationWorkbench } from '/systems/foundryvtt-swse/scripts/apps/customization/unified-customization-workbench.js';

export {
  integrateUnifiedCustomizationWorkbench,
  registerWorkbenchHelpers,
  initializeUnifiedCustomizationWorkbench
} from '/systems/foundryvtt-swse/scripts/apps/customization/unified-workbench-integration.js';

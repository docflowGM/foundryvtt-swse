import { registerRuntimeBugfixHotfixes } from '/systems/foundryvtt-swse/scripts/patches/runtime-bugfix-hotfixes.js';
import { registerProgressionLedgerReconciliationHotfix } from '/systems/foundryvtt-swse/scripts/patches/progression-ledger-reconciliation-hotfix.js';
import { registerArmorHydrationDefenseHotfix } from '/systems/foundryvtt-swse/scripts/patches/armor-hydration-defense-hotfix.js';
import { registerAttackDialogCombatCorrectionsHotfix } from '/systems/foundryvtt-swse/scripts/patches/attack-dialog-combat-corrections-hotfix.js';
import { registerCombatUiBehaviorHotfixes } from '/systems/foundryvtt-swse/scripts/patches/combat-ui-behavior-hotfix.js';
import { registerForceSuiteRenderGuardHotfix } from '/systems/foundryvtt-swse/scripts/patches/force-suite-render-guard-hotfix.js';
import { registerCombatFeaturesPanelRenderer } from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-panel-renderer.js';
import { registerCombatFeatureActionRouter } from '/systems/foundryvtt-swse/scripts/engine/combat/features/combat-feature-action-router.js';

registerRuntimeBugfixHotfixes();
registerProgressionLedgerReconciliationHotfix();
registerArmorHydrationDefenseHotfix();
registerAttackDialogCombatCorrectionsHotfix();
registerCombatUiBehaviorHotfixes();
registerForceSuiteRenderGuardHotfix();
registerCombatFeaturesPanelRenderer();
registerCombatFeatureActionRouter();

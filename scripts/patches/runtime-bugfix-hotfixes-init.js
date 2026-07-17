import { registerRuntimeBugfixHotfixes } from '/systems/foundryvtt-swse/scripts/patches/runtime-bugfix-hotfixes.js';
import { registerProgressionLedgerReconciliationHotfix } from '/systems/foundryvtt-swse/scripts/patches/progression-ledger-reconciliation-hotfix.js';
import { registerArmorHydrationDefenseHotfix } from '/systems/foundryvtt-swse/scripts/patches/armor-hydration-defense-hotfix.js';
import { registerAttackDialogCombatCorrectionsHotfix } from '/systems/foundryvtt-swse/scripts/patches/attack-dialog-combat-corrections-hotfix.js';
import { registerCombatUiBehaviorHotfixes } from '/systems/foundryvtt-swse/scripts/patches/combat-ui-behavior-hotfix.js';

registerRuntimeBugfixHotfixes();
registerProgressionLedgerReconciliationHotfix();
registerArmorHydrationDefenseHotfix();
registerAttackDialogCombatCorrectionsHotfix();
registerCombatUiBehaviorHotfixes();

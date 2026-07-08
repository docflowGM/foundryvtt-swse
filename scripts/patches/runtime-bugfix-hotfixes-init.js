import { registerRuntimeBugfixHotfixes } from '/systems/foundryvtt-swse/scripts/patches/runtime-bugfix-hotfixes.js';
import { registerProgressionLedgerReconciliationHotfix } from '/systems/foundryvtt-swse/scripts/patches/progression-ledger-reconciliation-hotfix.js';
import { registerArmorHydrationDefenseHotfix } from '/systems/foundryvtt-swse/scripts/patches/armor-hydration-defense-hotfix.js';

registerRuntimeBugfixHotfixes();
registerProgressionLedgerReconciliationHotfix();
registerArmorHydrationDefenseHotfix();

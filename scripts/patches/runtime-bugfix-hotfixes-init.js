import { registerRuntimeBugfixHotfixes } from '/systems/foundryvtt-swse/scripts/patches/runtime-bugfix-hotfixes.js';
import { registerProgressionLedgerReconciliationHotfix } from '/systems/foundryvtt-swse/scripts/patches/progression-ledger-reconciliation-hotfix.js';

registerRuntimeBugfixHotfixes();
registerProgressionLedgerReconciliationHotfix();

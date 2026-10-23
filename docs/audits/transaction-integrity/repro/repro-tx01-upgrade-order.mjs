// TX-01 — UpgradeService.applyUpgrade installs the upgrade, THEN charges. Real UpgradeService and LedgerService; the workflow (eligibility catalog) is
// stubbed to offer one allowed upgrade, and the shim's fake ActorEngine records / applies writes. A failing credit write is injected.
import { header, report, setPath } from './_boot.mjs';
header('TX-01 legacy upgrade install order');
const { UpgradeService } = await import('/systems/foundryvtt-swse/scripts/engine/upgrades/UpgradeService.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const offer = { key: 'targeting-scope', name: 'Targeting Scope', allowed: true, cost: 500, slotCost: 1, restriction: 'common', description: '' };
Object.defineProperty(UpgradeService, 'workflow', { configurable: true, get: () => ({ getFullCustomizationState: () => ({ availableUpgrades: [offer], customState: {} }) }) });
const item = { id: 'rifle1', name: 'Blaster Rifle', type: 'weapon', isEmbedded: true, system: { installedUpgrades: [] } };
const actor = { id: 'owner', name: 'Owner', type: 'character', system: { credits: 1000 }, flags: {}, items: [item] }; actor.items.get = (id) => (id === 'rifle1' ? item : null);
const order = [];
ActorEngine.updateEmbeddedDocuments = async (a, kind, updates) => { order.push('ITEM-WRITE'); for (const u of updates) for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(item, k, v); return updates; };
let failCredit = true;
ActorEngine.applyMutationPlan = async (a, plan) => { order.push('CREDIT-WRITE'); if (failCredit) throw new Error('simulated credit write failure'); for (const [k, v] of Object.entries(plan.set ?? {})) setPath(a, k, v); };
let thrown = null;
try { await UpgradeService.applyUpgrade({ actor, itemId: 'rifle1', upgradeId: 'targeting-scope' }); } catch (e) { thrown = e; }
report('TX-01', order[0] === 'ITEM-WRITE' && order[1] === 'CREDIT-WRITE' && thrown && item.system.installedUpgrades.length === 1 && actor.system.credits === 1000,
  'the upgrade is written to the Item BEFORE the credit write; when the credit write fails the call throws but the upgrade stays installed and unpaid',
  `write order=${order.join(' -> ')}; installedUpgrades=${item.system.installedUpgrades.length}; credits=${actor.system.credits}/1000; error="${thrown?.message}"`);
// retry after the failed attempt (the user sees an error and clicks again) installs a SECOND copy and charges once
failCredit = false; order.length = 0;
await UpgradeService.applyUpgrade({ actor, itemId: 'rifle1', upgradeId: 'targeting-scope' });
report('TX-01b', item.system.installedUpgrades.length === 2 && actor.system.credits === 500,
  'a retry after the failed attempt installs a second copy and charges once (no operation identity). CAVEAT: the real eligibility catalog was stubbed; whether it would offer an already-installed upgrade again is NOT established here',
  `installedUpgrades=${item.system.installedUpgrades.length}; credits=${actor.system.credits} (two installs, one 500 charge)`);

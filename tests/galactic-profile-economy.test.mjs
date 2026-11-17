import test from 'node:test';
import assert from 'node:assert/strict';
import './helpers/session-harness.mjs';

const E = await import('../scripts/apps/progression-framework/shell/mutation/profile-economy-plan-builder.js');
const { ProgressionEconomyPlanBuilder } = await import('../scripts/apps/progression-framework/shell/mutation/progression-economy-plan-builder.js');
const { ProgressionFinalizer } = await import('../scripts/apps/progression-framework/shell/progression-finalizer.js');

const economy = (credits, equipment = []) => ({ schema: 'swse-profile-economy-v1', walletMode: 'exactFinalBalance', walletCredits: credits, walletResolved: true, equipment });

test('a resolved zero balance is distinct from an unset/unresolved balance', () => {
  assert.equal(E.profileWalletCredits(economy(0)), 0);
  assert.equal(E.profileWalletCredits({ ...economy(0), walletResolved: false }), null);
  assert.equal(E.profileWalletCredits(undefined), null);
  assert.equal(E.profileWalletCredits({ ...economy(5), walletMode: 'startingCredits' }), null);
  assert.equal(E.profileWalletCredits({ ...economy(-1) }), null);
});

const chargen = (profileEconomy, extra = {}) => ProgressionEconomyPlanBuilder.buildChargenSet({
  actor: { id: 'a', system: { credits: 99999 }, flags: { swse: { chargenStore: { initialized: true, startingCredits: 50, lastStagedCredits: 50 } } } },
  selections: {
    class: { id: 'x', name: 'Noble', system: { starting_credits: '3d4 x 400', base_hp: 18 } },
    attributes: { values: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } },
    survey: { startingCreditsResolved: true, startingCredits: 4000 },
    profileApplication: profileEconomy ? { economy: profileEconomy } : null,
    ...extra
  },
  sessionState: { mode: 'chargen' }
});

test('the profile wallet is the EXACT final credit balance: no class credits, no store staging, no top-up', () => {
  assert.equal(chargen(economy(465))['system.credits'], 465);
  assert.equal(chargen(economy(0))['system.credits'], 0, 'zero is written, not skipped');
});

test('Wealth never adds to a profile wallet (465 stays 465)', () => {
  const withWealth = chargen(economy(465), { talents: [{ id: 'w', name: 'Wealth' }] });
  assert.equal(withWealth['system.credits'], 465);
});

test('without a profile economy the existing V2 credit path is unchanged', () => {
  const plain = chargen(null);
  assert.notEqual(plain['system.credits'], undefined);
  assert.notEqual(plain['system.credits'], 465);
});

test('profile equipment compiles to plan item specs: quantities, provenance, no actor writes; unloadable item fails closed', async () => {
  const eco = economy(10, [
    { itemId: 'tool-power-pack', pack: 'foundryvtt-swse.equipment', name: 'Power Pack', qty: 3, provenance: 'galactic-profile' },
    { itemId: 'weapon-blaster-rifle', pack: 'foundryvtt-swse.weapons-rifles', name: 'Blaster Rifle', qty: 1, provenance: 'galactic-profile' }
  ]);
  const loaded = [];
  const specs = await E.compileProfileEquipmentItems({
    economy: eco, sessionId: 'S1',
    loadItemData: async e => { loaded.push(e.itemId); return { _id: 'db-id', name: e.name, type: 'equipment', system: { quantity: 1, weight: 1 }, flags: {} }; }
  });
  assert.deepEqual(loaded, ['tool-power-pack', 'weapon-blaster-rifle']);
  assert.equal(specs.length, 2);
  assert.equal(specs[0].system.quantity, 3);
  assert.equal('_id' in specs[0], false, 'new item, not the compendium id');
  assert.equal(specs[0].flags.swse.progression.selectionKey, 'galactic-profile-equipment');
  assert.equal(specs[0].flags.swse.progression.sourceSession, 'S1');
  await assert.rejects(E.compileProfileEquipmentItems({ economy: eco, loadItemData: async () => null }), /aborted before any mutation/);
});

test('a profile kit with a lightsaber supersedes the class starter lightsaber (never two)', async () => {
  const kit = economy(450, [{ itemId: 'weapon-lightsaber', pack: 'foundryvtt-swse.weapons-lightsabers', name: 'Lightsaber', qty: 1 }]);
  assert.equal(E.profileKitProvidesLightsaber(kit), true);
  assert.equal(E.profileKitProvidesLightsaber(economy(1, [{ itemId: 'weapon-blaster-rifle', name: 'Blaster Rifle', qty: 1 }])), false);
  const jedi = { id: 'jedi', name: 'Jedi' };
  const actor = { items: [] };
  const withKit = await ProgressionFinalizer._compileClassStarterEquipmentItems(actor, { class: jedi, profileApplication: { economy: kit } }, { mode: 'chargen', sessionId: 's' });
  assert.deepEqual(withKit, []);
});

test('readiness accepts a resolved profile wallet as resolved credits (including zero)', () => {
  assert.equal(E.hasResolvedProfileWallet(economy(0)), true);
  assert.equal(E.hasResolvedProfileWallet({ ...economy(0), walletResolved: undefined }), false);
});

import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Home task notifications address recipients by stable id ('player:<userId>').
// HolonetDeliveryRouter must resolve those through the SELECTED_PLAYERS
// audience instead of dropping them (which left Home task records undeliverable).

registerFoundryPathLoader();
installFoundryShimGlobals();

const users = [
  { id: 'u1', isGM: false, name: 'Player One', character: { id: 'a1', name: 'Hero' } },
  { id: 'g1', isGM: true, name: 'GM' }
];
globalThis.game = { ...(globalThis.game ?? {}), users: Object.assign(users, { get: id => users.find(u => u.id === id) }) };

const { HolonetDeliveryRouter } = await import('../scripts/holonet/subsystems/holonet-delivery-router.js');
const { HolonetAudience } = await import('../scripts/holonet/contracts/holonet-audience.js');

const viaStable = HolonetDeliveryRouter.resolveRecipients({ audience: HolonetAudience.selectedPlayers(['player:u1']), recipients: [] });
assert.deepEqual(viaStable.map(r => r.id), ['player:u1'], 'stable player id resolves');

const viaRaw = HolonetDeliveryRouter.resolveRecipients({ audience: HolonetAudience.selectedPlayers(['u1']), recipients: [] });
assert.deepEqual(viaRaw.map(r => r.id), ['player:u1'], 'raw user id still resolves');

const gmIgnored = HolonetDeliveryRouter.resolveRecipients({ audience: HolonetAudience.selectedPlayers(['gm:g1', 'player:missing']), recipients: [] });
assert.equal(gmIgnored.length, 0, 'GM and unknown ids are not player recipients');

console.log('holonet-home-task-recipient-contract: OK');

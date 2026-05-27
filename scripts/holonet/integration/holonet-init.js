/**
 * Holonet Initialization
 */

import { HolonetEngine } from '../holonet-engine.js';
import { HolonetManager } from '../holonet-manager.js';
import { HolonetPreferences } from '../holonet-preferences.js';
import { HolonetSourceRegistry } from '../holonet-source-registry.js';
import { HolonetStateService } from '../subsystems/holonet-state-service.js';
import { MentorSource } from '../sources/mentor-source.js';
import { StoreSource } from '../sources/store-source.js';
import { ApprovalsSource } from '../sources/approvals-source.js';
import { ProgressionSource } from '../sources/progression-source.js';
import { BulletinSource } from '../sources/bulletin-source.js';
import { MessengerSource } from '../sources/messenger-source.js';
import { SystemSource } from '../sources/system-source.js';
import { ProgressionEmitter } from '../emitters/progression-emitter.js';
import { ApprovalsEmitter } from '../emitters/approvals-emitter.js';
import { StoreEmitter } from '../emitters/store-emitter.js';
import { HealingEmitter } from '../emitters/healing-emitter.js';
import { ShipEmitter } from '../emitters/ship-emitter.js';
import { DroidEmitter } from '../emitters/droid-emitter.js';
import { FollowerEmitter } from '../emitters/follower-emitter.js';
import { StoreStateEmitter } from '../emitters/store-state-emitter.js';
import { HealingSource } from '../sources/healing-source.js';
import { ShipSource } from '../sources/ship-source.js';
import { DroidSource } from '../sources/droid-source.js';
import { FollowerSource } from '../sources/follower-source.js';
import { HolonewsAutoPublisher } from '../subsystems/holonews-auto-publisher.js';
import { BulletinContactRegistry } from '../subsystems/bulletin-contact-registry.js';
import { HolonewsAtomPolicy } from '../subsystems/holonews-atom-policy.js';

export function registerHolonetSettings() {
  game.settings.register('foundryvtt-swse', 'holonet_records', {
    name: 'Holonet Records (internal)',
    scope: 'world',
    config: false,
    type: Array,
    default: []
  });

  game.settings.register('foundryvtt-swse', 'holonet_threads', {
    name: 'Holonet Threads (internal)',
    scope: 'world',
    config: false,
    type: Array,
    default: []
  });

  game.settings.register('foundryvtt-swse', 'holonet_player_state', {
    name: 'Holonet Player State (internal)',
    scope: 'world',
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register('foundryvtt-swse', 'holonet_party_state', {
    name: 'Holonet Party State (internal)',
    scope: 'world',
    config: false,
    type: Object,
    default: {}
  });


  game.settings.register('foundryvtt-swse', 'holonetCustomPersonas', {
    name: 'Holonet Message Personas (internal)',
    scope: 'world',
    config: false,
    type: Array,
    default: []
  });


  game.settings.register('foundryvtt-swse', 'holonetRequireCreditTransferApproval', {
    name: 'Holonet: GM Approves Player Credit Transfers',
    hint: 'When enabled, player-to-player credit transfers require GM approval after the recipient accepts. Defaults off.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register('foundryvtt-swse', 'holonetCreditTransfersEnabled', {
    name: 'Holonet: Allow Player Credit Transfers',
    hint: 'When disabled, players do not see Messenger send/request credit controls. GM tools can still use direct awards where separately available.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('foundryvtt-swse', 'holonetItemTradesEnabled', {
    name: 'Holonet: Allow Player Item Trades',
    hint: 'When disabled, players do not see Messenger item trade controls.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('foundryvtt-swse', 'holonetRequireItemTradeApproval', {
    name: 'Holonet: GM Approves Item Trades',
    hint: 'When enabled, player item transfers must be approved by the GM before the recipient can accept them.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register('foundryvtt-swse', 'holonetAssetTradesEnabled', {
    name: 'Holonet: Allow Ship/Droid Asset Trades',
    hint: 'Controls whether ship and droid asset trade entry points are visible. Asset trades use a separate approved lifecycle.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('foundryvtt-swse', 'holonetRequireAssetTradeApproval', {
    name: 'Holonet: GM Approves Ship/Droid Trades',
    hint: 'Ship and droid asset trades default to GM approval because they are owned actor sheets.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register('foundryvtt-swse', 'holonetPartyFundEnabled', {
    name: 'Holonet: Enable Party Fund',
    hint: 'Adds a GM-managed party fund account that players can contribute to, and GMs can charge or pay from.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register('foundryvtt-swse', 'holonetPartyFundBalance', {
    name: 'Holonet Party Fund Balance (internal)',
    scope: 'world',
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register('foundryvtt-swse', 'holonetPartyFundDefaultCutPercent', {
    name: 'Holonet: Default Party Fund Job Cut %',
    hint: 'Optional default percentage of GM job payouts routed to the party fund when it is enabled.',
    scope: 'world',
    config: true,
    type: Number,
    range: { min: 0, max: 100, step: 1 },
    default: 0
  });

  game.settings.register('foundryvtt-swse', 'holonetPartyFundLedger', {
    name: 'Holonet Party Fund Ledger (internal)',
    scope: 'world',
    config: false,
    type: Array,
    default: []
  });


  game.settings.register('foundryvtt-swse', 'holonewsAutoPublisherPolicy', {
    name: 'HoloNews Auto Publisher Policy (internal)',
    scope: 'world',
    config: false,
    type: Object,
    default: HolonewsAutoPublisher.defaultPolicy()
  });

  game.settings.register('foundryvtt-swse', 'holonetBulletinContacts', {
    name: 'Holonet Bulletin Contacts (internal)',
    scope: 'world',
    config: false,
    type: Array,
    default: BulletinContactRegistry.defaultContacts()
  });

  game.settings.register('foundryvtt-swse', 'holonewsAtomPolicy', {
    name: 'HoloNews Atom Policy (internal)',
    scope: 'world',
    config: false,
    type: Object,
    default: HolonewsAtomPolicy.defaultPolicy()
  });

  HolonetPreferences.registerSettings();
  console.log('[Holonet] Settings registered');
}

export function registerHolonetSources() {
  HolonetSourceRegistry.register('mentor', MentorSource);
  HolonetSourceRegistry.register('store', StoreSource);
  HolonetSourceRegistry.register('approvals', ApprovalsSource);
  HolonetSourceRegistry.register('progression', ProgressionSource);
  HolonetSourceRegistry.register('bulletin', BulletinSource);
  HolonetSourceRegistry.register('messenger', MessengerSource);
  HolonetSourceRegistry.register('system', SystemSource);
  HolonetSourceRegistry.register('healing', HealingSource);
  HolonetSourceRegistry.register('ship', ShipSource);
  HolonetSourceRegistry.register('droid', DroidSource);
  HolonetSourceRegistry.register('follower', FollowerSource);
  console.log('[Holonet] Sources registered');
}

/**
 * Wire store setting changes to Holonet hooks
 * Bridges HouseRuleService.set() → swseStoreStateChanged/swseStorePriceChanged
 */
function wireStoreSettingHooks() {
  const previousState = {
    storeOpen: null,
    globalBuyModifier: null
  };

  // Listen to any setting change and filter for store-related ones
  Hooks.on('swse:setting-changed', (key, value) => {
    // Store open/closed state changed
    if (key === 'storeOpen' && value !== previousState.storeOpen) {
      previousState.storeOpen = value;
      Hooks.callAll('swseStoreStateChanged', {
        isOpen: value ?? true,
        reason: value ? 'opened' : 'closed'
      });
    }

    // Store buy modifier (price multiplier) changed
    if (key === 'globalBuyModifier' && value !== previousState.globalBuyModifier) {
      const previousValue = previousState.globalBuyModifier ?? 0;
      previousState.globalBuyModifier = value;

      // Classify the change
      let reason = 'prices-changed';
      if (value < previousValue) {
        reason = 'sale'; // Price reduction
      } else if (value > previousValue) {
        reason = 'tax'; // Price increase
      }

      Hooks.callAll('swseStorePriceChanged', {
        previousModifier: previousValue,
        newModifier: value ?? 0,
        reason
      });
    }
  });

  console.log('[Holonet] Store setting hooks wired');
}

export async function initializeHolonet() {
  game.swse ??= {};
  game.swse.holonet = {
    engine: HolonetEngine,
    manager: HolonetManager,
    preferences: HolonetPreferences,
    sources: HolonetSourceRegistry,
    state: HolonetStateService
  };

  registerHolonetSources();
  await HolonetEngine.initialize();
  await HolonetSourceRegistry.initializeAll();
  wireStoreSettingHooks(); // Wire store mutations before initializing emitters
  await ProgressionEmitter.initialize();
  await ApprovalsEmitter.initialize();
  await StoreEmitter.initialize();
  await HealingEmitter.initialize();
  await ShipEmitter.initialize();
  await DroidEmitter.initialize();
  await FollowerEmitter.initialize();
  await StoreStateEmitter.initialize();
  HolonewsAutoPublisher.initialize();
  console.log('[Holonet] Initialization complete (emitters active)');
}

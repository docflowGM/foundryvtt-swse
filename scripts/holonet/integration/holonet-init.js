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

export async function initializeHolonet() {
  await HolonetEngine.initialize();
  await HolonetSourceRegistry.initializeAll();
  await ProgressionEmitter.initialize();
  await ApprovalsEmitter.initialize();
  await StoreEmitter.initialize();
  await HealingEmitter.initialize();
  await ShipEmitter.initialize();
  await DroidEmitter.initialize();
  await FollowerEmitter.initialize();
  await StoreStateEmitter.initialize();
  console.log('[Holonet] Initialization complete (emitters active)');
}

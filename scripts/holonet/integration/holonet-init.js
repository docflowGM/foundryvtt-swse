/**
 * Holonet Initialization
 *
 * Registers settings, sources, emitters, and hooks
 */

import { HolonetEngine } from '../holonet-engine.js';
import { HolonetPreferences } from '../holonet-preferences.js';
import { HolonetSourceRegistry } from '../holonet-source-registry.js';
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

/**
 * Register Holonet settings
 */
export function registerHolonetSettings() {
  // Storage settings for Holonet records
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

  // Preferences
  HolonetPreferences.registerSettings();

  console.log('[Holonet] Settings registered');
}

/**
 * Register source adapters
 */
export function registerHolonetSources() {
  HolonetSourceRegistry.register('mentor', MentorSource);
  HolonetSourceRegistry.register('store', StoreSource);
  HolonetSourceRegistry.register('approvals', ApprovalsSource);
  HolonetSourceRegistry.register('progression', ProgressionSource);
  HolonetSourceRegistry.register('bulletin', BulletinSource);
  HolonetSourceRegistry.register('messenger', MessengerSource);
  HolonetSourceRegistry.register('system', SystemSource);

  console.log('[Holonet] Sources registered');
}

/**
 * Initialize Holonet on world ready
 */
export async function initializeHolonet() {
  await HolonetEngine.initialize();
  await HolonetSourceRegistry.initializeAll();

  // Initialize emitters (live paths)
  await ProgressionEmitter.initialize();
  await ApprovalsEmitter.initialize();
  await StoreEmitter.initialize();

  console.log('[Holonet] Initialization complete (emitters active)');
}

/**
 * Holopad Games initialization.
 */

import { GameCenterRegistry } from './game-center-registry.js';
import { GameSessionStore } from './game-session-store.js';
import { getGameSettingsSnapshot } from './game-settings.js';
import { GameHolonetBridge } from './game-holonet-bridge.js';
import { GameNotificationService } from './game-notification-service.js';

export async function initializeGames() {
  GameCenterRegistry.initialize();

  game.swse ??= {};
  game.swse.games = {
    registry: GameCenterRegistry,
    sessions: GameSessionStore,
    holonet: GameHolonetBridge,
    notifications: GameNotificationService,
    get settings() { return getGameSettingsSnapshot(); }
  };

  console.log('[SWSE Games] Game Center infrastructure initialized');
}

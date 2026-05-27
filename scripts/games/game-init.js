/**
 * Holopad Games initialization.
 */

import { GameCenterRegistry } from './game-center-registry.js';
import { GameSessionStore } from './game-session-store.js';
import { getGameSettingsSnapshot } from './game-settings.js';
import { GameHolonetBridge } from './game-holonet-bridge.js';
import { GameNotificationService } from './game-notification-service.js';
import { PazaakEngine } from './games/pazaak/pazaak-engine.js';
import { getPazaakSideCardCatalog } from './games/pazaak/pazaak-deck.js';
import { loadPazaakAiPersonalityData } from './games/pazaak/pazaak-ai-personalities.js';
import { GameOpponentProfileService } from './game-opponent-profile-service.js';
import { GameCreditEscrowService } from './wagers/game-credit-escrow-service.js';

export async function initializeGames() {
  GameCenterRegistry.initialize();
  await loadPazaakAiPersonalityData();

  game.swse ??= {};
  game.swse.games = {
    registry: GameCenterRegistry,
    sessions: GameSessionStore,
    holonet: GameHolonetBridge,
    notifications: GameNotificationService,
    wagers: {
      credits: GameCreditEscrowService
    },
    opponents: GameOpponentProfileService,
    pazaak: {
      engine: PazaakEngine,
      getSideCardCatalog: getPazaakSideCardCatalog
    },
    get settings() { return getGameSettingsSnapshot(); }
  };

  console.log('[SWSE Games] Game Center infrastructure initialized');
}

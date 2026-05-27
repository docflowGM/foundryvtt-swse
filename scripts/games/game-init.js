/**
 * Holopad Games initialization.
 */

import { GameCenterRegistry } from './game-center-registry.js';
import { GameSessionStore } from './game-session-store.js';
import { getGameSettingsSnapshot } from './game-settings.js';
import { GameHolonetBridge } from './game-holonet-bridge.js';
import { GameNotificationService } from './game-notification-service.js';
import { PazaakEngine } from './games/pazaak/pazaak-engine.js';
import { SabaccEngine } from './games/sabacc/sabacc-engine.js';
import { DejarikEngine } from './games/dejarik/dejarik-engine.js';
import { HintaroEngine } from './games/hintaro/hintaro-engine.js';
import { getPazaakSideCardCatalog } from './games/pazaak/pazaak-deck.js';
import { loadPazaakAiPersonalityData } from './games/pazaak/pazaak-ai-personalities.js';
import { GameOpponentProfileService } from './game-opponent-profile-service.js';
import { GameCreditEscrowService } from './wagers/game-credit-escrow-service.js';
import { buildGameAiProfile, GAME_AI_DIFFICULTIES, GAME_AI_FAIRNESS } from './ai/game-ai-profile-service.js';
import { GameMonteCarloService } from './ai/game-monte-carlo-service.js';

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
    ai: {
      buildProfile: buildGameAiProfile,
      difficulties: GAME_AI_DIFFICULTIES,
      fairness: GAME_AI_FAIRNESS,
      monteCarlo: GameMonteCarloService
    },
    pazaak: {
      engine: PazaakEngine,
      getSideCardCatalog: getPazaakSideCardCatalog
    },
    sabacc: {
      engine: SabaccEngine
    },
    dejarik: {
      engine: DejarikEngine
    },
    hintaro: {
      engine: HintaroEngine
    },
    get settings() { return getGameSettingsSnapshot(); }
  };

  console.log('[SWSE Games] Game Center infrastructure initialized');
}

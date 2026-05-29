/**
 * GameSessionMaterializer
 *
 * Ensures accepted Holonet game invites have a concrete gameState envelope for
 * the selected rules engine. This keeps invite acceptance game-specific without
 * letting Messenger know each game's internals.
 */

import { GameSessionStore } from './game-session-store.js';
import { PazaakEngine } from './games/pazaak/pazaak-engine.js';
import { SabaccEngine } from './games/sabacc/sabacc-engine.js';
import { DejarikEngine } from './games/dejarik/dejarik-engine.js';
import { HintaroEngine } from './games/hintaro/hintaro-engine.js';

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? null));
}

function materializedStateFor(session = {}) {
  if (!session?.gameId) return session.gameState || null;
  if (session.gameState?.engine === session.gameId) return session.gameState;
  if (session.gameId === 'pazaak') return PazaakEngine.getState(session);
  if (session.gameId === 'sabacc') return SabaccEngine.getState(session);
  if (session.gameId === 'dejarik') return DejarikEngine.getState(session);
  if (session.gameId === 'hintaro') return HintaroEngine.getState(session);
  return session.gameState || null;
}

function applyGameSpecificInviteDefaults(session = {}) {
  const next = clone(session);
  next.metadata = { ...(next.metadata || {}) };
  if (next.gameId === 'sabacc') {
    next.metadata.sabaccAnte ??= 10;
    next.metadata.sabaccPotAnte ??= 5;
    next.metadata.inviteSetup = 'galaxy-corellian-spike';
  } else if (next.gameId === 'hintaro') {
    next.metadata.hintaroAnte ??= 10;
    next.metadata.hintaronMode ??= next.rulesMode === 'casino' ? 'casino' : 'rotating';
    next.metadata.inviteSetup = 'chance-cube-standard';
  } else if (next.gameId === 'dejarik') {
    next.metadata.actionModel ??= 'single-action';
    next.metadata.dejarikRulesMode ??= 'holopad-skirmish';
    next.metadata.inviteSetup = 'radial-holotable';
  } else if (next.gameId === 'pazaak') {
    next.metadata.inviteSetup = 'side-deck-lock';
  }
  return next;
}

export class GameSessionMaterializer {
  static async materializeAcceptedInvite(session = {}, { by = null, threadId = null } = {}) {
    const prepared = applyGameSpecificInviteDefaults(session);
    const state = materializedStateFor(prepared);
    if (!state) return session;
    const next = clone(prepared);
    next.gameState = state;
    next.metadata = {
      ...(next.metadata || {}),
      materializedAt: Date.now(),
      materializedBy: by,
      materializedThreadId: threadId,
      materializedGameId: next.gameId
    };
    next.log = [
      ...(Array.isArray(next.log) ? next.log : []),
      { id: globalThis.foundry?.utils?.randomID?.() || Math.random().toString(36).slice(2), at: Date.now(), type: 'game-session-materialized', by, data: { gameId: next.gameId, threadId } }
    ];
    return GameSessionStore.upsertSession(next);
  }
}

import { GameSessionStore } from '../../game-session-store.js';
import { PazaakAi } from './pazaak-ai.js';
import { PazaakEngine } from './pazaak-engine.js';
import { PAZAAK_TARGET } from './pazaak-deck.js';
import { hasFilledPazaakTable, scorePazaakPlayer } from './pazaak-rules.js';

/**
 * Blackjack-style Pazaak rule hardening.
 *
 * The core Pazaak table already uses target 20, side decks, set scoring, and
 * opening hand flow, but a few runtime paths still behaved like permissive KOTOR
 * Pazaak instead of the requested blackjack-like table:
 *   - a seat could draw over 20 and then repair the bust with a side card;
 *   - playing a side-card could leave the same seat active instead of consuming
 *     the turn action;
 *   - a full nine-card board won, but its displayed score could remain below 20;
 *   - AI could attempt to fix an already-busted draw.
 *
 * This patch deliberately routes through the existing PazaakEngine actions and
 * GameSessionStore rather than replacing the session engine.
 */

const PATCH_FLAG = Symbol.for('swse.pazaak.blackjackRulesPatch.v1');

function isPazaakSession(session = {}) {
  return session?.gameId === 'pazaak' && session?.gameState?.engine === 'pazaak';
}

function activePlayer(session = {}) {
  const state = session?.gameState;
  const seatId = state?.activeSeatId;
  return seatId ? state?.players?.[seatId] : null;
}

function isSeatDone(player = {}) {
  return Boolean(player?.stood || player?.bust || player?.filledTable);
}

function applyFullBoardScore(player = {}) {
  if (!player || player.bust) return false;
  if (!hasFilledPazaakTable(player)) return false;
  player.filledTable = true;
  player.stood = true;
  player.score = PAZAAK_TARGET;
  player.lastAction = player.lastAction || 'Filled a nine-card board and locked to 20.';
  return true;
}

async function resolveBlackjackAutoState(session, originalSubmitAction) {
  if (!isPazaakSession(session)) return session;
  let current = session;
  let guard = 0;

  while (isPazaakSession(current) && current.gameState.phase === 'playing' && current.gameState.activeSeatId && guard < 8) {
    guard += 1;
    const state = current.gameState;
    const seatId = state.activeSeatId;
    const player = activePlayer(current);
    if (!player || isSeatDone(player)) break;

    const score = scorePazaakPlayer(player);
    if (score > PAZAAK_TARGET) {
      const result = await originalSubmitAction.call(PazaakEngine, {
        sessionId: current.id,
        seatId,
        action: 'end-turn',
        payload: { reason: 'Automatic blackjack-style bust.' }
      });
      current = result?.session || GameSessionStore.getSession(current.id) || current;
      continue;
    }

    if (score === PAZAAK_TARGET) {
      const result = await originalSubmitAction.call(PazaakEngine, {
        sessionId: current.id,
        seatId,
        action: 'stand',
        payload: { reason: 'Automatic stand on exactly 20.' }
      });
      current = result?.session || GameSessionStore.getSession(current.id) || current;
      continue;
    }

    if (applyFullBoardScore(player)) {
      const updated = await GameSessionStore.upsertSession({ ...current, gameState: state });
      current = updated || current;
      continue;
    }

    break;
  }

  return current;
}

export function registerPazaakBlackjackRulesPatch() {
  if (globalThis[PATCH_FLAG]) return false;
  globalThis[PATCH_FLAG] = true;

  const originalChooseTurn = PazaakAi.chooseTurn;
  PazaakAi.chooseTurn = function swseBlackjackPazaakChooseTurn(player = {}, rawProfile = 'medium', context = {}) {
    const score = scorePazaakPlayer(player);
    if (score > PAZAAK_TARGET) return { type: 'end-turn', blackjackBust: true };
    if (score === PAZAAK_TARGET) return { type: 'stand', blackjackTwenty: true };
    if (player.sideCardPlayedThisTurn) return { type: score >= Math.max(16, PAZAAK_TARGET - 2) ? 'stand' : 'end-turn', blackjackSideCardActionSpent: true };
    return originalChooseTurn.call(this, player, rawProfile, context);
  };

  const originalSubmitAction = PazaakEngine.submitAction;
  PazaakEngine.submitAction = async function swseBlackjackPazaakSubmitAction(options = {}) {
    const action = String(options?.action || '').trim();
    let result = await originalSubmitAction.call(this, options);
    if (!result?.ok || !result?.session || !isPazaakSession(result.session)) return result;

    let session = result.session;

    if (action === 'play-side-card') {
      const state = session.gameState;
      const seatId = String(options?.seatId || '').trim();
      const player = seatId ? state?.players?.[seatId] : null;
      const stillActive = state?.phase === 'playing' && state?.activeSeatId === seatId;
      if (stillActive && player && !isSeatDone(player)) {
        result = await originalSubmitAction.call(this, {
          sessionId: session.id,
          seatId,
          action: 'end-turn',
          payload: { reason: 'Side-card play consumed the turn action.' }
        });
        session = result?.session || GameSessionStore.getSession(session.id) || session;
      }
    }

    const resolved = await resolveBlackjackAutoState(session, originalSubmitAction);
    if (resolved && resolved !== session) return { ...result, ok: true, session: resolved };
    return { ...result, ok: true, session };
  };

  const originalLockSideDeck = PazaakEngine.lockSideDeck;
  PazaakEngine.lockSideDeck = async function swseBlackjackPazaakLockSideDeck(options = {}) {
    const result = await originalLockSideDeck.call(this, options);
    if (!result?.ok || !result?.session || !isPazaakSession(result.session)) return result;
    const resolved = await resolveBlackjackAutoState(result.session, originalSubmitAction);
    return { ...result, session: resolved || result.session };
  };

  console.log('[SWSE Games] Blackjack-style Pazaak rules patch registered');
  return true;
}

export default registerPazaakBlackjackRulesPatch;

/**
 * GameSessionStore
 *
 * World-setting backed persistence boundary for Holopad Games sessions. This is
 * intentionally a thin store: it preserves serialisable session envelopes and
 * never mutates actor credits, embedded items, or ship/droid ownership.
 */

const MODULE_ID = 'foundryvtt-swse';
const SESSION_SETTING = 'gamesSessions';
const TERMINAL_STATUSES = new Set(['complete', 'cancelled', 'refunded']);

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? null));
}

function now() {
  return Date.now();
}

function normalizeSeat(seat = {}) {
  return {
    seatId: String(seat.seatId || `seat_${globalThis.foundry?.utils?.randomID?.(6) || Math.random().toString(36).slice(2, 8)}`),
    type: String(seat.type || 'player'),
    userId: seat.userId ? String(seat.userId) : null,
    actorId: seat.actorId ? String(seat.actorId) : null,
    recipientId: seat.recipientId ? String(seat.recipientId) : null,
    displayName: String(seat.displayName || 'Unknown Seat'),
    status: String(seat.status || 'invited'),
    aiProfile: seat.aiProfile ? String(seat.aiProfile) : null
  };
}

function normalizeSession(session = {}) {
  const id = String(session.id || `game_${globalThis.foundry?.utils?.randomID?.(12) || Math.random().toString(36).slice(2, 14)}`);
  const createdAt = Number(session.createdAt || now());

  return {
    id,
    gameId: String(session.gameId || ''),
    title: String(session.title || 'Holopad Game'),
    status: String(session.status || 'draft'),
    authorityMode: String(session.authorityMode || 'host'),
    hostUserId: session.hostUserId ? String(session.hostUserId) : game?.user?.id ?? null,
    hostActorId: session.hostActorId ? String(session.hostActorId) : null,
    holonetThreadId: session.holonetThreadId ? String(session.holonetThreadId) : null,
    holonetMessageId: session.holonetMessageId ? String(session.holonetMessageId) : null,
    seats: Array.isArray(session.seats) ? session.seats.map(normalizeSeat) : [],
    rulesMode: String(session.rulesMode || 'republic-senate'),
    wagerProfile: clone(session.wagerProfile || { mode: 'none' }),
    prizeProfile: clone(session.prizeProfile || { enabled: false }),
    escrow: clone(session.escrow || {}),
    gameState: clone(session.gameState || {}),
    metadata: clone(session.metadata || {}),
    log: Array.isArray(session.log) ? clone(session.log) : [],
    createdAt,
    updatedAt: Number(session.updatedAt || createdAt)
  };
}

function actorParticipates(session, actorId) {
  if (!actorId) return false;
  if (session.hostActorId === actorId) return true;
  return Array.isArray(session.seats) && session.seats.some(seat => seat.actorId === actorId);
}

function userParticipates(session, userId) {
  if (!userId) return false;
  if (session.hostUserId === userId) return true;
  return Array.isArray(session.seats) && session.seats.some(seat => seat.userId === userId);
}

export class GameSessionStore {
  static getAllSessions() {
    try {
      const sessions = game.settings.get(MODULE_ID, SESSION_SETTING);
      return Array.isArray(sessions) ? sessions.map(normalizeSession) : [];
    } catch (_err) {
      return [];
    }
  }

  static async setAllSessions(sessions = []) {
    const normalized = Array.isArray(sessions) ? sessions.map(normalizeSession) : [];
    await game.settings.set(MODULE_ID, SESSION_SETTING, normalized);
    Hooks.callAll?.('swseGamesUpdated', { sessions: normalized });
    return normalized;
  }

  static getSession(sessionId) {
    const id = String(sessionId || '');
    if (!id) return null;
    return this.getAllSessions().find(session => session.id === id) ?? null;
  }

  static async upsertSession(session = {}) {
    const normalized = normalizeSession({ ...session, updatedAt: now() });
    const sessions = this.getAllSessions();
    const index = sessions.findIndex(existing => existing.id === normalized.id);
    if (index >= 0) sessions[index] = normalized;
    else sessions.push(normalized);
    await this.setAllSessions(sessions);
    return normalized;
  }


  static async updateSession(sessionId, updater) {
    const current = this.getSession(sessionId);
    if (!current) return null;
    const patch = typeof updater === 'function' ? updater(clone(current)) : updater;
    if (!patch) return current;
    return this.upsertSession({ ...current, ...patch });
  }

  static async setSeatStatus(sessionId, recipientId, status, extra = {}) {
    const id = String(recipientId || '');
    if (!id) return null;
    return this.updateSession(sessionId, session => {
      const seats = Array.isArray(session.seats) ? session.seats.map(seat => ({ ...seat })) : [];
      const index = seats.findIndex(seat => seat.recipientId === id);
      if (index >= 0) {
        seats[index] = { ...seats[index], ...extra, status: String(status || seats[index].status || 'invited') };
      }
      return { seats };
    });
  }

  static async appendLog(sessionId, entry = {}) {
    return this.updateSession(sessionId, session => {
      const log = Array.isArray(session.log) ? session.log.slice() : [];
      log.push({ id: globalThis.foundry?.utils?.randomID?.() || String(now()), at: now(), ...entry });
      return { log: log.slice(-100) };
    });
  }

  static async deleteSession(sessionId) {
    const id = String(sessionId || '');
    if (!id) return false;
    const before = this.getAllSessions();
    const after = before.filter(session => session.id !== id);
    if (after.length === before.length) return false;
    await this.setAllSessions(after);
    return true;
  }

  static listForActor(actor, options = {}) {
    const actorId = actor?.id ?? null;
    const userId = game?.user?.id ?? null;
    const includeTerminal = Boolean(options.includeTerminal);
    return this.getAllSessions()
      .filter(session => includeTerminal || !TERMINAL_STATUSES.has(session.status))
      .filter(session => actorParticipates(session, actorId) || userParticipates(session, userId))
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  }

  static summarizeForActor(actor) {
    const sessions = this.listForActor(actor);
    const pendingInvites = sessions.filter(session => session.status === 'inviting' || session.status === 'pending-invite');
    const activeSessions = sessions.filter(session => session.status === 'active' || session.status === 'paused');
    const pendingApproval = sessions.filter(session => session.status === 'pending-approval' || session.status === 'pending-escrow');

    return {
      total: sessions.length,
      inviteCount: pendingInvites.length,
      activeCount: activeSessions.length,
      pendingApprovalCount: pendingApproval.length,
      sessions
    };
  }
}

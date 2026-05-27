/**
 * GamesSurfaceController — DOM controller for the Holopad Games surface.
 *
 * Phase 2 wires Messenger-backed game invitations. Playable game reducers and
 * wager settlement remain later layers.
 */

import { GameHolonetBridge } from '/systems/foundryvtt-swse/scripts/games/game-holonet-bridge.js';

export class GamesSurfaceController {
  constructor(host, actor) {
    this._host = host;
    this._actor = actor;
    this._abort = null;
  }

  attach(root) {
    this._actor = this._host?.actor ?? this._actor;
    this._abort?.abort();
    this._abort = new AbortController();
    const { signal } = this._abort;
    const surface = root.querySelector('[data-shell-region="surface-games"]');
    if (!surface) return;

    surface.querySelectorAll('[data-games-action="select-game"]').forEach(button => {
      button.addEventListener('click', ev => {
        ev.preventDefault();
        const selectedGameId = button.dataset.gameId;
        if (!selectedGameId) return;
        this._setOptions({ selectedGameId });
      }, { signal });
    });

    surface.querySelectorAll('[data-games-action="select-rules-mode"]').forEach(button => {
      button.addEventListener('click', ev => {
        ev.preventDefault();
        if (button.disabled) return;
        const rulesMode = button.dataset.rulesMode;
        if (!rulesMode) return;
        this._setOptions({ rulesMode });
      }, { signal });
    });

    surface.querySelectorAll('[data-games-action="open-session"]').forEach(button => {
      button.addEventListener('click', ev => {
        ev.preventDefault();
        const sessionId = button.dataset.sessionId;
        if (!sessionId) return;
        this._setOptions({ sessionId, view: 'session' });
      }, { signal });
    });

    surface.querySelectorAll('[data-games-action="open-thread"]').forEach(button => {
      button.addEventListener('click', async ev => {
        ev.preventDefault();
        const threadId = button.dataset.threadId;
        if (!threadId) return;
        await this._host.setSurface('messenger', { threadId, source: 'games' });
        this._host.render(false);
      }, { signal });
    });

    surface.querySelectorAll('[data-games-action="accept-invite"], [data-games-action="decline-invite"]').forEach(button => {
      button.addEventListener('click', async ev => {
        ev.preventDefault();
        const threadId = button.dataset.threadId;
        const recordId = button.dataset.recordId;
        if (!threadId || !recordId) return;
        const result = button.dataset.gamesAction === 'accept-invite'
          ? await GameHolonetBridge.acceptInvite({ actor: this._actor, threadId, recordId })
          : await GameHolonetBridge.declineInvite({ actor: this._actor, threadId, recordId });
        this._noteResult(result);
        this._host.render(false);
      }, { signal });
    });

    surface.querySelectorAll('form[data-games-action="create-game-invite"]').forEach(form => {
      form.addEventListener('submit', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const data = new FormData(form);
        const result = await GameHolonetBridge.createInvite({
          actor: this._actor,
          gameId: String(data.get('gameId') || '').trim(),
          recipientId: String(data.get('recipientId') || '').trim(),
          rulesMode: String(data.get('rulesMode') || 'republic-senate').trim(),
          title: String(data.get('title') || '').trim(),
          memo: String(data.get('memo') || '').trim()
        });
        this._noteResult(result);
        if (result?.threadId) {
          await this._host.setSurface('messenger', { threadId: result.threadId, source: 'games' });
        }
        this._host.render(false);
      }, { signal });
    });

    surface.querySelectorAll('[data-shell-action="return-to-home"]').forEach(button => {
      button.addEventListener('click', async ev => {
        ev.preventDefault();
        await this._host.setSurface('home');
        this._host.render(false);
      }, { signal });
    });
  }

  destroy() {
    this._abort?.abort();
    this._abort = null;
  }

  _setOptions(patch = {}) {
    this._host._shellSurfaceOptions = {
      ...(this._host._shellSurfaceOptions ?? {}),
      ...patch,
      source: 'games'
    };
    this._host.render(false);
  }

  _noteResult(result) {
    if (result?.pending) {
      ui.notifications?.info?.('Game request sent to the GM relay.');
    } else if (result === false || result == null) {
      ui.notifications?.warn?.('Game request could not be completed.');
    }
  }
}

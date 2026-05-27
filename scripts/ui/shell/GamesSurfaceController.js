/**
 * GamesSurfaceController — DOM controller for the Holopad Games surface.
 *
 * Phase 3 adds a playable Pazaak MVP under Republic Senate Rules, including a
 * legal 10-card side-deck builder before the match begins.
 */

import { GameHolonetBridge } from '/systems/foundryvtt-swse/scripts/games/game-holonet-bridge.js';
import { PazaakEngine } from '/systems/foundryvtt-swse/scripts/games/games/pazaak/pazaak-engine.js';
import { SabaccEngine } from '/systems/foundryvtt-swse/scripts/games/games/sabacc/sabacc-engine.js';
import { DejarikEngine } from '/systems/foundryvtt-swse/scripts/games/games/dejarik/dejarik-engine.js';

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
        this._setOptions({ selectedGameId, sessionId: null, sideDeckIds: [] });
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
        this._setOptions({ sessionId, view: 'session', sideDeckIds: [] });
      }, { signal });
    });

    surface.querySelectorAll('[data-games-action="close-table"]').forEach(button => {
      button.addEventListener('click', ev => {
        ev.preventDefault();
        this._setOptions({ sessionId: null, view: 'library', sideDeckIds: [] });
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
          memo: String(data.get('memo') || '').trim(),
          creditBuyIn: Number(data.get('creditBuyIn') || 0) || 0
        });
        this._noteResult(result);
        if (result?.threadId) {
          await this._host.setSurface('messenger', { threadId: result.threadId, source: 'games' });
        }
        this._host.render(false);
      }, { signal });
    });

    surface.querySelectorAll('form[data-games-action="start-solo-pazaak"]').forEach(form => {
      form.addEventListener('submit', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const data = new FormData(form);
        const result = await PazaakEngine.createSoloAiSession({
          actor: this._actor,
          title: String(data.get('title') || '').trim(),
          rulesMode: String(data.get('rulesMode') || 'republic-senate').trim(),
          creditBuyIn: Number(data.get('creditBuyIn') || 0) || 0
        });
        if (result?.pending) {
          this._noteResult(result);
          this._host.render(false);
        } else if (result?.id) this._setOptions({ sessionId: result.id, selectedGameId: 'pazaak', view: 'session', sideDeckIds: [] });
        else this._noteResult(false);
      }, { signal });
    });

    surface.querySelectorAll('form[data-games-action="start-solo-sabacc"]').forEach(form => {
      form.addEventListener('submit', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const data = new FormData(form);
        const result = await SabaccEngine.createSoloAiSession({
          actor: this._actor,
          title: String(data.get('title') || '').trim(),
          rulesMode: String(data.get('rulesMode') || 'republic-senate').trim()
        });
        if (result?.pending) {
          this._noteResult(result);
          this._host.render(false);
        } else if (result?.id) this._setOptions({ sessionId: result.id, selectedGameId: 'sabacc', view: 'session' });
        else this._noteResult(false);
      }, { signal });
    });

    surface.querySelectorAll('form[data-games-action="start-solo-dejarik"]').forEach(form => {
      form.addEventListener('submit', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const data = new FormData(form);
        const result = await DejarikEngine.createSoloAiSession({
          actor: this._actor,
          title: String(data.get('title') || '').trim()
        });
        if (result?.pending) {
          this._noteResult(result);
          this._host.render(false);
        } else if (result?.id) this._setOptions({ sessionId: result.id, selectedGameId: 'dejarik', view: 'session' });
        else this._noteResult(false);
      }, { signal });
    });

    surface.querySelectorAll('form[data-games-action="lock-pazaak-side-deck"]').forEach(form => {
      const checkboxes = Array.from(form.querySelectorAll('[data-pazaak-side-card]'));
      const countNode = form.querySelector('[data-pazaak-selected-count]');
      const submit = form.querySelector('button[type="submit"]');
      const updateSelection = () => this._syncSideDeckBuilder(checkboxes, countNode, submit);
      checkboxes.forEach(box => box.addEventListener('change', updateSelection, { signal }));
      updateSelection();

      form.addEventListener('submit', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const data = new FormData(form);
        const cardIds = data.getAll('sideDeckIds').map(String).filter(Boolean);
        const result = await PazaakEngine.lockSideDeck({
          sessionId: String(data.get('sessionId') || '').trim(),
          seatId: String(data.get('seatId') || '').trim(),
          cardIds,
          actor: this._actor
        });
        if (result?.pending) this._noteResult(result);
        else if (!result?.ok) ui.notifications?.warn?.(result?.error || 'Could not lock Pazaak side deck.');
        this._setOptions({ sideDeckIds: [] });
      }, { signal });
    });

    surface.querySelectorAll('form[data-games-action="pazaak-play-side-card"], form[data-games-action="pazaak-stand"], form[data-games-action="pazaak-end-turn"], form[data-games-action="pazaak-forfeit"], form[data-games-action="pazaak-cancel-session"]').forEach(form => {
      form.addEventListener('submit', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const data = new FormData(form);
        const action = String(form.dataset.gamesAction || '').replace(/^pazaak-/, '');
        const payload = {
          cardInstanceId: String(data.get('cardInstanceId') || '').trim(),
          reason: String(data.get('reason') || '').trim(),
          choice: {
            sign: String(data.get('sign') || '').trim(),
            value: Number(data.get('value') || 0) || null
          }
        };
        const result = await PazaakEngine.submitAction({
          sessionId: String(data.get('sessionId') || '').trim(),
          seatId: String(data.get('seatId') || '').trim(),
          action,
          payload
        });
        if (result?.pending) this._noteResult(result);
        else if (!result?.ok) ui.notifications?.warn?.(result?.error || 'Pazaak action failed.');
        this._host.render(false);
      }, { signal });
    });


    surface.querySelectorAll('form[data-games-action^="sabacc-"]').forEach(form => {
      form.addEventListener('submit', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const data = new FormData(form);
        const action = String(form.dataset.gamesAction || '').replace(/^sabacc-/, '');
        const result = await SabaccEngine.submitAction({
          sessionId: String(data.get('sessionId') || '').trim(),
          seatId: String(data.get('seatId') || '').trim(),
          action,
          payload: {
            cardId: String(data.get('cardId') || '').trim(),
            reason: String(data.get('reason') || '').trim()
          }
        });
        if (result?.pending) this._noteResult(result);
        else if (!result?.ok) ui.notifications?.warn?.(result?.error || 'Sabacc action failed.');
        this._host.render(false);
      }, { signal });
    });

    surface.querySelectorAll('form[data-games-action^="dejarik-"]').forEach(form => {
      form.addEventListener('submit', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const data = new FormData(form);
        const action = String(form.dataset.gamesAction || '').replace(/^dejarik-/, '');
        const result = await DejarikEngine.submitAction({
          sessionId: String(data.get('sessionId') || '').trim(),
          seatId: String(data.get('seatId') || '').trim(),
          action,
          payload: {
            pieceId: String(data.get('pieceId') || '').trim(),
            targetPieceId: String(data.get('targetPieceId') || '').trim(),
            toSpaceId: String(data.get('toSpaceId') || '').trim(),
            reason: String(data.get('reason') || '').trim()
          }
        });
        if (result?.pending) this._noteResult(result);
        else if (!result?.ok) ui.notifications?.warn?.(result?.error || 'Dejarik action failed.');
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

  _syncSideDeckBuilder(checkboxes, countNode, submit) {
    const selected = checkboxes.filter(box => box.checked);
    const selectedIds = selected.map(box => box.value).filter(Boolean);
    const limit = 10;
    checkboxes.forEach(box => {
      box.disabled = !box.checked && selected.length >= limit;
    });
    if (countNode) countNode.textContent = String(selected.length);
    if (submit) submit.disabled = selected.length !== limit;
    this._host._shellSurfaceOptions = {
      ...(this._host._shellSurfaceOptions ?? {}),
      sideDeckIds: selectedIds
    };
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

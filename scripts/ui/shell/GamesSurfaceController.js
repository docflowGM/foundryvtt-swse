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
import { HintaroEngine } from '/systems/foundryvtt-swse/scripts/games/games/hintaro/hintaro-engine.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';

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
        await this._render('games-open-thread');
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
        await this._render('games-invite-response');
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
        await this._render('games-create-invite');
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
          await this._render('games-pending-request');
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
          rulesMode: String(data.get('rulesMode') || 'republic-senate').trim(),
          creditBuyIn: Number(data.get('creditBuyIn') || 0) || 0,
          handLimit: Number(data.get('handLimit') || 0) || 0,
          marketEnabled: data.get('marketEnabled') === 'on' || data.get('marketEnabled') === 'true'
        });
        if (result?.pending) {
          this._noteResult(result);
          await this._render('games-pending-request');
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
          title: String(data.get('title') || '').trim(),
          dejarikRulesMode: String(data.get('dejarikRulesMode') || 'holopad-skirmish').trim()
        });
        if (result?.pending) {
          this._noteResult(result);
          await this._render('games-pending-request');
        } else if (result?.id) this._setOptions({ sessionId: result.id, selectedGameId: 'dejarik', view: 'session' });
        else this._noteResult(false);
      }, { signal });
    });

    surface.querySelectorAll('form[data-games-action="start-solo-hintaro"]').forEach(form => {
      form.addEventListener('submit', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const data = new FormData(form);
        const result = await HintaroEngine.createSoloAiSession({
          actor: this._actor,
          title: String(data.get('title') || '').trim(),
          rulesMode: String(data.get('rulesMode') || 'republic-senate').trim(),
          creditBuyIn: Number(data.get('creditBuyIn') || 0) || 0,
          hintaronMode: String(data.get('hintaronMode') || 'rotating').trim()
        });
        if (result?.pending) {
          this._noteResult(result);
          await this._render('games-pending-request');
        } else if (result?.id) this._setOptions({ sessionId: result.id, selectedGameId: 'hintaro', view: 'session' });
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
        const submitter = ev.submitter || null;
        const choiceValue = Number(submitter?.dataset?.pazaakChoiceValue || data.get('value') || 0) || null;
        const payload = {
          cardInstanceId: String(data.get('cardInstanceId') || '').trim(),
          reason: String(data.get('reason') || '').trim(),
          choice: {
            sign: String(data.get('sign') || '').trim(),
            value: choiceValue
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
        else this._emitGameCue('pazaak', action, { sessionId: String(data.get('sessionId') || '').trim() });
        await this._render('games-action-submit');
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
            slotId: String(data.get('slotId') || '').trim(),
            amount: Number(data.get('amount') || 0) || 0,
            reason: String(data.get('reason') || '').trim()
          }
        });
        if (result?.pending) this._noteResult(result);
        else if (!result?.ok) ui.notifications?.warn?.(result?.error || 'Sabacc action failed.');
        else this._emitGameCue('sabacc', action, { sessionId: String(data.get('sessionId') || '').trim() });
        await this._render('games-action-submit');
      }, { signal });
    });

    surface.querySelectorAll('form[data-games-action^="dejarik-"]').forEach(form => {
      form.addEventListener('submit', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const data = new FormData(form);
        const action = String(form.dataset.gamesAction || '').replace(/^dejarik-/, '');
        await this._submitDejarikAction({
          sessionId: String(data.get('sessionId') || '').trim(),
          seatId: String(data.get('seatId') || '').trim(),
          action,
          payload: {
            pieceId: String(data.get('pieceId') || '').trim(),
            monsterId: String(data.get('monsterId') || '').trim(),
            targetPieceId: String(data.get('targetPieceId') || '').trim(),
            toSpaceId: String(data.get('toSpaceId') || '').trim(),
            reason: String(data.get('reason') || '').trim()
          }
        });
      }, { signal });
    });

    surface.querySelectorAll('form[data-games-action^="hintaro-"]').forEach(form => {
      form.addEventListener('submit', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const data = new FormData(form);
        const action = String(form.dataset.gamesAction || '').replace(/^hintaro-/, '');
        const result = await HintaroEngine.submitAction({
          sessionId: String(data.get('sessionId') || '').trim(),
          seatId: String(data.get('seatId') || '').trim(),
          action,
          payload: {
            dieIndex: Number(data.get('dieIndex') || 0) || 0,
            amount: Number(data.get('amount') || 0) || 0,
            reason: String(data.get('reason') || '').trim()
          }
        });
        if (result?.pending) this._noteResult(result);
        else if (!result?.ok) ui.notifications?.warn?.(result?.error || 'Hintaro action failed.');
        else this._emitGameCue('hintaro', action, { sessionId: String(data.get('sessionId') || '').trim() });
        await this._render('games-action-submit');
      }, { signal });
    });

    this._attachDejarikBoard(surface, signal);

    surface.querySelectorAll('[data-shell-action="return-to-home"]').forEach(button => {
      button.addEventListener('click', async ev => {
        ev.preventDefault();
        await this._host.setSurface('home');
        await this._render('games-action-submit');
      }, { signal });
    });
  }

  destroy() {
    this._abort?.abort();
    this._abort = null;
  }

  _attachDejarikBoard(surface, signal) {
    const board = surface.querySelector('[data-dejarik-board]');
    if (!board) return;

    const sessionId = String(board.dataset.sessionId || '').trim();
    const seatId = String(board.dataset.seatId || '').trim();
    const selectionLabel = surface.querySelector('[data-dejarik-selection-label]');
    const selectionHelp = surface.querySelector('[data-dejarik-selection-help]');
    const selectionStats = surface.querySelector('[data-dejarik-selection-stats]');
    const detailCard = surface.querySelector('[data-dejarik-detail-card]');
    const detailName = surface.querySelector('[data-dejarik-detail-name]');
    const detailHp = surface.querySelector('[data-dejarik-detail-hp]');
    const detailAttack = surface.querySelector('[data-dejarik-detail-attack]');
    const detailMovement = surface.querySelector('[data-dejarik-detail-movement]');
    const detailReach = surface.querySelector('[data-dejarik-detail-reach]');
    const detailAbility = surface.querySelector('[data-dejarik-detail-ability]');
    const spaces = Array.from(board.querySelectorAll('[data-dejarik-space]'));
    const selectorButtons = Array.from(surface.querySelectorAll('[data-dejarik-select-piece]'));
    const inspectButtons = Array.from(surface.querySelectorAll('[data-dejarik-inspect-piece]'));

    const parseDetail = source => {
      const raw = String(source?.dataset?.detailJson || '').trim();
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (_err) { return null; }
    };

    const updateDetailCard = source => {
      const detail = parseDetail(source);
      if (!detail) return;
      if (detailCard) detailCard.classList.add('has-selection');
      if (detailName) detailName.textContent = detail.name || source?.dataset?.pieceLabel || 'Selected monster';
      if (detailHp) detailHp.textContent = detail.hp || '—';
      if (detailAttack) detailAttack.textContent = detail.attack || '—';
      if (detailMovement) detailMovement.textContent = detail.movement || '—';
      if (detailReach) detailReach.textContent = detail.reach || '—';
      if (detailAbility) detailAbility.textContent = [detail.ability, detail.abilityDescription].filter(Boolean).join(' — ') || '—';
      inspectButtons.forEach(button => button.classList.toggle('is-selected', String(button.dataset.pieceId || '') === String(source?.dataset?.pieceId || '')));
    };

    const resetHighlights = ({ clearState = false } = {}) => {
      board.dataset.selectedPieceId = '';
      if (clearState) this._host.patchSurfaceState?.('games', { selectedDejarikPieceId: null }, { render: false });
      spaces.forEach(space => {
        space.classList.remove('is-selected-piece', 'is-legal-move', 'is-legal-attack');
        delete space.dataset.dejarikBoardAction;
        delete space.dataset.actionPieceId;
        delete space.dataset.actionTargetPieceId;
      });
      selectorButtons.forEach(button => button.classList.remove('is-selected'));
    };

    const selectPiece = button => {
      if (!button) return;
      const pieceId = String(button.dataset.pieceId || '').trim();
      const pieceLabel = String(button.dataset.pieceLabel || 'Selected piece').trim();
      const pieceDetail = String(button.dataset.pieceDetail || '').trim();
      const pieceSummary = String(button.dataset.pieceSummary || '').trim();
      const pieceAbility = String(button.dataset.pieceAbility || '').trim();
      if (!pieceId) return;
      resetHighlights();
      this._host.patchSurfaceState?.('games', { selectedDejarikPieceId: pieceId }, { render: false });
      board.dataset.selectedPieceId = pieceId;
      button.classList.add('is-selected');
      updateDetailCard(button);

      const pieceSpace = spaces.find(space => String(space.dataset.pieceId || '') === pieceId);
      pieceSpace?.classList.add('is-selected-piece');

      const moveSpaces = String(button.dataset.moveSpaces || '').split(/\s+/).map(value => value.trim()).filter(Boolean);
      const attackTargets = String(button.dataset.attackTargets || '').split(/\s+/).map(value => value.trim()).filter(Boolean);
      const attackMap = new Map();
      attackTargets.forEach(token => {
        const [spaceId, targetPieceId] = token.split(':');
        if (spaceId && targetPieceId) attackMap.set(spaceId, targetPieceId);
      });

      moveSpaces.forEach(spaceId => {
        const space = spaces.find(candidate => candidate.dataset.spaceId === spaceId);
        if (!space || space.dataset.pieceId) return;
        space.classList.add('is-legal-move');
        space.dataset.dejarikBoardAction = 'move';
        space.dataset.actionPieceId = pieceId;
      });

      attackMap.forEach((targetPieceId, spaceId) => {
        const space = spaces.find(candidate => candidate.dataset.spaceId === spaceId);
        if (!space) return;
        space.classList.add('is-legal-attack');
        space.dataset.dejarikBoardAction = 'attack';
        space.dataset.actionPieceId = pieceId;
        space.dataset.actionTargetPieceId = targetPieceId;
      });

      if (selectionLabel) selectionLabel.textContent = pieceLabel;
      if (selectionHelp) selectionHelp.textContent = 'Blue spaces move this piece. Red enemy spaces attack immediately.';
      if (selectionStats) selectionStats.textContent = [pieceDetail, pieceSummary, pieceAbility].filter(Boolean).join(' • ');
    };

    const selectedPieceId = String(this._host.getSurfaceState?.('games')?.selectedDejarikPieceId || '').trim();
    if (selectedPieceId) {
      const selectedButton = selectorButtons.find(candidate => String(candidate.dataset.pieceId || '') === selectedPieceId);
      if (selectedButton) selectPiece(selectedButton);
      else this._host.patchSurfaceState?.('games', { selectedDejarikPieceId: null }, { render: false });
    }

    selectorButtons.forEach(button => {
      button.addEventListener('click', ev => {
        ev.preventDefault();
        ev.stopPropagation();
        selectPiece(button);
      }, { signal });
    });

    inspectButtons.forEach(button => {
      button.addEventListener('click', ev => {
        ev.preventDefault();
        ev.stopPropagation();
        updateDetailCard(button);
      }, { signal });
    });

    spaces.forEach(space => {
      space.addEventListener('click', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const boardAction = String(space.dataset.dejarikBoardAction || '').trim();
        if (boardAction === 'move') {
          await this._submitDejarikAction({
            sessionId,
            seatId,
            action: 'move',
            payload: {
              pieceId: String(space.dataset.actionPieceId || '').trim(),
              toSpaceId: String(space.dataset.spaceId || '').trim()
            }
          });
          return;
        }
        if (boardAction === 'attack') {
          await this._submitDejarikAction({
            sessionId,
            seatId,
            action: 'attack',
            payload: {
              pieceId: String(space.dataset.actionPieceId || '').trim(),
              targetPieceId: String(space.dataset.actionTargetPieceId || '').trim()
            }
          });
          return;
        }

        if (space.dataset.pieceCanSelect === 'true') {
          const pieceId = String(space.dataset.pieceId || '').trim();
          const button = selectorButtons.find(candidate => candidate.dataset.pieceId === pieceId);
          selectPiece(button);
          return;
        }

        if (space.dataset.pieceId) updateDetailCard(space);
      }, { signal });
    });
  }

  async _submitDejarikAction({ sessionId, seatId, action, payload = {} } = {}) {
    const result = await DejarikEngine.submitAction({ sessionId, seatId, action, payload });
    if (result?.pending) this._noteResult(result);
    else if (!result?.ok) ui.notifications?.warn?.(result?.error || 'Dejarik action failed.');
    else this._emitGameCue('dejarik', action, { sessionId });
    if (result?.ok) this._host.patchSurfaceState?.('games', { selectedDejarikPieceId: null }, { render: false });
    await this._render('dejarik-action-submit');
    return result;
  }



  async _render(reason = 'games-render') {
    await (requestShellRender(this._host, { reason, surfaceId: 'games' }));
  }

  _emitGameCue(gameId, cue, detail = {}) {
    try {
      window.dispatchEvent(new CustomEvent('swse:game-cue', {
        detail: { gameId, cue, ...detail }
      }));
    } catch (_err) {
      // Presentation cue hooks are best-effort and must never block gameplay.
    }
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
    if (typeof this._host?.patchSurfaceOptions === 'function') {
      this._host.patchSurfaceOptions({ sideDeckIds: selectedIds }, { render: false });
    }
  }

  _setOptions(patch = {}) {
    const nextPatch = { ...patch, source: 'games' };
    if (typeof this._host?.patchSurfaceOptions === 'function') {
      this._host.patchSurfaceOptions(nextPatch, { render: false });
    }
    void this._render('games-options-change');
  }

  _noteResult(result) {
    if (result?.pending) {
      ui.notifications?.info?.('Game request sent to the GM relay.');
    } else if (result === false || result == null) {
      ui.notifications?.warn?.('Game request could not be completed.');
    }
  }
}

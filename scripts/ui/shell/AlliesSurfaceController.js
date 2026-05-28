/**
 * AlliesSurfaceController — delegated interactions for the Holopad Allies app.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { AlliesSurfaceService } from '/systems/foundryvtt-swse/scripts/ui/shell/AlliesSurfaceService.js';

export class AlliesSurfaceController {
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
    const surface = root.querySelector('[data-shell-region="surface-allies"]');
    if (!surface) return;

    surface.addEventListener('click', async (ev) => {
      const target = ev.target instanceof Element ? ev.target.closest('[data-allies-action]') : null;
      if (!target) return;
      ev.preventDefault();
      ev.stopPropagation();
      await this._handleAction(target);
    }, { signal });

    surface.addEventListener('dragover', (ev) => {
      if (!this._canHandleDrop(ev)) return;
      ev.preventDefault();
      surface.classList.add('is-drag-over');
    }, { signal });

    surface.addEventListener('dragleave', () => {
      surface.classList.remove('is-drag-over');
    }, { signal });

    surface.addEventListener('drop', async (ev) => {
      if (!this._canHandleDrop(ev)) return;
      ev.preventDefault();
      ev.stopPropagation();
      surface.classList.remove('is-drag-over');
      await this._handleDrop(ev);
    }, { signal });
  }

  destroy() {
    this._abort?.abort();
    this._abort = null;
  }

  async _handleAction(target) {
    const action = target.dataset.alliesAction;
    try {
      switch (action) {
        case 'select-tab':
          return this._selectTab(target.dataset.tabId);
        case 'toggle-history':
          return this._toggleHistory();
        case 'build-follower':
          return this._buildFollower(target.dataset.slotId);
        case 'build-minion':
          return this._buildMinion(target.dataset.slotId);
        case 'build-beast':
          return this._notify('Beast companion creation is not implemented yet. A GM can drag a beast/nonheroic NPC into Allies as a linked actor.');
        case 'manage-ally':
        case 'open-actor':
          return this._openActor(target.dataset.actorId);
        case 'level-up-follower':
        case 'recalculate-follower':
          return this._levelUpFollower(target.dataset.actorId);
        case 'sync-minions':
        case 'sync-minion':
          return this._syncMinions(target.dataset.actorId);
        case 'request-beast-level-up':
          return this._requestBeastLevelUp(target.dataset.actorId);
        case 'fire-ally':
          return this._fireAlly(target.dataset.actorId);
        case 'rehire-ally':
          return this._rehireAlly(target.dataset.actorId);
        case 'open-garage':
          return this._openGarage(target.dataset.actorId);
        default:
          SWSELogger.warn(`[AlliesSurfaceController] Unknown action: ${action}`);
      }
    } catch (err) {
      SWSELogger.error(`[AlliesSurfaceController] Action "${action}" failed:`, err);
      ui?.notifications?.error?.(`Allies action failed: ${err.message}`);
    }
  }

  async _selectTab(tabId) {
    await this._host.setSurface('allies', {
      ...(this._host._shellSurfaceOptions ?? {}),
      activeTab: tabId || 'companions'
    });
    this._host.render(false);
  }

  async _toggleHistory() {
    const current = this._host._shellSurfaceOptions ?? {};
    await this._host.setSurface('allies', {
      ...current,
      showHistory: !(current.showHistory === true || current.showHistory === 'true')
    });
    this._host.render(false);
  }

  async _buildFollower(slotId) {
    const { launchFollowerProgression } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js');
    await launchFollowerProgression(this._actor, { slotId, source: 'allies' });
    this._host.render(false);
  }

  async _buildMinion(slotId) {
    const { launchMinionCreation } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js');
    await launchMinionCreation(this._actor, { slotId, source: 'allies' });
    this._host.render(false);
  }

  _openActor(actorId) {
    const actor = game.actors?.get?.(actorId);
    if (!actor) {
      ui?.notifications?.warn?.('That ally actor could not be found.');
      return;
    }
    actor.sheet?.render?.(true);
  }

  async _levelUpFollower(actorId) {
    const { FollowerCreator } = await import('/systems/foundryvtt-swse/scripts/apps/follower-creator.js');
    if (typeof FollowerCreator.updateFollowerForOwnerLevel === 'function' && actorId) {
      const follower = game.actors?.get?.(actorId);
      await FollowerCreator.updateFollowerForOwnerLevel(this._actor, follower);
    } else {
      await FollowerCreator.updateFollowersForLevelUp(this._actor);
    }
    ui?.notifications?.info?.('Follower recalculated from owner level.');
    this._host.render(false);
  }

  async _syncMinions(actorId) {
    const { MinionCreator } = await import('/systems/foundryvtt-swse/scripts/apps/minion-creator.js');
    if (typeof MinionCreator.updateMinionForOwnerLevel === 'function' && actorId) {
      const minion = game.actors?.get?.(actorId);
      await MinionCreator.updateMinionForOwnerLevel(this._actor, minion);
    } else {
      await MinionCreator.updateMinionsForOwnerLevel(this._actor);
    }
    ui?.notifications?.info?.('Minion synced to owner heroic level - 2.');
    this._host.render(false);
  }

  async _requestBeastLevelUp(actorId) {
    const ok = await AlliesSurfaceService.requestBeastLevelUp(this._actor, actorId);
    if (ok) ui?.notifications?.info?.('Beast level-up request sent to the chat for GM approval.');
    this._host.render(false);
  }

  async _fireAlly(actorId) {
    const ally = game.actors?.get?.(actorId);
    if (!ally) return this._notify('That ally actor could not be found.');
    const shouldFire = await Dialog.confirm({
      title: `Fire ${ally.name}?`,
      content: `<p>${ally.name} will be moved to Previously Hired. The actor will not be deleted and can be rehired later.</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: false
    });
    if (!shouldFire) return;
    const ok = await AlliesSurfaceService.dismissCompanion(this._actor, actorId);
    if (ok) ui?.notifications?.info?.(`${ally.name} moved to Previously Hired.`);
    this._host.render(false);
  }

  async _rehireAlly(actorId) {
    const ok = await AlliesSurfaceService.rehireCompanion(this._actor, actorId);
    if (ok) ui?.notifications?.info?.('Ally rehired and restored to the active list.');
    this._host.render(false);
  }

  async _openGarage(actorId) {
    await this._host.setSurface('customization', {
      source: 'allies',
      bayMode: 'garage',
      contextMode: 'modifyExisting',
      targetActorId: actorId || null
    });
    this._host.render(false);
  }

  _notify(message) {
    ui?.notifications?.info?.(message);
  }

  _canHandleDrop(ev) {
    const types = Array.from(ev?.dataTransfer?.types || []);
    return types.includes('text/plain') || types.includes('application/json');
  }

  async _handleDrop(ev) {
    let data = null;
    try {
      data = TextEditor.getDragEventData(ev);
    } catch {
      try { data = JSON.parse(ev.dataTransfer?.getData('text/plain') || '{}'); } catch { data = null; }
    }

    const uuid = data?.uuid || data?.documentUuid;
    const actor = uuid
      ? await fromUuid(uuid)
      : data?.type === 'Actor' && data?.id
        ? game.actors?.get?.(data.id)
        : null;

    if (!actor) {
      ui?.notifications?.warn?.('Drop an Actor document here to assign it as an ally.');
      return;
    }

    const ok = await AlliesSurfaceService.assignDroppedActor(this._actor, actor);
    if (ok) ui?.notifications?.info?.(`${actor.name} assigned to ${this._actor.name}'s Allies.`);
    this._host.render(false);
  }
}

export default AlliesSurfaceController;

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
    this._hookListeners = [];
  }

  attach(root) {
    this._actor = this._host?.actor ?? this._actor;
    this._abort?.abort();
    this._abort = new AbortController();
    const { signal } = this._abort;
    const surface = root.querySelector('[data-shell-region="surface-allies"]');
    if (!surface) return;
    this._wireFactionRefreshHooks();

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
    for (const [hook, fn] of this._hookListeners) Hooks.off(hook, fn);
    this._hookListeners = [];
  }


  _wireFactionRefreshHooks() {
    for (const [hook, fn] of this._hookListeners) Hooks.off(hook, fn);
    this._hookListeners = [];
    // Debounced refresh — collapses multiple hook fires in the same tick into one render.
    let _refreshTimer = null;
    const refresh = () => {
      if (_refreshTimer) return;
      _refreshTimer = setTimeout(() => {
        _refreshTimer = null;
        this._host?.render?.(false);
      }, 0);
    };
    const actorRefresh = (payload = {}) => {
      if (!payload?.actor || payload.actor.id === this._actor?.id) refresh();
    };
    const scoreRefresh = (payload = {}) => {
      if (!payload?.actorId || payload.actorId === this._actor?.id) refresh();
    };
    const holonetRefresh = (payload = {}) => {
      if (payload?.type !== 'faction-score-changed') return;
      const actorIds = Array.isArray(payload.actorIds) ? payload.actorIds : [];
      if (!actorIds.length || actorIds.includes(this._actor?.id)) refresh();
    };
    for (const [hook, fn] of [
      ['swseFactionRegistryUpdated', refresh],
      ['swseActorFactionRelationshipsUpdated', actorRefresh],
      ['swseFactionScoreChanged', scoreRefresh],
      ['swse:factionScoreChanged', scoreRefresh],
      ['swseHolonetUpdated', holonetRefresh]
    ]) {
      Hooks.on(hook, fn);
      this._hookListeners.push([hook, fn]);
    }
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
        case 'add-faction':
          return this._addFaction();
        case 'save-faction':
          return this._saveFaction(target);
        case 'remove-faction':
          return this._removeFaction(target.dataset.factionId);
        case 'add-base':
          return this._addBase();
        case 'save-base':
          return this._saveBase(target);
        case 'remove-base':
          return this._removeBase(target.dataset.baseId);
        case 'add-organization':
          return this._addOrganization();
        case 'save-organization':
          return this._saveOrganization(target);
        case 'remove-organization':
          return this._removeOrganization(target.dataset.organizationId);
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

  async _addFaction() {
    const ok = await AlliesSurfaceService.addFaction(this._actor);
    if (ok) ui?.notifications?.info?.('Faction record created. Fill in the text fields and save when ready.');
    this._host.render(false);
  }

  async _saveFaction(target) {
    const factionId = target.dataset.factionId;
    const form = target.closest('form');
    if (!form || !factionId) return this._notify('Faction form could not be found.');
    const data = this._collectFactionForm(form);
    const ok = await AlliesSurfaceService.saveFaction(this._actor, factionId, data);
    if (ok) ui?.notifications?.info?.('Faction record saved.');
  }

  async _removeFaction(factionId) {
    if (!factionId) return this._notify('Faction record could not be found.');
    const shouldRemove = await Dialog.confirm({
      title: 'Remove Faction Record?',
      content: '<p>This removes the faction record from this actor. It does not change jobs, credits, reputation history, or world faction data.</p>',
      yes: () => true,
      no: () => false,
      defaultYes: false
    });
    if (!shouldRemove) return;
    const ok = await AlliesSurfaceService.removeFaction(this._actor, factionId);
    if (ok) ui?.notifications?.info?.('Faction record removed.');
    this._host.render(false);
  }

  _collectFactionForm(form) {
    const formData = new FormData(form);
    return {
      factionId: String(formData.get('factionId') ?? '').trim(),
      name: String(formData.get('name') ?? '').trim(),
      type: String(formData.get('type') ?? '').trim(),
      planet: String(formData.get('planet') ?? '').trim(),
      system: String(formData.get('system') ?? '').trim(),
      scale: String(formData.get('scale') ?? '').trim(),
      leader: String(formData.get('leader') ?? '').trim(),
      relationshipType: String(formData.get('relationshipType') ?? 'known').trim(),
      benefits: String(formData.get('benefits') ?? '').trim(),
      notes: String(formData.get('notes') ?? '').trim(),
      gmNotes: String(formData.get('gmNotes') ?? '').trim(),
      source: String(formData.get('source') ?? '').trim(),
      score: Number.parseInt(String(formData.get('score') ?? '0'), 10) || 0
    };
  }

  async _addBase() {
    const ok = await AlliesSurfaceService.addBase(this._actor);
    if (ok) ui?.notifications?.info?.('Base record created. Fill in the text fields and save when ready.');
    this._host.render(false);
  }

  async _saveBase(target) {
    const baseId = target.dataset.baseId;
    const form = target.closest('form');
    if (!form || !baseId) return this._notify('Base form could not be found.');
    const data = this._collectBaseForm(form);
    const ok = await AlliesSurfaceService.saveBase(this._actor, baseId, data);
    if (ok) ui?.notifications?.info?.('Base record saved.');
  }

  async _removeBase(baseId) {
    if (!baseId) return this._notify('Base record could not be found.');
    const shouldRemove = await Dialog.confirm({
      title: 'Remove Base Record?',
      content: '<p>This removes the text record from this actor. It does not delete scenes, actors, items, ships, or vehicles.</p>',
      yes: () => true,
      no: () => false,
      defaultYes: false
    });
    if (!shouldRemove) return;
    const ok = await AlliesSurfaceService.removeBase(this._actor, baseId);
    if (ok) ui?.notifications?.info?.('Base record removed.');
    this._host.render(false);
  }

  _collectBaseForm(form) {
    const formData = new FormData(form);
    const data = { accommodations: {} };
    for (const [key, value] of formData.entries()) {
      if (String(key).startsWith('accommodations.')) {
        data.accommodations[String(key).slice('accommodations.'.length)] = String(value ?? '').trim();
      } else {
        data[key] = String(value ?? '').trim();
      }
    }
    return data;
  }

  async _addOrganization() {
    const ok = await AlliesSurfaceService.addOrganization(this._actor);
    if (ok) ui?.notifications?.info?.('Organization record created. Players can describe it; the GM governs scale, score, benefits, bases, and statistics.');
    this._host.render(false);
  }

  async _saveOrganization(target) {
    const organizationId = target.dataset.organizationId;
    const form = target.closest('form');
    if (!form || !organizationId) return this._notify('Organization form could not be found.');
    const data = this._collectOrganizationForm(form);
    const ok = await AlliesSurfaceService.saveOrganization(this._actor, organizationId, data);
    if (ok) ui?.notifications?.info?.('Organization record saved.');
  }

  async _removeOrganization(organizationId) {
    if (!organizationId) return this._notify('Organization record could not be found.');
    const shouldRemove = await Dialog.confirm({
      title: 'Remove Organization Record?',
      content: '<p>This removes the organization record from this actor. Only the GM can remove organization records.</p>',
      yes: () => true,
      no: () => false,
      defaultYes: false
    });
    if (!shouldRemove) return;
    const ok = await AlliesSurfaceService.removeOrganization(this._actor, organizationId);
    if (ok) ui?.notifications?.info?.('Organization record removed.');
    this._host.render(false);
  }

  _collectOrganizationForm(form) {
    const formData = new FormData(form);
    return {
      name: String(formData.get('name') ?? '').trim(),
      type: String(formData.get('type') ?? '').trim(),
      planet: String(formData.get('planet') ?? '').trim(),
      system: String(formData.get('system') ?? '').trim(),
      leader: String(formData.get('leader') ?? '').trim(),
      alignedWithFactionId: String(formData.get('alignedWithFactionId') ?? '').trim(),
      alignedAgainstFactionId: String(formData.get('alignedAgainstFactionId') ?? '').trim(),
      alignmentNotes: String(formData.get('alignmentNotes') ?? '').trim(),
      notes: String(formData.get('notes') ?? '').trim(),
      scale: Number.parseInt(String(formData.get('scale') ?? '1'), 10) || 1,
      score: Number.parseInt(String(formData.get('score') ?? '0'), 10) || 0,
      benefits: String(formData.get('benefits') ?? '').trim(),
      bases: String(formData.get('bases') ?? '').trim(),
      statistics: String(formData.get('statistics') ?? '').trim()
    };
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

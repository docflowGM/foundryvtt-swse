/**
 * GMWorkspaceSurfaceController
 *
 * Owns DOM wiring for workspace actor quick actions and the GM-side
 * faction/organization skeleton. Actor ownership and sheet rendering stay with
 * Foundry's actor/sheet APIs; faction state is delegated to FactionRegistryService.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';
import { mutateAndRepaint } from '/systems/foundryvtt-swse/scripts/ui/shell/mutate-and-repaint.js';
import { TransactionEngine } from '/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js';
import { applyXP, isXPEnabled, determineLevelFromXP } from '/systems/foundryvtt-swse/scripts/engine/progression/xp-engine.js';
import { XP_LEVEL_THRESHOLDS, XP_MAX_LEVEL } from '/systems/foundryvtt-swse/scripts/engine/shared/xp-system.js';
import { GMPartyRosterService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/utils/gm-party-roster-service.js';
import { GMCombatRecoveryService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-combat-recovery-service.js';

export class GMWorkspaceSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.querySelector('.gm-datapad-workspace');
    if (!pageElement) return;
    if (!this._assertGM('open the GM workspace')) return;

    this._wireActorOpenControls(pageElement, signal);
    this._wireWorkspaceQuickControls(pageElement, signal);
    this._wireFullHealthControls(pageElement, signal);
    this._wirePartyActorPanels(pageElement, signal);
    this._wirePartyManager(pageElement, signal);
    this._wireFactionForms(pageElement, signal);
    this._wireFactionActions(pageElement, signal);
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
  }

  _assertGM(action = 'use GM workspace controls') {
    if (game.user?.isGM) return true;
    ui?.notifications?.warn?.(`Only a GM can ${action}.`);
    return false;
  }

  _wireActorOpenControls(pageElement, signal) {
    pageElement.querySelectorAll('[data-open-actor]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const actorId = event.currentTarget.dataset.openActor;
        const actor = game.actors?.get?.(actorId);
        if (!actor) {
          SWSELogger.warn?.(`[GMWorkspaceSurfaceController] Could not open missing actor ${actorId}`);
          ui?.notifications?.warn?.('That actor could not be found.');
          return;
        }
        actor.sheet?.render?.(true);
      }, { signal });
    });
  }


  _resolveActor(actorId) {
    const actor = game.actors?.get?.(actorId);
    if (!actor) ui?.notifications?.warn?.('That actor could not be found.');
    return actor;
  }

  _wireWorkspaceQuickControls(pageElement, signal) {
    pageElement.querySelectorAll('[data-workspace-party-toggle]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const actor = this._resolveActor(event.currentTarget.dataset.workspacePartyToggle);
        if (!actor) return;
        if (!this._assertGM('change the GM party roster')) return;
        const current = GMPartyRosterService.isPartyMember(actor);
        await this._setPartyMembership(actor, !current, 'gm-workspace-party-toggle');
      }, { signal });
    });

    pageElement.querySelectorAll('[data-workspace-xp-grant]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const actor = this._resolveActor(event.currentTarget.dataset.actorId);
        if (!actor) return;
        const amount = Math.max(0, Number(event.currentTarget.dataset.workspaceXpGrant || 0) || 0);
        if (!amount) return;
        await this._grantXp(actor, amount, 'gm-workspace-xp-grant');
      }, { signal });
    });

    pageElement.querySelectorAll('[data-workspace-credit-adjust]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const actor = this._resolveActor(event.currentTarget.dataset.actorId);
        if (!actor) return;
        if (!this._assertGM('adjust credits from the GM workspace')) return;
        const amount = Number(event.currentTarget.dataset.workspaceCreditAdjust || 0) || 0;
        if (!amount) return;
        const result = await mutateAndRepaint(this.host, () => TransactionEngine.executeCreditAdjustment({
          actor,
          amount,
          reason: 'GM Workspace quick credit adjustment',
          transactionContext: 'gm-credit-adjustment',
          audit: { source: 'gm-workspace', note: 'GM workspace quick action' }
        }, { source: 'GMWorkspaceSurfaceController.quickCreditAdjust' }), { reason: 'gm-workspace-credit-adjust', surfaceId: 'workspace' });
        if (!result?.success) {
          ui?.notifications?.error?.(result?.error || 'Credit adjustment failed.');
          return;
        }
        ui?.notifications?.info?.(`${actor.name} credits adjusted by ${amount > 0 ? '+' : ''}${amount}.`);
      }, { signal });
    });
  }


  async _restoreFullHealth(actorIds = [], label = '') {
    if (!this._assertGM('restore full health from the GM workspace')) return false;
    const ids = Array.isArray(actorIds) ? actorIds.filter(Boolean).map(String) : [];
    const targetMode = ids.length ? 'selected' : 'party';
    const ok = await mutateAndRepaint(this.host, async () => GMCombatRecoveryService.executeGroupAction('full-health', {
      targetMode,
      actorIds: ids
    }), { reason: 'gm-workspace-full-health', surfaceId: 'workspace' });

    if (!ok?.success) {
      ui?.notifications?.error?.(ok?.error || 'Full health restore failed.');
      return false;
    }

    ui?.notifications?.info?.(ok.message || `${label || 'Target'} restored to full health.`);
    return true;
  }

  _wireFullHealthControls(pageElement, signal) {
    pageElement.querySelectorAll('[data-party-full-health]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        await this._restoreFullHealth([], 'whole party');
      }, { signal });
    });

    pageElement.querySelectorAll('[data-actor-full-health]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const actorId = event.currentTarget.dataset.actorFullHealth;
        const actor = this._resolveActor(actorId);
        if (!actor) return;
        await this._restoreFullHealth([actor.id], actor.name);
      }, { signal });
    });
  }

  _wirePartyActorPanels(pageElement, signal) {
    pageElement.querySelectorAll('form[data-party-xp-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const actor = this._resolveActor(form.dataset.partyXpForm);
        if (!actor) return;
        if (!this._assertGM('grant party XP')) return;
        const data = new FormData(form);
        const amount = Math.max(0, Number(data.get('xpAmount') || 0) || 0);
        if (!amount) {
          ui?.notifications?.warn?.('Enter a positive XP amount.');
          return;
        }
        await this._grantXp(actor, amount, 'gm-party-manager-xp');
      }, { signal });
    });

    pageElement.querySelectorAll('[data-party-xp-preset]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const actor = this._resolveActor(event.currentTarget.dataset.actorId);
        if (!actor) return;
        const amount = Math.max(0, Number(event.currentTarget.dataset.partyXpPreset || 0) || 0);
        if (!amount) return;
        await this._grantXp(actor, amount, 'gm-party-manager-xp-preset');
      }, { signal });
    });

    pageElement.querySelectorAll('[data-party-open-intel]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const actor = this._resolveActor(event.currentTarget.dataset.partyOpenIntel);
        if (!actor) return;
        await this._openIntelForActor(actor);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-party-open-job]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const actor = this._resolveActor(event.currentTarget.dataset.partyOpenJob);
        if (!actor) return;
        await this._openJobWizardForActor(actor);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-party-actor-rest]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const actor = this._resolveActor(event.currentTarget.dataset.actorId);
        if (!actor) return;
        const action = event.currentTarget.dataset.partyActorRest || 'extended-rest';
        await this._runRecoveryActionForActor(actor, action);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-party-restore-force]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const actor = this._resolveActor(event.currentTarget.dataset.partyRestoreForce);
        if (!actor) return;
        await this._restoreForcePoints(actor);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-party-level-up]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const actor = this._resolveActor(event.currentTarget.dataset.partyLevelUp);
        if (!actor) return;
        await this._grantLevelUpXp(actor);
      }, { signal });
    });
  }

  async _grantXp(actor, amount, reason = 'gm-workspace-xp-grant', options = {}) {
    if (!actor || !amount) return false;
    if (!this._assertGM('grant XP from the GM workspace')) return false;
    if (!isXPEnabled()) {
      ui?.notifications?.warn?.('XP tracking is disabled in House Rules. XP and level-up XP controls are hidden until XP tracking is enabled.');
      return false;
    }
    const result = await mutateAndRepaint(this.host, () => applyXP(actor, amount), { reason, surfaceId: 'workspace' });
    if (!result) {
      ui?.notifications?.warn?.('XP is disabled or the XP amount could not be applied.');
      return false;
    }
    if (options.notify !== false) {
      const message = options.message || `${actor.name} gains ${amount} XP${result.leveledUp ? ` and qualifies for level ${result.newLevel}` : ''}.`;
      ui?.notifications?.info?.(message);
    }
    return result;
  }

  _getLevelUpXpGrant(actor) {
    if (!actor || !isXPEnabled()) return null;
    const xpTotal = Number(actor.system?.xp?.total ?? actor.system?.xp?.value ?? actor.system?.experience ?? 0) || 0;
    const actorLevel = Number(actor.system?.level ?? actor.system?.details?.level ?? actor.system?.progression?.level ?? 0) || 1;
    const xpLevel = determineLevelFromXP(xpTotal);
    const basisLevel = Math.max(actorLevel, xpLevel, 1);
    if (basisLevel >= XP_MAX_LEVEL) {
      return { amount: 0, targetLevel: XP_MAX_LEVEL, xpTotal, reason: 'max-level' };
    }
    const targetLevel = basisLevel + 1;
    const targetXp = XP_LEVEL_THRESHOLDS[targetLevel];
    const amount = Math.max(0, Number(targetXp ?? 0) - xpTotal);
    return { amount, targetLevel, targetXp, xpTotal, actorLevel, xpLevel };
  }

  async _grantLevelUpXp(actor) {
    if (!actor) return false;
    if (!this._assertGM('grant level-up XP from the GM party manager')) return false;
    const grant = this._getLevelUpXpGrant(actor);
    if (!grant) {
      ui?.notifications?.warn?.('XP tracking is disabled in House Rules. Enable XP tracking before granting level-up XP.');
      return false;
    }
    if (!grant.amount) {
      ui?.notifications?.warn?.(`${actor.name} does not need more XP for the next tracked level.`);
      return false;
    }
    const formattedAmount = grant.amount.toLocaleString();
    return this._grantXp(actor, grant.amount, 'gm-party-manager-level-up-xp', {
      message: `${actor.name} gains ${formattedAmount} XP, enough to qualify for level ${grant.targetLevel}. The player can run the level-up flow when they are ready.`
    });
  }

  async _runRecoveryActionForActor(actor, action = 'extended-rest') {
    if (!actor) return false;
    if (!this._assertGM('run recovery actions from the GM party manager')) return false;
    const ok = await mutateAndRepaint(this.host, () => GMCombatRecoveryService.executeGroupAction(action, {
      targetMode: 'selected',
      actorIds: [actor.id]
    }), { reason: `gm-party-manager-${action}`, surfaceId: 'workspace' });
    if (!ok?.success) {
      ui?.notifications?.error?.(ok?.error || 'Recovery action failed.');
      return false;
    }
    ui?.notifications?.info?.(ok.message || `${actor.name}: ${action} complete.`);
    return true;
  }

  async _restoreForcePoints(actor) {
    if (!actor) return false;
    if (!this._assertGM('restore Force Points from the GM party manager')) return false;
    const fp = actor.system?.forcePoints ?? actor.system?.resources?.forcePoints ?? null;
    const max = Number(fp?.max ?? 0) || 0;
    if (max <= 0) {
      ui?.notifications?.warn?.(`${actor.name} does not have a Force Point pool.`);
      return false;
    }

    const result = await mutateAndRepaint(this.host, async () => {
      if (typeof actor.regainForcePoints === 'function') return actor.regainForcePoints(null);
      const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
      await ActorEngine.updateActor(actor, { 'system.forcePoints.value': max });
      return { success: true, newValue: max, regained: Math.max(0, max - (Number(fp.value ?? 0) || 0)) };
    }, { reason: 'gm-party-manager-restore-fp', surfaceId: 'workspace' });

    if (!result?.success) {
      ui?.notifications?.warn?.(`Could not restore Force Points for ${actor.name}.`);
      return false;
    }

    const regained = Number(result.regained ?? 0) || 0;
    ui?.notifications?.info?.(regained > 0
      ? `${actor.name} regained ${regained} Force Point${regained === 1 ? '' : 's'}.`
      : `${actor.name} is already at maximum Force Points.`);
    return true;
  }

  async _openIntelForActor(actor) {
    if (!actor) return false;
    if (!this._assertGM('prepare Intel from the GM party manager')) return false;
    const defaults = {
      title: `Intel for ${actor.name}`,
      kind: 'clue',
      linkedActorUuid: actor.uuid || `Actor.${actor.id}`,
      summary: `Information packet connected to ${actor.name}.`,
      publicBody: '',
      gmNotes: `Prepared from the GM Party Manager for ${actor.name}.`,
      tags: ['party', actor.name].filter(Boolean),
      visibility: {
        mode: 'selected-players',
        actorIds: [actor.id]
      }
    };
    this.host?.patchSurfaceState?.('intel', {
      selectedRecordId: '',
      selectedMode: 'create',
      modal: { type: 'editor', recordId: '', defaults }
    }, { render: false });
    await this.host?._navigateTo?.('intel');
    return true;
  }

  async _openJobWizardForActor(actor) {
    if (!actor) return false;
    if (!this._assertGM('prepare a Job from the GM party manager')) return false;
    const draft = {
      title: `Mission for ${actor.name}`,
      primaryObjective: `Objective assigned to ${actor.name}`,
      briefing: `This contract was started from the GM Party Manager for ${actor.name}. Replace this text with the mission briefing the party should see.`,
      instructions: `${actor.name} is the current focus/assignee for this contract.`,
      status: 'draft',
      assignedActorId: actor.id,
      assignedActorUuid: actor.uuid || `Actor.${actor.id}`,
      assignedActorName: actor.name,
      client: {
        type: 'party',
        name: 'The Party',
        factionName: '',
        imageUrl: actor.img || '',
        saveForReuse: false
      }
    };
    this.host?.patchSurfaceState?.('jobs', {
      openWizard: true,
      pendingJobDraft: draft,
      gmJobTab: 'drafts'
    }, { render: false });
    await this.host?._navigateTo?.('jobs');
    return true;
  }

  async _setPartyMembership(actor, included, reason = 'gm-workspace-party-membership') {
    if (!actor) return false;
    if (!this._assertGM('change the GM party roster')) return false;
    const ok = await mutateAndRepaint(this.host, () => GMPartyRosterService.setPartyMember(actor, included === true), { reason, surfaceId: 'workspace' });
    if (ok !== false) ui?.notifications?.info?.(`${actor.name} ${included ? 'added to' : 'removed from'} the GM party roster.`);
    return ok !== false;
  }

  _wirePartyManager(pageElement, signal) {
    pageElement.querySelectorAll('[data-party-drag-actor-id]').forEach((card) => {
      card.addEventListener('dragstart', (event) => {
        const actorId = event.currentTarget.dataset.partyDragActorId;
        const actor = game.actors?.get?.(actorId);
        if (!actor) return;
        const payload = JSON.stringify({ type: 'Actor', id: actor.id, uuid: actor.uuid, swseDropKind: 'party-member' });
        event.dataTransfer?.setData?.('text/plain', payload);
        event.dataTransfer?.setData?.('application/json', payload);
        event.dataTransfer?.setDragImage?.(event.currentTarget, 24, 24);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-party-drop-zone]').forEach((zone) => {
      zone.addEventListener('dragover', (event) => {
        event.preventDefault();
        zone.classList.add('is-dragover');
      }, { signal });
      zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover'), { signal });
      zone.addEventListener('drop', async (event) => {
        event.preventDefault();
        zone.classList.remove('is-dragover');
        const mode = zone.dataset.partyDropZone || 'add';
        const actor = await this._actorFromDropEvent(event, { allowImport: mode === 'add' });
        if (!actor) return;
        await this._setPartyMembership(actor, mode === 'add', mode === 'add' ? 'gm-workspace-party-drop-add' : 'gm-workspace-party-drop-remove');
      }, { signal });
    });

    pageElement.querySelectorAll('[data-party-remove-actor]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const actor = this._resolveActor(event.currentTarget.dataset.partyRemoveActor);
        if (!actor) return;
        await this._setPartyMembership(actor, false, 'gm-workspace-party-remove');
      }, { signal });
    });

    pageElement.querySelectorAll('[data-party-add-actor]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const actor = this._resolveActor(event.currentTarget.dataset.partyAddActor);
        if (!actor) return;
        await this._setPartyMembership(actor, true, 'gm-workspace-party-picker-add');
      }, { signal });
    });

    const modal = pageElement.querySelector('[data-party-picker-modal]');
    pageElement.querySelectorAll('[data-party-open-picker]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        if (!modal) return;
        modal.hidden = false;
        modal.classList.add('is-open');
        modal.querySelector('[data-party-picker-search]')?.focus?.();
      }, { signal });
    });
    pageElement.querySelectorAll('[data-party-close-picker]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        if (!modal) return;
        modal.classList.remove('is-open');
        modal.hidden = true;
      }, { signal });
    });

    const findPartyMemberModal = (actorId) => Array.from(pageElement.querySelectorAll('[data-party-member-modal]'))
      .find((candidate) => candidate.dataset.partyMemberModal === String(actorId || '')) ?? null;
    const closePartyMemberModal = (partyModal) => {
      if (!partyModal) return;
      partyModal.classList.remove('is-open');
      partyModal.hidden = true;
    };
    const openPartyMemberModal = (actorId) => {
      const partyModal = findPartyMemberModal(actorId);
      if (!partyModal) {
        ui?.notifications?.warn?.('That party member command panel could not be found.');
        return;
      }
      partyModal.hidden = false;
      partyModal.classList.add('is-open');
      const focusTarget = partyModal.querySelector('[data-party-member-close], button, input, textarea, select');
      focusTarget?.focus?.();
    };

    pageElement.querySelectorAll('[data-party-member-open]').forEach((control) => {
      control.addEventListener('click', (event) => {
        const isSummaryCard = event.currentTarget.classList.contains('gm-party-member-summary');
        if (isSummaryCard && event.target?.closest?.('button, a, input, textarea, select, label')) return;
        event.preventDefault();
        event.stopPropagation();
        openPartyMemberModal(event.currentTarget.dataset.partyMemberOpen);
      }, { signal });

      control.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        openPartyMemberModal(event.currentTarget.dataset.partyMemberOpen);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-party-member-close]').forEach((control) => {
      control.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closePartyMemberModal(findPartyMemberModal(event.currentTarget.dataset.partyMemberClose));
      }, { signal });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      pageElement.querySelectorAll('[data-party-member-modal].is-open').forEach(closePartyMemberModal);
    }, { signal });

    const search = pageElement.querySelector('[data-party-picker-search]');
    search?.addEventListener('input', (event) => {
      const query = String(event.currentTarget.value || '').toLowerCase().trim();
      pageElement.querySelectorAll('[data-party-picker-row]').forEach((row) => {
        const haystack = String(row.dataset.partySearch || '').toLowerCase();
        row.hidden = Boolean(query && !haystack.includes(query));
      });
    }, { signal });
  }

  _parseDropData(event) {
    const transfer = event?.dataTransfer;
    if (!transfer) return null;
    const candidates = [
      transfer.getData?.('application/json'),
      transfer.getData?.('text/plain'),
      transfer.getData?.('text')
    ].filter(Boolean);
    for (const raw of candidates) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_err) {
        // Ignore non-JSON drag payloads.
      }
    }
    return null;
  }

  async _actorFromDropEvent(event, { allowImport = false } = {}) {
    const data = this._parseDropData(event);
    if (!data) {
      ui?.notifications?.warn?.('Drop an Actor, token, or compendium Actor onto the party manager.');
      return null;
    }

    if (data.id && data.type === 'Actor') {
      const actor = game.actors?.get?.(data.id);
      if (actor) return actor;
    }

    let document = null;
    try {
      if (data.uuid && typeof fromUuid === 'function') document = await fromUuid(data.uuid);
      if (!document && data.actorUuid && typeof fromUuid === 'function') document = await fromUuid(data.actorUuid);
    } catch (err) {
      SWSELogger.warn?.('[GMWorkspaceSurfaceController] Could not resolve dropped party actor UUID:', err);
    }

    const tokenActor = document?.actor ?? document?.object?.actor ?? null;
    if (tokenActor) return tokenActor;

    if (document?.documentName === 'Actor' || document?.constructor?.documentName === 'Actor') {
      const worldActor = game.actors?.get?.(document.id);
      if (worldActor) return worldActor;
      if (allowImport && (document.pack || String(document.uuid || '').startsWith('Compendium.'))) {
        return this._importCompendiumActor(document);
      }
      ui?.notifications?.warn?.('That Actor is not in the world yet. Drop it into the add zone to import and add it to the party.');
      return null;
    }

    if (data.actorId) {
      const actor = game.actors?.get?.(data.actorId);
      if (actor) return actor;
    }

    ui?.notifications?.warn?.('Only Actor and actor-token drops can be used for party membership.');
    return null;
  }

  async _importCompendiumActor(document) {
    if (!this._assertGM('import compendium actors into the party roster')) return null;
    try {
      const data = document.toObject?.() ?? foundry.utils.duplicate(document);
      delete data._id;
      const created = await Actor.create(data, { renderSheet: false });
      ui?.notifications?.info?.(`Imported ${created.name} from compendium.`);
      return created;
    } catch (err) {
      SWSELogger.error?.('[GMWorkspaceSurfaceController] Failed to import dropped compendium actor:', err);
      ui?.notifications?.error?.('Could not import that compendium Actor.');
      return null;
    }
  }

  _wireFactionForms(pageElement, signal) {
    pageElement.querySelectorAll('form[data-faction-create-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change workspace faction records')) return;
        const data = new FormData(form);
        const text = (key) => String(data.get(key) || '').trim();
        const number = (key) => Number(data.get(key) || 0) || 0;
        const actorId = text('actorId');
        const faction = await mutateAndRepaint(this.host, () => FactionRegistryService.upsertFaction({
          name: text('name'),
          type: text('type') || 'Faction',
          planetSystem: text('planetSystem'),
          scale: number('scale') || 1,
          leader: text('leader'),
          startingScore: number('startingScore'),
          score: number('startingScore'),
          benefits: text('benefits'),
          notes: text('notes'),
          gmNotes: text('gmNotes'),
          source: 'gm',
          status: 'active'
        }), { reason: 'gm-workspace-faction-upsert', surfaceId: 'workspace', render: false });
        if (actorId) {
          const actor = game.actors?.get?.(actorId);
          if (actor) {
            await mutateAndRepaint(this.host, () => FactionRegistryService.addActorRelationship({
              actor,
              faction,
              relationshipType: text('relationshipType') || 'known',
              score: number('startingScore'),
              benefits: text('benefits'),
              notes: text('notes'),
              gmNotes: text('gmNotes'),
              source: 'gm',
              status: 'active'
            }), { reason: 'gm-workspace-faction-attach', surfaceId: 'workspace', render: false });
          }
        }
        ui?.notifications?.info?.(`Faction relationship prepared: ${faction.name}.`);
        form.reset();
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
      }, { signal });
    });
  }

  _wireFactionActions(pageElement, signal) {
    pageElement.querySelectorAll('[data-delete-faction]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!this._assertGM('delete workspace faction records')) return;
        const factionId = event.currentTarget.dataset.deleteFaction;
        if (!factionId) return;
        const ok = await mutateAndRepaint(this.host, () => FactionRegistryService.deleteFaction(factionId), { reason: 'gm-workspace-faction-delete', surfaceId: 'workspace', render: false });
        if (ok) ui?.notifications?.info?.('Faction removed from the GM registry. Actor relationship flags are not deleted.');
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
      }, { signal });
    });
  }
}

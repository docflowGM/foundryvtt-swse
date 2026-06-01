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
import { applyXP } from '/systems/foundryvtt-swse/scripts/engine/progression/xp-engine.js';

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
        const current = actor.getFlag?.('foundryvtt-swse', 'gmPartyMember') === true;
        await mutateAndRepaint(this.host, () => actor.setFlag('foundryvtt-swse', 'gmPartyMember', !current), { reason: 'gm-workspace-party-toggle', surfaceId: 'workspace' });
        ui?.notifications?.info?.(`${actor.name} ${current ? 'removed from' : 'added to'} the GM party roster.`);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-workspace-xp-grant]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const actor = this._resolveActor(event.currentTarget.dataset.actorId);
        if (!actor) return;
        if (!this._assertGM('grant XP from the GM workspace')) return;
        const amount = Math.max(0, Number(event.currentTarget.dataset.workspaceXpGrant || 0) || 0);
        if (!amount) return;
        const result = await mutateAndRepaint(this.host, () => applyXP(actor, amount), { reason: 'gm-workspace-xp-grant', surfaceId: 'workspace' });
        if (!result) {
          ui?.notifications?.warn?.('XP is disabled or the XP amount could not be applied.');
          return;
        }
        ui?.notifications?.info?.(`${actor.name} gains ${amount} XP${result.leveledUp ? ` and reaches level ${result.newLevel}` : ''}.`);
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

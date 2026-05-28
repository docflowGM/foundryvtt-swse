/**
 * GMWorkspaceSurfaceController
 *
 * Owns DOM wiring for workspace actor quick actions and the GM-side
 * faction/organization skeleton. Actor ownership and sheet rendering stay with
 * Foundry's actor/sheet APIs; faction state is delegated to FactionRegistryService.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';

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

    this._wireActorOpenControls(pageElement, signal);
    this._wireFactionForms(pageElement, signal);
    this._wireFactionActions(pageElement, signal);
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
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

  _wireFactionForms(pageElement, signal) {
    pageElement.querySelectorAll('form[data-faction-create-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const text = (key) => String(data.get(key) || '').trim();
        const number = (key) => Number(data.get(key) || 0) || 0;
        const actorId = text('actorId');
        const faction = await FactionRegistryService.upsertFaction({
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
        });
        if (actorId) {
          const actor = game.actors?.get?.(actorId);
          if (actor) {
            await FactionRegistryService.addActorRelationship({
              actor,
              faction,
              relationshipType: text('relationshipType') || 'known',
              score: number('startingScore'),
              benefits: text('benefits'),
              notes: text('notes'),
              gmNotes: text('gmNotes'),
              source: 'gm',
              status: 'active'
            });
          }
        }
        ui?.notifications?.info?.(`Faction relationship prepared: ${faction.name}.`);
        form.reset();
        await this.host.render(false);
      }, { signal });
    });
  }

  _wireFactionActions(pageElement, signal) {
    pageElement.querySelectorAll('[data-delete-faction]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const factionId = event.currentTarget.dataset.deleteFaction;
        if (!factionId) return;
        const ok = await FactionRegistryService.deleteFaction(factionId);
        if (ok) ui?.notifications?.info?.('Faction removed from the GM registry. Actor relationship flags are not deleted.');
        await this.host.render(false);
      }, { signal });
    });
  }
}

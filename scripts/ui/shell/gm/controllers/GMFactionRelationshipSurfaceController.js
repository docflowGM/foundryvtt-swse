/** GM Faction Relationship Manager controller. */

import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';

function text(formData, key) { return String(formData.get(key) ?? '').trim(); }
function number(formData, key) { return Number(formData.get(key) || 0) || 0; }

export class GMFactionRelationshipSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.querySelector('.gm-datapad-factions');
    if (!pageElement) return;

    this._wireFilters(pageElement, signal);

    pageElement.querySelectorAll('form[data-gm-faction-create-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const faction = await FactionRegistryService.upsertFaction({
          name: text(data, 'name'),
          type: text(data, 'type') || 'Faction',
          planet: text(data, 'planet'),
          system: text(data, 'system'),
          scale: number(data, 'scale') || 1,
          leader: text(data, 'leader'),
          score: number(data, 'score'),
          startingScore: number(data, 'score'),
          benefits: text(data, 'benefits'),
          notes: text(data, 'notes'),
          gmNotes: text(data, 'gmNotes'),
          source: 'gm',
          status: 'active'
        });
        const actorId = text(data, 'actorId');
        if (actorId) {
          const actor = game.actors?.get?.(actorId);
          if (actor) {
            await FactionRegistryService.addActorRelationship({
              actor,
              faction,
              relationshipType: text(data, 'relationshipType') || 'known',
              score: number(data, 'score'),
              benefits: text(data, 'benefits'),
              notes: text(data, 'notes'),
              gmNotes: text(data, 'gmNotes'),
              source: 'gm',
              status: 'active'
            });
          }
        }
        ui.notifications?.info?.(`Faction ${faction.name} saved.`);
        form.reset();
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
      }, { signal });
    });



    pageElement.querySelectorAll('form[data-gm-faction-registry-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const faction = await FactionRegistryService.upsertFaction({
          id: text(data, 'id'),
          name: text(data, 'name'),
          type: text(data, 'type') || 'Faction',
          planet: text(data, 'planet'),
          system: text(data, 'system'),
          scale: number(data, 'scale') || 1,
          leader: text(data, 'leader'),
          score: number(data, 'score'),
          startingScore: number(data, 'startingScore'),
          benefits: text(data, 'benefits'),
          notes: text(data, 'notes'),
          gmNotes: text(data, 'gmNotes'),
          source: text(data, 'source') || 'gm',
          status: text(data, 'status') || 'active',
          historyNote: 'GM registry edit'
        });
        ui.notifications?.info?.(`Registry faction ${faction.name} updated.`);
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
      }, { signal });
    });

    pageElement.querySelectorAll('form[data-gm-faction-attach-existing-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const actor = game.actors?.get?.(text(data, 'actorId'));
        const faction = FactionRegistryService.findFaction(text(data, 'factionId'));
        if (!actor) return ui.notifications?.warn?.('Choose an actor to attach.');
        if (!faction) return ui.notifications?.warn?.('Choose an existing registry faction.');
        await FactionRegistryService.addActorRelationship({
          actor,
          faction,
          relationshipType: text(data, 'relationshipType') || 'known',
          score: number(data, 'score'),
          benefits: text(data, 'benefits') || faction.benefits || '',
          notes: text(data, 'notes'),
          gmNotes: text(data, 'gmNotes') || faction.gmNotes || '',
          source: 'gm',
          status: 'active'
        });
        ui.notifications?.info?.(`${faction.name} attached to ${actor.name}.`);
        form.reset();
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
      }, { signal });
    });

    pageElement.querySelectorAll('form[data-gm-faction-relationship-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const actor = game.actors?.get?.(text(data, 'actorId'));
        if (!actor) return ui.notifications?.warn?.('Actor could not be found.');
        await FactionRegistryService.updateActorRelationship(actor, text(data, 'relationshipId'), {
          factionId: text(data, 'factionId'),
          factionName: text(data, 'factionName'),
          type: text(data, 'type'),
          planet: text(data, 'planet'),
          system: text(data, 'system'),
          scale: number(data, 'scale') || 1,
          leader: text(data, 'leader'),
          relationshipType: text(data, 'relationshipType') || 'known',
          score: number(data, 'score'),
          benefits: text(data, 'benefits'),
          notes: text(data, 'notes'),
          gmNotes: text(data, 'gmNotes'),
          source: 'gm',
          status: 'active'
        });
        ui.notifications?.info?.('Faction relationship saved.');
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
      }, { signal });
    });

    pageElement.querySelectorAll('form[data-gm-faction-adjust-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const actorId = text(data, 'actorId');
        const actor = game.actors?.get?.(actorId);
        if (!actor) return ui.notifications?.warn?.('Actor could not be found.');
        const delta = number(data, 'delta');
        if (!delta) return ui.notifications?.warn?.('Enter a non-zero score delta.');
        await FactionRegistryService.applyScoreDelta({
          actor,
          factionId: text(data, 'factionId'),
          factionName: text(data, 'factionName'),
          delta,
          source: 'gm',
          reason: text(data, 'reason') || 'GM manual faction adjustment',
          relationshipType: text(data, 'relationshipType') || 'known'
        });
        ui.notifications?.info?.('Faction score adjusted.');
        form.reset();
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
      }, { signal });
    });

    pageElement.querySelectorAll('[data-gm-faction-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const target = event.currentTarget;
        const action = target.dataset.gmFactionAction;
        if (action === 'delete-registry') {
          const factionId = target.dataset.factionId;
          if (!factionId) return;
          const confirmed = await Dialog.confirm({
            title: 'Delete Registry Faction?',
            content: '<p>This removes the GM registry entry. Actor relationship history is preserved.</p>',
            defaultYes: false
          });
          if (!confirmed) return;
          await FactionRegistryService.deleteFaction(factionId);
          await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
          return;
        }
        if (action === 'remove-relationship') {
          const actor = game.actors?.get?.(target.dataset.actorId);
          if (!actor) return;
          await FactionRegistryService.removeActorRelationship(actor, target.dataset.relationshipId);
          await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
          return;
        }
        if (action === 'approve-suggestion') {
          await FactionRegistryService.approveSuggestedFaction({ actorId: target.dataset.actorId, factionRecordId: target.dataset.factionId });
          ui.notifications?.info?.('Faction suggestion approved.');
          await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
          return;
        }
        if (action === 'reject-suggestion') {
          const reason = target.closest('[data-faction-suggestion-card]')?.querySelector('[name="rejectReason"]')?.value || '';
          await FactionRegistryService.rejectSuggestedFaction({ actorId: target.dataset.actorId, factionRecordId: target.dataset.factionId, reason });
          ui.notifications?.info?.('Faction suggestion rejected.');
          await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
        }
      }, { signal });
    });
  }


  _wireFilters(pageElement, signal) {
    const controls = Array.from(pageElement.querySelectorAll('[data-gm-faction-filter], [data-gm-faction-search]'));
    if (!controls.length) return;
    const apply = () => {
      const query = String(pageElement.querySelector('[data-gm-faction-search]')?.value || '').trim().toLowerCase();
      const actor = String(pageElement.querySelector('[data-gm-faction-filter="actorId"]')?.value || '').trim();
      const relationship = String(pageElement.querySelector('[data-gm-faction-filter="relationshipType"]')?.value || '').trim();
      const status = String(pageElement.querySelector('[data-gm-faction-filter="status"]')?.value || '').trim();
      const missingOnly = pageElement.querySelector('[data-gm-faction-filter="missingRegistry"]')?.checked === true;
      pageElement.querySelectorAll('[data-gm-faction-filter-row]').forEach((row) => {
        const haystack = String(row.dataset.search || '').toLowerCase();
        const actorMatch = !actor || row.dataset.actorId === actor;
        const relationshipMatch = !relationship || row.dataset.relationshipType === relationship;
        const statusMatch = !status || row.dataset.status === status;
        const missingMatch = !missingOnly || row.dataset.registryMissing === 'true';
        const queryMatch = !query || haystack.includes(query);
        row.hidden = !(actorMatch && relationshipMatch && statusMatch && missingMatch && queryMatch);
      });
    };
    controls.forEach((control) => control.addEventListener('input', apply, { signal }));
    controls.forEach((control) => control.addEventListener('change', apply, { signal }));
    apply();
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
  }
}

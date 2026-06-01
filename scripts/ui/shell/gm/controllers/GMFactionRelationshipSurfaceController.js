/** GM Faction Relationship Manager controller. */

import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';
import { mutateShellOnly } from '/systems/foundryvtt-swse/scripts/ui/shell/mutate-and-repaint.js';

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
    if (!this._assertGM('open the GM faction ledger')) return;

    this._wireFilters(pageElement, signal);
    this._wireWizardControls(pageElement, signal);

    pageElement.querySelectorAll('form[data-gm-faction-create-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change faction records')) return;
        const data = new FormData(form);
        const faction = await this._mutate(() => FactionRegistryService.upsertFaction({
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
        }), 'gm-faction-create-upsert');
        const actorIds = data.getAll('actorIds').map(String).filter(Boolean);
        const legacyActorId = text(data, 'actorId');
        if (!actorIds.length && legacyActorId) actorIds.push(legacyActorId);

        let attachedCount = 0;
        for (const actorId of actorIds) {
          const actor = game.actors?.get?.(actorId);
          if (!actor) continue;
          const relationshipType = text(data, `actorRelationshipType:${actorId}`) || text(data, 'relationshipType') || 'known';
          const actorScoreRaw = text(data, `actorScore:${actorId}`);
          const actorScore = actorScoreRaw === '' ? number(data, 'score') : Number(actorScoreRaw);
          await this._mutate(() => FactionRegistryService.addActorRelationship({
            actor,
            faction,
            relationshipType,
            score: Number.isFinite(actorScore) ? actorScore : number(data, 'score'),
            benefits: text(data, 'benefits'),
            notes: text(data, 'notes'),
            gmNotes: text(data, 'gmNotes'),
            source: 'gm',
            status: 'active'
          }), 'gm-faction-create-attach');
          attachedCount += 1;
        }
        ui.notifications?.info?.(`Faction ${faction.name} saved${attachedCount ? ` and attached to ${attachedCount} actor${attachedCount === 1 ? '' : 's'}` : ''}.`);
        form.reset();
        await this._refresh();
      }, { signal });
    });



    pageElement.querySelectorAll('form[data-gm-faction-registry-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change faction records')) return;
        const data = new FormData(form);
        const faction = await this._mutate(() => FactionRegistryService.upsertFaction({
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
        }), 'gm-faction-registry-save');
        ui.notifications?.info?.(`Registry faction ${faction.name} updated.`);
        await this._refresh();
      }, { signal });
    });

    pageElement.querySelectorAll('form[data-gm-faction-attach-existing-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change faction records')) return;
        const data = new FormData(form);
        const actor = game.actors?.get?.(text(data, 'actorId'));
        const faction = FactionRegistryService.findFaction(text(data, 'factionId'));
        if (!actor) return ui.notifications?.warn?.('Choose an actor to attach.');
        if (!faction) return ui.notifications?.warn?.('Choose an existing registry faction.');
        await this._mutate(() => FactionRegistryService.addActorRelationship({
          actor,
          faction,
          relationshipType: text(data, 'relationshipType') || 'known',
          score: number(data, 'score'),
          benefits: text(data, 'benefits') || faction.benefits || '',
          notes: text(data, 'notes'),
          gmNotes: text(data, 'gmNotes') || faction.gmNotes || '',
          source: 'gm',
          status: 'active'
        }), 'gm-faction-existing-attach');
        ui.notifications?.info?.(`${faction.name} attached to ${actor.name}.`);
        form.reset();
        await this._refresh();
      }, { signal });
    });

    pageElement.querySelectorAll('form[data-gm-faction-relationship-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change faction records')) return;
        const data = new FormData(form);
        const actor = game.actors?.get?.(text(data, 'actorId'));
        if (!actor) return ui.notifications?.warn?.('Actor could not be found.');
        await this._mutate(() => FactionRegistryService.updateActorRelationship(actor, text(data, 'relationshipId'), {
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
        }), 'gm-faction-relationship-save');
        ui.notifications?.info?.('Faction relationship saved.');
        await this._refresh();
      }, { signal });
    });

    pageElement.querySelectorAll('form[data-gm-faction-adjust-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change faction records')) return;
        const data = new FormData(form);
        const actorId = text(data, 'actorId');
        const actor = game.actors?.get?.(actorId);
        if (!actor) return ui.notifications?.warn?.('Actor could not be found.');
        const delta = number(data, 'delta');
        if (!delta) return ui.notifications?.warn?.('Enter a non-zero score delta.');
        await this._mutate(() => FactionRegistryService.applyScoreDelta({
          actor,
          factionId: text(data, 'factionId'),
          factionName: text(data, 'factionName'),
          delta,
          source: 'gm',
          reason: text(data, 'reason') || 'GM manual faction adjustment',
          relationshipType: text(data, 'relationshipType') || 'known'
        }), 'gm-faction-score-delta');
        ui.notifications?.info?.('Faction score adjusted.');
        form.reset();
        await this._refresh();
      }, { signal });
    });

    pageElement.querySelectorAll('[data-gm-faction-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change faction records')) return;
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
          await this._mutate(() => FactionRegistryService.deleteFaction(factionId), 'gm-faction-delete');
          await this._refresh();
          return;
        }
        if (action === 'remove-relationship') {
          const actor = game.actors?.get?.(target.dataset.actorId);
          if (!actor) return;
          await this._mutate(() => FactionRegistryService.removeActorRelationship(actor, target.dataset.relationshipId), 'gm-faction-remove-relationship');
          await this._refresh();
          return;
        }
        if (action === 'approve-suggestion') {
          await this._mutate(() => FactionRegistryService.approveSuggestedFaction({ actorId: target.dataset.actorId, factionRecordId: target.dataset.factionId }), 'gm-faction-suggestion-approve');
          ui.notifications?.info?.('Faction suggestion approved.');
          await this._refresh();
          return;
        }
        if (action === 'reject-suggestion') {
          const reason = target.closest('[data-faction-suggestion-card]')?.querySelector('[name="rejectReason"]')?.value || '';
          await this._mutate(() => FactionRegistryService.rejectSuggestedFaction({ actorId: target.dataset.actorId, factionRecordId: target.dataset.factionId, reason }), 'gm-faction-suggestion-reject');
          ui.notifications?.info?.('Faction suggestion rejected.');
          await this._refresh();
        }
      }, { signal });
    });
  }

  _assertGM(action = 'use GM faction controls') {
    if (game.user?.isGM) return true;
    ui?.notifications?.warn?.(`Only a GM can ${action}.`);
    return false;
  }

  async _mutate(mutation, reason = 'gm-faction-mutation') {
    return mutateShellOnly(this.host, mutation, { reason, surfaceId: 'factions' });
  }

  async _refresh(reason = 'gm-controller-refresh') {
    await requestShellRender(this.host, { reason, surfaceId: 'factions' });
  }


  _wireWizardControls(pageElement, signal) {
    const labels = {
      contract: ['Next: Objectives', 'Next: Briefing', 'Next: Publish', 'Create Contract'],
      faction: ['Next: Attach Actors', 'Next: Notes', 'Create Faction']
    };
    const setPage = (wizard, page) => {
      const max = wizard.querySelectorAll('[data-gm-wizard-page]').length || 1;
      const nextPage = Math.max(1, Math.min(max, Number(page) || 1));
      wizard.dataset.currentPage = String(nextPage);
      wizard.querySelectorAll('[data-gm-wizard-page]').forEach((panel) => {
        panel.classList.toggle('is-active', Number(panel.dataset.gmWizardPage) === nextPage);
      });
      wizard.querySelectorAll('[data-gm-wizard-step-button]').forEach((step) => {
        const stepNumber = Number(step.dataset.gmWizardStepButton) || 0;
        step.classList.toggle('is-active', stepNumber === nextPage);
        step.classList.toggle('is-complete', stepNumber < nextPage);
      });
      const kind = wizard.dataset.gmWizard || 'contract';
      const back = wizard.querySelector('[data-gm-wizard-back]');
      const next = wizard.querySelector('[data-gm-wizard-next]');
      const submit = wizard.querySelector('[data-gm-wizard-submit]');
      const current = wizard.querySelector('[data-gm-wizard-current]');
      if (current) current.textContent = String(nextPage);
      if (back) back.hidden = nextPage <= 1;
      if (next) {
        next.hidden = nextPage >= max;
        next.textContent = labels[kind]?.[nextPage - 1] || 'Next';
      }
      if (submit) submit.hidden = nextPage < max;
    };

    pageElement.querySelectorAll('[data-gm-wizard-open]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const id = event.currentTarget.dataset.gmWizardOpen;
        const wizard = pageElement.querySelector(`[data-gm-wizard="${CSS.escape(id)}"]`);
        if (!wizard) return;
        wizard.hidden = false;
        wizard.classList.add('is-open');
        setPage(wizard, 1);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-gm-wizard-close]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const wizard = event.currentTarget.closest('[data-gm-wizard]');
        if (!wizard) return;
        wizard.classList.remove('is-open');
        wizard.hidden = true;
      }, { signal });
    });

    pageElement.querySelectorAll('[data-gm-wizard-next]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const wizard = event.currentTarget.closest('[data-gm-wizard]');
        if (!wizard) return;
        setPage(wizard, Number(wizard.dataset.currentPage || 1) + 1);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-gm-wizard-back]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const wizard = event.currentTarget.closest('[data-gm-wizard]');
        if (!wizard) return;
        setPage(wizard, Number(wizard.dataset.currentPage || 1) - 1);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-gm-wizard-step-button]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const wizard = event.currentTarget.closest('[data-gm-wizard]');
        if (!wizard) return;
        setPage(wizard, Number(event.currentTarget.dataset.gmWizardStepButton || 1));
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

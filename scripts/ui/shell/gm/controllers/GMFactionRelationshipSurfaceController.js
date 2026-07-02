/** GM Faction Relationship Manager controller.
 *
 * This controller intentionally stays defensive: GM datapad templates have evolved
 * through several surface iterations, so selectors are feature-detected and form
 * handlers no-op safely when an expected service method is absent.
 */

import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { FactionJobBridgeService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/FactionJobBridgeService.js';
import { FactionIntelBridgeService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/FactionIntelBridgeService.js';
import { DossierDragDropService } from '/systems/foundryvtt-swse/scripts/ui/dragdrop/dossier-drag-drop-service.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';
import { LocationRegistryService } from '/systems/foundryvtt-swse/scripts/locations/location-registry-service.js';
import { mutateShellOnly } from '/systems/foundryvtt-swse/scripts/ui/shell/mutate-and-repaint.js';
import { confirmGmDatapadModal } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/utils/gm-datapad-modal.js';
import { GMSmartFormDropService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/utils/gm-smart-form-drop-service.js';

function text(formData, key) { return String(formData.get(key) ?? '').trim(); }
function number(formData, key) { return Number(formData.get(key) || 0) || 0; }
function checked(formData, key) { return formData.get(key) === 'on' || formData.get(key) === 'true'; }

function contactPayloadFromForm(formData) {
  const selectedRevealState = text(formData, 'revealState') || 'hidden';
  const knownToPlayers = checked(formData, 'knownToPlayers') || ['known', 'compromised'].includes(selectedRevealState);
  const revealState = knownToPlayers && selectedRevealState === 'hidden' ? 'known' : selectedRevealState;
  return {
    id: text(formData, 'contactId'),
    name: text(formData, 'name'),
    role: text(formData, 'role') || 'Faction Contact',
    title: text(formData, 'title'),
    image: text(formData, 'image'),
    actorId: text(formData, 'actorId'),
    actorUuid: text(formData, 'actorUuid'),
    actorName: text(formData, 'actorName'),
    promotedAt: text(formData, 'promotedAt'),
    description: text(formData, 'description'),
    tags: text(formData, 'tags'),
    disposition: text(formData, 'disposition') || 'unknown',
    revealState,
    knownToPlayers,
    publicNotes: text(formData, 'publicNotes'),
    gmNotes: text(formData, 'gmNotes'),
    lastKnownLocation: text(formData, 'lastKnownLocation'),
    agenda: text(formData, 'agenda'),
    secret: text(formData, 'secret'),
    factionRank: text(formData, 'factionRank'),
    messengerPersonaId: text(formData, 'messengerPersonaId'),
    linkedIntelIds: text(formData, 'linkedIntelIds'),
    defaultJobTone: text(formData, 'defaultJobTone'),
    defaultRewardStyle: text(formData, 'defaultRewardStyle'),
    defaultObjective: text(formData, 'defaultObjective'),
    defaultBriefing: text(formData, 'defaultBriefing'),
    defaultInstructions: text(formData, 'defaultInstructions'),
    defaultCredits: number(formData, 'defaultCredits'),
    defaultXp: number(formData, 'defaultXp'),
    defaultSuccessDelta: text(formData, 'defaultSuccessDelta') === '' ? 1 : number(formData, 'defaultSuccessDelta'),
    defaultFailureDelta: text(formData, 'defaultFailureDelta') === '' ? -1 : number(formData, 'defaultFailureDelta'),
    defaultVisibility: text(formData, 'defaultVisibility') || 'posted',
    defaultLegality: text(formData, 'defaultLegality'),
    defaultPayStyle: text(formData, 'defaultPayStyle'),
    defaultRivalFactionName: text(formData, 'defaultRivalFactionName'),
    defaultRivalSuccessDelta: text(formData, 'defaultRivalSuccessDelta') === '' ? -1 : number(formData, 'defaultRivalSuccessDelta'),
    defaultRivalFailureDelta: text(formData, 'defaultRivalFailureDelta') === '' ? 1 : number(formData, 'defaultRivalFailureDelta'),
    defaultConsequenceNotes: text(formData, 'defaultConsequenceNotes'),
    active: formData.get('active') !== 'off'
  };
}

async function resolveActorForContact({ uuid = '', actorId = '' } = {}) {
  const id = String(actorId || '').trim();
  if (id) {
    const byId = game.actors?.get?.(id);
    if (byId) return byId;
  }
  const ref = String(uuid || '').trim();
  if (ref && typeof fromUuid === 'function') {
    try {
      const doc = await fromUuid(ref);
      if (doc?.documentName === 'Actor' || doc?.constructor?.documentName === 'Actor') return doc;
      if (doc?.actor) return doc.actor;
    } catch (_err) {}
  }
  return null;
}

export class GMFactionRelationshipSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root?.querySelector?.('.gm-datapad-factions');
    if (!pageElement) return;
    if (!this._assertGM('open the GM faction ledger')) return;

    DossierDragDropService?.bindDragSources?.(pageElement, { signal });
    GMSmartFormDropService?.bind?.(pageElement, { signal });
    this._wireFilters(pageElement, signal);
    this._wireWizardControls(pageElement, signal);
    this._wireFactionImagePreviews(pageElement, signal);
    this._wireForms(pageElement, signal);
    this._wireButtons(pageElement, signal);
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
  }

  _assertGM(action = 'use this GM control') {
    if (game.user?.isGM) return true;
    ui.notifications?.warn?.(`Only a GM can ${action}.`);
    return false;
  }

  async _mutate(operation, reason = 'gm-faction-surface') {
    if (typeof operation !== 'function') return null;
    if (typeof mutateShellOnly === 'function') return mutateShellOnly(operation, reason);
    return operation();
  }

  async _refresh() {
    try {
      if (typeof requestShellRender === 'function') {
        await requestShellRender(this.host, { reason: 'gm-faction-surface-refresh' });
        return;
      }
      await this.host?.render?.(false);
    } catch (_err) {
      this.host?.render?.(false);
    }
  }

  _wireForms(pageElement, signal) {
    pageElement.querySelectorAll('form[data-gm-faction-create-form], form[data-gm-faction-registry-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change faction records')) return;
        const data = new FormData(form);
        const payload = this._factionPayloadFromForm(data);
        const faction = await this._mutate(() => FactionRegistryService.upsertFaction(payload), 'gm-faction-upsert');
        await this._attachSelectedActors(data, faction);
        ui.notifications?.info?.(`Faction ${faction?.name || payload.name || 'record'} saved.`);
        form.reset();
        await this._refresh();
      }, { signal });
    });

    pageElement.querySelectorAll('form[data-gm-faction-contact-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change faction contacts')) return;
        const data = new FormData(form);
        const factionId = text(data, 'factionId');
        const contact = contactPayloadFromForm(data);
        const actor = await resolveActorForContact(contact);
        if (actor) {
          contact.actorId = actor.id;
          contact.actorUuid = actor.uuid;
          contact.actorName = actor.name;
        }
        if (typeof FactionRegistryService.upsertContact === 'function') {
          await this._mutate(() => FactionRegistryService.upsertContact(factionId, contact), 'gm-faction-contact-upsert');
        } else if (typeof FactionRegistryService.upsertFactionContact === 'function') {
          await this._mutate(() => FactionRegistryService.upsertFactionContact(factionId, contact), 'gm-faction-contact-upsert');
        }
        ui.notifications?.info?.(`Contact ${contact.name || 'record'} saved.`);
        form.reset();
        await this._refresh();
      }, { signal });
    });
  }

  _wireButtons(pageElement, signal) {
    pageElement.querySelectorAll('[data-gm-faction-delete]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!this._assertGM('delete faction records')) return;
        const id = event.currentTarget.dataset.gmFactionDelete;
        if (!id) return;
        const ok = await confirmGmDatapadModal?.({ title: 'Delete Faction', content: '<p>Delete this faction record?</p>' }) ?? true;
        if (!ok) return;
        if (typeof FactionRegistryService.deleteFaction === 'function') {
          await this._mutate(() => FactionRegistryService.deleteFaction(id), 'gm-faction-delete');
          await this._refresh();
        }
      }, { signal });
    });

    pageElement.querySelectorAll('[data-gm-faction-job]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const id = event.currentTarget.dataset.gmFactionJob;
        await FactionJobBridgeService?.createJobFromFaction?.(id, { host: this.host });
        await this._refresh();
      }, { signal });
    });

    pageElement.querySelectorAll('[data-gm-faction-intel]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const id = event.currentTarget.dataset.gmFactionIntel;
        await FactionIntelBridgeService?.createIntelFromFaction?.(id, { host: this.host });
        await this._refresh();
      }, { signal });
    });
  }

  _factionPayloadFromForm(formData) {
    return {
      id: text(formData, 'id') || text(formData, 'factionId'),
      name: text(formData, 'name'),
      type: text(formData, 'type') || 'Faction',
      planet: text(formData, 'planet'),
      system: text(formData, 'system'),
      scale: number(formData, 'scale') || 1,
      leader: text(formData, 'leader'),
      image: text(formData, 'image'),
      score: number(formData, 'score'),
      startingScore: number(formData, 'startingScore') || number(formData, 'score'),
      benefits: text(formData, 'benefits'),
      notes: text(formData, 'notes'),
      gmNotes: text(formData, 'gmNotes'),
      defaultJobTone: text(formData, 'defaultJobTone'),
      defaultRewardStyle: text(formData, 'defaultRewardStyle'),
      defaultObjective: text(formData, 'defaultObjective'),
      defaultBriefing: text(formData, 'defaultBriefing'),
      defaultInstructions: text(formData, 'defaultInstructions'),
      defaultCredits: number(formData, 'defaultCredits'),
      defaultXp: number(formData, 'defaultXp'),
      defaultSuccessDelta: text(formData, 'defaultSuccessDelta') === '' ? 1 : number(formData, 'defaultSuccessDelta'),
      defaultFailureDelta: text(formData, 'defaultFailureDelta') === '' ? -1 : number(formData, 'defaultFailureDelta'),
      defaultVisibility: text(formData, 'defaultVisibility') || 'posted',
      defaultLegality: text(formData, 'defaultLegality'),
      defaultPayStyle: text(formData, 'defaultPayStyle'),
      defaultRivalFactionName: text(formData, 'defaultRivalFactionName'),
      defaultRivalSuccessDelta: text(formData, 'defaultRivalSuccessDelta') === '' ? -1 : number(formData, 'defaultRivalSuccessDelta'),
      defaultRivalFailureDelta: text(formData, 'defaultRivalFailureDelta') === '' ? 1 : number(formData, 'defaultRivalFailureDelta'),
      defaultConsequenceNotes: text(formData, 'defaultConsequenceNotes'),
      source: text(formData, 'source') || 'gm',
      status: text(formData, 'status') || 'active'
    };
  }

  async _attachSelectedActors(formData, faction) {
    if (!faction) return;
    const actorIds = formData.getAll('actorIds').map(String).filter(Boolean);
    const legacyActorId = text(formData, 'actorId');
    if (!actorIds.length && legacyActorId) actorIds.push(legacyActorId);
    for (const actorId of actorIds) {
      const actor = game.actors?.get?.(actorId);
      if (!actor) continue;
      await this._mutate(() => FactionRegistryService.addActorRelationship({
        actor,
        faction,
        relationshipType: text(formData, `actorRelationshipType:${actorId}`) || text(formData, 'relationshipType') || 'known',
        score: Number(text(formData, `actorScore:${actorId}`)) || number(formData, 'score'),
        benefits: text(formData, 'benefits'),
        notes: text(formData, 'notes'),
        gmNotes: text(formData, 'gmNotes'),
        source: 'gm',
        status: 'active'
      }), 'gm-faction-actor-relationship');
    }
  }

  _isSafeImagePath(value) {
    const v = String(value || '').trim();
    if (!v) return false;
    if (/[\u0000-\u001f]/.test(v)) return false;
    if (/^(javascript|data|vbscript|file):/i.test(v)) return false;
    if (/^https:\/\//i.test(v)) return true;
    if (/^(icons\/|systems\/|modules\/|worlds\/|assets\/)/i.test(v)) return true;
    return !/^[a-z][a-z0-9+.-]*:/i.test(v);
  }

  _wireFactionImagePreviews(pageElement, signal) {
    const sync = (input) => {
      const value = String(input?.value || '').trim();
      const host = input?.closest?.('.gm-faction-image-field') || input?.closest?.('form') || pageElement;
      const preview = host?.querySelector?.('.gm-faction-image-preview');
      if (!preview) return;
      const safe = this._isSafeImagePath(value);
      preview.classList.toggle('is-empty', !safe);
      if (safe) {
        const img = document.createElement('img');
        img.src = value;
        img.alt = '';
        preview.replaceChildren(img);
      } else {
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-image';
        preview.replaceChildren(icon);
      }
    };

    pageElement.querySelectorAll('[data-gm-faction-image-input]').forEach((input) => {
      sync(input);
      input.addEventListener('input', () => sync(input), { signal });
      input.addEventListener('change', () => sync(input), { signal });
    });
  }

  _wireWizardControls(pageElement, signal) {
    const labels = {
      contract: ['Next: Objectives', 'Next: Briefing', 'Next: Publish', 'Create Contract'],
      faction: ['Next: Attach Actors', 'Next: Notes', 'Create Faction Dossier']
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
        const wizard = Array.from(pageElement.querySelectorAll('[data-gm-wizard]')).find(candidate => candidate.dataset.gmWizard === id);
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

      pageElement.querySelectorAll('[data-gm-faction-row], [data-gm-faction-card], [data-gm-faction-contact-row]').forEach((row) => {
        const haystack = String(row.textContent || '').toLowerCase();
        const rowActor = String(row.dataset.actorId || row.dataset.gmActorId || '').trim();
        const rowRelationship = String(row.dataset.relationshipType || row.dataset.gmRelationshipType || '').trim();
        const rowStatus = String(row.dataset.status || row.dataset.gmStatus || '').trim();
        const rowMissing = row.dataset.missingRegistry === 'true' || row.classList.contains('is-missing-registry');
        const visible = (!query || haystack.includes(query))
          && (!actor || rowActor === actor)
          && (!relationship || rowRelationship === relationship)
          && (!status || rowStatus === status)
          && (!missingOnly || rowMissing);
        row.hidden = !visible;
      });
    };

    controls.forEach((control) => {
      control.addEventListener('input', apply, { signal });
      control.addEventListener('change', apply, { signal });
    });
    apply();
  }
}

export default GMFactionRelationshipSurfaceController;

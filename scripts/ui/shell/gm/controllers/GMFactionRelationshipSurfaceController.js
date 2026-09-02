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
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { LocationRegistryService } from '/systems/foundryvtt-swse/scripts/locations/location-registry-service.js';
import { mutateShellOnly } from '/systems/foundryvtt-swse/scripts/ui/shell/mutate-and-repaint.js';
import { confirmGmDatapadModal } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/utils/gm-datapad-modal.js';
import { GMSmartFormDropService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/utils/gm-smart-form-drop-service.js';
import { setWizardPage } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/utils/gm-wizard-navigation.js';
import { GMCampaignTargetService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignTargetService.js';

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
    if (typeof mutateShellOnly === 'function') {
      return mutateShellOnly(this.host, operation, { reason, surfaceId: 'factions' });
    }
    return operation();
  }

  /**
   * Repaint through the shell's coordinated render seam.
   *
   * The controller is not the Application, so the request is routed to the
   * owning GM Datapad surface rather than rendering independently. Requests
   * coalesce in the host scheduler, and a rejected render is reported instead
   * of latching, so the next request still runs.
   *
   * @returns {Promise<boolean>} true when a repaint was requested.
   */
  async _refresh(reason = 'gm-faction-surface-refresh') {
    if (!this.host) {
      SWSELogger.warn('[GMFactionRelationship] No shell host available to repaint.');
      return false;
    }
    try {
      await requestShellRender(this.host, { reason });
      return true;
    } catch (err) {
      SWSELogger.error('[GMFactionRelationship] Surface repaint failed.', err);
      return false;
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

  /**
   * The Dossier template's live command contract is one delegated
   * `[data-gm-faction-action]` per button (see templates/apps/gm-datapad/surfaces/factions.hbs).
   */
  _wireButtons(pageElement, signal) {
    pageElement.addEventListener('click', async (event) => {
      const button = event.target?.closest?.('[data-gm-faction-action]');
      if (!button || !pageElement.contains(button)) return;
      event.preventDefault();
      event.stopPropagation();

      const action = String(button.dataset.gmFactionAction || '').trim();
      const factionId = String(button.dataset.factionId || '').trim();
      const factionName = String(button.dataset.factionName || '').trim();
      const contactId = String(button.dataset.contactId || '').trim();
      const contactName = String(button.dataset.contactName || '').trim();
      const locationId = String(button.dataset.locationId || '').trim();
      const actorId = String(button.dataset.actorId || '').trim();
      const relationshipId = String(button.dataset.relationshipId || '').trim();
      const jobId = String(button.dataset.jobId || '').trim();
      const intelId = String(button.dataset.intelId || '').trim();
      const issuerFilter = {
        factionId,
        factionName,
        contactId,
        contactName,
        label: [factionName, contactName].filter(Boolean).join(' - ') || factionName || contactName || 'Issuer'
      };

      if (!action) return;

      try {
        switch (action) {
          case 'make-job-faction':
          case 'make-job-contact': {
            const draft = action === 'make-job-contact'
              ? FactionJobBridgeService.buildDraftFromContact(factionId || factionName, contactId || contactName)
              : FactionJobBridgeService.buildDraftFromFaction(factionId || factionName);
            if (!draft) throw new Error('Could not build a contract draft from this dossier.');
            this.host.patchSurfaceState?.('jobs', { pendingJobDraft: draft, openWizard: true, issuerFilter }, { render: false });
            await this.host._navigateTo('jobs');
            ui.notifications?.info?.('Job draft prepared from the selected dossier.');
            return;
          }

          case 'view-jobs-faction':
          case 'view-jobs-contact':
            this.host.patchSurfaceState?.('jobs', { issuerFilter, pendingJobDraft: null, openWizard: false }, { render: false });
            await this.host._navigateTo('jobs');
            return;

          case 'create-intel-faction':
          case 'create-intel-contact': {
            const record = action === 'create-intel-contact'
              ? await FactionIntelBridgeService.createDraftFromContact(factionId || factionName, contactId || contactName)
              : await FactionIntelBridgeService.createDraftFromFaction(factionId || factionName);
            if (!record?.id) throw new Error('Could not create an Intel draft from this dossier.');
            this.host.patchSurfaceState?.('intel', { selectedRecordId: record.id, modal: { type: 'editor', recordId: record.id } }, { render: false });
            await this.host._navigateTo('intel');
            return;
          }

          case 'reveal-faction':
          case 'reveal-contact': {
            const record = action === 'reveal-contact'
              ? await FactionIntelBridgeService.buildContactRevealIntel(factionId || factionName, contactId || contactName)
              : await FactionIntelBridgeService.buildFactionRevealIntel(factionId || factionName);
            if (!record?.id) throw new Error('Could not prepare a player reveal from this dossier.');
            this.host.patchSurfaceState?.('intel', { selectedRecordId: record.id, modal: { type: 'editor', recordId: record.id } }, { render: false });
            await this.host._navigateTo('intel');
            ui.notifications?.info?.('Player-ready reveal Intel prepared. Review and release it from Intel.');
            return;
          }

          case 'view-locations-faction':
          case 'view-locations-contact':
            this.host.patchSurfaceState?.('locations', {
              search: contactName || factionName,
              selectedLocationId: '',
              modal: null
            }, { render: false });
            await this.host._navigateTo('locations');
            return;

          case 'create-location-faction':
          case 'create-location-contact':
            this.host.patchSurfaceState?.('locations', {
              modal: {
                type: 'create',
                defaults: {
                  name: action === 'create-location-contact' ? `${contactName || 'Contact'} Location` : `${factionName || 'Faction'} Operations Site`,
                  controllingFactionId: factionId,
                  factionIds: factionId ? [factionId] : [],
                  contactIds: contactId ? [contactId] : [],
                  publicSummary: action === 'create-location-contact'
                    ? `A location associated with ${contactName || 'this contact'}.`
                    : `An operating location associated with ${factionName || 'this faction'}.`
                }
              }
            }, { render: false });
            await this.host._navigateTo('locations');
            return;

          case 'open-location':
            if (!locationId) throw new Error('This dossier location has no registry id.');
            this.host.patchSurfaceState?.('locations', { selectedLocationId: locationId, modal: null }, { render: false });
            await this.host._navigateTo('locations');
            return;

          // Ecosystem Redesign Phase 3 — context-preserving navigation from
          // the Faction's own Jobs/Intel relationship rows (relationships.
          // jobs/relationships.intel on the Phase 3 ecosystem VM), using
          // the real stable id each row already carries, via the Phase 2
          // shell navigation contract. No new routing helper.
          case 'open-faction-job':
            if (!jobId) throw new Error('This linked Job has no thread id.');
            await this.host.navigateToSurface?.('jobs', { hostPatch: { selectedJobThreadId: jobId } });
            return;

          case 'open-faction-intel':
            if (!intelId) throw new Error('This linked Intel record has no id.');
            await this.host.navigateToSurface?.('intel', { statePatch: { selectedRecordId: intelId } });
            return;

          case 'hide-contact': {
            const found = FactionRegistryService.findFactionContact(factionId || factionName, contactId || contactName);
            if (!found?.contact) throw new Error('The selected contact could not be found.');
            await this._mutate(() => FactionRegistryService.upsertFactionContact(found.faction.id, {
              ...found.contact,
              revealState: 'hidden',
              knownToPlayers: false
            }), 'gm-faction-hide-contact');
            await this._refresh();
            return;
          }

          case 'promote-contact': {
            const result = await this._mutate(
              () => FactionRegistryService.promoteFactionContactToActor(factionId || factionName, contactId || contactName),
              'gm-faction-promote-contact'
            );
            if (result?.error) throw new Error(result.error);
            result?.actor?.sheet?.render?.(true);
            ui.notifications?.info?.(result?.created ? 'Contact promoted to a new NPC actor.' : 'Existing linked NPC actor opened.');
            await this._refresh();
            return;
          }

          case 'open-contact-actor': {
            const actor = await resolveActorForContact({ actorId: button.dataset.actorId, uuid: button.dataset.actorUuid });
            if (!actor) throw new Error('The linked contact actor could not be found.');
            actor.sheet?.render?.(true);
            return;
          }

          // Phase 7 inbound path: distinct from open-contact-actor (which
          // opens the real Foundry sheet) — this selects the Actor in
          // Workspace's campaign dossier via the same workspace-actor
          // target GMCampaignTargetService.resolve() understands elsewhere.
          // CORRECTION 3: this control is now only rendered when the
          // Contact VM already proved a real WORLD Actor resolves
          // (hasWorkspaceActorLink/workspaceActorId, computed with the
          // same world-only rule Workspace's own selection uses) — so a
          // plain game.actors.get() lookup here is honest; it must never
          // fall back to resolveActorForContact()'s fromUuid()
          // Compendium-resolving behavior, which Workspace cannot select.
          case 'open-workspace-actor': {
            const actor = game.actors?.get?.(button.dataset.actorId);
            if (!actor) throw new Error('The linked Workspace actor could not be found.');
            const target = GMCampaignTargetService.workspaceActor(actor.id);
            await this.host?.navigateToSurface?.(target.surfaceId, target);
            return;
          }

          case 'delete-contact': {
            if (!globalThis.confirm?.(`Delete ${contactName || 'this contact'} from the faction dossier?`)) return;
            await this._mutate(
              () => FactionRegistryService.deleteFactionContact(factionId || factionName, contactId),
              'gm-faction-delete-contact'
            );
            await this._refresh();
            return;
          }

          case 'delete-registry': {
            if (!(await confirmGmDatapadModal?.({ title: 'Delete Faction', content: `<p>Delete ${factionName || 'this faction'} and its lightweight contact records?</p>` }) ?? globalThis.confirm?.(`Delete ${factionName || 'this faction'} and its lightweight contact records?`))) return;
            await this._mutate(() => FactionRegistryService.deleteFaction(factionId), 'gm-faction-delete');
            await this._refresh();
            return;
          }

          case 'approve-suggestion': {
            if (!this._assertGM('approve a faction suggestion')) return;
            const actor = actorId ? game.actors?.get?.(actorId) : null;
            if (!actor) throw new Error('The requesting actor could not be found.');
            const relationship = await this._mutate(
              () => FactionRegistryService.approveSuggestedFaction({ actorId: actor.id, factionRecordId: factionId }),
              'gm-faction-approve-suggestion'
            );
            if (!relationship) throw new Error('Could not approve this faction suggestion.');
            ui.notifications?.info?.(`Faction suggestion approved for ${actor.name}.`);
            await this._refresh();
            return;
          }

          case 'reject-suggestion': {
            if (!this._assertGM('reject a faction suggestion')) return;
            const actor = actorId ? game.actors?.get?.(actorId) : null;
            if (!actor) throw new Error('The requesting actor could not be found.');
            const reasonField = button.closest('.gm-faction-suggestion-card')?.querySelector('input[name="rejectReason"]');
            const reason = String(reasonField?.value || '').trim();
            const rejected = await this._mutate(
              () => FactionRegistryService.rejectSuggestedFaction({ actorId: actor.id, factionRecordId: factionId, reason }),
              'gm-faction-reject-suggestion'
            );
            if (!rejected) throw new Error('Could not reject this faction suggestion.');
            ui.notifications?.info?.(`Faction suggestion rejected for ${actor.name}.`);
            await this._refresh();
            return;
          }

          case 'remove-relationship': {
            if (!this._assertGM('remove a faction relationship')) return;
            const actor = actorId ? game.actors?.get?.(actorId) : null;
            if (!actor) throw new Error('The related actor could not be found.');
            if (!relationshipId) throw new Error('This relationship has no id.');
            if (!globalThis.confirm?.('Remove this faction relationship?')) return;
            const removed = await this._mutate(
              () => FactionRegistryService.removeActorRelationship(actor, relationshipId),
              'gm-faction-remove-relationship'
            );
            if (!removed) throw new Error('Could not remove this faction relationship.');
            ui.notifications?.info?.('Faction relationship removed.');
            await this._refresh();
            return;
          }

          case 'send-contact-message':
            this.host.patchSurfaceState?.('bulletin', {
              focusedContactId: contactId,
              focusedFactionId: factionId,
              pendingContactName: contactName,
              pendingFactionName: factionName
            }, { render: false });
            await this.host._navigateTo('bulletin');
            ui.notifications?.info?.('Contact selected for GM communications.');
            return;

          default:
            SWSELogger.warn('[GMFactionRelationship] Unhandled Dossier action', { action, factionId, contactId, locationId });
            ui.notifications?.warn?.(`The Dossier action "${action}" is not connected yet.`);
        }
      } catch (error) {
        SWSELogger.error(`[GMFactionRelationship] Dossier action failed: ${action}`, error);
        ui.notifications?.error?.(`Dossier action failed: ${error?.message || error}`);
      }
    }, { signal });
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
    pageElement.querySelectorAll('[data-gm-wizard-open]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const id = event.currentTarget.dataset.gmWizardOpen;
        const wizard = Array.from(pageElement.querySelectorAll('[data-gm-wizard]')).find(candidate => candidate.dataset.gmWizard === id);
        if (!wizard) return;
        wizard.hidden = false;
        wizard.classList.add('is-open');
        setWizardPage(wizard, 1);
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
        setWizardPage(wizard, Number(wizard.dataset.currentPage || 1) + 1);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-gm-wizard-back]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const wizard = event.currentTarget.closest('[data-gm-wizard]');
        if (!wizard) return;
        setWizardPage(wizard, Number(wizard.dataset.currentPage || 1) - 1);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-gm-wizard-step-button]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const wizard = event.currentTarget.closest('[data-gm-wizard]');
        if (!wizard) return;
        setWizardPage(wizard, Number(event.currentTarget.dataset.gmWizardStepButton || 1));
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

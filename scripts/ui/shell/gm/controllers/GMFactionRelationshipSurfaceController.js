/** GM Faction Relationship Manager controller. */

import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { FactionJobBridgeService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/FactionJobBridgeService.js';
import { FactionIntelBridgeService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/FactionIntelBridgeService.js';
import { DossierDragDropService } from '/systems/foundryvtt-swse/scripts/ui/dragdrop/dossier-drag-drop-service.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';
import { LocationRegistryService } from '/systems/foundryvtt-swse/scripts/locations/location-registry-service.js';
import { mutateShellOnly } from '/systems/foundryvtt-swse/scripts/ui/shell/mutate-and-repaint.js';

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
    const pageElement = root.querySelector('.gm-datapad-factions');
    if (!pageElement) return;
    if (!this._assertGM('open the GM faction ledger')) return;

    DossierDragDropService.bindDragSources(pageElement, { signal });
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
          defaultJobTone: text(data, 'defaultJobTone'),
          defaultRewardStyle: text(data, 'defaultRewardStyle'),
          defaultObjective: text(data, 'defaultObjective'),
          defaultBriefing: text(data, 'defaultBriefing'),
          defaultInstructions: text(data, 'defaultInstructions'),
          defaultCredits: number(data, 'defaultCredits'),
          defaultXp: number(data, 'defaultXp'),
          defaultSuccessDelta: text(data, 'defaultSuccessDelta') === '' ? 1 : number(data, 'defaultSuccessDelta'),
          defaultFailureDelta: text(data, 'defaultFailureDelta') === '' ? -1 : number(data, 'defaultFailureDelta'),
          defaultVisibility: text(data, 'defaultVisibility') || 'posted',
          defaultLegality: text(data, 'defaultLegality'),
          defaultPayStyle: text(data, 'defaultPayStyle'),
          defaultRivalFactionName: text(data, 'defaultRivalFactionName'),
          defaultRivalSuccessDelta: text(data, 'defaultRivalSuccessDelta') === '' ? -1 : number(data, 'defaultRivalSuccessDelta'),
          defaultRivalFailureDelta: text(data, 'defaultRivalFailureDelta') === '' ? 1 : number(data, 'defaultRivalFailureDelta'),
          defaultConsequenceNotes: text(data, 'defaultConsequenceNotes'),
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
          defaultJobTone: text(data, 'defaultJobTone'),
          defaultRewardStyle: text(data, 'defaultRewardStyle'),
          defaultObjective: text(data, 'defaultObjective'),
          defaultBriefing: text(data, 'defaultBriefing'),
          defaultInstructions: text(data, 'defaultInstructions'),
          defaultCredits: number(data, 'defaultCredits'),
          defaultXp: number(data, 'defaultXp'),
          defaultSuccessDelta: text(data, 'defaultSuccessDelta') === '' ? 1 : number(data, 'defaultSuccessDelta'),
          defaultFailureDelta: text(data, 'defaultFailureDelta') === '' ? -1 : number(data, 'defaultFailureDelta'),
          defaultVisibility: text(data, 'defaultVisibility') || 'posted',
          defaultLegality: text(data, 'defaultLegality'),
          defaultPayStyle: text(data, 'defaultPayStyle'),
          defaultRivalFactionName: text(data, 'defaultRivalFactionName'),
          defaultRivalSuccessDelta: text(data, 'defaultRivalSuccessDelta') === '' ? -1 : number(data, 'defaultRivalSuccessDelta'),
          defaultRivalFailureDelta: text(data, 'defaultRivalFailureDelta') === '' ? 1 : number(data, 'defaultRivalFailureDelta'),
          defaultConsequenceNotes: text(data, 'defaultConsequenceNotes'),
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

    pageElement.querySelectorAll('form[data-gm-faction-contact-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change faction contacts')) return;
        const data = new FormData(form);
        const factionId = text(data, 'factionId');
        if (!factionId) return;
        const result = await this._mutate(() => FactionRegistryService.upsertFactionContact(factionId, contactPayloadFromForm(data)), 'gm-faction-contact-save');
        ui.notifications?.info?.(`Notable NPC ${result?.contact?.name || 'contact'} saved.`);
        if (!text(data, 'contactId')) form.reset();
        await this._refresh();
      }, { signal });
    });

    pageElement.querySelectorAll('[data-gm-faction-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change faction records')) return;
        const target = event.currentTarget;
        const action = target.dataset.gmFactionAction;
        if (action === 'make-job-faction') {
          const draft = FactionJobBridgeService.buildDraftFromFaction(target.dataset.factionId);
          await this._openJobDraft(draft);
          return;
        }
        if (action === 'make-job-contact') {
          const draft = FactionJobBridgeService.buildDraftFromContact(target.dataset.factionId, target.dataset.contactId);
          await this._openJobDraft(draft);
          return;
        }
        if (action === 'view-jobs-faction') {
          await this._openJobFilter({
            factionId: target.dataset.factionId || '',
            factionName: target.dataset.factionName || target.closest('[data-faction-name]')?.dataset?.factionName || '',
            label: target.dataset.factionName || 'Faction Jobs'
          });
          return;
        }
        if (action === 'view-jobs-contact') {
          await this._openJobFilter({
            factionId: target.dataset.factionId || '',
            factionName: target.dataset.factionName || '',
            contactId: target.dataset.contactId || '',
            contactName: target.dataset.contactName || '',
            label: [target.dataset.factionName, target.dataset.contactName].filter(Boolean).join(' - ') || 'Contact Jobs'
          });
          return;
        }
        if (action === 'create-intel-faction') {
          const record = await FactionIntelBridgeService.createDraftFromFaction(target.dataset.factionId);
          await this._openIntelRecord(record, `Intel draft created for ${target.dataset.factionName || 'this faction'}.`);
          return;
        }
        if (action === 'create-intel-contact') {
          const record = await FactionIntelBridgeService.createDraftFromContact(target.dataset.factionId, target.dataset.contactId);
          await this._openIntelRecord(record, `NPC Intel draft created for ${target.dataset.contactName || 'this contact'}.`);
          return;
        }
        if (action === 'view-locations-faction') {
          await this._openLocationFilter({
            search: target.dataset.factionName || '',
            selectedLocationId: target.dataset.locationId || '',
            label: target.dataset.factionName || 'Faction Locations'
          });
          return;
        }
        if (action === 'view-locations-contact') {
          await this._openLocationFilter({
            search: target.dataset.contactName || '',
            selectedLocationId: target.dataset.locationId || '',
            label: target.dataset.contactName || 'NPC Locations'
          });
          return;
        }
        if (action === 'open-location') {
          await this._openLocationFilter({ selectedLocationId: target.dataset.locationId || '', search: '' });
          return;
        }
        if (action === 'create-location-faction') {
          const faction = FactionRegistryService.findFaction(target.dataset.factionId || target.dataset.factionName || '');
          if (!faction) return ui.notifications?.warn?.('Faction could not be found.');
          const location = await LocationRegistryService.upsertLocation({
            name: `${faction.name} Operations Site`,
            category: 'installation',
            type: 'base',
            scale: 'site',
            revealState: 'hidden',
            knownToPlayers: false,
            controllingFactionId: faction.id,
            factionIds: [faction.id],
            publicSummary: `A suspected ${faction.name} operating location.`,
            gmNotes: `Created from Galactic Dossier for ${faction.name}. Customize before revealing to Atlas.`,
            historyNote: `Created from faction dossier ${faction.name}.`
          });
          await this._openLocationFilter({ selectedLocationId: location?.id || '', search: '' });
          return;
        }
        if (action === 'create-location-contact') {
          const found = FactionRegistryService.findFactionContact(target.dataset.factionId, target.dataset.contactId);
          if (!found?.contact) return ui.notifications?.warn?.('Named NPC dossier could not be found.');
          const location = await LocationRegistryService.upsertLocation({
            name: `${found.contact.name} Last Known Location`,
            category: 'custom',
            type: 'poi',
            scale: 'site',
            revealState: found.contact.knownToPlayers ? 'hinted' : 'hidden',
            knownToPlayers: false,
            factionIds: [found.faction.id],
            contactIds: [found.contact.id],
            publicSummary: found.contact.publicNotes || `${found.contact.name} has been associated with this location.`,
            gmNotes: [found.contact.lastKnownLocation ? `Original last-known text: ${found.contact.lastKnownLocation}` : '', found.contact.gmNotes].filter(Boolean).join('\n\n'),
            historyNote: `Created from named NPC dossier ${found.contact.name}.`
          });
          await LocationRegistryService.linkContactToLocation(location.id, found.contact.id, { factionId: found.faction.id });
          await this._openLocationFilter({ selectedLocationId: location?.id || '', search: '' });
          return;
        }
        if (action === 'reveal-faction') {
          const record = await FactionIntelBridgeService.buildFactionRevealIntel(target.dataset.factionId);
          await this._openIntelRecord(record, `Faction reveal Intel staged for ${target.dataset.factionName || 'this faction'}.`);
          return;
        }
        if (action === 'reveal-contact') {
          const found = FactionRegistryService.findFactionContact(target.dataset.factionId, target.dataset.contactId);
          if (!found?.contact) return ui.notifications?.warn?.('Named NPC dossier could not be found.');
          await this._mutate(() => FactionRegistryService.upsertFactionContact(found.faction.id, {
            ...found.contact,
            knownToPlayers: true,
            revealState: found.contact.revealState === 'compromised' ? 'compromised' : 'known'
          }), 'gm-faction-contact-reveal');
          const record = await FactionIntelBridgeService.buildContactRevealIntel(found.faction.id, found.contact.id);
          await this._openIntelRecord(record, `${found.contact.name} marked player-visible and reveal Intel staged.`);
          return;
        }
        if (action === 'hide-contact') {
          const found = FactionRegistryService.findFactionContact(target.dataset.factionId, target.dataset.contactId);
          if (!found?.contact) return ui.notifications?.warn?.('Named NPC dossier could not be found.');
          await this._mutate(() => FactionRegistryService.upsertFactionContact(found.faction.id, {
            ...found.contact,
            knownToPlayers: false,
            revealState: 'hidden'
          }), 'gm-faction-contact-hide');
          ui.notifications?.info?.(`${found.contact.name} returned to GM-only dossier visibility.`);
          await this._refresh();
          return;
        }
        if (action === 'send-contact-message') {
          this._notifyIntelSkeleton(`NPC messenger hook staged for ${target.dataset.contactName || 'this contact'}.`);
          return;
        }
        if (action === 'promote-contact') {
          const factionId = target.dataset.factionId;
          const contactId = target.dataset.contactId;
          if (!factionId || !contactId) return;
          const result = await this._mutate(() => FactionRegistryService.promoteFactionContactToActor(factionId, contactId), 'gm-faction-contact-promote');
          const actor = result?.actor;
          ui.notifications?.info?.(`${result?.created ? 'Created NPC actor' : 'Linked NPC actor'}: ${actor?.name || 'Faction Contact'}.`);
          if (actor?.sheet?.render) actor.sheet.render(true);
          await this._refresh();
          return;
        }
        if (action === 'open-contact-actor') {
          const actor = await resolveActorForContact({ uuid: target.dataset.actorUuid, actorId: target.dataset.actorId });
          if (!actor) {
            ui.notifications?.warn?.('Linked NPC actor could not be found.');
            return;
          }
          actor.sheet?.render?.(true);
          return;
        }
        if (action === 'delete-contact') {
          const factionId = target.dataset.factionId;
          const contactId = target.dataset.contactId;
          if (!factionId || !contactId) return;
          const confirmed = await Dialog.confirm({
            title: 'Delete Notable NPC?',
            content: '<p>This removes the lightweight faction contact. It does not delete any linked NPC actor.</p>',
            defaultYes: false
          });
          if (!confirmed) return;
          await this._mutate(() => FactionRegistryService.deleteFactionContact(factionId, contactId), 'gm-faction-contact-delete');
          await this._refresh();
          return;
        }
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

  async _openJobFilter(filter) {
    this.host?.patchSurfaceState?.('jobs', { issuerFilter: filter, pendingJobDraft: null, openWizard: false }, { render: false });
    if (typeof this.host?._navigateTo === 'function') {
      await this.host._navigateTo('jobs');
      return;
    }
    this.host.currentPage = 'jobs';
    await requestShellRender(this.host, { reason: 'gm-faction-view-jobs', surfaceId: 'jobs' });
  }

  async _openLocationFilter({ search = '', selectedLocationId = '', label = 'Locations' } = {}) {
    this.host?.patchSurfaceState?.('locations', {
      search: search || '',
      selectedLocationId: selectedLocationId || '',
      category: '',
      type: '',
      revealState: '',
      special: ''
    }, { render: false });
    if (typeof this.host?._navigateTo === 'function') {
      await this.host._navigateTo('locations');
      return;
    }
    this.host.currentPage = 'locations';
    await requestShellRender(this.host, { reason: 'gm-faction-view-locations', surfaceId: 'locations' });
  }

  async _openJobDraft(draft) {
    if (!draft) {
      ui.notifications?.warn?.('Could not build a job draft from that faction/contact.');
      return;
    }
    this.host?.patchSurfaceState?.('jobs', { pendingJobDraft: draft, openWizard: true }, { render: false });
    if (typeof this.host?._navigateTo === 'function') {
      await this.host._navigateTo('jobs');
      return;
    }
    this.host.currentPage = 'jobs';
    await requestShellRender(this.host, { reason: 'gm-faction-make-job', surfaceId: 'jobs' });
  }

  async _openIntelRecord(record, successMessage = 'Intel draft created.') {
    if (!record?.id) {
      ui.notifications?.warn?.('Could not create an Intel draft from that dossier record.');
      return;
    }
    this.host?.patchSurfaceState?.('intel', {
      selectedRecordId: record.id,
      selectedMode: 'edit',
      search: '',
      status: '',
      kind: '',
      classification: '',
      persistence: '',
      includeArchived: true
    }, { render: false });
    ui.notifications?.info?.(`${successMessage} Delivery modes remain reserved for Phase 6.`);
    if (typeof this.host?._navigateTo === 'function') {
      await this.host._navigateTo('intel');
      return;
    }
    this.host.currentPage = 'intel';
    await requestShellRender(this.host, { reason: 'gm-faction-create-intel', surfaceId: 'intel' });
  }

  _notifyIntelSkeleton(message = 'Intel hook staged.') {
    ui.notifications?.info?.(`${message} Delivery wiring is reserved for Phase 6: Secret Note, Messenger, Bulletin, and player Dossier release modes.`);
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

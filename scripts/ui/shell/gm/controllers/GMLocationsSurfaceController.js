/** Controller for GM Datapad Locations surface. */

import { LocationRegistryService } from '/systems/foundryvtt-swse/scripts/locations/location-registry-service.js';
import { LocationIntelBridgeService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/LocationIntelBridgeService.js';
import { LocationJobBridgeService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/LocationJobBridgeService.js';
import { LocationSceneBridgeService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/LocationSceneBridgeService.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';
import { DossierDragDropService } from '/systems/foundryvtt-swse/scripts/ui/dragdrop/dossier-drag-drop-service.js';
import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';

function text(formData, key, fallback = '') {
  const out = String(formData.get(key) ?? fallback ?? '').trim();
  return out || fallback;
}

function checked(formData, key) {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

function split(value = '') {
  return String(value || '').split(/,|\n/g).map(part => part.trim()).filter(Boolean);
}

function number(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function locationPayload(formData) {
  return {
    id: text(formData, 'id'),
    name: text(formData, 'name', 'Unnamed Location'),
    category: text(formData, 'category', 'planetary'),
    type: text(formData, 'type', 'poi'),
    scale: text(formData, 'scale', 'site'),
    parentLocationId: text(formData, 'parentLocationId'),
    currentLocationId: text(formData, 'currentLocationId'),
    region: text(formData, 'region'),
    sector: text(formData, 'sector'),
    system: text(formData, 'system'),
    coordinates: text(formData, 'coordinates'),
    image: text(formData, 'image'),
    tags: split(text(formData, 'tags')),
    revealState: text(formData, 'revealState', 'hidden'),
    knownToPlayers: checked(formData, 'knownToPlayers'),
    activeForParty: checked(formData, 'activeForParty'),
    controllingFactionId: text(formData, 'controllingFactionId'),
    factionIds: split(text(formData, 'factionIds')),
    contactIds: split(text(formData, 'contactIds')),
    npcActorUuids: split(text(formData, 'npcActorUuids')),
    linkedIntelIds: split(text(formData, 'linkedIntelIds')),
    linkedJobIds: split(text(formData, 'linkedJobIds')),
    linkedSceneUuids: split(text(formData, 'linkedSceneUuids')),
    linkedJournalUuid: text(formData, 'linkedJournalUuid'),
    map: {
      sceneUuid: text(formData, 'mapSceneUuid'),
      imagePath: text(formData, 'mapImagePath'),
      defaultGrid: Math.max(0, Math.floor(number(text(formData, 'mapDefaultGrid'), 100))),
      defaultWidth: Math.max(0, Math.floor(number(text(formData, 'mapDefaultWidth'), 0))),
      defaultHeight: Math.max(0, Math.floor(number(text(formData, 'mapDefaultHeight'), 0))),
      defaultPadding: Math.max(0, Math.min(1, number(text(formData, 'mapDefaultPadding'), 0.25))),
      notes: text(formData, 'mapNotes')
    },
    publicSummary: text(formData, 'publicSummary'),
    gmNotes: text(formData, 'gmNotes'),
    hazards: text(formData, 'hazards'),
    rumors: text(formData, 'rumors'),
    commerceNotes: text(formData, 'commerceNotes'),
    travelNotes: text(formData, 'travelNotes')
  };
}

function factPayload(formData) {
  const multiChecks = LocationRegistryService.parseAtlasCheckLines(text(formData, 'factChecksText'));
  const quickCheck = {
    skill: text(formData, 'factSkill', 'knowledgeGalacticLore'),
    dc: Math.max(0, Math.floor(number(text(formData, 'factDc'), 10))),
    label: text(formData, 'factCheckLabel')
  };
  const checks = multiChecks.length ? multiChecks : [quickCheck];
  return {
    id: text(formData, 'factId'),
    title: text(formData, 'factTitle', 'New Atlas Fact'),
    teaser: text(formData, 'factTeaser'),
    body: text(formData, 'factBody'),
    category: text(formData, 'factCategory', 'general'),
    revealState: text(formData, 'factRevealState', 'hidden'),
    knownToPlayers: checked(formData, 'factKnownToPlayers'),
    revealMode: text(formData, 'factRevealMode', 'any'),
    checks,
    onReveal: {
      output: text(formData, 'leadOutput', 'none'),
      createJob: checked(formData, 'leadCreateJob'),
      createIntel: checked(formData, 'leadCreateIntel'),
      jobTitle: text(formData, 'leadJobTitle'),
      jobObjective: text(formData, 'leadJobObjective'),
      jobRewardCredits: Math.max(0, Math.floor(number(text(formData, 'leadRewardCredits'), 0))),
      intelTitle: text(formData, 'leadIntelTitle'),
      revealLocationIds: split(text(formData, 'leadRevealLocationIds')),
      revealFactionIds: split(text(formData, 'leadRevealFactionIds')),
      revealContactIds: split(text(formData, 'leadRevealContactIds'))
    },
    tags: split(text(formData, 'factTags'))
  };
}

function seedPayload(formData) {
  return {
    uuid: text(formData, 'seedUuid'),
    name: text(formData, 'seedName', 'Encounter Seed'),
    category: text(formData, 'seedCategory', 'random'),
    role: text(formData, 'seedRole'),
    quantity: text(formData, 'seedQuantity', '1'),
    notes: text(formData, 'seedNotes'),
    img: text(formData, 'seedImg')
  };
}

export class GMLocationsSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
    this._searchTimer = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.querySelector('.gm-datapad-locations');
    if (!pageElement) return;
    if (!this._assertGM('manage Locations')) return;
    this._wireFilters(pageElement, signal);
    this._wireActions(pageElement, signal);
    this._wireForms(pageElement, signal);
    DossierDragDropService.bindDragSources(pageElement, { signal });
    this._wireDrops(pageElement, signal);
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
    if (this._searchTimer) window.clearTimeout(this._searchTimer);
    this._searchTimer = null;
  }

  _wireFilters(pageElement, signal) {
    pageElement.querySelectorAll('[data-location-filter]').forEach((input) => {
      const eventName = input.tagName === 'INPUT' && input.type === 'search' ? 'input' : 'change';
      input.addEventListener(eventName, async (event) => {
        const target = event.currentTarget;
        const key = target.dataset.locationFilter;
        if (!key) return;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const patch = { [key]: value };
        if (eventName === 'input') {
          if (this._searchTimer) window.clearTimeout(this._searchTimer);
          this._searchTimer = window.setTimeout(async () => {
            this.host?.patchSurfaceState?.('locations', patch, { render: false });
            await this._refresh('gm-locations-filter');
          }, 180);
          return;
        }
        this.host?.patchSurfaceState?.('locations', patch, { render: false });
        await this._refresh('gm-locations-filter');
      }, { signal });
    });
  }

  _wireActions(pageElement, signal) {
    pageElement.querySelectorAll('[data-location-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const target = event.currentTarget;
        const action = target.dataset.locationAction;
        const locationId = target.dataset.locationId || this.host?.getSurfaceState?.('locations')?.selectedLocationId || '';
        if (!action) return;

        if (action === 'select') {
          this.host?.patchSurfaceState?.('locations', { selectedLocationId: locationId }, { render: false });
          await this._refresh('gm-location-select');
          return;
        }

        if (action === 'new') {
          this.host?.patchSurfaceState?.('locations', { selectedLocationId: '' }, { render: false });
          await this._refresh('gm-location-new');
          return;
        }

        if (action === 'import-library-seed') {
          const seedId = target.dataset.seedId || '';
          const result = await LocationRegistryService.importLibrarySeed(seedId, { includeChildren: true, includeAtlasFacts: true, revealState: 'hidden', knownToPlayers: false });
          if (!result?.seed) {
            ui.notifications?.warn?.('Could not find that Location Library seed.');
            return;
          }
          this.host?.patchSurfaceState?.('locations', { selectedLocationId: result.seed.id }, { render: false });
          const importedCount = result.imported?.length || 0;
          const skippedCount = result.skipped?.length || 0;
          ui.notifications?.info?.(`Imported ${result.seed.name}: ${importedCount} records added${skippedCount ? `, ${skippedCount} already existed` : ''}.`);
          await this._refresh('gm-location-library-import');
          return;
        }

        if (action === 'import-library-visible') {
          const state = this.host?.getSurfaceState?.('locations') || {};
          const seeds = LocationRegistryService.getLibrarySeeds({ search: state.librarySearch || '', biome: state.libraryBiome || '', category: state.libraryCategory || '' });
          if (!seeds.length) {
            ui.notifications?.warn?.('No library seeds match the current filters.');
            return;
          }
          const ok = await Dialog.confirm({ title: 'Import Filtered Location Seeds?', content: `<p>This will import ${seeds.length} library seeds and their starter child POIs as GM-only locations. Existing imported records are skipped.</p>`, defaultYes: false });
          if (!ok) return;
          const result = await LocationRegistryService.importLibrarySeeds(seeds.map(seed => seed.id), { includeChildren: true, includeAtlasFacts: true, revealState: 'hidden', knownToPlayers: false });
          ui.notifications?.info?.(`Imported ${result.imported.length} location records from ${result.seeds.length} seeds${result.skipped.length ? `; ${result.skipped.length} records already existed` : ''}.`);
          await this._refresh('gm-location-library-import-visible');
          return;
        }

        if (action === 'delete' && locationId) {
          const ok = await Dialog.confirm({ title: 'Delete Location?', content: '<p>This removes only the location registry record and reparents child locations to standalone.</p>', defaultYes: false });
          if (!ok) return;
          await LocationRegistryService.deleteLocation(locationId);
          this.host?.patchSurfaceState?.('locations', { selectedLocationId: '' }, { render: false });
          ui.notifications?.info?.('Location deleted.');
          await this._refresh('gm-location-delete');
          return;
        }

        if (action === 'reveal' && locationId) {
          await LocationRegistryService.revealLocation(locationId);
          ui.notifications?.info?.('Location revealed to Atlas.');
          await this._refresh('gm-location-reveal');
          return;
        }

        if (action === 'hide' && locationId) {
          const location = LocationRegistryService.findLocation(locationId);
          if (location) await LocationRegistryService.upsertLocation({ ...location, revealState: 'hidden', knownToPlayers: false, activeForParty: false });
          ui.notifications?.info?.('Location returned to GM-only.');
          await this._refresh('gm-location-hide');
          return;
        }

        if (action === 'set-party-location' && locationId) {
          await LocationRegistryService.setPartyLocation(locationId);
          await LocationRegistryService.revealLocation(locationId, { revealState: 'active', activeForParty: true });
          ui.notifications?.info?.('Party location set.');
          await this._refresh('gm-location-party');
          return;
        }

        if (action === 'create-intel' && locationId) {
          const record = await LocationIntelBridgeService.createIntelDraftFromLocation(locationId);
          if (record?.id) {
            this.host?.patchSurfaceState?.('intel', { selectedRecordId: record.id }, { render: false });
            await this.host?._navigateTo?.('intel');
          } else {
            ui.notifications?.warn?.('Could not create Intel draft from this location.');
          }
          return;
        }

        if (action === 'create-job' && locationId) {
          const draft = LocationJobBridgeService.buildDraftFromLocation(locationId);
          await this._openJobDraft(draft);
          return;
        }

        if (action === 'open-scene' && locationId) {
          const scene = await LocationSceneBridgeService.openLinkedScene(locationId);
          if (!scene) ui.notifications?.warn?.('No linked Foundry Scene found for this location.');
          return;
        }

        if (action === 'create-scene' && locationId) {
          try {
            const scene = await LocationSceneBridgeService.createSceneFromLocation(locationId);
            if (scene) ui.notifications?.info?.('Foundry Scene created and linked to this location.');
            await this._refresh('gm-location-create-scene');
          } catch (err) {
            ui.notifications?.warn?.(err?.message || 'Could not create Scene from location.');
          }
          return;
        }

        if (action === 'create-encounter-scene' && locationId) {
          try {
            const scene = await LocationSceneBridgeService.createEncounterScene(locationId);
            if (scene) ui.notifications?.info?.('Encounter Scene created and linked to this location.');
            await this._refresh('gm-location-create-encounter-scene');
          } catch (err) {
            ui.notifications?.warn?.(err?.message || 'Could not create encounter Scene from location.');
          }
          return;
        }

        if (action === 'activate-scene' && locationId) {
          const scene = await LocationSceneBridgeService.activateLinkedScene(locationId);
          if (scene) ui.notifications?.info?.(`Activated Scene: ${scene.name}`);
          else ui.notifications?.warn?.('No linked Foundry Scene found for this location.');
          return;
        }

        if (action === 'stage-encounter-seeds' && locationId) {
          try {
            const result = await LocationSceneBridgeService.stageEncounterSeeds(locationId, { createIfMissing: true });
            const skipped = result.skipped?.length || 0;
            ui.notifications?.info?.(`Staged ${result.created?.length || 0} encounter token(s)${skipped ? `; ${skipped} seed(s) skipped` : ''}.`);
          } catch (err) {
            ui.notifications?.warn?.(err?.message || 'Could not stage encounter seeds.');
          }
          return;
        }

        if (action === 'remove-link' && locationId) {
          const linkKind = target.dataset.linkKind || '';
          const linkValue = target.dataset.linkValue || '';
          const updated = await LocationRegistryService.unlinkLocationLink(locationId, linkKind, linkValue);
          if (!updated) ui.notifications?.warn?.('Could not remove that link.');
          else ui.notifications?.info?.('Location link removed.');
          await this._refresh('gm-location-remove-link');
          return;
        }

        if (action === 'remove-seed' && locationId) {
          await LocationRegistryService.removeEncounterSeed(locationId, target.dataset.seedId || '');
          ui.notifications?.info?.('Encounter seed removed.');
          await this._refresh('gm-location-remove-seed');
          return;
        }

        if (action === 'remove-fact' && locationId) {
          await LocationRegistryService.removeAtlasFact(locationId, target.dataset.factId || '');
          ui.notifications?.info?.('Atlas fact removed.');
          await this._refresh('gm-location-remove-fact');
          return;
        }

        if (action === 'fact-intel' && locationId) {
          const record = await LocationIntelBridgeService.createIntelDraftFromFact(locationId, target.dataset.factId || '');
          if (record?.id) {
            this.host?.patchSurfaceState?.('intel', { selectedRecordId: record.id }, { render: false });
            await this.host?._navigateTo?.('intel');
          }
          return;
        }

        if (action === 'fact-job' && locationId) {
          const draft = LocationJobBridgeService.buildDraftFromAtlasFact(locationId, target.dataset.factId || '');
          await this._openJobDraft(draft);
          return;
        }

        if (action === 'lead-select-location') {
          const leadLocationId = target.dataset.locationId || '';
          if (leadLocationId) this.host?.patchSurfaceState?.('locations', { selectedLocationId: leadLocationId }, { render: false });
          await this._refresh('gm-location-lead-select');
          return;
        }

        if (action === 'lead-create-job') {
          await this._createJobFromLead(target.dataset.actorId || '', target.dataset.discoveryId || '');
          return;
        }

        if (action === 'lead-create-intel') {
          await this._createIntelFromLead(target.dataset.actorId || '', target.dataset.discoveryId || '');
          return;
        }

        if (action === 'lead-reveal-links') {
          await this._revealLeadLinks(target.dataset.actorId || '', target.dataset.discoveryId || '');
          return;
        }

        if (action === 'lead-resolve') {
          await LocationRegistryService.resolveAtlasLeadDiscovery(target.dataset.actorId || '', target.dataset.discoveryId || '', { status: 'resolved', note: 'Resolved by GM from Locations.' });
          ui.notifications?.info?.('Atlas lead resolved.');
          await this._refresh('gm-location-lead-resolve');
          return;
        }
      }, { signal });
    });
  }

  _wireForms(pageElement, signal) {
    pageElement.querySelectorAll('form[data-location-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = locationPayload(new FormData(form));
        const location = await LocationRegistryService.upsertLocation(payload);
        if (location?.id) this.host?.patchSurfaceState?.('locations', { selectedLocationId: location.id }, { render: false });
        ui.notifications?.info?.('Location saved.');
        await this._refresh('gm-location-save');
      }, { signal });
    });

    pageElement.querySelectorAll('form[data-atlas-fact-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const locationId = text(formData, 'locationId') || this.host?.getSurfaceState?.('locations')?.selectedLocationId || '';
        const location = await LocationRegistryService.upsertAtlasFact(locationId, factPayload(formData));
        if (location?.id) this.host?.patchSurfaceState?.('locations', { selectedLocationId: location.id }, { render: false });
        ui.notifications?.info?.('Atlas fact saved.');
        await this._refresh('gm-location-fact-save');
      }, { signal });
    });

    pageElement.querySelectorAll('form[data-encounter-seed-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const locationId = text(formData, 'locationId') || this.host?.getSurfaceState?.('locations')?.selectedLocationId || '';
        const location = await LocationRegistryService.addEncounterSeed(locationId, seedPayload(formData));
        if (location?.id) this.host?.patchSurfaceState?.('locations', { selectedLocationId: location.id }, { render: false });
        ui.notifications?.info?.('Encounter seed added.');
        await this._refresh('gm-location-seed-save');
      }, { signal });
    });
  }

  _wireDrops(pageElement, signal) {
    pageElement.querySelectorAll('[data-location-drop-zone]').forEach((zone) => {
      zone.addEventListener('dragover', event => event.preventDefault(), { signal });
      zone.addEventListener('drop', async (event) => {
        event.preventDefault();
        const locationId = zone.dataset.locationId || this.host?.getSurfaceState?.('locations')?.selectedLocationId || '';
        if (!locationId) return;
        const data = DossierDragDropService.readPayload(event);
        if (!data) {
          ui.notifications?.warn?.('Drop a Location, Faction, NPC dossier, Actor, Scene, Journal, Intel record, or Job Board post to link it here.');
          return;
        }

        let payload = data;
        if ((payload.kind === 'actor' || payload.type === 'Actor') && payload.uuid) {
          const document = await fromUuid(payload.uuid).catch(() => null);
          payload = {
            ...payload,
            kind: 'actor',
            name: document?.name || payload.name || 'Dropped Actor',
            img: document?.img || payload.img || payload.image || '',
            type: payload.type || 'Actor'
          };
        }

        const linked = await LocationRegistryService.linkDossierPayload(locationId, payload);
        if (!linked) {
          ui.notifications?.warn?.('That drop payload is not linkable to a Location yet.');
          return;
        }
        ui.notifications?.info?.(`Linked ${payload.name || payload.kind || 'dossier payload'} to location.`);
        await this._refresh('gm-location-drop-link');
      }, { signal });
    });
  }

  _assertGM(action = 'use Locations controls') {
    if (game.user?.isGM) return true;
    ui?.notifications?.warn?.(`Only a GM can ${action}.`);
    return false;
  }

  _findLead(actorId = '', discoveryId = '') {
    return LocationRegistryService.getAtlasLeadDiscoveries({ unresolvedOnly: false, actorId }).find(entry => entry.id === discoveryId) || null;
  }

  async _createJobFromLead(actorId = '', discoveryId = '') {
    const lead = this._findLead(actorId, discoveryId);
    if (!lead) {
      ui.notifications?.warn?.('Could not find that Atlas lead.');
      return;
    }
    const draft = LocationJobBridgeService.buildDraftFromAtlasFact(lead.locationId, lead.factId, {
      actorId: lead.actorId,
      actorName: lead.actorName,
      metadata: { atlasLeadDiscoveryId: lead.id, atlasActorId: lead.actorId }
    });
    await LocationRegistryService.resolveAtlasLeadDiscovery(lead.actorId, lead.id, { status: 'resolved', note: 'Job draft prepared by GM.' });
    await this._openJobDraft(draft);
  }

  async _createIntelFromLead(actorId = '', discoveryId = '') {
    const lead = this._findLead(actorId, discoveryId);
    if (!lead) {
      ui.notifications?.warn?.('Could not find that Atlas lead.');
      return;
    }
    const record = await LocationIntelBridgeService.createIntelDraftFromFact(lead.locationId, lead.factId, {
      metadata: { atlasLeadDiscoveryId: lead.id, atlasActorId: lead.actorId, discoveredByActorName: lead.actorName }
    });
    if (!record?.id) {
      ui.notifications?.warn?.('Could not create Intel draft from that Atlas lead.');
      return;
    }
    await LocationRegistryService.resolveAtlasLeadDiscovery(lead.actorId, lead.id, { status: 'resolved', note: `Intel draft prepared: ${record.id}` });
    this.host?.patchSurfaceState?.('intel', { selectedRecordId: record.id }, { render: false });
    await this.host?._navigateTo?.('intel');
    ui.notifications?.info?.('Intel draft prepared from Atlas lead.');
  }

  async _revealLeadLinks(actorId = '', discoveryId = '') {
    const lead = this._findLead(actorId, discoveryId);
    if (!lead) {
      ui.notifications?.warn?.('Could not find that Atlas lead.');
      return;
    }
    let locationCount = 0;
    for (const locationId of lead.revealLocationIds || []) {
      const revealed = await LocationRegistryService.revealLocation(locationId);
      if (revealed) locationCount += 1;
    }

    let factionCount = 0;
    for (const factionId of lead.revealFactionIds || []) {
      const faction = FactionRegistryService.findFaction(factionId);
      if (!faction) continue;
      await FactionRegistryService.upsertFaction({ ...faction, status: faction.status || 'active', historyNote: `Revealed by Atlas lead ${lead.factTitle}.` });
      factionCount += 1;
    }

    let contactCount = 0;
    const allContacts = FactionRegistryService.getAllFactionContacts?.() || [];
    for (const contactId of lead.revealContactIds || []) {
      const found = allContacts.find(contact => contact.id === contactId || contact.name === contactId);
      if (!found) continue;
      await FactionRegistryService.upsertFactionContact(found.factionId, { ...found, revealState: 'known', knownToPlayers: true });
      contactCount += 1;
    }

    await LocationRegistryService.resolveAtlasLeadDiscovery(lead.actorId, lead.id, {
      status: 'resolved',
      note: `Reveal links applied. Locations: ${locationCount}; factions: ${factionCount}; contacts: ${contactCount}.`
    });
    ui.notifications?.info?.(`Atlas lead reveal links applied (${locationCount} locations, ${factionCount} factions, ${contactCount} contacts).`);
    await this._refresh('gm-location-lead-reveal-links');
  }

  async _openJobDraft(draft) {
    if (!draft) {
      ui.notifications?.warn?.('Could not build a job draft from that location/lead.');
      return;
    }
    this.host?.patchSurfaceState?.('jobs', { pendingJobDraft: draft, openWizard: true }, { render: false });
    await this.host?._navigateTo?.('jobs');
    ui.notifications?.info?.('Job draft prepared from location lead.');
  }

  async _refresh(reason = 'gm-locations-refresh') {
    await requestShellRender(this.host, { reason, surfaceId: 'locations' });
  }
}

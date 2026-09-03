/** GM bulletin / Holonet command surface view-model. */

import { HolonetStorage } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js';
import { HolonetStateService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-state-service.js';
import { SOURCE_FAMILY, DELIVERY_STATE, AUDIENCE_TYPE, INTENT_TYPE, SURFACE_TYPE } from '/systems/foundryvtt-swse/scripts/holonet/contracts/enums.js';
import { HolonetMarkupService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-markup-service.js';
import { HolonewsGenerator } from '/systems/foundryvtt-swse/scripts/holonet/data/holonews-seed-events.js';
import { HolonewsAutoPublisher } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonews-auto-publisher.js';
import { BulletinContactRegistry } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/bulletin-contact-registry.js';
import { HolonewsAtomPolicy } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonews-atom-policy.js';
import { GMCombatRecoveryService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-combat-recovery-service.js';
import { HolonetMessengerService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js';
import { HolonetIntelService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js';
import { HolonetAudience } from '/systems/foundryvtt-swse/scripts/holonet/contracts/holonet-audience.js';
import { BulletinSource } from '/systems/foundryvtt-swse/scripts/holonet/sources/bulletin-source.js';
import { LocationRegistryService } from '/systems/foundryvtt-swse/scripts/locations/location-registry-service.js';
import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { jobForThread } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/GMJobBoardSurfaceService.js';

// PHASE 8C: valid Bulletin-handoff source kinds. Kept small and explicit
// (not a generalized/open-ended registry) -- exactly the GM Datapad
// authorities the phase spec names, no more.
const BULLETIN_SOURCE_KINDS = Object.freeze(['job', 'location', 'faction', 'actor', 'intel']);

function resolveActorForProvenance(id) {
  const ref = String(id || '').trim();
  if (!ref) return null;
  const bareId = ref.replace(/^Actor\./, '');
  return globalThis.game?.actors?.get?.(bareId)
    ?? (globalThis.game?.actors?.contents ?? Array.from(globalThis.game?.actors ?? [])).find?.(a => a?.uuid === ref)
    ?? null;
}

export class GMBulletinSurfaceService {
  /**
   * PHASE 8C — the one shared Bulletin draft-creation authority every
   * source surface's "Prepare Bulletin Draft" action calls. Builds a
   * player-safe prefill (never GM-only text) from the real source
   * authority, persists a DRAFT-state Bulletin record (never publishes:
   * draft save uses HolonetStorage.saveRecord(), never
   * HolonetEngine.publish() -- a draft never resolves recipients, never
   * appears in a player's feed, never broadcasts record-published), and
   * stamps the general {sourceKind, sourceId} provenance contract. Does
   * not touch or mutate the source record in any way. Returns null if
   * the source kind is unsupported or the source does not resolve --
   * never creates a draft with fabricated/guessed provenance.
   */
  static async prepareDraftFromSource({ sourceKind = '', sourceId = '' } = {}) {
    if (!globalThis.game?.user?.isGM) return null;
    const kind = String(sourceKind || '').trim();
    const id = String(sourceId || '').trim();
    if (!kind || !id || !BULLETIN_SOURCE_KINDS.includes(kind)) return null;

    const prefill = await this._prefillForSource(kind, id);
    if (!prefill) return null;

    const bulletin = BulletinSource.createBulletinMessage({
      title: prefill.title,
      body: prefill.body,
      priority: 'normal',
      // Safe default per the phase spec: never infer an audience from an
      // upstream relationship (faction membership, job assignee, etc.) --
      // stays GM-only/unconfigured until the GM explicitly chooses one
      // while editing the draft.
      audience: HolonetAudience.gmOnly(),
      category: prefill.category,
      metadata: {
        sourceKind: kind,
        sourceId: id
      }
    });
    bulletin.projections = [
      { surfaceType: SURFACE_TYPE.HOME_FEED, recordId: bulletin.id, isPinned: false, metadata: {} },
      { surfaceType: SURFACE_TYPE.GM_DATAPAD_BULLETIN, recordId: bulletin.id, isPinned: false, metadata: {} }
    ];
    const saved = await HolonetStorage.saveRecord(bulletin);
    if (!saved) return null;
    return bulletin;
  }

  /**
   * @private — player-safe title/body prefill per source kind, using
   * ONLY fields already proven player-facing elsewhere in this codebase
   * (never guessed). Every lookup is an exact-id match against the
   * source's own canonical registry -- never a name/label/slug fallback
   * (Phase 8C's C8C audit explicitly forbids resolving by visible text).
   *
   * Job: job.briefing.body is the exact field
   * holonet-messenger-service.js's player-facing job board VM already
   * reads independently (buildHolonetJobBoardVm) -- proven safe by an
   * unrelated existing consumer, not asserted here for the first time.
   *
   * Location: publicSummary vs gmNotes is LocationRegistryService's own
   * documented split, already relied on by the player-facing
   * AtlasSurfaceService (`publicSummary: location.publicSummary`).
   *
   * Faction: audited and found NO reliable public field at the
   * faction-record level (only its nested contacts distinguish
   * publicNotes/gmNotes) -- body is deliberately left empty for the GM
   * to write rather than guessing from notes/gmNotes, which have no
   * proven-safe reader anywhere in this codebase.
   *
   * Actor: audited the full SWSE actor data model (template.json) --
   * there is no biography/description/notes field of any kind. Body is
   * deliberately left empty; only the Actor's own name is used, never
   * system/mechanical data (HP, inventory, conditions, credits).
   *
   * Intel: HolonetIntelService.getPublicBody() -- the same
   * bodyForIntel(intel,'public') authority deliverAsBulletin() itself
   * uses, including the Phase 8B C8B-4 fix (never falls back to
   * fullBody).
   */
  static async _prefillForSource(kind, id) {
    switch (kind) {
      case 'job': {
        const thread = await HolonetStorage.getThread(id).catch(() => null);
        if (!thread || thread.metadata?.threadType !== 'job') return null;
        const job = jobForThread(thread);
        return {
          title: String(job?.title || thread.title || 'Untitled Job').trim(),
          body: String(job?.briefing?.body || job?.description || job?.brief || thread.preview || '').trim(),
          category: 'job'
        };
      }
      case 'location': {
        const location = (LocationRegistryService.getRegistry?.() ?? []).find(entry => entry.id === id) ?? null;
        if (!location) return null;
        return {
          title: String(location.name || 'Untitled Location').trim(),
          body: String(location.publicSummary || '').trim(),
          category: 'location'
        };
      }
      case 'faction': {
        const faction = (FactionRegistryService.getRegistry?.() ?? []).find(entry => entry.id === id) ?? null;
        if (!faction) return null;
        return {
          title: String(faction.name || 'Untitled Faction').trim(),
          body: '',
          category: 'faction'
        };
      }
      case 'actor': {
        const actor = resolveActorForProvenance(id);
        if (!actor) return null;
        return {
          title: String(actor.name || 'Untitled Actor').trim(),
          body: '',
          category: 'actor'
        };
      }
      case 'intel': {
        const record = await HolonetIntelService.getIntelById(id).catch(() => null);
        const intel = record ? HolonetIntelService.getIntelMetadata(record) : null;
        if (!intel) return null;
        return {
          title: String(intel.title || 'Untitled Intel').trim(),
          body: HolonetIntelService.getPublicBody(record),
          category: 'intel'
        };
      }
      default:
        return null;
    }
  }


  static async buildViewModel(host) {
    const records = (await HolonetStorage.getAllRecords())
      .filter((record) => record.sourceFamily === SOURCE_FAMILY.BULLETIN)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    const eventRecords = records.filter((record) => record.intent === INTENT_TYPE.BULLETIN_EVENT || record.metadata?.bulletinKind === 'event');
    const messageRecords = records.filter((record) => record.intent === INTENT_TYPE.BULLETIN_MESSAGE || record.metadata?.bulletinKind === 'message');
    const bulletinPlayers = host._getBulletinPlayers();
    const selectedPlayerId = host.selectedPlayerStateActorId || bulletinPlayers[0]?.actorId || null;
    const selectedPlayerState = selectedPlayerId ? await HolonetStateService.getPlayerState(selectedPlayerId) : null;
    const partyState = await HolonetStateService.getPartyState();
    const combatRecoveryView = await GMBulletinSurfaceService._safeCombatRecoveryView();
    const combatRecovery = combatRecoveryView?.combatRecovery || { actors: [], metrics: {}, partyActors: [] };
    const playerStateCards = GMBulletinSurfaceService._buildPlayerStateCards(bulletinPlayers, combatRecovery.actors || []);
    const partyStateOverview = GMBulletinSurfaceService._buildPartyStateOverview(partyState, combatRecovery);
    const selectedPreviewUserId = host.selectedBulletinPreviewUserId || bulletinPlayers[0]?.userId || null;
    const selectedPreviewPlayer = bulletinPlayers.find((player) => player.userId === selectedPreviewUserId) || bulletinPlayers[0] || null;
    const selectedPreviewState = selectedPreviewPlayer?.actorId ? await HolonetStateService.getPlayerState(selectedPreviewPlayer.actorId) : selectedPlayerState;
    const bulletinContacts = (await BulletinContactRegistry.getAll()).map((contact) => BulletinContactRegistry.toView(contact));
    const holonewsAtomPolicy = await HolonewsAtomPolicy.getPolicy();
    const atomFilters = HolonewsAtomPolicy.toGeneratorFilters(holonewsAtomPolicy);

    const allEventViews = eventRecords.map((record) => host._buildBulletinRecordView(record));
    const eventViews = allEventViews.filter((record) => !record.isHolonews);
    const holonewsViews = allEventViews.filter((record) => record.isHolonews);
    const messageViews = messageRecords.map((record) => host._buildBulletinRecordView(record));
    const secretNoteRecords = await HolonetMessengerService.getSecretNoteConsoleView();
    const holonewsArchiveFilters = {
      query: String(host.holonewsArchiveFilters?.query || '').trim(),
      state: host.holonewsArchiveFilters?.state || '',
      type: host.holonewsArchiveFilters?.type || '',
      priority: host.holonewsArchiveFilters?.priority || '',
      sector: host.holonewsArchiveFilters?.sector || '',
      category: host.holonewsArchiveFilters?.category || ''
    };
    const filteredHolonewsViews = GMBulletinSurfaceService._filterHolonewsRecords(holonewsViews, holonewsArchiveFilters);
    const usedHolonewsSeedIds = [...new Set(holonewsViews.map((record) => record.holonewsSeedId).filter(Boolean))];
    const holonewsWireFilters = {
      ...atomFilters,
      query: String(host.holonewsWireFilters?.query || '').trim(),
      category: host.holonewsWireFilters?.category || '',
      sector: host.holonewsWireFilters?.sector || '',
      priority: host.holonewsWireFilters?.priority || '',
      excludeIds: host.holonewsHideUsedSeeds ? usedHolonewsSeedIds : []
    };
    const holonewsSeeds = HolonewsGenerator.window(host.holonewsSeedOffset ?? 0, 12, holonewsWireFilters)
      .map((seed) => ({
        ...seed,
        alreadyUsed: usedHolonewsSeedIds.includes(seed.id),
        bodyPreview: HolonetMarkupService.preview(seed.body || '', 180)
      }));
    const eventEditorRecord = host._getBulletinEditorRecord(eventRecords, 'events')
      ? host._buildBulletinRecordView(host._getBulletinEditorRecord(eventRecords, 'events'))
      : null;
    const holonewsEditorRecord = host._getBulletinEditorRecord(eventRecords, 'holonews')
      ? host._buildBulletinRecordView(host._getBulletinEditorRecord(eventRecords, 'holonews'))
      : null;
    const messageEditorRecord = host._getBulletinEditorRecord(messageRecords, 'messages')
      ? host._buildBulletinRecordView(host._getBulletinEditorRecord(messageRecords, 'messages'))
      : null;
    const previewRecord = GMBulletinSurfaceService._selectPreviewRecord({
      section: host.currentBulletinSection,
      eventEditorRecord,
      holonewsEditorRecord,
      messageEditorRecord,
      eventViews,
      holonewsViews,
      messageViews
    });
    const holonewsAutomationPolicy = await HolonewsAutoPublisher.getPolicy();

    return {
      pageTitle: 'Bulletin',
      pageDescription: 'GM broadcast console for one-way player home feed, notices, recaps, and current-state control',
      bulletinSection: host.currentBulletinSection,
      bulletinNav: [
        { id: 'events', label: 'Events', count: eventViews.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED).length, hint: 'Campaign broadcasts' },
        { id: 'holonews', label: 'HoloNews', count: holonewsViews.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED).length, hint: `${HolonewsGenerator.count()} generated wire variants` },
        { id: 'messages', label: 'Notices', count: messageRecords.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED).length, hint: 'Targeted one-way pings' },
        { id: 'players', label: 'Players', count: bulletinPlayers.length, hint: 'Personal home status' },
        { id: 'party', label: 'Party', count: partyState?.situation || partyState?.objective || partyState?.location ? 1 : 0, hint: 'Shared home status' }
      ],
      bulletinStats: GMBulletinSurfaceService._buildStats([...eventViews, ...holonewsViews, ...messageViews]),
      audienceOptions: host._getAudienceOptions(),
      audienceTypes: AUDIENCE_TYPE,
      bulletinPlayers,
      playerStateCards,
      partyStateOverview,
      selectedPlayerId,
      selectedPreviewUserId,
      selectedPreviewPlayer,
      selectedPlayerState,
      bulletinContacts,
      holonewsAtomPolicy,
      holonewsAtomPolicySummary: HolonewsAtomPolicy.summary(holonewsAtomPolicy),
      partyState,
      eventRecords: eventViews,
      holonewsRecords: filteredHolonewsViews,
      holonewsAllRecords: holonewsViews,
      holonewsSeeds,
      holonewsSeedCount: HolonewsGenerator.count(),
      holonewsAtomStats: HolonewsGenerator.atomStats(),
      holonewsAtomSamples: HolonewsGenerator.atomSamples(8),
      holonewsWireFilteredCount: HolonewsGenerator.count(holonewsWireFilters),
      holonewsUsedSeedCount: usedHolonewsSeedIds.length,
      holonewsArchiveTotalCount: holonewsViews.length,
      holonewsArchiveFilteredCount: filteredHolonewsViews.length,
      holonewsArchiveStats: GMBulletinSurfaceService._buildHolonewsArchiveStats(holonewsViews),
      holonewsAutomation: GMBulletinSurfaceService._buildHolonewsAutomationView(holonewsAutomationPolicy),
      holonewsArchiveFilters,
      holonewsArchiveStateOptions: GMBulletinSurfaceService._getHolonewsStateOptions(),
      holonewsArchiveTypeOptions: GMBulletinSurfaceService._getHolonewsTypeOptions(),
      holonewsHideUsedSeeds: Boolean(host.holonewsHideUsedSeeds),
      holonewsWireFilters: {
        query: holonewsWireFilters.query,
        category: holonewsWireFilters.category,
        sector: holonewsWireFilters.sector,
        priority: holonewsWireFilters.priority
      },
      holonewsCategories: HolonewsGenerator.categories(),
      holonewsSectors: HolonewsGenerator.sectors(),
      holonewsPriorities: HolonewsGenerator.priorities(),
      holonewsAtomControlPreviewCount: HolonewsGenerator.count(atomFilters),
      messageRecords: messageViews,
      secretNoteRecords,
      eventEditorRecord,
      holonewsEditorRecord,
      messageEditorRecord,
      homePreview: GMBulletinSurfaceService._buildHomePreview({ previewRecord, eventViews, holonewsViews, messageViews, selectedPlayerState: selectedPreviewState, partyState, selectedPreviewPlayer }),
      syntaxGuide: [
        '@ mention character, NPC, ship, faction, or location',
        '# add emphasis or a topic tag',
        '! mark urgent alerts',
        '+800cr style credits/rewards',
        'HoloNews ambient wire stories are ordinary background texture by default.',
        'Breaking News is GM-authored only and creates a red home alert.'
      ]
    };
  }


  static async _safeCombatRecoveryView() {
    try {
      return await GMCombatRecoveryService.buildViewModel();
    } catch (err) {
      console.warn('[GMBulletinSurfaceService] Combat recovery view unavailable for bulletin state panels:', err);
      return { combatRecovery: { actors: [], metrics: {}, partyActors: [] } };
    }
  }

  static _buildPlayerStateCards(bulletinPlayers = [], combatActors = []) {
    const combatByActorId = new Map((combatActors || []).map((card) => [String(card.id), card]));
    return (bulletinPlayers || []).map((player) => {
      const actor = player.actorId ? game.actors?.get?.(player.actorId) : null;
      const combat = player.actorId ? combatByActorId.get(String(player.actorId)) : null;
      const hpValue = Number(combat?.hpValue ?? actor?.system?.hp?.value ?? 0) || 0;
      const hpMax = Number(combat?.hpMax ?? actor?.system?.hp?.max ?? 0) || 0;
      const hpPercent = hpMax > 0 ? Math.max(0, Math.min(100, Math.round((hpValue / hpMax) * 100))) : 0;
      const downed = combat?.downed === true || (hpMax > 0 && hpValue <= 0);
      const wounded = combat?.wounded === true || (hpMax > 0 && hpValue > 0 && hpValue < hpMax);
      const conditionCurrent = Number(combat?.conditionCurrent ?? actor?.system?.conditionTrack?.current ?? 0) || 0;
      const statusUser = player.userId ? game.users?.get?.(player.userId) : null;
      const online = statusUser?.active === true;
      const credits = Number(actor?.system?.credits ?? actor?.system?.wealth?.credits ?? 0) || 0;
      const chips = Array.isArray(combat?.statusChips) && combat.statusChips.length
        ? combat.statusChips
        : [{ label: actor ? 'Linked Actor' : 'No Linked Actor', tone: actor ? 'info' : 'muted' }];

      return {
        userId: player.userId,
        userName: player.userName || statusUser?.name || 'Player',
        actorId: player.actorId,
        actorName: actor?.name || player.actorName || player.userName || 'Unlinked Player',
        hpLabel: hpMax > 0 ? `${hpValue}/${hpMax}` : '—',
        hpPercent,
        hpTone: downed ? 'critical' : (wounded ? 'warning' : (hpMax > 0 ? 'stable' : 'muted')),
        conditionLabel: combat?.conditionLabel ?? (conditionCurrent > 0 ? `-${conditionCurrent}` : '+0'),
        conditionTone: combat?.conditionTone ?? (conditionCurrent > 0 ? 'warning' : 'stable'),
        creditsLabel: actor ? credits.toLocaleString() : '—',
        status: online ? 'Online' : 'Offline',
        statusTone: online ? 'stable' : 'muted',
        chips
      };
    });
  }

  static _buildPartyStateOverview(partyState = {}, combatRecovery = {}) {
    const actors = Array.isArray(combatRecovery?.partyActors) && combatRecovery.partyActors.length
      ? combatRecovery.partyActors
      : (combatRecovery?.actors || []).filter((card) => card.partyActor === true);
    const hpValue = actors.reduce((sum, card) => sum + (Number(card.hpValue) || 0), 0);
    const hpMax = actors.reduce((sum, card) => sum + (Number(card.hpMax) || 0), 0);
    const credits = actors.reduce((sum, card) => {
      const actor = game.actors?.get?.(card.id);
      return sum + (Number(actor?.system?.credits ?? actor?.system?.wealth?.credits ?? 0) || 0);
    }, 0);
    const down = actors.filter((card) => card.downed === true || (Number(card.hpMax || 0) > 0 && Number(card.hpValue || 0) <= 0)).length;
    const wounded = actors.filter((card) => card.wounded === true).length;
    const healthy = actors.filter((card) => !card.downed && !card.wounded && !card.ctImpaired).length;

    return {
      hpValue,
      hpMax,
      hpLabel: hpMax > 0 ? `${hpValue}/${hpMax}` : '—',
      down,
      wounded,
      healthy,
      credits,
      creditsLabel: credits.toLocaleString(),
      location: partyState?.location || '',
      objective: partyState?.objective || '',
      situation: partyState?.situation || '',
      actors: actors.map((card) => ({
        id: card.id,
        name: card.name,
        img: card.img,
        typeLabel: card.typeLabel || 'Actor',
        kindLabel: card.kindLabel || '',
        hpLabel: card.hpLabel || '—',
        hpPercent: Number(card.hpPercent || 0) || 0,
        actionTone: card.actionTone || (card.downed ? 'critical' : (card.wounded || card.ctImpaired ? 'warning' : 'stable')),
        conditionTone: card.conditionTone || 'stable',
        conditionLabel: card.conditionLabel || '+0'
      }))
    };
  }

  static _buildStats(records) {
    const active = records.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED);
    return {
      live: records.filter((record) => record.state === DELIVERY_STATE.PUBLISHED).length,
      drafts: records.filter((record) => record.state === DELIVERY_STATE.DRAFT).length,
      urgent: active.filter((record) => record.isUrgent).length,
      pinned: active.filter((record) => record.isPinned).length,
      archived: records.filter((record) => record.state === DELIVERY_STATE.ARCHIVED).length
    };
  }

  static _filterHolonewsRecords(records, filters = {}) {
    const query = String(filters.query || '').trim().toLowerCase();
    const state = String(filters.state || '').trim();
    const type = String(filters.type || '').trim();
    const priority = String(filters.priority || '').trim();
    const sector = String(filters.sector || '').trim();
    const category = String(filters.category || '').trim();

    return records.filter((record) => {
      if (state && record.state !== state) return false;
      if (priority && record.priority !== priority) return false;
      if (sector && record.sector !== sector) return false;
      if (category && record.newsCategory !== category) return false;
      if (type === 'breaking' && !record.isBreakingNews) return false;
      if (type === 'ambient' && !record.isAmbientHolonews) return false;
      if (type === 'gm-authored' && record.isAmbientHolonews) return false;
      if (query) {
        const haystack = [
          record.title,
          record.body,
          record.newsSource,
          record.dateline,
          record.sector,
          record.newsCategory,
          record.newsDeck,
          record.holonewsSeedId
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }

  static _buildHolonewsArchiveStats(records) {
    return [
      { label: 'All Stories', value: records.length, tone: 'neutral' },
      { label: 'Live', value: records.filter((record) => record.state === DELIVERY_STATE.PUBLISHED).length, tone: 'live' },
      { label: 'Drafts', value: records.filter((record) => record.state === DELIVERY_STATE.DRAFT).length, tone: 'draft' },
      { label: 'Archived', value: records.filter((record) => record.state === DELIVERY_STATE.ARCHIVED).length, tone: 'archived' },
      { label: 'Ambient', value: records.filter((record) => record.isAmbientHolonews).length, tone: 'ambient' },
      { label: 'Breaking', value: records.filter((record) => record.isBreakingNews).length, tone: 'breaking' }
    ];
  }

  static _buildHolonewsAutomationView(policy = {}) {
    const enabled = policy.enabled === true;
    const nextDue = policy.nextDueAt || null;
    const lastPublished = policy.lastPublishedAt || null;
    const lastCheck = policy.lastCheckAt || null;
    const history = Array.isArray(policy.history) ? [...policy.history].reverse().slice(0, 5) : [];

    return {
      enabled,
      statusLabel: enabled ? 'Enabled' : 'Manual Only',
      statusTone: enabled ? 'enabled' : 'disabled',
      cadenceMinutes: Number(policy.cadenceMinutes || 240),
      maxPerRun: Number(policy.maxPerRun || 1),
      hideUsedSeeds: policy.hideUsedSeeds !== false,
      allowRepeatsWhenExhausted: policy.allowRepeatsWhenExhausted === true,
      query: policy.query || '',
      category: policy.category || '',
      sector: policy.sector || '',
      priority: policy.priority || '',
      sourceName: policy.sourceName || 'Galaxy News Net',
      lastCheckAt: lastCheck || 'Never',
      lastPublishedAt: lastPublished || 'Never',
      nextDueAt: nextDue || 'Not scheduled',
      totalPublished: Number(policy.totalPublished || 0),
      history,
      historyCount: history.length,
      isPrimaryGm: HolonewsAutoPublisher.isPrimaryActiveGm()
    };
  }

  static _getHolonewsStateOptions() {
    return [
      { value: '', label: 'Any state' },
      { value: DELIVERY_STATE.PUBLISHED, label: 'Published' },
      { value: DELIVERY_STATE.DRAFT, label: 'Draft' },
      { value: DELIVERY_STATE.ARCHIVED, label: 'Archived' }
    ];
  }

  static _getHolonewsTypeOptions() {
    return [
      { value: '', label: 'Any type' },
      { value: 'ambient', label: 'Ambient wire' },
      { value: 'gm-authored', label: 'GM-authored' },
      { value: 'breaking', label: 'Breaking News' }
    ];
  }

  static _selectPreviewRecord({ section, eventEditorRecord, holonewsEditorRecord, messageEditorRecord, eventViews, holonewsViews, messageViews }) {
    if (section === 'messages' && messageEditorRecord) return messageEditorRecord;
    if (section === 'holonews' && holonewsEditorRecord) return holonewsEditorRecord;
    if (section === 'events' && eventEditorRecord) return eventEditorRecord;
    const combined = [...holonewsViews, ...eventViews, ...messageViews];
    return combined.find((record) => record.isPinned && record.state !== DELIVERY_STATE.ARCHIVED)
      ?? combined.find((record) => record.state === DELIVERY_STATE.PUBLISHED)
      ?? combined.find((record) => record.state === DELIVERY_STATE.DRAFT)
      ?? null;
  }

  static _buildHomePreview({ previewRecord, eventViews, holonewsViews, messageViews, selectedPlayerState, partyState, selectedPreviewPlayer = null }) {
    const combined = [...holonewsViews, ...eventViews, ...messageViews];
    const pinned = combined.find((record) => record.isPinned && record.state !== DELIVERY_STATE.ARCHIVED) ?? previewRecord;
    const recipientId = selectedPreviewPlayer?.userId ? `player:${selectedPreviewPlayer.userId}` : null;
    const playerFeed = combined
      .filter((record) => record.state === DELIVERY_STATE.PUBLISHED)
      .filter((record) => this._recordTargetsPreviewPlayer(record, selectedPreviewPlayer))
      .slice(0, 5)
      .map((record) => ({
        id: record.id,
        title: record.title,
        sender: record.senderName,
        category: record.category,
        isUrgent: record.isUrgent,
        isBreakingNews: record.isBreakingNews,
        isRead: recipientId ? record.readRecipientIds?.includes(recipientId) : false,
        isAcknowledged: recipientId ? record.acknowledgedRecipientIds?.includes(recipientId) : false,
        isDismissed: recipientId ? record.dismissedRecipientIds?.includes(recipientId) : false,
        recipientId,
        imageUrl: record.imageUrl || ''
      }));
    const state = {
      location: selectedPlayerState?.location || partyState?.location || 'Current location not set',
      objective: selectedPlayerState?.objective || partyState?.objective || 'No active objective',
      situation: selectedPlayerState?.situation || partyState?.situation || 'Awaiting new instructions.'
    };

    return {
      selectedPlayerLabel: selectedPreviewPlayer?.actorName || selectedPreviewPlayer?.userName || 'All Players',
      selectedRecipientId: recipientId,
      unreadCount: playerFeed.filter((entry) => !entry.isRead).length,
      feedItems: playerFeed,
      feed: previewRecord ? {
        title: previewRecord.title,
        sender: previewRecord.senderName,
        category: previewRecord.category,
        priority: previewRecord.priority,
        audience: previewRecord.audienceLabel,
        audienceMatchesSelectedPlayer: this._recordTargetsPreviewPlayer(previewRecord, selectedPreviewPlayer),
        isUrgent: previewRecord.isUrgent,
        isBreakingNews: previewRecord.isBreakingNews,
        imageUrl: previewRecord.imageUrl || '',
        renderedPreview: previewRecord.renderedBodyPreview || HolonetMarkupService.preview(previewRecord.body || '', 160)
      } : null,
      lastSession: pinned ? {
        title: pinned.title,
        sender: pinned.senderName,
        imageUrl: pinned.imageUrl || '',
        renderedPreview: pinned.renderedBody || HolonetMarkupService.render(pinned.body || '')
      } : null,
      state
    };
  }

  static _recordTargetsPreviewPlayer(record, selectedPreviewPlayer = null) {
    if (!record || !selectedPreviewPlayer?.userId) return true;
    const audienceType = record.audienceType || record.audience?.type || AUDIENCE_TYPE.ALL_PLAYERS;
    const playerIds = record.audiencePlayerIds || record.audience?.playerIds || [];
    if (audienceType === AUDIENCE_TYPE.ALL_PLAYERS || audienceType === AUDIENCE_TYPE.PARTY) return true;
    if (audienceType === AUDIENCE_TYPE.ONE_PLAYER || audienceType === AUDIENCE_TYPE.SELECTED_PLAYERS) {
      return playerIds.includes(selectedPreviewPlayer.userId);
    }
    return false;
  }
}

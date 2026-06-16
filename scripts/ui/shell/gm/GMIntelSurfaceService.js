/** GM Intel surface view-model.
 *
 * Phase 4 keeps Intel inside the existing GM Datapad shell and reads/writes the
 * Phase 3 Holonet Intel metadata service. This is a workflow surface, not a new
 * storage authority.
 */

import {
  HolonetIntelService,
  INTEL_CLASSIFICATION,
  INTEL_KIND,
  INTEL_PERSISTENCE,
  INTEL_REVEAL_STATE,
  INTEL_STATUS
} from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js';
import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { HolonetDecryptionService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-decryption-service.js';

function cleanString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function titleCase(value = '') {
  return cleanString(value)
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function option(value, selected = '') {
  return {
    value,
    label: titleCase(value),
    selected: value === selected
  };
}

function optionsFrom(values = [], selected = '', { includeAll = false, allLabel = 'All' } = {}) {
  const rows = values.map(value => option(value, selected));
  if (!includeAll) return rows;
  return [{ value: '', label: allLabel, selected: !selected }, ...rows];
}

function fmtDate(value = '') {
  const time = Date.parse(value || '');
  if (!Number.isFinite(time)) return 'No timestamp';
  try {
    return new Date(time).toLocaleString();
  } catch (_err) {
    return value;
  }
}

function statusClass(value = '') {
  if (value === INTEL_STATUS.RELEASED) return 'is-released';
  if (value === INTEL_STATUS.READY) return 'is-ready';
  if (value === INTEL_STATUS.ARCHIVED) return 'is-archived';
  if (value === INTEL_STATUS.DESTROYED) return 'is-destroyed';
  return 'is-draft';
}

function classificationClass(value = '') {
  if (value === INTEL_CLASSIFICATION.BLACK_FILE) return 'is-black-file';
  if (value === INTEL_CLASSIFICATION.CLASSIFIED) return 'is-classified';
  if (value === INTEL_CLASSIFICATION.CONFIDENTIAL) return 'is-confidential';
  if (value === INTEL_CLASSIFICATION.PUBLIC) return 'is-public';
  return 'is-restricted';
}

function visibilityModeLabel(visibility = {}) {
  return titleCase(visibility?.mode || 'gm-only');
}

function persistenceLabel(value = '') {
  return titleCase(value || INTEL_PERSISTENCE.GM_ONLY);
}

function findFaction(factions = [], factionId = '') {
  const id = cleanString(factionId).toLowerCase();
  if (!id) return null;
  return factions.find(faction => cleanString(faction.id).toLowerCase() === id || cleanString(faction.name).toLowerCase() === id) || null;
}

function findContact(factions = [], factionId = '', contactId = '') {
  const faction = findFaction(factions, factionId);
  const contacts = faction ? asArray(faction.contacts) : factions.flatMap(entry => asArray(entry.contacts));
  const id = cleanString(contactId).toLowerCase();
  if (!id) return null;
  return contacts.find(contact => cleanString(contact.id).toLowerCase() === id || cleanString(contact.name).toLowerCase() === id) || null;
}

function contactOptions(factions = [], selectedFactionId = '', selectedContactId = '') {
  const selectedFaction = cleanString(selectedFactionId);
  const rows = [];
  for (const faction of factions) {
    if (selectedFaction && faction.id !== selectedFaction) continue;
    for (const contact of asArray(faction.contacts)) {
      rows.push({
        value: contact.id,
        label: `${contact.name || 'Named Contact'} (${faction.name || 'Faction'})`,
        factionId: faction.id,
        selected: contact.id === selectedContactId
      });
    }
  }
  return [{ value: '', label: 'No linked NPC/contact', selected: !selectedContactId }, ...rows];
}

function tagsLabel(tags = []) {
  return asArray(tags).filter(Boolean).join(', ');
}

function lockboxItemsText(lockbox = {}) {
  return asArray(lockbox.items).map(item => {
    const uuid = cleanString(item.uuid);
    if (!uuid) return '';
    const qty = Math.max(1, Number(item.quantity || 1) || 1);
    const name = cleanString(item.name);
    return [uuid, qty > 1 ? qty : '', name].filter(Boolean).join(' | ');
  }).filter(Boolean).join('\n');
}

function lockboxSummary(lockbox = {}) {
  if (!lockbox?.enabled) return 'No lockbox';
  const bits = [];
  if (Number(lockbox.credits || 0) > 0) bits.push(`${Number(lockbox.credits || 0).toLocaleString()} credits`);
  const itemCount = asArray(lockbox.items).length;
  if (itemCount) bits.push(`${itemCount} item${itemCount === 1 ? '' : 's'}`);
  return bits.length ? bits.join(' + ') : 'Empty lockbox';
}

function cardFromRecord(record = {}, factions = []) {
  const intel = HolonetIntelService.getIntelMetadata(record);
  if (!intel) return null;
  const faction = findFaction(factions, intel.linkedFactionId);
  const contact = findContact(factions, intel.linkedFactionId, intel.linkedContactId);
  const linkBits = [];
  if (faction?.name) linkBits.push(faction.name);
  if (contact?.name) linkBits.push(contact.name);
  if (!linkBits.length && intel.linkedActorUuid) linkBits.push('Actor-linked');
  return {
    recordId: record.id,
    id: intel.id,
    title: intel.title,
    kind: intel.kind,
    kindLabel: titleCase(intel.kind),
    classification: intel.classification,
    classificationLabel: titleCase(intel.classification),
    classificationClass: classificationClass(intel.classification),
    status: intel.status,
    statusLabel: titleCase(intel.status),
    statusClass: statusClass(intel.status),
    persistence: intel.persistence,
    persistenceLabel: persistenceLabel(intel.persistence),
    revealState: intel.revealState,
    revealStateLabel: titleCase(intel.revealState),
    linkedFactionId: intel.linkedFactionId,
    linkedFactionName: faction?.name || '',
    linkedContactId: intel.linkedContactId,
    linkedContactName: contact?.name || '',
    linkLabel: linkBits.join(' / ') || 'Unlinked Intel',
    visibilityLabel: visibilityModeLabel(intel.visibility),
    summary: intel.summary || intel.publicBody || intel.redactedBody || intel.fullBody || '',
    tagsLabel: tagsLabel(intel.tags),
    updatedAt: intel.updatedAt,
    updatedLabel: fmtDate(intel.updatedAt || record.updatedAt || record.createdAt),
    createdLabel: fmtDate(intel.createdAt || record.createdAt),
    isArchived: intel.status === INTEL_STATUS.ARCHIVED,
    isDestroyed: intel.status === INTEL_STATUS.DESTROYED,
    hasLockbox: Boolean(intel.lockbox?.enabled),
    lockboxSummary: lockboxSummary(intel.lockbox),
    searchText: [intel.title, intel.kind, intel.classification, intel.status, intel.summary, intel.publicBody, intel.gmNotes, tagsLabel(intel.tags), faction?.name, contact?.name].join(' ').toLowerCase()
  };
}

function editorFromRecord(record = null, defaults = {}) {
  const intel = record ? HolonetIntelService.getIntelMetadata(record) : null;
  const data = {
    recordId: record?.id || '',
    id: intel?.id || '',
    title: intel?.title || defaults.title || '',
    kind: intel?.kind || defaults.kind || INTEL_KIND.CLUE,
    classification: intel?.classification || defaults.classification || INTEL_CLASSIFICATION.RESTRICTED,
    status: intel?.status || defaults.status || INTEL_STATUS.DRAFT,
    persistence: intel?.persistence || defaults.persistence || INTEL_PERSISTENCE.GM_ONLY,
    revealState: intel?.revealState || defaults.revealState || INTEL_REVEAL_STATE.SEALED,
    linkedFactionId: intel?.linkedFactionId || defaults.linkedFactionId || '',
    linkedContactId: intel?.linkedContactId || defaults.linkedContactId || '',
    linkedActorUuid: intel?.linkedActorUuid || defaults.linkedActorUuid || '',
    linkedJobThreadId: intel?.linkedJobThreadId || defaults.linkedJobThreadId || '',
    linkedSceneUuid: intel?.linkedSceneUuid || defaults.linkedSceneUuid || '',
    linkedItemUuid: intel?.linkedItemUuid || defaults.linkedItemUuid || '',
    summary: intel?.summary || defaults.summary || '',
    publicBody: intel?.publicBody || defaults.publicBody || '',
    redactedBody: intel?.redactedBody || defaults.redactedBody || '',
    fullBody: intel?.fullBody || defaults.fullBody || '',
    gmNotes: intel?.gmNotes || defaults.gmNotes || '',
    tags: tagsLabel(intel?.tags || defaults.tags || []),
    visibilityMode: intel?.visibility?.mode || defaults.visibility?.mode || 'gm-only',
    visibilityUserIds: tagsLabel(intel?.visibility?.userIds || defaults.visibility?.userIds || []),
    visibilityActorIds: tagsLabel(intel?.visibility?.actorIds || defaults.visibility?.actorIds || []),
    dossierCommit: Boolean(intel?.dossierCommit || defaults.dossierCommit || false),
    skillGateEnabled: Boolean(intel?.skillGate?.enabled || defaults.skillGate?.enabled || false),
    skillGateSkill: intel?.skillGate?.skill || defaults.skillGate?.skill || 'useComputer',
    skillGateSkills: tagsLabel(intel?.skillGate?.skills || defaults.skillGate?.skills || [intel?.skillGate?.skill || defaults.skillGate?.skill || 'useComputer']),
    skillGateDc: intel?.skillGate?.dc ?? defaults.skillGate?.dc ?? 15,
    cipherLevel: intel?.skillGate?.level ?? defaults.skillGate?.level ?? 12,
    decryptionMode: intel?.skillGate?.decryptionMode || defaults.skillGate?.decryptionMode || 'glyphCipher',
    cipherMode: intel?.skillGate?.cipherMode || defaults.skillGate?.cipherMode || 'sub',
    cipherGlyphs: intel?.skillGate?.glyphs ?? defaults.skillGate?.glyphs ?? true,
    cipherTranspose: intel?.skillGate?.transpose ?? defaults.skillGate?.transpose ?? false,
    cipherPreReveal: Math.round(Number(intel?.skillGate?.preRevealFrac ?? defaults.skillGate?.preRevealFrac ?? 0.5) * 100),
    cipherFailEnabled: intel?.skillGate?.failEnabled ?? defaults.skillGate?.failEnabled ?? true,
    cipherFailType: intel?.skillGate?.failType || defaults.skillGate?.failType || 'attempts',
    cipherFailedRollLimit: intel?.skillGate?.failedRollLimit ?? defaults.skillGate?.failedRollLimit ?? 6,
    cipherTraceMax: intel?.skillGate?.traceMax ?? defaults.skillGate?.traceMax ?? 10,
    lockboxEnabled: Boolean(intel?.lockbox?.enabled || defaults.lockbox?.enabled || false),
    lockboxLabel: intel?.lockbox?.label || defaults.lockbox?.label || 'Encrypted Lockbox',
    lockboxCredits: intel?.lockbox?.credits ?? defaults.lockbox?.credits ?? 0,
    lockboxItems: lockboxItemsText(intel?.lockbox || defaults.lockbox || {}),
    lockboxNotes: intel?.lockbox?.notes || defaults.lockbox?.notes || '',
    lockboxSummary: lockboxSummary(intel?.lockbox || defaults.lockbox || {}),
    createdLabel: fmtDate(intel?.createdAt || record?.createdAt),
    updatedLabel: fmtDate(intel?.updatedAt || record?.updatedAt),
    isExisting: Boolean(record)
  };
  return data;
}

export class GMIntelSurfaceService {
  static async buildViewModel(host) {
    const surfaceState = host?.getSurfaceState?.('intel') || {};
    const filters = {
      search: cleanString(surfaceState.search),
      status: cleanString(surfaceState.status),
      kind: cleanString(surfaceState.kind),
      classification: cleanString(surfaceState.classification),
      persistence: cleanString(surfaceState.persistence),
      includeArchived: surfaceState.includeArchived !== false
    };
    const registrySummary = FactionRegistryService.summarizeForWorkspace();
    const factions = registrySummary.factions || [];
    const records = await HolonetIntelService.getAllIntel({ includeArchived: true });
    const cards = records.map(record => cardFromRecord(record, factions)).filter(Boolean);
    const visibleCards = cards.filter((card) => {
      if (filters.status && card.status !== filters.status) return false;
      if (filters.kind && card.kind !== filters.kind) return false;
      if (filters.classification && card.classification !== filters.classification) return false;
      if (filters.persistence && card.persistence !== filters.persistence) return false;
      if (!filters.includeArchived && (card.isArchived || card.isDestroyed)) return false;
      const q = filters.search.toLowerCase();
      if (q && !card.searchText.includes(q)) return false;
      return true;
    });

    const selectedRecordId = cleanString(surfaceState.selectedRecordId || surfaceState.focusedRecordId || visibleCards[0]?.recordId || '');
    const selectedRecord = selectedRecordId ? await HolonetIntelService.getIntelById(selectedRecordId) : null;
    const selectedCard = selectedRecord ? cardFromRecord(selectedRecord, factions) : null;
    const editor = editorFromRecord(selectedRecord);
    const factionOptions = [{ value: '', label: 'No linked faction', selected: !editor.linkedFactionId }, ...factions.map(faction => ({
      value: faction.id,
      label: faction.name,
      selected: faction.id === editor.linkedFactionId
    }))];

    const stats = this._buildStats(cards);
    const decryptionModeCards = HolonetDecryptionService.analysisModeOptions().map(entry => ({
      ...entry,
      value: entry.id,
      selected: entry.id === editor.decryptionMode,
      className: entry.id === editor.decryptionMode ? 'is-selected' : '',
      skillList: tagsLabel(entry.defaultSkills || []),
      playbookText: (entry.playbook || []).map(action => `${action.label}: ${action.effect}`).join(' • ')
    }));
    const selectedModeCard = decryptionModeCards.find(entry => entry.selected) || decryptionModeCards[0] || null;
    return {
      pageTitle: 'GM Intel',
      pageDescription: 'Draft, classify, and stage Holonet-backed clues, rumors, dossiers, and controlled reveals.',
      intelManager: {
        filters,
        cards: visibleCards,
        allCards: cards,
        selectedCard,
        hasIntel: cards.length > 0,
        hasVisibleIntel: visibleCards.length > 0,
        selectedRecordId,
        editor,
        stats,
        statusOptions: optionsFrom(Object.values(INTEL_STATUS), filters.status, { includeAll: true, allLabel: 'All statuses' }),
        kindOptions: optionsFrom(Object.values(INTEL_KIND), filters.kind, { includeAll: true, allLabel: 'All kinds' }),
        classificationOptions: optionsFrom(Object.values(INTEL_CLASSIFICATION), filters.classification, { includeAll: true, allLabel: 'All classifications' }),
        persistenceOptions: optionsFrom(Object.values(INTEL_PERSISTENCE), filters.persistence, { includeAll: true, allLabel: 'All persistence' }),
        editorKindOptions: optionsFrom(Object.values(INTEL_KIND), editor.kind),
        editorClassificationOptions: optionsFrom(Object.values(INTEL_CLASSIFICATION), editor.classification),
        editorStatusOptions: optionsFrom(Object.values(INTEL_STATUS), editor.status),
        editorPersistenceOptions: optionsFrom(Object.values(INTEL_PERSISTENCE), editor.persistence),
        editorRevealStateOptions: optionsFrom(Object.values(INTEL_REVEAL_STATE), editor.revealState),
        visibilityOptions: optionsFrom(['gm-only', 'party', 'selected-players', 'public'], editor.visibilityMode),
        decryptionModeOptions: decryptionModeCards,
        decryptionModeCards,
        selectedModeCard,
        cipherModeOptions: optionsFrom(['caesar', 'sub'], editor.cipherMode),
        cipherFailTypeOptions: optionsFrom(['attempts', 'trace'], editor.cipherFailType),
        factionOptions,
        contactOptions: contactOptions(factions, editor.linkedFactionId, editor.linkedContactId),
        factionCount: factions.length,
        contactCount: factions.reduce((sum, faction) => sum + asArray(faction.contacts).length, 0)
      }
    };
  }

  static _buildStats(cards = []) {
    const count = (predicate) => cards.filter(predicate).length;
    return {
      total: cards.length,
      draft: count(card => card.status === INTEL_STATUS.DRAFT),
      ready: count(card => card.status === INTEL_STATUS.READY),
      released: count(card => card.status === INTEL_STATUS.RELEASED),
      archived: count(card => card.status === INTEL_STATUS.ARCHIVED),
      destroyed: count(card => card.status === INTEL_STATUS.DESTROYED),
      faction: count(card => Boolean(card.linkedFactionId)),
      npc: count(card => Boolean(card.linkedContactId)),
      secret: count(card => [INTEL_PERSISTENCE.SECRET_NOTE, INTEL_PERSISTENCE.SELF_DESTRUCT].includes(card.persistence)),
      lockboxes: count(card => card.hasLockbox)
    };
  }
}

/** GM Job Board command surface view-model. */

import { HolonetStorage } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js';
import { AssetGrantService } from '/systems/foundryvtt-swse/scripts/engine/assets/AssetGrantService.js';
import { FactionJobBridgeService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/FactionJobBridgeService.js';

const THREAD_TYPE_JOB = 'job';
const PARTY_FUND_RECIPIENT_ID = 'party-fund';

function getSwseSetting(key, fallback = null) {
  try {
    return game.settings?.get?.('foundryvtt-swse', key) ?? fallback;
  } catch (_err) {
    return fallback;
  }
}

function isPartyFundEnabled() {
  return Boolean(getSwseSetting('holonetPartyFundEnabled', false));
}


const JOB_STATUS_META = Object.freeze({
  draft: { label: 'Draft', shelf: 'drafts', playerShelf: 'available', group: 'Draft', tone: 'draft', order: 10, next: ['posted', 'archived'] },
  posted: { label: 'Open', shelf: 'current', playerShelf: 'available', group: 'Open', tone: 'open', order: 20, next: ['accepted', 'inProgress', 'archived', 'failed'] },
  accepted: { label: 'Claimed', shelf: 'current', playerShelf: 'active', group: 'Claimed', tone: 'claimed', order: 30, next: ['inProgress', 'review', 'archived', 'failed'] },
  inProgress: { label: 'Active', shelf: 'current', playerShelf: 'active', group: 'In Progress', tone: 'active', order: 40, next: ['review', 'complete', 'archived', 'failed'] },
  review: { label: 'Review', shelf: 'current', playerShelf: 'active', group: 'Needs Review', tone: 'attention', order: 50, next: ['complete', 'inProgress', 'archived', 'failed'] },
  complete: { label: 'Ready to Pay', shelf: 'current', playerShelf: 'completed', group: 'Ready to Pay', tone: 'attention', order: 60, next: ['paid', 'review', 'archived'] },
  paid: { label: 'Paid', shelf: 'archived', playerShelf: 'completed', group: 'Paid', tone: 'success', order: 70, next: ['archived'] },
  archived: { label: 'Archived', shelf: 'archived', playerShelf: 'completed', group: 'Archived', tone: 'muted', order: 80, next: ['posted'] },
  failed: { label: 'Failed', shelf: 'archived', playerShelf: 'completed', group: 'Failed', tone: 'danger', order: 90, next: ['posted', 'archived'] }
});

const JOB_STATUS_LABELS = Object.freeze(Object.fromEntries(Object.entries(JOB_STATUS_META).map(([status, meta]) => [status, meta.label])));

const JOB_LIFECYCLE_SHELVES = Object.freeze([
  { id: 'current', label: 'Current', hint: 'Open, claimed, active, review, and payout-ready contracts', statuses: ['posted', 'accepted', 'inProgress', 'review', 'complete'] },
  { id: 'drafts', label: 'Drafts', hint: 'Prepared but not posted', statuses: ['draft'] },
  { id: 'archived', label: 'Archived', hint: 'Paid, failed, or archived contracts that can be restored or reused', statuses: ['paid', 'archived', 'failed'] }
]);

const PLAYER_LIFECYCLE_SHELVES = Object.freeze([
  { id: 'available', label: 'Available', hint: 'Jobs the party can accept', statuses: ['posted'] },
  { id: 'active', label: 'Active', hint: 'Jobs currently being worked', statuses: ['accepted', 'inProgress', 'review'] },
  { id: 'completed', label: 'Completed', hint: 'Jobs awaiting payout or already resolved', statuses: ['complete', 'paid', 'archived', 'failed'] }
]);

const JOB_COLUMNS = Object.freeze([
  { id: 'drafts', label: 'Drafts', hint: 'Prepared but not posted', statuses: ['draft'] },
  { id: 'open', label: 'Open', hint: 'Posted and visible', statuses: ['posted'] },
  { id: 'claimed', label: 'Claimed', hint: 'Accepted or assigned', statuses: ['accepted'] },
  { id: 'active', label: 'Active', hint: 'In progress', statuses: ['inProgress'] },
  { id: 'review', label: 'Review', hint: 'Needs GM objective review', statuses: ['review'] },
  { id: 'payout', label: 'Ready to Pay', hint: 'Complete and unpaid', statuses: ['complete'] },
  { id: 'archive', label: 'Archive', hint: 'Paid, failed, or archived', statuses: ['paid', 'archived', 'failed'] }
]);

const STATUS_ACTIONS = Object.freeze(Object.entries(JOB_STATUS_META)
  .filter(([status]) => status !== 'draft')
  .map(([value, meta]) => ({ value, label: meta.label })));

const OBJECTIVE_STATUS_LABELS = Object.freeze({
  open: 'Open',
  claimed: 'Claimed Complete',
  submitted: 'Submitted',
  pendingReview: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  failed: 'Failed'
});

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(value) {
  return Array.from(new Set(safeArray(value)
    .map(entry => String(entry || '').trim())
    .filter(Boolean)));
}

function cleanActorId(value) {
  return String(value || '').replace(/^Actor\./, '').trim();
}

function asNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatCredits(value) {
  const amount = Math.max(0, Math.floor(asNumber(value)));
  return `${amount.toLocaleString()} cr`;
}

function formatMaybeDate(value) {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function metadataForThread(thread) {
  return thread?.metadata ?? {};
}

function jobForThread(thread) {
  return metadataForThread(thread).job ?? {};
}

function jobStatus(job) {
  const status = String(job?.status || 'posted').trim() || 'posted';
  return JOB_STATUS_META[status] ? status : 'posted';
}

function statusMeta(status) {
  return JOB_STATUS_META[jobStatus({ status })] ?? JOB_STATUS_META.posted;
}

function statusLabel(status) {
  return JOB_STATUS_LABELS[status] ?? String(status || 'Open');
}

function statusOrder(status) {
  return statusMeta(status).order ?? 999;
}

function lifecycleShelfId(status, { player = false } = {}) {
  const meta = statusMeta(status);
  return player ? (meta.playerShelf || 'available') : (meta.shelf || 'current');
}

function transitionActionLabel(fromStatus, toStatus) {
  const from = jobStatus({ status: fromStatus });
  const to = jobStatus({ status: toStatus });
  if (from === to) return statusLabel(to);
  if (to === 'archived') return from === 'paid' ? 'Archive Paid Job' : 'Archive Job';
  if (from === 'archived' && to === 'posted') return 'Restore to Current';
  if (from === 'failed' && to === 'posted') return 'Reopen as Open';
  if (from === 'draft' && to === 'posted') return 'Publish Job';
  if (from === 'posted' && to === 'accepted') return 'Mark Claimed';
  if (to === 'inProgress') return from === 'review' ? 'Return to Active' : 'Start Mission';
  if (to === 'review') return from === 'complete' ? 'Reopen Review' : 'Send to Review';
  if (to === 'complete') return 'Mark Ready to Pay';
  if (to === 'paid') return 'Mark Paid';
  if (to === 'failed') return 'Mark Failed';
  return statusLabel(to);
}

function transitionActionTone(fromStatus, toStatus) {
  const to = jobStatus({ status: toStatus });
  if (to === 'archived') return 'muted';
  if (to === 'failed') return 'danger';
  if (to === 'paid' || to === 'complete') return 'success';
  if (to === 'review') return 'attention';
  if (to === 'posted' && ['archived', 'failed'].includes(jobStatus({ status: fromStatus }))) return 'open';
  return statusMeta(to).tone;
}

function objectiveTypeLabel(type) {
  switch (String(type || '').toLowerCase()) {
    case 'primary': return 'Primary';
    case 'secondary': return 'Secondary';
    case 'tertiary': return 'Tertiary';
    default: return 'Objective';
  }
}

function normalizeObjective(raw, index = 0) {
  const type = String(raw?.type || raw?.tier || (index === 0 ? 'primary' : 'secondary')).trim() || 'objective';
  const tier = String(raw?.tier || type || 'secondary').trim() || 'secondary';
  const status = String(raw?.status || 'open').trim() || 'open';
  const lowerType = type.toLowerCase();
  const required = lowerType === 'primary' ? true : Boolean(raw?.required);
  const credits = Math.max(0, Math.floor(asNumber(raw?.rewardCredits ?? raw?.credits ?? raw?.creditReward ?? 0)));
  const xp = Math.max(0, Math.floor(asNumber(raw?.rewardXp ?? raw?.xp ?? raw?.xpReward ?? 0)));
  const itemRewards = String(raw?.rewardItems ?? raw?.itemRewards ?? raw?.items ?? '').trim();
  const itemUuids = uniqueStrings(raw?.rewardItemUuids);
  const assetActorIds = uniqueStrings(raw?.rewardAssetActorIds).map(cleanActorId).filter(Boolean);
  const title = String(raw?.title || raw?.objective || raw?.name || `Objective ${index + 1}`).trim();

  return {
    id: String(raw?.id || raw?.objectiveId || `objective-${index + 1}`),
    type,
    tier,
    typeLabel: objectiveTypeLabel(type),
    tierLabel: objectiveTypeLabel(tier),
    tierTone: ['primary', 'secondary', 'tertiary'].includes(tier.toLowerCase()) ? tier.toLowerCase() : 'secondary',
    isPrimaryTier: tier.toLowerCase() === 'primary',
    isSecondaryTier: tier.toLowerCase() === 'secondary',
    isTertiaryTier: tier.toLowerCase() === 'tertiary',
    required,
    requiredLabel: required ? 'Required' : 'Optional',
    title,
    description: String(raw?.description || raw?.memo || raw?.body || '').trim(),
    memo: String(raw?.memo || '').trim(),
    rewardCredits: credits,
    rewardCreditsLabel: credits ? formatCredits(credits) : '',
    rewardXp: xp,
    rewardXpLabel: xp ? `${xp.toLocaleString()} XP` : '',
    rewardItems: itemRewards,
    rewardItemUuids: itemUuids,
    rewardAssetActorIds: assetActorIds,
    hasRewardItemUuids: itemUuids.length > 0,
    hasRewardAssetActors: assetActorIds.length > 0,
    status,
    statusLabel: OBJECTIVE_STATUS_LABELS[status] ?? status,
    statusTone: ['claimed', 'submitted', 'pendingReview'].includes(status) ? 'review' : status,
    reviewBadge: ['claimed', 'submitted', 'pendingReview'].includes(status) ? 'Submitted' : (OBJECTIVE_STATUS_LABELS[status] ?? status),
    needsReview: ['claimed', 'submitted', 'pendingReview'].includes(status),
    isApproved: status === 'approved',
    isRejected: status === 'rejected',
    isFailed: status === 'failed',
    submittedBy: raw?.submittedBy || raw?.claimedBy || null,
    submittedAt: raw?.submittedAt || null,
    submittedAtLabel: raw?.submittedAt ? formatMaybeDate(raw.submittedAt) : '',
    reviewedBy: raw?.reviewedBy || null,
    reviewedAt: raw?.reviewedAt || null,
    reviewedAtLabel: raw?.reviewedAt ? formatMaybeDate(raw.reviewedAt) : '',
    reviewNote: String(raw?.reviewNote || raw?.objectiveNote || '').trim(),
    canSubmit: !['submitted', 'pendingReview', 'claimed', 'approved', 'rejected', 'failed'].includes(status),
    canReview: ['claimed', 'submitted', 'pendingReview'].includes(status),
    canReopen: ['approved', 'rejected', 'failed'].includes(status),
    history: safeArray(raw?.statusHistory),
    raw
  };
}

function normalizeObjectives(job) {
  const explicit = safeArray(job?.objectives);
  const grouped = [
    ...safeArray(job?.primaryObjectives).map(o => ({ ...o, type: 'primary', required: true })),
    ...safeArray(job?.secondaryObjectives).map(o => ({ ...o, type: 'secondary' })),
    ...safeArray(job?.tertiaryObjectives).map(o => ({ ...o, type: 'tertiary', required: false }))
  ];
  const objectives = (explicit.length ? explicit : grouped).map(normalizeObjective);

  if (objectives.length) return objectives;

  return [{
    id: 'legacy-primary',
    type: 'primary',
    tier: 'primary',
    typeLabel: 'Primary',
    tierLabel: 'Primary',
    tierTone: 'primary',
    isPrimaryTier: true,
    isSecondaryTier: false,
    isTertiaryTier: false,
    required: true,
    requiredLabel: 'Required',
    title: job?.title || 'Complete the posted job',
    description: 'Legacy job posting. Review the Messenger thread for the full briefing and completion terms.',
    memo: '',
    rewardCredits: Math.max(0, Math.floor(asNumber(job?.rewardCredits ?? 0))),
    rewardCreditsLabel: job?.rewardCredits ? formatCredits(job.rewardCredits) : '',
    rewardXp: 0,
    rewardXpLabel: '',
    rewardItems: String(job?.rewardItems || '').trim(),
    rewardItemUuids: uniqueStrings(job?.rewardItemUuids),
    rewardAssetActorIds: uniqueStrings(job?.rewardAssetActorIds).map(cleanActorId).filter(Boolean),
    hasRewardItemUuids: uniqueStrings(job?.rewardItemUuids).length > 0,
    hasRewardAssetActors: uniqueStrings(job?.rewardAssetActorIds).length > 0,
    status: ['complete', 'paid'].includes(jobStatus(job)) ? 'approved' : 'open',
    statusLabel: ['complete', 'paid'].includes(jobStatus(job)) ? 'Approved' : 'Open',
    statusTone: ['complete', 'paid'].includes(jobStatus(job)) ? 'approved' : 'open',
    reviewBadge: ['complete', 'paid'].includes(jobStatus(job)) ? 'Approved' : 'Open',
    needsReview: false,
    isApproved: ['complete', 'paid'].includes(jobStatus(job)),
    isRejected: false,
    isFailed: false,
    submittedBy: null,
    submittedAt: null,
    submittedAtLabel: '',
    reviewedBy: null,
    reviewedAt: null,
    reviewedAtLabel: '',
    reviewNote: '',
    canSubmit: !['complete', 'paid'].includes(jobStatus(job)),
    canReview: false,
    canReopen: ['complete', 'paid'].includes(jobStatus(job)),
    history: [],
    raw: null
  }];
}

function participantLabel(recipient) {
  if (!recipient) return 'Unknown';
  return recipient.actorName || recipient.metadata?.label || recipient.systemLabel || recipient.id || 'Unknown';
}

function participantAvatar(recipient) {
  if (!recipient) return null;
  if (recipient.metadata?.avatar) return recipient.metadata.avatar;
  if (recipient.actorId) return game.actors?.get(recipient.actorId)?.img ?? null;
  return null;
}

function nonGmParticipants(thread) {
  return safeArray(thread?.participants)
    .filter(recipient => !String(recipient?.id || '').startsWith('gm:'))
    .map(recipient => ({
      id: recipient.id,
      actorId: recipient.actorId ?? null,
      label: participantLabel(recipient),
      avatar: participantAvatar(recipient),
      typeLabel: recipient.actorId ? 'Actor' : (recipient.recipientType || 'Recipient')
    }));
}

function payoutTargets(thread) {
  const participants = nonGmParticipants(thread).filter(row => row.actorId);
  const rows = participants.map(row => ({ id: row.id, label: row.label, actorId: row.actorId }));
  if (isPartyFundEnabled()) rows.push({ id: PARTY_FUND_RECIPIENT_ID, label: 'Party Fund', actorId: null, partyFund: true });
  return rows;
}

function jobCreationRecipients() {
  const users = Array.from(game.users?.contents ?? game.users ?? []);
  return users
    .filter(user => !user?.isGM && user?.character)
    .map(user => ({
      id: `player:${user.id}`,
      label: user.character?.name || user.name || 'Player',
      actorId: user.character?.id ?? null,
      userName: user.name || 'Player'
    }));
}

function clientTypeOptions() {
  return [
    { value: 'npc', label: 'NPC Individual' },
    { value: 'faction', label: 'Faction' },
    { value: 'organization', label: 'Organization' },
    { value: 'anonymous', label: 'Anonymous' },
    { value: 'party', label: 'The Party' },
    { value: 'mentor', label: 'Mentor' },
    { value: 'customNpc', label: 'Custom NPC' }
  ];
}

function payoutModeOptions() {
  const modes = [
    { value: 'single', label: 'Pay a single player' },
    { value: 'eachFull', label: 'Pay every selected player full amount' },
    { value: 'splitEvenly', label: 'Split evenly among selected players' }
  ];
  if (isPartyFundEnabled()) {
    modes.unshift({ value: 'partyFund', label: 'Pay all to Party Fund' });
    modes.push({ value: 'splitWithPartyCut', label: 'Split evenly after Party Fund cut' });
  }
  return modes;
}

function xpPayoutModeOptions() {
  return [
    { value: 'single', label: 'Award one selected actor' },
    { value: 'eachFull', label: 'Award every selected actor full XP' },
    { value: 'splitEvenly', label: 'Split XP evenly among selected actors' }
  ];
}


function assetRewardCandidates() {
  try {
    return AssetGrantService.assetCandidates({ includeUnowned: true });
  } catch (_err) {
    return [];
  }
}

function assetRewardCandidatesByIds(ids = [], fallbackCandidates = null) {
  const wanted = uniqueStrings(ids).map(cleanActorId).filter(Boolean);
  if (!wanted.length) return [];
  const candidates = Array.isArray(fallbackCandidates) ? fallbackCandidates : assetRewardCandidates();
  const byId = new Map(candidates.map(entry => [cleanActorId(entry.id), entry]));
  const rows = [];
  for (const id of wanted) {
    const candidate = byId.get(id);
    if (candidate) {
      rows.push(candidate);
      continue;
    }
    const actor = game.actors?.get?.(id);
    if (actor && AssetGrantService.isGrantableAsset(actor)) {
      rows.push({
        id: actor.id,
        uuid: actor.uuid || `Actor.${actor.id}`,
        name: actor.name || 'Unnamed Asset',
        img: actor.img || 'icons/svg/mystery-man.svg',
        type: actor.type,
        kind: actor.type === 'droid' ? 'droid' : 'ship',
        typeLabel: actor.type === 'droid' ? 'Droid' : 'Ship / Vehicle'
      });
    }
  }
  const seen = new Set();
  return rows.filter(row => {
    const id = cleanActorId(row.id);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function itemDistributionModeOptions() {
  return [
    { value: 'single-copy', label: 'Grant all attached items to one actor' },
    { value: 'all-selected', label: 'Grant a copy of all attached items to each selected actor' },
    { value: 'round-robin-unique', label: 'Assign one unique attached item per selected actor' }
  ];
}

function rewardEntryLabel(entry = {}) {
  const label = String(entry.label || entry.name || entry.uuid || entry.actorId || entry.note || '').trim();
  return label || 'Reward';
}

function normalizeRewardNoteRows(value, { source = 'Base Reward', kind = 'item-note' } = {}) {
  const text = String(value || '').trim();
  if (!text) return [];
  return text
    .split(/\s*(?:;|\n|\r|•)\s*/)
    .map(part => part.trim())
    .filter(Boolean)
    .map((label, index) => ({ id: `${kind}-${source}-${index}`.replace(/[^a-z0-9_-]+/gi, '-'), kind, label, source }));
}
function normalizeRewardUuidRows(uuids = [], { source = 'Base Reward', kind = 'item' } = {}) {
  return uniqueStrings(uuids).map((uuid, index) => ({
    id: `${kind}-${index}-${String(uuid).replace(/[^a-z0-9_-]+/gi, '-')}`,
    kind,
    uuid,
    label: 'Attached item reward',
    source
  }));
}

function normalizeRewardAssetRows(ids = [], { source = 'Base Reward' } = {}, fallbackCandidates = null) {
  const candidates = Array.isArray(fallbackCandidates) ? fallbackCandidates : assetRewardCandidates();
  const candidateRows = assetRewardCandidatesByIds(ids, candidates);
  const byId = new Map(candidateRows.map(row => [cleanActorId(row.id), row]));
  return uniqueStrings(ids).map(cleanActorId).filter(Boolean).map((actorId, index) => {
    const row = byId.get(actorId);
    return {
      id: actorId,
      actorId,
      uuid: row?.uuid || `Actor.${actorId}`,
      kind: 'asset',
      label: row?.name || `Actor.${actorId}`,
      name: row?.name || `Actor.${actorId}`,
      img: row?.img || 'icons/svg/mystery-man.svg',
      typeLabel: row?.typeLabel || 'Shared Asset',
      source,
      index
    };
  });
}

function rewardSummary(job, objectives) {
  const baseCredits = Math.max(0, Math.floor(asNumber(job?.rewardCredits ?? 0)));
  const baseXp = Math.max(0, Math.floor(asNumber(job?.rewardXp ?? 0)));
  const approvedObjectives = objectives.filter(objective => objective.isApproved);
  const pendingObjectives = objectives.filter(objective => !objective.isApproved && !objective.isRejected && !objective.isFailed);
  const submittedObjectives = objectives.filter(objective => objective.needsReview);
  const openObjectives = pendingObjectives.filter(objective => !objective.needsReview);
  const rejectedObjectives = objectives.filter(objective => objective.isRejected || objective.isFailed);
  const approvedCredits = approvedObjectives.reduce((sum, objective) => sum + objective.rewardCredits, 0);
  const approvedXp = approvedObjectives.reduce((sum, objective) => sum + objective.rewardXp, 0);
  const totalCredits = baseCredits + approvedCredits;
  const totalXp = baseXp + approvedXp;
  const candidateCache = assetRewardCandidates();

  const baseItemNotes = normalizeRewardNoteRows(job?.rewardItems, { source: 'Base Reward', kind: 'item-note' });
  const approvedItemNotes = approvedObjectives.flatMap(objective => normalizeRewardNoteRows(objective.rewardItems, { source: objective.tierLabel || objective.title || 'Approved Objective', kind: 'item-note' }));
  const baseItemUuids = normalizeRewardUuidRows(job?.rewardItemUuids, { source: 'Base Reward', kind: 'item' });
  const approvedItemUuids = approvedObjectives.flatMap(objective => normalizeRewardUuidRows(objective.rewardItemUuids, { source: objective.tierLabel || objective.title || 'Approved Objective', kind: 'item' }));
  const itemRows = [...baseItemNotes, ...approvedItemNotes, ...baseItemUuids, ...approvedItemUuids];
  const itemUuids = uniqueStrings([...baseItemUuids, ...approvedItemUuids].map(row => row.uuid));

  const baseAssetRows = normalizeRewardAssetRows(job?.rewardAssetActorIds, { source: 'Base Reward' }, candidateCache);
  const approvedAssetRows = approvedObjectives.flatMap(objective => normalizeRewardAssetRows(objective.rewardAssetActorIds, { source: objective.tierLabel || objective.title || 'Approved Objective' }, candidateCache));
  const assetRows = [...baseAssetRows, ...approvedAssetRows];
  const assetActorIds = uniqueStrings(assetRows.map(row => row.actorId)).map(cleanActorId).filter(Boolean);

  const itemSummary = itemRows.length ? itemRows.map(rewardEntryLabel).join(' · ') : 'No approved item rewards';
  const assetSummary = assetRows.length ? assetRows.map(rewardEntryLabel).join(' · ') : 'No approved asset rewards';
  const hasPayableRewards = totalCredits > 0 || totalXp > 0 || itemRows.length > 0 || assetRows.length > 0;
  const pendingReviewLabel = submittedObjectives.length
    ? `${submittedObjectives.length} submitted objective${submittedObjectives.length === 1 ? '' : 's'} not counted yet`
    : '';

  return {
    baseCredits,
    baseCreditsLabel: baseCredits ? formatCredits(baseCredits) : 'None',
    baseXp,
    baseXpLabel: baseXp ? `${baseXp.toLocaleString()} XP` : 'None',
    approvedCredits,
    approvedCreditsLabel: approvedCredits ? `+${formatCredits(approvedCredits)}` : 'None',
    approvedXp,
    approvedXpLabel: approvedXp ? `+${approvedXp.toLocaleString()} XP` : 'None',
    totalCredits,
    payableCredits: totalCredits,
    totalCreditsLabel: totalCredits ? formatCredits(totalCredits) : 'No credits',
    payableCreditsLabel: totalCredits ? formatCredits(totalCredits) : 'No credits',
    totalXp,
    payableXp: totalXp,
    totalXpLabel: totalXp ? `${totalXp.toLocaleString()} XP` : 'No XP',
    payableXpLabel: totalXp ? `${totalXp.toLocaleString()} XP` : 'No XP',
    itemRows,
    itemUuids,
    itemCount: itemRows.length,
    itemSummary,
    hasItemRewards: itemRows.length > 0,
    assetRows,
    assetActorIds,
    assetCount: assetRows.length,
    assetSummary,
    hasAssetRewards: assetRows.length > 0,
    pendingCount: pendingObjectives.length,
    openCount: openObjectives.length,
    submittedCount: submittedObjectives.length,
    rejectedCount: rejectedObjectives.length,
    approvedCount: approvedObjectives.length,
    hasPendingReview: submittedObjectives.length > 0,
    pendingReviewLabel,
    hasPayableRewards,
    payoutReadyLabel: hasPayableRewards ? 'Approved rewards ready' : 'No approved rewards yet',
    breakdownRows: [
      { label: 'Base Credits', value: baseCredits ? formatCredits(baseCredits) : 'None' },
      { label: 'Approved Objective Credits', value: approvedCredits ? `+${formatCredits(approvedCredits)}` : 'None' },
      { label: 'Payable Credits', value: totalCredits ? formatCredits(totalCredits) : 'None', strong: true },
      { label: 'Base XP', value: baseXp ? `${baseXp.toLocaleString()} XP` : 'None' },
      { label: 'Approved Objective XP', value: approvedXp ? `+${approvedXp.toLocaleString()} XP` : 'None' },
      { label: 'Payable XP', value: totalXp ? `${totalXp.toLocaleString()} XP` : 'None', strong: true }
    ]
  };
}

function buildObjectiveGroups(objectives = []) {
  const order = ['primary', 'secondary', 'tertiary'];
  const grouped = new Map();
  for (const objective of objectives) {
    const key = order.includes(String(objective.tier || objective.type || '').toLowerCase())
      ? String(objective.tier || objective.type).toLowerCase()
      : 'secondary';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(objective);
  }
  return order
    .map(key => {
      const rows = grouped.get(key) || [];
      const approved = rows.filter(row => row.isApproved).length;
      const review = rows.filter(row => row.needsReview).length;
      return {
        id: key,
        label: objectiveTypeLabel(key),
        tone: key,
        objectives: rows,
        count: rows.length,
        approvedCount: approved,
        reviewCount: review,
        progressLabel: `${approved}/${rows.length || 0}`
      };
    })
    .filter(group => group.count > 0);
}

function buildStatusGroups(jobs = [], statuses = []) {
  return statuses
    .map(status => {
      const groupJobs = jobs
        .filter(job => job.status === status)
        .sort((a, b) => statusOrder(a.status) - statusOrder(b.status) || String(a.title).localeCompare(String(b.title)));
      const meta = statusMeta(status);
      return {
        id: status,
        label: meta.group || meta.label,
        status,
        tone: meta.tone,
        jobs: groupJobs,
        count: groupJobs.length,
        hasJobs: groupJobs.length > 0
      };
    })
    .filter(group => group.count > 0);
}

function buildLifecycleShelves(jobs = [], shelves = JOB_LIFECYCLE_SHELVES, { player = false } = {}) {
  return shelves.map(shelf => {
    const shelfJobs = jobs.filter(job => lifecycleShelfId(job.status, { player }) === shelf.id);
    const groups = buildStatusGroups(shelfJobs, shelf.statuses);
    return {
      ...shelf,
      jobs: shelfJobs,
      groups,
      count: shelfJobs.length,
      hasJobs: shelfJobs.length > 0
    };
  });
}

function buildTransitionActions(status) {
  const from = jobStatus({ status });
  const meta = statusMeta(from);
  return safeArray(meta.next).map(nextStatus => ({
    fromStatus: from,
    status: nextStatus,
    toStatus: nextStatus,
    action: `${from}-to-${nextStatus}`.replace(/[^A-Za-z0-9_-]+/g, '-'),
    label: transitionActionLabel(from, nextStatus),
    statusLabel: statusLabel(nextStatus),
    tone: transitionActionTone(from, nextStatus),
    isDestructive: ['archived', 'failed'].includes(nextStatus),
    isPrimary: (from === 'draft' && nextStatus === 'posted')
      || (from === 'posted' && nextStatus === 'accepted')
      || (from === 'accepted' && nextStatus === 'inProgress')
      || (from === 'inProgress' && nextStatus === 'review')
      || (from === 'review' && nextStatus === 'complete')
      || (from === 'complete' && nextStatus === 'paid')
      || (from === 'archived' && nextStatus === 'posted')
  }));
}


function signedDeltaLabel(value) {
  const n = asNumber(value, 0);
  return n > 0 ? `+${Math.trunc(n)}` : String(Math.trunc(n));
}

function factionConsequenceEntries(job = {}) {
  const c = job?.factionConsequences || job?.relationshipConsequences || {};
  const sourceEntries = safeArray(c?.entries);
  const rows = [];
  const appliedByKey = c?.appliedByKey && typeof c.appliedByKey === 'object' ? c.appliedByKey : {};
  const reversedByKey = c?.reversedByKey && typeof c.reversedByKey === 'object' ? c.reversedByKey : {};

  const add = (entry = {}, role = 'Issuer', fallbackKey = '') => {
    const factionName = String(entry?.factionName || '').trim();
    if (!factionName) return;
    const type = String(entry?.type || role || 'faction').trim() || 'faction';
    const lowerType = type.toLowerCase();
    const isRival = Boolean(entry?.rival) || lowerType.includes('rival') || lowerType.includes('opposed');
    const isIssuer = lowerType === 'issuer' || String(entry?.role || role || '').toLowerCase().includes('issuer');
    const keyBase = String(entry?.key || entry?.id || fallbackKey || `${type}:${factionName}`).trim().toLowerCase();
    const key = keyBase.replace(/[^a-z0-9:_-]+/g, '-');
    if (rows.some(row => row.key === key)) return;
    const successDelta = asNumber(entry?.successDelta, 0);
    const failureDelta = asNumber(entry?.failureDelta, 0);
    const applied = appliedByKey[key] || null;
    const reversed = reversedByKey[key] || null;
    rows.push({
      id: key,
      key,
      type,
      role: String(entry?.role || (isRival ? 'Rival' : isIssuer ? 'Issuer' : role) || 'Faction'),
      roleLabel: String(entry?.role || (isRival ? 'Rival Faction' : isIssuer ? 'Issuer Faction' : role) || 'Faction'),
      factionId: String(entry?.factionId || '').trim(),
      factionName,
      successDelta,
      failureDelta,
      successLabel: signedDeltaLabel(successDelta),
      failureLabel: signedDeltaLabel(failureDelta),
      successTone: successDelta > 0 ? 'positive' : successDelta < 0 ? 'negative' : 'neutral',
      failureTone: failureDelta > 0 ? 'positive' : failureDelta < 0 ? 'negative' : 'neutral',
      notes: String(entry?.notes || '').trim(),
      isRival,
      isIssuer,
      isAdditional: !isRival && !isIssuer,
      tone: isRival ? 'danger' : isIssuer ? 'attention' : 'info',
      canDelete: !isIssuer,
      applied,
      reversed,
      wasApplied: Boolean(applied),
      wasReversed: Boolean(reversed),
      appliedLabel: applied ? `${statusLabel(applied.status)} ${signedDeltaLabel(applied.delta)}` : '',
      reversedLabel: reversed ? `Corrected ${signedDeltaLabel(reversed.delta)}` : ''
    });
  };

  if (sourceEntries.length) {
    sourceEntries.forEach((entry, index) => add(entry, entry?.role || entry?.type || 'Faction', entry?.key || `entry-${index + 1}`));
  } else {
    add({
      key: 'primary',
      type: 'issuer',
      role: 'Issuer',
      factionName: c?.factionName || job?.issuer?.factionName || job?.client?.factionName || '',
      successDelta: c?.successDelta,
      failureDelta: c?.failureDelta,
      notes: c?.notes
    }, 'Issuer', 'primary');
    for (const entry of safeArray(c?.additionalConsequences)) add(entry, entry?.type || 'Additional');
    for (const entry of safeArray(c?.rivalConsequences)) add({ type: 'rival', role: 'Rival', ...entry }, 'Rival');
  }
  return rows;
}

function buildTimeline(thread, job, recordsById) {
  const history = safeArray(job?.statusHistory).map(entry => ({
    id: `status-${entry.at || Math.random()}`,
    label: `Status changed to ${statusLabel(entry.status)}`,
    detail: entry.by ? `By ${entry.by}` : '',
    at: entry.at || null,
    atLabel: formatMaybeDate(entry.at)
  }));

  const messageEvents = safeArray(thread?.messageIds)
    .map(id => recordsById.get(id))
    .filter(Boolean)
    .filter(record => record.metadata?.systemEvent || record.metadata?.eventType?.startsWith?.('job'))
    .slice(-8)
    .map(record => ({
      id: record.id,
      label: record.body || record.metadata?.eventType || 'Job event',
      detail: record.metadata?.eventType || 'Holonet event',
      at: record.createdAt || null,
      atLabel: formatMaybeDate(record.createdAt)
    }));

  return [...history, ...messageEvents]
    .sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
    .slice(0, 12);
}

export class GMJobBoardSurfaceService {
  static async buildViewModel(host) {
    const threads = await HolonetStorage.getAllThreads();
    const records = await HolonetStorage.getAllRecords();
    const recordsById = new Map(records.map(record => [record.id, record]));
    const jobThreads = threads.filter(thread => metadataForThread(thread).threadType === THREAD_TYPE_JOB);
    const allJobs = jobThreads.map(thread => this._buildJobCard(thread, recordsById));
    const surfaceState = host?.getSurfaceState?.('jobs') || {};
    const issuerFilter = surfaceState.issuerFilter || null;
    const jobs = FactionJobBridgeService.filterJobsByIssuer(allJobs, issuerFilter);

    const baseShelves = buildLifecycleShelves(jobs, JOB_LIFECYCLE_SHELVES);
    const requestedShelfId = String(surfaceState.activeLifecycleShelf || 'current').trim() || 'current';
    const fallbackShelf = baseShelves.find(shelf => shelf.id === 'current') || baseShelves.find(shelf => shelf.hasJobs) || baseShelves[0] || null;
    const activeShelfBase = baseShelves.find(shelf => shelf.id === requestedShelfId) || fallbackShelf;
    const activeShelfId = activeShelfBase?.id || 'current';
    const shelves = baseShelves.map(shelf => ({
      ...shelf,
      isActive: shelf.id === activeShelfId,
      emptyLabel: `No ${String(shelf.label || 'jobs').toLowerCase()} jobs.`
    }));
    const activeShelf = shelves.find(shelf => shelf.id === activeShelfId) || shelves[0] || null;
    const playerShelves = buildLifecycleShelves(jobs, PLAYER_LIFECYCLE_SHELVES, { player: true });
    const visibleJobs = activeShelf?.jobs || [];
    const selectedCandidate = host?.selectedJobThreadId && jobs.some(job => job.threadId === host.selectedJobThreadId)
      ? host.selectedJobThreadId
      : null;
    const selectedId = selectedCandidate && (!visibleJobs.length || visibleJobs.some(job => job.threadId === selectedCandidate))
      ? selectedCandidate
      : this._pickDefaultJobId(visibleJobs.length ? visibleJobs : jobs);
    if (host) host.selectedJobThreadId = selectedId;

    const selectedJob = jobs.find(job => job.threadId === selectedId) ?? visibleJobs[0] ?? jobs[0] ?? null;
    const columns = JOB_COLUMNS.map(column => ({
      ...column,
      jobs: jobs.filter(job => column.statuses.includes(job.status)),
      count: jobs.filter(job => column.statuses.includes(job.status)).length
    }));

    const reviewItems = jobs.flatMap(job => job.objectives
      .filter(objective => objective.needsReview)
      .map(objective => ({ ...objective, jobTitle: job.title, threadId: job.threadId, clientLabel: job.clientLabel })));
    const payoutItems = jobs.filter(job => job.status === 'complete');
    const archiveItems = jobs.filter(job => ['paid', 'archived', 'failed'].includes(job.status));

    const assetCandidates = assetRewardCandidates();
    const filterDraft = issuerFilter
      ? (issuerFilter.contactId
        ? FactionJobBridgeService.buildDraftFromContact(issuerFilter.factionId || issuerFilter.factionName, issuerFilter.contactId || issuerFilter.contactName)
        : FactionJobBridgeService.buildDraftFromFaction(issuerFilter.factionId || issuerFilter.factionName))
      : null;
    const pendingDraft = surfaceState.pendingJobDraft || filterDraft || null;
    const knownIssuers = FactionJobBridgeService.buildKnownIssuerOptions({ jobs: allJobs });
    const savedContacts = FactionJobBridgeService.buildSavedContactOptions({ jobs: allJobs });

    return {
      pageTitle: 'GM Job Board',
      pageDescription: 'Contract command board for posted work, objective review, and reward payout',
      jobBoard: {
        jobs,
        columns,
        shelves,
        activeShelfId,
        activeShelf,
        activeShelfGroups: activeShelf?.groups || [],
        activeShelfJobs: activeShelf?.jobs || [],
        visibleJobCount: activeShelf?.count || 0,
        playerShelves,
        selectedJob,
        reviewItems,
        payoutItems,
        archiveItems,
        statusActions: STATUS_ACTIONS,
        stats: {
          total: jobs.length,
          open: jobs.filter(job => job.status === 'posted').length,
          active: jobs.filter(job => ['accepted', 'inProgress', 'review'].includes(job.status)).length,
          review: reviewItems.length,
          payout: payoutItems.length,
          archived: archiveItems.length,
          unfilteredTotal: allJobs.length,
          hiddenByFilter: Math.max(0, allJobs.length - jobs.length)
        },
        issuerFilter: issuerFilter ? {
          ...issuerFilter,
          label: issuerFilter.label || [issuerFilter.factionName, issuerFilter.contactName || issuerFilter.name].filter(Boolean).join(' - ') || 'Issuer Filter'
        } : null,
        hasIssuerFilter: Boolean(issuerFilter),
        creation: {
          recipients: jobCreationRecipients(),
          clientTypes: clientTypeOptions(),
          hasRecipients: jobCreationRecipients().length > 0,
          prefill: pendingDraft,
          openWizard: Boolean(surfaceState.openWizard && pendingDraft),
          knownIssuers,
          hasKnownIssuers: knownIssuers.length > 0,
          savedContacts,
          hasSavedContacts: savedContacts.length > 0
        },
        payoutModes: payoutModeOptions(),
        xpPayoutModes: xpPayoutModeOptions(),
        itemDistributionModes: itemDistributionModeOptions(),
        assetRewardCandidates: assetCandidates,
        hasAssetRewardCandidates: assetCandidates.length > 0,
        partyFundEnabled: isPartyFundEnabled(),
        hasJobs: allJobs.length > 0,
        hasReview: reviewItems.length > 0,
        hasPayout: payoutItems.length > 0,
        hasArchive: archiveItems.length > 0
      }
    };
  }

  static _pickDefaultJobId(jobs) {
    return jobs.find(job => job.status === 'review')?.threadId
      ?? jobs.find(job => job.status === 'complete')?.threadId
      ?? jobs.find(job => job.needsAttention)?.threadId
      ?? jobs[0]?.threadId
      ?? null;
  }

  static _buildJobCard(thread, recordsById) {
    const job = jobForThread(thread);
    const status = jobStatus(job);
    const statusDetails = statusMeta(status);
    const objectives = normalizeObjectives(job);
    const objectiveGroups = buildObjectiveGroups(objectives);
    const participants = nonGmParticipants(thread);
    const rewards = rewardSummary(job, objectives);
    const consequenceEntries = factionConsequenceEntries(job);
    const requiredObjectives = objectives.filter(objective => objective.required);
    const optionalObjectives = objectives.filter(objective => !objective.required);
    const approvedRequired = requiredObjectives.filter(objective => objective.isApproved).length;
    const approvedOptional = optionalObjectives.filter(objective => objective.isApproved).length;
    const reviewCount = objectives.filter(objective => objective.needsReview).length;
    const flatItemUuids = uniqueStrings(job?.rewardItemUuids);
    const approvedObjectiveItemUuids = objectives.filter(objective => objective.isApproved).flatMap(objective => safeArray(objective.rewardItemUuids));
    const itemUuids = rewards.itemUuids?.length ? rewards.itemUuids : uniqueStrings([...flatItemUuids, ...approvedObjectiveItemUuids]);
    const flatAssetActorIds = uniqueStrings(job?.rewardAssetActorIds).map(cleanActorId).filter(Boolean);
    const approvedObjectiveAssetActorIds = objectives.filter(objective => objective.isApproved).flatMap(objective => safeArray(objective.rewardAssetActorIds));
    const rewardAssetActorIds = rewards.assetActorIds?.length ? rewards.assetActorIds : uniqueStrings([...flatAssetActorIds, ...approvedObjectiveAssetActorIds]).map(cleanActorId).filter(Boolean);

    const assetCandidates = assetRewardCandidates();
    const attachedAssetCandidates = rewards.assetRows?.length ? rewards.assetRows : assetRewardCandidatesByIds(rewardAssetActorIds, assetCandidates);

    const transitionActions = buildTransitionActions(status);

    return {
      threadId: thread.id,
      title: job?.title || thread.title || 'Job Board Posting',
      status,
      statusLabel: statusLabel(status),
      statusTone: this._statusTone(status, reviewCount),
      statusGroupLabel: statusDetails.group || statusDetails.label,
      lifecycleShelf: lifecycleShelfId(status),
      lifecycleShelfLabel: JOB_LIFECYCLE_SHELVES.find(shelf => shelf.id === lifecycleShelfId(status))?.label || 'Current',
      playerShelf: lifecycleShelfId(status, { player: true }),
      statusOrder: statusOrder(status),
      transitionActions,
      hasTransitionActions: transitionActions.length > 0,
      clientLabel: job?.issuer?.contactName || job?.issuer?.name || job?.client?.name || job?.contactLabel || 'Job Board',
      clientTypeLabel: job?.issuer?.type || job?.client?.type || (job?.contactRecipientId ? 'Contact' : 'Client'),
      clientImage: job?.issuer?.image || job?.client?.imageUrl || job?.client?.avatar || null,
      factionName: job?.issuer?.factionName || job?.client?.factionName || job?.faction?.name || '',
      issuer: job?.issuer || null,
      issuerLabel: [job?.issuer?.contactName || job?.issuer?.name || job?.client?.name, job?.issuer?.factionName || job?.client?.factionName].filter(Boolean).join(' · '),
      issuerFactionId: job?.issuer?.factionId || '',
      issuerContactId: job?.issuer?.contactId || '',
      issuerContactActorId: job?.issuer?.contactActorId || job?.client?.actorId || '',
      issuerContactActorUuid: job?.issuer?.contactActorUuid || job?.client?.actorUuid || '',
      hasIssuerContactActor: Boolean(job?.issuer?.contactActorUuid || job?.issuer?.contactActorId || job?.client?.actorUuid || job?.client?.actorId),
      canOpenIssuerFaction: Boolean(job?.issuer?.factionId || job?.issuer?.factionName || job?.client?.factionName),
      hasIssuer: Boolean(job?.issuer || job?.client),
      hasFactionConsequences: consequenceEntries.length > 0,
      consequenceEntries,
      consequenceCount: consequenceEntries.length,
      primaryConsequence: consequenceEntries.find(entry => entry.isIssuer) || consequenceEntries[0] || null,
      rivalConsequenceCount: consequenceEntries.filter(entry => entry.isRival).length,
      appliedConsequenceCount: consequenceEntries.filter(entry => entry.wasApplied).length,
      objectives,
      objectiveGroups,
      hasObjectiveGroups: objectiveGroups.length > 0,
      requiredProgressLabel: `${approvedRequired}/${Math.max(1, requiredObjectives.length)} required`,
      optionalProgressLabel: `${approvedOptional}/${optionalObjectives.length} optional`,
      reviewCount,
      needsAttention: reviewCount > 0 || status === 'complete',
      participantCount: participants.length,
      participants,
      payoutTargets: payoutTargets(thread),
      actorPayoutTargets: payoutTargets(thread).filter(row => row.actorId),
      rewards,
      payoutSummary: rewards,
      briefingBody: String(job?.briefing?.body || '').trim(),
      briefingInstructions: String(job?.briefing?.instructions || '').trim(),
      briefingOocNote: String(job?.briefing?.oocNote || '').trim(),
      flatRewardCredits: Math.max(0, Math.floor(asNumber(job?.rewardCredits ?? 0))),
      flatRewardItems: String(job?.rewardItems || '').trim(),
      flatRewardItemUuids: flatItemUuids,
      flatRewardAssetActorIds: flatAssetActorIds,
      rewardItemUuids: itemUuids,
      hasAttachedItemRewards: itemUuids.length > 0,
      rewardItems: String(job?.rewardItems || '').trim(),
      rewardAssetActorIds,
      rewardAssetRows: attachedAssetCandidates,
      hasAttachedAssetRewards: attachedAssetCandidates.length > 0,
      hasApprovedAssetRewards: rewards.hasAssetRewards,
      assetRewardCandidates: attachedAssetCandidates.length ? attachedAssetCandidates : [],
      hasAssetRewardCandidates: attachedAssetCandidates.length > 0,
      canRestore: ['paid', 'archived', 'failed'].includes(status),
      timeline: buildTimeline(thread, job, recordsById),
      createdAt: thread.createdAt || job?.createdAt || null,
      createdAtLabel: formatMaybeDate(thread.createdAt || job?.createdAt),
      updatedAt: thread.updatedAt || null,
      updatedAtLabel: formatMaybeDate(thread.updatedAt),
      messageCount: safeArray(thread.messageIds).length,
      rawJob: job
    };
  }

  static _statusTone(status, reviewCount = 0) {
    if (reviewCount > 0 || status === 'review' || status === 'complete') return 'attention';
    if (status === 'failed') return 'danger';
    if (status === 'paid') return 'success';
    if (status === 'archived') return 'muted';
    if (status === 'inProgress') return 'active';
    if (status === 'accepted') return 'claimed';
    return 'open';
  }
}

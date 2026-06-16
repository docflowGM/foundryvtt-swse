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


const JOB_STATUS_LABELS = Object.freeze({
  draft: 'Draft',
  posted: 'Open',
  accepted: 'Claimed',
  inProgress: 'Active',
  review: 'Review',
  complete: 'Ready to Pay',
  paid: 'Paid',
  archived: 'Archived',
  failed: 'Failed'
});

const JOB_COLUMNS = Object.freeze([
  { id: 'drafts', label: 'Drafts', hint: 'Prepared but not posted', statuses: ['draft'] },
  { id: 'open', label: 'Open', hint: 'Posted and visible', statuses: ['posted'] },
  { id: 'claimed', label: 'Claimed', hint: 'Accepted or assigned', statuses: ['accepted'] },
  { id: 'active', label: 'Active', hint: 'In progress', statuses: ['inProgress'] },
  { id: 'review', label: 'Review', hint: 'Needs GM objective review', statuses: ['review'] },
  { id: 'payout', label: 'Ready to Pay', hint: 'Complete and unpaid', statuses: ['complete'] },
  { id: 'archive', label: 'Archive', hint: 'Paid, failed, or archived', statuses: ['paid', 'archived', 'failed'] }
]);

const STATUS_ACTIONS = Object.freeze([
  { value: 'posted', label: 'Open' },
  { value: 'accepted', label: 'Claimed' },
  { value: 'inProgress', label: 'Active' },
  { value: 'review', label: 'Review' },
  { value: 'complete', label: 'Ready to Pay' },
  { value: 'paid', label: 'Paid' },
  { value: 'archived', label: 'Archived' },
  { value: 'failed', label: 'Failed' }
]);

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
  return String(job?.status || 'posted');
}

function statusLabel(status) {
  return JOB_STATUS_LABELS[status] ?? String(status || 'Open');
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
  const status = String(raw?.status || 'open').trim() || 'open';
  const required = type.toLowerCase() === 'primary' ? true : Boolean(raw?.required);
  const credits = Math.max(0, Math.floor(asNumber(raw?.rewardCredits ?? raw?.credits ?? raw?.creditReward ?? 0)));
  const xp = Math.max(0, Math.floor(asNumber(raw?.rewardXp ?? raw?.xp ?? raw?.xpReward ?? 0)));
  const itemRewards = String(raw?.rewardItems ?? raw?.itemRewards ?? raw?.items ?? '').trim();
  const title = String(raw?.title || raw?.objective || raw?.name || `Objective ${index + 1}`).trim();

  return {
    id: String(raw?.id || raw?.objectiveId || `objective-${index + 1}`),
    type,
    typeLabel: objectiveTypeLabel(type),
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
    status,
    statusLabel: OBJECTIVE_STATUS_LABELS[status] ?? status,
    statusTone: ['claimed', 'submitted', 'pendingReview'].includes(status) ? 'review' : status,
    needsReview: ['claimed', 'submitted', 'pendingReview'].includes(status),
    isApproved: status === 'approved',
    isRejected: status === 'rejected',
    isFailed: status === 'failed',
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
    typeLabel: 'Primary',
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
    status: ['complete', 'paid'].includes(jobStatus(job)) ? 'approved' : 'open',
    statusLabel: ['complete', 'paid'].includes(jobStatus(job)) ? 'Approved' : 'Open',
    statusTone: ['complete', 'paid'].includes(jobStatus(job)) ? 'approved' : 'open',
    needsReview: false,
    isApproved: ['complete', 'paid'].includes(jobStatus(job)),
    isRejected: false,
    isFailed: false,
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

function itemDistributionModeOptions() {
  return [
    { value: 'single-copy', label: 'Grant all attached items to one actor' },
    { value: 'all-selected', label: 'Grant a copy of all attached items to each selected actor' },
    { value: 'round-robin-unique', label: 'Assign one unique attached item per selected actor' }
  ];
}

function rewardSummary(job, objectives) {
  const baseCredits = Math.max(0, Math.floor(asNumber(job?.rewardCredits ?? 0)));
  const approvedObjectives = objectives.filter(objective => objective.isApproved);
  const pendingObjectives = objectives.filter(objective => !objective.isApproved && !objective.isRejected && !objective.isFailed);
  const approvedCredits = approvedObjectives.reduce((sum, objective) => sum + objective.rewardCredits, 0);
  const approvedXp = approvedObjectives.reduce((sum, objective) => sum + objective.rewardXp, 0);
  const visibleItems = [String(job?.rewardItems || '').trim(), ...approvedObjectives.map(o => o.rewardItems).filter(Boolean)].filter(Boolean);
  const totalCredits = baseCredits + approvedCredits;

  return {
    baseCredits,
    baseCreditsLabel: baseCredits ? formatCredits(baseCredits) : 'No flat credit reward',
    approvedCredits,
    approvedCreditsLabel: formatCredits(totalCredits),
    approvedXp,
    approvedXpLabel: approvedXp ? `${approvedXp.toLocaleString()} XP` : 'No approved XP',
    itemSummary: visibleItems.length ? visibleItems.join(' · ') : 'No approved item rewards',
    pendingCount: pendingObjectives.length,
    approvedCount: approvedObjectives.length,
    totalCredits
  };
}


function factionConsequenceEntries(job = {}) {
  const c = job?.factionConsequences || job?.relationshipConsequences || {};
  const rows = [];
  const add = (entry = {}, role = 'Issuer') => {
    const factionName = String(entry?.factionName || '').trim();
    if (!factionName) return;
    const successDelta = asNumber(entry?.successDelta, 0);
    const failureDelta = asNumber(entry?.failureDelta, 0);
    rows.push({
      role: String(entry?.role || entry?.type || role || 'Faction'),
      factionName,
      successDelta,
      failureDelta,
      successLabel: successDelta > 0 ? `+${successDelta}` : String(successDelta),
      failureLabel: failureDelta > 0 ? `+${failureDelta}` : String(failureDelta),
      notes: String(entry?.notes || '').trim(),
      isRival: String(entry?.type || '').toLowerCase() === 'rival'
    });
  };
  add({
    type: 'issuer',
    factionName: c?.factionName || job?.issuer?.factionName || job?.client?.factionName || '',
    successDelta: c?.successDelta,
    failureDelta: c?.failureDelta,
    notes: c?.notes
  }, 'Issuer');
  for (const entry of safeArray(c?.additionalConsequences)) add(entry, entry?.type || 'Additional');
  for (const entry of safeArray(c?.rivalConsequences)) add({ type: 'rival', ...entry }, 'Rival');
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

    const selectedId = host?.selectedJobThreadId && jobs.some(job => job.threadId === host.selectedJobThreadId)
      ? host.selectedJobThreadId
      : this._pickDefaultJobId(jobs);
    if (host) host.selectedJobThreadId = selectedId;

    const selectedJob = jobs.find(job => job.threadId === selectedId) ?? jobs[0] ?? null;
    const columns = JOB_COLUMNS.map(column => ({
      ...column,
      jobs: jobs.filter(job => column.statuses.includes(job.status)),
      count: jobs.filter(job => column.statuses.includes(job.status)).length
    }));

    const reviewItems = jobs.flatMap(job => job.objectives
      .filter(objective => objective.needsReview)
      .map(objective => ({ ...objective, jobTitle: job.title, threadId: job.threadId, clientLabel: job.clientLabel })));
    const payoutItems = jobs.filter(job => job.status === 'complete');

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
        selectedJob,
        reviewItems,
        payoutItems,
        statusActions: STATUS_ACTIONS,
        stats: {
          total: jobs.length,
          open: jobs.filter(job => job.status === 'posted').length,
          active: jobs.filter(job => ['accepted', 'inProgress', 'review'].includes(job.status)).length,
          review: reviewItems.length,
          payout: payoutItems.length,
          archived: jobs.filter(job => ['paid', 'archived', 'failed'].includes(job.status)).length,
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
        hasPayout: payoutItems.length > 0
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
    const objectives = normalizeObjectives(job);
    const participants = nonGmParticipants(thread);
    const rewards = rewardSummary(job, objectives);
    const consequenceEntries = factionConsequenceEntries(job);
    const requiredObjectives = objectives.filter(objective => objective.required);
    const optionalObjectives = objectives.filter(objective => !objective.required);
    const approvedRequired = requiredObjectives.filter(objective => objective.isApproved).length;
    const approvedOptional = optionalObjectives.filter(objective => objective.isApproved).length;
    const reviewCount = objectives.filter(objective => objective.needsReview).length;
    const itemUuids = safeArray(job?.rewardItemUuids).map(String).filter(Boolean);

    const assetCandidates = assetRewardCandidates();

    return {
      threadId: thread.id,
      title: job?.title || thread.title || 'Job Board Posting',
      status,
      statusLabel: statusLabel(status),
      statusTone: this._statusTone(status, reviewCount),
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
      objectives,
      requiredProgressLabel: `${approvedRequired}/${Math.max(1, requiredObjectives.length)} required`,
      optionalProgressLabel: `${approvedOptional}/${optionalObjectives.length} optional`,
      reviewCount,
      needsAttention: reviewCount > 0 || status === 'complete',
      participantCount: participants.length,
      participants,
      payoutTargets: payoutTargets(thread),
      actorPayoutTargets: payoutTargets(thread).filter(row => row.actorId),
      rewards,
      rewardItemUuids: itemUuids,
      hasAttachedItemRewards: itemUuids.length > 0,
      rewardItems: String(job?.rewardItems || '').trim(),
      assetRewardCandidates: assetCandidates,
      hasAssetRewardCandidates: assetCandidates.length > 0,
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

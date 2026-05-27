/** GM trade console surface view-model.
 *
 * Reads Holonet Messenger transfer records and gives the GM one operational
 * place to review approvals, failed atomic settlements, receipts, and policy.
 * The console intentionally delegates actual settlement to
 * HolonetMessengerService/TransactionEngine/ActorEngine paths; it does not
 * create a parallel trade ledger.
 */

import { HolonetStorage } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js';
import { DELIVERY_STATE } from '/systems/foundryvtt-swse/scripts/holonet/contracts/enums.js';

const TRANSFER_TYPES = Object.freeze({
  credit: {
    key: 'creditTransfer',
    label: 'Credits',
    icon: 'fa-solid fa-coins',
    approveAction: 'approve-transfer',
    acceptAction: 'accept-transfer',
    declineAction: 'decline-transfer',
    cancelAction: 'cancel-transfer'
  },
  item: {
    key: 'itemTransfer',
    label: 'Items',
    icon: 'fa-solid fa-box-open',
    approveAction: 'approve-item-transfer',
    acceptAction: 'accept-item-transfer',
    acceptCounterAction: 'accept-item-counter',
    declineAction: 'decline-item-transfer',
    declineCounterAction: 'decline-item-counter',
    cancelAction: 'cancel-item-transfer'
  },
  asset: {
    key: 'assetTransfer',
    label: 'Ships / Droids',
    icon: 'fa-solid fa-shuttle-space',
    approveAction: 'approve-asset-transfer',
    approveCounterAction: 'approve-asset-counter',
    acceptAction: 'accept-asset-transfer',
    acceptCounterAction: 'accept-asset-counter',
    declineAction: 'decline-asset-transfer',
    declineCounterAction: 'decline-asset-counter',
    cancelAction: 'cancel-asset-transfer'
  }
});

const TERMINAL_STATUSES = new Set(['complete', 'declined', 'cancelled', 'failed']);
const ACTIONABLE_STATUSES = new Set(['pendingGm', 'counterPendingGm', 'failed']);
const ACTIVE_STATUSES = new Set(['pendingRecipient', 'counterOffered']);

function getSetting(key, fallback = null) {
  try {
    return game.settings?.get?.('foundryvtt-swse', key) ?? fallback;
  } catch (_err) {
    return fallback;
  }
}

function formatDate(value) {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function formatCredits(amount) {
  const value = Number(amount || 0) || 0;
  return `${value.toLocaleString()} cr`;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function compactText(value, fallback = 'None') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function statusLabel(status = '') {
  switch (status) {
    case 'complete': return 'Complete';
    case 'declined': return 'Declined';
    case 'cancelled': return 'Cancelled';
    case 'failed': return 'Failed';
    case 'pendingGm': return 'Awaiting GM Approval';
    case 'pendingRecipient': return 'Awaiting Recipient';
    case 'counterOffered': return 'Counter Offer Pending';
    case 'counterPendingGm': return 'Counter Awaiting GM Approval';
    default: return status ? String(status) : 'Pending';
  }
}

function statusTone(status = '') {
  switch (status) {
    case 'failed': return 'crit';
    case 'pendingGm':
    case 'counterPendingGm': return 'warn';
    case 'counterOffered': return 'info';
    case 'pendingRecipient': return 'stable';
    case 'complete': return 'ok';
    case 'cancelled':
    case 'declined': return 'muted';
    default: return 'stable';
  }
}

function readActorName(actorId, fallback = '') {
  if (!actorId) return fallback || 'No actor';
  return game.actors?.get?.(actorId)?.name ?? fallback ?? actorId;
}

function getThreadTitle(thread) {
  return thread?.title || thread?.name || thread?.metadata?.title || 'Holonet Thread';
}

function eventTypeLabel(eventType = '') {
  if (!eventType) return 'Trade event';
  return String(eventType)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

export class GMTradeConsoleSurfaceService {
  static async buildViewModel(host) {
    const tradeConsole = await this.buildTradeConsoleVm(host);
    return {
      pageTitle: 'GM Trade Console',
      pageDescription: 'Approval queue, failed settlement diagnostics, and Messenger trade policy controls.',
      tradeConsole
    };
  }

  static async buildTradeConsoleVm(host) {
    const [records, threads] = await Promise.all([
      HolonetStorage.getAllRecords(),
      HolonetStorage.getAllThreads()
    ]);
    const threadMap = new Map(threads.map(thread => [thread.id, thread]));
    const entries = this._buildTransferEntries(records, threadMap)
      .sort((a, b) => (b.sortTime ?? 0) - (a.sortTime ?? 0));

    const visibleEntries = entries.filter(entry => !entry.gmArchived);
    const selectedId = host?.selectedTradeRecordId && entries.some(entry => entry.recordId === host.selectedTradeRecordId)
      ? host.selectedTradeRecordId
      : (visibleEntries[0]?.recordId ?? entries[0]?.recordId ?? null);
    const selectedEntry = entries.find(entry => entry.recordId === selectedId) ?? null;

    const approvalQueue = visibleEntries.filter(entry => ['pendingGm', 'counterPendingGm'].includes(entry.status));
    const failedQueue = visibleEntries.filter(entry => entry.status === 'failed');
    const activeQueue = visibleEntries.filter(entry => ACTIVE_STATUSES.has(entry.status));
    const recentCompleted = visibleEntries.filter(entry => TERMINAL_STATUSES.has(entry.status) && entry.status !== 'failed').slice(0, 10);
    const auditEvents = this._buildAuditEvents(records, entries).slice(0, 30);

    return {
      stats: this._buildStats(entries),
      hasTrades: entries.length > 0,
      selectedEntry,
      selectedTimeline: selectedEntry ? this._buildTimeline(records, selectedEntry) : [],
      approvalQueue,
      failedQueue,
      activeQueue,
      recentCompleted,
      auditEvents,
      policy: this._buildPolicyVm(),
      queues: [
        { id: 'approvals', label: 'Approvals', hint: 'Transfers waiting for GM approval.', entries: approvalQueue, tone: approvalQueue.length ? 'warn' : 'stable' },
        { id: 'failed', label: 'Failed', hint: 'Atomic failures, rollback diagnostics, and blocked trades.', entries: failedQueue, tone: failedQueue.length ? 'crit' : 'stable' },
        { id: 'active', label: 'Active', hint: 'Pending recipient acceptance or counter-offers.', entries: activeQueue, tone: activeQueue.length ? 'info' : 'stable' },
        { id: 'recent', label: 'Recent Closed', hint: 'Recent completed, declined, or cancelled transfers.', entries: recentCompleted, tone: 'stable' }
      ]
    };
  }

  static _buildTransferEntries(records = [], threadMap = new Map()) {
    const entries = [];
    for (const record of safeArray(records)) {
      if (record?.state === DELIVERY_STATE.ARCHIVED) continue;
      for (const [type, config] of Object.entries(TRANSFER_TYPES)) {
        const transfer = record?.metadata?.[config.key];
        if (!transfer) continue;
        const threadId = record.threadId || record.metadata?.threadId || transfer.threadId || record.projections?.find?.(p => p?.metadata?.threadId)?.metadata?.threadId || null;
        const thread = threadMap.get(threadId) ?? null;
        entries.push(this._entryFromTransfer({ record, thread, threadId, type, config, transfer }));
      }
    }
    return entries;
  }

  static _entryFromTransfer({ record, thread, threadId, type, config, transfer }) {
    const status = String(transfer.status || 'pendingRecipient');
    const counter = transfer.counterOffer ?? null;
    const itemCount = safeArray(transfer.items).reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0) || safeArray(transfer.attachments).length || safeArray(transfer.itemUuids).length;
    const assetCount = safeArray(transfer.assets).length;
    const counterItemCount = safeArray(counter?.items).reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0);
    const counterAssetCount = safeArray(counter?.assets).length;
    const requestedCredits = Number(transfer.trade?.requestedCredits || 0) || 0;
    const counterCredits = Number(counter?.credits || 0) || 0;
    const amount = Number(transfer.amount || transfer.totalAmount || 0) || requestedCredits || counterCredits || 0;
    const createdAt = transfer.createdAt || record.createdAt || record.updatedAt || null;
    const resolvedAt = transfer.resolvedAt || transfer.counterSettledAt || null;
    const diagnostic = this._buildDiagnostic(record, transfer);
    const title = this._buildTradeTitle({ type, transfer, itemCount, assetCount, amount });
    const actionModel = this._buildActions({ type, status, config, transfer });

    return {
      recordId: record.id,
      threadId,
      threadTitle: getThreadTitle(thread),
      messageBody: record.body ?? '',
      messagePreview: compactText(record.body, 'No message body').slice(0, 180),
      type,
      typeLabel: config.label,
      icon: config.icon,
      transferId: transfer.id ?? record.id,
      kind: transfer.kind ?? type,
      title,
      fromLabel: transfer.fromLabel || readActorName(transfer.fromActorId, 'Unknown sender'),
      toLabel: transfer.toLabel || readActorName(transfer.toActorId, 'Unknown recipient'),
      fromActorId: transfer.fromActorId ?? null,
      toActorId: transfer.toActorId ?? null,
      fromActorName: readActorName(transfer.fromActorId, transfer.fromLabel),
      toActorName: readActorName(transfer.toActorId, transfer.toLabel),
      status,
      statusLabel: statusLabel(status),
      statusTone: statusTone(status),
      needsGm: ACTIONABLE_STATUSES.has(status),
      isTerminal: TERMINAL_STATUSES.has(status),
      approvalRequired: Boolean(transfer.approvalRequired),
      gmArchived: Boolean(transfer.gmArchived || transfer.tradeConsoleArchived),
      amount,
      amountLabel: amount ? formatCredits(amount) : 'No credits',
      requestedCredits,
      requestedCreditsLabel: requestedCredits ? formatCredits(requestedCredits) : 'No requested credits',
      itemCount,
      itemSummary: this._summarizeItems(transfer),
      assetCount,
      assetSummary: this._summarizeAssets(transfer),
      hasCounterOffer: Boolean(counter),
      counterCredits,
      counterCreditsLabel: counterCredits ? formatCredits(counterCredits) : 'No counter credits',
      counterItemCount,
      counterAssetCount,
      counterSummary: this._summarizeCounter(counter),
      memo: compactText(transfer.memo, ''),
      failureReason: compactText(transfer.failureReason, ''),
      diagnostic,
      atomicEvents: diagnostic.atomicEvents,
      hasAtomicEvents: diagnostic.atomicEvents.length > 0,
      createdAt,
      createdAtLabel: formatDate(createdAt),
      resolvedAt,
      resolvedAtLabel: resolvedAt ? formatDate(resolvedAt) : 'Not resolved',
      sortTime: Date.parse(resolvedAt || createdAt || record.updatedAt || record.createdAt || '') || 0,
      actionModel
    };
  }

  static _buildTradeTitle({ type, transfer, itemCount, assetCount, amount }) {
    if (type === 'credit') return `${formatCredits(amount)} credit transfer`;
    if (type === 'asset') {
      const names = safeArray(transfer.assets).map(asset => asset?.name).filter(Boolean);
      return names.length ? names.join(', ') : `${assetCount || 1} asset transfer`;
    }
    const names = safeArray(transfer.items).map(item => `${item?.name ?? 'Item'} x${Number(item?.quantity || 1)}`).filter(Boolean);
    if (names.length) return names.join(', ');
    const attachments = safeArray(transfer.attachments).map(item => item?.name).filter(Boolean);
    return attachments.length ? attachments.join(', ') : `${itemCount || 1} item transfer`;
  }

  static _summarizeItems(transfer = {}) {
    const items = safeArray(transfer.items).map(item => `${item?.name ?? 'Item'} x${Number(item?.quantity || 1)}`);
    const attachments = safeArray(transfer.attachments).map(item => item?.name ?? item?.uuid).filter(Boolean);
    const uuids = safeArray(transfer.itemUuids).filter(Boolean);
    const lines = items.length ? items : attachments.length ? attachments : uuids;
    return lines.length ? lines.join(', ') : 'No items';
  }

  static _summarizeAssets(transfer = {}) {
    const assets = safeArray(transfer.assets).map(asset => asset?.name || asset?.uuid || asset?.id).filter(Boolean);
    return assets.length ? assets.join(', ') : 'No assets';
  }

  static _summarizeCounter(counter = null) {
    if (!counter) return 'No counter-offer';
    const parts = [];
    const credits = Number(counter.credits || 0) || 0;
    if (credits) parts.push(formatCredits(credits));
    const items = safeArray(counter.items).map(item => `${item?.name ?? 'Item'} x${Number(item?.quantity || 1)}`);
    if (items.length) parts.push(items.join(', '));
    const assets = safeArray(counter.assets).map(asset => asset?.name || asset?.uuid || asset?.id).filter(Boolean);
    if (assets.length) parts.push(assets.join(', '));
    if (counter.memo) parts.push(`Memo: ${counter.memo}`);
    return parts.length ? parts.join(' + ') : 'Counter terms present';
  }

  static _buildDiagnostic(record, transfer = {}) {
    const failure = compactText(transfer.failureReason, '');
    const atomicEvents = [...safeArray(transfer.atomicEvents), ...safeArray(record?.metadata?.atomicEvents)]
      .filter(Boolean)
      .slice(-20)
      .reverse()
      .map(event => ({
        id: event.id || `${event.phase || 'atomic'}-${event.at || ''}`,
        phase: event.phase || 'atomic.event',
        status: event.status || 'info',
        message: compactText(event.message, event.phase || 'Atomic event'),
        error: compactText(event.error, ''),
        timeLabel: formatDate(event.at),
        tone: event.status === 'failed' ? 'crit' : event.status === 'complete' || event.status === 'passed' || event.rollbackOk === true ? 'ok' : event.status === 'started' ? 'info' : 'stable'
      }));
    const rollbackOk = transfer.rollbackOk ?? record?.metadata?.rollbackOk ?? null;
    const preflight = transfer.preflight ?? record?.metadata?.preflight ?? null;
    return {
      hasFailure: Boolean(failure || atomicEvents.length || rollbackOk === false),
      failureReason: failure,
      rollbackOk,
      rollbackLabel: rollbackOk === true ? 'Rollback confirmed' : rollbackOk === false ? 'Rollback failed / manual reconciliation needed' : 'No rollback flag',
      rollbackTone: rollbackOk === false ? 'crit' : rollbackOk === true ? 'ok' : 'muted',
      preflightLabel: preflight === true ? 'Preflight failure; no mutation attempted' : 'Settlement path reached or not logged',
      recordEventType: record?.metadata?.eventType ?? '',
      atomicEventCount: atomicEvents.length,
      atomicEvents
    };
  }

  static _buildActions({ type, status, config, transfer }) {
    const actions = [];
    if (status === 'pendingGm') {
      actions.push({ id: 'approve', label: 'Approve', action: config.approveAction, tone: 'primary' });
      actions.push({ id: 'decline', label: 'Decline', action: config.declineAction, tone: 'warn' });
    } else if (status === 'counterPendingGm' && config.approveCounterAction) {
      actions.push({ id: 'approve-counter', label: 'Approve Counter', action: config.approveCounterAction, tone: 'primary' });
      actions.push({ id: 'decline-counter', label: 'Decline Counter', action: config.declineCounterAction, tone: 'warn' });
    } else if (status === 'counterOffered' && config.acceptCounterAction) {
      actions.push({ id: 'accept-counter', label: 'Accept Counter', action: config.acceptCounterAction, tone: 'primary' });
      actions.push({ id: 'decline-counter', label: 'Decline Counter', action: config.declineCounterAction, tone: 'warn' });
    } else if (status === 'pendingRecipient') {
      actions.push({ id: 'accept', label: type === 'credit' ? 'Settle Now' : 'Accept / Settle', action: config.acceptAction, tone: 'primary' });
      actions.push({ id: 'decline', label: 'Decline', action: config.declineAction, tone: 'warn' });
    }

    if (!TERMINAL_STATUSES.has(status)) {
      actions.push({ id: 'cancel', label: 'Cancel', action: config.cancelAction, tone: 'muted' });
      actions.push({ id: 'force-fail', label: 'Mark Failed', action: 'gm-fail-trade', tone: 'crit' });
    }
    if (status === 'failed') {
      actions.push({ id: 'reopen', label: 'Reopen Pending', action: 'gm-reopen-trade', tone: 'warn' });
    }
    if (transfer?.gmArchived || transfer?.tradeConsoleArchived) {
      actions.push({ id: 'unarchive', label: 'Show in Console', action: 'gm-unarchive-trade', tone: 'stable' });
    } else if (TERMINAL_STATUSES.has(status)) {
      actions.push({ id: 'archive', label: 'Archive Diagnostic', action: 'gm-archive-trade', tone: 'muted' });
    }
    return actions;
  }

  static _buildTimeline(records = [], selectedEntry = null) {
    if (!selectedEntry) return [];
    return safeArray(records)
      .filter(record => {
        const meta = record?.metadata ?? {};
        if (record.id === selectedEntry.recordId) return true;
        if (meta.transferId && meta.transferId === selectedEntry.transferId) return true;
        if (record.threadId && record.threadId === selectedEntry.threadId && String(meta.eventType || '').includes('transfer')) return true;
        return false;
      })
      .map(record => ({
        id: record.id,
        label: eventTypeLabel(record.metadata?.eventType),
        detail: compactText(record.body, 'No detail'),
        timeLabel: formatDate(record.createdAt || record.updatedAt),
        tone: String(record.metadata?.eventType || '').includes('failed') ? 'crit' : String(record.metadata?.eventType || '').includes('complete') ? 'ok' : 'stable',
        sortTime: Date.parse(record.createdAt || record.updatedAt || '') || 0
      }))
      .sort((a, b) => b.sortTime - a.sortTime)
      .slice(0, 12);
  }

  static _buildAuditEvents(records = [], entries = []) {
    const transferIds = new Set(entries.map(entry => entry.transferId).filter(Boolean));
    return safeArray(records)
      .filter(record => {
        const eventType = String(record?.metadata?.eventType || '');
        return eventType.includes('transfer') || eventType.includes('trade') || eventType.includes('counter') || transferIds.has(record?.metadata?.transferId);
      })
      .map(record => ({
        id: record.id,
        label: eventTypeLabel(record.metadata?.eventType),
        detail: compactText(record.body, 'No event detail').slice(0, 220),
        timeLabel: formatDate(record.createdAt || record.updatedAt),
        tone: String(record.metadata?.eventType || '').includes('failed') ? 'crit' : String(record.metadata?.eventType || '').includes('complete') ? 'ok' : 'stable',
        sortTime: Date.parse(record.createdAt || record.updatedAt || '') || 0
      }))
      .sort((a, b) => b.sortTime - a.sortTime);
  }

  static _buildStats(entries = []) {
    const active = entries.filter(entry => ACTIVE_STATUSES.has(entry.status)).length;
    const approvals = entries.filter(entry => ['pendingGm', 'counterPendingGm'].includes(entry.status)).length;
    const failed = entries.filter(entry => entry.status === 'failed').length;
    const terminal = entries.filter(entry => TERMINAL_STATUSES.has(entry.status)).length;
    const archived = entries.filter(entry => entry.gmArchived).length;
    const counter = entries.filter(entry => entry.hasCounterOffer).length;
    return {
      total: entries.length,
      active,
      approvals,
      failed,
      terminal,
      archived,
      counter,
      visible: entries.length - archived,
      actionable: approvals + failed
    };
  }

  static _buildPolicyVm() {
    return {
      creditTransfersEnabled: Boolean(getSetting('holonetCreditTransfersEnabled', true)),
      requireCreditApproval: Boolean(getSetting('holonetRequireCreditTransferApproval', false)),
      itemTradesEnabled: Boolean(getSetting('holonetItemTradesEnabled', true)),
      requireItemApproval: Boolean(getSetting('holonetRequireItemTradeApproval', false)),
      assetTradesEnabled: Boolean(getSetting('holonetAssetTradesEnabled', true)),
      requireAssetApproval: Boolean(getSetting('holonetRequireAssetTradeApproval', true)),
      partyFundEnabled: Boolean(getSetting('holonetPartyFundEnabled', false)),
      partyFundCutPercent: Number(getSetting('holonetPartyFundDefaultCutPercent', 0)) || 0
    };
  }
}

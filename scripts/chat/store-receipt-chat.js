/**
 * Store Receipt Chat Cards
 *
 * Posts the v2 treasury receipt card for canonical store/credit hooks.
 * This is a chat projection only. Credit/item mutations remain owned by the
 * store transaction engines, GM dashboard, Holonet services, and ActorEngine.
 */

import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";

let registered = false;
const postedKeys = new Set();

function userCanPostReceipts() {
  // Existing Holonet chat projections are GM-authored to avoid duplicate chat
  // cards across clients. Keep treasury projections on the same authority.
  return game.user?.isGM === true;
}

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function actorCredits(actor) {
  return asNumber(actor?.system?.credits, 0);
}

function ownerWhisper(actor) {
  if (typeof SWSEChat.actorOwnerWhisper === 'function') return SWSEChat.actorOwnerWhisper(actor);
  const ids = new Set();
  if (actor?.ownership) {
    for (const [userId, level] of Object.entries(actor.ownership)) {
      if (userId !== 'default' && Number(level) >= 3) ids.add(userId);
    }
  }
  game.users?.forEach?.(user => {
    if (user?.character?.id === actor?.id) ids.add(user.id);
  });
  return [...ids].filter(Boolean);
}

function itemNameFromTransaction(transaction = {}) {
  return transaction.itemName
    || transaction.metadata?.itemName
    || transaction.metadata?.name
    || 'Store item';
}

function safeKey(kind, transactionId, actorId) {
  return [kind, transactionId || '', actorId || ''].join(':');
}

async function postReceiptOnce(kind, transactionId, actor, receipt) {
  if (!userCanPostReceipts()) return;
  if (!actor) return;
  const key = safeKey(kind, transactionId, actor.id);
  if (postedKeys.has(key)) return;
  postedKeys.add(key);
  try {
    await SWSEChat.postStoreReceipt({
      actor,
      receipt: { ...receipt, actor, transactionId },
      whisper: ownerWhisper(actor),
      flags: { swse: { storeReceiptProjection: true, receiptKind: kind } }
    });
  } catch (err) {
    postedKeys.delete(key);
    console.warn('[SWSE Chat] Failed to post store receipt:', err);
  }
}

async function handleStoreTransactionComplete(payload = {}) {
  const transaction = payload.transaction || {};
  if (payload.success === false || transaction.success === false) return;
  const transactionId = transaction.id || transaction.transactionId || transaction.metadata?.transactionId || `store_${transaction.timestamp || Date.now()}`;
  const price = asNumber(transaction.price, asNumber(transaction.total, 0));
  if (price <= 0) return;

  const buyer = payload.buyer || game.actors?.get?.(transaction.buyerId) || null;
  if (buyer) {
    const after = actorCredits(buyer);
    await postReceiptOnce('store-purchase-buyer', transactionId, buyer, {
      sourceType: 'purchase',
      vendorLabel: transaction.sellerName || payload.seller?.name || 'Store Purchase',
      title: `Purchase — ${itemNameFromTransaction(transaction)}`,
      itemSummary: itemNameFromTransaction(transaction),
      previousBalance: after + price,
      newBalance: after,
      delta: -price,
      deltaLabel: 'spent',
      actorName: buyer.name,
      actions: [{ action: 'open-store', label: 'Open Store' }]
    });
  }

  const seller = payload.seller || game.actors?.get?.(transaction.sellerId) || null;
  if (seller && seller.id !== buyer?.id && seller.hasPlayerOwner) {
    const after = actorCredits(seller);
    await postReceiptOnce('store-purchase-seller', transactionId, seller, {
      sourceType: 'refund',
      vendorLabel: transaction.buyerName || buyer?.name || 'Store Sale',
      title: `Sale — ${itemNameFromTransaction(transaction)}`,
      itemSummary: itemNameFromTransaction(transaction),
      previousBalance: Math.max(0, after - price),
      newBalance: after,
      delta: price,
      deltaLabel: 'received',
      actorName: seller.name,
      actions: [{ action: 'open-store', label: 'Open Store' }]
    });
  }
}

async function handleStoreSaleComplete(payload = {}) {
  const transaction = payload.transaction || {};
  if (payload.success === false || transaction.success === false) return;

  const actor = payload.actor || game.actors?.get?.(transaction.actorId) || null;
  if (!actor) return;

  const amount = asNumber(transaction.amount, asNumber(payload.salePrice, 0));
  if (amount <= 0) return;

  const after = actorCredits(actor);
  const transactionId = transaction.id || transaction.transactionId || `sale_${transaction.timestamp || Date.now()}`;
  const itemName = itemNameFromTransaction(transaction);

  await postReceiptOnce('store-sale', transactionId, actor, {
    sourceType: 'sale',
    vendorLabel: 'Store Sale',
    title: `Sale approved — ${itemName}`,
    itemSummary: transaction.reason ? `GM note: ${transaction.reason}` : itemName,
    previousBalance: Math.max(0, after - amount),
    newBalance: after,
    delta: amount,
    deltaLabel: 'received',
    actorName: actor.name,
    actions: [{ action: 'open-store', label: 'Open Store' }]
  });
}

async function handleStoreSaleDenied(payload = {}) {
  const request = payload.request || {};
  const actor = payload.actor || game.actors?.get?.(request.actorId) || null;
  if (!actor) return;

  const balance = actorCredits(actor);
  const transactionId = request.id || `sale_denial_${request.timestamp || Date.now()}`;
  const reason = payload.reason || request.reason || 'No credits changed.';

  await postReceiptOnce('store-sale-denied', transactionId, actor, {
    sourceType: 'denial',
    vendorLabel: 'Store Sale',
    title: `Sale denied — ${request.item || 'Item'}`,
    itemSummary: reason,
    previousBalance: balance,
    newBalance: balance,
    delta: 0,
    deltaLabel: 'no change',
    actorName: actor.name,
    decidedBy: payload.decidedBy || 'GM',
    actions: [{ action: 'open-store', label: 'Open Store' }]
  });
}

async function handleCreditTransferComplete(payload = {}) {
  const transaction = payload.transaction || {};
  if (payload.success === false || transaction.success === false) return;
  const transactionId = transaction.id || transaction.transactionId || transaction.metadata?.transactionId || `transfer_${transaction.timestamp || Date.now()}`;
  const amount = asNumber(transaction.amount, 0);
  if (amount <= 0) return;

  const fromActor = payload.fromActor || game.actors?.get?.(transaction.fromId) || null;
  const toActor = payload.toActor || game.actors?.get?.(transaction.toId) || null;
  const reason = transaction.metadata?.reason || transaction.metadata?.note || transaction.metadata?.threadId || '';

  if (fromActor) {
    const after = actorCredits(fromActor);
    await postReceiptOnce('credit-transfer-sent', transactionId, fromActor, {
      sourceType: 'credit-transfer',
      vendorLabel: 'Party Ledger',
      title: `Credits sent: ${fromActor.name} → ${toActor?.name || transaction.toName || 'Recipient'}`,
      itemSummary: reason ? `Reason: ${reason}` : '',
      previousBalance: after + amount,
      newBalance: after,
      delta: -amount,
      deltaLabel: 'sent',
      actorName: fromActor.name,
      fromName: fromActor.name,
      toName: toActor?.name || transaction.toName || '',
      actions: [{ action: 'open-holonet', label: 'Open Holochat' }]
    });
  }

  if (toActor) {
    const after = actorCredits(toActor);
    await postReceiptOnce('credit-transfer-received', transactionId, toActor, {
      sourceType: 'credit-transfer',
      vendorLabel: 'Party Ledger',
      title: `Credits received: ${fromActor?.name || transaction.fromName || 'Sender'} → ${toActor.name}`,
      itemSummary: reason ? `Reason: ${reason}` : '',
      previousBalance: Math.max(0, after - amount),
      newBalance: after,
      delta: amount,
      deltaLabel: 'received',
      actorName: toActor.name,
      fromName: fromActor?.name || transaction.fromName || '',
      toName: toActor.name,
      actions: [{ action: 'open-holonet', label: 'Open Holochat' }]
    });
  }
}

async function handleCreditGrantComplete(payload = {}) {
  const transaction = payload.transaction || {};
  if (payload.success === false || transaction.success === false) return;
  const toActor = payload.toActor || game.actors?.get?.(transaction.toId) || null;
  if (!toActor) return;
  const amount = asNumber(transaction.amount, 0);
  if (amount <= 0) return;
  const after = actorCredits(toActor);
  const transactionId = transaction.id || transaction.transactionId || transaction.metadata?.transactionId || `grant_${transaction.timestamp || Date.now()}`;
  const source = transaction.metadata?.source || 'Quest Reward';
  const reason = transaction.metadata?.reason || transaction.metadata?.note || transaction.metadata?.threadId || '';

  await postReceiptOnce('credit-grant', transactionId, toActor, {
    sourceType: source === 'party-fund-payout' ? 'party-fund' : 'credit-grant',
    vendorLabel: source === 'party-fund-payout' ? 'Party Fund' : 'Quest Reward',
    title: source === 'party-fund-payout' ? 'Party fund payout received' : 'Credits received',
    itemSummary: reason ? `Reward for: ${reason}` : '',
    previousBalance: Math.max(0, after - amount),
    newBalance: after,
    delta: amount,
    deltaLabel: 'received',
    actorName: toActor.name
  });
}


function receiptProjectionForCreditContext(context = '', amount = 0, transaction = {}) {
  const key = String(context || '').toLowerCase();
  const audit = transaction.audit || transaction.metadata || {};
  if (key === 'game-credit-escrow') {
    return {
      kind: 'game-credit-escrow',
      sourceType: 'purchase',
      vendorLabel: 'Holopad Games',
      title: amount < 0 ? 'Game buy-in escrowed' : 'Game escrow adjusted',
      deltaLabel: amount < 0 ? 'escrowed' : 'credited',
      action: { action: 'open-games', label: 'Open Games' },
      itemSummary: audit.sessionTitle || audit.gameId || 'Game wager escrow'
    };
  }
  if (key === 'game-credit-payout') {
    return {
      kind: 'game-credit-payout',
      sourceType: 'credit-grant',
      vendorLabel: 'Holopad Games',
      title: 'Game payout received',
      deltaLabel: 'received',
      action: { action: 'open-games', label: 'Open Games' },
      itemSummary: audit.sessionTitle || audit.gameId || 'Game payout'
    };
  }
  if (key === 'game-credit-refund') {
    return {
      kind: 'game-credit-refund',
      sourceType: amount >= 0 ? 'refund' : 'credit-adjustment',
      vendorLabel: 'Holopad Games',
      title: amount >= 0 ? 'Game credits refunded' : 'Game payout rollback applied',
      deltaLabel: amount >= 0 ? 'refunded' : 'deducted',
      action: { action: 'open-games', label: 'Open Games' },
      itemSummary: audit.refundReason || audit.rollbackReason || audit.sessionTitle || 'Game credit refund'
    };
  }
  if (key === 'holonet-job-payout') {
    return {
      kind: 'job-credit-payout',
      sourceType: 'credit-grant',
      vendorLabel: 'Job Board',
      title: 'Job reward received',
      deltaLabel: 'received',
      action: { action: 'open-holonet', label: 'Open Holonet' },
      itemSummary: audit.reason || audit.threadId || 'Job Board payout'
    };
  }
  if (key === 'holonet-gm-grant' || key === 'holonet-party-fund-payout') {
    return {
      kind: 'gm-credit-grant',
      sourceType: key === 'holonet-party-fund-payout' ? 'party-fund' : 'credit-grant',
      vendorLabel: key === 'holonet-party-fund-payout' ? 'Party Fund' : 'GM Ledger',
      title: key === 'holonet-party-fund-payout' ? 'Party fund payout received' : 'GM credit grant received',
      deltaLabel: 'received',
      action: { action: 'open-holonet', label: 'Open Holonet' },
      itemSummary: audit.reason || audit.threadId || 'GM credit grant'
    };
  }
  if (key.includes('rollback') || key.includes('correction') || key.includes('adjustment')) {
    return {
      kind: 'credit-adjustment',
      sourceType: 'credit-adjustment',
      vendorLabel: 'GM Store Control',
      title: amount > 0 ? 'Credit correction received' : 'Credit correction applied',
      deltaLabel: amount > 0 ? 'credited' : 'deducted',
      action: { action: 'open-store', label: 'Open Store' },
      itemSummary: transaction.reason || transaction.audit?.reason || 'GM credit correction'
    };
  }
  return null;
}

async function handleCreditAdjustmentComplete(payload = {}) {
  const transaction = payload.transaction || {};
  if (payload.success === false || transaction.success === false) return;

  const context = String(transaction.context || transaction.metadata?.context || '');
  const actor = payload.actor || game.actors?.get?.(transaction.actorId) || null;
  if (!actor) return;

  const amount = asNumber(transaction.amount, 0);
  if (amount === 0) return;

  const projection = receiptProjectionForCreditContext(context, amount, transaction);
  if (!projection) return;

  const after = actorCredits(actor);
  const transactionId = transaction.id || transaction.transactionId || `${projection.kind}_${transaction.timestamp || Date.now()}`;
  const reason = transaction.reason || transaction.audit?.reason || projection.itemSummary;

  await postReceiptOnce(projection.kind, transactionId, actor, {
    sourceType: projection.sourceType,
    vendorLabel: projection.vendorLabel,
    title: projection.title,
    itemSummary: reason || projection.itemSummary,
    previousBalance: after - amount,
    newBalance: after,
    delta: amount,
    deltaLabel: projection.deltaLabel,
    actorName: actor.name,
    actions: [projection.action]
  });
}

async function handleCustomPurchaseApproved(payload = {}) {
  const approval = payload.approval || {};
  if (approval.type === 'store-item' || approval.approvalKind === 'store-policy-item') return;
  const actor = payload.actor || game.actors?.get?.(approval.ownerActorId) || null;
  if (!actor) return;
  const cost = asNumber(approval.costCredits, asNumber(approval.total, 0));
  const after = actorCredits(actor);
  const name = approval.draftData?.name || approval.name || 'Custom order';
  const transactionId = approval.id || approval.approvalId || `approval_${approval.createdAt || Date.now()}`;

  await postReceiptOnce('custom-purchase-approved', transactionId, actor, {
    sourceType: 'approval',
    vendorLabel: 'GM Approval Dashboard',
    title: `${name} approved`,
    itemSummary: `${approval.type || 'custom'} commission`,
    previousBalance: after + cost,
    newBalance: after,
    delta: -cost,
    deltaLabel: 'cost',
    actorName: actor.name,
    decidedBy: payload.decidedBy || 'GM',
    actions: [{ action: 'open-store', label: 'Open Store' }]
  });
}

async function handleCustomPurchaseDenied(payload = {}) {
  const approval = payload.approval || {};
  const actor = payload.actor || game.actors?.get?.(approval.ownerActorId) || null;
  if (!actor) return;
  const balance = actorCredits(actor);
  const name = approval.draftData?.name || approval.name || 'Custom order';
  const transactionId = approval.id || approval.approvalId || `denial_${approval.createdAt || Date.now()}`;

  await postReceiptOnce('custom-purchase-denied', transactionId, actor, {
    sourceType: 'denial',
    vendorLabel: 'GM Approval Dashboard',
    title: `${name} denied`,
    itemSummary: approval.denialReason || approval.reason || 'No credits changed.',
    previousBalance: balance,
    newBalance: balance,
    delta: 0,
    deltaLabel: 'no change',
    actorName: actor.name,
    decidedBy: payload.decidedBy || 'GM',
    actions: [{ action: 'open-store', label: 'Open Store' }]
  });
}

export function registerStoreReceiptChatCards() {
  if (registered) return false;
  registered = true;

  Hooks.on('swseStoreTransactionComplete', payload => { void handleStoreTransactionComplete(payload); });
  Hooks.on('swseStoreSaleComplete', payload => { void handleStoreSaleComplete(payload); });
  Hooks.on('swseStoreSaleDenied', payload => { void handleStoreSaleDenied(payload); });
  Hooks.on('swseCreditTransferComplete', payload => { void handleCreditTransferComplete(payload); });
  Hooks.on('swseCreditGrantComplete', payload => { void handleCreditGrantComplete(payload); });
  Hooks.on('swseCreditAdjustmentComplete', payload => { void handleCreditAdjustmentComplete(payload); });
  Hooks.on('swseCustomPurchaseApproved', payload => { void handleCustomPurchaseApproved(payload); });
  Hooks.on('swseCustomPurchaseDenied', payload => { void handleCustomPurchaseDenied(payload); });

  return true;
}

export default registerStoreReceiptChatCards;

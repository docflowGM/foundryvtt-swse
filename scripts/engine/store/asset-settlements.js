/**
 * Asset-bearing settlements (3N-TE.4, extracted verbatim from TransactionEngine): customization checkout, custom-asset approval, owned-item sale,
 * asset sale and sale reconciliation, with the sale helpers they share.
 *
 * TransactionEngine keeps every public method as a thin delegate and remains the single economic-settlement coordinator; the engine is passed as
 * `engine` for its in-flight lock/reconciliation sets and decision-lock helpers. Persistence, verification and compensation are unchanged.
 */
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { establishRecovery, restoreVerified } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-recovery.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { mergeMutationPlans } from "/systems/foundryvtt-swse/scripts/governance/mutation/merge-mutations.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { emitCommitted, normalizeTransactionRecord, assetApprovalLockKey } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-helpers.js";
import { StoreAcquisitionService } from "/systems/foundryvtt-swse/scripts/engine/store/acquisition-service.js";
import { sameOwnership } from "/systems/foundryvtt-swse/scripts/engine/store/resale-authority.js";
import { parseTransactionCost } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-helpers.js";

const RESALE_AUTHORITY_GM_APPRAISAL = 'gm-appraisal';

export async function executeAssetCustomizationTransactionImpl(engine, context = {}, options = {}) {
    const {
      actor,
      assetActor,
      assetMutationPlan = {},
      cost = 0,
      resaleCredit = 0,
      reason = '',
      transactionContext = 'owned-customization',
      audit = {},
      // Optional domain postcondition: (assetActor, walletActor) => {ok, reason}|Promise. A failed or throwing
      // verdict rolls both actors back through the same verified restore as any mechanical failure.
      verifyAsset = null
    } = context;

    const {
      validate = true,
      rederive = true,
      source = 'TransactionEngine.executeAssetCustomizationTransaction'
    } = options;

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    if (!engine._allowedMutationContexts.has(transactionContext)) {
      return { success: false, transactionId, error: `Unsupported transaction context: ${transactionContext}` };
    }
    if (!actor) return { success: false, transactionId, error: 'No wallet actor provided' };
    if (!assetActor) return { success: false, transactionId, error: 'No asset actor provided' };

    const walletActor = game?.actors?.get?.(actor.id) || actor;
    const targetAsset = game?.actors?.get?.(assetActor.id) || assetActor;
    if (!walletActor) return { success: false, transactionId, error: 'Wallet actor no longer exists' };
    if (!targetAsset) return { success: false, transactionId, error: 'Asset actor no longer exists' };
    if (walletActor.isOwner === false) return { success: false, transactionId, error: 'Insufficient wallet actor permissions' };
    if (targetAsset.isOwner === false) return { success: false, transactionId, error: 'Insufficient asset actor permissions' };

    // H7: malformed amounts are refused, not floored to 0
    const strictCredits = (v) => { const n = parseTransactionCost(v); return Number.isFinite(n) ? normalizeCredits(n) : NaN; };
    const grossCost = strictCredits(cost);
    const grossResale = strictCredits(resaleCredit);
    if (!Number.isFinite(grossCost) || grossCost < 0) {
      return { success: false, transactionId, error: 'Invalid customization cost' };
    }
    if (!Number.isFinite(grossResale) || grossResale < 0) {
      return { success: false, transactionId, error: 'Invalid customization resale credit' };
    }

    const netCost = normalizeCredits(grossCost - grossResale);
    let creditsBefore = LedgerService.getCurrentCredits(walletActor);
    let creditsAfter = normalizeCredits(creditsBefore - netCost);
    if (!Number.isFinite(creditsBefore) || creditsBefore < 0) {
      return { success: false, transactionId, error: 'Invalid wallet credit state' };
    }
    if (creditsAfter < 0) {
      return {
        success: false,
        transactionId,
        error: `Insufficient credits (have ${creditsBefore}, need ${netCost})`
      };
    }

    const lockKey = `${walletActor.id}:${targetAsset.id}:${transactionContext}`;
    if (engine._creditReconciliations.has(walletActor.id)) {
      return { success: false, transactionId, error: 'Credits for this actor are being reconciled; try again in a moment.' };
    }
    if (engine._mutationLocks.has(lockKey)) {
      return { success: false, transactionId, error: 'Asset customization already in progress' };
    }
    engine._mutationLocks.add(lockKey);

    let walletSnapshot = null;
    let assetSnapshot = null;
    try {
      // TI-2 (D1): a customization is refused unless recovery is established for every actor it will change (wallet, and the asset when distinct).
      const walletRecovery = await establishRecovery(walletActor, `${transactionContext} wallet transaction (${netCost} net credits)`);
      const assetRecovery = walletRecovery.ok && targetAsset.id !== walletActor.id
        ? await establishRecovery(targetAsset, `${transactionContext} asset mutation (${targetAsset.name})`)
        : { ok: true, snapshot: null };
      if (!walletRecovery.ok || !assetRecovery.ok) {
        const why = (walletRecovery.error ?? assetRecovery.error)?.message ?? 'unknown';
        swseLogger.error('TransactionEngine: Asset customization refused; recovery could not be established', { transactionId, context: transactionContext, error: why });
        return { success: false, transactionId, refused: 'recovery-unavailable', error: `Customization refused: recovery could not be established (${why}). Nothing was changed.` };
      }
      walletSnapshot = walletRecovery.snapshot;
      assetSnapshot = assetRecovery.snapshot;
      // TI-2 (TX-08c): the balance is re-read after the (slow) snapshots, immediately before the plan is built.
      creditsBefore = LedgerService.getCurrentCredits(walletActor);
      creditsAfter = normalizeCredits(creditsBefore - netCost);
      if (!Number.isFinite(creditsBefore) || creditsBefore < 0 || creditsAfter < 0) {
        return { success: false, transactionId, error: `Insufficient credits (have ${creditsBefore}, need ${netCost})` };
      }

      const walletAudit = {
        id: transactionId,
        context: transactionContext,
        type: netCost < 0 ? 'Refund' : netCost > 0 ? 'Buy' : 'Customization',
        status: 'Success',
        cost: Math.abs(netCost),
        amount: netCost > 0 ? -netCost : Math.abs(netCost),
        creditsBefore,
        creditsAfter,
        createdAt: Date.now(),
        actorId: walletActor.id,
        actorName: walletActor.name,
        assetActorId: targetAsset.id,
        assetActorName: targetAsset.name,
        userId: game?.user?.id ?? null,
        userName: game?.user?.name ?? null,
        reason,
        source,
        audit: {
          ...audit,
          reason,
          creditsBefore,
          creditsAfter,
          grossCost,
          resaleCredit: grossResale,
          netCost,
          assetActorId: targetAsset.id,
          assetActorName: targetAsset.name
        }
      };

      const walletPlan = {
        set: {
          'system.credits': creditsAfter,
          [`flags.foundryvtt-swse.transactions.${transactionId}`]: walletAudit
        }
      };

      const assetPlans = Array.isArray(assetMutationPlan) ? assetMutationPlan : [assetMutationPlan];
      const sameActorCustomization = targetAsset.id === walletActor.id;
      const assetAuditPlan = sameActorCustomization
        ? null
        : {
            set: {
              [`flags.foundryvtt-swse.transactions.${transactionId}`]: {
                ...walletAudit,
                actorId: targetAsset.id,
                actorName: targetAsset.name,
                walletActorId: walletActor.id,
                walletActorName: walletActor.name,
                source: `${source}.asset`,
                audit: {
                  ...walletAudit.audit,
                  walletActorId: walletActor.id,
                  walletActorName: walletActor.name
                }
              }
            }
          };
      const mergedAssetPlan = assetAuditPlan
        ? mergeMutationPlans(...assetPlans, assetAuditPlan)
        : mergeMutationPlans(...assetPlans);

      if (sameActorCustomization) {
        await ActorEngine.applyMutationPlan(walletActor, mergeMutationPlans(walletPlan, mergedAssetPlan), {
          validate,
          rederive,
          source: `${source}.${transactionContext}`
        });
      } else {
        await ActorEngine.applyMutationPlan(walletActor, walletPlan, {
          validate,
          rederive,
          source: `${source}.${transactionContext}.wallet`
        });
        await ActorEngine.applyMutationPlan(targetAsset, mergedAssetPlan, {
          validate,
          rederive,
          source: `${source}.${transactionContext}.asset`
        });
      }

      // TI-2: the wallet charge is observed before success is claimed (otherwise `indeterminate`; no blind whole-actor restore that could revert another writer).
      const observedWallet = LedgerService.getCurrentCredits(walletActor);
      if (netCost !== 0 && observedWallet !== creditsAfter) {
        swseLogger.error('TransactionEngine: Asset customization could not be verified', { transactionId, context: transactionContext, expected: creditsAfter, observed: observedWallet });
        return { success: false, indeterminate: true, transactionId, error: `Customization could not be verified: expected ${creditsAfter} credits after the charge, found ${observedWallet}. Check the actor's credits and the asset before retrying.`, evidence: { creditsBefore, expectedCredits: creditsAfter, observedCredits: observedWallet } };
      }

      // Domain postcondition (e.g. the intended installation ledger actually persisted). A charge alone is not success.
      if (typeof verifyAsset === 'function') {
        let verdict;
        try { verdict = await verifyAsset(targetAsset, walletActor); }
        catch (verifyError) { verdict = { ok: false, reason: `verification threw: ${verifyError?.message ?? verifyError}` }; }
        if (!verdict?.ok) {
          const failure = new Error(`Customization postcondition failed: ${verdict?.reason ?? 'the intended state was not observed'}`);
          failure.verificationFailed = true;
          throw failure;
        }
      }

      // Owner ruling Q4 (TI-2): completion hooks are non-transactional. Once the customization is mechanically committed and verified, a failing listener
      // is reported as `presentationError` and never reverses it (no snapshot restore). Mechanical / persistence failures above still roll back both actors.
      const presentationError = emitCommitted('swseAssetCustomizationTransactionComplete', () => ({
        transaction: normalizeTransactionRecord(walletActor, walletAudit),
        actor: walletActor,
        assetActor: targetAsset,
        success: true
      }));

      return {
        success: true,
        transactionId,
        error: null,
        creditsBefore,
        creditsAfter,
        grossCost,
        resaleCredit: grossResale,
        netCost,
        ...(presentationError ? { presentationError } : {})
      };
    } catch (error) {
      swseLogger.error('TransactionEngine: Asset customization failed', {
        transactionId,
        context: transactionContext,
        walletActor: walletActor?.id,
        assetActor: targetAsset?.id,
        error: error.message
      });

      if (walletSnapshot || assetSnapshot) {
        const restores = [];
        if (assetSnapshot && targetAsset.id !== walletActor.id) {restores.push(await restoreVerified(targetAsset, assetSnapshot));}
        if (walletSnapshot) {restores.push(await restoreVerified(walletActor, walletSnapshot));}
        if (restores.some((r) => !r.restored)) {
          swseLogger.error('TransactionEngine: Asset customization rollback failed', { transactionId, error: restores.find((r) => !r.restored)?.error?.message });
          return { success: false, transactionId, rollbackFailed: true, ...(error.verificationFailed ? { verificationFailed: true } : {}), error: `Asset customization failed and rollback failed: ${error.message}` };
        }
      }

      return { success: false, transactionId, ...(error.verificationFailed ? { verificationFailed: true, rolledBack: true } : {}), error: error.message };
    } finally {
      engine._mutationLocks.delete(lockKey);
    }
  }

export async function executeAssetApprovalTransactionImpl(engine, context = {}, options = {}) {
    const {
      actor,
      assetActor,
      cost = 0,
      reason = '',
      transactionContext = 'store-custom-approval',
      audit = {},
      assetUpdates = {}
    } = context;

    const {
      validate = true,
      rederive = true,
      source = 'TransactionEngine.executeAssetApprovalTransaction'
    } = options;

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    if (!engine._allowedCreditAdjustmentContexts.has(transactionContext)) {
      return { success: false, transactionId, error: `Unsupported asset approval context: ${transactionContext}` };
    }

    if (!actor) return { success: false, transactionId, error: 'No owner actor provided' };
    if (!assetActor) return { success: false, transactionId, error: 'No asset actor provided' };

    const ownerActor = game?.actors?.get?.(actor.id) || actor;
    const freshAsset = game?.actors?.get?.(assetActor.id) || assetActor;
    if (!ownerActor) return { success: false, transactionId, error: 'Owner actor no longer exists' };
    if (!freshAsset) return { success: false, transactionId, error: 'Asset actor no longer exists' };
    if (ownerActor.isOwner === false) return { success: false, transactionId, error: 'Insufficient permissions for owner actor transaction' };
    if (!StoreAcquisitionService.isAssetActorType(freshAsset.type)) {
      return { success: false, transactionId, error: 'Approved asset must be a droid or vehicle actor' };
    }

    // H7: same strict parse as mutation transactions; a malformed approval cost is refused, not floored to 0
    const parsedCost = parseTransactionCost(cost);
    const normalizedCost = Number.isFinite(parsedCost) ? normalizeCredits(parsedCost) : NaN;
    if (!Number.isFinite(normalizedCost) || normalizedCost < 0) {
      return { success: false, transactionId, error: 'Invalid approval cost' };
    }

    const lockKey = assetApprovalLockKey(ownerActor.id, freshAsset.id, transactionContext);
    if (engine._creditReconciliations.has(ownerActor.id)) {
      return { success: false, transactionId, error: 'Credits for this actor are being reconciled; try again in a moment.' };
    }
    if (engine._mutationLocks.has(lockKey)) {
      return { success: false, transactionId, error: 'Asset approval transaction already in progress' };
    }

    engine._mutationLocks.add(lockKey);

    let ownerSnapshot = null;
    let assetSnapshot = null;
    try {
      // TI-3 (TX-10): the asset-state check is part of the transaction, inside the lock and before any write. An asset that already carries a store-acquisition
      // record has been approved: a second approval (a stale queue entry, a double click on another client, a retry after an unrelated post-commit failure)
      // would charge the owner again and re-link the asset. Refused with nothing changed.
      const acquired = freshAsset.system?.storeAcquisition?.transactionId
        ?? freshAsset.flags?.['foundryvtt-swse']?.storeAcquisition?.transactionId
        ?? freshAsset.getFlag?.('foundryvtt-swse', 'storeAcquisition')?.transactionId
        ?? null;
      if (acquired) {
        return { success: false, transactionId, refused: 'already-acquired', acquiredTransactionId: acquired, error: `${freshAsset.name} has already been approved (transaction ${acquired}); nothing was charged.` };
      }

      const funds = LedgerService.validateFunds(ownerActor, normalizedCost);
      if (!funds.ok) {
        return {
          success: false,
          transactionId,
          error: `Insufficient credits (have ${funds.current}, need ${funds.required})`
        };
      }

      const creditsBefore = LedgerService.getCurrentCredits(ownerActor);
      const creditsAfter = normalizeCredits(creditsBefore - normalizedCost);
      const assetSpec = {
        type: freshAsset.type,
        temporaryId: freshAsset.id,
        data: freshAsset.toObject?.(false) || foundry.utils.deepClone(freshAsset)
      };

      const linkPlan = StoreAcquisitionService.buildOwnerLinkPlan(ownerActor, [assetSpec], {
        ownerActor,
        ownerUserId: audit.ownerPlayerId || audit.ownerUserId || null,
        transactionId,
        transactionContext,
        audit,
        source
      }) || {};

      const transactionRecord = {
        id: transactionId,
        context: transactionContext,
        type: 'Approval Purchase',
        status: 'Success',
        cost: normalizedCost,
        amount: normalizedCost > 0 ? -normalizedCost : 0,
        creditsBefore,
        creditsAfter,
        createdAt: Date.now(),
        actorId: ownerActor.id,
        actorName: ownerActor.name,
        userId: game?.user?.id ?? null,
        userName: game?.user?.name ?? null,
        reason,
        source,
        itemName: freshAsset.name,
        audit: {
          ...audit,
          reason,
          creditsBefore,
          creditsAfter,
          acquiredActors: StoreAcquisitionService.summarizeAssetSpecs([assetSpec], {
            ownerActor,
            ownerUserId: audit.ownerPlayerId || audit.ownerUserId || null,
            transactionId,
            transactionContext,
            audit,
            source
          }),
          items: [{
            id: freshAsset.id,
            itemId: freshAsset.id,
            name: freshAsset.name,
            type: freshAsset.type,
            quantity: 1,
            cost: normalizedCost,
            actorUuid: freshAsset.uuid
          }]
        }
      };

      const ownerMutationPlan = mergeMutationPlans(
        {
          set: {
            'system.credits': creditsAfter,
            [`flags.foundryvtt-swse.transactions.${transactionId}`]: transactionRecord
          }
        },
        linkPlan
      );

      const assetUpdate = StoreAcquisitionService.buildExistingAssetUpdate(freshAsset, {
        ownerActor,
        ownerUserId: audit.ownerPlayerId || audit.ownerUserId || null,
        transactionId,
        transactionContext,
        audit,
        source
      });

      try {
        const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
        ownerSnapshot = await SnapshotManager.createSnapshot(ownerActor, `${transactionContext} owner before asset approval`);
        assetSnapshot = await SnapshotManager.createSnapshot(freshAsset, `${transactionContext} asset before approval`);
      } catch (snapshotError) {
        swseLogger.warn('TransactionEngine: Asset approval snapshot failed; continuing without rollback snapshot', {
          transactionId,
          error: snapshotError.message
        });
      }

      // Merge any caller-supplied asset-specific updates (e.g. droid FINALIZED
      // state) so they apply atomically with the credit debit and ownership link.
      const mergedAssetUpdate = { ...(assetUpdate || {}), ...(assetUpdates || {}) };
      await ActorEngine.updateActor(freshAsset, mergedAssetUpdate, {
        source: `${source}.${transactionContext}.asset`,
        skipValidation: false
      });

      await ActorEngine.applyMutationPlan(ownerActor, ownerMutationPlan, {
        validate,
        rederive,
        source: `${source}.${transactionContext}.owner`
      });

      const presentationError = emitCommitted('swseStoreAssetAcquired', () => ({
        transaction: normalizeTransactionRecord(ownerActor, transactionRecord),
        actor: ownerActor,
        assetActor: freshAsset,
        cost: normalizedCost,
        success: true
      }));

      swseLogger.info('TransactionEngine: Asset approval transaction complete', {
        transactionId,
        context: transactionContext,
        ownerActor: ownerActor.id,
        assetActor: freshAsset.id,
        cost: normalizedCost
      });

      return {
        success: true,
        transactionId,
        error: null,
        creditsBefore,
        creditsAfter,
        amount: normalizedCost > 0 ? -normalizedCost : 0,
        assetActorId: freshAsset.id,
        ...(presentationError ? { presentationError } : {})
      };
    } catch (error) {
      swseLogger.error('TransactionEngine: Asset approval transaction failed', {
        transactionId,
        context: transactionContext,
        actor: ownerActor?.id,
        assetActor: freshAsset?.id,
        error: error.message
      });

      if (ownerSnapshot || assetSnapshot) {
        const restores = [];
        if (assetSnapshot) {restores.push(await restoreVerified(freshAsset, assetSnapshot));}
        if (ownerSnapshot) {restores.push(await restoreVerified(ownerActor, ownerSnapshot));}
        if (restores.some((r) => !r.restored)) {
          swseLogger.error('TransactionEngine: Asset approval rollback failed', { transactionId, error: restores.find((r) => !r.restored)?.error?.message });
          return { success: false, transactionId, rollbackFailed: true, error: `Asset approval failed and rollback failed: ${error.message}` };
        }
        swseLogger.info('TransactionEngine: Asset approval rollback successful', { transactionId });
      }

      return { success: false, transactionId, error: error.message };
    } finally {
      engine._mutationLocks.delete(lockKey);
    }
  }

export async function executeSaleTransactionImpl(engine, context = {}, options = {}) {
    const {
      actor, itemId, quantity = 1, authority = null, shownQuote = null, appraisal = null,
      requestId = null, reason = '', transactionContext = 'store-sale', audit = {}
    } = context;
    const { validate = true, rederive = true, source = 'TransactionEngine.executeSaleTransaction' } = options;

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    if (!engine._allowedSaleContexts.has(transactionContext)) return { success: false, transactionId, error: `Unsupported sale transaction context: ${transactionContext}` };
    if (!actor) return { success: false, transactionId, error: 'No actor provided' };
    const freshActor = game?.actors?.get?.(actor.id) || actor;
    if (!freshActor) return { success: false, transactionId, error: 'Actor no longer exists' };
    if (freshActor.isOwner === false) return { success: false, transactionId, error: 'Insufficient permissions for transaction' };
    const ownedItemId = String(itemId || '').trim();
    if (!ownedItemId) return { success: false, transactionId, error: 'No owned item id provided' };
    const ownedItem = freshActor.items?.get?.(ownedItemId);
    if (!ownedItem) return { success: false, transactionId, error: 'Sold item is no longer owned by this actor' };

    const lockKey = `${freshActor.id}:${transactionContext}:sale:${ownedItemId}`;
    if (engine._creditReconciliations.has(freshActor.id)) return { success: false, transactionId, error: 'Credits for this actor are being reconciled; try again in a moment.' };
    if (engine._mutationLocks.has(lockKey)) return { success: false, transactionId, error: 'Sale transaction already in progress' };
    engine._mutationLocks.add(lockKey);

    let snapshotId = null;
    try {
      const { ResaleService } = await import('/systems/foundryvtt-swse/scripts/engine/store/resale-service.js');
      const verdict = await ResaleService.verifyForCommit({ actor: freshActor, itemId: ownedItemId, quantity, authority, shownQuote, appraisal, requestId, transactionContext });
      if (!verdict.ok) return { success: false, transactionId, error: verdict.error, reasons: verdict.reasons, quoteChanged: verdict.quoteChanged === true };

      const normalizedSalePrice = verdict.payout;
      const soldQty = verdict.quantity;
      const creditsBefore = LedgerService.getCurrentCredits(freshActor);
      const creditsAfter = normalizeCredits(creditsBefore + normalizedSalePrice);
      const itemData = ownedItem.toObject?.() || globalThis.foundry?.utils?.deepClone?.(ownedItem) || { id: ownedItem.id, name: ownedItem.name, type: ownedItem.type };
      const itemName = ownedItem.name || audit.itemName || 'Sold item';

      const saleRecord = {
        id: transactionId, context: transactionContext, type: 'Sell', status: 'Success',
        cost: normalizedSalePrice, amount: normalizedSalePrice, creditsBefore, creditsAfter, createdAt: Date.now(),
        actorId: freshActor.id, actorName: freshActor.name, userId: game?.user?.id ?? null, userName: game?.user?.name ?? null,
        reason, source, itemName,
        audit: {
          ...audit, reason, creditsBefore, creditsAfter, itemName, itemCount: soldQty,
          requestId: requestId ?? null, resaleAuthority: verdict.authority, resaleQuote: verdict.quote ?? null, lotDisposal: verdict.lotDisposal ?? null,
          appraisal: verdict.appraisal ?? null,
          items: [{ id: ownedItem.id, itemId: ownedItem.id, name: itemName, type: ownedItem.type, quantity: soldQty, salePrice: normalizedSalePrice, itemData }]
        }
      };

      const removal = verdict.removeEntirely
        ? { delete: { items: [ownedItem.id] } }
        : { update: { items: [{ _id: ownedItem.id, 'system.quantity': verdict.remainingQuantity }] } };
      const mutationPlan = mergeMutationPlans(removal, { set: { 'system.credits': creditsAfter, [`flags.foundryvtt-swse.transactions.${transactionId}`]: saleRecord } });

      try {
        const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
        snapshotId = await SnapshotManager.createSnapshot(freshActor, `${transactionContext} sale (${normalizedSalePrice} credits)`);
      } catch (snapshotError) {
        // A sale CREATES credits: without a verified rollback snapshot it is refused (same rule as credit adjustments), not attempted blind.
        swseLogger.error('TransactionEngine: Sale refused; the rollback snapshot could not be created', { transactionId, context: transactionContext, error: snapshotError.message });
        return { success: false, transactionId, error: `Sale refused: the rollback snapshot could not be created (${snapshotError?.message ?? snapshotError}); nothing was changed.` };
      }
      if (!snapshotId) return { success: false, transactionId, error: 'Sale refused: no rollback snapshot was produced; nothing was changed.' };

      await ActorEngine.applyMutationPlan(freshActor, mutationPlan, { validate, rederive, source: `${source}.${transactionContext}` });

      const presentationError = emitCommitted('swseStoreSaleComplete', () => ({
        transaction: normalizeTransactionRecord(freshActor, saleRecord), actor: freshActor, itemData, salePrice: normalizedSalePrice, success: true
      }));
      swseLogger.info('TransactionEngine: Sale transaction complete', { transactionId, context: transactionContext, actor: freshActor.id, item: itemName, quantity: soldQty, salePrice: normalizedSalePrice, authority: verdict.authority });
      return { success: true, transactionId, error: null, creditsBefore, creditsAfter, amount: normalizedSalePrice, quantity: soldQty, authority: verdict.authority, ...(presentationError ? { presentationError } : {}) };
    } catch (error) {
      swseLogger.error('TransactionEngine: Sale transaction failed', { transactionId, context: transactionContext, actor: freshActor?.id, itemId: ownedItemId, error: error.message });
      if (snapshotId) {
        const restore = await restoreVerified(freshActor, snapshotId);
        if (!restore.restored) {
          swseLogger.error('TransactionEngine: Sale rollback failed', { transactionId, snapshotId, error: restore.error?.message });
          return { success: false, transactionId, rollbackFailed: true, error: `Sale failed and rollback failed: ${error.message}` };
        }
        swseLogger.info('TransactionEngine: Sale rollback successful', { transactionId, snapshotId });
      }
      return { success: false, transactionId, error: error.message };
    } finally {
      engine._mutationLocks.delete(lockKey);
    }
  }

export function observeAssetSale(owner, assetId, transactionId, creditsBefore, creditsAfter) {
    let ledger;
    try { ledger = owner.getFlag?.('foundryvtt-swse', 'transactions') || owner.flags?.['foundryvtt-swse']?.transactions || {}; }
    catch (_err) { ledger = owner.flags?.['foundryvtt-swse']?.transactions || {}; }
    const credits = LedgerService.getCurrentCredits(owner);
    const recordPresent = Boolean(ledger && Object.prototype.hasOwnProperty.call(ledger, transactionId) && ledger[transactionId]);
    const linked = (Array.isArray(owner.system?.ownedActors) ? owner.system.ownedActors : []).some(e => e?.id === assetId);
    return {
      credits, recordPresent, linked,
      paid: credits === creditsAfter && recordPresent && !linked,        // the whole owner plan is visible
      unpaid: credits === creditsBefore && !recordPresent && linked       // the owner is exactly as before
    };
  }

export async function revertAssetDisposition(asset, undoUpdate, previous, source) {
    const savedResale = asset.flags?.['foundryvtt-swse']?.resale ? JSON.parse(JSON.stringify(asset.flags['foundryvtt-swse'].resale)) : null;
    // A failed/partial revert must never erase the pending marker: the asset would then look like an ordinary GM-held Actor with no way to reconcile.
    const keepMarker = async why => {
      if (savedResale && !asset.flags?.['foundryvtt-swse']?.resale) {
        try { await ActorEngine.updateActor(asset, { 'flags.foundryvtt-swse.resale': { ...savedResale, needsReconciliation: true, reconciliationReasons: [why] } }, { source: `${source}.keep-marker`, skipValidation: true }); } catch (_e) { /* reported by the caller */ }
      }
    };
    try {
      await ActorEngine.updateActor(asset, undoUpdate, { source, skipValidation: true });
    } catch (error) {
      await keepMarker(`restore write failed: ${error.message}`);
      return { restored: false, error };
    }
    const problems = [];
    if (asset.flags?.['foundryvtt-swse']?.resale) problems.push('the pending resale state is still present');
    if ((asset.system?.ownedByActorId ?? null) !== (previous.ownedByActorId ?? null)) problems.push('the owner link was not restored');
    if (!sameOwnership(asset.ownership, previous.ownership)) problems.push('the ownership/permission map was not restored');
    if (problems.length) { await keepMarker(problems.join('; ')); return { restored: false, error: new Error(problems.join('; ')) }; }
    return { restored: true };
  }

export async function executeAssetSaleTransactionImpl(engine, context = {}, options = {}) {
    const { ownerActor, assetActorId, appraisal = null, requestId = null, reason = '', audit = {} } = context;
    const { validate = true, rederive = true, source = 'TransactionEngine.executeAssetSaleTransaction' } = options;
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    const transactionContext = 'store-asset-sale-approval';
    if (!ownerActor) return { success: false, transactionId, error: 'No owning actor provided' };
    const owner = game?.actors?.get?.(ownerActor.id) || ownerActor;
    const assetId = String(assetActorId || '').trim();
    if (!assetId) return { success: false, transactionId, error: 'No asset actor id provided' };

    const lockKey = `${owner.id}:${transactionContext}:asset:${assetId}`;
    if (engine._creditReconciliations.has(owner.id)) return { success: false, transactionId, error: 'Credits for this actor are being reconciled; try again in a moment.' };
    if (engine._mutationLocks.has(lockKey)) return { success: false, transactionId, error: 'Asset sale already in progress' };
    engine._mutationLocks.add(lockKey);

    try {
      const { ResaleService } = await import('/systems/foundryvtt-swse/scripts/engine/store/resale-service.js');
      const { buildAssetDispositionUpdate } = await import('/systems/foundryvtt-swse/scripts/engine/store/resale-authority.js');
      const verdict = await ResaleService.verifyAssetForCommit({ ownerActor: owner, assetActorId: assetId, appraisal, requestId });
      if (!verdict.ok) return { success: false, transactionId, error: verdict.error, reasons: verdict.reasons };
      const asset = verdict.asset;
      const amount = verdict.amount;
      const creditsBefore = LedgerService.getCurrentCredits(owner);
      const creditsAfter = normalizeCredits(creditsBefore + amount);

      // 0. recovery is ESTABLISHED before anything irreversible happens
      const recovery = await establishRecovery(owner, `store-asset-sale ${transactionId}`);
      if (!recovery.ok) return { success: false, transactionId, error: `Asset sale refused: owner recovery could not be established (${recovery.error?.message ?? recovery.error}); nothing was changed.` };

      // 1. dispose the asset as PENDING, carrying this transaction's id
      const soldAt = Date.now();
      const pendingUpdate = buildAssetDispositionUpdate({ ...verdict.dispositionInputs, transactionId, soldAt, status: 'sale-pending' });
      Object.assign(pendingUpdate['flags.foundryvtt-swse.resale'], {
        ownerCreditsBefore: creditsBefore, ownerCreditsAfter: creditsAfter,
        ownerHadRelationship: (Array.isArray(owner.system?.relationships) ? owner.system.relationships : []).some(e => e?.id === asset.id || e?.uuid === `Actor.${asset.id}`)
      });
      try {
        await ActorEngine.updateActor(asset, pendingUpdate, { source: `${source}.dispose`, skipValidation: true });
      } catch (disposeError) {
        // the owner has not been touched: it is verified unpaid. Make the asset state certain before reporting a clean failure.
        const rv = await revertAssetDisposition(asset, verdict.undoUpdate, verdict.previous, `${source}.revert-failed-dispose`);
        swseLogger.error('TransactionEngine: Asset sale disposal failed', { transactionId, asset: asset.id, error: disposeError.message, assetRestored: rv.restored });
        return rv.restored
          ? { success: false, transactionId, verifiedUnpaid: true, assetRestored: true, error: disposeError.message }
          : { success: false, transactionId, indeterminate: true, ownerUnpaidVerified: true, needsReconciliation: true, error: `Asset sale failed while disposing the asset (${disposeError.message}) and the asset state could not be verified. The seller was NOT paid; a GM must check ${asset.name} (transaction ${transactionId}).` };
      }

      const record = {
        id: transactionId, context: transactionContext, type: 'Sell', status: 'Success', cost: amount, amount, creditsBefore, creditsAfter, createdAt: soldAt,
        actorId: owner.id, actorName: owner.name, userId: game?.user?.id ?? null, userName: game?.user?.name ?? null, reason, source, itemName: asset.name,
        audit: {
          ...audit, reason, creditsBefore, creditsAfter, itemName: asset.name, itemCount: 1, requestId: requestId ?? null,
          resaleAuthority: RESALE_AUTHORITY_GM_APPRAISAL, appraisal: verdict.appraisal, assetEvidence: verdict.evidence, assetActorId: asset.id,
          items: [{ id: asset.id, itemId: asset.id, name: asset.name, type: asset.type, quantity: 1, salePrice: amount }]
        }
      };
      const ownerLinks = (Array.isArray(owner.system?.ownedActors) ? owner.system.ownedActors : []).filter(e => e?.id !== asset.id);
      const ownerRelationships = (Array.isArray(owner.system?.relationships) ? owner.system.relationships : []).filter(e => e?.id !== asset.id && e?.uuid !== `Actor.${asset.id}`);

      // 2. ONE transactional owner plan (ActorEngine verifies and reports its own rollback)
      let ownerError = null;
      try {
        await ActorEngine.applyMutationPlan(owner, { set: {
          'system.credits': creditsAfter, 'system.ownedActors': ownerLinks, 'system.relationships': ownerRelationships,
          [`flags.foundryvtt-swse.transactions.${transactionId}`]: record
        } }, { validate, rederive, transactional: true, source: `${source}.${transactionContext}` });
      } catch (error) {
        ownerError = error;
      }

      // 3. decide from what is OBSERVED on the owner
      const obs = observeAssetSale(owner, asset.id, transactionId, creditsBefore, creditsAfter);
      const evidence = { owner: obs, ownerError: ownerError?.message ?? null, ownerRollbackOutcome: ownerError?.rollbackOutcome ?? null, partialMutationPossible: ownerError?.partialMutationPossible ?? null };

      if (obs.paid) {
        // payment is committed (even if the call reported an error afterwards): the asset must NOT go back to the seller.
        let finalizeError = null;
        try {
          await ActorEngine.updateActor(asset, { 'flags.foundryvtt-swse.resale.status': 'sold' }, { source: `${source}.finalize`, skipValidation: true });
        } catch (error) {
          finalizeError = error;
          swseLogger.error('TransactionEngine: Asset sale committed but the asset status could not be finalized', { transactionId, asset: asset.id, error: error.message });
        }
        const presentationError = emitCommitted('swseStoreSaleComplete', () => ({
          transaction: normalizeTransactionRecord(owner, record), actor: owner, itemData: { name: asset.name, type: asset.type }, salePrice: amount, success: true
        }));
        swseLogger.info('TransactionEngine: Asset sale complete', { transactionId, owner: owner.id, asset: asset.id, amount });
        return { success: true, transactionId, error: null, creditsBefore, creditsAfter, amount,
          ...(ownerError ? { postCommitError: ownerError.message } : {}),
          ...(finalizeError ? { assetStatusPending: true, warning: `The sale is committed but ${asset.name} is still marked sale-pending; a GM can finalize it with reconcileAssetSale.` } : {}),
          ...(presentationError ? { presentationError } : {}) };
      }

      const verifiedUnpaid = ownerError && obs.unpaid && ownerError.rollbackOutcome === 'FAILED_COMPENSATED';
      if (verifiedUnpaid) {
        const rv = await revertAssetDisposition(asset, verdict.undoUpdate, verdict.previous, `${source}.revert-disposition`);
        if (rv.restored) {
          swseLogger.warn('TransactionEngine: Asset sale failed; owner verified unpaid and the asset was restored', { transactionId, asset: asset.id, error: ownerError.message });
          return { success: false, transactionId, verifiedUnpaid: true, assetRestored: true, error: ownerError.message, evidence };
        }
        return { success: false, transactionId, indeterminate: true, rollbackFailed: true, ownerUnpaidVerified: true, needsReconciliation: true, evidence,
          error: `Asset sale failed (${ownerError.message}); the seller was verified UNPAID but ${asset.name} could not be restored. It is GM-held as sale-pending (transaction ${transactionId}); run reconcileAssetSale.` };
      }

      // payment state cannot be established: do NOT restore the asset, do NOT refund; leave an actionable reconciliation state
      try {
        await ActorEngine.updateActor(asset, { 'flags.foundryvtt-swse.resale.needsReconciliation': true, 'flags.foundryvtt-swse.resale.evidence': evidence }, { source: `${source}.flag-reconciliation`, skipValidation: true });
      } catch (flagError) {
        evidence.reconciliationFlagError = flagError.message;
      }
      swseLogger.error('TransactionEngine: Asset sale INDETERMINATE', { transactionId, owner: owner.id, asset: asset.id, evidence });
      return { success: false, transactionId, indeterminate: true, paymentUnverified: true, needsReconciliation: true, evidence,
        error: `Asset sale outcome is UNVERIFIED${ownerError ? ` (${ownerError.message})` : ''}: the seller may or may not have been paid. ${asset.name} stays GM-held as sale-pending and was NOT returned. Do not retry; run reconcileAssetSale for transaction ${transactionId}.` };
    } catch (error) {
      swseLogger.error('TransactionEngine: Asset sale failed before any write', { transactionId, owner: owner?.id, asset: assetId, error: error.message });
      return { success: false, transactionId, error: error.message };
    } finally {
      engine._mutationLocks.delete(lockKey);
    }
  }

export function otherLinkers(owner, assetId) {
    const out = [];
    const all = game?.actors?.contents ?? (typeof game?.actors?.[Symbol.iterator] === 'function' ? [...game.actors] : []);
    for (const a of all) {
      if (!a || a.id === owner.id) continue;
      const links = Array.isArray(a.system?.ownedActors) ? a.system.ownedActors : [];
      if (links.some(e => e?.id === assetId)) out.push(a.id);
    }
    return out;
  }

export function playerAccessOn(asset) {
    return Object.entries(asset.ownership ?? {}).filter(([k, v]) => k !== 'default' && Number(v) > 0 && game?.users?.get?.(k)?.isGM !== true).map(([k]) => k);
  }

export async function reconcileAssetSaleImpl(engine, { ownerActor, assetActorId } = {}) {
    if (game?.user?.isGM !== true) return { success: false, outcome: 'refused', error: 'Only a GM can reconcile an asset sale.' };
    const owner = game?.actors?.get?.(ownerActor?.id) || ownerActor;
    const assetId = String(assetActorId ?? '');
    const lockKey = `reconcile-asset:${assetId}`;
    if (engine._mutationLocks.has(lockKey)) return { success: false, outcome: 'in-progress', error: 'This asset is already being reconciled.' };
    engine._mutationLocks.add(lockKey);
    try {
      const asset = game?.actors?.get?.(assetId);
      const resale = asset?.flags?.['foundryvtt-swse']?.resale;
      if (!owner || !asset || resale?.status !== 'sale-pending' || !resale.transactionId) return { success: false, outcome: 'nothing-to-reconcile', error: 'The asset has no pending sale to reconcile.' };
      if (resale.previousOwnerActorId !== owner.id) return { success: false, outcome: 'unresolved', error: 'The pending sale does not belong to this owner.' };
      const txId = resale.transactionId;
      let ledger;
      try { ledger = owner.getFlag?.('foundryvtt-swse', 'transactions') || owner.flags?.['foundryvtt-swse']?.transactions || {}; } catch (_e) { ledger = owner.flags?.['foundryvtt-swse']?.transactions || {}; }
      const record = ledger?.[txId] ?? null;
      const credits = LedgerService.getCurrentCredits(owner);
      const linked = (Array.isArray(owner.system?.ownedActors) ? owner.system.ownedActors : []).some(e => e?.id === asset.id);
      const hasRel = (Array.isArray(owner.system?.relationships) ? owner.system.relationships : []).some(e => e?.id === asset.id || e?.uuid === `Actor.${asset.id}`);
      const others = otherLinkers(owner, asset.id);
      const otherSales = Object.values(ledger ?? {}).filter(r => r && r.id !== txId && r.status === 'Success' && r.audit?.assetActorId === asset.id);
      const fail = (reasons, extra = {}) => ({ success: false, outcome: 'unresolved', needsReconciliation: true, reasons, error: `Cannot reconcile sale ${txId}: ${reasons.join('; ')}. The asset stays GM-held.`, ...extra });
      const mark = async reasons => { try { await ActorEngine.updateActor(asset, { 'flags.foundryvtt-swse.resale.needsReconciliation': true, 'flags.foundryvtt-swse.resale.reconciliationReasons': reasons }, { source: 'TransactionEngine.reconcileAssetSale.flag', skipValidation: true }); } catch (_e) { /* the returned result carries the reasons */ } };

      if (others.length || otherSales.length) { const r = ['a conflicting transfer or sale of this asset exists']; await mark(r); return fail(r); }

      if (record) {
        const bad = [];
        if (record.id !== txId) bad.push('record id differs from the pending transaction');
        if (record.status !== 'Success') bad.push('record is not successful');
        if (record.type !== 'Sell' || record.context !== 'store-asset-sale-approval') bad.push('record is not an asset-sale transaction');
        if (record.actorId !== owner.id) bad.push('record owner differs from the seller');
        if (record.audit?.assetActorId !== asset.id) bad.push('record names a different asset');
        if (!Number.isFinite(Number(record.amount)) || Number(record.amount) !== Number(resale.amount)) bad.push('recorded payout differs from the pending sale');
        if (record.creditsBefore !== resale.ownerCreditsBefore || record.creditsAfter !== resale.ownerCreditsAfter) bad.push('recorded wallet transition differs from the pending sale');
        if (linked || hasRel) bad.push('the seller still links the asset');
        if (asset.system?.ownedByActorId != null) bad.push('the asset still names an owner');
        if (playerAccessOn(asset).length) bad.push('a player still has access to the asset');
        const laterTx = Object.values(ledger ?? {}).some(r => r && r.id !== txId && Number(r.createdAt) > Number(record.createdAt));
        if (credits !== record.creditsAfter && !laterTx) bad.push('the seller wallet does not match the committed payment');
        if (bad.length) { await mark(bad); return fail(bad); }
        try {
          await ActorEngine.updateActor(asset, { 'flags.foundryvtt-swse.resale.status': 'sold', 'flags.foundryvtt-swse.resale.needsReconciliation': false }, { source: 'TransactionEngine.reconcileAssetSale', skipValidation: true });
        } catch (error) { return fail([`finalizing the asset failed (${error.message})`]); }
        return asset.flags?.['foundryvtt-swse']?.resale?.status === 'sold'
          ? { success: true, outcome: 'completed', transactionId: txId }
          : fail(['the asset status could not be verified as sold']);
      }

      // no committed record: restoration only if the owner is observably untouched
      const bad = [];
      if (credits !== resale.ownerCreditsBefore) bad.push('the seller wallet is not at its pre-sale value (payment may have landed)');
      if (!linked) bad.push('the seller no longer links the asset');
      if (hasRel !== (resale.ownerHadRelationship !== false)) bad.push('the seller relationship entry is inconsistent');
      if (asset.system?.ownedByActorId != null) bad.push('the asset names an owner while pending');
      if (!resale.previousOwnership || resale.previousOwnedByActorId !== owner.id) bad.push('the original ownership state was not recorded');
      if (bad.length) { await mark(bad); return fail(bad); }
      const gmKeys = Object.fromEntries(Object.entries(asset.ownership ?? {}).filter(([k]) => k !== 'default'));
      const undo = {
        ownership: { ...resale.previousOwnership, ...Object.fromEntries(Object.keys(gmKeys).filter(k => !(k in resale.previousOwnership)).map(k => [`-=${k}`, null])) },
        'system.ownedByActorId': resale.previousOwnedByActorId, 'system.ownedByActorName': resale.previousOwnedByActorName ?? null,
        'flags.foundryvtt-swse.-=resale': null
      };
      const rv = await revertAssetDisposition(asset, undo, { ownedByActorId: resale.previousOwnedByActorId, ownership: resale.previousOwnership }, 'TransactionEngine.reconcileAssetSale.restore');
      if (rv.restored) return { success: true, outcome: 'restored', transactionId: txId };
      if (asset.flags?.['foundryvtt-swse']?.resale) await mark([`restoration could not be verified (${rv.error?.message})`]);
      return fail([`restoration could not be verified (${rv.error?.message})`]);
    } finally {
      engine._mutationLocks.delete(lockKey);
    }
  }

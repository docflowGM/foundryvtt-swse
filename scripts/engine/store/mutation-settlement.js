/**
 * Actor-scoped contextual mutation settlement (3N-TE.4, extracted verbatim from TransactionEngine.executeMutationTransaction) and the store
 * acquisition-plan preparation it uses.
 *
 * TransactionEngine keeps the public method as a thin delegate and remains the single economic-settlement coordinator; the engine is passed as
 * `engine` for its in-flight lock/reconciliation sets. Verified rollback, unverified-charge compensation and indeterminate reporting are unchanged
 * (store-purchase-created-actor-rollback, ti2, ti4c0-g06 are the parity evidence).
 */
import { parseTransactionCost } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-helpers.js";
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
import { establishRecovery, compensateUnverified, restoreVerified } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-recovery.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";
import { lotIdFor, stampAcquisitions } from "/systems/foundryvtt-swse/scripts/engine/store/acquisition-record.js";
import { mergeMutationPlans } from "/systems/foundryvtt-swse/scripts/governance/mutation/merge-mutations.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { StoreAcquisitionService } from "/systems/foundryvtt-swse/scripts/engine/store/acquisition-service.js";

export async function executeMutationTransactionImpl(engine, context = {}, options = {}) {
    const {
      actor,
      mutationPlan = {},
      cost = 0,
      transactionContext = 'store-purchase',
      audit = {},
      verify = null
    } = context;

    const {
      validate = true,
      rederive = true,
      source = 'TransactionEngine.executeMutationTransaction'
    } = options;

    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    if (engine._blockedMutationContexts.has(transactionContext)) {
      return {
        success: false,
        transactionId,
        error: `${transactionContext} is a staging context and must not mutate actor state`
      };
    }

    if (!engine._allowedMutationContexts.has(transactionContext)) {
      return {
        success: false,
        transactionId,
        error: `Unsupported transaction context: ${transactionContext}`
      };
    }

    if (!actor) {
      return { success: false, transactionId, error: 'No actor provided' };
    }

    const freshActor = game?.actors?.get?.(actor.id) || actor;
    if (!freshActor) {
      return { success: false, transactionId, error: 'Actor no longer exists' };
    }

    if (freshActor.isOwner === false) {
      return { success: false, transactionId, error: 'Insufficient permissions for transaction' };
    }

    // H7: a malformed cost (null, '', non-numeric, NaN, an object) is refused, never treated as a free transaction. Only an omitted cost means 0.
    const normalizedCost = parseTransactionCost(cost);
    if (!Number.isFinite(normalizedCost) || normalizedCost < 0) {
      return { success: false, transactionId, error: 'Invalid transaction cost' };
    }

    const lockKey = `${freshActor.id}:${transactionContext}`;
    if (engine._creditReconciliations.has(freshActor.id)) {
      return { success: false, transactionId, error: 'Credits for this actor are being reconciled; try again in a moment.' };
    }
    if (engine._mutationLocks.has(lockKey)) {
      return { success: false, transactionId, error: 'Transaction already in progress' };
    }

    engine._mutationLocks.add(lockKey);

    let snapshotId = null;
    try {
      const funds = LedgerService.validateFunds(freshActor, normalizedCost);
      if (!funds.ok) {
        return {
          success: false,
          transactionId,
          error: `Insufficient credits (have ${funds.current}, need ${funds.required})`
        };
      }

      // TI-2: recovery is established FIRST (D1); the balance is read AFTER the (slow) snapshot, immediately before the plan is built, so the credit write
      // is computed from the freshest balance this client can see.
      const recovery = await establishRecovery(freshActor, `${transactionContext} transaction (${normalizedCost} credits)`);
      if (!recovery.ok) {
        swseLogger.error('TransactionEngine: Transaction refused; recovery could not be established', { transactionId, context: transactionContext, error: recovery.error?.message });
        return { success: false, transactionId, refused: 'recovery-unavailable', error: `Transaction refused: recovery could not be established (${recovery.error?.message ?? 'unknown'}). Nothing was changed.` };
      }
      snapshotId = recovery.snapshot;
      const funds2 = LedgerService.validateFunds(freshActor, normalizedCost);
      if (!funds2.ok) {
        return { success: false, transactionId, error: `Insufficient credits (have ${funds2.current}, need ${funds2.required})` };
      }
      const creditsBefore = LedgerService.getCurrentCredits(freshActor);
      const creditsAfter = normalizeCredits(creditsBefore - normalizedCost);
      const rawPlans = Array.isArray(mutationPlan) ? mutationPlan : [mutationPlan];
      const preparedAcquisition = prepareStoreAcquisitionPlans({
        actor: freshActor,
        plans: rawPlans,
        transactionId,
        transactionContext,
        audit,
        source
      });
      const plans = preparedAcquisition.plans;
      // Acquisition provenance: delivered Items / Actors get a REFERENCE to this committed transaction (the ledger line below is the evidence).
      const acquiredAtStamp = Date.now();
      // Each purchase line gets a unique lot id in the ledger; delivered assets are allocated to lots one-to-one (see acquisition-record.js).
      const auditLines = Array.isArray(audit?.items) ? audit.items.map((line, index) => ({ ...line, lotId: lotIdFor(transactionId, index) })) : audit?.items;
      const claimedLots = new Set();   // ONE set for the whole transaction: lots are allocated across all plans
      for (const plan of plans) stampAcquisitions(plan, { transactionId, context: transactionContext, at: acquiredAtStamp, lines: Array.isArray(auditLines) ? auditLines : [], claimed: claimedLots });
      const creditPlan = normalizedCost > 0 ? LedgerService.buildCreditDelta(freshActor, normalizedCost) : null;

      const transactionAudit = {
        set: {
          [`flags.foundryvtt-swse.transactions.${transactionId}`]: {
            id: transactionId,
            context: transactionContext,
            type: transactionContext.includes('approval') ? 'Approval Purchase' : 'Buy',
            status: 'Success',
            cost: normalizedCost,
            amount: normalizedCost > 0 ? -normalizedCost : 0,
            creditsBefore,
            creditsAfter,
            createdAt: Date.now(),
            actorId: freshActor.id,
            actorName: freshActor.name,
            userId: game?.user?.id ?? null,
            userName: game?.user?.name ?? null,
            source,
            audit: {
              ...audit,
              ...(Array.isArray(auditLines) ? { items: auditLines } : {}),
              creditsBefore,
              creditsAfter,
              acquiredActors: preparedAcquisition.acquiredActors
            }
          }
        }
      };

      const mergedPlan = mergeMutationPlans(...plans, ...(creditPlan ? [creditPlan] : []), transactionAudit);

      // F-STO-001: ActorEngine creates CREATE-bucket world actors (purchased droids/vehicles) FIRST, and removes them on failure ONLY in transactional
      // mode. A plan that creates world actors is therefore applied transactionally; plans that create none keep the existing non-transactional path
      // (no extra snapshot). On failure the engine attaches verified rollback evidence to the thrown error (`error.rollback`), read in the catch below.
      const createsWorldActors = Array.isArray(mergedPlan?.create?.actors) && mergedPlan.create.actors.length > 0;
      await ActorEngine.applyMutationPlan(freshActor, mergedPlan, {
        validate,
        rederive,
        transactional: createsWorldActors,
        source: `${source}.${transactionContext}`
      });

      // TI-2: success is claimed only after the charge is OBSERVED. Credits are read-modify-write with no compare-and-swap, so a concurrent writer can
      // still win inside the write itself (INTENTIONAL_LIMITATION); what this detects is a charge that is not what was planned. It does not restore
      // (a whole-actor restore here could revert the other writer's change): the result is `indeterminate` with evidence.
      const observedCredits = LedgerService.getCurrentCredits(freshActor);
      if (normalizedCost > 0 && observedCredits !== creditsAfter) {
        swseLogger.error('TransactionEngine: Mutation transaction could not be verified', { transactionId, context: transactionContext, expected: creditsAfter, observed: observedCredits });
        return { success: false, indeterminate: true, transactionId, error: `Transaction could not be verified: expected ${creditsAfter} credits after the charge, found ${observedCredits}. Check the actor's credits and items before retrying.`, evidence: { creditsBefore, expectedCredits: creditsAfter, observedCredits } };
      }

      // TI2-R1: the caller's proof that its own change landed runs INSIDE the transaction, before success is claimed.
      if (typeof verify === 'function') {
        let verdict;
        try { verdict = await verify(freshActor); } catch (verifyError) { verdict = { ok: false, reason: `verification threw: ${verifyError?.message ?? verifyError}` }; }
        if (verdict?.ok !== true) {
          swseLogger.error('TransactionEngine: Mutation transaction failed verification', { transactionId, context: transactionContext, reason: verdict?.reason });
          return await compensateUnverified(engine, freshActor, { transactionId, source: `${source}.${transactionContext}`, normalizedCost, creditsBefore, creditsAfter, reason: verdict?.reason ?? 'the change is not present', ownLockKey: lockKey });
        }
      }

      swseLogger.info('TransactionEngine: Mutation transaction complete', {
        transactionId,
        context: transactionContext,
        actor: freshActor.id,
        cost: normalizedCost
      });

      return {
        success: true,
        transactionId,
        error: null,
        creditsBefore,
        creditsAfter,
        acquiredActors: preparedAcquisition.acquiredActors
      };
    } catch (error) {
      swseLogger.error('TransactionEngine: Mutation transaction failed', {
        transactionId,
        context: transactionContext,
        actor: freshActor?.id,
        error: error.message
      });

      // F-STO-001: rollback is claimed only when EVERYTHING the plan changed is verified undone. ActorEngine's transactional mode reports the
      // purchaser restore and the removal of created world actors (verified against the world registry); anything but FAILED_COMPENSATED means a
      // purchased actor and/or the purchaser's changes may remain, so the result is `indeterminate` (the store holds stock for it), never `rolledBack`.
      const planRollback = error?.rollback ?? null;
      const planCleanupUnverified = planRollback != null && planRollback.outcome !== 'FAILED_COMPENSATED';
      const unresolvedCreatedIds = planCleanupUnverified
        ? [...new Set([...(planRollback.created?.stillPresent ?? []), ...(planRollback.created?.unverifiable ?? [])])]
        : [];
      const unresolvedResult = () => ({
        success: false, transactionId, indeterminate: true, rollbackFailed: true,
        createdActorIds: unresolvedCreatedIds,
        rollbackEvidence: { outcome: planRollback?.outcome ?? null, compensation: planRollback?.compensation ?? null, reasons: planRollback?.reasons ?? [] },
        error: `Transaction failed (${error.message}) and could not be fully undone${unresolvedCreatedIds.length ? `: purchased actor(s) ${unresolvedCreatedIds.join(', ')} may still exist` : ''}. A GM must review before retrying.`
      });

      if (snapshotId) {
        const restore = await restoreVerified(freshActor, snapshotId);
        if (!restore.restored) {
          swseLogger.error('TransactionEngine: Rollback failed', { transactionId, snapshotId, error: restore.error?.message });
          return { success: false, transactionId, rollbackFailed: true, ...(planCleanupUnverified ? { indeterminate: true, createdActorIds: unresolvedCreatedIds } : {}), error: `Transaction failed and rollback failed: ${error.message}` };
        }
        if (planCleanupUnverified) {
          swseLogger.error('TransactionEngine: Rollback incomplete; created world actors could not be verified removed', { transactionId, createdActorIds: unresolvedCreatedIds, reasons: planRollback.reasons });
          return unresolvedResult();
        }
        swseLogger.info('TransactionEngine: Rollback successful', { transactionId, snapshotId });
        return { success: false, transactionId, rolledBack: true, error: error.message };
      }

      if (planCleanupUnverified) return unresolvedResult();
      return { success: false, transactionId, error: error.message };
    } finally {
      engine._mutationLocks.delete(lockKey);
    }
  }

export function prepareStoreAcquisitionPlans({ actor, plans = [], transactionId, transactionContext, audit = {}, source = '' } = {}) {
    const normalizedContext = String(transactionContext || '').toLowerCase();
    const isStoreAcquisition = normalizedContext === 'store-purchase'
      || normalizedContext === 'store-customization-checkout'
      || normalizedContext === 'store-custom-approval';

    if (!isStoreAcquisition || !actor || !Array.isArray(plans) || plans.length === 0) {
      return { plans, acquiredActors: [] };
    }

    const prepared = StoreAcquisitionService.prepareCreateActorPlans(plans, {
      ownerActor: actor,
      ownerUserId: audit.ownerPlayerId || audit.ownerUserId || audit.userId || null,
      transactionId,
      transactionContext,
      audit,
      source
    });

    const linkPlan = StoreAcquisitionService.buildOwnerLinkPlan(actor, prepared.createdSpecs, {
      ownerActor: actor,
      ownerUserId: audit.ownerPlayerId || audit.ownerUserId || audit.userId || null,
      transactionId,
      transactionContext,
      audit,
      source
    });

    const preparedPlans = linkPlan ? [...prepared.plans, linkPlan] : prepared.plans;
    return {
      plans: preparedPlans,
      acquiredActors: StoreAcquisitionService.summarizeAssetSpecs(prepared.createdSpecs, {
        ownerActor: actor,
        ownerUserId: audit.ownerPlayerId || audit.ownerUserId || audit.userId || null,
        transactionId,
        transactionContext,
        audit,
        source
      })
    };
  }

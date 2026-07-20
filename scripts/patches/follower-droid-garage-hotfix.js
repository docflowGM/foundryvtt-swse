import { CustomizationBayApp } from '/systems/foundryvtt-swse/scripts/apps/customization/customization-bay-app.js';
import { DroidCustomizationEngine } from '/systems/foundryvtt-swse/scripts/engine/customization/droid-customization-engine.js';
import { TransactionEngine } from '/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const REGISTERED = Symbol.for('swse.followerDroidGarage.registered.v1');
const APP_PATCHED = Symbol.for('swse.followerDroidGarage.appPatched.v1');
const ENGINE_PATCHED = Symbol.for('swse.followerDroidGarage.enginePatched.v1');
const TRANSACTION_PATCHED = Symbol.for('swse.followerDroidGarage.transactionPatched.v1');

function isFollowerDroid(actor) {
  if (!actor || actor.type !== 'npc') return false;
  const follower = actor.system?.isFollower === true
    || actor.system?.progression?.isFollower === true
    || actor.flags?.swse?.follower?.isFollower === true
    || actor.system?.npcProfile?.kind === 'follower';
  const droid = actor.system?.isDroid === true
    || actor.system?.progression?.droidConfig?.isDroid === true
    || actor.system?.progression?.followerChoices?.droidConfig?.isDroid === true
    || actor.flags?.['foundryvtt-swse']?.isDroid === true;
  return follower && droid;
}

function resolveWalletActor(assetActor) {
  if (!isFollowerDroid(assetActor)) return assetActor;
  const ownerId = assetActor.system?.npcProfile?.owner?.actorId
    || assetActor.flags?.swse?.follower?.ownerId
    || null;
  return ownerId ? game.actors?.get(ownerId) || assetActor : assetActor;
}

function makeDroidCompatibilityProxy(actor) {
  if (!isFollowerDroid(actor)) return actor;
  const wallet = resolveWalletActor(actor);
  return new Proxy(actor, {
    get(target, property, receiver) {
      if (property === 'type') return 'droid';
      if (property === 'system') {
        return {
          ...target.system,
          credits: Number(wallet?.system?.credits ?? target.system?.credits ?? 0) || 0,
          currency: wallet?.system?.currency || target.system?.currency,
          wealth: wallet?.system?.wealth || target.system?.wealth,
        };
      }
      const value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

async function createSnapshot(actor, label) {
  if (!actor) return null;
  try {
    const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
    return await SnapshotManager.createSnapshot(actor, label);
  } catch (err) {
    swseLogger.warn('[FollowerDroidGarage] Snapshot creation failed', { actor: actor?.name, error: err?.message });
    return null;
  }
}

async function restoreSnapshot(actor, snapshot) {
  if (!actor || !snapshot) return;
  const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
  await SnapshotManager.restoreSnapshot(actor, snapshot?.timestamp ?? snapshot);
}

function patchAssetCustomizationTransaction() {
  if (TransactionEngine[TRANSACTION_PATCHED]) return;

  const original = TransactionEngine.executeAssetCustomizationTransaction;
  TransactionEngine.executeAssetCustomizationTransaction = async function followerAssetCustomization(context = {}, options = {}) {
    const requestedAsset = context.assetActor || context.actor || null;
    const assetActor = requestedAsset?.id ? game.actors?.get(requestedAsset.id) || requestedAsset : requestedAsset;
    const walletActor = context.walletActor
      || (assetActor ? resolveWalletActor(assetActor) : null)
      || context.actor
      || null;

    if (!isFollowerDroid(assetActor) && typeof original === 'function') {
      return original.call(this, context, options);
    }
    if (!assetActor || !walletActor) return { success: false, error: 'Customization requires both an asset and a wallet actor.' };
    if (assetActor.isOwner === false || walletActor.isOwner === false) return { success: false, error: 'Insufficient permissions for customization.' };

    const cost = Math.max(0, Number(context.cost || 0));
    const resaleCredit = Math.max(0, Number(context.resaleCredit || 0));
    const netDebit = cost - resaleCredit;
    const creditsBefore = Number(walletActor.system?.credits ?? 0) || 0;
    const creditsAfter = creditsBefore - netDebit;
    if (creditsAfter < 0) {
      return { success: false, error: `Insufficient credits (have ${creditsBefore}, need ${netDebit})` };
    }

    const transactionId = `asset_tx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const walletSnapshot = await createSnapshot(walletActor, `Follower droid garage wallet ${transactionId}`);
    const assetSnapshot = assetActor.id === walletActor.id ? walletSnapshot : await createSnapshot(assetActor, `Follower droid garage asset ${transactionId}`);

    try {
      await ActorEngine.applyMutationPlan(assetActor, context.assetMutationPlan || {}, {
        validate: options.validate !== false,
        rederive: options.rederive !== false,
        source: options.source || 'FollowerDroidGarage.assetMutation',
      });

      const audit = {
        id: transactionId,
        context: context.transactionContext || 'owned-customization',
        type: netDebit >= 0 ? 'Buy' : 'Refund',
        status: 'Success',
        cost,
        resaleCredit,
        amount: -netDebit,
        creditsBefore,
        creditsAfter,
        createdAt: Date.now(),
        actorId: walletActor.id,
        actorName: walletActor.name,
        assetActorId: assetActor.id,
        assetActorName: assetActor.name,
        userId: game.user?.id || null,
        userName: game.user?.name || null,
        reason: context.reason || 'Follower droid customization',
        source: options.source || 'FollowerDroidGarage',
        audit: context.audit || {},
      };

      await ActorEngine.updateActor(walletActor, {
        'system.credits': creditsAfter,
        [`flags.foundryvtt-swse.transactions.${transactionId}`]: audit,
      }, { source: 'FollowerDroidGarage.walletMutation' });

      return { success: true, transactionId, creditsBefore, creditsAfter, assetActorId: assetActor.id };
    } catch (err) {
      try {
        await restoreSnapshot(assetActor, assetSnapshot);
        if (walletActor.id !== assetActor.id) await restoreSnapshot(walletActor, walletSnapshot);
      } catch (rollbackErr) {
        swseLogger.error('[FollowerDroidGarage] Rollback failed', { error: rollbackErr?.message });
        return { success: false, transactionId, error: `Customization failed and rollback failed: ${err.message}` };
      }
      return { success: false, transactionId, error: err?.message || String(err) };
    }
  };

  Object.defineProperty(TransactionEngine, TRANSACTION_PATCHED, { value: true });
}

function patchDroidCustomizationEngine() {
  if (DroidCustomizationEngine[ENGINE_PATCHED]) return;
  for (const methodName of ['getNormalizedDroidProfile', 'getAvailableSystems', 'previewDroidCustomization', 'applyDroidCustomization']) {
    const original = DroidCustomizationEngine[methodName];
    if (typeof original !== 'function') continue;
    DroidCustomizationEngine[methodName] = function followerDroidCompatibleEngine(actor, ...args) {
      return original.call(this, makeDroidCompatibilityProxy(actor), ...args);
    };
  }
  Object.defineProperty(DroidCustomizationEngine, ENGINE_PATCHED, { value: true });
}

function patchCustomizationBayApp() {
  const prototype = CustomizationBayApp?.prototype;
  if (!prototype || prototype[APP_PATCHED]) return;
  const originalPrepareContext = prototype._prepareContext;
  prototype._prepareContext = async function followerDroidGarageContext(options) {
    if (!isFollowerDroid(this.actor) || this.mode !== 'garage') {
      return originalPrepareContext.call(this, options);
    }
    const realActor = this.actor;
    this.actor = makeDroidCompatibilityProxy(realActor);
    try {
      const context = await originalPrepareContext.call(this, options);
      context.actor = realActor;
      context.actorMatchesMode = true;
      context.walletActor = resolveWalletActor(realActor);
      context.walletActorName = context.walletActor?.name || realActor.name;
      context.isFollowerDroid = true;
      return context;
    } finally {
      this.actor = realActor;
    }
  };
  Object.defineProperty(prototype, APP_PATCHED, { value: true });
}

export function registerFollowerDroidGarageHotfix() {
  if (globalThis[REGISTERED]) return;
  patchAssetCustomizationTransaction();
  patchDroidCustomizationEngine();
  patchCustomizationBayApp();
  Object.defineProperty(globalThis, REGISTERED, { value: true });
  swseLogger.log('[FollowerDroidGarage] Registered follower-droid garage compatibility and owner-wallet transactions');
}

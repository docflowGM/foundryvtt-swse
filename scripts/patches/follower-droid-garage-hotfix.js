import { CustomizationBayApp } from '/systems/foundryvtt-swse/scripts/apps/customization/customization-bay-app.js';
import { DroidCustomizationEngine } from '/systems/foundryvtt-swse/scripts/engine/customization/droid-customization-engine.js';
import { TransactionEngine } from '/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js';
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

    // TI-2: a follower droid is paid for from its OWNER's wallet; that is the ONLY thing this patch adds. The charge, the asset change, the audit record,
    // recovery (refused unless established), the honest restore outcome and the credit verification are the commerce authority's own — this patch
    // used to carry a second implementation that wrote the asset first, charged an absolute balance afterwards and ignored a failed restore.
    // executeAssetCustomizationTransaction natively supports wallet !== asset.
    return original.call(this, { ...context, actor: walletActor, assetActor }, options);
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

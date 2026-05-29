import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";
import { StoreEngine } from "/systems/foundryvtt-swse/scripts/engine/store/store-engine.js";
import { GameSessionStore } from "/systems/foundryvtt-swse/scripts/games/game-session-store.js";
import { GameCreditEscrowService } from "/systems/foundryvtt-swse/scripts/games/wagers/game-credit-escrow-service.js";

/**
 * GMApprovalOperationsService
 *
 * Orchestrates GM approval decisions for the Approvals surface while keeping
 * credits, purchases, assets, and game payouts inside their existing SSOTs:
 * TransactionEngine, StoreEngine, ActorEngine, and GameCreditEscrowService.
 */
export class GMApprovalOperationsService {
  static parseApprovalKey(key) {
    const [kind, rawId] = String(key || '').split(':');
    if (kind === 'droid' && rawId) return { kind, actorId: rawId };
    if (kind === 'custom') return { kind, index: Number(rawId) };
    if (kind === 'game' && rawId) return { kind, sessionId: rawId };
    return { kind: null, index: -1, actorId: null, sessionId: null };
  }

  static async approveRequest(host, key, options = {}) {
    const parsed = this.parseApprovalKey(key);
    if (parsed.kind === 'droid') return this.approveDroid(host, parsed.actorId);
    if (parsed.kind === 'custom') return this.approvePendingCustom(host, parsed.index);
    if (parsed.kind === 'game') return this.approveGameSettlement(host, parsed.sessionId, options);
    ui?.notifications?.error?.('Invalid approval request.');
    return false;
  }

  static async finalizeWithEdits(host, key, formData) {
    try {
      const parsed = this.parseApprovalKey(key);
      if (parsed.kind === 'game') {
        const data = formData ? new FormData(formData) : new FormData();
        const approvedPayout = this._approvalNumberValue(data.get('approvedPayout'));
        const reason = String(data.get('metadata.gmSettlementReason') ?? '').trim();
        await this.approveRequest(host, key, { payoutAmount: approvedPayout, reason, decision: 'custom' });
        return true;
      }
      await this.applyInlineApprovalEdits(host, key, formData);
      return this.approveRequest(host, key);
    } catch (err) {
      SWSELogger.error('[GMApprovalOperationsService] Error finalizing approval edits:', err);
      ui?.notifications?.error?.(`Failed to finalize approval: ${err.message}`);
      return false;
    }
  }

  static async denyRequest(host, key, reason = '') {
    const parsed = this.parseApprovalKey(key);
    if (parsed.kind === 'droid') return this.rejectDroid(host, parsed.actorId, reason);
    if (parsed.kind === 'custom') return this.denyPendingCustom(host, parsed.index, reason);
    if (parsed.kind === 'game') return this.denyGameSettlement(host, parsed.sessionId, reason);
    ui?.notifications?.error?.('Invalid approval request.');
    return false;
  }

  static async previewPendingCustom(host, index) {
    if (index < 0 || index >= (host?.storeApprovals?.length ?? 0)) {
      ui?.notifications?.error?.('Invalid approval index');
      return false;
    }

    const approval = host.storeApprovals[index];
    const actor = game.actors.get(approval.draftActorId) ?? game.actors.get(approval.ownerActorId);
    if (actor) actor.sheet.render(true);
    return true;
  }

  static async editPendingCustom(host, index) {
    host.selectedApprovalKey = `custom:${index}`;
    host.approvalEditMode = true;
    host.approvalDenyMode = false;
    await host.render(false);
    return true;
  }



  static resolveDroidOwnerActor(droidActor) {
    if (!droidActor) return null;
    const droidSystems = droidActor.system?.droidSystems ?? {};
    const system = droidActor.system ?? {};
    const flags = droidActor.flags ?? {};
    const swseFlags = flags['foundryvtt-swse'] ?? flags.swse ?? {};
    const storeFlags = swseFlags.storeAcquisition ?? flags.storeAcquisition ?? {};
    const pendingFlags = swseFlags.pendingApproval ?? flags.pendingApproval ?? {};
    const candidates = [
      droidSystems.ownerActorId,
      droidSystems.requestedByActorId,
      droidSystems.builtForActorId,
      droidSystems.createdForActorId,
      system.ownedByActorId,
      system.ownerActorId,
      system.storeAcquisition?.requestedByActorId,
      system.storeAcquisition?.ownerActorId,
      storeFlags.ownerActorId,
      storeFlags.requestedByActorId,
      pendingFlags.ownerActorId,
      pendingFlags.requestedByActorId,
      swseFlags.ownerActorId,
      swseFlags.requestedByActorId
    ].filter(Boolean);

    for (const id of candidates) {
      const owner = game.actors?.get?.(String(id));
      if (owner && owner.id !== droidActor.id) return owner;
    }

    const ownerUserId = swseFlags.ownerPlayerId ?? storeFlags.ownerUserId ?? system.storeAcquisition?.ownerUserId ?? null;
    if (ownerUserId) {
      const ownerUser = game.users?.get?.(ownerUserId) ?? Array.from(game.users ?? []).find((user) => user?.id === ownerUserId);
      if (ownerUser?.character && ownerUser.character.id !== droidActor.id) return ownerUser.character;
    }

    const playerOwner = Array.from(game.users ?? []).find((user) => !user?.isGM && Number(droidActor.ownership?.[user.id] ?? 0) >= 3 && user.character?.id && user.character.id !== droidActor.id);
    return playerOwner?.character ?? null;
  }

  static async approveDroid(host, actorId) {
    const actor = game.actors.get(actorId);
    if (!actor) {
      ui?.notifications?.error?.('Actor not found');
      return false;
    }

    const droidData = actor.system?.droidSystems;
    if (droidData?.stateMode !== 'PENDING') {
      ui?.notifications?.warn?.('This droid is not pending approval');
      return false;
    }

    const cost = normalizeCredits(droidData.credits?.spent || droidData.totalCost || 0);
    const ownerActor = this.resolveDroidOwnerActor(actor);
    if (!ownerActor) {
      ui?.notifications?.error?.(`Cannot approve ${actor.name}: no owning character actor could be resolved for the credit charge.`);
      return false;
    }

    try {
      let transactionId = null;
      if (cost > 0) {
        const creditResult = await TransactionEngine.executeCreditAdjustment({
          actor: ownerActor,
          amount: -cost,
          reason: `GM approved pending droid build: ${actor.name}`,
          transactionContext: 'store-custom-approval',
          audit: {
            approvalType: 'droid',
            itemName: actor.name,
            itemNames: [actor.name],
            itemCount: 1,
            ownerActorId: ownerActor.id,
            ownerActorName: ownerActor.name,
            draftActorId: actor.id,
            source: 'GM Datapad - Pending Droid Approval'
          }
        }, {
          source: 'GMApprovalOperationsService.approveDroid',
          validate: true,
          rederive: true
        });
        if (!creditResult.success) {
          ui?.notifications?.error?.(`Failed to approve droid credits from ${ownerActor.name}: ${creditResult.error}`);
          return false;
        }
        transactionId = creditResult.transactionId ?? null;
      }

      await ActorEngine.updateActor(actor, {
        'system.droidSystems.stateMode': 'FINALIZED',
        'system.ownedByActorId': ownerActor.id,
        'system.ownedByActorName': ownerActor.name
      });
      const buildHistory = Array.isArray(droidData.buildHistory) ? [...droidData.buildHistory] : [];
      buildHistory.push({
        timestamp: Date.now(),
        action: 'approved',
        approvedAt: new Date().toLocaleString(),
        ownerActorId: ownerActor.id,
        ownerActorName: ownerActor.name,
        transactionId
      });
      await ActorEngine.updateActor(actor, { 'system.droidSystems.buildHistory': buildHistory });

      Hooks.call('swseApprovalResolved', {
        approval: { id: `droid-${actor.id}`, type: 'droid', draftData: { name: actor.name } },
        actor,
        decision: 'approved',
        decidedBy: game.user?.name ?? 'GM'
      });

      await this._resetApprovalState(host);
      ui?.notifications?.info?.(`Droid "${actor.name}" approved for ${ownerActor.name}`);
      return true;
    } catch (err) {
      SWSELogger.error('[GMApprovalOperationsService] Error approving droid:', err);
      ui?.notifications?.error?.(`Failed to approve droid: ${err.message}`);
      return false;
    }
  }

  static async rejectDroid(host, actorId, reason = '') {
    const actor = game.actors.get(actorId);
    if (!actor) {
      ui?.notifications?.error?.('Actor not found');
      return false;
    }

    const droidData = actor.system?.droidSystems;
    if (droidData?.stateMode !== 'PENDING') {
      ui?.notifications?.warn?.('This droid is not pending approval');
      return false;
    }

    try {
      await ActorEngine.updateActor(actor, { 'system.droidSystems.stateMode': 'REJECTED' });
      const buildHistory = Array.isArray(droidData.buildHistory) ? [...droidData.buildHistory] : [];
      buildHistory.push({
        timestamp: Date.now(),
        action: 'rejected',
        rejectedAt: new Date().toLocaleString(),
        reason
      });
      await ActorEngine.updateActor(actor, { 'system.droidSystems.buildHistory': buildHistory });

      Hooks.call('swseApprovalResolved', {
        approval: { id: `droid-${actor.id}`, type: 'droid', draftData: { name: actor.name } },
        actor,
        decision: 'denied',
        decidedBy: game.user?.name ?? 'GM',
        reason
      });

      await this._resetApprovalState(host);
      ui?.notifications?.info?.(`Droid "${actor.name}" rejected${reason ? ` — ${reason}` : ''}`);
      return true;
    } catch (err) {
      SWSELogger.error('[GMApprovalOperationsService] Error rejecting droid:', err);
      ui?.notifications?.error?.(`Failed to reject droid: ${err.message}`);
      return false;
    }
  }

  static async approveGameSettlement(host, sessionId, { payoutAmount = null, reason = '', decision = 'recommended' } = {}) {
    const session = GameSessionStore.getSession(sessionId);
    if (!session) {
      ui?.notifications?.error?.('Game settlement session not found.');
      return false;
    }

    const credits = session.escrow?.credits ?? {};
    const recommended = credits.payoutMode === 'table-credit-balances'
      ? Number(credits.payoutRequested ?? Object.values(credits.payoutBalances ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0))
      : Number(credits.policy?.recommendedPayout ?? credits.payoutApproved ?? credits.payoutRequested ?? credits.pot ?? 0);
    const approved = payoutAmount === null || payoutAmount === undefined ? recommended : Number(payoutAmount);

    const result = await GameCreditEscrowService.approvePendingSettlement(session, {
      payoutAmount: Number.isFinite(approved) ? Math.max(0, Math.floor(approved)) : 0,
      decision,
      reason,
      by: game.user?.id ?? null
    });
    if (!result?.ok) {
      ui?.notifications?.error?.(result?.error || 'Game settlement approval failed.');
      return false;
    }

    await this._resetApprovalState(host);
    ui?.notifications?.info?.('Game settlement approved.');
    return true;
  }

  static async denyGameSettlement(host, sessionId, reason = '') {
    const session = GameSessionStore.getSession(sessionId);
    if (!session) {
      ui?.notifications?.error?.('Game settlement session not found.');
      return false;
    }

    const result = await GameCreditEscrowService.approvePendingSettlement(session, {
      payoutAmount: 0,
      decision: 'denied',
      reason: String(reason || '').trim() || 'GM denied the game payout settlement.',
      by: game.user?.id ?? null
    });
    if (!result?.ok) {
      ui?.notifications?.error?.(result?.error || 'Game settlement denial failed.');
      return false;
    }

    await this._resetApprovalState(host);
    ui?.notifications?.info?.('Game settlement denied.');
    return true;
  }

  static async applyInlineApprovalEdits(_host, key, formData) {
    const parsed = this.parseApprovalKey(key);
    const edits = this._collectInlineApprovalEdits(formData);
    if (!edits.hasChanges) return false;

    if (parsed.kind === 'game') return false;

    if (parsed.kind === 'droid') {
      const actor = game.actors.get(parsed.actorId);
      if (!actor) throw new Error('Droid actor not found.');

      const actorUpdates = { ...edits.actorUpdates };
      if (!('system.droidSystems.credits.spent' in actorUpdates) && 'costCredits' in edits.approvalUpdates) {
        actorUpdates['system.droidSystems.credits.spent'] = edits.approvalUpdates.costCredits;
        actorUpdates['system.droidSystems.totalCost'] = edits.approvalUpdates.costCredits;
      }
      if (Object.keys(actorUpdates).length) await ActorEngine.updateActor(actor, actorUpdates);

      const gmNotes = edits.metadataUpdates['metadata.gmNotes'];
      const systemsSummary = edits.metadataUpdates['metadata.systemsSummary'];
      if (gmNotes || systemsSummary) {
        await actor.setFlag('foundryvtt-swse', 'gmApprovalNotes', {
          notes: gmNotes || '',
          systemsSummary: systemsSummary || '',
          updatedAt: Date.now(),
          updatedBy: game.user?.id ?? null
        });
      }
      return true;
    }

    if (parsed.kind === 'custom') {
      const approvals = SettingsHelper.getArray('pendingCustomPurchases', []);
      const approval = approvals[parsed.index];
      if (!approval) throw new Error('Pending approval not found.');

      for (const [path, value] of Object.entries(edits.approvalUpdates)) this._setNestedValue(approval, path, value);
      for (const [path, value] of Object.entries(edits.metadataUpdates)) this._setNestedValue(approval, path, value);

      const draftActor = game.actors.get(approval.draftActorId);
      const actorUpdates = { ...edits.actorUpdates };
      if (draftActor?.system?.droidSystems && 'costCredits' in edits.approvalUpdates) {
        actorUpdates['system.droidSystems.credits.spent'] = edits.approvalUpdates.costCredits;
        actorUpdates['system.droidSystems.totalCost'] = edits.approvalUpdates.costCredits;
      }
      if (draftActor && Object.keys(actorUpdates).length) await ActorEngine.updateActor(draftActor, actorUpdates);

      approvals[parsed.index] = approval;
      await SettingsHelper.set('pendingCustomPurchases', approvals);
      return true;
    }

    return false;
  }

  static async approvePendingCustom(host, index) {
    const approvals = SettingsHelper.getArray('pendingCustomPurchases', []);
    if (index < 0 || index >= approvals.length) {
      ui?.notifications?.error?.('Invalid approval index');
      return false;
    }

    const approval = approvals[index];
    const ownerActor = game.actors.get(approval.ownerActorId);
    const draftActor = game.actors.get(approval.draftActorId);

    if (!ownerActor) {
      ui?.notifications?.error?.('Owner actor not found');
      return false;
    }

    if (approval.type === 'store-item' || approval.approvalKind === 'store-policy-item') {
      return this._approveStoreItemPurchase(host, index, approval, ownerActor);
    }

    if (!draftActor) {
      ui?.notifications?.error?.('Draft asset actor not found');
      return false;
    }

    const cost = normalizeCredits(approval.costCredits ?? 0);
    const assetName = approval.draftData?.name ?? draftActor.name ?? 'Custom asset';

    try {
      const approvalResult = await TransactionEngine.executeAssetApprovalTransaction({
        actor: ownerActor,
        assetActor: draftActor,
        cost,
        reason: `GM approved ${approval.type || draftActor.type || 'custom'} acquisition`,
        transactionContext: 'store-custom-approval',
        audit: {
          approvalId: approval.id ?? null,
          approvalType: approval.type ?? draftActor.type,
          draftActorId: approval.draftActorId,
          itemName: assetName,
          itemNames: [assetName],
          itemCount: 1,
          source: `GM Datapad - Custom ${approval.type === 'droid' ? 'Droid' : 'Ship/Vehicle'} Approval`,
          gmNotes: approval.metadata?.gmNotes ?? '',
          ownerPlayerId: approval.ownerPlayerId ?? null,
          edited: !!approval.metadata?.gmNotes
        }
      }, {
        source: 'GMApprovalOperationsService.approvePendingCustom',
        validate: true,
        rederive: true
      });

      if (!approvalResult.success) {
        ui?.notifications?.error?.(`Failed to approve: ${approvalResult.error}`);
        return false;
      }

      const history = ownerActor.getFlag('foundryvtt-swse', 'purchaseHistory') || [];
      const purchase = {
        timestamp: Date.now(),
        items: [],
        droids: draftActor.type === 'droid' ? [{ id: draftActor.id, name: assetName, cost }] : [],
        vehicles: draftActor.type === 'vehicle' ? [{ id: draftActor.id, name: assetName, cost }] : [],
        total: cost,
        transactionId: approvalResult.transactionId ?? null,
        source: `GM Datapad - Custom ${draftActor.type === 'droid' ? 'Droid' : 'Ship/Vehicle'} Approval`,
        gmNotes: approval.metadata?.gmNotes ?? '',
        compatibilityMirror: true
      };
      history.push(purchase);
      await ActorEngine.updateActor(ownerActor, {
        'flags.foundryvtt-swse.purchaseHistory': history
      }, {
        source: 'GMApprovalOperationsService.approvePendingCustom.purchaseHistoryMirror',
        skipValidation: true
      });

      approvals.splice(index, 1);
      await SettingsHelper.set('pendingCustomPurchases', approvals);

      Hooks.call('swseCustomPurchaseApproved', {
        approval,
        actor: ownerActor,
        draftActor,
        transactionId: approvalResult.transactionId,
        decidedBy: game.user?.name ?? 'GM',
        edited: !!approval.metadata?.gmNotes
      });

      await this._resetApprovalState(host);
      ui?.notifications?.info?.(`Approved: ${assetName}`);
      return true;
    } catch (err) {
      SWSELogger.error('[GMApprovalOperationsService] Error approving custom purchase:', err);
      ui?.notifications?.error?.(`Failed to approve: ${err.message}`);
      return false;
    }
  }

  static async denyPendingCustom(host, index, reason = '') {
    const approvals = SettingsHelper.getArray('pendingCustomPurchases', []);
    if (index < 0 || index >= approvals.length) {
      ui?.notifications?.error?.('Invalid approval index');
      return false;
    }

    try {
      const denial = approvals[index];
      const ownerActor = game.actors.get(denial.ownerActorId);
      const draftActor = game.actors.get(denial.draftActorId);

      if (draftActor) await draftActor.delete();

      approvals.splice(index, 1);
      await SettingsHelper.set('pendingCustomPurchases', approvals);

      Hooks.call('swseCustomPurchaseDenied', {
        approval: denial,
        actor: ownerActor,
        decidedBy: game.user?.name ?? 'GM',
        reason
      });

      await this._resetApprovalState(host);
      ui?.notifications?.info?.(`Denied: ${denial.draftData?.name ?? 'Custom asset'}${reason ? ` — ${reason}` : ''}`);
      return true;
    } catch (err) {
      SWSELogger.error('[GMApprovalOperationsService] Error denying custom purchase:', err);
      ui?.notifications?.error?.(`Failed to deny: ${err.message}`);
      return false;
    }
  }

  static async _approveStoreItemPurchase(host, index, approval, ownerActor) {
    const cost = normalizeCredits(approval.costCredits ?? 0);
    const approvalItems = Array.isArray(approval.approvalItems) ? approval.approvalItems : [];
    if (!approvalItems.length) {
      ui?.notifications?.error?.('No store item payload is recorded for this approval.');
      return false;
    }

    const purchaseItems = approvalItems.map(item => ({
      id: item.id || item.policyId || null,
      policyId: item.policyId || item.id || null,
      name: item.name || 'Store item',
      type: item.type || 'item',
      finalCost: normalizeCredits(item.finalCost ?? item.cost ?? 0),
      cost: normalizeCredits(item.cost ?? item.finalCost ?? 0),
      condition: item.condition || null
    }));
    const pricedTotal = purchaseItems.reduce((sum, item) => sum + normalizeCredits(item.finalCost ?? item.cost ?? 0), 0);
    if (purchaseItems.length && pricedTotal !== cost) {
      const delta = cost - pricedTotal;
      purchaseItems[0].finalCost = Math.max(0, normalizeCredits(purchaseItems[0].finalCost + delta));
      purchaseItems[0].cost = purchaseItems[0].finalCost;
    }

    const result = await StoreEngine.purchase({
      actor: ownerActor,
      items: purchaseItems,
      totalCost: cost,
      transactionContext: 'store-purchase',
      itemGrantCallback: async () => this._buildStoreItemApprovalMutationPlans(approval)
    });

    if (!result.success) {
      ui?.notifications?.error?.(`Failed to approve store purchase: ${result.error}`);
      return false;
    }

    const approvals = SettingsHelper.getArray('pendingCustomPurchases', []);
    approvals.splice(index, 1);
    await SettingsHelper.set('pendingCustomPurchases', approvals);

    Hooks.call('swseCustomPurchaseApproved', {
      approval,
      actor: ownerActor,
      draftActor: null,
      transactionId: result.transactionId,
      decidedBy: game.user?.name ?? 'GM',
      edited: !!approval.metadata?.gmNotes
    });

    await this._resetApprovalState(host);
    ui?.notifications?.info?.(`Approved: ${approval.draftData?.name ?? 'Store purchase'}`);
    return true;
  }

  static async _buildStoreItemApprovalMutationPlans(approval = {}) {
    const items = Array.isArray(approval.approvalItems) ? approval.approvalItems : [];
    const plans = [];
    const itemData = [];

    for (const item of items) {
      const type = String(item?.type || '').toLowerCase();
      const sourceBucket = String(item?.sourceBucket || '').toLowerCase();
      const data = this._stripApprovalDocumentIdentity(item?.itemData || { name: item?.name || 'Store item', type: item?.type || 'equipment', img: item?.img, system: {} });

      if (type === 'droid' || sourceBucket === 'droids') {
        const { DroidFactory } = await import('/systems/foundryvtt-swse/scripts/engine/droids/droid-factory.js');
        plans.push(DroidFactory.buildMutationPlan({ droidActor: data, name: item?.name || data.name }));
        continue;
      }

      if (type === 'vehicle' || sourceBucket === 'vehicles') {
        const { VehicleFactory } = await import('/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-factory.js');
        plans.push(VehicleFactory.buildMutationPlan({ template: data, condition: item?.condition || 'new' }));
        continue;
      }

      itemData.push(data);
    }

    if (itemData.length) plans.push({ add: { items: itemData } });
    return plans;
  }

  static _collectInlineApprovalEdits(formOrData) {
    const edits = {
      actorUpdates: {},
      approvalUpdates: {},
      metadataUpdates: {},
      hasChanges: false
    };

    const fields = formOrData?.querySelectorAll
      ? Array.from(formOrData.querySelectorAll('[data-approval-edit-field]'))
      : [];

    const entries = fields.length
      ? fields
        .map(field => ({
          name: field.name,
          value: field.value,
          original: field.dataset.original ?? ''
        }))
        .filter(entry => String(entry.value ?? '').trim() !== String(entry.original ?? '').trim())
      : Array.from(formOrData?.entries?.() ?? []).map(([name, value]) => ({ name, value, original: null }));

    for (const entry of entries) {
      const name = String(entry.name || '').trim();
      const rawValue = entry.value;
      if (!name || name === 'denialReason') continue;
      const value = this._approvalInputValue(name, rawValue);
      edits.hasChanges = true;

      if (name === 'name') {
        edits.actorUpdates.name = String(rawValue ?? '').trim() || 'Unnamed Asset';
        edits.approvalUpdates['draftData.name'] = edits.actorUpdates.name;
        continue;
      }

      if (name === 'costCredits') {
        edits.approvalUpdates.costCredits = this._approvalNumberValue(rawValue) ?? 0;
        continue;
      }

      if (name.startsWith('system.')) {
        edits.actorUpdates[name] = value;
        if (name === 'system.shields.rating') edits.actorUpdates['system.shieldRating'] = value;
        continue;
      }

      if (name.startsWith('metadata.')) {
        edits.metadataUpdates[name] = String(rawValue ?? '').trim();
      }
    }

    return edits;
  }

  static _approvalNumberValue(value) {
    const normalized = String(value ?? '').trim();
    if (!normalized) return null;
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : null;
  }

  static _approvalInputValue(name, value) {
    if (/credits|cost|hp|max|value|rating|damageReduction|total|misc|base/i.test(name)) {
      const numeric = this._approvalNumberValue(value);
      return numeric ?? value;
    }
    return value;
  }

  static _setNestedValue(target, path, value) {
    if (!target || !path) return;
    if (globalThis.foundry?.utils?.setProperty) {
      foundry.utils.setProperty(target, path, value);
      return;
    }
    const keys = String(path).split('.').filter(Boolean);
    const finalKey = keys.pop();
    let cursor = target;
    for (const key of keys) {
      cursor[key] ??= {};
      cursor = cursor[key];
    }
    if (finalKey) cursor[finalKey] = value;
  }

  static _cloneApprovalPayload(value) {
    if (value === undefined || value === null) return value;
    if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
    try { return structuredClone(value); } catch (_err) { return JSON.parse(JSON.stringify(value)); }
  }

  static _stripApprovalDocumentIdentity(data = {}) {
    const clone = this._cloneApprovalPayload(data) || {};
    delete clone._id;
    delete clone.id;
    return clone;
  }

  static async _resetApprovalState(host) {
    host.selectedApprovalKey = null;
    host.approvalEditMode = false;
    host.approvalDenyMode = false;
    await host.render(false);
  }
}

export default GMApprovalOperationsService;

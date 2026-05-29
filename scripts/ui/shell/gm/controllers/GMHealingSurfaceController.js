/**
 * GMHealingSurfaceController
 *
 * Owns GM Combat & Recovery surface wiring. All mutations flow through
 * GMCombatRecoveryService so droid/rest boundaries and existing recovery
 * authorities remain centralized.
 */

import { GMCombatRecoveryService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-combat-recovery-service.js';
import { GMHealingTrigger } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-healing-trigger.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

function numberOrNull(value) {
  if (value === '' || value === undefined || value === null) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function positiveNumber(value, fallback = 0) {
  const numeric = numberOrNull(value);
  return numeric === null ? fallback : Math.max(0, numeric);
}

export class GMHealingSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.querySelector('.gm-datapad-healing');
    if (!pageElement) return;

    this._wireSelectionControls(pageElement, signal);
    this._wireGroupActions(pageElement, signal);
    this._wireActorActions(pageElement, signal);
    this._refreshSelectedCount(pageElement);
  }

  _wireSelectionControls(pageElement, signal) {
    pageElement.querySelectorAll('input[name="combatRecoveryActorTarget"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => this._refreshSelectedCount(pageElement), { signal });
    });

    pageElement.querySelectorAll('[data-combat-target-select]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        this._selectTargets(pageElement, button.dataset.combatTargetSelect);
      }, { signal });
    });
  }

  _wireGroupActions(pageElement, signal) {
    pageElement.querySelectorAll('[data-combat-recovery-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const action = button.dataset.combatRecoveryAction;
        if (!action) return;
        await this._runGroupAction(pageElement, action, button);
      }, { signal });
    });
  }

  _wireActorActions(pageElement, signal) {
    pageElement.querySelectorAll('[data-combat-actor-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const action = button.dataset.combatActorAction;
        const actorId = button.dataset.actorId;
        if (!action || !actorId) return;
        await this._runActorAction(pageElement, actorId, action, button);
      }, { signal });
    });
  }

  _selectTargets(pageElement, mode) {
    const checkboxes = Array.from(pageElement.querySelectorAll('input[name="combatRecoveryActorTarget"]'));
    for (const checkbox of checkboxes) {
      switch (mode) {
        case 'party':
          checkbox.checked = checkbox.dataset.partyActor === 'true';
          break;
        case 'attention':
          checkbox.checked = checkbox.dataset.needsAttention === 'true';
          break;
        case 'combat':
          checkbox.checked = checkbox.dataset.inCombat === 'true';
          break;
        case 'all':
          checkbox.checked = true;
          break;
        case 'clear':
          checkbox.checked = false;
          break;
        default:
          break;
      }
    }

    if (mode && mode !== 'clear') {
      const targetSelect = pageElement.querySelector('select[name="combatRecoveryTargetMode"]');
      if (targetSelect) targetSelect.value = 'selected';
    }
    this._refreshSelectedCount(pageElement);
  }

  _refreshSelectedCount(pageElement) {
    const count = pageElement.querySelectorAll('input[name="combatRecoveryActorTarget"]:checked').length;
    pageElement.querySelectorAll('[data-combat-selected-count]').forEach((node) => { node.textContent = String(count); });
    const selectedOption = pageElement.querySelector('select[name="combatRecoveryTargetMode"] option[value="selected"]');
    if (selectedOption) selectedOption.textContent = `Checked Actors (${count})`;
  }

  _selectedActorIds(pageElement) {
    return Array.from(pageElement.querySelectorAll('input[name="combatRecoveryActorTarget"]:checked'))
      .map((input) => input.value)
      .filter(Boolean);
  }

  _targetMode(pageElement) {
    const raw = pageElement.querySelector('select[name="combatRecoveryTargetMode"]')?.value || 'party';
    if (raw === 'active-combat') return 'active-combat';
    if (raw === 'all-managed') return 'all-managed';
    if (raw === 'selected') return 'selected';
    return 'party';
  }

  _groupOptions(pageElement) {
    return {
      targetMode: this._targetMode(pageElement),
      actorIds: this._selectedActorIds(pageElement),
      amount: positiveNumber(pageElement.querySelector('[name="combatRecoveryGroupAmount"]')?.value, 0),
      rollTotal: numberOrNull(pageElement.querySelector('[name="combatRecoveryRollTotal"]')?.value),
      dc: numberOrNull(pageElement.querySelector('[name="combatRecoveryDc"]')?.value),
      workflow: pageElement.querySelector('[name="combatRecoveryTreatWorkflow"]')?.value || 'first-aid',
      repairWorkflow: pageElement.querySelector('[name="combatRecoveryRepairWorkflow"]')?.value || 'field-repair',
      effectId: pageElement.querySelector('[name="combatRecoveryStatusEffect"]')?.value || '',
      poisonKey: pageElement.querySelector('[name="combatRecoveryPoisonKey"]')?.value || '',
      ongoingEffectType: pageElement.querySelector('[name="combatRecoveryOngoingType"]')?.value || 'custom',
      ongoingEffectLabel: pageElement.querySelector('[name="combatRecoveryOngoingLabel"]')?.value || '',
      ongoingEffectMemo: pageElement.querySelector('[name="combatRecoveryOngoingLabel"]')?.value || '',
      ongoingDurationScope: pageElement.querySelector('[name="combatRecoveryOngoingDuration"]')?.value || 'encounter'
    };
  }

  _actorOptions(card) {
    return {
      amount: positiveNumber(card.querySelector('[name="recoveryAmount"]')?.value, 0),
      rollTotal: numberOrNull(card.querySelector('[name="actorRecoveryRollTotal"]')?.value),
      dc: numberOrNull(card.querySelector('[name="actorRecoveryDc"]')?.value),
      effectId: card.querySelector('[name="actorStatusEffect"]')?.value || '',
      workflow: card.querySelector('[name="actorWorkflow"]')?.value || '',
      poisonKey: card.querySelector('[name="actorPoisonKey"]')?.value || '',
      ongoingEffectType: card.querySelector('[name="actorOngoingType"]')?.value || 'custom',
      ongoingEffectLabel: card.querySelector('[name="actorOngoingLabel"]')?.value || '',
      ongoingEffectMemo: card.querySelector('[name="actorOngoingMemo"]')?.value || '',
      ongoingDurationScope: card.querySelector('[name="actorOngoingDuration"]')?.value || 'encounter'
    };
  }

  _normalizeGroupActionOptions(action, options) {
    if (action === 'repair-skill') return { ...options, workflow: options.repairWorkflow || 'field-repair' };
    return options;
  }

  async _runGroupAction(pageElement, action, button) {
    try {
      button.disabled = true;
      const options = this._normalizeGroupActionOptions(action, this._groupOptions(pageElement));
      const result = await GMCombatRecoveryService.executeGroupAction(action, options);
      await this._handleResult(result, `[GMHealingSurfaceController] Group action ${action} failed:`);
    } catch (err) {
      SWSELogger.error(`[GMHealingSurfaceController] Error running group action ${action}:`, err);
      ui?.notifications?.error?.(`Combat recovery failed: ${err.message}`);
    } finally {
      button.disabled = false;
    }
  }

  async _runActorAction(pageElement, actorId, action, button) {
    try {
      button.disabled = true;
      const card = button.closest('[data-combat-actor-card]') || pageElement.querySelector(`[data-combat-actor-card][data-actor-id="${actorId}"]`);
      const result = await GMCombatRecoveryService.executeActorAction(actorId, action, this._actorOptions(card || pageElement));
      await this._handleResult(result, `[GMHealingSurfaceController] Actor action ${action} failed:`);
    } catch (err) {
      SWSELogger.error(`[GMHealingSurfaceController] Error running actor action ${action}:`, err);
      ui?.notifications?.error?.(`Combat recovery failed: ${err.message}`);
    } finally {
      button.disabled = false;
    }
  }

  async _handleResult(result, logPrefix) {
    if (result?.success === false) {
      SWSELogger.warn(logPrefix, result);
      ui?.notifications?.error?.(result.error || result.message || 'Combat recovery action failed.');
      return false;
    }

    ui?.notifications?.info?.(result?.message || 'Combat recovery action complete.');
    await this.host?.render?.(false);
    return true;
  }

  /** Legacy natural-healing trigger retained for older template fragments. */
  async _triggerNaturalHealing() {
    try {
      const result = await GMHealingTrigger.triggerNaturalHealing({ isFullRest: true, skipHolonetNotification: false });
      if (result.success) {
        ui?.notifications?.info?.(`Natural healing triggered: ${result.totalHealed} actors healed, ${result.totalSkipped} skipped`);
        SWSELogger.info('[GMHealingSurfaceController] Natural healing triggered:', result);
        await this.host?.render?.(false);
      } else {
        ui?.notifications?.error?.(`Failed to trigger healing: ${result.error}`);
      }
    } catch (err) {
      SWSELogger.error('[GMHealingSurfaceController] Error triggering natural healing:', err);
      ui?.notifications?.error?.(`Error: ${err.message}`);
    }
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
  }
}

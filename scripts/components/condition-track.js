/**
 * SWSE Condition Track Sheet Component (Updated for RAW + New CT System)
 * - Correct CT penalties
 * - Persistent condition restrictions
 * - Consistent with ActorEngine condition mutations
 * - UI safely triggers CT updates without breaking Active Effects
 *
 * PHASE 7: All mutations routed through ActorEngine for atomic governance
 */
import { escapeHTML } from "/systems/foundryvtt-swse/scripts/utils/security-utils.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ConditionTrackRules } from "/systems/foundryvtt-swse/scripts/engine/combat/ConditionTrackRules.js";
import { ConditionTrackFeatActions } from "/systems/foundryvtt-swse/scripts/engine/feats/condition-track-feat-actions.js";

export class ConditionTrackComponent {

  /* ---------------------------------------- */
  /* Public Render API                        */
  /* ---------------------------------------- */

  static render(actor, container) {
    container.innerHTML = this._template(actor);
    this._activate(container, actor);
  }

  static refresh(actor, container) {
    this.render(actor, container);
  }

  /* ---------------------------------------- */
  /* Template                                 */
  /* ---------------------------------------- */

  static _template(actor) {
    const current = actor.system.conditionTrack.current ?? 0;
    const persistent = actor.system.conditionTrack.persistent ?? false;
    const shakeItOff = ConditionTrackFeatActions.canShakeItOff(actor);
    const quickComeback = ConditionTrackFeatActions.canQuickComeback(actor);
    const recover = ConditionTrackFeatActions.canRecover(actor);

    const steps = this._defineSteps();
    const penaltyText = steps[current]?.penalty || '';

    return `
      <div class="swse-condition-track">

        ${this._headerHTML(persistent)}

        <div class="ct-track">
          ${steps.map(step => this._stepHTML(step, current)).join('')}
        </div>

        <div class="ct-controls">
          <button class="ct-btn improve" data-ct="improve" ${recover.allowed ? '' : 'disabled'} title="Recover Action: spend 3 Swift Actions total to move +1 step">
            <i class="fa-solid fa-arrow-up"></i> Recover (3 Swift)
          </button>

          ${shakeItOff.hasRule ? `
            <button class="ct-btn improve shake-it-off" data-ct="shake-it-off" title="Spend ${shakeItOff.swiftActionCost} Swift Actions to move +1 step (Shake It Off)" ${shakeItOff.allowed ? '' : 'disabled'}>
              <i class="fa-solid fa-arrow-up"></i> Shake It Off (${shakeItOff.swiftActionCost} Swift)
            </button>
          ` : ''}

          ${quickComeback.hasRule ? `
            <button class="ct-btn improve quick-comeback" data-ct="quick-comeback" title="Spend 1 Swift Action to move +1 step (Quick Comeback)" ${quickComeback.allowed ? '' : 'disabled'}>
              <i class="fa-solid fa-arrow-up"></i> Quick Comeback (1 Swift)
            </button>
          ` : ''}

          <button class="ct-btn worsen" data-ct="worsen">
            <i class="fa-solid fa-arrow-down"></i> Worsen
          </button>

          <label class="ct-persistent">
            <input type="checkbox" data-ct="persistent" ${persistent ? 'checked' : ''}/>
            Persistent
          </label>
        </div>

        ${current > 0 ? `
          <div class="ct-penalty">
            Penalty: <strong>${penaltyText}</strong> to Attacks, Defenses, Ability Checks, and Skill Checks
          </div>
        ` : ''}
      </div>
    `;
  }

  /* ---------------------------------------- */
  /* Step Definitions                         */
  /* ---------------------------------------- */

  static _defineSteps() {
    return [
      { index: 0, label: 'Normal', penalty: '', css: 'normal' },
      { index: 1, label: '-1', penalty: '-1', css: 'ct-1' },
      { index: 2, label: '-2', penalty: '-2', css: 'ct-2' },
      { index: 3, label: '-5', penalty: '-5', css: 'ct-5' },
      { index: 4, label: '-10', penalty: '-10 (Half Speed)', css: 'ct-10' },
      { index: 5, label: 'Helpless', penalty: 'Unconscious/Disabled', css: 'ct-helpless' }
    ];
  }

  /* ---------------------------------------- */
  /* Subtemplates                             */
  /* ---------------------------------------- */

  static _headerHTML(persistent) {
    return `
      <div class="ct-header">
        <h3><i class="fa-solid fa-heart-crack"></i> Condition Track</h3>
        ${persistent ? `<span class="ct-tag">Persistent</span>` : ''}
      </div>
    `;
  }

  static _stepHTML(step, currentIndex) {
    const isActive = currentIndex === step.index;
    const activeClass = isActive ? 'active' : '';

    return `
      <div class="ct-step ${step.css}">
        <div class="ct-content">
          <span class="ct-label">${escapeHTML(step.label)}</span>
          ${step.penalty ? `<span class="ct-pen">${escapeHTML(step.penalty)}</span>` : ''}
        </div>
        <button class="ct-pill ${activeClass}"
                data-ct="set"
                data-step="${step.index}"
                type="button"
                title="Set condition to ${escapeHTML(step.label)}"
                aria-label="Set condition to ${escapeHTML(step.label)}">
        </button>
      </div>
    `;
  }

  /* ---------------------------------------- */
  /* Event Activation                         */
  /* ---------------------------------------- */

  static _activate(container, actor) {
    const root = (container instanceof HTMLElement) ? container : (container?.[0] ?? container);
    if (!(root instanceof HTMLElement)) {return;}

    root.querySelectorAll('[data-ct="set"]').forEach(el => el.addEventListener('click', async ev => {
      await this._setCondition(actor, Number(ev.currentTarget.dataset.step));
    }));

    root.querySelectorAll('[data-ct="improve"]:not(.shake-it-off):not(.quick-comeback)').forEach(el => el.addEventListener('click', async () => {
      const result = await ConditionTrackFeatActions.recover(actor);
      if (result?.reason === 'persistent') {
        return ui.notifications.warn('Condition is Persistent and cannot be removed by the Recover Action.');
      }
      if (result?.reason === 'recover-blocked') {
        return ui.notifications.warn(result.message ?? 'Recover Action is currently blocked.');
      }
      if (result?.reason === 'Insufficient swift actions') {
        return ui.notifications.warn('Recover Action requires an available Swift Action.');
      }
      if (result?.success && result?.complete) {
        return ui.notifications.info('Recover Action complete: moved +1 step on the Condition Track.');
      }
      if (result?.success && typeof result?.remaining === 'number') {
        return ui.notifications.info(`Recover Action progress: ${result.spent}/3 swift actions spent.`);
      }
      if (result?.reason) {
        return ui.notifications.warn(String(result.reason));
      }
    }));

    root.querySelectorAll('[data-ct="shake-it-off"]').forEach(el => el.addEventListener('click', async () => {
      await this._handleShakeItOff(actor);
    }));

    root.querySelectorAll('[data-ct="quick-comeback"]').forEach(el => el.addEventListener('click', async () => {
      await this._handleQuickComeback(actor);
    }));

    root.querySelectorAll('[data-ct="worsen"]').forEach(el => el.addEventListener('click', async () => {
      await ActorEngine.applyConditionShift(actor, 1, 'condition-track-ui');
    }));

    root.querySelectorAll('[data-ct="persistent"]').forEach(el => el.addEventListener('change', async ev => {
      await ActorEngine.setConditionPersistent(actor, ev.target.checked);
    }));
  }

  /* ---------------------------------------- */
  /* Logic                                    */
  /* ---------------------------------------- */

  static async _setCondition(actor, step) {
    const cap = ConditionTrackRules.getConditionStepCap();
    return ActorEngine.setConditionStep(actor, Math.min(cap, Math.max(0, step)));
  }

  static async _handleShakeItOff(actor) {
    try {
      const result = await ConditionTrackFeatActions.shakeItOff(actor);
      if (!result?.success) {
        if (result?.reason === 'Insufficient swift actions') {
          return ui.notifications.warn(`${actor.name} does not have enough Swift Actions available for Shake It Off.`);
        }
        return ui.notifications.warn(result?.reason ?? `${actor.name} cannot use Shake It Off.`);
      }

      ui.notifications.info(
        `Shake It Off: ${actor.name} spent ${result.actionCost} Swift Actions and moved from CT ${result.conditionBefore} to CT ${result.conditionAfter}.`
      );
    } catch (err) {
      console.error('[ConditionTrackComponent] Shake It Off error:', err);
      ui.notifications.error(`Error applying Shake It Off: ${err.message}`);
    }
  }

  static async _handleQuickComeback(actor) {
    try {
      const result = await ConditionTrackFeatActions.quickComeback(actor);
      if (!result?.success) {
        if (result?.reason === 'Insufficient swift actions') {
          return ui.notifications.warn(`${actor.name} does not have enough Swift Actions available for Quick Comeback.`);
        }
        return ui.notifications.warn(result?.reason ?? `${actor.name} cannot use Quick Comeback.`);
      }

      ui.notifications.info(
        `Quick Comeback: ${actor.name} spent ${result.actionCost} Swift Action and moved from CT ${result.conditionBefore} to CT ${result.conditionAfter}.`
      );
    } catch (err) {
      console.error('[ConditionTrackComponent] Quick Comeback error:', err);
      ui.notifications.error(`Error applying Quick Comeback: ${err.message}`);
    }
  }
}

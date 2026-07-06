import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ConditionTrackRules } from "/systems/foundryvtt-swse/scripts/engine/combat/ConditionTrackRules.js";
import { ConditionTrackFeatActions } from "/systems/foundryvtt-swse/scripts/engine/feats/condition-track-feat-actions.js";

/**
 * SWSE Condition Track Sheet Component (Enhanced and RAW-accurate)
 * - GM-only persistent toggle
 * - Recover blocked for Persistent conditions
 * - Helpless state enforced (no Recover)
 * - Skip-prompt compatibility with CombatIntegration (turn, encounter, forever)
 * - RAW-correct penalty descriptions
 * - Action economy integration through ConditionTrackFeatActions
 */

export class ConditionTrackComponent {

  /* ---------------------------------------- */
  /* Public API                               */
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
    const ct = actor.system.conditionTrack.current ?? 0;
    const persistent = actor.system.conditionTrack.persistent ?? false;
    const shakeItOff = ConditionTrackFeatActions.canShakeItOff(actor);
    const quickComeback = ConditionTrackFeatActions.canQuickComeback(actor);
    const recover = ConditionTrackFeatActions.canRecover(actor);

    const steps = this._defineSteps();
    const penaltyText = steps[ct]?.penalty || '';

    // Do not show recover button if actor disabled popups "forever" feature
    const skipForever = actor.getFlag('foundryvtt-swse', 'skipCtPromptsForever') === true;
    const recoverDisabled = skipForever || !recover.allowed;

    return `
      <div class="swse-condition-track">

        ${this._headerHTML(persistent)}

        <div class="ct-track">
          ${steps.map(s => this._stepHTML(s, ct)).join('')}
        </div>

        <div class="ct-controls">
          <button class="ct-btn improve" data-ct="improve" ${recoverDisabled ? 'disabled' : ''} title="Recover Action: spend 3 Swift Actions total to move +1 step">
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

        ${ct > 0 ? `
          <div class="ct-penalty">
            <strong>Penalty:</strong> ${penaltyText}
          </div>
        ` : ''}
        
        ${skipForever ? `
          <div class="ct-skip-info">
            <em>Condition prompts are disabled for this actor.</em>
          </div>
        ` : ''}
      </div>
    `;
  }

  /* ---------------------------------------- */
  /* Step Definitions (matches CombatIntegration) */
  /* ---------------------------------------- */

  static _defineSteps() {
    return [
      { index: 0, label: 'Normal', penalty: '', css: 'normal' },
      { index: 1, label: '-1', penalty: '-1 to Attacks, Defenses, Ability & Skill Checks', css: 'ct-1' },
      { index: 2, label: '-2', penalty: '-2 to Attacks, Defenses, Ability & Skill Checks', css: 'ct-2' },
      { index: 3, label: '-5', penalty: '-5 to Attacks, Defenses, Ability & Skill Checks', css: 'ct-5' },
      { index: 4, label: '-10', penalty: '-10 to all above, Half Speed', css: 'ct-10' },
      { index: 5, label: 'Helpless', penalty: 'Unconscious / Disabled', css: 'ct-helpless' }
    ];
  }

  /* ---------------------------------------- */
  /* Subtemplates                             */
  /* ---------------------------------------- */

  static _headerHTML(persistent) {
    return `
      <div class="ct-header">
        <h3><i class="fa-solid fa-heart-crack"></i> Condition Track</h3>
        ${persistent ? `<span class="ct-tag">PERSISTENT</span>` : ''}
      </div>
    `;
  }

  static _stepHTML(step, currentIndex) {
    const active = currentIndex === step.index ? 'active' : '';
    const marker = active ? `<div class="ct-marker">▼</div>` : '';

    return `
      <div class="ct-step ${step.css} ${active}"
           data-ct="set"
           data-step="${step.index}"
           title="Set condition to ${step.label}">
        <span class="ct-label">${step.label}</span>
        ${step.penalty ? `<span class="ct-pen">${step.penalty}</span>` : ''}
        ${marker}
      </div>
    `;
  }

  /* ---------------------------------------- */
  /* Event Activation                         */
  /* ---------------------------------------- */

  static _activate(container, actor) {
    const root = (container instanceof HTMLElement) ? container : (container?.[0] ?? container);
    if (!(root instanceof HTMLElement)) {return;}

    /* --------------------------- */
    /* Direct GM-Only CT Set       */
    /* --------------------------- */
    root.querySelectorAll('[data-ct="set"]').forEach(btn => {
      btn.addEventListener('click', async ev => {
        if (!game.user.isGM) {
          return ui.notifications.warn('Only the GM may directly set the Condition Track.');
        }
        const step = Number(ev.currentTarget.dataset.step);
        await ActorEngine.setConditionStep(actor, Math.min(ConditionTrackRules.getConditionStepCap(), Math.max(0, step)), 'condition-track-ui');
      });
    });

    /* --------------------------- */
    /* Recover (Improve)           */
    /* --------------------------- */
    root.querySelectorAll('[data-ct="improve"]:not(.shake-it-off):not(.quick-comeback)').forEach(improveBtn => {
      improveBtn.addEventListener('click', async () => {

        // If actor chose "never show CT prompts" -- reflect that here too
        const skipForever = actor.getFlag('foundryvtt-swse', 'skipCtPromptsForever') === true;
        if (skipForever) {
          return ui.notifications.info('CT recovery prompts disabled for this actor.');
        }

        const ct = actor.system.conditionTrack.current ?? 0;
        const persistent = actor.system.conditionTrack.persistent === true;

        if (ct === ConditionTrackRules.getConditionStepCap()) {
          return ui.notifications.warn('A Helpless creature cannot perform a Recover action.');
        }

        if (persistent) {
          return ui.notifications.warn('This condition is Persistent and cannot be removed by the Recover Action.');
        }

        const result = await ConditionTrackFeatActions.recover(actor);
        if (result?.reason === 'recover-blocked') {
          return ui.notifications.warn(result.message ?? 'Recover Action is currently blocked.');
        }
        if (result?.complete) {
          return ui.notifications.info(`${actor.name} completes the Recover Action and improves 1 step on the Condition Track.`);
        }
        if (result?.success && typeof result?.remaining === 'number') {
          return ui.notifications.info(`${actor.name} spends a Swift Action toward recovery (${result.spent}/3).`);
        }
        if (result?.reason === 'Insufficient swift actions') {
          return ui.notifications.warn('Not enough Swift Actions remaining to Recover.');
        }
        if (result?.reason) {
          return ui.notifications.warn(String(result.reason));
        }
      });
    });

    root.querySelectorAll('[data-ct="shake-it-off"]').forEach(btn => {
      btn.addEventListener('click', async () => this._handleShakeItOff(actor));
    });

    root.querySelectorAll('[data-ct="quick-comeback"]').forEach(btn => {
      btn.addEventListener('click', async () => this._handleQuickComeback(actor));
    });

    /* --------------------------- */
    /* Worsen (+1 Step)            */
    /* --------------------------- */
    const worsenBtn = root.querySelector('[data-ct="worsen"]');
    if (worsenBtn) {
      worsenBtn.addEventListener('click', async () => {
        await ActorEngine.applyConditionShift(actor, 1, 'condition-track-ui');
      });
    }

    /* --------------------------- */
    /* Persistent Toggle (GM Only) */
    /* --------------------------- */
    const persistentCheckbox = root.querySelector('[data-ct="persistent"]');
    if (persistentCheckbox) {
      persistentCheckbox.addEventListener('change', async ev => {
        if (!game.user.isGM) {
          ev.preventDefault();
          ui.notifications.warn('Only the GM may toggle Persistent Conditions.');
          // revert toggle
          ev.target.checked = actor.system.conditionTrack.persistent;
          return;
        }
        await ActorEngine.setConditionPersistent(actor, ev.target.checked, 'condition-track-ui');
      });
    }
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

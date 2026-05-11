/**
 * SWSE Condition Track Sheet Component (Updated for RAW + New CT System)
 * - Correct CT penalties
 * - Persistent condition restrictions
 * - Consistent with Actor.moveConditionTrack()
 * - UI safely triggers CT updates without breaking Active Effects
 *
 * PHASE 7: All mutations routed through ActorEngine for atomic governance
 */
import { escapeHTML } from "/systems/foundryvtt-swse/scripts/utils/security-utils.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

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

    const steps = this._defineSteps();
    const penaltyText = steps[current]?.penalty || '';

    return `
      <div class="swse-condition-track">

        ${this._headerHTML(persistent)}

        <div class="ct-track">
          ${steps.map(step => this._stepHTML(step, current)).join('')}
        </div>

        <div class="ct-controls">
          <button class="ct-btn improve" data-ct="improve">
            <i class="fa-solid fa-arrow-up"></i> Recover (3 Swift)
          </button>

          <button class="ct-btn improve shake-it-off" data-ct="shake-it-off" title="Spend 2 Swift Actions to move +1 step (Shake It Off)">
            <i class="fa-solid fa-arrow-up"></i> Shake It Off (2 Swift)
          </button>

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

    // Set CT directly
    root.querySelectorAll('[data-ct="set"]').forEach(el => el.addEventListener('click', async ev => {
      await this._setCondition(actor, Number(ev.currentTarget.dataset.step));
    }));

    // Improve CT (respect persistent)
    root.querySelectorAll('[data-ct="improve"]:not(.shake-it-off)').forEach(el => el.addEventListener('click', async () => {
      const result = await ActorEngine.recoverConditionStep(actor, 'recover-action');
      if (result?.reason === 'persistent') {
        return ui.notifications.warn('Condition is Persistent and cannot be removed by the Recover Action.');
      }
      if (result?.complete) {
        ui.notifications.info('Recover Action complete: moved +1 step on the Condition Track.');
      } else if (typeof result?.remaining === 'number') {
        ui.notifications.info(`Recover Action progress: ${3 - result.remaining}/3 swift actions spent.`);
      }
    }));

    // Shake It Off (2 Swift Actions to improve CT)
    root.querySelectorAll('[data-ct="shake-it-off"]').forEach(el => el.addEventListener('click', async () => {
      await this._handleShakeItOff(actor);
    }));

    // Worsen CT
    root.querySelectorAll('[data-ct="worsen"]').forEach(el => el.addEventListener('click', async () => {
      await actor.moveConditionTrack(1);
    }));

    // Persistent flag
    root.querySelectorAll('[data-ct="persistent"]').forEach(el => el.addEventListener('change', async ev => {
      await ActorEngine.setConditionPersistent(actor, ev.target.checked);
    }));
  }

  /* ---------------------------------------- */
  /* Logic                                    */
  /* ---------------------------------------- */

  static async _setCondition(actor, step) {
    return ActorEngine.setConditionStep(actor, Math.clamp(step, 0, 5));
  }

  /* ---------------------------------------- */
  /* SHAKE IT OFF HANDLER                     */
  /* ---------------------------------------- */

  /**
   * Handle Shake It Off feat activation.
   * Requires: 2 Swift Actions available, Shake It Off feat, trained in Endurance.
   * Effect: Spend 2 Swift Actions to move +1 step on CT (improve condition).
   */
  static async _handleShakeItOff(actor) {
    // Check if actor has Shake It Off feat
    const { MetaResourceFeatResolver } = await import("/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js");

    if (!MetaResourceFeatResolver.hasFeat(actor, 'Shake It Off')) {
      return ui.notifications.warn(`${actor.name} does not have the Shake It Off feat.`);
    }

    // Check if actor has 2+ Swift Actions available
    const swiftActions = actor.system.actions?.swift?.available ?? 0;
    if (swiftActions < 2) {
      return ui.notifications.warn(`${actor.name} does not have 2 Swift Actions available (has ${swiftActions}).`);
    }

    try {
      // Spend 2 Swift Actions
      const newSwiftActions = swiftActions - 2;
      await ActorEngine.updateActor(actor, { 'system.actions.swift.available': newSwiftActions });

      // Move +1 step on CT (improve condition)
      const oldCT = actor.system.conditionTrack?.current ?? 0;
      await actor.improveConditionTrack();
      const newCT = actor.system.conditionTrack?.current ?? 0;

      ui.notifications.info(
        `Shake It Off: ${actor.name} spent 2 Swift Actions and moved from CT ${oldCT} to CT ${newCT}.`
      );
    } catch (err) {
      console.error('[ConditionTrackComponent] Shake It Off error:', err);
      ui.notifications.error(`Error applying Shake It Off: ${err.message}`);
    }
  }
}

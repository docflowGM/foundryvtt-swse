/**
 * SWSE Condition Track Sheet Component (Updated for RAW + New CT System)
 * - Correct CT penalties
 * - Persistent condition restrictions
 * - Consistent with Actor.moveConditionTrack()
 * - UI safely triggers CT updates without breaking Active Effects
 */
import { escapeHTML } from '../utils/security-utils.js';

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
            <i class="fas fa-arrow-up"></i> Recover
          </button>

          <button class="ct-btn worsen" data-ct="worsen">
            <i class="fas fa-arrow-down"></i> Worsen
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
        <h3><i class="fas fa-heart-crack"></i> Condition Track</h3>
        ${persistent ? `<span class="ct-tag">Persistent</span>` : ''}
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
           title="Set condition to ${escapeHTML(step.label)}">
        <span class="ct-label">${escapeHTML(step.label)}</span>
        ${step.penalty ? `<span class="ct-pen">${escapeHTML(step.penalty)}</span>` : ''}
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

    // Set CT directly
    root.querySelectorAll('[data-ct="set"]').forEach(el => el.addEventListener('click', async ev => {
      await this._setCondition(actor, Number(ev.currentTarget.dataset.step));
    }));

    // Improve CT (respect persistent)
    root.querySelectorAll('[data-ct="improve"]').forEach(el => el.addEventListener('click', async () => {
      if (actor.system.conditionTrack.persistent) {
        return ui.notifications.warn('Condition is Persistent and cannot be removed by the Recover Action.');
      }
      await actor.moveConditionTrack(-1);
    }));

    // Worsen CT
    root.querySelectorAll('[data-ct="worsen"]').forEach(el => el.addEventListener('click', async () => {
      await actor.moveConditionTrack(1);
    }));

    // Persistent flag
    root.querySelectorAll('[data-ct="persistent"]').forEach(el => el.addEventListener('change', async ev => {
      await actor.update({ 'system.conditionTrack.persistent': ev.target.checked });
    }));
  }

  /* ---------------------------------------- */
  /* Logic                                    */
  /* ---------------------------------------- */

  static async _setCondition(actor, step) {
    return actor.update({ 'system.conditionTrack.current': Math.clamp(step, 0, 5) });
  }
}

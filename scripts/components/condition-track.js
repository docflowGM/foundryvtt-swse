// ==================================================
// ConditionTrackComponent (v2)
// UI-only renderer + intent dispatcher
// ==================================================

import { escapeHTML } from "../utils/security-utils.js";
import { ActorEngine } from "../actors/engine/actor-engine.js";

export class ConditionTrackComponent {

  /* ---------------------------------------- */
  /* Public API                               */
  /* ---------------------------------------- */

  static render(actor, container) {
    if (!actor?.system) return;
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
    const track = actor.system.conditionTrack ?? {};
    const derived = actor.system.derived ?? {};

    const current = track.step ?? 0;
    const max = actor.getMaxDamageTrackStep?.() ?? 5;
    const persistent = track.persistent ?? false;

    const steps = this._buildSteps(actor, max);
    const penaltyText = derived.damagePenalty
      ? `${derived.damagePenalty}`
      : "";

    return `
      <div class="swse-condition-track">

        ${this._headerHTML(persistent)}

        <div class="ct-track">
          ${steps.map(step => this._stepHTML(step, current)).join("")}
        </div>

        <div class="ct-controls">
          <button class="ct-btn improve" data-ct="improve">
            <i class="fas fa-arrow-up"></i> Recover
          </button>

          <button class="ct-btn worsen" data-ct="worsen">
            <i class="fas fa-arrow-down"></i> Worsen
          </button>

          <label class="ct-persistent">
            <input type="checkbox"
                   data-ct="persistent"
                   ${persistent ? "checked" : ""}/>
            Persistent
          </label>
        </div>

        ${penaltyText ? `
          <div class="ct-penalty">
            Penalty: <strong>${escapeHTML(penaltyText)}</strong>
          </div>
        ` : ""}
      </div>
    `;
  }

  /* ---------------------------------------- */
  /* Step Builder (UI only)                   */
  /* ---------------------------------------- */

  static _buildSteps(actor, max) {
    const labels = actor.getConditionTrackLabels?.() ?? [];

    return Array.from({ length: max + 1 }, (_, i) => ({
      index: i,
      label: labels[i] ?? `Step ${i}`,
      css: `ct-step-${i}`
    }));
  }

  /* ---------------------------------------- */
  /* Subtemplates                             */
  /* ---------------------------------------- */

  static _headerHTML(persistent) {
    return `
      <div class="ct-header">
        <h3><i class="fas fa-heart-crack"></i> Condition Track</h3>
        ${persistent ? `<span class="ct-tag">Persistent</span>` : ""}
      </div>
    `;
  }

  static _stepHTML(step, currentIndex) {
    const active = currentIndex === step.index ? "active" : "";
    const marker = active ? `<div class="ct-marker">▼</div>` : "";

    return `
      <div class="ct-step ${step.css} ${active}"
           data-ct="set"
           data-step="${step.index}"
           title="Set condition to ${escapeHTML(step.label)}">
        <span class="ct-label">${escapeHTML(step.label)}</span>
        ${marker}
      </div>
    `;
  }

  /* ---------------------------------------- */
  /* Event Activation                         */
  /* ---------------------------------------- */

  static _activate(container, actor) {
    const $c = $(container);

    // Set CT directly
    $c.find('[data-ct="set"]').on("click", ev => {
      const step = Number(ev.currentTarget.dataset.step);
      this._requestSet(actor, step);
    });

    // Improve CT
    $c.find('[data-ct="improve"]').on("click", () => {
      this._requestMove(actor, -1);
    });

    // Worsen CT
    $c.find('[data-ct="worsen"]').on("click", () => {
      this._requestMove(actor, 1);
    });

    // Persistent flag toggle
    $c.find('[data-ct="persistent"]').on("change", ev => {
      this._requestPersistent(actor, ev.target.checked);
    });
  }

  /* ---------------------------------------- */
  /* Intent Dispatchers (NO LOGIC)             */
  /* ---------------------------------------- */

  static async _requestMove(actor, delta) {
    if (typeof actor.moveConditionTrack === "function") {
      return actor.moveConditionTrack(delta);
    }

    const current = actor.system.conditionTrack?.step ?? 0;
    return this._requestSet(actor, current + delta);
  }

  static async _requestSet(actor, step) {
    return ActorEngine.updateActor(actor, {
      "system.conditionTrack.step": step
    });
  }

  static async _requestPersistent(actor, persistent) {
    return ActorEngine.updateActor(actor, {
      "system.conditionTrack.persistent": !!persistent
    });
  }
}
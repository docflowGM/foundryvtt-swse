/**
 * Modern SWSE Condition Track Component
 * - Supports Foundry VTT v11–v13 best practices
 * - Fully modular, UI/logic separation
 * - Smooth updating without redundant hook rebinds
 * - System-consistent with SWSE ActorEngine
 */

export class ConditionTrackComponent {

  /** ------------------------------------
   * PUBLIC API — Render & Refresh
   * ------------------------------------ */

  static render(actor, container) {
    container.innerHTML = this._template(actor);
    this._activate(container, actor);
  }

  static refresh(actor, container) {
    this.render(actor, container);
  }


  /** ------------------------------------
   * TEMPLATE GENERATION (HTML)
   * ------------------------------------ */

  static _template(actor) {
    const current = actor.system.conditionTrack?.current ?? 0;
    const persistent = actor.system.conditionTrack?.persistent ?? false;

    const steps = this._defineSteps();
    const penaltyText = steps[current]?.penalty || "";

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
            <i class="fas fa-arrow-down"></i> Damage
          </button>

          <label class="ct-persistent">
            <input type="checkbox" data-ct="persistent" ${persistent ? "checked" : ""}/>
            Persistent
          </label>
        </div>

        ${current > 0 ? `
          <div class="ct-penalty">
            Penalty: <strong>${penaltyText}</strong> to all d20 rolls
          </div>
        ` : ""}
      </div>
    `;
  }


  /** ------------------------------------
   * STEP DEFINITIONS — Easy to extend
   * ------------------------------------ */

  static _defineSteps() {
    return [
      { index: 0, label: "Normal", penalty: "", css: "normal" },
      { index: 1, label: "-1", penalty: "-1", css: "ct-1" },
      { index: 2, label: "-2", penalty: "-2", css: "ct-2" },
      { index: 3, label: "-5", penalty: "-5", css: "ct-5" },
      { index: 4, label: "-10", penalty: "-10", css: "ct-10" },
      { index: 5, label: "Helpless", penalty: "", css: "ct-helpless" }
    ];
  }


  /** ------------------------------------
   * Subtemplates
   * ------------------------------------ */

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
           title="Set condition to ${step.label}">
        <span class="ct-label">${step.label}</span>
        ${step.penalty ? `<span class="ct-pen">${step.penalty}</span>` : ""}
        ${marker}
      </div>
    `;
  }


  /** ------------------------------------
   * EVENT LISTENERS
   * ------------------------------------ */

  static _activate(container, actor) {

    const $c = $(container);

    // Set Condition Step
    $c.find('[data-ct="set"]').on("click", async event => {
      const step = Number(event.currentTarget.dataset.step);
      await this._setCondition(actor, step);
    });

    // Improve
    $c.find('[data-ct="improve"]').on("click", async () => {
      await this._move(actor, -1);
    });

    // Worsen
    $c.find('[data-ct="worsen"]').on("click", async () => {
      await this._move(actor, 1);
    });

    // Persistent Toggle
    $c.find('[data-ct="persistent"]').on("change", async event => {
      await actor.update({ "system.conditionTrack.persistent": event.target.checked });
    });
  }


  /** ------------------------------------
   * LOGIC (MODULAR & CLEAN)
   * ------------------------------------ */

  static async _setCondition(actor, step) {
    const max = 5;
    const value = Math.clamp(step, 0, max);

    return actor.update({ "system.conditionTrack.current": value });
  }

  static async _move(actor, delta) {
    const current = actor.system.conditionTrack?.current ?? 0;
    const newValue = Math.clamp(current + delta, 0, 5);

    return actor.update({ "system.conditionTrack.current": newValue });
  }
}

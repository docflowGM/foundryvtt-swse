/**
 * SWSE Condition Track Sheet Component (Enhanced and RAW-accurate)
 * - GM-only persistent toggle
 * - Recover blocked for Persistent conditions
 * - Helpless state enforced (no Recover)
 * - Skip-prompt compatibility with CombatIntegration (turn, encounter, forever)
 * - RAW-correct penalty descriptions
 * - Future-proof for action economy integration
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

    const steps = this._defineSteps();
    const penaltyText = steps[ct]?.penalty || '';

    // Do not show recover button if actor disabled popups "forever" feature
    const skipForever = actor.getFlag('foundryvtt-swse', 'skipCtPromptsForever') === true;

    return `
      <div class="swse-condition-track">

        ${this._headerHTML(persistent)}

        <div class="ct-track">
          ${steps.map(s => this._stepHTML(s, ct)).join('')}
        </div>

        <div class="ct-controls">
          <button class="ct-btn improve" data-ct="improve" ${skipForever ? 'disabled' : ''}>
            <i class="fa-solid fa-arrow-up"></i> Recover
          </button>

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
        // PHASE 3: Route through ActorEngine
        const step = Number(ev.currentTarget.dataset.step);
        const { ActorEngine } = await import('../../governance/actor-engine/actor-engine.js');
        await ActorEngine.updateActor(actor, {
          'system.conditionTrack.current': Math.clamp(step, 0, 5)
        });
      });
    });

    /* --------------------------- */
    /* Recover (Improve)           */
    /* --------------------------- */
    const improveBtn = root.querySelector('[data-ct="improve"]');
    if (improveBtn) {
      improveBtn.addEventListener('click', async () => {

        // If actor chose "never show CT prompts" — reflect that here too
        const skipForever = actor.getFlag('foundryvtt-swse', 'skipCtPromptsForever') === true;
        if (skipForever) {
          return ui.notifications.info('CT recovery prompts disabled for this actor.');
        }

        const ct = actor.system.conditionTrack.current ?? 0;
        const persistent = actor.system.conditionTrack.persistent === true;

        if (ct === 5) {
          return ui.notifications.warn('A Helpless creature cannot perform a Recover action.');
        }

        if (persistent) {
          return ui.notifications.warn('This condition is Persistent and cannot be removed by natural recovery.');
        }

        // Optional future action economy check
        if (actor.system.actionEconomy?.swift !== undefined) {
          const swift = actor.system.actionEconomy.swift;
          if (!swift) {
            return ui.notifications.warn('Not enough Swift Actions remaining to Recover.');
          }
        }

        await actor.moveConditionTrack(-1);
        ui.notifications.info(`${actor.name} improves 1 step on the Condition Track.`);
      });
    }

    /* --------------------------- */
    /* Worsen (+1 Step)            */
    /* --------------------------- */
    const worsenBtn = root.querySelector('[data-ct="worsen"]');
    if (worsenBtn) {
      worsenBtn.addEventListener('click', async () => {
        await actor.moveConditionTrack(1);
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
        // PHASE 3: Route through ActorEngine
        const { ActorEngine } = await import('../../governance/actor-engine/actor-engine.js');
        await ActorEngine.updateActor(actor, {
          'system.conditionTrack.persistent': ev.target.checked
        });
      });
    }
  }
}

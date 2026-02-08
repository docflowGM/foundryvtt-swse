import { ForceEnhancementDialog } from '../utils/force-enhancement-dialog.js';
import { escapeHTML } from '../utils/security-utils.js';

/**
 * Force Suite Component (RAW SWSE Accurate)
 * - All known powers are always available ("in suite")
 * - Using a power spends it
 * - Powers can be regained in several RAW-compliant ways
 * - Two zones only: READY and SPENT
 */
export class ForceSuiteComponent {

  /** --------------------------
   * PUBLIC RENDER/REFRESH
   * -------------------------- */

  static render(actor, container) {
    container.innerHTML = this._template(actor);
    this._activate(container, actor);
  }

  static refresh(actor, container) {
    this.render(actor, container);
  }


  /** --------------------------
   * STATE MANAGEMENT
   * -------------------------- */

  static _getPowers(actor) {
    const all = actor.items.filter(i => i.type === 'forcepower');

    return {
      ready: all.filter(p => !p.system.spent),
      spent: all.filter(p => p.system.spent),
      known: all.length
    };
  }


  /** --------------------------
   * HTML TEMPLATE
   * -------------------------- */

  static _template(actor) {
    const { ready, spent, known } = this._getPowers(actor);

    return `
      <div class="swse-force-suite">

        <header class="fs-header">
          <h2><i class="fas fa-jedi"></i> Force Powers (${known} known)</h2>
        </header>

        <section class="fs-layout">

          <!-- READY Powers -->
          <div class="fs-column ready" data-zone="ready">
            <h3>Ready Powers</h3>
            <div class="fs-list">
              ${ready.map(p => this._cardHTML(p, false)).join('')}
            </div>
          </div>

          <!-- Arrow -->
          <div class="fs-arrow">
            <i class="fas fa-arrow-right"></i>
          </div>

          <!-- SPENT Powers -->
          <div class="fs-column spent" data-zone="spent">
            <h3>Spent Powers</h3>
            <div class="fs-list spent-zone">
              ${spent.length === 0
                ? `<div class="fs-empty">No spent powers</div>`
                : spent.map(p => this._cardHTML(p, true)).join('')
              }
            </div>
          </div>

        </section>

        ${this._footerHTML(actor)}
      </div>
    `;
  }


  /** --------------------------
   * CARD TEMPLATE
   * -------------------------- */

  static _cardHTML(power, spent) {
    const cls = [
      'fs-card',
      power.system.discipline === 'light-side' ? 'light' : '',
      power.system.discipline === 'dark-side' ? 'dark' : '',
      power.system.discipline === 'universal' ? 'universal' : '',
      spent ? 'spent' : 'ready'
    ].join(' ');

    const badge = spent
      ? `<span class="fs-badge spent">SPENT</span>`
      : `<span class="fs-badge ready">READY</span>`;

    return `
      <div class="${cls}"
           draggable="true"
           data-power="${power.id}">

        ${badge}

        <img src="${power.img}" class="fs-icon"/>
        <div class="fs-name">${escapeHTML(power.name)}</div>

        <div class="fs-actions">
          ${!spent ? `
            <button class="use-power" data-act="use" data-power="${power.id}">
              <i class="fas fa-hand-sparkles"></i>
            </button>
          ` : `
            <button class="regain-one" data-act="regainOne" data-power="${power.id}">
              <i class="fas fa-rotate-left"></i>
            </button>
          `}
        </div>
      </div>
    `;
  }


  /** --------------------------
   * FOOTER
   * -------------------------- */

  static _footerHTML(actor) {
    return `
      <footer class="fs-footer">
        <div class="fs-buttons">
          <button class="fs-btn" data-act="restoreAll">
            Restore All (1 minute rest)
          </button>

          <button class="fs-btn" data-act="fpRegain">
            Spend Force Point → Regain One
          </button>
        </div>
      </footer>
    `;
  }


  /** --------------------------
   * EVENT LISTENERS
   * -------------------------- */

  static _activate(container, actor) {
    const $c = $(container);

    // Drag start
    $c.find('.fs-card').on('dragstart', evt => {
      evt.originalEvent.dataTransfer.setData(
        'power',
        evt.currentTarget.dataset.power
      );
    });

    // Ready → Spent
    $c.find("[data-zone='spent']").on('dragover', evt => evt.preventDefault());

    $c.find("[data-zone='spent']").on('drop', async evt => {
      const id = evt.originalEvent.dataTransfer.getData('power');
      await this._moveToSpent(actor, id);
      this.refresh(actor, container);
    });

    // Spent → Ready
    $c.find("[data-zone='ready']").on('dragover', evt => evt.preventDefault());

    $c.find("[data-zone='ready']").on('drop', async evt => {
      const id = evt.originalEvent.dataTransfer.getData('power');
      await this._moveToReady(actor, id);
      this.refresh(actor, container);
    });

    // Button actions
    $c.find('[data-act]').on('click', async evt => {
      const act = evt.currentTarget.dataset.act;
      const id = evt.currentTarget.dataset.power;
      await this._dispatchAction(actor, act, id);
      this.refresh(actor, container);
    });
  }


  /** --------------------------
   * ACTION DISPATCHER
   * -------------------------- */

  static async _dispatchAction(actor, act, id) {
    const map = {
      use: () => this._usePower(actor, id),
      regainOne: () => this._regain(actor, id),
      restoreAll: () => this._restoreAll(actor),
      fpRegain: () => this._fpRegain(actor)
    };
    return map[act]?.();
  }


  /** --------------------------
   * RULES-ACCURATE LOGIC
   * -------------------------- */

  static async _moveToSpent(actor, id) {
    return await actor.items.get(id)?.update({ 'system.spent': true });
  }

  static async _moveToReady(actor, id) {
    return await actor.items.get(id)?.update({ 'system.spent': false });
  }

  static async _usePower(actor, id) {
    const power = actor.items.get(id);
    if (!power) {return;}

    // Check for applicable force techniques and secrets
    const enhancements = await ForceEnhancementDialog.checkAndPrompt(actor, power);

    // Roll the Use the Force check with enhancements
    const result = await SWSERoll.rollUseTheForce(actor, power, enhancements);

    // Nat 20 → regain all at end of turn
    if (result?.diceTotal === 20) {
      ui.notifications.info('Natural 20! You will regain ALL powers at end of turn.');
      await actor.setFlag('swse', 'pendingFullRegain', true);
    }

    return this._moveToSpent(actor, id);
  }

  static async _regain(actor, id) {
    return this._moveToReady(actor, id);
  }

  static async _restoreAll(actor) {
    const all = actor.items.filter(i => i.type === 'forcepower');
    for (const p of all) {
      await p.update({ 'system.spent': false });
    }
  }

  static async _fpRegain(actor) {
    if (actor.system.forcePoints?.value < 1) {return ui.notifications.warn('No Force Points left!');}

    // Spend FP
    await actor.update({
      'system.forcePoints.value': actor.system.forcePoints.value - 1
    });

    // Find one spent power
    const spent = actor.items.find(i => i.type === 'forcepower' && i.system.spent);
    if (!spent) {return ui.notifications.info('No spent powers to regain.');}

    await spent.update({ 'system.spent': false });

    ui.notifications.info(`Force Point spent → ${escapeHTML(spent.name)} regained.`);
  }
}

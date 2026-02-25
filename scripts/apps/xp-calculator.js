// scripts/apps/xp-calculator.js

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

import { calculateEncounterXP, applyXP, isXPEnabled } from '../engines/progression/xp-engine.js';
import { getXPFromCL } from '../engines/shared/xp-system.js';

/**
 * GM Encounter XP Calculator
 * AppV2 utility for calculating and distributing encounter XP.
 * Supports multiple enemies (multi-CL), per-CL reduction, and GM multiplier.
 */
export class SWSEXPCalculator extends HandlebarsApplicationMixin(ApplicationV2) {

  static PARTS = {
    body: {
      template: 'systems/foundryvtt-swse/templates/apps/xp-calculator.hbs'
    }
  };

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'swse-xp-calculator',
      classes: ['swse', 'swse-app', 'v2'],
      window: {
        title: 'Encounter XP Calculator',
        resizable: true
      },
      position: {
        width: 420,
        height: 'auto'
      }
    });
  }

  constructor(options = {}) {
    super(options);
    this._enemies = [{ cl: 1 }];
    this._partySize = 4;
    this._averageLevel = 1;
    this._gmMultiplier = 1;
  }

  async _prepareContext(options) {
    const baseContext = await super._prepareContext(options);

    const challengeLevels = this._enemies.map(e => Number(e.cl) || 0);
    const xpPerCharacter = calculateEncounterXP({
      challengeLevels,
      partySize: this._partySize,
      averageLevel: this._averageLevel,
      gmMultiplier: this._gmMultiplier
    });

    const totalEncounterXP = challengeLevels
      .map(cl => {
        let xp = getXPFromCL(cl);
        if (cl <= this._averageLevel - 5) xp = Math.floor(xp / 10);
        return xp;
      })
      .reduce((sum, xp) => sum + xp, 0);

    return {
      ...baseContext,
      enemies: this._enemies.map((e, i) => ({ ...e, index: i })),
      partySize: this._partySize,
      averageLevel: this._averageLevel,
      gmMultiplier: this._gmMultiplier,
      totalEncounterXP: Math.floor(totalEncounterXP * this._gmMultiplier),
      xpPerCharacter,
      xpEnabled: isXPEnabled(),
      hasSelectedTokens: (canvas?.tokens?.controlled?.length ?? 0) > 0
    };
  }

  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;
    if (root.dataset.bound === 'true') return;
    root.dataset.bound = 'true';

    // Add enemy
    const addBtn = root.querySelector('[data-action="add-enemy"]');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        this._enemies.push({ cl: 1 });
        this.render();
      });
    }

    // Remove enemy
    for (const btn of root.querySelectorAll('[data-action="remove-enemy"]')) {
      btn.addEventListener('click', (ev) => {
        const index = Number(ev.currentTarget.dataset.index);
        if (Number.isFinite(index) && this._enemies.length > 1) {
          this._enemies.splice(index, 1);
          this.render();
        }
      });
    }

    // CL inputs
    for (const input of root.querySelectorAll('[data-field="enemy-cl"]')) {
      input.addEventListener('change', (ev) => {
        const index = Number(ev.currentTarget.dataset.index);
        if (Number.isFinite(index)) {
          this._enemies[index].cl = Math.max(0, Number(ev.currentTarget.value) || 0);
          this.render();
        }
      });
    }

    // Party size
    const partySizeInput = root.querySelector('[data-field="party-size"]');
    if (partySizeInput) {
      partySizeInput.addEventListener('change', (ev) => {
        this._partySize = Math.max(1, Number(ev.currentTarget.value) || 1);
        this.render();
      });
    }

    // Average level
    const avgLevelInput = root.querySelector('[data-field="average-level"]');
    if (avgLevelInput) {
      avgLevelInput.addEventListener('change', (ev) => {
        this._averageLevel = Math.max(1, Number(ev.currentTarget.value) || 1);
        this.render();
      });
    }

    // GM multiplier
    const gmMultInput = root.querySelector('[data-field="gm-multiplier"]');
    if (gmMultInput) {
      gmMultInput.addEventListener('change', (ev) => {
        this._gmMultiplier = Math.max(0, Number(ev.currentTarget.value) || 1);
        this.render();
      });
    }

    // Distribute to selected tokens
    const distributeBtn = root.querySelector('[data-action="distribute-xp"]');
    if (distributeBtn) {
      distributeBtn.addEventListener('click', async () => {
        const tokens = canvas?.tokens?.controlled ?? [];
        if (tokens.length === 0) {
          ui.notifications.warn('No tokens selected. Select character tokens to distribute XP.');
          return;
        }

        const challengeLevels = this._enemies.map(e => Number(e.cl) || 0);
        const xpPerChar = calculateEncounterXP({
          challengeLevels,
          partySize: this._partySize,
          averageLevel: this._averageLevel,
          gmMultiplier: this._gmMultiplier
        });

        if (xpPerChar <= 0) {
          ui.notifications.warn('No XP to distribute.');
          return;
        }

        const results = [];
        for (const token of tokens) {
          const actor = token.actor;
          if (!actor) continue;
          const result = await applyXP(actor, xpPerChar);
          if (result) {
            results.push(`${actor.name}: +${xpPerChar} XP (total: ${result.newTotal})`);
            if (result.leveledUp) {
              results.push(`  >> ${actor.name} reached level ${result.newLevel}!`);
            }
          }
        }

        if (results.length > 0) {
          // Post results to chat
          ChatMessage.create({
            content: `<div class="swse-xp-award">
              <h3>XP Awarded</h3>
              <p>${xpPerChar} XP per character</p>
              <ul>${results.map(r => `<li>${r}</li>`).join('')}</ul>
            </div>`,
            speaker: ChatMessage.getSpeaker({ alias: 'XP System' })
          });
          ui.notifications.info(`Distributed ${xpPerChar} XP to ${tokens.length} character(s).`);
        }
      });
    }
  }

  /**
   * Open the calculator. Creates singleton instance.
   */
  static open() {
    if (!game.user?.isGM) {
      ui.notifications.warn('Only the GM can open the XP Calculator.');
      return;
    }
    if (!isXPEnabled()) {
      ui.notifications.warn('Experience system is disabled. Enable it in Houserule Settings.');
      return;
    }
    const app = new SWSEXPCalculator();
    app.render(true);
  }
}

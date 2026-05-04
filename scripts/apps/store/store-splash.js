import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { centerApplication } from "/systems/foundryvtt-swse/scripts/utils/sheet-position.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SWSEStoreSplashV2 extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'swse-store-splash',
    classes: ['swse', 'store-splash'],
    actions: {
      continue: (event, target) => this.prototype._onContinueAction.call(this, event, target),
    },
    window: {
      title: 'Galactic Trade Exchange',
      icon: 'fas fa-store',
      resizable: true,
      minimizable: false,
      draggable: true,
    },
    position: {
      width: 900,
      height: 600,
      top: null,
      left: null,
    },
  };

  static PARTS = {
    splash: {
      template: 'systems/foundryvtt-swse/templates/apps/store/store-splash.hbs',
    },
  };

  constructor(options = {}) {
    super(options);
    this.actor = options.actor ?? null;
    this._bootTimeouts = [];
    this._clockInterval = null;
    this._complete = false;
    this._settled = false;
  }

  async _prepareContext(_options) {
    const credits = Number(this.actor?.system?.credits ?? 0) || 0;
    const creditTier = credits >= 5000 ? 'Priority Trade Access' : credits >= 1000 ? 'Verified Customer Account' : 'Public Exchange Access';
    const storeOpen = SettingsHelper.getSafe('storeOpen', true);
    return {
      actorName: this.actor?.name || 'GUEST ACCOUNT',
      credits,
      accountTier: creditTier,
      terminalId: this.actor?.id ? `ACT-${String(this.actor.id).slice(-6).toUpperCase()}` : 'PUB-0000',
      vendorLink: this.actor ? 'REN-DARR VERIFIED' : 'PUBLIC CATALOG LINK',
      welcomeLine: this.actor
        ? 'Authorizing customer profile and syncing trade permissions...'
        : 'Initializing public exchange terminal and market index...',
      storeOpen,
      storeStatusLabel: storeOpen ? 'OPEN' : 'CLOSED',
      currencySymbol: '$'
    };
  }

  static async prompt(actor = null, options = {}) {
    if (options?.skipSplash) return;

    return new Promise((resolve, reject) => {
      try {
        const app = new this({ actor, ...options });
        app._resolve = resolve;
        app._reject = reject;
        app.render(true);
      } catch (err) {
        SWSELogger.error('[SWSEStoreSplashV2] ERROR rendering splash:', err);
        reject(err);
      }
    });
  }

  _onRender(context, options) {
    super._onRender(context, options);
    requestAnimationFrame(() => centerApplication(this));
    this._updateSystemTime();
    this._bindFrameHandlers();
    window.setTimeout(() => this._startBootSequence(), 250);
  }

  async close(options = {}) {
    this._clearTransientState();
    this._settle();
    return super.close(options);
  }

  _clearTransientState() {
    for (const id of this._bootTimeouts) clearTimeout(id);
    this._bootTimeouts = [];
    if (this._clockInterval) {
      clearInterval(this._clockInterval);
      this._clockInterval = null;
    }
  }

  _settle() {
    if (this._settled) return;
    this._settled = true;
    this._resolve?.();
  }

  _setTimeout(fn, delay) {
    const id = window.setTimeout(fn, delay);
    this._bootTimeouts.push(id);
    return id;
  }

  _updateSystemTime() {
    const timeElem = this.element?.querySelector?.('#store-sys-time');
    if (!timeElem) return;
    const updateClock = () => {
      const now = new Date();
      timeElem.textContent = now.toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      });
    };
    updateClock();
    this._clockInterval = window.setInterval(updateClock, 1000);
  }

  _bindFrameHandlers() {
    const splashPanel = this.element?.querySelector?.('.prog-intro-panel');
    if (splashPanel) {
      splashPanel.style.cursor = 'pointer';
      splashPanel.addEventListener('click', (event) => {
        if (event.target.closest('button') || event.target.closest('[data-action]')) return;
        if (!this._complete) this._skipBootSequence();
      });
    }

    this.element?.addEventListener?.('keydown', (event) => {
      if (event.key === 'Escape' && !this._complete) {
        event.preventDefault();
        this._skipBootSequence();
      }
      if ((event.key === 'Enter' || event.key === ' ') && this._complete) {
        event.preventDefault();
        this._proceedToStore();
      }
    });
  }

  _startBootSequence() {
    if (!this.element || this._complete) return;

    const sequence = [
      ['EXCHANGE LINK ONLINE', 'processing', 16],
      ['SYNCING MARKET FEEDS', 'processing', 34],
      ['VERIFYING ACCOUNT CREDENTIALS', 'processing', 52],
      ['INDEXING CATALOG INVENTORY', 'processing', 71],
      ['LOCKING LOCAL LEDGER', 'processing', 87],
      ['CLEARANCE ACCEPTED', 'success', 100],
    ];

    sequence.forEach(([message, state, pct], idx) => {
      this._setTimeout(() => this._showStage(message, state, pct), 450 + (idx * 1050));
    });

    this._setTimeout(() => this._finishSequence(), 10000);
  }

  _showStage(message, state, targetPercent) {
    if (this._complete || !this.element) return;
    const messageElem = this.element.querySelector('#store-current-message');
    const fill = this.element.querySelector('#store-loading-fill');
    const percent = this.element.querySelector('#store-loading-percent');
    const signalBars = this.element.querySelectorAll('#store-signal-bars .prog-intro-signal__bar');

    if (messageElem) {
      messageElem.textContent = message;
      messageElem.classList.remove('boot-message-current--processing', 'boot-message-current--warning', 'boot-message-current--success');
      messageElem.classList.add(`boot-message-current--${state}`, 'visible');
    }

    if (fill) fill.style.width = `${targetPercent}%`;
    if (percent) percent.textContent = `${targetPercent}%`;

    signalBars.forEach((bar, idx) => {
      bar.classList.toggle('active', idx < Math.max(1, Math.ceil(targetPercent / 25)));
    });
  }

  _skipBootSequence() {
    this._clearTransientState();
    this._finishSequence();
  }

  _finishSequence() {
    if (this._complete) return;
    this._complete = true;

    const finalState = this.element?.querySelector?.('#store-final-state');
    const footerArea = this.element?.querySelector?.('#store-footer-area');
    const result = this.element?.querySelector?.('#store-translation-result');
    const fill = this.element?.querySelector?.('#store-loading-fill');
    const percent = this.element?.querySelector?.('#store-loading-percent');
    const messageArea = this.element?.querySelector?.('#store-boot-message-area');
    const continueBtn = this.element?.querySelector?.('[data-action="continue"]');

    if (fill) fill.style.width = '100%';
    if (percent) percent.textContent = '100%';
    if (messageArea) messageArea.style.opacity = '0';

    if (result) {
      result.style.display = 'block';
      result.innerHTML = `
        <div class="prog-intro-label prog-intro-label--success">TRADE EXCHANGE READY</div>
        <div class="prog-intro-identity-subtext">${this.actor?.name || 'Guest'} • ${Number(this.actor?.system?.credits ?? 0) || 0} credits available</div>
      `;
      // Trigger fade-in animation
      requestAnimationFrame(() => {
        result.classList.add('prog-intro-identity-block--fade-in');
      });
    }
    if (finalState) {
      finalState.style.display = 'block';
      requestAnimationFrame(() => {
        finalState.classList.add('prog-intro-identity-block--fade-in');
      });
    }
    if (footerArea) {
      footerArea.style.display = 'flex';
      requestAnimationFrame(() => {
        footerArea.classList.add('prog-intro-footer--fade-in');
      });
    }
    if (continueBtn) continueBtn.focus?.();
  }

  async _onContinueAction(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    await this._proceedToStore();
  }

  async _proceedToStore() {
    await this.close();
  }
}

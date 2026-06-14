import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";

function nowIso() {
  try { return new Date().toISOString(); } catch (_err) { return String(Date.now()); }
}

export class GMGrantDialog extends BaseSWSEAppV2 {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: 'swse-gm-grant-dialog',
      title: 'Feat/Talent Grant',
      template: 'systems/foundryvtt-swse/templates/apps/gm-grant-dialog.hbs',
      position: { width: 520, height: 'auto' },
      window: {
        icon: 'fas fa-award',
        minimizable: false,
        resizable: false,
        frame: true
      }
    });
  }

  static async prompt({ actor, item, openSlots = [] } = {}) {
    if (!actor || !item) return null;
    return new Promise((resolve) => {
      const dialog = new GMGrantDialog({ actor, item, openSlots, resolve });
      dialog.render(true);
    });
  }

  constructor({ actor, item, openSlots = [], resolve } = {}) {
    super();
    this.actor = actor;
    this.item = item;
    this.openSlots = Array.isArray(openSlots) ? openSlots : [];
    this._resolve = resolve;
    this._resolved = false;
  }

  async _prepareContext() {
    return {
      actor: this.actor,
      actorName: this.actor?.name || 'Unknown Actor',
      item: this.item,
      itemName: this.item?.name || 'Unknown Item',
      itemType: this.item?.type || 'item',
      isFeat: this.item?.type === 'feat',
      isTalent: this.item?.type === 'talent',
      hasOpenSlots: this.openSlots.length > 0,
      openSlots: this.openSlots
    };
  }

  wireEvents() {
    const root = this.element;
    root.querySelectorAll('[data-grant-mode]').forEach(button => {
      button.addEventListener('click', (ev) => {
        ev.preventDefault();
        const mode = button.dataset.grantMode;
        const reason = root.querySelector('[name="reason"]')?.value?.trim?.() || '';
        const notes = root.querySelector('[name="notes"]')?.value?.trim?.() || '';
        this._choose(mode, { reason, notes });
      });
    });

    root.querySelector('[data-action="cancel"]')?.addEventListener('click', (ev) => {
      ev.preventDefault();
      this._choose('cancel');
    });
  }

  _choose(mode, extras = {}) {
    if (this._resolved) return;
    this._resolved = true;

    const user = globalThis.game?.user;
    const base = {
      mode,
      itemType: this.item?.type || null,
      itemName: this.item?.name || null,
      grantedBy: user?.id || null,
      grantedByName: user?.name || 'GM',
      grantedAt: nowIso(),
      reason: extras.reason || '',
      notes: extras.notes || ''
    };

    let result = null;
    if (mode === 'slot') {
      result = {
        ...base,
        source: 'progression-slot-drop',
        label: 'Progression Slot',
        countsAgainstSlot: true,
        reviewStatus: 'slot-assigned'
      };
    } else if (mode === 'gm-reward') {
      result = {
        ...base,
        source: 'gm-reward',
        label: 'GM Reward',
        countsAgainstSlot: false,
        reviewStatus: 'rewarded'
      };
    } else if (mode === 'manual') {
      result = {
        ...base,
        source: 'manual-unassigned',
        label: 'Manual / Unassigned',
        countsAgainstSlot: false,
        reviewStatus: 'unassigned'
      };
    }

    this._resolve?.(result);
    this.close();
  }

  async close(options) {
    if (!this._resolved) {
      this._resolved = true;
      this._resolve?.(null);
    }
    return super.close(options);
  }
}

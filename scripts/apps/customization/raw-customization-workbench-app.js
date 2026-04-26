import { ModificationModalShell } from '/systems/foundryvtt-swse/scripts/apps/base/modification-modal-shell.js';
import { CustomizationWorkflow } from '/systems/foundryvtt-swse/scripts/engine/customization/index.js';
import { LedgerService } from '/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js';

function fmtCredits(value) {
  return `${Number(value || 0).toLocaleString()} cr`;
}

function fmtHours(hours) {
  if (!Number.isFinite(hours)) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours % 8 === 0 && hours >= 8) return `${hours / 8} day${hours === 8 ? '' : 's'}`;
  return `${hours} hr`;
}

async function promptForMechanics(operationTitle, preview) {
  return new Promise((resolve) => {
    new Dialog({
      title: `${operationTitle} — Mechanics Check`,
      content: `
        <form class="swse-customization-check-dialog">
          <p><strong>DC:</strong> ${preview.mechanicsDC ?? '—'} &nbsp; <strong>Time:</strong> ${fmtHours(preview.timeHours ?? 0)} &nbsp; <strong>Cost:</strong> ${fmtCredits(preview.cost ?? 0)}</p>
          <div class="form-group">
            <label>Mechanics Total</label>
            <input type="number" name="mechanicsTotal" value="0" />
          </div>
        </form>`,
      buttons: {
        cancel: { label: 'Cancel', callback: () => resolve(null) },
        submit: {
          label: 'Apply',
          callback: (html) => {
            const mechanicsTotal = Number(html.find('input[name="mechanicsTotal"]').val()) || 0;
            resolve({ mechanicsTotal });
          }
        }
      },
      default: 'submit',
      close: () => resolve(null)
    }).render(true);
  });
}

export class RawCustomizationWorkbenchApp extends ModificationModalShell {
  constructor(actor, item, options = {}) {
    super(actor, item, options);
    this.workflow = new CustomizationWorkflow();
    this.selection = { type: null, key: null };
    this.installSource = 'commercial';
    this.destructiveRemoval = false;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(super.DEFAULT_OPTIONS ?? {}), {
    id: 'swse-raw-customization-workbench',
    classes: ['swse', 'raw-customization-workbench', 'swse-theme-holo'],
    window: {
      icon: 'fas fa-screwdriver-wrench',
      title: 'Customization Workbench',
      resizable: true
    },
    position: { width: 980, height: 720 }
  });

  getHeaderContent() {
    const state = this.workflow.getFullCustomizationState(this.item);
    return {
      title: `${this.item.name} Workbench`,
      subtitle: `${state.profile.category.toUpperCase()} · ${state.slotState.slots.freeSlots}/${state.slotState.slots.totalAvailable} slots free · Restriction: ${state.effectiveRestriction}`
    };
  }

  getFooterContent() {
    const wallet = Number(this.actor?.system?.credits || 0);
    const preview = this.#getSelectedPreview();
    return {
      totalCost: preview?.cost ?? 0,
      wallet,
      canConfirm: !!(this.selection.type && preview?.success)
    };
  }

  getMainContent() {
    return {
      list: this.#renderListPanel(),
      detail: this.#renderDetailPanel()
    };
  }

  attachEventListeners(root) {
    root.querySelectorAll('.raw-cw-list-item').forEach((el) => {
      el.addEventListener('click', async (event) => {
        event.preventDefault();
        this.selection = {
          type: el.dataset.selectionType,
          key: el.dataset.selectionKey || null
        };
        await this.render({ force: true });
      });
    });

    root.querySelector('[data-action="confirm"]')?.addEventListener('click', async (event) => {
      event.preventDefault();
      await this.#confirmSelection();
    });

    root.querySelector('[data-action="cancel"]')?.addEventListener('click', (event) => {
      event.preventDefault();
      this.close();
    });

    root.querySelector('[data-action="set-install-source"]')?.addEventListener('change', async (event) => {
      this.installSource = event.currentTarget.value || 'commercial';
      await this.render({ force: true });
    });

    root.querySelector('[data-action="toggle-destructive"]')?.addEventListener('change', async (event) => {
      this.destructiveRemoval = !!event.currentTarget.checked;
      await this.render({ force: true });
    });
  }

  #renderListPanel() {
    const state = this.workflow.getFullCustomizationState(this.item);
    const selected = this.selection;

    const sections = [];
    sections.push(this.#renderSummaryCard(state));

    if (state.availableUpgrades.length) {
      sections.push(`<div class="raw-cw-group"><div class="raw-cw-group-title">Install Upgrades</div>${state.availableUpgrades.map((entry) => this.#renderEntryCard('install', entry.key, entry.name, entry.allowed ? entry.description : `${entry.description} — ${entry.reason}`, selected, entry.allowed, fmtCredits(entry.cost), entry.slotCost)).join('')}</div>`);
    }

    if (state.installedUpgrades.length) {
      sections.push(`<div class="raw-cw-group"><div class="raw-cw-group-title">Installed Upgrades</div>${state.installedUpgrades.map((inst) => this.#renderEntryCard('remove', inst.instanceId, inst.upgradeKey.replaceAll('_', ' '), `Installed via ${inst.installSource}`, selected, true, fmtCredits(inst.operationCost), inst.slotCost)).join('')}</div>`);
    }

    const structuralCards = [];
    if (state.slotState.sizeIncreaseAllowed) {
      structuralCards.push(this.#renderEntryCard('size-increase', 'size', 'Increase Size', state.profile.category === 'armor' ? 'Increase armor weight class by one step for +1 slot.' : 'Increase size by one step for +1 slot.', selected, true, fmtCredits(this.workflow.previewSizeIncrease(this.actor, this.item)?.cost ?? 0), 0));
    }
    for (const area of state.slotState.strippable) {
      const readable = area.replaceAll('_', ' ');
      structuralCards.push(this.#renderEntryCard('strip', area, `Strip ${readable}`, `Permanently downgrade ${readable} to gain +1 slot.`, selected, true, fmtCredits(this.workflow.previewStrip(this.actor, this.item, area)?.cost ?? 0), 0));
    }
    if (structuralCards.length) {
      sections.push(`<div class="raw-cw-group"><div class="raw-cw-group-title">Structural Changes</div>${structuralCards.join('')}</div>`);
    }

    if (state.availableTemplates.length) {
      sections.push(`<div class="raw-cw-group"><div class="raw-cw-group-title">Templates</div>${state.availableTemplates.map((tmpl) => this.#renderEntryCard('template', tmpl.key, tmpl.name, tmpl.description, selected, tmpl.allowed, tmpl.rarity ? 'Rare' : tmpl.restriction, 0)).join('')}</div>`);
    }

    return `<div class="raw-cw-list-root">${sections.join('')}</div>`;
  }

  #renderSummaryCard(state) {
    const wallet = Number(this.actor?.system?.credits || 0);
    return `
      <div class="raw-cw-summary">
        <div class="raw-cw-stat"><span>Slots</span><strong>${state.slotState.slots.usedSlots}/${state.slotState.slots.totalAvailable}</strong></div>
        <div class="raw-cw-stat"><span>Free</span><strong>${state.slotState.slots.freeSlots}</strong></div>
        <div class="raw-cw-stat"><span>Wallet</span><strong>${fmtCredits(wallet)}</strong></div>
        <div class="raw-cw-stat"><span>Value</span><strong>${fmtCredits(state.effectiveValue)}</strong></div>
      </div>`;
  }

  #renderEntryCard(type, key, title, subtitle, selected, allowed = true, pill = '', slotCost = null) {
    const active = selected.type === type && selected.key === key;
    const classes = ['raw-cw-list-item'];
    if (active) classes.push('active');
    if (!allowed) classes.push('disabled');
    return `
      <button type="button" class="${classes.join(' ')}" data-selection-type="${type}" data-selection-key="${key}" ${allowed ? '' : 'disabled'}>
        <div class="raw-cw-list-main">
          <div class="raw-cw-list-title">${title}</div>
          <div class="raw-cw-list-subtitle">${subtitle}</div>
        </div>
        <div class="raw-cw-list-meta">
          ${pill ? `<span class="raw-cw-pill">${pill}</span>` : ''}
          ${slotCost !== null ? `<span class="raw-cw-slot-pill">${slotCost} slot${slotCost === 1 ? '' : 's'}</span>` : ''}
        </div>
      </button>`;
  }

  #renderDetailPanel() {
    const state = this.workflow.getFullCustomizationState(this.item);
    const preview = this.#getSelectedPreview();
    if (!this.selection.type) {
      return `<div class="raw-cw-empty">Select an upgrade, structural change, installed upgrade, or template from the left.</div>`;
    }

    const details = [];
    details.push(`<div class="raw-cw-detail-header"><h2>${this.#selectionTitle()}</h2><p>${state.profile.itemName}</p></div>`);

    if (this.selection.type === 'install') {
      const sourceOptions = ['commercial', 'scratch'].map((value) => `<option value="${value}" ${this.installSource === value ? 'selected' : ''}>${value === 'commercial' ? 'Commercially Bought' : 'Scratch-Built'}</option>`).join('');
      details.push(`<label class="raw-cw-field"><span>Install Source</span><select data-action="set-install-source">${sourceOptions}</select></label>`);
    }

    if (this.selection.type === 'remove') {
      details.push(`<label class="raw-cw-check"><input type="checkbox" data-action="toggle-destructive" ${this.destructiveRemoval ? 'checked' : ''}/> <span>Fast destructive removal (reduced time, upgrade may be destroyed)</span></label>`);
    }

    if (preview) {
      if (!preview.success) {
        details.push(`<div class="raw-cw-warning">${preview.reason}</div>`);
      } else {
        details.push(`<div class="raw-cw-preview-grid">
          <div><span>Cost</span><strong>${fmtCredits(preview.cost ?? 0)}</strong></div>
          <div><span>Mechanics DC</span><strong>${preview.mechanicsDC ?? '—'}</strong></div>
          <div><span>Time</span><strong>${fmtHours(preview.timeHours ?? 0)}</strong></div>
        </div>`);
        if (preview.notes) details.push(`<p class="raw-cw-detail-copy">${preview.notes}</p>`);
        if (preview.failureData) details.push(`<p class="raw-cw-detail-copy">On failure: retry cost ${fmtCredits(preview.failureData.retryCost ?? 0)}; retry time ${fmtHours(preview.failureData.retryTimeHours ?? 0)}.</p>`);
      }
    }

    details.push(`<div class="raw-cw-state-box">
      <div><span>Restriction</span><strong>${state.effectiveRestriction}</strong></div>
      <div><span>Slots Free</span><strong>${state.slotState.slots.freeSlots}</strong></div>
      <div><span>Overflow</span><strong>${state.slotState.slots.isOverflowing ? 'yes' : 'no'}</strong></div>
    </div>`);

    return `<div class="raw-cw-detail-root">${details.join('')}</div>`;
  }

  #selectionTitle() {
    if (this.selection.type === 'size-increase') return 'Increase Size';
    if (this.selection.type === 'strip') return `Strip ${String(this.selection.key).replaceAll('_', ' ')}`;
    if (this.selection.type === 'remove') return 'Remove Upgrade';
    const state = this.workflow.getFullCustomizationState(this.item);
    if (this.selection.type === 'install') {
      return state.availableUpgrades.find((entry) => entry.key === this.selection.key)?.name ?? 'Install Upgrade';
    }
    if (this.selection.type === 'template') {
      return state.availableTemplates.find((entry) => entry.key === this.selection.key)?.name ?? 'Apply Template';
    }
    return 'Customization';
  }

  #getSelectedPreview() {
    switch (this.selection.type) {
      case 'install': return this.workflow.previewInstall(this.actor, this.item, this.selection.key, this.installSource === 'scratch' ? 'scratch' : 'commercial');
      case 'remove': return this.workflow.previewRemove(this.item, this.selection.key, { destructive: this.destructiveRemoval });
      case 'strip': return this.workflow.previewStrip(this.actor, this.item, this.selection.key);
      case 'size-increase': return this.workflow.previewSizeIncrease(this.actor, this.item);
      case 'template': return this.workflow.previewTemplate(this.item, this.selection.key);
      default: return null;
    }
  }

  async #confirmSelection() {
    if (!this.selection.type) return;
    const preview = this.#getSelectedPreview();
    if (!preview?.success) {
      ui.notifications.warn(preview?.reason ?? 'Operation is not currently available.');
      return;
    }

    let result = null;
    if (['install', 'remove', 'strip', 'size-increase'].includes(this.selection.type)) {
      const mechanicsPayload = await promptForMechanics(this.#selectionTitle(), preview);
      if (!mechanicsPayload) return;
      if (this.selection.type === 'install') {
        result = await this.workflow.applyInstall(this.actor, this.item, this.selection.key, {
          installSource: this.installSource === 'scratch' ? 'scratch' : 'commercial',
          mechanicsTotal: mechanicsPayload.mechanicsTotal
        });
      } else if (this.selection.type === 'remove') {
        result = await this.workflow.applyRemove(this.actor, this.item, this.selection.key, {
          mechanicsTotal: mechanicsPayload.mechanicsTotal,
          destructive: this.destructiveRemoval
        });
      } else if (this.selection.type === 'strip') {
        result = await this.workflow.applyStrip(this.actor, this.item, this.selection.key, {
          mechanicsTotal: mechanicsPayload.mechanicsTotal
        });
      } else if (this.selection.type === 'size-increase') {
        result = await this.workflow.applySizeIncrease(this.actor, this.item, {
          mechanicsTotal: mechanicsPayload.mechanicsTotal
        });
      }
    } else if (this.selection.type === 'template') {
      result = await this.workflow.applyTemplate(this.actor, this.item, this.selection.key);
    }

    if (!result?.success) {
      ui.notifications.warn(result?.reason ?? 'Operation failed.');
      return;
    }

    ui.notifications.info(`${this.#selectionTitle()} applied successfully.`);
    await this.item.sheet?.render?.(false);
    await this.render({ force: true });
  }
}

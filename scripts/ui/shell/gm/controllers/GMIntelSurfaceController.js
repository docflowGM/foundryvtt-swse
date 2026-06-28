/** GM Intel surface controller.
 *
 * Handles Phase 4 draft/edit lifecycle for Holonet-backed Intel records. Actual
 * delivery to Messenger, Bulletin, Secret Notes, and player Dossier remains in
 * later phases.
 */

import {
  HolonetIntelService,
  INTEL_STATUS
} from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js';
import { DossierDragDropService } from '/systems/foundryvtt-swse/scripts/ui/dragdrop/dossier-drag-drop-service.js';
import { HolonetDecryptionService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-decryption-service.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';
import { confirmGmDatapadModal } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/utils/gm-datapad-modal.js';
import { GMSmartFormDropService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/utils/gm-smart-form-drop-service.js';

function text(formData, key) {
  return String(formData.get(key) ?? '').trim();
}

function checked(formData, key) {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

function splitCsv(value = '') {
  return String(value || '')
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

function multiValues(formData, key) {
  return formData.getAll(key)
    .map(value => String(value || '').trim())
    .filter(Boolean);
}

function defaultSkillsForMode(mode = 'glyphCipher') {
  try {
    return HolonetDecryptionService.defaultSkillsForMode(mode);
  } catch (_err) {
    return ['useComputer'];
  }
}

function parseLockboxItems(value = '') {
  return String(value || '')
    .split(/\n|,/g)
    .map(part => part.trim())
    .filter(Boolean)
    .map((line) => {
      const pieces = line.split('|').map(part => part.trim()).filter(Boolean);
      const uuid = pieces[0] || '';
      const quantity = Math.max(1, Number.parseInt(pieces[1] || '1', 10) || 1);
      const name = pieces[2] || '';
      return { uuid, quantity, name };
    })
    .filter(item => item.uuid);
}

function intelPayloadFromForm(formData) {
  const skillGateEnabled = checked(formData, 'skillGateEnabled');
  const decryptionMode = text(formData, 'decryptionMode') || 'glyphCipher';
  const selectedSkills = multiValues(formData, 'skillGateSkills');
  const fallbackSkills = splitCsv(text(formData, 'skillGateSkill')).length ? splitCsv(text(formData, 'skillGateSkill')) : defaultSkillsForMode(decryptionMode);
  const gateSkills = Array.from(new Set((selectedSkills.length ? selectedSkills : fallbackSkills).filter(Boolean)));
  if (decryptionMode === 'forceResonance' && !gateSkills.includes('useTheForce')) gateSkills.unshift('useTheForce');
  const primarySkill = gateSkills[0] || 'useComputer';
  return {
    title: text(formData, 'title') || 'Untitled Intel',
    kind: text(formData, 'kind'),
    classification: text(formData, 'classification'),
    status: text(formData, 'status'),
    persistence: text(formData, 'persistence'),
    revealState: text(formData, 'revealState'),
    linkedFactionId: text(formData, 'linkedFactionId'),
    linkedContactId: text(formData, 'linkedContactId'),
    linkedActorUuid: text(formData, 'linkedActorUuid'),
    linkedJobThreadId: text(formData, 'linkedJobThreadId'),
    linkedSceneUuid: text(formData, 'linkedSceneUuid'),
    linkedItemUuid: text(formData, 'linkedItemUuid'),
    summary: text(formData, 'summary'),
    publicBody: text(formData, 'publicBody'),
    redactedBody: text(formData, 'redactedBody'),
    fullBody: text(formData, 'fullBody'),
    gmNotes: text(formData, 'gmNotes'),
    tags: splitCsv(text(formData, 'tags')),
    lockbox: {
      enabled: checked(formData, 'lockboxEnabled'),
      label: text(formData, 'lockboxLabel') || 'Encrypted Lockbox',
      credits: Number(text(formData, 'lockboxCredits')) || 0,
      items: parseLockboxItems(text(formData, 'lockboxItems')),
      notes: text(formData, 'lockboxNotes')
    },
    visibility: {
      mode: text(formData, 'visibilityMode') || 'gm-only',
      userIds: splitCsv(text(formData, 'visibilityUserIds')),
      actorIds: splitCsv(text(formData, 'visibilityActorIds'))
    },
    dossierCommit: checked(formData, 'dossierCommit'),
    skillGate: {
      enabled: skillGateEnabled,
      skill: primarySkill,
      skills: gateSkills,
      dc: Number(text(formData, 'skillGateDc')) || 0,
      level: Number(text(formData, 'cipherLevel')) || 12,
      decryptionMode,
      cipherMode: text(formData, 'cipherMode'),
      glyphs: checked(formData, 'cipherGlyphs'),
      transpose: checked(formData, 'cipherTranspose'),
      preRevealFrac: (Number(text(formData, 'cipherPreReveal')) || 0) / 100,
      failEnabled: checked(formData, 'cipherFailEnabled'),
      failType: text(formData, 'cipherFailType') || 'attempts',
      failedRollLimit: Number(text(formData, 'cipherFailedRollLimit')) || 6,
      traceMax: Number(text(formData, 'cipherTraceMax')) || 10,
      successMode: 'reveal-full',
      failureMode: 'keep-redacted',
      attempts: 'gm-managed'
    }
  };
}

export class GMIntelSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
    this._searchTimer = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.querySelector('.gm-datapad-intel');
    if (!pageElement) return;
    if (!this._assertGM('manage GM Intel')) return;

    DossierDragDropService.bindDragSources(pageElement, { signal });
    this._wireFilters(pageElement, signal);
    this._wireIntelActions(pageElement, signal);
    this._wireForms(pageElement, signal);
    this._wireWizardControls(pageElement, signal);
    GMSmartFormDropService.bind(pageElement, { signal });
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
    if (this._searchTimer) window.clearTimeout(this._searchTimer);
    this._searchTimer = null;
  }

  _wireFilters(pageElement, signal) {
    pageElement.querySelectorAll('[data-intel-filter]').forEach((input) => {
      const eventName = input.tagName === 'INPUT' && input.type === 'search' ? 'input' : 'change';
      input.addEventListener(eventName, async (event) => {
        const target = event.currentTarget;
        const key = target.dataset.intelFilter;
        if (!key) return;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        const patch = { [key]: value };
        if (key !== 'selectedRecordId') patch.selectedRecordId = this.host?.getSurfaceState?.('intel')?.selectedRecordId || '';

        if (eventName === 'input') {
          if (this._searchTimer) window.clearTimeout(this._searchTimer);
          this._searchTimer = window.setTimeout(async () => {
            this.host?.patchSurfaceState?.('intel', patch, { render: false });
            await this._refresh('gm-intel-filter');
          }, 180);
          return;
        }
        this.host?.patchSurfaceState?.('intel', patch, { render: false });
        await this._refresh('gm-intel-filter');
      }, { signal });
    });
  }

  _wireIntelActions(pageElement, signal) {
    this._wireModeDropdown(pageElement, signal);
    this._wireDifficultyDropdown(pageElement, signal);
    this._wireSkillPicker(pageElement, signal);

    pageElement.querySelectorAll('[data-intel-mode-select]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const mode = event.currentTarget?.dataset?.intelModeSelect || '';
        const select = pageElement.querySelector('select[name="decryptionMode"]');
        if (select && mode) {
          select.value = mode;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        pageElement.querySelectorAll('[data-intel-mode-select]').forEach(entry => entry.classList.toggle('is-selected', entry === event.currentTarget));
      }, { signal });
    });

    pageElement.querySelectorAll('[data-intel-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const target = event.currentTarget;
        const action = target.dataset.intelAction;
        const recordId = target.dataset.recordId || this.host?.getSurfaceState?.('intel')?.selectedRecordId || '';
        if (!action) return;

        if (action === 'select') {
          this.host?.patchSurfaceState?.('intel', { selectedRecordId: recordId }, { render: false });
          await this._refresh('gm-intel-select');
          return;
        }

        if (action === 'new') {
          this.host?.patchSurfaceState?.('intel', { selectedRecordId: '', selectedMode: 'create', modal: { type: 'editor', recordId: '' } }, { render: false });
          await this._refresh('gm-intel-new-wizard');
          return;
        }

        if (action === 'edit') {
          if (!recordId) {
            ui.notifications?.warn?.('Select an Intel record before editing.');
            return;
          }
          this.host?.patchSurfaceState?.('intel', { selectedRecordId: recordId, selectedMode: 'edit', modal: { type: 'editor', recordId } }, { render: false });
          await this._refresh('gm-intel-edit-wizard');
          return;
        }

        if (action === 'close-modal') {
          this.host?.patchSurfaceState?.('intel', { modal: null }, { render: false });
          await this._refresh('gm-intel-close-modal');
          return;
        }

        if (action === 'wizard-next' || action === 'wizard-back') {
          this._shiftWizardPage(target.closest('[data-intel-wizard]'), action === 'wizard-next' ? 1 : -1);
          return;
        }

        if (action === 'duplicate' && recordId) {
          const record = await HolonetIntelService.duplicateIntel(recordId);
          if (record?.id) this.host?.patchSurfaceState?.('intel', { selectedRecordId: record.id }, { render: false });
          ui.notifications?.info?.('Intel draft duplicated.');
          await this._refresh('gm-intel-duplicate');
          return;
        }

        if (action === 'mark-ready' && recordId) {
          await HolonetIntelService.markReady(recordId);
          ui.notifications?.info?.('Intel marked ready for later delivery.');
          await this._refresh('gm-intel-ready');
          return;
        }

        if (action === 'release' && recordId) {
          await HolonetIntelService.releaseIntel(recordId);
          ui.notifications?.info?.('Intel metadata marked released.');
          await this._refresh('gm-intel-release');
          return;
        }

        if (action === 'deliver-secret-note' && recordId) {
          const result = await HolonetIntelService.deliverAsSecretNote(recordId, { actor: this.host?.actor ?? null, partyFallback: true });
          if (result?.ok) ui.notifications?.info?.('Intel delivered as an encrypted/secret Holonet note.');
          else ui.notifications?.warn?.('Intel could not be delivered as a Secret Note.');
          await this._refresh('gm-intel-deliver-secret');
          return;
        }

        if (action === 'deliver-messenger' && recordId) {
          const result = await HolonetIntelService.deliverAsMessengerMessage(recordId, { actor: this.host?.actor ?? null, partyFallback: true });
          if (result?.ok) ui.notifications?.info?.('Intel delivered through Messenger.');
          else ui.notifications?.warn?.('Intel could not be delivered through Messenger.');
          await this._refresh('gm-intel-deliver-message');
          return;
        }

        if (action === 'deliver-bulletin' && recordId) {
          const result = await HolonetIntelService.deliverAsBulletin(recordId, { partyFallback: true });
          if (result?.ok) ui.notifications?.info?.('Intel published as a Bulletin notice.');
          else ui.notifications?.warn?.('Intel could not be published as a Bulletin notice.');
          await this._refresh('gm-intel-deliver-bulletin');
          return;
        }

        if (action === 'release-dossier' && recordId) {
          const result = await HolonetIntelService.releaseToDossier(recordId, { partyFallback: true });
          if (result?.ok) ui.notifications?.info?.('Intel released to the player Intel Locker.');
          else ui.notifications?.warn?.('Intel could not be released to the player Intel Locker.');
          await this._refresh('gm-intel-release-dossier');
          return;
        }

        if (action === 'force-decrypt' && recordId) {
          const result = await HolonetIntelService.forceDecryptIntel(recordId);
          if (result?.ok) ui.notifications?.info?.('Intel lockbox decrypted by GM override.');
          else ui.notifications?.warn?.('Intel lockbox could not be decrypted.');
          await this._refresh('gm-intel-force-decrypt');
          return;
        }

        if (action === 'archive' && recordId) {
          await HolonetIntelService.archiveIntel(recordId, { reason: 'gm-intel-surface' });
          ui.notifications?.info?.('Intel archived.');
          await this._refresh('gm-intel-archive');
          return;
        }

        if (action === 'destroy' && recordId) {
          const confirmed = await confirmGmDatapadModal(pageElement, {
            title: 'Destroy Intel?',
            message: 'This marks the Intel destroyed and archives the backing Holonet record.',
            detail: 'The world setting entry is preserved for audit/history; this is a GM-visible destructive state change.',
            confirmLabel: 'Destroy Intel',
            cancelLabel: 'Keep Intel',
            tone: 'danger'
          });
          if (!confirmed) return;
          await HolonetIntelService.destroyIntel(recordId, { reason: 'gm-intel-surface' });
          ui.notifications?.info?.('Intel marked destroyed.');
          await this._refresh('gm-intel-destroy');
          return;
        }

        if (action === 'delivery-placeholder') {
          ui.notifications?.info?.('Use the delivery buttons above: Secret Note, Messenger, Bulletin, or Intel Locker.');
        }
      }, { signal });
    });
  }


  _wireModeDropdown(pageElement, signal) {
    pageElement.querySelectorAll('[data-intel-mode-select-control]').forEach((select) => {
      const update = () => {
        const mode = select.value || 'glyphCipher';
        pageElement.querySelectorAll('[data-intel-mode-summary]').forEach((summary) => {
          summary.classList.toggle('is-active', summary.dataset.intelModeSummary === mode);
        });
        const option = select.selectedOptions?.[0];
        const defaults = String(option?.dataset?.defaultSkills || '')
          .split(',')
          .map(entry => entry.trim())
          .filter(Boolean);
        if (defaults.length) {
          pageElement.querySelectorAll('[data-intel-skill-option]').forEach((input) => {
            input.checked = defaults.includes(input.value);
            const card = input.closest('.gm-intel-skill-option');
            if (card) card.classList.toggle('is-selected', input.checked);
          });
          this._syncSkillSummary(pageElement);
        }
      };
      select.addEventListener('change', update, { signal });
    });
  }

  _wireDifficultyDropdown(pageElement, signal) {
    pageElement.querySelectorAll('[data-intel-difficulty-select]').forEach((select) => {
      const update = () => {
        const option = select.selectedOptions?.[0];
        const dc = option?.dataset?.dc;
        const level = option?.dataset?.level;
        const dcInput = pageElement.querySelector('input[name="skillGateDc"]');
        const levelInput = pageElement.querySelector('input[name="cipherLevel"]');
        if (dcInput && dc) dcInput.value = dc;
        if (levelInput && level) levelInput.value = level;
        const summary = pageElement.querySelector('[data-intel-difficulty-summary]');
        if (summary && option) summary.textContent = option.dataset.description || `${option.textContent || 'Preset'} selected.`;
      };
      select.addEventListener('change', update, { signal });
    });
  }

  _wireSkillPicker(pageElement, signal) {
    pageElement.querySelectorAll('[data-intel-skill-option]').forEach((input) => {
      const update = () => {
        const card = input.closest('.gm-intel-skill-option');
        if (card) card.classList.toggle('is-selected', input.checked);
        this._syncSkillSummary(pageElement);
      };
      input.addEventListener('change', update, { signal });
      update();
    });
    this._syncSkillSummary(pageElement);
  }

  _syncSkillSummary(pageElement) {
    const checkedSkills = Array.from(pageElement.querySelectorAll('[data-intel-skill-option]:checked'));
    const labels = checkedSkills.map(input => input.dataset.skillLabel || input.value).filter(Boolean);
    pageElement.querySelectorAll('[data-intel-skill-summary]').forEach((summary) => {
      summary.textContent = labels.length ? labels.join(', ') : 'No skills selected yet';
    });
  }

  _wireForms(pageElement, signal) {
    pageElement.querySelectorAll('form[data-intel-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!this._assertGM('save GM Intel')) return;
        const data = new FormData(form);
        const recordId = text(data, 'recordId');
        const payload = intelPayloadFromForm(data);
        const record = recordId
          ? await HolonetIntelService.updateIntel(recordId, payload)
          : await HolonetIntelService.createIntelDraft(payload);
        if (!record) {
          ui.notifications?.warn?.('Intel could not be saved.');
          return;
        }
        this.host?.patchSurfaceState?.('intel', { selectedRecordId: record.id, selectedMode: 'edit', modal: null }, { render: false });
        ui.notifications?.info?.(`Intel ${recordId ? 'updated' : 'draft created'}.`);
        await this._refresh('gm-intel-save');
      }, { signal });
    });

    pageElement.querySelectorAll('[data-intel-save-ready]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const form = event.currentTarget.closest('form[data-intel-form]');
        if (!form) return;
        const data = new FormData(form);
        data.set('status', INTEL_STATUS.READY);
        const recordId = text(data, 'recordId');
        const payload = intelPayloadFromForm(data);
        const record = recordId
          ? await HolonetIntelService.updateIntel(recordId, payload)
          : await HolonetIntelService.createIntelDraft(payload);
        if (record?.id) this.host?.patchSurfaceState?.('intel', { selectedRecordId: record.id, modal: null }, { render: false });
        ui.notifications?.info?.('Intel saved and marked ready.');
        await this._refresh('gm-intel-save-ready');
      }, { signal });
    });
  }


  _wireWizardControls(pageElement, signal) {
    pageElement.querySelectorAll('[data-intel-wizard]').forEach((wizard) => {
      this._setWizardPage(wizard, 1);
      wizard.addEventListener('change', (event) => {
        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;
        const card = input.closest('.gm-intel-mode-card, .gm-intel-toggle-card');
        if (card) card.classList.toggle('is-selected', input.checked);
      }, { signal });
    });
  }

  _shiftWizardPage(wizard, delta = 1) {
    if (!wizard) return;
    const maxPage = Math.max(1, ...Array.from(wizard.querySelectorAll('[data-intel-page]')).map(page => Number(page.dataset.intelPage || 1)).filter(Number.isFinite));
    const current = Number(wizard.dataset.currentPage || 1);
    this._setWizardPage(wizard, Math.max(1, Math.min(maxPage, current + delta)));
  }

  _setWizardPage(wizard, pageNumber = 1) {
    if (!wizard) return;
    const page = Math.max(1, Number(pageNumber) || 1);
    wizard.dataset.currentPage = String(page);
    wizard.querySelectorAll('[data-intel-page]').forEach(panel => panel.classList.toggle('is-active', Number(panel.dataset.intelPage || 1) === page));
    wizard.querySelectorAll('[data-intel-step-indicator]').forEach(indicator => {
      const index = Number(indicator.dataset.intelStepIndicator || 1);
      indicator.classList.toggle('is-active', index === page);
      indicator.classList.toggle('is-complete', index < page);
    });
    const maxPage = Math.max(1, ...Array.from(wizard.querySelectorAll('[data-intel-page]')).map(panel => Number(panel.dataset.intelPage || 1)).filter(Number.isFinite));
    wizard.querySelectorAll('[data-intel-action="wizard-back"]').forEach(button => {
      button.disabled = page <= 1;
    });
    wizard.querySelectorAll('[data-intel-action="wizard-next"]').forEach(button => {
      button.disabled = page >= maxPage;
      button.textContent = page >= maxPage ? 'Review Complete' : 'Next';
    });
  }

  _assertGM(action = 'use GM Intel controls') {
    if (game.user?.isGM) return true;
    ui?.notifications?.warn?.(`Only a GM can ${action}.`);
    return false;
  }

  async _refresh(reason = 'gm-intel-refresh') {
    await requestShellRender(this.host, { reason, surfaceId: 'intel' });
  }
}

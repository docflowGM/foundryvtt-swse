/**
 * GMBulletinSurfaceController
 *
 * Owns DOM wiring for the GM Bulletin / HoloNews surface. Bulletin record
 * creation, publishing, contact persistence, delivery-state changes, and
 * Holonews automation remain on the GM Datapad host and existing Holonet
 * services so this extraction does not create a second bulletin authority.
 */

import { HolonetEngine } from '/systems/foundryvtt-swse/scripts/holonet/holonet-engine.js';
import { HolonetStorage } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js';
import { HolonetStateService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-state-service.js';
import { HolonewsGenerator } from '/systems/foundryvtt-swse/scripts/holonet/data/holonews-seed-events.js';
import { BulletinContactRegistry } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/bulletin-contact-registry.js';
import { HolonetComposerAssist } from '/systems/foundryvtt-swse/scripts/ui/holonet/HolonetComposerAssist.js';

export class GMBulletinSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.querySelector('.gm-datapad-bulletin');
    if (!pageElement) return;

    await HolonetComposerAssist.attach(pageElement);

    this._wireSectionTabs(pageElement, signal);
    this._wireRecordActions(pageElement, signal);
    this._wireSubmitModeButtons(pageElement, signal);
    this._wireHolonewsFilters(pageElement, signal);
    this._wireHolonewsActions(pageElement, signal);
    this._wirePreviewDelivery(pageElement, signal);
    this._wireContactControls(pageElement, signal);
    this._wireAtomPolicy(pageElement, signal);
    this._wireContactSelectors(pageElement, signal);
    this._wireImagePickers(pageElement, signal);
    this._wireMediaDrops(pageElement, signal);
    this._wireLivePreview(pageElement, signal);
    this._wireBulletinForms(pageElement, signal);
    this._wireStateForms(pageElement, signal);
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
  }

  _wireSectionTabs(pageElement, signal) {
    pageElement.querySelectorAll('[data-bulletin-section]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host.currentBulletinSection = event.currentTarget.dataset.bulletinSection;
        this.host.bulletinEditor = { section: this.host.currentBulletinSection, mode: 'create', recordId: null };
        await this.host.render(false);
      }, { signal });
    });
  }

  _wireRecordActions(pageElement, signal) {
    pageElement.querySelectorAll('[data-action="bulletin-edit"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host.bulletinEditor = {
          section: event.currentTarget.dataset.section,
          mode: 'edit',
          recordId: event.currentTarget.dataset.recordId
        };
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="bulletin-archive"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        await HolonetEngine.archiveRecord(event.currentTarget.dataset.recordId);
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="bulletin-delete"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        await HolonetStorage.deleteRecord(event.currentTarget.dataset.recordId);
        if (this.host.bulletinEditor?.recordId === event.currentTarget.dataset.recordId) {
          this.host.bulletinEditor = { section: this.host.currentBulletinSection, mode: 'create', recordId: null };
        }
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="bulletin-publish"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const record = await HolonetStorage.getRecord(event.currentTarget.dataset.recordId);
        if (!record) return;
        this.host._applyBulletinProjectionOptions(record, {
          urgent: record.metadata?.urgent === true || record.metadata?.breakingNews === true,
          breakingNews: record.metadata?.breakingNews === true,
          pinAsLastSession: record.metadata?.pinAsLastSession === true,
          homeSlot: record.metadata?.homeSlot || 'feed'
        });
        await HolonetEngine.publish(record);
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="bulletin-pin-last-session"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const record = await HolonetStorage.getRecord(event.currentTarget.dataset.recordId);
        if (!record) return;
        this.host._applyBulletinProjectionOptions(record, {
          urgent: record.metadata?.urgent === true || record.metadata?.breakingNews === true,
          breakingNews: record.metadata?.breakingNews === true,
          pinAsLastSession: true,
          homeSlot: 'last-session'
        });
        await this.host._unpinOtherBulletins(record.id);
        await HolonetStorage.saveRecord(record);
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="bulletin-unpin-last-session"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const record = await HolonetStorage.getRecord(event.currentTarget.dataset.recordId);
        if (!record) return;
        this.host._applyBulletinProjectionOptions(record, {
          urgent: record.metadata?.urgent === true || record.metadata?.breakingNews === true,
          breakingNews: record.metadata?.breakingNews === true,
          pinAsLastSession: false,
          homeSlot: 'feed'
        });
        await HolonetStorage.saveRecord(record);
        await this.host.render(false);
      }, { signal });
    });
  }

  _wireSubmitModeButtons(pageElement, signal) {
    pageElement.querySelectorAll('[data-submit-mode]').forEach((button) => {
      button.addEventListener('click', (event) => {
        const form = event.currentTarget.closest('form');
        const hidden = form?.querySelector('[name="submitMode"]');
        if (hidden) hidden.value = event.currentTarget.dataset.submitMode;
      }, { signal });
    });
  }

  _wireHolonewsFilters(pageElement, signal) {
    const wireFilterForm = pageElement.querySelector('[data-holonews-wire-filter-form]');
    if (wireFilterForm) {
      wireFilterForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        this.host._applyHolonewsWireFilters(new FormData(wireFilterForm));
        await this.host.render(false);
      }, { signal });
      wireFilterForm.querySelectorAll('select, input[type="checkbox"]').forEach((field) => {
        field.addEventListener('change', async () => {
          this.host._applyHolonewsWireFilters(new FormData(wireFilterForm));
          await this.host.render(false);
        }, { signal });
      });
    }

    const archiveFilterForm = pageElement.querySelector('[data-holonews-archive-filter-form]');
    if (archiveFilterForm) {
      archiveFilterForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        this.host._applyHolonewsArchiveFilters(new FormData(archiveFilterForm));
        await this.host.render(false);
      }, { signal });
      archiveFilterForm.querySelectorAll('select').forEach((field) => {
        field.addEventListener('change', async () => {
          this.host._applyHolonewsArchiveFilters(new FormData(archiveFilterForm));
          await this.host.render(false);
        }, { signal });
      });
    }

    pageElement.querySelectorAll('[data-action="holonews-reset-archive-filters"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host.holonewsArchiveFilters = { query: '', state: '', type: '', priority: '', sector: '', category: '' };
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="holonews-reset-wire-filters"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host.holonewsSeedOffset = 0;
        this.host.holonewsHideUsedSeeds = true;
        this.host.holonewsWireFilters = { query: '', category: '', sector: '', priority: '' };
        await this.host.render(false);
      }, { signal });
    });
  }

  _wireHolonewsActions(pageElement, signal) {
    pageElement.querySelectorAll('[data-action="holonews-duplicate-draft"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        await this.host._duplicateHolonewsRecord(event.currentTarget.dataset.recordId);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="holonews-toggle-breaking"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        await this.host._setHolonewsBreaking(event.currentTarget.dataset.recordId, event.currentTarget.dataset.enabled === 'true');
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="holonews-restore-draft"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        await this.host._restoreHolonewsAsDraft(event.currentTarget.dataset.recordId);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="holonews-wire-next"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host.holonewsSeedOffset = (Number(this.host.holonewsSeedOffset) || 0) + 12;
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="holonews-wire-prev"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host.holonewsSeedOffset = Math.max(0, (Number(this.host.holonewsSeedOffset) || 0) - 12);
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="holonews-shuffle-wire"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const filteredCount = Number(button.dataset.filteredCount || 0);
        const ceiling = filteredCount > 0 ? filteredCount : HolonewsGenerator.count(this.host.holonewsWireFilters);
        this.host.holonewsSeedOffset = ceiling > 12 ? Math.floor(Math.random() * Math.max(1, ceiling - 12)) : 0;
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="holonews-use-draft"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        await this.host._createHolonewsFromSeed(event.currentTarget.dataset.seedId, { publish: false });
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="holonews-publish-ambient"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        await this.host._createHolonewsFromSeed(event.currentTarget.dataset.seedId, { publish: true });
      }, { signal });
    });

    const automationForm = pageElement.querySelector('[data-holonews-automation-form]');
    if (automationForm) {
      automationForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await this.host._saveHolonewsAutomationPolicy(new FormData(automationForm));
      }, { signal });
    }

    pageElement.querySelectorAll('[data-action="holonews-auto-publish-now"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const count = Number(event.currentTarget.dataset.count || 1);
        await this.host._publishHolonewsAmbientNow(count);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="holonews-auto-reset-schedule"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        await this.host._resetHolonewsAutomationSchedule();
      }, { signal });
    });
  }

  _wirePreviewDelivery(pageElement, signal) {
    pageElement.querySelectorAll('[data-select-bulletin-preview-user]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host.selectedBulletinPreviewUserId = event.currentTarget.dataset.selectBulletinPreviewUser || null;
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-bulletin-preview-delivery-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const action = event.currentTarget.dataset.bulletinPreviewDeliveryAction;
        const recordId = event.currentTarget.dataset.recordId;
        const recipientId = event.currentTarget.dataset.recipientId;
        await this.host._setBulletinPreviewDeliveryState(recordId, recipientId, action);
      }, { signal });
    });
  }

  _wireContactControls(pageElement, signal) {
    pageElement.querySelectorAll('[data-action="bulletin-save-contact"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const form = event.currentTarget.closest('form') || pageElement.querySelector('[data-bulletin-contact-form]');
        if (!form) return;
        await this.host._saveBulletinContact(new FormData(form));
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="bulletin-edit-contact"], [data-action="bulletin-clone-contact"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const action = event.currentTarget.dataset.action;
        const contact = await BulletinContactRegistry.getById(event.currentTarget.dataset.contactId);
        if (!contact) {
          ui?.notifications?.warn?.('That bulletin contact could not be found.');
          return;
        }
        const form = pageElement.querySelector('[data-bulletin-contact-form]');
        if (!form) return;
        this.host._populateBulletinContactForm(form, contact, { clone: action === 'bulletin-clone-contact' });
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="bulletin-delete-contact"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        await this.host._deleteBulletinContact(event.currentTarget.dataset.contactId);
      }, { signal });
    });
  }

  _wireAtomPolicy(pageElement, signal) {
    const atomPolicyForm = pageElement.querySelector('[data-holonews-atom-policy-form]');
    if (atomPolicyForm) {
      atomPolicyForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await this.host._saveHolonewsAtomPolicy(new FormData(atomPolicyForm));
      }, { signal });
    }

    pageElement.querySelectorAll('[data-action="holonews-reset-atom-policy"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        await this.host._resetHolonewsAtomPolicy();
      }, { signal });
    });
  }

  _wireContactSelectors(pageElement, signal) {
    pageElement.querySelectorAll('[data-bulletin-contact-select]').forEach((select) => {
      select.addEventListener('change', async () => {
        if (!select.value) return;
        const form = select.closest('form');
        const contact = await BulletinContactRegistry.getById(select.value);
        if (!form || !contact) return;
        this.host._populateBulletinContactForm(form, contact, { clone: true });
      }, { signal });
    });
  }

  _wireImagePickers(pageElement, signal) {
    pageElement.querySelectorAll('[data-action="bulletin-pick-image"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const form = event.currentTarget.closest('form');
        const input = form?.querySelector('[data-bulletin-image-input]');
        if (!input) return;
        if (!globalThis.FilePicker) return;
        const picker = new FilePicker({
          type: 'image',
          current: input.value || '',
          callback: (path) => {
            input.value = path;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        await picker.browse();
      }, { signal });
    });
  }

  _wireMediaDrops(pageElement, signal) {
    pageElement.querySelectorAll('[data-bulletin-image-dropzone]').forEach((dropzone) => {
      const input = dropzone.querySelector('[data-bulletin-image-input]') || dropzone.closest('form')?.querySelector('[data-bulletin-image-input]');
      if (!input) return;
      dropzone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropzone.classList.add('is-dragover');
      }, { signal });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'), { signal });
      dropzone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropzone.classList.remove('is-dragover');
        const raw = event.dataTransfer?.getData('text/plain') || event.dataTransfer?.getData('text/uri-list') || '';
        const path = String(raw || '').trim();
        if (!path) return;
        input.value = path;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, { signal });
    });
  }

  _wireLivePreview(pageElement, signal) {
    const activeForm = pageElement.querySelector('[data-bulletin-form="events"], [data-bulletin-form="holonews"], [data-bulletin-form="messages"]');
    const preview = pageElement.querySelector('[data-bulletin-live-preview]');
    if (!activeForm || !preview) return;

    const update = () => this.host._refreshBulletinLivePreview(activeForm, preview);
    activeForm.querySelectorAll('input, textarea, select').forEach((field) => {
      field.addEventListener('input', update, { signal });
      field.addEventListener('change', update, { signal });
    });
    update();

    pageElement.querySelectorAll('[data-player-state-form], [data-party-state-form]').forEach((form) => {
      form.querySelectorAll('input, textarea').forEach((field) => {
        field.addEventListener('input', () => this.host._refreshBulletinStatePreview(form, preview), { signal });
        field.addEventListener('change', () => this.host._refreshBulletinStatePreview(form, preview), { signal });
      });
    });
  }

  _wireBulletinForms(pageElement, signal) {
    const eventsForm = pageElement.querySelector('[data-bulletin-form="events"]');
    if (eventsForm) {
      eventsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await this.host._saveBulletinRecord(new FormData(eventsForm), 'events');
      }, { signal });
    }

    const holonewsForm = pageElement.querySelector('[data-bulletin-form="holonews"]');
    if (holonewsForm) {
      holonewsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await this.host._saveBulletinRecord(new FormData(holonewsForm), 'holonews');
      }, { signal });
    }

    const messagesForm = pageElement.querySelector('[data-bulletin-form="messages"]');
    if (messagesForm) {
      messagesForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await this.host._saveBulletinRecord(new FormData(messagesForm), 'messages');
      }, { signal });
    }
  }

  _wireStateForms(pageElement, signal) {
    const playerStateForm = pageElement.querySelector('[data-player-state-form]');
    if (playerStateForm) {
      playerStateForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(playerStateForm);
        const actorId = formData.get('actorId');
        if (!actorId) return;
        await HolonetStateService.savePlayerState(actorId, {
          location: formData.get('location'),
          objective: formData.get('objective'),
          situation: formData.get('situation')
        });
        this.host.selectedPlayerStateActorId = actorId;
        await this.host.render(false);
      }, { signal });
    }

    pageElement.querySelectorAll('[data-select-player-state]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host.selectedPlayerStateActorId = event.currentTarget.dataset.selectPlayerState;
        await this.host.render(false);
      }, { signal });
    });

    const partyStateForm = pageElement.querySelector('[data-party-state-form]');
    if (partyStateForm) {
      partyStateForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(partyStateForm);
        await HolonetStateService.savePartyState({
          location: formData.get('location'),
          objective: formData.get('objective'),
          situation: formData.get('situation')
        });
        await this.host.render(false);
      }, { signal });
    }
  }
}

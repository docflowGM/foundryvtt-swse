/**
 * GMJobBoardSurfaceController
 *
 * Owns DOM wiring for the GM Job Board surface. Job creation, status updates,
 * reward distribution, XP payout, and item award actions still flow through
 * HolonetMessengerService so existing settlement/rollback behavior remains the
 * single source of truth.
 */

import { HolonetMessengerService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js';
import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { FactionJobBridgeService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/FactionJobBridgeService.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';
import { mutateShellOnly } from '/systems/foundryvtt-swse/scripts/ui/shell/mutate-and-repaint.js';

export class GMJobBoardSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.querySelector('.gm-datapad-jobs');
    if (!pageElement) return;
    if (!this._assertGM('open the GM Job Board')) return;

    this._wireJobBoardTabs(pageElement, signal);
    this._wireWizardControls(pageElement, signal);
    this._wireContractWizardEnhancements(pageElement, signal);
    this._wireContractRewardDrops(pageElement, signal);
    this._wireContractDraftRecovery(pageElement, signal);
    this._wireCreateForms(pageElement, signal);
    this._wireDistributionForms(pageElement, signal);
    this._wireXpForms(pageElement, signal);
    this._wireSelectionButtons(pageElement, signal);
    this._wireStatusButtons(pageElement, signal);
    this._wireObjectiveButtons(pageElement, signal);
    this._wirePayoutForms(pageElement, signal);
    this._wireItemAwardForms(pageElement, signal);
    this._wireAssetAwardForms(pageElement, signal);
    this._wireIssuerButtons(pageElement, signal);
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
  }

  _assertGM(action = 'use GM Job Board controls') {
    if (game.user?.isGM) return true;
    ui?.notifications?.warn?.(`Only a GM can ${action}.`);
    return false;
  }

  _wireJobBoardTabs(pageElement, signal) {
    const storageKey = 'swse.gmDatapad.jobBoard.activeTab';
    const buttons = Array.from(pageElement.querySelectorAll('[data-job-tab-switch]'));
    const panels = Array.from(pageElement.querySelectorAll('[data-job-tab-panel]'));
    if (!buttons.length || !panels.length) return;

    const validTabs = new Set(panels.map(panel => panel.dataset.jobTabPanel).filter(Boolean));
    const hasSelectedJob = Boolean(pageElement.querySelector('.gm-job-quick-rail .gm-phase9-dossier-header, .gm-job-dossier-main .gm-phase9-dossier-header'));

    const setActiveTab = (requestedTab = 'board', { persist = true } = {}) => {
      let tab = validTabs.has(requestedTab) ? requestedTab : 'board';
      if (!hasSelectedJob && (tab === 'dossier' || tab === 'settlement')) tab = 'board';

      pageElement.dataset.activeJobTab = tab;
      buttons.forEach(button => {
        const active = button.dataset.jobTabSwitch === tab;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      panels.forEach(panel => {
        const active = panel.dataset.jobTabPanel === tab;
        panel.classList.toggle('is-active', active);
        panel.hidden = !active;
      });

      if (persist) {
        try { globalThis.localStorage?.setItem?.(storageKey, tab); } catch (_err) {}
      }
    };

    pageElement.addEventListener('click', (event) => {
      const button = event.target?.closest?.('[data-job-tab-switch]');
      if (!button || !pageElement.contains(button)) return;
      const tab = button.dataset.jobTabSwitch;
      if (!tab) return;
      event.preventDefault();
      setActiveTab(tab);
    }, { signal });

    let initial = 'board';
    try { initial = globalThis.localStorage?.getItem?.(storageKey) || 'board'; } catch (_err) {}
    setActiveTab(initial, { persist: false });
  }

  _wireWizardControls(pageElement, signal) {
    const labels = {
      contract: ['Next: Objectives', 'Next: Briefing', 'Next: Publish', 'Create Contract'],
      faction: ['Next: Attach Actors', 'Next: Notes', 'Create Faction']
    };
    const setPage = (wizard, page) => {
      const max = wizard.querySelectorAll('[data-gm-wizard-page]').length || 1;
      const nextPage = Math.max(1, Math.min(max, Number(page) || 1));
      wizard.dataset.currentPage = String(nextPage);
      wizard.querySelectorAll('[data-gm-wizard-page]').forEach((panel) => {
        panel.classList.toggle('is-active', Number(panel.dataset.gmWizardPage) === nextPage);
      });
      wizard.querySelectorAll('[data-gm-wizard-step-button]').forEach((step) => {
        const stepNumber = Number(step.dataset.gmWizardStepButton) || 0;
        step.classList.toggle('is-active', stepNumber === nextPage);
        step.classList.toggle('is-complete', stepNumber < nextPage);
      });
      const kind = wizard.dataset.gmWizard || 'contract';
      const back = wizard.querySelector('[data-gm-wizard-back]');
      const next = wizard.querySelector('[data-gm-wizard-next]');
      const submit = wizard.querySelector('[data-gm-wizard-submit]');
      const current = wizard.querySelector('[data-gm-wizard-current]');
      if (current) current.textContent = String(nextPage);
      if (back) back.hidden = nextPage <= 1;
      if (next) {
        next.hidden = nextPage >= max;
        next.textContent = labels[kind]?.[nextPage - 1] || 'Next';
      }
      if (submit) submit.hidden = nextPage < max;
    };

    pageElement.querySelectorAll('[data-gm-wizard-open]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const id = event.currentTarget.dataset.gmWizardOpen;
        const clearJobPrefill = id === 'contract' && event.currentTarget.dataset.clearJobPrefill === 'true';
        if (clearJobPrefill) {
          this.host?.patchSurfaceState?.('jobs', { pendingJobDraft: null, openWizard: false }, { render: false });
        }
        const wizard = pageElement.querySelector(`[data-gm-wizard="${CSS.escape(id)}"]`);
        if (!wizard) return;
        if (clearJobPrefill) this._clearContractPrefill(wizard);
        wizard.hidden = false;
        wizard.classList.add('is-open');
        setPage(wizard, 1);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-gm-wizard-close]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const wizard = event.currentTarget.closest('[data-gm-wizard]');
        if (!wizard) return;
        wizard.classList.remove('is-open');
        wizard.hidden = true;
        if (wizard.dataset.gmWizard === 'contract') {
          this.host?.patchSurfaceState?.('jobs', { pendingJobDraft: null, openWizard: false }, { render: false });
        }
      }, { signal });
    });

    pageElement.querySelectorAll('[data-gm-wizard-next]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const wizard = event.currentTarget.closest('[data-gm-wizard]');
        if (!wizard) return;
        setPage(wizard, Number(wizard.dataset.currentPage || 1) + 1);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-gm-wizard-back]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const wizard = event.currentTarget.closest('[data-gm-wizard]');
        if (!wizard) return;
        setPage(wizard, Number(wizard.dataset.currentPage || 1) - 1);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-gm-wizard-step-button]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const wizard = event.currentTarget.closest('[data-gm-wizard]');
        if (!wizard) return;
        setPage(wizard, Number(event.currentTarget.dataset.gmWizardStepButton || 1));
      }, { signal });
    });
  }


  _clearContractPrefill(wizard) {
    const form = wizard?.querySelector?.('form[data-job-create-form]');
    if (!form) return;
    const clearNames = [
      'issuerType', 'issuerSource', 'issuerFactionId', 'issuerFactionName', 'issuerContactId', 'issuerContactName', 'issuerContactRole', 'issuerContactActorId', 'issuerContactActorUuid', 'issuerContactActorName', 'issuerName', 'issuerImage',
      'clientName', 'clientFaction', 'clientImage', 'title', 'primaryObjective', 'primaryDescription', 'primaryCredits', 'primaryXp', 'primaryItems',
      'secondaryObjective', 'secondaryDescription', 'secondaryCredits', 'secondaryXp', 'secondaryItems',
      'tertiaryObjective', 'tertiaryDescription', 'tertiaryCredits', 'tertiaryXp', 'tertiaryItems',
      'briefing', 'instructions', 'oocNote', 'status', 'flatCredits', 'flatItems', 'factionSuccessDelta', 'factionFailureDelta', 'factionNotes', 'rivalFactionName', 'rivalSuccessDelta', 'rivalFailureDelta', 'rivalNotes'
    ];
    const setControlValue = (control, value) => {
      if (!control || typeof control !== 'object') return;
      const type = String(control.type || '').toLowerCase();
      if (type === 'checkbox' || type === 'radio') control.checked = String(control.value ?? '') === String(value) || value === true;
      else if ('value' in control) control.value = value ?? '';
      if (typeof control.dispatchEvent === 'function') {
        control.dispatchEvent(new Event('input', { bubbles: true }));
        control.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };
    for (const name of clearNames) {
      const field = form.elements?.[name];
      if (!field) continue;
      const value = name === 'factionSuccessDelta' || name === 'factionFailureDelta' ? '0' : '';
      if (typeof field.dispatchEvent === 'function') setControlValue(field, value);
      else Array.from(field).forEach((control) => setControlValue(control, value));
    }
    if (form.elements?.clientType) setControlValue(form.elements.clientType, 'npc');
    if (form.elements?.status) {
      const statusField = form.elements.status;
      if (typeof statusField.dispatchEvent === 'function') setControlValue(statusField, 'posted');
      else Array.from(statusField).forEach((control) => setControlValue(control, 'posted'));
    }
    form.querySelectorAll('[data-known-issuer-select]').forEach(select => { select.value = ''; });
    this._refreshContractWizardSummary(form);
  }

  _wireContractWizardEnhancements(pageElement, signal) {
    const form = pageElement.querySelector('form[data-gm-wizard-form="contract"]');
    if (!form) return;

    const templates = {
      rebel: {
        clientType: 'faction',
        clientName: 'Rebel Alliance',
        clientFaction: 'Rebel Alliance',
        title: 'Rebel Operation',
        primaryObjective: 'Complete the Rebel objective',
        briefing: 'A Rebel contact needs the crew to complete a sensitive operation before Imperial patrols close the route.',
        primaryCredits: 15000,
        primaryXp: 1000,
        factionSuccessDelta: 2,
        factionFailureDelta: -1
      },
      syndicate: {
        clientType: 'organization',
        clientName: 'Syndicate Contact',
        clientFaction: 'Underworld Syndicate',
        title: 'Syndicate Job',
        primaryObjective: 'Deliver the illicit cargo',
        briefing: 'An underworld broker offers quiet payment for a job that must not attract official attention.',
        primaryCredits: 20000,
        primaryXp: 800,
        factionSuccessDelta: 1,
        factionFailureDelta: -2
      },
      corporate: {
        clientType: 'organization',
        clientName: 'Corporate Liaison',
        clientFaction: 'Corporate Interest',
        title: 'Corporate Contract',
        primaryObjective: 'Secure the corporate asset',
        briefing: 'A corporate client needs a discreet crew to recover or protect valuable company property.',
        primaryCredits: 12000,
        primaryXp: 700,
        factionSuccessDelta: 1,
        factionFailureDelta: -1
      },
      government: {
        clientType: 'organization',
        clientName: 'Government Official',
        clientFaction: 'Local Authority',
        title: 'Government Assignment',
        primaryObjective: 'Resolve the public security problem',
        briefing: 'A government official needs the party to handle a matter that local enforcement cannot openly address.',
        primaryCredits: 10000,
        primaryXp: 900,
        factionSuccessDelta: 1,
        factionFailureDelta: -1
      },
      rescue: {
        clientType: 'npc',
        clientName: 'Desperate Client',
        clientFaction: '',
        title: 'Rescue Operation',
        primaryObjective: 'Recover the missing target alive',
        secondaryObjective: 'Avoid civilian casualties',
        briefing: 'Someone important has gone missing. The client needs speed, discretion, and proof of survival.',
        primaryCredits: 18000,
        primaryXp: 1200,
        secondaryCredits: 4000,
        secondaryXp: 300,
        factionSuccessDelta: 1,
        factionFailureDelta: -2
      }
    };

    const dispatchFieldEvents = (field) => {
      if (!field || typeof field.dispatchEvent !== 'function') return;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const setSingleField = (field, value) => {
      if (!field || typeof field !== 'object') return;
      const normalized = value ?? '';
      const type = String(field.type || '').toLowerCase();

      if (type === 'checkbox') {
        field.checked = normalized === true || normalized === 'true' || normalized === 'on' || normalized === '1' || normalized === 1;
        dispatchFieldEvents(field);
        return;
      }

      if (type === 'radio') {
        field.checked = String(field.value ?? '') === String(normalized);
        if (field.checked) dispatchFieldEvents(field);
        return;
      }

      if ('value' in field) {
        field.value = normalized;
        dispatchFieldEvents(field);
      }
    };

    const setField = (name, value) => {
      const field = form.elements?.[name];
      if (!field) return;

      // HTMLFormControlsCollection can return a RadioNodeList/collection when the
      // wizard has multiple controls with the same name.  RadioNodeList has a
      // value property but it is not an EventTarget, so calling dispatchEvent on
      // it crashes the Known Issuer prefill flow.
      if (typeof field.dispatchEvent === 'function') {
        setSingleField(field, value);
        return;
      }

      const controls = Array.from(field).filter((entry) => entry && typeof entry === 'object');
      if (!controls.length) {
        try { field.value = value ?? ''; } catch (_err) {}
        return;
      }
      controls.forEach((control) => setSingleField(control, value));
    };


    const mapDatasetToContract = (dataset = {}) => ({
      clientType: dataset.clientType,
      clientName: dataset.clientName,
      clientFaction: dataset.clientFaction,
      clientImage: dataset.clientImage,
      issuerType: dataset.issuerType,
      issuerSource: dataset.issuerSource,
      issuerFactionId: dataset.issuerFactionId,
      issuerFactionName: dataset.issuerFactionName,
      issuerContactId: dataset.issuerContactId,
      issuerContactName: dataset.issuerContactName,
      issuerContactRole: dataset.issuerContactRole,
      issuerContactActorId: dataset.issuerContactActorId,
      issuerContactActorUuid: dataset.issuerContactActorUuid,
      issuerContactActorName: dataset.issuerContactActorName,
      issuerName: dataset.issuerName,
      issuerImage: dataset.issuerImage,
      title: dataset.title,
      primaryObjective: dataset.primaryObjective,
      primaryCredits: dataset.primaryCredits,
      primaryXp: dataset.primaryXp,
      briefing: dataset.briefing,
      instructions: dataset.instructions,
      status: dataset.status,
      factionSuccessDelta: dataset.factionSuccessDelta,
      factionFailureDelta: dataset.factionFailureDelta,
      factionNotes: dataset.factionNotes,
      rivalFactionName: dataset.rivalFactionName,
      rivalSuccessDelta: dataset.rivalSuccessDelta,
      rivalFailureDelta: dataset.rivalFailureDelta,
      rivalNotes: dataset.rivalNotes
    });

    const applyKnownIssuerDataset = (dataset = {}, key = '') => {
      const map = mapDatasetToContract(dataset);
      Object.entries(map).forEach(([fieldName, value]) => setField(fieldName, value));
      if (key) {
        form.querySelectorAll('[data-known-issuer-select]').forEach((select) => { select.value = key; });
        pageElement.querySelectorAll('[data-saved-job-contact], [data-job-saved-contact-open]').forEach((button) => {
          button.classList.toggle('is-active', button.dataset.savedJobContact === key || button.dataset.jobSavedContactOpen === key);
        });
      }
      this._refreshContractWizardSummary(form);
      this._writeSavedContractDraft(form, { immediate: true });
    };

    const findKnownIssuerOption = (key = '') => Array.from(form.querySelectorAll('[data-known-issuer-select] option'))
      .find(option => option.value === key) || null;

    const showContractWizardPageOne = () => {
      const wizard = form.closest('[data-gm-wizard]');
      if (!wizard) return;
      wizard.hidden = false;
      wizard.classList.add('is-open');
      wizard.dataset.currentPage = '1';
      wizard.querySelectorAll('[data-gm-wizard-page]').forEach((panel) => {
        panel.classList.toggle('is-active', Number(panel.dataset.gmWizardPage) === 1);
      });
      wizard.querySelectorAll('[data-gm-wizard-step-button]').forEach((step) => {
        const stepNumber = Number(step.dataset.gmWizardStepButton) || 0;
        step.classList.toggle('is-active', stepNumber === 1);
        step.classList.toggle('is-complete', false);
      });
      const back = wizard.querySelector('[data-gm-wizard-back]');
      const next = wizard.querySelector('[data-gm-wizard-next]');
      const submit = wizard.querySelector('[data-gm-wizard-submit]');
      const current = wizard.querySelector('[data-gm-wizard-current]');
      if (current) current.textContent = '1';
      if (back) back.hidden = true;
      if (next) {
        next.hidden = false;
        next.textContent = 'Next: Objectives';
      }
      if (submit) submit.hidden = true;
    };

    form.querySelectorAll('[data-contract-template]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const template = templates[event.currentTarget.dataset.contractTemplate];
        if (!template) return;
        Object.entries(template).forEach(([key, value]) => setField(key, value));
        this._refreshContractWizardSummary(form);
      }, { signal });
    });

    form.querySelectorAll('[data-known-issuer-select]').forEach((select) => {
      select.addEventListener('change', (event) => {
        const option = event.currentTarget.selectedOptions?.[0];
        if (!option || !option.value) return;
        applyKnownIssuerDataset(option.dataset, option.value);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-saved-job-contact], [data-job-saved-contact-open]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const key = event.currentTarget.dataset.savedJobContact || event.currentTarget.dataset.jobSavedContactOpen || '';
        const option = findKnownIssuerOption(key);
        if (!option) {
          ui.notifications?.warn?.('That saved Job Board contact could not be found. It may have been deleted from the Faction Dossier.');
          return;
        }
        showContractWizardPageOne();
        applyKnownIssuerDataset(option.dataset, key);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-job-manage-saved-contacts]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host?.patchSurfaceState?.('factions', { focusContactLibrary: true }, { render: false });
        if (typeof this.host?._navigateTo === 'function') await this.host._navigateTo('factions');
        else {
          this.host.currentPage = 'factions';
          await requestShellRender(this.host, { reason: 'gm-job-manage-saved-contacts', surfaceId: 'factions' });
        }
      }, { signal });
    });

    form.querySelectorAll('input, textarea, select').forEach((field) => {
      field.addEventListener('input', () => this._refreshContractWizardSummary(form), { signal });
      field.addEventListener('change', () => this._refreshContractWizardSummary(form), { signal });
    });
    this._refreshContractWizardSummary(form);
  }

  async _saveClientAsContact({ factionName = '', clientName = '', clientType = '', clientImage = '', role = 'Job Contact', objective = '', briefing = '', instructions = '', credits = 0, xp = 0, successDelta = 1, failureDelta = -1, rivalFactionName = '', rivalSuccessDelta = -1, rivalFailureDelta = 1, rivalNotes = '', status = 'posted' } = {}) {
    const contactName = String(clientName || '').trim();
    if (!contactName) return null;
    const type = String(clientType || '').toLowerCase();
    const factionLabel = String(factionName || (type === 'faction' ? contactName : 'Independent Job Contacts')).trim();
    if (!factionLabel) return null;
    return mutateShellOnly(this.host, async () => {
      const faction = FactionRegistryService.findFaction(factionLabel) || await FactionRegistryService.upsertFaction({
        name: factionLabel,
        type: type === 'faction' ? 'Faction' : 'Organization',
        source: 'job',
        status: 'active',
        historyNote: 'Created from Job Board reusable contact.'
      });
      if (type === 'faction' && factionLabel.toLowerCase() === contactName.toLowerCase()) return { faction, contact: null, savedAsFaction: true };
      return FactionRegistryService.upsertFactionContact(faction.id, {
        name: contactName,
        role,
        image: clientImage,
        tags: ['job-board', 'reusable-contact'],
        description: `Reusable Job Board contact for ${factionLabel}.`,
        defaultObjective: objective,
        defaultBriefing: briefing,
        defaultInstructions: instructions,
        defaultCredits: credits,
        defaultXp: xp,
        defaultSuccessDelta: successDelta,
        defaultFailureDelta: failureDelta,
        defaultRivalFactionName: rivalFactionName,
        defaultRivalSuccessDelta: rivalSuccessDelta,
        defaultRivalFailureDelta: rivalFailureDelta,
        defaultConsequenceNotes: rivalNotes,
        defaultVisibility: status || 'posted'
      });
    }, { reason: 'gm-job-save-client-contact', surfaceId: 'jobs' });
  }

  _refreshContractWizardSummary(form) {
    const data = new FormData(form);
    const text = (key) => String(data.get(key) || '').trim();
    const number = (key) => Math.max(0, Math.floor(Number(data.get(key) || 0) || 0));
    const title = text('title') || text('primaryObjective') || 'New Contract';
    const summaryTitle = form.querySelector('[data-contract-summary-title]');
    if (summaryTitle) summaryTitle.textContent = title;
    const rewardTotal = number('flatCredits') + number('primaryCredits') + number('secondaryCredits') + number('tertiaryCredits');
    const xpTotal = number('primaryXp') + number('secondaryXp') + number('tertiaryXp');
    const rewardLabel = form.querySelector('[data-contract-summary-rewards]');
    if (rewardLabel) rewardLabel.textContent = `${rewardTotal.toLocaleString()} cr · ${xpTotal.toLocaleString()} XP`;
    const clientLabel = form.querySelector('[data-contract-summary-client]');
    if (clientLabel) clientLabel.textContent = [text('clientName'), text('clientFaction')].filter(Boolean).join(' · ') || 'No client selected';
    const consequenceLabel = form.querySelector('[data-contract-summary-consequences]');
    if (consequenceLabel) {
      const main = text('clientFaction') ? `${text('clientFaction')} ${Number(data.get('factionSuccessDelta') || 0) >= 0 ? '+' : ''}${data.get('factionSuccessDelta') || 0}/${data.get('factionFailureDelta') || 0}` : '';
      const rival = text('rivalFactionName') ? `${text('rivalFactionName')} ${Number(data.get('rivalSuccessDelta') || 0) >= 0 ? '+' : ''}${data.get('rivalSuccessDelta') || 0}/${data.get('rivalFailureDelta') || 0}` : '';
      consequenceLabel.textContent = [main, rival].filter(Boolean).join(' · ') || 'No faction consequence preview';
    }
  }



  _issuerFilterFromButton(button) {
    const factionId = String(button?.dataset?.issuerFactionId || '').trim();
    const factionName = String(button?.dataset?.issuerFactionName || '').trim();
    const contactId = String(button?.dataset?.issuerContactId || '').trim();
    const contactName = String(button?.dataset?.issuerContactName || '').trim();
    const label = String(button?.dataset?.issuerLabel || [factionName, contactName].filter(Boolean).join(' - ') || factionName || contactName || 'Issuer').trim();
    return { factionId, factionName, contactId, contactName, label };
  }

  async _resolveActorReference({ uuid = '', actorId = '' } = {}) {
    const id = String(actorId || '').trim();
    if (id) {
      const byId = game.actors?.get?.(id);
      if (byId) return byId;
    }
    const ref = String(uuid || '').trim();
    if (ref && typeof fromUuid === 'function') {
      try {
        const doc = await fromUuid(ref);
        if (doc?.documentName === 'Actor' || doc?.constructor?.documentName === 'Actor') return doc;
        if (doc?.actor) return doc.actor;
      } catch (_err) {}
    }
    return null;
  }

  _wireIssuerButtons(pageElement, signal) {
    pageElement.querySelectorAll('[data-job-filter-clear]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host?.patchSurfaceState?.('jobs', { issuerFilter: null, pendingJobDraft: null, openWizard: false }, { render: false });
        await requestShellRender(this.host, { reason: 'gm-job-clear-issuer-filter', surfaceId: 'jobs' });
      }, { signal });
    });

    pageElement.querySelectorAll('[data-job-filter-issuer]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const filter = this._issuerFilterFromButton(event.currentTarget);
        this.host?.patchSurfaceState?.('jobs', { issuerFilter: filter, pendingJobDraft: null, openWizard: false }, { render: false });
        await requestShellRender(this.host, { reason: 'gm-job-filter-issuer', surfaceId: 'jobs' });
      }, { signal });
    });

    pageElement.querySelectorAll('[data-job-open-faction]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const filter = this._issuerFilterFromButton(event.currentTarget);
        this.host?.patchSurfaceState?.('factions', { focusedFactionId: filter.factionId, focusedFactionName: filter.factionName, focusedContactId: filter.contactId }, { render: false });
        if (typeof this.host?._navigateTo === 'function') await this.host._navigateTo('factions');
        else {
          this.host.currentPage = 'factions';
          await requestShellRender(this.host, { reason: 'gm-job-open-faction', surfaceId: 'factions' });
        }
      }, { signal });
    });

    pageElement.querySelectorAll('[data-job-open-issuer-actor]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const actor = await this._resolveActorReference({ uuid: event.currentTarget.dataset.actorUuid, actorId: event.currentTarget.dataset.actorId });
        if (!actor) {
          ui.notifications?.warn?.('Linked issuer actor could not be found.');
          return;
        }
        actor.sheet?.render?.(true);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-job-followup-contract]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const filter = this._issuerFilterFromButton(event.currentTarget);
        const draft = filter.contactId
          ? FactionJobBridgeService.buildDraftFromContact(filter.factionId || filter.factionName, filter.contactId || filter.contactName)
          : FactionJobBridgeService.buildDraftFromFaction(filter.factionId || filter.factionName);
        if (!draft) {
          ui.notifications?.warn?.('Could not build a follow-up contract from that issuer.');
          return;
        }
        this.host?.patchSurfaceState?.('jobs', { pendingJobDraft: draft, openWizard: true, issuerFilter: filter }, { render: false });
        await requestShellRender(this.host, { reason: 'gm-job-followup-contract', surfaceId: 'jobs' });
      }, { signal });
    });
  }


  _draftStorageKey() {
    const worldId = String(game?.world?.id || 'world');
    const userId = String(game?.user?.id || 'gm');
    return `swse.gm-datapad.job-draft.${worldId}.${userId}`;
  }

  _readSavedContractDraft() {
    try {
      const raw = globalThis.localStorage?.getItem?.(this._draftStorageKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed;
    } catch (_err) {
      return null;
    }
  }

  _writeSavedContractDraft(form, { immediate = false } = {}) {
    if (!form) return;
    const write = () => {
      try {
        const data = new FormData(form);
        const fields = {};
        for (const [key, value] of data.entries()) {
          if (fields[key] == null) fields[key] = value;
          else if (Array.isArray(fields[key])) fields[key].push(value);
          else fields[key] = [fields[key], value];
        }
        const hasMeaningfulText = ['title', 'clientName', 'clientFaction', 'primaryObjective', 'briefing', 'instructions', 'flatItems', 'primaryItems', 'secondaryItems', 'tertiaryItems']
          .some((key) => String(fields[key] || '').trim());
        const hasNumericReward = ['flatCredits', 'primaryCredits', 'secondaryCredits', 'tertiaryCredits', 'primaryXp', 'secondaryXp', 'tertiaryXp']
          .some((key) => Number(fields[key] || 0) > 0);
        if (!hasMeaningfulText && !hasNumericReward) return;
        globalThis.localStorage?.setItem?.(this._draftStorageKey(), JSON.stringify({
          savedAt: Date.now(),
          fields
        }));
        form.closest('[data-gm-wizard]')?.querySelector?.('[data-job-draft-saved-label]')?.replaceChildren(document.createTextNode('Draft autosaved'));
      } catch (_err) {}
    };
    if (immediate) {
      write();
      return;
    }
    window.clearTimeout(this._jobDraftAutosaveTimer);
    this._jobDraftAutosaveTimer = window.setTimeout(write, 250);
  }

  _clearSavedContractDraft() {
    try { globalThis.localStorage?.removeItem?.(this._draftStorageKey()); } catch (_err) {}
  }

  _restoreSavedContractDraft(form, saved = null) {
    const draft = saved || this._readSavedContractDraft();
    if (!form || !draft?.fields) return false;
    const setField = (name, value) => {
      const field = form.elements?.[name];
      if (!field) return;
      const values = Array.isArray(value) ? value.map(String) : [String(value ?? '')];
      const controls = typeof field.dispatchEvent === 'function' ? [field] : Array.from(field).filter(Boolean);
      if (!controls.length && 'value' in field) {
        field.value = values[0] ?? '';
        return;
      }
      controls.forEach((control) => {
        const type = String(control.type || '').toLowerCase();
        if (type === 'checkbox' || type === 'radio') control.checked = values.includes(String(control.value ?? '')) || values.includes('on');
        else if ('value' in control) control.value = values[0] ?? '';
        if (typeof control.dispatchEvent === 'function') {
          control.dispatchEvent(new Event('input', { bubbles: true }));
          control.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    };
    Object.entries(draft.fields).forEach(([key, value]) => setField(key, value));
    this._refreshContractWizardSummary(form);
    return true;
  }

  _wireContractDraftRecovery(pageElement, signal) {
    const form = pageElement.querySelector('form[data-job-create-form]');
    if (!form) return;
    const saved = this._readSavedContractDraft();
    const banner = pageElement.querySelector('[data-job-draft-recovery]');
    if (banner) {
      banner.hidden = !saved;
      const stamp = banner.querySelector('[data-job-draft-time]');
      if (stamp && saved?.savedAt) stamp.textContent = new Date(saved.savedAt).toLocaleString();
    }
    form.querySelectorAll('input, textarea, select').forEach((field) => {
      field.addEventListener('input', () => this._writeSavedContractDraft(form), { signal });
      field.addEventListener('change', () => this._writeSavedContractDraft(form), { signal });
    });
    pageElement.querySelectorAll('[data-job-draft-restore]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const wizard = form.closest('[data-gm-wizard]');
        if (wizard) {
          wizard.hidden = false;
          wizard.classList.add('is-open');
        }
        this._restoreSavedContractDraft(form, saved);
      }, { signal });
    });
    pageElement.querySelectorAll('[data-job-draft-discard]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        this._clearSavedContractDraft();
        if (banner) banner.hidden = true;
      }, { signal });
    });
  }

  _appendRewardItemToField(field, item) {
    if (!field || !item) return;
    const label = item.uuid ? `${item.name} [${item.uuid}]` : item.name;
    const current = String(field.value || '').trim();
    field.value = current ? `${current}; ${label}` : label;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
  }

  async _resolveDroppedRewardItem(event) {
    let data = null;
    try {
      const raw = event.dataTransfer?.getData?.('text/plain') || event.dataTransfer?.getData?.('application/json');
      if (raw) data = JSON.parse(raw);
    } catch (_err) {}
    if (!data) return null;
    const uuid = data.uuid || data.itemUuid || (data.pack && data.id ? `Compendium.${data.pack}.${data.id}` : '');
    let doc = null;
    if (uuid && typeof fromUuid === 'function') {
      try { doc = await fromUuid(uuid); } catch (_err) {}
    }
    if (!doc && data.id && data.type === 'Item') doc = game.items?.get?.(data.id) || null;
    if (doc?.documentName !== 'Item' && doc?.constructor?.documentName !== 'Item') return null;
    return { name: doc.name || data.name || 'Dropped Item', uuid: doc.uuid || uuid };
  }

  _wireContractRewardDrops(pageElement, signal) {
    pageElement.querySelectorAll('[data-job-reward-drop]').forEach((zone) => {
      const fieldName = zone.dataset.jobRewardDrop;
      const field = zone.querySelector(`[name="${CSS.escape(fieldName)}"]`) || zone.closest('form')?.elements?.[fieldName];
      zone.addEventListener('dragover', (event) => {
        event.preventDefault();
        zone.classList.add('is-drop-hover');
      }, { signal });
      zone.addEventListener('dragleave', () => zone.classList.remove('is-drop-hover'), { signal });
      zone.addEventListener('drop', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        zone.classList.remove('is-drop-hover');
        const item = await this._resolveDroppedRewardItem(event);
        if (!item) {
          ui.notifications?.warn?.('Drop an Item or compendium Item onto the reward field.');
          return;
        }
        this._appendRewardItemToField(field, item);
        this._writeSavedContractDraft(zone.closest('form'), { immediate: true });
      }, { signal });
    });
  }

  _wireCreateForms(pageElement, signal) {
    pageElement.querySelectorAll('form[data-job-create-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change job board records')) return;
        const data = new FormData(form);
        const text = (key) => String(data.get(key) || '').trim();
        const number = (key) => Math.max(0, Math.floor(Number(data.get(key) || 0) || 0));
        const itemNotes = (...keys) => keys.map(key => text(key)).filter(Boolean).join(' | ');
        const title = text('title') || text('primaryObjective') || 'Job Board Posting';
        if (!title || title === 'Job Board Posting') {
          ui.notifications?.warn?.('Add a contract title or primary objective before creating the contract.');
          return;
        }
        const objectives = [
          {
            id: 'primary',
            type: 'primary',
            title: text('primaryObjective'),
            description: text('primaryDescription'),
            required: true,
            rewardCredits: number('primaryCredits'),
            rewardXp: number('primaryXp'),
            rewardItems: text('primaryItems')
          },
          {
            id: 'secondary',
            type: 'secondary',
            title: text('secondaryObjective'),
            description: text('secondaryDescription'),
            required: data.get('secondaryRequired') === 'on',
            rewardCredits: number('secondaryCredits'),
            rewardXp: number('secondaryXp'),
            rewardItems: text('secondaryItems')
          },
          {
            id: 'tertiary',
            type: 'tertiary',
            title: text('tertiaryObjective'),
            description: text('tertiaryDescription'),
            required: false,
            rewardCredits: number('tertiaryCredits'),
            rewardXp: number('tertiaryXp'),
            rewardItems: text('tertiaryItems')
          }
        ].filter(objective => objective.title);

        const rewardCredits = number('flatCredits') + objectives.reduce((sum, objective) => sum + Number(objective.rewardCredits || 0), 0);
        const rewardItems = itemNotes('flatItems', 'primaryItems', 'secondaryItems', 'tertiaryItems');
        const result = await mutateShellOnly(this.host, () => HolonetMessengerService.createJobPosting({
          actor: null,
          title,
          body: text('briefing') || title,
          recipientIds: data.getAll('recipientIds').map(String).filter(Boolean),
          rewardCredits,
          rewardItems,
          client: {
            type: text('clientType'),
            name: text('clientName'),
            factionName: text('clientFaction'),
            imageUrl: text('clientImage'),
            saveForReuse: data.get('clientSave') === 'on'
          },
          issuer: {
            type: text('issuerType') || text('clientType'),
            source: text('issuerSource') || 'job-board',
            factionId: text('issuerFactionId'),
            factionName: text('issuerFactionName') || text('clientFaction'),
            contactId: text('issuerContactId'),
            contactName: text('issuerContactName'),
            contactRole: text('issuerContactRole'),
            contactActorId: text('issuerContactActorId'),
            contactActorUuid: text('issuerContactActorUuid'),
            contactActorName: text('issuerContactActorName'),
            name: text('issuerName') || text('clientName'),
            image: text('issuerImage') || text('clientImage')
          },
          objectives,
          briefing: {
            body: text('briefing'),
            instructions: text('instructions'),
            oocNote: text('oocNote')
          },
          factionConsequences: {
            factionName: text('clientFaction'),
            successDelta: Number(data.get('factionSuccessDelta') || 0) || 0,
            failureDelta: Number(data.get('factionFailureDelta') || 0) || 0,
            notes: text('factionNotes'),
            additionalConsequences: text('rivalFactionName') ? [{
              type: 'rival',
              factionName: text('rivalFactionName'),
              successDelta: Number(data.get('rivalSuccessDelta') || 0) || 0,
              failureDelta: Number(data.get('rivalFailureDelta') || 0) || 0,
              notes: text('rivalNotes') || text('factionNotes')
            }] : []
          },
          status: text('status') || 'posted'
        }), { reason: 'gm-job-contract-create', surfaceId: 'jobs' });

        if (!result) {
          ui.notifications?.error?.('Job contract creation failed.');
          return;
        }
        if (data.get('clientSave') === 'on') {
          await this._saveClientAsContact({
            factionName: text('clientFaction'),
            clientName: text('clientName'),
            clientType: text('clientType'),
            clientImage: text('clientImage'),
            role: text('issuerContactRole') || 'Job Contact',
            objective: text('primaryObjective'),
            briefing: text('briefing'),
            instructions: text('instructions'),
            credits: number('primaryCredits'),
            xp: number('primaryXp'),
            successDelta: Number(data.get('factionSuccessDelta') || 1) || 1,
            failureDelta: Number(data.get('factionFailureDelta') || -1) || -1,
            rivalFactionName: text('rivalFactionName'),
            rivalSuccessDelta: Number(data.get('rivalSuccessDelta') || -1) || -1,
            rivalFailureDelta: Number(data.get('rivalFailureDelta') || 1) || 1,
            rivalNotes: text('rivalNotes'),
            status: text('status') || 'posted'
          });
        }
        this.host.selectedJobThreadId = result.threadId || this.host.selectedJobThreadId;
        this._clearSavedContractDraft();
        ui.notifications?.info?.(`Job contract ${text('status') === 'draft' ? 'drafted' : 'posted'}.`);
        const wizard = form.closest('[data-gm-wizard]');
        form.reset();
        this._refreshContractWizardSummary(form);
        if (wizard) {
          wizard.classList.remove('is-open');
          wizard.hidden = true;
        }
        this.host?.patchSurfaceState?.('jobs', { pendingJobDraft: null, openWizard: false }, { render: false });
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh', surfaceId: 'jobs' }));
      }, { signal });
    });
  }

  _wireDistributionForms(pageElement, signal) {
    pageElement.querySelectorAll('form[data-job-distribution-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change job board records')) return;
        const data = new FormData(form);
        const threadId = String(data.get('threadId') || '').trim();
        const payoutMode = String(data.get('payoutMode') || 'single').trim();
        const recipientId = String(data.get('recipientId') || '').trim();
        const recipientIds = data.getAll('recipientIds').map(String).filter(Boolean);
        const amount = Number(data.get('amount') || 0);
        const partyFundCutPercent = Number(data.get('partyFundCutPercent') || 0);
        if (!threadId || !amount) return;
        await mutateShellOnly(this.host, () => HolonetMessengerService.threadAction({ actor: null, threadId, action: 'job-payout-distribution', payoutMode, recipientId, recipientIds, amount, partyFundCutPercent }), { reason: 'gm-job-payout-distribution', surfaceId: 'jobs' });
        this.host.selectedJobThreadId = threadId;
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
      }, { signal });
    });
  }

  _wireXpForms(pageElement, signal) {
    pageElement.querySelectorAll('form[data-job-xp-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change job board records')) return;
        const data = new FormData(form);
        const threadId = String(data.get('threadId') || '').trim();
        const payoutMode = String(data.get('payoutMode') || 'single').trim();
        const recipientId = String(data.get('recipientId') || '').trim();
        const recipientIds = data.getAll('recipientIds').map(String).filter(Boolean);
        const amount = Number(data.get('amount') || 0);
        if (!threadId || !amount) return;
        await mutateShellOnly(this.host, () => HolonetMessengerService.threadAction({ actor: null, threadId, action: 'job-xp-payout', payoutMode, recipientId, recipientIds, amount }), { reason: 'gm-job-xp-payout', surfaceId: 'jobs' });
        this.host.selectedJobThreadId = threadId;
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
      }, { signal });
    });
  }

  _wireSelectionButtons(pageElement, signal) {
    pageElement.querySelectorAll('[data-job-select]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host.selectedJobThreadId = event.currentTarget.dataset.jobSelect || null;
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
      }, { signal });
    });
  }

  _wireStatusButtons(pageElement, signal) {
    pageElement.querySelectorAll('[data-job-status-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change job status')) return;
        const threadId = event.currentTarget.dataset.threadId;
        const status = event.currentTarget.dataset.status;
        if (!threadId || !status) return;
        const statusNote = this._readStatusNote(pageElement, threadId);
        await mutateShellOnly(this.host, () => HolonetMessengerService.threadAction({ actor: null, threadId, action: 'set-job-status', status, statusNote }), { reason: 'gm-job-status-update', surfaceId: 'jobs' });
        this.host.selectedJobThreadId = threadId;
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
      }, { signal });
    });
  }

  _wireObjectiveButtons(pageElement, signal) {
    pageElement.querySelectorAll('[data-job-objective-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change job objectives')) return;
        const threadId = event.currentTarget.dataset.threadId;
        const objectiveId = event.currentTarget.dataset.objectiveId;
        const objectiveStatus = event.currentTarget.dataset.objectiveStatus;
        if (!threadId || !objectiveId || !objectiveStatus) return;
        const objectiveNote = this._readObjectiveNote(pageElement, objectiveId, event.currentTarget);
        await mutateShellOnly(this.host, () => HolonetMessengerService.threadAction({ actor: null, threadId, action: 'set-job-objective-status', objectiveId, objectiveStatus, objectiveNote }), { reason: 'gm-job-objective-update', surfaceId: 'jobs' });
        this.host.selectedJobThreadId = threadId;
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
      }, { signal });
    });
  }


  _readStatusNote(pageElement, threadId = '') {
    const selector = threadId
      ? `[data-job-status-note][data-thread-id="${CSS.escape(threadId)}"]`
      : '[data-job-status-note]';
    const textarea = pageElement.querySelector(selector) ?? pageElement.querySelector('[data-job-status-note]');
    return String(textarea?.value || '').trim();
  }

  _readObjectiveNote(pageElement, objectiveId = '', trigger = null) {
    const local = trigger?.closest?.('.job-objective-card, .job-queue-card')?.querySelector?.(`[data-job-objective-note-for="${CSS.escape(objectiveId)}"]`);
    if (local) return String(local.value || '').trim();
    const textarea = pageElement.querySelector(`[data-job-objective-note-for="${CSS.escape(objectiveId)}"]`);
    return String(textarea?.value || '').trim();
  }

  _wirePayoutForms(pageElement, signal) {
    pageElement.querySelectorAll('form[data-job-payout-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change job board records')) return;
        const data = new FormData(form);
        const threadId = String(data.get('threadId') || '').trim();
        const recipientId = String(data.get('recipientId') || '').trim();
        const amount = Number(data.get('amount') || 0);
        const partyFundCutPercent = Number(data.get('partyFundCutPercent') || 0);
        if (!threadId || !recipientId || !amount) return;
        await mutateShellOnly(this.host, () => HolonetMessengerService.threadAction({ actor: null, threadId, action: 'job-payout', recipientId, amount, partyFundCutPercent }), { reason: 'gm-job-payout', surfaceId: 'jobs' });
        this.host.selectedJobThreadId = threadId;
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
      }, { signal });
    });
  }

  _wireItemAwardForms(pageElement, signal) {
    pageElement.querySelectorAll('form[data-job-award-items-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change job board records')) return;
        const data = new FormData(form);
        const threadId = String(data.get('threadId') || '').trim();
        const recipientId = String(data.get('recipientId') || '').trim();
        const recipientIds = data.getAll('recipientIds').map(String).filter(Boolean);
        const distributionMode = String(data.get('distributionMode') || 'single-copy').trim();
        const itemUuids = data.getAll('itemUuids').map(String).filter(Boolean);
        if (!threadId || !itemUuids.length) return;
        if (distributionMode === 'single-copy' && !recipientId) return;
        if (distributionMode !== 'single-copy' && !recipientIds.length) return;
        await mutateShellOnly(this.host, () => HolonetMessengerService.threadAction({ actor: null, threadId, action: 'award-job-items', recipientId, recipientIds, distributionMode, itemUuids }), { reason: 'gm-job-item-award', surfaceId: 'jobs' });
        this.host.selectedJobThreadId = threadId;
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
      }, { signal });
    });
  }

  _wireAssetAwardForms(pageElement, signal) {
    pageElement.querySelectorAll('form[data-job-award-asset-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!this._assertGM('change job board records')) return;
        const data = new FormData(form);
        const threadId = String(data.get('threadId') || '').trim();
        const assetActorId = String(data.get('assetActorId') || '').trim();
        const primaryActorId = String(data.get('primaryActorId') || '').trim();
        const recipientIds = data.getAll('recipientIds').map(String).filter(Boolean);
        if (!threadId || !assetActorId || !recipientIds.length) return;
        await mutateShellOnly(this.host, () => HolonetMessengerService.threadAction({ actor: null, threadId, action: 'award-job-asset-access', assetActorId, primaryActorId, recipientIds }), { reason: 'gm-job-asset-award', surfaceId: 'jobs' });
        this.host.selectedJobThreadId = threadId;
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
      }, { signal });
    });
  }

}

/**
 * GMJobBoardSurfaceController
 *
 * Owns DOM wiring for the GM Job Board surface. Job creation, status updates,
 * reward distribution, XP payout, and item award actions still flow through
 * HolonetMessengerService so existing settlement/rollback behavior remains the
 * single source of truth.
 */

import { HolonetMessengerService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js';
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

    this._wireWizardControls(pageElement, signal);
    this._wireContractWizardEnhancements(pageElement, signal);
    this._wireCreateForms(pageElement, signal);
    this._wireDistributionForms(pageElement, signal);
    this._wireXpForms(pageElement, signal);
    this._wireSelectionButtons(pageElement, signal);
    this._wireStatusButtons(pageElement, signal);
    this._wireObjectiveButtons(pageElement, signal);
    this._wirePayoutForms(pageElement, signal);
    this._wireItemAwardForms(pageElement, signal);
    this._wireAssetAwardForms(pageElement, signal);
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
        const wizard = pageElement.querySelector(`[data-gm-wizard="${CSS.escape(id)}"]`);
        if (!wizard) return;
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

    const setField = (name, value) => {
      const field = form.elements?.[name];
      if (!field) return;
      field.value = value ?? '';
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
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

    form.querySelectorAll('input, textarea, select').forEach((field) => {
      field.addEventListener('input', () => this._refreshContractWizardSummary(form), { signal });
      field.addEventListener('change', () => this._refreshContractWizardSummary(form), { signal });
    });
    this._refreshContractWizardSummary(form);
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
            notes: text('factionNotes')
          },
          status: text('status') || 'posted'
        }), { reason: 'gm-job-contract-create', surfaceId: 'jobs' });

        if (!result) {
          ui.notifications?.error?.('Job contract creation failed.');
          return;
        }
        this.host.selectedJobThreadId = result.threadId || this.host.selectedJobThreadId;
        ui.notifications?.info?.(`Job contract ${text('status') === 'draft' ? 'drafted' : 'posted'}.`);
        const wizard = form.closest('[data-gm-wizard]');
        form.reset();
        this._refreshContractWizardSummary(form);
        if (wizard) {
          wizard.classList.remove('is-open');
          wizard.hidden = true;
        }
        await (requestShellRender(this.host, { reason: 'gm-controller-refresh' }));
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

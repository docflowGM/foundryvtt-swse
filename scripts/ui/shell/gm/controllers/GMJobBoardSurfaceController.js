/**
 * GMJobBoardSurfaceController
 *
 * Owns DOM wiring for the GM Job Board surface. Job creation, status updates,
 * reward distribution, XP payout, and item award actions still flow through
 * HolonetMessengerService so existing settlement/rollback behavior remains the
 * single source of truth.
 */

import { HolonetMessengerService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js';

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

    this._wireCreateForms(pageElement, signal);
    this._wireDistributionForms(pageElement, signal);
    this._wireXpForms(pageElement, signal);
    this._wireSelectionButtons(pageElement, signal);
    this._wireStatusButtons(pageElement, signal);
    this._wireObjectiveButtons(pageElement, signal);
    this._wirePayoutForms(pageElement, signal);
    this._wireItemAwardForms(pageElement, signal);
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
  }

  _wireCreateForms(pageElement, signal) {
    pageElement.querySelectorAll('form[data-job-create-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const text = (key) => String(data.get(key) || '').trim();
        const number = (key) => Math.max(0, Math.floor(Number(data.get(key) || 0) || 0));
        const itemNotes = (...keys) => keys.map(key => text(key)).filter(Boolean).join(' | ');
        const title = text('title') || 'Job Board Posting';
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
        const result = await HolonetMessengerService.createJobPosting({
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
        });

        if (!result) {
          ui.notifications?.error?.('Job contract creation failed.');
          return;
        }
        this.host.selectedJobThreadId = result.threadId || this.host.selectedJobThreadId;
        ui.notifications?.info?.(`Job contract ${text('status') === 'draft' ? 'drafted' : 'posted'}.`);
        await this.host.render(false);
      }, { signal });
    });
  }

  _wireDistributionForms(pageElement, signal) {
    pageElement.querySelectorAll('form[data-job-distribution-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const threadId = String(data.get('threadId') || '').trim();
        const payoutMode = String(data.get('payoutMode') || 'single').trim();
        const recipientId = String(data.get('recipientId') || '').trim();
        const recipientIds = data.getAll('recipientIds').map(String).filter(Boolean);
        const amount = Number(data.get('amount') || 0);
        const partyFundCutPercent = Number(data.get('partyFundCutPercent') || 0);
        if (!threadId || !amount) return;
        await HolonetMessengerService.threadAction({ actor: null, threadId, action: 'job-payout-distribution', payoutMode, recipientId, recipientIds, amount, partyFundCutPercent });
        this.host.selectedJobThreadId = threadId;
        await this.host.render(false);
      }, { signal });
    });
  }

  _wireXpForms(pageElement, signal) {
    pageElement.querySelectorAll('form[data-job-xp-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const threadId = String(data.get('threadId') || '').trim();
        const payoutMode = String(data.get('payoutMode') || 'single').trim();
        const recipientId = String(data.get('recipientId') || '').trim();
        const recipientIds = data.getAll('recipientIds').map(String).filter(Boolean);
        const amount = Number(data.get('amount') || 0);
        if (!threadId || !amount) return;
        await HolonetMessengerService.threadAction({ actor: null, threadId, action: 'job-xp-payout', payoutMode, recipientId, recipientIds, amount });
        this.host.selectedJobThreadId = threadId;
        await this.host.render(false);
      }, { signal });
    });
  }

  _wireSelectionButtons(pageElement, signal) {
    pageElement.querySelectorAll('[data-job-select]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host.selectedJobThreadId = event.currentTarget.dataset.jobSelect || null;
        await this.host.render(false);
      }, { signal });
    });
  }

  _wireStatusButtons(pageElement, signal) {
    pageElement.querySelectorAll('[data-job-status-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const threadId = event.currentTarget.dataset.threadId;
        const status = event.currentTarget.dataset.status;
        if (!threadId || !status) return;
        await HolonetMessengerService.threadAction({ actor: null, threadId, action: 'set-job-status', status });
        this.host.selectedJobThreadId = threadId;
        await this.host.render(false);
      }, { signal });
    });
  }

  _wireObjectiveButtons(pageElement, signal) {
    pageElement.querySelectorAll('[data-job-objective-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const threadId = event.currentTarget.dataset.threadId;
        const objectiveId = event.currentTarget.dataset.objectiveId;
        const objectiveStatus = event.currentTarget.dataset.objectiveStatus;
        if (!threadId || !objectiveId || !objectiveStatus) return;
        await HolonetMessengerService.threadAction({ actor: null, threadId, action: 'set-job-objective-status', objectiveId, objectiveStatus });
        this.host.selectedJobThreadId = threadId;
        await this.host.render(false);
      }, { signal });
    });
  }

  _wirePayoutForms(pageElement, signal) {
    pageElement.querySelectorAll('form[data-job-payout-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const threadId = String(data.get('threadId') || '').trim();
        const recipientId = String(data.get('recipientId') || '').trim();
        const amount = Number(data.get('amount') || 0);
        const partyFundCutPercent = Number(data.get('partyFundCutPercent') || 0);
        if (!threadId || !recipientId || !amount) return;
        await HolonetMessengerService.threadAction({ actor: null, threadId, action: 'job-payout', recipientId, amount, partyFundCutPercent });
        this.host.selectedJobThreadId = threadId;
        await this.host.render(false);
      }, { signal });
    });
  }

  _wireItemAwardForms(pageElement, signal) {
    pageElement.querySelectorAll('form[data-job-award-items-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const threadId = String(data.get('threadId') || '').trim();
        const recipientId = String(data.get('recipientId') || '').trim();
        const recipientIds = data.getAll('recipientIds').map(String).filter(Boolean);
        const distributionMode = String(data.get('distributionMode') || 'single-copy').trim();
        const itemUuids = data.getAll('itemUuids').map(String).filter(Boolean);
        if (!threadId || !itemUuids.length) return;
        if (distributionMode === 'single-copy' && !recipientId) return;
        if (distributionMode !== 'single-copy' && !recipientIds.length) return;
        await HolonetMessengerService.threadAction({ actor: null, threadId, action: 'award-job-items', recipientId, recipientIds, distributionMode, itemUuids });
        this.host.selectedJobThreadId = threadId;
        await this.host.render(false);
      }, { signal });
    });
  }
}

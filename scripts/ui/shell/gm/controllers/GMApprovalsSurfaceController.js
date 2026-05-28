import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';

/**
 * GMApprovalsSurfaceController
 *
 * Owns DOM wiring for the GM Approvals surface. Approval decisions remain on
 * the GM Datapad host so the controller extraction does not change behavior or
 * duplicate approval/economy logic.
 */

export class GMApprovalsSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.querySelector('.gm-datapad-approvals');
    if (!pageElement) return;

    const reviewForm = pageElement.querySelector('[data-approval-review-form]');
    if (reviewForm) {
      reviewForm.addEventListener('submit', (ev) => ev.preventDefault(), { signal });
      this._wireApprovalEditPreview(reviewForm, signal);
    }

    pageElement.querySelectorAll('[data-action="select-approval"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host.selectedApprovalKey = event.currentTarget?.dataset?.approvalKey ?? null;
        this.host.approvalEditMode = false;
        this.host.approvalDenyMode = false;
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="approval-enter-edit"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host.selectedApprovalKey = event.currentTarget?.dataset?.approvalKey ?? this.host.selectedApprovalKey;
        this.host.approvalEditMode = true;
        this.host.approvalDenyMode = false;
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="approval-cancel-edit"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host.selectedApprovalKey = event.currentTarget?.dataset?.approvalKey ?? this.host.selectedApprovalKey;
        this.host.approvalEditMode = false;
        this.host.approvalDenyMode = false;
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="approval-deny"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host.selectedApprovalKey = event.currentTarget?.dataset?.approvalKey ?? this.host.selectedApprovalKey;
        this.host.approvalDenyMode = true;
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="approval-cancel-deny"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.host.selectedApprovalKey = event.currentTarget?.dataset?.approvalKey ?? this.host.selectedApprovalKey;
        this.host.approvalDenyMode = false;
        await this.host.render(false);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="approval-approve"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const key = event.currentTarget?.dataset?.approvalKey ?? this.host.selectedApprovalKey;
        await this._approveRequest(key, event.currentTarget.closest('[data-approval-review-form]'));
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="approval-finalize-edits"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const key = event.currentTarget?.dataset?.approvalKey ?? this.host.selectedApprovalKey;
        const form = event.currentTarget.closest('[data-approval-review-form]');
        await this._finalizeApproval(key, form);
      }, { signal });
    });

    pageElement.querySelectorAll('[data-action="approval-confirm-deny"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const key = event.currentTarget?.dataset?.approvalKey ?? this.host.selectedApprovalKey;
        const form = event.currentTarget.closest('[data-approval-review-form]');
        const reason = String(new FormData(form).get('denialReason') ?? '').trim();
        await this._denyRequest(key, reason);
      }, { signal });
    });
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
  }


  _parseFactionKey(key = '') {
    const [type, actorId, factionRecordId] = String(key || '').split(':');
    if (type !== 'faction' || !actorId || !factionRecordId) return null;
    return { actorId, factionRecordId };
  }

  _collectFactionApprovalData(form) {
    const data = new FormData(form);
    return {
      name: String(data.get('name') ?? '').trim(),
      type: String(data.get('type') ?? '').trim(),
      planet: String(data.get('planet') ?? '').trim(),
      system: String(data.get('system') ?? '').trim(),
      relationshipType: String(data.get('relationshipType') ?? 'known').trim(),
      notes: String(data.get('notes') ?? '').trim(),
      score: Number(data.get('score') || 0) || 0,
      benefits: String(data.get('benefits') ?? '').trim(),
      gmNotes: String(data.get('gmNotes') ?? '').trim()
    };
  }

  async _approveRequest(key, form = null) {
    const parsed = this._parseFactionKey(key);
    if (!parsed) return this.host._approveApprovalRequest(key);
    await FactionRegistryService.approveSuggestedFaction({
      ...parsed,
      data: form ? this._collectFactionApprovalData(form) : {}
    });
    ui.notifications?.info?.('Faction suggestion approved.');
    this.host.selectedApprovalKey = null;
    await this.host.render(false);
  }

  async _finalizeApproval(key, form = null) {
    const parsed = this._parseFactionKey(key);
    if (!parsed) return this.host._finalizeApprovalWithEdits(key, form);
    await FactionRegistryService.approveSuggestedFaction({
      ...parsed,
      data: form ? this._collectFactionApprovalData(form) : {}
    });
    ui.notifications?.info?.('Faction suggestion approved with GM edits.');
    this.host.selectedApprovalKey = null;
    this.host.approvalEditMode = false;
    await this.host.render(false);
  }

  async _denyRequest(key, reason = '') {
    const parsed = this._parseFactionKey(key);
    if (!parsed) return this.host._denyApprovalRequest(key, reason);
    await FactionRegistryService.rejectSuggestedFaction({ ...parsed, reason });
    ui.notifications?.info?.('Faction suggestion rejected.');
    this.host.selectedApprovalKey = null;
    this.host.approvalDenyMode = false;
    await this.host.render(false);
  }

  /** Render live changed-field rows in the approval decision rail while GM edits inline. */
  _wireApprovalEditPreview(form, signal) {
    const fields = Array.from(form.querySelectorAll('[data-approval-edit-field]'));
    const changeList = form.querySelector('[data-approval-change-list]');
    if (!fields.length || !changeList) return;

    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const renderChanges = () => {
      const changes = fields
        .map((field) => {
          const label = field.dataset.label || field.name;
          const original = String(field.dataset.original ?? '').trim();
          const current = String(field.value ?? '').trim();
          return { label, original, current, changed: original !== current };
        })
        .filter((change) => change.changed);

      if (!changes.length) {
        changeList.innerHTML = '<p class="gm-approval-empty-note" data-approval-change-empty>No edits yet. Change fields in the summary packet to build the adjustment list.</p>';
        return;
      }

      changeList.innerHTML = changes.map((change) => `
        <div class="gm-approval-change-row">
          <span>${escapeHtml(change.label)}</span>
          <strong>${escapeHtml(change.original || '—')} → ${escapeHtml(change.current || '—')}</strong>
        </div>
      `).join('');
    };

    fields.forEach((field) => {
      field.addEventListener('input', renderChanges, { signal });
      field.addEventListener('change', renderChanges, { signal });
    });
    renderChanges();
  }
}

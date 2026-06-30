import { SkillChallengeEngine } from '/systems/foundryvtt-swse/scripts/engine/skill-challenges/SkillChallengeEngine.js';
import { SkillChallengeState } from '/systems/foundryvtt-swse/scripts/engine/skill-challenges/SkillChallengeState.js';
import { SkillChallengeStore } from '/systems/foundryvtt-swse/scripts/engine/skill-challenges/SkillChallengeStore.js';

function text(formData, key, fallback = '') {
  return String(formData.get(key) ?? fallback).trim();
}

function number(formData, key, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function parseSkillLines(value = '') {
  return String(value || '')
    .split(/\r?\n/g)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [slug = '', dc = '0', label = '', notes = ''] = line.split(':').map(part => part.trim());
      return SkillChallengeState.normalizeSkillEntry({ slug, label: label || slug, dc: Number(dc) || 0, notes });
    })
    .filter(entry => entry.slug || entry.label);
}

function parseEffectParameters(raw = '') {
  const value = String(raw || '').trim();
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_err) {
    return {};
  }
}

function splitDelimitedLine(line = '', expectedHeadParts = 3) {
  const textValue = String(line || '');
  const parts = [];
  let cursor = 0;
  for (let index = 0; index < expectedHeadParts; index += 1) {
    const separator = textValue.indexOf(':', cursor);
    if (separator < 0) break;
    parts.push(textValue.slice(cursor, separator).trim());
    cursor = separator + 1;
  }
  parts.push(textValue.slice(cursor).trim());
  while (parts.length < expectedHeadParts + 1) parts.push('');
  return parts;
}

function parseEffectLines(value = '') {
  return String(value || '')
    .split(/\r?\n/g)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      // Preserve JSON effect parameters after the third delimiter. This supports
      // lines such as timedChallenge:Timed Challenge::{"limit":6,"remaining":6}.
      const [type = '', label = '', notes = '', parameters = ''] = splitDelimitedLine(line, 3);
      return SkillChallengeState.normalizeEffectEntry({
        type,
        label: label || type,
        notes,
        enabled: true,
        parameters: parseEffectParameters(parameters)
      });
    })
    .filter(entry => entry.type || entry.label);
}

function escapeHtml(value = '') {
  return globalThis.foundry?.utils?.escapeHTML?.(String(value ?? '')) ?? String(value ?? '');
}

async function postChallengeSummaryToChat(challenge, reason = 'summary') {
  const normalized = SkillChallengeState.normalize(challenge);
  const title = escapeHtml(normalized.name);
  const brief = escapeHtml(normalized.playerBrief || normalized.gmNotes || '');
  const status = escapeHtml(normalized.status);
  const successText = escapeHtml(normalized.successText || '');
  const failureText = escapeHtml(normalized.failureText || '');
  const skills = normalized.primarySkills
    .map(skill => `${escapeHtml(skill.label || skill.slug)} DC ${Number(skill.dc) || 0}`)
    .join(', ');
  const content = `
    <section class="swse-chat-card swse-skill-challenge-public-card">
      <header><h3>Skill Challenge: ${title}</h3></header>
      <p><strong>Status:</strong> ${status} · <strong>Progress:</strong> ${normalized.successes}/${normalized.targetSuccesses} successes, ${normalized.failures}/${normalized.failureLimit} failures</p>
      ${brief ? `<p>${brief}</p>` : ''}
      ${skills ? `<p><strong>Primary Skills:</strong> ${skills}</p>` : ''}
      ${successText ? `<p><strong>Success:</strong> ${successText}</p>` : ''}
      ${failureText ? `<p><strong>Failure:</strong> ${failureText}</p>` : ''}
      <p class="swse-muted">Posted by the GM from the Skill Challenge tracker (${escapeHtml(reason)}).</p>
    </section>`;
  await globalThis.ChatMessage?.create?.({
    user: globalThis.game?.user?.id,
    content
  });
}

function challengeFromForm(form) {
  const formData = new FormData(form);
  const id = text(formData, 'id') || SkillChallengeState.createId();
  return SkillChallengeEngine.createChallenge({
    id,
    name: text(formData, 'name', 'Untitled Skill Challenge'),
    source: text(formData, 'source', 'Galaxy of Intrigue'),
    cl: number(formData, 'cl', 0),
    complexity: number(formData, 'complexity', 0),
    targetSuccesses: Math.max(1, number(formData, 'targetSuccesses', 4)),
    failureLimit: Math.max(1, number(formData, 'failureLimit', 3)),
    status: text(formData, 'status', 'draft'),
    playerBrief: text(formData, 'playerBrief'),
    successText: text(formData, 'successText'),
    failureText: text(formData, 'failureText'),
    gmNotes: text(formData, 'gmNotes'),
    primarySkills: parseSkillLines(text(formData, 'primarySkillsText')),
    secondarySkills: parseSkillLines(text(formData, 'secondarySkillsText')),
    effects: parseEffectLines(text(formData, 'effectsText'))
  });
}

function challengeToFormText(challenge = {}) {
  const normalized = SkillChallengeState.normalize(challenge);
  return {
    primarySkillsText: normalized.primarySkills.map(skill => [skill.slug, skill.dc, skill.label, skill.notes].filter(value => value !== '').join(':')).join('\n'),
    secondarySkillsText: normalized.secondarySkills.map(skill => [skill.slug, skill.dc, skill.label, skill.notes].filter(value => value !== '').join(':')).join('\n'),
    effectsText: normalized.effects.map(effect => [effect.type, effect.label, effect.notes, Object.keys(effect.parameters || {}).length ? JSON.stringify(effect.parameters) : ''].filter(value => value !== '').join(':')).join('\n')
  };
}

export class GMSkillChallengeSurfaceController {
  constructor(host) {
    this.host = host;
    this._abort = null;
  }

  async attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.querySelector('.swse-skill-challenge-surface');
    if (!pageElement) return false;
    if (!globalThis.game?.user?.isGM) return false;

    pageElement.addEventListener('click', event => this._onClick(event), { signal });
    pageElement.addEventListener('submit', event => this._onSubmit(event), { signal });

    globalThis.Hooks?.on?.('swse.skillChallengeUpdated', this._handleExternalUpdate = async () => {
      await this._refresh('skill-challenge-external-update');
    });
    return true;
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
    if (this._handleExternalUpdate) {
      globalThis.Hooks?.off?.('swse.skillChallengeUpdated', this._handleExternalUpdate);
      this._handleExternalUpdate = null;
    }
  }

  async _refresh(reason = 'skill-challenge-surface-refresh') {
    await this.host?.requestSurfaceRender?.({ reason, surfaceId: 'skill-challenges', preserveUi: true });
  }

  _select(challengeId) {
    this.host?.patchSurfaceState?.('skill-challenges', { selectedChallengeId: challengeId }, { render: false });
  }

  async _getSelected(challengeId = '') {
    const id = challengeId || this.host?.getSurfaceState?.('skill-challenges')?.selectedChallengeId || '';
    return id ? SkillChallengeStore.getById(id) : null;
  }

  async _onClick(event) {
    const button = event.target?.closest?.('[data-skill-challenge-action]');
    if (!button) return;
    event.preventDefault();

    const action = button.dataset.skillChallengeAction;
    const challengeId = button.dataset.challengeId || this.host?.getSurfaceState?.('skill-challenges')?.selectedChallengeId || '';

    if (action === 'select') {
      this._select(challengeId);
      await this._refresh('skill-challenge-select');
      return;
    }

    if (action === 'new') {
      this._select('');
      const form = button.closest('.swse-skill-challenge-surface')?.querySelector('[data-skill-challenge-create-form]');
      form?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (action === 'start' || action === 'success' || action === 'failure' || action === 'cancel') {
      const challenge = await this._getSelected(challengeId);
      if (!challenge) return;
      const next = action === 'start'
        ? SkillChallengeEngine.startChallenge(challenge)
        : action === 'success'
          ? SkillChallengeEngine.completeChallenge(challenge, 'succeeded')
          : action === 'failure'
            ? SkillChallengeEngine.completeChallenge(challenge, 'failed')
            : SkillChallengeEngine.completeChallenge(challenge, 'cancelled');
      await SkillChallengeStore.saveChallenge(next);
      this._select(next.id);
      await this._refresh(`skill-challenge-${action}`);
      return;
    }

    if (action === 'success-plus' || action === 'success-minus' || action === 'failure-plus' || action === 'failure-minus') {
      const challenge = await this._getSelected(challengeId);
      if (!challenge) return;
      const deltas = {
        'success-plus': { successesDelta: 1, note: 'GM added one success.' },
        'success-minus': { successesDelta: -1, note: 'GM removed one success.' },
        'failure-plus': { failuresDelta: 1, note: 'GM added one failure.' },
        'failure-minus': { failuresDelta: -1, note: 'GM removed one failure.' }
      }[action];
      const next = SkillChallengeEngine.manualAdjust(challenge, deltas);
      await SkillChallengeStore.saveChallenge(next);
      this._select(next.id);
      await this._refresh(`skill-challenge-${action}`);
      return;
    }


    if (action === 'feat-recovery' || action === 'feat-last-resort') {
      const challenge = await this._getSelected(challengeId);
      if (!challenge) return;
      const actorId = button.dataset.actorId || '';
      const actorName = button.dataset.actorName || '';
      const next = action === 'feat-recovery'
        ? SkillChallengeEngine.applyRecoveryFeat(challenge, { actorId, actorName })
        : SkillChallengeEngine.applyLastResort(challenge, { actorId, actorName });
      await SkillChallengeStore.saveChallenge(next);
      this._select(next.id);
      await this._refresh(`skill-challenge-${action}`);
      return;
    }

    if (action === 'recover-failure' || action === 'second-effort' || action === 'timed-minus' || action === 'timed-plus') {
      const challenge = await this._getSelected(challengeId);
      if (!challenge) return;
      const next = action === 'recover-failure'
        ? SkillChallengeEngine.recoverFailure(challenge)
        : action === 'second-effort'
          ? SkillChallengeEngine.recordSecondEffort(challenge)
          : SkillChallengeEngine.advanceTimedChallenge(challenge, action === 'timed-plus' ? 1 : -1);
      await SkillChallengeStore.saveChallenge(next);
      this._select(next.id);
      await this._refresh(`skill-challenge-${action}`);
      return;
    }

    if (action === 'add-selected-token') {
      const challenge = await this._getSelected(challengeId);
      const token = globalThis.canvas?.tokens?.controlled?.[0];
      const actor = token?.actor;
      if (!challenge || !actor) {
        globalThis.ui?.notifications?.warn?.('Select a token before adding a Skill Challenge participant.');
        return;
      }
      const next = SkillChallengeEngine.addParticipant(challenge, {
        actorId: actor.id,
        tokenId: token.id,
        name: actor.name
      });
      await SkillChallengeStore.saveChallenge(next);
      this._select(next.id);
      await this._refresh('skill-challenge-add-participant');
      return;
    }

    if (action === 'remove-participant') {
      const challenge = await this._getSelected(challengeId);
      if (!challenge) return;
      const next = SkillChallengeEngine.removeParticipant(challenge, button.dataset.actorId || '');
      await SkillChallengeStore.saveChallenge(next);
      this._select(next.id);
      await this._refresh('skill-challenge-remove-participant');
      return;
    }

    if (action === 'delete') {
      if (!challengeId) return;
      const confirmed = await Dialog.confirm({
        title: 'Delete Skill Challenge?',
        content: '<p>This removes the GM tracker state for this Skill Challenge. This cannot be undone.</p>',
        yes: () => true,
        no: () => false,
        defaultYes: false
      });
      if (!confirmed) return;
      await SkillChallengeStore.deleteChallenge(challengeId);
      this._select('');
      await this._refresh('skill-challenge-delete');
      return;
    }

    if (action === 'post-summary') {
      const challenge = await this._getSelected(challengeId);
      if (!challenge) return;
      await postChallengeSummaryToChat(challenge, 'tracker summary');
      await this._refresh('skill-challenge-post-summary');
      return;
    }

    if (action === 'clear-completed') {
      const count = await SkillChallengeStore.clearCompleted();
      globalThis.ui?.notifications?.info?.(`Cleared ${count} completed Skill Challenge tracker${count === 1 ? '' : 's'}.`);
      this._select('');
      await this._refresh('skill-challenge-clear-completed');
    }
  }

  async _onSubmit(event) {
    const form = event.target?.closest?.('form[data-skill-challenge-create-form], form[data-skill-challenge-edit-form], form[data-skill-challenge-roll-form]');
    if (!form) return;
    event.preventDefault();

    if (form.matches('[data-skill-challenge-roll-form]')) {
      await this._submitManualRoll(form);
      return;
    }

    const created = challengeFromForm(form);
    const existing = created.id ? await SkillChallengeStore.getById(created.id) : null;
    const textFields = challengeToFormText(created);
    const next = existing
      ? SkillChallengeEngine.updateChallenge(existing, { ...created, ...textFields, history: existing.history, successes: existing.successes, failures: existing.failures, createdAt: existing.createdAt })
      : created;

    await SkillChallengeStore.saveChallenge(next);
    this._select(next.id);
    globalThis.ui?.notifications?.info?.(`Saved Skill Challenge: ${next.name}`);
    await this._refresh('skill-challenge-save');
  }

  async _submitManualRoll(form) {
    const formData = new FormData(form);
    const challengeId = text(formData, 'challengeId') || this.host?.getSurfaceState?.('skill-challenges')?.selectedChallengeId || '';
    const challenge = await this._getSelected(challengeId);
    if (!challenge) return;

    const rollContext = {
      actorId: text(formData, 'actorId'),
      actorName: text(formData, 'actorName', 'GM Entry'),
      skillSlug: text(formData, 'skillSlug', 'gm-entry'),
      skillLabel: text(formData, 'skillLabel', text(formData, 'skillSlug', 'GM Entry')),
      total: number(formData, 'total', 0),
      dc: number(formData, 'dc', 0),
      rollMessageId: ''
    };
    const mode = text(formData, 'outcomeMode', 'suggested');
    const next = mode === 'success'
      ? SkillChallengeEngine.acceptRollAsSuccess(challenge, rollContext)
      : mode === 'failure'
        ? SkillChallengeEngine.acceptRollAsFailure(challenge, rollContext)
        : mode === 'ignore'
          ? SkillChallengeEngine.ignoreRoll(challenge, rollContext)
          : SkillChallengeEngine.submitRoll(challenge, rollContext);

    await SkillChallengeStore.saveChallenge(next);
    this._select(next.id);
    globalThis.ui?.notifications?.info?.(`Recorded Skill Challenge entry: ${next.name}`);
    form.reset?.();
    await this._refresh('skill-challenge-manual-roll');
  }
}

export default GMSkillChallengeSurfaceController;

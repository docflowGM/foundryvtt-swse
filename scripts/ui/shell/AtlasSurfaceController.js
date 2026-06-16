/** Player-facing Atlas controller. */

import { LocationRegistryService } from '/systems/foundryvtt-swse/scripts/locations/location-registry-service.js';
import { requestShellRender } from '/systems/foundryvtt-swse/scripts/ui/shell/request-shell-render.js';
import { SWSERoll } from '/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js';

function text(value, fallback = '') {
  const out = String(value ?? fallback ?? '').trim();
  return out || fallback;
}

export class AtlasSurfaceController {
  constructor(host, actor) {
    this.host = host;
    this.actor = actor;
    this._abort = null;
    this._searchTimer = null;
  }

  attach(root) {
    this.destroy();
    this._abort = new AbortController();
    const signal = this._abort.signal;
    const pageElement = root.querySelector('[data-shell-region="surface-atlas"]');
    if (!pageElement) return;
    this._wireFilters(pageElement, signal);
    this._wireActions(pageElement, signal);
    this._wireNotes(pageElement, signal);
  }

  destroy() {
    this._abort?.abort?.();
    this._abort = null;
    if (this._searchTimer) window.clearTimeout(this._searchTimer);
    this._searchTimer = null;
  }

  _wireFilters(pageElement, signal) {
    pageElement.querySelectorAll('[data-atlas-filter]').forEach((input) => {
      const eventName = input.tagName === 'INPUT' && input.type === 'search' ? 'input' : 'change';
      input.addEventListener(eventName, async (event) => {
        const target = event.currentTarget;
        const key = target.dataset.atlasFilter;
        if (!key) return;
        const value = target.value;
        const options = { ...(this.host?.shellSurfaceOptions || {}), [key]: value };
        if (eventName === 'input') {
          if (this._searchTimer) window.clearTimeout(this._searchTimer);
          this._searchTimer = window.setTimeout(async () => {
            this.host.shellSurfaceOptions = options;
            await this._refresh('atlas-filter');
          }, 180);
          return;
        }
        this.host.shellSurfaceOptions = options;
        await this._refresh('atlas-filter');
      }, { signal });
    });
  }

  _wireActions(pageElement, signal) {
    pageElement.querySelectorAll('[data-atlas-action]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const target = event.currentTarget;
        const action = target.dataset.atlasAction;
        const locationId = target.dataset.locationId || this.host?.shellSurfaceOptions?.selectedLocationId || '';
        if (!action) return;

        if (action === 'select') {
          this.host.shellSurfaceOptions = { ...(this.host.shellSurfaceOptions || {}), selectedLocationId: locationId };
          await this._refresh('atlas-select');
          return;
        }

        if (action === 'pin') {
          await LocationRegistryService.patchActorLocationState(this.actor, locationId, { pinned: true });
          await this._refresh('atlas-pin');
          return;
        }

        if (action === 'unpin') {
          await LocationRegistryService.patchActorLocationState(this.actor, locationId, { pinned: false });
          await this._refresh('atlas-unpin');
          return;
        }

        if (action === 'reviewed') {
          await LocationRegistryService.patchActorLocationState(this.actor, locationId, { reviewed: true });
          await this._refresh('atlas-reviewed');
          return;
        }

        if (action === 'attempt-fact') {
          await this._attemptFact(locationId, target.dataset.factId || '', target.dataset.skill || '', Number(target.dataset.dc || 0), target.dataset.checkId || '');
        }
      }, { signal });
    });
  }

  _wireNotes(pageElement, signal) {
    pageElement.querySelectorAll('form[data-atlas-notes-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const locationId = text(formData.get('locationId'));
        const playerNotes = text(formData.get('playerNotes'));
        await LocationRegistryService.patchActorLocationState(this.actor, locationId, { playerNotes });
        ui.notifications?.info?.('Atlas note saved.');
        await this._refresh('atlas-notes-save');
      }, { signal });
    });
  }

  async _attemptFact(locationId = '', factId = '', skill = '', dc = 0, checkId = '') {
    const location = LocationRegistryService.findLocation(locationId);
    const fact = location?.atlasFacts?.find(entry => entry.id === factId);
    if (!location || !fact) return;
    const checks = Array.isArray(fact.checks) ? fact.checks : [];
    const selectedCheck = checks.find(check => check.id === checkId) || checks.find(check => check.skill === skill && Number(check.dc) === Number(dc)) || checks[0] || { skill, dc };
    const resolvedSkill = selectedCheck.skill || skill;
    const resolvedDc = Number(selectedCheck.dc ?? dc ?? 0);
    let total = 0;
    let rolled = false;
    try {
      if (typeof SWSERoll.rollSkill !== 'function') throw new Error('Skill roller unavailable.');
      const roll = await SWSERoll.rollSkill(this.actor, resolvedSkill, {
        dc: resolvedDc,
        sourceType: 'atlas',
        sourceLabel: `Atlas Research: ${fact.title}`
      });
      total = Number(roll?.total ?? roll?.roll?.total ?? 0);
      rolled = true;
    } catch (_err) {
      const roll = await new Roll('1d20').evaluate({ async: true });
      total = Number(roll.total || 0);
      rolled = true;
      await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: `Atlas Research fallback roll: ${fact.title}` });
    }
    if (rolled && total >= resolvedDc) {
      await LocationRegistryService.revealFactToActor(this.actor, locationId, factId);
      const discovery = await LocationRegistryService.recordAtlasLeadDiscovery(this.actor, locationId, factId, {
        total,
        dc: resolvedDc,
        skill: resolvedSkill,
        checkId: selectedCheck.id || checkId || '',
        checkLabel: selectedCheck.label || ''
      });
      await this._announceActionableLead(location, fact, { total, dc: resolvedDc, skill: resolvedSkill, discovery });
      ui.notifications?.info?.(`Atlas fact revealed: ${fact.title}`);
    } else {
      ui.notifications?.warn?.(`Atlas research did not beat DC ${resolvedDc}.`);
    }
    await this._refresh('atlas-fact-attempt');
  }


  async _announceActionableLead(location = {}, fact = {}, { total = 0, dc = 0, skill = '', discovery = null } = {}) {
    const output = String(fact?.onReveal?.output || '').trim();
    const wantsJob = output === 'job-draft' || fact?.onReveal?.createJob;
    const wantsIntel = output === 'intel-draft' || fact?.onReveal?.createIntel;
    const hasRevealLinks = Boolean(fact?.onReveal?.revealLocationIds?.length || fact?.onReveal?.revealFactionIds?.length || fact?.onReveal?.revealContactIds?.length);
    if (!wantsJob && !wantsIntel && !hasRevealLinks) return;
    const gmUsers = game.users?.filter?.(user => user.isGM)?.map(user => user.id) || [];
    const actorName = this.actor?.name || game.user?.name || 'A player';
    const actions = [wantsJob ? 'Job Draft' : '', wantsIntel ? 'Intel Draft' : '', hasRevealLinks ? 'Reveal Links' : ''].filter(Boolean).join(' / ');
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      whisper: gmUsers,
      content: `<strong>Atlas Lead Uncovered</strong><br>${actorName} revealed <em>${fact.title}</em> at <em>${location.name}</em> with ${skill || 'research'} ${total} vs DC ${dc}.<br>Suggested follow-up: ${actions}. Open GM Locations → Actionable Leads${discovery?.id ? ` (#${discovery.id})` : ''}.`
    });
  }

  async _refresh(reason = 'atlas-refresh') {
    await requestShellRender(this.host, { reason, surfaceId: 'atlas' });
  }
}

export default AtlasSurfaceController;

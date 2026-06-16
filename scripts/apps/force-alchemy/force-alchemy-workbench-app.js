// scripts/apps/force-alchemy/force-alchemy-workbench-app.js

import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { ForceAlchemyContextResolver, getForceAlchemySuggestedRiteForItem, resolveForceAlchemyActor } from "/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-context-resolver.js";
import { FORCE_ALCHEMY_CATEGORIES, FORCE_ALCHEMY_RITES } from "/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-data.js";
import { ForceAlchemyStateService } from "/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-state-service.js";
import { ForceAlchemyMechanicsService } from "/systems/foundryvtt-swse/scripts/apps/force-alchemy/force-alchemy-mechanics-service.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";

const TEMPLATE_PATH = 'systems/foundryvtt-swse/templates/apps/force-alchemy/force-alchemy-workbench.hbs';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function asArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function projectById(actor, projectId) {
  const state = ForceAlchemyStateService.read(actor);
  return asArray(state?.projects).find(project => project.id === projectId) ?? null;
}

function shouldConfirmDetail(detail) {
  const rite = detail?.rite;
  if (!rite) return false;
  if (Number(rite.dspCost ?? 0) > 0 || Number(rite.creditCost ?? 0) > 0) return true;
  if (rite.timing === 'downtime' || rite.stateKey === 'projects') return true;
  return ['sith-weapon-surge', 'cause-mutation', 'sith-alchemy-specialist'].includes(rite.id);
}

function detailConfirmationContent(detail) {
  const rite = detail?.rite ?? {};
  const target = detail?.selectedTarget?.name ?? 'No target';
  const rows = asArray(detail?.ledgerRows).map(row => `<li><strong>${esc(row.key)}:</strong> ${esc(row.value)}</li>`).join('');
  const preview = asArray(detail?.previewLines).slice(0, 6).map(line => `<li>${esc(line)}</li>`).join('');
  const darkSide = Number(rite.dspCost ?? 0) > 0
    ? `<p class="hint danger"><strong>Dark Side consequence:</strong> this will increase Dark Side Score by ${esc(rite.dspCost)} when applied or completed.</p>`
    : '';
  return `
    <div class="swse-force-alchemy-confirm">
      <p>Confirm the alchemical working before it touches actor/item state.</p>
      <ul>
        <li><strong>Rite:</strong> ${esc(rite.name)}</li>
        <li><strong>Target:</strong> ${esc(target)}</li>
        ${rows}
      </ul>
      ${darkSide}
      ${preview ? `<details open><summary>Result preview</summary><ul>${preview}</ul></details>` : ''}
    </div>`;
}

async function confirmDetailApplication(detail) {
  if (!shouldConfirmDetail(detail)) return true;
  return SWSEDialogV2.confirm({
    title: `Confirm ${detail?.rite?.name ?? 'Force Alchemy Rite'}`,
    content: detailConfirmationContent(detail),
    defaultYes: false
  });
}

async function confirmPlain({ title, content }) {
  return SWSEDialogV2.confirm({ title, content, defaultYes: false });
}

function firstRiteForCategory(category) {
  return FORCE_ALCHEMY_RITES.find(rite => rite.category === category)?.id ?? FORCE_ALCHEMY_RITES[0]?.id ?? null;
}

function isForceAlchemyForcePowerItem(item) {
  const type = String(item?.type || item?.system?.type || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const text = `${item?.name || ''} ${item?.system?.category || ''} ${item?.system?.descriptor || ''}`.toLowerCase();
  return type === 'forcepower' || type === 'force_power' || /force power/.test(text);
}

async function resolveActorReference(actorRef) {
  if (actorRef?.documentName === 'Actor' || actorRef?.items) return actorRef;
  if (typeof actorRef === 'string') {
    if (actorRef.includes('.')) {
      try {
        const doc = await fromUuid(actorRef);
        if (doc?.documentName === 'Actor' || doc?.items) return doc;
      } catch (error) {
        console.warn('[ForceAlchemyWorkbench] Failed to resolve actor UUID', actorRef, error);
      }
    }
    return game.actors?.get?.(actorRef) ?? null;
  }
  return resolveForceAlchemyActor(actorRef);
}

export class ForceAlchemyWorkbenchApp extends BaseSWSEAppV2 {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(super.DEFAULT_OPTIONS ?? {}), {
    id: 'swse-force-alchemy-workbench',
    classes: ['swse', 'swse-force-alchemy-workbench', 'swse-theme-holo'],
    position: { width: 1140, height: 760 },
    window: {
      title: 'Force Artifact / Sith Alchemy Workbench',
      icon: 'fas fa-hand-sparkles',
      resizable: true
    }
  });

  static PARTS = {
    content: { template: TEMPLATE_PATH }
  };

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor ?? null;
    const launchTargetId = options.targetId || options.itemId || null;
    const launchTarget = launchTargetId ? actor?.items?.get?.(launchTargetId) : null;
    const targetSuggestion = options.riteId ? null : getForceAlchemySuggestedRiteForItem(actor, launchTarget);
    this.activeCategory = options.activeCategory || targetSuggestion?.category || this.#categoryForRite(options.riteId) || 'force';
    this.selectedRiteId = options.riteId || targetSuggestion?.riteId || firstRiteForCategory(this.activeCategory);
    this.selectedTargetId = launchTargetId;
    this.selectedConfig = foundry.utils.deepClone(options.config || {});
    this.launchSource = options.launchSource || null;
  }

  async _prepareContext(options) {
    const base = await super._prepareContext(options);
    const context = ForceAlchemyContextResolver.resolve(this.actor, {
      activeCategory: this.activeCategory,
      selectedRiteId: this.selectedRiteId,
      selectedTargetId: this.selectedTargetId,
      selectedConfig: this.selectedConfig,
      categories: FORCE_ALCHEMY_CATEGORIES.map(category => ({
        ...category,
        selected: category.id === this.activeCategory
      }))
    });

    return {
      ...base,
      appId: this.id,
      actorMissing: !this.actor,
      launchSource: this.launchSource,
      ...context
    };
  }

  wireEvents() {
    this.onRoot('click', '[data-force-alchemy-action]', (event, element) => this.#onAction(event, element));
    this.onRoot('change', '[data-force-alchemy-config]', (event, element) => this.#onConfigChange(event, element));
    this.onRoot('dragover', '[data-force-alchemy-dropzone]', (event) => event.preventDefault());
    this.onRoot('drop', '[data-force-alchemy-dropzone]', (event) => this.#onDrop(event));
  }

  #categoryForRite(riteId) {
    return FORCE_ALCHEMY_RITES.find(rite => rite.id === riteId)?.category ?? null;
  }

  #setSelectionPatch(patch = {}) {
    if (Object.hasOwn(patch, 'activeCategory')) this.activeCategory = patch.activeCategory;
    if (Object.hasOwn(patch, 'selectedRiteId')) this.selectedRiteId = patch.selectedRiteId;
    if (Object.hasOwn(patch, 'selectedTargetId')) this.selectedTargetId = patch.selectedTargetId;
    if (Object.hasOwn(patch, 'selectedConfig')) this.selectedConfig = foundry.utils.deepClone(patch.selectedConfig || {});
    this.render(false);
  }

  async #onAction(event, element) {
    event.preventDefault();
    const action = element?.dataset?.forceAlchemyAction;
    if (!action) return;

    if (action === 'close') {
      this.close();
      return;
    }

    if (action === 'category') {
      const category = element.dataset.category || 'force';
      this.#setSelectionPatch({
        activeCategory: category,
        selectedRiteId: firstRiteForCategory(category),
        selectedTargetId: null,
        selectedConfig: {}
      });
      return;
    }

    if (action === 'rite') {
      const riteId = element.dataset.riteId;
      this.#setSelectionPatch({
        selectedRiteId: riteId,
        activeCategory: this.#categoryForRite(riteId) || this.activeCategory,
        selectedTargetId: null,
        selectedConfig: {}
      });
      return;
    }

    if (action === 'target') {
      this.#setSelectionPatch({ selectedTargetId: element.dataset.targetId || null });
      return;
    }

    if (action === 'defense') {
      this.#setSelectionPatch({ selectedConfig: { ...this.selectedConfig, defense: element.dataset.defenseId || null } });
      return;
    }

    if (action === 'force-power') {
      this.#setSelectionPatch({ selectedConfig: { ...this.selectedConfig, powerId: element.dataset.powerId || null } });
      return;
    }

    if (action === 'template') {
      this.#setSelectionPatch({ selectedConfig: { ...this.selectedConfig, templateId: element.dataset.templateId || null } });
      return;
    }

    if (action === 'trait') {
      this.#setSelectionPatch({ selectedConfig: { ...this.selectedConfig, traitId: element.dataset.traitId || null } });
      return;
    }

    if (action === 'clear') {
      this.#setSelectionPatch({ selectedTargetId: null, selectedConfig: {} });
      return;
    }

    if (action === 'commit') {
      await this.#recordCurrentSelection();
      return;
    }

    if (action === 'clear-slot') {
      await this.#clearSlot(element.dataset.stateKey);
      return;
    }

    if (action === 'destroy-slot') {
      await this.#destroySlot(element.dataset.stateKey);
      return;
    }

    if (action === 'cancel-project') {
      await this.#cancelProject(element.dataset.projectId);
      return;
    }

    if (action === 'advance-project') {
      await this.#advanceProject(element.dataset.projectId);
      return;
    }

    if (action === 'complete-project') {
      await this.#completeProject(element.dataset.projectId);
      return;
    }

    if (action === 'consume-rapid-surge') {
      await this.#consumeRapidAlchemySurge();
      return;
    }
  }

  #resolveCurrentContext() {
    return ForceAlchemyContextResolver.resolve(this.actor, {
      activeCategory: this.activeCategory,
      selectedRiteId: this.selectedRiteId,
      selectedTargetId: this.selectedTargetId,
      selectedConfig: this.selectedConfig,
      categories: FORCE_ALCHEMY_CATEGORIES.map(category => ({
        ...category,
        selected: category.id === this.activeCategory
      }))
    });
  }

  async #recordCurrentSelection() {
    const context = this.#resolveCurrentContext();
    const detail = context.detail;
    if (!detail?.ready) {
      ui.notifications?.warn?.('Choose a legal target and required configuration before recording this working.');
      return;
    }
    try {
      const confirmed = await confirmDetailApplication(detail);
      if (!confirmed) return;
      const result = await ForceAlchemyMechanicsService.applySelection(this.actor, detail);
      const modeLabel = result.mode === 'project' ? 'pending ritual project' : result.mechanical ? 'active mechanical working' : 'staged working';
      ui.notifications?.info?.(`${detail.rite.name} recorded as a ${modeLabel}.`);
      this.render(false);
    } catch (error) {
      console.error('[ForceAlchemyWorkbench] Failed to apply selection', error);
      ui.notifications?.error?.(`Could not apply Force Alchemy rite: ${error.message}`);
    }
  }

  async #clearSlot(stateKey) {
    if (!stateKey) return;
    try {
      const entry = ForceAlchemyStateService.read(this.actor)?.[stateKey] ?? null;
      const confirmed = await confirmPlain({
        title: 'End Alchemical Working?',
        content: `<p>End <strong>${esc(entry?.name ?? 'this working')}</strong> and remove its linked active effects?</p><p>This does not create a talisman destruction cooldown.</p>`
      });
      if (!confirmed) return;
      await ForceAlchemyMechanicsService.clearSlot(this.actor, stateKey);
      ui.notifications?.info?.('Cleared the alchemical working and removed its active effects.');
      this.render(false);
    } catch (error) {
      console.error('[ForceAlchemyWorkbench] Failed to clear slot', error);
      ui.notifications?.error?.(`Could not clear alchemical working: ${error.message}`);
    }
  }

  async #destroySlot(stateKey) {
    if (!stateKey) return;
    try {
      const entry = ForceAlchemyStateService.read(this.actor)?.[stateKey] ?? null;
      const confirmed = await confirmPlain({
        title: 'Destroy Talisman?',
        content: `<p>Destroy <strong>${esc(entry?.targetName ?? entry?.name ?? 'this talisman')}</strong>?</p><p class="hint danger"><strong>Cooldown:</strong> this records the appropriate 24-hour talisman cooldown and removes linked active effects.</p>`
      });
      if (!confirmed) return;
      await ForceAlchemyMechanicsService.destroySlot(this.actor, stateKey);
      ui.notifications?.info?.('Destroyed the talisman, removed its active effects, and recorded its cooldown when applicable.');
      this.render(false);
    } catch (error) {
      console.error('[ForceAlchemyWorkbench] Failed to destroy slot', error);
      ui.notifications?.error?.(`Could not destroy alchemical working: ${error.message}`);
    }
  }

  async #cancelProject(projectId) {
    if (!projectId) return;
    try {
      const project = projectById(this.actor, projectId);
      const confirmed = await confirmPlain({
        title: 'Cancel Alchemical Project?',
        content: `<p>Cancel <strong>${esc(project?.name ?? 'this pending project')}</strong>${project?.targetName ? ` for <strong>${esc(project.targetName)}</strong>` : ''}?</p><p>Progress tracking for this ritual will be removed.</p>`
      });
      if (!confirmed) return;
      await ForceAlchemyStateService.cancelProject(this.actor, projectId);
      ui.notifications?.info?.('Cancelled the pending alchemical project.');
      this.render(false);
    } catch (error) {
      console.error('[ForceAlchemyWorkbench] Failed to cancel project', error);
      ui.notifications?.error?.(`Could not cancel alchemical project: ${error.message}`);
    }
  }

  async #advanceProject(projectId) {
    if (!projectId) return;
    try {
      const project = projectById(this.actor, projectId);
      if (project?.completable) {
        ui.notifications?.warn?.(`${project.name} is ready to complete; use Complete instead of adding more work.`);
        return;
      }
      await ForceAlchemyStateService.advanceProject(this.actor, projectId, 1);
      ui.notifications?.info?.('Advanced the pending alchemical project by one work unit.');
      this.render(false);
    } catch (error) {
      console.error('[ForceAlchemyWorkbench] Failed to advance project', error);
      ui.notifications?.error?.(`Could not advance alchemical project: ${error.message}`);
    }
  }


  async #completeProject(projectId) {
    if (!projectId) return;
    try {
      const project = projectById(this.actor, projectId);
      const rite = FORCE_ALCHEMY_RITES.find(entry => entry.id === project?.riteId);
      const confirmed = await confirmPlain({
        title: `Complete ${project?.name ?? 'Alchemical Project'}?`,
        content: `<p>Complete <strong>${esc(project?.name ?? 'this project')}</strong>${project?.targetName ? ` for <strong>${esc(project.targetName)}</strong>` : ''}?</p><ul><li><strong>Force Points:</strong> ${esc(rite?.fpLabel ?? `${rite?.fpCost ?? 0} FP`)}</li><li><strong>Dark Side:</strong> ${Number(rite?.dspCost ?? 0) ? `+${esc(rite.dspCost)} DSP` : 'none'}</li><li><strong>Credits/materials:</strong> ${Number(rite?.creditCost ?? 0) ? `${Number(rite.creditCost).toLocaleString()} cr` : 'none'}</li></ul><p class="hint danger">Completion may create or transform items, record mutation flags, and post a ritual chat card.</p>`
      });
      if (!confirmed) return;
      const result = await ForceAlchemyMechanicsService.completeProject(this.actor, projectId);
      const label = result?.project?.name ?? 'alchemical project';
      ui.notifications?.info?.(`${label} completed.`);
      this.render(false);
    } catch (error) {
      console.error('[ForceAlchemyWorkbench] Failed to complete project', error);
      ui.notifications?.error?.(`Could not complete alchemical project: ${error.message}`);
    }
  }


  async #consumeRapidAlchemySurge() {
    try {
      await ForceAlchemyMechanicsService.consumeRapidAlchemySurge(this.actor);
      ui.notifications?.info?.('Rapid Alchemy attack bonus consumed; +5 damage surge is ready for one damage roll.');
      this.render(false);
    } catch (error) {
      console.error('[ForceAlchemyWorkbench] Failed to consume Rapid Alchemy surge', error);
      ui.notifications?.error?.(`Could not consume Rapid Alchemy surge: ${error.message}`);
    }
  }

  #onConfigChange(event, element) {
    const key = element?.dataset?.forceAlchemyConfig;
    if (!key) return;
    const value = element.type === 'checkbox' ? element.checked : element.value;
    this.#setSelectionPatch({ selectedConfig: { ...this.selectedConfig, [key]: value } });
  }

  async #onDrop(event) {
    event.preventDefault();
    let data = null;
    try {
      data = JSON.parse(event.dataTransfer?.getData('text/plain') || '{}');
    } catch (_error) {
      data = null;
    }
    const uuid = data?.uuid || data?.documentUuid || data?.itemUuid || null;
    const id = data?.id || data?.itemId || data?._id || null;
    let item = id ? this.actor?.items?.get?.(id) : null;
    let actorTarget = null;
    if (!item && uuid) {
      try {
        const document = await fromUuid(uuid);
        if (document?.documentName === 'Actor' || document?.items) actorTarget = document;
        else if (document?.documentName === 'Token' || document?.actor) actorTarget = document.actor;
        else if (document?.documentName === 'Item') item = document;
        else if (document?.parent?.id === this.actor?.id || document?.actor?.id === this.actor?.id) item = document;
      } catch (error) {
        console.warn('[ForceAlchemyWorkbench] Failed to resolve dropped document', data, error);
      }
    }
    if (!actorTarget && !item && data?.type === 'Actor' && id) actorTarget = game.actors?.get?.(id) ?? null;
    if (!actorTarget && !item && data?.actorId) actorTarget = game.actors?.get?.(data.actorId) ?? null;
    if (actorTarget) {
      this.#setSelectionPatch({
        selectedTargetId: `actor:${actorTarget.id}`,
        selectedRiteId: 'cause-mutation',
        activeCategory: 'mutation',
        selectedConfig: { ...this.selectedConfig }
      });
      return;
    }
    if (!item) {
      ui.notifications?.warn?.('Drop an owned item, Force Power, or actor/token for the GM-gated Cause Mutation workflow.');
      return;
    }
    if (isForceAlchemyForcePowerItem(item)) {
      const preferredRite = this.selectedRiteId?.includes?.('focused-force-talisman') ? this.selectedRiteId : 'focused-force-talisman';
      this.#setSelectionPatch({
        selectedRiteId: preferredRite,
        activeCategory: 'force',
        selectedConfig: { ...this.selectedConfig, powerId: item.id || item._id || null }
      });
      return;
    }
    const suggestion = getForceAlchemySuggestedRiteForItem(this.actor, item);
    this.#setSelectionPatch({
      selectedTargetId: item.id,
      selectedRiteId: suggestion?.riteId || this.selectedRiteId,
      activeCategory: suggestion?.category || this.activeCategory,
      selectedConfig: {}
    });
  }

  static async open(actorRef = null, options = {}) {
    const actor = await resolveActorReference(actorRef);
    if (!actor) {
      ui.notifications?.warn?.('Select an actor or assign a user character before opening the Force Artifact / Sith Alchemy Workbench.');
      return null;
    }
    const app = new ForceAlchemyWorkbenchApp(actor, options);
    app.render(true);
    return app;
  }
}

export async function openForceAlchemyWorkbench(actorRef = null, options = {}) {
  return ForceAlchemyWorkbenchApp.open(actorRef, options);
}

export function registerForceAlchemyWorkbench() {
  game.swse ??= {};
  game.swse.openForceAlchemyWorkbench = openForceAlchemyWorkbench;
  globalThis.SWSE ??= {};
  globalThis.SWSE.openForceAlchemyWorkbench = openForceAlchemyWorkbench;
  globalThis.SWSE.ForceAlchemyWorkbenchApp = ForceAlchemyWorkbenchApp;
}

export default ForceAlchemyWorkbenchApp;

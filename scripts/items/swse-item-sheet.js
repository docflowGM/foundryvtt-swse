/**
 * SWSE Item Sheet (ApplicationV2)
 *
 * Contract:
 * - UI edits item data only
 * - No rules math
 * - No actor mutation outside ActorEngine-owned APIs (actor.updateOwnedItem / actor.activateItem / etc.)
 */

import { RenderAssertions } from "/systems/foundryvtt-swse/scripts/core/render-assertions.js";
import { SWSEUpgradeApp } from "/systems/foundryvtt-swse/scripts/apps/upgrade-app.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ShellOverlayManager } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellOverlayManager.js";
import { ShellRouter } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js";
import { BLADE_COLOR_MAP } from "/systems/foundryvtt-swse/scripts/data/blade-colors.js";
import { getSwseFlag } from "/systems/foundryvtt-swse/scripts/utils/flags/swse-flags.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { openItemCustomization } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js";
import { normalizeItemSystem, sanitizeItemSheetUpdate } from "/systems/foundryvtt-swse/scripts/items/item-defaults.js";
import { WeaponRangeProfileResolver } from "/systems/foundryvtt-swse/scripts/items/weapon-range-profile-resolver.js";
import { MELEE_WEAPON_CATEGORY_OPTIONS, RANGED_WEAPON_CATEGORY_OPTIONS } from "/systems/foundryvtt-swse/scripts/items/weapon-data-resolver.js";
import { addItemEditorTrace, installItemEditorTrace, summarizeActorItems, summarizeItem } from "/systems/foundryvtt-swse/scripts/debug/item-editor-trace.js";
import { buildEntityDialogContext } from "/systems/foundryvtt-swse/scripts/dialogs/entity-dialog/context-builder.js";
import { validateItemData } from "/systems/foundryvtt-swse/scripts/dialogs/entity-dialog/validation.js";
import { EffectIntentEngine } from "/systems/foundryvtt-swse/scripts/dialogs/entity-dialog/effect-intent-engine.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

function collectSheetFormData(form) {
  if (!form) return { object: {} };

  const FormDataExtended = foundry?.applications?.ux?.FormDataExtended
    ?? foundry?.applications?.forms?.FormDataExtended
    ?? foundry?.applications?.FormDataExtended
    ?? globalThis.FormDataExtended
    ?? null;

  if (typeof FormDataExtended === 'function') {
    try {
      return new FormDataExtended(form);
    } catch (_err) {
      // Foundry v13/v14 builds expose this helper in different namespaces and
      // some test/runtime contexts expose a non-constructable shim. Fall back to
      // native FormData so item editing never hard-crashes the sheet.
    }
  }

  return { object: Object.fromEntries(new FormData(form).entries()) };
}

export class SWSEItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(super.DEFAULT_OPTIONS ?? {}), {
    classes: ['swse', 'sheet', 'item', 'swse-app', 'swse-theme-holo'],
    position: { width: 900, height: 780 },
    window: { resizable: true },
    form: {
      handler: SWSEItemSheet.#onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: false
    }
  });


  /**
   * AppV2 contract: Foundry reads options from `defaultOptions`, not `DEFAULT_OPTIONS`.
   * This bridges legacy apps to the V2 accessor.
   * @returns {object}
   */
  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }

/** @inheritDoc */
  static PARTS = {
    form: {
      template: 'systems/foundryvtt-swse/templates/items/base/item-sheet.hbs',
      scrollable: ['.item-editor__body']
    }
  };

  /** @inheritDoc */
  static TABS = {
    primary: {
      tabs: [
        { id: 'data', group: 'primary' },
        { id: 'description', group: 'primary' },
        { id: 'effects', group: 'primary' }
      ],
      initial: 'data'
    }
  };


  #getEntityDialogMode() {
    const requested = String(this._entityDialogMode || this.options?.entityDialogMode || this.options?.swseMode || '').toLowerCase();
    if (['view', 'edit', 'create'].includes(requested)) return requested;
    if (!(this.isEditable ?? true)) return 'view';
    if (!this.item?.id) return 'create';
    // Preserve the pre-shell behavior: existing item sheets open editable.
    return 'edit';
  }

  #setEntityDialogMode(mode) {
    const normalized = ['view', 'edit', 'create'].includes(String(mode || '').toLowerCase())
      ? String(mode).toLowerCase()
      : 'edit';
    if (!(this.isEditable ?? true) && normalized !== 'view') return;
    this._entityDialogMode = normalized;
    this._entityDialogDirty = false;
    this._previewItemType = null;
    this._previewWeaponBranch = null;
    this.#renderPreservingEntityView({ force: true });
  }

  #captureEntityDialogViewState() {
    const root = this.element;
    if (!root) return null;
    const body = root.querySelector('.swse-entity-dialog__body, .item-editor__body');
    const activeTab = root.querySelector('.item-editor__tab.active')?.dataset?.tab
      || root.querySelector('.tab.active')?.dataset?.tab
      || this._entityDialogActiveTab
      || 'data';
    const active = root.ownerDocument?.activeElement;
    const cssEscape = globalThis.CSS?.escape ? CSS.escape : (value) => String(value).replace(/[\\"]/g, '\\$&');
    const focusSelector = active?.name
      ? `[name="${cssEscape(active.name)}"]`
      : active?.id
        ? `#${cssEscape(active.id)}`
        : active?.dataset?.focusKey
          ? `[data-focus-key="${cssEscape(active.dataset.focusKey)}"]`
          : null;
    const selection = active && typeof active.selectionStart === 'number'
      ? { start: active.selectionStart, end: active.selectionEnd }
      : null;
    const keyedScroll = Array.from(root.querySelectorAll('[data-entity-preserve-scroll]'))
      .map((node) => ({ key: node.dataset.entityPreserveScroll, top: node.scrollTop, left: node.scrollLeft }))
      .filter((entry) => entry.key);
    this._entityDialogViewState = {
      activeTab,
      bodyTop: body?.scrollTop ?? 0,
      bodyLeft: body?.scrollLeft ?? 0,
      focusSelector,
      selection,
      keyedScroll
    };
    return this._entityDialogViewState;
  }

  #restoreEntityDialogViewState(state = this._entityDialogViewState) {
    if (!state) return;
    const root = this.element;
    if (!root) return;
    const cssEscape = globalThis.CSS?.escape ? CSS.escape : (value) => String(value).replace(/[\\"]/g, '\\$&');
    const activeTab = state.activeTab || this._entityDialogActiveTab || 'data';
    this.#activateEntityTab(root, activeTab, { scrollTop: false });
    const body = root.querySelector('.swse-entity-dialog__body, .item-editor__body');
    if (body) {
      body.scrollTop = Number(state.bodyTop ?? 0);
      body.scrollLeft = Number(state.bodyLeft ?? 0);
    }
    for (const entry of state.keyedScroll ?? []) {
      const node = root.querySelector(`[data-entity-preserve-scroll="${cssEscape(entry.key)}"]`);
      if (!node) continue;
      node.scrollTop = Number(entry.top ?? 0);
      node.scrollLeft = Number(entry.left ?? 0);
    }
    if (state.focusSelector) {
      const target = root.querySelector(state.focusSelector);
      if (target && !target.disabled) {
        try { target.focus({ preventScroll: true }); } catch { target.focus(); }
        if (state.selection && typeof target.setSelectionRange === 'function') {
          try { target.setSelectionRange(state.selection.start, state.selection.end); } catch {}
        }
      }
    }
  }

  async #renderPreservingEntityView(options = {}) {
    this.#captureEntityDialogViewState();
    const result = this.render(options);
    window.setTimeout(() => this.#restoreEntityDialogViewState(), 0);
    return result;
  }

  #activateEntityTab(root, tabId = 'data', { scrollTop = false } = {}) {
    const tab = String(tabId || 'data');
    this._entityDialogActiveTab = tab;
    root?.querySelectorAll?.('.item-editor__tab[data-tab]')?.forEach((node) => node.classList.toggle('active', node.dataset.tab === tab));
    root?.querySelectorAll?.('.tab[data-tab]')?.forEach((node) => node.classList.toggle('active', node.dataset.tab === tab));
    if (scrollTop) {
      const body = root?.querySelector?.('.swse-entity-dialog__body, .item-editor__body');
      if (body) body.scrollTop = 0;
    }
  }

  #syncEntityTabs(root) {
    if (!root) return;
    const desired = this._entityDialogActiveTab || root.querySelector('.item-editor__tab.active')?.dataset?.tab || 'data';
    this.#activateEntityTab(root, desired, { scrollTop: false });
    root.querySelectorAll('.item-editor__tab[data-tab]').forEach((tab) => {
      tab.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.#captureEntityDialogViewState();
        this.#activateEntityTab(root, tab.dataset.tab || 'data', { scrollTop: false });
        this.#restoreEntityDialogViewState({ ...(this._entityDialogViewState || {}), activeTab: tab.dataset.tab || 'data' });
      });
    });
  }

  #syncEntityWindowControls(root) {
    root?.querySelectorAll?.('[data-entity-window-mode]')?.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.#setEntityWindowMode(button.dataset.entityWindowMode || 'normal');
      });
    });
  }

  #setEntityWindowMode(mode = 'normal') {
    const normalized = ['compact', 'normal', 'expanded'].includes(String(mode || '').toLowerCase())
      ? String(mode).toLowerCase()
      : 'normal';
    this._entityDialogWindowMode = normalized;
    const current = this.position ?? {};
    const viewportWidth = Math.max(640, window.innerWidth || 1200);
    const viewportHeight = Math.max(520, window.innerHeight || 900);
    const sizes = {
      compact: { width: 680, height: 580 },
      normal: { width: 900, height: 780 },
      expanded: { width: Math.min(1180, viewportWidth - 80), height: Math.min(920, viewportHeight - 80) }
    };
    const next = sizes[normalized] || sizes.normal;
    this.setPosition?.({
      width: next.width,
      height: next.height,
      left: Number.isFinite(current.left) ? Math.max(20, Math.min(current.left, viewportWidth - next.width - 20)) : undefined,
      top: Number.isFinite(current.top) ? Math.max(20, Math.min(current.top, viewportHeight - next.height - 20)) : undefined
    });
    this.element?.querySelector?.('form.swse-entity-dialog')?.setAttribute('data-window-mode', normalized);
  }

  #populateWeaponCategoryOptions(branch, { preserveValue = true } = {}) {
    const root = this.element;
    const select = root?.querySelector?.('.weapon-category-select');
    if (!select) return false;
    const previous = preserveValue ? select.value : '';
    const normalizedBranch = String(branch || '').toLowerCase() === 'ranged' ? 'ranged' : 'melee';
    const options = normalizedBranch === 'ranged' ? RANGED_WEAPON_CATEGORY_OPTIONS : MELEE_WEAPON_CATEGORY_OPTIONS;
    const fallback = options.find((option) => option.value === previous)?.value || options[0]?.value || 'simple';
    select.innerHTML = options.map((option) => `<option value="${option.value}">${option.label}</option>`).join('');
    select.value = fallback;
    this._previewWeaponBranch = normalizedBranch;
    const form = root?.querySelector?.('form.swse-entity-dialog');
    this.#markEntityDialogDirty(form);
    return true;
  }

  #markEntityDialogDirty(form) {
    if (!form || this.#getEntityDialogMode() === 'view') return;
    this._entityDialogDirty = true;
    form.dataset.entityDirty = 'true';
    form.classList.add('is-dirty');
    form.classList.remove('is-pristine');
    const indicator = form.querySelector('[data-entity-dirty-indicator]');
    if (indicator) {
      indicator.textContent = 'Unsaved changes';
      indicator.dataset.state = 'dirty';
    }
  }

  #syncEntityDialogMode(root) {
    const form = root?.querySelector?.('form.swse-entity-dialog');
    if (!form) return;

    const mode = form.dataset.entityMode || this.#getEntityDialogMode();
    const readonly = mode === 'view' || !(this.isEditable ?? true);
    form.dataset.entityDirty = this._entityDialogDirty ? 'true' : 'false';
    form.classList.toggle('is-dirty', !!this._entityDialogDirty);
    form.classList.toggle('is-pristine', !this._entityDialogDirty);

    if (readonly) {
      form.querySelectorAll('input, select, textarea').forEach((control) => {
        control.disabled = true;
        control.setAttribute('aria-readonly', 'true');
      });
      form.querySelectorAll('button').forEach((button) => {
        if (button.matches('.close-btn, .entity-dialog-edit, .entity-dialog-window-control')) return;
        button.disabled = true;
      });
    } else {
      form.querySelectorAll('input, select, textarea').forEach((control) => {
        control.addEventListener('input', () => this.#markEntityDialogDirty(form));
        control.addEventListener('change', () => this.#markEntityDialogDirty(form));
      });
    }

    const indicator = form.querySelector('[data-entity-dirty-indicator]');
    if (indicator) {
      indicator.textContent = this._entityDialogDirty ? 'Unsaved changes' : (readonly ? 'Read-only' : 'No unsaved changes');
      indicator.dataset.state = this._entityDialogDirty ? 'dirty' : (readonly ? 'readonly' : 'clean');
    }
  }

  #inferForceAccent(value = '') {
    const text = String(value || '').toLowerCase();
    if (/dark|sith|lightning|fear|rage/.test(text)) return 'dark';
    if (/light\s*side|healing|vital transfer|serenity/.test(text)) return 'light';
    if (/telekin|move object|phase|grip|push|slam/.test(text)) return 'telekinetic';
    if (/mind|telepath|affect|illusion|scry|farseeing/.test(text)) return 'mind';
    if (/vital|healing|control|plant/.test(text)) return 'vital';
    return 'neutral';
  }

  #syncForcePowerAccent(root) {
    const form = root?.querySelector?.('form.swse-entity-dialog[data-item-type="force-power"]');
    if (!form) return;
    const controls = Array.from(form.querySelectorAll('[data-force-accent-control]'));
    const apply = () => {
      const value = controls.map((control) => control.value || '').join(' ');
      const accent = this.#inferForceAccent(value);
      for (const cls of Array.from(form.classList)) {
        if (cls.startsWith('swse-entity-dialog--force-')) form.classList.remove(cls);
      }
      form.classList.add(`swse-entity-dialog--force-${accent}`);
      form.dataset.forceAccent = accent;
      form.querySelector('[data-force-accent]')?.setAttribute('data-force-accent', accent);
    };
    controls.forEach((control) => {
      control.addEventListener('input', apply);
      control.addEventListener('change', apply);
    });
    apply();
  }

  #handleEntityDialogKeydown(event) {
    const key = String(event.key || '').toLowerCase();
    const target = event.target;
    const isTyping = target?.matches?.('input, textarea, select, [contenteditable="true"]');

    if ((event.ctrlKey || event.metaKey) && key === 's') {
      event.preventDefault();
      const form = this.element?.querySelector?.('form.swse-item-editor-form');
      if (!form || this.#getEntityDialogMode() === 'view') return;
      this._entityDialogCloseAfterSave = false;
      form.requestSubmit?.(form.querySelector('[data-entity-save-mode="save"]') || undefined);
      return;
    }

    if (key === 'escape') {
      event.preventDefault();
      if (this.#getEntityDialogMode() === 'view') {
        this.close();
      } else {
        this.#setEntityDialogMode(this.item?.id ? 'view' : 'create');
      }
      return;
    }

    if (!isTyping && key === 'e' && this.#getEntityDialogMode() === 'view' && (this.isEditable ?? true)) {
      event.preventDefault();
      this.#setEntityDialogMode('edit');
      return;
    }

    if (!isTyping && ['1', '2', '3'].includes(key)) {
      const tabMap = { '1': 'data', '2': 'description', '3': 'effects' };
      const tab = this.element?.querySelector?.(`.item-editor__tab[data-tab="${tabMap[key]}"]`);
      tab?.click?.();
    }
  }

  /** @inheritDoc */
  async _prepareContext(options) {
    // Build a plain serializable context for AppV2 rendering.
    // Do NOT inherit ItemSheetV2's full context here: it can include
    // non-cloneable class/config references (for example documentClass/TYPES),
    // which fail RenderAssertions.assertContextSerializable().
    const itemData = this.item?.toObject?.() ?? {};

    installItemEditorTrace();
    addItemEditorTrace('item-sheet-prepare-context', {
      item: summarizeItem(this.item),
      actor: summarizeActorItems(this.item?.actor),
      options
    });

    // Preview-only state used when a type/branch selector changes before the
    // sheet has finished saving. This keeps dependent selects stable without
    // touching deprecated global FormDataExtended APIs.
    const previewItemType = this._previewItemType ?? null;
    const previewWeaponBranch = this._previewWeaponBranch ?? null;
    if (previewItemType) {
      itemData.type = previewItemType;
    }
    itemData.system = normalizeItemSystem(itemData.type ?? this.item?.type ?? 'equipment', this.item?.system ?? {}, itemData.system ?? {});
    if (previewWeaponBranch && itemData.type === 'weapon') {
      itemData.system.meleeOrRanged = previewWeaponBranch;
    }

    // Template expects this for the <form class="{{cssClass}} ..."> binding.
    const cssClasses = this.constructor.DEFAULT_OPTIONS?.classes ?? [];

    // Get actor credits if this item is embedded
    const actor = this.item?.actor;
    const actorCredits = actor?.system?.credits ?? null;
    const systemData = foundry.utils.deepClone(itemData.system ?? {});
    const itemEffects = Array.from(this.item?.effects ?? []).map((effect) => effect?.toObject?.() ?? effect).filter(Boolean);
    const baseEditable = this.isEditable ?? true;
    const entityMode = this.#getEntityDialogMode();
    const editable = baseEditable && entityMode !== 'view';

    const context = {
      item: itemData,
      system: systemData,
      cssClass: Array.isArray(cssClasses) ? cssClasses.join(' ') : '',
      itemId: this.item?.id ?? null,
      itemType: itemData.type ?? this.item?.type ?? "",
      itemName: itemData.name ?? this.item?.name ?? "",
      itemImg: itemData.img ?? this.item?.img ?? "",
      editable,
      owner: this.item?.isOwner ?? false,
      limited: this.item?.limited ?? false,
      actorCredits: actorCredits,
      activeTab: this._entityDialogActiveTab || 'data', // Preserve selected entity tab across safe rerenders
      bladeColorOptions: Object.entries(BLADE_COLOR_MAP).map(([name, hex]) => ({ name, hex })),
      entityDialog: buildEntityDialogContext({
        item: itemData,
        system: systemData,
        editable,
        baseEditable,
        actorCredits,
        actor,
        mode: entityMode,
        dirty: !!this._entityDialogDirty,
        effects: itemEffects
      }),
      labels: {
        sheetTitle: itemData.name ?? this.item?.name ?? "Item"
      }
    };

    RenderAssertions.assertContextSerializable(context, "SWSEItemSheet");
    return context;
  }



  #nextEntityArrayIndex(container) {
    const rows = Array.from(container?.querySelectorAll?.('[data-entity-array-row]') ?? []);
    const indexes = rows.map((row) => Number(row.dataset.entityArrayIndex)).filter(Number.isFinite);
    return indexes.length ? Math.max(...indexes) + 1 : 0;
  }

  #renderDcRow(path, index, { withDescription = false } = {}) {
    const desc = withDescription
      ? `<input type="text" name="${path}.${index}.description" value="" placeholder="Narrative description" />`
      : '';
    return `<div class="swse-entity-dialog__dc-row" data-entity-array-row data-entity-array-index="${index}">
      <input type="number" name="${path}.${index}.dc" value="15" data-dtype="Number" min="0" />
      <input type="text" name="${path}.${index}.effect" value="" placeholder="Effect / outcome" />
      ${desc}
      <button type="button" class="swse-entity-dialog__icon-btn" data-entity-array-remove title="Remove row">×</button>
    </div>`;
  }

  #renderPrereqRow(index) {
    return `<div class="swse-entity-dialog__prereq-row" data-entity-array-row data-entity-array-index="${index}">
      <select name="system.prereqClauses.${index}.kind">
        <option value="ability">Ability</option>
        <option value="bab">BAB</option>
        <option value="level">Character Level</option>
        <option value="class">Class Level</option>
        <option value="feat">Feat</option>
        <option value="talent">Talent</option>
        <option value="skill">Skill</option>
        <option value="proficiency">Proficiency</option>
        <option value="descriptor">Descriptor</option>
        <option value="custom">GM / Custom</option>
      </select>
      <input type="text" name="system.prereqClauses.${index}.key" value="" placeholder="key / ability / class" />
      <input type="text" name="system.prereqClauses.${index}.value" value="" placeholder="value / minimum" />
      <input type="text" name="system.prereqClauses.${index}.label" value="" placeholder="display label" />
      <button type="button" class="swse-entity-dialog__icon-btn" data-entity-array-remove title="Remove prerequisite">×</button>
    </div>`;
  }

  #syncEntityArrayControls(root) {
    root?.querySelectorAll?.('[data-entity-array-add]')?.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const path = button.dataset.entityArrayAdd;
        const kind = button.dataset.entityArrayKind || 'dc';
        const list = root.querySelector(`[data-entity-array-list="${path}"]`);
        if (!list) return;
        const index = this.#nextEntityArrayIndex(list);
        if (kind === 'prereq') {
          list.insertAdjacentHTML('beforeend', this.#renderPrereqRow(index));
        } else {
          list.insertAdjacentHTML('beforeend', this.#renderDcRow(path, index, { withDescription: button.dataset.entityArrayDescription === 'true' }));
        }
        const form = root.querySelector('form.swse-entity-dialog');
        this.#markEntityDialogDirty(form);
      });
    });

    root?.querySelectorAll?.('[data-entity-array-list]')?.forEach((list) => {
      list.addEventListener('click', (event) => {
        const remove = event.target?.closest?.('[data-entity-array-remove]');
        if (!remove) return;
        event.preventDefault();
        remove.closest('[data-entity-array-row]')?.remove();
        const form = root.querySelector('form.swse-entity-dialog');
        this.#markEntityDialogDirty(form);
      });
    });
  }


  #getEffectDocument(effectId) {
    if (!effectId || !this.item?.effects) return null;
    if (typeof this.item.effects.get === 'function') return this.item.effects.get(effectId) ?? null;
    return Array.from(this.item.effects ?? []).find(effect => effect?.id === effectId || effect?._id === effectId) ?? null;
  }

  #canMutateEntityEffects() {
    return (this.isEditable ?? true) && this.#getEntityDialogMode() !== 'view';
  }

  async #createEmbeddedActiveEffect(effectData, { source = 'swse-entity-dialog-effect' } = {}) {
    if (!this.#canMutateEntityEffects()) {
      ui.notifications?.warn?.('Switch to Edit mode before changing Active Effects.');
      return false;
    }
    if (!this.item?.createEmbeddedDocuments) {
      ui.notifications?.error?.('This item does not support embedded Active Effects in this context.');
      return false;
    }
    const stampedData = EffectIntentEngine.stampLifecycle(effectData, { actor: this.item?.actor });
    await this.item.createEmbeddedDocuments('ActiveEffect', [stampedData], { source });
    this._entityDialogDirty = false;
    await this.#renderPreservingEntityView({ force: true });
    return true;
  }

  #collectBasicEffectIntent(root) {
    const builder = root?.querySelector?.('[data-effect-basic-builder]');
    if (!builder) return null;
    const read = (selector, fallback = '') => builder.querySelector(selector)?.value ?? fallback;
    const checked = (selector, fallback = false) => builder.querySelector(selector)?.checked ?? fallback;
    return {
      name: read('[data-effect-basic-name]', 'New SWSE Effect'),
      intent: {
        application: read('[data-effect-basic-application]', 'equipped'),
        activeState: read('[data-effect-basic-active-state]', 'enabled'),
        scope: read('[data-effect-basic-scope]', 'self'),
        operation: read('[data-effect-basic-operation]', 'increase'),
        category: read('[data-effect-basic-category]', 'defense'),
        target: read('[data-effect-basic-target]', 'reflex'),
        filterType: read('[data-effect-basic-filter-type]', 'all'),
        filterValue: read('[data-effect-basic-filter-value]', ''),
        amount: Number(read('[data-effect-basic-amount]', 1)) || 1,
        bonusType: read('[data-effect-basic-bonus-type]', 'untyped'),
        duration: read('[data-effect-basic-duration]', 'until deactivated'),
        transfer: checked('[data-effect-basic-transfer]', true),
        note: read('[data-effect-basic-note]', '')
      }
    };
  }

  #setBuilderValue(builder, selector, value) {
    const control = builder?.querySelector?.(selector);
    if (!control) return false;
    if (control.type === 'checkbox') {
      control.checked = value === true || value === 'true';
    } else {
      control.value = value ?? '';
    }
    control.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  #applyBasicEffectIntentToBuilder(intent = {}, { name = null, markDirty = true } = {}) {
    const root = this.element;
    const builder = root?.querySelector?.('[data-effect-basic-builder]');
    if (!builder || !intent || typeof intent !== 'object') return false;
    if (name != null) this.#setBuilderValue(builder, '[data-effect-basic-name]', name);
    this.#setBuilderValue(builder, '[data-effect-basic-application]', intent.application);
    this.#setBuilderValue(builder, '[data-effect-basic-active-state]', intent.activeState || 'enabled');
    this.#setBuilderValue(builder, '[data-effect-basic-scope]', intent.scope);
    this.#setBuilderValue(builder, '[data-effect-basic-operation]', intent.operation);
    this.#setBuilderValue(builder, '[data-effect-basic-category]', intent.category);
    this.#setBuilderValue(builder, '[data-effect-basic-target]', intent.target);
    this.#setBuilderValue(builder, '[data-effect-basic-filter-type]', intent.filterType || 'all');
    this.#setBuilderValue(builder, '[data-effect-basic-filter-value]', intent.filterValue || '');
    this.#setBuilderValue(builder, '[data-effect-basic-amount]', intent.amount);
    this.#setBuilderValue(builder, '[data-effect-basic-bonus-type]', intent.bonusType);
    this.#setBuilderValue(builder, '[data-effect-basic-duration]', intent.duration);
    this.#setBuilderValue(builder, '[data-effect-basic-transfer]', intent.transfer !== false);
    if (intent.note != null) this.#setBuilderValue(builder, '[data-effect-basic-note]', intent.note);
    this.#updateBasicEffectPreview(root);
    if (markDirty) this.#markEntityDialogDirty(root?.querySelector?.('form.swse-entity-dialog'));
    return true;
  }

  #applyEffectTerm(term = {}, { markDirty = true } = {}) {
    const builder = this.element?.querySelector?.('[data-effect-basic-builder]');
    if (!builder || !term?.field) return false;
    if (term.category) this.#setBuilderValue(builder, '[data-effect-basic-category]', term.category);
    if (term.target) this.#setBuilderValue(builder, '[data-effect-basic-target]', term.target);
    if (term.filterType) this.#setBuilderValue(builder, '[data-effect-basic-filter-type]', term.filterType);
    if (term.filterValue != null && term.filterValue !== '') this.#setBuilderValue(builder, '[data-effect-basic-filter-value]', term.filterValue);
    switch (term.field) {
      case 'application':
        this.#setBuilderValue(builder, '[data-effect-basic-application]', term.value);
        break;
      case 'scope':
        this.#setBuilderValue(builder, '[data-effect-basic-scope]', term.value);
        break;
      case 'operation':
        this.#setBuilderValue(builder, '[data-effect-basic-operation]', term.value);
        break;
      case 'category':
        this.#setBuilderValue(builder, '[data-effect-basic-category]', term.value);
        if (term.target) this.#setBuilderValue(builder, '[data-effect-basic-target]', term.target);
        break;
      case 'target':
        this.#setBuilderValue(builder, '[data-effect-basic-target]', term.value);
        break;
      case 'bonusType':
        this.#setBuilderValue(builder, '[data-effect-basic-bonus-type]', term.value);
        break;
      case 'duration':
        this.#setBuilderValue(builder, '[data-effect-basic-duration]', term.value);
        break;
      case 'filterType':
        this.#setBuilderValue(builder, '[data-effect-basic-filter-type]', term.value);
        if (term.filterValue != null) this.#setBuilderValue(builder, '[data-effect-basic-filter-value]', term.filterValue);
        break;
      case 'filterValue':
        if (term.filterType) this.#setBuilderValue(builder, '[data-effect-basic-filter-type]', term.filterType);
        this.#setBuilderValue(builder, '[data-effect-basic-filter-value]', term.value);
        break;
      case 'amount':
        this.#setBuilderValue(builder, '[data-effect-basic-amount]', term.value);
        break;
      case 'note': {
        const note = builder.querySelector('[data-effect-basic-note]');
        if (note) note.value = [note.value, term.value].filter(Boolean).join(note.value ? '; ' : '');
        break;
      }
      default:
        return false;
    }
    this.#updateBasicEffectPreview(this.element);
    if (markDirty) this.#markEntityDialogDirty(this.element?.querySelector?.('form.swse-entity-dialog'));
    return true;
  }

  #updateBasicEffectPreview(root) {
    const builder = root?.querySelector?.('[data-effect-basic-builder]');
    const preview = builder?.querySelector?.('[data-effect-basic-preview]');
    const automation = builder?.querySelector?.('[data-effect-automation-preview]');
    const mathPreview = builder?.querySelector?.('[data-effect-math-preview]');
    if (!builder || !preview) return;
    const collected = this.#collectBasicEffectIntent(root);
    if (!collected) return;
    preview.textContent = EffectIntentEngine.describeIntent(collected.intent);
    const support = EffectIntentEngine.getAutomationSupport(collected.intent, { item: this.item });
    if (automation && support) {
      automation.dataset.support = support.tone || support.level || 'partial';
      automation.innerHTML = `<strong>${support.label}</strong><span>${support.description}</span>`;
    }
    if (mathPreview) {
      const actor = this.item?.actor ?? null;
      const previewData = EffectIntentEngine.getEffectMathPreview(collected.intent, { actor, item: this.item });
      mathPreview.dataset.previewStatus = previewData.status || 'unknown';
      if (previewData.available) {
        mathPreview.innerHTML = `
          <strong>${previewData.label}</strong>
          <div class="swse-entity-dialog__math-preview-grid">
            <span>Before</span><b>${previewData.before}</b>
            <span>Effect</span><b>${previewData.changeLabel}</b>
            <span>After</span><b>${previewData.after}</b>
          </div>
          <span>${previewData.description}</span>`;
      } else {
        mathPreview.innerHTML = `<strong>${previewData.label}</strong><span>${previewData.description}</span>`;
      }
    }
  }

  #onApplyEffectPreset(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.#canMutateEntityEffects()) return;
    const presetId = event.currentTarget?.dataset?.effectPreset;
    const preset = EffectIntentEngine.getPreset(presetId);
    if (!preset) return;
    this.#applyBasicEffectIntentToBuilder(preset.intent, { name: preset.label });
  }

  #termFromElement(element) {
    if (!element) return null;
    return {
      field: element.dataset.effectTermField || '',
      value: element.dataset.effectTermValue || '',
      category: element.dataset.effectTermCategory || '',
      target: element.dataset.effectTermTarget || '',
      filterType: element.dataset.effectTermFilterType || '',
      filterValue: element.dataset.effectTermFilterValue || ''
    };
  }

  #onEffectTermClick(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.#canMutateEntityEffects()) return;
    this.#applyEffectTerm(this.#termFromElement(event.currentTarget));
  }

  #onEffectTermDragStart(event) {
    const term = this.#termFromElement(event.currentTarget);
    if (!term) return;
    event.dataTransfer?.setData?.('application/json', JSON.stringify(term));
    event.dataTransfer?.setData?.('text/plain', JSON.stringify(term));
    event.dataTransfer.effectAllowed = 'copy';
  }

  #onEffectBuilderDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.#canMutateEntityEffects()) return;
    const raw = event.dataTransfer?.getData?.('application/json') || event.dataTransfer?.getData?.('text/plain') || '';
    if (!raw) return;
    try {
      this.#applyEffectTerm(JSON.parse(raw));
    } catch (_err) {
      // Ignore non-SWSE drops.
    }
  }

  #syncEffectTermLibrary(root) {
    const library = root?.querySelector?.('[data-effect-term-library]');
    if (!library) return;
    library.querySelectorAll('[data-effect-term]').forEach((chip) => {
      chip.addEventListener('click', this.#onEffectTermClick.bind(this));
      chip.addEventListener('dragstart', this.#onEffectTermDragStart.bind(this));
    });
    const builder = root?.querySelector?.('[data-effect-basic-builder]');
    if (builder) {
      builder.addEventListener('dragover', (event) => {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
      });
      builder.addEventListener('drop', this.#onEffectBuilderDrop.bind(this));
    }
    const search = library.querySelector('[data-effect-term-search]');
    search?.addEventListener('input', () => {
      const query = String(search.value || '').trim().toLowerCase();
      library.querySelectorAll('[data-effect-term]').forEach((chip) => {
        const text = String(chip.textContent || '').toLowerCase();
        chip.hidden = !!query && !text.includes(query);
      });
      library.querySelectorAll('.swse-entity-dialog__term-group').forEach((group) => {
        const visible = Array.from(group.querySelectorAll('[data-effect-term]')).some(chip => !chip.hidden);
        group.hidden = !visible;
      });
    });
  }

  async #onCreateBasicEffect(event) {
    event.preventDefault();
    event.stopPropagation();
    const root = this.element;
    const collected = this.#collectBasicEffectIntent(root);
    if (!collected) return;
    const effectData = EffectIntentEngine.buildActiveEffectData(collected.intent, { name: collected.name });
    await this.#createEmbeddedActiveEffect(effectData, { source: 'swse-entity-dialog-basic-effect' });
    ui.notifications?.info?.(`Added Basic effect: ${effectData.name}`);
  }

  async #onCreateAdvancedEffect(event) {
    event.preventDefault();
    event.stopPropagation();
    const builder = this.element?.querySelector?.('[data-effect-advanced-builder]');
    if (!builder) return;
    const read = (selector, fallback = '') => builder.querySelector(selector)?.value ?? fallback;
    const effectData = EffectIntentEngine.buildAdvancedEffectData({
      name: read('[data-effect-advanced-name]', 'Advanced SWSE Effect'),
      key: read('[data-effect-advanced-key]', ''),
      mode: Number(read('[data-effect-advanced-mode]', 2)) || 2,
      value: read('[data-effect-advanced-value]', ''),
      priority: 20
    });
    await this.#createEmbeddedActiveEffect(effectData, { source: 'swse-entity-dialog-advanced-effect' });
    ui.notifications?.info?.(`Added Advanced effect: ${effectData.name}`);
  }

  async #onToggleEffect(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.#canMutateEntityEffects()) return;
    const effectId = event.currentTarget?.dataset?.entityEffectToggle;
    const effect = this.#getEffectDocument(effectId);
    if (!effect) return;
    await this.item.updateEmbeddedDocuments('ActiveEffect', [{ _id: effectId, disabled: !(effect.disabled === true) }], { source: 'swse-entity-dialog-toggle-effect' });
    await this.#renderPreservingEntityView({ force: true });
  }

  async #onDeleteEffect(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.#canMutateEntityEffects()) return;
    const effectId = event.currentTarget?.dataset?.entityEffectDelete;
    if (!effectId) return;
    const confirmed = await Dialog.confirm({
      title: 'Delete Active Effect?',
      content: '<p>This removes the effect from this item. This cannot be undone.</p>',
      yes: () => true,
      no: () => false,
      defaultYes: false
    });
    if (!confirmed) return;
    await this.item.deleteEmbeddedDocuments('ActiveEffect', [effectId], { source: 'swse-entity-dialog-delete-effect' });
    await this.#renderPreservingEntityView({ force: true });
  }

  async #onDuplicateEffect(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.#canMutateEntityEffects()) return;
    const effectId = event.currentTarget?.dataset?.entityEffectDuplicate;
    const effect = this.#getEffectDocument(effectId);
    if (!effect) return;
    const copy = effect.toObject?.() ?? foundry.utils.deepClone(effect);
    delete copy._id;
    delete copy.id;
    delete copy._stats;
    copy.name = `${copy.name || effect.name || 'Effect'} (Copy)`;
    await this.#createEmbeddedActiveEffect(copy, { source: 'swse-entity-dialog-duplicate-effect' });
  }


  #onLoadAdvancedEffectAsBasic(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.#canMutateEntityEffects()) return;
    const effectId = event.currentTarget?.dataset?.entityEffectLoadBasic;
    const effect = this.#getEffectDocument(effectId);
    if (!effect) return;
    const conversion = EffectIntentEngine.getAdvancedConversionSuggestion(effect.toObject?.() ?? effect);
    if (!conversion?.isConvertible) {
      ui.notifications?.warn?.(conversion?.description || 'This Advanced effect cannot be translated to Basic safely yet.');
      return;
    }
    this.#applyBasicEffectIntentToBuilder(conversion.intent, { name: effect.name || effect.label || 'Converted Basic Effect' });
    ui.notifications?.info?.('Loaded the recognized Advanced effect into the Basic builder. Review it, then add or convert when ready.');
  }

  async #onConvertAdvancedEffectToBasic(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.#canMutateEntityEffects()) return;
    const effectId = event.currentTarget?.dataset?.entityEffectConvertBasic;
    const effect = this.#getEffectDocument(effectId);
    if (!effect) return;
    const conversion = EffectIntentEngine.getAdvancedConversionSuggestion(effect.toObject?.() ?? effect);
    if (!conversion?.isConvertible) {
      ui.notifications?.warn?.(conversion?.description || 'This Advanced effect cannot be translated to Basic safely yet.');
      return;
    }
    const confirmed = await Dialog.confirm({
      title: 'Convert Advanced Effect to Basic?',
      content: `<p>This adds a Basic SWSE intent and moves the raw change rows into an Advanced backup flag so the same bonus is not applied twice.</p><p><strong>${conversion.description}</strong></p>`,
      yes: () => true,
      no: () => false,
      defaultYes: true
    });
    if (!confirmed) return;
    const update = EffectIntentEngine.buildBasicConversionUpdateData(effect.toObject?.() ?? effect);
    if (!update?._id) return;
    await this.item.updateEmbeddedDocuments('ActiveEffect', [update], { source: 'swse-entity-dialog-convert-effect-basic' });
    ui.notifications?.info?.(`Converted ${effect.name || 'Advanced effect'} to Basic.`);
    await this.#renderPreservingEntityView({ force: true });
  }


  #renderEffectRawChangeRow(effectId, index) {
    return `<div class="swse-entity-dialog__raw-change-row">
      <input type="text" name="effects.${effectId}.changes.${index}.key" value="" placeholder="system.path" />
      <select name="effects.${effectId}.changes.${index}.mode">
        <option value="2" selected>Add</option>
        <option value="5">Override</option>
        <option value="0">Custom</option>
        <option value="1">Multiply</option>
        <option value="3">Downgrade</option>
        <option value="4">Upgrade</option>
      </select>
      <input type="text" name="effects.${effectId}.changes.${index}.value" value="" />
      <input type="number" name="effects.${effectId}.changes.${index}.priority" value="20" data-dtype="Number" />
    </div>`;
  }

  #onAddRawEffectChange(event) {
    event.preventDefault();
    event.stopPropagation();
    const effectId = event.currentTarget?.dataset?.entityEffectAddRawChange;
    if (!effectId || !this.#canMutateEntityEffects()) return;
    const card = event.currentTarget.closest('[data-effect-id]');
    const list = card?.querySelector?.('.swse-entity-dialog__raw-changes');
    if (!list) return;
    list.querySelector('.swse-entity-dialog__empty-state')?.remove?.();
    const rows = Array.from(list.querySelectorAll('.swse-entity-dialog__raw-change-row:not(.swse-entity-dialog__raw-change-row--head)'));
    const index = rows.length;
    list.insertAdjacentHTML('beforeend', this.#renderEffectRawChangeRow(effectId, index));
    const form = this.element?.querySelector?.('form.swse-entity-dialog');
    this.#markEntityDialogDirty(form);
  }

  #normalizeEffectUpdates(effectUpdates = {}) {
    if (!effectUpdates || typeof effectUpdates !== 'object') return [];
    return Object.entries(effectUpdates)
      .map(([effectId, data]) => {
        if (!effectId || !data || typeof data !== 'object') return null;
        const changes = Object.values(data.changes ?? {})
          .filter(change => change && typeof change === 'object')
          .map(change => ({
            key: String(change.key ?? '').trim(),
            mode: Number(change.mode ?? 2) || 2,
            value: String(change.value ?? ''),
            priority: Number(change.priority ?? 20) || 20
          }))
          .filter(change => change.key || change.value);
        return {
          _id: effectId,
          name: String(data.name ?? '').trim() || 'Unnamed Effect',
          disabled: String(data.enabled ?? 'false') !== 'true',
          transfer: String(data.transfer ?? 'false') === 'true',
          description: String(data.description ?? ''),
          changes
        };
      })
      .filter(Boolean);
  }

  async #updateEmbeddedEffectDocuments(effectUpdates = {}) {
    const updates = this.#normalizeEffectUpdates(effectUpdates);
    if (!updates.length) return { updated: 0 };
    if (!this.item?.updateEmbeddedDocuments) return { updated: 0 };
    await this.item.updateEmbeddedDocuments('ActiveEffect', updates, { source: 'swse-entity-dialog-save-effects' });
    return { updated: updates.length };
  }

  #syncEntityEffectControls(root) {
    this.#updateBasicEffectPreview(root);
    root?.querySelectorAll?.('[data-effect-basic-builder] select, [data-effect-basic-builder] input')?.forEach((control) => {
      control.addEventListener('input', () => this.#updateBasicEffectPreview(root));
      control.addEventListener('change', () => this.#updateBasicEffectPreview(root));
    });
    root?.querySelectorAll?.('[data-effect-preset]')?.forEach((button) => button.addEventListener('click', this.#onApplyEffectPreset.bind(this)));
    this.#syncEffectTermLibrary(root);
    root?.querySelector?.('[data-entity-effect-create-basic]')?.addEventListener('click', this.#onCreateBasicEffect.bind(this));
    root?.querySelector?.('[data-entity-effect-create-advanced]')?.addEventListener('click', this.#onCreateAdvancedEffect.bind(this));
    root?.querySelectorAll?.('[data-entity-effect-toggle]')?.forEach((button) => button.addEventListener('click', this.#onToggleEffect.bind(this)));
    root?.querySelectorAll?.('[data-entity-effect-delete]')?.forEach((button) => button.addEventListener('click', this.#onDeleteEffect.bind(this)));
    root?.querySelectorAll?.('[data-entity-effect-duplicate]')?.forEach((button) => button.addEventListener('click', this.#onDuplicateEffect.bind(this)));
    root?.querySelectorAll?.('[data-entity-effect-load-basic]')?.forEach((button) => button.addEventListener('click', this.#onLoadAdvancedEffectAsBasic.bind(this)));
    root?.querySelectorAll?.('[data-entity-effect-convert-basic]')?.forEach((button) => button.addEventListener('click', this.#onConvertAdvancedEffectToBasic.bind(this)));
    root?.querySelectorAll?.('[data-entity-effect-add-raw-change]')?.forEach((button) => button.addEventListener('click', this.#onAddRawEffectChange.bind(this)));
  }

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;
    if (!root) {return;}

    installItemEditorTrace();
    addItemEditorTrace('item-sheet-render', {
      item: summarizeItem(this.item),
      actor: summarizeActorItems(this.item?.actor),
      hasForm: !!root.querySelector('form'),
      itemType: this.item?.type ?? null
    });

    // Upgrade management
    // Phase 11: single-item upgrade from item sheet opens as shell OVERLAY on the actor's shell host.
    // Falls back to standalone SWSEUpgradeApp if the item is unowned or no shell host is open.
    root.querySelector('.open-upgrade-app')?.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        const actor = this.item.actor;
        if (actor) {
          const shell = ShellRouter.getShell(actor.id);
          if (shell) {
            // Shell host is open — open as overlay (Overlay classification)
            openItemCustomization(actor, this.item);
          } else {
            // No shell host open — open actor sheet first, then overlay
            await actor.sheet?.render(true);
            // Give sheet time to render and register
            await new Promise(resolve => setTimeout(resolve, 50));
            openItemCustomization(actor, this.item);
          }
        } else {
          // Unowned item — fall back to standalone upgrade app (legacy path)
          new SWSEUpgradeApp(this.item).render(true);
        }
      } catch (err) {
        SWSELogger.error('[SWSEItemSheet] Failed to open UpgradeApp', err);
        // Graceful fallback
        try { new SWSEUpgradeApp(this.item).render(true); } catch {}
      }
    });

    // Customization entries route into the shell-native upgrade overlay when possible
    const openShellCustomizer = async (event) => {
      event.preventDefault();
      try {
        const actor = this.item.actor;
        if (!actor) return;
        let shell = ShellRouter.getShell(actor.id);
        if (!shell) {
          await actor.sheet?.render(true);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        openItemCustomization(actor, this.item);
      } catch (err) {
        SWSELogger.error('[SWSEItemSheet] Failed to open shell customizer', err);
      }
    };

    root.querySelector('.customize-lightsaber')?.addEventListener('click', openShellCustomizer);
    root.querySelector('.customize-blaster')?.addEventListener('click', openShellCustomizer);

    this.#syncEntityTabs(root);
    this.#syncEntityWindowControls(root);
    this.#syncEntityDialogMode(root);
    this.#syncForcePowerAccent(root);
    this.#syncEntityArrayControls(root);
    this.#syncEntityEffectControls(root);

    root.addEventListener('keydown', this.#handleEntityDialogKeydown.bind(this));

    // Entity shell mode controls
    root.querySelector('.entity-dialog-edit')?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.#setEntityDialogMode('edit');
    });

    root.querySelector('.entity-dialog-cancel')?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (this.#getEntityDialogMode() === 'create' && !this.item?.id) {
        this.close();
        return;
      }
      this.#setEntityDialogMode(this.item?.id ? 'view' : 'create');
    });

    root.querySelectorAll('[data-entity-save-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        this._entityDialogCloseAfterSave = button.dataset.entitySaveMode !== 'save';
      }, { capture: true });
    });

    // Close buttons
    root.querySelectorAll('.close-btn').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.close();
      });
    });

    // Shield activation helpers (data-only intent -> actor API)
    root.querySelector('.activate-shield')?.addEventListener('click', this.#onActivateShield.bind(this));
    root.querySelector('.deactivate-shield')?.addEventListener('click', this.#onDeactivateShield.bind(this));

    // Lightsaber runtime helpers preserve the existing activation/deactivation path.
    root.querySelector('.activate-lightsaber')?.addEventListener('click', this.#onActivateLightsaber.bind(this));
    root.querySelector('.deactivate-lightsaber')?.addEventListener('click', this.#onDeactivateLightsaber.bind(this));

    // Lightsaber emit light toggle
    root.querySelector('.emit-light-toggle')?.addEventListener('change', this.#onEmitLightToggle.bind(this));

    // Item type selector - re-render on type change to update category options
    const itemTypeSelect = root.querySelector('.item-type-select');
    if (itemTypeSelect) {
      itemTypeSelect.addEventListener('change', this.#onItemTypeChange.bind(this));
    }

    // Weapon category filtering based on melee/ranged choice
    const meleeOrRangedSelect = root.querySelector('.melee-or-ranged-select');
    if (meleeOrRangedSelect) {
      meleeOrRangedSelect.addEventListener('change', this.#onMeleeOrRangedChange.bind(this));
    }

    const weaponCategorySelect = root.querySelector('.weapon-category-select');
    if (weaponCategorySelect && this.item?.type === 'weapon') {
      weaponCategorySelect.addEventListener('change', this.#onWeaponCategoryChange.bind(this));
    }

    // Intercept native form submission — AppV2 does not set tag:'form' so the
    // browser would navigate away (hard-crashing Foundry) without this guard.
    const innerForm = root.querySelector('form.swse-item-editor-form');
    if (innerForm) {
      innerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        addItemEditorTrace('native-submit-captured', {
          itemId: this.item?.id,
          itemType: this.item?.type
        });
        const fd = collectSheetFormData(innerForm);
        await SWSEItemSheet.#onSubmitForm.call(this, event, innerForm, fd);
      });
    }

    // Earliest-possible confirm-click trace (fires before submit)
    const confirmBtn = root.querySelector('.item-editor__footer-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', (event) => {
        addItemEditorTrace('confirm-click', {
          itemId: this.item?.id,
          itemType: this.item?.type,
          itemName: this.item?.name
        });
      }, { capture: true });
    }
  }

  /**
   * Handle changes to item type to update category options
   * @private
   */
  async #onItemTypeChange(event) {
    this.#captureEntityDialogViewState();
    this._previewItemType = event.currentTarget.value || null;
    if (this._previewItemType !== 'weapon') {
      this._previewWeaponBranch = null;
    }
    await this.#renderPreservingEntityView({ force: true });
  }

  /**
   * Handle changes to melee/ranged choice to update category options
   * @private
   */
  async #onMeleeOrRangedChange(event) {
    const branch = event.currentTarget.value || null;
    const hadRangeSection = !!this.element?.querySelector?.('.item-editor__section--range-bands');
    const willHaveRangeSection = String(branch || '').toLowerCase() === 'ranged';
    this._previewWeaponBranch = branch;
    this.#populateWeaponCategoryOptions(branch, { preserveValue: true });

    // Switching between melee and ranged changes structural sections. Preserve
    // tab, scroll, and focus when a real rerender is needed; otherwise mutate
    // only the category select/range bands in place so the sheet does not jump.
    if (hadRangeSection !== willHaveRangeSection) {
      await this.#renderPreservingEntityView({ force: true });
    }
    window.setTimeout(() => this.#hydrateCurrentWeaponRange({ overwrite: true }), 0);
  }

  async #onWeaponCategoryChange(event) {
    event.preventDefault();
    await this.#hydrateCurrentWeaponRange({ overwrite: true });
  }

  async #hydrateCurrentWeaponRange({ overwrite = false } = {}) {
    try {
      const form = this.element?.querySelector?.('form.swse-item-editor-form');
      if (!form || this.item?.type !== 'weapon') return false;
      const branch = form.querySelector('[name="system.meleeOrRanged"]')?.value ?? this.item?.system?.meleeOrRanged;
      if (String(branch || '').toLowerCase() !== 'ranged') return false;
      const category = form.querySelector('[name="system.weaponCategory"]')?.value ?? this.item?.system?.weaponCategory;
      const rangeData = await WeaponRangeProfileResolver.resolveForWeapon({
        system: {
          ...(this.item?.system ?? {}),
          meleeOrRanged: branch,
          weaponCategory: category
        }
      });
      if (!rangeData) return false;
      return WeaponRangeProfileResolver.applyToForm(form, rangeData, { overwrite });
    } catch (err) {
      SWSELogger.warn('[SWSEItemSheet] Failed to hydrate weapon range profile', err);
      return false;
    }
  }

  async #onActivateShield(event) {
    event.preventDefault();

    const actor = this.item?.actor;
    if (actor?.activateItem) {
      await actor.activateItem(this.item);
      return;
    }

    // Fallback for unowned items or legacy contexts.
    const currentCharges = Number(this.item.system.charges?.current ?? 0);
    const shieldRating = Number(this.item.system.shieldRating ?? 0);

    if (currentCharges <= 0) {
      ui.notifications.warn('No charges remaining to activate shield!');
      return;
    }
    if (shieldRating <= 0) {
      ui.notifications.warn('Shield has no rating to activate!');
      return;
    }

    const updates = {
      'system.charges.current': currentCharges - 1,
      'system.activated': true,
      'system.currentSR': shieldRating
    };

    // PHASE 2: Route embedded items through ActorEngine
    if (this.item?.isEmbedded && actor) {
      try {
        await ActorEngine.updateEmbeddedDocuments(actor, "Item", [{ _id: this.item.id, ...updates }]);
      } catch (err) {
        console.error('[Item Sheet] Shield activation failed:', err);
        ui.notifications.error(`Failed to activate ${this.item.name}: ${err.message}`);
        return;
      }
    } else {
      // @mutation-exception: Unowned item update
      // Unowned items (not on an actor) can update directly — UI-only operation
      await this.item.update(updates);  // @mutation-exception: UI-only unowned item
    }

    ui.notifications.info(
      `${this.item.name} activated! SR: ${shieldRating}, Charges remaining: ${currentCharges - 1}`
    );
  }


  async #onActivateLightsaber(event) {
    event.preventDefault();

    const actor = this.item?.actor;
    const bladeColor = getSwseFlag(this.item, 'bladeColor') || actor?.getFlag?.('swse', 'preferredLightsaberColor') || 'blue';

    if (actor?.activateItem) {
      await actor.activateItem(this.item);
    } else if (this.item?.isEmbedded && actor) {
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: this.item.id, 'system.activated': true }]);
    } else {
      // @mutation-exception world-item
      await this.item.update({ 'system.activated': true });
    }

    if (!getSwseFlag(this.item, 'emitLight')) {
      if (this.item?.isEmbedded && actor) {
        await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: this.item.id, 'flags.foundryvtt-swse.emitLight': true, 'flags.foundryvtt-swse.bladeColor': bladeColor }]);
      } else {
        // @mutation-exception world-item
        await this.item.update({ 'flags.foundryvtt-swse.emitLight': true, 'flags.foundryvtt-swse.bladeColor': bladeColor });
      }
    }

    const tokens = actor?.getActiveTokens?.() || [];
    if (tokens[0]?.document) {
      const hex = BLADE_COLOR_MAP[bladeColor] ?? '#00ffff';
      await tokens[0].document.update({
        light: { dim: 20, bright: 10, color: hex, alpha: 0.3, animation: { type: 'pulse', speed: 3, intensity: 2 } }
      });
    }

    ui.notifications.info(`${this.item.name} activated.`);
  }

  async #onDeactivateLightsaber(event) {
    event.preventDefault();

    const actor = this.item?.actor;
    if (actor?.deactivateItem) {
      await actor.deactivateItem(this.item);
    } else if (this.item?.isEmbedded && actor) {
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: this.item.id, 'system.activated': false }]);
    } else {
      // @mutation-exception world-item
      await this.item.update({ 'system.activated': false });
    }

    const tokens = actor?.getActiveTokens?.() || [];
    if (tokens[0]?.document) {
      await tokens[0].document.update({ light: { dim: 0, bright: 0 } });
    }

    ui.notifications.info(`${this.item.name} deactivated.`);
  }

  async #onDeactivateShield(event) {
    event.preventDefault();

    const actor = this.item?.actor;
    if (actor?.deactivateItem) {
      await actor.deactivateItem(this.item);
      return;
    }

    const updates = { 'system.activated': false };

    // PHASE 2: Route embedded items through ActorEngine
    if (this.item?.isEmbedded && actor) {
      try {
        await ActorEngine.updateEmbeddedDocuments(actor, "Item", [{ _id: this.item.id, ...updates }]);
      } catch (err) {
        console.error('[Item Sheet] Shield deactivation failed:', err);
        ui.notifications.error(`Failed to deactivate ${this.item.name}: ${err.message}`);
        return;
      }
    } else {
      // @mutation-exception: Unowned item update
      // Unowned items (not on an actor) can update directly — UI-only operation
      await this.item.update(updates);  // @mutation-exception: UI-only unowned item
    }
    ui.notifications.info(`${this.item.name} deactivated!`);
  }

  async #onEmitLightToggle(event) {
    event.preventDefault();

    const enabled = event.currentTarget.checked;
    const actor = this.item?.actor;

    // Update item flag
    // PHASE 2: Route embedded items through ActorEngine
    if (this.item?.isEmbedded && actor) {
      try {
        await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: this.item.id, 'flags.foundryvtt-swse.emitLight': enabled }]);
      } catch (err) {
        console.error('[Item Sheet] Light toggle failed:', err);
        ui.notifications.error(`Failed to toggle light: ${err.message}`);
        return;
      }
    } else {
      // @mutation-exception: Unowned item update
      // Unowned items (not on an actor) can update directly — UI-only operation
      await this.item.update({ 'flags.foundryvtt-swse.emitLight': enabled });  // @mutation-exception: UI-only unowned item
    }

    // Update token light if actor is on canvas
    const tokens = actor?.getActiveTokens?.() || [];
    if (tokens.length === 0) return;

    const token = tokens[0];
    if (!token?.document) return;

    if (enabled) {
      const bladeColor = this.item.flags.swse?.bladeColor;
      const hex = BLADE_COLOR_MAP[bladeColor] ?? "#00ffff";

      await token.document.update({
        light: {
          dim: 20,
          bright: 10,
          color: hex,
          alpha: 0.3,
          animation: {
            type: "pulse",
            speed: 3,
            intensity: 2
          }
        }
      });

      ui.notifications.info(`${this.item.name} blade light activated!`);
    } else {
      await token.document.update({
        light: {
          dim: 0,
          bright: 0
        }
      });

      ui.notifications.info(`${this.item.name} blade light deactivated!`);
    }
  }

  /**
   * V2 form handler.
   * Static method called by Foundry with proper 'this' binding to app instance.
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   */
  static async #onSubmitForm(event, form, formData) {
    event.preventDefault();

    const app = this;
    installItemEditorTrace();

    if (app._isSavingItem === true) {
      addItemEditorTrace('item-sheet-submit-ignored-busy', {
        item: summarizeItem(app.item),
        actor: summarizeActorItems(app.item?.actor)
      });
      return;
    }

    app._isSavingItem = true;
    const submitButtons = Array.from(form?.querySelectorAll?.('[data-entity-save-mode], .item-editor__footer-confirm') ?? []);
    for (const button of submitButtons) {
      button.disabled = true;
      button.dataset.swseSaving = 'true';
    }
    const closeAfterSave = app._entityDialogCloseAfterSave !== false;

    addItemEditorTrace('submit-start', {
      itemId: app.item?.id,
      itemType: app.item?.type,
      itemName: app.item?.name
    });

    try {
      const rawObject = formData?.object ?? Object.fromEntries(new FormData(form).entries());

      addItemEditorTrace('formdata-collected', {
        itemId: app.item?.id,
        rawKeyCount: Object.keys(rawObject ?? {}).length,
        rawKeys: Object.keys(rawObject ?? {}).sort()
      });
      const hasDottedKeys = Object.keys(rawObject ?? {}).some(key => String(key).includes('.'));
      const data = hasDottedKeys ? foundry.utils.expandObject(rawObject) : foundry.utils.deepClone(rawObject ?? {});
      const effectUpdates = data?.effects ?? null;
      if (data && typeof data === 'object') delete data.effects;

      addItemEditorTrace('item-sheet-submit-raw', {
        item: summarizeItem(app.item),
        actor: summarizeActorItems(app.item?.actor),
        rawKeys: Object.keys(rawObject ?? {}).sort(),
        rawObject,
        expandedSystemKeys: Object.keys(data?.system ?? {}).sort()
      });

      // Normalize string lists into arrays.
      if (typeof data?.system?.properties === 'string') {
        data.system.properties = data.system.properties
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
      }

      if (typeof data?.system?.tags === 'string') {
        data.system.tags = data.system.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }

      // If a ranged weapon does not yet have range-band data, hydrate it from the
      // canonical actor weapon range profiles before sanitizing. Explicit player
      // overrides submitted in the form are preserved.
      if ((app.item?.type === 'weapon' || data?.type === 'weapon')
          && String(data?.system?.meleeOrRanged || app.item?.system?.meleeOrRanged || '').toLowerCase() === 'ranged') {
        const rangeData = await WeaponRangeProfileResolver.resolveForWeapon({
          system: {
            ...(app.item?.system ?? {}),
            ...(data?.system ?? {})
          }
        });
        if (rangeData) {
          data.system.rangeProfile = data.system.rangeProfile || rangeData.profileSlug || rangeData.profileId;
          data.system.rangeProfileName = data.system.rangeProfileName || rangeData.profileName;
          data.system.range = data.system.range || rangeData.range;
          data.system.ranges = foundry.utils.mergeObject(
            foundry.utils.deepClone(rangeData.ranges ?? {}),
            data.system.ranges ?? {},
            { inplace: false }
          );
        }
      }

      // If a shield is toggled off via form edits, ensure derived UI doesn't remain "active".
      if (data?.system?.charges && Number(data.system.charges?.current ?? 0) <= 0) {
        data.system.activated = false;
      }

      const actor = app.item?.actor;
      const requestedType = data?.type ?? app.item?.type;
      if (requestedType && requestedType !== app.item?.type) {
        ui.notifications?.warn?.('Changing an existing item type is not supported here. Create a new blank item of the desired type instead.');
        data.type = app.item?.type;
      }

      const safeUpdate = sanitizeItemSheetUpdate(app.item, data, form);
      const validationIssues = validateItemData({
        type: app.item?.type || requestedType,
        name: safeUpdate?.name,
        system: safeUpdate?.system ?? {}
      });
      if (validationIssues.length) {
        ui.notifications?.warn?.(`${app.item?.name || safeUpdate.name || 'Item'} saved with ${validationIssues.length} validation warning${validationIssues.length === 1 ? '' : 's'}.`);
        addItemEditorTrace('item-sheet-validation-warnings', {
          itemId: app.item?.id,
          count: validationIssues.length,
          validationIssues
        });
      }
      const flatData = foundry.utils.flattenObject(safeUpdate);

      addItemEditorTrace('item-sheet-submit-sanitized', {
        item: summarizeItem(app.item),
        actor: summarizeActorItems(actor),
        requestedType,
        safeUpdate,
        flatKeys: Object.keys(flatData ?? {}).sort(),
        flatData
      });

      addItemEditorTrace('normalized-payload', {
        itemId: app.item?.id,
        itemType: app.item?.type,
        flatKeys: Object.keys(flatData ?? {}).sort(),
        typeInPayload: 'type' in flatData,
        idInPayload: '_id' in flatData
      });

      // PHASE 2: Route embedded items through ActorEngine
      if (app.item?.isEmbedded && actor) {
        try {
          addItemEditorTrace('update-start', {
            itemId: app.item?.id,
            path: 'embedded',
            actorId: actor?.id
          });
          await ActorEngine.updateEmbeddedDocuments(actor, "Item", [{ _id: app.item.id, ...flatData }], { source: 'swse-item-sheet-confirm' });
          await app.#updateEmbeddedEffectDocuments(effectUpdates);
          addItemEditorTrace('update-success', {
            itemId: app.item?.id,
            path: 'embedded'
          });
          addItemEditorTrace('item-sheet-submit-success-embedded', {
            item: summarizeItem(app.item),
            actor: summarizeActorItems(actor),
            updatedItemId: app.item.id
          });
          app._previewItemType = null;
          app._previewWeaponBranch = null;
          app._entityDialogDirty = false;
          app._entityDialogCloseAfterSave = true;
          if (app.#getEntityDialogMode() === 'create') app._entityDialogMode = 'edit';
          ui.notifications?.info?.(`${app.item.name || safeUpdate.name} saved.`);
          if (closeAfterSave) {
            await app.close?.();
          } else {
            await app.#renderPreservingEntityView({ force: true });
          }
          return;
        } catch (err) {
          addItemEditorTrace('update-failure', {
            itemId: app.item?.id,
            path: 'embedded',
            error: err
          });
          addItemEditorTrace('item-sheet-submit-error-embedded', {
            item: summarizeItem(app.item),
            actor: summarizeActorItems(actor),
            flatData,
            error: err
          });
          console.error('[Item Sheet] Form submission failed:', err);
          ui.notifications.error(`Failed to save item: ${err.message}`);
          return;
        }
      }

      // @mutation-exception: Unowned item update
      // Unowned items (not on an actor) can update directly — UI-only sheet operation
      try {
        addItemEditorTrace('update-start', {
          itemId: app.item?.id,
          path: 'unowned'
        });
        await app.item.update(flatData); // @mutation-exception: UI-only unowned item
        await app.#updateEmbeddedEffectDocuments(effectUpdates);
        addItemEditorTrace('update-success', {
          itemId: app.item?.id,
          path: 'unowned'
        });
        addItemEditorTrace('item-sheet-submit-success-unowned', {
          item: summarizeItem(app.item),
          flatData
        });
      } catch (err) {
        addItemEditorTrace('update-failure', {
          itemId: app.item?.id,
          path: 'unowned',
          error: err
        });
        addItemEditorTrace('item-sheet-submit-error-unowned', {
          item: summarizeItem(app.item),
          flatData,
          error: err
        });
        throw err;
      }
      app._previewItemType = null;
      app._previewWeaponBranch = null;
      app._entityDialogDirty = false;
      app._entityDialogCloseAfterSave = true;
      if (app.#getEntityDialogMode() === 'create') app._entityDialogMode = 'edit';
      ui.notifications?.info?.(`${app.item?.name || safeUpdate.name} saved.`);
      if (closeAfterSave) {
        await app.close?.();
      } else {
        await app.#renderPreservingEntityView({ force: true });
      }
    } finally {
      addItemEditorTrace('finally', {
        itemId: app.item?.id,
        itemType: app.item?.type,
        itemName: app.item?.name
      });
      app._isSavingItem = false;
      for (const button of submitButtons) {
        button.disabled = false;
        delete button.dataset.swseSaving;
      }
    }
  }
}

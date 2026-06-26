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

const EFFECT_WIZARD_DRAFT_FLAG = 'effectWizardDraft';
const EFFECT_WIZARD_CONFIRM_STATES = Object.freeze(['delete-effect', 'convert-effect-basic', 'clear-draft']);

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

  #createDefaultEffectWizardState(mode = 'basic') {
    const normalizedMode = String(mode || '').toLowerCase() === 'advanced' ? 'advanced' : 'basic';
    return {
      open: false,
      mode: normalizedMode,
      step: 0,
      draft: {
        name: normalizedMode === 'advanced' ? 'Advanced SWSE Effect' : 'New SWSE Effect',
        description: '',
        icon: 'icons/svg/aura.svg',
        tags: [],
        target: null,
        operation: 'increase',
        amount: 1,
        bonusType: 'untyped',
        application: 'equipped',
        activeState: 'enabled',
        scope: 'self',
        filterType: 'all',
        filterValue: '',
        duration: 'until-deactivated',
        transfer: true,
        conditions: [],
        targetId: '',
        targetSearch: '',
        presetId: '',
        rawPath: '',
        advancedMode: 2,
        advancedValue: '1',
        priority: 20,
        iconChoice: 'aura',
        draftSavedAt: '',
        editEffectId: '',
        editMode: '',
        sourceEffectName: ''
      }
    };
  }

  #getEffectWizardState() {
    if (!this._effectWizardState || typeof this._effectWizardState !== 'object') {
      this._effectWizardState = this.#createDefaultEffectWizardState('basic');
    }
    const step = Number(this._effectWizardState.step ?? 0);
    this._effectWizardState.step = Math.max(0, Math.min(4, Number.isFinite(step) ? step : 0));
    this._effectWizardState.mode = String(this._effectWizardState.mode || '').toLowerCase() === 'advanced' ? 'advanced' : 'basic';
    this._effectWizardState.draft = {
      ...this.#createDefaultEffectWizardState(this._effectWizardState.mode).draft,
      ...(this._effectWizardState.draft ?? {})
    };
    return this._effectWizardState;
  }

  #getSavedEffectWizardDraft() {
    const saved = this.item?.getFlag?.('foundryvtt-swse', EFFECT_WIZARD_DRAFT_FLAG) ?? null;
    if (!saved || typeof saved !== 'object') return null;
    const mode = String(saved.mode || '').toLowerCase() === 'advanced' ? 'advanced' : 'basic';
    const draft = saved.draft && typeof saved.draft === 'object' ? saved.draft : null;
    if (!draft) return null;
    return {
      mode,
      savedAt: String(saved.savedAt || ''),
      step: Number(saved.step ?? 0) || 0,
      draft: { ...this.#createDefaultEffectWizardState(mode).draft, ...draft }
    };
  }

  #buildSavedEffectWizardContext() {
    const saved = this.#getSavedEffectWizardDraft();
    if (!saved) return { exists: false };
    const name = String(saved.draft?.name || '').trim() || (saved.mode === 'advanced' ? 'Advanced SWSE Effect' : 'New SWSE Effect');
    const savedAt = String(saved.savedAt || '');
    let savedAtLabel = 'Saved draft';
    if (savedAt) {
      try { savedAtLabel = new Date(savedAt).toLocaleString(); } catch { savedAtLabel = savedAt; }
    }
    return {
      exists: true,
      mode: saved.mode,
      name,
      savedAt,
      savedAtLabel,
      label: saved.mode === 'advanced' ? 'Advanced draft' : 'Basic draft'
    };
  }

  #normalizeEffectWizardDraftForStorage(draft = {}) {
    const allowed = this.#createDefaultEffectWizardState('basic').draft;
    const clean = {};
    for (const key of Object.keys(allowed)) {
      const value = draft?.[key];
      if (Array.isArray(value)) clean[key] = value.map(entry => String(entry || '').trim()).filter(Boolean);
      else if (value && typeof value === 'object') clean[key] = foundry.utils?.deepClone?.(value) ?? { ...value };
      else if (value != null) clean[key] = value;
    }
    return clean;
  }

  async #persistEffectWizardDraft({ notify = true } = {}) {
    if (!this.item?.setFlag) return false;
    const state = this.#getEffectWizardState();
    const savedAt = new Date().toISOString();
    state.draft.draftSavedAt = savedAt;
    const payload = {
      version: 1,
      mode: state.mode,
      step: Number(state.step ?? 0) || 0,
      savedAt,
      itemId: this.item?.id ?? null,
      itemName: this.item?.name ?? '',
      draft: this.#normalizeEffectWizardDraftForStorage(state.draft)
    };
    await this.item.setFlag('foundryvtt-swse', EFFECT_WIZARD_DRAFT_FLAG, payload);
    if (notify) ui.notifications?.info?.('Effect wizard draft saved on this item.');
    return true;
  }

  async #clearEffectWizardDraft({ notify = true } = {}) {
    if (!this.item?.unsetFlag) return false;
    await this.item.unsetFlag('foundryvtt-swse', EFFECT_WIZARD_DRAFT_FLAG);
    if (notify) ui.notifications?.info?.('Effect wizard draft cleared.');
    return true;
  }

  #buildEffectActionConfirmContext() {
    const state = this._effectActionConfirmState;
    if (!state?.open || !EFFECT_WIZARD_CONFIRM_STATES.includes(String(state.type || ''))) return { open: false };
    const effect = state.effectId ? this.#getEffectDocument(state.effectId) : null;
    return {
      open: true,
      type: state.type,
      effectId: state.effectId || '',
      title: state.title || 'Confirm Effect Action',
      message: state.message || '',
      detail: state.detail || (effect ? (effect.name || effect.label || 'Active Effect') : ''),
      confirmLabel: state.confirmLabel || 'Confirm',
      cancelLabel: state.cancelLabel || 'Cancel',
      tone: state.tone || 'warn'
    };
  }

  async #openEffectActionConfirm(state = {}) {
    const type = String(state.type || '');
    if (!EFFECT_WIZARD_CONFIRM_STATES.includes(type)) return false;
    this._effectActionConfirmState = { ...state, type, open: true };
    await this.#renderEffectWizardChange();
    return true;
  }

  #clearEffectActionConfirmState() {
    this._effectActionConfirmState = null;
  }

  #effectWizardIcons() {
    return [
      { id: 'aura', label: 'Aura', glyph: '✦', icon: 'icons/svg/aura.svg' },
      { id: 'defense', label: 'Defense', glyph: '⬢', icon: 'icons/svg/shield.svg' },
      { id: 'skill', label: 'Skill', glyph: '◆', icon: 'icons/svg/d20.svg' },
      { id: 'attack', label: 'Attack', glyph: '⌖', icon: 'icons/svg/sword.svg' },
      { id: 'force', label: 'Force', glyph: '✧', icon: 'icons/svg/upgrade.svg' },
      { id: 'status', label: 'Status', glyph: '◈', icon: 'icons/svg/statuses.svg' }
    ];
  }

  #findEffectWizardTarget(targetId = '') {
    const id = String(targetId || '').trim();
    if (!id) return null;
    for (const group of EffectIntentEngine.wizardTargets()) {
      const target = (group.targets ?? []).find(entry => entry.id === id);
      if (target) return foundry.utils?.deepClone?.(target) ?? { ...target, intent: { ...(target.intent ?? {}) } };
    }
    return null;
  }

  #findEffectWizardOperation(operationId = '') {
    const id = String(operationId || '').trim();
    return EffectIntentEngine.wizardOperations().find(entry => entry.id === id) ?? EffectIntentEngine.wizardOperations()[0];
  }

  #effectWizardFilterValueOptions(filterType = '') {
    const options = EffectIntentEngine.options();
    const type = String(filterType || 'all').trim();
    if (type === 'weapon-group') return options.weaponGroups ?? [];
    if (type === 'weapon-category') return options.weaponCategories ?? [];
    if (type === 'skill') return options.skills ?? [];
    if (type === 'damage-type') return options.damageTypes ?? [];
    if (type === 'force-descriptor') return options.forceDescriptors ?? [];
    return [];
  }

  #effectWizardDefaultFilterValue(filterType = '', draft = {}) {
    const options = this.#effectWizardFilterValueOptions(filterType);
    if (filterType === 'skill' && draft?.targetId) {
      const target = this.#findEffectWizardTarget(draft.targetId);
      const targetSkill = target?.intent?.category === 'skill' ? String(target.intent.target || '') : '';
      if (targetSkill && options.some(option => String(option.value) === targetSkill)) return targetSkill;
    }
    return options[0]?.value ?? '';
  }

  #effectWizardFilterValuePlaceholder(filterType = '') {
    const type = String(filterType || 'all').trim();
    if (type === 'custom') return 'Describe the GM/table condition';
    if (type === 'this-item' || type === 'all') return 'No additional value required';
    if (type === 'weapon-group') return 'Choose a weapon group';
    if (type === 'weapon-category') return 'Choose an attack category';
    if (type === 'skill') return 'Choose a skill';
    if (type === 'damage-type') return 'Choose a damage type';
    if (type === 'force-descriptor') return 'Choose a Force descriptor';
    return 'Optional context value';
  }

  #findEffectWizardCondition(conditionId = '') {
    const id = String(conditionId || '').trim();
    if (!id) return null;
    for (const group of EffectIntentEngine.wizardConditionGroups()) {
      const condition = (group.conditions ?? []).find(entry => entry.id === id);
      if (condition) return { ...condition, groupId: group.id, groupMode: group.mode || 'toggle' };
    }
    return null;
  }

  #effectWizardSelectedConditionIds(draft = {}) {
    return new Set(Array.isArray(draft.conditions) ? draft.conditions.map(entry => String(entry || '').trim()).filter(Boolean) : []);
  }

  #effectWizardConditionSelected(condition = {}, draft = {}) {
    const selectedIds = this.#effectWizardSelectedConditionIds(draft);
    if (selectedIds.has(condition.id)) return true;
    if (condition.application) return String(draft.application || 'equipped') === String(condition.application);
    if (condition.scope) return String(draft.scope || 'self') === String(condition.scope);
    if (condition.filterType) {
      return String(draft.filterType || 'all') === String(condition.filterType)
        && String(draft.filterValue || '') === String(condition.filterValue || '');
    }
    if (condition.category && condition.target) {
      const target = this.#findEffectWizardTarget(draft.targetId);
      return String(target?.intent?.category || '') === String(condition.category)
        && String(target?.intent?.target || '') === String(condition.target);
    }
    return false;
  }

  #appendEffectWizardNote(draft = {}, note = '') {
    const text = String(note || '').trim();
    if (!text) return;
    const current = String(draft.note || '').trim();
    if (!current) {
      draft.note = text;
      return;
    }
    if (!current.toLowerCase().includes(text.toLowerCase())) draft.note = `${current}; ${text}`;
  }

  #applyEffectWizardConditionToDraft(condition = {}) {
    const state = this.#getEffectWizardState();
    const draft = state.draft ?? {};
    const selectedIds = this.#effectWizardSelectedConditionIds(draft);
    const wasSelected = selectedIds.has(condition.id);

    if (condition.groupMode === 'single') {
      for (const group of EffectIntentEngine.wizardConditionGroups()) {
        if (group.id !== condition.groupId) continue;
        for (const entry of group.conditions ?? []) selectedIds.delete(entry.id);
      }
      selectedIds.add(condition.id);
    } else if (wasSelected) {
      selectedIds.delete(condition.id);
    } else {
      selectedIds.add(condition.id);
    }

    if (condition.application) {
      draft.application = condition.application;
      draft.activeState = condition.activeState || (condition.application === 'manual' ? 'disabled' : draft.activeState || 'enabled');
      if (condition.application !== 'manual' && draft.activeState !== 'disabled') draft.activeState = 'enabled';
    }

    if (condition.scope) {
      draft.scope = condition.scope;
      if (condition.transfer === false) draft.transfer = false;
      else if (['self', 'item'].includes(condition.scope) && draft.transfer !== false) draft.transfer = true;
    }

    if (condition.filterType) {
      if (wasSelected && condition.groupMode !== 'single') {
        draft.filterType = 'all';
        draft.filterValue = '';
      } else {
        draft.filterType = condition.filterType;
        draft.filterValue = condition.filterValue || this.#effectWizardDefaultFilterValue(condition.filterType, draft);
      }
    }

    if (condition.category && condition.target) {
      const targetId = this.#effectWizardTargetIdFromIntent({ category: condition.category, target: condition.target, filterType: draft.filterType || 'all', filterValue: draft.filterValue || '' });
      const target = this.#findEffectWizardTarget(targetId);
      if (target) {
        draft.targetId = target.id;
        draft.target = { label: target.label, id: target.id };
      }
      if (condition.transfer === false) draft.transfer = false;
    }

    if (!wasSelected && condition.note) this.#appendEffectWizardNote(draft, condition.note);
    draft.conditions = Array.from(selectedIds);
    state.draft = draft;
    state.open = true;
    return state;
  }

  #effectWizardTechnicalPreview() {
    const state = this.#getEffectWizardState();
    const draft = state.draft ?? {};
    if (state.mode === 'advanced') {
      const operation = this.#findEffectWizardOperation(draft.operation || 'increase');
      const rawPath = this.#effectWizardAdvancedPath() || 'No raw path selected';
      const rawMode = Number(draft.advancedMode ?? operation?.advancedMode ?? 2) || 2;
      const value = String(draft.advancedValue ?? draft.amount ?? '1');
      return [
        'Type: Advanced ActiveEffect change',
        `Attribute Path: ${rawPath}`,
        `Mode: ${rawMode} (${operation?.label || 'Raw mode'})`,
        `Value: ${value}`,
        `Priority: ${Number(draft.priority ?? 20) || 20}`,
        `Transfer: ${draft.transfer !== false}`,
        `Starts Disabled: ${draft.activeState === 'disabled'}`,
        'Flags: foundryvtt-swse.advancedEffect + effectWizard metadata'
      ].join('\n');
    }
    const target = this.#findEffectWizardTarget(draft.targetId);
    if (!target) return 'No Basic payload yet. Choose a target card first.';
    const intent = this.#effectWizardIntentFromDraft();
    return EffectIntentEngine.getIntentTechnicalRows(intent, { item: this.item })
      .map(row => `${row.label}: ${row.value}`)
      .join('\n');
  }

  #effectWizardTargetIdFromIntent(intent = {}) {
    const category = String(intent?.category || '').trim();
    const target = String(intent?.target || '').trim();
    const filterType = String(intent?.filterType || 'all').trim();
    const filterValue = String(intent?.filterValue || '').trim();
    let fallback = '';
    for (const group of EffectIntentEngine.wizardTargets()) {
      for (const entry of group.targets ?? []) {
        const entryIntent = entry.intent ?? {};
        if (String(entryIntent.category || '') !== category) continue;
        if (String(entryIntent.target || '') !== target) continue;
        if (!fallback) fallback = entry.id;
        const entryFilterType = String(entryIntent.filterType || 'all').trim();
        const entryFilterValue = String(entryIntent.filterValue || '').trim();
        if (entryFilterType === filterType && entryFilterValue === filterValue) return entry.id;
      }
    }
    return fallback;
  }

  #effectWizardEditableDescription(effect = {}, intent = {}) {
    const raw = String(effect?.description || '').trim();
    if (!raw) return '';
    const summary = EffectIntentEngine.describeIntent(intent);
    if (raw === summary) return '';
    const generatedSuffix = `\n\n${summary}`;
    if (raw.endsWith(generatedSuffix)) return raw.slice(0, -generatedSuffix.length).trim();
    return raw;
  }

  #applyEffectWizardIntentToDraft(intent = {}, { name = '', description = '', icon = '', effectId = '', editMode = '' } = {}) {
    const state = this.#getEffectWizardState();
    const normalized = EffectIntentEngine.normalizeIntent(intent);
    const targetId = this.#effectWizardTargetIdFromIntent(normalized);
    const target = this.#findEffectWizardTarget(targetId);
    state.draft.name = String(name || state.draft.name || 'New SWSE Effect');
    state.draft.description = String(description || state.draft.description || '');
    state.draft.icon = icon || state.draft.icon || 'icons/svg/aura.svg';
    state.draft.operation = normalized.operation || 'increase';
    state.draft.amount = Math.max(1, Number(normalized.amount ?? 1) || 1);
    state.draft.bonusType = normalized.bonusType || 'untyped';
    state.draft.application = normalized.application || 'equipped';
    state.draft.activeState = normalized.activeState || 'enabled';
    state.draft.scope = normalized.scope || 'self';
    state.draft.filterType = normalized.filterType || 'all';
    state.draft.filterValue = normalized.filterValue || '';
    state.draft.duration = normalized.duration || 'until-deactivated';
    state.draft.transfer = normalized.transfer !== false;
    state.draft.conditions = Array.isArray(normalized.conditions) ? normalized.conditions : [];
    state.draft.note = normalized.note || '';
    state.draft.targetId = target?.id || '';
    state.draft.target = target ? { label: target.label, id: target.id } : null;
    state.draft.editEffectId = String(effectId || '');
    state.draft.editMode = String(editMode || '');
    state.draft.sourceEffectName = String(name || '');
    state.step = target ? 4 : 1;
    state.open = true;
    return state;
  }

  #seedEffectWizardFromEffect(effect, { mode = null } = {}) {
    if (!effect) return null;
    const source = effect.toObject?.() ?? (foundry.utils?.deepClone?.(effect) ?? { ...effect });
    const hasIntent = EffectIntentEngine.hasIntent(source);
    const effectId = source._id || source.id || effect.id || effect._id || '';
    if (hasIntent && mode !== 'advanced') {
      this._effectWizardState = this.#createDefaultEffectWizardState('basic');
      return this.#applyEffectWizardIntentToDraft(EffectIntentEngine.getIntent(source), {
        name: source.name || source.label || 'SWSE Effect',
        description: this.#effectWizardEditableDescription(source, EffectIntentEngine.getIntent(source)),
        icon: source.icon || source.img || 'icons/svg/aura.svg',
        effectId,
        editMode: 'basic'
      });
    }
    const changes = Array.isArray(source.changes) ? source.changes : [];
    const first = changes[0] ?? {};
    this._effectWizardState = this.#createDefaultEffectWizardState('advanced');
    const state = this.#getEffectWizardState();
    state.open = true;
    state.step = 4;
    state.draft.name = source.name || source.label || 'Advanced SWSE Effect';
    state.draft.description = String(source.description || '');
    state.draft.icon = source.icon || source.img || 'icons/svg/aura.svg';
    state.draft.rawPath = String(first.key || '');
    state.draft.advancedMode = Number(first.mode ?? 2) || 2;
    state.draft.advancedValue = String(first.value ?? '');
    state.draft.amount = Math.max(1, Math.abs(Number(first.value ?? 1) || 1));
    const operation = EffectIntentEngine.wizardOperations().find(entry => Number(entry.advancedMode ?? 2) === state.draft.advancedMode) ?? EffectIntentEngine.wizardOperations()[0];
    state.draft.operation = operation?.id || 'increase';
    state.draft.priority = Number(first.priority ?? 20) || 20;
    state.draft.transfer = source.transfer !== false;
    state.draft.activeState = source.disabled === true ? 'disabled' : 'enabled';
    state.draft.editEffectId = String(effectId || '');
    state.draft.editMode = 'advanced';
    state.draft.sourceEffectName = String(source.name || source.label || '');
    const wizardFlags = source.flags?.['foundryvtt-swse']?.effectWizard ?? source.flags?.swse?.effectWizard ?? null;
    if (Array.isArray(wizardFlags?.tags)) state.draft.tags = wizardFlags.tags;
    return state;
  }

  #isValidEffectWizardRawPath(value = '') {
    const path = String(value || '').trim();
    if (!path) return false;
    if (/\s/.test(path)) return false;
    if (!/^[a-zA-Z_$][\w$]*(\.[a-zA-Z_$][\w$]*)+$/.test(path)) return false;
    return ['system.', 'flags.', 'prototypeToken.', 'name', 'img'].some(prefix => path === prefix.replace(/\.$/, '') || path.startsWith(prefix));
  }

  #effectWizardIntentFromDraft() {
    const state = this.#getEffectWizardState();
    const draft = state.draft ?? {};
    const target = this.#findEffectWizardTarget(draft.targetId) ?? draft.target ?? null;
    const operation = this.#findEffectWizardOperation(draft.operation || 'increase');
    const targetIntent = target?.intent ?? {};
    const noteParts = [];
    if (draft.note) noteParts.push(String(draft.note));
    if (String(draft.filterType || 'all') === 'custom') noteParts.push(String(draft.filterValue || 'GM adjudicated condition'));
    const filterType = draft.filterType && draft.filterType !== 'all'
      ? draft.filterType
      : (targetIntent.filterType || 'all');
    const filterValue = draft.filterType && draft.filterType !== 'all'
      ? (draft.filterValue || '')
      : (targetIntent.filterValue || '');
    return EffectIntentEngine.normalizeIntent({
      ...targetIntent,
      application: draft.application || 'equipped',
      activeState: draft.activeState || 'enabled',
      scope: draft.scope || targetIntent.scope || 'self',
      operation: operation?.intentOperation || draft.operation || 'increase',
      category: targetIntent.category || draft.category || 'defense',
      target: targetIntent.target || draft.target || 'reflex',
      amount: Number(draft.amount ?? 1) || 1,
      bonusType: draft.bonusType || 'untyped',
      duration: draft.duration || 'until-deactivated',
      transfer: targetIntent.transfer === false ? false : draft.transfer !== false,
      filterType,
      filterValue,
      conditions: Array.isArray(draft.conditions) ? draft.conditions : [],
      note: noteParts.filter(Boolean).join('; ')
    });
  }

  #effectWizardAdvancedPath() {
    const state = this.#getEffectWizardState();
    const draft = state.draft ?? {};
    const target = this.#findEffectWizardTarget(draft.targetId) ?? null;
    return String(draft.rawPath || target?.advancedPath || '').trim();
  }

  #effectWizardPlainPreview() {
    const state = this.#getEffectWizardState();
    const draft = state.draft ?? {};
    if (state.mode === 'advanced') {
      const key = this.#effectWizardAdvancedPath();
      const operation = this.#findEffectWizardOperation(draft.operation || 'increase');
      const value = String(draft.advancedValue || draft.amount || '1');
      if (!key) return 'Choose a target card or enter a raw SWSE/Foundry path.';
      return `${draft.name || 'Advanced SWSE Effect'} will apply ${operation?.label || 'Add'} ${value} to ${key}.`;
    }
    const target = this.#findEffectWizardTarget(draft.targetId);
    if (!target) return 'Choose a target to preview the Basic effect.';
    return EffectIntentEngine.describeIntent(this.#effectWizardIntentFromDraft());
  }

  #effectWizardRawPathState() {
    const state = this.#getEffectWizardState();
    const draft = state.draft ?? {};
    const path = this.#effectWizardAdvancedPath();
    if (state.mode !== 'advanced') return { required: false, valid: true, path: '', message: '' };
    if (!String(path || '').trim()) {
      return { required: true, valid: false, path: '', message: 'Choose a target card or enter a raw SWSE/Foundry path.' };
    }
    if (/\s/.test(path)) {
      return { required: true, valid: false, path, message: 'Raw paths cannot contain spaces.' };
    }
    if (!this.#isValidEffectWizardRawPath(path)) {
      return { required: true, valid: false, path, message: 'Path must be a dotted property path beginning with system., flags., prototypeToken., name, or img.' };
    }
    return { required: true, valid: true, path, message: 'Valid raw path.' };
  }

  #effectWizardStepValidation(stepOverride = null) {
    const state = this.#getEffectWizardState();
    const mode = state.mode === 'advanced' ? 'advanced' : 'basic';
    const draft = state.draft ?? {};
    const step = stepOverride == null ? Number(state.step ?? 0) || 0 : Number(stepOverride) || 0;
    const target = this.#findEffectWizardTarget(draft.targetId);
    const operation = this.#findEffectWizardOperation(draft.operation || 'increase');
    const amount = Number(draft.amount ?? 0);
    const advancedValue = String(draft.advancedValue ?? '').trim();
    const rawPath = this.#effectWizardRawPathState();
    const filterType = String(draft.filterType || 'all').trim();
    const filterValue = String(draft.filterValue || '').trim();
    const filterNeedsValue = !!filterType && !['all', 'this-item'].includes(filterType);
    const messages = [];
    if (step === 0 && !String(draft.name || '').trim()) messages.push('Name the effect before moving on.');
    if (step === 1) {
      if (mode === 'advanced') {
        if (!rawPath.valid) messages.push(rawPath.message);
      } else if (!target) messages.push('Choose a target card for this Basic effect.');
    }
    if (step === 2) {
      if (!operation) messages.push('Choose how the target changes.');
      if (!Number.isFinite(amount) || amount <= 0) messages.push('Enter an amount greater than zero.');
      if (mode === 'advanced' && !advancedValue) messages.push('Enter the raw value this effect should write.');
    }
    if (step === 3 && mode === 'basic' && filterNeedsValue && !filterValue) {
      messages.push('Choose or describe the selected context filter value.');
    }
    if (step === 4) {
      if (!String(draft.name || '').trim()) messages.push('Name the effect before creating it.');
      if (mode === 'advanced') {
        if (!rawPath.valid) messages.push(rawPath.message);
      } else if (!target) messages.push('Choose a target card before creating this effect.');
      if (!operation) messages.push('Choose a modifier before creating this effect.');
      if (!Number.isFinite(amount) || amount <= 0) messages.push('Enter an amount greater than zero.');
      if (mode === 'basic' && filterNeedsValue && !filterValue) messages.push('Choose or describe the selected context filter value.');
    }
    return {
      step,
      valid: messages.length === 0,
      messages,
      message: messages[0] || '',
      tone: messages.length ? 'warn' : 'ok'
    };
  }

  #canEnterEffectWizardStep(nextStep = 0) {
    const targetStep = Math.max(0, Math.min(4, Number(nextStep) || 0));
    for (let index = 0; index < targetStep; index += 1) {
      if (!this.#effectWizardStepValidation(index).valid) return false;
    }
    return true;
  }

  #buildEffectWizardContext({ editable = true } = {}) {
    const state = this.#getEffectWizardState();
    const mode = state.mode === 'advanced' ? 'advanced' : 'basic';
    const step = Math.max(0, Math.min(4, Number(state.step ?? 0) || 0));
    const draft = state.draft ?? {};
    const target = this.#findEffectWizardTarget(draft.targetId);
    const operation = this.#findEffectWizardOperation(draft.operation || 'increase');
    const definitions = [
      { label: 'Effect Identity', summary: 'Name, icon, and tags', description: 'Give the effect a readable name, short description, icon, and category tags.' },
      { label: 'Choose Target', summary: 'What stat it affects', description: 'Pick a plain-language target card. Advanced mode can use the card path or a custom raw path.' },
      { label: 'Choose Modifier', summary: 'How it changes', description: 'Choose the operation, amount, and bonus type. Basic mode only exposes safe SWSE operations.' },
      { label: 'Conditions', summary: 'When it applies', description: 'Decide whether this is always active, equipped, activated, carried, manual, or narrowed by a context filter.' },
      { label: 'Review & Create', summary: 'Confirm and save', description: 'Review the plain-English effect and technical payload before creating the Active Effect.' }
    ];
    const steps = definitions.map((entry, index) => ({
      ...entry,
      index,
      number: index + 1,
      active: index === step,
      complete: index < step,
      value: index === 0 ? (draft.name || '') : index === 1 ? (target?.label || '') : index === 2 ? `${operation?.symbol || '+'}${draft.amount || 1} ${draft.bonusType || 'untyped'}` : ''
    }));
    const current = steps[step] ?? steps[0];
    const modeLabel = mode === 'advanced' ? 'Advanced / Raw' : 'Basic';
    const iconChoices = this.#effectWizardIcons().map(icon => ({ ...icon, selected: (draft.iconChoice || 'aura') === icon.id }));
    const tagChoices = ['Defense', 'Skill', 'Attack', 'Damage', 'Movement', 'Resource', 'Condition', 'Force', 'Item'].map(label => ({
      label,
      selected: Array.isArray(draft.tags) && draft.tags.includes(label)
    }));
    const presetCards = (EffectIntentEngine.options().presets ?? []).map(preset => ({
      id: preset.id,
      label: preset.label,
      description: preset.description,
      selected: String(draft.presetId || '') === String(preset.id || '')
    }));
    const targetSearch = String(draft.targetSearch || '').trim().toLowerCase();
    const targetGroups = EffectIntentEngine.wizardTargets()
      .map(group => ({
        ...group,
        targets: (group.targets ?? [])
          .map(entry => ({
            ...entry,
            selected: draft.targetId === entry.id,
            showPath: mode === 'advanced',
            searchable: `${entry.label} ${entry.description} ${entry.advancedPath} ${entry.intent?.category || ''} ${entry.intent?.target || ''}`.toLowerCase()
          }))
          .filter(entry => !targetSearch || entry.searchable.includes(targetSearch))
      }))
      .filter(group => (group.targets ?? []).length > 0);
    const operations = EffectIntentEngine.wizardOperations()
      .filter(entry => mode === 'advanced' || entry.basic)
      .map(entry => ({ ...entry, selected: (draft.operation || 'increase') === entry.id, disabled: mode !== 'advanced' && !entry.basic }));
    const bonusTypes = EffectIntentEngine.options().bonusTypes.map(type => ({
      ...type,
      selected: String(draft.bonusType || 'untyped').toLowerCase() === String(type.value).toLowerCase()
    }));
    const conditionGroups = EffectIntentEngine.wizardConditionGroups().map(group => ({
      ...group,
      conditions: (group.conditions ?? []).map(condition => ({
        ...condition,
        selected: this.#effectWizardConditionSelected(condition, draft),
        automationHint: condition.filterType === 'custom' || condition.scope === 'target' || condition.scope === 'area' || condition.transfer === false ? 'Reminder' : 'Automated where supported'
      }))
    }));
    const optionData = EffectIntentEngine.options();
    const scopeOptions = (optionData.scopes ?? []).map(option => ({
      ...option,
      selected: String(draft.scope || 'self') === String(option.value),
      label: option.manualOnly ? `${option.label} · reminder` : option.label
    }));
    const durationOptions = (optionData.durations ?? []).map(option => ({
      ...option,
      selected: String(draft.duration || 'until-deactivated') === String(option.value),
      label: option.automation === 'reminder' ? `${option.label} · GM tracked` : option.label
    }));
    const filterTypeOptions = (optionData.filterTypes ?? []).map(option => ({
      ...option,
      selected: String(draft.filterType || 'all') === String(option.value),
      label: option.automation === 'reminder' ? `${option.label} · reminder` : option.label
    }));
    const filterValueOptions = this.#effectWizardFilterValueOptions(draft.filterType).map(option => ({
      ...option,
      selected: String(draft.filterValue || '') === String(option.value)
    }));
    const hasFilterValueOptions = filterValueOptions.length > 0;
    const filterValueEditable = String(draft.filterType || 'all') === 'custom';
    const rawPath = this.#effectWizardAdvancedPath();
    const rawPathState = this.#effectWizardRawPathState();
    const rawPathValid = rawPathState.valid;
    const plainPreview = this.#effectWizardPlainPreview();
    const intent = mode === 'basic' && target ? this.#effectWizardIntentFromDraft() : null;
    const support = intent ? EffectIntentEngine.getAutomationSupport(intent, { item: this.item }) : null;
    const mathPreview = intent ? EffectIntentEngine.getEffectMathPreview(intent, { actor: this.item?.actor ?? null, item: this.item }) : null;
    const stepValidation = this.#effectWizardStepValidation(step);
    const reviewValidation = this.#effectWizardStepValidation(4);
    const canCreate = !!editable && reviewValidation.valid;
    const canGoForward = step < 4 && stepValidation.valid;
    const advancedMode = Number(draft.advancedMode ?? operation?.advancedMode ?? 2) || 2;
    const editingEffectId = String(draft.editEffectId || '').trim();
    const editingEffect = editingEffectId ? this.#getEffectDocument(editingEffectId) : null;
    const isEditing = !!editingEffect;
    return {
      open: !!state.open,
      editable: !!editable,
      mode,
      modeLabel,
      isBasicMode: mode === 'basic',
      isAdvancedMode: mode === 'advanced',
      step,
      progress: Math.max(20, Math.min(100, (step + 1) * 20)),
      steps,
      current,
      draft: { ...draft, rawPath, advancedMode },
      iconChoices,
      tagChoices,
      presetCards,
      hasPresetCards: presetCards.length > 0,
      editing: {
        active: isEditing,
        effectId: editingEffectId,
        name: editingEffect?.name || editingEffect?.label || draft.sourceEffectName || '',
        mode: draft.editMode || mode,
        label: isEditing ? `Editing ${editingEffect?.name || editingEffect?.label || 'Active Effect'}` : ''
      },
      targetGroups,
      hasTargetResults: targetGroups.some(group => (group.targets ?? []).length > 0),
      operations,
      bonusTypes,
      conditionGroups,
      scopeOptions,
      durationOptions,
      filterTypeOptions,
      filterValueOptions,
      hasFilterValueOptions,
      filterValueEditable,
      filterValuePlaceholder: this.#effectWizardFilterValuePlaceholder(draft.filterType),
      canGoBack: step > 0,
      canGoForward,
      isFinalStep: step >= 4,
      isStepIdentity: step === 0,
      isStepTarget: step === 1,
      isStepModifier: step === 2,
      isStepConditions: step === 3,
      isStepReview: step === 4,
      canCreate,
      primaryCreateLabel: isEditing ? 'Update Effect' : 'Create Effect',
      closeCreateLabel: isEditing ? 'Update & Close' : 'Create & Close',
      rawPathValid,
      rawPathState,
      validation: stepValidation,
      reviewValidation,
      savedDraft: this.#buildSavedEffectWizardContext(),
      actionConfirm: this.#buildEffectActionConfirmContext(),
      stackingHelp: EffectIntentEngine.wizardStackingHelp(draft.bonusType || 'untyped'),
      support,
      mathPreview,
      hasMathPreview: !!mathPreview,
      preview: {
        title: draft.name || (mode === 'advanced' ? 'Advanced SWSE Effect' : 'New SWSE Effect'),
        summary: plainPreview,
        target: mode === 'advanced' ? (rawPath || 'Not chosen') : (target?.label || 'Not chosen'),
        modifier: mode === 'advanced'
          ? `${operation?.label || 'Add'} ${draft.advancedValue || draft.amount || 1}`
          : `${operation?.symbol || '+'}${draft.amount || 1} ${draft.bonusType || 'untyped'}`,
        active: `${draft.application || 'equipped'} · ${draft.duration || 'until-deactivated'}`,
        technical: this.#effectWizardTechnicalPreview()
      }
    };
  }


  async #renderEffectWizardChange() {
    this._entityDialogActiveTab = 'effects';
    await this.#renderPreservingEntityView({ force: true });
  }

  async #openEffectWizard(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.#canMutateEntityEffects()) {
      ui.notifications?.warn?.('Switch to Edit mode before changing Active Effects.');
      return;
    }
    const requested = String(event.currentTarget?.dataset?.effectWizardOpen || '').toLowerCase();
    const saved = requested === 'saved' ? this.#getSavedEffectWizardDraft() : null;
    const mode = saved?.mode ?? (requested === 'advanced' ? 'advanced' : 'basic');
    this._effectWizardState = this.#createDefaultEffectWizardState(mode);
    this._effectWizardState.open = true;
    this._effectWizardState.step = saved ? Math.max(0, Math.min(4, Number(saved.step ?? 0) || 0)) : 0;
    if (saved?.draft) {
      this._effectWizardState.draft = {
        ...this._effectWizardState.draft,
        ...saved.draft,
        draftSavedAt: saved.savedAt || saved.draft.draftSavedAt || ''
      };
    }
    await this.#renderEffectWizardChange();
  }

  async #closeEffectWizard(event) {
    event.preventDefault();
    event.stopPropagation();
    const state = this.#getEffectWizardState();
    state.open = false;
    await this.#renderEffectWizardChange();
  }

  async #onEffectWizardMode(event) {
    event.preventDefault();
    event.stopPropagation();
    const state = this.#getEffectWizardState();
    const mode = String(event.currentTarget?.dataset?.effectWizardMode || '').toLowerCase() === 'advanced' ? 'advanced' : 'basic';
    if (state.mode === mode) return;
    const priorDraft = state.draft ?? {};
    this._effectWizardState = this.#createDefaultEffectWizardState(mode);
    this._effectWizardState.open = true;
    this._effectWizardState.step = state.step ?? 0;
    this._effectWizardState.draft = {
      ...this._effectWizardState.draft,
      ...priorDraft,
      name: priorDraft.name || this._effectWizardState.draft.name
    };
    await this.#renderEffectWizardChange();
  }

  async #onEffectWizardStep(event) {
    event.preventDefault();
    event.stopPropagation();
    const state = this.#getEffectWizardState();
    const nextStep = Number(event.currentTarget?.dataset?.effectWizardStepSelect ?? 0);
    const targetStep = Math.max(0, Math.min(4, Number.isFinite(nextStep) ? nextStep : 0));
    if (targetStep > Number(state.step ?? 0) && !this.#canEnterEffectWizardStep(targetStep)) {
      const validation = this.#effectWizardStepValidation(state.step);
      ui.notifications?.warn?.(validation.message || 'Complete the current wizard step first.');
      state.open = true;
      await this.#renderEffectWizardChange();
      return;
    }
    state.step = targetStep;
    state.open = true;
    await this.#renderEffectWizardChange();
  }

  async #onEffectWizardNav(event) {
    event.preventDefault();
    event.stopPropagation();
    const state = this.#getEffectWizardState();
    const direction = String(event.currentTarget?.dataset?.effectWizardNav || 'next').toLowerCase();
    const delta = direction === 'back' ? -1 : 1;
    if (delta > 0) {
      const validation = this.#effectWizardStepValidation(state.step);
      if (!validation.valid) {
        ui.notifications?.warn?.(validation.message || 'Complete the current wizard step first.');
        state.open = true;
        await this.#renderEffectWizardChange();
        return;
      }
    }
    state.step = Math.max(0, Math.min(4, Number(state.step ?? 0) + delta));
    state.open = true;
    await this.#renderEffectWizardChange();
  }


  async #onEffectWizardField(event) {
    event.preventDefault();
    event.stopPropagation();
    const state = this.#getEffectWizardState();
    const draft = state.draft ?? {};
    const field = String(event.currentTarget?.dataset?.effectWizardField || '').trim();
    if (!field) return;
    const control = event.currentTarget;
    let value = control?.type === 'checkbox' ? !!control.checked : control?.value;
    if (['amount', 'priority', 'advancedMode'].includes(field)) value = Number(value) || (field === 'priority' ? 20 : 1);
    if (field === 'transfer') value = value !== false;
    if (field === 'filterType') {
      const prior = String(draft.filterType || 'all');
      const next = String(value || 'all');
      draft.filterType = next;
      if (prior !== next) draft.filterValue = this.#effectWizardDefaultFilterValue(next, draft);
    } else if (field === 'duration') {
      draft.duration = String(value || 'until-deactivated');
    } else {
      draft[field] = value;
    }
    if (field === 'amount' && (!draft.advancedValue || /^-?\d+(\.\d+)?$/.test(String(draft.advancedValue)))) {
      const amount = Math.max(0, Number(draft.amount ?? 1) || 1);
      draft.advancedValue = String(draft.operation === 'decrease' ? -Math.abs(amount) : amount);
    }
    if (field === 'advancedValue') {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric !== 0) draft.amount = Math.abs(numeric);
    }
    state.draft = draft;
    state.open = true;
    await this.#renderEffectWizardChange();
  }

  async #onEffectWizardPreset(event) {
    event.preventDefault();
    event.stopPropagation();
    const presetId = String(event.currentTarget?.dataset?.effectWizardPreset || '').trim();
    const preset = EffectIntentEngine.getPreset(presetId);
    if (!preset?.intent) return;
    const previous = this.#getEffectWizardState();
    this._effectWizardState = this.#createDefaultEffectWizardState('basic');
    this._effectWizardState.open = true;
    this.#applyEffectWizardIntentToDraft(preset.intent, {
      name: preset.label || previous.draft?.name || 'New SWSE Effect',
      description: preset.description || previous.draft?.description || '',
      icon: previous.draft?.icon || 'icons/svg/aura.svg'
    });
    const nextState = this.#getEffectWizardState();
    nextState.step = 1;
    nextState.draft.presetId = preset.id;
    nextState.open = true;
    await this.#renderEffectWizardChange();
  }

  async #onEffectWizardIcon(event) {
    event.preventDefault();
    event.stopPropagation();
    const state = this.#getEffectWizardState();
    const iconId = String(event.currentTarget?.dataset?.effectWizardIcon || 'aura');
    const icon = this.#effectWizardIcons().find(entry => entry.id === iconId) ?? this.#effectWizardIcons()[0];
    state.draft.iconChoice = icon.id;
    state.draft.icon = icon.icon;
    state.open = true;
    await this.#renderEffectWizardChange();
  }

  async #onEffectWizardTag(event) {
    event.preventDefault();
    event.stopPropagation();
    const state = this.#getEffectWizardState();
    const tag = String(event.currentTarget?.dataset?.effectWizardTag || '').trim();
    if (!tag) return;
    const tags = new Set(Array.isArray(state.draft.tags) ? state.draft.tags : []);
    tags.has(tag) ? tags.delete(tag) : tags.add(tag);
    state.draft.tags = Array.from(tags);
    state.open = true;
    await this.#renderEffectWizardChange();
  }

  async #onEffectWizardTarget(event) {
    event.preventDefault();
    event.stopPropagation();
    const state = this.#getEffectWizardState();
    const targetId = String(event.currentTarget?.dataset?.effectWizardTarget || '').trim();
    const target = this.#findEffectWizardTarget(targetId);
    if (!target) return;
    state.draft.targetId = target.id;
    state.draft.target = { label: target.label, id: target.id };
    if (state.mode === 'advanced' && target.advancedPath) state.draft.rawPath = target.advancedPath;
    if (target.intent?.transfer === false) state.draft.transfer = false;
    if (String(state.draft.filterType || 'all') === 'skill' && !state.draft.filterValue) {
      state.draft.filterValue = this.#effectWizardDefaultFilterValue('skill', state.draft);
    }
    state.open = true;
    await this.#renderEffectWizardChange();
  }

  async #onEffectWizardOperation(event) {
    event.preventDefault();
    event.stopPropagation();
    const state = this.#getEffectWizardState();
    const operationId = String(event.currentTarget?.dataset?.effectWizardOperation || 'increase').trim();
    const operation = this.#findEffectWizardOperation(operationId);
    if (!operation) return;
    state.draft.operation = operation.id;
    state.draft.advancedMode = Number(operation.advancedMode ?? state.draft.advancedMode ?? 2) || 2;
    if (['increase', 'decrease'].includes(operation.id)) {
      const amount = Math.max(0, Number(state.draft.amount ?? 1) || 1);
      state.draft.advancedValue = String(operation.id === 'decrease' ? -Math.abs(amount) : amount);
    }
    state.open = true;
    await this.#renderEffectWizardChange();
  }

  async #onEffectWizardCondition(event) {
    event.preventDefault();
    event.stopPropagation();
    const id = String(event.currentTarget?.dataset?.effectWizardCondition || '').trim();
    const selected = this.#findEffectWizardCondition(id);
    if (!selected) return;
    this.#applyEffectWizardConditionToDraft(selected);
    await this.#renderEffectWizardChange();
  }

  async #onEffectWizardAmountNudge(event) {
    event.preventDefault();
    event.stopPropagation();
    const state = this.#getEffectWizardState();
    const delta = Number(event.currentTarget?.dataset?.effectWizardAmountNudge || 0) || 0;
    const current = Number(state.draft.amount ?? 1) || 1;
    state.draft.amount = Math.max(0, current + delta);
    if (!state.draft.advancedValue || /^-?\d+(\.\d+)?$/.test(String(state.draft.advancedValue))) {
      state.draft.advancedValue = String(state.draft.operation === 'decrease' ? -Math.abs(state.draft.amount) : state.draft.amount);
    }
    state.open = true;
    await this.#renderEffectWizardChange();
  }

  async #onEffectWizardSaveDraft(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.#canMutateEntityEffects()) return;
    await this.#persistEffectWizardDraft({ notify: true });
  }

  async #onEffectWizardClearDraft(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.#canMutateEntityEffects()) return;
    await this.#openEffectActionConfirm({
      type: 'clear-draft',
      title: 'Clear Saved Effect Draft?',
      message: 'This removes the saved wizard draft from this item. The current open wizard state will stay available until the sheet closes.',
      confirmLabel: 'Clear Draft',
      tone: 'warn'
    });
  }

  async #onEffectActionCancel(event) {
    event.preventDefault();
    event.stopPropagation();
    this.#clearEffectActionConfirmState();
    await this.#renderEffectWizardChange();
  }

  async #onEffectActionConfirm(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.#canMutateEntityEffects()) return;
    const state = this._effectActionConfirmState;
    this.#clearEffectActionConfirmState();
    if (!state?.type) {
      await this.#renderEffectWizardChange();
      return;
    }
    if (state.type === 'clear-draft') {
      await this.#clearEffectWizardDraft({ notify: true });
      await this.#renderEffectWizardChange();
      return;
    }
    if (state.type === 'delete-effect') {
      const effectId = state.effectId;
      if (effectId) await this.item.deleteEmbeddedDocuments('ActiveEffect', [effectId], { source: 'swse-entity-dialog-delete-effect' });
      await this.#renderPreservingEntityView({ force: true });
      return;
    }
    if (state.type === 'convert-effect-basic') {
      const effectId = state.effectId;
      const effect = this.#getEffectDocument(effectId);
      const update = effect ? EffectIntentEngine.buildBasicConversionUpdateData(effect.toObject?.() ?? effect) : null;
      if (update?._id) {
        await this.item.updateEmbeddedDocuments('ActiveEffect', [update], { source: 'swse-entity-dialog-convert-effect-basic' });
        ui.notifications?.info?.(`Converted ${effect.name || 'Advanced effect'} to Basic.`);
      }
      await this.#renderPreservingEntityView({ force: true });
    }
  }

  #buildEffectWizardEffectData() {
    const state = this.#getEffectWizardState();
    const draft = state.draft ?? {};
    const name = String(draft.name || '').trim() || (state.mode === 'advanced' ? 'Advanced SWSE Effect' : 'New SWSE Effect');
    if (state.mode === 'advanced') {
      const operation = this.#findEffectWizardOperation(draft.operation || 'increase');
      const key = this.#effectWizardAdvancedPath();
      if (!this.#isValidEffectWizardRawPath(key)) throw new Error('Choose a valid raw SWSE/Foundry path before creating this Advanced effect.');
      const numericAmount = Number(draft.amount ?? 1) || 1;
      const value = draft.advancedValue != null && String(draft.advancedValue).trim() !== ''
        ? String(draft.advancedValue).trim()
        : String(operation?.id === 'decrease' ? -Math.abs(numericAmount) : numericAmount);
      const effectData = EffectIntentEngine.buildAdvancedEffectData({
        name,
        key,
        mode: Number(draft.advancedMode ?? operation?.advancedMode ?? 2) || 2,
        value,
        priority: Number(draft.priority ?? 20) || 20
      });
      effectData.icon = draft.icon || 'icons/svg/aura.svg';
      effectData.disabled = draft.activeState === 'disabled';
      effectData.transfer = draft.transfer !== false;
      if (draft.description) effectData.description = String(draft.description);
      effectData.flags = effectData.flags ?? {};
      effectData.flags['foundryvtt-swse'] = {
        ...(effectData.flags['foundryvtt-swse'] ?? {}),
        effectWizard: { mode: 'advanced', tags: Array.isArray(draft.tags) ? draft.tags : [], createdFromWizard: true }
      };
      return effectData;
    }
    const target = this.#findEffectWizardTarget(draft.targetId);
    if (!target) throw new Error('Choose a target before creating this Basic effect.');
    const intent = this.#effectWizardIntentFromDraft();
    const effectData = EffectIntentEngine.buildActiveEffectData(intent, { name });
    effectData.icon = draft.icon || 'icons/svg/aura.svg';
    const engineDescription = effectData.description || EffectIntentEngine.describeIntent(intent);
    effectData.description = draft.description ? `${String(draft.description).trim()}\n\n${engineDescription}` : engineDescription;
    effectData.flags = effectData.flags ?? {};
    effectData.flags['foundryvtt-swse'] = {
      ...(effectData.flags['foundryvtt-swse'] ?? {}),
      effectWizard: {
        mode: 'basic',
        tags: Array.isArray(draft.tags) ? draft.tags : [],
        targetId: target.id,
        targetLabel: target.label,
        createdFromWizard: true
      }
    };
    return effectData;
  }

  async #onEffectWizardCreate(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.#canMutateEntityEffects()) return;
    const closeAfter = event.currentTarget?.dataset?.effectWizardCreate === 'close';
    let effectData;
    try {
      effectData = this.#buildEffectWizardEffectData();
    } catch (err) {
      ui.notifications?.warn?.(err?.message || 'Effect wizard draft is incomplete.');
      return;
    }
    const state = this.#getEffectWizardState();
    const editEffectId = String(state.draft?.editEffectId || '').trim();
    const existing = editEffectId ? this.#getEffectDocument(editEffectId) : null;
    if (closeAfter) state.open = false;
    if (existing) {
      const stampedData = EffectIntentEngine.stampLifecycle(effectData, { actor: this.item?.actor });
      if (state.mode === 'advanced') {
        stampedData.flags = stampedData.flags ?? {};
        stampedData.flags['foundryvtt-swse'] = {
          ...(stampedData.flags['foundryvtt-swse'] ?? {}),
          '-=effectIntent': null,
          '-=effectLifecycle': null
        };
      }
      await this.item.updateEmbeddedDocuments('ActiveEffect', [{ _id: editEffectId, ...stampedData }], { source: 'swse-effect-wizard-update' });
      if (this.#getSavedEffectWizardDraft()) await this.#clearEffectWizardDraft({ notify: false });
      this._entityDialogDirty = false;
      await this.#renderPreservingEntityView({ force: true });
      ui.notifications?.info?.(`Updated Active Effect: ${effectData.name}`);
      return;
    }
    const created = await this.#createEmbeddedActiveEffect(effectData, { source: 'swse-effect-wizard-create' });
    if (created) {
      if (this.#getSavedEffectWizardDraft()) await this.#clearEffectWizardDraft({ notify: false });
      ui.notifications?.info?.(`Created Active Effect: ${effectData.name}`);
    }
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
        if (button.matches('.close-btn, .entity-dialog-edit, .entity-dialog-window-control, [data-effect-wizard-close]')) return;
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
      const wizardState = this.#getEffectWizardState();
      if (wizardState.open) {
        wizardState.open = false;
        this.#renderEffectWizardChange();
        return;
      }
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

    const entityDialog = buildEntityDialogContext({
      item: itemData,
      system: systemData,
      editable,
      baseEditable,
      actorCredits,
      actor,
      mode: entityMode,
      dirty: !!this._entityDialogDirty,
      effects: itemEffects
    });
    entityDialog.effectWizard = this.#buildEffectWizardContext({ editable: entityDialog.effectEditor?.editable });

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
      bladeColorOptions: Object.entries(BLADE_COLOR_MAP).map(([name, hex]) => ({ name, hex, label: name.charAt(0).toUpperCase() + name.slice(1) })),
      entityDialog,
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
    const effect = this.#getEffectDocument(effectId);
    await this.#openEffectActionConfirm({
      type: 'delete-effect',
      effectId,
      title: 'Delete Active Effect?',
      message: 'This removes the effect from this item. This cannot be undone.',
      detail: effect?.name || effect?.label || 'Active Effect',
      confirmLabel: 'Delete Effect',
      tone: 'danger'
    });
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


  async #onEditEffectWithWizard(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!this.#canMutateEntityEffects()) return;
    const effectId = event.currentTarget?.dataset?.entityEffectEditWizard;
    const mode = String(event.currentTarget?.dataset?.effectWizardEditMode || '').toLowerCase() === 'advanced' ? 'advanced' : null;
    const effect = this.#getEffectDocument(effectId);
    if (!effect) return;
    const seeded = this.#seedEffectWizardFromEffect(effect, { mode });
    if (!seeded) {
      ui.notifications?.warn?.('This effect could not be loaded into the wizard. Use the raw drawer instead.');
      return;
    }
    ui.notifications?.info?.('Loaded the existing effect into the Effect Wizard. Review and update it when ready.');
    await this.#renderEffectWizardChange();
  }

  async #onLoadAdvancedEffectAsBasic(event) {
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
    const effectName = effect.name || effect.label || 'Converted Basic Effect';
    this._effectWizardState = this.#createDefaultEffectWizardState('basic');
    this._effectWizardState.open = true;
    this._effectWizardState.step = 4;
    this._effectWizardState.draft.name = effectName;
    this._effectWizardState.draft.operation = conversion.intent?.operation || 'increase';
    this._effectWizardState.draft.amount = Number(conversion.intent?.amount ?? 1) || 1;
    this._effectWizardState.draft.bonusType = conversion.intent?.bonusType || 'untyped';
    this._effectWizardState.draft.application = conversion.intent?.application || 'always';
    this._effectWizardState.draft.transfer = conversion.intent?.transfer !== false;
    const wantedCategory = conversion.intent?.category;
    const wantedTarget = conversion.intent?.target;
    for (const group of EffectIntentEngine.wizardTargets()) {
      const match = (group.targets ?? []).find(target => target.intent?.category === wantedCategory && String(target.intent?.target || '') === String(wantedTarget || ''));
      if (match) {
        this._effectWizardState.draft.targetId = match.id;
        this._effectWizardState.draft.target = { label: match.label, id: match.id };
        break;
      }
    }
    ui.notifications?.info?.('Loaded the recognized Advanced effect into the Effect Wizard. Review it, then create or convert when ready.');
    await this.#renderEffectWizardChange();
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
    await this.#openEffectActionConfirm({
      type: 'convert-effect-basic',
      effectId,
      title: 'Convert Advanced Effect to Basic?',
      message: 'This adds a Basic SWSE intent and moves the raw change rows into an Advanced backup flag so the same bonus is not applied twice.',
      detail: conversion.description || effect.name || effect.label || 'Advanced effect',
      confirmLabel: 'Convert to Basic',
      tone: 'ok'
    });
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

  #syncEffectWizardControls(root) {
    root?.querySelectorAll?.('[data-effect-wizard-open]')?.forEach((button) => button.addEventListener('click', this.#openEffectWizard.bind(this)));
    root?.querySelectorAll?.('[data-effect-wizard-close]')?.forEach((button) => button.addEventListener('click', this.#closeEffectWizard.bind(this)));
    root?.querySelectorAll?.('[data-effect-wizard-mode]')?.forEach((button) => button.addEventListener('click', this.#onEffectWizardMode.bind(this)));
    root?.querySelectorAll?.('[data-effect-wizard-step-select]')?.forEach((button) => button.addEventListener('click', this.#onEffectWizardStep.bind(this)));
    root?.querySelectorAll?.('[data-effect-wizard-nav]')?.forEach((button) => button.addEventListener('click', this.#onEffectWizardNav.bind(this)));
    root?.querySelectorAll?.('[data-effect-wizard-field]')?.forEach((control) => {
      const eventName = control.tagName === 'SELECT' || control.type === 'checkbox' ? 'change' : 'input';
      control.addEventListener(eventName, this.#onEffectWizardField.bind(this));
    });
    root?.querySelectorAll?.('[data-effect-wizard-preset]')?.forEach((button) => button.addEventListener('click', this.#onEffectWizardPreset.bind(this)));
    root?.querySelectorAll?.('[data-effect-wizard-icon]')?.forEach((button) => button.addEventListener('click', this.#onEffectWizardIcon.bind(this)));
    root?.querySelectorAll?.('[data-effect-wizard-tag]')?.forEach((button) => button.addEventListener('click', this.#onEffectWizardTag.bind(this)));
    root?.querySelectorAll?.('[data-effect-wizard-target]')?.forEach((button) => button.addEventListener('click', this.#onEffectWizardTarget.bind(this)));
    root?.querySelectorAll?.('[data-effect-wizard-operation]')?.forEach((button) => button.addEventListener('click', this.#onEffectWizardOperation.bind(this)));
    root?.querySelectorAll?.('[data-effect-wizard-condition]')?.forEach((button) => button.addEventListener('click', this.#onEffectWizardCondition.bind(this)));
    root?.querySelectorAll?.('[data-effect-wizard-amount-nudge]')?.forEach((button) => button.addEventListener('click', this.#onEffectWizardAmountNudge.bind(this)));
    root?.querySelectorAll?.('[data-effect-wizard-save-draft]')?.forEach((button) => button.addEventListener('click', this.#onEffectWizardSaveDraft.bind(this)));
    root?.querySelectorAll?.('[data-effect-wizard-clear-draft]')?.forEach((button) => button.addEventListener('click', this.#onEffectWizardClearDraft.bind(this)));
    root?.querySelectorAll?.('[data-effect-wizard-create]')?.forEach((button) => button.addEventListener('click', this.#onEffectWizardCreate.bind(this)));
    root?.querySelectorAll?.('[data-effect-action-confirm]')?.forEach((button) => button.addEventListener('click', this.#onEffectActionConfirm.bind(this)));
    root?.querySelectorAll?.('[data-effect-action-cancel]')?.forEach((button) => button.addEventListener('click', this.#onEffectActionCancel.bind(this)));
  }

  #syncEntityEffectControls(root) {
    this.#syncEffectWizardControls(root);
    root?.querySelectorAll?.('[data-entity-effect-toggle]')?.forEach((button) => button.addEventListener('click', this.#onToggleEffect.bind(this)));
    root?.querySelectorAll?.('[data-entity-effect-delete]')?.forEach((button) => button.addEventListener('click', this.#onDeleteEffect.bind(this)));
    root?.querySelectorAll?.('[data-entity-effect-duplicate]')?.forEach((button) => button.addEventListener('click', this.#onDuplicateEffect.bind(this)));
    root?.querySelectorAll?.('[data-entity-effect-edit-wizard]')?.forEach((button) => button.addEventListener('click', this.#onEditEffectWithWizard.bind(this)));
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

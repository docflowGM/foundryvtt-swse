import SWSEApplicationV2 from "/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js";
import { FeatChoiceResolver } from "/systems/foundryvtt-swse/scripts/engine/progression/feats/feat-choice-resolver.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

function getAppRoot(app) {
  if (app?.element instanceof HTMLElement) return app.element;
  if (app?.element?.[0] instanceof HTMLElement) return app.element[0];
  return document.getElementById?.(app?.id) || null;
}

function optionKey(option, index = 0) {
  return String(
    FeatChoiceResolver.getSelectedChoiceKey(option) ||
    option?.id ||
    option?.value ||
    option?.key ||
    index
  );
}

function humanizeChoiceToken(value) {
  const text = String(value || '').trim();
  if (!text || text === '[object Object]') return '';
  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function optionLabel(option) {
  const direct = option?.label || option?.name || option?.displayName || option?.slug || option?.key || option?.value || option?.id;
  const text = String(direct || '').trim();
  if (!text || text === '[object Object]') return 'Choice';
  return option?.label || option?.name || option?.displayName || humanizeChoiceToken(text);
}

function optionSource(option, { showSource = true } = {}) {
  if (!showSource) return '';
  if (option?.locked && !option?.providerLocked) return 'Locked';
  if (option?.providerLocked) return '';
  return String(option?.source || option?.prerequisiteSource || 'Available');
}

class FeatChoiceAppV2 extends SWSEApplicationV2 {
  static DEFAULT_OPTIONS = {
    ...SWSEApplicationV2.DEFAULT_OPTIONS,
    id: 'swse-feat-choice-dialog',
    classes: [
      ...(SWSEApplicationV2.DEFAULT_OPTIONS?.classes || []),
      'swse-feat-choice-dialog-app'
    ],
    position: {
      width: 540,
      height: 'auto'
    },
    window: {
      title: 'Feat Choice',
      resizable: false,
      draggable: true,
      frame: true
    }
  };

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/choices/feat-choice-dialog.hbs'
    }
  };

  constructor({
    title = 'Feat Choice',
    heading = 'Choose one option',
    message = '',
    helper = '',
    options = [],
    selectedKey = '',
    confirmLabel = 'Save Choice',
    cancelLabel = 'Cancel',
    fieldName = 'swseFeatChoice',
    showSources = true
  } = {}) {
    super({});
    this.dialogTitle = title;
    this.heading = heading;
    this.message = message;
    this.helper = helper;
    this.optionsList = Array.isArray(options) ? options : [];
    this.selectedKey = String(selectedKey || '');
    this.confirmLabel = confirmLabel;
    this.cancelLabel = cancelLabel;
    this.fieldName = fieldName;
    this.showSources = showSources !== false;
    this.result = null;
    this.onDecision = null;
    this._settled = false;
    this._choiceMap = new Map();
  }

  static async prompt(options = {}) {
    const dialog = new this(options);
    return new Promise((resolve) => {
      dialog.onDecision = resolve;
      dialog.render(true);
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    this._choiceMap = new Map();
    const choices = this.optionsList.map((option, index) => {
      const key = optionKey(option, index);
      this._choiceMap.set(key, option);
      return {
        key,
        label: optionLabel(option),
        source: optionSource(option, { showSource: this.showSources }),
        locked: Boolean(option?.locked && !option?.providerLocked),
        showSource: this.showSources && !!optionSource(option, { showSource: this.showSources }),
        checked: this.selectedKey && this.selectedKey === key
      };
    });

    return {
      ...context,
      title: this.dialogTitle,
      heading: this.heading,
      message: this.message,
      helper: this.helper,
      confirmLabel: this.confirmLabel,
      cancelLabel: this.cancelLabel,
      fieldName: this.fieldName,
      hasChoices: choices.length > 0,
      choices,
      showSources: this.showSources
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const root = getAppRoot(this);
    if (!root) {
      console.warn('[FeatChoiceAppV2] Unable to bind modal controls: root element missing');
      return;
    }
    root.style.zIndex = String(Math.max(Number(root.style.zIndex || 0), 120000));

    const form = root.querySelector('[data-feat-choice-form]');
    const confirm = root.querySelector('[data-action="confirm-feat-choice"]');
    const cancel = root.querySelector('[data-action="cancel-feat-choice"]');

    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      await this.#submit(root);
    });

    confirm?.addEventListener('click', async (event) => {
      event.preventDefault();
      await this.#submit(root);
    });

    cancel?.addEventListener('click', async (event) => {
      event.preventDefault();
      this.#settle(null);
      await this.close();
    });

    window.requestAnimationFrame(() => {
      root.querySelector(`input[name="${this.fieldName}"]`)?.focus?.();
    });
  }

  async #submit(root) {
    const input = root.querySelector(`input[name="${this.fieldName}"]:checked`);
    if (!input) {
      ui.notifications?.warn?.('Choose an option before saving.');
      return;
    }

    const selected = this._choiceMap.get(String(input.value));
    this.#settle(selected ?? null);
    await this.close();
  }

  #settle(value) {
    if (this._settled) return;
    this._settled = true;
    this.result = value;
    if (typeof this.onDecision === 'function') {
      const resolve = this.onDecision;
      this.onDecision = null;
      resolve(this.result);
    }
  }

  async close(options = {}) {
    if (!this._settled) this.#settle(null);
    return super.close(options);
  }
}

async function promptOption(title, message, options) {
  return FeatChoiceAppV2.prompt({
    title,
    heading: title,
    message: message || '',
    options,
    confirmLabel: 'Continue',
    cancelLabel: 'Cancel',
    fieldName: `swseFeatChoice-${Math.random().toString(36).slice(2)}`
  });
}

export class FeatChoiceDialog {
  static async prompt(actor, itemOrFeat, { title = null, allowCancel = true, context = {}, pending = null } = {}) {
    const meta = FeatChoiceResolver.getChoiceMeta(itemOrFeat);
    if (!meta?.required) return null;
    if (FeatChoiceResolver.isClassGrantedItem(itemOrFeat)) {
      ui.notifications?.warn?.(`${itemOrFeat.name} is a locked class grant and cannot be changed.`);
      return null;
    }

    const resolutionContext = pending ? { ...context, pending } : (context || {});
    let options = await FeatChoiceResolver.resolveOptions(actor, itemOrFeat, resolutionContext);
    if (meta.choiceKind === 'skill_focus') {
      options = options.filter(option => option?.trained === true || String(option?.source || '').toLowerCase().includes('trained'));
      if (!options.length) {
        ui.notifications?.warn?.('Skill Focus requires a trained skill. Train a skill before choosing this feat.');
        return null;
      }
    }
    const current = FeatChoiceResolver.getStoredChoice(actor, itemOrFeat);
    const selectedKey = FeatChoiceResolver.getSelectedChoiceKey(current);
    const helper = meta.choiceSource === 'grantPool' || FeatChoiceResolver.inferChoiceSource(itemOrFeat) === 'grantPool'
      ? 'This feat unlocks progression slots. The dedicated progression step resolves the granted selections later.'
      : '';

    const choiceKind = String(meta.choiceKind || '').toLowerCase();
    const simpleWeaponGroupChoice = [
      'weapon_focus',
      'greater_weapon_focus',
      'weapon_specialization',
      'greater_weapon_specialization',
      'weapon_group_or_exotic',
      'weapon_focus_choice',
      'double_attack_weapon',
      'triple_attack_weapon',
      'double_attack_followup_weapon',
      'return_fire_weapon',
      'melee_weapon_or_group',
      'triple_crit_specialist_weapon'
    ].includes(choiceKind);
    const choiceMessages = {
      skill_focus: 'Pick the trained skill this ability should apply to.',
      skill_training: 'Pick the skill this ability should train.',
      trained_skill: 'Pick the trained skill this ability should apply to.',
      owned_force_power: 'Pick the Force power this talent should apply to.',
      force_power_focus: 'Pick the Force power this feat should apply to.',
      talent_choice: 'Pick the talent this ability should reference.',
      vehicle_type: 'Pick the vehicle type this talent should apply to.',
      knowledge_field: 'Pick the Knowledge field this talent should apply to.',
      medical_treatment_method: 'Pick the medical treatment method this talent should apply to.'
    };

    let selected = await FeatChoiceAppV2.prompt({
      title: title || `Choose: ${itemOrFeat?.name || 'Ability Choice'}`,
      heading: `${itemOrFeat?.name || 'Ability'} requires a choice.`,
      message: simpleWeaponGroupChoice ? 'Pick the weapon group or qualifying weapon this ability should apply to.' : (choiceMessages[choiceKind] || 'Pick the option this ability should apply to.'),
      helper,
      options,
      selectedKey,
      confirmLabel: 'Save Choice',
      cancelLabel: allowCancel ? 'Cancel' : 'Later',
      showSources: !simpleWeaponGroupChoice
    });

    if (!selected) return null;

    if (selected?.id === 'exotic' || selected?.branch === 'exoticWeapons') {
      const registry = await FeatChoiceResolver.loadRegistry();
      const category = await promptOption('Choose Exotic Weapon Category', 'Choose the kind of exotic weapon proficiency.', [
        { id: 'melee', value: 'melee', label: 'Exotic Melee Weapons' },
        { id: 'ranged', value: 'ranged', label: 'Exotic Ranged Weapons' }
      ]);
      if (!category) return null;
      const weaponOptions = (registry.exoticWeapons?.[category.value] || []).map((name) => ({
        id: `exotic:${category.value}:${String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        value: String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        label: name,
        group: 'exotic',
        category: category.value,
        weapon: name
      }));
      const weapon = await promptOption('Choose Exotic Weapon', `Choose the specific ${category.label}.`, weaponOptions);
      if (!weapon) return null;
      selected = weapon;
    }

    const validation = await FeatChoiceResolver.validateSelectedChoice(actor, itemOrFeat, selected, resolutionContext);
    if (!validation.valid) {
      ui.notifications?.error?.(validation.errors.join(' '));
      return null;
    }

    return selected;
  }

  static async promptAndApply(actor, item) {
    const selected = await this.prompt(actor, item);
    if (!selected) return false;
    const patch = FeatChoiceResolver.buildChoicePatch(item, selected);
    if (!patch) return false;
    if (item.isEmbedded && item.actor) {
      await ActorEngine.updateEmbeddedDocuments(item.actor, 'Item', [{ _id: item.id, ...patch }]);
    } else {
      await item.update(patch);
    }
    return true;
  }
}

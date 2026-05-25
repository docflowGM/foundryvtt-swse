/**
 * Template Selection Dialog — AppV2 Galactic Profile picker
 *
 * ApplicationV2-native replacement for the older DialogV2 inheritance path.
 * The picker owns its own controls and uses the existing template registry.
 */

import SWSEApplicationV2 from '/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js';
import { TemplateRegistry } from '/systems/foundryvtt-swse/scripts/engine/progression/template/template-registry.js';
import { swseLogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const SYSTEM_ROOT = 'systems/foundryvtt-swse';
const TEMPLATE_ASSET_ROOT = `${SYSTEM_ROOT}/assets/templates`;
const CLASS_ASSET_ROOT = `${SYSTEM_ROOT}/assets/class`;

const TEMPLATE_IMAGE_ALIASES = {
  scoundrel_outlaw: 'scoundrel_outlaw.webp',
  scout_outlaw: 'scoundrel_outlaw.webp',
  scout_engineer: 'scout_skirmisher.webp',
  scout_pistoleer: 'scout_skirmisher.webp',
  soldier_commando: 'soldier_rifleman.webp',
  nonheroic_worker: 'Worker.webp',
  nonheroic_merchant: 'merchant.webp',
  nonheroic_police: 'Police.webp',
};

function getAppRoot(app) {
  if (app?.element instanceof HTMLElement) return app.element;
  if (app?.element?.[0] instanceof HTMLElement) return app.element[0];
  return document.getElementById?.(app?.id) || null;
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function classImagePath(className) {
  const safeClass = String(className || '').trim();
  if (!safeClass) return `${TEMPLATE_ASSET_ROOT}/Jedi.webp`;
  return `${CLASS_ASSET_ROOT}/${safeClass}.webp`;
}

function templateImagePath(template) {
  const className = template?.classId?.name || template?.className || 'Jedi';
  const templateId = slugify(template?.id);
  const nameSlug = slugify(template?.name || template?.archetype);
  const classSlug = slugify(className);
  const path = String(template?.imagePath || '');

  const originalFile = path.split('/').pop() || '';
  const originalSlug = originalFile.replace(/\.[^.]+$/, '');
  const aliasFile = TEMPLATE_IMAGE_ALIASES[templateId]
    || TEMPLATE_IMAGE_ALIASES[originalSlug]
    || TEMPLATE_IMAGE_ALIASES[`${classSlug}_${nameSlug}`]
    || null;

  if (aliasFile) return `${TEMPLATE_ASSET_ROOT}/${aliasFile}`;

  // Prefer the canonical assets/templates location for archetype art.
  if (classSlug && nameSlug) return `${TEMPLATE_ASSET_ROOT}/${classSlug}_${nameSlug}.webp`;
  if (path.includes('/assets/templates/')) return path;

  return classImagePath(className);
}

function prepareTemplateForDisplay(template) {
  const className = template?.classId?.name || template?.className || 'Other';
  const prepared = foundry.utils.deepClone?.(template) ?? { ...template };
  prepared.displayClassName = className;
  prepared.imagePath = templateImagePath(template);
  prepared.classImagePath = classImagePath(className);
  return prepared;
}

export class TemplateSelectionDialog extends SWSEApplicationV2 {
  static DEFAULT_OPTIONS = {
    ...SWSEApplicationV2.DEFAULT_OPTIONS,
    id: 'swse-template-selection-dialog',
    classes: [
      ...(SWSEApplicationV2.DEFAULT_OPTIONS?.classes || []),
      'swse-template-selection-dialog-app'
    ],
    window: {
      title: 'Galactic Profile Selection',
      icon: 'fas fa-scroll',
      resizable: true,
      draggable: true,
      frame: true,
    },
    position: {
      width: 980,
      height: 760,
    },
  };

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/progression-framework/dialogs/template-selection.hbs'
    }
  };

  constructor({ actor = null, subtype = 'actor', templates = [], resolve = null } = {}) {
    super({});
    this.actor = actor;
    this.subtype = subtype || 'actor';
    this.selectedTemplate = null;
    this.templates = Array.isArray(templates) ? templates : [];
    this.templatesByClass = {};
    this.classes = [];
    this.selectedClass = null;
    this.nonheroicTemplates = [];
    this._resolve = typeof resolve === 'function' ? resolve : null;
    this._settled = false;
  }

  /**
   * Show template selection dialog and return chosen template ID, null for
   * freeform, or false for cancel/close.
   *
   * @param {Actor} actor
   * @param {object} options
   * @param {string} options.subtype
   * @returns {Promise<string|null|false>}
   */
  static async showChoiceDialog(actor, options = {}) {
    const { subtype = 'actor' } = options;
    let templates = await TemplateRegistry.getAllTemplates();

    if (!templates || templates.length === 0) {
      swseLogger.warn('[TemplateSelectionDialog] No templates available; skipping dialog');
      return null;
    }

    templates = this._filterTemplatesBySubtype(templates, subtype).map(prepareTemplateForDisplay);

    if (templates.length === 0) {
      swseLogger.warn('[TemplateSelectionDialog] No templates available for subtype', { subtype });
      return null;
    }

    return new Promise((resolve) => {
      const dialog = new this({ actor, subtype, templates, resolve });
      dialog.render(true);
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    const templates = Array.isArray(this.templates) ? this.templates : [];
    const heroicTemplates = templates.filter(t => t?.isNonheroic !== true);
    const nonheroicTemplates = templates.filter(t => t?.isNonheroic === true);

    this.templatesByClass = {};
    for (const template of heroicTemplates) {
      const className = template?.displayClassName || template?.classId?.name || template?.className || 'Other';
      if (!this.templatesByClass[className]) this.templatesByClass[className] = [];
      this.templatesByClass[className].push(template);
    }

    this.classes = Object.entries(this.templatesByClass).map(([name, entries]) => ({
      name,
      count: entries.length,
      imagePath: classImagePath(name),
      active: !this.selectedClass || this.selectedClass === name,
    }));

    if (!this.selectedClass && this.classes.length) {
      this.selectedClass = this.classes[0].name;
      this.classes[0].active = true;
    }

    this.nonheroicTemplates = nonheroicTemplates;

    swseLogger.log('[TemplateSelectionDialog] Templates prepared', {
      heroicCount: heroicTemplates.length,
      nonheroicCount: nonheroicTemplates.length,
      totalCount: templates.length,
      subtype: this.subtype,
    });

    return {
      ...context,
      actor: this.actor,
      subtype: this.subtype,
      classes: this.classes,
      templatesByClass: this.templatesByClass,
      selectedClass: this.selectedClass,
      visibleTemplates: this.templatesByClass[this.selectedClass] || heroicTemplates,
      selectedTemplate: this.selectedTemplate,
      templates,
      hasTemplates: templates.length > 0,
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = getAppRoot(this);
    if (!root) {
      swseLogger.warn('[TemplateSelectionDialog] Unable to bind controls: root element missing');
      return;
    }

    root.style.zIndex = String(Math.max(Number(root.style.zIndex || 0), 120000));

    root.querySelectorAll('[data-template-class]').forEach(card => {
      card.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.selectedClass = card.dataset.templateClass || this.selectedClass;
        this.selectedTemplate = null;
        this.render(true);
      });
    });

    root.querySelectorAll('[data-template-id]').forEach(card => {
      card.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this._selectTemplate(card.dataset.templateId);
      });
    });

    root.querySelectorAll('[data-button]').forEach(button => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this._onButtonClick(event);
      });
    });

    root.querySelectorAll('img[data-fallback-src]').forEach(img => {
      img.addEventListener('error', () => {
        const fallback = img.dataset.fallbackSrc;
        if (fallback && img.src !== fallback) img.src = fallback;
      }, { once: true });
    });

    this._updateConfirmButton();
  }

  _selectTemplate(templateId) {
    const selected = String(templateId || '');
    if (!selected) return;

    this.selectedTemplate = selected;
    const template = this.templates.find(t => String(t?.id) === selected);

    swseLogger.debug('[TemplateSelectionDialog] Template selected', {
      templateId: selected,
      templateName: template?.name,
    });

    const root = getAppRoot(this);
    if (!root) return;

    root.querySelectorAll('[data-template-id]').forEach(card => card.classList.remove('selected'));
    const escaped = globalThis.CSS?.escape ? CSS.escape(selected) : selected.replace(/["\\]/g, "\\$&");
    const selectedCard = root.querySelector(`[data-template-id="${escaped}"]`);
    selectedCard?.classList?.add?.('selected');
    this._updateConfirmButton();
  }

  _updateConfirmButton() {
    const root = getAppRoot(this);
    const confirmBtn = root?.querySelector?.('[data-button="confirm"]');
    if (confirmBtn) confirmBtn.disabled = !this.selectedTemplate;
  }

  async _onButtonClick(event) {
    const button = event?.target?.closest?.('[data-button]');
    if (!button) return;

    const action = String(button.dataset.button || '');

    if (action === 'freeform') {
      swseLogger.log('[TemplateSelectionDialog] User chose freeform chargen');
      await this._settle(null);
      return;
    }

    if (action === 'confirm') {
      if (!this.selectedTemplate) return;
      swseLogger.log('[TemplateSelectionDialog] User chose template', {
        templateId: this.selectedTemplate,
      });
      await this._settle(this.selectedTemplate);
      return;
    }

    if (action === 'cancel') {
      swseLogger.log('[TemplateSelectionDialog] User cancelled');
      await this._settle(false);
    }
  }

  async _settle(value) {
    if (this._settled) return;
    this._settled = true;
    const resolver = this._resolve;
    this._resolve = null;
    try {
      resolver?.(value);
    } finally {
      await this.close({ force: true });
    }
  }

  async close(options = {}) {
    if (!this._settled) {
      this._settled = true;
      const resolver = this._resolve;
      this._resolve = null;
      resolver?.(false);
    }
    return super.close(options);
  }

  /**
   * Filter templates by progression subtype.
   *
   * @param {Array} templates
   * @param {string} subtype
   * @returns {Array}
   * @private
   */
  static _filterTemplatesBySubtype(templates, subtype) {
    if (!Array.isArray(templates)) return [];

    if (subtype === 'nonheroic' || subtype === 'beast' || subtype === 'follower') {
      return templates.filter(t => t?.isNonheroic === true);
    }

    if (subtype === 'droid') {
      return templates.filter(t => {
        if (t?.isNonheroic === true) return false;
        const classId = String(t?.classId?.id || t?.classId || '').toLowerCase();
        return !classId.includes('force') && !classId.includes('jedi') && !classId.includes('sith');
      });
    }

    if (subtype === 'actor') {
      return templates.filter(t => t?.isNonheroic !== true);
    }

    return templates;
  }
}

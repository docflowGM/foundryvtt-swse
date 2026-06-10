import { VehiclePackDataLoader } from "/systems/foundryvtt-swse/scripts/core/vehicle-pack-data-loader.js";
import { VehicleImportEngine } from "/systems/foundryvtt-swse/scripts/engine/import/vehicle-import-engine.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const TEMPLATE = 'systems/foundryvtt-swse/templates/apps/vehicle-import-wizard.hbs';
const STEPS = [
  { key: 'browse', num: 1, label: 'Browse', meta: 'Search vehicle packs' },
  { key: 'preview', num: 2, label: 'Preview', meta: 'Inspect statblock' },
  { key: 'mode', num: 3, label: 'Mode', meta: 'Choose import mode' },
  { key: 'confirm', num: 4, label: 'Confirm', meta: 'Apply vehicle' }
];
const STEP_ORDER = STEPS.map((step) => step.key);

function lower(value) {
  return String(value ?? '').trim().toLowerCase();
}

export class VehicleImportWizard extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(ApplicationV2.DEFAULT_OPTIONS ?? {}), {
    classes: ['swse', 'swse-vehicle-import-wizard', 'swse-app'],
    width: 920,
    height: 780,
    title: 'Import Vehicle',
    window: { resizable: true }
  });

  static PARTS = {
    content: { template: TEMPLATE }
  };

  constructor(options = {}) {
    super(options);
    this.actor = options.actor || null;
    this.callback = options.callback || null;
    this.state = {
      step: 'browse',
      query: '',
      type: '',
      pack: '',
      sort: 'name',
      selectedId: null,
      selectedEntry: null,
      selectedDocument: null,
      mode: 'replace',
      preserve: { name: true, image: true },
      results: [],
      error: null,
      busy: false
    };
  }

  get title() {
    return `Import Vehicle - ${this.state.step.charAt(0).toUpperCase()}${this.state.step.slice(1)}`;
  }

  static create(options = {}) {
    const app = new VehicleImportWizard(options);
    const renderResult = app.render({ force: true });
    if (renderResult && typeof renderResult.catch === 'function') {
      renderResult.catch((err) => {
        console.error('[VehicleImportWizard] Failed to render import wizard:', err);
        ui?.notifications?.error?.(`Failed to open vehicle import wizard: ${err.message}`);
      });
    }
    return app;
  }

  async _prepareContext(options) {
    await this.#ensureResults();
    const selected = this.state.selectedEntry || this.#findSelectedEntry();
    if (selected && !this.state.selectedDocument && this.state.step !== 'browse') {
      this.state.selectedDocument = await VehiclePackDataLoader.loadVehicleDocument(selected);
    }

    return {
      actor: this.actor,
      step: this.state.step,
      currentStep: STEP_ORDER.indexOf(this.state.step) + 1,
      steps: this.#buildSteps(),
      query: this.state.query,
      selectedType: this.state.type,
      selectedPack: this.state.pack,
      selectedSort: this.state.sort,
      mode: this.state.mode,
      preserve: this.state.preserve,
      results: this.#filteredResults(),
      selected: selected || null,
      preview: this.#buildPreview(selected, this.state.selectedDocument),
      filters: this.#buildFilters(),
      canBack: this.#canBack(),
      canNext: this.#canNext(),
      canApply: this.#canApply(),
      error: this.state.error,
      busy: this.state.busy
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    if (!root) return;

    root.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', (event) => this.#handleAction(event));
    });

    root.querySelectorAll('[data-vehicle-entry-id]').forEach((el) => {
      el.addEventListener('click', async (event) => {
        event.preventDefault();
        await this.#selectEntry(el.dataset.vehicleEntryId);
      });
    });

    const search = root.querySelector('[data-field="search"]');
    search?.addEventListener('input', (event) => {
      this.state.query = event.currentTarget.value || '';
      this.render();
    });

    root.querySelectorAll('select[data-field]').forEach((select) => {
      select.addEventListener('change', (event) => {
        const field = event.currentTarget.dataset.field;
        if (!field) return;
        this.state[field] = event.currentTarget.value || '';
        this.render();
      });
    });

    root.querySelectorAll('[data-mode]').forEach((el) => {
      el.addEventListener('click', (event) => {
        event.preventDefault();
        this.state.mode = el.dataset.mode || 'replace';
        this.render();
      });
    });

    root.querySelectorAll('input[name^="preserve."]').forEach((input) => {
      input.addEventListener('change', (event) => {
        const key = event.currentTarget.name.split('.')[1];
        if (key) this.state.preserve[key] = !!event.currentTarget.checked;
        this.render();
      });
    });
  }

  async #ensureResults() {
    if (this.state.results.length) return;
    this.state.results = await VehiclePackDataLoader.loadVehicleIndex();
  }

  #buildSteps() {
    const current = STEP_ORDER.indexOf(this.state.step);
    return STEPS.map((step, index) => ({ ...step, active: step.key === this.state.step, complete: index < current }));
  }

  #buildFilters() {
    const types = new Set();
    const packs = new Map();
    for (const entry of this.state.results) {
      if (entry.type) types.add(entry.type);
      if (entry.packName) packs.set(entry.packName, entry.packLabel || entry.packName);
    }
    return {
      types: [...types].sort().map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) })),
      packs: [...packs.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label))
    };
  }

  #filteredResults() {
    const query = lower(this.state.query);
    const rows = this.state.results.filter((entry) => {
      if (query && !entry.searchText.includes(query)) return false;
      if (this.state.type && entry.type !== this.state.type) return false;
      if (this.state.pack && entry.packName !== this.state.pack) return false;
      return true;
    });
    const sort = this.state.sort || 'name';
    rows.sort((a, b) => {
      if (sort === 'type') return `${a.type} ${a.name}`.localeCompare(`${b.type} ${b.name}`);
      if (sort === 'pack') return `${a.packLabel} ${a.name}`.localeCompare(`${b.packLabel} ${b.name}`);
      return a.name.localeCompare(b.name);
    });
    return rows.slice(0, 250);
  }

  #findSelectedEntry() {
    return this.state.results.find((entry) => entry.id === this.state.selectedId) || null;
  }

  async #selectEntry(id) {
    this.state.selectedId = id;
    this.state.selectedEntry = this.#findSelectedEntry();
    this.state.selectedDocument = this.state.selectedEntry ? await VehiclePackDataLoader.loadVehicleDocument(this.state.selectedEntry) : null;
    this.render();
  }

  #buildPreview(entry, document) {
    if (!entry) return null;
    const system = document?.system || entry.raw?.system || {};
    return {
      name: document?.name || entry.name,
      img: document?.img || entry.img,
      pack: entry.packLabel,
      type: entry.type,
      category: system.category || entry.category || 'Vehicle',
      size: system.size || entry.size || '—',
      crew: system.crew || entry.crew || '—',
      cargo: system.cargo || entry.cargo || '—',
      hyperdrive: system.hyperdrive_class || system.hyperdrive || entry.hyperdrive || '—',
      sr: system.shields?.max ?? system.shieldRating ?? entry.sr ?? 0,
      cl: system.challengeLevel ?? entry.cl ?? '—',
      cost: system.cost || entry.cost || '—',
      speed: system.speed || '—'
    };
  }

  #canBack() {
    return STEP_ORDER.indexOf(this.state.step) > 0;
  }

  #canNext() {
    if (this.state.step === 'browse') return !!this.state.selectedId;
    if (this.state.step === 'confirm') return false;
    return true;
  }

  #canApply() {
    return this.state.step === 'confirm' && !!this.state.selectedDocument && !this.state.busy;
  }

  async #handleAction(event) {
    event.preventDefault();
    const action = event.currentTarget.dataset.action;
    if (action === 'close') return this.close();
    if (action === 'back') return this.#go(-1);
    if (action === 'next') return this.#go(1);
    if (action === 'apply') return this.#apply();
  }

  async #go(delta) {
    const index = STEP_ORDER.indexOf(this.state.step);
    const target = STEP_ORDER[Math.max(0, Math.min(STEP_ORDER.length - 1, index + delta))];
    this.state.step = target;
    if (this.state.selectedEntry && !this.state.selectedDocument) {
      this.state.selectedDocument = await VehiclePackDataLoader.loadVehicleDocument(this.state.selectedEntry);
    }
    this.render();
  }

  async #apply() {
    if (!this.actor || !this.state.selectedDocument) return;
    try {
      this.state.busy = true;
      this.state.error = null;

      if (this.state.mode === 'replace' && VehicleImportEngine.requiresReplaceConfirmation(this.actor)) {
        const confirmed = await Dialog.confirm({
          title: 'Replace Vehicle Data?',
          content: `<p><strong>${this.actor.name}</strong> already has items, crew assignments, or shipyard/customization data.</p><p>Replace mode may overwrite vehicle system data. Continue?</p>`,
          yes: () => true,
          no: () => false,
          defaultYes: false
        });
        if (!confirmed) {
          this.state.busy = false;
          this.render();
          return;
        }
      }

      await VehicleImportEngine.apply(this.actor, this.state.selectedDocument, {
        mode: this.state.mode,
        preserve: this.state.preserve
      });
      ui.notifications.info(`Imported ${this.state.selectedDocument.name} into ${this.actor.name}.`);
      this.callback?.();
      await this.close();
    } catch (err) {
      console.error('Vehicle import failed:', err);
      this.state.error = err.message || String(err);
      this.state.busy = false;
      this.render();
    }
  }
}

export default VehicleImportWizard;

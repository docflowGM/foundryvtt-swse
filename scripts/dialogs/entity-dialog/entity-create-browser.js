/**
 * SWSE Entity Create Browser
 *
 * A lightweight creator/picker for user-authored SWSE item documents. This app
 * intentionally uses the existing safe item factory and SWSEItemSheet shell; it
 * does not introduce new item schemas or a parallel editor.
 */

import { createSafeEmbeddedItem, createSafeItemData } from "/systems/foundryvtt-swse/scripts/engine/items/safe-item-factory.js";
import { buildEntityDialogContext } from "/systems/foundryvtt-swse/scripts/dialogs/entity-dialog/context-builder.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const TEMPLATE_PATH = 'systems/foundryvtt-swse/templates/dialogs/entity/entity-create-browser.hbs';

const CREATE_TYPES = Object.freeze([
  {
    id: 'weapon',
    kind: 'weapon',
    title: 'Weapon',
    icon: '⚔',
    group: 'Combat Gear',
    summary: 'Build blasters, melee weapons, lightsabers, thrown weapons, and custom attack tools.',
    creates: 'weapon item',
    options: { name: 'New Weapon' },
    tags: ['attack', 'damage', 'range', 'combat']
  },
  {
    id: 'armor',
    kind: 'armor',
    title: 'Armor',
    icon: '▣',
    group: 'Combat Gear',
    summary: 'Build light, medium, or heavy armor using the armor SSOT resolver.',
    creates: 'armor item',
    options: { name: 'New Armor' },
    tags: ['defense', 'reflex', 'fortitude', 'equipment']
  },
  {
    id: 'shield',
    kind: 'shield',
    title: 'Energy Shield',
    icon: '⬢',
    group: 'Combat Gear',
    summary: 'Build an armor-backed shield item with SR, current SR, charges, and activation state.',
    creates: 'armor item with shield profile',
    options: { name: 'New Energy Shield', shieldMode: true },
    tags: ['shield', 'sr', 'energy', 'armor']
  },
  {
    id: 'equipment',
    kind: 'equipment',
    title: 'Gear / Item',
    icon: '◈',
    group: 'Inventory',
    summary: 'Build generic gear, tools, consumables, containers, and player-facing notes.',
    creates: 'equipment item',
    options: { name: 'New Gear' },
    tags: ['gear', 'item', 'equipment', 'tool']
  },
  {
    id: 'feat',
    kind: 'feat',
    title: 'Feat',
    icon: '◇',
    group: 'Character Mechanics',
    summary: 'Create a custom feat with prerequisites, benefit text, choice metadata, and effects.',
    creates: 'feat item',
    options: { name: 'New Feat' },
    tags: ['feat', 'prerequisite', 'choice', 'progression']
  },
  {
    id: 'talent',
    kind: 'talent',
    title: 'Talent',
    icon: '◆',
    group: 'Character Mechanics',
    summary: 'Create a custom talent tied to a tree/source with prerequisites and effects.',
    creates: 'talent item',
    options: { name: 'New Talent' },
    tags: ['talent', 'tree', 'class', 'progression']
  },
  {
    id: 'force-power',
    kind: 'force-power',
    title: 'Force Power',
    icon: '✦',
    group: 'Force',
    summary: 'Create a Force power with descriptor, Use the Force DCs, suite metadata, and effects.',
    creates: 'force-power item',
    options: { name: 'New Force Power' },
    tags: ['force', 'use the force', 'dc', 'descriptor']
  },
  {
    id: 'skill',
    kind: 'skill',
    title: 'Custom Skill',
    icon: '▧',
    group: 'Character Mechanics',
    summary: 'Create a skill item with ability, trained-only rules, armor penalty, DC rows, and synergies.',
    creates: 'skill item',
    options: { name: 'New Custom Skill' },
    tags: ['skill', 'custom skill', 'ability', 'dc']
  },
  {
    id: 'maneuver',
    kind: 'maneuver',
    title: 'Starship Maneuver',
    icon: '✧',
    group: 'Vehicle / Starship',
    summary: 'Create a custom maneuver using the existing maneuver item type and editor fallback.',
    creates: 'maneuver item',
    options: { name: 'New Starship Maneuver' },
    tags: ['maneuver', 'starship', 'vehicle', 'pilot']
  }
]);

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value));
}

function buildPreview(descriptor) {
  const itemData = createSafeItemData(descriptor.kind, descriptor.options ?? {});
  const entity = buildEntityDialogContext({
    item: itemData,
    system: itemData.system ?? {},
    editable: false,
    baseEditable: true,
    mode: 'create',
    dirty: false,
    effects: []
  });
  return {
    itemData,
    entity,
    accentClass: entity?.accentClass ?? '',
    kindClass: entity?.kindClass ?? '',
    title: entity?.title ?? descriptor.title,
    subtitle: entity?.subtitle ?? descriptor.creates,
    noun: entity?.noun ?? descriptor.title
  };
}

function getGroups(entries = []) {
  const groups = new Map();
  for (const entry of entries) {
    const key = entry.group || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  return Array.from(groups.entries()).map(([name, items]) => ({ name, items }));
}

export class EntityCreateBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    this.actor = options.actor ?? null;
    this.selectedId = options.initialType || options.kind || 'weapon';
    this.searchText = '';
    this.closeOnCreate = options.closeOnCreate !== false;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(ApplicationV2.DEFAULT_OPTIONS ?? {}), {
    classes: ['swse', 'swse-app', 'swse-entity-create-browser'],
    position: { width: 980, height: 720 },
    window: { resizable: true, title: 'Create SWSE Entity' }
  });

  static PARTS = {
    content: {
      template: TEMPLATE_PATH,
      scrollable: ['.swse-entity-browser__list', '.swse-entity-browser__preview-body']
    }
  };

  static get createTypes() {
    return CREATE_TYPES.map(entry => clone(entry));
  }

  #descriptorFor(id = this.selectedId) {
    return CREATE_TYPES.find(entry => entry.id === id || entry.kind === id) ?? CREATE_TYPES[0];
  }

  #filteredEntries() {
    const query = String(this.searchText || '').trim().toLowerCase();
    const entries = CREATE_TYPES.map((entry) => {
      const preview = buildPreview(entry);
      return {
        ...entry,
        preview,
        active: entry.id === this.selectedId
      };
    });
    if (!query) return entries;
    return entries.filter((entry) => {
      const haystack = [entry.title, entry.group, entry.summary, entry.creates, ...(entry.tags ?? [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  async _prepareContext(options) {
    const entries = this.#filteredEntries();
    const selected = this.#descriptorFor();
    const selectedPreview = buildPreview(selected);
    return {
      actorName: this.actor?.name ?? null,
      canCreateEmbedded: !!this.actor?.isOwner,
      canCreateWorld: game?.user?.isGM ?? false,
      selected: { ...selected, preview: selectedPreview },
      groups: getGroups(entries),
      searchText: this.searchText,
      empty: entries.length === 0,
      modeLabel: this.actor ? `Create for ${this.actor.name}` : 'Create world item'
    };
  }

  #applySearchFilter(root) {
    const query = String(this.searchText || '').trim().toLowerCase();
    let visibleCount = 0;
    root?.querySelectorAll?.('[data-entity-browser-select]')?.forEach((button) => {
      const haystack = String(button.textContent || '').toLowerCase();
      const visible = !query || haystack.includes(query);
      button.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    root?.querySelectorAll?.('.swse-entity-browser__group')?.forEach((group) => {
      const hasVisible = Array.from(group.querySelectorAll('[data-entity-browser-select]')).some(button => !button.hidden);
      group.hidden = !hasVisible;
    });
    const empty = root?.querySelector?.('[data-entity-browser-dom-empty]');
    if (empty) empty.hidden = visibleCount > 0;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const root = this.element;
    if (!root) return;

    root.querySelector('[data-entity-browser-search]')?.addEventListener('input', (event) => {
      this.searchText = event.currentTarget?.value ?? '';
      this.#applySearchFilter(root);
    });
    this.#applySearchFilter(root);

    root.querySelectorAll('[data-entity-browser-select]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        this.selectedId = button.dataset.entityBrowserSelect || this.selectedId;
        await this.render({ force: true });
      });
    });

    root.querySelector('[data-entity-browser-create]')?.addEventListener('click', async (event) => {
      event.preventDefault();
      await this.#createSelected();
    });

    root.querySelector('[data-entity-browser-close]')?.addEventListener('click', (event) => {
      event.preventDefault();
      this.close();
    });
  }

  async #createSelected() {
    const descriptor = this.#descriptorFor();
    if (!descriptor) return null;

    try {
      let item = null;
      if (this.actor) {
        if (!this.actor.isOwner) {
          ui?.notifications?.warn?.('You do not have permission to create items for this actor.');
          return null;
        }
        item = await createSafeEmbeddedItem(this.actor, descriptor.kind, {
          ...(descriptor.options ?? {}),
          source: `entity-create-browser-${descriptor.id}`
        });
      } else {
        if (!game?.user?.isGM) {
          ui?.notifications?.warn?.('Only the GM can create unowned world items from the Entity Builder.');
          return null;
        }
        const itemData = createSafeItemData(descriptor.kind, descriptor.options ?? {});
        item = await Item.create(itemData, { renderSheet: false, source: `entity-create-browser-${descriptor.id}` });
      }

      if (item?.sheet) {
        item.sheet._entityDialogMode = 'create';
        item.sheet.render(true);
      }
      ui?.notifications?.info?.(`Created ${descriptor.title}.`);
      if (this.closeOnCreate) await this.close();
      return item;
    } catch (err) {
      SWSELogger.error('[EntityCreateBrowser] Failed to create entity', err);
      ui?.notifications?.error?.(`Failed to create ${descriptor.title}: ${err?.message ?? err}`);
      return null;
    }
  }
}

export function openEntityCreateBrowser(options = {}) {
  return new EntityCreateBrowser(options).render(true);
}

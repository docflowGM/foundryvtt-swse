/**
 * scripts/sheets/v2/droid-sheet/droid-systems-resolver.js
 *
 * Pure read-only resolver that maps a droid actor's data into structured
 * system regions for the Droid Sheet v2 Systems tab.
 *
 * Data sources (priority order per region):
 *   1. actor.system.droidSystems — builder-configured state (Garage app writes)
 *   2. actor.items               — items in the actor's inventory/items collection
 *
 * No actor mutations. No item mutations. No UI dependencies.
 *
 * Integration classification contract:
 *   Integrated weapon  = item.type === 'weapon'
 *                        AND (item.system.integrated === true OR flags.swse.integrated === true)
 *   Integrated equip   = (item.type === 'integratedSystem' OR item.system.integrated === true)
 *                        AND item.type !== 'weapon'
 *   Handheld weapon    = item.type === 'weapon' AND NOT integrated → inventory/combat only
 *   Standard armor     = item.type === 'armor'  AND NOT integrated → gear tab only
 */

const REGION_META = {
  processor: {
    id: 'processor',
    label: 'Processor',
    description: 'Computing core and cognitive matrix',
    required: true,
    defaultName: 'Heuristic Processor',
    defaultLabel: 'Type',
  },
  locomotion: {
    id: 'locomotion',
    label: 'Locomotion',
    description: 'Primary movement system',
    required: true,
    defaultName: 'Walking',
    defaultLabel: 'Type',
  },
  appendages: {
    id: 'appendages',
    label: 'Appendages',
    description: 'Manipulators and structural limbs',
    required: true,
    defaultName: '2 × Standard Droid Arms',
    defaultLabel: 'Manipulators',
  },
  armor: {
    id: 'armor',
    label: 'Armor',
    description: 'Protective chassis covering',
    required: false,
    defaultName: null,
    defaultLabel: 'Type',
  },
  sensors: {
    id: 'sensors',
    label: 'Sensors',
    description: 'Perception and detection systems',
    required: false,
    defaultName: null,
    defaultLabel: null,
  },
  integratedEquipment: {
    id: 'integratedEquipment',
    label: 'Integrated Equipment',
    description: 'Chassis-integrated systems and accessories',
    required: false,
    defaultName: null,
    defaultLabel: null,
  },
  integratedWeapons: {
    id: 'integratedWeapons',
    label: 'Integrated Weapons',
    description: 'Built-in weapon systems',
    required: false,
    defaultName: null,
    defaultLabel: null,
  },
};

export class DroidSystemsResolver {
  constructor(actor) {
    this.actor = actor;
    this.system = actor?.system ?? {};
    this.droidSystems = this.system.droidSystems ?? {};
    this.items = Array.isArray(actor?.items) ? [...actor.items] : [];
  }

  /**
   * Resolve all regions in one pass.
   * @returns {Object} keyed by region id
   */
  resolve() {
    return {
      processor: this._resolveProcessor(),
      locomotion: this._resolveLocomotion(),
      armor: this._resolveArmor(),
      appendages: this._resolveAppendages(),
      sensors: this._resolveSensors(),
      integratedEquipment: this._resolveIntegratedEquipment(),
      integratedWeapons: this._resolveIntegratedWeapons(),
    };
  }

  // ── Classification predicates ──────────────────────────────────────

  _isIntegratedWeapon(item) {
    return (
      item.type === 'weapon' &&
      (item.system?.integrated === true || Boolean(item.flags?.swse?.integrated))
    );
  }

  _isIntegratedEquipment(item) {
    if (item.type === 'weapon') return false;
    return (
      item.type === 'integratedSystem' ||
      item.system?.integrated === true ||
      Boolean(item.flags?.swse?.integrated)
    );
  }

  // ── Item projection helpers ────────────────────────────────────────

  _fromBuilder(data, extra = {}) {
    return {
      id: data.id ?? null,
      name: data.name ?? '',
      img: null,
      source: 'builder',
      ...extra,
    };
  }

  _fromActorItem(item) {
    return {
      id: item.id,
      name: item.name ?? '',
      img: item.img ?? null,
      source: 'item',
      type: item.type,
      description: item.system?.description ?? '',
    };
  }

  // ── Region resolvers ───────────────────────────────────────────────

  _resolveProcessor() {
    const meta = REGION_META.processor;
    const builderData = this.droidSystems.processor ?? {};
    const hasBuilderProcessor = Boolean(builderData.id);

    const itemProcessors = this.items
      .filter(i => i.type === 'heuristicProcessor')
      .map(i => ({
        ...this._fromActorItem(i),
        rating: i.system?.rating ?? null,
      }));

    const items = hasBuilderProcessor
      ? [this._fromBuilder(builderData, {
          cost: Number(builderData.cost ?? 0),
          bonus: Number(builderData.bonus ?? 0),
          description: builderData.description ?? '',
        })]
      : itemProcessors;

    const isConfigured = items.length > 0;
    return {
      ...meta,
      items,
      isConfigured,
      isDefault: !isConfigured,
      isEmpty: items.length === 0,
      warning: !isConfigured ? 'No processor installed — baseline default shown' : null,
    };
  }

  _resolveLocomotion() {
    const meta = REGION_META.locomotion;
    const builderLoco = this.droidSystems.locomotion ?? {};
    const sysLoco = this.system.locomotion ?? {};

    const name = builderLoco.name || sysLoco.type || sysLoco.name || '';
    const speed = Number(builderLoco.speed ?? sysLoco.speed ?? 0);
    const isConfigured = Boolean(name);

    const items = isConfigured
      ? [{ id: 'locomotion-primary', name, img: null, source: 'builder', speed }]
      : [];

    return {
      ...meta,
      items,
      isConfigured,
      isDefault: !isConfigured,
      isEmpty: items.length === 0,
      warning: !isConfigured ? 'No locomotion system installed — baseline default shown' : null,
      name,
      speed,
    };
  }

  _resolveArmor() {
    const meta = REGION_META.armor;
    const builderArmor = this.droidSystems.armor ?? {};
    const hasBuilderArmor = Boolean(builderArmor.id);

    const items = hasBuilderArmor
      ? [this._fromBuilder(builderArmor, {
          cost: Number(builderArmor.cost ?? 0),
          bonus: Number(builderArmor.bonus ?? 0),
          rating: builderArmor.rating ?? null,
          description: builderArmor.description ?? '',
        })]
      : [];

    return {
      ...meta,
      items,
      isConfigured: hasBuilderArmor,
      isDefault: false,
      isEmpty: items.length === 0,
      warning: null,
    };
  }

  _resolveAppendages() {
    const meta = REGION_META.appendages;
    const builderAppendages = Array.isArray(this.droidSystems.appendages)
      ? this.droidSystems.appendages
      : [];

    const items = builderAppendages.map(a =>
      this._fromBuilder(a, {
        cost: Number(a.cost ?? 0),
        description: a.description ?? '',
      })
    );

    const isConfigured = items.length > 0;
    return {
      ...meta,
      items,
      isConfigured,
      isDefault: !isConfigured,
      isEmpty: items.length === 0,
      warning: !isConfigured ? 'No appendages installed — baseline default shown' : null,
    };
  }

  _resolveSensors() {
    const meta = REGION_META.sensors;
    const builderSensors = Array.isArray(this.droidSystems.sensors)
      ? this.droidSystems.sensors
      : [];

    const items = builderSensors.map(s =>
      this._fromBuilder(s, {
        cost: Number(s.cost ?? 0),
        range: s.range ?? '',
        description: s.description ?? '',
      })
    );

    return {
      ...meta,
      items,
      isConfigured: items.length > 0,
      isDefault: false,
      isEmpty: items.length === 0,
      warning: null,
    };
  }

  _resolveIntegratedEquipment() {
    const meta = REGION_META.integratedEquipment;

    const builderAccessories = Array.isArray(this.droidSystems.accessories)
      ? this.droidSystems.accessories.map(a =>
          this._fromBuilder(a, {
            cost: Number(a.cost ?? 0),
            description: a.description ?? '',
          })
        )
      : [];

    // Actor items: integratedSystem type or integrated flag, excluding weapons
    const actorItems = this.items
      .filter(i => this._isIntegratedEquipment(i))
      .map(i => this._fromActorItem(i));

    const items = this._mergeDedupe([...builderAccessories, ...actorItems]);

    return {
      ...meta,
      items,
      isConfigured: items.length > 0,
      isDefault: false,
      isEmpty: items.length === 0,
      warning: null,
    };
  }

  _resolveIntegratedWeapons() {
    const meta = REGION_META.integratedWeapons;

    const builderWeapons = Array.isArray(this.droidSystems.weapons)
      ? this.droidSystems.weapons.map(w =>
          this._fromBuilder(w, {
            cost: Number(w.cost ?? 0),
            weaponType: w.type ?? 'built-in',
            description: w.description ?? '',
          })
        )
      : [];

    // Actor weapon items with integrated flag
    const actorWeapons = this.items
      .filter(i => this._isIntegratedWeapon(i))
      .map(i => this._fromActorItem(i));

    const items = this._mergeDedupe([...builderWeapons, ...actorWeapons]);

    return {
      ...meta,
      items,
      isConfigured: items.length > 0,
      isDefault: false,
      isEmpty: items.length === 0,
      warning: null,
    };
  }

  // ── Utilities ──────────────────────────────────────────────────────

  _mergeDedupe(entries) {
    const seen = new Set();
    const out = [];
    for (const entry of entries) {
      if (entry.id && seen.has(entry.id)) continue;
      if (entry.id) seen.add(entry.id);
      out.push(entry);
    }
    return out;
  }
}

/**
 * Pure read-only resolver that maps a droid actor's data into structured
 * system regions for the Droid Sheet v2 Systems tab.
 *
 * Data sources:
 *   1. actor.system.droidSystems — Garage/builder configured state
 *   2. actor.items               — actor-owned items and integrated gear
 *   3. scripts/data/droid-part-schema.js — read-only rules/description overlay
 */

import { computeDroidPartCost, hydrateDroidPart, isWeaponizedDroidPart, normalizeDroidPartId } from "/systems/foundryvtt-swse/scripts/data/droid-part-schema.js";
import { buildUnarmedAttackContext } from "/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js";

const DEFAULT_APPENDAGE_SLOTS = [
  { id: 'left-arm', label: 'Left Arm', defaultName: 'Droid Arm / Hand' },
  { id: 'right-arm', label: 'Right Arm', defaultName: 'Droid Arm / Hand' }
];

function asArray(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (typeof collection.toObject === 'function') return collection.toObject();
  if (typeof collection.values === 'function') return Array.from(collection.values());
  return Array.from(collection ?? []);
}

function slug(value) {
  return normalizeDroidPartId(value);
}

function humanize(value) {
  return String(value ?? '')
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

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
    this.items = asArray(actor?.items);
    this.installedIds = this._collectInstalledIds();
  }

  resolve() {
    const processor = this._resolveProcessor();
    const locomotion = this._resolveLocomotion();
    const armor = this._resolveArmor();
    const appendages = this._resolveAppendages();
    const sensors = this._resolveSensors();
    const integratedEquipment = this._resolveIntegratedEquipment();
    const integratedWeapons = this._resolveIntegratedWeapons({ appendages, locomotion, integratedEquipment });
    const skillModifiers = this._collectSkillModifiers([processor, locomotion, armor, appendages, sensors, integratedEquipment, integratedWeapons]);
    const unarmedAttack = buildUnarmedAttackContext(this.actor);

    return {
      processor,
      locomotion,
      armor,
      appendages,
      sensors,
      integratedEquipment,
      integratedWeapons,
      skillModifiers,
      unarmedAttack,
      summary: {
        requiredMissing: [processor, locomotion, appendages].filter(region => !region.isConfigured).map(region => region.label),
        weaponizedPartCount: integratedWeapons.items.length,
        skillModifierCount: skillModifiers.length,
        hasBackupProcessorSlot: processor.hasBackupProcessorSlot === true
      }
    };
  }

  _collectInstalledIds() {
    const ids = [];
    const add = (value) => { const key = slug(value); if (key) ids.push(key); };
    add(this.droidSystems.processor?.id); add(this.droidSystems.processor?.name);
    add(this.droidSystems.locomotion?.id); add(this.droidSystems.locomotion?.name);
    for (const key of ['appendages', 'sensors', 'weapons', 'accessories', 'integratedSystems']) {
      for (const entry of Array.isArray(this.droidSystems[key]) ? this.droidSystems[key] : []) {
        add(entry?.id); add(entry?.name);
      }
    }
    for (const item of this.items) {
      add(item?.system?.droidPartId); add(item?.flags?.swse?.droidPartId); add(item?.name);
    }
    return new Set(ids);
  }

  _hydrate(data) {
    return hydrateDroidPart(data, { installedIds: this.installedIds, actor: this.actor });
  }

  // ── Classification predicates ──────────────────────────────────────

  _isIntegratedWeapon(item) {
    return (
      item.type === 'weapon' &&
      (item.system?.integrated === true || Boolean(item.flags?.swse?.integrated))
    );
  }

  _isIntegratedEquipment(item) {
    if (item?.type === 'weapon') return false;
    const part = this._hydrate({ id: item?.system?.droidPartId ?? item?.flags?.swse?.droidPartId ?? item?.name, name: item?.name });
    return item?.type === 'integratedSystem' || item?.system?.integrated === true || Boolean(item?.flags?.swse?.integrated) || Boolean(part.category || part.slot);
  }

  // ── Item projection helpers ────────────────────────────────────────

  _fromBuilder(data, extra = {}) {
    const hydrated = this._hydrate({ ...data, ...extra });
    return {
      id: data.id ?? hydrated.ruleId ?? null,
      ruleId: hydrated.ruleId,
      name: hydrated.name ?? '',
      img: null,
      source: 'builder',
      description: hydrated.description ?? '',
      category: hydrated.category ?? '',
      slot: hydrated.slot ?? '',
      appendageType: hydrated.appendageType ?? '',
      modifiers: hydrated.modifiers ?? [],
      weaponProfile: hydrated.weaponProfile ?? null,
      features: hydrated.features ?? [],
      restrictions: hydrated.restrictions ?? [],
      rules: hydrated.rules ?? {}
    };
  }

  _fromActorItem(item) {
    const hydrated = this._hydrate({
      id: item.system?.droidPartId ?? item.flags?.swse?.droidPartId ?? item.name,
      name: item.name,
      description: item.system?.description,
      category: item.system?.category,
      slot: item.system?.slot ?? item.system?.location,
      weaponProfile: item.system?.weaponProfile,
    });
    return {
      id: item.id,
      ruleId: hydrated.ruleId,
      name: item.name ?? hydrated.name ?? '',
      img: item.img ?? null,
      source: 'item',
      type: item.type,
      description: item.system?.description || hydrated.description || '',
      category: hydrated.category ?? item.system?.category ?? '',
      slot: hydrated.slot ?? item.system?.slot ?? item.system?.location ?? '',
      appendageType: hydrated.appendageType ?? item.system?.appendageType ?? '',
      modifiers: hydrated.modifiers ?? [],
      weaponProfile: hydrated.weaponProfile ?? item.system?.weaponProfile ?? null,
      features: hydrated.features ?? [],
      restrictions: hydrated.restrictions ?? [],
      rules: hydrated.rules ?? {},
      damage: item.system?.damage ?? hydrated.weaponProfile?.damage ?? '',
      range: item.system?.range ?? hydrated.weaponProfile?.range ?? '',
      attackBonus: item.system?.attackBonus ?? hydrated.weaponProfile?.attackBonus ?? null,
    };
  }

  // ── Region resolvers ───────────────────────────────────────────────

  _resolveProcessor() {
    const meta = REGION_META.processor;
    const builderData = this.droidSystems.processor ?? {};
    const processorSlotsData = this.droidSystems.processorSlots ?? {};
    const backupData = this.droidSystems.backupProcessor ?? processorSlotsData.backup ?? {};
    const hasBuilderProcessor = Boolean(builderData.id || builderData.name);
    const itemProcessors = this.items
      .filter(i => i.type === 'heuristicProcessor' || slug(i.name).includes('processor'))
      .map(i => ({ ...this._fromActorItem(i), rating: i.system?.rating ?? null }));
    const primaryBuilder = hasBuilderProcessor ? this._fromBuilder(builderData, { cost: computeDroidPartCost(this.actor, builderData), bonus: Number(builderData.bonus ?? 0) }) : null;
    const backupBuilder = (backupData.id || backupData.name) ? this._fromBuilder(backupData, { cost: computeDroidPartCost(this.actor, backupData), backup: true }) : null;
    const items = this._mergeDedupe([...(primaryBuilder ? [primaryBuilder] : itemProcessors), ...(backupBuilder ? [backupBuilder] : [])]);
    const hasBackupProcessor = items.some(p => p.rules?.unlocksBackupProcessorSlot || slug(p.name).includes('backup-processor') || slug(p.ruleId).includes('backup-processor'))
      || this.items.some(i => slug(i.name).includes('backup-processor'));
    const primary = items.find(i => i.backup !== true && i.rules?.unlocksBackupProcessorSlot !== true) ?? items[0] ?? null;
    const backupActivator = items.find(i => i.rules?.unlocksBackupProcessorSlot === true || slug(i.name).includes('backup-processor')) ?? null;
    const backup = backupBuilder ?? (backupActivator && backupActivator.id !== primary?.id ? backupActivator : null);
    return {
      ...meta,
      items,
      primary,
      backup,
      processorSlots: [
        { id: 'primary', label: 'Primary Processor', active: true, item: primary, isEmpty: !primary, defaultName: meta.defaultName },
        ...(hasBackupProcessor ? [{ id: 'backup', label: 'Backup Processor Slot', active: false, item: backup, isEmpty: !backup, canAdd: !backup, canReplace: Boolean(backup), defaultName: 'Available after Backup Processor purchase' }] : [])
      ],
      hasBackupProcessorSlot: hasBackupProcessor,
      activeProcessorName: primary?.name ?? meta.defaultName,
      isConfigured: items.length > 0,
      isDefault: items.length === 0,
      isEmpty: items.length === 0,
      warning: items.length === 0 ? 'No processor installed — heroic droids require a Heuristic Processor.' : null,
    };
  }

  _resolveLocomotion() {
    const meta = REGION_META.locomotion;
    const builderLoco = this.droidSystems.locomotion ?? {};
    const sysLoco = this.system.locomotion ?? {};
    const name = builderLoco.name || builderLoco.id || sysLoco.type || sysLoco.name || '';
    const speed = Number(builderLoco.speed ?? sysLoco.speed ?? 0);
    const primary = name ? this._fromBuilder({ id: builderLoco.id ?? name, name }, { speed, active: true, cost: computeDroidPartCost(this.actor, builderLoco.id ?? name, { speed }) }) : null;
    const extras = [];
    for (const key of ['locomotionSystems', 'secondaryLocomotion']) {
      for (const entry of Array.isArray(this.droidSystems[key]) ? this.droidSystems[key] : []) extras.push(this._fromBuilder(entry, { cost: computeDroidPartCost(this.actor, entry) }));
    }
    const items = primary ? [primary, ...extras] : extras;
    return { ...meta, items, active: primary, isConfigured: items.length > 0, isDefault: items.length === 0, isEmpty: items.length === 0, warning: items.length === 0 ? 'No locomotion system installed — baseline Walking locomotion shown.' : null, name, speed };
  }

  _resolveArmor() {
    const meta = REGION_META.armor;
    const builderArmor = this.droidSystems.armor ?? {};
    const hasBuilderArmor = Boolean(builderArmor.id || builderArmor.name);
    const armorItems = this.items.filter(i => i.type === 'armor' && (i.system?.integrated === true || Boolean(i.flags?.swse?.integrated))).map(i => this._fromActorItem(i));
    const items = this._mergeDedupe([...(hasBuilderArmor ? [this._fromBuilder(builderArmor, { cost: computeDroidPartCost(this.actor, builderArmor), bonus: Number(builderArmor.bonus ?? 0), rating: builderArmor.rating ?? null })] : []), ...armorItems]);
    return { ...meta, items, isConfigured: items.length > 0, isDefault: false, isEmpty: items.length === 0, warning: null };
  }

  _resolveAppendages() {
    const meta = REGION_META.appendages;
    const builderAppendages = Array.isArray(this.droidSystems.appendages) ? this.droidSystems.appendages : [];
    const items = builderAppendages.map((a, index) => this._fromBuilder(a, { cost: computeDroidPartCost(this.actor, a), location: a.location ?? a.slot ?? DEFAULT_APPENDAGE_SLOTS[index]?.id ?? `appendage-${index + 1}` }));
    const itemAppendages = this.items.filter(i => slug(i.system?.droidSystemType ?? i.system?.droidPartType ?? i.flags?.swse?.droidPartType ?? i.name).includes('appendage')).map(i => this._fromActorItem(i));
    const all = this._mergeDedupe([...items, ...itemAppendages]);
    const slots = this._buildAppendageSlots(all);
    return { ...meta, items: all, slots, allowsAdd: true, allowsReplace: true, unarmedAttack: buildUnarmedAttackContext(this.actor), isConfigured: all.length > 0, isDefault: all.length === 0, isEmpty: all.length === 0, warning: all.length === 0 ? 'No appendages installed — baseline two droid arms shown for heroic droids.' : null };
  }

  _buildAppendageSlots(items) {
    const assigned = new Set();
    const slots = DEFAULT_APPENDAGE_SLOTS.map((slot, index) => {
      const item = items.find(entry => slug(entry.location ?? entry.slot).includes(slug(slot.id))) ?? items[index] ?? null;
      if (item) assigned.add(item.id);
      return { ...slot, item, isEmpty: !item, canReplace: true, canUse: Boolean(item), defaultName: slot.defaultName };
    });
    for (const item of items) {
      if (assigned.has(item.id)) continue;
      slots.push({ id: slug(item.location ?? item.slot ?? item.name ?? item.id), label: item.location ? humanize(item.location) : 'Additional Appendage', item, isEmpty: false, canReplace: true, canUse: true });
    }
    slots.push({ id: 'add-appendage', label: 'Additional Limb Socket', item: null, isEmpty: true, canReplace: false, canAdd: true, defaultName: 'Garage-managed limb slot' });
    return slots;
  }

  _resolveSensors() {
    const meta = REGION_META.sensors;
    const builderSensors = Array.isArray(this.droidSystems.sensors) ? this.droidSystems.sensors : [];
    const builder = builderSensors.map(s => this._fromBuilder(s, { cost: computeDroidPartCost(this.actor, s), range: s.range ?? '' }));
    const itemSensors = this.items.filter(i => slug(i.system?.category ?? i.system?.droidPartType ?? i.name).includes('sensor')).map(i => this._fromActorItem(i));
    const items = this._mergeDedupe([...builder, ...itemSensors]);
    return { ...meta, items, isConfigured: items.length > 0, isDefault: false, isEmpty: items.length === 0, warning: null };
  }

  _resolveIntegratedEquipment() {
    const meta = REGION_META.integratedEquipment;
    const builderAccessories = Array.isArray(this.droidSystems.accessories) ? this.droidSystems.accessories.map(a => this._fromBuilder(a, { cost: computeDroidPartCost(this.actor, a) })) : [];
    const builderIntegrated = Array.isArray(this.droidSystems.integratedSystems) ? this.droidSystems.integratedSystems.map(a => this._fromBuilder(a, { cost: computeDroidPartCost(this.actor, a) })) : [];
    const actorItems = this.items.filter(i => this._isIntegratedEquipment(i)).map(i => this._fromActorItem(i));
    const items = this._mergeDedupe([...builderAccessories, ...builderIntegrated, ...actorItems]).filter(item => !isWeaponizedDroidPart(item));
    return { ...meta, items, isConfigured: items.length > 0, isDefault: false, isEmpty: items.length === 0, warning: null };
  }

  _resolveIntegratedWeapons({ appendages, locomotion, integratedEquipment }) {
    const meta = REGION_META.integratedWeapons;
    const builderWeapons = Array.isArray(this.droidSystems.weapons) ? this.droidSystems.weapons.map(w => this._fromBuilder(w, { cost: computeDroidPartCost(this.actor, w), weaponType: w.type ?? 'built-in' })) : [];
    const actorWeapons = this.items.filter(i => this._isIntegratedWeapon(i)).map(i => this._fromActorItem(i));
    const weaponizedParts = [...(appendages?.items ?? []), ...(locomotion?.items ?? []), ...(integratedEquipment?.items ?? [])]
      .filter(item => Boolean(item.weaponProfile));
    const items = this._mergeDedupe([...builderWeapons, ...actorWeapons, ...weaponizedParts]).map(item => ({
      ...item,
      canRoll: Boolean(item.id && item.source === 'item') || Boolean(item.weaponProfile),
      damage: item.damage || item.weaponProfile?.damage || '',
      range: item.range || item.weaponProfile?.range || '',
      attackBonus: item.attackBonus ?? item.weaponProfile?.attackBonus ?? null,
      isSelfDestruct: item.weaponProfile?.selfDestruct === true
    }));
    return { ...meta, items, isConfigured: items.length > 0, isDefault: false, isEmpty: items.length === 0, warning: null };
  }

  _collectSkillModifiers(regions) {
    const modifiers = [];
    for (const region of regions) {
      for (const item of region?.items ?? []) {
        for (const mod of item.modifiers ?? []) {
          if (String(mod.target ?? '').startsWith('skill.')) modifiers.push({ ...mod, sourceName: item.name, sourceId: item.id, active: mod.active !== false });
        }
      }
    }
    return modifiers;
  }

  // ── Utilities ──────────────────────────────────────────────────────

  _mergeDedupe(entries) {
    const seen = new Set();
    const out = [];
    for (const entry of entries.filter(Boolean)) {
      const key = entry.id ? `id:${entry.id}` : `name:${slug(entry.name)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(entry);
    }
    return out;
  }
}

/**
 * Safe item factory for user-created embedded Item documents.
 *
 * Add buttons should create the correct Foundry item type at birth. Do not
 * create a generic blank item and later mutate it into a weapon/feat/talent/etc.
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

const TYPE_ALIASES = Object.freeze({
  gear: 'equipment',
  item: 'equipment',
  equipment: 'equipment',
  armor: 'armor',
  shield: 'armor',
  weapon: 'weapon',
  feat: 'feat',
  talent: 'talent',
  force: 'force-power',
  forcePower: 'force-power',
  'force-power': 'force-power',
  forcepower: 'force-power',
  maneuver: 'maneuver',
  starshipManeuver: 'maneuver',
  'starship-maneuver': 'maneuver',
  skill: 'skill',
  'custom-skill': 'skill'
});

const DEFAULT_IMAGES = Object.freeze({
  weapon: 'icons/weapons/swords/sword-simple.webp',
  armor: 'icons/equipment/chest/breastplate-layered-steel.webp',
  equipment: 'icons/sundries/misc/pouch-simple-leather-brown.webp',
  feat: 'icons/sundries/scrolls/scroll-bound-ruby-red.webp',
  talent: 'icons/magic/symbols/runes-star-pentagon-orange.webp',
  'force-power': 'icons/magic/light/orb-lightbulb-gray.webp',
  maneuver: 'icons/environment/settlement/watchtower-silhouette.webp',
  skill: 'icons/sundries/documents/document-sealed-signatures-red.webp'
});

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value));
}

function normalizeKind(kind) {
  const raw = String(kind || '').trim();
  return TYPE_ALIASES[raw] || TYPE_ALIASES[raw.toLowerCase()] || raw;
}

function labelForType(type) {
  switch (type) {
    case 'force-power': return 'Force Power';
    case 'maneuver': return 'Starship Maneuver';
    case 'equipment': return 'Gear';
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function baseSystem(description = '', source = 'Manual') {
  return { description, source };
}

function buildSystemData(type, options = {}) {
  switch (type) {
    case 'weapon':
      return {
        ...baseSystem('', 'Manual'),
        weaponCategory: 'simple',
        proficiency: 'simple',
        damage: '1d6',
        damageBonus: '',
        attackBonus: 0,
        attackAttribute: 'str',
        critRange: 20,
        critMultiplier: 2,
        damageType: 'energy',
        armorPiercing: 0,
        autofire: false,
        meleeOrRanged: 'melee',
        range: 'melee',
        ranged: false,
        reachBonus: 0,
        ranges: { short: null, medium: null, long: null },
        specialEffects: '',
        ammunition: { type: '', current: 0, max: 0 },
        equipped: false,
        dualWielded: false,
        wieldedTwoHanded: false,
        weight: 0,
        cost: 0,
        gearTemplate: '',
        gearTemplateSecondary: '',
        templateCost: 0,
        proficient: true,
        damageDice: 1,
        damageDiceType: 'd6',
        weaponProperties: {
          isLight: false,
          isTwoHanded: false,
          keen: false,
          flaming: false,
          frost: false,
          shock: false,
          vorpal: false
        }
      };
    case 'armor':
      return {
        ...baseSystem('', 'Manual'),
        armorType: options.shieldMode ? 'shield' : 'light',
        reflexBonus: 0,
        fortitudeBonus: 0,
        maxDex: 999,
        weight: 0,
        cost: 0,
        equipmentPerceptionBonus: 0,
        armorProficiency: false,
        features: '',
        shieldRating: 0,
        currentSR: 0,
        armorProficiencyRequired: '',
        charges: { current: options.shieldMode ? 0 : 5, max: options.shieldMode ? 0 : 5 },
        activated: false,
        equipped: false,
        gearTemplate: '',
        gearTemplateSecondary: '',
        templateCost: 0
      };
    case 'equipment':
      return {
        ...baseSystem('', 'Manual'),
        weight: 0,
        cost: 0,
        upgradeSlots: 1,
        installedUpgrades: [],
        quantity: 1,
        equipped: false
      };
    case 'feat':
      return {
        ...baseSystem('', 'Manual'),
        featType: 'general',
        category: 'General',
        prerequisite: '',
        prerequisites: '',
        benefit: '',
        special: '',
        normalText: '',
        bonusFeatFor: [],
        grantsActions: [],
        grantsBonuses: { skills: {}, combat: {}, other: {} },
        toggleable: false,
        toggled: false,
        variable: false,
        variableValue: 0,
        archetype: '',
        playstyle: '',
        tier: 0,
        uses: { current: 0, max: 0, perDay: false },
        isCustom: true
      };
    case 'talent':
      return {
        ...baseSystem('', 'Manual'),
        tree: 'Custom',
        talentTree: 'Custom',
        prerequisite: '',
        prerequisites: '',
        benefit: '',
        special: '',
        grantsActions: [],
        grantsBonuses: { skills: {}, combat: {}, other: {} },
        toggleable: false,
        toggled: false,
        variable: false,
        variableValue: 0,
        archetype: '',
        playstyle: '',
        tier: 0,
        uses: { current: 0, max: 0, perEncounter: false, perDay: false },
        isCustom: true
      };
    case 'force-power':
      return {
        ...baseSystem('', 'Manual'),
        level: 1,
        powerLevel: 1,
        discipline: 'telekinetic',
        useTheForce: 15,
        time: 'Standard Action',
        range: '6 squares',
        target: 'One target',
        duration: 'Instantaneous',
        effect: '',
        special: '',
        tags: [],
        dcChart: [],
        maintainable: false,
        forcePointCost: 0,
        forcePointEffect: '',
        sourcebook: 'Homebrew',
        page: null,
        uses: { current: 1, max: 1 },
        inSuite: false,
        spent: false,
        discarded: false,
        provenance: {
          grantSourceType: 'manual-custom',
          grantSourceId: null,
          grantSubtype: 'custom',
          isLocked: false,
          migratedAt: null,
          legacyIssues: []
        },
        isCustom: true
      };
    case 'maneuver':
      return {
        ...baseSystem('', 'Manual'),
        actionType: 'standard',
        talentTree: 'Ace Pilot',
        spent: false,
        inSuite: false,
        uses: { current: 1, max: 1 },
        prerequisites: [],
        tags: [],
        icon: 'fa-solid fa-fighter-jet',
        isCustom: true
      };
    case 'skill':
      return {
        description: '',
        ability: 'int',
        trained: false,
        focused: false,
        miscMod: 0,
        notes: '',
        isCustom: true
      };
    default:
      return baseSystem('', 'Manual');
  }
}

export function createSafeItemData(kind, options = {}) {
  const type = normalizeKind(kind);
  if (!type) throw new Error('Cannot create item without an item type.');

  const label = options.label || labelForType(type);
  const name = options.name || `New ${label}`;
  const system = {
    ...buildSystemData(type, options),
    ...(options.system || {})
  };

  return {
    name,
    type,
    img: options.img || DEFAULT_IMAGES[type] || 'icons/svg/item-bag.svg',
    system
  };
}

export function createCustomSkillEntry(options = {}) {
  const now = Date.now();
  return {
    id: options.id || `custom-${now}`,
    label: options.label || 'New Custom Skill',
    ability: options.ability || 'int',
    trained: options.trained === true,
    focused: options.focused === true,
    miscMod: Number.isFinite(Number(options.miscMod)) ? Number(options.miscMod) : 0,
    notes: options.notes || '',
    isCustom: true
  };
}

export async function createSafeEmbeddedItem(actor, kind, options = {}) {
  if (!actor?.isOwner) {
    ui?.notifications?.warn?.('You do not have permission to edit this actor.');
    return null;
  }

  const itemData = createSafeItemData(kind, options);
  const created = await ActorEngine.createEmbeddedDocuments(actor, 'Item', [clone(itemData)], {
    source: options.source || `safe-item-factory-${itemData.type}`
  });
  return created?.[0] ?? null;
}

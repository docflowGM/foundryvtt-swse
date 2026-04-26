/**
 * GEAR / WEAPON / ARMOR TEMPLATE DATA
 *
 * First-wave template catalog for the unified customization workbench.
 * Effects are represented as structured descriptive metadata for now;
 * hard mechanical mutation schemas can be layered later without changing keys.
 */

const minPlusPercent = (percent, minCredits) => ({ type: 'max-percent-or-flat', percent, minCredits });
const percentOnly = (percent) => ({ type: 'percent', percent });

export const TEMPLATE_COST_RULES = {
  prototype_general: minPlusPercent(0.10, 1000),
  cortosis_weave_general: percentOnly(0.20),
  phrik_alloy_general: percentOnly(0.20),
  mandalorian_general: minPlusPercent(0.10, 1000),
  verpine_general: minPlusPercent(0.10, 1000),
  eriadun_armor: minPlusPercent(0.10, 1000),
  quick_draw_weapon: percentOnly(0.10)
};

export const ITEM_TEMPLATE_CATALOG = {
  prototype_general: {
    key: 'prototype_general',
    name: 'Prototype General Template',
    templateType: 'general',
    sourceBook: 'Knights of the Old Republic Campaign Guide',
    manufacturedBy: null,
    costRule: TEMPLATE_COST_RULES.prototype_general,
    categories: ['weapon', 'armor'],
    rarity: true,
    stackable: false,
    description: 'Prototype items are unstable and not ready for release to the general public, but they might have properties that other items do not.',
    rulesText: {
      weapon: 'A Prototype Weapon can have two Modifications from the Tech Specialist feat instead of just one. However, a Prototype Weapon treats a natural roll of 1, 2, 3, or 4 as though it were a natural 1 and becomes disabled until repaired.',
      armor: 'A suit of Prototype Armor can have two Modifications from the Tech Specialist feat instead of just one. However, the wearer takes 1 more die of damage from a Critical Hit before multiplying.'
    },
    restriction: 'common',
    affectedAreas: ['reliability', 'critical-vulnerability']
  },
  cortosis_weave_general: {
    key: 'cortosis_weave_general',
    name: 'Cortosis Weave General Template',
    templateType: 'general',
    sourceBook: 'Knights of the Old Republic Campaign Guide',
    manufacturedBy: null,
    costRule: TEMPLATE_COST_RULES.cortosis_weave_general,
    categories: ['weapon', 'armor'],
    rarity: true,
    stackable: true,
    stackingException: 'cortosis_or_phrik_exception',
    description: 'Weapons and Armor made of Cortosis Weave share a special property that prevents Lightsabers from slicing through them with great ease.',
    rulesText: {
      weapon: 'A Lightsaber does not ignore the Damage Reduction of the weapon.',
      armor: 'A Lightsaber does not ignore the Damage Reduction of the armor.'
    },
    specialText: 'During The Old Republic Era, most melee weapons are coated with Cortosis Weave and do not gain Rare availability from this template. In other eras, Cortosis Weave is Rare as normal.',
    restriction: 'common',
    affectedAreas: ['lightsaber-resistance']
  },
  phrik_alloy_general: {
    key: 'phrik_alloy_general',
    name: 'Phrik Alloy General Template',
    templateType: 'general',
    sourceBook: 'Knights of the Old Republic Campaign Guide',
    manufacturedBy: null,
    costRule: TEMPLATE_COST_RULES.phrik_alloy_general,
    categories: ['weapon', 'armor'],
    rarity: true,
    stackable: true,
    stackingException: 'cortosis_or_phrik_exception',
    description: 'Weapons and Armor made of Phrik Alloy share a special property that prevents Lightsabers from slicing through them with great ease.',
    rulesText: {
      weapon: 'A Lightsaber does not ignore the Damage Reduction of the weapon.',
      armor: 'A Lightsaber does not ignore the Damage Reduction of the armor.'
    },
    specialText: 'Outside eras where Phrik is plentiful, this template is Rare.',
    restriction: 'common',
    affectedAreas: ['lightsaber-resistance']
  },
  mandalorian_general: {
    key: 'mandalorian_general',
    name: 'Mandalorian General Template',
    templateType: 'general',
    sourceBook: 'Knights of the Old Republic Campaign Guide',
    manufacturedBy: 'The Mandalorians',
    costRule: TEMPLATE_COST_RULES.mandalorian_general,
    categories: ['weapon', 'armor'],
    rarity: true,
    stackable: false,
    description: 'A Mandalorian warrior is made great by their Equipment, and each piece of Mandalorian Manufacture Equipment is unique in some way.',
    rulesText: {
      general: 'Any character making a Mechanics check to repair or modify a Mandalorian Weapon or Mandalorian Armor gains a +5 equipment bonus on the check.',
      drawback: 'If a Mandalorian Manufacture item is disabled, all Weapon and Armor Accessories attached to that item are destroyed and must be purchased anew rather than merely repaired.'
    },
    restriction: 'common',
    affectedAreas: ['repair', 'modification', 'disabled-state']
  },
  verpine_general: {
    key: 'verpine_general',
    name: 'Verpine General Template',
    templateType: 'general',
    sourceBook: 'Knights of the Old Republic Campaign Guide',
    manufacturedBy: 'The Verpine',
    costRule: TEMPLATE_COST_RULES.verpine_general,
    categories: ['armor', 'weapon'],
    rarity: true,
    stackable: false,
    description: 'The insectoid Verpine are technological masters who can create items with exceptional characteristics.',
    rulesText: {
      weapon: 'As a swift action, a Verpine Weapon can be switched to an Ion fire mode, changing the weapon to deal Ion damage instead of normal damage. A wielder with Intelligence below 13 takes a -2 penalty to attack rolls with it.',
      armor: 'A suit of Verpine Armor provides Damage Reduction 10 against Ion damage. A wearer with Dexterity below 13 suffers Armor Check Penalties while wearing it.'
    },
    restriction: 'common',
    affectedAreas: ['ion-mode', 'ion-defense', 'attribute-prerequisite'],
    appliesTo(item) {
      const type = item?.type;
      if (type === 'armor' || type === 'bodysuit') return true;
      if (type === 'blaster') return true;
      if (type === 'weapon') {
        const subtype = String(item?.system?.weaponSubtype || '').toLowerCase();
        return subtype.includes('ranged') && subtype.includes('energy');
      }
      return false;
    }
  },
  eriadun_armor: {
    key: 'eriadun_armor',
    name: 'Eriadun Armor Template',
    templateType: 'armor',
    sourceBook: 'Knights of the Old Republic Campaign Guide',
    manufacturedBy: 'Eriadu',
    costRule: TEMPLATE_COST_RULES.eriadun_armor,
    categories: ['armor'],
    rarity: true,
    stackable: false,
    description: 'Crafted on the Human-dominated world of Eriadu, Eriadun Armor helps soldiers avoid being taken prisoner and interrogated by enemy forces.',
    rulesText: {
      armor: 'A suit of Eriadun Armor or an Eriadun Energy Shield provides Damage Reduction 5 against Stun Damage, but any equipment bonus to Fortitude Defense provided by the armor is reduced by one to a minimum of +0.'
    },
    restriction: 'common',
    affectedAreas: ['stun-resistance', 'fortitude-bonus'],
    appliesTo(item) {
      const fort = Number(item?.system?.equipmentBonusFort || item?.system?.fortitudeBonus || 0);
      return (item?.type === 'armor' || item?.type === 'bodysuit') && fort > 0;
    }
  },
  quick_draw_weapon: {
    key: 'quick_draw_weapon',
    name: 'Quick Draw Weapon Template',
    templateType: 'weapon',
    sourceBook: 'Knights of the Old Republic Campaign Guide',
    manufacturedBy: null,
    costRule: TEMPLATE_COST_RULES.quick_draw_weapon,
    categories: ['weapon'],
    rarity: true,
    stackable: false,
    description: 'These Quick Draw Weapons are specially designed to be pulled quickly, whether by modification to the Weapon or to its holster.',
    rulesText: {
      weapon: 'A Quick Draw Weapon wielder that possesses the Quick Draw feat can draw or holster the weapon once per round as a free action.'
    },
    restriction: 'common',
    affectedAreas: ['draw-speed']
  }
};

export function calculateTemplateCost(baseCost, template) {
  const normalizedBase = Number(baseCost) || 0;
  const rule = template?.costRule;
  if (!rule) return 0;
  if (rule.type === 'percent') {
    return Math.max(0, Math.ceil(normalizedBase * rule.percent));
  }
  if (rule.type === 'max-percent-or-flat') {
    return Math.max(Math.ceil(normalizedBase * rule.percent), Number(rule.minCredits) || 0);
  }
  return 0;
}

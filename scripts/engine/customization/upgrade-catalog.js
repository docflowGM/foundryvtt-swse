import { normalizeRestriction } from '/systems/foundryvtt-swse/scripts/engine/customization/restriction-model.js';

function def(key, data) {
  return [key, { key, ...data, restriction: normalizeRestriction(data.restriction) }];
}

export const UPGRADE_CATALOG = Object.fromEntries([
  // Universal upgrades
  def('cheater', { name: 'Cheater', category: 'universal', cost: 500, slotCost: 1, restriction: 'illegal', appliesTo: ['weapon','blaster','armor','gear'], affectedAreas: ['utility'], description: 'Universal upgrade.' }),
  def('cloaked', { name: 'Cloaked', category: 'universal', cost: 750, slotCost: 1, restriction: 'licensed', appliesTo: ['weapon','blaster','armor','gear'], affectedAreas: ['stealth'], description: 'Reduces detectability.' }),
  def('dual_gear', { name: 'Dual Gear', category: 'universal', cost: 1000, slotCost: 1, restriction: 'common', appliesTo: ['weapon','blaster','armor','gear'], affectedAreas: ['utility'], description: 'Combines paired functionality.' }),
  def('environmental_sealing', { name: 'Environmental Sealing', category: 'universal', cost: 400, slotCost: 1, restriction: 'common', appliesTo: ['armor','gear'], affectedAreas: ['environment'], description: 'Protects against hostile environments.' }),
  def('extra_power_source', { name: 'Extra Power Source', category: 'universal', cost: 200, slotCost: 1, restriction: 'common', appliesTo: ['weapon','blaster','armor','gear'], affectedAreas: ['power'], description: 'Adds reserve power.' }),
  def('remote_activation', { name: 'Remote Activation', category: 'universal', cost: 100, slotCost: 0, restriction: 'common', appliesTo: ['weapon','blaster','armor','gear'], affectedAreas: ['utility'], description: 'Allows remote triggering.' }),
  def('secret_compartment', { name: 'Secret Compartment', category: 'universal', cost: 600, slotCost: 1, restriction: 'common', appliesTo: ['armor','gear'], affectedAreas: ['storage'], description: 'Adds hidden storage.' }),
  def('storage_capacity', { name: 'Storage Capacity', category: 'universal', cost: 100, slotCost: 0, restriction: 'common', appliesTo: ['armor','gear'], affectedAreas: ['storage'], description: 'Adds a minor storage increase.' }),
  def('ion_shielding', { name: 'Ion-Shielding', category: 'universal', cost: 1000, slotCost: 1, restriction: 'common', appliesTo: ['weapon','blaster','armor','gear'], affectedAreas: ['protection'], description: 'Protects electronics against ion damage.' }),
  def('componentization_basic', { name: 'Componentization (Basic)', category: 'universal', cost: 0, slotCost: 1, restriction: 'common', appliesTo: ['weapon','blaster','armor','gear'], affectedAreas: ['utility'], description: 'Allows easier partial disassembly.' }),
  def('componentization_deluxe', { name: 'Componentization (Deluxe)', category: 'universal', cost: 0, slotCost: 2, restriction: 'common', appliesTo: ['weapon','blaster','armor','gear'], affectedAreas: ['utility'], description: 'Advanced component modularity.' }),

  // Weapon upgrades
  def('bayonet_ring', { name: 'Bayonet Ring', category: 'weapon', costFormula: '100% weapon cost', cost: 0, slotCost: 0, restriction: 'common', appliesTo: ['blaster'], requires: ['ranged'], affectedAreas: ['mount'], description: 'Accepts bayonet attachments.' }),
  def('bipod', { name: 'Bipod', category: 'weapon', cost: 100, slotCost: 0, restriction: 'common', appliesTo: ['blaster'], requires: ['ranged'], affectedAreas: ['stability'], description: 'Improves firing stability.' }),
  def('double_trigger', { name: 'Double Trigger', category: 'weapon', cost: 800, slotCost: 0, restriction: 'common', appliesTo: ['weapon','blaster'], affectedAreas: ['trigger'], description: 'Dual-stage trigger assembly.' }),
  def('ion_charger', { name: 'Ion Charger', category: 'weapon', cost: 3000, slotCost: 1, restriction: 'licensed', appliesTo: ['blaster'], requires: ['ranged_energy'], affectedAreas: ['damage_type'], description: 'Converts output toward ion discharge.' }),
  def('neutronium_reinforcement', { name: 'Neutronium Reinforcement', category: 'weapon', cost: 3000, slotCost: 1, restriction: 'military', appliesTo: ['weapon','blaster','armor','gear'], affectedAreas: ['reinforcement'], description: 'Increases durability.' }),
  def('overload_switch', { name: 'Overload Switch', category: 'weapon', cost: 250, slotCost: 1, restriction: 'military', appliesTo: ['blaster'], requires: ['ranged_energy'], affectedAreas: ['power'], description: 'Boosts discharge at risk of overheat.' }),
  def('pulse_charger', { name: 'Pulse Charger', category: 'weapon', cost: 2000, slotCost: 1, restriction: 'military', appliesTo: ['blaster'], requires: ['ranged_energy'], affectedAreas: ['power'], description: 'Pulse-optimized energy pack.' }),
  def('rangefinder_weapon', { name: 'Rangefinder', category: 'weapon', cost: 200, slotCost: 1, restriction: 'licensed', appliesTo: ['blaster'], requires: ['ranged'], affectedAreas: ['range'], description: 'Improves ranged targeting.' }),
  def('rapid_recycler', { name: 'Rapid Recycler', category: 'weapon', cost: 500, slotCost: 1, restriction: 'military', appliesTo: ['blaster'], requires: ['ranged'], affectedAreas: ['reload'], description: 'Accelerates cycling.' }),
  def('retractable_stock', { name: 'Retractable Stock', category: 'weapon', cost: 100, slotCost: 0, restriction: 'common', appliesTo: ['blaster'], requires: ['ranged'], affectedAreas: ['stability'], description: 'Collapsible support stock.' }),
  def('slinker', { name: 'Slinker', category: 'weapon', cost: 1000, slotCost: 1, restriction: 'licensed', appliesTo: ['blaster'], requires: ['ranged'], affectedAreas: ['stealth'], description: 'Reduces weapon signature.' }),
  def('sniper_switch', { name: 'Sniper Switch', category: 'weapon', cost: 500, slotCost: 0, restriction: 'licensed', appliesTo: ['blaster'], requires: ['ranged'], affectedAreas: ['range'], description: 'Precision fire mode.' }),
  def('targeting_scope_standard', { name: 'Targeting Scope, Standard', category: 'weapon', cost: 100, slotCost: 0, restriction: 'common', appliesTo: ['blaster'], requires: ['ranged'], affectedAreas: ['range'], description: 'Basic optics package.' }),
  def('targeting_scope_low_light', { name: 'Targeting Scope, Low-Light', category: 'weapon', cost: 1000, slotCost: 0, restriction: 'common', appliesTo: ['blaster'], requires: ['ranged'], affectedAreas: ['range'], description: 'Enhanced low-light optics.' }),
  def('beam_splitter', { name: 'Beam Splitter', category: 'weapon', cost: 1200, slotCost: 2, restriction: 'common', appliesTo: ['blaster'], requires: ['ranged_energy'], affectedAreas: ['damage'], description: 'Splits energy discharge.' }),
  def('durasteel_bonding', { name: 'Durasteel Bonding', category: 'weapon', cost: 2000, slotCost: 1, restriction: 'common', appliesTo: ['weapon','blaster'], affectedAreas: ['reinforcement'], description: 'Improves frame resilience.' }),
  def('enhanced_energy_projector', { name: 'Enhanced Energy Projector', category: 'weapon', cost: 3000, slotCost: 1, restriction: 'common', appliesTo: ['blaster'], requires: ['ranged_energy'], affectedAreas: ['damage'], description: 'Boosts emitter quality.' }),
  def('hair_trigger', { name: 'Hair Trigger', category: 'weapon', cost: 1200, slotCost: 1, restriction: 'common', appliesTo: ['weapon','blaster'], affectedAreas: ['trigger'], description: 'Speeds trigger response.' }),
  def('improved_energy_cell', { name: 'Improved Energy Cell', category: 'weapon', cost: 4000, slotCost: 1, restriction: 'common', appliesTo: ['blaster'], requires: ['ranged_energy'], affectedAreas: ['power'], description: 'Higher capacity energy reservoir.' }),
  def('tremor_cell', { name: 'Tremor Cell', category: 'weapon', cost: 1000, slotCost: 1, restriction: 'common', appliesTo: ['blaster'], requires: ['ranged_energy'], affectedAreas: ['damage_type'], description: 'Alters projectile effect to tremor discharge.' }),
  def('computerized_interface_scope', { name: 'Computerized Interface Scope', category: 'weapon', cost: 2000, slotCost: 0, restriction: 'common', appliesTo: ['blaster'], requires: ['ranged'], affectedAreas: ['range'], description: 'Smart linked optics.' }),
  def('flash_suppressor_silencer', { name: 'Flash Suppressor/Silencer', category: 'weapon', cost: 400, slotCost: 0, restriction: 'common', appliesTo: ['blaster'], requires: ['ranged'], affectedAreas: ['stealth'], description: 'Suppresses muzzle flash and sound.' }),

  // Armor upgrades
  def('aquatic_adaptation', { name: 'Aquatic Adaptation', category: 'armor', cost: 500, slotCost: 1, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['environment'], description: 'Supports underwater activity.' }),
  def('armorplast', { name: 'Armorplast', category: 'armor', cost: 900, slotCost: 0, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['defense'], description: 'Improved armor plating.' }),
  def('climbing_claws', { name: 'Climbing Claws', category: 'armor', cost: 200, slotCost: 1, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['mobility'], description: 'Retractable climbing implements.' }),
  def('diagnostics_system', { name: 'Diagnostics System', category: 'armor', cost: 500, slotCost: 1, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['utility'], description: 'Built-in diagnostics.' }),
  def('environmental_systems', { name: 'Environmental Systems', category: 'armor', cost: 600, slotCost: 1, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['environment'], description: 'Environmental support package.' }),
  def('gyro', { name: 'Gyro', category: 'armor', cost: 250, slotCost: 1, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['mobility'], description: 'Stability gyros.' }),
  def('helmet_package', { name: 'Helmet Package', category: 'armor', cost: 4000, slotCost: 0, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['sensors'], description: 'Integrated helmet subsystem suite.' }),
  def('holoshroud', { name: 'Holoshroud', category: 'armor', cost: 5000, slotCost: 1, restriction: 'restricted', appliesTo: ['armor'], affectedAreas: ['stealth'], description: 'Active visual camouflage.' }),
  def('integrated_equipment_1', { name: 'Integrated Equipment, 1 Slot', category: 'armor', cost: 200, slotCost: 1, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['storage'], description: 'Integrates one slot of equipment.' }),
  def('integrated_equipment_2', { name: 'Integrated Equipment, 2 Slots', category: 'armor', cost: 500, slotCost: 1, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['storage'], description: 'Integrates two slots of equipment.' }),
  def('integrated_equipment_5', { name: 'Integrated Equipment, 5 Slots', category: 'armor', cost: 1000, slotCost: 1, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['storage'], description: 'Integrates five slots of equipment.' }),
  def('integrated_equipment_10', { name: 'Integrated Equipment, 10 Slots', category: 'armor', cost: 2000, slotCost: 2, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['storage'], description: 'Integrates ten slots of equipment.' }),
  def('internal_generator', { name: 'Internal Generator', category: 'armor', cost: 1000, slotCost: 1, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['power'], description: 'Provides onboard power.' }),
  def('jump_servos', { name: 'Jump Servos', category: 'armor', cost: 100, slotCost: 1, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['mobility'], description: 'Boosted leap capability.' }),
  def('powered_exoskeleton', { name: 'Powered Exoskeleton', category: 'armor', cost: 4000, slotCost: 2, restriction: 'licensed', appliesTo: ['armor'], affectedAreas: ['strength'], description: 'Powered assist frame.' }),
  def('radiation_shielding', { name: 'Radiation Shielding', category: 'armor', cost: 400, slotCost: 1, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['environment'], description: 'Protects against radiation.' }),
  def('rangefinder_armor', { name: 'Rangefinder', category: 'armor', cost: 500, slotCost: 1, restriction: 'licensed', appliesTo: ['armor'], affectedAreas: ['sensors'], description: 'Helmet rangefinding package.' }),
  def('ready_harness', { name: 'Ready Harness', category: 'armor', cost: 500, slotCost: 1, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['storage'], description: 'Fast access equipment harness.' }),
  def('repulsorlift_unit', { name: 'Repulsorlift Unit', category: 'armor', cost: 1000, slotCost: 1, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['mobility'], description: 'Short-range repulsor assist.' }),
  def('shadowskin', { name: 'Shadowskin', category: 'armor', cost: 5000, slotCost: 1, restriction: 'restricted', appliesTo: ['armor'], affectedAreas: ['stealth'], description: 'Adaptive shadowskin coating.' }),
  def('reflec_shadowskin', { name: 'Reflec Shadowskin', category: 'armor', cost: 20000, slotCost: 1, restriction: 'military', appliesTo: ['armor'], affectedAreas: ['stealth'], description: 'Military-grade reflec shadowskin.' }),
  def('shield_generator_sr5', { name: 'Shield Generator, SR 5', category: 'armor', cost: 5000, slotCost: 2, restriction: 'restricted', appliesTo: ['armor'], affectedAreas: ['shield'], description: 'Personal shield generator (SR 5).' }),
  def('shield_generator_sr10', { name: 'Shield Generator, SR 10', category: 'armor', cost: 10000, slotCost: 3, restriction: 'military', appliesTo: ['armor'], affectedAreas: ['shield'], description: 'Personal shield generator (SR 10).' }),
  def('shockweb', { name: 'Shockweb', category: 'armor', cost: 6000, slotCost: 1, restriction: 'military', appliesTo: ['armor'], affectedAreas: ['defense'], description: 'Electrical reactive defense mesh.' }),
  def('vacuum_seals_standard', { name: 'Vacuum Seals, Standard', category: 'armor', cost: 2000, slotCost: 0, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['environment'], description: 'Standard vacuum-rated seals.' }),
  def('vacuum_seals_improved', { name: 'Vacuum Seals, Improved', category: 'armor', cost: 5000, slotCost: 1, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['environment'], description: 'Improved vacuum seals.' }),
  def('weapon_mount_standard', { name: 'Weapon Mount, Standard', category: 'armor', cost: 1000, slotCost: 1, restriction: 'restricted', appliesTo: ['armor'], affectedAreas: ['mount'], description: 'Mounts a weapon to armor.' }),
  def('armor_reinforcement', { name: 'Armor Reinforcement', category: 'armor', cost: 3000, slotCost: 1, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['defense'], description: 'Reinforced armor shell.' }),
  def('mesh_underlay', { name: 'Mesh Underlay', category: 'armor', cost: 2500, slotCost: 2, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['defense'], description: 'Protective internal mesh.' }),
  def('night_vision_device', { name: 'Night Vision Device', category: 'armor', cost: 3000, slotCost: 0, restriction: 'common', appliesTo: ['armor'], affectedAreas: ['sensors'], description: 'Night-vision optics.' }),

  // Tech Specialist modifications (3 automatable armor/weapon + 4 rule-notes)
  // TS-2 includes only standard customization system categories (armor, weapon/blaster, gear)
  // Vehicle/droid traits deferred to TS-5 (requires separate system integration)

  // Armor traits (3 automatable)
  def('tech_agile_armor', { name: 'Agile Armor', category: 'tech-specialist', cost: 0, costFormula: 'max(10% of item cost, 1000 credits)', slotCost: 0, restriction: 'common', source: 'tech-specialist', appliesTo: ['armor'], affectedAreas: [], mechanicsDC: 20, timeHours: null, description: 'The armor\'s Maximum Dexterity Bonus increases by 1.', metadata: { trait: 'agile_armor', systemPath: 'system.armor.maxDexBonus', value: 1 } }),
  def('tech_fortifying_armor', { name: 'Fortifying Armor', category: 'tech-specialist', cost: 0, costFormula: 'max(10% of item cost, 1000 credits)', slotCost: 0, restriction: 'common', source: 'tech-specialist', appliesTo: ['armor'], affectedAreas: [], mechanicsDC: 20, timeHours: null, description: 'The armor grants a +1 equipment bonus to Fortitude Defense.', metadata: { trait: 'fortifying_armor', systemPath: 'system.defense.fortitude.equipment', value: 1 } }),
  def('tech_protective_armor', { name: 'Protective Armor', category: 'tech-specialist', cost: 0, costFormula: 'max(10% of item cost, 1000 credits)', slotCost: 0, restriction: 'common', source: 'tech-specialist', appliesTo: ['armor'], affectedAreas: [], mechanicsDC: 20, timeHours: null, description: 'The armor grants a +1 armor bonus to Reflex Defense.', metadata: { trait: 'protective_armor', systemPath: 'system.defense.reflex.armor', value: 1 } }),

  // Weapon traits (1 automatable + 1 rule-note)
  def('tech_improved_accuracy', { name: 'Improved Accuracy', category: 'tech-specialist', cost: 0, costFormula: 'max(10% of item cost, 1000 credits)', slotCost: 0, restriction: 'common', source: 'tech-specialist', appliesTo: ['weapon', 'blaster'], affectedAreas: [], mechanicsDC: 20, timeHours: null, description: 'The weapon grants a +1 equipment bonus to attack rolls.', metadata: { trait: 'improved_accuracy', systemPath: 'system.attack.equipment', value: 1 } }),
  def('tech_improved_damage', { name: 'Improved Damage', category: 'tech-specialist', cost: 0, costFormula: 'max(10% of item cost, 1000 credits)', slotCost: 0, restriction: 'common', source: 'tech-specialist', appliesTo: ['weapon', 'blaster'], affectedAreas: [], mechanicsDC: 20, timeHours: null, description: '[RULE-NOTE] Damage scaling is complex and context-dependent. Apply damage increases manually per game balance.', enabled: false }),
  def('tech_selective_fire', { name: 'Selective Fire', category: 'tech-specialist', cost: 0, costFormula: 'max(10% of item cost, 1000 credits)', slotCost: 0, restriction: 'common', source: 'tech-specialist', appliesTo: ['weapon', 'blaster'], affectedAreas: [], mechanicsDC: 20, timeHours: null, description: '[RULE-NOTE] Selective Fire mode requires weapon UI support not yet implemented. Configure fire modes manually in weapon sheet.', enabled: false }),

  // Note: Vehicle and Droid traits deferred to TS-5 (requires separate customization system integration)
  // Currently these systems use DroidCustomizationEngine and VehicleCustomizationEngine (hardcoded systems)
  // Tech Specialist modifications for vehicles/droids will be added when those systems are refactored

  // Device traits (1 rule-note, kept for gear category only)
  def('tech_improved_durability', { name: 'Improved Durability', category: 'tech-specialist', cost: 0, costFormula: 'max(10% of item cost, 1000 credits)', slotCost: 0, restriction: 'common', source: 'tech-specialist', appliesTo: ['gear'], affectedAreas: [], mechanicsDC: 20, timeHours: null, description: '[RULE-NOTE] Device durability is tracked via HP and Damage Reduction. Verify device schema before automating.', enabled: false }),
  def('tech_mastercraft_device', { name: 'Mastercraft Device', category: 'tech-specialist', cost: 0, costFormula: 'max(10% of item cost, 1000 credits)', slotCost: 0, restriction: 'common', source: 'tech-specialist', appliesTo: ['gear'], affectedAreas: [], mechanicsDC: 20, timeHours: null, description: '[RULE-NOTE] Mastercraft bonus context unclear (check bonus, initiative, other?). Configure manually per GM discretion.', enabled: false })
]);

export const TEMPLATE_CATALOG = {
  // Effects not provided in source text: these template entries currently enforce
  // legality, rarity, stacking, and category restrictions only.
  prototype_general: { key: 'prototype_general', name: 'Prototype General Template', category: 'template-general', appliesTo: ['weapon','blaster','armor'], rarity: true, restriction: 'common', stackable: true, costModifier: 1, description: 'Prototype template metadata only pending full effect data.' },
  cortosis_weave_general: { key: 'cortosis_weave_general', name: 'Cortosis Weave General Template', category: 'template-general', appliesTo: ['weapon','armor'], rarity: true, restriction: 'restricted', stackable: true, costModifier: 1, description: 'Cortosis weave metadata only pending full effect data.' },
  phrik_alloy_general: { key: 'phrik_alloy_general', name: 'Phrik Alloy General Template', category: 'template-general', appliesTo: ['weapon','armor'], rarity: true, restriction: 'restricted', stackable: true, costModifier: 1, description: 'Phrik alloy metadata only pending full effect data.' },
  mandalorian_general: { key: 'mandalorian_general', name: 'Mandalorian General Template', category: 'template-general', appliesTo: ['weapon','blaster','armor'], rarity: true, restriction: 'restricted', stackable: false, costModifier: 1, description: 'Mandalorian template metadata only pending full effect data.' },
  verpine_general: { key: 'verpine_general', name: 'Verpine General Template', category: 'template-general', appliesTo: ['blaster','armor'], rarity: true, restriction: 'common', stackable: false, costModifier: 1, description: 'Verpine template metadata only pending full effect data.' },
  quick_draw_weapon: { key: 'quick_draw_weapon', name: 'Quick Draw Weapon Template', category: 'template-weapon', appliesTo: ['weapon','blaster'], rarity: true, restriction: 'common', stackable: false, costModifier: 1, description: 'Quick Draw template metadata only pending full effect data.' },
  eriadun_armor: { key: 'eriadun_armor', name: 'Eriadun Armor Template', category: 'template-armor', appliesTo: ['armor'], rarity: true, restriction: 'common', stackable: false, costModifier: 1, description: 'Eriadun armor template metadata only pending full effect data.' }
};


export function getUpgradeDefinition(key) {
  return UPGRADE_CATALOG[key] || null;
}

export function getTemplateDefinition(key) {
  return TEMPLATE_CATALOG[key] || null;
}

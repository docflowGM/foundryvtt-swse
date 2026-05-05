/**
 * Canonical Tooltip Glossary
 *
 * This module serves as the authoritative source-of-truth for all tooltip definitions,
 * metadata, and semantic organization. It separates "what is this" (definitions) from
 * "where did this number come from" (breakdowns), introduces a tier model for
 * future expansion control, and provides a stable schema for contributors.
 *
 * Philosophy:
 * - Curated, not auto-generated
 * - Definitions answer "what" and "why"
 * - Breakdowns are registered separately as providers
 * - Tiers support future expansion without noise
 * - Localization-safe (i18n keys, not inline copy)
 * - Anti-spam by design (intentional hardpoints only)
 */

/**
 * TIER MODEL
 *
 * Tier 1: Core, always valuable to explain
 *   - Abilities, skills, defenses, HP, core combat stats
 *   - Should appear in help mode affordances
 *   - Candidates for pinned breakdowns in Phase 8+
 *
 * Tier 2: Situational secondary stats, subsystem labels
 *   - Derived stats with narrower use cases
 *   - Equipment and action palette
 *   - Show in help mode, lower priority
 *
 * Tier 3: Advanced/niche mechanics, future subsystems
 *   - Feats, talents (deferred to Phase 8+)
 *   - Force powers (deferred to Force sheet)
 *   - Vehicles, droids (deferred to other sheets)
 *   - Ultra-specialized rules concepts
 */

export const TooltipGlossary = {
  // ========================================================================
  // CORE MECHANICS (Tier 1)
  // ========================================================================

  HitPoints: {
    key: 'HitPoints',
    label: 'Hit Points',
    category: 'core-mechanics',
    tier: 'tier1',
    short: 'How much damage you can take',
    long: 'Hit Points represent your health. When you take damage, reduce HP by that amount. If HP reaches 0, you fall unconscious.',
    hasBreakdown: false,
    hasReference: true,  // Phase 11: Datapad reference available
    referenceId: 'swse-ref-hit-points',  // Journal entry ID
    related: ['DamageThreshold', 'ConditionTrack'],
    i18nPrefix: 'SWSE.Discovery.Tooltip.HitPoints',
    tags: ['health', 'defense', 'core'],
    notes: 'Core survival mechanic. No breakdown needed; value is displayed directly.'
  },

  DamageThreshold: {
    key: 'DamageThreshold',
    label: 'Damage Threshold',
    category: 'core-mechanics',
    tier: 'tier1',
    short: 'Armor damage reduction',
    long: 'Damage Threshold is how much damage your armor reduces from each attack (minimum 0). This represents physical protection from equipped armor and natural toughness.',
    hasBreakdown: false,
    hasReference: true,
    referenceId: 'swse-ref-damage-threshold',
    related: ['HitPoints'],
    i18nPrefix: 'SWSE.Discovery.Tooltip.DamageThreshold',
    tags: ['defense', 'armor', 'derived'],
    notes: 'Derived from armor equipped. See armor descriptions for specifics.'
  },

  ForcePoints: {
    key: 'ForcePoints',
    label: 'Force Points',
    category: 'core-mechanics',
    tier: 'tier1',
    short: 'Fuel for Force abilities',
    long: 'Force Points fuel your Force powers. Spend them to activate Force talents and abilities. Refresh at the end of each encounter.',
    hasBreakdown: false,
    hasReference: true,
    referenceId: 'swse-ref-force-points',
    related: ['DestinyPoints', 'UseTheForce'],
    i18nPrefix: 'SWSE.Discovery.Tooltip.ForcePoints',
    tags: ['force', 'resource', 'core'],
    notes: 'Limited resource. Consider Tier 2 for non-Force-users.'
  },

  DestinyPoints: {
    key: 'DestinyPoints',
    label: 'Destiny Points',
    category: 'core-mechanics',
    tier: 'tier1',
    short: 'Bend fate in your favor',
    long: 'Destiny Points represent your character\'s narrative importance. Spend them to reroll any d20 result, or grant an ally an immediate extra action. Limited per encounter.',
    hasBreakdown: false,
    related: ['ForcePoints'],
    i18nPrefix: 'SWSE.Discovery.Tooltip.DestinyPoints',
    tags: ['meta', 'resource', 'narrative'],
    notes: 'Rare and powerful. Make usage meaningful.'
  },

  ConditionTrack: {
    key: 'ConditionTrack',
    label: 'Condition Track',
    category: 'core-mechanics',
    tier: 'tier1',
    short: 'Active status effects',
    long: 'The Condition Track shows status effects currently affecting you (blinded, shaken, stunned, etc.). Effects modify rolls and actions until resolved.',
    hasBreakdown: false,
    hasReference: true,
    referenceId: 'swse-ref-condition-track',
    related: ['HitPoints'],
    i18nPrefix: 'SWSE.Discovery.Tooltip.ConditionTrack',
    tags: ['status', 'condition', 'core'],
    notes: 'Visual indicator of active debuffs. Important for new players to understand.'
  },

  // ========================================================================
  // COMBAT STATS (Tier 1) — All have breakdown providers
  // ========================================================================

  Initiative: {
    key: 'Initiative',
    label: 'Initiative',
    category: 'combat-stats',
    tier: 'tier1',
    short: 'How fast you act in combat',
    long: 'Initiative determines turn order. Higher Initiative acts first. Roll d20 + Initiative modifier at the start of combat. Derived from Dexterity.',
    hasBreakdown: true,
    breakdownKey: 'InitiativeBreakdown',
    hasReference: true,
    referenceId: 'swse-ref-initiative',
    i18nPrefix: 'SWSE.Discovery.Tooltip.Initiative',
    tags: ['combat', 'derived', 'dexterity'],
    notes: 'Derived stat. Breakdown provider registered separately; see WeaponTooltip or DefenseTooltip.'
  },

  BaseAttackBonus: {
    key: 'BaseAttackBonus',
    label: 'Base Attack Bonus',
    category: 'combat-stats',
    tier: 'tier1',
    short: 'Melee and ranged attack accuracy',
    long: 'Base Attack Bonus adds to your attack rolls with weapons and unarmed strikes. Higher BAB means you hit more often. Increases with character level.',
    hasBreakdown: true,
    breakdownKey: 'BaseAttackBonusBreakdown',
    hasReference: true,
    referenceId: 'swse-ref-base-attack-bonus',
    related: ['Grapple'],
    i18nPrefix: 'SWSE.Discovery.Tooltip.BaseAttackBonus',
    tags: ['combat', 'attack', 'derived'],
    notes: 'Scales with level. Breakdown shows level contribution and class bonuses.'
  },

  Grapple: {
    key: 'Grapple',
    label: 'Grapple',
    category: 'combat-stats',
    tier: 'tier1',
    short: 'Unarmed melee attack bonus',
    long: 'Grapple is your bonus to unarmed melee attacks (punches, grabs, throws). Used for wrestling and unarmed combat. Derived from BAB + Strength.',
    hasBreakdown: true,
    breakdownKey: 'GrappleBreakdown',
    hasReference: true,
    referenceId: 'swse-ref-grapple',
    related: ['BaseAttackBonus'],
    i18nPrefix: 'SWSE.Discovery.Tooltip.Grapple',
    tags: ['combat', 'unarmed', 'derived'],
    notes: 'Depends on BAB and Strength modifier. Shows both components in breakdown.'
  },

  // ========================================================================
  // DEFENSES (Tier 1) — All have breakdown providers
  // ========================================================================

  ReflexDefense: {
    key: 'ReflexDefense',
    label: 'Reflex Defense',
    category: 'defenses',
    tier: 'tier1',
    short: 'Dodge and quick reactions',
    long: 'Reflex Defense is what enemies roll against to hit you. Based on 10 + Dexterity modifier + other bonuses. Protects against ranged attacks, grenades, and rapid strikes.',
    hasBreakdown: true,
    breakdownKey: 'ReflexDefenseBreakdown',
    hasReference: true,
    referenceId: 'swse-ref-reflex-defense',
    i18nPrefix: 'SWSE.Discovery.Tooltip.ReflexDefense',
    tags: ['defense', 'derived', 'dexterity'],
    notes: 'Primary defense for avoiding ranged attacks. Breakdown shows base, modifiers, and bonuses.'
  },

  FortitudeDefense: {
    key: 'FortitudeDefense',
    label: 'Fortitude Defense',
    category: 'defenses',
    tier: 'tier1',
    short: 'Physical toughness',
    long: 'Fortitude Defense is what enemies roll against to hit you with physical attacks. Based on 10 + Constitution modifier + other bonuses. Resists poison and disease.',
    hasBreakdown: true,
    breakdownKey: 'FortitudeDefenseBreakdown',
    hasReference: true,
    referenceId: 'swse-ref-fortitude-defense',
    i18nPrefix: 'SWSE.Discovery.Tooltip.FortitudeDefense',
    tags: ['defense', 'derived', 'constitution'],
    notes: 'Primary defense against melee attacks. Improved by high Constitution.'
  },

  WillDefense: {
    key: 'WillDefense',
    label: 'Will Defense',
    category: 'defenses',
    tier: 'tier1',
    short: 'Mental fortitude and resolve',
    long: 'Will Defense is what enemies roll against to hit you with mind-affecting attacks. Based on 10 + Wisdom modifier + other bonuses. Resists fear, mind-control, and illusions.',
    hasBreakdown: true,
    breakdownKey: 'WillDefenseBreakdown',
    hasReference: true,
    referenceId: 'swse-ref-will-defense',
    i18nPrefix: 'SWSE.Discovery.Tooltip.WillDefense',
    tags: ['defense', 'derived', 'wisdom'],
    notes: 'Defends against mental attacks. Improved by high Wisdom.'
  },

  FlatFooted: {
    key: 'FlatFooted',
    label: 'Flat-Footed Defense',
    category: 'defenses',
    tier: 'tier1',
    short: 'Defense when caught by surprise',
    long: 'Flat-Footed Defense is your defense when you lose Dexterity bonus (surprised, blinded, paralyzed). Usually much lower than normal defenses.',
    hasBreakdown: true,
    breakdownKey: 'FlatFootedBreakdown',
    hasReference: true,
    referenceId: 'swse-ref-flat-footed',
    i18nPrefix: 'SWSE.Discovery.Tooltip.FlatFooted',
    tags: ['defense', 'derived', 'condition'],
    notes: 'Triggered by surprise, blinding, paralysis. Critical for new players to understand danger.'
  },

  // ========================================================================
  // ABILITY SCORES (Tier 1) — No breakdowns; core attributes
  // ========================================================================

  Strength: {
    key: 'Strength',
    label: 'Strength',
    category: 'abilities',
    tier: 'tier1',
    short: 'Physical power and force',
    long: 'Strength measures muscular power and physical force. Use for melee attacks, climbing, and breaking things. High Strength improves Grapple bonus.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Strength',
    tags: ['ability', 'physical', 'core'],
    notes: 'Base ability score. Used by multiple skills and combat actions.'
  },

  Dexterity: {
    key: 'Dexterity',
    label: 'Dexterity',
    category: 'abilities',
    tier: 'tier1',
    short: 'Agility and hand-eye coordination',
    long: 'Dexterity measures agility, balance, and reflexes. Use for ranged attacks, dodging, and acrobatic feats. High Dexterity improves Reflex Defense and Initiative.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Dexterity',
    tags: ['ability', 'physical', 'core'],
    notes: 'Most important for ranged combat and defense. Critical for new players.'
  },

  Constitution: {
    key: 'Constitution',
    label: 'Constitution',
    category: 'abilities',
    tier: 'tier1',
    short: 'Health and physical endurance',
    long: 'Constitution measures physical health and stamina. Use for staying conscious and resisting poison and disease. High Constitution improves Fortitude Defense and Hit Points.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Constitution',
    tags: ['ability', 'physical', 'core'],
    notes: 'Affects HP and Fortitude. Second-most important after Dexterity for survival.'
  },

  Intelligence: {
    key: 'Intelligence',
    label: 'Intelligence',
    category: 'abilities',
    tier: 'tier1',
    short: 'Logic, reasoning, and knowledge',
    long: 'Intelligence measures intellectual capacity and technical knowledge. Use for research, hacking, and technical repairs. Bonus to Knowledge and Mechanics checks.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Intelligence',
    tags: ['ability', 'mental', 'core'],
    notes: 'Used by Knowledge and Mechanics skills. Essential for tech-focused characters.'
  },

  Wisdom: {
    key: 'Wisdom',
    label: 'Wisdom',
    category: 'abilities',
    tier: 'tier1',
    short: 'Perception, insight, and awareness',
    long: 'Wisdom measures perception and intuition. Use for noticing details, sensing deception, and meditation. High Wisdom improves Will Defense. Used by Force-sensitive characters.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Wisdom',
    tags: ['ability', 'mental', 'core'],
    notes: 'Key for Perception, Survival, and Force use. Often undervalued by new players.'
  },

  Charisma: {
    key: 'Charisma',
    label: 'Charisma',
    category: 'abilities',
    tier: 'tier1',
    short: 'Force of personality and presence',
    long: 'Charisma measures force of personality and social ability. Use for persuading, deceiving, and inspiring others. Bonus to Persuasion, Deception, and Gather Information checks.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Charisma',
    tags: ['ability', 'social', 'core'],
    notes: 'Used by social skills. Important for leaders and diplomats.'
  },

  // ========================================================================
  // SKILLS (Tier 1) — All are player-facing, no breakdowns
  // ========================================================================

  Acrobatics: {
    key: 'Acrobatics',
    label: 'Acrobatics',
    category: 'skills',
    tier: 'tier1',
    short: 'Balance, flips, and evasive movement',
    long: 'Acrobatics covers balance, tumbling, gymnastics, and evasive motion. Use to avoid hazards, stay on narrow surfaces, or reduce falling damage.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Acrobatics',
    tags: ['skill', 'dexterity'],
    notes: 'Trained skill. Based on Dexterity. Useful for combat mobility and hazard avoidance.'
  },

  Climb: {
    key: 'Climb',
    label: 'Climb',
    category: 'skills',
    tier: 'tier1',
    short: 'Ascending walls, cliffs, and surfaces',
    long: 'Climb covers ascending any surface—walls, cliff faces, ship exteriors, or trees. Opposed by the difficulty of the surface. Low angle = easier, vertical = harder, overhang = very hard.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Climb',
    tags: ['skill', 'strength'],
    notes: 'Trained skill. Based on Strength. Good for exploration and tactical positioning.'
  },

  Deception: {
    key: 'Deception',
    label: 'Deception',
    category: 'skills',
    tier: 'tier1',
    short: 'Lying and creating false impressions',
    long: 'Deception covers lying convincingly, disguising your true intentions, and bluffing. Use to fool guards, con merchants, or deceive NPCs.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Deception',
    tags: ['skill', 'charisma'],
    notes: 'Trained skill. Based on Charisma. Social skill for manipulation.'
  },

  Endurance: {
    key: 'Endurance',
    label: 'Endurance',
    category: 'skills',
    tier: 'tier1',
    short: 'Sustained physical effort and survival',
    long: 'Endurance covers sustained physical effort, holding breath, and resisting fatigue, hunger, and thirst. Use for long marches, underwater work, or desert survival.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Endurance',
    tags: ['skill', 'constitution'],
    notes: 'Trained skill. Based on Constitution. Useful for harsh environments.'
  },

  GatherInformation: {
    key: 'GatherInformation',
    label: 'Gather Information',
    category: 'skills',
    tier: 'tier1',
    short: 'Finding rumors and local knowledge',
    long: 'Gather Information covers questioning people and acquiring local knowledge. Use to find rumors, track down contacts, learn gossip, or discover secrets.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.GatherInformation',
    tags: ['skill', 'charisma'],
    notes: 'Trained skill. Based on Charisma. Social skill for information gathering.'
  },

  Jump: {
    key: 'Jump',
    label: 'Jump',
    category: 'skills',
    tier: 'tier1',
    short: 'Broad and high jumps',
    long: 'Jump covers making broad and high jumps. Use to clear chasms, reach high platforms, vault over obstacles, or make dramatic leaps.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Jump',
    tags: ['skill', 'strength'],
    notes: 'Trained skill. Based on Strength. Useful for exploration and evasion.'
  },

  Knowledge: {
    key: 'Knowledge',
    label: 'Knowledge',
    category: 'skills',
    tier: 'tier1',
    short: 'Recalling facts and galactic lore',
    long: 'Knowledge covers learned information about history, cultures, species, and the galaxy. Use to recall facts, identify creatures, or understand alien societies.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Knowledge',
    tags: ['skill', 'intelligence'],
    notes: 'Trained skill. Based on Intelligence. Knowledge is power in diplomacy.'
  },

  Mechanics: {
    key: 'Mechanics',
    label: 'Mechanics',
    category: 'skills',
    tier: 'tier1',
    short: 'Repairing and building technology',
    long: 'Mechanics covers repair, modification, and building of technology. Use to fix droids, maintain starships, hack computers, or build gadgets and devices.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Mechanics',
    tags: ['skill', 'intelligence'],
    notes: 'Trained skill. Based on Intelligence. Essential for tech-focused characters.'
  },

  Perception: {
    key: 'Perception',
    label: 'Perception',
    category: 'skills',
    tier: 'tier1',
    short: 'Spotting hidden objects and details',
    long: 'Perception covers spotting hidden people, objects, and details. Use to notice ambushes, find hidden items, spot clues at a crime scene, or search locations.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Perception',
    tags: ['skill', 'wisdom'],
    notes: 'Trained skill. Based on Wisdom. Often determines if you see threats first.'
  },

  Persuasion: {
    key: 'Persuasion',
    label: 'Persuasion',
    category: 'skills',
    tier: 'tier1',
    short: 'Convincing others through reason or emotion',
    long: 'Persuasion covers appealing to emotion or reason to convince others. Use to negotiate, inspire allies, or convince someone to help you.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Persuasion',
    tags: ['skill', 'charisma'],
    notes: 'Trained skill. Based on Charisma. Social skill for cooperation.'
  },

  Pilot: {
    key: 'Pilot',
    label: 'Pilot',
    category: 'skills',
    tier: 'tier1',
    short: 'Operating ships and vehicles',
    long: 'Pilot covers the operation and maneuvering of vehicles. Use to fly starships, drive speeders, pilot walkers, or navigate any vehicle in dangerous situations.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Pilot',
    tags: ['skill', 'dexterity'],
    notes: 'Trained skill. Based on Dexterity. Essential for space combat and chases.'
  },

  Ride: {
    key: 'Ride',
    label: 'Ride',
    category: 'skills',
    tier: 'tier1',
    short: 'Controlling and riding mounts',
    long: 'Ride covers controlling and remaining mounted on living creatures. Use to ride tauntauns, dewbacks, or other mounts in travel or combat.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Ride',
    tags: ['skill', 'dexterity'],
    notes: 'Trained skill. Based on Dexterity. Useful in mounted combat scenarios.'
  },

  Stealth: {
    key: 'Stealth',
    label: 'Stealth',
    category: 'skills',
    tier: 'tier1',
    short: 'Remaining hidden and undetected',
    long: 'Stealth covers remaining undetected by hiding, moving silently, or staying out of sight. Use to sneak, approach unseen, or escape notice.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Stealth',
    tags: ['skill', 'dexterity'],
    notes: 'Trained skill. Based on Dexterity. Critical for scouts and infiltrators.'
  },

  Survival: {
    key: 'Survival',
    label: 'Survival',
    category: 'skills',
    tier: 'tier1',
    short: 'Thriving in the wilderness',
    long: 'Survival covers living off the land and wilderness navigation. Use to track creatures, find food and water, navigate deserts or wastelands, or predict weather.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Survival',
    tags: ['skill', 'wisdom'],
    notes: 'Trained skill. Based on Wisdom. Essential for exploration and desert survival.'
  },

  Swim: {
    key: 'Swim',
    label: 'Swim',
    category: 'skills',
    tier: 'tier1',
    short: 'Moving and breathing underwater',
    long: 'Swim covers movement and survival in water. Use to cross rivers, swim underwater, escape water hazards, or hold breath for extended periods.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.Swim',
    tags: ['skill', 'strength'],
    notes: 'Trained skill. Based on Strength. Useful for water-based scenarios.'
  },

  TreatInjury: {
    key: 'TreatInjury',
    label: 'Treat Injury',
    category: 'skills',
    tier: 'tier1',
    short: 'First aid and medical treatment',
    long: 'Treat Injury covers first aid, medicine, and healing. Use to stop bleeding, treat poison, revive unconscious allies, provide medical care, or remove disease.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.TreatInjury',
    tags: ['skill', 'wisdom'],
    notes: 'Trained skill. Based on Wisdom. Essential for party survival.'
  },

  UseComputer: {
    key: 'UseComputer',
    label: 'Use Computer',
    category: 'skills',
    tier: 'tier1',
    short: 'Operating and hacking computers',
    long: 'Use Computer covers using, programming, and hacking computer systems. Use to access terminals, slice into secure networks, steal data, or control ship systems.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.UseComputer',
    tags: ['skill', 'intelligence'],
    notes: 'Trained skill. Based on Intelligence. Essential for hackers and tech specialists.'
  },

  UseTheForce: {
    key: 'UseTheForce',
    label: 'Use the Force',
    category: 'skills',
    tier: 'tier1',
    short: 'Channeling the Force for abilities',
    long: 'Use the Force covers manifesting Force talents and powers. Use to sense emotions, move objects with the mind, or activate Force abilities that you have trained.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.UseTheForce',
    tags: ['skill', 'wisdom', 'force'],
    notes: 'Trained skill. Based on Wisdom. Only for Force-sensitive characters.'
  },

  // ========================================================================
  // EQUIPMENT (Tier 2) — Future use; deferred to items/weapons phase
  // ========================================================================

  WeaponAttack: {
    key: 'WeaponAttack',
    label: 'Weapon Attack',
    category: 'equipment',
    tier: 'tier2',
    short: 'Attack bonus with this weapon',
    long: 'The total bonus you add to attack rolls with this weapon. Includes your BAB, ability modifiers, and any bonuses from the weapon itself.',
    hasBreakdown: true,
    breakdownKey: 'WeaponAttackBreakdown',
    i18nPrefix: 'SWSE.Discovery.Tooltip.WeaponAttack',
    tags: ['weapon', 'attack', 'equipment'],
    notes: 'Deferred to Phase 8+. Breakdown provider registered but not yet wired to item sheets.'
  },

  WeaponDamage: {
    key: 'WeaponDamage',
    label: 'Weapon Damage',
    category: 'equipment',
    tier: 'tier2',
    short: 'Damage dealt on successful hit',
    long: 'The damage this weapon deals on a successful hit. Includes weapon die, ability modifiers, and any damage bonuses.',
    hasBreakdown: true,
    breakdownKey: 'WeaponDamageBreakdown',
    i18nPrefix: 'SWSE.Discovery.Tooltip.WeaponDamage',
    tags: ['weapon', 'damage', 'equipment'],
    notes: 'Deferred to Phase 8+. Used when weapon items are displayed on character sheet.'
  },

  ArmorPenalty: {
    key: 'ArmorPenalty',
    label: 'Armor Penalty',
    category: 'equipment',
    tier: 'tier2',
    short: 'Skill check penalty from armor',
    long: 'Heavy armor reduces your mobility. This penalty applies to Acrobatics, Climb, Escape Artist, Hide, Jump, Move Silently, and Sleight of Hand checks.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.ArmorPenalty',
    tags: ['armor', 'equipment', 'penalty'],
    notes: 'Deferred to Phase 8+. Item-sheet specific.'
  },

  // ========================================================================
  // ACTION PALETTE & UI (Tier 2) — Future use
  // ========================================================================

  ActionPalette: {
    key: 'ActionPalette',
    label: 'Action Palette',
    category: 'ui-feature',
    tier: 'tier2',
    short: 'Quick access to your frequent actions',
    long: 'Customize this palette with your most-used actions, abilities, and spells for quick access during gameplay.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.ActionPalette',
    tags: ['ui', 'action', 'feature'],
    notes: 'Deferred to Phase 8+. UI-focused; no breakdown needed.'
  },

  PaletteMode: {
    key: 'PaletteMode',
    label: 'Palette Mode',
    category: 'ui-feature',
    tier: 'tier2',
    short: 'Toggle between palette modes',
    long: 'Different palette configurations for different situations. E.g., "Combat" for combat actions, "Roleplay" for social actions.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.PaletteMode',
    tags: ['ui', 'feature'],
    notes: 'Deferred to Phase 8+.'
  },

  ActionDisabled: {
    key: 'ActionDisabled',
    label: 'Action Disabled',
    category: 'ui-feature',
    tier: 'tier2',
    short: 'Action cannot be used now',
    long: 'This action is not available right now. You may lack the resources, be in the wrong situation, or not have the prerequisite ability.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.ActionDisabled',
    tags: ['ui', 'feature', 'condition'],
    notes: 'Deferred to Phase 8+. Generic; reused across many disabled actions.'
  },

  // ========================================================================
  // FEATS & TALENTS (Tier 3) — Deferred to Phase 8+ (separate feat system)
  // ========================================================================

  PassiveTalent: {
    key: 'PassiveTalent',
    label: 'Passive Talent',
    category: 'feats-talents',
    tier: 'tier3',
    short: 'Always-active ability',
    long: 'This talent is always active. You do not need to spend actions or resources to use its benefits.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.PassiveTalent',
    tags: ['talent', 'passive', 'ability'],
    notes: 'Deferred to Phase 8+. Generic template for passive talents on item sheets.'
  },

  ActiveTalent: {
    key: 'ActiveTalent',
    label: 'Active Talent',
    category: 'feats-talents',
    tier: 'tier3',
    short: 'Talent you can activate in combat',
    long: 'You can activate this talent during your turn in combat by spending the action indicated. See the talent description for effects.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.ActiveTalent',
    tags: ['talent', 'active', 'ability'],
    notes: 'Deferred to Phase 8+. Generic template for active talents on item sheets.'
  },

  UsageLimit: {
    key: 'UsageLimit',
    label: 'Usage Limit',
    category: 'feats-talents',
    tier: 'tier3',
    short: 'How many times you can use this',
    long: 'This ability has a limit on how many times you can use it. See the limit type (per encounter, per day, once per round, etc.) and refresh rules.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.UsageLimit',
    tags: ['talent', 'limit', 'resource'],
    notes: 'Deferred to Phase 8+. Shows usage tracking UI.'
  },

  // ========================================================================
  // CHARGEN (Tier 3) — Separate chargen tooltip system
  // ========================================================================

  ChargenNarrative: {
    key: 'ChargenNarrative',
    label: 'Character Narrative',
    category: 'chargen',
    tier: 'tier3',
    short: 'Your character\'s story setup',
    long: 'This is the opening narrative that sets the scene for your character\'s story.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.ChargenNarrative',
    tags: ['chargen', 'narrative', 'story'],
    notes: 'Deferred. Used in chargen app only, not on character sheet.'
  },

  ChargenMentor: {
    key: 'ChargenMentor',
    label: 'Mentor Guidance',
    category: 'chargen',
    tier: 'tier3',
    short: 'Mentor system guidance',
    long: 'Your mentor is here to help guide you through character creation. Listen to their advice!',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.ChargenMentor',
    tags: ['chargen', 'mentor', 'guidance'],
    notes: 'Deferred. Chargen-only. Uses "Mentor" voice, not "Datapad System UI".'
  },

  ChargenRollMethod: {
    key: 'ChargenRollMethod',
    label: 'Ability Score Rolling Method',
    category: 'chargen',
    tier: 'tier3',
    short: 'How to generate ability scores',
    long: 'Choose how to generate your ability scores: standard array, 4d6 drop-lowest, or point buy.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.ChargenRollMethod',
    tags: ['chargen', 'ability', 'choice'],
    notes: 'Deferred. Chargen-only.'
  },

  ChargenSpecies: {
    key: 'ChargenSpecies',
    label: 'Species',
    category: 'chargen',
    tier: 'tier3',
    short: 'Choose your character\'s species',
    long: 'Your species determines your ability bonuses, starting languages, and special traits.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.ChargenSpecies',
    tags: ['chargen', 'choice', 'species'],
    notes: 'Deferred. Chargen-only.'
  },

  ChargenClass: {
    key: 'ChargenClass',
    label: 'Class',
    category: 'chargen',
    tier: 'tier3',
    short: 'Choose your character\'s class',
    long: 'Your class determines your hit dice, skill points, special abilities, and progression.',
    hasBreakdown: false,
    i18nPrefix: 'SWSE.Discovery.Tooltip.ChargenClass',
    tags: ['chargen', 'choice', 'class'],
    notes: 'Deferred. Chargen-only.'
  },

  // ========================================================================
  // CUSTOMIZATION BAY / STORE / STREET-LEGAL BUILDER (Tier 2)
  // ========================================================================

  'bay.context.buildNew': {
    key: 'bay.context.buildNew',
    label: 'Build New',
    category: 'customization-bay',
    tier: 'tier2',
    short: 'Start from a legal base frame.',
    long: 'Build New starts from a chassis or hull frame and walks through the legal, costed choices needed to create a new droid or starship draft.',
    tags: ['customization', 'store', 'builder']
  },

  'bay.context.modifyExisting': {
    key: 'bay.context.modifyExisting',
    label: 'Modify Existing',
    category: 'customization-bay',
    tier: 'tier2',
    short: 'Edit an owned asset without bypassing validation.',
    long: 'Modify Existing loads the current droid or ship state, tracks installed systems and upgrade slots, and previews the cost and legality of proposed changes before an engine applies them.',
    tags: ['customization', 'owned', 'engine']
  },

  'bay.context.storeQuote': {
    key: 'bay.context.storeQuote',
    label: 'Store Quote',
    category: 'customization-bay',
    tier: 'tier2',
    short: 'Preview price, availability, and vendor risk.',
    long: 'Store Quote mode is for pricing and availability. It should use store and transaction engines for credits, availability, licenses, and black-market risk.',
    tags: ['store', 'credits', 'availability']
  },

  'bay.context.chargenDraft': {
    key: 'bay.context.chargenDraft',
    label: 'Chargen Draft',
    category: 'customization-bay',
    tier: 'tier2',
    short: 'Prepare a droid build for character creation.',
    long: 'Chargen Draft mode keeps the build compatible with progression rules, unresolved-choice tracking, and GM approval for droid player characters.',
    tags: ['chargen', 'droid', 'progression']
  },

  'garage.chassis': {
    key: 'garage.chassis',
    label: 'Droid Chassis',
    category: 'droid-garage',
    tier: 'tier2',
    short: 'The base frame for a droid build.',
    long: 'The chassis determines the droid’s starting frame, degree, rough role, starting systems, cost, and which options are legal before upgrades are added.',
    tags: ['droid', 'chassis', 'garage']
  },

  'garage.role': {
    key: 'garage.role',
    label: 'Droid Role',
    category: 'droid-garage',
    tier: 'tier2',
    short: 'The droid’s intended job.',
    long: 'Role guides suggested systems and validates whether the build is a protocol droid, astromech, slicer, medic, scout, combat unit, or another supported purpose.',
    tags: ['droid', 'role', 'garage']
  },

  'garage.locomotion': {
    key: 'garage.locomotion',
    label: 'Locomotion Bay',
    category: 'droid-garage',
    tier: 'tier2',
    short: 'How the droid moves.',
    long: 'Locomotion controls the droid’s movement profile. Wheels, tracks, legs, repulsors, magnetic clamps, and aquatic systems can affect legality, price, and usable environments.',
    tags: ['droid', 'movement', 'garage']
  },

  'garage.appendages': {
    key: 'garage.appendages',
    label: 'Appendage Bay',
    category: 'droid-garage',
    tier: 'tier2',
    short: 'Manipulators, probes, arms, and mounts.',
    long: 'Appendages determine what the droid can physically interact with: tool arms, claws, fine manipulators, probes, integrated kits, and restricted weapon mounts.',
    tags: ['droid', 'appendage', 'garage']
  },

  'garage.systems': {
    key: 'garage.systems',
    label: 'Droid Systems',
    category: 'droid-garage',
    tier: 'tier2',
    short: 'Installed droid equipment and processors.',
    long: 'Systems include processors, sensors, vocabulator modules, comlinks, tool packages, armor plating, and other installed droid equipment. These should be validated by the droid customization engine.',
    tags: ['droid', 'systems', 'engine']
  },

  'chargen.droidReadiness': {
    key: 'chargen.droidReadiness',
    label: 'Droid Chargen Readiness',
    category: 'chargen',
    tier: 'tier2',
    short: 'Whether this droid can become a player character draft.',
    long: 'Chargen readiness checks whether the droid build has a legal chassis, required starting package, unresolved choices, and any GM approval flags needed for character creation.',
    tags: ['chargen', 'droid', 'readiness']
  },

  'shipyard.hull': {
    key: 'shipyard.hull',
    label: 'Hull Frame',
    category: 'shipyard',
    tier: 'tier2',
    short: 'The base frame for a starship build.',
    long: 'Hull frame sets the ship’s scale, baseline crew/passengers/cargo, cost, and starting slot structure before systems and upgrades are installed.',
    tags: ['ship', 'hull', 'shipyard']
  },

  'shipyard.role': {
    key: 'shipyard.role',
    label: 'Ship Role',
    category: 'shipyard',
    tier: 'tier2',
    short: 'The ship’s intended mission profile.',
    long: 'Ship role guides suggested systems and warnings. A courier, smuggler, gunship, explorer, hauler, or troop transport should have different upgrade priorities and legal risks.',
    tags: ['ship', 'role', 'shipyard']
  },

  'shipyard.systemBays': {
    key: 'shipyard.systemBays',
    label: 'System Bays',
    category: 'shipyard',
    tier: 'tier2',
    short: 'Engines, shields, weapons, cargo, sensors, and other installed ship systems.',
    long: 'System bays divide ship upgrades into engine, hyperdrive, shield, armor, weapon, sensor, cargo, crew, droid socket, and luxury categories. Slot/cost legality should come from the vehicle customization engine.',
    tags: ['ship', 'systems', 'engine']
  },

  'shipyard.hardpoints': {
    key: 'shipyard.hardpoints',
    label: 'Weapon Hardpoints',
    category: 'shipyard',
    tier: 'tier2',
    short: 'Where ship weapons are mounted.',
    long: 'Hardpoints describe forward, aft, port, starboard, and turret weapon positions. Weapon mounting should respect slots, arcs, legality, and hull restrictions.',
    tags: ['ship', 'weapon', 'hardpoint']
  },

  'shipyard.storeQuote': {
    key: 'shipyard.storeQuote',
    label: 'Shipyard Store Quote',
    category: 'shipyard',
    tier: 'tier2',
    short: 'Parts availability and purchase quote.',
    long: 'The store quote previews vendor availability, legal sourcing, black-market risk, deposit, financing, and total price before any transaction engine spends credits.',
    tags: ['ship', 'store', 'quote']
  },

  'shipyard.ownedModify': {
    key: 'shipyard.ownedModify',
    label: 'Owned Ship Modification',
    category: 'shipyard',
    tier: 'tier2',
    short: 'Modify an existing ship using its current slots and installed systems.',
    long: 'Owned modification starts from the ship’s current state, previews uninstall/swap/replace options, recalculates upgrade slots, and flags legal changes before applying an engine transaction.',
    tags: ['ship', 'owned', 'upgrade']
  },

  'streetLegal.restricted': {
    key: 'streetLegal.restricted',
    label: 'Street-Legal Compliance',
    category: 'legality',
    tier: 'tier2',
    short: 'Whether the build can be used without legal trouble.',
    long: 'Street-legal compliance summarizes civilian legality, licenses, restricted components, military hardware, black-market parts, and whether GM review is required.',
    tags: ['legal', 'license', 'restricted']
  },

  'streetLegal.shipRestricted': {
    key: 'streetLegal.shipRestricted',
    label: 'Ship Restricted Status',
    category: 'legality',
    tier: 'tier2',
    short: 'A ship build contains systems that may trigger inspection or GM review.',
    long: 'Restricted ship status can come from transponder issues, concealed compartments, military shields, weapon systems, or black-market sourcing. The app should preview this without mutating the ship.',
    tags: ['legal', 'ship', 'restricted']
  },

  ArmorCheckPenalty: {
    key: 'ArmorCheckPenalty',
    label: 'Armor Check Penalty',
    category: 'equipment',
    tier: 'tier2',
    short: 'A penalty from bulky or restrictive armor.',
    long: 'Armor check penalty reduces physical skill checks when armor makes movement harder. Keep it visually separate from ability colors and signed math states.',
    tags: ['armor', 'skill', 'penalty']
  },

  UpgradeSlots: {
    key: 'UpgradeSlots',
    label: 'Upgrade Slots',
    category: 'customization',
    tier: 'tier2',
    short: 'Capacity used by installed modifications.',
    long: 'Upgrade slots are the controlled capacity budget for installed systems. Engines should calculate total, used, remaining, and over-slot warnings.',
    tags: ['customization', 'slots', 'engine']
  }

};

/**
 * Helper: Get a glossary entry by semantic key.
 * @param {string} key - E.g., 'HitPoints', 'ReflexDefense', 'Acrobatics'
 * @returns {Object|null} - The full entry object, or null if not found
 */
export function getGlossaryEntry(key) {
  return TooltipGlossary[key] || null;
}

/**
 * Helper: Get all entries by tier.
 * Useful for tier-based filtering or expansion control.
 * @param {string} tier - 'tier1', 'tier2', or 'tier3'
 * @returns {Object[]} - Array of entry objects
 */
export function getEntriesByTier(tier) {
  return Object.values(TooltipGlossary).filter(entry => entry.tier === tier);
}

/**
 * Helper: Get all entries by category.
 * Useful for understanding which concepts are related.
 * @param {string} category - E.g., 'core-mechanics', 'skills', 'defenses'
 * @returns {Object[]} - Array of entry objects
 */
export function getEntriesByCategory(category) {
  return Object.values(TooltipGlossary).filter(entry => entry.category === category);
}

/**
 * Helper: Get all entries that have breakdown providers.
 * Useful for identifying which tooltips can show detailed math.
 * @returns {Object[]} - Array of entry objects with hasBreakdown === true
 */
export function getEntriesWithBreakdowns() {
  return Object.values(TooltipGlossary).filter(entry => entry.hasBreakdown === true);
}

/**
 * Helper: Validate that a semantic key is defined in the glossary.
 * Use this in development to ensure hardpoints map to real definitions.
 * @param {string} key - The key to check
 * @returns {boolean} - True if the key exists in the glossary
 */
export function isValidTooltipKey(key) {
  return TooltipGlossary.hasOwnProperty(key);
}

/**
 * Helper: Get i18n prefix for a key.
 * Useful if you need to resolve i18n independently.
 * @param {string} key
 * @returns {string|null} - The i18n prefix, or null if not found
 */
export function getI18nPrefix(key) {
  const entry = getGlossaryEntry(key);
  return entry ? entry.i18nPrefix : null;
}

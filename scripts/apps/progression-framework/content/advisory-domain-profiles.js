/**
 * Advisory Domain Profiles — Phase 8 Step 3
 *
 * Mentor and advisory contexts for specific domains and archetypes.
 * Deepens advisory coverage for common build paths.
 */

export class AdvisoryDomainProfiles {
  static PROFILES = {
    'soldier-defensive': {
      domain: 'soldier-tank',
      label: 'Tank/Defender',
      mentorBias: 'durability-focused',
      prioritySignals: ['constitution', 'fort-save', 'ac', 'hp'],
      warningSignals: ['low-con', 'negative-con-mod', 'light-armor'],
      synergySources: ['protection-feats', 'shield-talents', 'survival-skills'],
      trapWarnings: ['dexterity-dump', 'touch-ac-vulnerability'],
      archetypeHints: 'Stay between enemies and allies. Fort save keeps you standing.',
    },

    'soldier-offensive': {
      domain: 'soldier-striker',
      label: 'Damage Dealer',
      mentorBias: 'damage-focused',
      prioritySignals: ['strength', 'power-attack', 'melee-bonus', 'damage'],
      warningSignals: ['low-str', 'low-bab', 'weak-weapons'],
      synergySources: ['cleave', 'combat-feats', 'high-str-mods'],
      trapWarnings: ['fragile-builds', 'overspecialized'],
      archetypeHints: 'Maximize damage per swing. Feats multiply your effectiveness.',
    },

    'soldier-ranged': {
      domain: 'soldier-gunner',
      label: 'Marksman',
      mentorBias: 'precision-focused',
      prioritySignals: ['dexterity', 'ranged-attack', 'awareness', 'tactics'],
      warningSignals: ['low-dex', 'melee-only', 'no-cover-tactics'],
      synergySources: ['ranged-feats', 'evasion', 'positioning'],
      trapWarnings: ['close-range-vulnerability'],
      archetypeHints: 'Control distance. One well-placed shot > many lucky swings.',
    },

    'scoundrel-social': {
      domain: 'scoundrel-charmer',
      label: 'Face/Diplomat',
      mentorBias: 'charisma-focused',
      prioritySignals: ['charisma', 'persuasion', 'insight', 'bluff'],
      warningSignals: ['low-cha', 'wisdom-dump', 'no-social-skills'],
      synergySources: ['leadership', 'talents', 'high-cha-mods'],
      trapWarnings: ['over-reliance-on-cha'],
      archetypeHints: 'Words matter. Skill points beat dice rolls.',
    },

    'scoundrel-stealth': {
      domain: 'scoundrel-infiltrator',
      label: 'Sneak/Infiltrator',
      mentorBias: 'stealth-focused',
      prioritySignals: ['dexterity', 'stealth', 'sneak-attack', 'evasion'],
      warningSignals: ['low-dex', 'loud-armor', 'no-sneak-attack'],
      synergySources: ['sneak-attack', 'evasion', 'mobility'],
      trapWarnings: ['detection-vulnerability', 'light-armor-hp'],
      archetypeHints: 'Positioning wins fights. Stay unseen and deadly.',
    },

    'jedi-warrior': {
      domain: 'jedi-knight',
      label: 'Jedi Warrior',
      mentorBias: 'force-combat-balance',
      prioritySignals: ['strength', 'wisdom', 'force-talents', 'lightsaber'],
      warningSignals: ['low-wisdom', 'weak-lightsaber-focus', 'force-dump'],
      synergySources: ['force-shield', 'lightsaber-forms', 'combat-talents'],
      trapWarnings: ['too-magic-heavy', 'neglecting-combat'],
      archetypeHints: 'Balance Force and blade. Each amplifies the other.',
    },

    'jedi-support': {
      domain: 'jedi-consular',
      label: 'Jedi Healer',
      mentorBias: 'support-focused',
      prioritySignals: ['wisdom', 'healing-talents', 'persuasion', 'force-shaping'],
      warningSignals: ['low-wisdom', 'no-healing', 'self-sacrifice-focus'],
      synergySources: ['healing-talents', 'protective-force', 'insight'],
      trapWarnings: ['over-healing-resources'],
      archetypeHints: 'Allies fight harder when they know you have their back.',
    },

    'tech-building': {
      domain: 'tech-engineer',
      label: 'Tech Engineer',
      mentorBias: 'crafting-focused',
      prioritySignals: ['intelligence', 'craft', 'mechanics', 'innovation'],
      warningSignals: ['low-int', 'low-craft', 'no-building'],
      synergySources: ['masterwork', 'innovation-talents', 'technical-knowledge'],
      trapWarnings: ['equipment-dump-gold', 'complex-builds'],
      archetypeHints: 'Better tools beat lucky rolls. Invest in your gear.',
    },

    'tech-hacking': {
      domain: 'tech-hacker',
      label: 'Tech Hacker',
      mentorBias: 'hacking-focused',
      prioritySignals: ['intelligence', 'hacking', 'security', 'problem-solving'],
      warningSignals: ['low-int', 'low-skills', 'no-hacking'],
      synergySources: ['hacking-talents', 'security-knowledge', 'insight'],
      trapWarnings: ['single-skill-dependency'],
      archetypeHints: 'Every system has a backdoor. You just have to think like it.',
    },

    'force-user-path': {
      domain: 'force-specialization',
      label: 'Force User',
      mentorBias: 'force-mastery',
      prioritySignals: ['wisdom', 'force-talents', 'force-powers', 'will-save'],
      warningSignals: ['low-wisdom', 'force-dump', 'no-force-talents'],
      synergySources: ['force-powers', 'force-talents', 'meditation'],
      trapWarnings: ['over-reliance-on-force', 'physical-weakness'],
      archetypeHints: 'The Force flows through you. Listen, don\'t dominate it.',
    },
  };

  /**
   * Get advisory profile for a domain.
   */
  static getProfileForDomain(domain) {
    return this.PROFILES[domain] || null;
  }

  /**
   * Get all available profiles.
   */
  static getAllProfiles() {
    return Object.values(this.PROFILES);
  }

  /**
   * Score a suggestion against a profile.
   */
  static scoreSuggestionAgainstProfile(domain, suggestion) {
    const profile = this.getProfileForDomain(domain);
    if (!profile) return 0;

    let score = 0;

    // Check if suggestion matches priority signals
    if (profile.prioritySignals.some(sig =>
      suggestion.tags?.includes(sig) || suggestion.name?.toLowerCase().includes(sig)
    )) {
      score += 3;
    }

    // Check for warning signals
    if (profile.warningSignals.some(sig =>
      suggestion.name?.toLowerCase().includes(sig)
    )) {
      score -= 2;
    }

    // Check for synergy sources
    if (profile.synergySources.some(syn =>
      suggestion.synergies?.includes(syn)
    )) {
      score += 2;
    }

    return Math.max(0, score);
  }

  /**
   * Get hint for a profile.
   */
  static getHintForDomain(domain) {
    const profile = this.getProfileForDomain(domain);
    return profile?.archetypeHints || null;
  }

  /**
   * Get mentor bias for domain.
   */
  static getMentorBiasForDomain(domain) {
    const profile = this.getProfileForDomain(domain);
    return profile?.mentorBias || null;
  }
}

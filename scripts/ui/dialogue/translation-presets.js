/**
 * SWSE Dialogue Translation Presets
 * Different styles for Aurebesh → English reveal animation
 * Includes preset mappings for all mentors
 */

export const TRANSLATION_PRESETS = {
  /**
   * Mentor dialogue (wise, measured, calm)
   * Slower reveal, gentle glow
   */
  mentor: {
    speed: 30,
    aurebeshClass: 'aurebesh-font aurebesh-mentor',
    revealedClass: 'revealed-text revealed-mentor',
    cursorStyle: 'block',
    showCursor: true,
    glow: 'cyan',
    fontFamily: 'Aurebesh, monospace'
  },

  /**
   * Sith dialogue (urgent, aggressive, dangerous)
   * Faster reveal, red glow, menacing tone
   */
  sith: {
    speed: 15,
    aurebeshClass: 'aurebesh-font aurebesh-sith',
    revealedClass: 'revealed-text revealed-sith',
    cursorStyle: 'underline',
    showCursor: true,
    glow: 'red',
    fontFamily: 'Aurebesh, monospace'
  },

  /**
   * Droid dialogue (mechanical, clinical, precise)
   * Fast, staccato reveal, white/blue glow
   */
  droid: {
    speed: 10,
    aurebeshClass: 'aurebesh-font aurebesh-droid',
    revealedClass: 'revealed-text revealed-droid',
    cursorStyle: 'block',
    showCursor: true,
    glow: 'blue',
    fontFamily: 'Courier New, monospace'
  },

  /**
   * Holocron dialogue (ancient, mystical, layered)
   * Slow, thoughtful reveal, purple/cyan glow
   */
  holocron: {
    speed: 40,
    aurebeshClass: 'aurebesh-font aurebesh-holocron',
    revealedClass: 'revealed-text revealed-holocron',
    cursorStyle: 'block',
    showCursor: true,
    glow: 'purple',
    fontFamily: 'Aurebesh, monospace'
  },

  /**
   * Force vision dialogue (fragmented, ethereal)
   * Variable speed, flickering effect, cyan/white
   */
  forcevision: {
    speed: 25,
    aurebeshClass: 'aurebesh-font aurebesh-forcevision',
    revealedClass: 'revealed-text revealed-forcevision',
    cursorStyle: 'block',
    showCursor: true,
    glow: 'cyan',
    fontFamily: 'Aurebesh, monospace',
    flicker: true
  },

  /**
   * Twi'lek diplomat (charming, persuasive, eloquent)
   * Smooth reveal, cyan/green glow, flowing style
   */
  twilek: {
    speed: 28,
    aurebeshClass: 'aurebesh-font aurebesh-twilek',
    revealedClass: 'revealed-text revealed-twilek',
    cursorStyle: 'block',
    showCursor: true,
    glow: 'cyan-green',
    fontFamily: 'Aurebesh, monospace'
  },

  /**
   * Wookiee warrior (fierce, strong, gruff)
   * Fast powerful reveal, golden/amber glow
   */
  wookiee: {
    speed: 18,
    aurebeshClass: 'aurebesh-font aurebesh-wookiee',
    revealedClass: 'revealed-text revealed-wookiee',
    cursorStyle: 'block',
    showCursor: true,
    glow: 'amber',
    fontFamily: 'Aurebesh, monospace'
  },

  /**
   * Smuggler/Scoundrel (quick, witty, cunning)
   * Very fast, playful reveal, amber/yellow glow
   */
  scoundrel: {
    speed: 12,
    aurebeshClass: 'aurebesh-font aurebesh-scoundrel',
    revealedClass: 'revealed-text revealed-scoundrel',
    cursorStyle: 'block',
    showCursor: true,
    glow: 'yellow',
    fontFamily: 'Aurebesh, monospace'
  },

  /**
   * Jedi archetype (balanced, wise, spiritual)
   * Moderate speed, blue glow, centered feel
   */
  jedi: {
    speed: 28,
    aurebeshClass: 'aurebesh-font aurebesh-jedi',
    revealedClass: 'revealed-text revealed-jedi',
    cursorStyle: 'block',
    showCursor: true,
    glow: 'blue',
    fontFamily: 'Aurebesh, monospace'
  }
};

/**
 * Mentor Name → Preset Mapping
 * Maps specific mentor names to their voice presets
 * Includes both actual system mentors and generic type mappings
 */
export const MENTOR_PRESET_MAP = {
  // === SYSTEM MENTORS BY ARCHETYPE ===
  // Complete mapping of all ~37 mentors from mentor-dialogues.data.js

  // JEDI PATH (wise, measured, calm - blue glow)
  'miraj': 'jedi',              // Jedi Master, Jedi Knight, Jedi Master classes
  'dezmin': 'jedi',             // Imperial Knight Grandmaster - balanced, disciplined

  // SITH PATH (aggressive, dangerous - red glow)
  'darth miedo': 'sith',        // Dark Lord of the Sith - masterful, cunning
  'darth malbada': 'sith',      // Sith Apprentice - sadistic, cruel

  // MENTOR ARCHETYPE (wise, caring mentors - cyan glow)
  'kyber': 'mentor',            // Combat Medic - warm, pragmatic healer
  'seeker venn': 'mentor',      // Force Adept Mystic - mysterious, understanding
  'master zhen': 'mentor',      // Martial Arts Master - disciplined, honorable
  'blade master kharjo': 'mentor', // Melee Duelist - skilled, honorable warrior
  'chief engineer rax': 'mentor',  // Military Engineer - analytical, methodical
  'admiral korr': 'mentor',     // Officer - tactical, leadership-focused
  'shaper urza': 'mentor',      // Shaper - scientific, creative mind
  'shield captain theron': 'mentor', // Vanguard - protective, disciplined

  // SCOUNDREL PATH (quick, witty, cunning - yellow glow)
  'ol\' salty': 'scoundrel',    // Space Pirate Captain - colorful, energetic
  'lead': 'scoundrel',          // Argent Squad Commander - hardened, mercenary
  'mayu': 'scoundrel',          // Ace Pilot & Rogue Smuggler - cocky, skilled
  'breach': 'scoundrel',        // Mandalorian Mercenary - direct, pragmatic
  'delta': 'scoundrel',         // Assassin/Sniper - quick, street-smart
  'kex varon': 'scoundrel',     // Bounty Hunter - professional, adaptable
  'silvertongue sela': 'scoundrel', // Charlatan Con Artist - charming deceiver
  'tío the hutt': 'scoundrel',  // Crime Lord Kingpin - aggressive, powerful
  'rajma': 'scoundrel',         // Gunslinger - cocky, flirtatious
  'lucky jack': 'scoundrel',    // Improviser - chaotic, energetic
  'the captain': 'scoundrel',   // Master Privateer - pirate captain
  'rogue': 'scoundrel',         // Outlaw - free-spirited, dangerous
  'spark': 'scoundrel',         // Saboteur - explosive, precise chaos

  // DROID PATH (mechanical, clinical, precise - blue monospace)
  'j0-n1': 'droid',             // Protocol Droid - formal, efficient butler
  'seraphim': 'droid',          // Independent Droid AI - self-aware, direct

  // FORCE DISCIPLE (mysterious, otherworldly - cyan flicker)
  'riquis': 'forcevision',      // Force Disciple Shaman - cryptic, ancient knowledge

  // SPECIAL MENTIONS - Gladiator/Warrior (can use scoundrel for aggressive style)
  'pegar': 'scoundrel',         // Gladiator Champion - aggressive, ancient warrior

  // SPECIAL MENTIONS - Military types
  'general axiom': 'droid',     // Droid Commander - cold, calculated

  // SPECIAL MENTIONS - Corporate/Spy (scoundrel fits cunning style)
  'marl skindar': 'scoundrel',  // Corporate Agent Spy - cunning, manipulative

  // === GENERIC TYPE MAPPINGS (fallback patterns) ===

  // Jedi Order mentors
  'master-yoda': 'mentor',
  'yoda': 'mentor',
  'jedi-master': 'jedi',
  'jedi': 'jedi',
  'jedi-knight': 'jedi',

  // Sith/Dark Side mentors
  'darth-vader': 'sith',
  'sith-lord': 'sith',
  'sith': 'sith',
  'dark-jedi': 'sith',

  // Droids
  'protocol-droid': 'droid',
  'c-3po': 'droid',
  'droid': 'droid',
  'astromech': 'droid',

  // Holocrons & Ancient Knowledge
  'holocron': 'holocron',
  'ancient-holocron': 'holocron',

  // Force Vision State
  'force-vision': 'forcevision',
  'forcevision': 'forcevision',

  // Twi'lek mentors
  'twi\'lek': 'twilek',
  'twilek': 'twilek',
  'twi-lek': 'twilek',

  // Wookiee mentors
  'wookiee': 'wookiee',
  'wookiee-warrior': 'wookiee',
  'chewbacca': 'wookiee',

  // Scoundrel/Smuggler mentors
  'scoundrel': 'scoundrel',
  'smuggler': 'scoundrel',
  'han-solo': 'scoundrel',

  // Default
  default: 'mentor'
};

/**
 * Get preset config by name
 * Falls back to mentor if preset not found
 */
export function getPreset(name) {
  return TRANSLATION_PRESETS[name] || TRANSLATION_PRESETS.mentor;
}

/**
 * Get preset for mentor by name
 * Maps mentor names to appropriate presets
 */
export function getPresetForMentor(mentorName) {
  if (!mentorName) return TRANSLATION_PRESETS.mentor;

  const normalized = mentorName.toLowerCase().trim();

  // Direct match in preset map
  if (MENTOR_PRESET_MAP[normalized]) {
    const presetName = MENTOR_PRESET_MAP[normalized];
    return TRANSLATION_PRESETS[presetName];
  }

  // Fuzzy match
  for (const [key, presetName] of Object.entries(MENTOR_PRESET_MAP)) {
    if (key !== 'default' && normalized.includes(key)) {
      return TRANSLATION_PRESETS[presetName];
    }
  }

  // Fallback
  return TRANSLATION_PRESETS.mentor;
}

/**
 * List available presets
 */
export function listPresets() {
  return Object.keys(TRANSLATION_PRESETS);
}

/**
 * List available mentors
 */
export function listMentors() {
  return Object.keys(MENTOR_PRESET_MAP).filter(k => k !== 'default');
}


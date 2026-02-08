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
 */
export const MENTOR_PRESET_MAP = {
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
  'rogue': 'scoundrel',

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


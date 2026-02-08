/**
 * SWSE Dialogue Translation Presets
 * Different styles for Aurebesh → English reveal animation
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
  }
};

/**
 * Get preset config by name
 * Falls back to mentor if preset not found
 */
export function getPreset(name) {
  return TRANSLATION_PRESETS[name] || TRANSLATION_PRESETS.mentor;
}

/**
 * List available presets
 */
export function listPresets() {
  return Object.keys(TRANSLATION_PRESETS);
}

// ============================================
// Character Generator Entry Point
// ============================================
//
// This file has been refactored into focused, maintainable modules.
// See the chargen/ directory for the implementation.
//
// Module structure:
//   chargen-main.js          - Main app class, orchestration, getData()
//   chargen-species.js       - Species selection, racial traits, size
//   chargen-class.js         - Class selection, HP, BAB calculations
//   chargen-abilities.js     - Ability score generation (point buy, rolling, array)
//   chargen-skills.js        - Skill selection, training
//   chargen-feats-talents.js - Feat and talent selection
//   chargen-droid.js         - Droid-specific logic (systems, locomotion, etc.)
//   chargen-shared.js        - Shared utilities, constants, helpers

import CharacterGenerator from './chargen/chargen-main.js';

export { CharacterGenerator };
export default CharacterGenerator;

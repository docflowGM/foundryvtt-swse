/**
 * SWSE Enhanced Level Up System
 *
 * This file serves as a compatibility shim for the refactored level-up system.
 * The actual implementation has been split into focused modules in the levelup/ directory.
 *
 * See:
 * - levelup/levelup-main.js - Main application class and orchestration
 * - levelup/levelup-class.js - Class selection and HP calculation
 * - levelup/levelup-skills.js - Skill point allocation
 * - levelup/levelup-feats.js - Feat selection with prerequisites
 * - levelup/levelup-talents.js - Talent selection with tree validation
 * - levelup/levelup-force-powers.js - Force power selection
 * - levelup/levelup-validation.js - Validation logic and requirements checking
 * - levelup/levelup-shared.js - Shared utilities and helpers
 */

export { SWSELevelUpEnhanced } from './levelup/levelup-main.js';

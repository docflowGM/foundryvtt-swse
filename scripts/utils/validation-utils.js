/**
 * Input Validation Utilities for SWSE
 */

/**
 * Validate that a value is a number
 * @param {*} value - Value to validate
 * @returns {boolean} True if valid number
 */
export function isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

/**
 * Validate that a value is within range
 * @param {number} value - Value to check
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if within range
 */
export function isInRange(value, min, max) {
    return isValidNumber(value) && value >= min && value <= max;
}

/**
 * Validate ability score
 * @param {number} score - Ability score
 * @returns {boolean} True if valid (1-30)
 */
export function isValidAbilityScore(score) {
    return isInRange(score, 1, 30);
}

/**
 * Validate character level
 * @param {number} level - Character level
 * @returns {boolean} True if valid (1-20)
 */
export function isValidLevel(level) {
    return isInRange(level, 1, 20);
}

/**
 * Validate string is not empty
 * @param {string} value - String to validate
 * @returns {boolean} True if non-empty string
 */
export function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Sanitize user input
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}

/**
 * Validate dice notation
 * @param {string} notation - Dice notation (e.g., "2d6+3")
 * @returns {boolean} True if valid dice notation
 */
export function isValidDiceNotation(notation) {
    const regex = /^\d+d\d+([+-]\d+)?$/;
    return regex.test(notation);
}

/**
 * Clamp value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * String Manipulation Utilities for SWSE
 */

/**
 * Convert text to slug format
 * @param {string} text - Text to slugify
 * @returns {string} Slugified text
 */
export function slugify(text) {
    if (!text) return "";
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Format a modifier with + or - sign
 * @param {number} value - Modifier value
 * @returns {string} Formatted modifier
 */
export function formatModifier(value) {
    const num = Number(value);
    if (isNaN(num)) return "+0";
    return num >= 0 ? `+${num}` : `${num}`;
}

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} length - Maximum length
 * @returns {string} Truncated text
 */
export function truncate(text, length = 50) {
    if (!text) return "";
    return text.length > length ? text.substring(0, length) + '...' : text;
}

/**
 * Capitalize first letter of string
 * @param {string} text - Text to capitalize
 * @returns {string} Capitalized text
 */
export function capitalize(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert to title case
 * @param {string} text - Text to convert
 * @returns {string} Title cased text
 */
export function titleCase(text) {
    if (!text) return "";
    return text.replace(/\w\S*/g, (txt) => {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

/**
 * Remove HTML tags from string
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
export function stripHtml(html) {
    if (!html) return "";
    const tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

/**
 * Parse dice notation to get average value
 * @param {string} diceNotation - Dice notation (e.g., "2d6+3")
 * @returns {number} Average value
 */
export function getAverageDiceValue(diceNotation) {
    const match = diceNotation.match(/(\d+)d(\d+)(?:\+(\d+))?/);
    if (!match) return 0;
    
    const [, numDice, dieSize, modifier] = match;
    const avgPerDie = (parseInt(dieSize) + 1) / 2;
    const avgTotal = parseInt(numDice) * avgPerDie;
    const mod = parseInt(modifier || 0);
    
    return Math.floor(avgTotal + mod);
}

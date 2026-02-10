/**
 * Data Transformation and Validation Utilities for SWSE
 */

/**
 * Deep clone an object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {return obj;}
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Merge two objects deeply
 * @param {object} target - Target object
 * @param {object} source - Source object
 * @returns {object} Merged object
 */
export function mergeObjects(target, source) {
    return foundry.utils.mergeObject(target, source, { inplace: false });
}

/**
 * Get nested property from object using dot notation
 * @param {object} obj - Object to search
 * @param {string} path - Property path (e.g., "system.attributes.str")
 * @returns {*} Property value or undefined
 */
export function getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Set nested property in object using dot notation
 * @param {object} obj - Object to modify
 * @param {string} path - Property path
 * @param {*} value - Value to set
 */
export function setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
        if (!(key in current)) {current[key] = {};}
        return current[key];
    }, obj);
    target[lastKey] = value;
}

/**
 * Filter object properties
 * @param {object} obj - Object to filter
 * @param {function} predicate - Filter function
 * @returns {object} Filtered object
 */
export function filterObject(obj, predicate) {
    return Object.keys(obj)
        .filter(key => predicate(obj[key], key))
        .reduce((result, key) => {
            result[key] = obj[key];
            return result;
        }, {});
}

/**
 * Sort array of objects by property
 * @param {Array} array - Array to sort
 * @param {string} property - Property to sort by
 * @param {boolean} ascending - Sort order
 * @returns {Array} Sorted array
 */
export function sortByProperty(array, property, ascending = true) {
    return [...array].sort((a, b) => {
        const aVal = getNestedProperty(a, property);
        const bVal = getNestedProperty(b, property);

        if (aVal < bVal) {return ascending ? -1 : 1;}
        if (aVal > bVal) {return ascending ? 1 : -1;}
        return 0;
    });
}

/**
 * Group array of objects by property
 * @param {Array} array - Array to group
 * @param {string} property - Property to group by
 * @returns {object} Grouped object
 */
export function groupBy(array, property) {
    return array.reduce((groups, item) => {
        const key = getNestedProperty(item, property);
        if (!groups[key]) {groups[key] = [];}
        groups[key].push(item);
        return groups;
    }, {});
}

/**
 * Remove duplicate objects from array
 * @param {Array} array - Array to deduplicate
 * @param {string} key - Property to check for uniqueness
 * @returns {Array} Deduplicated array
 */
export function uniqueBy(array, key) {
    const seen = new Set();
    return array.filter(item => {
        const value = getNestedProperty(item, key);
        if (seen.has(value)) {return false;}
        seen.add(value);
        return true;
    });
}

/**
 * Extract Roman numeral level from feat name
 * Handles feats like "Martial Arts I", "Dual Weapon Mastery II", etc.
 * @param {string} featName - The feat name
 * @returns {object} Object with level number, roman numeral, and base name
 *   e.g., { level: 1, roman: "I", baseName: "Martial Arts" }
 *   Returns { level: 0, roman: "", baseName: "Martial Arts" } if no level found
 */
export function extractFeatLevel(featName) {
    const romanNumerals = [
        { numeral: 'IV', value: 4 },  // Check IV before I to avoid partial matches
        { numeral: 'IX', value: 9 },
        { numeral: 'XL', value: 40 },
        { numeral: 'XC', value: 90 },
        { numeral: 'CD', value: 400 },
        { numeral: 'CM', value: 900 },
        { numeral: 'I', value: 1 },
        { numeral: 'V', value: 5 },
        { numeral: 'X', value: 10 },
        { numeral: 'L', value: 50 },
        { numeral: 'C', value: 100 },
        { numeral: 'D', value: 500 },
        { numeral: 'M', value: 1000 }
    ];

    // Match pattern: word(s) followed by space and Roman numerals at end
    const match = featName.match(/^(.+?)\s+([IVX]+)$/);

    if (!match) {
        return { level: 0, roman: '', baseName: featName };
    }

    const baseName = match[1].trim();
    const romanStr = match[2];

    // Validate and convert Roman numeral to integer
    let value = 0;
    let tempRoman = romanStr;

    for (const { numeral, value: val } of romanNumerals) {
        while (tempRoman.startsWith(numeral)) {
            value += val;
            tempRoman = tempRoman.substring(numeral.length);
        }
    }

    // If tempRoman is empty, it was a valid Roman numeral
    if (tempRoman === '' && value > 0) {
        return { level: value, roman: romanStr, baseName };
    }

    // Not a valid Roman numeral, treat as part of the name
    return { level: 0, roman: '', baseName: featName };
}

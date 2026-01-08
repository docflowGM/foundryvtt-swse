/**
 * Data Transformation and Validation Utilities for SWSE
 */

/**
 * Deep clone an object
 * @param {object} obj - Object to clone
 * @returns {object} Cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
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
        if (!(key in current)) current[key] = {};
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
        
        if (aVal < bVal) return ascending ? -1 : 1;
        if (aVal > bVal) return ascending ? 1 : -1;
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
        if (!groups[key]) groups[key] = [];
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
        if (seen.has(value)) return false;
        seen.add(value);
        return true;
    });
}

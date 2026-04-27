/* ============================================================================
   UI FORMATTERS
   Consistent formatting functions for display across all UI surfaces
   ============================================================================ */

/**
 * Format a modifier value with sign
 * @param {number} value - The modifier value
 * @returns {string} - Formatted modifier (e.g., "+5", "-3", "0")
 */
export function formatModifier(value) {
  const num = Number(value) || 0;
  if (num > 0) return `+${num}`;
  if (num < 0) return `${num}`;
  return '0';
}

/**
 * Format a label for display (uppercase, spaced)
 * @param {string} label - The label text
 * @returns {string} - Formatted label
 */
export function formatLabel(label) {
  if (!label) return '';
  return String(label)
    .toUpperCase()
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before uppercase
    .replace(/_/g, ' '); // Replace underscores with spaces
}

/**
 * Format a description (clean HTML, ensure proper spacing)
 * @param {string} description - Raw description text
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted description
 */
export function formatDescription(description, options = {}) {
  if (!description) return '';

  let text = String(description);

  // Strip HTML tags if requested
  if (options.stripHTML !== false) {
    text = text.replace(/<[^>]*>/g, '');
  }

  // Trim and collapse whitespace
  text = text.trim().replace(/\s+/g, ' ');

  // Truncate if requested
  if (options.maxLength && text.length > options.maxLength) {
    text = text.substring(0, options.maxLength).trim() + '…';
  }

  return text;
}

/**
 * Format a rarity into display text with color
 * @param {string} rarity - Rarity value (common, uncommon, rare, legendary, etc.)
 * @returns {string} - Formatted rarity label
 */
export function formatRarity(rarity) {
  const rarityMap = {
    'common': 'Common',
    'uncommon': 'Uncommon',
    'rare': 'Rare',
    'epic': 'Epic',
    'legendary': 'Legendary',
    'artifact': 'Artifact'
  };
  return rarityMap[String(rarity).toLowerCase()] || 'Common';
}

/**
 * Format a category into display text
 * @param {string} category - Category value
 * @returns {string} - Formatted category label
 */
export function formatCategory(category) {
  if (!category) return 'General';
  return formatLabel(category);
}

/**
 * Format tags array into display string
 * @param {Array} tags - Array of tag strings
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted tags (e.g., "combat, trained, special")
 */
export function formatTags(tags, options = {}) {
  if (!Array.isArray(tags) || tags.length === 0) return '';

  const separator = options.separator || ', ';
  const uppercase = options.uppercase !== false;

  return tags
    .map(t => uppercase ? formatLabel(String(t)) : String(t))
    .join(separator);
}

/**
 * Format a number as a percentage
 * @param {number} value - The value (0-100 or 0-1)
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted percentage (e.g., "75%")
 */
export function formatPercentage(value, options = {}) {
  const num = Number(value) || 0;
  const isDecimal = options.isDecimal || (num > 0 && num < 1);
  const displayValue = isDecimal ? Math.round(num * 100) : Math.round(num);
  return `${displayValue}%`;
}

/**
 * Format a number with thousands separator
 * @param {number} value - The number to format
 * @returns {string} - Formatted number (e.g., "1,234")
 */
export function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

/**
 * Format a name/title (Title Case)
 * @param {string} name - The name to format
 * @returns {string} - Title cased name
 */
export function formatName(name) {
  if (!name) return '';
  return String(name)
    .split(/[\s-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get color for a rarity value
 * @param {string} rarity - Rarity value
 * @returns {string} - CSS color or hex value
 */
export function getRarityColor(rarity) {
  const colorMap = {
    'common': '#999999',
    'uncommon': '#1eff00',
    'rare': '#0070dd',
    'epic': '#a335ee',
    'legendary': '#ff8000',
    'artifact': '#e6cc80'
  };
  return colorMap[String(rarity).toLowerCase()] || '#999999';
}

/**
 * Format duration/time value
 * @param {number} hours - Duration in hours
 * @returns {string} - Formatted duration (e.g., "1d 6h")
 */
export function formatDuration(hours) {
  const num = Number(hours) || 0;
  if (num < 1) return '< 1 hour';

  const days = Math.floor(num / 24);
  const remainingHours = num % 24;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (remainingHours > 0) parts.push(`${remainingHours}h`);

  return parts.join(' ');
}

/**
 * Safe tooltip text (escape HTML, max length)
 * @param {string} text - Raw tooltip text
 * @returns {string} - Safe tooltip text
 */
export function formatTooltip(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .substring(0, 200);
}

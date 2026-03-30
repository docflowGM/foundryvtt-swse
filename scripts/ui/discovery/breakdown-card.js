/**
 * Pinned Breakdown Card System
 *
 * Renders persistent, holographic number-breakdown analysis cards for complex stats.
 * Complementary to micro-tooltips: hover → definition, click → persistent breakdown.
 *
 * ARCHITECTURE:
 * - Card content comes from breakdown providers (DefenseTooltip, WeaponTooltip, etc.)
 * - Semantic colors applied to rows only (green/amber/red), not entire card
 * - Total value emphasized using system highlight styling
 * - Card persists until click-away, close button, or cleanup
 * - No dependency on help mode (works independently)
 *
 * NORMALIZED BREAKDOWN STRUCTURE:
 * {
 *   title: "Reflex Defense",
 *   definition: "How hard you are to hit through agility.",
 *   rows: [
 *     { label: "Base", value: 10, semantic: "neutral" },
 *     { label: "½ Level", value: 4, semantic: "neutral" },
 *     { label: "Dexterity", value: 3, semantic: "positive" },
 *     { label: "Armor Penalty", value: -1, semantic: "negative" }
 *   ],
 *   total: 16,
 *   metadata: { concept: "ReflexDefense", actor: actor } (optional)
 * }
 */

const CLASS_CARD = 'swse-breakdown-card';
const CLASS_OVERLAY = 'swse-breakdown-overlay';
const CLASS_SEMANTIC_POSITIVE = 'breakdown-value--positive';
const CLASS_SEMANTIC_NEUTRAL = 'breakdown-value--neutral';
const CLASS_SEMANTIC_NEGATIVE = 'breakdown-value--negative';

let _activeCard = null;
let _cardContainer = null;

/**
 * Semantic color mapping for breakdown rows.
 * Use to determine CSS class based on value semantics.
 */
const SEMANTIC_CLASSES = {
  positive: CLASS_SEMANTIC_POSITIVE,
  neutral: CLASS_SEMANTIC_NEUTRAL,
  negative: CLASS_SEMANTIC_NEGATIVE
};

export const BreakdownCard = {

  /**
   * Open a pinned breakdown card.
   * @param {Object} breakdown - Normalized breakdown structure
   * @param {string} breakdown.title - Card title (e.g., "Reflex Defense")
   * @param {string} breakdown.definition - One-sentence explanation
   * @param {Array} breakdown.rows - Array of {label, value, semantic}
   * @param {number} breakdown.total - Final total value
   * @param {Object} breakdown.metadata - (Optional) {concept, actor, sourceElement, etc.}
   * @returns {HTMLElement} - The card element
   */
  open(breakdown) {
    // Close any existing card first
    this.close();

    // Create overlay container
    _cardContainer = document.createElement('div');
    _cardContainer.classList.add(CLASS_OVERLAY);
    _cardContainer.addEventListener('click', (ev) => {
      // Click on overlay (not card) closes it
      if (ev.target === _cardContainer) {
        this.close();
      }
    });

    // Create card element
    const card = document.createElement('div');
    card.classList.add(CLASS_CARD);
    _renderCardContent(card, breakdown);

    _cardContainer.appendChild(card);
    document.body.appendChild(_cardContainer);
    _activeCard = card;

    // Position card near source element if metadata provided
    if (breakdown.metadata?.sourceElement) {
      _positionCard(card, breakdown.metadata.sourceElement);
    }

    // Support Escape key to close
    const closeHandler = (ev) => {
      if (ev.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', closeHandler);
      }
    };
    document.addEventListener('keydown', closeHandler);

    return card;
  },

  /**
   * Close the active breakdown card.
   */
  close() {
    if (_activeCard && _cardContainer) {
      _cardContainer.remove();
      _activeCard = null;
      _cardContainer = null;
    }
  },

  /**
   * Check if a card is currently open.
   * @returns {boolean}
   */
  isOpen() {
    return _activeCard !== null;
  },

  /**
   * Get the active card element (for testing/manipulation).
   * @returns {HTMLElement|null}
   */
  getActiveCard() {
    return _activeCard;
  }
};

/**
 * Render breakdown content into a card element.
 * @private
 */
function _renderCardContent(card, breakdown) {
  // Title
  const title = document.createElement('div');
  title.classList.add('breakdown-card__title');
  title.textContent = breakdown.title;
  card.appendChild(title);

  // Definition (one-sentence explanation)
  if (breakdown.definition) {
    const definition = document.createElement('div');
    definition.classList.add('breakdown-card__definition');
    definition.textContent = breakdown.definition;
    card.appendChild(definition);
  }

  // Breakdown rows
  if (breakdown.rows && breakdown.rows.length > 0) {
    const rowsContainer = document.createElement('div');
    rowsContainer.classList.add('breakdown-card__rows');

    breakdown.rows.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.classList.add('breakdown-row');

      // Label
      const label = document.createElement('span');
      label.classList.add('breakdown-row__label');
      label.textContent = row.label;

      // Value with semantic coloring
      const value = document.createElement('span');
      value.classList.add('breakdown-row__value');
      value.textContent = _formatValue(row.value);

      // Apply semantic class
      if (row.semantic && SEMANTIC_CLASSES[row.semantic]) {
        value.classList.add(SEMANTIC_CLASSES[row.semantic]);
      }

      rowEl.appendChild(label);
      rowEl.appendChild(value);
      rowsContainer.appendChild(rowEl);
    });

    card.appendChild(rowsContainer);
  }

  // Divider before total
  const divider = document.createElement('div');
  divider.classList.add('breakdown-card__divider');
  card.appendChild(divider);

  // Final total (emphasized, no semantic coloring)
  const totalContainer = document.createElement('div');
  totalContainer.classList.add('breakdown-total');

  const totalLabel = document.createElement('span');
  totalLabel.classList.add('breakdown-total__label');
  totalLabel.textContent = 'Total';

  const totalValue = document.createElement('span');
  totalValue.classList.add('breakdown-total__value');
  totalValue.textContent = breakdown.total;

  totalContainer.appendChild(totalLabel);
  totalContainer.appendChild(totalValue);
  card.appendChild(totalContainer);

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.classList.add('breakdown-card__close');
  closeBtn.setAttribute('type', 'button');
  closeBtn.setAttribute('title', 'Close breakdown');
  closeBtn.innerHTML = '<i class="fas fa-times"></i>';
  closeBtn.addEventListener('click', () => BreakdownCard.close());
  card.appendChild(closeBtn);
}

/**
 * Format a numeric value with sign (+/−).
 * @private
 */
function _formatValue(value) {
  if (typeof value !== 'number') return String(value);
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${value}`; // Unicode minus
  return '0';
}

/**
 * Position card near a source element.
 * @private
 */
function _positionCard(card, sourceElement) {
  // Get source element position
  const rect = sourceElement.getBoundingClientRect();

  // Position card below source element, or above if no room
  let top = rect.bottom + 12;
  let left = rect.left + (rect.width / 2);

  // Account for card size (estimate or get actual)
  const cardRect = card.getBoundingClientRect();

  // Center horizontally on source
  left -= cardRect.width / 2;

  // Flip above if no room below
  if (top + cardRect.height > window.innerHeight - 20) {
    top = rect.top - cardRect.height - 12;
  }

  // Clamp horizontally
  left = Math.max(12, Math.min(left, window.innerWidth - cardRect.width - 12));

  card.style.top = `${top}px`;
  card.style.left = `${left}px`;
}

/**
 * Helper: Create a normalized breakdown structure from raw data.
 * Use this pattern in providers (DefenseTooltip, WeaponTooltip, etc.)
 *
 * @param {Object} options
 * @param {string} options.title - Card title
 * @param {string} options.definition - One-sentence explanation
 * @param {Array} options.rows - Array of {label, value, semantic}
 * @param {number} options.total - Final total
 * @param {Object} options.metadata - (Optional) Additional context
 * @returns {Object} - Normalized breakdown
 */
export function createBreakdownStructure(options) {
  return {
    title: options.title || 'Breakdown',
    definition: options.definition || '',
    rows: options.rows || [],
    total: options.total || 0,
    metadata: options.metadata || {}
  };
}

/**
 * Helper: Determine semantic class from a numeric value.
 * @param {number} value
 * @returns {string} - 'positive', 'neutral', or 'negative'
 */
export function getSemanticForValue(value) {
  if (typeof value !== 'number') return 'neutral';
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

export default BreakdownCard;

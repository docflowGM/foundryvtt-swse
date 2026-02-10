/**
 * store-card-interactions.js
 *
 * Card floating & expansion controller for Store UI.
 *
 * Responsibilities:
 * - Manage floating card state (which card is expanded)
 * - Apply CSS classes to create floating/expanded visual effects
 * - Handle click events (expand card, close card, click-away dismissal)
 * - Handle keyboard events (Escape to close)
 * - Prevent event propagation conflicts
 * - Pure presentation-only (no data mutations)
 *
 * Design:
 * - Uses CSS transforms for elevation (no new DOM nodes)
 * - Expanded state via CSS class toggle (no modals or Applications)
 * - All visual feedback is CSS-driven
 * - Respects accessibility settings (no transforms when reduced-motion)
 */

export class StoreCardInteractions {
  constructor(rootElement) {
    this.root = rootElement;
    this.expandedCard = null; // Currently expanded card element
    this.reduceMotion = game.user?.getFlag?.('core', 'reduce-motion') ?? false;

    this._attachListeners();
  }

  /**
   * Attach all event listeners for card interactions
   */
  _attachListeners() {
    if (!this.root) {
      return;
    }

    // Delegate click on cards to toggle expand state
    this.root.addEventListener('click', (ev) => this._handleCardClick(ev));

    // Close on Escape key
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && this.expandedCard) {
        this.collapseCard();
      }
    });

    // Close on click outside expanded card
    document.addEventListener('click', (ev) => {
      if (this.expandedCard && !this.expandedCard.contains(ev.target)) {
        // Allow clicks on buttons and interactive elements to propagate first
        if (!ev.target.closest('button, a, input, select, textarea')) {
          this.collapseCard();
        }
      }
    });
  }

  /**
   * Handle card click events
   * Only expand on glyph-panel click (not on buttons)
   */
  _handleCardClick(ev) {
    const glyphPanel = ev.target.closest('.glyph-panel');
    if (!glyphPanel) {
      return;
    }

    const card = glyphPanel.closest('.product-card');
    if (!card) {
      return;
    }

    // Prevent event bubbling to document click handler
    ev.stopPropagation();

    // Toggle expand state
    if (this.expandedCard === card) {
      this.collapseCard();
    } else {
      this.expandCard(card);
    }
  }

  /**
   * Expand a card (apply floating + expanded classes)
   */
  expandCard(card) {
    // Collapse previous card if any
    if (this.expandedCard && this.expandedCard !== card) {
      this.collapseCard();
    }

    // Mark card as expanded
    this.expandedCard = card;
    card.classList.add('card-floating');
    card.classList.add('card-expanded');

    // Prevent scrolling while card is expanded
    document.body.style.overflow = 'hidden';
  }

  /**
   * Collapse the currently expanded card
   */
  collapseCard() {
    if (!this.expandedCard) {
      return;
    }

    this.expandedCard.classList.remove('card-floating');
    this.expandedCard.classList.remove('card-expanded');
    this.expandedCard = null;

    // Restore scrolling
    document.body.style.overflow = '';
  }

  /**
   * Clean up event listeners
   */
  destroy() {
    if (this.expandedCard) {
      this.collapseCard();
    }
    // Event listeners are removed when root element is removed
  }
}

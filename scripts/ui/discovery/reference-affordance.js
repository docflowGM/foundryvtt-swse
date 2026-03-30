/**
 * Reference Affordance Component
 *
 * Subtle UI control that appears on breakdown cards when a reference entry is available.
 * Clicking opens the Datapad reference for that concept.
 *
 * Usage:
 * const affordance = createReferenceAffordance(glossaryKey);
 * if (affordance) {
 *   containerElement.appendChild(affordance);
 * }
 */

import { ReferenceService } from '/systems/foundryvtt-swse/scripts/ui/discovery/reference-service.js';
import { TooltipGlossary } from '/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-glossary.js';

/**
 * Create a reference affordance element for a glossary key
 * Returns null if no reference is available
 *
 * @param {string} glossaryKey - Glossary entry key (e.g., 'HitPoints')
 * @returns {HTMLElement|null} Reference affordance element or null
 */
export function createReferenceAffordance(glossaryKey) {
  // Check if reference is available
  if (!ReferenceService.hasReference(glossaryKey)) {
    return null;
  }

  const metadata = ReferenceService.getReferenceMetadata(glossaryKey);
  if (!metadata) return null;

  // Create container
  const container = document.createElement('div');
  container.className = 'reference-affordance';

  // Create button/link
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'reference-affordance-btn';
  button.setAttribute('data-reference-key', glossaryKey);
  button.title = `Open Datapad Reference: ${metadata.label}`;

  // Icon + label
  const icon = document.createElement('i');
  icon.className = 'fas fa-book-open';
  button.appendChild(icon);

  const label = document.createElement('span');
  label.className = 'reference-affordance-label';
  label.textContent = 'Reference';
  button.appendChild(label);

  // Click handler
  button.addEventListener('click', async (ev) => {
    ev.preventDefault();
    ev.stopPropagation(); // Don't trigger card dismiss

    // Open the reference
    await ReferenceService.openReference(glossaryKey);
  });

  container.appendChild(button);
  return container;
}

/**
 * Add reference affordance to a breakdown card element
 * Gracefully handles missing references
 *
 * @param {HTMLElement} cardElement - Breakdown card root element
 * @param {string} glossaryKey - Glossary key for the concept
 */
export function addReferenceAffordanceToCard(cardElement, glossaryKey) {
  // Only add if reference exists
  if (!ReferenceService.hasReference(glossaryKey)) {
    return;
  }

  // Find or create affordance footer
  let footer = cardElement.querySelector('.breakdown-card-footer');
  if (!footer) {
    footer = document.createElement('div');
    footer.className = 'breakdown-card-footer';
    cardElement.appendChild(footer);
  }

  // Create and add affordance
  const affordance = createReferenceAffordance(glossaryKey);
  if (affordance) {
    footer.appendChild(affordance);
  }
}

/**
 * CSS class injection (if not already in stylesheet)
 * This is a fallback for development
 */
export function injectReferenceAffordanceStyles() {
  // Check if styles already exist
  if (document.querySelector('style[data-reference-affordance-styles]')) {
    return;
  }

  const style = document.createElement('style');
  style.setAttribute('data-reference-affordance-styles', 'true');
  style.textContent = `
    /* Reference Affordance */
    .reference-affordance {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(0, 200, 255, 0.2);
    }

    .reference-affordance-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border: 1px solid rgba(0, 200, 255, 0.4);
      background: rgba(0, 150, 200, 0.08);
      border-radius: 4px;
      color: inherit;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 150ms ease;
    }

    .reference-affordance-btn:hover {
      border-color: rgba(0, 200, 255, 0.6);
      background: rgba(0, 150, 200, 0.15);
      box-shadow: inset 0 0 4px rgba(0, 200, 255, 0.2);
    }

    .reference-affordance-btn:focus {
      outline: 2px solid rgba(0, 200, 255, 0.4);
      outline-offset: 2px;
    }

    .reference-affordance-btn i {
      font-size: 0.8rem;
      opacity: 0.85;
    }

    .reference-affordance-label {
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      opacity: 0.9;
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      .reference-affordance-btn {
        transition: none;
      }
    }
  `;

  document.head.appendChild(style);
}

export default {
  createReferenceAffordance,
  addReferenceAffordanceToCard,
  injectReferenceAffordanceStyles
};

/**
 * Modal dialog UI activation for SWSEV2CharacterSheet
 *
 * Handles item selection modals for feats and talents
 */

/**
 * Show item selection modal
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {string} itemType - Type of item ('feat' or 'talent')
 */
function showItemSelectionModal(sheet, itemType) {
  const root = sheet.element;
  if (!root) return;
  const modal = root.querySelector('#item-selection-modal');
  const titleEl = root.querySelector('#modal-title');
  const messageEl = root.querySelector('#modal-message');
  if (!modal || !titleEl || !messageEl) return;

  const capitalType = itemType.charAt(0).toUpperCase() + itemType.slice(1);
  titleEl.textContent = `Add ${capitalType}`;
  messageEl.textContent = `Would you like to choose a ${itemType} from the compendium?`;

  sheet._currentItemType = itemType;
  modal.style.display = 'flex';

  // Wire overlay click using render-cycle signal so it tears down on rerender.
  const overlay = modal.querySelector('.modal-overlay');
  if (overlay && !overlay._clickHandlerAttached) {
    overlay.addEventListener('click', () => hideItemSelectionModal(sheet), {
      signal: sheet._renderAbort?.signal
    });
    overlay._clickHandlerAttached = true;
  }
}

/**
 * Hide item selection modal
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 */
function hideItemSelectionModal(sheet) {
  const root = sheet.element;
  if (!root) return;
  const modal = root.querySelector('#item-selection-modal');
  if (!modal) return;
  modal.style.display = 'none';
  sheet._currentItemType = null;
}

/**
 * Handle modal yes button click
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 */
async function handleModalYes(sheet) {
  if (!sheet._currentItemType) return;

  hideItemSelectionModal(sheet);

  // Get the compendium pack
  const packName = sheet._currentItemType === 'feat' ? 'foundryvtt-swse.feats' : 'foundryvtt-swse.talents';
  const pack = game.packs.get(packName);

  if (!pack) {
    ui.notifications.error(`${sheet._currentItemType} compendium not found!`);
    return;
  }

  // Open the compendium in a sidebar/window view
  // In Foundry, you can open a compendium and let the user drag items
  // This is the standard approach for item selection
  pack.render(true);

  ui.notifications.info(
    `Drag a ${sheet._currentItemType} from the compendium panel onto your sheet or click to add it.`
  );
}

/**
 * Handle modal no button click
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 */
async function handleModalNo(sheet) {
  if (!sheet._currentItemType) return;

  hideItemSelectionModal(sheet);

  // Create a blank item
  const itemData = {
    type: sheet._currentItemType,
    name: `New ${sheet._currentItemType.charAt(0).toUpperCase() + sheet._currentItemType.slice(1)}`,
    system: {}
  };

  try {
    const doc = await Item.create(itemData, { parent: sheet.actor });
    if (doc) {
      doc.sheet.render(true);
    }
  } catch (err) {
    // console.error(`Failed to create ${sheet._currentItemType}:`, err);
    ui?.notifications?.error?.(`Failed to create ${sheet._currentItemType}: ${err.message}`);
  }
}

/**
 * Activate modal UI listeners
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {HTMLElement} html - The rendered sheet element
 * @param {AbortSignal} signal - Abort signal for cleanup
 */
export function activateModalUI(sheet, html, { signal } = {}) {
  // Modal Yes button
  html.querySelectorAll('[data-action="modal-yes"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      await handleModalYes(sheet);
    }, { signal });
  });

  // Modal No button
  html.querySelectorAll('[data-action="modal-no"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      await handleModalNo(sheet);
    }, { signal });
  });
}

// Export helper functions for external use
export { showItemSelectionModal, hideItemSelectionModal, handleModalYes, handleModalNo };

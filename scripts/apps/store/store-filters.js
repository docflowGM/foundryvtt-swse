/**
 * Filtering and search functionality for SWSE Store
 * Handles category filtering, availability filtering, and search
 */

import { getRandomDialogue } from './store-shared.js';

/**
 * Apply availability filter to currently visible items
 * @param {HTMLElement} doc - The document element
 * @param {string} filterValue - The availability filter value ("all", "Licensed", "Restricted", etc.)
 * @param {Map} itemsById - Map of items by ID for lookup
 * @private
 */
export function applyAvailabilityFilter(doc, filterValue, itemsById) {
    // Get the active panel
    const activePanel = doc.querySelector('.shop-panel.active');
    if (!activePanel) {return;}

    // Get all product items in the active panel
    const productItems = activePanel.querySelectorAll('.product-item');

    productItems.forEach(item => {
        // Get the item ID and look up its availability
        const itemId = item.dataset.itemId || item.dataset.actorId;
        if (!itemId) {
            // If no ID, show the item by default
            item.style.display = '';
            return;
        }

        // Look up the item in our itemsById map
        const itemData = itemsById.get(itemId);
        if (!itemData) {
            // Item not found in map, show it by default
            item.style.display = '';
            return;
        }

        // Get the availability from the item's system data
        const availability = itemData.system?.availability || itemData.system?.sourcebook?.availability || '';

        // Show or hide based on filter
        if (filterValue === 'all') {
            // Show all items
            item.style.display = '';
        } else {
            // Normalize both values for case-insensitive, whitespace-tolerant comparison
            // Handle cases like "Military, Rare" or "Restricted, Rare"
            const availabilityNormalized = availability.toLowerCase().trim();
            const filterNormalized = filterValue.toLowerCase().trim();

            if (availabilityNormalized.includes(filterNormalized)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        }
    });

    // If all items are hidden, show the empty message
    const visibleItems = activePanel.querySelectorAll('.product-item[style=""]').length;
    const emptyMessage = activePanel.querySelector('.empty-message');

    if (visibleItems === 0 && !emptyMessage) {
        // Create temporary empty message if all items are filtered out
        const tempEmptyMessage = document.createElement('div');
        tempEmptyMessage.className = 'empty-message temp-empty-message';
        tempEmptyMessage.innerHTML = `
            <i class="fas fa-filter"></i>
            <p>No items match the selected availability filter.</p>
        `;
        const productsList = activePanel.querySelector('.products-list');
        if (productsList) {
            productsList.appendChild(tempEmptyMessage);
        }
    } else if (visibleItems > 0) {
        // Remove temporary empty message if items are visible
        const tempEmptyMessage = activePanel.querySelector('.temp-empty-message');
        if (tempEmptyMessage) {
            tempEmptyMessage.remove();
        }
    }
}

/**
 * Apply search filter to currently visible items
 * @param {HTMLElement} doc - The document element
 * @param {string} searchTerm - The search term (lowercase)
 */
export function applySearchFilter(doc, searchTerm) {
    // Get the active panel
    const activePanel = doc.querySelector('.shop-panel.active');
    if (!activePanel) {return;}

    // Get all product items in the active panel
    const productItems = activePanel.querySelectorAll('.product-item');

    productItems.forEach(item => {
        // Get item name from the product-name element
        const nameEl = item.querySelector('.product-name');
        const itemName = nameEl ? nameEl.textContent.toLowerCase() : '';

        // Get description if available
        const descEl = item.querySelector('.detail-desc');
        const itemDesc = descEl ? descEl.textContent.toLowerCase() : '';

        // Check if search term matches name or description
        if (searchTerm === '' || itemName.includes(searchTerm) || itemDesc.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });

    // Show message if no items visible
    const visibleItems = activePanel.querySelectorAll('.product-item[style=""]').length;
    let searchEmptyMsg = activePanel.querySelector('.search-empty-message');

    if (visibleItems === 0 && searchTerm !== '') {
        if (!searchEmptyMsg) {
            searchEmptyMsg = document.createElement('div');
            searchEmptyMsg.className = 'empty-message search-empty-message';
            searchEmptyMsg.innerHTML = `
                <i class="fas fa-search"></i>
                <p>No items found matching "${searchTerm}".</p>
            `;
            const productsList = activePanel.querySelector('.products-list');
            if (productsList) {
                productsList.appendChild(searchEmptyMsg);
            }
        }
    } else if (searchEmptyMsg) {
        searchEmptyMsg.remove();
    }
}

/**
 * Switch to a specific shop panel/tab
 * @param {HTMLElement} doc - The document element
 * @param {string} tabName - The tab/panel name to switch to
 * @param {Map} itemsById - Map of items by ID for lookup
 * @param {Function} updateDialogueCallback - Callback to update Rendarr's dialogue
 */
export function switchToPanel(doc, tabName, itemsById, updateDialogueCallback) {
    // Switch active panel
    doc.querySelectorAll('.shop-panel').forEach(p => p.classList.remove('active'));
    const panel = doc.querySelector(`[data-panel="${tabName}"]`);
    if (panel) {panel.classList.add('active');}

    // Update Rendarr's dialogue based on the category
    const dialogue = getRandomDialogue(tabName);
    if (updateDialogueCallback) {
        updateDialogueCallback(dialogue);
    }

    // Apply availability filter to the new panel
    const availabilityFilter = doc.querySelector('#shop-availability-filter')?.value || 'all';
    applyAvailabilityFilter(doc, availabilityFilter, itemsById);
}

/**
 * Apply sorting to currently visible items
 * @param {HTMLElement} doc - The document element
 * @param {string} sortValue - The sort option ("name-asc", "name-desc", "price-asc", "price-desc", "damage-desc", "availability")
 * @param {Map} itemsById - Map of items by ID for lookup
 */
export function applySorting(doc, sortValue, itemsById) {
    // Get the active panel
    const activePanel = doc.querySelector('.shop-panel.active');
    if (!activePanel) {return;}

    // Get all product lists in the active panel (there may be multiple for weapon subcategories)
    const productsLists = activePanel.querySelectorAll('.products-list');

    productsLists.forEach(productsList => {
        // Get all product items in this list
        const productItems = Array.from(productsList.querySelectorAll('.product-item'));
        if (productItems.length === 0) {return;}

        // Sort the items based on the sort value
        productItems.sort((a, b) => {
            const aId = a.dataset.itemId || a.dataset.actorId;
            const bId = b.dataset.itemId || b.dataset.actorId;

            const aData = itemsById.get(aId);
            const bData = itemsById.get(bId);

            switch (sortValue) {
                case 'name-asc': {
                    const aName = a.querySelector('.product-name')?.textContent || '';
                    const bName = b.querySelector('.product-name')?.textContent || '';
                    return aName.localeCompare(bName);

                }
                case 'name-desc': {
                    const aNameDesc = a.querySelector('.product-name')?.textContent || '';
                    const bNameDesc = b.querySelector('.product-name')?.textContent || '';
                    return bNameDesc.localeCompare(aNameDesc);

                }
                case 'price-asc': {
                    const aPrice = aData?.finalCost || 0;
                    const bPrice = bData?.finalCost || 0;
                    return aPrice - bPrice;

                }
                case 'price-desc': {
                    const aPriceDesc = aData?.finalCost || 0;
                    const bPriceDesc = bData?.finalCost || 0;
                    return bPriceDesc - aPriceDesc;

                }
                case 'damage-desc':
                    // Parse damage values (e.g., "3d6", "2d8+1")
                    const aDamage = parseDamage(aData?.system?.damage || '');
                    const bDamage = parseDamage(bData?.system?.damage || '');
                    return bDamage - aDamage;

                case 'availability': {
                    const aAvail = aData?.system?.availability || '';
                    const bAvail = bData?.system?.availability || '';
                    const availOrder = ['Standard', 'Licensed', 'Restricted', 'Military', 'Illegal', 'Rare'];
                    const aIndex = availOrder.findIndex(a => aAvail.includes(a));
                    const bIndex = availOrder.findIndex(b => bAvail.includes(b));
                    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);

                default:
                    return 0;
            }
        });

        // Reorder the DOM elements
        productItems.forEach(item => productsList.appendChild(item));
    });
}

/**
 * Parse damage string to numeric value for sorting
 * @param {string} damageStr - Damage string (e.g., "3d6", "2d8+1")
 * @returns {number} Approximate damage value
 */
function parseDamage(damageStr) {
    if (!damageStr) {return 0;}

    // Extract dice notation (e.g., "3d6+2" -> 3, 6, 2)
    const match = damageStr.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) {return 0;}

    const numDice = parseInt(match[1], 10);
    const diceSize = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    // Calculate average damage: (numDice * (diceSize + 1) / 2) + modifier
    return (numDice * (diceSize + 1) / 2) + modifier;
}

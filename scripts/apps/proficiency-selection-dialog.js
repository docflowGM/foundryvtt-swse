/**
 * Proficiency Selection Dialog
 * Handles category selection for Weapon/Armor Proficiency, Weapon Focus, and Weapon Specialization feats
 */

export class ProficiencySelectionDialog {

  /**
   * Weapon proficiency categories
   */
  static WEAPON_CATEGORIES = {
    'simple': 'Simple Weapons',
    'pistols': 'Pistols',
    'rifles': 'Rifles',
    'lightsabers': 'Lightsabers',
    'heavy': 'Heavy Weapons',
    'advanced-melee': 'Advanced Melee Weapons',
    'exotic': 'Exotic Weapons'
  };

  /**
   * Armor proficiency categories
   */
  static ARMOR_CATEGORIES = {
    'light': 'Light Armor',
    'medium': 'Medium Armor',
    'heavy': 'Heavy Armor'
  };

  /**
   * Check if a feat requires category selection
   * @param {string} featName - Name of the feat
   * @returns {string|null} - 'weapon-proficiency', 'armor-proficiency', 'weapon-focus', or 'weapon-specialization'
   */
  static requiresCategorySelection(featName) {
    const lowerName = featName.toLowerCase();

    // Check for generic proficiency feats (without category already specified)
    if (lowerName === 'weapon proficiency' || lowerName === 'proficiency (weapons)') {
      return 'weapon-proficiency';
    }
    if (lowerName === 'armor proficiency' || lowerName === 'proficiency (armor)') {
      return 'armor-proficiency';
    }
    if (lowerName === 'weapon focus') {
      return 'weapon-focus';
    }
    if (lowerName === 'weapon specialization') {
      return 'weapon-specialization';
    }

    return null;
  }

  /**
   * Get available weapon categories for a character
   * @param {Actor} actor - The actor
   * @param {string} selectionType - 'weapon-proficiency', 'weapon-focus', or 'weapon-specialization'
   * @returns {Object} - Object with available category keys and names
   */
  static getAvailableWeaponCategories(actor, selectionType) {
    const allCategories = this.WEAPON_CATEGORIES;

    // For weapon proficiency, all categories are available
    if (selectionType === 'weapon-proficiency') {
      return allCategories;
    }

    // For weapon focus, only show categories the character has proficiency in
    if (selectionType === 'weapon-focus') {
      const available = {};
      const proficiencies = actor.items.filter(i =>
        i.type === 'feat' && i.name.toLowerCase().includes('weapon proficiency')
      );

      for (const prof of proficiencies) {
        const profName = prof.name.toLowerCase();
        // Check each category
        for (const [key, label] of Object.entries(allCategories)) {
          if (profName.includes(key) || profName.includes(label.toLowerCase())) {
            available[key] = label;
          }
        }
      }

      return available;
    }

    // For weapon specialization, only show categories the character has weapon focus in
    if (selectionType === 'weapon-specialization') {
      const available = {};
      const focuses = actor.items.filter(i =>
        i.type === 'feat' && i.name.toLowerCase().includes('weapon focus')
      );

      for (const focus of focuses) {
        const focusName = focus.name.toLowerCase();
        // Check each category
        for (const [key, label] of Object.entries(allCategories)) {
          if (focusName.includes(key) || focusName.includes(label.toLowerCase())) {
            available[key] = label;
          }
        }
      }

      return available;
    }

    return allCategories;
  }

  /**
   * Show category selection dialog
   * @param {Actor} actor - The actor receiving the feat
   * @param {Item} feat - The feat being added
   * @param {string} selectionType - Type of selection needed
   * @returns {Promise<string|null>} - Selected category key, or null if cancelled
   */
  static async showSelectionDialog(actor, feat, selectionType) {
    let categories;
    let title;
    let description;

    if (selectionType === 'armor-proficiency') {
      categories = this.ARMOR_CATEGORIES;
      title = 'Select Armor Type';
      description = 'Choose which type of armor you gain proficiency with:';
    } else {
      categories = this.getAvailableWeaponCategories(actor, selectionType);

      if (Object.keys(categories).length === 0) {
        if (selectionType === 'weapon-focus') {
          ui.notifications.warn('You must have Weapon Proficiency in a category before you can take Weapon Focus!');
        } else if (selectionType === 'weapon-specialization') {
          ui.notifications.warn('You must have Weapon Focus in a category before you can take Weapon Specialization!');
        }
        return null;
      }

      if (selectionType === 'weapon-proficiency') {
        title = 'Select Weapon Category';
        description = 'Choose which weapon category you gain proficiency with:';
      } else if (selectionType === 'weapon-focus') {
        title = 'Select Weapon Focus Category';
        description = 'Choose a weapon category you are proficient with:';
      } else if (selectionType === 'weapon-specialization') {
        title = 'Select Weapon Specialization Category';
        description = 'Choose a weapon category you have Weapon Focus in:';
      }
    }

    // Build category buttons HTML
    const categoryButtons = Object.entries(categories)
      .map(([key, label]) => `
        <button class="category-btn" data-category="${key}" style="
          display: block;
          width: 100%;
          padding: 10px;
          margin: 5px 0;
          background: #4b4a44;
          color: #f0f0e0;
          border: 1px solid #7a7971;
          border-radius: 3px;
          cursor: pointer;
          text-align: left;
          font-size: 14px;
        ">
          ${label}
        </button>
      `).join('');

    return new Promise((resolve) => {
      const dialog = new Dialog({
        title: title,
        content: `
          <div style="margin-bottom: 15px;">
            <p>${description}</p>
          </div>
          <div class="category-selection">
            ${categoryButtons}
          </div>
        `,
        buttons: {
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'cancel',
        close: () => resolve(null),
        render: (html) => {
          // Add click handlers to category buttons
          html.find('.category-btn').on('click', (event) => {
            const category = event.currentTarget.dataset.category;
            resolve(category);
            dialog.close();
          });
        }
      }, {
        width: 400
      });

      dialog.render(true);
    });
  }

  /**
   * Get the properly formatted feat name with category
   * @param {string} baseFeatName - Base feat name (e.g., "Weapon Proficiency")
   * @param {string} category - Category key
   * @param {string} selectionType - Type of selection
   * @returns {string} - Formatted feat name
   */
  static getFormattedFeatName(baseFeatName, category, selectionType) {
    let categoryLabel;

    if (selectionType === 'armor-proficiency') {
      categoryLabel = this.ARMOR_CATEGORIES[category];
      // Remove "Armor" from the label for the feat name
      categoryLabel = categoryLabel.replace(' Armor', '');
      return `Armor Proficiency (${categoryLabel})`;
    } else {
      categoryLabel = this.WEAPON_CATEGORIES[category];

      if (selectionType === 'weapon-proficiency') {
        return `Weapon Proficiency (${categoryLabel})`;
      } else if (selectionType === 'weapon-focus') {
        return `Weapon Focus (${categoryLabel})`;
      } else if (selectionType === 'weapon-specialization') {
        return `Weapon Specialization (${categoryLabel})`;
      }
    }

    return baseFeatName;
  }

  /**
   * Handle feat addition with category selection
   * @param {Actor} actor - The actor receiving the feat
   * @param {Item} feat - The feat being added
   * @returns {Promise<Item|null>} - Created feat item, or null if cancelled
   */
  static async handleFeatWithCategorySelection(actor, feat) {
    const selectionType = this.requiresCategorySelection(feat.name);

    if (!selectionType) {
      // Feat doesn't need category selection, just add it normally
      return null; // Return null to indicate it should be handled normally
    }

    // Show selection dialog
    const selectedCategory = await this.showSelectionDialog(actor, feat, selectionType);

    if (!selectedCategory) {
      // User cancelled
      return false; // Return false to indicate cancellation
    }

    // Create a modified version of the feat with the selected category
    const featData = feat.toObject();
    featData.name = this.getFormattedFeatName(feat.name, selectedCategory, selectionType);

    // Store the category in the feat's system data for future reference
    featData.system.selectedCategory = selectedCategory;

    // Check if actor already has this specific feat
    const existingFeat = actor.items.find(i =>
      i.type === 'feat' && i.name === featData.name
    );

    if (existingFeat) {
      ui.notifications.warn(`${actor.name} already has ${featData.name}`);
      return false;
    }

    // Create the feat
    const created = await actor.createEmbeddedDocuments('Item', [featData]);
    ui.notifications.info(`${actor.name} gained feat: ${featData.name}`);

    return created[0];
  }
}

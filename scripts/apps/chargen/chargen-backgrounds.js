// ============================================
// Character Generation Backgrounds Module
// Provides selection logic for Event, Occupation, and Planet backgrounds
// ============================================

import { SWSELogger } from '../../utils/logger.js';

/**
 * Get filtered backgrounds for the current category
 * @returns {Array} Filtered background array
 */
export function _getFilteredBackgrounds() {
  const category = this.characterData.backgroundCategory || 'events';

  if (!this.allBackgrounds || this.allBackgrounds.length === 0) {
    return [];
  }

  // Map category names to background category values
  const categoryMap = {
    'events': 'event',
    'occupations': 'occupation',
    'planets': 'planet'
  };

  const targetCategory = categoryMap[category];

  return this.allBackgrounds.filter(bg => {
    // For backwards compatibility with homebrew planets toggle
    if (category === 'planets' && !this.characterData.allowHomebrewPlanets) {
      return bg.category === 'planet' && !bg.homebrew;
    }
    return bg.category === targetCategory;
  });
}

// Render selectable background cards based on current category
export async function _renderBackgroundCards(container) {
  const backgrounds = this._getFilteredBackgrounds();

  if (!backgrounds || backgrounds.length === 0) {
    container.innerHTML = "<p>No backgrounds available in this category.</p>";
    return;
  }

  container.innerHTML = "";

  for (const bg of backgrounds) {
    const div = document.createElement("div");
    div.classList.add("background-card");
    div.dataset.id = bg.id;

    const skillsText = bg.relevantSkills && bg.relevantSkills.length > 0
      ? bg.relevantSkills.join(", ")
      : (bg.trainedSkills && bg.trainedSkills.length > 0 ? bg.trainedSkills.join(", ") : "None");

    const iconHtml = bg.icon ? `<div class="background-icon">${bg.icon}</div>` : '';

    div.innerHTML = `
      ${iconHtml}
      <h3>${bg.name}</h3>
      <p><strong>Trained Skills:</strong> ${skillsText}</p>
      <button class="select-background" data-bg-id="${bg.id}" type="button">Select</button>
    `;

    container.appendChild(div);
  }

  // Re-bind event listeners using jQuery for consistency with rest of chargen
  const $container = $(container);
  $container.find(".select-background")
    .off("click")
    .on("click", this._onSelectBackground.bind(this));
}

// Selection handler
export async function _onSelectBackground(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.bgId;

  const selected = this.allBackgrounds.find(b => b.id === id);
  if (!selected) {
    ui.notifications.error("Unknown background");
    return;
  }

  this.characterData.background = {
    id: selected.id,
    name: selected.name,
    category: selected.category,
    narrativeDescription: selected.narrativeDescription || selected.description || '',
    specialAbility: selected.specialAbility || null,
    bonusLanguage: selected.bonusLanguage || null,
    relevantSkills: selected.relevantSkills || selected.trainedSkills || [],
    icon: selected.icon || ''
  };

  // Store skills from background for later use
  this.characterData.backgroundSkills = selected.relevantSkills || selected.trainedSkills || [];

  ui.notifications.info("Background selected: " + selected.name);
  await this.render();
}

// Used to mark skills as class skills due to background
export function _getBackgroundClassSkills() {
  if (!this.characterData.background) return [];
  return (this.characterData.background.trainedSkills || [])
    .map(s => s.replace(/\s+/g, '').toLowerCase());
}

// Flavor text for narrator
export function _getBackgroundNarratorComment(cat) {
  switch (cat) {
    case "events": return "Your past experiences shape your destiny.";
    case "occupation": return "Your trade helped form your skills.";
    case "planet": return "Your world molded your upbringing.";
    default: return "";
  }
}

/**
 * Handle random background selection
 * @param {Event} event - The click event
 */
export async function _onRandomBackground(event) {
  event.preventDefault();

  if (!this.backgrounds || this.backgrounds.length === 0) {
    ui.notifications.warn("No backgrounds available to choose from.");
    return;
  }

  // Pick a random background
  const randomIndex = Math.floor(Math.random() * this.backgrounds.length);
  const selected = this.backgrounds[randomIndex];

  this.characterData.background = {
    id: selected.id,
    name: selected.name,
    icon: selected.icon || '🎲',
    narrativeDescription: selected.narrativeDescription || selected.description || '',
    specialAbility: selected.specialAbility || null,
    bonusLanguage: selected.bonusLanguage || null,
    trainedSkills: selected.trainedSkills || [],
    category: this.characterData.backgroundCategory || "events"
  };

  ui.notifications.info(`Random background selected: ${selected.name}`);
  await this.render();
}

/**
 * Handle changing the selected background (clearing it to select a new one)
 * @param {Event} event - The click event
 */
export async function _onChangeBackground(event) {
  event.preventDefault();

  // Clear the current background selection
  this.characterData.background = null;
  this.characterData.backgroundSkills = [];

  ui.notifications.info("Background cleared. Please select a new background.");
  await this.render();
}

/**
 * Handle background category tab clicks
 * @param {Event} event - The click event
 */
export async function _onBackgroundCategoryClick(event) {
  event.preventDefault();

  const newCategory = event.currentTarget.dataset.category;
  if (!newCategory) return;

  // Clear background selection when switching categories
  this.characterData.background = null;
  this.characterData.backgroundSkills = [];

  // Update the selected category
  this.characterData.backgroundCategory = newCategory;
  this.characterData.backgroundNarratorComment = this._getBackgroundNarratorComment(newCategory);

  // Update the active tab styling
  const tabs = event.currentTarget.parentElement?.querySelectorAll('.background-category-tab');
  if (tabs) {
    tabs.forEach(tab => tab.classList.remove('active'));
    event.currentTarget.classList.add('active');
  }

  // Re-render background cards for the new category
  const bgContainer = document.querySelector('#background-selection-grid');
  if (bgContainer) {
    await this._renderBackgroundCards(bgContainer);
  }

  ui.notifications.info(`Switched to ${newCategory} backgrounds`);
}

/**
 * Handle background filter/search button click
 * @param {Event} event - The click event
 */
export async function _onBackgroundFilterClick(event) {
  event.preventDefault();

  // Show a dialog to filter backgrounds by skill
  const skills = [...new Set(this.backgrounds.flatMap(bg => bg.trainedSkills || []))].sort();

  const skillOptions = skills
    .map(skill => `<option value="${skill}">${skill}</option>`)
    .join('');

  const content = `
    <p>Filter backgrounds by trained skill:</p>
    <select id="skill-filter-select" style="width: 100%; padding: 0.5rem; margin: 1rem 0;">
      <option value="">-- Show All --</option>
      ${skillOptions}
    </select>
  `;

  new Dialog({
    title: "Filter Backgrounds",
    content,
    buttons: {
      search: {
        icon: '<i class="fas fa-search"></i>',
        label: "Filter",
        callback: (html) => {
          const selectedSkill = html.find('#skill-filter-select').val();
          this._filterBackgroundsBySkill(selectedSkill);
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Cancel"
      }
    },
    default: "search"
  }).render(true);
}

/**
 * Filter backgrounds by selected skill
 * @param {string} skill - The skill name to filter by
 */
export async function _filterBackgroundsBySkill(skill) {
  if (!skill) {
    // Reset to show all backgrounds for current category
    ui.notifications.info("Showing all backgrounds");
  } else {
    // Filter backgrounds to only those with the selected skill
    const filtered = this.backgrounds.filter(bg =>
      bg.trainedSkills && bg.trainedSkills.includes(skill)
    );

    if (filtered.length === 0) {
      ui.notifications.warn(`No backgrounds found with skill: ${skill}`);
      return;
    }

    ui.notifications.info(`Found ${filtered.length} backgrounds with ${skill}`);
    // Temporarily replace backgrounds with filtered list
    const originalBackgrounds = this.backgrounds;
    this.backgrounds = filtered;
    await this.render();
    this.backgrounds = originalBackgrounds; // Restore original after render
  }
}

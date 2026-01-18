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

  let filtered = this.allBackgrounds.filter(bg => {
    // For backwards compatibility with homebrew planets toggle
    if (category === 'planets' && !this.characterData.allowHomebrewPlanets) {
      return bg.category === 'planet' && !bg.homebrew;
    }
    return bg.category === targetCategory;
  });

  // Apply skill filter if one is active
  if (this.characterData.skillFilter) {
    const skill = this.characterData.skillFilter;
    filtered = filtered.filter(bg =>
      (bg.trainedSkills && bg.trainedSkills.includes(skill)) ||
      (bg.relevantSkills && bg.relevantSkills.includes(skill))
    );
  }

  // Apply language filter if one is active
  if (this.characterData.languageFilter) {
    const language = this.characterData.languageFilter;
    filtered = filtered.filter(bg => {
      if (!bg.bonusLanguage) return false;
      return bg.bonusLanguage.split(' or ').map(l => l.trim()).includes(language);
    });
  }

  return filtered;
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
 * Ask the mentor for a background suggestion
 * Uses the suggestion engine to recommend based on class, species, abilities
 * @param {Event} event - The click event
 */
export async function _onAskMentorBackgroundSuggestion(event) {
  event.preventDefault();

  try {
    // Get available backgrounds for current category
    const availableBackgrounds = this._getFilteredBackgrounds();

    if (!availableBackgrounds || availableBackgrounds.length === 0) {
      ui.notifications.warn("No backgrounds available in this category.");
      return;
    }

    // Show loading indicator
    ui.notifications.info("Consulting with your mentor...");

    // Get suggestion engine via coordinator
    if (!game.swse?.suggestions?.suggestBackgrounds) {
      ui.notifications.error("Suggestion engine not available. Please reload the page.");
      SWSELogger.error("BackgroundSuggestion | Suggestion engine not available");
      return;
    }

    // Create temp actor data for suggestion analysis
    const tempActorData = this._createTempActorForValidation();

    // Get suggestions from engine
    const suggestedBackgrounds = await game.swse.suggestions.suggestBackgrounds(
      availableBackgrounds,
      tempActorData,
      this.characterData
    );

    // Find the top suggestion
    const topSuggestion = suggestedBackgrounds.find(bg => bg.suggestion?.tier > 0) || suggestedBackgrounds[0];

    if (!topSuggestion) {
      ui.notifications.warn("Unable to generate a suggestion.");
      return;
    }

    // Import mentor dialog for display
    const { MentorSuggestionDialog } = await import('../mentor-suggestion-dialog.js');
    const { getMentorForClass, getMentorForClass: getMentorForClassName } = await import('../mentor-dialogues.js');

    // Get the character's mentor based on class
    const className = this.characterData.classes?.[0]?.name || 'Scoundrel';
    const mentor = getMentorForClass(className);

    if (!mentor) {
      ui.notifications.error("Mentor not found for this class.");
      return;
    }

    // Create suggestion dialog with mentor voice
    const reason = topSuggestion.suggestion?.reason || "This seems like a good fit for your character";
    const mentorMessage = `${mentor.name} suggests: "${topSuggestion.name}" - ${reason}`;

    // Show the mentor suggestion dialog
    const dialog = new Dialog(
      {
        title: `${mentor.name}'s Recommendation`,
        content: `
          <div class="mentor-suggestion-display">
            <div class="mentor-portrait" style="display: flex; gap: 15px; margin-bottom: 15px;">
              <img src="${mentor.portrait}" alt="${mentor.name}" style="width: 80px; height: 80px; border-radius: 6px;" />
              <div>
                <h3 style="margin: 0;">${mentor.name}</h3>
                <p style="margin: 5px 0; opacity: 0.75;">${mentor.title}</p>
              </div>
            </div>
            <div class="suggestion-content" style="margin: 15px 0;">
              <p style="font-style: italic; font-size: 1.1em;">"${topSuggestion.name} would be an excellent choice for you."</p>
              <p><strong>Why:</strong> ${reason}</p>
              <div class="background-preview" style="border: 1px solid #ccc; padding: 10px; border-radius: 4px; margin-top: 10px;">
                <p>${topSuggestion.narrativeDescription || ''}</p>
                ${topSuggestion.relevantSkills ? `<p><strong>Skills:</strong> ${topSuggestion.relevantSkills.join(', ')}</p>` : ''}
                ${topSuggestion.bonusLanguage ? `<p><strong>Bonus Language:</strong> ${topSuggestion.bonusLanguage}</p>` : ''}
              </div>
            </div>
          </div>
        `,
        buttons: {
          apply: {
            icon: '<i class="fas fa-check"></i>',
            label: "Accept Suggestion",
            callback: async () => {
              // Apply the suggested background
              this.characterData.background = {
                id: topSuggestion.id,
                name: topSuggestion.name,
                category: topSuggestion.category,
                narrativeDescription: topSuggestion.narrativeDescription || '',
                specialAbility: topSuggestion.specialAbility || null,
                bonusLanguage: topSuggestion.bonusLanguage || null,
                relevantSkills: topSuggestion.relevantSkills || [],
                icon: topSuggestion.icon || ''
              };
              this.characterData.backgroundSkills = topSuggestion.relevantSkills || [];

              ui.notifications.info(`${mentor.name} nods approvingly as you select ${topSuggestion.name}.`);
              await this.render();
            }
          },
          decline: {
            icon: '<i class="fas fa-times"></i>',
            label: "Browse Manually",
            callback: () => {
              // Just close the dialog
            }
          }
        },
        default: "apply"
      },
      { classes: ['mentor-suggestion-dialog'] }
    );

    dialog.render(true);

  } catch (err) {
    SWSELogger.error("BackgroundSuggestion | Error suggesting backgrounds:", err);
    ui.notifications.error("Failed to get mentor suggestion. Check console for details.");
  }
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
  // Clear filters when changing categories
  this.characterData.skillFilter = null;
  this.characterData.languageFilter = null;

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

  // Collect all unique skills from backgrounds
  const skills = [...new Set(this.allBackgrounds.flatMap(bg => [...(bg.trainedSkills || []), ...(bg.relevantSkills || [])]))].sort();

  // Collect all unique languages from backgrounds
  const languages = [...new Set(this.allBackgrounds
    .filter(bg => bg.bonusLanguage)
    .map(bg => bg.bonusLanguage)
    .flatMap(lang => lang.split(' or ').map(l => l.trim()))
  )].sort();

  const skillOptions = skills
    .map(skill => `<option value="skill:${skill}">${skill}</option>`)
    .join('');

  const languageOptions = languages
    .map(lang => `<option value="language:${lang}">${lang}</option>`)
    .join('');

  const content = `
    <div style="margin-bottom: 1rem;">
      <p><strong>Filter by Trained Skill:</strong></p>
      <select id="skill-filter-select" style="width: 100%; padding: 0.5rem; margin: 0.5rem 0;">
        <option value="">-- Any Skill --</option>
        ${skillOptions}
      </select>
    </div>
    <div>
      <p><strong>Filter by Bonus Language:</strong></p>
      <select id="language-filter-select" style="width: 100%; padding: 0.5rem; margin: 0.5rem 0;">
        <option value="">-- Any Language --</option>
        ${languageOptions}
      </select>
    </div>
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
          const selectedLanguage = html.find('#language-filter-select').val();
          this._applyBackgroundFilters(selectedSkill, selectedLanguage);
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
 * Apply filters for backgrounds by skill and/or language
 * @param {string} skillFilter - The skill filter (prefixed with "skill:") or empty
 * @param {string} languageFilter - The language filter (prefixed with "language:") or empty
 */
export async function _applyBackgroundFilters(skillFilter, languageFilter) {
  // Extract the actual skill/language values
  const skill = skillFilter.startsWith('skill:') ? skillFilter.substring(6) : null;
  const language = languageFilter.startsWith('language:') ? languageFilter.substring(9) : null;

  if (!skill && !language) {
    // Reset filters
    this.characterData.skillFilter = null;
    this.characterData.languageFilter = null;
    ui.notifications.info("Showing all backgrounds");
  } else {
    // Validate filters
    const currentCategory = this.characterData.backgroundCategory || 'events';
    const categoryMap = {
      'events': 'event',
      'occupations': 'occupation',
      'planets': 'planet'
    };
    const targetCategory = categoryMap[currentCategory];

    let categoryBackgrounds = this.allBackgrounds.filter(bg => bg.category === targetCategory);

    if (skill) {
      categoryBackgrounds = categoryBackgrounds.filter(bg =>
        (bg.trainedSkills && bg.trainedSkills.includes(skill)) ||
        (bg.relevantSkills && bg.relevantSkills.includes(skill))
      );
    }

    if (language) {
      categoryBackgrounds = categoryBackgrounds.filter(bg => {
        if (!bg.bonusLanguage) return false;
        // Check if the selected language is in the bonus language string
        return bg.bonusLanguage.split(' or ').map(l => l.trim()).includes(language);
      });
    }

    if (categoryBackgrounds.length === 0) {
      const filters = [];
      if (skill) filters.push(`skill: ${skill}`);
      if (language) filters.push(`language: ${language}`);
      ui.notifications.warn(`No backgrounds found with ${filters.join(' and ')}`);
      return;
    }

    const filters = [];
    if (skill) filters.push(`skill: ${skill}`);
    if (language) filters.push(`language: ${language}`);
    ui.notifications.info(`Found ${categoryBackgrounds.length} backgrounds with ${filters.join(' and ')}`);

    // Store the filters
    this.characterData.skillFilter = skill;
    this.characterData.languageFilter = language;
  }

  // Re-render to apply or clear the filters
  const bgContainer = document.querySelector('#background-selection-grid');
  if (bgContainer) {
    await this._renderBackgroundCards(bgContainer);
  }
}

/**
 * Apply background data to the created actor
 * @param {Actor} actor - The created actor
 */
export async function _applyBackgroundToActor(actor) {
  const bg = this.characterData.background;
  if (!bg) return;

  const updateData = {};

  // Apply background name/event/profession to system data if fields exist
  if (bg.category === 'events') {
    updateData['system.event'] = bg.name;
  } else if (bg.category === 'occupation') {
    updateData['system.profession'] = bg.name;
  } else if (bg.category === 'planet') {
    updateData['system.planetOfOrigin'] = bg.name;
  }

  // Store full background info in notes or a dedicated field
  if (bg.narrativeDescription) {
    const existingNotes = actor.system.notes || '';
    const bgNotes = `**Background: ${bg.name}**\n${bg.narrativeDescription}`;
    updateData['system.notes'] = existingNotes ? `${existingNotes}\n\n${bgNotes}` : bgNotes;
  }

  // Apply the update
  if (Object.keys(updateData).length > 0) {
    await actor.update(updateData);
  }

  // Add bonus language if specified
  if (bg.bonusLanguage) {
    const existingLanguages = actor.system.languages || [];
    const newLanguage = bg.bonusLanguage.split(' or ')[0].trim(); // Take first option if multiple
    if (!existingLanguages.includes(newLanguage)) {
      await actor.update({
        'system.languages': [...existingLanguages, newLanguage]
      });
    }
  }

  // Add special ability as a feat if specified
  if (bg.specialAbility) {
    const abilityItem = {
      name: bg.specialAbility.name || `${bg.name} Ability`,
      type: 'feat',
      img: bg.icon || 'icons/svg/upgrade.svg',
      system: {
        featType: 'starting',
        benefit: bg.specialAbility.description || bg.specialAbility,
        prerequisite: `Background: ${bg.name}`
      }
    };
    await actor.createEmbeddedDocuments('Item', [abilityItem]);
  }

  console.log(`SWSE | Applied background ${bg.name} to actor ${actor.name}`);
}

// ============================================
// Character Generation Backgrounds Module
// Provides selection logic for Event, Occupation, and Planet backgrounds
// ============================================

import { SWSELogger } from '../../utils/logger.js';
import { SuggestionService } from '../../engine/SuggestionService.js';
import { BackgroundRegistry } from '../../registries/background-registry.js';

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
      if (!bg.bonusLanguage) {return false;}
      return bg.bonusLanguage.split(' or ').map(l => l.trim()).includes(language);
    });
  }

  // Apply free-text search (name, description, skills, language)
  const q = String(this.characterData.backgroundSearch || '').trim().toLowerCase();
  if (q) {
    filtered = filtered.filter((bg) => {
      const name = String(bg.name || bg.slug || '').toLowerCase();
      const desc = String(bg.narrativeDescription || bg.description || '').toLowerCase();
      const skills = [...(bg.trainedSkills || []), ...(bg.relevantSkills || [])].join(' ').toLowerCase();
      const lang = String(bg.bonusLanguage || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || skills.includes(q) || lang.includes(q);
    });
  }

  return filtered;
}

// Render selectable background cards based on current category
export async function _renderBackgroundCards(container) {
const backgrounds = this._getFilteredBackgrounds();

  if (!backgrounds || backgrounds.length === 0) {
    container.innerHTML = '<p>No backgrounds available in this category.</p>';
    return;
  }

  container.innerHTML = '';

  for (const bg of backgrounds) {
    const div = document.createElement('div');
    div.classList.add('background-card');
    div.dataset.bgId = bg.id || bg.slug || '';
    div.dataset.uuid = bg.uuid || '';

    const name = bg.name || bg.slug || 'Unknown';
    const icon = bg.icon ? `<div class="background-icon">${bg.icon}</div>` : '';
    const narrative = (bg.narrativeDescription || bg.description || '').trim();
    const narrativeShort = narrative.length > 180 ? `${narrative.slice(0, 177)}…` : narrative;

    const skills = Array.isArray(bg.relevantSkills) && bg.relevantSkills.length
      ? bg.relevantSkills
      : (Array.isArray(bg.trainedSkills) ? bg.trainedSkills : []);
    const skillsText = skills.length ? skills.join(', ') : 'None';

    const special = (bg.specialAbility || '').trim();
    const language = (bg.bonusLanguage || '').trim();

    div.innerHTML = `
      <div class="background-card-inner">
        <div class="background-card-face background-card-front">
          ${icon}
          <h3>${name}</h3>
          ${narrativeShort ? `<p class="bg-narrative">${narrativeShort}</p>` : ''}
          <p class="bg-meta"><strong>Skills:</strong> ${skillsText}</p>
          ${language ? `<p class="bg-meta"><strong>Language:</strong> ${language}</p>` : ''}
        </div>

        <div class="background-card-face background-card-back">
          <h4>${name}</h4>
          ${narrative ? `<p class="bg-narrative">${narrative}</p>` : ''}
          <div class="bg-benefits">
            <strong>Benefits</strong>
            <ul>
              <li><strong>Skills:</strong> ${skillsText}</li>
              ${language ? `<li><strong>Language:</strong> ${language}</li>` : ''}
              ${special ? `<li><strong>Special:</strong> ${special}</li>` : ''}
            </ul>
          </div>
        </div>
      </div>

      <div class="background-card-actions">
        <button type="button" class="background-details-toggle btn-tertiary">
          Details
        </button>
        <button type="button" class="background-read btn-secondary" ${bg.uuid ? '' : 'disabled'}>
          Read
        </button>
        <button type="button" class="select-background btn-primary" data-bg-id="${div.dataset.bgId}">
          Select
        </button>
      </div>
    `;

    container.appendChild(div);
  }

  // Event delegation (AppV2-safe, no jQuery).
  container.onclick = async (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) {return;}

    const card = btn.closest('.background-card');
    const bgId = btn.dataset.bgId || card?.dataset?.bgId;

    if (btn.classList.contains('select-background')) {
      ev.preventDefault();
      if (bgId) {await this._onSelectBackground(bgId);}
      return;
    }

    if (btn.classList.contains('background-details-toggle')) {
      ev.preventDefault();
      if (card) {card.classList.toggle('is-flipped');}
      return;
    }

    if (btn.classList.contains('background-read')) {
      ev.preventDefault();
      const uuid = card?.dataset?.uuid;
      if (!uuid) {return;}
      const doc = await fromUuid(uuid);
      if (doc?.sheet) {doc.sheet.render(true);}
      return;
    }
  };
}

// Selection handler
export async function _onSelectBackground(eventOrId) {
const id = typeof eventOrId === 'string'
    ? eventOrId
    : eventOrId?.currentTarget?.dataset?.bgId;

  if (eventOrId?.preventDefault) {eventOrId.preventDefault();}
  if (!id) {return;}

  const selected = this.allBackgrounds.find(b => b.id === id);
  if (!selected) {
    ui.notifications.error('Unknown background');
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

  const record = await BackgroundRegistry.getBySlug(selected.id);
  this.characterData.backgroundId = record?.internalId || '';
  this.characterData.backgroundUuid = record?.uuid || '';

  this.characterData.backgroundSkills = selected.relevantSkills || selected.trainedSkills || [];

  ui.notifications.info('Background selected: ' + selected.name);
  await this.render();
}

// Used to mark skills as class skills due to background
export function _getBackgroundClassSkills() {
  if (!this.characterData.background) {return [];}
  return (this.characterData.background.trainedSkills || [])
    .map(s => s.replace(/\s+/g, '').toLowerCase());
}

// Flavor text for narrator
export function _getBackgroundNarratorComment(cat) {
  switch (cat) {
    case 'events': return 'Your past experiences shape your destiny.';
    case 'occupation': return 'Your trade helped form your skills.';
    case 'planet': return 'Your world molded your upbringing.';
    default: return '';
  }
}

/**
 * Handle random background selection
 * @param {Event} event - The click event
 */
export async function _onRandomBackground(event) {
  event.preventDefault();

  if (!this.backgrounds || this.backgrounds.length === 0) {
    ui.notifications.warn('No backgrounds available to choose from.');
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
    category: this.characterData.backgroundCategory || 'events'
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
  this.characterData.backgroundId = '';

  ui.notifications.info('Background cleared. Please select a new background.');
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
      ui.notifications.warn('No backgrounds available in this category.');
      return;
    }

    // Show loading indicator
    ui.notifications.info('Consulting with your mentor...');

    // Get suggestion engine via coordinator
    if (!SuggestionService) {
      ui.notifications.error('Suggestion engine not available. Please reload the page.');
      SWSELogger.error('BackgroundSuggestion | Suggestion engine not available');
      return;
    }

    // Create temp actor data for suggestion analysis
    const tempActorData = this._createTempActorForValidation();

    // Get suggestions from engine
    const suggestedBackgrounds = await SuggestionService.getSuggestions(tempActorData, 'chargen', {
      domain: 'backgrounds',
      available: availableBackgrounds,
      pendingData: this.characterData,
      persist: true
    });

    // Find the top suggestion
    const topSuggestion = suggestedBackgrounds.find(bg => bg.suggestion?.tier > 0) || suggestedBackgrounds[0];

    if (!topSuggestion) {
      ui.notifications.warn('Unable to generate a suggestion.');
      return;
    }

    // Import mentor dialog for display
    const { MentorSuggestionDialog } = await import('../mentor-suggestion-dialog.js');
    const { getMentorForClass, getMentorForClass: getMentorForClassName } = await import('../mentor-dialogues.js');

    // Get the character's mentor based on class
    const className = this.characterData.classes?.[0]?.name || 'Scoundrel';
    const mentor = getMentorForClass(className);

    if (!mentor) {
      ui.notifications.error('Mentor not found for this class.');
      return;
    }

    // Create suggestion dialog with mentor voice
    const reason = topSuggestion.suggestion?.reason || 'This seems like a good fit for your character';
    const mentorMessage = `${mentor.name} suggests: "${topSuggestion.name}" - ${reason}`;

    // Show the mentor suggestion dialog
    const dialog = new BackgroundMentorSuggestionDialog(mentor, topSuggestion, reason, this);
    dialog.render(true);

  } catch (err) {
    SWSELogger.error('BackgroundSuggestion | Error suggesting backgrounds:', err);
    ui.notifications.error('Failed to get mentor suggestion. Check console for details.');
  }
}

/**
 * Handle background category tab clicks
 * @param {Event} event - The click event
 */
export async function _onBackgroundCategoryClick(event) {
  event.preventDefault();

  const newCategory = event.currentTarget.dataset.category;
  if (!newCategory) {return;}

  // Clear background selection when switching categories
  this.characterData.background = null;
  this.characterData.backgroundSkills = [];
  // Clear filters when changing categories
  this.characterData.skillFilter = null;
  this.characterData.languageFilter = null;

  // Update the selected category
  this.characterData.backgroundCategory = newCategory;

  // Update narrator comment from mentor guidance
  const mentor = this._getCurrentMentor();
  if (mentor) {
    this.characterData.backgroundNarratorComment = mentor.backgroundGuidance || null;
  }

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

  const panel = document.querySelector('.background-filter-panel');
  if (!panel) {return;}

  panel.classList.toggle('collapsed');

  const search = panel.querySelector('.background-search-input');
  if (search && !panel.classList.contains('collapsed')) {
    search.focus();
  }
}

/**
 * Apply filters for backgrounds by skill and/or language
 * @param {string} skillFilter - The skill filter (prefixed with "skill:") or empty
 * @param {string} languageFilter - The language filter (prefixed with "language:") or empty
 */
export async function _applyBackgroundFilters(skillFilter, languageFilter) {
  // Extract the actual skill/language values
  const skill = skillFilter && skillFilter.startsWith('skill:') ? skillFilter.substring(6) : null;
  const language = languageFilter && languageFilter.startsWith('language:') ? languageFilter.substring(9) : null;

  if (!skill && !language) {
    // Reset filters
    this.characterData.skillFilter = null;
    this.characterData.languageFilter = null;
    ui.notifications.info('Showing all backgrounds');
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
        if (!bg.bonusLanguage) {return false;}
        // Check if the selected language is in the bonus language string
        return bg.bonusLanguage.split(' or ').map(l => l.trim()).includes(language);
      });
    }

    if (categoryBackgrounds.length === 0) {
      const filters = [];
      if (skill) {filters.push(`skill: ${skill}`);}
      if (language) {filters.push(`language: ${language}`);}
      ui.notifications.warn(`No backgrounds found with ${filters.join(' and ')}`);
      return;
    }

    const filters = [];
    if (skill) {filters.push(`skill: ${skill}`);}
    if (language) {filters.push(`language: ${language}`);}
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
  if (!bg) {return;}

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


function _collectBackgroundFilters(backgrounds) {
  const skills = [...new Set(backgrounds.flatMap((bg) => [...(bg.trainedSkills || []), ...(bg.relevantSkills || [])]))]
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .sort();

  const languages = [...new Set(backgrounds
    .filter((bg) => bg.bonusLanguage)
    .flatMap((bg) => String(bg.bonusLanguage).split(' or ').map((l) => l.trim()))
  )]
    .filter(Boolean)
    .sort();

  return { skills, languages };
}

function _renderChipRow(rowEl, items, type, activeValue) {
  if (!rowEl) {return;}
  const parts = [];
  parts.push(`<button type="button" class="bg-chip ${!activeValue ? 'active' : ''}" data-type="${type}" data-value="">Any</button>`);
  for (const v of items) {
    const active = activeValue === v ? 'active' : '';
    parts.push(`<button type="button" class="bg-chip ${active}" data-type="${type}" data-value="${v}">${v}</button>`);
  }
  rowEl.innerHTML = parts.join('');
}

function _refreshBackgroundFilterPanel(panelEl, backgrounds) {
  const { skills, languages } = _collectBackgroundFilters(backgrounds);

  _renderChipRow(
    panelEl.querySelector('#background-skill-chips'),
    skills,
    'skill',
    this.characterData.skillFilter || ''
  );

  _renderChipRow(
    panelEl.querySelector('#background-language-chips'),
    languages,
    'language',
    this.characterData.languageFilter || ''
  );
}

/**
 * Render + bind inline filters for Backgrounds (search + skill/language chips).
 * AppV2 safe: uses delegated listeners; safe to call every render.
 */
export function _renderBackgroundFilterPanel(root) {
  const panel = root.querySelector('.background-filter-panel');
  if (!panel || this.characterData.background) {return;}

  // Ensure defaults exist
  if (typeof this.characterData.backgroundSearch !== 'string') {this.characterData.backgroundSearch = '';}
  if (typeof this.characterData.skillFilter !== 'string') {this.characterData.skillFilter = '';}
  if (typeof this.characterData.languageFilter !== 'string') {this.characterData.languageFilter = '';}

  const search = panel.querySelector('.background-search-input');
  if (search) {
    search.value = this.characterData.backgroundSearch || '';
    search.oninput = () => {
      this.characterData.backgroundSearch = search.value || '';
      const grid = root.querySelector('#background-selection-grid');
      if (grid) {this._renderBackgroundCards(grid);}
      _refreshBackgroundFilterPanel.call(this, panel, this.allBackgrounds || []);
    };
  }

  const clearBtn = panel.querySelector('.clear-background-filters');
  if (clearBtn) {
    clearBtn.onclick = () => {
      this.characterData.backgroundSearch = '';
      this.characterData.skillFilter = '';
      this.characterData.languageFilter = '';
      if (search) {search.value = '';}
      const grid = root.querySelector('#background-selection-grid');
      if (grid) {this._renderBackgroundCards(grid);}
      _refreshBackgroundFilterPanel.call(this, panel, this.allBackgrounds || []);
    };
  }

  panel.onclick = (ev) => {
    const btn = ev.target.closest('button.bg-chip');
    if (!btn) {return;}

    const type = btn.dataset.type;
    const value = btn.dataset.value || '';

    if (type === 'skill') {
      this.characterData.skillFilter = (this.characterData.skillFilter === value) ? '' : value;
    } else if (type === 'language') {
      this.characterData.languageFilter = (this.characterData.languageFilter === value) ? '' : value;
    } else {
      return;
    }

    const grid = root.querySelector('#background-selection-grid');
    if (grid) {this._renderBackgroundCards(grid);}
    _refreshBackgroundFilterPanel.call(this, panel, this.allBackgrounds || []);
  };

  _refreshBackgroundFilterPanel.call(this, panel, this.allBackgrounds || []);
}

/**
 * Background Mentor Suggestion Dialog (AppV2-based)
 * Displays mentor recommendation for background selection
 */
class BackgroundMentorSuggestionDialog extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'swse-background-mentor-suggestion',
    tag: 'div',
    window: { icon: 'fas fa-user-tie', title: 'Mentor Recommendation' },
    position: { width: 500, height: 'auto' }
  };

  constructor(mentor, topSuggestion, reason, parentChargen) {
    super({ window: { title: `${mentor.name}'s Recommendation` } });
    this.mentor = mentor;
    this.topSuggestion = topSuggestion;
    this.reason = reason;
    this.parentChargen = parentChargen;
  }

  _renderHTML(context, options) {
    return `
      <div class="mentor-suggestion-display">
        <div class="mentor-portrait" style="display: flex; gap: 15px; margin-bottom: 15px;">
          <img src="${this.mentor.portrait}" alt="${this.mentor.name}" style="width: 80px; height: 80px; border-radius: 6px;" />
          <div>
            <h3 style="margin: 0;">${this.mentor.name}</h3>
            <p style="margin: 5px 0; opacity: 0.75;">${this.mentor.title}</p>
          </div>
        </div>
        <div class="suggestion-content" style="margin: 15px 0;">
          <p style="font-style: italic; font-size: 1.1em;">"${this.topSuggestion.name} would be an excellent choice for you."</p>
          <p><strong>Why:</strong> ${this.reason}</p>
          <div class="background-preview" style="border: 1px solid #ccc; padding: 10px; border-radius: 4px; margin-top: 10px;">
            <p>${this.topSuggestion.narrativeDescription || ''}</p>
            ${this.topSuggestion.relevantSkills ? `<p><strong>Skills:</strong> ${this.topSuggestion.relevantSkills.join(', ')}</p>` : ''}
            ${this.topSuggestion.bonusLanguage ? `<p><strong>Bonus Language:</strong> ${this.topSuggestion.bonusLanguage}</p>` : ''}
          </div>
        </div>
      </div>
      <div class="dialog-buttons" style="margin-top: 1rem; text-align: right;">
        <button class="btn btn-primary" data-action="apply" style="margin-right: 0.5rem;">Accept Suggestion</button>
        <button class="btn btn-secondary" data-action="decline">Browse Manually</button>
      </div>
    `;
  }

  _replaceHTML(result, content, options) {
    result.innerHTML = '';
    result.appendChild(content);
  }

  _onRender(context, options) {
    super._onRender(context, options);

    this.element?.querySelector('[data-action="apply"]')?.addEventListener('click', async () => {
      // Apply the suggested background
      this.parentChargen.characterData.background = {
        id: this.topSuggestion.id,
        name: this.topSuggestion.name,
        category: this.topSuggestion.category,
        narrativeDescription: this.topSuggestion.narrativeDescription || '',
        specialAbility: this.topSuggestion.specialAbility || null,
        bonusLanguage: this.topSuggestion.bonusLanguage || null,
        relevantSkills: this.topSuggestion.relevantSkills || [],
        icon: this.topSuggestion.icon || ''
      };
      this.parentChargen.characterData.backgroundSkills = this.topSuggestion.relevantSkills || [];

      ui.notifications.info(`${this.mentor.name} nods approvingly as you select ${this.topSuggestion.name}.`);
      await this.parentChargen.render();
      this.close();
    });

    this.element?.querySelector('[data-action="decline"]')?.addEventListener('click', () => {
      this.close();
    });
  }
}

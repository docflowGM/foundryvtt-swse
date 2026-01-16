// ============================================
// Character Generation Backgrounds Module
// Provides selection logic for Event, Occupation, and Planet backgrounds
// ============================================

import { SWSELogger } from '../../utils/logger.js';

// Render selectable background cards
export async function _renderBackgroundCards(container) {
  if (!this.backgrounds || this.backgrounds.length === 0) {
    container.innerHTML = "<p>No backgrounds available.</p>";
    return;
  }

  container.innerHTML = "";

  for (const bg of this.backgrounds) {
    const div = document.createElement("div");
    div.classList.add("background-card");
    div.dataset.id = bg.id;

    div.innerHTML = `
      <h3>${bg.name}</h3>
      <p><strong>Trained Skills:</strong> ${bg.trainedSkills.join(", ")}</p>
      <button class="select-background" data-bg="${bg.id}">Select</button>
    `;

    container.appendChild(div);
  }

  container.querySelectorAll(".select-background")
    .forEach(btn => btn.addEventListener("click", evt => this._onSelectBackground(evt)));
}

// Selection handler
export function _onSelectBackground(event) {
  event.preventDefault();
  const id = event.currentTarget.dataset.bg;

  const selected = this.backgrounds.find(b => b.id === id);
  if (!selected) {
    ui.notifications.error("Unknown background");
    return;
  }

  this.characterData.background = {
    id: selected.id,
    name: selected.name,
    trainedSkills: selected.trainedSkills,
    category: "event"
  };

  // Process background skills into backgroundSkills array for skills UI
  this.characterData.backgroundSkills = _processBackgroundSkills.call(this, selected.trainedSkills);

  SWSELogger.log(`CharGen | Background selected: ${selected.name}, grants class skills:`, this.characterData.backgroundSkills);
  ui.notifications.info("Background selected: " + selected.name);
  this.render();
}

/**
 * Process background trainedSkills array into normalized backgroundSkills array
 * @param {Array<string>} trainedSkills - Array of skill names from background
 * @returns {Array<Object>} Array of skill objects with key and display name
 * @private
 */
function _processBackgroundSkills(trainedSkills) {
  if (!trainedSkills || !Array.isArray(trainedSkills)) {
    return [];
  }

  // Skill name mapping (display name -> key)
  const skillKeyMap = {
    'Acrobatics': 'acrobatics',
    'Climb': 'climb',
    'Deception': 'deception',
    'Endurance': 'endurance',
    'Gather Information': 'gatherInfo',
    'Initiative': 'initiative',
    'Jump': 'jump',
    'Knowledge': 'knowledge', // Generic knowledge
    'Mechanics': 'mechanics',
    'Perception': 'perception',
    'Persuasion': 'persuasion',
    'Pilot': 'pilot',
    'Ride': 'ride',
    'Stealth': 'stealth',
    'Survival': 'survival',
    'Swim': 'swim',
    'Treat Injury': 'treatInjury',
    'Use Computer': 'useComputer',
    'Use the Force': 'useTheForce'
  };

  const processed = [];

  for (const skillName of trainedSkills) {
    // Try exact match first
    let key = skillKeyMap[skillName];

    // If no exact match, try normalized matching
    if (!key) {
      const normalized = skillName.replace(/\s+/g, '').toLowerCase();
      // Find by normalized comparison
      for (const [displayName, skillKey] of Object.entries(skillKeyMap)) {
        if (displayName.replace(/\s+/g, '').toLowerCase() === normalized) {
          key = skillKey;
          break;
        }
      }
    }

    // If still no match, use normalized name as key
    if (!key) {
      key = skillName.replace(/\s+/g, '').toLowerCase();
      SWSELogger.warn(`CharGen | Background skill "${skillName}" not found in skill key map, using normalized: ${key}`);
    }

    processed.push({
      key: key,
      display: skillName
    });
  }

  return processed;
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
export function _onRandomBackground(event) {
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

  // Process background skills into backgroundSkills array for skills UI
  this.characterData.backgroundSkills = _processBackgroundSkills.call(this, selected.trainedSkills || []);

  SWSELogger.log(`CharGen | Random background selected: ${selected.name}, grants class skills:`, this.characterData.backgroundSkills);
  ui.notifications.info(`Random background selected: ${selected.name}`);
  this.render();
}

/**
 * Handle changing the selected background (clearing it to select a new one)
 * @param {Event} event - The click event
 */
export function _onChangeBackground(event) {
  event.preventDefault();

  // Clear the current background selection
  this.characterData.background = null;
  this.characterData.backgroundSkills = [];

  ui.notifications.info("Background cleared. Please select a new background.");
  this.render();
}

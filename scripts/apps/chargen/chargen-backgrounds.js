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

  ui.notifications.info("Background selected: " + selected.name);
  this.render();
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

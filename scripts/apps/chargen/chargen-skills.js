// ============================================
// Skill selection and training for CharGen
// ============================================

import { SWSELogger } from '../../utils/logger.js';

/**
 * Handle skill selection (checkbox)
 */
export async function _onSkillSelect(event) {
  const skillKey = event.currentTarget.dataset.skill;
  const checked = event.currentTarget.checked;
  SWSELogger.log(`[CHARGEN-SKILLS] _onSkillSelect: Skill "${skillKey}" - checked: ${checked}`);

  if (!this.characterData.skills[skillKey]) {
    this.characterData.skills[skillKey] = { trained: false };
    SWSELogger.log(`[CHARGEN-SKILLS] _onSkillSelect: Initialized skill "${skillKey}"`);
  }

  // Check if trying to train beyond limit
  if (checked) {
    const currentTrained = Object.values(this.characterData.skills).filter(s => s.trained).length;
    const maxAllowed = this.characterData.trainedSkillsAllowed || 1;

    if (currentTrained >= maxAllowed) {
      ui.notifications.warn(`You can only train ${maxAllowed} skills. Untrain another skill first.`);
      SWSELogger.warn(`[CHARGEN-SKILLS] _onSkillSelect: Limit reached (${currentTrained}/${maxAllowed}), cannot train "${skillKey}"`);
      event.currentTarget.checked = false; // Uncheck the box
      return;
    }
  }

  this.characterData.skills[skillKey].trained = checked;
  const currentTrained = Object.values(this.characterData.skills).filter(s => s.trained).length;
  const maxAllowed = this.characterData.trainedSkillsAllowed || 1;
  SWSELogger.log(`[CHARGEN-SKILLS] _onSkillSelect: Updated "${skillKey}" to trained=${checked}, current: ${currentTrained}/${maxAllowed}`);

  await this.render();
}

/**
 * Handle train skill button
 */
export async function _onTrainSkill(event) {
  event.preventDefault();
  const skillKey = event.currentTarget.dataset.skill;
  SWSELogger.log(`[CHARGEN-SKILLS] _onTrainSkill: START - Skill "${skillKey}"`);

  // Initialize skill if not exists
  if (!this.characterData.skills[skillKey]) {
    this.characterData.skills[skillKey] = { trained: false };
    SWSELogger.log(`[CHARGEN-SKILLS] _onTrainSkill: Initialized skill "${skillKey}"`);
  }

  // Check if already at limit BEFORE training
  const currentTrained = Object.values(this.characterData.skills).filter(s => s.trained).length;
  const maxAllowed = this.characterData.trainedSkillsAllowed || 1;

  if (!this.characterData.skills[skillKey].trained && currentTrained >= maxAllowed) {
    ui.notifications.warn(`You can only train ${maxAllowed} skills. Untrain another skill first.`);
    SWSELogger.warn(`[CHARGEN-SKILLS] _onTrainSkill: Limit reached (${currentTrained}/${maxAllowed}), cannot train "${skillKey}"`);
    return;
  }

  // Train the skill
  this.characterData.skills[skillKey].trained = true;
  const newCount = Object.values(this.characterData.skills).filter(s => s.trained).length;
  SWSELogger.log(`[CHARGEN-SKILLS] _onTrainSkill: Trained skill "${skillKey}", current: ${newCount}/${maxAllowed}`);
  await this.render();
}

/**
 * Handle untrain skill button
 */
export async function _onUntrainSkill(event) {
  event.preventDefault();
  const skillKey = event.currentTarget.dataset.skill;
  SWSELogger.log(`[CHARGEN-SKILLS] _onUntrainSkill: START - Skill "${skillKey}"`);

  // Untrain the skill
  if (this.characterData.skills[skillKey]) {
    this.characterData.skills[skillKey].trained = false;
    const currentTrained = Object.values(this.characterData.skills).filter(s => s.trained).length;
    const maxAllowed = this.characterData.trainedSkillsAllowed || 1;
    SWSELogger.log(`[CHARGEN-SKILLS] _onUntrainSkill: Untrained skill "${skillKey}", current: ${currentTrained}/${maxAllowed}`);
  } else {
    SWSELogger.warn(`[CHARGEN-SKILLS] WARNING: _onUntrainSkill - Skill "${skillKey}" not found in characterData`);
  }

  await this.render();
}

/**
 * Handle reset skills button
 */
export async function _onResetSkills(event) {
  event.preventDefault();
  SWSELogger.log(`[CHARGEN-SKILLS] _onResetSkills: START - Total skills:`, Object.keys(this.characterData.skills).length);

  // Reset all skills to untrained
  const previousTrained = Object.values(this.characterData.skills).filter(s => s.trained).length;
  for (const skillKey in this.characterData.skills) {
    this.characterData.skills[skillKey].trained = false;
  }

  SWSELogger.log(`[CHARGEN-SKILLS] _onResetSkills: Reset ${previousTrained} previously trained skills`);
  ui.notifications.info("All skill selections have been reset.");
  await this.render();
}

/**
 * Bind skills UI (deprecated simple version)
 */
export function _bindSkillsUI(root) {
  const doc = root || this.element;
  // Template uses class="skills-list-chargen", not id="skills-list"
  const skillsContainer = root.querySelector(".skills-list-chargen");
  SWSELogger.log(`[CHARGEN-SKILLS] _bindSkillsUI: START - skillsContainer:`, skillsContainer ? 'FOUND' : 'NOT FOUND');
  if (!skillsContainer) {
    // This is expected on non-skills steps - only warn if we're on the skills step
    return;
  }

  // Ensure skills data is available
  if (!this._skillsJson || !Array.isArray(this._skillsJson)) {
    SWSELogger.warn(`[CHARGEN-SKILLS] WARNING: Skills data not loaded, using defaults`);
    this._skillsJson = this._getDefaultSkills();
    SWSELogger.log(`[CHARGEN-SKILLS] _bindSkillsUI: Loaded ${this._skillsJson.length} default skills`);
  } else {
    SWSELogger.log(`[CHARGEN-SKILLS] _bindSkillsUI: Skills JSON loaded with ${this._skillsJson.length} skills`);
  }

  // Maximum trained skills based on class + INT + racial bonuses
  const maxTrained = this.characterData.trainedSkillsAllowed || 1;
  let trainedCount = 0;

  // Count current trained skills
  for (const skill of this._skillsJson) {
    if (this.characterData.skills[skill.key]?.trained) {
      trainedCount++;
    }
  }
  SWSELogger.log(`[CHARGEN-SKILLS] _bindSkillsUI: Current trained skills: ${trainedCount}/${maxTrained}`);

  // Update counter display
  const updateCounter = () => {
    const counter = root.querySelector("#trained-counter");
    if (counter) counter.textContent = `${trainedCount} / ${maxTrained}`;
  };
  updateCounter();

  // Render skills
  skillsContainer.innerHTML = "";
  for (const skill of this._skillsJson) {
    const skillData = this.characterData.skills[skill.key] || { trained: false, focus: false, misc: 0 };

    const row = document.createElement("div");
    row.className = "skill-row";

    const label = document.createElement("label");
    label.textContent = skill.name;

    const trainedCheck = document.createElement("input");
    trainedCheck.type = "checkbox";
    trainedCheck.checked = skillData.trained;
    trainedCheck.onchange = (ev) => {
      if (ev.target.checked && trainedCount >= maxTrained) {
        ui.notifications.warn(`Maximum trained skills (${maxTrained}) reached!`);
        ev.target.checked = false;
        return;
      }

      if (ev.target.checked) trainedCount++;
      else trainedCount--;

      if (!this.characterData.skills[skill.key]) {
        this.characterData.skills[skill.key] = {};
      }
      this.characterData.skills[skill.key].trained = ev.target.checked;
      updateCounter();
    };

    const focusCheck = document.createElement("input");
    focusCheck.type = "checkbox";
    focusCheck.checked = skillData.focus;
    focusCheck.onchange = (ev) => {
      if (!this.characterData.skills[skill.key]) {
        this.characterData.skills[skill.key] = {};
      }
      this.characterData.skills[skill.key].focus = ev.target.checked;
    };

    row.appendChild(label);
    row.appendChild(document.createTextNode(" Trained: "));
    row.appendChild(trainedCheck);
    row.appendChild(document.createTextNode(" Focus: "));
    row.appendChild(focusCheck);

    skillsContainer.appendChild(row);
  }
}

/**
 * Bind Skill card UX (flip).
 * AppV2-safe: assigns onclick on the step per render.
 */
export function _bindSkillCardUI(root) {
  const step = root.querySelector('.step-skills');
  if (!step) return;

  step.onclick = (ev) => {
    const btn = ev.target.closest('button');
    if (!btn) return;

    if (!btn.classList.contains('skill-details-toggle')) return;

    ev.preventDefault();
    const card = btn.closest('.skill-card');
    card?.classList.toggle('is-flipped');
  };
}

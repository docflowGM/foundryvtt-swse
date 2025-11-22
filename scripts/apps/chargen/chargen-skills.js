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

  if (!this.characterData.skills[skillKey]) {
    this.characterData.skills[skillKey] = { trained: false };
  }

  this.characterData.skills[skillKey].trained = checked;
  await this.render();
}

/**
 * Handle train skill button
 */
export async function _onTrainSkill(event) {
  event.preventDefault();
  const skillKey = event.currentTarget.dataset.skill;

  // Initialize skill if not exists
  if (!this.characterData.skills[skillKey]) {
    this.characterData.skills[skillKey] = { trained: false };
  }

  // Train the skill
  this.characterData.skills[skillKey].trained = true;
  SWSELogger.log(`CharGen | Trained skill: ${skillKey}`);
  await this.render();
}

/**
 * Handle untrain skill button
 */
export async function _onUntrainSkill(event) {
  event.preventDefault();
  const skillKey = event.currentTarget.dataset.skill;

  // Untrain the skill
  if (this.characterData.skills[skillKey]) {
    this.characterData.skills[skillKey].trained = false;
    SWSELogger.log(`CharGen | Untrained skill: ${skillKey}`);
  }

  await this.render();
}

/**
 * Handle reset skills button
 */
export async function _onResetSkills(event) {
  event.preventDefault();

  // Reset all skills to untrained
  for (const skillKey in this.characterData.skills) {
    this.characterData.skills[skillKey].trained = false;
  }

  SWSELogger.log("CharGen | Reset all skill selections");
  ui.notifications.info("All skill selections have been reset.");
  await this.render();
}

/**
 * Bind skills UI (deprecated simple version)
 */
export function _bindSkillsUI(root) {
  const doc = root || this.element[0];
  const skillsContainer = root.querySelector("#skills-list");
  if (!skillsContainer) return;

  // Maximum trained skills based on class + INT + racial bonuses
  const maxTrained = this.characterData.trainedSkillsAllowed || 1;
  let trainedCount = 0;

  // Count current trained skills
  for (const skill of this._skillsJson) {
    if (this.characterData.skills[skill.key]?.trained) {
      trainedCount++;
    }
  }

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

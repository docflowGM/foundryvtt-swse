/**
 * Actor Sheet Enhancements for House Rules
 * Displays training points, healing cooldowns, and other house rule information on character sheets
 */

import { SWSELogger } from "../utils/logger.js";
import { SkillTrainingMechanics } from "./houserule-skill-training.js";
import { HealingSkillIntegration } from "./houserule-healing-skill-integration.js";
import { ConditionTrackMechanics } from "./houserule-condition-track.js";

const NS = "foundryvtt-swse";

export class ActorSheetEnhancements {
  /**
   * Initialize actor sheet enhancement hooks
   */
  static initialize() {
    // Hook into actor sheet rendering to add house rule information
    Hooks.on("renderApplicationV2", (app) => {
      const html = app.element;
      const data = {};
      this.enhanceActorSheet(app, html, data);
    });

    SWSELogger.debug("Actor sheet enhancements initialized");
  }

  /**
   * Enhance actor sheet with house rule information
   */
  static enhanceActorSheet(app, html, data) {
    const actor = app.actor;
    if (!actor || actor.type !== "character") return;

    this._addTrainingPointsDisplay(app, html, actor);
    this._addHealingCooldownDisplay(app, html, actor);
    this._addConditionTrackDisplay(app, html, actor);
  }

  /**
   * Add training points display to skills tab
   * @private
   */
  static _addTrainingPointsDisplay(app, html, actor) {
    if (!game.settings.get(NS, "skillTrainingEnabled")) return;

    const trainingPoints = SkillTrainingMechanics.getTrainingPoints(actor);
    const level = actor.system?.details?.level || 1;
    const maxPerSkill = game.settings.get(NS, "skillTrainingCap");

    // Find or create house rules section in skills tab
    const root = html?.[0] ?? html;
      const skillsTab = root?.querySelector?.("[data-tab='skills']");
    if (!skillsTab) return;

    // Create training points display
    const trainingDisplay = `
      <div class="house-rules-section training-section">
        <h3>Training Points</h3>
        <div class="training-info">
          <p class="training-available">
            <strong>Available:</strong> <span class="training-value">${trainingPoints}</span> points
          </p>
          <p class="training-cap-info">
            ${this._getTrainingCapInfo(maxPerSkill, level)}
          </p>
          <div class="skill-training-list">
            ${this._getSkillTrainingList(actor)}
          </div>
        </div>
      </div>
    `;

    skillsTab.append(trainingDisplay);
  }

  /**
   * Get training cap information text
   * @private
   */
  static _getTrainingCapInfo(capType, level) {
    switch (capType) {
      case "none":
        return "<strong>Cap:</strong> Unlimited";
      case "classSkillOnly":
        return "<strong>Cap:</strong> Class skills only";
      case "maxLevel":
        return `<strong>Cap:</strong> Max ${level} points per skill`;
      default:
        return "<strong>Cap:</strong> Unlimited";
    }
  }

  /**
   * Get list of skills with training points spent
   * @private
   */
  static _getSkillTrainingList(actor) {
    const skillTraining = actor.getFlag(NS, "skillTraining") || {};
    const entries = Object.entries(skillTraining).filter(([, points]) => points > 0);

    if (entries.length === 0) {
      return "<p class='no-training'>No training points spent yet</p>";
    }

    return entries
      .map(([skillKey, points]) => {
        const bonus = SkillTrainingMechanics.getTrainingBonus(actor, skillKey);
        return `
          <div class="training-item">
            <span class="skill-name">${this._formatSkillName(skillKey)}</span>
            <span class="training-details">${points} points = +${bonus}</span>
          </div>
        `;
      })
      .join("");
  }

  /**
   * Add healing cooldown display to bio tab
   * @private
   */
  static _addHealingCooldownDisplay(app, html, actor) {
    if (!game.settings.get(NS, "healingSkillEnabled")) return;

    const bioTab = root.querySelector("[data-tab='bio']");
    if (bioTab.length === 0) return;

    const cooldowns = HealingSkillIntegration.getHealingCooldownInfo(actor);

    const cooldownDisplay = `
      <div class="house-rules-section healing-cooldown-section">
        <h3>Healing Cooldowns</h3>
        <div class="cooldown-info">
          ${cooldowns
            .map(
              cooldown => `
            <p class="cooldown-item ${cooldown.ready ? "ready" : "cooling"}">
              <strong>${cooldown.type}:</strong>
              ${cooldown.ready ? '<span class="ready-badge">READY</span>' : `<span class="cooldown-time">${HealingSkillIntegration.formatTimeRemaining(cooldown.timeRemaining)}</span>`}
            </p>
          `
            )
            .join("")}
        </div>
      </div>
    `;

    bioTab.append(cooldownDisplay);
  }

  /**
   * Add condition track display to bio tab
   * @private
   */
  static _addConditionTrackDisplay(app, html, actor) {
    if (!game.settings.get(NS, "conditionTrackEnabled")) return;

    const bioTab = root.querySelector("[data-tab='bio']");
    if (bioTab.length === 0) return;

    const trackLevel = ConditionTrackMechanics.getConditionTrackLevel(actor);
    const variant = game.settings.get(NS, "conditionTrackVariant");
    const description = ConditionTrackMechanics.getTrackLevelDescription(trackLevel, variant);
    const penalties = ConditionTrackMechanics.getTrackPenalties(actor);

    const trackDisplay = `
      <div class="house-rules-section condition-track-section">
        <h3>Condition Track</h3>
        <div class="condition-info">
          <p class="track-level">
            <strong>Status:</strong> <span class="track-description">${description}</span> (Level ${trackLevel})
          </p>
          ${trackLevel > 0
            ? `
            <div class="track-penalties">
              <p><strong>Current Penalties:</strong></p>
              <ul>
                ${penalties.attack < 0 ? `<li>Attack: ${penalties.attack}</li>` : ""}
                ${penalties.ac > 0 ? `<li>AC: +${penalties.ac} (worse defense)</li>` : ""}
                ${penalties.ability < 0 ? `<li>Ability Checks: ${penalties.ability}</li>` : ""}
                ${penalties.movement < 0 ? `<li>Movement: ${penalties.movement} ft</li>` : ""}
              </ul>
            </div>
          `
            : "<p class='no-track'>No condition track penalties</p>"}
        </div>
      </div>
    `;

    bioTab.append(trackDisplay);
  }

  /**
   * Format skill key to display name
   * @private
   */
  static _formatSkillName(skillKey) {
    const skillNames = {
      acrobatics: "Acrobatics",
      athletics: "Athletics",
      deception: "Deception",
      gunnery: "Gunnery",
      initiative: "Initiative",
      insight: "Insight",
      intimidate: "Intimidate",
      knowledge: "Knowledge",
      perception: "Perception",
      persuasion: "Persuasion",
      piloting: "Piloting",
      profession: "Profession",
      stealth: "Stealth",
      survival: "Survival",
      treatInjury: "Treat Injury",
      useComputer: "Use Computer",
      useForce: "Use the Force",
      vibroWeapon: "Vibro Weapon"
    };

    return skillNames[skillKey] || skillKey;
  }
}

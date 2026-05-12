/**
 * Miscellaneous UI activation for SWSEV2CharacterSheet
 *
 * Handles languages, rest, DSP, force points, condition tracking, and skill uses
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";
import { MentorChatDialog } from "/systems/foundryvtt-swse/scripts/mentor/mentor-chat-dialog.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";

/**
 * Open mentor conversation dialog
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 */
function openMentorConversation(sheet) {
  const actor = sheet.actor;
  new MentorChatDialog(actor).render(true);
}

/**
 * Activate miscellaneous UI listeners
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {HTMLElement} html - The rendered sheet element
 * @param {AbortSignal} signal - Abort signal for cleanup
 */
export function activateMiscUI(sheet, html, { signal } = {}) {

  // Temporary defense resource actions, such as Instinctive Defense.
  html.querySelectorAll('[data-action="apply-temp-defense"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        const result = await MetaResourceFeatResolver.applyTemporaryDefenseRule(sheet.actor, button.dataset.ruleId || null);
        if (result?.success) ui?.notifications?.info?.(`${result.rule?.sourceName ?? 'Temporary defense'} applied.`);
        else ui?.notifications?.warn?.(result?.reason ?? 'Temporary defense could not be applied.');
      } catch (err) {
        ui?.notifications?.error?.(`Temporary defense failed: ${err.message}`);
      }
    }, { signal });
  });

  // Add language button
  html.querySelectorAll('[data-action="add-language"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      // Open a dialog for language selection
      const languages = sheet.actor.system?.languages ?? [];
      const newLang = prompt("Enter language name:");
      if (newLang) {
        const plan = {
          update: {
            "system.languages": [...languages, newLang]
          }
        };
        try {
          await ActorEngine.apply(sheet.actor, plan);
        } catch (err) {
          // console.error("Failed to add language:", err);
          ui?.notifications?.error?.(`Failed to add language: ${err.message}`);
        }
      }
    }, { signal });
  });

  // Remove language button
  html.querySelectorAll('[data-action="remove-language"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const langName = button.dataset.language;
      if (!langName) return;

      const languages = (sheet.actor.system?.languages ?? []).filter(l => l !== langName);
      const plan = {
        update: {
          "system.languages": languages
        }
      };

      try {
        await ActorEngine.apply(sheet.actor, plan);
      } catch (err) {
        // console.error("Failed to remove language:", err);
        ui?.notifications?.error?.(`Failed to remove language: ${err.message}`);
      }
    }, { signal });
  });

  // Rest / Second Wind button
  html.querySelectorAll('[data-action="rest-second-wind"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        await ActorEngine.resetSecondWind(sheet.actor);
        ui?.notifications?.info?.("Second Wind restored!");
      } catch (err) {
        // console.error("Rest failed:", err);
        ui?.notifications?.error?.(`Rest failed: ${err.message}`);
      }
    }, { signal });
  });

  // Use Second Wind button
  html.querySelectorAll('[data-action="use-second-wind"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      try {
        const result = await ActorEngine.applySecondWind(sheet.actor);
        if (result?.success === false) {
          ui?.notifications?.warn?.(result.reason || "No Second Wind uses remaining");
          return;
        }
        ui?.notifications?.info?.(`Regained ${result?.healed ?? 0} HP!`);
      } catch (err) {
        // console.error("Second Wind use failed:", err);
        ui?.notifications?.error?.(`Second Wind use failed: ${err.message}`);
      }
    }, { signal });
  });

  // Gain Force Point button
  html.querySelectorAll('[data-action="gain-force-point"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const current = sheet.actor.system?.forcePoints?.value ?? 0;
      const max = sheet.actor.system?.forcePoints?.max ?? 0;
      const newValue = Math.min(current + 1, max);

      const plan = {
        update: {
          "system.forcePoints.value": newValue
        }
      };

      try {
        await ActorEngine.apply(sheet.actor, plan);
        ui?.notifications?.info?.("Force Point restored!");
      } catch (err) {
        // console.error("Force Point restore failed:", err);
        ui?.notifications?.error?.(`Force Point restore failed: ${err.message}`);
      }
    }, { signal });
  });

  // Spend Force Point button
  html.querySelectorAll('[data-action="spend-force-point"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const current = sheet.actor.system?.forcePoints?.value ?? 0;
      const newValue = Math.max(0, current - 1);

      const plan = {
        update: {
          "system.forcePoints.value": newValue
        }
      };

      try {
        await ActorEngine.apply(sheet.actor, plan);
        ui?.notifications?.info?.("Force Point spent!");
      } catch (err) {
        // console.error("Force Point spend failed:", err);
        ui?.notifications?.error?.(`Force Point spend failed: ${err.message}`);
      }
    }, { signal });
  });

  // Set Condition Step button (delegated)
  html.addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="set-condition-step"]');
    if (!button) return;

    event.preventDefault();
    const step = parseInt(button.dataset.step, 10);
    if (isNaN(step) || step < 0 || step > 5) return;

    const plan = {
      update: {
        "system.conditionTrack.current": step
      }
    };

    try {
      await ActorEngine.apply(sheet.actor, plan);
      ui?.notifications?.info?.("Condition updated!");
    } catch (err) {
      // console.error("Condition update failed:", err);
      ui?.notifications?.error?.(`Condition update failed: ${err.message}`);
    }
  }, { signal, capture: false });

  // Set dark side score button
  html.querySelectorAll('[data-action="set-dark-side-score"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const currentDSP = DSPEngine.getValue(sheet.actor);
      const newValue = prompt(`Current Dark Side Points: ${currentDSP}\n\nEnter new value:`, String(currentDSP));

      if (newValue !== null) {
        const value = Math.max(0, Math.min(Number(newValue) || 0, DSPEngine.getMax(sheet.actor)));
        const plan = {
          update: {
            "system.darkSide.value": value
          }
        };

        try {
          await ActorEngine.apply(sheet.actor, plan);
        } catch (err) {
          // console.error("Failed to set DSP:", err);
          ui?.notifications?.error?.(`Failed to set DSP: ${err.message}`);
        }
      }
    }, { signal });
  });

  // Use extra skill button
  html.querySelectorAll('[data-action="execute-extra-skill-use"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const skillKey = button.dataset.skill;
      const useKey = button.dataset.useKey || button.dataset.key || button.dataset.use;
      const blocked = button.dataset.blocked === "true";
      const actionType = button.dataset.actionType || null;
      const sourceType = button.dataset.sourceType || null;
      const sourceLabel = button.dataset.sourceLabel || null;

      if (!skillKey) return;
      if (blocked) {
        ui?.notifications?.warn?.("This skill use is currently blocked.");
        return;
      }

      try {
        await sheet._runCanonicalExtraSkillUse(skillKey, useKey, {
          source: "skills-tab",
          actionType,
          sourceType,
          sourceLabel
        });
      } catch (err) {
        // console.error("Failed to use extra skill:", err);
        ui?.notifications?.error?.(`Failed to use extra skill: ${err.message}`);
      }
    }, { signal });
  });
}

// Export helper function for external use
export { openMentorConversation };

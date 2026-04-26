import { LightsaberConstructionApp } from "/systems/foundryvtt-swse/scripts/applications/lightsaber/lightsaber-construction-app.js";
import { LightsaberConstructionEngine } from "/systems/foundryvtt-swse/scripts/engine/crafting/lightsaber-construction-engine.js";

export function isLightsaberDocument(item) {
  return LightsaberConstructionEngine.isLightsaberItem(item);
}

export function openLightsaberInterface(actor, item = null, options = {}) {
  if (!actor) return;
  if (item && isLightsaberDocument(item)) {
    new LightsaberConstructionApp(actor, item, { mode: "edit", ...options }).render(true);
    return;
  }
  const eligibility = LightsaberConstructionEngine.getEligibility(actor);
  if (!eligibility?.eligible) {
    ui.notifications.warn('Lightsaber construction is not yet available for this character.');
    return;
  }
  new LightsaberConstructionApp(actor, { mode: "construct", ...options }).render(true);
}

export async function promptLightsaberConstructionIfEligible(actor, { newLevel = null, source = "levelup" } = {}) {
  if (!actor) return false;

  const eligibility = LightsaberConstructionEngine.getEligibility(actor);
  if (!eligibility?.eligible) return false;
  if (LightsaberConstructionEngine.hasSelfBuiltLightsaber(actor)) return false;
  if (newLevel !== null && Number(newLevel) !== 7) return false;

  const alreadyPrompted = actor.getFlag?.("foundryvtt-swse", "lightsaberConstructionPrompted") === true;
  if (source === "levelup" && alreadyPrompted) return false;

  return new Promise(resolve => {
    new Dialog({
      title: "Lightsaber Construction Available",
      content: `
        <div class="swse-ui-panel" style="padding: 0.75rem; line-height: 1.6;">
          <p><strong>The Force calls.</strong> You now meet the requirements to construct your own lightsaber.</p>
          <p>You may proceed now inside the progression flow, or decline and construct it later from your character sheet.</p>
        </div>
      `,
      buttons: {
        proceed: {
          label: "Proceed Now",
          callback: async () => {
            await actor.setFlag("foundryvtt-swse", "lightsaberConstructionPrompted", true);
            await actor.setFlag("foundryvtt-swse", "lightsaberConstructionDeferred", false);
            openLightsaberInterface(actor, null, { mode: "construct", openedFromPrompt: true });
            resolve(true);
          }
        },
        later: {
          label: "Later",
          callback: async () => {
            await actor.setFlag("foundryvtt-swse", "lightsaberConstructionPrompted", true);
            await actor.setFlag("foundryvtt-swse", "lightsaberConstructionDeferred", true);
            ui.notifications.info("Lightsaber construction remains available from your character sheet.");
            resolve(false);
          }
        }
      },
      default: "proceed",
      close: () => resolve(false)
    }).render(true);
  });
}

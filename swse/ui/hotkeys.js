/**
 * SWSE Hotkey Bindings
 * AUTO-GENERATED
 */

import { SWSECombatActionBrowser } from "./combat-action-browser.js";

Hooks.on("init", () => {
  game.keybindings.register("swse", "openCombatBrowser", {
    name: "Open Combat Action Browser",
    editable: [{ key: "KeyC" }],
    onDown: () => {
      const actor = canvas.tokens.controlled[0]?.actor;
      if (!actor) return ui.notifications.warn("Select a token first.");
      new SWSECombatActionBrowser(actor).render(true);
    }
  });

  game.keybindings.register("swse", "attemptGrapple", {
    name: "Attempt Grapple",
    editable: [{ key: "KeyG" }],
    onDown: async () => {
      const actor = canvas.tokens.controlled[0]?.actor;
      const target = Array.from(game.user.targets)[0]?.actor;

      if (!actor || !target) {
        return ui.notifications.warn("Select a target and token first.");
      }

      if (!CONFIG.SWSE.Grapple) {
        return ui.notifications.warn("Grapple subsystem not loaded.");
      }

      await CONFIG.SWSE.Grapple.attemptGrab(actor, target);
    }
  });
});

/* ==========================================================================
   SHEET STABILIZER
   Ensures templates are ready before sheet instantiation
   Prevents stale _sheet = null cache from persisting
   ========================================================================== */

let templatesPrepared = false;

export function initializeSheetStabilizer({
  preloadTemplates,
  registerPartials
}) {

  Hooks.once("init", () => {
    // Register partials early
    if (typeof registerPartials === "function") {
      registerPartials();
    }

    // Preload templates early (do not await inside init)
    if (typeof preloadTemplates === "function") {
      preloadTemplates();
    }

    templatesPrepared = true;
  });

  Hooks.once("ready", () => {

    // Clear stale sheet cache once after full boot
    for (const actor of game.actors) {
      if (actor._sheet === null) {
        actor._sheet = undefined;
      }
    }

  });
}

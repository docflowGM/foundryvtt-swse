/**
 * Icon Assignment Fix for SWSE (v13-idiomatic)
 *
 * In Foundry v13, core tools define their own icons inline — no CSS var patching needed.
 * This module only patches SWSE custom scene controls that are missing icons.
 */

/**
 * Patch icon CSS vars only for SWSE custom controls that lack an icon element.
 */
function assignControlIcons() {
  try {
    const buttons = document.querySelectorAll("button.ui-control.icon");

    let inspected = 0;
    let patched = 0;

    for (const btn of buttons) {
      inspected++;

      // If the button already has an icon element, skip — v13 handles these
      if (btn.querySelector("i, svg")) continue;

      const tool = btn.dataset.tool;
      if (!tool) continue;

      // Only attempt SWSE custom tools
      if (!tool.startsWith("swse-")) continue;

      const iconPath = CONFIG.controlIcons?.[tool];
      if (!iconPath) {
        console.warn(`SWSE | Missing icon for custom tool "${tool}"`);
        continue;
      }

      btn.style.setProperty("--control-icon", `url("${iconPath}")`);
      patched++;
    }

    if (patched > 0) {
      console.log(`SWSE | IconFix | Patched ${patched} custom controls`);
    }
  } catch (err) {
    console.error("SWSE | IconFix | assignControlIcons failed", err);
  }
}

/**
 * Hook into scene control rendering
 */
Hooks.on("renderSceneControls", () => {
  setTimeout(() => assignControlIcons(), 100);
});

/**
 * Fallback on canvas ready
 */
Hooks.on("canvasReady", () => {
  setTimeout(() => assignControlIcons(), 100);
});

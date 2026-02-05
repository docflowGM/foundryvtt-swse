/**
 * Icon Assignment Fix for SWSE
 *
 * Foundry v13 expects scene control buttons to have inline --control-icon CSS variables,
 * but the assignment JS may not run or may fail. This hook manually assigns them.
 *
 * When scene controls are rendered, we iterate through all button.ui-control.icon elements
 * and assign --control-icon from CONFIG.controlIcons using the button's data-tool attribute.
 */

/**
 * Assign --control-icon CSS variables to all control buttons
 * Called from hooks when controls are rendered
 */
function assignControlIcons() {
  const buttons = document.querySelectorAll("button.ui-control.icon");

  if (buttons.length === 0) {
    console.warn("SWSE Icon Fix: No .ui-control.icon buttons found");
    return;
  }

  let assigned = 0;
  let failed = 0;

  for (const btn of buttons) {
    const tool = btn.dataset.tool;
    const iconPath = CONFIG.controlIcons?.[tool];

    if (!iconPath) {
      console.warn(`SWSE Icon Fix: No icon path found for tool "${tool}"`);
      failed++;
      continue;
    }

    // Assign the CSS variable
    btn.style.setProperty("--control-icon", `url("${iconPath}")`);
    assigned++;

    // Log on first few for diagnostics
    if (assigned <= 3) {
      console.log(`✅ Icon assigned: ${tool} → ${iconPath}`);
    }
  }

  console.log(`SWSE Icon Fix: Assigned ${assigned}/${buttons.length} icons`);

  if (failed > 0) {
    console.warn(`SWSE Icon Fix: Failed to assign ${failed} icons (missing from CONFIG.controlIcons)`);
  }
}

/**
 * Hook into scene control rendering
 */
Hooks.on("renderSceneControls", () => {
  console.log("SWSE: renderSceneControls hook fired, assigning icons...");
  setTimeout(() => assignControlIcons(), 100); // Small delay to ensure DOM is settled
});

/**
 * Also hook into canvasReady as a fallback
 */
Hooks.on("canvasReady", () => {
  console.log("SWSE: canvasReady hook fired, assigning icons...");
  setTimeout(() => assignControlIcons(), 100);
});

/**
 * Hook into getSceneControlButtons to inspect what's being passed
 */
Hooks.on("getSceneControlButtons", (controls) => {
  if (game.settings.get("core", "devMode")) {
    console.log("SWSE Icon Fix: getSceneControlButtons hook", {
      controlGroups: controls.length,
      sample: controls.slice(0, 2).map(g => ({
        name: g.name,
        tools: g.tools?.length || 0,
        hasIcons: g.tools?.every(t => t.icon) || false
      }))
    });
  }
});

/**
 * If dev mode is enabled, expose the function globally for manual testing
 */
if (game.settings.get("core", "devMode")) {
  window.SWSE_AssignControlIcons = assignControlIcons;
  console.log("SWSE Icon Fix: Dev mode enabled. Manual assignment available at window.SWSE_AssignControlIcons()");
}

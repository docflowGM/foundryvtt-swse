/**
 * Render Guard Utility
 * Prevents ApplicationV2 windows from rendering without an active scene
 * Solves offsetWidth null crashes during initialization
 */

export function canRenderUI() {
  return game?.ready && game?.scenes?.active;
}

export function safeRender(app, force = true) {
  if (!canRenderUI()) {
    console.warn("SWSE | Prevented UI render (no active scene).");
    return false;
  }

  try {
    app.render(force);
    return true;
  } catch (err) {
    console.error("SWSE | Safe render failed:", err);
    return false;
  }
}

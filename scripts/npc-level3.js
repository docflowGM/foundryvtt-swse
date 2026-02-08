// scripts/npc-level3.js
/**
 * Legacy NPC sheet cosmetics (AppV2 safe)
 * - collapsible npc blocks
 * - threat ring auto flag
 */
Hooks.on("ready", () => {
  Hooks.on("renderApplicationV2", (app) => {
    const actor = app?.actor ?? app?.document;
    if (!actor || actor.type !== "npc") return;

    const root = app.element;
    if (!root) return;

    // Collapse logic
    root.querySelectorAll?.(".npc-block-header")?.forEach((hdr) => {
      hdr.addEventListener("click", (ev) => {
        const block = ev.currentTarget.closest(".npc-block");
        block?.classList?.toggle("open");
      });
    });

    // Threat ring auto-logic (only if unset)
    const manual = actor.getFlag("swse", "threatLevel");
    if (manual) return;

    const role = actor.system?.role || actor.system?.type;
    const cr = Number(actor.system?.challenge || 1);

    let level = "standard";

    if (role) {
      if (role === "minion") level = "minion";
      else if (role === "elite") level = "elite";
      else if (role === "boss") level = "boss";
    } else {
      if (cr <= 3) level = "minion";
      else if (cr <= 8) level = "standard";
      else if (cr <= 14) level = "elite";
      else level = "boss";
    }

    actor.setFlag("swse", "threatLevel", level);
  });
});

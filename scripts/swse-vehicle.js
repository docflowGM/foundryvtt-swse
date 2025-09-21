// ─────────────────────────────────────────────────────────────
// Ship Template Definitions
// ─────────────────────────────────────────────────────────────
export const SHIP_TEMPLATES = {
  starfighter: {
    label: "Starfighter",
    hull: 6,
    shields: 4,
    handling: 2,
    notes: "Fast, agile; ideal for dogfights"
  },
  freighter: {
    label: "Freighter",
    hull: 8,
    shields: 6,
    handling: 1,
    notes: "Heavy cargo runs, slow maneuvers"
  },
  capital: {
    label: "Capital Ship",
    hull: 12,
    shields: 10,
    handling: 0,
    notes: "Flagship-scale; requires squad support"
  },
  shuttle: {
    label: "Shuttle",
    hull: 5,
    shields: 3,
    handling: 1,
    notes: "Short-haul transport, lightly armed"
  },
  transport: {
    label: "Transport",
    hull: 7,
    shields: 5,
    handling: 1,
    notes: "Medium cargo capacity, balanced stats"
  },
  corvette: {
    label: "Corvette",
    hull: 9,
    shields: 7,
    handling: 1,
    notes: "Escort duties, decent speed and firepower"
  }
};

// ─────────────────────────────────────────────────────────────
// Vehicle Sheet Logic
// ─────────────────────────────────────────────────────────────
Hooks.on("renderActorSheet", (app, html, data) => {
  if (app.actor?.type !== "vehicle") return;

  // Add ship template to actor
  html.find("#add-ship-template").off("click").on("click", async () => {
    const dropdown = html.find("#ship-template-dropdown")[0];
    const selected = dropdown.options[dropdown.selectedIndex];
    const type = selected.value;

    if (!type || !SHIP_TEMPLATES[type]) return;

    const entry = { type, ...SHIP_TEMPLATES[type] };
    const templates = duplicate(app.actor.system.shipTemplates || []);
    templates.push(entry);

    await app.actor.update({ "system.shipTemplates": templates });
  });

  // Remove ship template from actor
  html.find(".remove-ship-template").off("click").on("click", async (ev) => {
    const index = Number(ev.currentTarget.dataset.index);
    const templates = duplicate(app.actor.system.shipTemplates || []);
    templates.splice(index, 1);

    await app.actor.update({ "system.shipTemplates": templates });
  });
});

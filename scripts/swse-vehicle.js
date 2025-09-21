// systems/swse/scripts/swse-vehicle.js
export const SHIP_TEMPLATES = {
  starfighter: { label: "Starfighter", hull: 6, shields: 4, handling: 2,
                 notes: "Fast, agile; dogfights" },
  freighter:   { label: "Freighter",   hull: 8, shields: 6, handling: 1,
                 notes: "Cargo runs; slow" },
  capital:     { label: "Capital Ship",hull:12, shields:10, handling:0,
                 notes: "Flagship-scale" },
  shuttle:     { label: "Shuttle",     hull: 5, shields: 3, handling:1,
                 notes: "Light transport" },
  transport:   { label: "Transport",   hull: 7, shields: 5, handling:1,
                 notes: "Medium cargo" },
  corvette:    { label: "Corvette",    hull: 9, shields: 7, handling:1,
                 notes: "Escort duties" }
};

Hooks.on("renderActorSheet", (app, html) => {
  if (app.actor.type !== "vehicle") return;

  // Add
  html.find(".add-ship").off("click").on("click", async () => {
    const sel = html.find("#ship-template")[0];
    const type = sel.value;
    if (!type || !SHIP_TEMPLATES[type]) return;
    const entry = { type, ...SHIP_TEMPLATES[type] };
    const list  = duplicate(app.actor.system.shipTemplates || []);
    list.push(entry);
    await app.actor.update({ "system.shipTemplates": list });
  });

  // Remove
  html.find(".remove-ship").off("click").on("click", async ev => {
    const idx = Number(ev.currentTarget.dataset.index);
    const list = duplicate(app.actor.system.shipTemplates || []);
    list.splice(idx, 1);
    await app.actor.update({ "system.shipTemplates": list });
  });
});

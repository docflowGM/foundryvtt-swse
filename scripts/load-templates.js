// systems/swse/scripts/load-templates.js
// Handles loading vehicle JSON templates from the SWSE system itself

Hooks.once("init", async () => {
  try {
    const response = await fetch(`systems/swse/data/vehicles.json`);
    if (!response.ok) throw new Error(`Failed to load vehicles.json (status ${response.status})`);
    game.swseVehicles = { templates: await response.json() };
    console.log(`SWSE | Loaded ${game.swseVehicles.templates.length} vehicle templates.`);
  } catch (err) {
    console.error("SWSE | Could not load vehicle templates:", err);
    game.swseVehicles = { templates: [] };
  }
});

Hooks.on("renderSWSEVehicleSheet", (app, html, data) => {
  if (!game.swseVehicles?.templates?.length) return; // No templates loaded

  // Build the <select>
  const select = $(`<select style="margin-left:8px">
    <option value="">Load Template…</option>
  </select>`);
  for (let tmpl of game.swseVehicles.templates) {
    select.append(`<option value="${tmpl.name}">${tmpl.name}</option>`);
  }

  // Insert into the sheet header (adjust selector if needed)
  html.find(".sheet-header .sheet-title").after(select);

  // Handle selection
  select.change(async ev => {
    const name = ev.target.value;
    if (!name) return;
    const tmpl = game.swseVehicles.templates.find(t => t.name === name);
    if (!tmpl) return ui.notifications.error("Template not found");

    // Confirm overwrite
    if (!await Dialog.confirm({
      title: "Load Vehicle Template",
      content: `<p>Load <strong>${tmpl.name}</strong>? This will overwrite current stats.</p>`
    })) return;

    // Build update payload
    const updateData = {
      "system.speed":             tmpl.speed,
      "system.fighting_space":    tmpl.fighting_space,
      "system.base_attack_bonus": tmpl.base_attack_bonus,
      "system.grapple":           tmpl.grapple,
      "system.attack_options":    tmpl.attack_options,
      "system.special_actions":   tmpl.special_actions,
      "system.ability_scores":    tmpl.ability_scores,
      "system.skills":            tmpl.skills,
      "system.crew_size":         tmpl.crew_size,
      "system.passengers":        tmpl.passengers,
      "system.cargo":             tmpl.cargo,
      "system.consumables":       tmpl.consumables,
      "system.carried_craft":     tmpl.carried_craft,
      "system.hyperdrive_class":  tmpl.hyperdrive_class,
      "system.backup_class":      tmpl.backup_class,
      "system.cost":              tmpl.cost
    };

    await app.object.update(updateData);
    ui.notifications.info(`Loaded vehicle template: ${tmpl.name}`);

    // Reset dropdown
    select.val("");
  });
});

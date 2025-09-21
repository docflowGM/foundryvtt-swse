// load-templates.js
// Allows picking a vehicle template (from vehicles.json) to populate a Vehicle actor sheet.

Hooks.once("init", async () => {
  // Preload vehicles.json into game.swseVehicles.templates
  const response = await fetch(`modules/${game.modules.get("swse-vehicles").path}/vehicles.json`);
  game.swseVehicles = { templates: await response.json() };
});

Hooks.on("renderVehicleSheet", (app, html, data) => {
  // 1) Build the <select> with all template names
  const select = $(`<select style="margin-left:8px">
    <option value="">Load Template…</option>
  </select>`);
  for (let tmpl of game.swseVehicles.templates) {
    select.append(`<option value="${tmpl.name}">${tmpl.name}</option>`);
  }

  // 2) Insert into the sheet header (adjust the selector to your sheet’s layout)
  html.find(".sheet-header .sheet-title").after(select);

  // 3) On change, find the template and apply it
  select.change(async ev => {
    const name = ev.target.value;
    if (!name) return;
    const tmpl = game.swseVehicles.templates.find(t => t.name === name);
    if (!tmpl) return ui.notifications.error("Template not found");

    // Ask before overwriting
    if (!await Dialog.confirm({
      title: "Load Vehicle Template",
      content: `<p>Load <strong>${tmpl.name}</strong>? This will overwrite current stats.</p>`
    })) return;

    // Build the update payload
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

    // Perform the update
    await app.object.update(updateData);
    ui.notifications.info(`Loaded vehicle template: ${tmpl.name}`);
    // Reset dropdown
    select.val("");
  });
});

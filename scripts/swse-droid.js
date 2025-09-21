// ─────────────────────────────────────────────────────────────
// Droid Template Definitions
// ─────────────────────────────────────────────────────────────
export const DROID_TEMPLATES = {
  astromech: {
    label: "Astromech Droid",
    subtype: "2nd-degree",
    bonuses: "+2 Int, –2 Cha",
    notes: "Repairs, navigation, starship interface"
  },
  protocol: {
    label: "Protocol Droid",
    subtype: "3rd-degree",
    bonuses: "+2 Cha, –2 Str",
    notes: "Language fluency, etiquette, diplomacy"
  },
  battle: {
    label: "Battle Droid",
    subtype: "4th-degree",
    bonuses: "+2 Str, –2 Cha",
    notes: "Combat-oriented, weapon proficiencies"
  },
  medical: {
    label: "Medical Droid",
    subtype: "2nd-degree",
    bonuses: "+2 Wis, –2 Cha",
    notes: "Treat Injury, diagnostics"
  },
  assassin: {
    label: "Assassin Droid",
    subtype: "4th-degree",
    bonuses: "+2 Dex, –2 Wis",
    notes: "Stealth, precision targeting"
  },
  labor: {
    label: "Labor Droid",
    subtype: "5th-degree",
    bonuses: "+2 Str, –2 Int",
    notes: "Heavy lifting, industrial tasks"
  }
};

// ─────────────────────────────────────────────────────────────
// Droid Sheet Logic
// ─────────────────────────────────────────────────────────────
Hooks.on("renderActorSheet", (app, html, data) => {
  if (app.actor?.system?.species !== "droid") return;

  // Add droid template to actor
  html.find("#add-droid-template").off("click").on("click", async () => {
    const dropdown = html.find("#droid-template-dropdown")[0];
    const selected = dropdown.options[dropdown.selectedIndex];
    const type = selected.value;

    if (!type || !DROID_TEMPLATES[type]) return;

    const entry = { type, ...DROID_TEMPLATES[type] };
    const templates = duplicate(app.actor.system.droidTemplates || []);
    templates.push(entry);

    await app.actor.update({ "system.droidTemplates": templates });
  });

  // Remove droid template from actor
  html.find(".remove-droid-template").off("click").on("click", async (ev) => {
    const index = Number(ev.currentTarget.dataset.index);
    const templates = duplicate(app.actor.system.droidTemplates || []);
    templates.splice(index, 1);

    await app.actor.update({ "system.droidTemplates": templates });
  });
});

// systems/swse/scripts/swse-droid.js
export const DROID_TEMPLATES = {
  astromech: { label: "Astromech Droid", subtype: "2nd-degree",
               bonuses: "+2 Int, –2 Cha", notes: "Repairs, nav, starship" },
  protocol:  { label: "Protocol Droid",  subtype: "3rd-degree",
               bonuses: "+2 Cha, –2 Str", notes: "Languages, etiquette" },
  battle:    { label: "Battle Droid",    subtype: "4th-degree",
               bonuses: "+2 Str, –2 Cha", notes: "Weapons, tactics" },
  medical:   { label: "Medical Droid",   subtype: "2nd-degree",
               bonuses: "+2 Wis, –2 Cha", notes: "Treat Injury, diag" },
  assassin:  { label: "Assassin Droid",  subtype: "4th-degree",
               bonuses: "+2 Dex, –2 Wis", notes: "Stealth, precision" },
  labor:     { label: "Labor Droid",     subtype: "5th-degree",
               bonuses: "+2 Str, –2 Int", notes: "Heavy-lifting" }
};

Hooks.on("renderActorSheet", (app, html) => {
  if (app.actor.system.species !== "droid") return;

  html.find("#add-droid-template").off("click").on("click", async () => {
    const sel = html.find("#droid-template-dropdown")[0];
    const type = sel.value;
    if (!type || !DROID_TEMPLATES[type]) return;
    const entry = { type, ...DROID_TEMPLATES[type] };
    const list  = duplicate(app.actor.system.droidTemplates || []);
    list.push(entry);
    await app.actor.update({ "system.droidTemplates": list });
  });

  html.find(".remove-droid-template").off("click").on("click", async ev => {
    const idx = Number(ev.currentTarget.dataset.index);
    const list = duplicate(app.actor.system.droidTemplates || []);
    list.splice(idx, 1);
    await app.actor.update({ "system.droidTemplates": list });
  });
});

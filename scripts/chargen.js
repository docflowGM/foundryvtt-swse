// systems/swse/scripts/chargen.js

/**
 * SWSE Character Generator
 * Handles the creation of new characters, droids, NPCs, and vehicles.
 */

Hooks.on("renderActorDirectory", (app, html) => {
  // Add "Create SWSE Character" button
  const button = $(
    `<button class="swse-chargen"><i class="fas fa-user-plus"></i> Create SWSE Character</button>`
  );
  html.find(".directory-footer").append(button);

  button.on("click", () => {
    new SWSECharGenForm().render(true);
  });
});

class SWSECharGenForm extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "swse-chargen-form",
      classes: ["swse", "chargen"],
      title: "SWSE Character Generator",
      template: "systems/swse/templates/apps/chargen.hbs",
      width: 400,
      height: "auto",
    });
  }

  getData() {
    return {
      actorTypes: [
        { value: "character", label: "Heroic Character" },
        { value: "droid", label: "Droid" },
        { value: "npc", label: "Non-Heroic NPC" },
        { value: "vehicle", label: "Vehicle" }
      ]
    };
  }

  async _updateObject(event, formData) {
    const name = formData.name || "New Actor";
    const type = formData.type || "character"; // ✅ Always define a type

    // Ensure system data is present (even empty)
    const actorData = {
      name,
      type,
      system: {}
    };

    console.log("[SWSE] Creating new actor:", actorData);

    try {
      const actor = await Actor.create(actorData);
      if (actor) {
        ui.notifications.info(`Created new ${type}: ${actor.name}`);
        actor.sheet.render(true);
      }
    } catch (err) {
      console.error("[SWSE] Failed to create actor:", err);
      ui.notifications.error("Failed to create actor. Check console for details.");
    }
  }
}


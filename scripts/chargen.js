// systems/swse/scripts/chargen.js

/**
 * Character Generator Dialog
 * Provides a UI to create new Actors for the SWSE system.
 */
export class SWSECharGen {
  static async show() {
    // Supported actor types
    const actorTypes = [
      { value: "character", label: "Character" },
      { value: "droid", label: "Droid" },
      { value: "vehicle", label: "Vehicle" },
      // { value: "npc", label: "NPC" } // Uncomment once NPC sheet exists
    ];

    // Render the Handlebars template with actorTypes
    const template = await renderTemplate(
      "systems/swse/templates/apps/chargen.hbs",
      { actorTypes }
    );

    return new Promise((resolve) => {
      new Dialog({
        title: "Create Actor",
        content: template,
        buttons: {
          create: {
            icon: "<i class='fas fa-check'></i>",
            label: "Create",
            callback: async (html) => {
              const form = html[0].querySelector("form");
              const formData = new FormData(form);
              const data = Object.fromEntries(formData.entries());

              // Default to "character" if no type selected
              if (!data.type) data.type = "character";

              // Ensure we at least have a name
              if (!data.name || data.name.trim() === "") {
                ui.notifications.error("You must provide a name for the actor.");
                return;
              }

              try {
                // Create actor using correct class
                const actor = await CONFIG.Actor.documentClasses[data.type].create({
                  name: data.name,
                  type: data.type
                  // Don't pass empty `system: {}`; let template.json handle defaults
                }, { renderSheet: true });

                resolve(actor);
              } catch (err) {
                console.error("[SWSE] Error creating actor:", err, data);
                ui.notifications.error("Failed to create actor. Check console for details.");
                resolve(null);
              }
            }
          },
          cancel: {
            icon: "<i class='fas fa-times'></i>",
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "create"
      }).render(true);
    });
  }
}

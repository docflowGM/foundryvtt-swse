// scripts/swse.js

Hooks.once("init", () => {
  console.log("SWSE | Initializing system…");

  // Register a client setting to enable/disable the custom actor creation dialog
  game.settings.register("swse", "overrideActorCreate", {
    name: game.i18n.localize("SWSE.Settings.OverrideActorCreate.Name"),
    hint: game.i18n.localize("SWSE.Settings.OverrideActorCreate.Hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  // Preload Handlebars templates (expand as needed)
  const templatePaths = [
    "templates/actor-sheet.hbs",
    "templates/item-sheet.hbs"
  ];
  loadTemplates(templatePaths);
});

Hooks.once("ready", () => {
  console.log("SWSE | Ready hook");

  if (game.settings.get("swse", "overrideActorCreate")) {
    patchActorDirectoryCreate();
  }
});

/**
 * Patch ActorDirectory's creation method to show a custom dialog
 * Supports Foundry versions pre- and post-v9
 */
function patchActorDirectoryCreate() {
  // Determine method name based on Foundry version
  const methodName = typeof ActorDirectory.prototype._onCreateDocument === "function"
    ? "_onCreateDocument"  // Foundry 9+
    : "_onCreateEntity";   // Foundry 8 or earlier

  const original = ActorDirectory.prototype[methodName];

  ActorDirectory.prototype[methodName] = async function (event) {
    event.preventDefault();

    if (!game.settings.get("swse", "overrideActorCreate")) {
      return original.call(this, event);
    }

    // Prevent multiple dialogs from stacking
    if (ui.dialog && ui.dialog._state === true) return;

    // Localized actor type choices
    const typeChoices = {
      character: game.i18n.localize("SWSE.ActorType.character"),
      droid: game.i18n.localize("SWSE.ActorType.droid"),
      vehicle: game.i18n.localize("SWSE.ActorType.vehicle")
    };

    const options = Object.entries(typeChoices)
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join("");

    // Render the dialog with type select and name input
    new Dialog({
      title: game.i18n.localize("SWSE.Dialog.CreateActor.Title"),
      content: `
        <form>
          <div class="form-group">
            <label>${game.i18n.localize("SWSE.Dialog.CreateActor.Prompt")}</label>
            <select name="type">${options}</select>
          </div>
          <div class="form-group">
            <label>${game.i18n.localize("SWSE.Dialog.CreateActor.Name")}</label>
            <input type="text" name="name" placeholder="${game.i18n.localize("SWSE.Dialog.CreateActor.NamePlaceholder")}" />
          </div>
        </form>
      `,
      buttons: {
        create: {
          icon: "<i class='fas fa-check'></i>",
          label: game.i18n.localize("SWSE.Dialog.CreateActor.Button.Create"),
          callback: async (html) => {
            const type = html.find("select[name='type']").val();
            let name = html.find("input[name='name']").val().trim();
            if (!name) {
              name = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
            }
            try {
              await Actor.create({ name, type });
            } catch (err) {
              ui.notifications.error(`Failed to create actor: ${err.message}`);
              console.error(err);
            }
          }
        },
        cancel: {
          icon: "<i class='fas fa-times'></i>",
          label: game.i18n.localize("SWSE.Dialog.CreateActor.Button.Cancel"),
          callback: () => {}
        }
      },
      default: "create"
    }).render(true);
  };
}

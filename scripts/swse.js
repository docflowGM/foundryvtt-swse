// scripts/swse.js

Hooks.once("init", () => {
  console.log("SWSE | Initializing system…");

  // 1. Register a client setting to enable/disable the custom dialog
  game.settings.register("swse", "overrideActorCreate", {
    name: game.i18n.localize("SWSE.Settings.OverrideActorCreate.Name"),
    hint: game.i18n.localize("SWSE.Settings.OverrideActorCreate.Hint"),
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  // 2. Preload Handlebars templates from your `templates/` folder
  const templatePaths = [
    "templates/actor-sheet.hbs",
    "templates/item-sheet.hbs"
    // add more templates here as you build them
  ];
  loadTemplates(templatePaths);
});

Hooks.once("ready", () => {
  console.log("SWSE | Ready hook");

  // Only patch if the override setting is enabled
  if (game.settings.get("swse", "overrideActorCreate")) {
    patchActorDirectoryCreate();
  }
});

/**
 * Replace the default ActorDirectory _onCreateEntity to show a custom dialog.
 * Falls back to the original method if override is turned off.
 */
function patchActorDirectoryCreate() {
  const original = ActorDirectory.prototype._onCreateEntity;

  ActorDirectory.prototype._onCreateEntity = async function (event) {
    event.preventDefault();

    // If the user has disabled the override, call the original handler
    if (!game.settings.get("swse", "overrideActorCreate")) {
      return original.call(this, event);
    }

    // Build localized choice labels
    const typeChoices = {
      character: game.i18n.localize("SWSE.ActorType.character"),
      droid:     game.i18n.localize("SWSE.ActorType.droid"),
      vehicle:   game.i18n.localize("SWSE.ActorType.vehicle")
    };
    const options = Object.entries(typeChoices)
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join("");

    // Render the Create Actor dialog
    new Dialog({
      title:   game.i18n.localize("SWSE.Dialog.CreateActor.Title"),
      content: `
        <form>
          <div class="form-group">
            <label>${game.i18n.localize("SWSE.Dialog.CreateActor.Prompt")}</label>
            <select name="type">${options}</select>
          </div>
        </form>
      `,
      buttons: {
        create: {
          icon: "<i class='fas fa-check'></i>",
          label: game.i18n.localize("SWSE.Dialog.CreateActor.Button.Create"),
          callback: async html => {
            const type = html.find("select[name='type']").val();
            const name = `New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
            await Actor.create({ name, type });
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

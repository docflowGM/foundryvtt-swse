// scripts/swse.js
Hooks.once("init", () => {
  console.log("SWSE system initializing...");
});
Hooks.once("ready", () => {
  // Override the default actor creation behavior
  game.settings.register("swse", "overrideActorCreate", {
    name: "Override Actor Creation",
    scope: "client",
    config: false,
    type: Boolean,
    default: true
  });

  // Patch the createActor button
  const originalCreateActor = ActorDirectory.prototype._onCreateEntity;

  ActorDirectory.prototype._onCreateEntity = async function (event) {
    event.preventDefault();

    const typeChoices = {
      character: "Character",
      droid: "Droid",
      vehicle: "Vehicle"
    };

    const content = `
      <form>
        <div class="form-group">
          <label>Choose Actor Type:</label>
          <select name="type">
            ${Object.entries(typeChoices).map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}
          </select>
        </div>
      </form>
    `;

    new Dialog({
  title: game.i18n.localize("SWSE.Dialog.CreateActor.Title"),
  content: `
    <form>
      <div class="form-group">
        <label>${game.i18n.localize("SWSE.Dialog.CreateActor.Prompt")}</label>
        <select name="type">
          <option value="character">${game.i18n.localize("SWSE.ActorType.character")}</option>
          <option value="droid">${game.i18n.localize("SWSE.ActorType.droid")}</option>
          <option value="vehicle">${game.i18n.localize("SWSE.ActorType.vehicle")}</option>
        </select>
      </div>
    </form>
  `,
  buttons: {
    create: {
      label: game.i18n.localize("SWSE.Dialog.CreateActor.Button.Create"),
      callback: html => {
        const type = html.find("select[name='type']").val();
        Actor.create({ name: `New ${type}`, type });
      }
    },
    cancel: {
      label: game.i18n.localize("SWSE.Dialog.CreateActor.Button.Cancel")
    }
  }
}).render(true);

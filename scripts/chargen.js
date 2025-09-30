// systems/swse/scripts/chargen.js

/**
 * SWSE Character Generator
 * Adds a button in the Actor Directory to create new SWSE characters.
 */

Hooks.on("renderActorDirectory", (app, html) => {
  // Remove existing chargen button(s)
  html.querySelectorAll(".swse-chargen").forEach(el => el.remove());

  // Find the header where we’ll insert the button
  const header = html.querySelector(".directory-header .header-actions");
  if (!header) return;

  // Build the button
  const button = document.createElement("button");
  button.classList.add("swse-chargen");
  button.innerHTML = `<i class="fas fa-user-plus"></i> Create SWSE Character`;

  // Append to header
  header.appendChild(button);

  // Launch Character Creator on click
  button.addEventListener("click", () => launchCharacterCreator());
});

/**
 * Launches the character creation dialog
 */
function launchCharacterCreator() {
  const content = `
    <form>
      <div class="form-group">
        <label>Character Name:</label>
        <input type="text" name="name" value="New Character"/>
      </div>
      <div class="form-group">
        <label>Actor Type:</label>
        <select name="type">
          <option value="character">Character</option>
          <option value="droid">Droid</option>
          <option value="npc">NPC</option>
          <option value="vehicle">Vehicle</option>
        </select>
      </div>
    </form>
  `;

  new Dialog({
    title: "Create SWSE Actor",
    content,
    buttons: {
      create: {
        label: "Create",
        callback: html => {
          const form = html[0].querySelector("form");
          const name = form.name.value || "New Actor";
          const type = form.type.value || "character";
          createSWSEActor(name, type);
        }
      },
      cancel: {
        label: "Cancel"
      }
    },
    default: "create"
  }).render(true);
}

/**
 * Actually creates the actor
 */
async function createSWSEActor(name, type) {
  const actorData = {
    name,
    type, // Always defined from dialog
    system: {} // Start with empty system data
  };

  try {
    await Actor.create(actorData);
  } catch (err) {
    console.error("Failed to create SWSE Actor:", err);
    ui.notifications.error(`Error creating actor: ${err.message}`);
  }
}

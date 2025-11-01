/**
 * Keybindings for SWSE
 */
export function registerKeybindings() {
  console.log("SWSE | Registering keybindings...");
  
  game.keybindings.register("swse", "openSheet", {
    name: "Open Character Sheet",
    editable: [{ key: "KeyC" }],
    onDown: () => {
      const tokens = canvas.tokens.controlled;
      if (tokens.length === 1) {
        tokens[0].actor?.sheet.render(true);
        return true;
      }
      return false;
    }
  });
  
  console.log("SWSE | Keybindings registered");
}

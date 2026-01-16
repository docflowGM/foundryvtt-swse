/**
 * Keybindings for SWSE
 */
import { SWSELogger } from '../utils/logger.js';

export function registerKeybindings() {
  SWSELogger.log("SWSE | Registering keybindings...");

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

  // Canvas UI Tool Keybindings
  game.keybindings.register("swse", "quickRoll", {
    name: "Quick Roll",
    hint: "Open quick roll dialog",
    editable: [{ key: "KeyR", modifiers: ["Control"] }],
    onDown: () => {
      if (game.swse?.CanvasUIManager) {
        game.swse.CanvasUIManager._quickRoll();
        return true;
      }
      return false;
    }
  });

  game.keybindings.register("swse", "selectFriendly", {
    name: "Select All Friendly Tokens",
    hint: "Select all friendly tokens on the canvas",
    editable: [{ key: "KeyF", modifiers: ["Alt"] }],
    onDown: () => {
      if (game.swse?.CanvasUIManager) {
        game.swse.CanvasUIManager._selectTokens('friendly');
        return true;
      }
      return false;
    }
  });

  game.keybindings.register("swse", "selectHostile", {
    name: "Select All Hostile Tokens",
    hint: "Select all hostile tokens on the canvas",
    editable: [{ key: "KeyH", modifiers: ["Alt"] }],
    onDown: () => {
      if (game.swse?.CanvasUIManager) {
        game.swse.CanvasUIManager._selectTokens('hostile');
        return true;
      }
      return false;
    }
  });

  game.keybindings.register("swse", "restTokens", {
    name: "Rest Selected Tokens",
    hint: "Restore selected tokens to full health",
    editable: [{ key: "KeyR", modifiers: ["Alt"] }],
    onDown: () => {
      if (game.swse?.CanvasUIManager) {
        game.swse.CanvasUIManager._rest();
        return true;
      }
      return false;
    }
  });

  game.keybindings.register("swse", "toggleToolbar", {
    name: "Toggle Canvas Toolbar",
    hint: "Show/hide the canvas UI toolbar",
    editable: [{ key: "KeyT", modifiers: ["Control", "Alt"] }],
    onDown: () => {
      $('#swse-canvas-toolbar').toggleClass('collapsed');
      return true;
    }
  });

  SWSELogger.log("SWSE | Keybindings registered");
}

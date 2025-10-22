import { WorldDataLoader } from "./world-data-loader.js";

Hooks.once("init", () => {
  game.settings.register("swse", "dataLoaded", {
    name: "Data Loaded Flag",
    scope: "world",
    config: false,
    type: Boolean,
    default: false
  });
});

Hooks.once("ready", async () => {
  if (game.user.isGM) {
    await WorldDataLoader.autoLoad();
  }
});


Hooks.once("ready", async () => {

  function applyTheme(theme) {
    document.body.dataset.theme = theme;
    console.log(`[SWSE Theme] Applied theme: ${theme}`);
  }

  const theme = game.settings.get("foundryvtt-swse", "activeTheme") || "holo";
  applyTheme(theme);

  const shown = game.settings.get("foundryvtt-swse", "themePromptShown");

  if (!shown) {
    new ThemePickerDialog().render(true);
    await game.settings.set("foundryvtt-swse", "themePromptShown", true);
  }
});

class ThemePickerDialog extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "swse-theme-picker",
    window: { title: "Choose Your Theme" }
  };

  async _renderHTML(context, options) {
    return `
      <div class="swse-theme-picker">
        <h2>Select Your Theme</h2>
        <div class="theme-options">
          ${["holo","high-contrast","starship","sand-people","jedi","high-republic"]
            .map(t => `<button data-theme="${t}">${t}</button>`)
            .join("")}
        </div>
      </div>
    `;
  }

  activateListeners(html) {
    html.querySelectorAll("button[data-theme]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const theme = btn.dataset.theme;
        await game.settings.set("foundryvtt-swse", "activeTheme", theme);
        document.body.dataset.theme = theme;
        this.close();
      });
    });
  }
}

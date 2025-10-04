// systems/swse/scripts/swse-item.js

/**
 * SWSE Item Sheet
 * Custom sheet for SWSE items (weapons, armor, feats, talents, etc.)
 */
export class SWSEItemSheet extends ItemSheet {
  /** Configure default options for the SWSE item sheet */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "item"],
      template: "systems/swse/templates/item/item-sheet.hbs",
      width: 520,
      height: "auto", // Allows scroll-flexing
      tabs: [
        {
          navSelector: ".sheet-tabs",
          contentSelector: ".sheet-body",
          initial: "data"
        }
      ]
    });
  }

  /** Provide data to the template */
  getData(options = {}) {
    const context = super.getData(options);

    // Ensure compatibility across Foundry versions
    const item = context.item ?? this.item;
    context.system = item.system ?? {};

    // Add localized labels or helpers if needed later
    context.labels = {
      sheetTitle: game.i18n.localize("SWSE.SheetLabel.item")
    };

    return context;
  }

  /** Activate interactivity */
  activateListeners(html) {
    super.activateListeners(html);

    // Example: Expand/collapse item description
    html.find(".toggle-description").click(ev => {
      ev.preventDefault();
      const section = html.find(".item-description");
      section.toggleClass("collapsed");
    });

    // You can bind more custom handlers here for future SWSE features
  }
}

/**
 * Register SWSE item sheets
 */
Hooks.once("init", function () {
  console.log("SWSE | Registering custom Item Sheet...");
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("swse", SWSEItemSheet, { makeDefault: true });
});

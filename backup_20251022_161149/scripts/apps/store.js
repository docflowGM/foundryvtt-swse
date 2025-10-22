// ============================================
// FILE: store/store.js
// ============================================
export class SWSEStore extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-store",
      template: "systems/swse/templates/apps/store.hbs",
      width: 800,
      height: 600,
      title: "Galactic Trade Exchange",
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "weapons"}],
      resizable: true
    });
  }

    getData() {
    const actor = this.object;
    const isGM = game.user.isGM;

    // Get all items from world items (includes JSON-imported items)
    const allItems = game.items.filter(i => {
      // Must have a cost and be purchasable
      const cost = i.system?.cost ?? i.system?.price ?? 0;
      return cost > 0;
    });

    // Categorize items
    const categories = {
      weapons: allItems.filter(i => i.type === "weapon"),
      armor: allItems.filter(i => i.type === "armor"),
      equipment: allItems.filter(i => i.type === "equipment" || i.type === "item"),
      vehicles: [],  // Vehicles need special handling
      droids: [],    // Droids as NPCs/actors
      misc: allItems.filter(i => !["weapon","armor","equipment","item","vehicle","droid"].includes(i.type))
    };

    // Check if we have JSON data loaded
    if (game.swse?.data) {
      // Add vehicles from JSON if available
      // Note: Vehicles might be stored differently in your system
      console.log("SWSE | Store has access to game data");
    }

    return {
      actor,
      categories,
      isGM,
      markup: game.settings.get("swse", "storeMarkup") || 0,
      discount: game.settings.get("swse", "storeDiscount") || 0
    };
  };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".buy-item").click(this._onBuy.bind(this));
    html.find(".sell-item").click(this._onSell.bind(this));
    html.find(".save-gm").click(this._onSaveGM.bind(this));
  }

  async _onBuy(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".store-item")?.dataset.itemId;
    const item = game.items.get(itemId);
    if (!item) return;
    
    const actor = this.object;
    let cost = item.system.cost || 0;
    const markup = game.settings.get("swse", "storeMarkup") || 0;
    const discount = game.settings.get("swse", "storeDiscount") || 0;
    cost = Math.round(cost * (1 + markup / 100) * (1 - discount / 100));

    const credits = actor.system.credits || 0;
    if (credits < cost) {
      ui.notifications.warn("Not enough credits!");
      return;
    }

    await actor.update({"system.credits": credits - cost});
    await actor.createEmbeddedDocuments("Item", [item.toObject()]);
    ui.notifications.info(`${item.name} purchased for ${cost} credits.`);
    this.render();
  }

  async _onSell(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".store-item")?.dataset.itemId;
    const item = game.items.get(itemId);
    if (!item) return;
    
    const actor = this.object;
    const refund = Math.round((item.system.cost || 0) * 0.5);
    
    await actor.update({"system.credits": (actor.system.credits || 0) + refund});
    const owned = actor.items.find(i => i.name === item.name);
    if (owned) await owned.delete();

    ui.notifications.info(`${item.name} sold for ${refund} credits.`);
    this.render();
  }

  async _onSaveGM(event) {
    const markup = parseInt(this.element.find("input[name='markup']").val()) || 0;
    const discount = parseInt(this.element.find("input[name='discount']").val()) || 0;
    await game.settings.set("swse", "storeMarkup", markup);
    await game.settings.set("swse", "storeDiscount", discount);
    ui.notifications.info("Store settings updated.");
  }
}
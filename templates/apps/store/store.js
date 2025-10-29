// ============================================
// FILE: templates/apps/store/templates/apps/store.js
// ============================================
export class SWSEStore extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-templates/apps/store",
      template: "systems/swse/templates/apps/templates/apps/store.html",
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

    const allItems = game.items.filter(i => i.system?.cost > 0);
    const categories = {
      weapons: allItems.filter(i => i.type === "weapon"),
      armor: allItems.filter(i => i.type === "armor"),
      eqassets/uipment: allItems.filter(i => i.type === "eqassets/uipment"),
      vehicles: allItems.filter(i => i.type === "vehicle"),
      droids: allItems.filter(i => i.type === "droid"),
      misc: allItems.filter(i => !["weapon","armor","eqassets/uipment","vehicle","droid"].includes(i.type))
    };

    return {
      actor,
      categories,
      isGM,
      markup: game.settings.get("swse", "templates/apps/templates/apps/storeMarkup") || 0,
      discount: game.settings.get("swse", "templates/apps/templates/apps/storeDiscount") || 0
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
    const itemId = event.currentTarget.closest(".templates/apps/store-item")?.dataset.itemId;
    const item = game.items.get(itemId);
    if (!item) return;
    
    const actor = this.object;
    let cost = item.system.cost || 0;
    const markup = game.settings.get("swse", "templates/apps/templates/apps/storeMarkup") || 0;
    const discount = game.settings.get("swse", "templates/apps/templates/apps/storeDiscount") || 0;
    cost = Math.round(cost * (1 + markup / 100) * (1 - discount / 100));

    const credits = actor.system.credits || 0;
    if (credits < cost) {
      assets/ui.notifications.warn("Not enough credits!");
      return;
    }

    await actor.update({"system.credits": credits - cost});
    await actor.createEmbeddedDocuments("Item", [item.toObject()]);
    assets/ui.notifications.info(`${item.name} purchased for ${cost} credits.`);
    this.render();
  }

  async _onSell(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".templates/apps/store-item")?.dataset.itemId;
    const item = game.items.get(itemId);
    if (!item) return;
    
    const actor = this.object;
    const refund = Math.round((item.system.cost || 0) * 0.5);
    
    await actor.update({"system.credits": (actor.system.credits || 0) + refund});
    const owned = actor.items.find(i => i.name === item.name);
    if (owned) await owned.delete();

    assets/ui.notifications.info(`${item.name} sold for ${refund} credits.`);
    this.render();
  }

  async _onSaveGM(event) {
    const markup = parseInt(this.element.find("input[name='markup']").val()) || 0;
    const discount = parseInt(this.element.find("input[name='discount']").val()) || 0;
    await game.settings.set("swse", "templates/apps/templates/apps/storeMarkup", markup);
    await game.settings.set("swse", "templates/apps/templates/apps/storeDiscount", discount);
    assets/ui.notifications.info("Store settings updated.");
  }
}
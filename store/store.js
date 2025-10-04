export class SWSEStore extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "swse-store",
      template: "systems/swse/templates/apps/store.html",
      width: 800,
      height: "auto",
      title: "Galactic Trade Exchange",
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "weapons" }]
    });
  }

  getData() {
    const actor = this.object;
    const isGM = game.user.isGM;

    // Pull all items with a cost
    const allItems = game.items.filter(i => i.system?.cost > 0);
    const categories = {
      weapons: allItems.filter(i => i.type === "weapon"),
      armor: allItems.filter(i => i.type === "armor"),
      equipment: allItems.filter(i => i.type === "equipment"),
      vehicles: allItems.filter(i => i.type === "vehicle"),
      droids: allItems.filter(i => i.type === "droid"),
      misc: allItems.filter(i => !["weapon","armor","equipment","vehicle","droid"].includes(i.type))
    };

    return {
      actor,
      categories,
      isGM,
      markup: game.settings.get("swse", "storeMarkup") || 0,
      discount: game.settings.get("swse", "storeDiscount") || 0
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
    const btn = event.currentTarget;
    const itemId = btn.closest(".store-item").dataset.itemId;
    const item = game.items.get(itemId);
    const actor = this.object;

    let cost = item.system.cost;
    const markup = game.settings.get("swse", "storeMarkup") || 0;
    const discount = game.settings.get("swse", "storeDiscount") || 0;

    cost = Math.round(cost * (1 + markup / 100) * (1 - discount / 100));

    if (actor.system.credits < cost) {
      ui.notifications.warn("Not enough credits!");
      return;
    }

    await actor.update({ "system.credits": actor.system.credits - cost });
    await actor.createEmbeddedDocuments("Item", [item.toObject()]);
    ui.notifications.info(`${item.name} purchased for ${cost} credits.`);
    this.render();
  }

  async _onSell(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const itemId = btn.closest(".store-item").dataset.itemId;
    const item = game.items.get(itemId);
    const actor = this.object;

    const refund = Math.round(item.system.cost * 0.5); // default 50%
    await actor.update({ "system.credits": actor.system.credits + refund });
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
    ui.notifications.info("Store price modifiers updated.");
  }
}

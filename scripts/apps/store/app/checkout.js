/**
 * checkout.js
 * ------------
 * Executes purchases for SWSE Store 2.0.
 * Deducts credits, creates items, spawns actors, handles rollback.
 */

export class StoreCheckout {

  /**
   * Constructor
   *
   * @param {Actor} actor - buyer
   * @param {StoreCart} cart - cart engine
   */
  constructor(actor, cart) {
    this.actor = actor;
    this.cart = cart;
  }

  /**
   * Execute the purchase transaction.
   * Returns true if successful, false if cancelled or failed.
   *
   * @returns {Promise<boolean>}
   */
  async processPurchase() {
    const buyer = this.actor;
    const credits = Number(buyer.system?.credits ?? 0);
    const subtotal = this.cart.subtotal;

    /* ------------------------------------ */
    /* VALIDATION                            */
    /* ------------------------------------ */

    if (subtotal <= 0) {
      ui.notifications.warn("Cart is empty.");
      return false;
    }

    if (credits < subtotal) {
      ui.notifications.error(
        `Not enough credits (Need ${subtotal.toLocaleString()}, have ${credits.toLocaleString()}).`
      );
      return false;
    }

    /* ------------------------------------ */
    /* CONFIRMATION DIALOG                   */
    /* ------------------------------------ */

    const confirmed = await Dialog.confirm({
      title: "Complete Purchase",
      content: `<p>Purchase items for <strong>${subtotal.toLocaleString()}</strong> credits?</p>`,
      defaultYes: true
    });

    if (!confirmed) return false;

    /* ------------------------------------ */
    /* TRANSACTION BEGIN                     */
    /* ------------------------------------ */

    let creditsDeducted = false;

    try {
      /* ------------------------------------ */
      /* DEDUCT CREDITS                        */
      /* ------------------------------------ */

      await buyer.update({ "system.credits": credits - subtotal });
      creditsDeducted = true;

      /* ------------------------------------ */
      /* CREATE ITEMS                          */
      /* ------------------------------------ */

      const itemEntries = this.cart.entries.filter(e => e.type === "item");
      if (itemEntries.length) {
        const docs = [];

        for (const entry of itemEntries) {
          const ref = entry.ref;
          if (!ref.doc) continue;

          const base = ref.doc.toObject ? ref.doc.toObject() : structuredClone(ref.doc);

          // Create quantity copies
          for (let i = 0; i < entry.quantity; i++) {
            docs.push(structuredClone(base));
          }
        }

        if (docs.length) {
          await buyer.createEmbeddedDocuments("Item", docs);
        }
      }

      /* ------------------------------------ */
      /* CREATE DROIDS                         */
      /* ------------------------------------ */

      const droidEntries = this.cart.entries.filter(e => e.type === "droid");
      for (const entry of droidEntries) {
        const ref = entry.ref;
        if (!ref.doc) continue;

        for (let i = 0; i < entry.quantity; i++) {
          const data = ref.doc.toObject ? ref.doc.toObject() : structuredClone(ref.doc);

          // Customize ownership and name
          data.name = `${data.name} (${buyer.name})`;
          data.ownership = { default: 0, [game.user.id]: 3 };

          await Actor.create(data);
        }
      }

      /* ------------------------------------ */
      /* CREATE VEHICLES                       */
      /* ------------------------------------ */

      const vehicleEntries = this.cart.entries.filter(e => e.type === "vehicle");
      for (const entry of vehicleEntries) {
        const ref = entry.ref;
        if (!ref.doc) continue;

        for (let i = 0; i < entry.quantity; i++) {
          const data = ref.doc.toObject ? ref.doc.toObject() : structuredClone(ref.doc);

          // Customize based on condition
          if (entry.condition === "used") {
            data.name = `(Used) ${data.name}`;
            if (!data.system) data.system = {};
            data.system.condition = "used";
          }

          data.ownership = { default: 0, [game.user.id]: 3 };

          await Actor.create(data);
        }
      }

      /* ------------------------------------ */
      /* LOG PURCHASE HISTORY                   */
      /* ------------------------------------ */

      const history = buyer.getFlag("swse", "purchaseHistory") || [];
      history.push({
        timestamp: Date.now(),
        total: subtotal,
        entries: this.cart.entries.map(e => ({
          name: e.name,
          id: e.id,
          cost: e.cost,
          qty: e.quantity,
          type: e.type,
          condition: e.condition
        }))
      });
      await buyer.setFlag("swse", "purchaseHistory", history);

      /* ------------------------------------ */
      /* SUCCESS                               */
      /* ------------------------------------ */

      ui.notifications.info("Purchase complete!");
      this.cart.clear();

      return true;

    } catch (err) {
      console.error("SWSE Store | Checkout error:", err);

      // Attempt rollback if credits were deducted but items failed
      if (creditsDeducted) {
        console.warn("SWSE Store | Attempting rollback...");
        try {
          await buyer.update({ "system.credits": credits });
        } catch (rollbackErr) {
          console.error("SWSE Store | Rollback failed:", rollbackErr);
        }
      }

      ui.notifications.error(
        "Purchase failed. Please contact the GM. " + err.message
      );
      return false;
    }
  }
}

/**
 * SWSE Store Application
 * Provides a marketplace interface for buying and selling items
 */

export class SWSEStore extends FormApplication {
    constructor(actor, options = {}) {
        super(actor, options);
        this.actor = actor;
    }
    
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "swse-templates/apps/store",
            template: "systems/swse/templates/apps/templates/apps/store.hbs",
            width: 800,
            height: 600,
            title: "Galactic Trade Exchange",
            tabs: [{ 
                navSelector: ".sheet-tabs", 
                contentSelector: ".sheet-body", 
                initial: "weapons" 
            }],
            resizable: true,
            closeOnSubmit: false
        });
    }

    /**
     * Get data for template rendering
     * @returns {Object} Template data
     */
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
            eqassets/uipment: allItems.filter(i => 
                i.type === "eqassets/uipment" || i.type === "item"
            ),
            vehicles: [], // Vehicles need special handling
            droids: [],   // Droids as NPCs/actors
            misc: allItems.filter(i => 
                !["weapon", "armor", "eqassets/uipment", "item", "vehicle", "droid"]
                    .includes(i.type)
            )
        };

        // Check if we have JSON data loaded
        if (game.swse?.data) {
            console.log("SWSE | Store has access to game data");
        }

        return {
            actor,
            categories,
            isGM,
            markup: game.settings.get("swse", "templates/apps/templates/apps/storeMarkup") || 0,
            discount: game.settings.get("swse", "templates/apps/templates/apps/storeDiscount") || 0,
            credits: actor.system?.credits || 0
        };
    }

    activateListeners(html) {
        super.activateListeners(html);
        
        html.find(".buy-item").click(this._onBuy.bind(this));
        html.find(".sell-item").click(this._onSell.bind(this));
        html.find(".save-gm").click(this._onSaveGM.bind(this));
    }

    /**
     * Handle buying an item
     * @param {Event} event - Click event
     * @private
     */
    async _onBuy(event) {
        event.preventDefault();
        
        const itemId = event.currentTarget.closest(".templates/apps/store-item")?.dataset.itemId;
        if (!itemId) {
            assets/ui.notifications.warn("Invalid item selection.");
            return;
        }
        
        const item = game.items.get(itemId);
        if (!item) {
            assets/ui.notifications.error("Item not found.");
            return;
        }
        
        const actor = this.object;
        
        try {
            // Calculate final cost with markup/discount
            let cost = Number(item.system.cost) || 0;
            const markup = Number(game.settings.get("swse", "templates/apps/templates/apps/storeMarkup")) || 0;
            const discount = Number(game.settings.get("swse", "templates/apps/templates/apps/storeDiscount")) || 0;
            cost = Math.round(cost * (1 + markup / 100) * (1 - discount / 100));

            const credits = Number(actor.system.credits) || 0;
            
            if (credits < cost) {
                assets/ui.notifications.warn(
                    `Not enough credits! Need ${cost}, have ${credits}.`
                );
                return;
            }

            // Confirm purchase
            const confirmed = await Dialog.confirm({
                title: "Confirm Purchase",
                content: `<p>Purchase <strong>${item.name}</strong> for <strong>${cost}</strong> credits?</p>`,
                defaultYes: true
            });
            
            if (!confirmed) return;

            // Deduct credits and add item
            await actor.update({ "system.credits": credits - cost });
            await actor.createEmbeddedDocuments("Item", [item.toObject()]);
            
            assets/ui.notifications.info(`${item.name} purchased for ${cost} credits.`);
            this.render();
        } catch (err) {
            console.error("SWSE Store | Purchase failed:", err);
            assets/ui.notifications.error("Failed to complete purchase.");
        }
    }

    /**
     * Handle selling an item
     * @param {Event} event - Click event
     * @private
     */
    async _onSell(event) {
        event.preventDefault();
        
        const itemId = event.currentTarget.closest(".templates/apps/store-item")?.dataset.itemId;
        if (!itemId) {
            assets/ui.notifications.warn("Invalid item selection.");
            return;
        }
        
        const item = game.items.get(itemId);
        if (!item) {
            assets/ui.notifications.error("Item not found.");
            return;
        }
        
        const actor = this.object;
        
        try {
            // Check if actor owns this item
            const owned = actor.items.find(i => i.name === item.name);
            if (!owned) {
                assets/ui.notifications.warn("You don't own this item!");
                return;
            }
            
            // Calculate refund (50% of base cost)
            const refund = Math.round((Number(item.system.cost) || 0) * 0.5);
            
            // Confirm sale
            const confirmed = await Dialog.confirm({
                title: "Confirm Sale",
                content: `<p>Sell <strong>${item.name}</strong> for <strong>${refund}</strong> credits?</p>`,
                defaultYes: true
            });
            
            if (!confirmed) return;
            
            // Add credits and remove item
            const credits = Number(actor.system.credits) || 0;
            await actor.update({ "system.credits": credits + refund });
            await owned.delete();

            assets/ui.notifications.info(`${item.name} sold for ${refund} credits.`);
            this.render();
        } catch (err) {
            console.error("SWSE Store | Sale failed:", err);
            assets/ui.notifications.error("Failed to complete sale.");
        }
    }

    /**
     * Save GM settings
     * @param {Event} event - Click event
     * @private
     */
    async _onSaveGM(event) {
        event.preventDefault();
        
        if (!game.user.isGM) {
            assets/ui.notifications.error("Only GMs can modify templates/apps/store settings.");
            return;
        }
        
        try {
            const markup = parseInt(this.element.find("input[name='markup']").val()) || 0;
            const discount = parseInt(this.element.find("input[name='discount']").val()) || 0;
            
            // Validate ranges
            if (markup < -100 || markup > 1000) {
                assets/ui.notifications.warn("Markup must be between -100% and 1000%.");
                return;
            }
            
            if (discount < 0 || discount > 100) {
                assets/ui.notifications.warn("Discount must be between 0% and 100%.");
                return;
            }
            
            await game.settings.set("swse", "templates/apps/templates/apps/storeMarkup", markup);
            await game.settings.set("swse", "templates/apps/templates/apps/storeDiscount", discount);
            
            assets/ui.notifications.info("Store settings updated.");
            this.render();
        } catch (err) {
            console.error("SWSE Store | Failed to save settings:", err);
            assets/ui.notifications.error("Failed to save templates/apps/store settings.");
        }
    }
}

export default class SWSEActorSheet extends ActorSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["swse", "sheet", "actor"],
            template: "systems/swse/templates/actors/character-sheet.html",
            width: 800,
            height: 900,
            tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "skills"}],
            dragDrop: [{dragSelector: ".item-list .item", dropSelector: null}]
        });
    }

    getData() {
        const context = super.getData();
        const actorData = context.actor;
        
        context.system = actorData.system;
        context.flags = actorData.flags;
        
        // Calculate ability totals and modifiers
        if (context.system.abilities) {
            for (let [key, ability] of Object.entries(context.system.abilities)) {
                // Calculate total: base + racial + modifier
                const base = ability.base || 10;
                const racial = ability.racial || 0;
                const modifier = ability.modifier || 0;
                
                // If temp is set, use it; otherwise use calculated total
                if (ability.temp && ability.temp !== "") {
                    ability.total = parseInt(ability.temp);
                } else {
                    ability.total = base + racial + modifier;
                }
                
                // Calculate modifier (total - 10) / 2, rounded down
                ability.mod = Math.floor((ability.total - 10) / 2);
            }
        }
        
        // Calculate skill totals
        if (context.system.skills) {
            for (let [key, skill] of Object.entries(context.system.skills)) {
                const abilityMod = context.system.abilities[skill.ability]?.mod || 0;
                const trained = skill.trained ? 5 : 0;
                const focused = skill.focused ? 5 : 0;
                const misc = skill.misc || 0;
                const halfLevel = Math.floor((context.system.level || 1) / 2);
                
                skill.total = abilityMod + trained + focused + misc + halfLevel;
            }
        }
        
        // Organize items by type
        context.feats = actorData.items.filter(i => i.type === "feat");
        context.talents = actorData.items.filter(i => i.type === "talent");
        context.powers = actorData.items.filter(i => i.type === "power");
        context.inventory = actorData.items.filter(i => i.type === "item" || i.type === "weapon" || i.type === "armor");
        
        return context;
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Item controls
        html.find('.item-delete').click(this._onItemDelete.bind(this));
        html.find('.add-item-btn').click(this._onAddItem.bind(this));
        
        // Editable fields
        html.find('input[type="number"], input[type="text"]').change(this._onInputChange.bind(this));
        html.find('input[type="checkbox"]').change(this._onCheckboxChange.bind(this));
    }

    async _onInputChange(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const field = element.name;
        const value = element.type === "number" ? parseFloat(element.value) : element.value;
        
        await this.actor.update({[field]: value});
    }

    async _onCheckboxChange(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const field = element.name;
        const value = element.checked;
        
        await this.actor.update({[field]: value});
    }

    async _onItemDelete(event) {
        event.preventDefault();
        const li = $(event.currentTarget).parents(".item");
        const item = this.actor.items.get(li.data("itemId"));
        
        if (item) {
            await item.delete();
            li.slideUp(200, () => this.render(false));
        }
    }

    async _onAddItem(event) {
        event.preventDefault();
        
        const itemData = {
            name: "New Item",
            type: "item",
            system: {
                quantity: 1,
                weight: 0,
                description: ""
            }
        };
        
        await this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    async _onDrop(event) {
        event.preventDefault();
        
        let data;
        try {
            data = JSON.parse(event.dataTransfer.getData('text/plain'));
        } catch (err) {
            return false;
        }
        
        if (data.type === "Item") {
            return this._onDropItem(event, data);
        }
        
        return super._onDrop(event);
    }

    async _onDropItem(event, data) {
        if (!this.actor.isOwner) return false;
        
        const item = await Item.implementation.fromDropData(data);
        const itemData = item.toObject();
        
        // Check if item already exists
        const existingItem = this.actor.items.find(i => i.name === item.name && i.type === item.type);
        if (existingItem) {
            ui.notifications.warn(`${item.name} is already on this character.`);
            return false;
        }
        
        return await this.actor.createEmbeddedDocuments("Item", [itemData]);
    }
}
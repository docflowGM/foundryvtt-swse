export default class SWSEItemSheet extends ItemSheet {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["swse", "sheet", "item"],
            template: "systems/swse/templates/items/item-sheet.html",
            width: 520,
            height: 480,
            tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}]
        });
    }

    getData() {
        const context = super.getData();
        context.system = context.item.system;
        context.flags = context.item.flags;
        return context;
    }

    activateListeners(html) {
        super.activateListeners(html);
        
        if (!this.options.editable) return;
        
        // Update listeners
        html.find('input, select, textarea').change(this._onInputChange.bind(this));
    }

    async _onInputChange(event) {
        event.preventDefault();
        const element = event.currentTarget;
        const field = element.name;
        let value = element.value;
        
        if (element.type === "number") {
            value = parseFloat(value) || 0;
        } else if (element.type === "checkbox") {
            value = element.checked;
        }
        
        await this.item.update({[field]: value});
    }
}
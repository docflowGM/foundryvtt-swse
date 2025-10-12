
# Character Sheet Store Button Integration

Add this button to your character sheet template to allow players to access the store.

## Location: templates/actor/character-sheet.hbs

Find a good spot in your character sheet (maybe near Credits or Equipment tab) and add:

```handlebars
<!-- Store Button -->
<section class="store-section">
    <button type="button" class="open-store-btn">
        <i class="fas fa-shopping-cart"></i> Galactic Trade Exchange
    </button>
</section>
```

## Then in scripts/swse-actor.js

In the `activateListeners()` method of SWSEActorSheet, add:

```javascript
activateListeners(html) {
    super.activateListeners(html);
    
    // Existing listeners...
    
    // Store button
    html.find('.open-store-btn').click(this._onOpenStore.bind(this));
}

async _onOpenStore(event) {
    event.preventDefault();
    game.swse.openStore(this.actor);
}
```

## Alternative: Add to Actor Header Context Menu

Or add it as a context menu option in index.js:

```javascript
Hooks.on("getActorDirectoryEntryContext", (html, options) => {
    options.push({
        name: "Open Store",
        icon: '<i class="fas fa-shopping-cart"></i>',
        condition: li => {
            const actor = game.actors.get(li.data("documentId"));
            return actor?.type === "character";
        },
        callback: li => {
            const actor = game.actors.get(li.data("documentId"));
            game.swse.openStore(actor);
        }
    });
});
```

This will add "Open Store" when you right-click a character in the Actors sidebar.

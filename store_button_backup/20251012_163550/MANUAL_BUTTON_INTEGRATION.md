# Manual Store Button Integration

If the automatic script couldn't add the button, follow these steps:

## 1. Add Button to Character Sheet

Edit `templates/actor/character-sheet.hbs`

Find a good location (near credits or force points) and add:

```handlebars
<!-- Store Access -->
<section class="store-section">
    <button type="button" class="open-store-btn">
        <i class="fas fa-shopping-cart"></i> Galactic Trade Exchange
    </button>
</section>
```

## 2. Add Handler to Actor Sheet

Edit `scripts/swse-actor.js`

### In activateListeners() method:

Add this line before the closing brace:

```javascript
activateListeners(html) {
    super.activateListeners(html);
    
    // ... existing listeners ...
    
    // Store button
    html.find('.open-store-btn').click(this._onOpenStore.bind(this));
}
```

### Add new method to the class:

Before the class closing brace, add:

```javascript
async _onOpenStore(event) {
    event.preventDefault();
    if (game.swse?.openStore) {
        game.swse.openStore(this.actor);
    } else {
        ui.notifications.warn("Store system not available. Ensure store.js is loaded.");
    }
}
```

## 3. Optional: Add CSS Styling

Edit `styles/swse-components.css` or create a new CSS file:

```css
.store-section {
    margin: 10px 0;
    text-align: center;
}

.open-store-btn {
    background: linear-gradient(135deg, #1e3a8a, #3b82f6);
    color: #fff;
    border: 2px solid #60a5fa;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: bold;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.open-store-btn:hover {
    background: linear-gradient(135deg, #3b82f6, #60a5fa);
    box-shadow: 0 0 10px #3b82f6;
    transform: translateY(-2px);
}

.open-store-btn i {
    margin-right: 5px;
}
```

## 4. Test

In Foundry console:

```javascript
const char = game.actors.contents[0];
game.swse.openStore(char);
```


# Loading JSON Data into SWSE Store

Your store needs items to sell! Here's how to ensure your JSON data (weapons, armor, equipment, droids, vehicles) is available.

## Current Data Files

You should have these in `data/` or `packs/`:
- weapons.json
- armor.json
- equipment.json
- droids.json (or similar)
- vehicles.json

## Automatic Loading via WorldDataLoader

Your system already has `WorldDataLoader` - let's make sure it's creating world items:

### Check scripts/world-data-loader.js

The WorldDataLoader should be creating items in the world. Verify it has:

```javascript
static async loadWeapons() {
  const response = await fetch("systems/swse/data/weapons.json");
  const weapons = await response.json();
  
  for (const weapon of weapons) {
    // Check if item already exists
    const existing = game.items.find(i => 
      i.name === weapon.name && i.type === "weapon"
    );
    
    if (!existing) {
      await Item.create({
        name: weapon.name,
        type: "weapon",
        system: {
          cost: weapon.cost,
          damage: weapon.damage,
          // ... other properties
        }
      });
    }
  }
  
  console.log(`SWSE | Loaded ${weapons.length} weapons`);
}
```

### Ensure JSON Data Has Cost/Price

Every item in your JSON files needs a cost field:

```json
{
  "name": "Blaster Pistol",
  "type": "weapon",
  "cost": 500,
  "damage": "3d6",
  "range": "short"
}
```

## Manual Item Import (Quick Test)

To test the store immediately, create a few items manually:

1. In Foundry, go to Items tab
2. Click "Create Item"
3. Set:
   - Name: "Blaster Pistol"
   - Type: weapon
   - Cost: 500
4. Save

Now open the store - the item should appear!

## Automatic Loading on World Start

In index.js, the ready hook should call:

```javascript
Hooks.once("ready", async () => {
  console.log("SWSE | System ready. May the Force be with you.");
  
  // Setup store shortcut
  game.swse.openStore = (actor) => {
    new SWSEStore(actor).render(true);
  };
  
  // Auto-load data on first run
  if (game.user.isGM) {
    await WorldDataLoader.autoLoad();  // ✓ This should be there
  }
});
```

## Checking What's Loaded

Open console (F12) and run:

```javascript
// Check how many items are in the world
console.log("Total items:", game.items.size);

// Check items by type
console.log("Weapons:", game.items.filter(i => i.type === "weapon").length);
console.log("Armor:", game.items.filter(i => i.type === "armor").length);

// Check items with cost
console.log("Purchasable:", game.items.filter(i => i.system?.cost > 0).length);

// View first weapon
const weapon = game.items.find(i => i.type === "weapon");
console.log("Sample weapon:", weapon?.toObject());
```

## Force Reload Data

If items aren't showing:

```javascript
// In console
await game.swse.data.WorldDataLoader.loadAll();
```

## Expected JSON Structure

### weapons.json
```json
[
  {
    "name": "Blaster Pistol",
    "type": "weapon",
    "cost": 500,
    "damage": "3d6",
    "damageType": "energy",
    "range": "short",
    "critical": "20",
    "description": "Standard blaster sidearm"
  }
]
```

### equipment.json
```json
[
  {
    "name": "Comlink",
    "type": "equipment",
    "cost": 25,
    "weight": 0.1,
    "description": "Short-range communication device"
  }
]
```

## Troubleshooting

**Problem: Store is empty**
- Check: `game.items.size` - should be > 0
- Check: WorldDataLoader has run
- Check: Items have `cost` field in system data

**Problem: Items show but can't buy**
- Check: Actor has `system.credits` field
- Check: Item `system.cost` is a number, not string

**Problem: JSON not loading**
- Check: Files exist in `systems/swse/data/`
- Check: File paths in WorldDataLoader are correct
- Check: Browser console for fetch errors

# Template System (Phase 6)

## Overview

The Template System allows GMs to create and manage reusable droid configurations that players can clone as a starting point for custom droids.

---

## How Templates Work

### For Players

1. Click "From Template" button in the Store
2. Browse available droid templates from the `droid-templates` compendium
3. Select a template
4. Builder launches in TEMPLATE mode, pre-loaded with template config
5. Player customizes the template
6. Finalize to create new droid

### For GMs

1. Create droid actors with complete system configurations
2. Add to `foundryvtt-swse.droid-templates` compendium
3. Templates automatically appear in Store template browser
4. Players can access and customize templates

---

## Creating Templates

### Step 1: Create a Droid Actor

1. Create a new Actor (type: droid)
2. Use the Droid Builder to design the configuration
3. Give it a descriptive name (e.g., "Scout Droid Template", "Combat Droid Mark II")

### Step 2: Add to Compendium

1. Right-click the droid actor
2. "Export to Compendium"
3. Select/Create the `droid-templates` compendium
4. Confirm

### Step 3: Done!

The template is now available to all players via the Store "From Template" button.

---

## Template Naming Conventions

**Recommended format:** `[Role] Droid [Variant]`

Examples:
- "Scout Droid (Light)"
- "Combat Droid (Heavy)"
- "Utility Droid (Standard)"
- "Infiltrator Droid (Stealthy)"
- "Guardian Droid (Defensive)"

This makes templates easy to browse and understand.

---

## Template Organization

### Creating Categories (Optional)

If you have many templates, organize them by:

**Folder structure:**
```
droid-templates/
  ├── Combat/
  │   ├── Assault Droid
  │   └── Guard Droid
  ├── Support/
  │   ├── Medic Droid
  │   └── Engineer Droid
  └── Utility/
      ├── Scout Droid
      └── Probe Droid
```

The folder structure will be reflected in the template browser.

---

## Template Best Practices

### 1. Complete Configurations

Templates should have:
- ✅ All required systems selected (locomotion, processor, armor)
- ✅ Realistic appendage/sensor loadouts
- ✅ Appropriate weapons for role
- ✅ Within reasonable budget (under 2000 credits)

### 2. Meaningful Names

❌ Bad: "Droid_v3"
✅ Good: "Scout Droid Template - Light Mobile"

### 3. Balanced Costs

- **Low-cost templates:** 400-800 credits (entry-level)
- **Mid-cost templates:** 1000-1400 credits (balanced)
- **High-cost templates:** 1500-1900 credits (optimized)

This gives players meaningful choices.

### 4. Documentation

Consider adding notes to the actor's Biography or description:
```
"Scout-class droid optimized for reconnaissance.
Emphasizes mobility and sensor capabilities.
Good starting point for light infiltration builds."
```

---

## Template Availability

### Public Templates

By default, all templates in `droid-templates` are available to all players.

### Restricted Templates (Advanced)

To restrict templates to certain players:
1. Create private compendium with restricted access
2. Reference in custom builder code
3. (This requires coding; use public templates for simplicity)

---

## Updating Templates

### Updating a Template

1. Edit the template droid in the compendium
2. Use "Edit Droid" button on its sheet
3. Modify systems/config as needed
4. Finalize changes
5. The template is now updated

### Archiving Old Templates

Instead of deleting:
1. Add "[DEPRECATED]" to the name
2. Leave in compendium for historical reference
3. Deprecated templates won't clutter the browser much

---

## Template Examples

### Example 1: Scout Droid (Light)

```
Degree: Third-Degree
Size: Small
Locomotion: Wheels (150 credits, speed 25)
Appendages: Gripper Claw (100 credits)
Sensors: Optical Sensors (350 credits)
Processor: Standard Processor (350 credits)
Armor: Light Armor (150 credits)
Weapons: Blaster Pistol (400 credits)
Accessories: Comlink (100 credits)

Total Cost: 1,600 credits
Role: Light reconnaissance, fast movement
```

### Example 2: Guardian Droid (Heavy)

```
Degree: Second-Degree
Size: Large
Locomotion: Treads (200 credits, speed 20)
Appendages: Hand (150 credits), Gripper Claw (100 credits)
Sensors: Thermal Imaging (500 credits)
Processor: Advanced Processor (600 credits)
Armor: Heavy Armor (500 credits)
Weapons: Blaster Rifle (600 credits), Laser Cannon (1000 credits)
Accessories: Medical Kit (300 credits)

Total Cost: 4,450 credits (over budget - GM created for NPC)
Role: Heavy combat, protection
```

---

## Troubleshooting

### "No templates found" message

1. Check that `droid-templates` compendium exists
2. Verify it contains actor documents
3. Ensure actors are type: "droid"
4. Try refreshing the page

### Template doesn't appear in browser

1. Verify actor is in `droid-templates` compendium
2. Check actor type is "droid"
3. Check actor has valid `droidSystems` config
4. Try refreshing Store UI

### Player can't modify template after cloning

This is normal - they're customizing it in the builder. The template itself is read-only; their modifications are saved to their own droid.

---

## Future Enhancements (Not in MVP)

- **Template Versioning:** Track template changes over time
- **Template Sharing:** Export/import templates between games
- **Template Market:** Share templates with other GMs online
- **Template Ratings:** Let players rate templates they've used
- **Auto-Templates:** Generate templates based on droid level/role

For now, use the basic template system and expand as needed.

---

## API Reference

### For Developers

To programmatically load templates:

```javascript
const templatePack = game.packs.get('foundryvtt-swse.droid-templates');
const templates = await templatePack.getDocuments();
const droidTemplates = templates.filter(d => d.type === 'droid');
```

---

## Support

For questions or issues with templates:
- Check droid sheet for valid configuration
- Ensure compendium has correct name: `foundryvtt-swse.droid-templates`
- Verify droid has completed `system.droidSystems` data

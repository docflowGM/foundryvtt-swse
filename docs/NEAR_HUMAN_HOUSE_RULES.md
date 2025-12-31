# Near-Human House Rules Configuration

This document explains how to enable and customize optional house rules for Near-Human character creation in the SWSE system.

## Quick Start

To enable house rules for your campaign:

1. Open `data/near-human-houserules.json`
2. Change the first line from `"enabled": false` to `"enabled": true`
3. Reload your Foundry VTT session
4. House rule traits and variants will now appear in the Near-Human builder with a ⚙️ **HR** badge

## What Are House Rules?

House rules are optional rule variants that GMs can enable to expand the official SWSE Near-Human options. They:

- Are **disabled by default** - no impact unless explicitly enabled
- Are clearly **marked with an ⚙️ HR badge** in the character creation UI
- Can be **easily customized** by editing the JSON file
- Don't interfere with official SWSE rules

## Current House Rule Traits (10 Optional)

### Defense & Resilience
- **Adaptive Resilience**: Once per encounter, increase one defense (Fortitude, Reflex, or Will) by 2 against a single attack or effect
- **Mental Discipline**: Once per encounter, increase Will Defense by 2 against one attack/effect, or reroll a Deception or Persuasion check
- **Second Wind (Enhanced)**: Gain an extra use of Second Wind per day (2 instead of 1)

### Physical & Mobility
- **Hybrid Vitality**: Combine two compatible physical/environmental adaptations (e.g., Climb Speed AND Low-Light Vision)
- **Metabolic Flexibility**: Consume half rations, require only 4 hours sleep, and reroll Endurance once per day
- **Dual Reflexes**: +1 to Initiative and +1 species bonus to Reflex Defense

### Skills & Knowledge
- **Hybrid Intelligence**: +2 species bonus to one Knowledge skill and one Profession skill
- **Chameleon Adaptation**: +2 to Stealth and can take 10 on Stealth when relaxed
- **Generalist Mastery**: Choose 2 different Class Skills from different classes

### Technology & Augmentation
- **Synthetic Resonance**: +2 to Use Computer and Mechanics; can interact with droids as if proficient with cybernetics

## Current House Rule Variants (4 Optional Cosmetic)

These are purely cosmetic unless your GM allows mechanical effects:

- **Luminous Skin**: Bioluminescent skin that can change colors
- **Crystalline Features**: Crystalline growths (hair, skin, nails)
- **Vestigial Wings**: Small non-functional wings (bat, insect, or avian)
- **Hybrid Bio-Pattern**: Obvious mixed genetic traits in body patterns

## How to Customize

### Enabling/Disabling House Rules

```json
{
  "enabled": true,    // Set to true to enable, false to disable
  "description": "...",
  "traits": [ ... ]
}
```

### Adding Your Own Traits

1. Open `data/near-human-houserules.json`
2. Add a new trait object to the `traits` array:

```json
{
  "id": "yourTraitId",
  "name": "Your Trait Name",
  "description": "Clear description of what the trait does",
  "type": "combat",  // See trait types below
  "category": "houserule"  // Keep this for proper UI marking
}
```

### Trait Types

Use these for the `type` field to organize traits properly:

- `defense` - Defensive abilities
- `combat` - Combat-related abilities
- `skill` - Skill bonuses or abilities
- `physiology` - Physical traits
- `sense` - Sensory abilities
- `movement` - Movement-related
- `force` - Force-sensitive abilities
- `augmentation` - Technology/augmentation
- `environmental` - Environmental adaptation
- `charisma` - Charisma-based abilities

### Adding Variants

1. Add a new variant object to the `variants` array:

```json
{
  "id": "yourVariantId",
  "name": "Your Variant Name",
  "description": "Cosmetic appearance or optional mechanical effect",
  "type": "cosmetic",  // Usually cosmetic
  "category": "houserule"  // Keep this for proper UI marking
}
```

## GM Notes

### Balance Considerations

- Most house rule traits are balanced against official SWSE traits
- Traits like **Hybrid Vitality** (two adaptations) are stronger - GMs may require additional sacrifice
- **Synthetic Resonance** could be powerful in technology-heavy campaigns - adjust as needed
- Cosmetic variants have no mechanical effect unless you (GM) explicitly allow it

### Testing New Rules

Before deploying house rules to your campaign:

1. Test with a new character in chargen
2. Verify the trait displays correctly with the ⚙️ HR badge
3. Check that validation still works (must select 1 trait + 1 sacrifice)
4. Ensure the trait data persists to the character sheet

### Disabling for Specific Sessions

To temporarily disable house rules without editing:

1. Set `"enabled": false` in the houserules.json
2. Reload Foundry
3. Switch back to official traits only
4. Re-enable later with `"enabled": true`

## Integration with Character Sheet

House rule traits are stored the same way as official traits:
- Trait ID, name, description, and type
- Variants appear in character sheet flags
- No special handling needed by the character sheet

## Reporting Issues or Suggestions

If you create custom house rules or find issues:

1. Test thoroughly with your group
2. Note which traits work well and which need adjustment
3. Consider the mechanical balance carefully
4. Feel free to remix and modify the provided options

## Example: Creating a Psionic House Rule Trait

```json
{
  "id": "psionicResonance",
  "name": "Psionic Resonance",
  "description": "Natural psionic talent. Gain +2 species bonus to Use the Force (telepathy) and can sense thoughts within 20 squares once per encounter.",
  "type": "force",
  "category": "houserule"
}
```

Then add it to the `traits` array and enable house rules in your campaign!

---

**Questions?** Check the main chargen logs for any trait loading errors when house rules are enabled.

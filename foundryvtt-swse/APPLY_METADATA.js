/**
 * APPLY_METADATA.js
 *
 * Macro to populate archetype metadata for Soldier, Scoundrel, Scout, Noble base classes.
 * Run this macro in a FoundryVTT game world to apply metadata to all feats/talents.
 *
 * Instructions:
 * 1. Create a new Macro in FoundryVTT
 * 2. Paste this entire script
 * 3. Set Type to "Script"
 * 4. Click Execute
 * 5. Check console for progress
 */

const METADATA_ASSIGNMENTS = {
  "soldier": {
    "heavy_weapons_specialist": {
      "talents": [
        { "name": "Autofire Assault", "playstyle": "ranged", "tier": 1 },
        { "name": "Devastating Attack", "playstyle": "ranged", "tier": 1 },
        { "name": "Penetrating Attack", "playstyle": "ranged", "tier": 2 }
      ],
      "feats": [
        { "name": "Burst Fire", "playstyle": "ranged", "tier": 0 },
        { "name": "Autofire Sweep", "playstyle": "ranged", "tier": 1 },
        { "name": "Weapon Focus (Heavy Weapons)", "playstyle": "ranged", "tier": 0 },
        { "name": "Weapon Specialization (Heavy Weapons)", "playstyle": "ranged", "tier": 1 }
      ]
    },
    "armored_shock_trooper": {
      "talents": [
        { "name": "Armor Specialist", "playstyle": "defense", "tier": 1 },
        { "name": "Improved Damage Reduction", "playstyle": "defense", "tier": 2 },
        { "name": "Melee Smash", "playstyle": "melee", "tier": 1 }
      ],
      "feats": [
        { "name": "Armor Proficiency (Heavy)", "playstyle": "defense", "tier": 0 },
        { "name": "Power Attack", "playstyle": "melee", "tier": 1 },
        { "name": "Toughness", "playstyle": "defense", "tier": 0 },
        { "name": "Weapon Focus (Advanced Melee)", "playstyle": "melee", "tier": 0 }
      ]
    },
    "precision_rifleman": {
      "talents": [
        { "name": "Devastating Attack", "playstyle": "ranged", "tier": 1 },
        { "name": "Deadeye", "playstyle": "ranged", "tier": 1 },
        { "name": "Weapon Specialization", "playstyle": "ranged", "tier": 1 }
      ],
      "feats": [
        { "name": "Weapon Focus (Rifles)", "playstyle": "ranged", "tier": 0 },
        { "name": "Improved Critical (Rifles)", "playstyle": "ranged", "tier": 1 },
        { "name": "Careful Shot", "playstyle": "ranged", "tier": 1 }
      ]
    },
    "close_quarters_breacher": {
      "talents": [
        { "name": "Devastating Attack", "playstyle": "melee", "tier": 1 },
        { "name": "Melee Smash", "playstyle": "melee", "tier": 1 },
        { "name": "Assault Tactics", "playstyle": "melee", "tier": 2 }
      ],
      "feats": [
        { "name": "Point Blank Shot", "playstyle": "melee", "tier": 0 },
        { "name": "Rapid Shot", "playstyle": "melee", "tier": 1 },
        { "name": "Weapon Focus (Rifles)", "playstyle": "melee", "tier": 0 }
      ]
    },
    "battlefield_enforcer": {
      "talents": [
        { "name": "Devastating Attack", "playstyle": "melee", "tier": 1 },
        { "name": "Penetrating Attack", "playstyle": "control", "tier": 2 },
        { "name": "Improved Suppression", "playstyle": "control", "tier": 2 }
      ],
      "feats": [
        { "name": "Power Attack", "playstyle": "melee", "tier": 1 },
        { "name": "Weapon Focus (Advanced Melee)", "playstyle": "melee", "tier": 0 },
        { "name": "Improved Trip", "playstyle": "control", "tier": 1 }
      ]
    }
  },
  "scoundrel": {
    "opportunistic_precision_striker": {
      "talents": [
        { "name": "Sneak Attack", "playstyle": "ranged", "tier": 0 },
        { "name": "Dastardly Strike", "playstyle": "ranged", "tier": 1 },
        { "name": "Hidden Movement", "playstyle": "ranged", "tier": 1 }
      ],
      "feats": [
        { "name": "Point Blank Shot", "playstyle": "ranged", "tier": 0 },
        { "name": "Precise Shot", "playstyle": "ranged", "tier": 1 },
        { "name": "Improved Critical (Pistols)", "playstyle": "ranged", "tier": 1 }
      ]
    },
    "debilitating_trickster": {
      "talents": [
        { "name": "Dastardly Strike", "playstyle": "control", "tier": 1 },
        { "name": "Sneak Attack", "playstyle": "ranged", "tier": 0 },
        { "name": "Improved Feint", "playstyle": "control", "tier": 2 }
      ],
      "feats": [
        { "name": "Skill Focus (Deception)", "playstyle": "support", "tier": 0 },
        { "name": "Weapon Focus (Pistols)", "playstyle": "ranged", "tier": 0 }
      ]
    },
    "gunslinger_duelist": {
      "talents": [
        { "name": "Deadeye", "playstyle": "ranged", "tier": 1 },
        { "name": "Sneak Attack", "playstyle": "ranged", "tier": 0 },
        { "name": "Lucky Shot", "playstyle": "ranged", "tier": 1 }
      ],
      "feats": [
        { "name": "Weapon Focus (Pistols)", "playstyle": "ranged", "tier": 0 },
        { "name": "Improved Critical (Pistols)", "playstyle": "ranged", "tier": 1 },
        { "name": "Rapid Shot", "playstyle": "ranged", "tier": 1 }
      ]
    },
    "social_manipulator": {
      "talents": [
        { "name": "Skilled Advisor", "playstyle": "support", "tier": 0 },
        { "name": "Connections", "playstyle": "utility", "tier": 1 },
        { "name": "Trustworthy", "playstyle": "support", "tier": 1 }
      ],
      "feats": [
        { "name": "Skill Focus (Persuasion)", "playstyle": "support", "tier": 0 },
        { "name": "Skill Focus (Deception)", "playstyle": "support", "tier": 0 }
      ]
    },
    "saboteur_technician": {
      "talents": [
        { "name": "Tech Specialist", "playstyle": "utility", "tier": 1 },
        { "name": "Sabotage", "playstyle": "utility", "tier": 2 },
        { "name": "Skilled Advisor", "playstyle": "utility", "tier": 0 }
      ],
      "feats": [
        { "name": "Skill Focus (Mechanics)", "playstyle": "utility", "tier": 0 },
        { "name": "Gearhead", "playstyle": "utility", "tier": 1 }
      ]
    }
  },
  "scout": {
    "mobile_skirmisher": {
      "talents": [
        { "name": "Skirmisher", "playstyle": "melee", "tier": 0 },
        { "name": "Evasion", "playstyle": "defense", "tier": 1 },
        { "name": "Improved Initiative", "playstyle": "utility", "tier": 0 }
      ],
      "feats": [
        { "name": "Running Attack", "playstyle": "melee", "tier": 1 },
        { "name": "Point Blank Shot", "playstyle": "ranged", "tier": 0 },
        { "name": "Weapon Focus (Rifles)", "playstyle": "ranged", "tier": 0 }
      ]
    },
    "wilderness_survivalist": {
      "talents": [
        { "name": "Acute Senses", "playstyle": "utility", "tier": 0 },
        { "name": "Improved Initiative", "playstyle": "utility", "tier": 0 },
        { "name": "Evasion", "playstyle": "defense", "tier": 1 }
      ],
      "feats": [
        { "name": "Skill Focus (Survival)", "playstyle": "utility", "tier": 0 },
        { "name": "Skill Focus (Perception)", "playstyle": "utility", "tier": 0 }
      ]
    },
    "recon_sniper": {
      "talents": [
        { "name": "Skirmisher", "playstyle": "melee", "tier": 0 },
        { "name": "Acute Senses", "playstyle": "utility", "tier": 0 },
        { "name": "Improved Stealth", "playstyle": "utility", "tier": 1 }
      ],
      "feats": [
        { "name": "Weapon Focus (Rifles)", "playstyle": "ranged", "tier": 0 },
        { "name": "Improved Critical (Rifles)", "playstyle": "ranged", "tier": 1 },
        { "name": "Careful Shot", "playstyle": "ranged", "tier": 1 }
      ]
    },
    "condition_harrier": {
      "talents": [
        { "name": "Skirmisher", "playstyle": "melee", "tier": 0 },
        { "name": "Improved Initiative", "playstyle": "utility", "tier": 0 },
        { "name": "Evasion", "playstyle": "defense", "tier": 1 }
      ],
      "feats": [
        { "name": "Running Attack", "playstyle": "melee", "tier": 1 },
        { "name": "Weapon Focus (Rifles)", "playstyle": "ranged", "tier": 0 },
        { "name": "Rapid Shot", "playstyle": "ranged", "tier": 1 }
      ]
    },
    "pilot_operative": {
      "talents": [
        { "name": "Evasion", "playstyle": "defense", "tier": 1 },
        { "name": "Improved Initiative", "playstyle": "utility", "tier": 0 },
        { "name": "Vehicular Combat", "playstyle": "utility", "tier": 1 }
      ],
      "feats": [
        { "name": "Skill Focus (Pilot)", "playstyle": "utility", "tier": 0 },
        { "name": "Vehicular Combat", "playstyle": "utility", "tier": 1 }
      ]
    }
  },
  "noble": {
    "battlefield_commander": {
      "talents": [
        { "name": "Inspire Confidence", "playstyle": "support", "tier": 0 },
        { "name": "Coordinate", "playstyle": "support", "tier": 1 },
        { "name": "Rally", "playstyle": "support", "tier": 1 }
      ],
      "feats": [
        { "name": "Skill Focus (Persuasion)", "playstyle": "support", "tier": 0 },
        { "name": "Improved Initiative", "playstyle": "utility", "tier": 0 }
      ]
    },
    "master_orator": {
      "talents": [
        { "name": "Demand Surrender", "playstyle": "support", "tier": 2 },
        { "name": "Inspire Confidence", "playstyle": "support", "tier": 0 },
        { "name": "Trustworthy", "playstyle": "support", "tier": 1 }
      ],
      "feats": [
        { "name": "Skill Focus (Persuasion)", "playstyle": "support", "tier": 0 },
        { "name": "Skill Focus (Deception)", "playstyle": "support", "tier": 0 }
      ]
    },
    "tactical_coordinator": {
      "talents": [
        { "name": "Coordinate", "playstyle": "support", "tier": 1 },
        { "name": "Born Leader", "playstyle": "support", "tier": 1 },
        { "name": "Inspire Confidence", "playstyle": "support", "tier": 0 }
      ],
      "feats": [
        { "name": "Improved Initiative", "playstyle": "utility", "tier": 0 },
        { "name": "Skill Focus (Persuasion)", "playstyle": "support", "tier": 0 }
      ]
    },
    "political_strategist": {
      "talents": [
        { "name": "Connections", "playstyle": "utility", "tier": 1 },
        { "name": "Resource Access", "playstyle": "utility", "tier": 2 },
        { "name": "Trustworthy", "playstyle": "support", "tier": 1 }
      ],
      "feats": [
        { "name": "Skill Focus (Gather Information)", "playstyle": "utility", "tier": 0 },
        { "name": "Skill Focus (Knowledge)", "playstyle": "utility", "tier": 0 }
      ]
    },
    "inspirational_supporter": {
      "talents": [
        { "name": "Inspire Confidence", "playstyle": "support", "tier": 0 },
        { "name": "Rally", "playstyle": "support", "tier": 1 },
        { "name": "Bolster Ally", "playstyle": "support", "tier": 1 }
      ],
      "feats": [
        { "name": "Skill Focus (Persuasion)", "playstyle": "support", "tier": 0 },
        { "name": "Improved Defenses", "playstyle": "defense", "tier": 1 }
      ]
    }
  }
};

async function applyMetadata() {
  let totalUpdated = 0;
  let totalNotFound = 0;
  const results = {
    updated: [],
    notFound: []
  };

  // Iterate through all classes and archetypes
  for (const [className, archetypes] of Object.entries(METADATA_ASSIGNMENTS)) {
    console.log(`\n=== Processing ${className.toUpperCase()} ===`);

    for (const [archetypeId, archetypeData] of Object.entries(archetypes)) {
      console.log(`\nArchetype: ${archetypeId}`);

      // Process talents
      for (const talentData of archetypeData.talents) {
        const talentName = talentData.name;
        const talent = game.items.contents.find(i => i.type === 'talent' && i.name === talentName);

        if (talent) {
          await talent.update({
            'system.archetype': archetypeId,
            'system.playstyle': talentData.playstyle,
            'system.tier': talentData.tier
          });
          results.updated.push(`Talent: ${talentName}`);
          totalUpdated++;
          console.log(`  ✓ Talent: ${talentName} (${talentData.playstyle}, tier ${talentData.tier})`);
        } else {
          results.notFound.push(`Talent: ${talentName}`);
          totalNotFound++;
          console.warn(`  ✗ Talent not found: ${talentName}`);
        }
      }

      // Process feats
      for (const featData of archetypeData.feats) {
        const featName = featData.name;
        const feat = game.items.contents.find(i => i.type === 'feat' && i.name === featName);

        if (feat) {
          await feat.update({
            'system.archetype': archetypeId,
            'system.playstyle': featData.playstyle,
            'system.tier': featData.tier
          });
          results.updated.push(`Feat: ${featName}`);
          totalUpdated++;
          console.log(`  ✓ Feat: ${featName} (${featData.playstyle}, tier ${featData.tier})`);
        } else {
          results.notFound.push(`Feat: ${featName}`);
          totalNotFound++;
          console.warn(`  ✗ Feat not found: ${featName}`);
        }
      }
    }
  }

  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`SUMMARY:`);
  console.log(`  Total Updated: ${totalUpdated}`);
  console.log(`  Total Not Found: ${totalNotFound}`);
  console.log(`${'='.repeat(50)}`);

  // Return chat message
  const chatMessage = `
    <h2>Metadata Population Complete</h2>
    <p><strong>Updated:</strong> ${totalUpdated} items</p>
    <p><strong>Not Found:</strong> ${totalNotFound} items</p>
    <p>Check console for details.</p>
  `;

  ChatMessage.create({
    content: chatMessage,
    speaker: { alias: "System" }
  });
}

// Execute
applyMetadata();

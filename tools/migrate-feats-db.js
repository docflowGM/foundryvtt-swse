#!/usr/bin/env node

/**
 * Feats Database Migration Script
 * Migrates feats to match data model and adds Active Effects for automation
 */

const fs = require('fs');
const path = require('path');

const FEATS_DB_PATH = path.join(__dirname, '../packs/feats.db');
const BACKUP_PATH = path.join(__dirname, '../packs/feats.db.backup');

/**
 * Determine feat type from name and tags
 */
function determineFeatType(feat) {
  const name = feat.name.toLowerCase();
  const tags = feat.system.tags || [];
  const tagString = tags.join(' ').toLowerCase();

  // Force feats
  if (name.includes('force') || tagString.includes('force')) {
    return 'force';
  }

  // Species feats
  const speciesTerms = ['wookiee', 'twilek', 'rodian', 'human', 'bothan', 'cerean', 'duros', 'ewok',
                         'gamorrean', 'gand', 'gungan', 'ithorian', 'kel dor', 'mon calamari',
                         'quarren', 'sullustan', 'trandoshan', 'zabrak'];
  if (speciesTerms.some(term => name.includes(term) || tagString.includes(term))) {
    return 'species';
  }

  return 'general';
}

/**
 * Create Active Effect for simple skill bonus (goes to miscMod field)
 */
function createSkillBonusEffect(skillName, bonus, featName) {
  // Convert skill name to data model key (e.g., "Perception" -> "perception")
  let skillKey = skillName.toLowerCase().replace(/\s+/g, '');

  // Handle knowledge skills with special naming
  if (skillKey.startsWith('knowledge')) {
    skillKey = skillKey.replace('knowledge', 'knowledge_');
  }

  return {
    name: `${featName}`,
    icon: "icons/svg/upgrade.svg",
    changes: [{
      key: `system.skills.${skillKey}.miscMod`,  // Target miscMod field
      mode: 2,  // ADD
      value: String(bonus),
      priority: 20
    }],
    disabled: false,
    duration: {},
    transfer: true,
    flags: {
      swse: {
        type: "skill-bonus",
        skill: skillName,
        source: featName
      }
    }
  };
}

/**
 * Create Active Effect for defense bonus
 */
function createDefenseBonusEffect(defense, bonus, featName) {
  const defenseKey = defense.toLowerCase();

  return {
    name: `${featName}`,
    icon: "icons/svg/upgrade.svg",
    changes: [{
      key: `system.defenses.${defenseKey}.bonus`,
      mode: 2,  // ADD
      value: String(bonus),
      priority: 20
    }],
    disabled: false,
    duration: {},
    transfer: true,
    flags: {
      swse: {
        type: "defense-bonus",
        defense: defense
      }
    }
  };
}

/**
 * Create Active Effect for attack bonus
 */
function createAttackBonusEffect(weaponGroup, bonus, featName) {
  return {
    name: `${featName}`,
    icon: "icons/svg/upgrade.svg",
    changes: [{
      key: `system.attackBonus.${weaponGroup}`,
      mode: 2,  // ADD
      value: String(bonus),
      priority: 20
    }],
    disabled: false,
    duration: {},
    transfer: true,
    flags: {
      swse: {
        type: "attack-bonus",
        weaponGroup: weaponGroup
      }
    }
  };
}

/**
 * Create Active Effect for hit point bonus
 */
function createHitPointBonusEffect(bonus, perLevel, featName) {
  const key = perLevel ? "system.hitPoints.bonusPerLevel" : "system.hitPoints.bonus";

  return {
    name: `${featName}`,
    icon: "icons/svg/upgrade.svg",
    changes: [{
      key: key,
      mode: 2,  // ADD
      value: String(bonus),
      priority: 20
    }],
    disabled: false,
    duration: {},
    transfer: true,
    flags: {
      swse: {
        type: "hit-points",
        perLevel: perLevel
      }
    }
  };
}

/**
 * Get Active Effects for a feat based on its name
 */
function getAutomatedEffects(feat) {
  const name = feat.name;
  const effects = [];

  // Skill Focus - +5 to a specific skill
  if (name.startsWith("Skill Focus")) {
    // Note: Would need to be configured per-character for specific skill
    // This is a template - actual implementation would need skill selection
    effects.push(createSkillBonusEffect("perception", 5, name));
  }

  // Weapon Focus - +1 to attack with weapon group
  else if (name === "Weapon Focus") {
    // Template - would need weapon group selection
    effects.push(createAttackBonusEffect("rifles", 1, name));
  }

  // Greater Weapon Focus - +1 to attack (stacks with Weapon Focus)
  else if (name === "Greater Weapon Focus") {
    effects.push(createAttackBonusEffect("rifles", 1, name));
  }

  // Dodge - +1 to Reflex Defense
  else if (name === "Dodge") {
    effects.push(createDefenseBonusEffect("reflex", 1, name));
  }

  // Improved Defenses - +1 to all defenses
  else if (name === "Improved Defenses") {
    effects.push(createDefenseBonusEffect("reflex", 1, name));
    effects.push(createDefenseBonusEffect("fortitude", 1, name));
    effects.push(createDefenseBonusEffect("will", 1, name));
  }

  // Great Fortitude - +2 to Fortitude Defense
  else if (name === "Great Fortitude") {
    effects.push(createDefenseBonusEffect("fortitude", 2, name));
  }

  // Iron Will - +2 to Will Defense
  else if (name === "Iron Will") {
    effects.push(createDefenseBonusEffect("will", 2, name));
  }

  // Lightning Reflexes - +2 to Reflex Defense
  else if (name === "Lightning Reflexes") {
    effects.push(createDefenseBonusEffect("reflex", 2, name));
  }

  // Toughness - +5 HP per level
  else if (name === "Toughness") {
    effects.push(createHitPointBonusEffect(5, true, name));
  }

  // Improved Damage Threshold - +5 to Damage Threshold
  else if (name === "Improved Damage Threshold") {
    effects.push({
      name: name,
      icon: "icons/svg/upgrade.svg",
      changes: [{
        key: "system.damageThreshold",
        mode: 2,
        value: "5",
        priority: 20
      }],
      transfer: true
    });
  }

  // Linguist - +5 to Deception and Persuasion
  else if (name === "Linguist") {
    effects.push(createSkillBonusEffect("deception", 5, name));
    effects.push(createSkillBonusEffect("persuasion", 5, name));
  }

  // Sharp-Eyed - +5 to Perception and Survival
  else if (name === "Sharp-Eyed") {
    effects.push(createSkillBonusEffect("perception", 5, name));
    effects.push(createSkillBonusEffect("survival", 5, name));
  }

  // Educated - +5 to two Knowledge skills
  else if (name === "Educated") {
    effects.push(createSkillBonusEffect("knowledgegalactichistory", 5, name));
    effects.push(createSkillBonusEffect("knowledgesocialsciences", 5, name));
  }

  // Point Blank Shot - +1 to attack and damage within 6 squares
  else if (name === "Point Blank Shot") {
    effects.push({
      name: name,
      icon: "icons/svg/upgrade.svg",
      changes: [
        {
          key: "system.attackBonus.ranged",
          mode: 2,
          value: "1",
          priority: 20
        },
        {
          key: "system.damageBonus.ranged",
          mode: 2,
          value: "1",
          priority: 20
        }
      ],
      transfer: true,
      flags: {
        swse: {
          type: "conditional",
          condition: "within 6 squares"
        }
      }
    });
  }

  // Mobility - +2 to Reflex Defense vs attacks of opportunity
  else if (name === "Mobility") {
    effects.push({
      name: name,
      icon: "icons/svg/upgrade.svg",
      changes: [{
        key: "system.defenses.reflex.bonus",
        mode: 2,
        value: "2",
        priority: 20
      }],
      transfer: true,
      flags: {
        swse: {
          type: "conditional",
          condition: "vs attacks of opportunity"
        }
      }
    });
  }

  return effects;
}

/**
 * Migrate a single feat
 */
function migrateFeat(feat) {
  const old = feat.system || {};

  // Determine feat type
  const featType = determineFeatType(feat);

  // Build new system structure
  const newSystem = {
    featType: featType,

    // Rename description to benefit (data model expects benefit)
    benefit: old.description || old.benefit || "",

    prerequisite: old.prerequisite || "",
    special: old.special || "",
    normalText: old.normalText || "",

    // Preserve existing fields
    sourcebook: old.sourcebook || "",
    page: old.page || null,
    tags: old.tags || [],
    bonus_feat_for: old.bonus_feat_for || [],

    // Uses tracking
    uses: old.uses || {
      current: 0,
      max: 0,
      perDay: false
    }
  };

  // Get automated effects for this feat
  const effects = getAutomatedEffects(feat);

  return {
    _id: feat._id,
    name: feat.name,
    type: "feat",
    img: feat.img || "icons/svg/upgrade.svg",
    system: newSystem,
    effects: effects,
    folder: feat.folder || null,
    sort: feat.sort || 0,
    ownership: feat.ownership || { default: 0 },
    flags: feat.flags || {}
  };
}

/**
 * Main migration function
 */
async function migrateFeats() {
  console.log('📜 Starting Feats migration...\n');

  // 1. Backup
  console.log('📦 Creating backup...');
  fs.copyFileSync(FEATS_DB_PATH, BACKUP_PATH);
  console.log(`✅ Backup created: ${BACKUP_PATH}\n`);

  // 2. Read feats
  console.log('📖 Reading feats.db...');
  const content = fs.readFileSync(FEATS_DB_PATH, 'utf8');
  const lines = content.trim().split('\n');
  console.log(`✅ Found ${lines.length} feats\n`);

  // 3. Migrate
  console.log('🔄 Migrating feats...');
  const migratedFeats = [];
  let automatedCount = 0;

  for (const line of lines) {
    try {
      const feat = JSON.parse(line);
      const migrated = migrateFeat(feat);
      migratedFeats.push(migrated);

      if (migrated.effects && migrated.effects.length > 0) {
        automatedCount++;
        console.log(`  ⚡ ${feat.name} (${migrated.effects.length} effect${migrated.effects.length > 1 ? 's' : ''})`);
      }
    } catch (error) {
      console.error(`❌ Error migrating feat:`, error.message);
    }
  }

  console.log(`\n✅ Migration complete: ${automatedCount} feats with automated effects\n`);

  // 4. Write
  console.log('💾 Writing migrated data...');
  const output = migratedFeats.map(f => JSON.stringify(f)).join('\n') + '\n';
  fs.writeFileSync(FEATS_DB_PATH, output, 'utf8');
  console.log(`✅ Wrote ${migratedFeats.length} feats\n`);

  // 5. Report
  console.log('📊 Migration Report:');
  console.log('═══════════════════════════════════════');
  console.log(`Total feats: ${lines.length}`);
  console.log(`Feats with automated effects: ${automatedCount}`);
  console.log(`Feats without automation: ${lines.length - automatedCount}`);
  console.log(`Backup location: ${BACKUP_PATH}`);
  console.log('═══════════════════════════════════════\n');

  // 6. Feat type breakdown
  const typeBreakdown = {};
  migratedFeats.forEach(f => {
    typeBreakdown[f.system.featType] = (typeBreakdown[f.system.featType] || 0) + 1;
  });

  console.log('📋 Feat Types:');
  Object.entries(typeBreakdown).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  console.log();

  // 7. Sample
  const sampleFeat = migratedFeats.find(f => f.effects && f.effects.length > 0);
  if (sampleFeat) {
    console.log('🔍 Sample Automated Feat:');
    console.log(JSON.stringify(sampleFeat, null, 2).substring(0, 1000) + '...\n');
  }

  console.log('✨ Feats migration complete!\n');
}

// Run migration
migrateFeats().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});

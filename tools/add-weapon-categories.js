#!/usr/bin/env node

/**
 * Add weapon categories and proficiency fields to weapons.db
 * Adds:
 * - weaponCategory: "melee" or "ranged"
 * - proficiency: weapon proficiency required
 */

const fs = require('fs');
const path = require('path');

const WEAPONS_DB = path.join(__dirname, '..', 'packs', 'weapons.db');

/**
 * Determine weapon category and proficiency based on weapon properties
 */
function getWeaponMetadata(weapon) {
    const name = weapon.name || '';
    const range = weapon.system?.range || '';
    const properties = weapon.system?.properties || [];
    const attackAttr = weapon.system?.attackAttribute || 'str';

    // Determine if melee or ranged
    let weaponCategory = 'ranged';
    if (range.toLowerCase() === 'melee' ||
        (range.match(/^[2-3]\s*squares?$/i) && attackAttr === 'str')) {
        weaponCategory = 'melee';
    }

    // Determine proficiency
    let proficiency = 'simple';

    if (weaponCategory === 'melee') {
        // MELEE WEAPONS
        if (properties.includes('Exotic') || properties.includes('Lightsaber')) {
            proficiency = 'exotic';
        } else if (name.toLowerCase().includes('vibro') ||
                   name.toLowerCase().includes('cortosis') ||
                   name.toLowerCase().includes('electro') ||
                   name.toLowerCase().includes('sith') ||
                   name.toLowerCase().includes('wookiee') ||
                   name.toLowerCase().includes('zabrak') ||
                   name.toLowerCase().includes('gungan')) {
            proficiency = 'advanced-melee';
        } else {
            // Simple melee: basic swords, knives, staves, batons
            proficiency = 'simple';
        }
    } else {
        // RANGED WEAPONS
        if (properties.includes('Exotic')) {
            proficiency = 'exotic';
        } else if (name.toLowerCase().includes('grenade') ||
                   name.toLowerCase().includes('detonator')) {
            proficiency = 'simple'; // Grenades are simple weapons
        } else if (name.toLowerCase().includes('pistol') ||
                   name.toLowerCase().includes('hold-out')) {
            proficiency = 'pistols';
        } else if (name.toLowerCase().includes('rifle') ||
                   name.toLowerCase().includes('carbine') ||
                   name.toLowerCase().includes('bowcaster') ||
                   name.toLowerCase().includes('charric')) {
            proficiency = 'rifles';
        } else if (name.toLowerCase().includes('cannon') ||
                   name.toLowerCase().includes('launcher') ||
                   name.toLowerCase().includes('repeating')) {
            proficiency = 'heavy-weapons';
        } else if (range.match(/^([5-9]|10)\s*squares?$/i)) {
            // Short range special weapons
            proficiency = 'pistols';
        } else {
            proficiency = 'rifles';
        }
    }

    return { weaponCategory, proficiency };
}

/**
 * Get display-friendly subcategory for store organization
 */
function getSubcategory(weapon, weaponCategory, proficiency) {
    if (weaponCategory === 'melee') {
        if (proficiency === 'exotic') {
            return 'exotic';
        } else if (proficiency === 'advanced-melee') {
            return 'advanced';
        } else {
            return 'simple';
        }
    } else {
        // Ranged
        if (proficiency === 'exotic') {
            return 'exotic';
        } else if (proficiency === 'simple') {
            return 'simple'; // Grenades
        } else if (proficiency === 'pistols') {
            return 'pistols';
        } else if (proficiency === 'rifles') {
            return 'rifles';
        } else if (proficiency === 'heavy-weapons') {
            return 'heavy';
        } else {
            return 'other';
        }
    }
}

// Read the database
const data = fs.readFileSync(WEAPONS_DB, 'utf8');
const lines = data.split('\n').filter(line => line.trim());

swseLogger.log(`Processing ${lines.length} weapons...`);

const updatedLines = lines.map(line => {
    try {
        const weapon = JSON.parse(line);

        const { weaponCategory, proficiency } = getWeaponMetadata(weapon);
        const subcategory = getSubcategory(weapon, weaponCategory, proficiency);

        // Add new fields to system
        weapon.system.weaponCategory = weaponCategory;
        weapon.system.proficiency = proficiency;
        weapon.system.subcategory = subcategory;

        swseLogger.log(`  ${weapon.name.padEnd(35)} | ${weaponCategory.padEnd(7)} | ${proficiency.padEnd(20)} | ${subcategory}`);

        return JSON.stringify(weapon);
    } catch (err) {
        swseLogger.error('Error processing line:', err.message);
        return line;
    }
});

// Write back to database
fs.writeFileSync(WEAPONS_DB, updatedLines.join('\n') + '\n', 'utf8');

swseLogger.log('\n✓ Successfully updated weapons.db with category and proficiency data');

// Summary
const summary = {
    melee: { simple: 0, advanced: 0, exotic: 0 },
    ranged: { simple: 0, pistols: 0, rifles: 0, heavy: 0, exotic: 0 }
};

updatedLines.forEach(line => {
    try {
        const weapon = JSON.parse(line);
        const cat = weapon.system.weaponCategory;
        const sub = weapon.system.subcategory;
        if (cat === 'melee') {
            summary.melee[sub]++;
        } else {
            summary.ranged[sub]++;
        }
    } catch (err) {}
});

swseLogger.log('\nSummary:');
swseLogger.log('  Melee Weapons:');
swseLogger.log(`    - Simple: ${summary.melee.simple}`);
swseLogger.log(`    - Advanced: ${summary.melee.advanced}`);
swseLogger.log(`    - Exotic: ${summary.melee.exotic}`);
swseLogger.log('  Ranged Weapons:');
swseLogger.log(`    - Simple (Grenades): ${summary.ranged.simple}`);
swseLogger.log(`    - Pistols: ${summary.ranged.pistols}`);
swseLogger.log(`    - Rifles: ${summary.ranged.rifles}`);
swseLogger.log(`    - Heavy: ${summary.ranged.heavy}`);
swseLogger.log(`    - Exotic: ${summary.ranged.exotic}`);

/**
 * SWSE Class Auto-Grants
 * Defines starting feats and proficiencies automatically granted by each class
 */

export const ClassAutoGrants = {
  'Jedi': [
    'Force Sensitivity',
    'Weapon Proficiency (Lightsabers)',
    'Weapon Proficiency (Simple Weapons)'
  ],
  'Soldier': [
    'Armor Proficiency (Light)',
    'Armor Proficiency (Medium)',
    'Weapon Proficiency (Pistols)',
    'Weapon Proficiency (Rifles)',
    'Weapon Proficiency (Simple Weapons)'
  ],
  'Scout': [
    'Weapon Proficiency (Pistols)',
    'Weapon Proficiency (Rifles)',
    'Weapon Proficiency (Simple Weapons)',
    'Shake It Off*'
  ],
  'Scoundrel': [
    'Point-Blank Shot',
    'Weapon Proficiency (Pistols)',
    'Weapon Proficiency (Simple Weapons)'
  ],
  'Noble': [
    'Linguist*',
    'Weapon Proficiency (Pistols)',
    'Weapon Proficiency (Simple Weapons)'
  ]
};

/**
 * Get auto-granted feats for a class
 * @param {string} className - Name of the class
 * @returns {string[]} - Array of feat names to auto-grant
 */
export function getClassAutoGrants(className) {
  return ClassAutoGrants[className] || [];
}

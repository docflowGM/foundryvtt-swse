/**
 * Custom Item Creation Dialogs
 * Provides detailed dialogs for creating custom items, talents, feats, and force powers
 */

export class CustomItemDialog {

  /**
   * Show dialog for creating a custom weapon
   * @param {Actor} actor - The actor to add the weapon to
   * @returns {Promise<Item|null>}
   */
  static async createWeapon(actor) {
    return new Promise((resolve) => {
      const dialog = new Dialog({
        title: "Create Custom Weapon",
        content: `
          <form class="swse-custom-item-form">
            <div class="form-group">
              <label>Weapon Name:</label>
              <input type="text" name="name" value="Custom Weapon" required/>
            </div>

            <div class="form-group">
              <label>Damage:</label>
              <input type="text" name="damage" value="1d6" placeholder="e.g., 2d8, 3d6"/>
              <small>Examples: 1d6, 2d8, 3d10</small>
            </div>

            <div class="form-group">
              <label>Range/Type:</label>
              <select name="range">
                <option value="Melee">Melee</option>
                <option value="Ranged">Ranged</option>
                <option value="Melee (2-handed)">Melee (2-handed)</option>
                <option value="Thrown">Thrown</option>
              </select>
            </div>

            <div class="form-group">
              <label>Attack Bonus:</label>
              <input type="number" name="attackBonus" value="0" placeholder="Additional attack bonus"/>
            </div>

            <div class="form-group">
              <label>Critical:</label>
              <input type="text" name="critical" value="20" placeholder="e.g., 19-20, 20"/>
            </div>

            <div class="form-group">
              <label>Weight (kg):</label>
              <input type="number" name="weight" value="1" step="0.1"/>
            </div>

            <div class="form-group">
              <label>Cost (credits):</label>
              <input type="number" name="cost" value="0"/>
            </div>

            <div class="form-group">
              <label>Description:</label>
              <textarea name="description" rows="4" placeholder="Describe your weapon..."></textarea>
            </div>

            <div class="form-group">
              <label>Source:</label>
              <input type="text" name="source" value="Homebrew" placeholder="Source book or homebrew"/>
            </div>
          </form>
        `,
        buttons: {
          create: {
            icon: '<i class="fas fa-check"></i>',
            label: "Create Weapon",
            callback: async (html) => {
              const form = html.find('form')[0];
              const formData = new FormDataExtended(form).object;

              const itemData = {
                name: formData.name,
                type: 'weapon',
                img: 'icons/weapons/swords/sword-broad-worn.webp',
                system: {
                  damage: formData.damage,
                  range: formData.range,
                  attackBonus: parseInt(formData.attackBonus) || 0,
                  critical: formData.critical,
                  weight: parseFloat(formData.weight) || 0,
                  cost: parseInt(formData.cost) || 0,
                  description: formData.description,
                  source: formData.source,
                  equipped: false
                }
              };

              const created = await actor.createEmbeddedDocuments('Item', [itemData]);
              resolve(created[0]);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "create",
        close: () => resolve(null)
      }, {
        classes: ['swse', 'dialog', 'custom-item-dialog'],
        width: 500
      });

      dialog.render(true);
    });
  }

  /**
   * Show dialog for creating custom armor
   * @param {Actor} actor - The actor to add the armor to
   * @returns {Promise<Item|null>}
   */
  static async createArmor(actor) {
    return new Promise((resolve) => {
      const dialog = new Dialog({
        title: "Create Custom Armor",
        content: `
          <form class="swse-custom-item-form">
            <div class="form-group">
              <label>Armor Name:</label>
              <input type="text" name="name" value="Custom Armor" required/>
            </div>

            <div class="form-group">
              <label>Armor Type:</label>
              <select name="armorType">
                <option value="light">Light Armor</option>
                <option value="medium">Medium Armor</option>
                <option value="heavy">Heavy Armor</option>
              </select>
            </div>

            <div class="form-group">
              <label>Reflex Defense Bonus:</label>
              <input type="number" name="reflexBonus" value="0" placeholder="Bonus to Reflex Defense"/>
            </div>

            <div class="form-group">
              <label>Max Dexterity Bonus:</label>
              <input type="number" name="maxDex" value="999" placeholder="Maximum Dex bonus allowed"/>
              <small>Light: usually 999, Medium: 2-5, Heavy: 0-2</small>
            </div>

            <div class="form-group">
              <label>Armor Check Penalty:</label>
              <input type="number" name="checkPenalty" value="0" placeholder="Penalty to STR/DEX checks"/>
            </div>

            <div class="form-group">
              <label>Weight (kg):</label>
              <input type="number" name="weight" value="5" step="0.1"/>
            </div>

            <div class="form-group">
              <label>Cost (credits):</label>
              <input type="number" name="cost" value="0"/>
            </div>

            <div class="form-group">
              <label>Description:</label>
              <textarea name="description" rows="4" placeholder="Describe your armor..."></textarea>
            </div>

            <div class="form-group">
              <label>Source:</label>
              <input type="text" name="source" value="Homebrew" placeholder="Source book or homebrew"/>
            </div>
          </form>
        `,
        buttons: {
          create: {
            icon: '<i class="fas fa-check"></i>',
            label: "Create Armor",
            callback: async (html) => {
              const form = html.find('form')[0];
              const formData = new FormDataExtended(form).object;

              const itemData = {
                name: formData.name,
                type: 'armor',
                img: 'icons/equipment/chest/breastplate-cuirass-steel.webp',
                system: {
                  armorType: formData.armorType,
                  reflexBonus: parseInt(formData.reflexBonus) || 0,
                  maxDex: parseInt(formData.maxDex) || 999,
                  checkPenalty: parseInt(formData.checkPenalty) || 0,
                  weight: parseFloat(formData.weight) || 0,
                  cost: parseInt(formData.cost) || 0,
                  description: formData.description,
                  source: formData.source,
                  equipped: false
                }
              };

              const created = await actor.createEmbeddedDocuments('Item', [itemData]);
              resolve(created[0]);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "create",
        close: () => resolve(null)
      }, {
        classes: ['swse', 'dialog', 'custom-item-dialog'],
        width: 500
      });

      dialog.render(true);
    });
  }

  /**
   * Show dialog for creating custom equipment
   * @param {Actor} actor - The actor to add the equipment to
   * @returns {Promise<Item|null>}
   */
  static async createEquipment(actor) {
    return new Promise((resolve) => {
      const dialog = new Dialog({
        title: "Create Custom Equipment",
        content: `
          <form class="swse-custom-item-form">
            <div class="form-group">
              <label>Equipment Name:</label>
              <input type="text" name="name" value="Custom Item" required/>
            </div>

            <div class="form-group">
              <label>Quantity:</label>
              <input type="number" name="quantity" value="1" min="1"/>
            </div>

            <div class="form-group">
              <label>Weight (kg):</label>
              <input type="number" name="weight" value="0" step="0.1"/>
            </div>

            <div class="form-group">
              <label>Cost (credits):</label>
              <input type="number" name="cost" value="0"/>
            </div>

            <div class="form-group">
              <label>Description:</label>
              <textarea name="description" rows="4" placeholder="Describe your equipment..."></textarea>
            </div>

            <div class="form-group">
              <label>Source:</label>
              <input type="text" name="source" value="Homebrew" placeholder="Source book or homebrew"/>
            </div>
          </form>
        `,
        buttons: {
          create: {
            icon: '<i class="fas fa-check"></i>',
            label: "Create Equipment",
            callback: async (html) => {
              const form = html.find('form')[0];
              const formData = new FormDataExtended(form).object;

              const itemData = {
                name: formData.name,
                type: 'equipment',
                img: 'icons/sundries/misc/pouch-simple-leather-brown.webp',
                system: {
                  quantity: parseInt(formData.quantity) || 1,
                  weight: parseFloat(formData.weight) || 0,
                  cost: parseInt(formData.cost) || 0,
                  description: formData.description,
                  source: formData.source
                }
              };

              const created = await actor.createEmbeddedDocuments('Item', [itemData]);
              resolve(created[0]);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "create",
        close: () => resolve(null)
      }, {
        classes: ['swse', 'dialog', 'custom-item-dialog'],
        width: 500
      });

      dialog.render(true);
    });
  }

  /**
   * Show dialog for creating a custom feat
   * @param {Actor} actor - The actor to add the feat to
   * @returns {Promise<Item|null>}
   */
  static async createFeat(actor) {
    return new Promise((resolve) => {
      const dialog = new Dialog({
        title: "Create Custom Feat",
        content: `
          <form class="swse-custom-item-form">
            <div class="form-group">
              <label>Feat Name:</label>
              <input type="text" name="name" value="Custom Feat" required/>
            </div>

            <div class="form-group">
              <label>Prerequisites:</label>
              <textarea name="prerequisites" rows="2" placeholder="e.g., Base Attack Bonus +1, Proficiency (Rifles)"></textarea>
            </div>

            <div class="form-group">
              <label>Benefit/Effect:</label>
              <textarea name="description" rows="5" placeholder="Describe what this feat does..."></textarea>
            </div>

            <div class="form-group">
              <label>Source:</label>
              <input type="text" name="source" value="Homebrew" placeholder="Source book or homebrew"/>
            </div>
          </form>
        `,
        buttons: {
          create: {
            icon: '<i class="fas fa-check"></i>',
            label: "Create Feat",
            callback: async (html) => {
              const form = html.find('form')[0];
              const formData = new FormDataExtended(form).object;

              const itemData = {
                name: formData.name,
                type: 'feat',
                img: 'icons/sundries/scrolls/scroll-bound-ruby-red.webp',
                system: {
                  prerequisites: formData.prerequisites,
                  description: formData.description,
                  source: formData.source
                }
              };

              const created = await actor.createEmbeddedDocuments('Item', [itemData]);
              resolve(created[0]);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "create",
        close: () => resolve(null)
      }, {
        classes: ['swse', 'dialog', 'custom-item-dialog'],
        width: 500
      });

      dialog.render(true);
    });
  }

  /**
   * Show dialog for creating a custom talent
   * @param {Actor} actor - The actor to add the talent to
   * @returns {Promise<Item|null>}
   */
  static async createTalent(actor) {
    return new Promise((resolve) => {
      const dialog = new Dialog({
        title: "Create Custom Talent",
        content: `
          <form class="swse-custom-item-form">
            <div class="form-group">
              <label>Talent Name:</label>
              <input type="text" name="name" value="Custom Talent" required/>
            </div>

            <div class="form-group">
              <label>Talent Tree:</label>
              <input type="text" name="tree" value="Custom" placeholder="e.g., Force Training, Pilot"/>
            </div>

            <div class="form-group">
              <label>Prerequisites:</label>
              <textarea name="prerequisites" rows="2" placeholder="Previous talents required in tree"></textarea>
            </div>

            <div class="form-group">
              <label>Benefit/Effect:</label>
              <textarea name="description" rows="5" placeholder="Describe what this talent does..."></textarea>
            </div>

            <div class="form-group">
              <label>Source:</label>
              <input type="text" name="source" value="Homebrew" placeholder="Source book or homebrew"/>
            </div>
          </form>
        `,
        buttons: {
          create: {
            icon: '<i class="fas fa-check"></i>',
            label: "Create Talent",
            callback: async (html) => {
              const form = html.find('form')[0];
              const formData = new FormDataExtended(form).object;

              const itemData = {
                name: formData.name,
                type: 'talent',
                img: 'icons/magic/symbols/runes-star-pentagon-orange.webp',
                system: {
                  tree: formData.tree,
                  prerequisites: formData.prerequisites,
                  description: formData.description,
                  source: formData.source
                }
              };

              const created = await actor.createEmbeddedDocuments('Item', [itemData]);
              resolve(created[0]);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "create",
        close: () => resolve(null)
      }, {
        classes: ['swse', 'dialog', 'custom-item-dialog'],
        width: 500
      });

      dialog.render(true);
    });
  }

  /**
   * Show dialog for creating a custom force power
   * @param {Actor} actor - The actor to add the force power to
   * @returns {Promise<Item|null>}
   */
  static async createForcePower(actor) {
    return new Promise((resolve) => {
      const dialog = new Dialog({
        title: "Create Custom Force Power",
        content: `
          <form class="swse-custom-item-form">
            <div class="form-group">
              <label>Force Power Name:</label>
              <input type="text" name="name" value="Custom Force Power" required/>
            </div>

            <div class="form-group">
              <label>Power Level:</label>
              <select name="level">
                <option value="0">0 (At-Will)</option>
                <option value="1" selected>1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>
            </div>

            <div class="form-group">
              <label>Action Type:</label>
              <select name="actionType">
                <option value="Swift">Swift Action</option>
                <option value="Move">Move Action</option>
                <option value="Standard" selected>Standard Action</option>
                <option value="Full-Round">Full-Round Action</option>
                <option value="Reaction">Reaction</option>
                <option value="Free">Free Action</option>
              </select>
            </div>

            <div class="form-group">
              <label>Force Point Cost:</label>
              <input type="number" name="forcePointCost" value="0" min="0" placeholder="Force points to use"/>
            </div>

            <div class="form-group">
              <label>Uses per Day:</label>
              <input type="number" name="usesMax" value="99" min="1" placeholder="Maximum uses"/>
              <small>Leave at 99 for unlimited</small>
            </div>

            <div class="form-group">
              <label>Dark Side Power:</label>
              <input type="checkbox" name="darkSide"/>
              <small>Check if this is a Dark Side power</small>
            </div>

            <div class="form-group">
              <label>Prerequisites:</label>
              <textarea name="prerequisites" rows="2" placeholder="e.g., Force Sensitivity, Trained in Use the Force"></textarea>
            </div>

            <div class="form-group">
              <label>Effect:</label>
              <textarea name="description" rows="5" placeholder="Describe what this Force power does..."></textarea>
            </div>

            <div class="form-group">
              <label>Source:</label>
              <input type="text" name="source" value="Homebrew" placeholder="Source book or homebrew"/>
            </div>
          </form>
        `,
        buttons: {
          create: {
            icon: '<i class="fas fa-check"></i>',
            label: "Create Force Power",
            callback: async (html) => {
              const form = html.find('form')[0];
              const formData = new FormDataExtended(form).object;

              const itemData = {
                name: formData.name,
                type: 'forcepower',
                img: 'icons/magic/light/orb-lightbulb-gray.webp',
                system: {
                  level: parseInt(formData.level) || 1,
                  actionType: formData.actionType,
                  forcePointCost: parseInt(formData.forcePointCost) || 0,
                  darkSide: formData.darkSide === 'on',
                  prerequisites: formData.prerequisites,
                  uses: {
                    current: parseInt(formData.usesMax) || 99,
                    max: parseInt(formData.usesMax) || 99
                  },
                  description: formData.description,
                  source: formData.source
                }
              };

              const created = await actor.createEmbeddedDocuments('Item', [itemData]);
              resolve(created[0]);
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => resolve(null)
          }
        },
        default: "create",
        close: () => resolve(null)
      }, {
        classes: ['swse', 'dialog', 'custom-item-dialog'],
        width: 500
      });

      dialog.render(true);
    });
  }

  /**
   * Main dispatcher - shows appropriate dialog based on item type
   * @param {Actor} actor - The actor to add the item to
   * @param {string} type - The type of item to create
   * @returns {Promise<Item|null>}
   */
  static async create(actor, type) {
    switch(type) {
      case 'weapon':
        return this.createWeapon(actor);
      case 'armor':
        return this.createArmor(actor);
      case 'equipment':
        return this.createEquipment(actor);
      case 'feat':
        return this.createFeat(actor);
      case 'talent':
        return this.createTalent(actor);
      case 'forcepower':
      case 'force-power':
        return this.createForcePower(actor);
      default:
        ui.notifications.warn(`No custom dialog available for type: ${type}`);
        return null;
    }
  }
}

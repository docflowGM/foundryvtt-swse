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
      const dialog = new SWSEDialogV2({
        title: 'Create Custom Weapon',
        content: `
          <form class="swse-custom-item-form">
            <div class="form-group">
              <label>Weapon Name:</label>
              <input type="text" name="name" value="Custom Weapon" required/>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Damage:</label>
                <input type="text" name="damage" value="1d8" placeholder="e.g., 2d8, 3d6"/>
              </div>

              <div class="form-group">
                <label>Damage Type:</label>
                <select name="damageType">
                  <option value="energy" selected>Energy</option>
                  <option value="kinetic">Kinetic</option>
                  <option value="ion">Ion</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Range/Type:</label>
                <select name="range">
                  <option value="melee" selected>Melee</option>
                  <option value="ranged">Ranged</option>
                  <option value="thrown">Thrown</option>
                </select>
              </div>

              <div class="form-group">
                <label>Attack Attribute:</label>
                <select name="attackAttribute">
                  <option value="str" selected>Strength</option>
                  <option value="dex">Dexterity</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Attack Bonus:</label>
                <input type="number" name="attackBonus" value="0" placeholder="Additional attack bonus"/>
              </div>

              <div class="form-group">
                <label>Weight (kg):</label>
                <input type="number" name="weight" value="1" step="0.1"/>
              </div>

              <div class="form-group">
                <label>Cost (credits):</label>
                <input type="number" name="cost" value="0"/>
              </div>
            </div>

            <div class="form-group">
              <label>Special Properties (comma-separated):</label>
              <input type="text" name="properties" placeholder="e.g., Stun, Accurate, Autofire"/>
              <small>Separate multiple properties with commas</small>
            </div>

            <div class="form-group">
              <label>Ammunition:</label>
              <div class="form-row">
                <div class="form-group">
                  <label>Type:</label>
                  <input type="text" name="ammoType" placeholder="e.g., Power Pack, Slugs" value="none"/>
                </div>
                <div class="form-group">
                  <label>Current:</label>
                  <input type="number" name="ammoCurrent" value="0" min="0"/>
                </div>
                <div class="form-group">
                  <label>Max:</label>
                  <input type="number" name="ammoMax" value="0" min="0"/>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>Upgrade Slots:</label>
              <input type="number" name="upgradeSlots" value="1" min="0"/>
            </div>

            <div class="form-group">
              <label>Description:</label>
              <textarea name="description" rows="4" placeholder="Describe your weapon..."></textarea>
            </div>
          </form>
        `,
        buttons: {
          create: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: 'Create Weapon',
            callback: async (html) => {
              const root = html instanceof HTMLElement ? html : html?.[0];
              const form = root?.querySelector?.('form');
              const formData = new FormDataExtended(form).object;

              // Parse properties from comma-separated string
              const properties = formData.properties
                ? formData.properties.split(',').map(p => p.trim()).filter(p => p)
                : [];

              const itemData = {
                name: formData.name,
                type: 'weapon',
                img: 'icons/weapons/swords/sword-broad-worn.webp',
                system: {
                  damage: formData.damage || '1d8',
                  damageType: formData.damageType || 'energy',
                  range: formData.range || 'melee',
                  attackAttribute: formData.attackAttribute || 'str',
                  attackBonus: parseInt(formData.attackBonus, 10) || 0,
                  weight: parseFloat(formData.weight) || 0,
                  cost: parseInt(formData.cost, 10) || 0,
                  properties: properties,
                  ammunition: {
                    type: formData.ammoType || 'none',
                    current: parseInt(formData.ammoCurrent, 10) || 0,
                    max: parseInt(formData.ammoMax, 10) || 0
                  },
                  upgradeSlots: parseInt(formData.upgradeSlots, 10) ?? 1,
                  installedUpgrades: [],
                  description: formData.description || '',
                  equipped: false
                }
              };

              const created = await actor.createEmbeddedDocuments('Item', [itemData]);
              resolve(created[0]);
            }
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'create',
        close: () => resolve(null)
      }, {
        classes: ['swse', 'dialog', 'custom-item-dialog'],
        width: 600,
        left: null,
        top: null,
        draggable: true,
        resizable: true
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
      const dialog = new SWSEDialogV2({
        title: 'Create Custom Armor',
        content: `
          <form class="swse-custom-item-form">
            <div class="form-group">
              <label>Armor Name:</label>
              <input type="text" name="name" value="Custom Armor" required/>
            </div>

            <div class="form-group">
              <label>Armor Type:</label>
              <select name="armorType">
                <option value="light" selected>Light Armor</option>
                <option value="medium">Medium Armor</option>
                <option value="heavy">Heavy Armor</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Reflex Defense Bonus:</label>
                <input type="number" name="defenseBonus" value="0" placeholder="Bonus to Reflex Defense"/>
                <small>Armor bonus to Reflex</small>
              </div>

              <div class="form-group">
                <label>Equipment Bonus:</label>
                <input type="number" name="equipmentBonus" value="0" placeholder="Equipment bonus to Reflex"/>
                <small>Equipment bonus (stacks with armor)</small>
              </div>

              <div class="form-group">
                <label>Fortitude Bonus:</label>
                <input type="number" name="fortBonus" value="0" placeholder="Bonus to Fortitude"/>
                <small>Usually 0</small>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Max Dexterity Bonus:</label>
                <input type="number" name="maxDexBonus" value="" placeholder="Leave blank for unlimited"/>
                <small>Light: blank, Medium: 2-5, Heavy: 0-2</small>
              </div>

              <div class="form-group">
                <label>Armor Check Penalty:</label>
                <input type="number" name="armorCheckPenalty" value="0" placeholder="Penalty to STR/DEX checks"/>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Speed Penalty:</label>
                <input type="number" name="speedPenalty" value="0" placeholder="Reduction in speed"/>
                <small>Typically 0-2 squares</small>
              </div>

              <div class="form-group">
                <label>Weight (kg):</label>
                <input type="number" name="weight" value="5" step="0.1"/>
              </div>

              <div class="form-group">
                <label>Cost (credits):</label>
                <input type="number" name="cost" value="0"/>
              </div>
            </div>

            <div class="form-group">
              <label>Upgrade Slots:</label>
              <input type="number" name="upgradeSlots" value="1" min="0"/>
              <small>Powered armor typically has 2 slots</small>
            </div>

            <div class="form-group">
              <label>Description:</label>
              <textarea name="description" rows="4" placeholder="Describe your armor..."></textarea>
            </div>
          </form>
        `,
        buttons: {
          create: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: 'Create Armor',
            callback: async (html) => {
              const root = html instanceof HTMLElement ? html : html?.[0];
              const form = root?.querySelector?.('form');
              const formData = new FormDataExtended(form).object;

              // Handle maxDexBonus - null if blank, otherwise parse as number
              let maxDexBonus = null;
              if (formData.maxDexBonus && formData.maxDexBonus !== '') {
                const parsed = parseInt(formData.maxDexBonus, 10);
                if (!isNaN(parsed)) {
                  maxDexBonus = parsed;
                }
              }

              const itemData = {
                name: formData.name,
                type: 'armor',
                img: 'icons/equipment/chest/breastplate-cuirass-steel.webp',
                system: {
                  armorType: formData.armorType || 'light',
                  defenseBonus: parseInt(formData.defenseBonus, 10) || 0,
                  equipmentBonus: parseInt(formData.equipmentBonus, 10) || 0,
                  fortBonus: parseInt(formData.fortBonus, 10) || 0,
                  maxDexBonus: maxDexBonus,
                  armorCheckPenalty: parseInt(formData.armorCheckPenalty, 10) || 0,
                  speedPenalty: parseInt(formData.speedPenalty, 10) || 0,
                  weight: parseFloat(formData.weight) || 0,
                  cost: parseInt(formData.cost, 10) || 0,
                  upgradeSlots: parseInt(formData.upgradeSlots, 10) ?? 1,
                  installedUpgrades: [],
                  description: formData.description || '',
                  equipped: false
                }
              };

              const created = await actor.createEmbeddedDocuments('Item', [itemData]);
              resolve(created[0]);
            }
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'create',
        close: () => resolve(null)
      }, {
        classes: ['swse', 'dialog', 'custom-item-dialog'],
        width: 600,
        left: null,
        top: null,
        draggable: true,
        resizable: true
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
      const dialog = new SWSEDialogV2({
        title: 'Create Custom Equipment',
        content: `
          <form class="swse-custom-item-form">
            <div class="form-group">
              <label>Equipment Name:</label>
              <input type="text" name="name" value="Custom Item" required/>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Weight (kg per unit):</label>
                <input type="number" name="weight" value="0" step="0.1"/>
              </div>

              <div class="form-group">
                <label>Cost (credits):</label>
                <input type="number" name="cost" value="0"/>
              </div>
            </div>

            <div class="form-group">
              <label>Upgrade Slots:</label>
              <input type="number" name="upgradeSlots" value="1" min="0"/>
              <small>For equipment that can be upgraded</small>
            </div>

            <div class="form-group">
              <label>Description:</label>
              <textarea name="description" rows="4" placeholder="Describe your equipment..."></textarea>
            </div>
          </form>
        `,
        buttons: {
          create: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: 'Create Equipment',
            callback: async (html) => {
              const root = html instanceof HTMLElement ? html : html?.[0];
              const form = root?.querySelector?.('form');
              const formData = new FormDataExtended(form).object;

              const itemData = {
                name: formData.name,
                type: 'equipment',
                img: 'icons/sundries/misc/pouch-simple-leather-brown.webp',
                system: {
                  weight: parseFloat(formData.weight) || 0,
                  cost: parseInt(formData.cost, 10) || 0,
                  upgradeSlots: parseInt(formData.upgradeSlots, 10) ?? 1,
                  installedUpgrades: [],
                  description: formData.description || ''
                }
              };

              const created = await actor.createEmbeddedDocuments('Item', [itemData]);
              resolve(created[0]);
            }
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'create',
        close: () => resolve(null)
      }, {
        classes: ['swse', 'dialog', 'custom-item-dialog'],
        width: 500,
        left: null,
        top: null,
        draggable: true,
        resizable: true
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
      const dialog = new SWSEDialogV2({
        title: 'Create Custom Feat',
        content: `
          <form class="swse-custom-item-form">
            <div class="form-group">
              <label>Feat Name:</label>
              <input type="text" name="name" value="Custom Feat" required/>
            </div>

            <div class="form-group">
              <label>Feat Type:</label>
              <select name="featType">
                <option value="general" selected>General</option>
                <option value="force">Force</option>
                <option value="species">Species</option>
              </select>
            </div>

            <div class="form-group">
              <label>Prerequisites:</label>
              <textarea name="prerequisite" rows="2" placeholder="e.g., Base Attack Bonus +1, Proficiency (Rifles)"></textarea>
            </div>

            <div class="form-group">
              <label>Benefit:</label>
              <textarea name="benefit" rows="4" placeholder="Describe what this feat does..."></textarea>
            </div>

            <div class="form-group">
              <label>Special:</label>
              <textarea name="special" rows="2" placeholder="Any special rules or notes..."></textarea>
            </div>

            <div class="form-group">
              <label>Normal:</label>
              <textarea name="normalText" rows="2" placeholder="What happens without this feat..."></textarea>
            </div>

            <div class="form-group">
              <label>Bonus Feat For (comma-separated classes):</label>
              <input type="text" name="bonusFeatFor" placeholder="e.g., Soldier, Scout, Jedi"/>
              <small>Classes that can take this as a bonus feat</small>
            </div>

            <div class="form-group">
              <label>Limited Uses:</label>
              <div class="form-row">
                <div class="form-group">
                  <label>Max Uses:</label>
                  <input type="number" name="usesMax" value="0" min="0" placeholder="0 = unlimited"/>
                </div>
                <div class="form-group">
                  <label><input type="checkbox" name="usesPerDay"/> Per Day</label>
                </div>
              </div>
              <small>For feats with limited daily uses</small>
            </div>
          </form>
        `,
        buttons: {
          create: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: 'Create Feat',
            callback: async (html) => {
              const root = html instanceof HTMLElement ? html : html?.[0];
              const form = root?.querySelector?.('form');
              const formData = new FormDataExtended(form).object;

              // Parse bonus feat classes from comma-separated string
              const bonusFeatFor = formData.bonusFeatFor
                ? formData.bonusFeatFor.split(',').map(c => c.trim()).filter(c => c)
                : [];

              const itemData = {
                name: formData.name,
                type: 'feat',
                img: 'icons/sundries/scrolls/scroll-bound-ruby-red.webp',
                system: {
                  featType: formData.featType || 'general',
                  prerequisite: formData.prerequisite || '',
                  benefit: formData.benefit || '',
                  special: formData.special || '',
                  normalText: formData.normalText || '',
                  bonusFeatFor: bonusFeatFor,
                  uses: {
                    current: 0,
                    max: parseInt(formData.usesMax, 10) || 0,
                    perDay: formData.usesPerDay === 'on'
                  }
                }
              };

              const created = await actor.createEmbeddedDocuments('Item', [itemData]);
              resolve(created[0]);
            }
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'create',
        close: () => resolve(null)
      }, {
        classes: ['swse', 'dialog', 'custom-item-dialog'],
        width: 600,
        left: null,
        top: null,
        draggable: true,
        resizable: true
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
      const dialog = new SWSEDialogV2({
        title: 'Create Custom Talent',
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
              <textarea name="prerequisite" rows="2" placeholder="Previous talents required in tree"></textarea>
            </div>

            <div class="form-group">
              <label>Benefit:</label>
              <textarea name="benefit" rows="4" placeholder="Describe what this talent does..."></textarea>
            </div>

            <div class="form-group">
              <label>Special:</label>
              <textarea name="special" rows="2" placeholder="Any special rules or notes..."></textarea>
            </div>

            <div class="form-group">
              <label>Limited Uses:</label>
              <div class="form-row">
                <div class="form-group">
                  <label>Max Uses:</label>
                  <input type="number" name="usesMax" value="0" min="0" placeholder="0 = unlimited"/>
                </div>
                <div class="form-group">
                  <label><input type="checkbox" name="usesPerEncounter"/> Per Encounter</label>
                </div>
                <div class="form-group">
                  <label><input type="checkbox" name="usesPerDay"/> Per Day</label>
                </div>
              </div>
              <small>For talents with limited uses</small>
            </div>
          </form>
        `,
        buttons: {
          create: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: 'Create Talent',
            callback: async (html) => {
              const root = html instanceof HTMLElement ? html : html?.[0];
              const form = root?.querySelector?.('form');
              const formData = new FormDataExtended(form).object;

              const itemData = {
                name: formData.name,
                type: 'talent',
                img: 'icons/magic/symbols/runes-star-pentagon-orange.webp',
                system: {
                  tree: formData.tree || 'Custom',
                  prerequisite: formData.prerequisite || '',
                  benefit: formData.benefit || '',
                  special: formData.special || '',
                  uses: {
                    current: 0,
                    max: parseInt(formData.usesMax, 10) || 0,
                    perEncounter: formData.usesPerEncounter === 'on',
                    perDay: formData.usesPerDay === 'on'
                  }
                }
              };

              const created = await actor.createEmbeddedDocuments('Item', [itemData]);
              resolve(created[0]);
            }
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'create',
        close: () => resolve(null)
      }, {
        classes: ['swse', 'dialog', 'custom-item-dialog'],
        width: 600,
        left: null,
        top: null,
        draggable: true,
        resizable: true
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
      const dialog = new SWSEDialogV2({
        title: 'Create Custom Force Power',
        content: `
          <form class="swse-custom-item-form force-power-form">
            <div class="form-row">
              <div class="form-group">
                <label>Force Power Name:</label>
                <input type="text" name="name" value="Custom Force Power" required/>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Power Level:</label>
                <select name="powerLevel">
                  <option value="1" selected>1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
              </div>

              <div class="form-group">
                <label>Discipline:</label>
                <select name="discipline">
                  <option value="telekinetic" selected>Telekinetic</option>
                  <option value="telepathic">Telepathic</option>
                  <option value="vital">Vital</option>
                  <option value="dark-side">Dark Side</option>
                  <option value="light-side">Light Side</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Base Use the Force DC:</label>
                <input type="number" name="useTheForce" value="15" min="0"/>
              </div>

              <div class="form-group">
                <label>Activation Time:</label>
                <select name="time">
                  <option value="Swift Action">Swift Action</option>
                  <option value="Move Action">Move Action</option>
                  <option value="Standard Action" selected>Standard Action</option>
                  <option value="Full-Round Action">Full-Round Action</option>
                  <option value="Reaction">Reaction</option>
                  <option value="Free Action">Free Action</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Range:</label>
                <input type="text" name="range" value="6 squares" placeholder="e.g., 6 squares, Personal, Touch"/>
              </div>

              <div class="form-group">
                <label>Target:</label>
                <input type="text" name="target" value="One target" placeholder="e.g., One target, Self, Area"/>
              </div>

              <div class="form-group">
                <label>Duration:</label>
                <input type="text" name="duration" value="Instantaneous" placeholder="e.g., Instantaneous, 1 minute, Concentration"/>
              </div>
            </div>

            <div class="form-group">
              <label>Descriptors/Tags:</label>
              <div class="checkbox-group">
                <label><input type="checkbox" name="tags" value="dark-side"/> Dark Side</label>
                <label><input type="checkbox" name="tags" value="light-side"/> Light Side</label>
                <label><input type="checkbox" name="tags" value="mind-affecting"/> Mind-Affecting</label>
                <label><input type="checkbox" name="tags" value="telekinetic"/> Telekinetic</label>
                <label><input type="checkbox" name="tags" value="telepathic"/> Telepathic</label>
                <label><input type="checkbox" name="tags" value="vital"/> Vital</label>
              </div>
            </div>

            <div class="form-group">
              <label>Effect:</label>
              <textarea name="effect" rows="4" placeholder="Describe what this Force power does..."></textarea>
            </div>

            <div class="form-group">
              <label>Special:</label>
              <textarea name="special" rows="2" placeholder="Any special rules or notes..."></textarea>
            </div>

            <div class="form-group">
              <label>DC Chart:</label>
              <div id="dc-chart-container">
                <div class="dc-chart-row" data-index="0">
                  <input type="number" name="dc-0" placeholder="DC" class="dc-input" value="15"/>
                  <input type="text" name="effect-0" placeholder="Effect" class="effect-input" style="flex: 2"/>
                  <input type="text" name="description-0" placeholder="Description" class="description-input" style="flex: 3"/>
                  <button type="button" class="remove-dc-row" data-index="0"><i class="fa-solid fa-times"></i></button>
                </div>
              </div>
              <button type="button" id="add-dc-row" class="add-button"><i class="fa-solid fa-plus"></i> Add DC Row</button>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label><input type="checkbox" name="maintainable"/> Maintainable (Swift action to sustain)</label>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Force Point Cost:</label>
                <input type="number" name="forcePointCost" value="0" min="0" placeholder="Automatic Force Point cost"/>
              </div>

              <div class="form-group">
                <label>Uses per Day:</label>
                <input type="number" name="usesMax" value="0" min="0" placeholder="0 = unlimited"/>
              </div>
            </div>

            <div class="form-group">
              <label>Force Point Enhancement:</label>
              <textarea name="forcePointEffect" rows="3" placeholder="Enhanced effect if a Force Point is spent..."></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Sourcebook:</label>
                <input type="text" name="sourcebook" value="Homebrew" placeholder="Source book"/>
              </div>

              <div class="form-group">
                <label>Page:</label>
                <input type="number" name="page" value="" placeholder="Page number"/>
              </div>
            </div>
          </form>

          <script>
            (function() {
              let dcRowIndex = 1;

              document.getElementById('add-dc-row').addEventListener('click', function() {
                const container = document.getElementById('dc-chart-container');
                const newRow = document.createElement('div');
                newRow.className = 'dc-chart-row';
                newRow.dataset.index = dcRowIndex;
                newRow.innerHTML = \`
                  <input type="number" name="dc-\${dcRowIndex}" placeholder="DC" class="dc-input"/>
                  <input type="text" name="effect-\${dcRowIndex}" placeholder="Effect" class="effect-input" style="flex: 2"/>
                  <input type="text" name="description-\${dcRowIndex}" placeholder="Description" class="description-input" style="flex: 3"/>
                  <button type="button" class="remove-dc-row" data-index="\${dcRowIndex}"><i class="fa-solid fa-times"></i></button>
                \`;
                container.appendChild(newRow);

                // Add event listener to the new remove button
                newRow.querySelector('.remove-dc-row').addEventListener('click', function() {
                  newRow.remove();
                });

                dcRowIndex++;
              });

              // Add event listener to initial remove button
              document.querySelectorAll('.remove-dc-row').forEach(btn => {
                btn.addEventListener('click', function() {
                  this.closest('.dc-chart-row').remove();
                });
              });
            })();
          </script>
        `,
        buttons: {
          create: {
            icon: '<i class="fa-solid fa-check"></i>',
            label: 'Create Force Power',
            callback: async (html) => {
              const root = html instanceof HTMLElement ? html : html?.[0];
              const form = root?.querySelector?.('form');
              const formData = new FormDataExtended(form).object;

              // Gather tags from checkboxes
              const tags = [];
            root?.querySelectorAll?.('input[name="tags"]:checked')?.forEach((el) => {
                tags.push(el.value);
              });

              // Gather DC Chart rows
              const dcChart = [];
              for (const row of root.querySelectorAll('.dc-chart-row')) {
                const index = Number(row.dataset.index);
                const dcValue = root.querySelector(`input[name="dc-${index}"]`)?.value ?? '';
                const effect = root.querySelector(`input[name="effect-${index}"]`)?.value ?? '';
                const description = root.querySelector(`input[name="description-${index}"]`)?.value ?? '';
                const dc = parseInt(dcValue, 10);
                const hasValidDC = !isNaN(dc) && dc > 0;
                const hasEffect = effect && effect.trim();
                const hasDCValue = dcValue && dcValue.trim();

                if (hasValidDC && hasEffect) {
                  dcChart.push({ dc, effect, description: (description && description.trim()) || '' });
                } else if (hasEffect && hasDCValue && !hasValidDC) {
                  ui.notifications.warn(`Invalid DC value in power chart row: DC must be a positive number`);
                } else if (hasValidDC && !hasEffect) {
                  ui.notifications.warn(`Power chart row has DC but no effect description`);
                }
              }

              const itemData = {
                name: formData.name,
                type: 'force-power',
                img: 'icons/magic/light/orb-lightbulb-gray.webp',
                system: {
                  powerLevel: parseInt(formData.powerLevel, 10) || 1,
                  discipline: formData.discipline || 'telekinetic',
                  useTheForce: parseInt(formData.useTheForce, 10) || 15,
                  time: formData.time || 'Standard Action',
                  range: formData.range || '6 squares',
                  target: formData.target || 'One target',
                  duration: formData.duration || 'Instantaneous',
                  effect: formData.effect || '',
                  special: formData.special || '',
                  tags: tags,
                  dcChart: dcChart,
                  maintainable: formData.maintainable === 'on',
                  forcePointCost: parseInt(formData.forcePointCost, 10) || 0,
                  forcePointEffect: formData.forcePointEffect || '',
                  sourcebook: formData.sourcebook || 'Homebrew',
                  page: parseInt(formData.page, 10) || null,
                  uses: {
                    current: 0,
                    max: parseInt(formData.usesMax, 10) || 0
                  },
                  inSuite: false,
                  spent: false
                }
              };

              const created = await actor.createEmbeddedDocuments('Item', [itemData]);
              resolve(created[0]);
            }
          },
          cancel: {
            icon: '<i class="fa-solid fa-times"></i>',
            label: 'Cancel',
            callback: () => resolve(null)
          }
        },
        default: 'create',
        close: () => resolve(null)
      }, {
        classes: ['swse', 'dialog', 'custom-item-dialog', 'force-power-dialog'],
        width: 700,
        height: 800,
        left: null,
        top: null,
        draggable: true,
        resizable: true
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
    switch (type) {
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

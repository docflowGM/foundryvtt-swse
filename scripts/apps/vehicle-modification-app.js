import { ProgressionEngine } from "./scripts/progression/engine/progression-engine.js";
/**
 * Vehicle Modification Application
 * Interactive starship builder with Marl Skindar, Republic Spy narrator
 */

import { VehicleModificationManager } from './vehicle-modification-manager.js';

export class VehicleModificationApp extends Application {

  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.stockShip = null;
    this.modifications = [];
    this.currentStep = 'intro';
    this.selectedCategory = 'movement';
    this.marlDialogue = '';
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['swse', 'vehicle-modification-app'],
      template: 'systems/swse/templates/apps/vehicle-modification.hbs',
      width: 900,
      height: 700,
      title: "Starship Acquisition & Modification",
      resizable: true,
      draggable: true,
      scrollY: [".content", ".tab-content", ".window-content"],
      tabs: [{
        navSelector: '.tabs',
        contentSelector: '.content',
        initial: 'selection'
      }],
      left: null,  // Allow Foundry to center
      top: null    // Allow Foundry to center
    });
  }

  async getData() {
    const context = await super.getData();

    context.actor = this.actor;
    context.currentStep = this.currentStep;
    context.marlDialogue = this.getMarlDialogue();

    // Stock ships
    context.stockShips = VehicleModificationManager.getStockShips();
    context.selectedShip = this.stockShip;

    // Modifications by category
    context.categories = [
      { id: 'movement', label: 'Movement', icon: 'fa-rocket' },
      { id: 'defense', label: 'Defense', icon: 'fa-shield-alt' },
      { id: 'weapon', label: 'Weapons', icon: 'fa-crosshairs' },
      { id: 'accessory', label: 'Accessories', icon: 'fa-tools' }
    ];

    context.selectedCategory = this.selectedCategory;

    if (this.stockShip) {
      context.availableModifications = VehicleModificationManager
        .getModificationsByCategory(this.selectedCategory);

      // Filter out already installed modifications
      context.availableModifications = context.availableModifications.filter(mod => {
        return !this.modifications.find(installed => installed.id === mod.id);
      });

      context.installedModifications = this.modifications;

      // Calculate stats
      const epStats = VehicleModificationManager.calculateEmplacementPointsTotal(
        this.modifications,
        this.stockShip
      );
      context.emplacementPoints = epStats;

      context.totalCost = VehicleModificationManager.calculateTotalCost(
        this.modifications,
        this.stockShip
      );

      context.baseCost = this.stockShip.cost;
    }

    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Start selection button
    html.find('.start-selection').click(this._onStartSelection.bind(this));

    // Stock ship selection
    html.find('.select-ship').click(this._onSelectShip.bind(this));

    // Category tabs
    html.find('.category-tab').click(this._onSelectCategory.bind(this));

    // Add modification
    html.find('.add-modification').click(this._onAddModification.bind(this));

    // Remove modification
    html.find('.remove-modification').click(this._onRemoveModification.bind(this));

    // Finalize button
    html.find('.finalize-ship').click(this._onFinalizeShip.bind(this));

    // Reset button
    html.find('.reset-ship').click(this._onResetShip.bind(this));

    // Modification details
    html.find('.modification-item').click(this._onShowModificationDetails.bind(this));
  }

  async _onStartSelection(event) {
    event.preventDefault();
    this.currentStep = 'ship-selection';
    await this.render();
  }

  /**
   * Get Marl Skindar's dialogue based on current state
   */
  getMarlDialogue() {
    if (this.currentStep === 'intro') {
      return this._getIntroDialogue();
    }

    if (this.currentStep === 'ship-selection' && !this.stockShip) {
      return this._getShipSelectionDialogue();
    }

    if (this.stockShip && !this.marlDialogue) {
      return this._getShipChoiceCommentary(this.stockShip.name);
    }

    if (this.modifications.length > 0) {
      return this._getModificationCommentary();
    }

    return this.marlDialogue || this._getDefaultDialogue();
  }

  _getIntroDialogue() {
    return `"Marl Skindar, Republic Intelligence. I run vehicle requisitions. Well, that's what the official paperwork says, anyway. Let's just say I have... flexible accounting with certain Republic contacts.

You want a ship? Fine. Pick one. I'll process the credits through proper channels. Mostly proper. The less you ask, the better."`;
  }

  _getShipSelectionDialogue() {
    return `"Browse the catalog. The prices are... adjusted. Republic overhead, you understand. Some of these credits might find their way back through various contacts. Very proper. Very legal.

Choose wisely. Every transaction gets logged. Eventually."`;
  }

  _getShipChoiceCommentary(shipName) {
    const commentary = {
      'Light Fighter': `*Marl actually looks surprised*

"A Light Fighter? You picked... the CHEAPEST option? I... I don't know whether to be impressed or concerned.

On one hand, you're not bleeding the Republic dry. On the other hand, this thing has the structural integrity of a Naboo starfighter—which is to say, NONE. You'll be flying a target with engines.

But at least when you inevitably get vaporized, the Republic will only lose 5,000 credits instead of 500,000. So... thanks for that, I guess? Congratulations on your suicide mission vehicle."`,

      'Interceptor': `*Marl laughs bitterly*

"An Interceptor. Oh, wonderful. You've chosen the 'I have a death wish but I want to look COOL while dying' option.

25,000 credits for a ship so fast you'll black out from the G-forces before you even see what kills you. And it WILL kill you. These things have more dead pilots than successful missions. But sure, live fast, die young, waste Republic credits. That's basically your motto now."`,

      'Superiority Fighter': `*Marl's eye twitches*

"A Superiority Fighter. 50,000 credits. FIFTY. THOUSAND.

Do you have ANY idea how many troops we could equip with that? How many meals we could provide to refugees? But no, YOU need the fancy starfighter because you watched too many holo-vids.

The maintenance alone on this thing will bankrupt a small moon. But I'm sure your ego is worth it. Try not to crash it on day one—actually, you know what? DO crash it. At least then the Republic can write it off as a combat loss instead of 'idiot pilot error.'"`,

      'Bomber': `*Marl pinches the bridge of his nose*

"A Bomber. 75,000 credits for a flying bomb that attracts enemy fire like a Hutt attracts parasites.

You're basically telling everyone in the sector 'PLEASE SHOOT ME, I'M FULL OF EXPLOSIVES.' And they will. Oh, they WILL. Every TIE fighter, turbolaser, and angry pirate will prioritize you, because you're a giant target made of ordnance.

The Republic thanks you for your... sacrifice. Because that's what this is. A sacrifice. Of credits, common sense, and your inevitable life."`,

      'Light Freighter': `*Marl's expression turns knowing*

"Ah, the Light Freighter. 100,000 credits for the galaxy's most popular smuggling vessel. And you want me to believe you're going to use it for 'legitimate cargo hauling'? Sure you are.

Let me guess—you'll add hidden compartments, upgrade the hyperdrive to outrun authorities, and spend more time running from Imperial customs than actually doing honest work. I've seen this story a hundred times.

The Republic is funding your future life of crime. Fantastic. Just... try not to make the rest of us look bad when you inevitably get caught with contraband."`,

      'Shuttle': `*Marl shrugs*

"A Shuttle. Practical. Boring. Safe. You're either the responsible type or you've given up on adventure entirely.

Then again, shuttles are everywhere, which makes them great for blending in. Nobody suspects the shuttle. Unless it's YOUR shuttle, in which case everyone will suspect it. That's just how it works."`,

      'Gunship': `*Marl whistles*

"A Gunship! Now you're speaking my language. This is basically a flying weapons platform that happens to have room for a crew.

Perfect for when you need to make a statement. That statement being 'I have more guns than common sense.' But honestly? Sometimes that's exactly the statement you need."`,

      'Heavy Freighter': `*Marl stares in disbelief*

"A Heavy Freighter. 250,000 credits. Quarter of a MILLION credits for a ship that moves like a drunk bantha and handles like a flying warehouse.

What exactly are you hauling that needs this much space? Stolen AT-ATs? An entire black market? The hopes and dreams of the Republic Treasury? Because that's what you just spent.

This thing is so slow that star systems will AGE before you finish a single cargo run. But sure, enjoy your flying mall. I'm sure it'll be worth every single wasted credit."`,

      'Corvette': `*Marl looks concerned*

"A Corvette. That's... ambitious. And expensive. And requires a crew of fifty. Do you HAVE fifty people? Because I don't, and I'm supposedly a Republic Intelligence officer.

This is a proper warship. Don't take it into a customs inspection. Don't take it NEAR customs. Just... stay away from legitimate authorities entirely."`,

      'Frigate': `*Marl's hologram flickers with rage*

"A FRIGATE?! TWO MILLION CREDITS?!

Are you INSANE?! Do you have ANY concept of money?! That's TWO MILLION Republic credits! We could build FORTY Light Freighters! EIGHTY Fighters! An entire FLEET of useful ships!

But no, you want your own personal warship. With a crew of 200. TWO HUNDRED people who could be doing literally anything else. And the fuel costs? The maintenance? The docking fees?!

You know what? I hope pirates board it. I hope they take it. They'll probably use it more responsibly than you will. This is the worst financial decision I've seen since the Republic Senate approved funding for the Malevolence."`,

      'Cruiser': `*Marl's hologram shorts out briefly from pure shock*

"A... a Cruiser. TEN MILLION CREDITS.

I... I need to sit down. Do you understand what you've done? TEN. MILLION. CREDITS. That's not even REAL money anymore! That's theoretical economics! That's the kind of number that breaks calculators!

Five THOUSAND crew members. The population of a small CITY. All dedicated to your flying monument to fiscal irresponsibility.

You could've funded an entire SECTOR for a year. Built schools. Hospitals. Defensive stations. But no. YOU need a Cruiser. The Republic Finance Committee is going to have me assassinated for approving this. And honestly? I'd deserve it."`,

      'Battlecruiser': `*Marl's hologram actually crashes and reboots*

"Did... did you just try to buy a BATTLECRUISER?! FIFTY MILLION CREDITS?!

FIFTY. MILLION. FIFTY MILLION REPUBLIC CREDITS FOR A SINGLE SHIP.

You know what? No. I'm done. I quit. I'm resigning from Republic Intelligence right now. This is beyond incompetence. This is criminal. This is GALACTIC TREASON.

Twenty THOUSAND crew members! The GDP of entire PLANETS is less than this! You could buy FLEETS! ARMADAS! Small GOVERNMENTS!

The Republic is going to execute me for this. They're going to space me. And I'll ACCEPT it. Because clearly the universe has gone insane and I don't want to live in it anymore. Congratulations. You've broken me. And the economy. Mostly the economy."`
    };

    return commentary[shipName] || `*Marl examines your choice*

"The ${shipName}, huh? Interesting choice. Let's see what we can do with it."`;
  }

  _getModificationCommentary() {
    const lastMod = this.modifications[this.modifications.length - 1];
    if (!lastMod) return this._getDefaultDialogue();

    // Get category-specific commentary
    if (lastMod.category === 'Movement') {
      return this._getMovementCommentary(lastMod);
    } else if (lastMod.category === 'Defense') {
      return this._getDefenseCommentary(lastMod);
    } else if (lastMod.category === 'Weapon') {
      return this._getWeaponCommentary(lastMod);
    } else if (lastMod.category === 'Accessory') {
      return this._getAccessoryCommentary(lastMod);
    }

    return this._getDefaultDialogue();
  }

  _getMovementCommentary(mod) {
    if (mod.id.startsWith('hyperdrive-')) {
      const classMatch = mod.id.match(/hyperdrive-(\d+)/);
      const hyperClass = classMatch ? parseFloat(classMatch[1].replace('0', '0.')) : 2;

      if (hyperClass <= 1) {
        return `*Marl's jaw drops*

"A Class ${hyperClass} hyperdrive?! Do you understand how ABSURDLY expensive these are?! That's military-grade hardware! Black market contraband! The kind of thing that gets you arrested just for OWNING!

But sure, waste MORE Republic credits on going slightly faster through hyperspace. Because apparently you have money to burn. Literally. That's what hyperdrives do—they burn fuel. Expensive fuel. VERY expensive fuel.

I hope you're planning to outrun the tax auditors, because they're coming for you."`;
      } else if (hyperClass >= 6) {
        return `*Marl smirks cruelly*

"A Class ${hyperClass}? Oh, this is PRECIOUS. You bought a hyperdrive so slow that SUBLIGHT might be faster.

This is the kind of drive they install on prison transports because the inmates would die of old age before escaping. You'll be in hyperspace so long you'll forget what you were traveling for. Your enemies will just... wait for you. They'll have time to get married, have children, retire, and die before you arrive.

But hey, at least it was cheap! Like everything else about your life choices."`;
      } else {
        return `*Marl shrugs dismissively*

"Class ${hyperClass}. How... adequate. It'll get you places at a mediocre speed while burning a moderate amount of Republic credits. You're the embodiment of 'good enough,' aren't you?

Not fast enough to be impressive, not slow enough to be memorable. Just... average. Like your piloting skills, probably."`;
      }
    }

    if (mod.id.includes('maneuvering-jets')) {
      return `*Marl grins*

"Maneuvering jets! Planning to dance around TIE fighters, are we? Or just trying to avoid parking tickets? Either way, good thinking. Can't shoot what you can't hit."`;
    }

    if (mod.id.includes('sublight')) {
      return `*Marl examines the specs*

"Upgrading the sublight drive. Smart. Hyperdrives get you between systems, but sublight gets you away from customs inspectors. Trust me, that's just as important."`;
    }

    return `*Marl looks over the modification*

"${mod.name}. Sure, why not? It's your ship... and your credits."`;
  }

  _getDefenseCommentary(mod) {
    if (mod.id.startsWith('shields-')) {
      const srMatch = mod.name.match(/SR (\d+)/);
      const sr = srMatch ? parseInt(srMatch[1]) : 0;

      if (sr >= 100) {
        return `*Marl throws his hands up*

"SR ${sr}?! CAPITAL SHIP SHIELDING?! What are you protecting yourself from, the ENTIRE IMPERIAL FLEET?!

These shields cost more than some planets' defense budgets! You're installing protection designed for BATTLESHIPS onto your... whatever this is! It's like putting blast doors on a speeder bike!

You know what? At this point I don't even care. Waste the credits. Install shields that could deflect asteroids. When the Republic Treasury comes asking where all the money went, I'll just point at you and your flying fortress of fiscal insanity."`;
      } else if (sr >= 50) {
        return `*Marl shakes his head*

"SR ${sr}. Because apparently regular shields weren't expensive enough for you. No, you need PREMIUM shields. Military-grade. The kind that make accountants weep.

Sure, you'll survive hits that would vaporize normal ships. But you'll also be bankrupt from the power costs. These things drain fuel like a Hutt drains buffets. Hope you're ready for that maintenance bill."`;
      } else {
        return `*Marl looks unimpressed*

"SR ${sr}. Basic shields. Barely better than flying naked through space. These will stop, what, maybe three hits from a laser cannon before failing?

But I guess it's better than nothing. Marginally. It's like wearing a t-shirt in a blizzard and claiming you're 'protected from the elements.' Technically true, practically useless."`;
      }
    }

    if (mod.id.includes('armor')) {
      return `*Marl taps the specs*

"Extra armor. The 'I don't trust shields' approach to survival. Heavier, slower, but it won't fail when you divert power to engines. Assuming you live long enough to divert power to engines."`;
    }

    if (mod.id.includes('reinforced-bulkheads')) {
      return `*Marl chuckles*

"Reinforcing the hull? Planning to take a beating, are you? Or maybe you just fly like my uncle—straight into every obstacle in the sector. Either way, your insurance premiums just went up."`;
    }

    if (mod.id === 'regenerating-shields') {
      return `*Marl looks impressed*

"Regenerating shields! Fancy. These are great until someone hits you faster than they can regenerate. Then they're just expensive regular shields. But hey, optimism is important!"`;
    }

    return `*Marl examines the modification*

"${mod.name}. Thinking about survival. I like it. Most of my clients don't bother with defense. Course, most of them are dead now, so..."`;
  }

  _getWeaponCommentary(mod) {
    if (mod.weaponType === 'Turbolaser') {
      return `*Marl's hologram glitches out completely*

"TURBOLASERS?! TURBO—ARE YOU OUT OF YOUR MIND?!

These are weapons of WAR! Capital ship killers! The kind of armament that starts GALACTIC INCIDENTS! You can't just BUY these! Well, apparently you CAN, but you SHOULDN'T!

The second you fire one of these, every government in the sector is going to assume you're starting a rebellion! The Empire will hunt you! The Republic will disavow you! Your insurance premiums will be ASTRONOMICAL!

But sure. Mount turbolasers. Why not? You've already wasted enough credits to buy a fleet. What's a few MORE war crimes to add to the list?"`;
    }

    if (mod.weaponType === 'Laser' || mod.weaponType === 'Blaster') {
      return `*Marl nods*

"${mod.name}. Classic choice. Everyone needs guns. Laser cannons for style, blaster cannons for bulk. Either way, you're ready to convince people you mean business."`;
    }

    if (mod.weaponType === 'Ion') {
      return `*Marl grins*

"Ion weapons? Someone's thinking tactically. Or you're a bounty hunter. Ion cannons are perfect for when you need the target alive. Or at least when you need their ship intact enough to sell.

The Empire HATES these things, by the way. Which makes them even better."`;
    }

    if (mod.weaponType === 'Torpedo' || mod.weaponType === 'Missile') {
      return `*Marl whistles*

"${mod.name}! Now we're talking serious firepower. These are for when laser cannons just aren't dramatic enough. Just remember: missiles are expensive, and you can't reuse them after they explode.

Unlike energy weapons, which explode and then you can use them again. Well, if the ship survives."`;
    }

    if (mod.id === 'tractor-beam') {
      return `*Marl smirks*

"A tractor beam? Either you're planning to salvage, pirate, or 'detain' Imperial cargo vessels for 'inspection.' All perfectly legitimate activities, I'm sure.

Just don't use it on anything bigger than you. I've seen that mistake before. The little ship does NOT win that tug-of-war."`;
    }

    return `*Marl looks at the specs*

"${mod.name}. Because you can never have too many ways to blow things up. That's practically the Republic motto at this point."`;
  }

  _getAccessoryCommentary(mod) {
    if (mod.id.includes('smuggler')) {
      return `*Marl leans in conspiratorially*

"Smuggler's compartments. I have ABSOLUTELY no idea what you'd use these for. None whatsoever. Definitely not for contraband, illegal weapons, or avoiding Imperial customs.

*winks*

Make sure you get the good kind. The cheap ones show up on scanners, and then you've just installed a 'please search me' sign on your hull."`;
    }

    if (mod.id.includes('hidden-cargo')) {
      return `*Marl grins widely*

"Hidden cargo holds? Oh, this is my FAVORITE modification. Nothing says 'legitimate business' like hiding most of your cargo capacity from sensors.

Just remember the scanner officer's rule of thumb: if the ship's mass doesn't match its cargo manifest, someone's hiding something. So either hide it REALLY well, or be REALLY fast."`;
    }

    if (mod.id.includes('luxury')) {
      return `*Marl laughs*

"Luxury upgrades? What are you, some kind of dignitary? Or maybe you're planning to transport VIPs? Either way, you're paying extra to make the flying death trap comfortable.

I respect that. If you're going to die in space, might as well die in style."`;
    }

    if (mod.id.includes('medical')) {
      return `*Marl nods approvingly*

"A medical suite. Smart. Very smart. Bacta tanks have saved my life at least three times. Four if you count that incident on Nal Hutta, but I try not to count that one.

Plus, they're great for crew morale. Nothing says 'I care about you' like the ability to put you back together after you get shot."`;
    }

    if (mod.id.includes('sensor')) {
      return `*Marl taps his nose*

"Sensor upgrades. The difference between 'detecting the ambush' and 'flying into the ambush' is usually about 10,000 credits worth of sensors.

You just spent those credits. Wisely, I might add. Can't shoot what you can't see, and you can't run from what you don't detect."`;
    }

    if (mod.id.includes('escape-pod')) {
      return `*Marl's expression turns serious*

"Escape pods. The modification everyone mocks until they need one. I've used escape pods twice in my career. Both times, I was VERY grateful I had them.

Plus, they're legally required on most civilian vessels. Not that legality has stopped anyone in this galaxy."`;
    }

    if (mod.id.includes('cloaking')) {
      return `*Marl's hologram literally sparks with panic*

"A CLOAKING DEVICE?! ARE YOU TRYING TO GET US BOTH EXECUTED?!

These are SUPER illegal! Like, 'death sentence in twelve systems' illegal! The Empire doesn't just arrest people with cloaking devices—they DISAPPEAR them! No trial, no record, just GONE!

And the COST! These things are worth more than some planetary treasuries! You're basically flying around in a war crime wrapped in bankruptcy! Every government in the galaxy will want you dead!

But you don't care, do you? No, you're going to install it anyway, because you've already demonstrated a complete disregard for laws, regulations, and basic survival instincts! Fine! FINE! Just... don't tell anyone where you got it. I value my life, even if you don't value yours—or the Republic's credits!"`;
    }

    if (mod.id.includes('transponder-disguised')) {
      return `*Marl grins mischievously*

"Disguised transponder. The 'I'm definitely not the ship you're looking for' modification. Essential for anyone with outstanding warrants, unpaid docking fees, or a tendency to upset Hutts.

Just remember to keep your story straight. Nothing blows your cover faster than forgetting what ship you're supposed to be."`;
    }

    return `*Marl examines the specs*

"${mod.name}. Practical. I like practical. Flashy weapons are fun, but practical accessories keep you alive."`;
  }

  _getDefaultDialogue() {
    const options = [
      `*Marl checks his datapad*

"Still tinkering? Take your time. It's not like I have other clients or anything. Oh wait, I do. Several. But they're less entertaining than watching you build this ship."`,
      `*Marl yawns*

"You know, most people just pick a ship and go. But not you. You're CUSTOMIZING. I respect the dedication. Or the paranoia. Probably both."`,
      `*Marl leans back*

"Every modification tells a story. Your story seems to be 'I want ALL the things.' Classic first-time ship owner mistake. But hey, it's your credits."`,
      `*Marl grins*

"Fun fact: Did you know that 67% of starship modifications are never actually used? The other 33% are usually used exactly once, catastrophically. Statistics are fun!"`
    ];

    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Select a stock ship
   */
  async _onSelectShip(event) {
    event.preventDefault();
    const shipName = event.currentTarget.dataset.ship;
    this.stockShip = VehicleModificationManager.getStockShip(shipName);
    this.modifications = [];
    this.currentStep = 'modification';
    this.marlDialogue = this._getShipChoiceCommentary(shipName);
    this.render(true);
  }

  /**
   * Select a modification category
   */
  _onSelectCategory(event) {
    event.preventDefault();
    this.selectedCategory = event.currentTarget.dataset.category;
    this.render(false);
  }

  /**
   * Add a modification to the ship
   */
  async _onAddModification(event) {
    event.preventDefault();
    const modId = event.currentTarget.dataset.modId;
    const modification = VehicleModificationManager.getModification(modId);

    if (!modification) return;

    // Check if can install
    const check = VehicleModificationManager.canInstallModification(
      modification,
      this.stockShip,
      this.modifications
    );

    if (!check.canInstall) {
      ui.notifications.warn(check.reason);
      return;
    }

    // Add to modifications list
    this.modifications.push(modification);

    // Update Marl's dialogue
    this.marlDialogue = this._getModificationCommentary();

    this.render(false);
  }

  /**
   * Remove a modification
   */
  async _onRemoveModification(event) {
    event.preventDefault();
    const modId = event.currentTarget.dataset.modId;

    this.modifications = this.modifications.filter(mod => mod.id !== modId);

    this.marlDialogue = `*Marl watches you remove the modification*

"Second thoughts? That's fine. Better to change your mind now than after you're in a firefight and realize you needed those shields after all."`;

    this.render(false);
  }

  /**
   * Show modification details
   */
  _onShowModificationDetails(event) {
    event.preventDefault();
    const modId = event.currentTarget.dataset.modId;
    const modification = VehicleModificationManager.getModification(modId);

    if (!modification) return;

    const cost = VehicleModificationManager.calculateModificationCost(
      modification,
      this.stockShip
    );

    const content = `
      <div class="modification-details">
        <h3>${modification.name}</h3>
        <p><strong>Category:</strong> ${modification.category}</p>
        <p><strong>Emplacement Points:</strong> ${modification.emplacementPoints}</p>
        <p><strong>Cost:</strong> ${cost.toLocaleString()} credits</p>
        <p><strong>Availability:</strong> ${modification.availability}</p>
        ${modification.sizeRestriction ? `<p><strong>Size Restriction:</strong> ${modification.sizeRestriction}</p>` : ''}
        ${modification.damage ? `<p><strong>Damage:</strong> ${modification.damage}</p>` : ''}
        <p><strong>Effect:</strong> ${modification.effect}</p>
        <p>${modification.description}</p>
      </div>
    `;

    new Dialog({
      title: modification.name,
      content: content,
      buttons: {
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: "Close"
        }
      }
    }).render(true);
  }

  /**
   * Finalize the ship and save to actor
   */
  async _onFinalizeShip(event) {
    event.preventDefault();

    if (!this.stockShip) {
      ui.notifications.warn("Please select a stock ship first!");
      return;
    }

    const confirmed = await Dialog.confirm({
      title: "Finalize Starship?",
      content: `
        <p>Finalize this starship configuration?</p>
        <p><strong>Ship:</strong> ${this.stockShip.name}</p>
        <p><strong>Modifications:</strong> ${this.modifications.length}</p>
        <p><strong>Total Cost:</strong> ${VehicleModificationManager.calculateTotalCost(this.modifications, this.stockShip).toLocaleString()} credits</p>
        <hr/>
        <p><em>Marl Skindar:</em> "Well, that's it then. She's all yours. Try not to crash her on the first flight. Or the second. Actually, just... try not to crash at all. Good luck out there!"</p>
      `
    });

    if (!confirmed) return;

    // Save configuration to actor
    await this.// AUTO-CONVERT actor.update -> ProgressionEngine (confidence=0.00)
// TODO: manual migration required. Original: globalThis.SWSE.ActorEngine.updateActor(actor, {
      'system.vehicle': {
        stockShip: this.stockShip,
        modifications: this.modifications,
        totalCost: VehicleModificationManager.calculateTotalCost(this.modifications, this.stockShip)
      }
    });
globalThis.SWSE.ActorEngine.updateActor(actor, {
      'system.vehicle': {
        stockShip: this.stockShip,
        modifications: this.modifications,
        totalCost: VehicleModificationManager.calculateTotalCost(this.modifications, this.stockShip)
      }
    });
/* ORIGINAL: globalThis.SWSE.ActorEngine.updateActor(actor, {
      'system.vehicle': {
        stockShip: this.stockShip,
        modifications: this.modifications,
        totalCost: VehicleModificationManager.calculateTotalCost(this.modifications, this.stockShip)
      }
    }); */


    ui.notifications.info(`Starship configuration saved to ${this.actor.name}!`);
    this.close();
  }

  /**
   * Reset the ship configuration
   */
  async _onResetShip(event) {
    event.preventDefault();

    const confirmed = await Dialog.confirm({
      title: "Reset Starship?",
      content: `<p>Reset your entire starship configuration?</p>
        <p><em>Marl:</em> "Starting over? That's fine. Most of my best ships came from the fifth or sixth design iteration. Or was it seventh? I've lost count."</p>`
    });

    if (!confirmed) return;

    this.stockShip = null;
    this.modifications = [];
    this.currentStep = 'intro';
    this.marlDialogue = '';
    this.render(true);
  }

  /**
   * Static method to open the app
   */
  static async open(actor) {
    // Initialize the manager if needed
    if (!VehicleModificationManager._initialized) {
      await VehicleModificationManager.init();
    }

    const app = new VehicleModificationApp(actor);
    app.render(true);
  }
}

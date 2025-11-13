// ============================================
// SWSE Character Generator - NARRATIVE ENHANCED
// Personalized responses, talent tree visualization
// ============================================

import CharacterGeneratorImproved from './chargen-improved.js';

export default class CharacterGeneratorNarrative extends CharacterGeneratorImproved {

  constructor(options) {
    super(options);
    this.narratorPersonality = this._selectNarratorPersonality();
    this.selectedTalentTree = null;
    this.talentData = null;
  }

  async getData() {
    const context = await super.getData();

    // Add narrator commentary
    context.narratorComment = this._getNarratorComment();

    // Load talent data if not already loaded
    if (!this.talentData) {
      await this._loadTalentData();
    }

    return context;
  }

  // ========================================
  // NARRATOR PERSONALITY SYSTEM
  // ========================================

  _selectNarratorPersonality() {
    const personalities = ['snarky', 'wise', 'excited', 'mysterious', 'sarcastic'];
    return personalities[Math.floor(Math.random() * personalities.length)];
  }

  _getNarratorComment() {
    const step = this.characterData.currentStep;
    const personality = this.narratorPersonality;

    switch(step) {
      case 'name':
        return this._getNameComment(personality);
      case 'species':
        return this._getSpeciesComment(personality);
      case 'abilities':
        return this._getAbilitiesComment(personality);
      case 'class':
        return this._getClassComment(personality);
      case 'talents':
        return this._getTalentsComment(personality);
      case 'skills':
        return this._getSkillsComment(personality);
      case 'summary':
        return this._getSummaryComment(personality);
      default:
        return '';
    }
  }

  _getNameComment(personality) {
    const comments = {
      snarky: [
        "Ah, picking a name. The hardest part of character creation. Or is it?",
        "Choose wisely. This name will echo through the galaxy... or at least this campaign.",
        "A name is just a label, but make it a GOOD one."
      ],
      wise: [
        "Names hold power in the Force. Choose one that resonates with your destiny.",
        "The first step on any journey is knowing who you are.",
        "A Jedi's name becomes legend. What will yours be?"
      ],
      excited: [
        "YES! Let's create an AMAZING character! First, what's their name?!",
        "This is going to be SO COOL! What should we call your hero?",
        "Oh boy oh boy! Time to name your galactic adventurer!"
      ],
      mysterious: [
        "Names are but shadows of our true selves... but we need one anyway.",
        "The Force whispers to me... it asks, what shall we call you?",
        "Identity is fluid, names are permanent. Choose carefully..."
      ],
      sarcastic: [
        "Oh great, another would-be hero. What's the name this time?",
        "Let me guess, you're gonna name them after your cat, aren't you?",
        "Pick a name. Any name. Preferably one that doesn't make me cringe."
      ]
    };

    const list = comments[personality] || comments.snarky;
    return list[Math.floor(Math.random() * list.length)];
  }

  _getAbilitiesComment(personality) {
    const abilities = this.characterData.abilities;

    // Determine highest ability
    let highest = null;
    let highestVal = 0;
    for (const [key, data] of Object.entries(abilities)) {
      if (data.total > highestVal) {
        highestVal = data.total;
        highest = key;
      }
    }

    const abilityComments = {
      str: {
        snarky: "Ah, a muscle-head! Because brains are overrated, right?",
        wise: "Strength of body can move mountains. But remember: true power comes from within.",
        excited: "WOW! Look at those MUSCLES! You're gonna CRUSH things!",
        mysterious: "Physical prowess... the crudest manifestation of power, yet effective.",
        sarcastic: "High Strength? Let me guess, you'll solve every problem by hitting it."
      },
      dex: {
        snarky: "Nimble fingers and quick feet. A duelist's dream... or a pickpocket's.",
        wise: "Agility serves both the warrior and the diplomat. A valuable asset.",
        excited: "ZOOOM! You're gonna be SO FAST! Like a speeder bike!",
        mysterious: "Grace and precision... the hallmarks of a true artist of combat.",
        sarcastic: "High Dex? Great, another flippy-spinny character."
      },
      con: {
        snarky: "Tough as a rancor, twice as stubborn. Good luck killing THIS one.",
        wise: "Endurance is the foundation upon which all great deeds are built.",
        excited: "You're gonna be SUPER TOUGH! Nothing can stop you!",
        mysterious: "Resilience... the quiet strength that outlasts all flashy displays.",
        sarcastic: "High Con? So you're a damage sponge. How... thrilling."
      },
      int: {
        snarky: "Ah, a big brain! Finally, someone who can actually READ the rulebook.",
        wise: "Knowledge is the path to understanding. The Force flows through all who seek wisdom.",
        excited: "SO SMART! You're gonna know EVERYTHING!",
        mysterious: "Intelligence... the key to unlocking the universe's deepest secrets.",
        sarcastic: "High Intelligence? Don't worry, your party won't appreciate it."
      },
      wis: {
        snarky: "Perceptive AND insightful? Careful, you might actually survive.",
        wise: "Wisdom is the rarest of gifts. You see beyond what others merely observe.",
        excited: "You're gonna be SO WISE! Like a Jedi Master!",
        mysterious: "Perception pierces all veils... you will see what others cannot.",
        sarcastic: "High Wisdom? Too bad you can't use it to make better life choices... like playing this campaign."
      },
      cha: {
        snarky: "Charming AND persuasive? You're either the face of the party or a used speeder salesman.",
        wise: "Charisma is the Force's way of saying 'you have a gift for inspiring others.'",
        excited: "EVERYONE'S GONNA LOVE YOU! You're so CHARMING!",
        mysterious: "The power to bend others to your will through mere presence... fascinating.",
        sarcastic: "High Charisma? Great, another smooth-talker who thinks they can seduce the BBEG."
      }
    };

    if (highest && abilityComments[highest]) {
      return abilityComments[highest][personality] || abilityComments[highest].snarky;
    }

    return "Interesting ability spread. Let's see how this plays out...";
  }

  _getClassComment(personality) {
    const classes = this.characterData.classes;
    if (classes.length === 0) return '';

    const className = classes[0].name;

    const classComments = {
      'Jedi': {
        snarky: "A Jedi? How original. At least you didn't pick 'Darth' as your first name.",
        wise: "The path of the Jedi is noble and ancient. May the Force guide you.",
        excited: "AWESOME! LIGHTSABERS AND FORCE POWERS! THIS IS GONNA BE EPIC!",
        mysterious: "The Force calls to you... will you answer with light, or darkness?",
        sarcastic: "Jedi. *sigh* Let me guess, you're gonna try to solve everything peacefully?"
      },
      'Soldier': {
        snarky: "Soldier? Someone's gotta carry all the blasters. Might as well be you.",
        wise: "The warrior's path demands discipline, courage, and sacrifice.",
        excited: "YES! GUNS! LOTS OF GUNS! PEW PEW PEW!",
        mysterious: "A soldier knows that death walks beside them... always.",
        sarcastic: "Soldier. Because subtlety is for suckers, right?"
      },
      'Scoundrel': {
        snarky: "A scoundrel! I like you already. Just don't steal from the party.",
        wise: "The clever survive where the strong fall. Use your wits wisely.",
        excited: "Ooh, sneaky! You're gonna be like Han Solo!",
        mysterious: "Those who walk in shadows see truths others fear to acknowledge.",
        sarcastic: "Scoundrel? So you're gonna backstab the party. Got it."
      },
      'Noble': {
        snarky: "A Noble! How fancy. Do we need to bow, Your Highness?",
        wise: "Leadership is a heavy burden. Those with privilege must serve with honor.",
        excited: "Ooh la la! FANCY! You're gonna have SO MANY CREDITS!",
        mysterious: "Power and responsibility... the eternal balance of nobility.",
        sarcastic: "Noble. Great. Another entitled rich kid playing hero."
      },
      'Scout': {
        snarky: "Scout? Good choice. Someone needs to see the trap BEFORE the party walks into it.",
        wise: "The path finder goes where others fear to tread. Your courage will be tested.",
        excited: "ADVENTURE! EXPLORATION! You're gonna discover SO MUCH!",
        mysterious: "The unknown calls to you... and you answer without hesitation.",
        sarcastic: "Scout. So you're the one who gets to say 'I told you so' when everyone dies."
      }
    };

    const comment = classComments[className]?.[personality];
    if (comment) return comment;

    return `${className}... interesting choice. Let's see what you can do with it.`;
  }

  _getSpeciesComment(personality) {
    return '';  // Implement based on selected species
  }

  _getTalentsComment(personality) {
    const comments = {
      snarky: "Time to pick talents. Try not to min-max TOO hard.",
      wise: "Talents are expressions of your training and experience. Choose what resonates with your path.",
      excited: "TALENT TIME! These are gonna make you SO POWERFUL!",
      mysterious: "Your abilities crystallize here... choose the path that calls to you.",
      sarcastic: "Talents. Because your class features weren't enough, apparently."
    };
    return comments[personality] || comments.snarky;
  }

  _getSkillsComment(personality) {
    const comments = {
      snarky: "Skills! Because knowing how to hack a computer is occasionally useful.",
      wise: "Every skill is a tool. A wise individual masters many.",
      excited: "SO MANY THINGS TO LEARN! What are you gonna be good at?!",
      mysterious: "Skills define what you can do... but talent determines what you will do.",
      sarcastic: "Skills. Sure, go ahead and put points in 'Use Rope' or whatever."
    };
    return comments[personality] || comments.snarky;
  }

  _getSummaryComment(personality) {
    const totalMods = Object.values(this.characterData.abilities)
      .reduce((sum, ab) => sum + (ab.mod || 0), 0);

    if (totalMods >= 12) {
      return this._getEpicSummaryComment(personality);
    } else if (totalMods <= -2) {
      return this._getTerribleSummaryComment(personality);
    } else {
      return this._getAverageSummaryComment(personality);
    }
  }

  _getEpicSummaryComment(personality) {
    const comments = {
      snarky: "Well, LOOK at you! Someone rolled well. Try not to let it go to your head.",
      wise: "Your potential is extraordinary. Use it wisely, for great power demands great responsibility.",
      excited: "WHOA! YOUR CHARACTER IS AMAZING! This is gonna be SO EPIC!",
      mysterious: "Impressive... the Force is strong with this one.",
      sarcastic: "Wow, amazing stats. Let's see how fast you can get them killed."
    };
    return comments[personality] || comments.snarky;
  }

  _getTerribleSummaryComment(personality) {
    const comments = {
      snarky: "Oof. Those are... certainly numbers. May the Force be with you. You're gonna need it.",
      wise: "Even the weakest spark can ignite a great fire. Your journey will be challenging, but not impossible.",
      excited: "Hey, it's not about the stats, it's about having FUN! ...right?",
      mysterious: "Adversity reveals true character. You will be tested.",
      sarcastic: "Those stats are tragic. Want to reroll before it's too late?"
    };
    return comments[personality] || comments.snarky;
  }

  _getAverageSummaryComment(personality) {
    const comments = {
      snarky: "Solid. Not amazing, not terrible. Perfectly average. The galaxy needs people like you too, I guess.",
      wise: "A balanced beginning. Your choices will determine your path more than your attributes.",
      excited: "Looking good! Your character is gonna be awesome!",
      mysterious: "Average power, unlimited potential. Let us see what you become.",
      sarcastic: "Congrats on your aggressively mediocre stat line."
    };
    return comments[personality] || comments.snarky;
  }

  // ========================================
  // TALENT TREE SYSTEM
  // ========================================

  async _loadTalentData() {
    try {
      // Load talents from compendium
      const talentPack = game.packs.get('swse.talents');
      if (talentPack) {
        const talents = await talentPack.getDocuments();
        this.talentData = talents;
        console.log(`SWSE CharGen | Loaded ${talents.length} talents`);
      }
    } catch (err) {
      console.error('SWSE CharGen | Failed to load talents:', err);
      this.talentData = [];
    }
  }

  async _onSelectTalentTree(event) {
    event.preventDefault();
    const treeName = event.currentTarget.dataset.tree;

    this.selectedTalentTree = treeName;

    // Build talent tree visualization
    await this._showTalentTreeDialog(treeName);
  }

  async _showTalentTreeDialog(treeName) {
    const talents = this.talentData.filter(t => t.system?.talent_tree === treeName || t.name.includes(treeName));

    if (talents.length === 0) {
      ui.notifications.warn(`No talents found for ${treeName}`);
      return;
    }

    // Build prerequisite map
    const talentMap = {};
    const talentGraph = {};

    talents.forEach(talent => {
      talentMap[talent.name] = talent;
      talentGraph[talent.name] = {
        talent: talent,
        prereqs: [],
        dependents: []
      };
    });

    // Map prerequisites
    talents.forEach(talent => {
      const prereq = talent.system?.prerequisites || talent.system?.prereqassets;
      if (prereq && prereq !== 'null') {
        const prereqNames = prereq.split(',').map(p => p.trim());
        prereqNames.forEach(pName => {
          if (talentGraph[pName]) {
            talentGraph[talent.name].prereqs.push(pName);
            talentGraph[pName].dependents.push(talent.name);
          }
        });
      }
    });

    // Generate HTML for talent tree
    const treeHtml = this._generateTalentTreeHtml(treeName, talentGraph);

    // Show dialog
    new Dialog({
      title: `${treeName} Talent Tree`,
      content: treeHtml,
      buttons: {
        close: {
          icon: '<i class="fas fa-times"></i>',
          label: "Close"
        }
      },
      default: "close",
      render: (html) => {
        // Add click handlers for talent selection
        html.find('.talent-node').click((e) => {
          const talentName = $(e.currentTarget).data('talent-name');
          this._selectTalent(talentName);
        });

        // Highlight prerequisites
        html.find('.talent-node').hover(
          (e) => {
            const talentName = $(e.currentTarget).data('talent-name');
            const node = talentGraph[talentName];
            if (node) {
              node.prereqs.forEach(prereq => {
                html.find(`[data-talent-name="${prereq}"]`).addClass('highlight-prereq');
              });
              node.dependents.forEach(dep => {
                html.find(`[data-talent-name="${dep}"]`).addClass('highlight-dependent');
              });
            }
          },
          () => {
            html.find('.talent-node').removeClass('highlight-prereq highlight-dependent');
          }
        );
      }
    }, {
      width: 800,
      height: 600,
      classes: ['talent-tree-dialog']
    }).render(true);
  }

  _generateTalentTreeHtml(treeName, talentGraph) {
    // Check if deflect/block should be grouped (houserule)
    const groupDeflectBlock = game.settings.get("swse", "groupDeflectBlock") || false;

    let html = `
      <div class="talent-tree-container">
        <h3>${treeName}</h3>
        <div class="talent-tree-canvas">
          <svg class="talent-connections" width="100%" height="100%">
    `;

    // Draw connection lines
    let svgLines = '';
    let yPos = 50;
    let talentPositions = {};

    // Organize talents into tiers (by prerequisite depth)
    const tiers = this._organizeTalentsIntoTiers(talentGraph);

    // Position and render talents
    tiers.forEach((tier, tierIndex) => {
      const xSpacing = 100 / (tier.length + 1);
      tier.forEach((talentName, index) => {
        const xPos = (index + 1) * xSpacing;
        talentPositions[talentName] = { x: xPos, y: yPos };
      });
      yPos += 120;
    });

    // Draw connection lines between prerequisites
    Object.entries(talentGraph).forEach(([talentName, node]) => {
      const talentPos = talentPositions[talentName];
      if (!talentPos) return;

      node.prereqs.forEach(prereqName => {
        const prereqPos = talentPositions[prereqName];
        if (!prereqPos) return;

        svgLines += `
          <line
            x1="${prereqPos.x}%"
            y1="${prereqPos.y + 30}"
            x2="${talentPos.x}%"
            y2="${talentPos.y}"
            class="talent-connection"
            stroke="#00d9ff"
            stroke-width="2"
          />
        `;
      });
    });

    html += svgLines + '</svg><div class="talent-nodes">';

    // Render talent nodes
    Object.entries(talentPositions).forEach(([talentName, pos]) => {
      const talent = talentGraph[talentName].talent;
      const isGrouped = groupDeflectBlock && (talentName === 'Block' || talentName === 'Deflect');

      html += `
        <div class="talent-node ${isGrouped ? 'grouped-talent' : ''}"
             style="left: ${pos.x}%; top: ${pos.y}px;"
             data-talent-name="${talentName}"
             title="${talent.system?.benefit || 'No description'}">
          <div class="talent-icon">
            <img src="${talent.img}" alt="${talentName}" />
          </div>
          <div class="talent-name">${talentName}</div>
          ${isGrouped ? '<div class="grouped-indicator">Grouped</div>' : ''}
        </div>
      `;
    });

    html += `
        </div>
      </div>
    </div>
    <style>
      .talent-tree-container {
        position: relative;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 8px;
        padding: 1rem;
        min-height: 500px;
      }
      .talent-tree-canvas {
        position: relative;
        width: 100%;
        height: 500px;
      }
      .talent-connections {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1;
        pointer-events: none;
      }
      .talent-nodes {
        position: relative;
        z-index: 2;
        height: 100%;
      }
      .talent-node {
        position: absolute;
        width: 80px;
        text-align: center;
        cursor: pointer;
        transform: translate(-50%, 0);
        transition: all 0.3s;
      }
      .talent-node:hover {
        transform: translate(-50%, -5px) scale(1.1);
      }
      .talent-icon {
        width: 60px;
        height: 60px;
        margin: 0 auto;
        border: 3px solid #0a74da;
        border-radius: 50%;
        overflow: hidden;
        background: rgba(0, 0, 0, 0.5);
      }
      .talent-icon img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .talent-name {
        margin-top: 0.5rem;
        font-size: 0.75rem;
        color: #e0e0e0;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
      }
      .grouped-talent .talent-icon {
        border-color: #ffa500;
        box-shadow: 0 0 10px rgba(255, 165, 0, 0.6);
      }
      .grouped-indicator {
        font-size: 0.65rem;
        color: #ffa500;
        font-weight: bold;
      }
      .highlight-prereq {
        filter: brightness(1.5);
      }
      .highlight-prereq .talent-icon {
        border-color: #00ff00;
        box-shadow: 0 0 15px rgba(0, 255, 0, 0.8);
      }
      .highlight-dependent {
        filter: brightness(1.3);
      }
      .highlight-dependent .talent-icon {
        border-color: #ff00ff;
        box-shadow: 0 0 15px rgba(255, 0, 255, 0.8);
      }
    </style>
    `;

    return html;
  }

  _organizeTalentsIntoTiers(talentGraph) {
    const tiers = [];
    const assigned = new Set();

    // Find root talents (no prerequisites)
    const roots = Object.entries(talentGraph)
      .filter(([name, node]) => node.prereqs.length === 0)
      .map(([name]) => name);

    if (roots.length > 0) {
      tiers.push(roots);
      roots.forEach(r => assigned.add(r));
    }

    // Assign remaining talents to tiers based on prerequisite depth
    let currentTier = roots;
    while (assigned.size < Object.keys(talentGraph).length && currentTier.length > 0) {
      const nextTier = [];

      currentTier.forEach(talentName => {
        const node = talentGraph[talentName];
        node.dependents.forEach(depName => {
          if (!assigned.has(depName)) {
            const depNode = talentGraph[depName];
            // Check if all prerequisites are assigned
            if (depNode.prereqs.every(p => assigned.has(p))) {
              nextTier.push(depName);
              assigned.add(depName);
            }
          }
        });
      });

      if (nextTier.length > 0) {
        tiers.push(nextTier);
        currentTier = nextTier;
      } else {
        break;
      }
    }

    return tiers;
  }

  _selectTalent(talentName) {
    const talent = this.talentData.find(t => t.name === talentName);
    if (!talent) return;

    // Check if already selected
    if (this.characterData.talents.find(t => t.name === talentName)) {
      ui.notifications.warn(`You already have ${talentName}`);
      return;
    }

    // Add to character
    this.characterData.talents.push(talent);
    ui.notifications.info(`${talentName} added!`);

    console.log(`SWSE CharGen | Selected talent: ${talentName}`);
  }

  // ========================================
  // ENHANCED ACTIVATION
  // ========================================

  activateListeners(html) {
    super.activateListeners(html);

    // Talent tree selection
    html.find('.select-talent-tree').click(this._onSelectTalentTree.bind(this));

    // Display narrator comments
    const commentBox = html.find('.narrator-comment');
    if (commentBox.length > 0) {
      const comment = this._getNarratorComment();
      commentBox.text(comment).fadeIn();
    }
  }
}

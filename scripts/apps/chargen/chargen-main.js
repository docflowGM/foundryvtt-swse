// ============================================
// Main CharacterGenerator class
// Orchestrates all chargen functionality
// ============================================

import { SWSELogger } from '../../utils/logger.js';
import { PrerequisiteRequirements } from '../../progression/feats/prerequisite_engine.js';
import { getTalentTreeName, getClassProperty, getTalentTrees, getHitDie } from './chargen-property-accessor.js';
import { HouseRuleTalentCombination } from '../../houserules/houserule-talent-combination.js';
import { BuildIntent } from '../../engine/BuildIntent.js';
import { SuggestionService } from '../../engine/SuggestionService.js';
import { MentorSurvey } from '../mentor-survey.js';
import { MentorSuggestionDialog } from '../mentor-suggestion-dialog.js';
import { MENTORS } from '../mentor-dialogues.js';
import { getMentorMemory, setMentorMemory, setTargetClass } from '../../engine/mentor-memory.js';

// SSOT Data Layer
import { ClassesDB } from '../../data/classes-db.js';

// Import all module functions
import * as SharedModule from './chargen-shared.js';
import { ChargenDataCache } from './chargen-shared.js';
import * as DroidModule from './chargen-droid.js';
import * as SpeciesModule from './chargen-species.js';
import { _filterSpecies, _sortSpeciesBySource } from './chargen-species.js';
import * as BackgroundsModule from './chargen-backgrounds.js';
import * as ClassModule from './chargen-class.js';
import * as AbilitiesModule from './chargen-abilities.js';
import * as SkillsModule from './chargen-skills.js';
import * as LanguagesModule from './chargen-languages.js';
import * as FeatsTalentsModule from './chargen-feats-talents.js';
import * as ForcePowersModule from './chargen-force-powers.js';
import * as StarshipManeuversModule from './chargen-starship-maneuvers.js';
import { renderTalentTreeGraph, getTalentsInTree } from './chargen-talent-tree-graph.js';

export default class CharacterGenerator extends Application {
  constructor(actor = null, options = {}) {
    super(options);
    this.actor = actor;
    this.actorType = options.actorType || "character"; // "character" for PCs, "npc" for NPCs
    this.mentor = null; // Mentor character for survey prompts (initialized when needed)
    this.singleStepMode = options.singleStepMode || false; // Close after confirming single step
    this._creatingActor = false; // Re-entry guard for character creation
    this.characterData = {
      name: "",
      isDroid: false,
      droidDegree: "",
      droidSize: "medium",
      species: "",
      size: "Medium",  // Character size (Small, Medium, Large)
      specialAbilities: [],  // Racial special abilities
      languages: [],  // Known languages
      racialSkillBonuses: [],  // Racial skill bonuses (e.g., "+2 Perception")
      speciesSource: "",  // Source book for species
      speciesFilters: {  // Filters for species selection
        attributeBonus: null,  // Filter by attribute bonus (str, dex, con, int, wis, cha)
        attributePenalty: null,  // Filter by attribute penalty
        size: null  // Filter by size category
      },
      background: null,  // Selected background (Event, Occupation, or Planet)
      backgroundCategory: "events",  // Current background category tab
      backgroundSkills: [],  // Skills selected from background
      backgroundNarratorComment: "",  // Ol' Salty's comment for current category
      skillFilter: null,  // Active skill filter for backgrounds
      languageFilter: null,  // Active language filter for backgrounds
      allowHomebrewPlanets: false,  // Toggle for homebrew planets
      occupationBonus: null,  // Occupation untrained skill bonuses
      importedDroidData: null,
      preselectedSkills: [],
      droidSystems: {
        locomotion: null,
        processor: { name: "Heuristic Processor", cost: 0, weight: 5 }, // Free
        appendages: [
          { name: "Hand", cost: 0, weight: 5 }, // Free
          { name: "Hand", cost: 0, weight: 5 }  // Free
        ],
        accessories: [],
        totalCost: 0,
        totalWeight: 10
      },
      droidCredits: {
        base: 1000,
        class: 0,
        spent: 0,
        remaining: 1000
      },
      classes: [],
      abilities: {
        str: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        dex: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        con: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        int: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        wis: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 },
        cha: { base: 10, racial: 0, temp: 0, total: 10, mod: 0 }
      },
      skills: {},
      trainedSkills: [],  // Track which skills are trained (for progression)
      classSkillsList: [],  // List of skills that are class skills for this class
      trainedSkillsAllowed: 0,  // Total number of skill trainings allowed
      feats: [],
      featsRequired: 1, // Base 1, +1 for Human
      talents: [],
      talentsRequired: 1, // 1 talent at level 1
      powers: [],
      forcePowersRequired: 0, // Calculated based on Force Sensitivity and Force Training feats
      starshipManeuvers: [],
      starshipManeuversRequired: 0, // Calculated based on Starship Tactics feats
      level: 1,
      hp: { value: 1, max: 1, temp: 0 },
      forcePoints: { value: 5, max: 5, die: "1d6" },
      destinyPoints: { value: 1 },
      secondWind: { uses: 1, max: 1, misc: 0, healing: 0 },
      defenses: {
        fort: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 10, ability: 'con' },
        reflex: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 12, ability: 'dex' },
        will: { base: 10, armor: 0, ability: 0, classBonus: 0, misc: 0, total: 11, ability: 'wis' }
      },
      bab: 0,
      speed: 6,
      damageThresholdMisc: 0,
      credits: 1000  // Starting credits
    };
    this.currentStep = "name";
    this.selectedTalentTree = null;  // For two-step talent selection
    this.freeBuild = false;  // Free build mode bypasses validation
    this.skippedSteps = new Set();  // Track which steps have been skipped

    // Caches for compendia
    this._packs = {
      species: null,
      feats: null,
      talents: null,
      classes: null,
      droids: null,
      forcePowers: null,
      maneuvers: null
    };
    this._skillsJson = null;
    this._featMetadata = null;

    // If an actor is provided, populate characterData from it
    if (this.actor) {
      this._loadFromActor(actor);
    }
  }

  /**
   * Override render to preserve scroll position during updates
   * @override
   */
  async render(force = false, options = {}) {
    // Store scroll positions before render
    const scrollPositions = {};
    if (this.element?.length > 0 && this.element[0]) {
      for (const selector of this.constructor.defaultOptions?.scrollY || []) {
        const el = this.element[0]?.querySelector(selector);
        if (el) {
          scrollPositions[selector] = el.scrollTop;
        }
      }
    }

    // Call parent render
    const result = await super.render(force, options);

    // Restore scroll positions after render
    if (this.element?.length > 0 && this.element[0]) {
      for (const [selector, scrollTop] of Object.entries(scrollPositions)) {
        const el = this.element[0]?.querySelector(selector);
        if (el) {
          el.scrollTop = scrollTop;
        }
      }
    }

    return result;
  }

  /**
   * Load character data from an existing actor
   * @param {Actor} actor - The actor to load from
   * @private
   */
  _loadFromActor(actor) {
    const system = actor.system;

    // Load basic info
    this.characterData.name = actor.name || "";
    this.characterData.level = system.level || 0;

    // Load species/droid status
    if (system.species) {
      this.characterData.species = system.species;
      this.characterData.isDroid = false;
    }
    if (system.isDroid) {
      this.characterData.isDroid = true;
      this.characterData.droidDegree = system.droidDegree || "";
      this.characterData.droidSize = system.size || "medium";
    }

    // Load abilities
    if (system.attributes) {
      for (const [key, value] of Object.entries(system.attributes)) {
        if (this.characterData.abilities[key]) {
          this.characterData.abilities[key].total = value.total ?? 10;
          this.characterData.abilities[key].base = value.base ?? 10;
        }
      }
    }

    // Load speed (ensure it's a valid number)
    if (system.speed && Number.isFinite(system.speed)) {
      this.characterData.speed = system.speed;
    } else {
      this.characterData.speed = 6;
    }

    // Load classes
    const classItems = actor.items.filter(item => item.type === 'class');
    this.characterData.classes = classItems.map(cls => ({
      name: cls.name,
      level: cls.system.level || 1
    }));

    // Load existing items as references
    this.characterData.feats = actor.items.filter(item => item.type === 'feat').map(f => f.name);
    this.characterData.talents = actor.items.filter(item => item.type === 'talent').map(t => t.name);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "chargen", "swse-app"],
      template: "systems/foundryvtt-swse/templates/apps/chargen.hbs",
      width: 900,
      height: 700,
      title: "Character Generator",
      resizable: true,
      draggable: true,
      scrollY: [".chargen-content", ".step-content", ".window-content"],
      left: null,  // Allow Foundry to center
      top: null    // Allow Foundry to center
    });
  }

  /**
   * Comprehensive list of Star Wars-esque character names
   * Organized by complexity: human-like to deep alien
   */
  static RANDOM_NAMES = [
    // Human-esque masculine names
    "Lando Virex Tal", "Jarek Solan Marr", "Torvan Kree Ossik", "Malric Dorne Valen",
    "Daxen Vor Kell", "Brask Talor Kain", "Rynar Vex Holt", "Kael Orrix Juno",
    "Voren Thal Kryss", "Zarek Mon Daal", "Korrin Vel Ashur", "Talos Ren Virek",
    "Drel Kavos Morn", "Jaxel Prynn Tor", "Saren Kol Dravik", "Varek Ion Threx",
    "Halder Rune Sol", "Brex Kal Vonn", "Narek Silar Quen", "Morlan Dex Ro",
    "Cassik Vale Jorr", "Fenro Tharn Lux", "Orrin Kaas Vire", "Kelvan Drik Noor",
    "Xarno Ul Tessik", "Torik Val Marr", "Zorin Fal Dax", "Ronik Kree Val",
    "Ulric Vorin Taal", "Jorin Pell Strax", "Balrik Thorn Vex", "Raxen Sol Marrik",
    "Irek Dal Vonn", "Corvek Ash Draal", "Threx Om Vull", "Lorik Sen Korr",
    "Kyros Dune Val", "Brax Fen Dorr", "Alren Tosk Vire", "Dexar Nol Renn",
    "Harkin Void Kaal", "Varos Kyne Jorr", "Pellis Vorn Tak", "Kavor Rin Sol",
    "Draven Oss Kree", "Zarn Mal Virek", "Taryn Kol Voss", "Rellix Zho Marr",
    "Kress Daal Tor", "Yarek Phos Val",
    // Additional masculine names
    "Xar Vel Daal", "Torren Ash Vire", "Kalos Renn Thal", "Darek Mon Kree",
    "Vorn Sol Marr", "Jex Tal Noor", "Rovan Pell Ash", "Kellan Dorr Vex",
    "Sarn Kyne Val", "Brevin Tor Sol", "Malrex Vire Daal", "Orrik Juno Korr",
    "Fen Tal Marr", "Korr Ash Sol", "Zarik Venn Daal", "Dex Thorne Val",
    "Hal Vire Kess", "Jorin Sol Taal", "Varrek Daal Ash", "Rel Tor Kree",
    "Karesh Val Sol", "Rell Korr Marr", "Bronn Virex Tal", "Yorin Ash Kaal",
    "Talrek Voss Daal", "Sorek Pell Sol", "Nixor Marr Val", "Kave Tor Ash",
    "Drak Vire Sol", "Orr Tal Kess", "Zarnis Val Taal", "Krix Sol Dorr",
    "Mal Tor Vire", "Vorik Ash Marr", "Rax Pell Kaal", "Jast Val Sol",
    "Fenrik Daal Marr", "Tor Val Ash", "Kell Vire Taal", "Dexan Sol Noor",
    "Korrik Marr Ash", "Brask Daal Kree", "Varek Tor Sol", "Sarn Ash Val",
    "Orren Vire Marr", "Talrik Sol Kess", "Yex Daal Taal", "Kor Val Marr",
    "Rellin Ash Sol", "Jor Vire Noor",
    // Rimward/Exotic masculine names
    "Raxen Thorn Vaal", "Lyrix Venn Dorr", "Korr Tal Marrik", "Nyssa Pell Vael",
    "Jarek Sol Threx", "Kaela Voss Taal", "Fenro Marr Kaal", "Lira Dorr Sol",
    "Varos Thal Kree", "Xara Vire Pell", "Torik Kaal Marr", "Nyrix Sol Dorr",
    "Brask Thorn Vire", "Elra Vael Korr", "Rellin Daal Kree", "Kaelin Thorn Sol",
    "Jex Marr Vael", "Lyssa Korr Thal", "Fenrik Dorr Sol", "Xera Pell Marr",
    "Zarik Kree Thal", "Nyssa Vael Sol", "Torren Marr Kaal", "Lira Thorn Dorr",
    "Varrek Sol Vael", "Elin Kree Thal", "Rax Marr Dorr", "Lyrix Sol Kaal",
    "Jorin Vael Marr", "Xessa Thorn Kree",
    // Final 200 consolidated names (human to alien)
    "Rax Venn Daal", "Lyra Korr Sol", "Tarek Mon Vire", "Nyssa Val Marr",
    "Jorik Ash Taal", "Kaela Vire Noor", "Dax Pell Korr", "Mira Sol Daal",
    "Voren Kess Marr", "Elra Venn Ash", "Zarek Tor Sol", "Kira Daal Voss",
    "Malrek Ash Noor", "Talia Mon Korr", "Fen Val Marr", "Lyss Vire Sol",
    "Orrin Daal Ash", "Nyra Kess Val", "Jex Tor Marr", "Saela Sol Noor",
    "Korr Ash Daal", "Rysa Val Sol", "Brask Marr Korr", "Elin Vire Ash",
    "Tor Sol Daal", "Mira Korr Val", "Dex Ash Noor", "Lyra Marr Sol",
    "Varrek Daal Kess", "Nyx Vire Val", "Soren Sol Marr", "Kaelin Ash Korr",
    "Jora Daal Sol", "Taryn Val Noor", "Rell Korr Ash", "Lyssa Marr Daal",
    "Fenrik Sol Val", "Elara Vire Kess", "Korrin Ash Noor", "Mira Sol Marr",
    "Zella Val Daal", "Torrek Korr Sol", "Nyra Ash Marr", "Dexan Vire Noor",
    "Sael Kess Val", "Lyra Sol Korr", "Orr Daal Ash", "Kira Marr Sol",
    "Bronn Val Noor", "Elin Korr Ash",
    // Alien-forward names
    "Xor'ven Thul Marr", "Lyx'ara Vaash Sol", "Korr'tek Ul Daal", "Nyx'ira Phal Marr",
    "Torq'ith Krexx Sol", "Ka'thra Vaash Daal", "Fen'orr Ul Marr", "Lir'iss Phal Sol",
    "Vrek'mon Thul Daal", "Xyra'tek Ul Marr", "Orr'ka Phess Sol", "Zuun'ara Vaash Daal",
    "Threx'lin Ul Marr", "Ka'ira Phal Sol", "Xorr'mon Krexx Daal", "Lyx'ira Vaash Marr",
    "Khaal'tek Ul Sol", "Torq'mon Thul Marr", "Xera'li Ul Sol", "Orryx Vaash Daal",
    "Zhekk'ira Phal Marr", "Korr'uun Krexx Sol", "Lyra'thul Daal", "Fen'tek Ul Marr",
    // Deep alien names
    "Xor'vaq Thul Krexx", "Kha'driss Ul Phal", "Zuun'tek Vaash Daal", "Orr'kess Krexx Sol",
    "Threx'uun Ul Marr", "Lyx'ara Phess Kaal", "Xhekk Thul Ul", "Ka'mon Vaash Krexx",
    "Orryx Phal Daal", "Zha'ira Ul Sol", "Xurr'tek Krexx Marr", "Khaal'iss Phal Ul",
    "Threx'ira Vaash Daal", "Orr'uun Krexx Sol", "Zuun'mon Ul Marr", "Lyx'tek Phess Sol",
    "Xhekk'ira Thul Daal", "Ka'drin Vaash Ul", "X'qorr Thul'kresh", "Ka'zhir Ul-Vaash",
    "Orr'xeth Phal'uun", "Zuun'kra Krexx'ith", "Threx'qa Ul-Sol",
    // Feminine names
    "Lira Venn Solari", "Kaela Rynn Voss", "Mira Tal Kree", "Jessa Orin Val",
    "Nyx Solenne Marr", "Aria Virex Daal", "Talia Ren Korr", "Selene Ash Vire",
    "Vexa Thorn Lux", "Rina Kel Sol", "Sora Valen Jex", "Kyra Noa Pell",
    "Elin Dorne Marr", "Zara Venn Kaal", "Lyra Tess Sol", "Cira Mon Val",
    "Anya Kree Voss", "Thessa Rune Daal", "Rhea Sol Korr", "Kessa Vire Lux",
    "Nira Tal Ash", "Velis Dorne Quen", "Phaela Rin Sol", "Jynra Kaas Vire",
    "Orria Mon Vale", "Taryn Lys Daal", "Saela Thorn Kree", "Mysa Venn Val",
    "Elara Korr Sol", "Zella Ash Marr", "Kaelin Virex Noor", "Rysa Pell Kree",
    "Nyra Sol Taal", "Vala Renn Ash", "Jora Kess Val", "Thalia Daal Korr",
    "Sira Vex Sol", "Kora Mon Tal", "Alis Thorn Marr", "Lyssa Vire Noor",
    "Lyra Venn Daal", "Kaela Sol Marr", "Nira Ash Val", "Tessa Korr Sol",
    "Vela Mon Noor", "Jyn Sol Vire", "Rysa Daal Ash", "Elin Tor Marr",
    "Kira Sol Taal", "Zella Vire Ash",
    // Alien-forward feminine
    "Xyra'li Vesh Taal", "Sha'renn Ul Korr", "Vexa'na Thul Marr", "Lir'iss Phal Vire",
    "Ka'thra Zuun Sol", "Nyxara Vaal Krexx", "Orr'la Phess Daal", "Zheela Va'resh",
    "Tiss'ka Norr Val", "Xala'mon Ruun", "Kree'la Vith Sol", "Phex'ari Ul Marr",
    "Shaq'ra Zaal Kess", "Lyx Venn'thra", "Vaela'qen Dorr", "Nesh'ira Karesh",
    "Zira Kaal'eth", "Threx'a Sol Marr", "Orryx Phal'na", "Xyss Ul-Kree",
    "Xyra'na Vesh Sol", "Sha'la Ul Marr", "Vexa'li Thul Daal", "Lir'iss Phal Noor",
    "Kree'la Vith Sol", "Phex'ari Ul Marr",
    // Deep alien feminine
    "Xa'li Thress Ul", "Kheera'mon Vaash", "Orr'issa Phal Daal", "Zuun'ira Krexx",
    "Thala'qen Mol Sol", "Vrixa Ul'mon", "Sha'tek Naash Dorr", "Lyrr Phess Vaal",
    "Xess'ka Orr Marr", "Kaal'ira Thul", "Zhaela Krell Sol", "Orr'ith Vaash Noor",
    "Xyraxx Phal'mon", "Thiss Ul Kaal", "Vaela Skorr Daal", "Zhekk'ira Sol",
    "Lur'na Krexx Marr", "Orryx'a Vaal", "Kress'li Phal Noor", "Xuun'ara Thul"
  ];

  /**
   * Comprehensive list of Star Wars-esque droid names
   * Organized by type: Astromechs, Military/Security, Protocol, Assassin, Industrial, Mixed Rim
   */
  static RANDOM_DROID_NAMES = [
    // Standard alphanumeric designations (basic series)
    "A1-K7", "B4-T9", "C7-R4", "D2-M8", "E9-K3", "F3-L6", "G8-P1", "H2-V7",
    "I5-X9", "J4-D2", "K9-R8", "L3-T5", "M7-Q1", "N4-Z6", "O2-K9", "P6-R3",
    "Q8-D5", "R5-M1", "S7-K4", "T1-V9", "U3-R6", "V8-D2", "W5-K7", "X4-P9",
    "Y9-M3", "Z2-R8", "A7-D9", "B2-K4", "C5-M8", "D9-R1", "E3-V7", "F6-K2",
    "G4-T9", "H8-R5", "I1-M7", "J9-D4", "K5-V3", "L7-R8", "M2-K6", "N9-T4",
    "O6-D1", "P3-M8", "Q5-R9", "R7-K2", "S4-V6", "T8-D5", "U1-M9", "V6-K4",
    "W9-R2", "X3-T7",
    // Astromech / Utility Feel
    "R8-K5", "D7-P3", "T4-M9", "K2-R6", "V9-D1", "M5-T8", "P7-K4", "R1-D9",
    "Q6-M3", "S8-K2", "T9-R4", "D3-V7", "K6-M1", "P4-R8", "M9-D2", "V1-K5",
    "R7-T3", "Q2-D6", "S5-M8", "T6-K9", "D1-R4", "K8-P7", "M3-V9", "R6-D5",
    "Q9-K2", "S1-T8", "V4-M7", "P5-D3", "R2-K6", "T7-M9",
    // Military / Security Droids
    "BX-9R", "DT-7K", "MK-4D", "SX-8T", "VR-6M", "HK-5Q", "TX-9D", "KR-2S",
    "PX-7M", "AX-4D", "BX-1K", "DT-9R", "MK-6S", "SX-3D", "VR-8T", "HK-2M",
    "TX-5Q", "KR-7D", "PX-9S", "AX-6M", "BX-4D", "DT-2K", "MK-8T", "SX-5M",
    "VR-3D", "HK-9Q", "TX-1D", "KR-4S", "PX-3M", "AX-9D", "BX-7K", "DT-4R",
    "MK-2D", "SX-6T", "VR-1M", "HK-7Q", "TX-8D", "KR-9S", "PX-2M", "AX-3D",
    "BX-5T", "DT-6K", "MK-3S", "SX-9D", "VR-4M",
    // Protocol / Civilian Models
    "P3-L9", "C7-M4", "H2-T8", "V5-P1", "L9-D7", "M4-K2", "S8-R3", "T6-P9",
    "D1-M5", "K7-L4", "P5-T2", "C1-D9", "H9-M6", "V3-L8", "L2-P4", "M7-T9",
    "S4-K1", "T8-D6", "D5-P3", "K9-M2", "P8-L1", "C9-M7", "H1-T5", "V9-P8",
    "L4-D2", "M6-K9", "S2-R7", "T1-P4", "D8-M3", "K4-L6", "P1-T4", "C4-D1",
    "H6-M9", "V2-L3", "L7-P5", "M1-T8", "S9-K6", "T3-D2", "D4-P7", "K2-M5",
    // Assassin / Black Ops Feel
    "X9-KR", "Z7-DX", "Q5-HK", "R8-VX", "S3-ZT", "M7-XR", "K4-QD", "D9-SX",
    "T2-VR", "P6-ZK", "X1-DQ", "Z9-KT", "Q7-XM", "R3-SD", "S8-VK", "M2-ZR",
    "K6-XT", "D4-QS", "T9-ZX", "P1-VR", "X6-KQ", "Z2-DM", "Q1-HX", "R9-VT",
    "S6-ZD", "M9-XK", "K1-QM", "D7-SX", "T5-VD", "P8-ZM", "X4-KD", "Z6-XT",
    "Q9-HM", "R2-VK", "S1-ZR", "M4-XD", "K7-QX", "D2-SM", "T8-VX", "P3-ZT",
    "X7-KM", "Z4-DX", "Q6-HK", "R5-VR",
    // Industrial / Labor Droids
    "L8-T3", "G5-M9", "R6-H2", "K1-P7", "T9-L4", "M3-G8", "P6-H5", "R2-T9",
    "L7-K4", "G9-M1", "H4-P8", "T6-G2", "M9-L5", "R3-K7", "P1-H6", "G8-T4",
    "L2-M9", "K5-P3", "T7-H1", "R9-G6", "L1-T8", "G3-M7", "R8-H9", "K9-P2",
    "T4-L1", "M6-G5", "P9-H3", "R1-T6", "L5-K2", "G7-M4", "H8-P9", "T2-G1",
    "M1-L8", "R7-K5", "P4-H2", "G2-T9", "L9-M3", "K8-P1", "T5-H7", "R4-G8",
    // Mixed / Obscure Rim Models
    "A9-RK", "B3-TD", "C8-MX", "D6-QP", "E1-KV", "F9-RD", "G2-TM", "H7-XK",
    "I4-QD", "J8-MP", "K3-VR", "L6-QT", "M1-XD", "N9-KP", "O4-RX", "P8-QM",
    "Q6-TK", "R1-XP", "S9-MD", "T3-VQ", "U7-RK", "V2-TD", "W5-MX", "X9-QP",
    "Y4-KV", "Z8-RD", "A3-TM", "B6-XK", "C1-QD", "D5-MP", "E9-VR", "F2-QT",
    "G7-XD", "H3-KP", "I8-RX", "J1-QM", "K5-TK", "L9-XP", "M4-MD", "N8-VQ",
    "O2-RK", "P7-TD", "Q1-MX", "R6-QP", "S3-KV", "T9-RD", "U4-TM", "V8-XK",
    // Additional variety
    "C-3PO", "2-1B", "BB-8", "K-2SO", "GNK-7", "IG-88", "TC-14", "WED-15",
    "EV-9D9", "0-0-0", "BT-1", "HK-47", "R-3PO", "L3-37", "Q9-X8", "V-5D7",
    "Z-6K4", "X-1T9", "W-7M2", "Y-4P5", "U-8R3", "T-2K6", "S-9D1", "R-4V8"
  ];

  /**
   * Filter out Force-dependent talents/feats for droids
   * Droids cannot be Force-sensitive in SWSE rules
   * @param {Array} items - Array of talents or feats
   * @returns {Array} Filtered array
   * @private
   */
  _filterForceDependentItems(items) {
    if (!this.characterData.isDroid) {
      return items; // Not a droid, no filtering needed
    }

    return items.filter(item => {
      const prereqs = item.system?.prerequisites || "";
      const preqsLower = prereqs.toLowerCase();
      // Exclude items that require Force Sensitivity, Force Techniques, Force Secrets, or Force Points
      return !(
        preqsLower.includes("force sensitivity") ||
        preqsLower.includes("force technique") ||
        preqsLower.includes("force secret") ||
        preqsLower.includes("force point")
      );
    });
  }

  async _loadData() {
    // Show loading notification (only if cache is empty)
    const showLoading = !ChargenDataCache.isCached();
    const loadingNotif = showLoading ? ui.notifications.info(
      "Loading character generation data...",
      { permanent: true }
    ) : null;

    try {
      // Use cached data if available, otherwise load
      const cachedPacks = await ChargenDataCache.getData();
      // PERFORMANCE: Use structural sharing - only clone if modifications are needed
      // The house rule below requires cloning for talents
      this._packs = { ...cachedPacks };

      // Apply Block/Deflect combination to talents if house rule enabled
      if (this._packs.talents) {
        this._packs.talents = HouseRuleTalentCombination.processBlockDeflectCombination(this._packs.talents);
      }

      // Validate critical packs
      const criticalPacks = ['species', 'classes', 'feats'];
      const missingCriticalPacks = [];

      for (const key of criticalPacks) {
        if (!this._packs[key] || this._packs[key].length === 0) {
          missingCriticalPacks.push(`swse.${key}`);
        }
      }

      // Block chargen if critical packs are missing
      if (missingCriticalPacks.length > 0) {
        const missingList = missingCriticalPacks.join(', ');
        ui.notifications.error(
          `Character generation cannot continue. Missing critical compendium packs: ${missingList}. Please ensure all SWSE compendium packs are properly installed.`,
          { permanent: true }
        );
        SWSELogger.error(`chargen: blocking due to missing critical packs: ${missingList}`);
        this.close();
        return false;
      }

      // Load skills
      try {
        const resp = await fetch("systems/foundryvtt-swse/data/skills.json");
        if (resp.ok) {
          this._skillsJson = await resp.json();
          SWSELogger.log("chargen: skills.json loaded successfully");
        } else {
          SWSELogger.warn("chargen: failed to fetch skills.json, using defaults");
          this._skillsJson = this._getDefaultSkills();
          ui.notifications.warn("Failed to load skills data. Using defaults.");
        }
      } catch (e) {
        SWSELogger.error("chargen: error loading skills.json:", e);
        this._skillsJson = this._getDefaultSkills();
        ui.notifications.warn("Failed to load skills data. Using defaults.");
      }

      // Load feat metadata
      try {
        const resp = await fetch("systems/foundryvtt-swse/data/feat-metadata.json");
        if (resp.ok) {
          this._featMetadata = await resp.json();
          SWSELogger.log("chargen: feat-metadata.json loaded successfully");
        } else {
          SWSELogger.warn("chargen: failed to fetch feat-metadata.json");
          this._featMetadata = null;
        }
      } catch (e) {
        SWSELogger.error("chargen: error loading feat-metadata.json:", e);
        this._featMetadata = null;
      }

      return true;
    } finally {
      // Clear loading notification
      if (loadingNotif) {
        loadingNotif.remove();
      }
    }
  }

  
  
  
  async getData() {
    // DIAGNOSTIC LOGGING: Track class data state throughout chargen
    SWSELogger.log(`CharGen | getData() called - currentStep: ${this.currentStep}`, {
      hasClasses: !!this.characterData.classes?.length,
      classes: this.characterData.classes,
      className: this.characterData.classes?.[0]?.name,
      classSkillsList: this.characterData.classSkillsList,
      classSkillsListLength: this.characterData.classSkillsList?.length || 0,
      trainedSkillsAllowed: this.characterData.trainedSkillsAllowed,
      mentorSurveyCompleted: this.characterData.mentorSurveyCompleted,
      mentorBiases: this.characterData.mentorBiases
    });

    // Load backgrounds from PROGRESSION_RULES
    if (!this.backgrounds) {
      try {
        await this._loadBackgroundsFromProgression();
      } catch (err) {
        console.error("Failed to load backgrounds:", err);
        this.backgrounds = [];
      }
    }

    const context = super.getData();

    if (!this._packs.species) {
      const ok = await this._loadData();
      if (!ok) return context;
    }

    context.characterData = this.characterData;
    context.backgrounds = this.backgrounds || [];
    context.currentStep = this.currentStep;
    context.freeBuild = this.freeBuild;
    context.isLevelUp = !!this.actor;
    context.skippedSteps = Array.from(this.skippedSteps);  // For chevron status display
    // Helper object for template: map step names to whether they're skipped
    context.skippedStepsMap = {};
    for (const step of this.skippedSteps) {
      context.skippedStepsMap[step] = true;
    }

    // DEBUG: Log packs status
    SWSELogger.log(`CharGen | getData() - currentStep: ${this.currentStep}`, {
      hasSpeciesPack: this._packs.species?.length || 0,
      hasClassesPack: this._packs.classes?.length || 0,
      hasFeatsPack: this._packs.feats?.length || 0,
      hasTalentsPack: this._packs.talents?.length || 0
    });

    // PERFORMANCE: Only clone packs that will be modified on this step
    // Use shallow reference sharing for read-only packs
    const packsToClone = {};
    if (this.currentStep === "class") {
      packsToClone.classes = true;
    } else if (this.currentStep === "species") {
      packsToClone.species = true;
    } else if (this.currentStep === "feats") {
      packsToClone.feats = true;
    } else if (this.currentStep === "talents") {
      packsToClone.talents = true;
    }

    // Build context.packs with shallow references for unchanged packs
    context.packs = {};
    for (const [key, data] of Object.entries(this._packs)) {
      context.packs[key] = packsToClone[key] ? foundry.utils.deepClone(data) : data;
    }

    // DEBUG: Log context.packs after building
    SWSELogger.log(`CharGen | After building context.packs:`, {
      hasSpeciesPack: context.packs.species?.length || 0,
      hasClassesPack: context.packs.classes?.length || 0,
      hasFeatsPack: context.packs.feats?.length || 0,
      hasTalentsPack: context.packs.talents?.length || 0,
      classesUndefined: context.packs.classes === undefined,
      classesNull: context.packs.classes === null,
      classesEmpty: Array.isArray(context.packs.classes) && context.packs.classes.length === 0
    });

    // Filter classes based on character type
    if (this.currentStep === "class" && context.packs.classes) {
      SWSELogger.log(`CharGen | Classes BEFORE filtering:`, {
        count: context.packs.classes.length,
        names: context.packs.classes.map(c => c.name)
      });

      if (this.characterData.isDroid) {
        // Droids: only base 4 non-Force classes (no Jedi, no Force powers, no Gunslinger - prestige class)
        const droidBaseClasses = ["Soldier", "Scout", "Scoundrel", "Noble"];
        SWSELogger.log(`CharGen | Filtering for droid - allowed classes:`, droidBaseClasses);
        context.packs.classes = context.packs.classes.filter(c => droidBaseClasses.includes(c.name));
        if (this.characterData.classes.length === 0 || !droidBaseClasses.includes(this.characterData.classes[0]?.name)) {
          this.characterData.classes = [];
        }
      } else {
        // Normal characters: only the 5 core classes at level 1 (prestige classes available at higher levels)
        // Noble, Scout, Scoundrel, Soldier, and Jedi (Gunslinger is prestige only)
        const coreClasses = ["Noble", "Scout", "Scoundrel", "Soldier", "Jedi"];
        SWSELogger.log(`CharGen | Filtering for living - allowed classes:`, coreClasses);
        context.packs.classes = context.packs.classes.filter(c => coreClasses.includes(c.name));
        if (this.characterData.classes.length === 0 || !coreClasses.includes(this.characterData.classes[0]?.name)) {
          this.characterData.classes = [];
        }
      }

      // Apply icon, description, and formatted stats to each class
      context.packs.classes = context.packs.classes.map((classItem, idx) => {
        const hitDieValue = getHitDie(classItem);
        const babProg = getClassProperty(classItem, 'babProgression', 'medium');

        // Log first 3 classes for debugging
        if (idx < 3) {
          SWSELogger.log(`CharGen | Class ${idx + 1} structure:`, {
            name: classItem.name,
            hasSystem: !!classItem.system,
            systemKeys: classItem.system ? Object.keys(classItem.system) : [],
            hitDieFromSystem: classItem.system?.hitDie || classItem.system?.hit_die,
            computedHitDie: hitDieValue
          });
        }

        return {
          ...classItem,
          ...this._getClassMetadata(classItem.name),
          displayHitDie: `d${hitDieValue}`,
          displayBAB: babProg
        };
      });

      // DEBUG: Log after filtering and processing
      SWSELogger.log(`CharGen | After filtering classes for ${this.characterData.isDroid ? 'droid' : 'living'}:`, {
        filteredClassesCount: context.packs.classes.length,
        classNames: context.packs.classes.map(c => c.name),
        displayHitDice: context.packs.classes.map(c => c.displayHitDie)
      });
    } else {
      SWSELogger.log(`CharGen | Class filtering SKIPPED - step: ${this.currentStep}, hasClasses: ${!!context.packs.classes}`);
    }

    // Apply species filters and sorting if on species step
    if (this.currentStep === "species" && context.packs.species) {
      // First filter by user criteria
      context.packs.species = _filterSpecies(
        context.packs.species,
        this.characterData.speciesFilters
      );

      // Apply banned species filter (only if not GM)
      if (!game.user.isGM) {
        const bannedSpeciesStr = game.settings.get("foundryvtt-swse", "bannedSpecies") || "";
        const bannedSpecies = bannedSpeciesStr
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        if (bannedSpecies.length > 0) {
          context.packs.species = context.packs.species.filter(species =>
            !bannedSpecies.includes(species.name)
          );
          SWSELogger.log(`CharGen | Filtered ${bannedSpecies.length} banned species from player selection`);
        }
      }

      // Then sort with Humans first
      context.packs.species = _sortSpeciesBySource(context.packs.species);
    }

    // Add suggestion engine integration for feats and talents
    if ((this.currentStep === "feats" || this.currentStep === "talents") && context.packs) {
      const tempActor = this.actor || this._createTempActorForValidation();
      const pendingData = {
        selectedFeats: this.characterData.feats || [],
        selectedClass: this.characterData.classes?.[0],
        selectedSkills: Object.keys(this.characterData.skills || {})
          .filter(k => this.characterData.skills[k]?.trained)
          .map(k => ({ key: k })),
        selectedTalents: this.characterData.talents || []
      };

      // CRITICAL FIX: Compute BuildIntent first to include L1 mentor survey biases
      SWSELogger.log(`[CHARGEN-SUGGESTIONS] Computing BuildIntent for ${this.currentStep}...`);
      let buildIntent = null;
      try {
        buildIntent = await BuildIntent.analyze(tempActor, pendingData);
        SWSELogger.log(`[CHARGEN-SUGGESTIONS] BuildIntent computed:`, {
          primaryThemes: buildIntent.primaryThemes,
          combatStyle: buildIntent.combatStyle,
          hasMentorBiases: !!buildIntent.mentorBiases && Object.keys(buildIntent.mentorBiases).length > 0
        });
      } catch (intentErr) {
        SWSELogger.error(`[CHARGEN-SUGGESTIONS] ERROR computing BuildIntent:`, intentErr);
      }

      // ======================================================
      // Add suggestion engine suggestions to FEATS
      // ======================================================
      if (this.currentStep === "feats" && context.packs.feats) {
        try {
    SWSELogger.log(
      `[CHARGEN-SUGGESTIONS] Suggesting ${context.packs.feats.length} feats with BuildIntent context...`
    );

    let featsWithSuggestions = await SuggestionService.getSuggestions(
      tempActor,
      "chargen",
      {
        domain: "feats",
        available: context.packs.feats,
        pendingData,
        engineOptions: { buildIntent }
      }
    );

    // Filter out Force-dependent feats for droids
    featsWithSuggestions = this._filterForceDependentItems(featsWithSuggestions);

    // Sort by suggestion tier
    featsWithSuggestions = SuggestionService.sortBySuggestion(
      featsWithSuggestions
    );

    // Add qualification status
    const pendingDataForFeats = {
      selectedFeats: this.characterData.feats || [],
      selectedClass: this.characterData.classes?.[0],
      abilityIncreases: {},
      selectedSkills: Object.keys(this.characterData.skills || {})
        .filter(k => this.characterData.skills[k]?.trained)
        .map(k => ({ key: k })),
      selectedTalents: this.characterData.talents || []
    };

    context.packs.feats = featsWithSuggestions.map(feat => {
      const prereqCheck =
        PrerequisiteRequirements.checkFeatPrerequisites(
          tempActor,
          feat,
          pendingDataForFeats
        );
      return {
        ...feat,
        isQualified: prereqCheck.valid,
        prereqReasons: prereqCheck.reasons
      };
    });

    // Categorize feats
    try {
      const categorized = this._organizeFeatsByCategory(
        context.packs.feats,
        this._featMetadata
      );
      context.featCategories = categorized.categories;
      context.featCategoryList = categorized.categoryList;
    } catch (categErr) {
      SWSELogger.warn(
        "CharGen | Failed to organize feats by category:",
        categErr
      );
    }
        } catch (err) {
          SWSELogger.warn("CharGen | Failed to add feat suggestions:", err);
        }
      }

    // ======================================================
    // Add suggestion engine suggestions to TALENTS
    // ======================================================
      if (this.currentStep === "talents" && context.packs.talents) {
        try {
    SWSELogger.log(
      `[CHARGEN-SUGGESTIONS] Suggesting ${context.packs.talents.length} talents with BuildIntent context...`
    );

    const talentsWithSuggestions = await SuggestionService.getSuggestions(
      tempActor,
      "chargen",
      {
        domain: "talents",
        available: context.packs.talents,
        pendingData,
        engineOptions: {
          buildIntent,
          includeFutureAvailability: true
        },
        persist: true
      }
    );

    const pendingDataForTalents = {
      selectedTalents: this.characterData.talents || [],
      selectedClass: this.characterData.classes?.[0],
      selectedSkills: Object.keys(this.characterData.skills || {})
        .filter(k => this.characterData.skills[k]?.trained)
        .map(k => ({ key: k }))
    };

    context.packs.talents = talentsWithSuggestions.map(talent => {
      const prereqCheck =
        PrerequisiteRequirements.checkTalentPrerequisites(
          tempActor,
          talent,
          pendingDataForTalents
        );
      return {
        ...talent,
        isQualified: prereqCheck.valid,
        prereqReasons: prereqCheck.reasons
      };
    });
        } catch (err) {
          SWSELogger.warn("CharGen | Failed to add talent suggestions:", err);
        }
      }

    }
    // ======================================================
    // Add suggestion engine integration for SKILLS
    // ======================================================
    let classData = null;
    let classSkills = [];
    let trainedSkillsAllowed = 0;

    if (this.currentStep === "skills" && context.packs) {
      const tempActor = this._createTempActorForValidation();

      const selectedClassName = this.characterData.classes?.[0]?.name;

      if (selectedClassName && ClassesDB.isBuilt) {
    classData = ClassesDB.byName(selectedClassName);
      }

      if (classData) {
    classSkills = classData.classSkills ?? [];
    const intMod = this.characterData.abilities.int.mod || 0;
    const humanBonus =
      this.characterData.species === "Human" ||
      this.characterData.species === "human"
        ? 1
        : 0;

    trainedSkillsAllowed = Math.max(
      1,
      (classData.trainedSkills ?? 0) + intMod + humanBonus
    );

    this.characterData.classSkillsList = [...classSkills];
    this.characterData.trainedSkillsAllowed = trainedSkillsAllowed;
      } else {
    // Last resort fallback to legacy properties
    classSkills = this.characterData.classSkillsList || [];
    trainedSkillsAllowed = this.characterData.trainedSkillsAllowed || 0;
      }

      // DIAGNOSTIC: Log where data is coming from
      const selectedClassNameForLog = this.characterData?.classes?.[0]?.name ?? this.characterData?.className;
      SWSELogger.log(`[CHARGEN-SKILLS] Skills step rendering - DATA SOURCE CHECK:`, {
    selectedClassNameForLog,
    classDataFound: !!classData,
    classDataSource: classData ? "ClassesDB" : "characterData fallback",
    classSkills,
    classSkillsLength: classSkills?.length ?? 0,
    trainedSkillsAllowed,
    characterDataClassSkillsList: this.characterData.classSkillsList,
    characterDataTrainedSkills: this.characterData.trainedSkillsAllowed,
    backgroundSkills: this.characterData.backgroundSkills?.length ?? 0
      });

      try {
        // Combine class skills with background skills
        const allClassSkills = [
          ...classSkills,
          ...(this.characterData.backgroundSkills?.map(s => s.key || s) || [])
        ];

        SWSELogger.log(`[CHARGEN-SKILLS] Combined allClassSkills:`, allClassSkills);

        const skillsWithSuggestions = await SuggestionService.getSuggestions(tempActor, 'chargen', {
            domain: 'skills_l1',
            available: this._skillsJson,
            pendingData: {
              classSkills: allClassSkills,
              selectedClass: this.characterData.classes?.[0],
              selectedSkills: Object.keys(this.characterData.skills || {}).filter(k => (this.characterData.skills?.[k] || 0) > 0)
            },
            persist: true
          });

        // Mark class skills in the returned data
        // NOTE: Class skill names in compendium use proper case (e.g., "Acrobatics")
        // while skill.key is lowercase (e.g., "acrobatics"), so we compare using skill.name
        const skillsWithClassMarking = skillsWithSuggestions.map(skill => ({
          ...skill,
          isClassSkill: allClassSkills.includes(skill.name)
        }));

        context.skillsJson = skillsWithClassMarking;
        // Also set availableSkills for template compatibility
        context.availableSkills = skillsWithClassMarking;
      } catch (err) {
        SWSELogger.warn('CharGen | Failed to add skill suggestions:', err);

        // Fallback: still mark class skills even if suggestions fail
        // Use the canonical class data we retrieved above
        const allClassSkills = [
          ...classSkills,
          ...(this.characterData.backgroundSkills?.map(s => s.key || s) || [])
        ];

        const fallbackSkills = (this._skillsJson || []).map(skill => ({
          ...skill,
          isClassSkill: allClassSkills.includes(skill.name)
        }));

        context.skillsJson = fallbackSkills;
        context.availableSkills = fallbackSkills;
      }
    }

    // ======================================================
    // Finalize SKILLS data for template rendering
    // ======================================================

    // Persist canonical class skills + training budget
    this.characterData.classSkillsList = Array.isArray(classSkills)
      ? [...classSkills]
      : [];
    this.characterData.trainedSkillsAllowed = trainedSkillsAllowed;

    SWSELogger.log(
      `[CHARGEN-SKILLS] Updated characterData`,
      {
    trainedSkillsAllowed,
    classSkillsCount: this.characterData.classSkillsList.length
      }
);

context.trainedSkillsAllowed = trainedSkillsAllowed;

    // Ensure skills collections exist
context.skillsJson = context.skillsJson ?? this._skillsJson ?? [];
context.availableSkills = context.availableSkills ?? context.skillsJson;

    // Droids cannot use the Force
    if (this.characterData.isDroid) {
      context.availableSkills = context.availableSkills.filter(
    skill =>
      skill.key !== "useTheForce" &&
      skill.name !== "Use the Force"
      );
    }

    // ======================================================
    // Compute skill modifiers for display
    // ======================================================

    const characterLevel = this.characterData.level || 1;
    const halfLevel = Math.floor(characterLevel / 2);
    const abilities = this.characterData.abilities || {};
    const racialSkillBonuses = this.characterData.racialSkillBonuses || {};

    context.availableSkills = context.availableSkills.map(skill => {
      let abilityKey = (skill.ability || "").toLowerCase();

      // Droids substitute STR for CON
      if (this.characterData.isDroid && abilityKey === "con") {
    abilityKey = "str";
      }

      const abilityMod = abilities[abilityKey]?.mod ?? 0;
      const speciesBonus = racialSkillBonuses[skill.key] ?? 0;
      const isTrained = this.characterData.skills?.[skill.key]?.trained ?? false;

      const currentBonus =
    halfLevel + abilityMod + speciesBonus + (isTrained ? 5 : 0);

      const trainedBonus =
    halfLevel + abilityMod + speciesBonus + 5;

      return {
    ...skill,
    trained: isTrained,
    halfLevel,
    abilityMod,
    speciesBonus,
    currentBonus,
    trainedBonus
      };
    });

    // Track trained skill count
    this.characterData.trainedSkillsCount = Object.values(
      this.characterData.skills || {}
    ).filter(skill => skill.trained).length;

    // Prepare languages for template
    if (this.currentStep === "languages") {
      try {
        // Get starting languages based on species
        this.characterData.languageData = await this._getStartingLanguages();

        // Get all available languages by category
        context.languageCategories = await this._getAvailableLanguages();

        // Filter out already-granted languages from available selection
        // Granted languages = species granted + background bonus language
        const grantedLanguages = new Set(this.characterData.languageData.granted || []);

        // Add background bonus language if present
        if (this.characterData.background?.bonusLanguage) {
          // bonusLanguage may be "French or Italian" so split on "or" and add each
          const bonusLangs = this.characterData.background.bonusLanguage
            .split(' or ')
            .map(l => l.trim());
          bonusLangs.forEach(lang => grantedLanguages.add(lang));
        }

        // Filter out granted languages from each category
        if (context.languageCategories) {
          for (const category in context.languageCategories) {
            if (context.languageCategories[category].languages) {
              context.languageCategories[category].languages =
                context.languageCategories[category].languages.filter(lang => !grantedLanguages.has(lang));
            }
          }
        }

        SWSELogger.log(`[CHARGEN-LANGUAGES] Filtered available languages:`, {
          grantedLanguages: Array.from(grantedLanguages),
          speciesGranted: this.characterData.languageData.granted,
          backgroundBonus: this.characterData.background?.bonusLanguage || 'none'
        });
      } catch (err) {
        SWSELogger.error('CharGen | Failed to load languages:', err);
        context.languageCategories = {
          widelyUsed: {
            name: "Widely Used Languages",
            languages: ["Basic", "Binary", "Bocce", "Bothese"]
          },
          localTrade: {
            name: "Local/Trade Languages",
            languages: ["Ewokese", "Gamorrean", "Gungan"]
          }
        };
      }
    }

    // Prepare force powers and starship maneuvers for template
    if (this.currentStep === "force-powers") {
      context.availableForcePowers = await this._getAvailableForcePowers();
      context.characterData.forcePowersRequired = this._getForcePowersNeeded();
    }

    if (this.currentStep === "starship-maneuvers") {
      context.availableStarshipManeuvers = await this._getAvailableStarshipManeuvers();
      context.characterData.starshipManeuversRequired = this._getStarshipManeuversNeeded();
    }

    // Prepare talents for template
    if (this.currentStep === "talents") {
      // Calculate talentsRequired based on class and houserules
      const selectedClass = this.characterData.classes?.[0];
      let talentsRequired = 1; // Default: 1 talent at level 1

      // Check houserule settings
      const talentEveryLevel = game.settings.get('foundryvtt-swse', "talentEveryLevel");
      const talentEveryLevelExtraL1 = game.settings.get('foundryvtt-swse', "talentEveryLevelExtraL1");

      if (talentEveryLevel && selectedClass) {
        // With talentEveryLevel, at least 1 talent available
        const trees = getTalentTrees(selectedClass);
        const hasAccess = (selectedClass.system.forceSensitive || trees?.length > 0);

        if (hasAccess) {
          // At Level 1 with extra enabled, require 2 talents
          talentsRequired = talentEveryLevelExtraL1 ? 2 : 1;
        }
      }

      context.characterData.talentsRequired = talentsRequired;

      // Get available talent trees for the character
      context.availableTalentTrees = this._getAvailableTalentTrees() || [];
      SWSELogger.log(`CharGen | Talents step - available talent trees:`, {
        treeCount: context.availableTalentTrees?.length || 0,
        trees: context.availableTalentTrees,
        selectedClass: this.characterData.classes?.[0]?.name,
        classesData: this.characterData.classes
      });

      // Filter talents for the selected talent tree
      if (this.selectedTalentTree && context.packs.talents) {
        context.packs.talentsInTree = context.packs.talents.filter(talent => {
          const talentTree = getTalentTreeName(talent);
          return talentTree === this.selectedTalentTree;
        });

        // Filter out Force-dependent talents for droids in the tree view
        context.packs.talentsInTree = this._filterForceDependentItems(context.packs.talentsInTree);
      }
    }

    // Add narrator comment for all steps (optional narrative enhancement)
    context.narratorComment = this._getNarratorComment ? this._getNarratorComment() : null;
    context.selectedTalentTree = this.selectedTalentTree;

    // Add current mentor data for dynamic mentor display in template
    context.mentor = this._getCurrentMentor();

    // Add droid degrees for degree selection step
    if (this.currentStep === "degree") {
      context.droidDegrees = [
        {
          key: "1st-degree",
          name: "1st-Degree",
          bonuses: "INT +2, WIS +2, STR -2",
          description: "Medical and scientific droid. Specialized in analysis and knowledge."
        },
        {
          key: "2nd-degree",
          name: "2nd-Degree",
          bonuses: "INT +2, CHA -2",
          description: "Engineering droid. Technical expertise and system integration."
        },
        {
          key: "3rd-degree",
          name: "3rd-Degree",
          bonuses: "WIS +2, CHA +2, STR -2",
          description: "Protocol and service droid. Social interface and communication."
        },
        {
          key: "4th-degree",
          name: "4th-Degree",
          bonuses: "DEX +2, INT -2, CHA -2",
          description: "Security and military droid. Combat and threat elimination."
        },
        {
          key: "5th-degree",
          name: "5th-Degree",
          bonuses: "STR +4, INT -4, CHA -4",
          description: "Labor and utility droid. Physical tasks and heavy operations."
        }
      ];

      // Add Seraphim dialogue for droid creation
      if (this._getSeraphimDialogue) {
        context.seraphimDialogue = this._getSeraphimDialogue();
      }
    }

    return context;
  }

  /**
   * Get narrator comment for the current step (can be overridden by CharacterGeneratorNarrative)
   * @returns {string|null} Narrator comment or null if not applicable
   */
  _getNarratorComment() {
    // Get current mentor based on selected class
    const mentor = this._getCurrentMentor();
    if (!mentor) return null;

    // Return step-specific guidance from the mentor
    switch (this.currentStep) {
      case "class":
        return mentor.classGuidance || null;
      case "background":
        return mentor.backgroundGuidance || null;
      case "abilities":
        return mentor.abilityGuidance || null;
      case "skills":
        return mentor.skillGuidance || null;
      case "languages":
        return mentor.languageGuidance || null;
      case "feats":
        return mentor.featGuidance || null;
      case "talents":
        return mentor.talentGuidance || null;
      case "summary":
        // Get level-appropriate greeting with character overview
        return this._getMentorSummaryCommentary(mentor);
      default:
        return null;
    }
  }

  /**
   * Generate mentor commentary on the completed character for summary page
   * @param {Object} mentor - The mentor object
   * @returns {string} Mentor's narrative commentary on the character
   */
  _getMentorSummaryCommentary(mentor) {
    const characterData = this.characterData;
    const components = [];

    // Opening line with level-appropriate greeting
    const level = characterData.level || 1;
    const levelGreeting = mentor.levelGreetings?.[level] || "Your path takes shape.";
    components.push(levelGreeting);

    // Commentary on background (if selected)
    if (characterData.background) {
      const backgroundComment = this._getMentorBackgroundComment(mentor, characterData.background);
      components.push(backgroundComment);
    }

    // Commentary on skills chosen
    if (characterData.skills) {
      const trainedSkills = Object.entries(characterData.skills)
        .filter(([_, skillData]) => skillData.trained)
        .map(([skillName, _]) => skillName);
      if (trainedSkills.length > 0) {
        const skillsComment = this._getMentorSkillsComment(mentor, trainedSkills);
        components.push(skillsComment);
      }
    }

    // Commentary on talents selected
    if (characterData.talents && characterData.talents.length > 0) {
      const talentsComment = this._getMentorTalentsComment(mentor, characterData.talents);
      components.push(talentsComment);
    }

    // Commentary on feats selected
    if (characterData.feats && characterData.feats.length > 0) {
      const featsComment = this._getMentorFeatsComment(mentor, characterData.feats);
      components.push(featsComment);
    }

    // Final conclusion
    const conclusionComment = this._getMentorConclusionComment(mentor, characterData);
    components.push(conclusionComment);

    return components.join(" ");
  }

  /**
   * Get mentor's comment on the background choice
   */
  _getMentorBackgroundComment(mentor, background) {
    const comments = {
      "Jedi": {
        "Smuggler": "Your past as a smuggler brings experience with survival and cunning. Interesting foundations for a Jedi's path.",
        "Soldier": "A military background suggests discipline and tactical thinking. These serve the Force well.",
        "Scout": "The skills of a scout—observation, tracking, adaptation. These will serve you in ways you cannot yet imagine.",
        "default": "Your background shapes who you become. Use that wisdom in your journey ahead."
      },
      "Soldier": {
        "Smuggler": "A smuggler's instincts paired with military discipline? That combination could be dangerous in the right ways.",
        "Scout": "Scout training mixed with soldier's training makes you adaptable. Good—the battlefield demands flexibility.",
        "Jedi": "A strange path, mixing Force and firearms. But unconventional approaches sometimes succeed where tradition fails.",
        "default": "Your background prepares you for what lies ahead. Trust that preparation."
      },
      "Scoundrel": {
        "Soldier": "Soldier discipline with scoundrel instincts? You'll survive things that would break others.",
        "Smuggler": "A smuggler among scoundrels—you'll fit right in. Just remember what you value.",
        "Scout": "Scout cunning wrapped in scoundrel charm. You'll move through the galaxy just fine.",
        "default": "Your past is your credential. Use it wisely."
      },
      "default": {
        "default": "Your background informs who you are. Do not forget where you came from."
      }
    };

    const className = (this.characterData.classes?.[0]?.name) || "Jedi";
    const mentorComments = comments[mentor.name] || comments["default"];
    return mentorComments[background] || mentorComments["default"];
  }

  /**
   * Get mentor's comment on skills chosen
   */
  _getMentorSkillsComment(mentor, trainedSkills) {
    const skillCount = trainedSkills.length;
    const skillList = trainedSkills.slice(0, 2).join(", "); // List first 2 skills
    const moreSkills = skillCount > 2 ? ` and ${skillCount - 2} more` : "";

    const skillComments = {
      "Jedi": `You have trained yourself in ${skillList}${moreSkills}. Knowledge is a tool of the Force as much as intuition.`,
      "Soldier": `Your choice to master ${skillList}${moreSkills} shows strategic thinking. Every skill is a weapon if wielded correctly.`,
      "Scoundrel": `${skillList}${moreSkills}—practical choices. You know what skills keep you alive in the field.`,
      "default": `You have developed proficiency in ${skillList}${moreSkills}. These skills will serve you well.`
    };

    return skillComments[mentor.name] || skillComments["default"];
  }

  /**
   * Get mentor's comment on talents selected
   */
  _getMentorTalentsComment(mentor, talents) {
    const talentCount = talents.length;
    const talentList = talents.slice(0, 2).map(t => t.name).join(", ");
    const moreTalents = talentCount > 2 ? ` and ${talentCount - 2} others` : "";

    const talentComments = {
      "Jedi": `Your talents—${talentList}${moreTalents}—show connection to deeper aspects of the Force. You are developing awareness.`,
      "Soldier": `The talents you've chosen—${talentList}${moreTalents}—show you understand combat's nuances. Good.`,
      "Scoundrel": `${talentList}${moreTalents}. Talents that keep you one step ahead. That's the scoundrel's way.`,
      "default": `You have selected talents that will define your capabilities. Use them well.`
    };

    return talentComments[mentor.name] || talentComments["default"];
  }

  /**
   * Get mentor's comment on feats selected
   */
  _getMentorFeatsComment(mentor, feats) {
    const featCount = feats.length;
    const featList = feats.slice(0, 2).map(f => f.name).join(", ");
    const moreFeats = featCount > 2 ? ` and ${featCount - 2} others` : "";

    const featComments = {
      "Jedi": `Through ${featList}${moreFeats}, you build your foundation. Each feat is a step toward mastery.`,
      "Soldier": `${featList}${moreFeats}—solid choices for a warrior. You are building practical strength.`,
      "Scoundrel": `${featList}${moreFeats}. You know which advantages make the difference between freedom and chains.`,
      "default": `Your chosen feats demonstrate your priorities. Stand by them.`
    };

    return featComments[mentor.name] || featComments["default"];
  }

  /**
   * Get mentor's final conclusion about the completed character
   */
  _getMentorConclusionComment(mentor, characterData) {
    const className = characterData.classes?.[0]?.name || "unknown";

    const conclusionComments = {
      "Jedi": `You have begun. The path ahead is long, but I sense you are ready to walk it with awareness and purpose.`,
      "Soldier": `You have the foundation. What you build upon it—that is what matters. Go forward with clarity.`,
      "Scoundrel": `You're ready to make your own way in this galaxy. Just remember—survival isn't everything.`,
      "default": `The character you have created is ready to face what comes. May your choices serve you well.`
    };

    return conclusionComments[mentor.name] || conclusionComments["default"];
  }

  /**
   * Get the current mentor based on selected class
   * @returns {Object} Mentor data including name, portrait, title
   */
  _getCurrentMentor() {
    const classes = this.characterData.classes || [];
    if (classes.length === 0) {
      // Default to Scoundrel mentor (Ol' Salty) before class is selected
      SWSELogger.log(`[CHARGEN-MENTOR] _getCurrentMentor: No class selected, using default (Scoundrel)`);
      return MENTORS.Scoundrel || { name: "Ol' Salty", portrait: "systems/foundryvtt-swse/assets/mentors/salty.webp" };
    }

    const className = classes[0].name;
    SWSELogger.log(`[CHARGEN-MENTOR] _getCurrentMentor: Looking up mentor for class "${className}"`, {
      availableKeys: Object.keys(MENTORS),
      className: className,
      found: !!MENTORS[className]
    });

    const mentor = MENTORS[className];
    if (mentor) {
      SWSELogger.log(`[CHARGEN-MENTOR] _getCurrentMentor: Found mentor "${mentor.name}" for class "${className}"`);
      return mentor;
    }

    // Fallback to Scoundrel mentor
    SWSELogger.warn(`[CHARGEN-MENTOR] _getCurrentMentor: No mentor found for class "${className}", using fallback (Scoundrel)`);
    return MENTORS.Scoundrel || { name: "Ol' Salty", portrait: "systems/foundryvtt-swse/assets/mentors/salty.webp" };
  }



  activateListeners(html) {
    super.activateListeners(html);

    // Ensure html is jQuery object for compatibility
    const $html = html instanceof jQuery ? html : $(html);

    // Activate Foundry tooltips for feat descriptions
    if (game.tooltip) {
      game.tooltip.activate(html[0] || html, {
        selector: '[data-tooltip]'
      });
    }

    // Free Build toggle
    $html.find('.free-build-toggle').change(this._onToggleFreeBuild.bind(this));

    // Navigation
    $html.find('.next-step').click(this._onNextStep.bind(this));
    $html.find('.prev-step').click(this._onPrevStep.bind(this));
    $html.find('.skip-step').click(this._onSkipStep.bind(this));
    $html.find('.build-later-droid').click(this._onBuildLater.bind(this));

    // Chevron step navigation (all steps now clickable with confirmation)
    $html.find('.chevron-step').click(this._onJumpToStep.bind(this));
    $html.find('.finish').click(this._onFinish.bind(this));

    // Selections
    $html.find('.select-type').click(this._onSelectType.bind(this));
    $html.find('.select-degree').click(this._onSelectDegree.bind(this));
    $html.find('.select-size').click(this._onSelectSize.bind(this));
    $html.find('.import-droid-btn').click(this._onImportDroid.bind(this));

    // Species preview and selection (expanded card flow)
    $html.find('.preview-species').click(this._onPreviewSpecies.bind(this));
    $html.find('#species-confirm-btn').click(this._onConfirmSpecies.bind(this));
    $html.find('#species-back-btn, #species-close-btn').click(this._onCloseSpeciesOverlay.bind(this));
    $html.find('#species-overlay').click(this._onSpeciesOverlayBackdropClick.bind(this));

    // Near-Human builder
    $html.find('.open-near-human-builder').click(this._onOpenNearHumanBuilder.bind(this));
    // $html.find('.adaptation-btn').click(this._onSelectNearHumanAdaptation.bind(this)); // Method not implemented
    $html.find('.sacrifice-btn').click(this._onSelectNearHumanSacrifice.bind(this));
    // $html.find('.attr-plus, .attr-minus').click(this._onAdjustNearHumanAttribute.bind(this)); // Use _onAdjustNearHumanAbility instead (see line 522)
    $html.find('.trait-btn').click(this._onSelectNearHumanTrait.bind(this));
    $html.find('.sacrifice-radio').change(this._onSelectNearHumanSacrifice.bind(this));
    $html.find('.variant-checkbox').change(this._onToggleNearHumanVariant.bind(this));
    $html.find('.ability-plus-btn, .ability-minus-btn').click(this._onAdjustNearHumanAbility.bind(this));
    $html.find('#near-human-randomize-btn').click(this._onRandomizeNearHuman.bind(this));
    $html.find('#near-human-confirm-btn').click(this._onConfirmNearHuman.bind(this));
    $html.find('#near-human-back-btn, #near-human-close-btn').click(this._onCloseNearHumanOverlay.bind(this));
    $html.find('#near-human-overlay').click(this._onNearHumanOverlayBackdropClick.bind(this));

    // Species filters
    $html.find('.species-filter-select').change(this._onSpeciesFilterChange.bind(this));
    $html.find('.clear-species-filters').click(this._onClearSpeciesFilters.bind(this));
    $html.find('.select-class').click(this._onSelectClass.bind(this));
    $html.find('.class-choice-btn').click(this._onSelectClass.bind(this));
    $html.find('.select-feat').click(this._onSelectFeat.bind(this));
    $html.find('.remove-feat').click(this._onRemoveFeat.bind(this));
    $html.find('.filter-valid-feats').change(this._onToggleFeatFilter.bind(this));
    $html.find('.select-talent-tree').click(this._onSelectTalentTree.bind(this));
    $html.find('.back-to-talent-trees').click(this._onBackToTalentTrees.bind(this));
    $html.find('.select-talent').click(this._onSelectTalent.bind(this));
    $html.find('.remove-talent').click(this._onRemoveTalent.bind(this));

    // Talent tree view toggle (Graph/List)
    $html.find('.talent-view-btn').click(this._onTalentViewToggle.bind(this));

    // Render talent tree graph if on talents step with selected tree
    if (this.currentStep === 'talents' && this.selectedTalentTree) {
      this._renderTalentTreeGraph($html);
    }
    $html.find('.select-power').click(this._onSelectForcePower.bind(this));
    $html.find('.remove-power').click(this._onRemoveForcePower.bind(this));
    $html.find('.ask-mentor-force-power-suggestion').click(this._onAskMentorForcePowerSuggestion.bind(this));
    $html.find('.select-maneuver').click(this._onSelectStarshipManeuver.bind(this));
    $html.find('.remove-maneuver').click(this._onRemoveStarshipManeuver.bind(this));
    $html.find('.skill-select').change(this._onSkillSelect.bind(this));
    $html.find('.train-skill-btn').click(this._onTrainSkill.bind(this));
    $html.find('.untrain-skill-btn').click(this._onUntrainSkill.bind(this));
    $html.find('.reset-skills-btn').click(this._onResetSkills.bind(this));

    // Language selection
    $html.find('.select-language').click(this._onSelectLanguage.bind(this));
    $html.find('.remove-language').click(this._onRemoveLanguage.bind(this));
    $html.find('.reset-languages-btn').click(this._onResetLanguages.bind(this));
    $html.find('.add-custom-language-btn').click(this._onAddCustomLanguage.bind(this));

    // Background selection
    $html.find('.random-background-btn').click(this._onRandomBackground.bind(this));
    $html.find('.change-background-btn').click(this._onChangeBackground.bind(this));

    // Mentor "Ask Your Mentor" button
    $html.find('.ask-mentor-btn, .ask-mentor-skills-btn').click(this._onAskMentor.bind(this));

    // Droid builder/shop
    $html.find('.shop-tab').click(this._onShopTabClick.bind(this));
    $html.find('.accessory-tab').click(this._onAccessoryTabClick.bind(this));
    $html.on('click', '.purchase-system', this._onPurchaseSystem.bind(this));
    $html.on('click', '.remove-system', this._onRemoveSystem.bind(this));
    $html.on('click', '.add-enhancement', this._onPurchaseSystem.bind(this));
    $html.on('click', '.remove-enhancement', this._onRemoveSystem.bind(this));

    // Name input - use 'input' event to capture changes in real-time
    $html.find('input[name="character-name"]').on('input change', (ev) => {
      this.characterData.name = ev.target.value;
    });

    // Random name button
    $html.find('.random-name-btn').click(this._onRandomName.bind(this));

    // Random droid name button
    $html.find('.random-droid-name-btn').click(this._onRandomDroidName.bind(this));

    // Level input
    $html.find('input[name="target-level"]').on('input change', (ev) => {
      this.targetLevel = parseInt(ev.target.value, 10) || 1;
    });

    // Shop button
    $html.find('.open-shop-btn').click(this._onOpenShop.bind(this));

    // Starting Credits
    $html.find('.roll-credits-btn').click(this._onRollCredits.bind(this));
    $html.find('.take-max-credits-btn').click(this._onTakeMaxCredits.bind(this));
    $html.find('.reroll-credits-btn').click(this._onRerollCredits.bind(this));

    // Abilities UI
    if (this.currentStep === "abilities") {
      this._bindAbilitiesUI($html[0]);
    }


    // Droid Builder UI
    if (this.currentStep === "droid-builder") {
      this._populateDroidBuilder($html[0]);
    }

    // Final Droid Customization UI (after class/background for final credits)
    if (this.currentStep === "droid-final") {
      this._populateFinalDroidBuilder($html[0]);
    }

    // Class change
    $html.find('[name="class_select"]').change(async (ev) => {
      await this._onClassChanged(ev, $html[0]);
    });

    // Background step - render cards if on background step
    if (this.currentStep === "background") {
      const bgContainer = $html.find('#background-selection-grid')[0];
      if (bgContainer && !this.characterData.background) {
        this._renderBackgroundCards(bgContainer);
      }

      // Update narrator comment from mentor guidance
      if (!this.characterData.backgroundNarratorComment) {
        const mentor = this._getCurrentMentor();
        SWSELogger.log(`[CHARGEN-BG] activateListeners: Selected mentor for background step`, {
          mentorName: mentor?.name,
          mentorTitle: mentor?.title,
          guidance: mentor?.backgroundGuidance?.substring(0, 50)
        });
        if (mentor) {
          this.characterData.backgroundNarratorComment = mentor.backgroundGuidance || null;
        }
      }

      // Mark the active category tab
      const activeCategory = this.characterData.backgroundCategory || 'events';
      $html.find('.background-category-tab').each((i, tab) => {
        if (tab.dataset.category === activeCategory) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });

      // Background category tab clicks
      $html.find('.background-category-tab').click(this._onBackgroundCategoryClick.bind(this));

      // Background skill filter button
      $html.find('.background-filter-btn').click(this._onBackgroundFilterClick.bind(this));

      // Ask mentor button for background suggestions
      $html.find('.ask-mentor-background-btn').click(this._onAskMentorBackgroundSuggestion.bind(this));

      // Homebrew planets toggle
      $html.find('.allow-homebrew-toggle').change((ev) => {
        this.characterData.allowHomebrewPlanets = ev.currentTarget.checked;
        // Re-render if on planets category
        if (activeCategory === 'planets') {
          const bgContainer = $html.find('#background-selection-grid')[0];
          if (bgContainer) {
            this._renderBackgroundCards(bgContainer);
          }
        }
      });
    }
  }

  _getSteps() {
    // Levelup flow: only if actor is already saved (has an id) - meaning it's an existing character
    // New character creation: actor is null, unsaved, or on initial steps (name/type)
    const isExistingSavedActor = this.actor && this.actor.id;

    if (isExistingSavedActor && this.currentStep !== "name" && this.currentStep !== "type") {
      return ["abilities", "class", "background", "feats", "talents", "skills", "languages", "summary"];
    }

    // Include type selection (living/droid) after name
    const steps = ["name", "type"];

    // If droid, show degree and size selection; if living, show species
    if (this.characterData.isDroid) {
      steps.push("degree", "size", "droid-builder");
      SWSELogger.log(`CharGen | _getSteps: isDroid=true, added degree/size/droid-builder`, {
        isDroid: this.characterData.isDroid,
        steps: steps
      });
    } else {
      // CRITICAL: Species MUST be included for living characters
      steps.push("species");
      SWSELogger.log(`CharGen | _getSteps: isDroid=false, ADDED SPECIES TO STEPS`, {
        isDroid: this.characterData.isDroid,
        stepsIncludesSpecies: steps.includes("species"),
        steps: steps
      });
    }

    // NPC workflow: skip class and talents, go straight to abilities/skills/languages/feats
    if (this.actorType === "npc") {
      steps.push("abilities", "skills", "languages", "feats", "summary");
    } else {
      // PC workflow: normal flow with class and talents
      // Note: skills before feats to allow Skill Focus validation
      // Note: languages after skills (INT-dependent) for both living and droid characters
      steps.push("abilities", "class");

      // Add background step only if enabled
      const backgroundsEnabled = game.settings.get("foundryvtt-swse", "enableBackgrounds") ?? true;
      if (backgroundsEnabled) {
        steps.push("background");
      }

      steps.push("skills", "languages", "feats", "talents");

      // Add force powers step if character is Force-sensitive
      // Note: Droids cannot be Force-sensitive in SWSE
      if (this.characterData.forceSensitive && !this.characterData.isDroid && this._getForcePowersNeeded() > 0) {
        steps.push("force-powers");
      }

      // Add starship maneuvers step if character has Starship Tactics feat
      if (this._getStarshipManeuversNeeded() > 0) {
        steps.push("starship-maneuvers");
      }

      // Add final droid customization step if droid character
      // This allows player to finalize droid after class/background selection for final credit total
      if (this.characterData.isDroid) {
        steps.push("droid-final");
      }

      steps.push("summary", "shop");
    }
    return steps;
  }

  /**
   * Handle random name selection
   * @param {Event} event - The click event
   */
  async _onRandomName(event) {
    event.preventDefault();

    if (!CharacterGenerator.RANDOM_NAMES || CharacterGenerator.RANDOM_NAMES.length === 0) {
      ui.notifications.warn("No names available to choose from.");
      return;
    }

    // Pick a random name
    const randomIndex = Math.floor(Math.random() * CharacterGenerator.RANDOM_NAMES.length);
    const selectedName = CharacterGenerator.RANDOM_NAMES[randomIndex];

    this.characterData.name = selectedName;

    ui.notifications.info(`Random name selected: ${selectedName}`);
    await this.render();
  }

  /**
   * Handle random droid name selection
   * @param {Event} event - The click event
   */
  async _onRandomDroidName(event) {
    event.preventDefault();

    if (!CharacterGenerator.RANDOM_DROID_NAMES || CharacterGenerator.RANDOM_DROID_NAMES.length === 0) {
      ui.notifications.warn("No droid names available to choose from.");
      return;
    }

    // Pick a random droid name
    const randomIndex = Math.floor(Math.random() * CharacterGenerator.RANDOM_DROID_NAMES.length);
    const selectedName = CharacterGenerator.RANDOM_DROID_NAMES[randomIndex];

    this.characterData.name = selectedName;

    ui.notifications.info(`Random droid name selected: ${selectedName}`);
    await this.render();
  }

  /**
   * Handle "Ask Your Mentor" button click - enable suggestion engine
   * @param {Event} event - The click event
   */
  async _onAskMentor(event) {
    event.preventDefault();
    SWSELogger.log(`[CHARGEN] _onAskMentor: Activating suggestion engine for current step: ${this.currentStep}`);

    // Special handling for feats - show popup with top 5 suggestions
    if (this.currentStep === "feats") {
      SWSELogger.log(`[CHARGEN] _onAskMentor: FEATS step - showing suggestion dialog`);

      // Save filter state
      const filterCheckbox = document.querySelector('.filter-valid-feats');
      const wasFilterActive = filterCheckbox?.checked || false;

      try {
        const mentor = this._getCurrentMentor();
        const topFeats = (this.characterData.feats || []).length > 0
          ? document.querySelectorAll('.feat-card')
          : [];

        // Get top 5 suggested feats from the page
        const suggestions = Array.from(document.querySelectorAll('.feat-card[data-suggestion-tier]'))
          .sort((a, b) => {
            const tierA = parseInt(a.dataset.suggestionTier || 0);
            const tierB = parseInt(b.dataset.suggestionTier || 0);
            return tierB - tierA;
          })
          .slice(0, 5)
          .map(el => {
            // Get the feat name from the .feat-name element
            const nameEl = el.querySelector('.feat-name');
            const featName = nameEl ? nameEl.textContent.trim() : 'Unknown Feat';
            return {
              name: featName,
              tier: parseInt(el.dataset.suggestionTier || 0)
            };
          });

        if (suggestions.length > 0) {
          const mentorName = mentor?.name || "Your Mentor";
          const mentorPortrait = mentor?.portrait || '';
          const mentorTitle = mentor?.title || '';
          const content = `
            <div class="mentor-suggestions-wrapper">
              <div class="mentor-suggestions-header">
                ${mentorPortrait ? `<div class="mentor-header-portrait">
                  <img src="${mentorPortrait}" alt="${mentorName}" />
                </div>` : ''}
                <div class="mentor-header-info">
                  <h3>${mentorName}</h3>
                  ${mentorTitle ? `<p class="mentor-header-title">${mentorTitle}</p>` : ''}
                </div>
              </div>
              <div class="feat-suggestions-container">
                <p class="mentor-intro"><strong>${mentorName}</strong> recommends these feats:</p>
                <div class="feat-suggestions-list">
                  ${suggestions.map((feat, i) => `
                    <button class="feat-suggestion-button" data-feat-name="${feat.name}">
                      <span class="suggestion-number">${i + 1}</span>
                      <span class="feat-suggestion-name">${feat.name}</span>
                    </button>
                  `).join('')}
                </div>
                <p class="feat-suggestions-hint">Click a suggestion to select it, or close this dialog to browse feats manually.</p>
              </div>
            </div>
          `;

          const dialog = new Dialog(
            {
              title: `${mentorName}'s Feat Suggestions`,
              content: content,
              buttons: {
                cancel: {
                  icon: '<i class="fas fa-times"></i>',
                  label: "Cancel",
                  callback: () => {
                    // Restore filter state
                    if (wasFilterActive) {
                      const checkbox = document.querySelector('.filter-valid-feats');
                      if (checkbox) {
                        checkbox.checked = true;
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                    }
                  }
                }
              },
              render: (html) => {
                // Handle feat suggestion button clicks
                html.find('.feat-suggestion-button').on('click', (e) => {
                  const featName = e.currentTarget.dataset.featName;
                  SWSELogger.log(`[CHARGEN] _onAskMentor: User selected feat: ${featName}`);

                  // Find the feat card on the page and click it to select it
                  const featCard = document.querySelector(`.feat-card .feat-name:contains("${featName}")`);
                  if (featCard) {
                    featCard.closest('.feat-card').click();
                  } else {
                    // Fallback: search by text content
                    const cards = Array.from(document.querySelectorAll('.feat-card'));
                    const targetCard = cards.find(card => {
                      const nameEl = card.querySelector('.feat-name');
                      return nameEl && nameEl.textContent.trim() === featName;
                    });
                    if (targetCard) {
                      targetCard.click();
                    }
                  }
                  dialog.close();
                });
              }
            },
            { classes: ['feat-suggestions-dialog', 'mentor-suggestions-dialog', 'holo-window'], width: 800, height: 'auto' }
          );
          dialog.render(true);
          return;
        }
      } catch (err) {
        SWSELogger.error(`[CHARGEN] _onAskMentor: Error showing feat suggestions:`, err);
      }
    }

    // For other steps, enable suggestion engine and re-render
    this.suggestionEngine = true;
    ui.notifications.info("Your mentor is now providing suggestions for this step.");
    await this.render();
  }

  async _onAskMentorForcePowerSuggestion(event) {
    event.preventDefault();

    try {
      const { getAvailableForcePowers } = await import('./chargen-force-powers.js');
      const { ForceOptionSuggestionEngine } = await import('../../engine/ForceOptionSuggestionEngine.js');
      const { MentorSuggestionDialog } = await import('../mentor-suggestion-dialog.js');

      const availablePowers = await getAvailableForcePowers(this.actor, this.characterData);

      if (!availablePowers || availablePowers.length === 0) {
        ui.notifications.warn("No available Force powers to suggest.");
        return;
      }

      // Filter out already-selected powers
      const unselectedPowers = availablePowers.filter(p => p.isQualified &&
        !this.characterData.powers.some(pw => pw.name === p.name)
      );

      if (unselectedPowers.length === 0) {
        ui.notifications.warn("You've already selected all available Force powers!");
        return;
      }

      // Get suggestions using the Force power suggestion engine
      const suggestions = await SuggestionService.getSuggestions(this.actor, 'chargen', {
        domain: 'forcepowers',
        available: unselectedPowers,
        pendingData: this.characterData,
        engineOptions: { buildIntent: {} }
      });

      // Get the top-tier suggestion
      const topSuggestion = suggestions.find(s => s.suggestion?.tier >= 4) || suggestions[0];

      if (!topSuggestion) {
        ui.notifications.warn("No Force power suggestions available at this time.");
        return;
      }

      // Show mentor suggestion dialog
      const mentor = this._getCurrentMentor();
      const mentorClass = mentor?.class || 'neutral';
      await MentorSuggestionDialog.show(mentorClass, topSuggestion, 'force_power_selection');

      ui.notifications.info(`${mentor?.name || 'Your mentor'} suggests: ${topSuggestion.name}`);
    } catch (err) {
      console.error('Error getting Force power suggestion:', err);
      ui.notifications.error("Error getting mentor suggestion. Check console.");
    }
  }

  async _onNextStep(event) {
    event.preventDefault();

    // Capture name from input before validation (in case the input event hasn't fired yet)
    if (this.currentStep === "name") {
      const form = event.currentTarget.closest('.chargen-app');
      const nameInput = form?.querySelector('input[name="character-name"]');
      if (nameInput) {
        this.characterData.name = nameInput.value;
      }
    }

    // Validate current step
    if (!this._validateCurrentStep()) {
      return;
    }

    const steps = this._getSteps();
    SWSELogger.log(`CharGen | _onNextStep: steps array:`, steps);
    let idx = steps.indexOf(this.currentStep);
    SWSELogger.log(`CharGen | _onNextStep: currentStep="${this.currentStep}", idx=${idx}`);

    // If current step is not in steps array (due to dynamic changes), find it
    if (idx < 0) {
      SWSELogger.warn(`CharGen | _onNextStep: currentStep "${this.currentStep}" not in steps array, finding nearest valid step`);
      const allPossibleSteps = ["name", "type", "degree", "size", "droid-builder", "species",
        "abilities", "class", "background", "skills", "languages", "feats", "talents",
        "force-powers", "starship-maneuvers", "droid-final", "summary", "shop"];
      const currentIdx = allPossibleSteps.indexOf(this.currentStep);
      // Find the next valid step after current position
      for (let i = currentIdx + 1; i < allPossibleSteps.length; i++) {
        if (steps.includes(allPossibleSteps[i])) {
          this.currentStep = allPossibleSteps[i];
          await this.render();
          return;
        }
      }
      // If no valid next step found, go to last step
      this.currentStep = steps[steps.length - 1];
      await this.render();
      return;
    }

    if (idx >= 0 && idx < steps.length - 1) {
      let nextStep = steps[idx + 1];
      SWSELogger.log(`CharGen | _onNextStep: nextStep="${nextStep}"`);

      // Auto-skip languages step if no additional languages to select
      if (nextStep === "languages") {
        await this._initializeLanguages();
        const languageData = this.characterData.languageData;
        if (languageData && languageData.additional <= 0) {
          // Skip languages step - move to next step
          SWSELogger.log("CharGen | Auto-skipping languages step (no additional languages to select)");
          const languagesIdx = steps.indexOf("languages");
          if (languagesIdx >= 0 && languagesIdx < steps.length - 1) {
            nextStep = steps[languagesIdx + 1];
          }
        }
      }

      // Create character when moving from summary to shop
      if (this.currentStep === "summary" && nextStep === "shop" && !this._creatingActor) {
        this._creatingActor = true;
        try {
          this._finalizeCharacter();
          if (!this.actor) {
            // Validate before creating
            const isValid = await this._validateFinalCharacter();
            if (!isValid) {
              return; // Don't proceed to shop if validation fails
            }
            await this._createActor();
          }
        } finally {
          this._creatingActor = false;
        }
      }

      // In single-step mode, close the window after confirming the step instead of moving forward
      if (this.singleStepMode) {
        // Finalize and save changes to the actor
        this._finalizeCharacter();
        this.close();
        return;
      }

      this.currentStep = nextStep;

      // Auto-calculate derived values when moving forward
      if (this.currentStep === "summary") {
        this._finalizeCharacter();
      }

      await this.render();
    }
  }

  async _onPrevStep(event) {
    event.preventDefault();
    const steps = this._getSteps();
    const idx = steps.indexOf(this.currentStep);

    // If current step is not in steps array (due to dynamic changes), find nearest valid step
    if (idx < 0) {
      // Find the last completed step before the current position
      const allPossibleSteps = ["name", "type", "degree", "size", "droid-builder", "species",
        "abilities", "class", "background", "skills", "languages", "feats", "talents",
        "force-powers", "starship-maneuvers", "droid-final", "summary", "shop"];
      const currentIdx = allPossibleSteps.indexOf(this.currentStep);
      for (let i = currentIdx - 1; i >= 0; i--) {
        if (steps.includes(allPossibleSteps[i])) {
          this.currentStep = allPossibleSteps[i];
          await this.render();
          return;
        }
      }
      // If no valid previous step found, go to first step
      this.currentStep = steps[0];
      await this.render();
      return;
    }

    if (idx > 0) {
      this.currentStep = steps[idx - 1];
      await this.render();
    }
  }

  async _onJumpToStep(event) {
    event.preventDefault();
    event.stopPropagation();

    const targetStep = event.currentTarget.dataset.step;
    const steps = this._getSteps();

    if (!steps.includes(targetStep)) {
      SWSELogger.warn(`CharGen | Invalid step: ${targetStep}`);
      return;
    }

    // Check if step is clickable (previous or free build mode)
    const currentIndex = steps.indexOf(this.currentStep);
    const targetIndex = steps.indexOf(targetStep);

    // Cannot jump to future steps unless in free build mode
    if (!this.freeBuild && targetIndex > currentIndex) {
      ui.notifications.warn("You cannot jump forward to future steps. You can skip the current step or enable Free Build mode.");
      return;
    }

    // Special check: talents/skills require a class to be selected
    const requiresClass = ["talents", "skills"].includes(targetStep);
    const classSelected = this.characterData.classes && this.characterData.classes.length > 0;

    if (requiresClass && !classSelected && !this.freeBuild) {
      // Show dialog with options
      await new Dialog({
        title: "Class Required",
        content: `
          <div style="margin-bottom: 10px;">
            <p><i class="fas fa-info-circle" style="color: #00d9ff;"></i> <strong>You must select a class before choosing ${targetStep === 'talents' ? 'talents' : 'skills'}.</strong></p>
            <p>You have two options:</p>
            <ul style="margin-left: 20px; margin-top: 5px;">
              <li><strong>Go Back:</strong> Return to the class selection step</li>
              <li><strong>Enable Free Build:</strong> Skip validation and proceed anyway (characters may become illegal)</li>
            </ul>
          </div>
        `,
        buttons: {
          goback: {
            label: "Go Back",
            callback: () => {
              this.currentStep = "class";
              this.render();
            }
          },
          freebuild: {
            label: "Enable Free Build",
            callback: async () => {
              this.freeBuild = true;
              this.currentStep = targetStep;
              ui.notifications.info("Free Build Mode enabled. You can now select without class restrictions.");
              await this.render();
            }
          }
        },
        default: "goback"
      }).render(true);
      return;
    }

    // If jumping forward, show confirmation that character may become illegal
    if (targetIndex > currentIndex && !this.freeBuild) {
      const stepLabel = this._getStepLabel(targetStep);
      const confirmed = await Dialog.confirm({
        title: "Skip Steps?",
        content: `
          <div style="margin-bottom: 10px;">
            <p><i class="fas fa-exclamation-triangle" style="color: #ff9800;"></i> <strong>Skip to ${stepLabel}?</strong></p>
            <p>You are about to skip ${targetIndex - currentIndex} step(s).</p>
            <p style="margin-top: 10px; padding: 10px; background: rgba(255, 152, 0, 0.1); border-left: 3px solid #ff9800;">
              <strong>Warning:</strong> Skipping steps may make your character illegal and affect your builds. You can return to these steps later.
            </p>
          </div>
        `,
        defaultYes: false
      });

      if (!confirmed) {
        return;
      }

      // Mark all intermediate steps as skipped
      for (let i = currentIndex + 1; i < targetIndex; i++) {
        this.skippedSteps.add(steps[i]);
      }
    }

    SWSELogger.log(`CharGen | Jumping to step: ${targetStep}`, {
      fromStep: this.currentStep,
      skippedSteps: Array.from(this.skippedSteps)
    });

    this.currentStep = targetStep;
    await this.render();
  }

  /**
   * Skip the current step (mark as skipped and move to next step)
   */
  async _onSkipStep(event) {
    event.preventDefault();
    event.stopPropagation();

    // Show warning dialog
    const confirmed = await Dialog.confirm({
      title: "Skip This Step?",
      content: `
        <div style="margin-bottom: 10px;">
          <p><i class="fas fa-exclamation-triangle" style="color: #ff9800;"></i> <strong>Skip this step?</strong></p>
          <p>This step is important for character creation.</p>
          <p style="margin-top: 10px; padding: 10px; background: rgba(255, 152, 0, 0.1); border-left: 3px solid #ff9800;">
            <strong>Warning:</strong> Skipping this step may make your character illegal and affect your builds. You can always come back later to complete it.
          </p>
        </div>
      `,
      defaultYes: false
    });

    if (!confirmed) {
      return;
    }

    // Mark current step as skipped
    this.skippedSteps.add(this.currentStep);

    // Get next step
    const steps = this._getSteps();
    const currentIndex = steps.indexOf(this.currentStep);
    const nextStep = steps[currentIndex + 1];

    if (!nextStep) {
      ui.notifications.warn("You are at the final step. Cannot skip.");
      return;
    }

    SWSELogger.log(`CharGen | Skipping step: ${this.currentStep}`, {
      nextStep: nextStep,
      skippedSteps: Array.from(this.skippedSteps)
    });

    this.currentStep = nextStep;
    await this.render();
  }

  /**
   * Get a readable label for a step ID
   */
  _getStepLabel(step) {
    const labels = {
      'name': 'Character Name',
      'type': 'Character Type',
      'degree': 'Droid Degree',
      'size': 'Droid Size',
      'droid-builder': 'Droid Builder',
      'species': 'Species',
      'abilities': 'Ability Scores',
      'class': 'Class',
      'background': 'Background',
      'skills': 'Skills',
      'languages': 'Languages',
      'feats': 'Feats',
      'talents': 'Talents',
      'force-powers': 'Force Powers',
      'starship-maneuvers': 'Starship Maneuvers',
      'droid-final': 'Droid Finalization',
      'summary': 'Character Summary',
      'shop': 'Equipment Shop'
    };
    return labels[step] || step;
  }

  /**
   * Toggle free build mode
   */
  async _onToggleFreeBuild(event) {
    const checkbox = event.currentTarget;
    const wantsToEnable = checkbox.checked;

    // If enabling, ask for confirmation first
    if (wantsToEnable && !this.freeBuild) {
      const confirmed = await Dialog.confirm({
        title: "Enable Free Build Mode?",
        content: `
          <div style="margin-bottom: 10px;">
            <p><i class="fas fa-exclamation-triangle" style="color: #ff6b6b;"></i> <strong>Enable Free Build Mode?</strong></p>
            <p>Free Build Mode removes all validation and restrictions.</p>
            <p style="margin-top: 10px;">You will be able to:</p>
            <ul style="margin-left: 20px; margin-top: 5px;">
              <li>✓ Skip validation requirements</li>
              <li>✓ Select any feats or talents (ignore prerequisites)</li>
              <li>✓ Train any skills without class restrictions</li>
              <li>✓ Jump between steps freely</li>
              <li>✓ Set any ability scores</li>
            </ul>
            <p style="margin-top: 15px; padding: 10px; background: rgba(255, 107, 107, 0.1); border-left: 3px solid #ff6b6b;">
              <strong>Warning:</strong> This is intended for experienced users who understand SWSE rules.
              Characters created in Free Build mode may not follow standard rules.
            </p>
          </div>
        `,
        defaultYes: false
      });

      if (!confirmed) {
        // User cancelled, uncheck the checkbox
        checkbox.checked = false;
        return;
      }

      // User confirmed, enable free build
      this.freeBuild = true;
      ui.notifications.info("Free Build Mode enabled. All restrictions removed.");
    } else if (!wantsToEnable && this.freeBuild) {
      // Disabling free build mode
      this.freeBuild = false;
      ui.notifications.info("Free Build Mode disabled. Validation rules will now apply.");
    }

    await this.render();
  }

  _validateCurrentStep() {
    // Skip validation if free build is enabled
    if (this.freeBuild) {
      return true;
    }
    switch (this.currentStep) {
      case "name":
        if (!this.characterData.name || this.characterData.name.trim() === "") {
          ui.notifications.warn("Please enter a character name.");
          return false;
        }
        break;
      case "type":
        // Type is set by button click, isDroid will be true or false
        break;
      case "degree":
        if (!this.characterData.droidDegree) {
          ui.notifications.warn("Please select a droid degree.");
          return false;
        }
        break;
      case "size":
        if (!this.characterData.droidSize) {
          ui.notifications.warn("Please select a droid size.");
          return false;
        }
        break;
      case "droid-builder":
        // Droid builder is optional - player can skip and build later
        // Always return true to allow proceeding
        return true;
      case "droid-final":
        // Final droid step is required - must have built the droid or be skipping to it
        return this._validateDroidBuilder();
      case "species":
        if (!this.characterData.species) {
          ui.notifications.warn("Please select a species.");
          return false;
        }
        break;
      case "abilities":
        // Validate that ability scores are properly set
        // Droids don't have Constitution ability
        const abilities = this.characterData.isDroid
          ? ['str', 'dex', 'int', 'wis', 'cha']
          : ['str', 'dex', 'con', 'int', 'wis', 'cha'];
        const allSet = abilities.every(ab => {
          const base = this.characterData.abilities[ab]?.base;
          return base !== undefined && base >= 8 && base <= 18;
        });

        if (!allSet) {
          ui.notifications.warn("Please set all ability scores.");
          return false;
        }

        // Only validate point buy budget if point buy method was used
        if (this.characterData.abilityGenerationMethod === 'point-mode') {
          // Validate point buy budget using the same cumulative cost table as the UI
          // This matches the standard point buy costs from the Saga Edition rules
          const cumulativeCosts = {
            8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 6, 15: 8, 16: 10, 17: 13, 18: 16
          };
          const pointCosts = (value) => cumulativeCosts[value] || 0;

          const totalSpent = abilities.reduce((sum, ab) => {
            return sum + pointCosts(this.characterData.abilities[ab]?.base || 8);
          }, 0);

          // Get the correct point buy pool based on character type
          const pointBuyPool = this.characterData.isDroid
            ? (game.settings.get('foundryvtt-swse', "droidPointBuyPool") || 20)
            : (game.settings.get('foundryvtt-swse', "livingPointBuyPool") || 25);

          // Allow some flexibility (within 2 points of the budget)
          if (totalSpent > pointBuyPool) {
            ui.notifications.warn(`You've overspent your point buy budget! (${totalSpent}/${pointBuyPool} points)`);
            return false;
          }

          if (totalSpent < pointBuyPool - 2) {
            ui.notifications.warn(`You still have ${pointBuyPool - totalSpent} point buy points to spend. Use them all!`);
            return false;
          }
        }
        break;
      case "class":
        if (this.characterData.classes.length === 0) {
          ui.notifications.warn("Please select a class.");
          return false;
        }
        break;
      case "background":
        // Background is optional in SWSE rules, allow skipping
        break;
      case "skills":
        const trainedCount = Object.values(this.characterData.skills || {}).filter(s => s.trained).length;
        const requiredCount = this.characterData.trainedSkillsAllowed || 0;
        if (trainedCount < requiredCount) {
          ui.notifications.warn(`You must train ${requiredCount} skills (currently trained: ${trainedCount}).`);
          return false;
        }
        if (trainedCount > requiredCount) {
          ui.notifications.warn(`You can only train ${requiredCount} skills (currently trained: ${trainedCount}). Untrain ${trainedCount - requiredCount} skill(s).`);
          return false;
        }
        break;
      case "languages":
        // Languages validation handled by auto-skip logic in _onNextStep
        break;
      case "feats":
        const selectedFeatsCount = (this.characterData.feats || []).length;
        const requiredFeats = this.characterData.featsRequired || 1;
        if (selectedFeatsCount < requiredFeats) {
          ui.notifications.warn(`You must select ${requiredFeats} feat(s) (currently selected: ${selectedFeatsCount}).`);
          return false;
        }
        break;
      case "talents":
        const selectedTalentsCount = (this.characterData.talents || []).length;
        // Level 1 characters get 1 talent
        const requiredTalents = 1;
        if (selectedTalentsCount < requiredTalents) {
          ui.notifications.warn(`You must select ${requiredTalents} talent (currently selected: ${selectedTalentsCount}).`);
          return false;
        }
        break;
      case "force-powers":
        const selectedPowersCount = (this.characterData.powers || []).length;
        const requiredPowers = this._getForcePowersNeeded();
        if (selectedPowersCount < requiredPowers) {
          ui.notifications.warn(`You must select ${requiredPowers} Force power(s) (currently selected: ${selectedPowersCount}).`);
          return false;
        }
        break;
      case "starship-maneuvers":
        const selectedManeuversCount = (this.characterData.starshipManeuvers || []).length;
        const requiredManeuvers = this._getStarshipManeuversNeeded();
        if (selectedManeuversCount < requiredManeuvers) {
          ui.notifications.warn(`You must select ${requiredManeuvers} starship maneuver(s) (currently selected: ${selectedManeuversCount}).`);
          return false;
        }
        break;
      case "summary":
        // Auto-select maximum credits if formula exists but not chosen
        if (this.characterData.startingCreditsFormula && !this.characterData.creditsChosen) {
          this.characterData.credits = this.characterData.startingCreditsFormula.maxPossible;
          this.characterData.creditsChosen = true;
        }
        break;
    }
    return true;
  }

  /**
   * Validate final character data before creation
   * This runs EVEN in free build mode to prevent broken characters
   * @returns {Promise<boolean>} True if valid, false otherwise
   */
  async _validateFinalCharacter() {
    const errors = [];

    // Always required: Character name
    if (!this.characterData.name || this.characterData.name.trim() === '') {
      errors.push("Character must have a name");
    }

    // Droid-specific minimum validation
    if (this.characterData.isDroid) {
      if (!this.characterData.droidSystems?.locomotion) {
        errors.push("Droids must have a locomotion system");
      }
      if (!this.characterData.droidSystems?.processor) {
        errors.push("Droids must have a processor");
      }
      if (!this.characterData.droidDegree) {
        errors.push("Droids must have a degree selected");
      }
    }

    // Living beings need a species
    if (!this.characterData.isDroid && !this.characterData.species) {
      errors.push("Living characters must have a species");
    }

    // Class required for all characters
    if (!this.characterData.classes || this.characterData.classes.length === 0) {
      errors.push("Character must have at least one class");
    }

    // Starting credits - auto-select if formula exists but not chosen
    if (this.characterData.startingCreditsFormula && !this.characterData.creditsChosen) {
      this.characterData.credits = this.characterData.startingCreditsFormula.maxPossible;
      this.characterData.creditsChosen = true;
    }

    // Show errors
    if (errors.length > 0) {
      if (!this.freeBuild) {
        // In normal mode, just show the errors and block
        ui.notifications.error(`Validation errors:\n${errors.join('\n')}`);
        return false;
      } else {
        // In free build mode, show a confirmation dialog
        const confirmed = await Dialog.confirm({
          title: "Validation Warnings",
          content: `
            <p><strong>The following issues were found:</strong></p>
            <ul>
              ${errors.map(e => `<li>${e}</li>`).join('')}
            </ul>
            <p>Creating a character with these issues may cause problems.</p>
            <p><strong>Continue anyway?</strong></p>
          `,
          defaultYes: false
        });
        return confirmed;
      }
    }

    return true;
  }

  _finalizeCharacter() {
    // Final recalculations before character creation
    this._recalcAbilities();
    this._recalcDefenses();
    
    // Second Wind
    const conMod = this.characterData.abilities.con.mod || 0;
    const hpMax = this.characterData.hp.max;
    this.characterData.secondWind.healing = Math.max(Math.floor(hpMax / 4), conMod) + 
      (this.characterData.secondWind.misc || 0);
    
    // Damage Threshold = Fortitude Defense
    this.characterData.damageThreshold = this.characterData.defenses.fort.total;
  }

  async _onFinish(event) {
    event.preventDefault();

    this._finalizeCharacter();

    // Perform minimal validation even in free build mode
    const isValid = await this._validateFinalCharacter();
    if (!isValid) {
      return; // Don't proceed if validation fails
    }

    if (this.actor) {
      await this._updateActor();
    } else {
      await this._createActor();
    }

    this.close();
  }

  async _onOpenShop(event) {
    event.preventDefault();

    // Ensure character has been created
    if (!this.actor) {
      this._finalizeCharacter();

      // Validate before creating
      const isValid = await this._validateFinalCharacter();
      if (!isValid) {
        return; // Don't open shop if validation fails
      }

      await this._createActor();
    }

    // Import and open the store
    try {
      const { SWSEStore } = await import('../store/store-main.js');
      const store = new SWSEStore(this.actor);
      store.render(true);
    } catch (err) {
      SWSELogger.error("SWSE | Failed to open store:", err);
      ui.notifications.error("Failed to open the shop. You can access it from your character sheet.");
    }
  }

  /**
   * Handle rolling for starting credits
   */
  async _onRollCredits(event) {
    event.preventDefault();

    if (!this.characterData.startingCreditsFormula) {
      ui.notifications.warn("No starting credits formula available.");
      return;
    }

    const formula = this.characterData.startingCreditsFormula;
    const { numDice, dieSize, multiplier } = formula;

    // Roll the dice
    const rollFormula = `${numDice}d${dieSize}`;
    const roll = await new Roll(rollFormula).evaluate();

    // Calculate credits
    const credits = roll.total * multiplier;

    // Show the roll in chat
    await roll.toMessage({
      flavor: `<h3>Starting Credits Roll</h3><p><strong>${this.characterData.name}</strong> rolls ${rollFormula} × ${multiplier.toLocaleString()}</p>`,
      speaker: ChatMessage.getSpeaker({ alias: this.characterData.name || "Character" })
    });

    // Set credits and mark as chosen
    this.characterData.credits = credits;
    this.characterData.creditsChosen = true;

    SWSELogger.log(`CharGen | Starting credits rolled: ${credits} (${roll.total} × ${multiplier})`);
    ui.notifications.info(`You rolled ${credits.toLocaleString()} credits!`);

    // Re-render to show result
    this.render();
  }

  /**
   * Handle taking maximum starting credits
   */
  async _onTakeMaxCredits(event) {
    event.preventDefault();

    if (!this.characterData.startingCreditsFormula) {
      ui.notifications.warn("No starting credits formula available.");
      return;
    }

    const maxCredits = this.characterData.startingCreditsFormula.maxPossible;

    // Set credits and mark as chosen
    this.characterData.credits = maxCredits;
    this.characterData.creditsChosen = true;

    SWSELogger.log(`CharGen | Starting credits (maximum): ${maxCredits}`);
    ui.notifications.info(`You chose the maximum: ${maxCredits.toLocaleString()} credits!`);

    // Re-render to show result
    this.render();
  }

  /**
   * Handle re-rolling/changing starting credits choice
   */
  async _onRerollCredits(event) {
    event.preventDefault();

    // Confirm with user
    const confirmed = await Dialog.confirm({
      title: "Change Starting Credits?",
      content: "<p>Are you sure you want to change your starting credits selection?</p>",
      defaultYes: false
    });

    if (!confirmed) return;

    // Reset credits choice
    this.characterData.credits = null;
    this.characterData.creditsChosen = false;

    SWSELogger.log(`CharGen | Starting credits reset for new choice`);

    // Re-render to show choices again
    this.render();
  }

  async _createActor() {
    // Build proper actor data structure matching SWSEActorSheet expectations
    // Note: The actor system uses 'race' as the property name for species data
    // IMPORTANT: CharacterDataModel uses 'attributes' not 'abilities'
    // Convert abilities → attributes to match DataModel schema
    const attributes = {};
    for (const [key, ability] of Object.entries(this.characterData.abilities)) {
      attributes[key] = {
        base: ability.base || 10,
        racial: ability.racial || 0,
        enhancement: 0, // No enhancements at character creation
        temp: ability.temp || 0
      };
    }

    // Build skills object (using camelCase keys)
    const skills = {};
    for (const [key, skill] of Object.entries(this.characterData.skills || {})) {
      skills[key] = {
        trained: skill.trained || false,
        focused: skill.focused || false,
        miscMod: skill.misc || 0,
        selectedAbility: skill.selectedAbility || this._getDefaultAbilityForSkill(key)
      };
    }

    // Build progression structure for level-up compatibility
    const progression = {
      classLevels: (this.characterData.classes || []).map(cls => ({
        class: cls.name,
        level: cls.level || 1,
        choices: {}
      })),
      species: this.characterData.species || "",
      background: this.characterData.background?.id || "",
      backgroundTrainedSkills: this.characterData.background?.trainedSkills || [],
      feats: (this.characterData.feats || []).map(feat => feat.name || feat),
      talents: (this.characterData.talents || []).map(talent => talent.name || talent),
      trainedSkills: this.characterData.trainedSkills || [],
      abilityIncreases: this.characterData.abilityIncreases || []
    };

    const system = {
      level: this.characterData.level,
      species: this.characterData.species,  // Use consistent 'species' property
      size: this.characterData.size || "medium", // Lowercase for DataModel schema
      isDroid: this.characterData.isDroid || false, // DataModel requires this field
      droidDegree: this.characterData.droidDegree || "", // DataModel field for droids
      attributes: attributes, // Use attributes instead of abilities
      skills: skills, // Normalized skills with DataModel structure
      hp: this.characterData.hp,
      forcePoints: this.characterData.forcePoints,
      forceSensitive: this.characterData.forceSensitive || false, // Persist force sensitivity flag
      destinyPoints: this.characterData.destinyPoints,
      secondWind: this.characterData.secondWind,
      defenses: this.characterData.defenses,
      classes: this.characterData.classes,
      bab: this.characterData.bab,
      speed: Number.isFinite(this.characterData.speed) ? this.characterData.speed : 6,
      damageThresholdMisc: this.characterData.damageThresholdMisc || 0,
      credits: this.characterData.isDroid
        ? this.characterData.droidCredits.remaining
        : (this.characterData.credits || 1000),
      weapons: [],
      // Species data
      specialAbilities: this.characterData.specialAbilities || [],
      languages: this.characterData.languages || [],
      racialSkillBonuses: this.characterData.racialSkillBonuses || [],
      speciesSource: this.characterData.speciesSource || "",
      // Background data for biography tab
      event: this.characterData.background && this.characterData.background.category === 'event' ? this.characterData.background.name : "",
      profession: this.characterData.background && this.characterData.background.category === 'occupation' ? this.characterData.background.name : "",
      planetOfOrigin: this.characterData.background && this.characterData.background.category === 'planet' ? this.characterData.background.name : "",
      // Progression structure for level-up system
      progression: progression,
      // Mentor system data for suggestion engine
      swse: {
        mentorBuildIntentBiases: this.characterData.mentorBiases || {},
        mentorSurveyCompleted: this.characterData.mentorSurveyCompleted || false
      }
    };

    // For NPCs, auto-create a Nonheroic class
    if (this.actorType === "npc" && (!this.characterData.classes || this.characterData.classes.length === 0)) {
      this.characterData.classes = [{ name: "Nonheroic", level: 1 }];
    }

    const actorData = {
      name: this.characterData.name || "Unnamed Character",
      type: this.actorType, // Use the actorType passed in constructor
      system: system,
      prototypeToken: {
        name: this.characterData.name || "Unnamed Character",
        actorLink: true
      }
    };

    // Persist Near-Human builder data and mentor system data to actor flags
    actorData.flags = {
      'foundryvtt-swse': {}
    };

    if (this.characterData.nearHumanData) {
      actorData.flags['foundryvtt-swse'].nearHumanData = this.characterData.nearHumanData;
    }

    // Store starting class for mentor system (required for mentor identification across all levels)
    if (this.characterData.classes && this.characterData.classes.length > 0) {
      actorData.flags['foundryvtt-swse'].startingClass = this.characterData.classes[0].name;
    }

    let created = null;
    try {
      // Create the actor
      created = await Actor.create(actorData);

      if (!created) {
        throw new Error("Actor creation returned null or undefined");
      }

      // Create embedded items (feats, talents, powers)
      // DEFENSIVE CLONE: Ensure fresh copies for actor creation
      const items = [];
      for (const f of (this.characterData.feats || [])) {
        items.push(foundry.utils.deepClone(f));
      }
      for (const t of (this.characterData.talents || [])) {
        items.push(foundry.utils.deepClone(t));
      }
      for (const p of (this.characterData.powers || [])) {
        items.push(foundry.utils.deepClone(p));
      }

      // Create class items for player characters (matching level-up behavior)
      // This ensures talent trees and other class data are available on the character sheet
      if (this.actorType !== "npc" && this.characterData.classes) {
        for (const classData of this.characterData.classes) {
          const classDoc = this._packs.classes.find(c => c.name === classData.name);
          if (classDoc) {
            // SSOT: Get normalized class definition
            const classDef = ClassesDB.byName(classDoc.name);

            if (!classDef) {
              SWSELogger.error(`CharGen | Class not found in ClassesDB: ${classDoc.name}`);
              continue;
            }

            // Create STATE-ONLY class item (no mechanics data stored)
            // All class mechanics are derived from ClassesDB at runtime
            const classItem = {
              name: classDoc.name,
              type: "class",
              img: classDoc.img,
              system: {
                classId: classDef.id,      // Stable ID for ClassesDB lookup
                level: classData.level || 1  // State: current level in this class
                // NO mechanics data (hitDie, bab, defenses, skills, talents)
                // All derived from ClassesDB.get(classId) at runtime
              }
            };
            items.push(classItem);
            SWSELogger.log(`CharGen | Created STATE-ONLY class item for ${classDoc.name} (classId: ${classDef.id}, level: ${classData.level || 1})`);
          }
        }
      }

      // For NPCs, create a Nonheroic class item
      if (this.actorType === "npc") {
        const nonheroicClass = {
          name: "Nonheroic",
          type: "class",
          system: {
            level: 1,
            hitDie: "1d4",
            babProgression: "medium", // Will be overridden by nonheroic BAB table
            isNonheroic: true,
            defenses: {
              fortitude: 0,
              reflex: 0,
              will: 0
            },
            classSkills: [
              "acrobatics", "climb", "deception", "endurance",
              "gatherInfo", "initiative", "jump",
              "knowledgeBureaucracy", "knowledgeGalacticLore",
              "knowledgeLifeSciences", "knowledgePhysicalSciences",
              "knowledgeSocialSciences", "knowledgeTactics",
              "knowledgeTechnology", "mechanics", "perception",
              "persuasion", "pilot", "ride", "stealth", "survival",
              "swim", "treatInjury", "useComputer"
            ],
            forceSensitive: false,
            talentTrees: []
          }
        };
        items.push(nonheroicClass);
      }

      // Create embedded documents with error handling
      if (items.length > 0) {
        try {
          const createdItems = await created.createEmbeddedDocuments("Item", items);
          if (!createdItems || createdItems.length !== items.length) {
            throw new Error(`Item creation mismatch: expected ${items.length}, got ${createdItems?.length || 0}`);
          }
        } catch (itemError) {
          // Rollback: delete the actor if item creation fails
          await created.delete();
          throw new Error(`Failed to create character items: ${itemError.message}`);
        }
      }

      // NOTE: Auto-grant class features (like Force Sensitivity) are NOT applied during chargen
      // to avoid consuming feat slots that the player should be able to choose from.
      // These will be handled by the progression/level-up system when the character sheets loads
      // or can be manually applied through the level-up UI if needed.

      // Apply background (Event abilities, Occupation bonuses, etc.)
      if (this.characterData.background) {
        try {
          await this._applyBackgroundToActor(created);
        } catch (backgroundError) {
          SWSELogger.warn("Failed to apply background features:", backgroundError);
          ui.notifications.warn("Character created, but background features may not have been applied correctly.");
          // Non-critical error, continue
        }
      }

      // Save character generation data to flags for reference
      try {
        await created.setFlag("swse", "chargenData", this.characterData);
      } catch (flagError) {
        SWSELogger.warn("Failed to save chargen data to flags:", flagError);
        // Non-critical error, continue
      }

      // Verify the actor has the expected structure
      if (!created.system || !created.name) {
        await created.delete();
        throw new Error("Created actor has invalid structure");
      }

      // Store the actor reference
      this.actor = created;

      // Emit chargen completion hook for modules to handle
      Hooks.call('swse:progression:completed', {
        actor: created,
        mode: 'chargen',
        level: this.characterData.level || 1
      });

      // Open the character sheet
      created.sheet.render(true);

      ui.notifications.info(`Character ${this.characterData.name} created successfully!`);
    } catch (err) {
      SWSELogger.error("chargen: actor creation failed", err);
      ui.notifications.error(`Failed to create character: ${err.message}. See console for details.`);

      // Ensure we clean up if something went wrong and actor exists
      if (created && !this.actor) {
        try {
          await created.delete();
          SWSELogger.log("Rolled back partial actor creation");
        } catch (deleteError) {
          SWSELogger.error("Failed to rollback actor creation:", deleteError);
        }
      }
    }
  }

  async _updateActor() {
    // Check if this is a class addition (singleStepMode) or full level-up
    const selectedClassName = this.characterData.classes[0]?.name;

    // If in single step mode (adding class from sheet), just add the class item and update mentor
    if (this.singleStepMode && selectedClassName) {
      const items = [];
      const classItem = {
        name: selectedClassName,
        type: "class",
        img: this.characterData.classes[0].img,
        system: {
          classId: this.characterData.classes[0].classId,
          level: 1
        }
      };
      items.push(classItem);

      if (items.length > 0) {
        await this.actor.createEmbeddedDocuments("Item", items);
      }

      // Update mentor with new class target
      try {
        const mentorId = this.actor.getFlag('swse', 'level1Class');
        if (mentorId) {
          let memory = await getMentorMemory(this.actor, mentorId.toLowerCase());
          memory = setTargetClass(memory, selectedClassName);
          await setMentorMemory(this.actor, mentorId.toLowerCase(), memory);
          SWSELogger.log(`CharGen | Updated mentor memory for ${mentorId} with target class: ${selectedClassName}`);
        }
      } catch (err) {
        SWSELogger.warn("Failed to update mentor memory for new class:", err);
      }

      ui.notifications.info(`${this.actor.name} learned the ${selectedClassName} class!`);
      return;
    }

    // Full level-up: increment level and add new items
    const newLevel = (this.actor.system.level || 1) + 1;
    const updates = { "system.level": newLevel };

    // Recalculate HP for new level
    const conMod = this.actor.system.attributes.con.mod || 0;
    const classDoc = this._packs.classes.find(c =>
      c.name === selectedClassName
    );
    const hitDie = classDoc?.system?.hitDie || 6;
    const hpGain = Math.floor(hitDie / 2) + 1 + conMod;
    updates["system.hp.max"] = this.actor.system.hp.max + hpGain;
    updates["system.hp.value"] = this.actor.system.hp.value + hpGain;

    await globalThis.SWSE.ActorEngine.updateActor(this.actor, updates);

    // Add new feats/talents/powers
    const items = [];
    for (const f of (this.characterData.feats || [])) items.push(f);
    for (const t of (this.characterData.talents || [])) items.push(t);
    for (const p of (this.characterData.powers || [])) items.push(p);

    if (items.length > 0) {
      await this.actor.createEmbeddedDocuments("Item", items);
    }

    ui.notifications.info(`${this.actor.name} leveled up to level ${newLevel}!`);
  }

  /**
   * Get class metadata (icon and description)
   */
  _getClassMetadata(className) {
    const metadata = {
      // Base Classes
      'Jedi': { icon: 'fa-jedi', description: 'Force-wielding guardians of peace and justice' },
      'Noble': { icon: 'fa-crown', description: 'Leaders, diplomats, and aristocrats of influence' },
      'Scoundrel': { icon: 'fa-mask', description: 'Rogues, smugglers, and fortune seekers' },
      'Scout': { icon: 'fa-binoculars', description: 'Explorers, trackers, and wilderness experts' },
      'Soldier': { icon: 'fa-shield-alt', description: 'Warriors, tacticians, and military specialists' },

      // Prestige Classes
      'Ace Pilot': { icon: 'fa-fighter-jet', description: 'Elite pilots who master vehicle combat' },
      'Assassin': { icon: 'fa-crosshairs', description: 'Deadly killers who strike from the shadows' },
      'Bounty Hunter': { icon: 'fa-bullseye', description: 'Trackers who hunt targets for profit' },
      'Charlatan': { icon: 'fa-theater-masks', description: 'Masters of deception and disguise' },
      'Corporate Agent': { icon: 'fa-briefcase', description: 'Operatives working for corporate interests' },
      'Crime Lord': { icon: 'fa-chess-king', description: 'Leaders of criminal organizations' },
      'Droid Commander': { icon: 'fa-robot', description: 'Tacticians who lead and coordinate droids' },
      'Elite Trooper': { icon: 'fa-user-shield', description: 'Elite military specialists and commandos' },
      'Enforcer': { icon: 'fa-gavel', description: 'Intimidating agents who enforce their will' },
      'Force Adept': { icon: 'fa-hand-sparkles', description: 'Force users without formal Jedi training' },
      'Force Disciple': { icon: 'fa-book-open', description: 'Students devoted to studying the Force' },
      'Gladiator': { icon: 'fa-shield', description: 'Arena fighters who excel in melee combat' },
      'Gunslinger': { icon: 'fa-gun', description: 'Quick-draw experts with ranged weapons' },
      'Imperial Knight': { icon: 'fa-chess-knight', description: 'Force-wielding servants of the Empire' },
      'Improviser': { icon: 'fa-tools', description: 'Resourceful experts who adapt to any situation' },
      'Independent Droid': { icon: 'fa-battery-full', description: 'Self-aware droids with independent thinking' },
      'Infiltrator': { icon: 'fa-user-ninja', description: 'Stealth experts who infiltrate enemy territory' },
      'Jedi Knight': { icon: 'fa-jedi', description: 'Experienced Jedi who have proven their worth' },
      'Jedi Master': { icon: 'fa-star', description: 'Elite Jedi who have achieved mastery of the Force' },
      'Martial Arts Master': { icon: 'fa-fist-raised', description: 'Unarmed combat specialists and fighters' },
      'Master Privateer': { icon: 'fa-ship', description: 'Legendary spacers and ship captains' },
      'Medic': { icon: 'fa-medkit', description: 'Healers skilled in medicine and first aid' },
      'Melee Duelist': { icon: 'fa-skull-crossbones', description: 'Masters of one-on-one melee combat' },
      'Military Engineer': { icon: 'fa-hard-hat', description: 'Combat engineers and demolitions experts' },
      'Officer': { icon: 'fa-medal', description: 'Military leaders and tactical commanders' },
      'Outlaw': { icon: 'fa-ban', description: 'Criminals who live outside the law' },
      'Pathfinder': { icon: 'fa-compass', description: 'Expert guides and wilderness scouts' },
      'Saboteur': { icon: 'fa-bomb', description: 'Specialists in sabotage and demolitions' },
      'Shaper': { icon: 'fa-cube', description: 'Biotechnologists who manipulate living organisms' },
      'Sith Apprentice': { icon: 'fa-user-secret', description: 'Dark side Force users in training' },
      'Sith Lord': { icon: 'fa-skull', description: 'Masters of the dark side of the Force' },
      'Vanguard': { icon: 'fa-flag', description: 'Front-line warriors who lead the charge' }
    };
    return metadata[className] || { icon: 'fa-user', description: 'Unknown class' };
  }

  /**
   * Organize feats by category using feat metadata
   */
  _organizeFeatsByCategory(feats) {
    if (!this._featMetadata || !this._featMetadata.feats || !this._featMetadata.categories) {
      return { uncategorized: feats };
    }

    const categorized = {};
    const uncategorized = [];

    // Initialize each category
    for (const [catKey, catInfo] of Object.entries(this._featMetadata.categories)) {
      categorized[catKey] = {
        ...catInfo,
        feats: []
      };
    }

    // Organize feats
    for (const feat of feats) {
      const metadata = this._featMetadata.feats[feat.name];
      if (metadata && metadata.category && categorized[metadata.category]) {
        // Extract feat level (for feats like "Martial Arts I", "Dual Weapon Mastery II", etc.)
        const { level: featLevel } = this._extractFeatLevel(feat.name);
        categorized[metadata.category].feats.push({
          ...feat,
          metadata: metadata,
          chain: metadata.chain,
          chainOrder: metadata.chainOrder,
          prerequisiteFeat: metadata.prerequisiteFeat,
          featLevel: featLevel
        });
      } else {
        uncategorized.push(feat);
      }
    }

    // Sort feats within each category and calculate indent levels
    for (const category of Object.values(categorized)) {
      if (!category.feats) continue;

      // Sort by chain and chain order
      category.feats.sort((a, b) => {
        if (a.chain && b.chain) {
          if (a.chain === b.chain) {
            return (a.chainOrder || 0) - (b.chainOrder || 0);
          }
          return a.chain.localeCompare(b.chain);
        }
        if (a.chain) return -1;
        if (b.chain) return 1;
        return a.name.localeCompare(b.name);
      });

      // Calculate indent levels
      category.feats.forEach(feat => {
        if (!feat.chain) {
          feat.indentLevel = 0;
          return;
        }

        let indentLevel = 0;
        let currentPrereq = feat.prerequisiteFeat;

        while (currentPrereq) {
          indentLevel++;
          const prereqFeat = category.feats.find(f => f.name === currentPrereq);
          currentPrereq = prereqFeat?.prerequisiteFeat;

          if (indentLevel > 10) break;
        }

        feat.indentLevel = indentLevel;
      });
    }

    // Add uncategorized if any exist
    if (uncategorized.length > 0) {
      categorized.uncategorized = {
        name: "Other Feats",
        description: "Feats without a specific category",
        icon: "📋",
        order: 999,
        feats: uncategorized
      };
    }

    return categorized;
  }

  /**
   * Get default ability for a skill key (snake_case format)
   * @param {string} skillKey - The skill key in snake_case
   * @returns {string} The default ability key
   */
  _getDefaultAbilityForSkill(skillKey) {
    const abilityMap = {
      acrobatics: 'dex',
      climb: 'str',
      deception: 'cha',
      endurance: 'con',
      gatherInfo: 'cha',
      initiative: 'dex',
      jump: 'str',
      knowledgeBureaucracy: 'int',
      knowledgeGalacticLore: 'int',
      knowledgeLifeSciences: 'int',
      knowledgePhysicalSciences: 'int',
      knowledgeSocialSciences: 'int',
      knowledgeTactics: 'int',
      knowledgeTechnology: 'int',
      mechanics: 'int',
      perception: 'wis',
      persuasion: 'cha',
      pilot: 'dex',
      ride: 'dex',
      stealth: 'dex',
      survival: 'wis',
      swim: 'str',
      treatInjury: 'wis',
      useComputer: 'int',
      useTheForce: 'cha'
    };
    return abilityMap[skillKey] || 'int';
  }

  /**
   * Load backgrounds from progression rules
   */
  async _loadBackgroundsFromProgression() {
    try {
      // Load comprehensive backgrounds from backgrounds.json
      // Try multiple URL formats to handle different Foundry configurations
      const urlFormats = [
        'systems/foundryvtt-swse/data/backgrounds.json',
        '/systems/foundryvtt-swse/data/backgrounds.json',
        'data/backgrounds.json'
      ];

      let response = null;
      let fetchUrl = null;
      let lastError = null;

      for (const url of urlFormats) {
        try {
          SWSELogger.log(`SWSE | Attempting to load backgrounds from: ${url}`);
          response = await fetch(url);
          if (response.ok) {
            fetchUrl = url;
            SWSELogger.log(`SWSE | Successfully fetched from: ${url}`);
            break;
          }
        } catch (err) {
          lastError = err;
          SWSELogger.warn(`SWSE | Failed to load from ${url}: ${err.message}`);
        }
      }

      if (!response || !response.ok) {
        throw new Error(`Failed to fetch backgrounds from any URL. Last error: ${lastError?.message || 'Unknown error'}`);
      }

      const backgroundsData = await response.json();
      SWSELogger.log(`SWSE | Successfully parsed backgrounds JSON from ${fetchUrl}`, {
        hasEvents: Array.isArray(backgroundsData.events),
        hasOccupations: Array.isArray(backgroundsData.occupations),
        hasPlanetCore: Array.isArray(backgroundsData.planets_core),
        hasPlanetHomebrew: Array.isArray(backgroundsData.planets_homebrew)
      });

      // Flatten all backgrounds from all categories
      this.allBackgrounds = [];

      // Process events (events is an array directly in the JSON)
      if (backgroundsData.events && Array.isArray(backgroundsData.events)) {
        this.allBackgrounds.push(...backgroundsData.events.map(bg => ({
          ...bg,
          category: 'event',
          homebrew: false
        })));
      }

      // Process occupations (occupations is an array directly in the JSON)
      if (backgroundsData.occupations && Array.isArray(backgroundsData.occupations)) {
        this.allBackgrounds.push(...backgroundsData.occupations.map(bg => ({
          ...bg,
          category: 'occupation',
          homebrew: false
        })));
      }

      // Process core planets (planets_core is an array directly in the JSON)
      if (backgroundsData.planets_core && Array.isArray(backgroundsData.planets_core)) {
        this.allBackgrounds.push(...backgroundsData.planets_core.map(bg => ({
          ...bg,
          category: 'planet',
          homebrew: false
        })));
      }

      // Process homebrew planets (planets_homebrew is an array directly in the JSON)
      if (backgroundsData.planets_homebrew && Array.isArray(backgroundsData.planets_homebrew)) {
        this.allBackgrounds.push(...backgroundsData.planets_homebrew.map(bg => ({
          ...bg,
          category: 'planet',
          homebrew: true
        })));
      }

      // For backwards compatibility, also set this.backgrounds to initial category
      this.backgrounds = this.allBackgrounds.filter(bg => bg.category === 'event');

      SWSELogger.log(`SWSE | Loaded ${this.allBackgrounds.length} backgrounds total (${this.backgrounds.length} events)`);
    } catch (error) {
      SWSELogger.error('SWSE | Failed to load backgrounds:', error);
      this.allBackgrounds = [];
      this.backgrounds = [];
    }
  }

  /**
   * Get default skills list when skills.json fails to load
   * @returns {Array} Array of default skill objects
   */
  _getDefaultSkills() {
    return [
      { key: "acrobatics", name: "Acrobatics", ability: "dex", trained: false, armorCheck: true },
      { key: "climb", name: "Climb", ability: "str", trained: false, armorCheck: true },
      { key: "deception", name: "Deception", ability: "cha", trained: false },
      { key: "endurance", name: "Endurance", ability: "con", trained: false, armorCheck: true },
      { key: "gatherInfo", name: "Gather Information", ability: "cha", trained: false },
      { key: "initiative", name: "Initiative", ability: "dex", trained: false },
      { key: "jump", name: "Jump", ability: "str", trained: false, armorCheck: true },
      { key: "knowledge", name: "Knowledge", ability: "int", trained: true },
      { key: "mechanics", name: "Mechanics", ability: "int", trained: true },
      { key: "perception", name: "Perception", ability: "wis", trained: false },
      { key: "persuasion", name: "Persuasion", ability: "cha", trained: false },
      { key: "pilot", name: "Pilot", ability: "dex", trained: false },
      { key: "ride", name: "Ride", ability: "dex", trained: false },
      { key: "stealth", name: "Stealth", ability: "dex", trained: false, armorCheck: true },
      { key: "survival", name: "Survival", ability: "wis", trained: false },
      { key: "swim", name: "Swim", ability: "str", trained: false, armorCheck: true },
      { key: "treatInjury", name: "Treat Injury", ability: "wis", trained: false },
      { key: "useComputer", name: "Use Computer", ability: "int", trained: true },
      { key: "useTheForce", name: "Use the Force", ability: "cha", trained: true }
    ];
  }

  /**
   * Extract Roman numeral level from feat name
   * Handles feats like "Martial Arts I", "Dual Weapon Mastery II", etc.
   * @param {string} featName - The feat name
   * @returns {object} Object with level number, roman numeral, and base name
   */
  _extractFeatLevel(featName) {
    const romanNumerals = [
      { numeral: 'IV', value: 4 },
      { numeral: 'IX', value: 9 },
      { numeral: 'XL', value: 40 },
      { numeral: 'XC', value: 90 },
      { numeral: 'CD', value: 400 },
      { numeral: 'CM', value: 900 },
      { numeral: 'I', value: 1 },
      { numeral: 'V', value: 5 },
      { numeral: 'X', value: 10 },
      { numeral: 'L', value: 50 },
      { numeral: 'C', value: 100 },
      { numeral: 'D', value: 500 },
      { numeral: 'M', value: 1000 }
    ];

    const match = featName.match(/^(.+?)\s+([IVX]+)$/);

    if (!match) {
      return { level: 0, roman: "", baseName: featName };
    }

    const baseName = match[1].trim();
    const romanStr = match[2];

    let value = 0;
    let tempRoman = romanStr;

    for (const { numeral, value: val } of romanNumerals) {
      while (tempRoman.startsWith(numeral)) {
        value += val;
        tempRoman = tempRoman.substring(numeral.length);
      }
    }

    if (tempRoman === '' && value > 0) {
      return { level: value, roman: romanStr, baseName };
    }

    return { level: 0, roman: "", baseName: featName };
  }

  /**
   * Handle talent view toggle (Graph/List)
   */
  _onTalentViewToggle(event) {
    event.preventDefault();
    const btn = event.currentTarget;
    const view = btn.dataset.view;

    // Update button states
    const $buttons = $(btn).closest('.talent-view-toggle').find('.talent-view-btn');
    $buttons.removeClass('active');
    $(btn).addClass('active');

    // Toggle visibility
    const $form = $(btn).closest('form');
    const $graphContainer = $form.find('.talent-tree-graph-container');
    const $listView = $form.find('.talents-list-view');

    if (view === 'graph') {
      $graphContainer.show();
      $listView.hide();
      // Re-render graph
      this._renderTalentTreeGraph($form);
    } else {
      $graphContainer.hide();
      $listView.show();
    }
  }

  /**
   * Render the talent tree graph visualization
   */
  _renderTalentTreeGraph($html) {
    const container = $html.find('.talent-tree-graph-container')[0];
    if (!container || !this.selectedTalentTree) return;

    const treeName = this.selectedTalentTree;
    const allTalents = this._packs?.talents || [];
    const talentsInTree = getTalentsInTree(allTalents, treeName);

    SWSELogger.log(`[CHARGEN] Rendering talent tree graph for "${treeName}" with ${talentsInTree.length} talents`);

    if (talentsInTree.length === 0) {
      container.innerHTML = '<p class="no-talents">No talents found in this tree</p>';
      return;
    }

    // Callback when talent is selected from graph
    const onSelectTalent = async (talent) => {
      // Check if already selected
      const alreadySelected = this.characterData.talents?.some(t =>
        t._id === talent._id || t.name === talent.name
      );

      if (alreadySelected) {
        ui.notifications.warn(`${talent.name} is already selected`);
        return;
      }

      // Add talent to character data
      this.characterData.talents = this.characterData.talents || [];
      this.characterData.talents.push(talent);

      SWSELogger.log(`[CHARGEN-TALENTS] Talent selected from graph: "${talent.name}", total talents now: ${this.characterData.talents.length}, required: 1`);

      ui.notifications.info(`Selected talent: ${talent.name}`);

      // Re-render to update UI
      SWSELogger.log(`[CHARGEN-TALENTS] About to render after talent selection`);
      await this.render();
      SWSELogger.log(`[CHARGEN-TALENTS] Render completed`);
    };

    renderTalentTreeGraph(container, talentsInTree, this.characterData, onSelectTalent);
  }
}

// Mix in all module methods
Object.assign(CharacterGenerator.prototype, SharedModule);
Object.assign(CharacterGenerator.prototype, DroidModule);
Object.assign(CharacterGenerator.prototype, SpeciesModule);
Object.assign(CharacterGenerator.prototype, BackgroundsModule);
Object.assign(CharacterGenerator.prototype, ClassModule);
Object.assign(CharacterGenerator.prototype, AbilitiesModule);
Object.assign(CharacterGenerator.prototype, SkillsModule);
Object.assign(CharacterGenerator.prototype, LanguagesModule);
Object.assign(CharacterGenerator.prototype, FeatsTalentsModule);
Object.assign(CharacterGenerator.prototype, ForcePowersModule);
Object.assign(CharacterGenerator.prototype, StarshipManeuversModule);

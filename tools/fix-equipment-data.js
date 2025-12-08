/**
 * Script to rebuild equipment.db with correct SWSE equipment data
 * Run with: node scripts/fix-equipment-data.js
 */

const fs = require('fs');
const path = require('path');

// Equipment categories for organization
const CATEGORIES = {
  COMMS: 'Communications',
  COMPUTER: 'Computer',
  CYBERNETIC: 'Cybernetic',
  DETECTION: 'Detection/Surveillance',
  EXPLOSIVE: 'Explosive',
  LIFE_SUPPORT: 'Life Support',
  MEDICAL: 'Medical',
  POISON: 'Poison',
  SURVIVAL: 'Survival',
  TOOL: 'Tool',
  ACCESSORY: 'Weapon/Armor Accessory',
  UPGRADE_WEAPON: 'Weapon Upgrade',
  UPGRADE_ARMOR: 'Armor Upgrade',
  UPGRADE_UNIVERSAL: 'Universal Upgrade'
};

// Complete equipment data from SWSE rulebooks
const equipmentData = [
  // ===== COMMUNICATIONS DEVICES =====
  // Core Rulebook
  {
    id: 'comms-comlink-short-range',
    name: 'Comlink, Short-Range',
    category: CATEGORIES.COMMS,
    cost: 25,
    weight: 0.1,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A short-range comlink allows audio communication up to 10 kilometers. Can be upgraded with video or holo capabilities.</p>
      <p><strong>Data Types:</strong> Audio, Video (with upgrade), Holo (with upgrade)</p>`
  },
  {
    id: 'comms-comlink-long-range',
    name: 'Comlink, Long-Range',
    category: CATEGORIES.COMMS,
    cost: 250,
    weight: 1,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A long-range comlink allows communication up to 200 kilometers. Can transmit audio, video, or holographic data.</p>
      <p><strong>Data Types:</strong> Audio, Video, Holo</p>`
  },
  {
    id: 'comms-pocket-scrambler',
    name: 'Pocket Scrambler',
    category: CATEGORIES.COMMS,
    cost: 400,
    weight: 0.5,
    availability: 'Licensed',
    sourcebook: 'Core Rulebook',
    description: `<p>A pocket scrambler encrypts comlink transmissions, making them extremely difficult to intercept or decode without the matching descrambler.</p>`
  },
  {
    id: 'comms-vox-box',
    name: 'Vox-Box',
    category: CATEGORIES.COMMS,
    cost: 200,
    weight: 0.1,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A vox-box is a voice-only communicator, often used in military and industrial settings where visual data is unnecessary.</p>
      <p><strong>Data Types:</strong> Audio only</p>`
  },

  // Clone Wars Campaign Guide
  {
    id: 'comms-visual-wrist-comm',
    name: 'Visual Wrist Comm',
    category: CATEGORIES.COMMS,
    cost: 1300,
    weight: 0.25,
    availability: 'Standard',
    sourcebook: 'Clone Wars Campaign Guide',
    description: `<p>A wrist-mounted comlink with integrated video display, popular among Republic officers and clone commanders.</p>
      <p><strong>Data Types:</strong> Audio, Video</p>`
  },

  // Legacy Era Campaign Guide
  {
    id: 'comms-hands-free-comlink',
    name: 'Hands-Free Comlink',
    category: CATEGORIES.COMMS,
    cost: 150,
    weight: 0.1,
    availability: 'Standard',
    sourcebook: 'Legacy Era Campaign Guide',
    description: `<p>A miniature comlink that clips to clothing or fits in the ear, allowing hands-free communication.</p>
      <p><strong>Data Types:</strong> Audio</p>`
  },

  // Galaxy at War
  {
    id: 'comms-com-scrambler',
    name: 'Com Scrambler',
    category: CATEGORIES.COMMS,
    cost: 6000,
    weight: 10,
    availability: 'Military',
    sourcebook: 'Galaxy at War',
    description: `<p>A powerful military-grade communication scrambler that can encrypt transmissions across multiple frequencies simultaneously.</p>`
  },
  {
    id: 'comms-targeting-beacon',
    name: 'Targeting Beacon',
    category: CATEGORIES.COMMS,
    cost: 300,
    weight: 0.1,
    availability: 'Military',
    sourcebook: 'Galaxy at War',
    description: `<p>A specialized transmitter that broadcasts a homing signal for orbital strikes, airstrikes, or guided missiles. Often used by forward observers and special forces.</p>`
  },
  {
    id: 'comms-tightbeam-comlink',
    name: 'Tightbeam Comlink',
    category: CATEGORIES.COMMS,
    cost: 300,
    weight: 0.5,
    availability: 'Military',
    sourcebook: 'Galaxy at War',
    description: `<p>A highly directional comlink that transmits in a narrow beam, making interception extremely difficult. Requires line of sight to the receiver.</p>
      <p><strong>Data Types:</strong> Audio</p>`
  },

  // Galaxy of Intrigue
  {
    id: 'comms-earbud-comlink',
    name: 'Earbud Comlink',
    category: CATEGORIES.COMMS,
    cost: 200,
    weight: 0,
    availability: 'Standard',
    sourcebook: 'Galaxy of Intrigue',
    description: `<p>An extremely small comlink that fits inside the ear canal, virtually invisible to casual observation. Popular with spies and undercover agents.</p>
      <p><strong>Data Types:</strong> Audio</p>`
  },
  {
    id: 'comms-panic-ring',
    name: 'Panic Ring',
    category: CATEGORIES.COMMS,
    cost: 300,
    weight: 0,
    availability: 'Licensed',
    sourcebook: 'Galaxy of Intrigue',
    description: `<p>A ring with an embedded distress beacon that can be activated by squeezing. Transmits an emergency signal to pre-programmed receivers.</p>`
  },
  {
    id: 'comms-holo-converter',
    name: 'Holo Converter',
    category: CATEGORIES.COMMS,
    cost: 3000,
    weight: 2,
    availability: 'Licensed',
    sourcebook: 'Galaxy of Intrigue',
    description: `<p>A device that converts standard comlink transmissions to holographic format, allowing 3D visualization of the speaker.</p>
      <p><strong>Data Types:</strong> Holo</p>`
  },

  // Unknown Regions
  {
    id: 'comms-signal-wand',
    name: 'Signal Wand',
    category: CATEGORIES.COMMS,
    cost: 300,
    weight: 0.2,
    availability: 'Standard',
    sourcebook: 'Unknown Regions',
    description: `<p>A handheld signaling device that can transmit audio messages and location beacons. Often used in wilderness exploration.</p>
      <p><strong>Data Types:</strong> Audio</p>`
  },

  // ===== COMPUTERS =====
  // Core Rulebook
  {
    id: 'computer-code-cylinder',
    name: 'Code Cylinder',
    category: CATEGORIES.COMPUTER,
    cost: 500,
    weight: 0.1,
    availability: 'Licensed',
    sourcebook: 'Core Rulebook',
    description: `<p>A small cylindrical device containing security clearance codes and identification data. Required to access many secure Imperial and Republic facilities.</p>`
  },
  {
    id: 'computer-credit-chip',
    name: 'Credit Chip',
    category: CATEGORIES.COMPUTER,
    cost: 100,
    weight: 0.1,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A secure data chip for storing and transferring credits. Can be encoded with specific amounts and verified through banking networks.</p>`
  },
  {
    id: 'computer-datacards-blank-10',
    name: 'Blank Datacards (10)',
    category: CATEGORIES.COMPUTER,
    cost: 10,
    weight: 0.1,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A pack of 10 blank datacards for storing information. Each card can hold substantial amounts of data.</p>`
  },
  {
    id: 'computer-datapad-basic',
    name: 'Datapad, Basic',
    category: CATEGORIES.COMPUTER,
    cost: 100,
    weight: 0.3,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A basic handheld computer for reading datacards, taking notes, and performing simple calculations. Limited processing power.</p>`
  },
  {
    id: 'computer-datapad-standard',
    name: 'Datapad, Standard',
    category: CATEGORIES.COMPUTER,
    cost: 1000,
    weight: 0.5,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A full-featured datapad with substantial processing power, networking capabilities, and extensive data storage.</p>`
  },
  {
    id: 'computer-personal-holoprojector',
    name: 'Personal Holoprojector',
    category: CATEGORIES.COMPUTER,
    cost: 1000,
    weight: 0.5,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A handheld device that projects three-dimensional holographic images for viewing recorded holos or conducting holoconferences.</p>`
  },
  {
    id: 'computer-portable-computer',
    name: 'Portable Computer',
    category: CATEGORIES.COMPUTER,
    cost: 5000,
    weight: 2,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A powerful portable computing system with advanced processing capabilities, extensive storage, and sophisticated software packages.</p>`
  },

  // Threats of the Galaxy
  {
    id: 'computer-spike',
    name: 'Computer Spike',
    category: CATEGORIES.COMPUTER,
    cost: 1500,
    weight: 1,
    availability: 'Illegal',
    sourcebook: 'Threats of the Galaxy',
    description: `<p>An illegal device used to slice into computer systems. Provides bonuses to Use Computer checks when hacking systems.</p>
      <p><strong>Special:</strong> Grants a +2 equipment bonus to Use Computer checks made to hack or slice computer systems.</p>`
  },
  {
    id: 'computer-hibaka-2000-mem-stik',
    name: 'HiBaka 2000 Mem-Stik',
    category: CATEGORIES.COMPUTER,
    cost: 50,
    weight: 0,
    availability: 'Standard',
    sourcebook: 'Threats of the Galaxy',
    description: `<p>A high-capacity memory stick for portable data storage. Can hold massive amounts of information in a tiny form factor.</p>`
  },
  {
    id: 'computer-lectroticker',
    name: 'Lectroticker',
    category: CATEGORIES.COMPUTER,
    cost: 1500,
    weight: 1,
    availability: 'Licensed',
    sourcebook: 'Threats of the Galaxy',
    description: `<p>A specialized device that receives and displays real-time data feeds from financial markets, news services, and information networks.</p>`
  },

  // Knights of the Old Republic Campaign Guide
  {
    id: 'computer-interface-visor',
    name: 'Computer Interface Visor',
    category: CATEGORIES.COMPUTER,
    cost: 1200,
    weight: 0.5,
    availability: 'Licensed',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>A heads-up display visor that provides direct neural interface with computer systems, allowing hands-free operation.</p>
      <p><strong>Special:</strong> Grants a +2 equipment bonus to Use Computer checks.</p>`
  },

  // Clone Wars Campaign Guide
  {
    id: 'computer-bracer-computer',
    name: 'Bracer Computer',
    category: CATEGORIES.COMPUTER,
    cost: 1300,
    weight: 0.5,
    availability: 'Military',
    sourcebook: 'Clone Wars Campaign Guide',
    description: `<p>A wrist-mounted computer system with integrated display and controls. Popular with clone troopers and Republic officers.</p>`
  },

  // Legacy Era Campaign Guide
  {
    id: 'computer-xcalq-3ga-slicer-special',
    name: 'Xcalq-3GA "Slicer Special" Portable Computer',
    category: CATEGORIES.COMPUTER,
    cost: 7500,
    weight: 2,
    availability: 'Illegal',
    sourcebook: 'Legacy Era Campaign Guide',
    description: `<p>A heavily modified portable computer optimized for slicing and hacking operations. Includes pre-loaded slicing software.</p>
      <p><strong>Special:</strong> Grants a +4 equipment bonus to Use Computer checks made to slice or hack systems.</p>`
  },
  {
    id: 'computer-xcalq-stealth-pack',
    name: 'Xcalq Stealth Pack',
    category: CATEGORIES.COMPUTER,
    cost: 1500,
    weight: 0,
    availability: 'Illegal',
    sourcebook: 'Legacy Era Campaign Guide',
    description: `<p>A software and hardware package that makes slicing attempts harder to trace and detect.</p>
      <p><strong>Special:</strong> Increases the DC to detect your slicing attempts by +5.</p>`
  },

  // Galaxy at War
  {
    id: 'computer-triangulation-visor',
    name: 'Triangulation Visor',
    category: CATEGORIES.COMPUTER,
    cost: 1400,
    weight: 0.5,
    availability: 'Military',
    sourcebook: 'Galaxy at War',
    description: `<p>A tactical visor that calculates distances, angles, and trajectories in real-time, assisting with ranged attacks and navigation.</p>
      <p><strong>Special:</strong> Grants a +2 equipment bonus to Perception checks to determine range and a +1 bonus to ranged attack rolls at long range.</p>`
  },

  // ===== CYBERNETIC DEVICES =====
  // Core Rulebook
  {
    id: 'cyber-prosthesis',
    name: 'Cybernetic Prosthesis',
    category: CATEGORIES.CYBERNETIC,
    cost: 1500,
    weight: 0, // Varies by limb
    availability: 'Licensed',
    sourcebook: 'Core Rulebook',
    installCost: 500,
    description: `<p>A cybernetic replacement for a lost limb or damaged organ. Can be made to look natural or obviously artificial.</p>
      <p><strong>Installation Cost:</strong> 500 credits</p>
      <p><strong>Special:</strong> Each cybernetic device imposes a -1 penalty to Use the Force checks (maximum -5).</p>`
  },

  // Threats of the Galaxy
  {
    id: 'cyber-rhen-orm-biocomputer',
    name: 'Rhen-Orm Biocomputer',
    category: CATEGORIES.CYBERNETIC,
    cost: 3500,
    weight: 0.2,
    availability: 'Restricted',
    sourcebook: 'Threats of the Galaxy',
    installCost: 10000,
    description: `<p>An organic computer implanted in the brain, providing enhanced mental processing and data storage capabilities.</p>
      <p><strong>Installation Cost:</strong> 10,000 credits</p>
      <p><strong>Special:</strong> Grants a +4 equipment bonus to Knowledge checks and allows perfect recall of stored information. Imposes -1 penalty to Use the Force checks.</p>`
  },

  // Knights of the Old Republic Campaign Guide
  {
    id: 'cyber-energy-binding-prosthesis',
    name: 'Energy-Binding Prosthesis',
    category: CATEGORIES.CYBERNETIC,
    cost: 0, // Special/Rare
    weight: 0,
    availability: 'Rare',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>A rare and experimental cybernetic prosthesis that can channel Force energy. Extremely rare even in the Old Republic era.</p>
      <p><strong>Special:</strong> Does not impose the standard -1 penalty to Use the Force checks.</p>`
  },

  // Jedi Academy Training Manual
  {
    id: 'cyber-subelectronic-converter',
    name: 'Subelectronic Converter',
    category: CATEGORIES.CYBERNETIC,
    cost: 23000,
    weight: 0,
    availability: 'Rare',
    sourcebook: 'Jedi Academy Training Manual',
    installCost: 500,
    description: `<p>An advanced cybernetic implant that enhances neural processing speed and reflex response times.</p>
      <p><strong>Installation Cost:</strong> 500 credits</p>
      <p><strong>Special:</strong> Grants a +2 equipment bonus to Initiative checks. Imposes -1 penalty to Use the Force checks.</p>`
  },

  // ===== DETECTION/SURVEILLANCE =====
  // Core Rulebook
  {
    id: 'detect-electrobinoculars',
    name: 'Electrobinoculars',
    category: CATEGORIES.DETECTION,
    cost: 1000,
    weight: 1,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>High-powered binoculars with electronic magnification, range-finding, and low-light enhancement capabilities.</p>
      <p><strong>Special:</strong> Negates distance penalties to Perception checks within line of sight.</p>`
  },
  {
    id: 'detect-glow-rod',
    name: 'Glow Rod',
    category: CATEGORIES.DETECTION,
    cost: 10,
    weight: 1,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A handheld light source that provides illumination in darkness. Battery-powered with extended runtime.</p>
      <p><strong>Special:</strong> Illuminates a 10-meter radius for up to 100 hours on a single power cell.</p>`
  },
  {
    id: 'detect-fusion-lantern',
    name: 'Fusion Lantern',
    category: CATEGORIES.DETECTION,
    cost: 25,
    weight: 2,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A powerful portable light source using a small fusion cell. Provides brighter illumination than a glow rod.</p>
      <p><strong>Special:</strong> Illuminates a 20-meter radius for up to 1,000 hours.</p>`
  },
  {
    id: 'detect-audiorecorder',
    name: 'Audiorecorder',
    category: CATEGORIES.DETECTION,
    cost: 25,
    weight: 0.1,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A compact device for recording audio. Can store hours of audio data.</p>`
  },
  {
    id: 'detect-holorecorder',
    name: 'Holorecorder',
    category: CATEGORIES.DETECTION,
    cost: 100,
    weight: 0.1,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A device for recording three-dimensional holographic images and video.</p>`
  },
  {
    id: 'detect-videorecorder',
    name: 'Videorecorder',
    category: CATEGORIES.DETECTION,
    cost: 50,
    weight: 0.1,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A compact device for recording two-dimensional video and images.</p>`
  },
  {
    id: 'detect-sensor-pack',
    name: 'Sensor Pack',
    category: CATEGORIES.DETECTION,
    cost: 1500,
    weight: 9,
    availability: 'Licensed',
    sourcebook: 'Core Rulebook',
    description: `<p>A portable sensor suite capable of detecting motion, heat signatures, electromagnetic emissions, and various atmospheric conditions.</p>
      <p><strong>Special:</strong> Grants a +2 equipment bonus to Perception checks to detect hidden creatures or objects.</p>`
  },

  // Threats of the Galaxy
  {
    id: 'detect-heat-sensor',
    name: 'Heat Sensor',
    category: CATEGORIES.DETECTION,
    cost: 250,
    weight: 0.2,
    availability: 'Licensed',
    sourcebook: 'Threats of the Galaxy',
    description: `<p>A handheld thermal imaging device that detects heat signatures through walls and in darkness.</p>
      <p><strong>Special:</strong> Allows detection of living creatures by their body heat within 50 meters.</p>`
  },

  // Knights of the Old Republic Campaign Guide
  {
    id: 'detect-aural-amplifier',
    name: 'Aural Amplifier',
    category: CATEGORIES.DETECTION,
    cost: 2000,
    weight: 0.5,
    availability: 'Licensed',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>A headset that amplifies sound, allowing the wearer to hear conversations and sounds at great distances.</p>
      <p><strong>Special:</strong> Grants a +5 equipment bonus to Perception checks made to listen.</p>`
  },
  {
    id: 'detect-demolitions-sensor',
    name: 'Demolitions Sensor',
    category: CATEGORIES.DETECTION,
    cost: 1000,
    weight: 0.5,
    availability: 'Military',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>A specialized sensor for detecting explosives, mines, and booby traps.</p>
      <p><strong>Special:</strong> Grants a +5 equipment bonus to Perception checks made to detect explosives and traps.</p>`
  },
  {
    id: 'detect-motion-sensing-visor',
    name: 'Motion Sensing Visor',
    category: CATEGORIES.DETECTION,
    cost: 2500,
    weight: 0.5,
    availability: 'Military',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>A visor that displays motion tracking overlays, highlighting moving objects and creatures.</p>
      <p><strong>Special:</strong> Grants a +5 equipment bonus to Perception checks made to detect moving targets. Negates concealment from darkness or smoke.</p>`
  },
  {
    id: 'detect-neural-band',
    name: 'Neural Band',
    category: CATEGORIES.DETECTION,
    cost: 3500,
    weight: 0.5,
    availability: 'Restricted',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>A headband that monitors neural activity and provides feedback on mental state and stress levels.</p>
      <p><strong>Special:</strong> Grants a +2 equipment bonus to Sense Motive checks and allows detection of strong emotions.</p>`
  },
  {
    id: 'detect-stealth-field-generator',
    name: 'Stealth Field Generator',
    category: CATEGORIES.DETECTION,
    cost: 5000,
    weight: 0.2,
    availability: 'Military',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>A personal cloaking device that bends light around the user, providing near-invisibility.</p>
      <p><strong>Special:</strong> Grants a +10 equipment bonus to Stealth checks. Deactivates if the user attacks or takes damage.</p>`
  },

  // Force Unleashed Campaign Guide
  {
    id: 'detect-decoy-glow-rod',
    name: 'Decoy Glow Rod',
    category: CATEGORIES.DETECTION,
    cost: 100,
    weight: 4,
    availability: 'Licensed',
    sourcebook: 'Force Unleashed Campaign Guide',
    description: `<p>A glow rod that can be thrown to create a distraction. Emits light and sound to draw attention.</p>
      <p><strong>Special:</strong> Can be thrown up to 10 squares. Creates illumination and distraction.</p>`
  },
  {
    id: 'detect-holoshroud',
    name: 'Holoshroud',
    category: CATEGORIES.DETECTION,
    cost: 25000,
    weight: 0.5,
    availability: 'Illegal',
    sourcebook: 'Force Unleashed Campaign Guide',
    description: `<p>An advanced holographic disguise system that projects a false image over the wearer, creating a perfect visual disguise.</p>
      <p><strong>Special:</strong> Grants a +10 equipment bonus to Deception checks to disguise appearance. Does not alter voice or mannerisms.</p>`
  },
  {
    id: 'detect-sound-sponge',
    name: 'Sound Sponge',
    category: CATEGORIES.DETECTION,
    cost: 3500,
    weight: 1,
    availability: 'Restricted',
    sourcebook: 'Force Unleashed Campaign Guide',
    description: `<p>A device that absorbs sound in a localized area, creating a zone of silence.</p>
      <p><strong>Special:</strong> Creates a 5-meter radius of silence. Grants +10 bonus to Stealth checks against detection by sound.</p>`
  },

  // Clone Wars Campaign Guide
  {
    id: 'detect-halo-lamp',
    name: 'Halo Lamp',
    category: CATEGORIES.DETECTION,
    cost: 30,
    weight: 1,
    availability: 'Standard',
    sourcebook: 'Clone Wars Campaign Guide',
    description: `<p>A portable light source that creates a broad, diffuse illumination. Popular with explorers and miners.</p>
      <p><strong>Special:</strong> Illuminates a 15-meter radius with soft, even light.</p>`
  },

  // Legacy Era Campaign Guide
  {
    id: 'detect-spy-bug',
    name: 'Spy Bug',
    category: CATEGORIES.DETECTION,
    cost: 1300,
    weight: 0.5,
    availability: 'Illegal',
    sourcebook: 'Legacy Era Campaign Guide',
    description: `<p>A miniature listening device that can be planted to record conversations remotely.</p>
      <p><strong>Special:</strong> Records up to 24 hours of audio. Can transmit to a receiver within 1 kilometer.</p>`
  },

  // Rebellion Era Campaign Guide
  {
    id: 'detect-ambient-aural-amplifier',
    name: 'Ambient Aural Amplifier',
    category: CATEGORIES.DETECTION,
    cost: 3000,
    weight: 0.5,
    availability: 'Military',
    sourcebook: 'Rebellion Era Campaign Guide',
    description: `<p>An advanced sound amplification system that filters ambient noise while enhancing relevant sounds.</p>
      <p><strong>Special:</strong> Grants a +10 equipment bonus to Perception checks made to listen. Filters out background noise automatically.</p>`
  },

  // Galaxy at War
  {
    id: 'detect-communication-scanner',
    name: 'Communication Scanner',
    category: CATEGORIES.DETECTION,
    cost: 1000,
    weight: 1,
    availability: 'Military',
    sourcebook: 'Galaxy at War',
    description: `<p>A device that intercepts and monitors comlink transmissions within range.</p>
      <p><strong>Special:</strong> Can detect and listen to unencrypted comlink transmissions within 10 kilometers.</p>`
  },
  {
    id: 'detect-proximity-flare',
    name: 'Proximity Flare',
    category: CATEGORIES.DETECTION,
    cost: 50,
    weight: 0.5,
    availability: 'Licensed',
    sourcebook: 'Galaxy at War',
    description: `<p>A motion-activated flare that ignites when detecting nearby movement. Used for perimeter security.</p>
      <p><strong>Special:</strong> Activates when detecting movement within 10 meters. Burns brightly for 1 minute.</p>`
  },
  {
    id: 'detect-radiation-detector',
    name: 'Radiation Detector',
    category: CATEGORIES.DETECTION,
    cost: 20,
    weight: 0,
    availability: 'Standard',
    sourcebook: 'Galaxy at War',
    description: `<p>A handheld device that detects and measures radiation levels.</p>
      <p><strong>Special:</strong> Warns of dangerous radiation exposure. Grants a +5 bonus to detect radiation hazards.</p>`
  },

  // Galaxy of Intrigue
  {
    id: 'detect-surveillance-detector',
    name: 'Surveillance Detector',
    category: CATEGORIES.DETECTION,
    cost: 450,
    weight: 0.5,
    availability: 'Restricted',
    sourcebook: 'Galaxy of Intrigue',
    description: `<p>A device that scans for hidden cameras, microphones, and other surveillance equipment.</p>
      <p><strong>Special:</strong> Grants a +10 equipment bonus to Perception checks made to detect surveillance devices.</p>`
  },
  {
    id: 'detect-surveillance-tagger',
    name: 'Surveillance Tagger',
    category: CATEGORIES.DETECTION,
    cost: 450,
    weight: 0.5,
    availability: 'Illegal',
    sourcebook: 'Galaxy of Intrigue',
    description: `<p>A device that plants miniature tracking tags on targets without their knowledge.</p>
      <p><strong>Special:</strong> Tags transmit location data for up to 1 week. Range: 100 kilometers.</p>`
  },
  {
    id: 'detect-veridicator',
    name: 'Veridicator',
    category: CATEGORIES.DETECTION,
    cost: 4000,
    weight: 0.1,
    availability: 'Restricted',
    sourcebook: 'Galaxy of Intrigue',
    description: `<p>A portable lie detector that monitors stress responses and physiological signs of deception.</p>
      <p><strong>Special:</strong> Grants a +5 equipment bonus to Sense Motive checks to detect lies.</p>`
  },
  {
    id: 'detect-vid-vox-scrambler',
    name: 'Vid-Vox Scrambler',
    category: CATEGORIES.DETECTION,
    cost: 3400,
    weight: 0.5,
    availability: 'Illegal',
    sourcebook: 'Galaxy of Intrigue',
    description: `<p>A device that disrupts video and audio surveillance equipment in the immediate area.</p>
      <p><strong>Special:</strong> Creates a 10-meter radius jamming field that blocks recording devices.</p>`
  },

  // Unknown Regions
  {
    id: 'detect-sonar-mapper',
    name: 'Sonar Mapper',
    category: CATEGORIES.DETECTION,
    cost: 400,
    weight: 1,
    availability: 'Licensed',
    sourcebook: 'Unknown Regions',
    description: `<p>A device that uses sonar to map surroundings underwater or in darkness. Creates a 3D map of the environment.</p>
      <p><strong>Special:</strong> Allows navigation and mapping in total darkness or underwater. Range: 100 meters.</p>`
  },

  // ===== EXPLOSIVES =====
  // Core Rulebook
  {
    id: 'explosive-charge',
    name: 'Explosive Charge',
    category: CATEGORIES.EXPLOSIVE,
    cost: 1500,
    weight: 0.5,
    size: 'Diminutive',
    damage: '10d6',
    damageType: 'Energy',
    availability: 'Restricted',
    sourcebook: 'Core Rulebook',
    description: `<p>A powerful explosive charge that can be attached to surfaces and detonated remotely or by timer.</p>
      <p><strong>Damage:</strong> 10d6 energy damage (DC 20 Reflex save for half)</p>
      <p><strong>Blast Radius:</strong> 4 squares</p>`
  },
  {
    id: 'explosive-detonite',
    name: 'Detonite',
    category: CATEGORIES.EXPLOSIVE,
    cost: 500,
    weight: 0.1,
    size: 'Fine',
    damage: '5d6',
    damageType: 'Energy',
    availability: 'Restricted',
    sourcebook: 'Core Rulebook',
    description: `<p>A compact, stable explosive compound used for demolitions and breaching. Can be shaped for directed blasts.</p>
      <p><strong>Damage:</strong> 5d6 energy damage (DC 15 Reflex save for half)</p>
      <p><strong>Blast Radius:</strong> 2 squares</p>`
  },
  {
    id: 'explosive-timer',
    name: 'Timer',
    category: CATEGORIES.EXPLOSIVE,
    cost: 250,
    weight: 0.1,
    size: 'Fine',
    availability: 'Licensed',
    sourcebook: 'Core Rulebook',
    description: `<p>An electronic timer that can be attached to explosives for delayed detonation. Programmable from 1 round to 24 hours.</p>`
  },

  // Force Unleashed Campaign Guide
  {
    id: 'explosive-manual-trigger',
    name: 'Manual Trigger',
    category: CATEGORIES.EXPLOSIVE,
    cost: 100,
    weight: 0.1,
    size: 'Fine',
    availability: 'Licensed',
    sourcebook: 'Force Unleashed Campaign Guide',
    description: `<p>A handheld detonator switch for remotely triggering explosives. Range: 100 meters.</p>`
  },

  // Galaxy at War
  {
    id: 'explosive-detonite-cord',
    name: 'Detonite Cord',
    category: CATEGORIES.EXPLOSIVE,
    cost: 1000,
    weight: 1,
    size: 'Tiny',
    damage: '4d6',
    damageType: 'Energy',
    availability: 'Restricted',
    sourcebook: 'Galaxy at War',
    description: `<p>A flexible cord of detonite explosive, useful for cutting through doors, walls, and other obstacles.</p>
      <p><strong>Damage:</strong> 4d6 energy damage in a line</p>
      <p><strong>Special:</strong> Can be shaped to cut through barriers.</p>`
  },

  // Rebellion Era Campaign Guide
  {
    id: 'explosive-power-pack-bomb',
    name: 'Power Pack Bomb',
    category: CATEGORIES.EXPLOSIVE,
    cost: 0, // Varies
    weight: 0.2,
    size: 'Small',
    damage: 'Varies',
    damageType: 'Energy',
    availability: 'Illegal',
    sourcebook: 'Rebellion Era Campaign Guide',
    description: `<p>A weapon power pack modified to explode when triggered. Damage varies based on the power pack type.</p>
      <p><strong>Damage:</strong> Varies by power pack</p>
      <p><strong>Special:</strong> Improvised explosive. Requires Mechanics check to create.</p>`
  },

  // ===== LIFE SUPPORT =====
  // Core Rulebook
  {
    id: 'life-aquata-breather',
    name: 'Aquata Breather',
    category: CATEGORIES.LIFE_SUPPORT,
    cost: 350,
    weight: 0.2,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A small mouthpiece that extracts oxygen from water, allowing breathing underwater indefinitely.</p>
      <p><strong>Special:</strong> Allows breathing underwater. Does not work in airless environments.</p>`
  },
  {
    id: 'life-breath-mask',
    name: 'Breath Mask',
    category: CATEGORIES.LIFE_SUPPORT,
    cost: 200,
    weight: 2,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A face-covering mask with air filters and a 1-hour oxygen supply. Protects against toxic atmospheres.</p>
      <p><strong>Special:</strong> Provides 1 hour of breathable air. Filters toxic gases.</p>`
  },
  {
    id: 'life-flight-suit',
    name: 'Flight Suit',
    category: CATEGORIES.LIFE_SUPPORT,
    cost: 1000,
    weight: 3,
    availability: 'Licensed',
    sourcebook: 'Core Rulebook',
    description: `<p>A sealed flight suit with integrated life support. Provides pressure protection and temperature regulation for pilots.</p>
      <p><strong>Special:</strong> Protects against vacuum for 10 hours. Provides temperature regulation.</p>`
  },
  {
    id: 'life-space-suit',
    name: 'Space Suit',
    category: CATEGORIES.LIFE_SUPPORT,
    cost: 2000,
    weight: 15,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A bulky sealed suit designed for extended operations in vacuum. Includes life support and radiation protection.</p>
      <p><strong>Special:</strong> Provides life support in vacuum for 24 hours. Basic radiation protection.</p>`
  },

  // Knights of the Old Republic Campaign Guide
  {
    id: 'life-vacuum-mask',
    name: 'Vacuum Mask',
    category: CATEGORIES.LIFE_SUPPORT,
    cost: 650,
    weight: 0.3,
    availability: 'Licensed',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>A compact mask that provides emergency oxygen supply and pressure protection for short-term vacuum exposure.</p>
      <p><strong>Special:</strong> Provides 4 hours of life support in vacuum.</p>`
  },

  // Rebellion Era Campaign Guide
  {
    id: 'life-propulsion-pack',
    name: 'Propulsion Pack',
    category: CATEGORIES.LIFE_SUPPORT,
    cost: 200,
    weight: 10,
    availability: 'Licensed',
    sourcebook: 'Rebellion Era Campaign Guide',
    description: `<p>A backpack-mounted maneuvering system for zero-gravity environments. Allows movement in space.</p>
      <p><strong>Special:</strong> Provides maneuvering in zero-gravity. Fuel for 10 minutes of operation.</p>`
  },

  // Unknown Regions
  {
    id: 'life-emergency-vacuum-seal',
    name: 'Emergency Vacuum Seal',
    category: CATEGORIES.LIFE_SUPPORT,
    cost: 750,
    weight: 0.9,
    availability: 'Standard',
    sourcebook: 'Unknown Regions',
    description: `<p>A compact emergency kit that creates a temporary seal around hull breaches or provides emergency pressure protection.</p>
      <p><strong>Special:</strong> Can seal a 2-meter breach or provide 30 minutes of emergency pressure protection.</p>`
  },
  {
    id: 'life-shipsuit',
    name: 'Shipsuit',
    category: CATEGORIES.LIFE_SUPPORT,
    cost: 200,
    weight: 1,
    availability: 'Standard',
    sourcebook: 'Unknown Regions',
    description: `<p>A lightweight shipboard garment that provides basic pressure protection and temperature regulation.</p>
      <p><strong>Special:</strong> Provides 1 hour of emergency pressure protection. Comfortable for extended wear.</p>`
  },

  // ===== MEDICAL GEAR =====
  // Core Rulebook
  {
    id: 'medical-bacta-tank-empty',
    name: 'Bacta Tank (Empty)',
    category: CATEGORIES.MEDICAL,
    cost: 100000,
    weight: 500,
    availability: 'Licensed',
    sourcebook: 'Core Rulebook',
    description: `<p>A large medical tank for immersing patients in bacta for advanced healing. Requires bacta to function.</p>
      <p><strong>Special:</strong> When filled with bacta, allows accelerated healing and treatment of critical injuries.</p>`
  },
  {
    id: 'medical-bacta-per-liter',
    name: 'Bacta (Per Liter)',
    category: CATEGORIES.MEDICAL,
    cost: 100,
    weight: 2,
    availability: 'Licensed',
    sourcebook: 'Core Rulebook',
    description: `<p>A liter of bacta, the galaxy's most effective healing fluid. Can be applied topically or used in a bacta tank.</p>
      <p><strong>Special:</strong> Bacta tank treatment heals 1 HP per hour and removes persistent conditions.</p>`
  },
  {
    id: 'medical-kit',
    name: 'Medical Kit',
    category: CATEGORIES.MEDICAL,
    cost: 600,
    weight: 20,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A comprehensive medical kit with diagnostic equipment, surgical tools, and medical supplies for field treatment.</p>
      <p><strong>Special:</strong> Required for many Treat Injury checks. Contains 25 uses.</p>`
  },
  {
    id: 'medical-medpac',
    name: 'Medpac',
    category: CATEGORIES.MEDICAL,
    cost: 100,
    weight: 1,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A portable medical kit with sterile bandages, antibiotics, and basic medical supplies. Single-use.</p>
      <p><strong>Special:</strong> Allows a Treat Injury check to restore HP. Single use.</p>`
  },
  {
    id: 'medical-surgery-kit',
    name: 'Surgery Kit',
    category: CATEGORIES.MEDICAL,
    cost: 1000,
    weight: 10,
    availability: 'Licensed',
    sourcebook: 'Core Rulebook',
    description: `<p>Advanced surgical tools and equipment for performing complex medical procedures.</p>
      <p><strong>Special:</strong> Required for surgical Treat Injury checks. Grants +2 bonus to surgery checks.</p>`
  },

  // Threats of the Galaxy
  {
    id: 'medical-fastflesh-medpac',
    name: 'FastFlesh Medpac',
    category: CATEGORIES.MEDICAL,
    cost: 600,
    weight: 0.5,
    availability: 'Licensed',
    sourcebook: 'Threats of the Galaxy',
    description: `<p>An advanced medpac with fast-acting tissue regeneration compounds.</p>
      <p><strong>Special:</strong> Restores more HP than a standard medpac. Grants +2 bonus to Treat Injury check.</p>`
  },
  {
    id: 'medical-medisensor',
    name: 'Medisensor',
    category: CATEGORIES.MEDICAL,
    cost: 75,
    weight: 0.1,
    availability: 'Standard',
    sourcebook: 'Threats of the Galaxy',
    description: `<p>A handheld diagnostic device that scans vital signs and identifies injuries and diseases.</p>
      <p><strong>Special:</strong> Grants +2 equipment bonus to Treat Injury checks for diagnosis.</p>`
  },

  // Knights of the Old Republic Campaign Guide
  {
    id: 'medical-interface-visor',
    name: 'Medical Interface Visor',
    category: CATEGORIES.MEDICAL,
    cost: 1500,
    weight: 0.5,
    availability: 'Licensed',
    sourcebook: 'Knights of the Old Republic Campaign Guide',
    description: `<p>A visor that provides real-time medical data overlay and diagnostic information.</p>
      <p><strong>Special:</strong> Grants +5 equipment bonus to Treat Injury checks.</p>`
  },

  // Clone Wars Campaign Guide
  {
    id: 'medical-bioscanner',
    name: 'Bioscanner',
    category: CATEGORIES.MEDICAL,
    cost: 3500,
    weight: 0.5,
    availability: 'Licensed',
    sourcebook: 'Clone Wars Campaign Guide',
    description: `<p>An advanced medical scanner that provides detailed biological analysis and life sign detection.</p>
      <p><strong>Special:</strong> Grants +5 bonus to Treat Injury and Life Sciences checks. Can detect life signs at range.</p>`
  },

  // Jedi Academy Training Manual
  {
    id: 'medical-bundle',
    name: 'Medical Bundle',
    category: CATEGORIES.MEDICAL,
    cost: 200,
    weight: 1,
    availability: 'Standard',
    sourcebook: 'Jedi Academy Training Manual',
    description: `<p>A basic medical supply pack with bandages, antiseptics, and emergency medications.</p>
      <p><strong>Special:</strong> Contains 5 uses. Can stabilize dying characters.</p>`
  },

  // Galaxy at War
  {
    id: 'medical-anti-rad-dose',
    name: 'Anti-Rad Dose',
    category: CATEGORIES.MEDICAL,
    cost: 50,
    weight: 0,
    availability: 'Licensed',
    sourcebook: 'Galaxy at War',
    description: `<p>An injection that provides temporary protection against radiation exposure.</p>
      <p><strong>Special:</strong> Grants +5 bonus to Fortitude Defense against radiation for 24 hours.</p>`
  },
  {
    id: 'medical-cryogenic-pouch',
    name: 'Cryogenic Pouch',
    category: CATEGORIES.MEDICAL,
    cost: 600,
    weight: 1.5,
    availability: 'Licensed',
    sourcebook: 'Galaxy at War',
    description: `<p>A portable cryogenic container that preserves critically injured patients in stasis for transport.</p>
      <p><strong>Special:</strong> Stabilizes dying characters and preserves them for up to 72 hours.</p>`
  },

  // Galaxy of Intrigue
  {
    id: 'medical-antitoxin-patch',
    name: 'Antitoxin Patch',
    category: CATEGORIES.MEDICAL,
    cost: 25,
    weight: 0,
    availability: 'Standard',
    sourcebook: 'Galaxy of Intrigue',
    description: `<p>A dermal patch that releases broad-spectrum antitoxins when applied.</p>
      <p><strong>Special:</strong> Grants +2 bonus to Fortitude Defense against poisons for 8 hours.</p>`
  },
  {
    id: 'medical-toxin-detector',
    name: 'Toxin Detector',
    category: CATEGORIES.MEDICAL,
    cost: 700,
    weight: 0.5,
    availability: 'Licensed',
    sourcebook: 'Galaxy of Intrigue',
    description: `<p>A handheld device that detects and identifies toxins, poisons, and harmful chemicals.</p>
      <p><strong>Special:</strong> Grants +10 bonus to detect poisons. Identifies specific toxins.</p>`
  },

  // Unknown Regions
  {
    id: 'medical-antidote-synthesizer',
    name: 'Antidote Synthesizer',
    category: CATEGORIES.MEDICAL,
    cost: 2500,
    weight: 0.8,
    availability: 'Restricted',
    sourcebook: 'Unknown Regions',
    description: `<p>A portable device that analyzes toxins and synthesizes custom antidotes on demand.</p>
      <p><strong>Special:</strong> Can create antidotes to most poisons with a DC 20 Treat Injury check.</p>`
  },
  {
    id: 'medical-hypoinjector-wristband',
    name: 'Hypoinjector Wristband',
    category: CATEGORIES.MEDICAL,
    cost: 350,
    weight: 0.1,
    availability: 'Licensed',
    sourcebook: 'Unknown Regions',
    description: `<p>A wrist-mounted auto-injector that can deliver pre-loaded medications with a button press.</p>
      <p><strong>Special:</strong> Holds up to 3 doses. Can be triggered as a swift action.</p>`
  },

  // ===== SURVIVAL GEAR =====
  // Core Rulebook
  {
    id: 'survival-all-temperature-cloak',
    name: 'All-Temperature Cloak',
    category: CATEGORIES.SURVIVAL,
    cost: 100,
    weight: 1.5,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A versatile cloak that provides protection against extreme temperatures.</p>
      <p><strong>Special:</strong> Grants +2 bonus to Fort Defense vs extreme heat and cold.</p>`
  },
  {
    id: 'survival-chain-3m',
    name: 'Chain (3 meters)',
    category: CATEGORIES.SURVIVAL,
    cost: 25,
    weight: 2.5,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A sturdy metal chain for securing objects or climbing.</p>`
  },
  {
    id: 'survival-field-kit',
    name: 'Field Kit',
    category: CATEGORIES.SURVIVAL,
    cost: 1000,
    weight: 10,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A comprehensive survival kit with tent, rations, water purification, and basic tools.</p>`
  },
  {
    id: 'survival-jetpack',
    name: 'Jet Pack',
    category: CATEGORIES.SURVIVAL,
    cost: 300,
    weight: 30,
    availability: 'Licensed',
    sourcebook: 'Core Rulebook',
    description: `<p>A basic jet pack allowing short-distance flight.</p>
      <p><strong>Special:</strong> Fly speed 8 squares for up to 20 rounds.</p>`
  },
  {
    id: 'survival-liquid-cable-dispenser',
    name: 'Liquid Cable Dispenser (15 meters)',
    category: CATEGORIES.SURVIVAL,
    cost: 10,
    weight: 0.2,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A device that sprays liquid cable that hardens instantly. Used for climbing or securing objects.</p>`
  },
  {
    id: 'survival-ration-pack',
    name: 'Ration Pack',
    category: CATEGORIES.SURVIVAL,
    cost: 5,
    weight: 0.1,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A single day's worth of concentrated, preserved food rations.</p>`
  },
  {
    id: 'survival-syntherope-45m',
    name: 'Syntherope (45 meters)',
    category: CATEGORIES.SURVIVAL,
    cost: 20,
    weight: 2.5,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>45 meters of strong synthetic rope. Can support up to 500 kg.</p>`
  },

  // Galaxy at War
  {
    id: 'survival-camouflage-poncho',
    name: 'Camouflage Poncho',
    category: CATEGORIES.SURVIVAL,
    cost: 125,
    weight: 1.5,
    availability: 'Military',
    sourcebook: 'Galaxy at War',
    description: `<p>A poncho with adaptive camouflage pattern.</p>
      <p><strong>Special:</strong> Grants +2 equipment bonus to Stealth checks.</p>`
  },
  {
    id: 'survival-field-camouflage-netting',
    name: 'Field Camouflage Netting',
    category: CATEGORIES.SURVIVAL,
    cost: 2000,
    weight: 5,
    availability: 'Military',
    sourcebook: 'Galaxy at War',
    description: `<p>Lightweight camouflage netting for concealing equipment or positions.</p>
      <p><strong>Special:</strong> Covers 5x5 meter area. Grants +5 to Stealth for objects covered.</p>`
  },

  // ===== TOOLS =====
  // Core Rulebook
  {
    id: 'tool-binder-cuffs',
    name: 'Binder Cuffs',
    category: CATEGORIES.TOOL,
    cost: 50,
    weight: 0.5,
    availability: 'Licensed',
    sourcebook: 'Core Rulebook',
    description: `<p>Electronic restraints that lock around wrists or ankles.</p>
      <p><strong>Special:</strong> DC 25 Mechanics check to escape or disable.</p>`
  },
  {
    id: 'tool-energy-cell',
    name: 'Energy Cell',
    category: CATEGORIES.TOOL,
    cost: 10,
    weight: 0,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A standard energy cell for powering small devices.</p>`
  },
  {
    id: 'tool-power-pack',
    name: 'Power Pack',
    category: CATEGORIES.TOOL,
    cost: 25,
    weight: 0.1,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A rechargeable power pack for weapons and larger devices.</p>`
  },
  {
    id: 'tool-power-recharger',
    name: 'Power Recharger',
    category: CATEGORIES.TOOL,
    cost: 100,
    weight: 1,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A device for recharging energy cells and power packs.</p>`
  },
  {
    id: 'tool-security-kit',
    name: 'Security Kit',
    category: CATEGORIES.TOOL,
    cost: 750,
    weight: 1,
    availability: 'Restricted',
    sourcebook: 'Core Rulebook',
    description: `<p>Tools for bypassing locks and security systems.</p>
      <p><strong>Special:</strong> Required for Mechanics checks to disable security devices.</p>`
  },
  {
    id: 'tool-kit',
    name: 'Tool Kit',
    category: CATEGORIES.TOOL,
    cost: 250,
    weight: 1,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A basic tool kit with mechanical tools for repairs.</p>
      <p><strong>Special:</strong> Required for most Mechanics checks.</p>`
  },
  {
    id: 'tool-utility-belt-standard',
    name: 'Utility Belt (Standard)',
    category: CATEGORIES.TOOL,
    cost: 500,
    weight: 4,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A belt with pouches and tools. Contains various useful items.</p>
      <p><strong>Special:</strong> Contains glow rod, comlink, medpac, tool kit, power pack, and ration pack.</p>`
  },
  {
    id: 'tool-utility-belt-empty',
    name: 'Utility Belt (Empty)',
    category: CATEGORIES.TOOL,
    cost: 55,
    weight: 0.3,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>An empty utility belt with pouches for carrying small items.</p>`
  },

  // ===== WEAPON/ARMOR ACCESSORIES =====
  // Core Rulebook
  {
    id: 'accessory-bandolier',
    name: 'Bandolier',
    category: CATEGORIES.ACCESSORY,
    cost: 100,
    weight: 2,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A bandolier for carrying ammunition, power packs, and grenades. Worn across the chest.</p>`
  },
  {
    id: 'accessory-helmet-package',
    name: 'Helmet Package',
    category: CATEGORIES.ACCESSORY,
    cost: 4000,
    weight: 1,
    availability: 'Licensed',
    sourcebook: 'Core Rulebook',
    description: `<p>An integrated helmet system with comlink, low-light vision, and tactical display.</p>
      <p><strong>Special:</strong> Grants low-light vision and integrated comlink.</p>`
  },
  {
    id: 'accessory-holster-concealed',
    name: 'Holster, Concealed',
    category: CATEGORIES.ACCESSORY,
    cost: 50,
    weight: 0.2,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A concealed holster that hides a pistol under clothing.</p>
      <p><strong>Special:</strong> Grants +5 bonus to conceal a pistol.</p>`
  },
  {
    id: 'accessory-holster-hip',
    name: 'Holster, Hip',
    category: CATEGORIES.ACCESSORY,
    cost: 25,
    weight: 0.5,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A standard hip holster for quick-draw access to a pistol.</p>`
  },
  {
    id: 'accessory-targeting-scope-standard',
    name: 'Targeting Scope, Standard',
    category: CATEGORIES.ACCESSORY,
    cost: 100,
    weight: 0.2,
    availability: 'Standard',
    sourcebook: 'Core Rulebook',
    description: `<p>A basic optical scope that aids with ranged attacks.</p>
      <p><strong>Special:</strong> Grants +1 bonus to attack rolls at long range.</p>`
  },
  {
    id: 'accessory-targeting-scope-enhanced-low-light',
    name: 'Targeting Scope, Enhanced Low-Light',
    category: CATEGORIES.ACCESSORY,
    cost: 1000,
    weight: 1.2,
    availability: 'Licensed',
    sourcebook: 'Core Rulebook',
    description: `<p>An advanced scope with electronic magnification and low-light enhancement.</p>
      <p><strong>Special:</strong> Grants +2 bonus to attack rolls at long range. Negates concealment from darkness.</p>`
  },

  // ===== WEAPON UPGRADES =====
  // Scum and Villainy
  {
    id: 'upgrade-weapon-bayonet-ring',
    name: 'Bayonet Ring (Weapon Upgrade)',
    category: CATEGORIES.UPGRADE_WEAPON,
    cost: 0, // 100% of weapon cost
    upgradeSlots: 0,
    availability: 'Standard',
    sourcebook: 'Scum and Villainy',
    description: `<p>A mounting ring that allows attachment of a blade or bayonet to a ranged weapon.</p>
      <p><strong>Cost:</strong> 100% of base weapon cost</p>
      <p><strong>Special:</strong> Weapon can be used as a melee weapon dealing weapon damage type.</p>`
  },
  {
    id: 'upgrade-weapon-ion-charger',
    name: 'Ion Charger (Weapon Upgrade)',
    category: CATEGORIES.UPGRADE_WEAPON,
    cost: 3000,
    upgradeSlots: 1,
    availability: 'Licensed',
    sourcebook: 'Scum and Villainy',
    description: `<p>Modifies an energy weapon to deal ion damage instead of normal damage.</p>
      <p><strong>Upgrade Slots:</strong> 1</p>
      <p><strong>Special:</strong> Weapon deals ion damage, affecting droids and electronics.</p>`
  },
  {
    id: 'upgrade-weapon-rangefinder',
    name: 'Rangefinder (Weapon Upgrade)',
    category: CATEGORIES.UPGRADE_WEAPON,
    cost: 200,
    upgradeSlots: 1,
    availability: 'Licensed',
    sourcebook: 'Scum and Villainy',
    description: `<p>An integrated rangefinder that calculates distance and trajectory.</p>
      <p><strong>Upgrade Slots:</strong> 1</p>
      <p><strong>Special:</strong> Negates range penalties for first range increment beyond Point Blank.</p>`
  },
  {
    id: 'upgrade-weapon-rapid-recycler',
    name: 'Rapid Recycler (Weapon Upgrade)',
    category: CATEGORIES.UPGRADE_WEAPON,
    cost: 500,
    upgradeSlots: 1,
    availability: 'Military',
    sourcebook: 'Scum and Villainy',
    description: `<p>Enhances the weapon's power recycling system for faster firing.</p>
      <p><strong>Upgrade Slots:</strong> 1</p>
      <p><strong>Special:</strong> Weapon can be fired as a swift action if you don't move.</p>`
  },

  // ===== ARMOR UPGRADES =====
  // Scum and Villainy
  {
    id: 'upgrade-armor-aquatic-adaptation',
    name: 'Aquatic Adaptation (Armor Upgrade)',
    category: CATEGORIES.UPGRADE_ARMOR,
    cost: 500,
    upgradeSlots: 1,
    availability: 'Standard',
    sourcebook: 'Scum and Villainy',
    description: `<p>Modifies armor for underwater operations with integrated rebreather and propulsion.</p>
      <p><strong>Upgrade Slots:</strong> 1</p>
      <p><strong>Special:</strong> Grants Swim speed equal to base speed. Breathe underwater.</p>`
  },
  {
    id: 'upgrade-armor-armorplast',
    name: 'Armorplast (Armor Upgrade)',
    category: CATEGORIES.UPGRADE_ARMOR,
    cost: 900,
    upgradeSlots: 0,
    availability: 'Standard',
    sourcebook: 'Scum and Villainy',
    description: `<p>Reinforces armor with armorplast plating for additional protection.</p>
      <p><strong>Upgrade Slots:</strong> 0</p>
      <p><strong>Special:</strong> Increases armor bonus to Reflex Defense by +1.</p>`
  },
  {
    id: 'upgrade-armor-environmental-systems',
    name: 'Environmental Systems (Armor Upgrade)',
    category: CATEGORIES.UPGRADE_ARMOR,
    cost: 600,
    upgradeSlots: 1,
    availability: 'Standard',
    sourcebook: 'Scum and Villainy',
    description: `<p>Adds climate control and atmospheric filtration to armor.</p>
      <p><strong>Upgrade Slots:</strong> 1</p>
      <p><strong>Special:</strong> Protection from extreme temperatures and toxic atmospheres.</p>`
  },
  {
    id: 'upgrade-armor-helmet-package',
    name: 'Helmet Package (Armor Upgrade)',
    category: CATEGORIES.UPGRADE_ARMOR,
    cost: 4000,
    upgradeSlots: 0,
    availability: 'Standard',
    sourcebook: 'Scum and Villainy',
    description: `<p>Integrated helmet with comlink, low-light vision, and HUD.</p>
      <p><strong>Upgrade Slots:</strong> 0</p>
      <p><strong>Special:</strong> Grants low-light vision and integrated comlink.</p>`
  },
  {
    id: 'upgrade-armor-jump-servos',
    name: 'Jump Servos (Armor Upgrade)',
    category: CATEGORIES.UPGRADE_ARMOR,
    cost: 100,
    upgradeSlots: 1,
    availability: 'Standard',
    sourcebook: 'Scum and Villainy',
    description: `<p>Powered leg servos that enhance jumping ability.</p>
      <p><strong>Upgrade Slots:</strong> 1</p>
      <p><strong>Special:</strong> Grants +5 bonus to Jump checks.</p>`
  },
  {
    id: 'upgrade-armor-shield-generator-sr5',
    name: 'Shield Generator SR 5 (Armor Upgrade)',
    category: CATEGORIES.UPGRADE_ARMOR,
    cost: 5000,
    upgradeSlots: 2,
    availability: 'Restricted',
    sourcebook: 'Scum and Villainy',
    description: `<p>An integrated personal shield generator.</p>
      <p><strong>Upgrade Slots:</strong> 2</p>
      <p><strong>Special:</strong> Provides SR 5 when activated as a swift action.</p>`
  },
  {
    id: 'upgrade-armor-shadowskin',
    name: 'Shadowskin (Armor Upgrade)',
    category: CATEGORIES.UPGRADE_ARMOR,
    cost: 5000,
    upgradeSlots: 1,
    availability: 'Restricted',
    sourcebook: 'Scum and Villainy',
    description: `<p>Light-absorbing coating that makes armor harder to detect.</p>
      <p><strong>Upgrade Slots:</strong> 1</p>
      <p><strong>Special:</strong> Grants +5 equipment bonus to Stealth checks in darkness.</p>`
  },

  // ===== UNIVERSAL UPGRADES =====
  // Scum and Villainy
  {
    id: 'upgrade-universal-cheater',
    name: 'Cheater (Universal Upgrade)',
    category: CATEGORIES.UPGRADE_UNIVERSAL,
    cost: 500,
    upgradeSlots: 1,
    availability: 'Illegal',
    sourcebook: 'Scum and Villainy',
    description: `<p>Hidden compartment or mechanism for concealing cheating devices.</p>
      <p><strong>Upgrade Slots:</strong> 1</p>
      <p><strong>Special:</strong> Grants +5 bonus to Deception checks to cheat at games.</p>`
  },
  {
    id: 'upgrade-universal-cloaked',
    name: 'Cloaked (Universal Upgrade)',
    category: CATEGORIES.UPGRADE_UNIVERSAL,
    cost: 750,
    upgradeSlots: 1,
    availability: 'Licensed',
    sourcebook: 'Scum and Villainy',
    description: `<p>Coating or design that makes equipment harder to detect with sensors.</p>
      <p><strong>Upgrade Slots:</strong> 1</p>
      <p><strong>Special:</strong> Increases DC to detect with sensors by +5.</p>`
  },
  {
    id: 'upgrade-universal-miniaturized',
    name: 'Miniaturized (Universal Upgrade)',
    category: CATEGORIES.UPGRADE_UNIVERSAL,
    cost: 500,
    upgradeSlots: 1,
    availability: 'Standard',
    sourcebook: 'Scum and Villainy',
    description: `<p>Equipment is reduced in size by one category.</p>
      <p><strong>Upgrade Slots:</strong> 1</p>
      <p><strong>Special:</strong> Size reduced by one step. Weight reduced by 50%.</p>`
  },
  {
    id: 'upgrade-universal-remote-activation',
    name: 'Remote Activation (Universal Upgrade)',
    category: CATEGORIES.UPGRADE_UNIVERSAL,
    cost: 100,
    upgradeSlots: 0,
    availability: 'Standard',
    sourcebook: 'Scum and Villainy',
    description: `<p>Allows remote activation of equipment via comlink.</p>
      <p><strong>Upgrade Slots:</strong> 0</p>
      <p><strong>Special:</strong> Can activate/deactivate remotely within comlink range.</p>`
  },
  {
    id: 'upgrade-universal-secret-compartment',
    name: 'Secret Compartment (Universal Upgrade)',
    category: CATEGORIES.UPGRADE_UNIVERSAL,
    cost: 600,
    upgradeSlots: 1,
    availability: 'Standard',
    sourcebook: 'Scum and Villainy',
    description: `<p>A hidden compartment for concealing small items.</p>
      <p><strong>Upgrade Slots:</strong> 1</p>
      <p><strong>Special:</strong> DC 25 Perception check to discover. Holds items up to Fine size.</p>`
  }
];

/**
 * Generate a Foundry VTT pack entry for equipment
 */
function generateEquipmentEntry(item) {
  const entry = {
    _id: item.id,
    name: item.name,
    type: 'equipment',
    img: 'icons/svg/upgrade.svg',
    system: {
      tags: [item.category],
      cost: item.cost ? item.cost.toString() : '0',
      weight: item.weight ? `${item.weight} kg` : '0 kg',
      size: item.size || 'small',
      availability: item.availability || 'Standard',
      quantity: 1,
      description: item.description || '',
      notes: item.notes || '',
      sourcebook: item.sourcebook || ''
    },
    effects: [],
    folder: null,
    sort: 0,
    ownership: {
      default: 0
    },
    flags: {}
  };

  // Add special fields for specific item types
  if (item.damage) {
    entry.system.damage = item.damage;
    entry.system.damageType = item.damageType || '';
  }

  if (item.installCost) {
    entry.system.installCost = item.installCost;
  }

  return entry;
}

/**
 * Main function to rebuild equipment.db
 */
function rebuildEquipmentPack() {
  const packPath = path.join(__dirname, '..', 'packs', 'equipment.db');

  // Generate all equipment entries
  const entries = equipmentData.map(item => generateEquipmentEntry(item));

  // Convert to NDJSON format (one JSON object per line)
  const ndjson = entries.map(entry => JSON.stringify(entry)).join('\n');

  // Write to file
  fs.writeFileSync(packPath, ndjson + '\n', 'utf8');

  swseLogger.log(`✓ Successfully rebuilt equipment.db with ${entries.length} equipment entries`);

  // Count by category
  const categoryCounts = {};
  equipmentData.forEach(item => {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
  });

  swseLogger.log('\nEquipment by category:');
  Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).forEach(([category, count]) => {
    swseLogger.log(`  - ${category}: ${count}`);
  });
}

// Run the script
try {
  rebuildEquipmentPack();
} catch (error) {
  swseLogger.error('Error rebuilding equipment pack:', error);
  process.exit(1);
}

import { ThemeManager } from "/systems/foundryvtt-swse/scripts/ui/theme/ThemeManager.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";

const LABELS = {
  vapor: 'Vaporwave',
  holo: 'Holo Blue',
  imperial: 'Imperial',
  rebel: 'Rebel Alert',
  jedi: 'Jedi Archive',
  sith: 'Sith Holocron',
  droid: 'Droid Amber',
  merc: 'Merc Green',
  cryo: 'Cryo Ice',
  blood: 'Blood Moon',
  'high-republic': 'High Republic',
  'high-contrast': 'High Contrast',
  starship: 'Starship',
  'sand-people': 'Sand People'
};

const SYSTEM_MANUAL_PAGES = [
  {
    number: '01',
    title: 'Welcome to the Holopad',
    kicker: 'Player Orientation',
    body: 'The Holopad is your in-world launch point for the system. It is meant to feel like a Star Wars device instead of a pile of disconnected Foundry windows.',
    bullets: [
      'Use Home to move between applications and return to the character sheet.',
      'Use Settings to tune the shell theme, motion, language, and display style.',
      'Use this manual whenever a player needs a friendly explanation of what the system can do.'
    ]
  },
  {
    number: '02',
    title: 'Registration and Character Generation',
    kicker: 'New Character Flow',
    body: 'New players can be welcomed through datapad registration and guided into chargen. The character generation flow walks them through the important choices instead of leaving them alone with a blank sheet.',
    bullets: [
      'Species, class, attributes, skills, talents, feats, Force choices, equipment, and summary review are presented as guided steps.',
      'The flow is designed to explain what matters when the player is making the choice.',
      'The final character should feel like a story decision, not just data entry.'
    ]
  },
  {
    number: '03',
    title: 'Mentors',
    kicker: 'Advice With Personality',
    body: 'Mentors are there to make rules guidance feel like in-universe advice. They help the player understand a choice through a point of view, a philosophy, or a career path.',
    bullets: [
      'Mentors can explain class identity, advancement direction, and character themes.',
      'They are meant to add flavor and clarity, not force a build.',
      'A good mentor moment should make the player feel like their character is being noticed.'
    ]
  },
  {
    number: '04',
    title: 'Suggestion Engine',
    kicker: 'Guidance, Not Autopilot',
    body: "The suggestion engine listens to surveys and character history, but the player remains the author. Surveys throughout the character's life can strongly shape recommendations, while the player's actual choices matter even more.",
    bullets: [
      'Surveys help the system understand goals, personality, methods, and story direction.',
      'Recommendations are strongest when they follow what the player has actually chosen at the table.',
      'The engine should feel like a helpful astromech, not a railroad conductor.'
    ]
  },
  {
    number: '05',
    title: 'Progression Engine',
    kicker: 'Level-Up Support',
    body: 'The progression engine is the guided advancement layer for SWSE. It is built to make leveling clear, legal, and satisfying, especially when many class features and prerequisites interact.',
    bullets: [
      'Class features, talents, feats, trained skills, Force techniques, Force secrets, and maneuvers can be presented through focused steps.',
      'The summary stage gives the player a final review before changes are committed.',
      'The system aims to preserve SWSE depth while reducing bookkeeping friction.'
    ]
  },
  {
    number: '06',
    title: 'Play Tools',
    kicker: 'At the Table',
    body: 'The system includes surfaces and automation for the things players touch during play: actions, gear, Force powers, combat options, condition, recovery, credits, and character resources.',
    bullets: [
      'Combat and skill actions are being centralized into readable sheet and chat-card workflows.',
      'Force powers are meant to feel like powers with state, usage, rolls, and results instead of static text entries.',
      'Gear, shops, credits, and workbenches are part of the same campaign economy.'
    ]
  },
  {
    number: '07',
    title: 'Campaign Systems',
    kicker: 'Beyond One Character',
    body: 'SWSE campaigns often grow beyond a single hero. This system is being shaped to support the wider life of the party: droids, ships, vehicles, followers, allies, factions, jobs, and games.',
    bullets: [
      'Garage and shipyard tools help keep owned assets separate from the main character sheet.',
      'Allies, factions, jobs, and bulletin tools are meant to make the galaxy feel responsive.',
      'Holopad games and social tools give downtime a place to live inside the same interface.'
    ]
  },
  {
    number: '08',
    title: 'GM Tools',
    kicker: 'Command Console',
    body: 'The GM Datapad is the campaign command surface. It gathers the behind-the-screen tools into a shared shell so the GM can manage play without leaving the Star Wars interface behind.',
    bullets: [
      'Use the GM window for campaign operations, approvals, house rules, stores, jobs, healing, factions, and workspace tools as they come online.',
      'The GM side is meant to coordinate the table, not bury the GM in extra clicks.',
      'When in doubt, open the GM Datapad first.'
    ]
  },
  {
    number: '09',
    title: 'Acknowledgements',
    kicker: 'Final Page',
    body: 'To my players on Discord: thank you for testing, laughing, breaking things, and helping this table become more alive. To George Lucas: thank you for creating an incredible universe that still makes us want to tell stories among the stars. To my wife, Jocelyn: thank you for unwittingly becoming my art director.',
    bullets: [],
    aurabesh: true
  }
];

export class SettingsSurfaceService {
  static getThemePresets() {
    return Object.entries(ThemeManager.themeMap).map(([id, preset]) => ({
      id,
      label: LABELS[id] || id,
      cyan: preset.cyan,
      pink: preset.pink,
      purple: preset.purple
    }));
  }

  static getShellColors() {
    return [
      { id: 'cyan', label: 'Cyan', color: ThemeManager.shellColorMap.cyan },
      { id: 'pink', label: 'Pink', color: ThemeManager.shellColorMap.pink },
      { id: 'green', label: 'Green', color: ThemeManager.shellColorMap.green },
      { id: 'amber', label: 'Amber', color: ThemeManager.shellColorMap.amber },
      { id: 'red', label: 'Red', color: ThemeManager.shellColorMap.red }
    ].map(c => ({
      ...c,
      start: c.color,
      mid: c.color,
      end: c.color
    }));
  }

  static getMotionOptions() {
    return ThemeResolutionService.getMotionOptions();
  }

  static async buildViewModel(actor, options = {}) {
    const isGMHost = !!options.gm;
    const preferActor = options.preferActor ?? !isGMHost;
    const pendingControls = options.pendingControls && typeof options.pendingControls === 'object' ? options.pendingControls : {};
    const current = { ...(ThemeManager.getTheme() || ThemeManager.defaults), ...pendingControls };
    const actorTheme = ThemeResolutionService.resolveThemeKey(null, { actor, preferActor });
    const actorMotionStyle = ThemeResolutionService.resolveMotionStyle(null, { actor, preferActor });
    const warning = 'Warning, changing native language to Aurabesh may result in a more difficult play.';

    return {
      id: 'settings',
      title: isGMHost ? 'GM Holopad Settings' : 'Holopad Settings',
      subtitle: isGMHost ? 'Command Interface Tuning' : 'Device Interface Tuning',
      introTitle: isGMHost ? 'COMMAND INTERFACE TUNING' : 'DEVICE INTERFACE TUNING',
      introSubtitle: isGMHost
        ? 'The GM console uses the same shared Holopad settings surface as actor datapads.'
        : 'The holopad reads from one shared configuration surface.',
      backLabel: isGMHost ? 'GM Home' : 'Character Sheet',
      backAction: isGMHost ? 'return-to-home' : 'return-to-sheet',
      isGMHost,
      warning,
      aurabeshWarning: warning,
      presets: this.getThemePresets().map(p => ({ ...p, selected: p.id === actorTheme })),
      shellColors: this.getShellColors().map(c => ({ ...c, selected: c.id === current.shellColor })),
      motionOptions: this.getMotionOptions().map(option => ({
        id: option.value,
        label: option.label,
        description: option.description,
        selected: option.value === actorMotionStyle
      })),
      systemManual: SYSTEM_MANUAL_PAGES,
      controls: {
        theme: actorTheme,
        motionStyle: actorMotionStyle,
        shellColor: current.shellColor,
        scanStrength: current.scanStrength,
        animSpeed: current.animSpeed,
        glow: current.glow,
        breathing: !!current.breathing,
        reducedMotion: !!current.reducedMotion,
        language: current.language || 'basic',
        languageMode: current.language || 'basic'
      }
    };
  }
}

/**
 * GameCenterRegistry
 *
 * Phase 1 infrastructure for Holopad Games. This registry is intentionally
 * rules-light: it describes available game modules and their campaign-facing
 * capabilities, while concrete game engines arrive in later phases.
 */

const DEFAULT_GAMES = [
  {
    id: 'pazaak',
    title: 'Pazaak',
    subtitle: 'Republic Senate Rules or credit buy-in matches.',
    icon: '20',
    status: 'Playable MVP',
    description: 'Closest to 20 without going over. Ideal first playable implementation for solo AI and player-vs-player side games.',
    minPlayers: 2,
    maxPlayers: 2,
    supportsAI: true,
    supportsNPCs: true,
    supportsPvP: true,
    supportsSpectators: false,
    supportsWagers: true,
    supportsCreditWagers: true,
    supportsItemWagers: false,
    supportsAssetWagers: false,
    defaultRulesMode: 'republic-senate',
    implementationPhase: 'Phase 4',
    nextMilestone: 'Item/asset wager escrow and Sabacc table pots',
    tags: ['starter', 'cards', 'turn-based'],
    presentation: {
      displayIcon: '20',
      statusKind: 'live',
      targetLabel: 'Target',
      targetValue: '20',
      targetHint: 'closest, no bust',
      tableNoun: 'Table',
      tableTheme: 'high table',
      actionLabel: 'Sit at Pazaak Table',
      startNote: 'Build a 10-card side deck, draw a 4-card hand, and play to the configured set target.',
      tableLine: 'Side deck tactics, main-deck pressure, first to the set target.',
      railHint: 'target 20',
      quickRules: ['Draw one main card on your turn.', 'Play at most one side card per turn.', 'Closest to 20 without busting wins the set.']
    }
  },
  {
    id: 'sabacc',
    title: 'Sabacc',
    subtitle: 'Galaxy/Corellian Spike target-zero cards, hand pot, and sabacc pot.',
    icon: '0',
    status: 'Campaign Table MVP',
    description: "A 62-card Galaxy/Corellian Spike-style Sabacc table with +10 through -10 in three suits, two Sylops, target-zero hand evaluation, market lifecycle, hand pot, Sabacc pot, PvP invites, credit buy-ins, betting rounds, and table-credit cash-out settlement.",
    minPlayers: 2,
    maxPlayers: 6,
    supportsAI: true,
    supportsNPCs: true,
    supportsPvP: true,
    supportsSpectators: true,
    supportsWagers: true,
    supportsCreditWagers: true,
    supportsItemWagers: true,
    supportsAssetWagers: true,
    defaultRulesMode: 'wagered',
    implementationPhase: 'Phase 9',
    nextMilestone: 'Evaluator test expansion, market runtime polish, item/asset side pots, dealer variants, and expanded table receipts',
    tags: ['cards', 'high-stakes', 'dealer'],
    presentation: {
      displayIcon: '0',
      statusKind: 'live',
      targetLabel: 'Target',
      targetValue: '0',
      targetHint: 'closest to zero',
      tableNoun: 'Den',
      tableTheme: 'casino table',
      actionLabel: 'Sit at Sabacc Table',
      startNote: 'Enter with table credits, play betting and draw rounds, then cash out through settlement.',
      tableLine: 'Hand pot, Sabacc pot, market cards, and shift pressure.',
      railHint: 'target zero',
      quickRules: ['Ante into the hand pot.', 'Bet, call, raise, or fold during table rounds.', 'Closest to zero wins; pure Sabacc can claim the Sabacc pot.']
    }
  },
  {
    id: 'hintaro',
    title: 'Hintaro',
    subtitle: 'Chance-cube gambling with Tukar, Kulro, and the hintaro die.',
    icon: '◇',
    status: 'Playable MVP',
    description: 'A fast chance-cube table with ante, betting, optional rerolls, the hintaro cancellation die, ranked rolls, split pots, and carryover pots.',
    minPlayers: 2,
    maxPlayers: 6,
    supportsAI: true,
    supportsNPCs: true,
    supportsPvP: true,
    supportsSpectators: true,
    supportsWagers: true,
    supportsCreditWagers: true,
    supportsItemWagers: false,
    supportsAssetWagers: false,
    defaultRulesMode: 'rotating',
    implementationPhase: 'Phase 12',
    nextMilestone: 'PvP table invite materialization, custom hintaro dice art, and casino/non-organized variants',
    tags: ['dice', 'gambling', 'fast'],
    presentation: {
      displayIcon: '◈',
      statusKind: 'live',
      targetLabel: 'Mode',
      targetValue: 'Dice',
      targetHint: 'chance-cube pit',
      tableNoun: 'Pit',
      tableTheme: 'chance-cube pit',
      actionLabel: 'Enter Hintaro Pit',
      startNote: 'Ante, call wagers, choose rerolls, and let the Hintaro die decide which symbols survive.',
      tableLine: 'Tukar, Kulro, hintaron pressure, and carryover pots.',
      railHint: 'chance cubes',
      quickRules: ['Ante into the pit.', 'Bet or drop before the reroll window.', 'Final live symbols determine the rank and pot outcome.']
    }
  },
  {
    id: 'dejarik',
    title: 'Dejarik',
    subtitle: 'Holochess creature board battles.',
    icon: '◇',
    status: 'Rules Foundation',
    description: 'A Dejarik rules foundation with radial board spaces, four holomonsters per side, movement, range, attacks, HP, and defeat state rendered inside the holopad.',
    minPlayers: 2,
    maxPlayers: 2,
    supportsAI: true,
    supportsNPCs: true,
    supportsPvP: true,
    supportsSpectators: true,
    supportsWagers: true,
    supportsCreditWagers: true,
    supportsItemWagers: false,
    supportsAssetWagers: false,
    defaultRulesMode: 'holopad-skirmish',
    implementationPhase: 'Phase 7',
    nextMilestone: 'Visual board polish, creature selection, special abilities, and smarter tactical AI',
    tags: ['board', 'tactical', 'visual'],
    presentation: {
      displayIcon: '✷',
      statusKind: 'found',
      targetLabel: 'Mode',
      targetValue: 'Board',
      targetHint: 'holochess tactics',
      tableNoun: 'Board',
      tableTheme: 'radial holochess',
      actionLabel: 'Start Dejarik Board',
      startNote: 'Move holomonsters across generated SVG cells, attack legal targets, and clear the enemy side.',
      tableLine: 'Generated SVG board, real cell highlights, creature HP, and tactical turns.',
      railHint: 'radial board',
      quickRules: ['Select one of your active holomonsters.', 'Move to highlighted cells or attack red target cells.', 'Last side with living creatures wins.']
    }
  }
];

function normalizeGameDefinition(definition = {}) {
  const id = String(definition.id || '').trim().toLowerCase();
  if (!id) return null;

  return {
    id,
    title: String(definition.title || id),
    subtitle: String(definition.subtitle || ''),
    icon: String(definition.icon || '◇'),
    status: String(definition.status || 'Planned'),
    description: String(definition.description || ''),
    minPlayers: Number(definition.minPlayers || 1),
    maxPlayers: Number(definition.maxPlayers || definition.minPlayers || 1),
    supportsAI: Boolean(definition.supportsAI),
    supportsNPCs: Boolean(definition.supportsNPCs),
    supportsPvP: Boolean(definition.supportsPvP),
    supportsSpectators: Boolean(definition.supportsSpectators),
    supportsWagers: Boolean(definition.supportsWagers),
    supportsCreditWagers: Boolean(definition.supportsCreditWagers),
    supportsItemWagers: Boolean(definition.supportsItemWagers),
    supportsAssetWagers: Boolean(definition.supportsAssetWagers),
    defaultRulesMode: definition.defaultRulesMode || 'republic-senate',
    implementationPhase: definition.implementationPhase || 'Future Phase',
    nextMilestone: definition.nextMilestone || '',
    tags: Array.isArray(definition.tags) ? definition.tags.map(tag => String(tag)) : [],
    presentation: normalizePresentation(definition.presentation)
  };
}

function normalizePresentation(presentation = {}) {
  const quickRules = Array.isArray(presentation.quickRules)
    ? presentation.quickRules.map(rule => String(rule || '').trim()).filter(Boolean)
    : [];
  return {
    displayIcon: presentation.displayIcon ? String(presentation.displayIcon) : '',
    statusKind: presentation.statusKind ? String(presentation.statusKind) : '',
    targetLabel: presentation.targetLabel ? String(presentation.targetLabel) : '',
    targetValue: presentation.targetValue ? String(presentation.targetValue) : '',
    targetHint: presentation.targetHint ? String(presentation.targetHint) : '',
    tableNoun: presentation.tableNoun ? String(presentation.tableNoun) : '',
    tableTheme: presentation.tableTheme ? String(presentation.tableTheme) : '',
    actionLabel: presentation.actionLabel ? String(presentation.actionLabel) : '',
    startNote: presentation.startNote ? String(presentation.startNote) : '',
    tableLine: presentation.tableLine ? String(presentation.tableLine) : '',
    railHint: presentation.railHint ? String(presentation.railHint) : '',
    quickRules
  };
}

export class GameCenterRegistry {
  static #games = new Map();
  static #initialized = false;

  static initialize() {
    if (this.#initialized) return;
    DEFAULT_GAMES.forEach(game => this.register(game));
    this.#initialized = true;
  }

  static register(definition = {}) {
    const normalized = normalizeGameDefinition(definition);
    if (!normalized) return null;
    this.#games.set(normalized.id, normalized);
    return normalized;
  }

  static get(gameId) {
    this.initialize();
    return this.#games.get(String(gameId || '').trim().toLowerCase()) ?? null;
  }

  static list() {
    this.initialize();
    return Array.from(this.#games.values());
  }

  static has(gameId) {
    return Boolean(this.get(gameId));
  }
}

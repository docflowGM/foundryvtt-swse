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
    status: 'Infrastructure Ready',
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
    implementationPhase: 'Phase 2',
    nextMilestone: 'Playable Republic Senate Rules match loop',
    tags: ['starter', 'cards', 'turn-based']
  },
  {
    id: 'sabacc',
    title: 'Sabacc',
    subtitle: 'High-stakes shifting cards, hand pot, and sabacc pot.',
    icon: '23',
    status: 'Planned',
    description: 'A table game for credit pots, item side pots, dealer droids, cheating hooks, and GM-approved high-value wagers.',
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
    implementationPhase: 'Phase 5',
    nextMilestone: '2-card Sabacc MVP with credit pots',
    tags: ['cards', 'high-stakes', 'dealer']
  },
  {
    id: 'dejarik',
    title: 'Dejarik',
    subtitle: 'Holochess creature board battles.',
    icon: '◇',
    status: 'Planned',
    description: 'A visual tactical board game rendered inside the holopad with HTML/SVG board state, not Foundry scenes or Cards.',
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
    defaultRulesMode: 'republic-senate',
    implementationPhase: 'Phase 6',
    nextMilestone: 'Board renderer and creature activation loop',
    tags: ['board', 'tactical', 'visual']
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
    tags: Array.isArray(definition.tags) ? definition.tags.map(tag => String(tag)) : []
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

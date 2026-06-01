/* ===================================================================
   Holopad Games — data layer
   Player, game registry, opponent NPCs, card decks, dialogue
   =================================================================== */

const ASSET = 'assets/games';

/* ---------- Player (continuity with Home Surface) ---------- */
const PLAYER = {
  name: 'Kael Vorren',
  role: 'Soldier 4 · Human · Republic',
  credits: 2400,
  portraitGlyph: '◇'
};

/* ---------- Game registry (mirrors game-center-registry.js) ---------- */
const GAMES = [
  {
    id: 'pazaak', title: 'Pazaak', icon: '20',
    subtitle: 'Republic Senate rules or credit buy-in matches.',
    status: 'Playable MVP', statusKind: 'live',
    description: 'Closest to 20 without going over. Draw a main-deck card each turn and bend the total with a locked four-card side hand. First to win the agreed number of sets takes the pot.',
    minPlayers: 2, maxPlayers: 2, phase: 'Phase 4',
    caps: { AI: true, NPC: true, PvP: true, Spectate: false, Credits: true, Items: false },
    tags: ['cards', 'turn-based', 'starter'],
    target: 20, setsToWin: 3, tableLimit: 9, playable: true
  },
  {
    id: 'sabacc', title: 'Sabacc', icon: '0',
    subtitle: 'Corellian Spike target-zero, hand pot + sabacc pot.',
    status: 'Campaign Table MVP', statusKind: 'live',
    description: 'A 62-card Corellian Spike table. Get your hand closest to zero, ride two pots, bluff through betting rounds, brave the shift dice, and watch for pure sabacc and the Idiot’s Array.',
    minPlayers: 2, maxPlayers: 6, phase: 'Phase 9',
    caps: { AI: true, NPC: true, PvP: true, Spectate: true, Credits: true, Items: true },
    tags: ['cards', 'high-stakes', 'dealer'],
    target: 0, playable: true
  },
  {
    id: 'hintaro', title: 'Hintaro', icon: '◈',
    subtitle: 'Chance-cube gambling: Tukar, Kulro & the hintaro die.',
    status: 'Playable MVP', statusKind: 'live',
    description: 'A fast chance-cube pit with ante, betting, optional rerolls, the hintaro cancellation die, ranked rolls, split pots, and carryover pots.',
    minPlayers: 2, maxPlayers: 6, phase: 'Phase 12',
    caps: { AI: true, NPC: true, PvP: true, Spectate: true, Credits: true, Items: false },
    tags: ['dice', 'gambling', 'fast'],
    playable: true, ante: 25
  },
  {
    id: 'dejarik', title: 'Dejarik', icon: '✷',
    subtitle: 'Holochess creature board battles.',
    status: 'Rules Foundation', statusKind: 'found',
    description: 'Radial holochess. Four holomonsters per side with movement, range, attacks, HP, and defeat state — rendered live inside the Holopad.',
    minPlayers: 2, maxPlayers: 2, phase: 'Phase 7',
    caps: { AI: true, NPC: true, PvP: true, Spectate: true, Credits: true, Items: false },
    tags: ['board', 'tactical', 'visual'],
    playable: true
  }
];

/* ---------- Opponent NPC roster (portrait + personality) ---------- */
const OPPONENTS = {
  salty: {
    id: 'salty', name: 'Salreth "Salty" Voan', img: `${ASSET}/portraits/salty.png`,
    profession: 'Outer Rim smuggler', difficulty: 'Hard', personality: 'aggressive',
    quality: 'Pushes hard for twenty and pressures the opponent.', force: false,
    tableFact: 'Lost a freighter to a single hand of Pazaak — never talks about it.'
  },
  vera: {
    id: 'vera', name: 'Vera Solenne', img: `${ASSET}/portraits/vera.png`,
    profession: 'Jedi-trained envoy', difficulty: 'Hard', personality: 'methodical',
    quality: 'Plays mathematically and values consistency.', force: true,
    tableFact: 'Counts every card. Claims she only "feels" the deck when it matters.'
  },
  dezmin: {
    id: 'dezmin', name: 'Dezmin the Pale', img: `${ASSET}/portraits/riquis.png`,
    profession: 'Nightsister exile', difficulty: 'Medium', personality: 'reckless',
    quality: 'Makes risky, emotional, swingy choices.', force: true,
    tableFact: 'Bets on instinct. The instinct is usually wrong, then suddenly right.'
  },
  riquis: {
    id: 'riquis', name: 'Sir Riquis Dane', img: `${ASSET}/portraits/dezmin.png`,
    profession: 'House duelist', difficulty: 'Medium', personality: 'showboat',
    quality: 'Prefers dramatic, stylish plays and exact totals.', force: false,
    tableFact: 'Will not win quietly. Considers a clean 20 a kind of performance.'
  },
  pegar: {
    id: 'pegar', name: 'Pegar Voss', img: `${ASSET}/portraits/pegar.png`,
    profession: 'Retired siege trooper', difficulty: 'Easy', personality: 'cautious',
    quality: 'Avoids busting and protects small advantages.', force: false,
    tableFact: 'Slow, patient, immovable. Folds early and often — until he doesn’t.'
  },
  krag: {
    id: 'krag', name: 'Krag Hool', img: `${ASSET}/portraits/krag.png`,
    profession: 'Cartel enforcer', difficulty: 'Medium', personality: 'opportunist',
    quality: 'Conserves resources until you expose a weakness.', force: false,
    tableFact: 'Says nothing for an hour, then takes everything in one turn.'
  }
};

/* ---------- Pazaak side-card catalog ---------- */
const PZ_CARD_FRONT = `${ASSET}/pazaak/card-front-template.png`;
const PZ_CARD_BACK = `${ASSET}/pazaak/card-back-template.png`;
const PAZAAK_SIDE_CATALOG = [
  ...[1, 2, 3, 4, 5, 6].map(n => ({ id: 'P' + n, label: `Plus ${n}`, short: `+${n}`, type: 'plus', value: n, tone: 'plus', desc: `Adds ${n} to your total.` })),
  ...[1, 2, 3, 4, 5, 6].map(n => ({ id: 'M' + n, label: `Minus ${n}`, short: `−${n}`, type: 'minus', value: n, tone: 'minus', desc: `Subtracts ${n} from your total.` })),
  ...[1, 2, 3].map(n => ({ id: 'F' + n, label: `Flux ±${n}`, short: `±${n}`, type: 'flip', mag: n, tone: 'flip', desc: `Play as +${n} or −${n}.` })),
  { id: 'R2', label: 'Range ±1/2', short: '±1·2', type: 'range', tone: 'flip', desc: 'Play as +1, +2, −1 or −2.' },
  { id: 'TB', label: 'Tiebreaker', short: '±1 T', type: 'tiebreaker', tone: 'flip', desc: 'Play as +1 or −1; wins ties this set.' }
];
const PAZAAK_DECK_SIZE = 10;
const PAZAAK_HAND_SIZE = 4;

/* ---------- Sabacc deck (Corellian Spike, target zero) ---------- */
const SABACC_DECK = [
  { id: 's_pt5', value: 5, sign: 'positive', suit: 'Triangle', img: `${ASSET}/sabacc/sabacc_pos_tri_05_thumb.png` },
  { id: 's_pt1', value: 1, sign: 'positive', suit: 'Triangle', img: `${ASSET}/sabacc/sabacc_pos_tri_01_thumb.png` },
  { id: 's_pc7', value: 7, sign: 'positive', suit: 'Circle', img: `${ASSET}/sabacc/sabacc_pos_cir_07_thumb.png` },
  { id: 's_pc2', value: 2, sign: 'positive', suit: 'Circle', img: `${ASSET}/sabacc/sabacc_pos_cir_02_thumb.png` },
  { id: 's_ps10', value: 10, sign: 'positive', suit: 'Square', img: `${ASSET}/sabacc/sabacc_pos_sqr_10_thumb.png` },
  { id: 's_nt3', value: -3, sign: 'negative', suit: 'Triangle', img: `${ASSET}/sabacc/sabacc_neg_tri_03_thumb.png` },
  { id: 's_nt9', value: -9, sign: 'negative', suit: 'Triangle', img: `${ASSET}/sabacc/sabacc_neg_tri_09_thumb.png` },
  { id: 's_nc5', value: -5, sign: 'negative', suit: 'Circle', img: `${ASSET}/sabacc/sabacc_neg_cir_05_thumb.png` },
  { id: 's_ns8', value: -8, sign: 'negative', suit: 'Square', img: `${ASSET}/sabacc/sabacc_neg_sqr_08_thumb.png` },
  { id: 's_syl', value: 0, sign: 'neutral', suit: 'Sylop', sylop: true, img: `${ASSET}/sabacc/sabacc_sylop_thumb.png` }
];

/* ---------- Hintaro (chance-cube pit) ---------- */
const HINTARO = {
  ante: 25,
  glyphs: {
    tukar: { mark: '▲', label: 'Tukar', tone: 'gold' },
    kulro: { mark: '⬢', label: 'Kulro', tone: 'cyan' }
  },
  hintaroFaces: [
    { id: 'hin', short: 'HIN', label: 'Hin', cancels: 'tukar', tone: 'gold', desc: 'Cancels every Tukar cube on the table.' },
    { id: 'taro', short: 'TARO', label: 'Taro', cancels: 'kulro', tone: 'cyan', desc: 'Cancels every Kulro cube on the table.' },
    { id: 'null', short: '∅', label: 'Null', cancels: null, tone: 'pink', desc: 'No cancellation — every cube counts.' }
  ],
  ranks: [
    { label: 'Hintaron', desc: 'Three live cubes of one value — the pit roars.' },
    { label: 'Surge', desc: 'Three live cubes forming a run.' },
    { label: 'Pair', desc: 'Two matching live cubes.' },
    { label: 'Scatter', desc: 'Mixed live cubes — highest sum wins.' },
    { label: 'Void', desc: 'All cubes cancelled — the pot carries over.' }
  ]
};

/* ---------- Dejarik (holochess) ---------- */
const DEJARIK = {
  board: `${ASSET}/dejarik/dejarik-board.png`,
  rays: 12, ringR: [20.5, 38.5],
  monsters: [
    { key: 'maul',   name: 'Iron Maul',    glyph: '■', atk: 4, hp: 8, trait: 'Heavy bruiser — high HP, slow grind.' },
    { key: 'drake',  name: 'Sable Drake',  glyph: '▲', atk: 3, hp: 6, trait: 'Balanced striker with reliable damage.' },
    { key: 'wraith', name: 'Talon Wraith', glyph: '✦', atk: 2, hp: 5, trait: 'Fast skirmisher — chips and retreats.' },
    { key: 'brute',  name: 'Korven Brute', glyph: '⬢', atk: 3, hp: 7, trait: 'Frontline wall that trades well.' },
    { key: 'spine',  name: 'Spinemaw',     glyph: '✸', atk: 2, hp: 4, trait: 'Glass cannon — fragile but vicious.' },
    { key: 'fang',   name: 'Rift Fang',    glyph: '◆', atk: 3, hp: 5, trait: 'Aggressive flanker, even profile.' },
    { key: 'savrip', name: 'Mantel Savrip', glyph: '★', atk: 4, hp: 7, trait: 'Apex predator — top-tier all-rounder.' },
    { key: 'houjix', name: 'Houjix',        glyph: '❖', atk: 2, hp: 6, trait: 'Sturdy holdout, soaks pressure.' }
  ]
};

/* ---------- Personality dialogue (subset of pazaak-ai-personalities.json) ---------- */
const DIALOGUE = {
  aggressive: {
    invite: 'If you wanted safe, you picked the wrong table.',
    playsCard: 'Here comes the push.', drawsCard: 'Draw. No blinking.',
    stand: 'Enough. Beat that.', busts: 'Too far. Worth the try.',
    hits20: 'There it is. Clean impact.', winRound: 'Pressure works.',
    loseRound: 'You got one. Do not get comfortable.', taunt: 'Standing already? Bold way to surrender.',
    thinking: 'I am lining up the hit.'
  },
  methodical: {
    invite: 'Numbers do not bluff. Players do.',
    playsCard: 'The card fits the calculation.', drawsCard: 'The draw has acceptable odds.',
    stand: 'No further draw is justified.', busts: 'The risk model failed.',
    hits20: 'Twenty. Optimal.', winRound: 'Expected outcome confirmed.',
    loseRound: 'Variance, not error.', taunt: 'Your line has a poor expected value.',
    thinking: 'The answer is in the probabilities.'
  },
  reckless: {
    invite: 'Safe play is for cargo manifests.',
    playsCard: 'This card has a heroic look to it.', drawsCard: 'Draw! Consequences are optional.',
    stand: 'I stand before I improve this into a disaster.', busts: 'The deck has betrayed art itself.',
    hits20: 'Twenty! That counts as skill.', winRound: 'See? That was definitely a plan.',
    loseRound: 'That was almost brilliant.', taunt: 'Come on, make a terrible choice with style.',
    thinking: 'I am pretending to calculate.'
  },
  showboat: {
    invite: 'Do try to make this entertaining.',
    playsCard: 'Now this is a card.', drawsCard: 'Watch the turn.',
    stand: 'Hold the moment.', busts: 'A flaw in an otherwise fine performance.',
    hits20: 'A beautiful finish.', winRound: 'Tell the table to remember that set.',
    loseRound: 'The outcome was rude.', taunt: 'If you must lose, do it with timing.',
    thinking: 'The scene needs a beat.'
  },
  cautious: {
    invite: 'A safe total is not a weak total.',
    playsCard: 'A measured answer.', drawsCard: 'One card, carefully.',
    stand: 'No more cards. This is enough.', busts: 'I overstepped. That is on me.',
    hits20: 'Twenty. That is sufficient.', winRound: 'A careful hand still wins.',
    loseRound: 'Small setback. I still have room.', taunt: 'Bold choices become expensive choices.',
    thinking: 'The correct play is the quiet one.'
  },
  opportunist: {
    invite: 'Every opponent eventually tells the table something.',
    playsCard: 'Here is the part you left open.', drawsCard: 'I draw where the table is weakest.',
    stand: 'Your turn to solve the problem.', busts: 'I reached too soon.',
    hits20: 'Perfect timing. Perfect total.', winRound: 'Small weakness, full payment.',
    loseRound: 'No opening worth taking.', taunt: 'That stand left a door open.',
    thinking: 'There is always an opening.'
  }
};

function line(personality, key) {
  const set = DIALOGUE[personality] || DIALOGUE.methodical;
  return set[key] || '';
}

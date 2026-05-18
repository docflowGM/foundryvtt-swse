/* ============================================================
 * HOLONET — Mock data for the Messenger + Job Board prototype
 * Everything here is plain data; no behavior.
 * ============================================================ */

window.HOLO = (function () {

  // ── Cast ────────────────────────────────────────────────────
  const PLAYERS = [
    { id: 'p_kier',  name: 'Kier Vahn',     handle: '@kier',  role: 'Smuggler · Soldier 3 / Scoundrel 2', tone: '--f-scout',  glyph: '✦' },
    { id: 'p_vexa',  name: "Vexa T'Lor",    handle: '@vexa',  role: 'Noble · Field Medic',                tone: '--f-noble-c',glyph: '✦' },
    { id: 'p_j0n1',  name: 'J0-N1',         handle: '@j0n1',  role: 'Astromech · Slicer',                 tone: '--f-jedi',   glyph: '⌬' },
    { id: 'p_mara',  name: 'Mara Brizk',    handle: '@mara',  role: 'Jedi Knight',                        tone: '--f-jedi',   glyph: '✦' },
  ];

  const GM = { id: 'gm_table', name: 'GM Channel', handle: '@gm', role: 'Game Master', tone: '--f-noble-r', glyph: '◈' };

  const NPCS = [
    { id: 'n_venn',     name: 'Dockmaster Venn',     org: 'Nar Shaddaa Port Authority', tag: 'Contact · Open',       tone: '--f-mil',   glyph: '◇',
      bio: 'Tibanna-stained vest, eternally tired. Owes the party a favor since the Kashyyyk haul.' },
    { id: 'n_seris',    name: 'Seris Ko',            org: 'Independent Fixer',          tag: 'Contact · Open',       tone: '--f-crim',  glyph: '◇',
      bio: 'Pantoran. Pays well. Asks nothing twice. Last seen on Ord Mantell.' },
    { id: 'n_kreel',    name: 'Captain Drev Kreel',  org: 'Free Trader · The Hawksbill',tag: 'Contact · Open',       tone: '--f-noble-r',glyph: '◇',
      bio: 'Has a route to the Outer Rim and a problem with pirates.' },
    { id: 'n_unknown',  name: 'UNKNOWN SENDER',      org: 'Encrypted · Origin Masked',  tag: 'Unverified',           tone: '--f-sith',  glyph: '⌧',
      bio: 'Channel signature does not match any registered comm tower.' },
    { id: 'n_jeza',     name: 'Curator Jeza Ord',    org: 'Antiquities · Coronet',      tag: 'Contact · Open',       tone: '--f-jedi-2',glyph: '◇',
      bio: 'Looking for "specific" artifacts. Pays in credits or favors.' },
    { id: 'n_hk',       name: 'HK-44',               org: 'Bounty Posting Service',     tag: 'Contact · Open',       tone: '--f-sith',  glyph: '⌬',
      bio: 'Statement: This unit routes contracts. Affection for organics is optional.' },
  ];

  // ── Threads ─────────────────────────────────────────────────
  // kind: 'party' (main, can't leave) | 'side' (party-derived, can leave) | 'private' (DM/group) | 'contact' (NPC) | 'gm' (GM briefing)
  const THREADS = [
    {
      id: 't_party',
      kind: 'party',
      title: '#Party',
      subtitle: 'Main crew channel — always-on',
      participants: ['p_kier','p_vexa','p_j0n1','p_mara','gm_table'],
      owner: 'gm_table',
      notify: 'mentions',
      unread: 0,
      gmVisible: true,
      locked: true,   // can't leave
      pinned: ['m_p_pin'],
      preview: 'GM pinned: Docking fees due before departure.',
      time: '14:02',
    },
    {
      id: 't_kashyyyk',
      kind: 'side',
      title: 'Kashyyyk Job',
      subtitle: 'Mission planning · started by Kier',
      participants: ['p_kier','p_vexa','p_j0n1','gm_table'],
      owner: 'p_kier',
      notify: 'on',
      unread: 3,
      gmVisible: true,
      locked: false,
      pinned: ['m_k_brief'],
      preview: 'Vexa: I can prep the med supplies before lift.',
      time: '13:48',
    },
    {
      id: 't_shop',
      kind: 'side',
      title: 'Shopping & Gear',
      subtitle: 'Side thread · created by Vexa',
      participants: ['p_kier','p_vexa','p_mara'],
      owner: 'p_vexa',
      notify: 'on',
      unread: 0,
      gmVisible: true,
      locked: false,
      preview: 'Mara: I priced the synthweave at 1,200.',
      time: '12:14',
    },
    {
      id: 't_dm_vexa',
      kind: 'private',
      title: "Vexa T'Lor",
      subtitle: 'Private holochat · 2 participants',
      participants: ['p_kier','p_vexa'],
      owner: 'p_kier',
      notify: 'on',
      unread: 1,
      gmVisible: true,   // GM sees but labeled Private
      locked: false,
      preview: 'Vexa: Don\'t tell Mara about the cargo yet.',
      time: '11:50',
    },
    {
      id: 't_gm_brief',
      kind: 'gm',
      title: 'GM Briefing — Kier',
      subtitle: 'Direct from your GM',
      participants: ['p_kier','gm_table'],
      owner: 'gm_table',
      notify: 'on',
      unread: 0,
      gmVisible: true,
      locked: true,
      preview: 'GM: A new contact wants to speak with you.',
      time: 'Yesterday',
    },
    {
      id: 't_venn',
      kind: 'contact',
      title: 'Dockmaster Venn',
      subtitle: 'NPC contact · open',
      participants: ['p_kier','n_venn','gm_table'],
      owner: 'n_venn',
      notify: 'on',
      unread: 0,
      gmVisible: true,
      locked: false,
      preview: 'Venn: Your bay is paid through the rotation.',
      time: '08:30',
    },
  ];

  // ── Inbound holochat invite ─────────────────────────────────
  const INVITE = {
    id: 'inv_seris',
    from: 'n_seris',
    title: 'Holochat Request',
    body: 'Seris Ko wants to open a private holochat with you. Origin verified · Ord Mantell relay.',
    posted: 'Just now',
  };

  // ── Messages per thread ─────────────────────────────────────
  // type: 'text' | 'system' | 'pin' | 'credits' | 'attach' | 'job' | 'roll'
  const MESSAGES = {

    t_party: [
      { id:'m1', type:'system', text:'GM created the #Party channel and added Kier, Vexa, J0-N1, Mara.', time:'Mon 09:12' },
      { id:'m_p_pin', type:'pin', by:'gm_table', text:'Docking fees due before departure. Don\'t make me chase anyone.', time:'Mon 09:14' },
      { id:'m2', type:'text', from:'p_mara',  text:'Wheels up at 1500. Anyone need supplies before we lift?', time:'13:40' },
      { id:'m3', type:'text', from:'p_vexa',  text:'I need med supplies. Need 800c to top off the kit.', time:'13:41' },
      { id:'m4', type:'credits', from:'p_kier', to:'p_vexa', amount:800, memo:'Med kit · go nuts', status:'received', time:'13:42' },
      { id:'m5', type:'text', from:'p_vexa',  text:'Received. You\'re a saint. The galaxy doesn\'t deserve you.', time:'13:42' },
      { id:'m6', type:'text', from:'p_j0n1',  text:'[BINARY] Astromech requests new diagnostic kit. Estimate: 1,200c.', time:'13:45' },
      { id:'m_job', type:'job', jobId:'job_kreel', time:'13:51' },
      { id:'m7', type:'text', from:'gm_table', text:'Heads up — the posting above came in through the public bounty service. You can discuss or accept in the job\'s thread.', kind:'GM', time:'13:52' },
      { id:'m8', type:'text', from:'p_kier',  text:'Looks fat. Vexa, you in? @j0n1 can you run the route on the side?', time:'14:01' },
      { id:'m9', type:'text', from:'p_vexa',  text:'In. Pulling up the deck plan now.', time:'14:02' },
    ],

    t_kashyyyk: [
      { id:'mk0', type:'system', text:'Kier started the side thread "Kashyyyk Job" and added Vexa, J0-N1, GM.', time:'Mon 19:02' },
      { id:'m_k_brief', type:'pin', by:'p_kier', text:'Goal: retrieve the cargo crate from Bay 12. No bodies. No witnesses willing to talk.', time:'Mon 19:03' },
      { id:'mk1', type:'text', from:'p_kier', text:'Insertion at dawn. J0-N1 takes the security loop, Vexa stays on the ship.', time:'13:30' },
      { id:'mk2', type:'text', from:'p_j0n1', text:'[BINARY] Loop estimate: 6 rotations. Confidence 78%.', time:'13:31' },
      { id:'mk3', type:'attach', from:'p_kier', kind:'journal', name:'Bay 12 — Approach Notes', subtitle:'Journal · 4 entries · pinned', time:'13:35' },
      { id:'mk4', type:'text', from:'p_vexa', text:'I can prep the med supplies before lift. Anyone need a stim pack?', time:'13:48' },
      { id:'mk5', type:'system', text:'GM added Mara Brizk to the thread.', actor:'gm_table', target:'p_mara', time:'13:50' },
      { id:'mk6', type:'text', from:'p_mara', text:'Sorry I\'m late. I\'ll bring the lightsaber. For diplomacy.', time:'13:51' },
    ],

    t_shop: [
      { id:'ms1', type:'text', from:'p_vexa', text:'Synthweave underlay — anyone have a vendor that isn\'t insulting us?', time:'12:10' },
      { id:'ms2', type:'attach', from:'p_mara', kind:'item', name:'Synthweave Underlay', subtitle:'Armor · Cost 1,200c · Coronet Outfitters', time:'12:12' },
      { id:'ms3', type:'text', from:'p_mara', text:'I priced the synthweave at 1,200.', time:'12:14' },
    ],

    t_dm_vexa: [
      { id:'md1', type:'text', from:'p_vexa', text:'You there?', time:'11:48' },
      { id:'md2', type:'text', from:'p_kier', text:'Talk.', time:'11:49' },
      { id:'md3', type:'text', from:'p_vexa', text:"Don't tell Mara about the cargo yet. I want to feel out how she takes it.", time:'11:50' },
    ],

    t_gm_brief: [
      { id:'mg1', type:'text', from:'gm_table', text:'A new contact wants to speak with you. They claim to know about the cargo manifest from Kashyyyk.', kind:'GM', time:'Yesterday 22:14' },
      { id:'mg2', type:'text', from:'p_kier', text:'Vetted?', time:'Yesterday 22:16' },
      { id:'mg3', type:'text', from:'gm_table', text:'Partially. They\'ll reach out on a public channel. Up to you to take it.', kind:'GM', time:'Yesterday 22:18' },
    ],

    t_venn: [
      { id:'mv1', type:'text', from:'n_venn', text:'Your bay is paid through the rotation. Don\'t make me regret the discount.', time:'08:30' },
      { id:'mv2', type:'text', from:'p_kier', text:'You won\'t.', time:'08:31' },
    ],
  };

  // ── Jobs ────────────────────────────────────────────────────
  // status: 'open' | 'accepted' | 'in_progress' | 'completed' | 'expired' | 'closed'
  const JOBS = [
    {
      id: 'job_kreel',
      title: 'Pirate Picket on the Triellus Route',
      posterId: 'n_kreel',
      posterRole: 'Free Trader · The Hawksbill',
      tags: ['Combat','Starship','Outer Rim'],
      status: 'open',
      reward: { credits: 8000, items: [{name:'Concussion Missile ×2'}], xp: 1500 },
      brief: 'Pirates have been chewing on convoys past the Triellus jump. I need a crew to ride along with my hauler for two transits and turn the picket into a memory. Discretion preferred, gunwork mandatory.',
      visibility: 'Party Channel',
      deadline: 'Within 6 days',
      accepted: [],
      thread: 't_kreel',
    },
    {
      id: 'job_jeza',
      title: 'Quiet Retrieval — Coronet Antiquities',
      posterId: 'n_jeza',
      posterRole: 'Antiquities · Coronet',
      tags: ['Stealth','Investigation','Core Worlds'],
      status: 'accepted',
      reward: { credits: 5500, items: [{name:'Datapad · Restored'}], xp: 1000 },
      brief: 'A piece left my showroom under regrettable circumstances. I would prefer it return. No questions about its provenance, and I will ask none about your methods.',
      visibility: 'Party Channel',
      deadline: 'Open',
      accepted: ['p_vexa','p_mara'],
      thread: null,
    },
    {
      id: 'job_venn',
      title: 'Bay 12 Cleanup',
      posterId: 'n_venn',
      posterRole: 'Port Authority',
      tags: ['Combat','Local'],
      status: 'completed',
      reward: { credits: 2000, items: [], xp: 400 },
      brief: 'Squatters in Bay 12 again. Persuade them to be somewhere else. No incident reports.',
      visibility: 'Direct · Kier',
      deadline: 'Resolved',
      accepted: ['p_kier'],
      thread: null,
    },
    {
      id: 'job_hk',
      title: 'BOUNTY: Dazren the Hutt-Tongue',
      posterId: 'n_hk',
      posterRole: 'Bounty Posting Service',
      tags: ['Bounty','Live Capture','Hutt Space'],
      status: 'open',
      reward: { credits: 15000, items: [], xp: 2500 },
      brief: 'Statement: Target is wanted alive. Acceptable damage levels include limbs but not vocal cords. Statement: Compensation increases if delivered conscious.',
      visibility: 'All Party',
      deadline: 'Within 10 days',
      accepted: [],
      thread: null,
    },
  ];

  function byId(list, id) { return list.find(x => x.id === id) || null; }
  function person(id) {
    return byId(PLAYERS, id) || byId(NPCS, id) || (id === 'gm_table' ? GM : null);
  }

  return { PLAYERS, GM, NPCS, THREADS, INVITE, MESSAGES, JOBS, byId, person };
})();

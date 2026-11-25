/**
 * Architecture census — subsystem taxonomy and classification rules.
 *
 * READ-ONLY AUDIT TOOLING. Not imported by the runtime (index.js) and never
 * writes outside data/audits/architecture-census/.
 *
 * Domain assignment is evidence-graded:
 *   - "path-rule"     : the file sits in a directory whose ownership is explicit
 *   - "keyword"       : inferred from path/file-name vocabulary
 *   - "import-majority": (tests/tools) inferred from the domains it imports
 *   - "fallback"      : top-level directory default only (low confidence)
 * A path is evidence of INTENDED ownership, not proof of actual ownership;
 * responsibility-level authority is assigned separately (state-writer census,
 * Phase 1 contracts).
 */

export const DOMAINS = {
  'actor-core':            { name: 'V2 actor model, derived state and ActorEngine mutation gate', kind: 'mechanical' },
  'abilities-effects':     { name: 'AbilityEngine, ModifierEngine, active effects and rule collectors', kind: 'mechanical' },
  'progression':           { name: 'Character generation, level-up and the progression framework shell', kind: 'mechanical' },
  'classes':               { name: 'Classes and prestige classes', kind: 'mechanical' },
  'species':               { name: 'Species, traits and anatomy', kind: 'mechanical' },
  'skills':                { name: 'Skills, skill uses and skill challenges', kind: 'mechanical' },
  'feats':                 { name: 'Feats', kind: 'mechanical' },
  'talents':               { name: 'Talents and talent trees', kind: 'mechanical' },
  'force':                 { name: 'Force powers, Force points, Dark Side, traditions and alchemy', kind: 'mechanical' },
  'combat':                { name: 'Combat, actions, attacks, damage, conditions, hazards', kind: 'mechanical' },
  'rolls':                 { name: 'Dice and roll execution', kind: 'mechanical' },
  'equipment':             { name: 'Weapons, armor, equipment, inventory and encumbrance', kind: 'mechanical' },
  'customization':         { name: 'Item customization, upgrades, modifications, crafting, implants', kind: 'mechanical' },
  'store-economy':         { name: 'Store, credits and transactions', kind: 'mechanical' },
  'vehicles':              { name: 'Vehicles, starships, crew, garage and shipyard', kind: 'mechanical' },
  'droids':                { name: 'Droid mechanics and construction', kind: 'mechanical' },
  'npc-followers':         { name: 'NPCs, nonheroic, followers, minions, allies, beasts', kind: 'mechanical' },
  'mentor-suggestion':     { name: 'Mentor, surveys, suggestion and build analysis', kind: 'feature' },
  'galactic-profiles':     { name: 'GM Datapad procedural world/NPC/location generator (scripts/generation; key kept for stability). Galactic Profiles v3 runtime is attributed to progression', kind: 'feature' },
  'holonet':               { name: 'Holonet messaging and notifications', kind: 'feature' },
  'games':                 { name: 'Holopad games and wagers', kind: 'feature' },
  'houserules':            { name: 'House rules', kind: 'feature' },
  'chat':                  { name: 'Chat output and chat cards', kind: 'infrastructure' },
  'ui-shell':              { name: 'Sheets, Holopad shell, apps, dialogs, UI framework, themes', kind: 'presentation' },
  'governance':            { name: 'Sentinel, enforcement gates, integrity and mutation governance', kind: 'infrastructure' },
  'settings-config':       { name: 'Settings, configuration, constants, feature flags', kind: 'infrastructure' },
  'data-registries':       { name: 'Canonical data, registries, compendium loading and normalizers', kind: 'infrastructure' },
  'infrastructure':        { name: 'Bootstrap, hooks wiring, caching, generic utilities', kind: 'infrastructure' },
  'migration':             { name: 'Data migrations and world maintenance', kind: 'infrastructure' },
  'compat-patches':        { name: 'Runtime hotfix/compatibility patch layer', kind: 'infrastructure' },
  'dev-tooling':           { name: 'Dev tools, debug, build, validation and audit tooling', kind: 'tooling' },
  'testing':               { name: 'Test infrastructure (unattributed tests)', kind: 'tooling' },
  'documentation':         { name: 'Documentation and audit evidence (unattributed)', kind: 'evidence' },
  'compendium-packs':      { name: 'Compendium pack sources', kind: 'data' },
  'localization':          { name: 'Localization', kind: 'data' },
  'assets':                { name: 'Static assets (unattributed images, fonts, media)', kind: 'asset' },
  'repo-config':           { name: 'Repository configuration, manifest and CI', kind: 'configuration' },
};

// Ordered directory rules (first match wins). Matched against the repo path.
export const PATH_RULES = [
  [/^index\.js$/, 'infrastructure'],
  [/^system\.json$|^template\.json$|^\.github\/|^\.gitignore$|^\.prettier|^package(-lock)?\.json$|^\.gitattributes$|^\.editorconfig$|^jsconfig|^\.eslint/, 'repo-config'],
  [/^scripts\/governance\/actor-engine\//, 'actor-core'],
  [/^scripts\/actors\//, 'actor-core'],
  [/^scripts\/engine\/(core|HP)\//, 'actor-core'],
  [/^scripts\/engine\/(abilities|effects|execution|rules|capabilities)\//, 'abilities-effects'],
  [/^scripts\/engine\/features\//, 'feats'],
  [/^scripts\/(engine\/(progression|chargen)|apps\/(progression-framework|chargen|levelup))\//, 'progression'],
  [/^scripts\/engine\/prestige\//, 'classes'],
  [/^scripts\/(engine\/(species|systems)|species)\//, 'species'],
  [/^scripts\/engine\/(skills|skill-challenges)\//, 'skills'],
  [/^scripts\/engine\/(feats|feat)\//, 'feats'],
  [/^scripts\/(engine\/talent|apps\/talent-tree-workbench|talents)\//, 'talents'],
  [/^scripts\/(engine\/(force|darkside)|apps\/(force-alchemy|force-tradition))\//, 'force'],
  [/^scripts\/(engine\/(combat|actions|resolution|poison)|combat)\//, 'combat'],
  [/^scripts\/(engine\/(roll|rolls)|rolls)\//, 'rolls'],
  [/^scripts\/engine\/roll-engine\.js$/, 'rolls'],
  [/^scripts\/(engine\/(equipment|inventory|items|encumbrance)|items)\//, 'equipment'],
  [/^scripts\/(engine\/(customization|upgrades|crafting|implants)|apps\/customization)\//, 'customization'],
  [/^scripts\/(engine\/store|apps\/store)\//, 'store-economy'],
  [/^scripts\/(engine\/(vehicles|crew)|domain\/vehicles)\//, 'vehicles'],
  [/^scripts\/engine\/StarshipManeuversEngine\.js$/, 'vehicles'],
  [/^scripts\/(engine\/droids|domain\/droids)\//, 'droids'],
  [/^scripts\/engine\/droid-validation-engine\.js$/, 'droids'],
  [/^scripts\/(engine\/npc-legal-review|domain\/followers|apps\/allies|allies)\//, 'npc-followers'],
  [/^scripts\/(engine\/(suggestion|mentor|analysis|archetype)|mentor|apps\/(mentor|mentor-notes)|dialogue|suggestions)\//, 'mentor-suggestion'],
  [/^scripts\/generation\//, 'galactic-profiles'],
  [/^scripts\/holonet\//, 'holonet'],
  [/^scripts\/games\//, 'games'],
  [/^scripts\/(houserules|engine\/system)\//, 'houserules'],
  [/^scripts\/chat\//, 'chat'],
  [/^scripts\/governance\//, 'governance'],
  [/^scripts\/engine\/(integrity|repair)\//, 'governance'],
  [/^scripts\/(sentinel|validation|audit|contracts)\//, 'governance'],
  [/^scripts\/(settings|config|constants)\//, 'settings-config'],
  [/^scripts\/(data|registries)\//, 'data-registries'],
  [/^scripts\/engine\/registries\//, 'data-registries'],
  [/^scripts\/(migration|migrations|maintenance)\//, 'migration'],
  [/^scripts\/patches\//, 'compat-patches'],
  [/^scripts\/(dev|debug|build|tools|validate|verify|audit)\//, 'dev-tooling'],
  [/^scripts\/[^/]*\.(sh|mjs)$|^scripts\/(validate|verify)-/, 'dev-tooling'],
  [/^scripts\/(sheets|ui|apps|dialogs|components|applications|theme|visual|canvas-ui|scene-controls|drag-drop|gm-tools)\//, 'ui-shell'],
  [/^scripts\/engine\/(visuals|assets)\//, 'ui-shell'],
  [/^scripts\/(core|infrastructure|utils|helpers|bootstrap|state|services|adapters|engine\/shared)\//, 'infrastructure'],
  [/^scripts\/load-templates\.js$|^scripts\/theme-loader\.js$/, 'infrastructure'],
  [/^packs\//, 'compendium-packs'],
  [/^lang\//, 'localization'],
  [/^schemas\//, 'data-registries'],
];

// Vocabulary rules: applied to the path (lower-cased) when no directory rule
// gives a mechanical/feature owner, and for templates/styles/data/assets/docs.
const SEP = '(?:^|[/_.\\-])';
const END = '(?:[/_.\\-]|$|s[/_.\\-]|s$)';
export const KEYWORD_RULES = [
  [new RegExp(`${SEP}(force|forcepower|dark-?side|sith-alchemy|lightsaber-form|force-tradition)`), 'force'],
  [new RegExp(`${SEP}droids?${END}|${SEP}droid`), 'droids'],
  [new RegExp(`${SEP}(vehicles?|starships?|ships?|garage|shipyard|crew|maneuvers?)${END}|starship|vehicle`), 'vehicles'],
  [new RegExp(`${SEP}(store|shop|purchase|transaction|credits?|trade|ti-?\\d|transaction-integrity)`), 'store-economy'],
  [new RegExp(`${SEP}(npcs?|followers?|minions?|nonheroic|beasts?|allies|ally)${END}|nonheroic|follower`), 'npc-followers'],
  [new RegExp(`${SEP}(mentor|suggestion|survey|archetype|dialogue)`), 'mentor-suggestion'],
  [new RegExp(`${SEP}(galactic|generation|factions?|planets?|locations?|ship-names)`), 'galactic-profiles'],
  [new RegExp(`${SEP}(holonet|notifications?|badges?)`), 'holonet'],
  [new RegExp(`${SEP}(games?|wagers?|sabacc|pazaak|holopad-games)${END}`), 'games'],
  [new RegExp(`${SEP}(house-?rules?)`), 'houserules'],
  [new RegExp(`${SEP}(talents?|talent-tree)`), 'talents'],
  [new RegExp(`${SEP}feats?${END}|${SEP}feat-`), 'feats'],
  [new RegExp(`${SEP}(species|anatomy)`), 'species'],
  [new RegExp(`${SEP}(skills?|skill-challenge)`), 'skills'],
  [new RegExp(`${SEP}(class|classes|prestige)${END}|class-`), 'classes'],
  [new RegExp(`${SEP}(progression|chargen|level-?up|backgrounds?)`), 'progression'],
  [new RegExp(`${SEP}(customization|upgrades?|modifications?|mods|crafting|implants?|cybernetic|workbench|lightsaber)`), 'customization'],
  [new RegExp(`${SEP}(weapons?|armor|equipment|gear|inventory|encumbrance|items?|blasters?)${END}`), 'equipment'],
  [new RegExp(`${SEP}(combat|damage|attacks?|conditions?|initiative|actions?|reactions?|poison|hazards?|grapple|flank)`), 'combat'],
  [new RegExp(`${SEP}(abilit(y|ies)|modifiers?|effects?)${END}`), 'abilities-effects'],
  [new RegExp(`${SEP}(rolls?|dice)${END}`), 'rolls'],
  [new RegExp(`${SEP}chat`), 'chat'],
  [new RegExp(`${SEP}(sentinel|governance|enforcement|integrity)`), 'governance'],
  [new RegExp(`${SEP}(migrations?|migrate)`), 'migration'],
  [new RegExp(`${SEP}(hotfix|patches)`), 'compat-patches'],
  [new RegExp(`${SEP}(actor|derived|actor-engine|hp)${END}`), 'actor-core'],
  [new RegExp(`${SEP}(settings|config|constants|feature-flags)`), 'settings-config'],
  [new RegExp(`${SEP}(sheets?|shell|holopad|theme|ui|dialogs?|apps?|v2-concept|panels?|partials?|datapad)${END}`), 'ui-shell'],
  [new RegExp(`${SEP}(registry|registries|compendium|canonical)`), 'data-registries'],
];

export function keywordDomain(p) {
  const s = p.toLowerCase();
  for (const [re, d] of KEYWORD_RULES) if (re.test(s)) return d;
  return null;
}

const TOP_FALLBACK = {
  scripts: 'infrastructure', templates: 'ui-shell', styles: 'ui-shell', data: 'data-registries',
  tests: 'testing', tools: 'dev-tooling', docs: 'documentation', assets: 'assets', packs: 'compendium-packs',
  lang: 'localization', reference: 'documentation', build: 'dev-tooling', helpers: 'dev-tooling',
  schemas: 'data-registries', Config: 'settings-config', 'design-docs': 'documentation', '.github': 'repo-config',
};

/** Returns {domain, basis}. tests/tools are refined later by import-majority. */
export function classifyDomain(p) {
  for (const [re, d] of PATH_RULES) if (re.test(p)) {
    // generic runtime dirs: let vocabulary refine (e.g. scripts/apps/store-* files, scripts/utils/force-*)
    if (['ui-shell', 'infrastructure', 'data-registries', 'settings-config', 'governance', 'dev-tooling'].includes(d) && p.startsWith('scripts/')) {
      const k = keywordDomain(p.split('/').slice(1).join('/'));
      if (k && DOMAINS[k].kind !== 'infrastructure' && DOMAINS[k].kind !== 'presentation' && d !== 'dev-tooling' && d !== 'governance') {
        return { domain: k, basis: 'keyword', directoryDomain: d };
      }
    }
    return { domain: d, basis: 'path-rule' };
  }
  const top = p.includes('/') ? p.split('/')[0] : '(root)';
  const k = keywordDomain(p.split('/').slice(1).join('/') || p);
  if (k && !['tests', 'tools'].includes(top)) return { domain: k, basis: 'keyword', directoryDomain: TOP_FALLBACK[top] || null };
  if (top === '(root)') {
    if (/\.md$|LICENSE/i.test(p)) return { domain: 'documentation', basis: 'fallback' };
    return { domain: 'repo-config', basis: 'fallback' };
  }
  return { domain: TOP_FALLBACK[top] || 'infrastructure', basis: 'fallback', keywordHint: k };
}

/** Architectural role from conventions + measured facts (refined in build). */
export function inferRole(p, facts = {}) {
  const s = p.toLowerCase();
  const base = s.split('/').pop();
  if (s.startsWith('tests/')) return 'test';
  if (s.startsWith('tools/') || s.startsWith('scripts/dev/') || s.startsWith('scripts/build/') || s.startsWith('build/') || s.startsWith('helpers/')) return 'tool';
  if (s.startsWith('scripts/debug/')) return 'diagnostic';
  if (s.startsWith('docs/') || s.startsWith('reference/') || s.startsWith('design-docs/') || /\.md$/.test(s)) return 'evidence-or-doc';
  if (s.startsWith('packs/')) return 'compendium-source';
  if (s.startsWith('lang/')) return 'localization';
  if (s.startsWith('assets/') || /\.(png|webp|jpe?g|svg|gif|ttf|otf|woff2?|mp3|ogg|wav|webm|mp4)$/.test(s)) return 'asset';
  if (s.startsWith('templates/') || s.endsWith('.hbs') || s.endsWith('.html')) return 'presentation-template';
  if (s.endsWith('.css')) return 'presentation-style';
  if (s.startsWith('data/audits/') || s.includes('/audits/')) return 'evidence-data';
  if (s.startsWith('data/') || s.startsWith('schemas/') || s.endsWith('.json') || s.endsWith('.ndjson') || s.endsWith('.csv')) return 'data';
  if (s.startsWith('.github/') || base === 'system.json' || base === 'template.json' || base.startsWith('.')) return 'configuration';
  if (!/\.(m?js|ts)$/.test(s)) return 'other';
  if (s.startsWith('scripts/patches/') || /hotfix|-patch\b|shim/.test(base)) return 'compat-patch';
  if (s.includes('/migration') || /migrat/.test(base)) return 'migration';
  if (/(^|[-_])adapter|bridge/.test(base)) return 'adapter';
  if (/registry|catalog/.test(base)) return 'registry';
  if (/normaliz|resolver|mapper/.test(base)) return 'normalizer';
  if (s.startsWith('scripts/sheets/') || s.startsWith('scripts/ui/') || s.startsWith('scripts/apps/') || /dialog|sheet|-app\.js$|controller|panel|view|render/.test(base)) {
    return facts.stateWrites > 0 ? 'presentation-with-writes' : 'presentation';
  }
  if (/hooks?\.js$|init\.js$|index\.js$|wiring|bootstrap/.test(base)) return 'composition-wiring';
  if (/engine|service|manager|authority|ledger|calculator|rule|resolver/i.test(base)) return facts.stateWrites > 0 ? 'authority-or-orchestrator' : 'engine-or-service';
  return facts.stateWrites > 0 ? 'module-with-writes' : 'module';
}

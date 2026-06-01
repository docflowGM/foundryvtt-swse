/* Vehicle Sheet v2 — content sections.
   Sections 02..13 inserted into #content-host on load. */

const SECTIONS_HTML = String.raw`

<!-- ===================================================================
     02 — Existing Repo Inventory
     =================================================================== -->
<section class="s" id="s2">
  <h2><span class="num">02</span>Existing Repo Inventory</h2>
  <p class="sub">// what's already in foundryvtt-swse that v2 must respect or replace</p>

  <p>v2 is not greenfield. The system already ships a v1 vehicle sheet, a vehicle data model, a substantial engine layer for vehicle combat, and a populated set of compendium packs. The redesign needs to land cleanly on top of all of it.</p>

  <h3>Sheet &amp; data layer</h3>
  <table class="t">
    <thead><tr><th>Path</th><th>Role</th><th>v2 disposition</th></tr></thead>
    <tbody>
      <tr><td>scripts/sheets/vehicle-sheet.js</td><td>v1 ApplicationV2 sheet</td><td>Replace (v2 lives in <code>sheets/v2/vehicle-sheet/</code>)</td></tr>
      <tr><td>scripts/data-models/vehicle-data-model.js</td><td>DataModel for <code>type:"vehicle"</code></td><td>Extend in place — add fields, keep shape</td></tr>
      <tr><td>scripts/actors/vehicle-actor.js</td><td>Actor subclass (prepareData, etc.)</td><td>Keep; add <code>prepareDerivedData</code> hooks for v2</td></tr>
      <tr><td>scripts/apps/customization-bay.js</td><td>Existing "Shipyard mode" entry</td><td>Becomes one of several entry points to the new router</td></tr>
    </tbody>
  </table>

  <h3>Engine layer (do not touch)</h3>
  <table class="t">
    <thead><tr><th>Path</th><th>Owns</th><th>Setting gate</th></tr></thead>
    <tbody>
      <tr><td>engine/combat/vehicle/VehicleRules.js</td><td>Houserule resolution facade</td><td>—</td></tr>
      <tr><td>engine/combat/starship/enhanced-pilot.js</td><td>Maneuver state per-round</td><td><code>enableEnhancedPilot</code></td></tr>
      <tr><td>engine/combat/starship/enhanced-engineer.js</td><td>Power allocation, repairs</td><td><code>enableEnhancedEngineer</code></td></tr>
      <tr><td>engine/combat/starship/enhanced-shields.js</td><td>Shield arc redistribution</td><td><code>enableEnhancedShields</code></td></tr>
      <tr><td>engine/combat/starship/enhanced-commander.js</td><td>Commander orders</td><td><code>enableEnhancedCommander</code></td></tr>
      <tr><td>engine/combat/starship/subsystem-engine.js</td><td>Per-subsystem damage tiers</td><td><code>enableSWES</code></td></tr>
      <tr><td>engine/combat/starship/vehicle-turn-controller.js</td><td>Phase sequencing for vehicle turns</td><td><code>enableVehicleTurnController</code></td></tr>
      <tr><td>houserules/houserule-mechanics.js</td><td>Ship-based initiative wiring (PiSWE)</td><td><code>spaceInitiativeSystem === 'shipBased'</code></td></tr>
    </tbody>
  </table>

  <h3>Compendium packs (read-only sources)</h3>
  <ul>
    <li><code>packs/vehicles-starships.db</code> — starfighters, capitals, freighters (largest pack)</li>
    <li><code>packs/vehicles-walkers.db</code> — AT-ST, AT-AT, etc.</li>
    <li><code>packs/vehicles-speeders.db</code> — landspeeders, swoops, airspeeders</li>
    <li><code>packs/vehicles-stations.db</code> — fixed platforms, defense stations</li>
    <li><code>packs/vehicles.db</code> — generic / unsorted</li>
    <li><code>packs/vehicle-weapons.db</code>, <code>packs/vehicle-weapon-ranges.db</code> — referenced but not embedded</li>
  </ul>

  <div class="callout callout--note">
    <div class="callout__label">Pack reality check</div>
    <p>Most pack entries store stat blocks in stringy fields — <code>speed</code> and <code>passengers</code> are sentences, <code>cost.new</code> is sometimes a number and sometimes "not publicly available", <code>weapons[]</code> is mostly placeholder rows pointing at sourcebook names. The importer must accept this and degrade gracefully rather than fail-hard validate. See §10.</p>
  </div>
</section>

<!-- ===================================================================
     03 — Module Boundaries
     =================================================================== -->
<section class="s" id="s3">
  <h2><span class="num">03</span>Module Boundaries</h2>
  <p class="sub">// where each piece of v2 lives, and what it is allowed to depend on</p>

  <p>v2 sits in a single feature folder. It depends on engine modules and the data model; engine modules and the data model never depend on v2.</p>

<pre><span class="c">// File layout</span>
sheets/v2/vehicle-sheet/
├── <span class="fn">vehicle-sheet.js</span>      <span class="c">// ApplicationV2 host. Owns lifecycle, registers actions.</span>
├── <span class="fn">context.js</span>             <span class="c">// Pure: actor → render context. Reads engine state.</span>
├── <span class="fn">form.js</span>                <span class="c">// updateObject + diff handling. Single write path.</span>
├── <span class="fn">crew-resolver.js</span>       <span class="c">// Contextual slot list (§06).</span>
├── <span class="fn">phase-bar.js</span>           <span class="c">// Combat phase ribbon component (§07).</span>
├── <span class="fn">piswe-bar.js</span>           <span class="c">// Ship-based initiative readout (§08).</span>
├── <span class="fn">templates/</span>
│    ├── vehicle-sheet.hbs
│    ├── partials/                <span class="c">// one partial per panel</span>
│    └── ...
└── <span class="fn">styles/</span>vehicle-sheet.css

apps/shipyard/
├── <span class="fn">shipyard-router.js</span>     <span class="c">// Single entrypoint. All callers go through here.</span>
├── <span class="fn">shipyard-app.js</span>        <span class="c">// The actual ApplicationV2 window.</span>
├── <span class="fn">importer.js</span>            <span class="c">// Compendium + drag-drop import (§10).</span>
└── <span class="fn">templates/</span>...</pre>

  <h3>Dependency rules</h3>
  <div class="grid grid--2">
    <div class="card">
      <h4>v2 sheet may import from</h4>
      <ul>
        <li><code>data-models/vehicle-data-model</code></li>
        <li><code>actors/vehicle-actor</code></li>
        <li><code>engine/combat/vehicle/VehicleRules</code></li>
        <li><code>engine/combat/starship/*</code> (read-only state queries)</li>
        <li><code>houserules/houserule-mechanics</code> (initiative role order)</li>
        <li>Shared chat / dialog utils</li>
      </ul>
    </div>
    <div class="card">
      <h4>v2 sheet must <em>never</em> import</h4>
      <ul>
        <li>v1 <code>scripts/sheets/vehicle-sheet.js</code></li>
        <li>Anything from <code>scripts/holonet/</code> or <code>scripts/scripts/</code> (legacy mirrors)</li>
        <li>Engine internals — go through the public statics on each engine class</li>
        <li>The Shipyard router (it imports the sheet for previews, not the other way)</li>
      </ul>
    </div>
  </div>

  <div class="callout callout--warn">
    <div class="callout__label">Mirror trees in repo</div>
    <p>The repo currently has <code>scripts/scripts/core/init.js</code> and <code>scripts/holonet/scripts/core/init.js</code> as duplicate mirrors of <code>scripts/core/init.js</code>. v2 must register its sheet in the canonical <code>scripts/core/init.js</code> only — do not propagate to the mirrors. A separate cleanup task should remove them.</p>
  </div>
</section>

<!-- ===================================================================
     04 — Data Model
     =================================================================== -->
<section class="s" id="s4">
  <h2><span class="num">04</span>Data Model</h2>
  <p class="sub">// extending vehicle-data-model.js without breaking v1 actors</p>

  <p>The v1 model is mostly fine. v2 adds five fields and clarifies the semantics of three existing ones. All additions are optional, default-valued, and migration-friendly.</p>

  <h3>Fields the sheet relies on (v1, kept)</h3>
  <table class="t">
    <thead><tr><th>Path</th><th>Type</th><th>Notes</th></tr></thead>
    <tbody>
      <tr><td>system.category</td><td>String</td><td>"Starfighter" | "Vehicle" | "Walker" | "Speeder" | "Station" | "Gunship" | "Mount". Drives panel visibility.</td></tr>
      <tr><td>system.size</td><td>String</td><td>SWSE size category, lowercase ("colossal (frigate)", "gargantuan", …).</td></tr>
      <tr><td>system.hull / shields</td><td>{value, max}</td><td>Existing.</td></tr>
      <tr><td>system.damageThreshold / damageReduction / armorBonus</td><td>Number</td><td>Existing; v2 surfaces them in the readout panel.</td></tr>
      <tr><td>system.weapons[]</td><td>Array</td><td>Stays as embedded array for v2. Each: {name, arc, bonus, damage, range}.</td></tr>
      <tr><td>system.crewPositions</td><td>Map</td><td>{pilot, copilot, gunner, engineer, shields, commander} → actor UUID | null. v2 layers a contextual list on top (§06) but does not break the shape.</td></tr>
      <tr><td>system.conditionTrack</td><td>{current, penalty}</td><td>Existing.</td></tr>
    </tbody>
  </table>

  <h3>Fields v2 adds</h3>
  <table class="t">
    <thead><tr><th>Path</th><th>Type</th><th>Default</th><th>Why</th></tr></thead>
    <tbody>
      <tr><td>system.stations[]</td><td>Array</td><td>[]</td><td>Optional dynamic stations beyond the fixed map (e.g. multiple gunners). Shape: <code>{id, role, label, occupant}</code>. The fixed map remains canonical for the six core roles; <code>stations[]</code> covers extras.</td></tr>
      <tr><td>system.subsystems</td><td>Object</td><td>see SWES defaults</td><td>Per-subsystem condition track for the SWES engine. Only authored when <code>enableSWES</code> is on.</td></tr>
      <tr><td>system.power</td><td>Object</td><td>balanced</td><td>EnhancedEngineer power allocation snapshot (so it persists across reloads).</td></tr>
      <tr><td>system.layout</td><td>String</td><td>"auto"</td><td>Sheet layout hint: "auto" | "starfighter" | "capital" | "ground". Author override for edge cases where category isn't enough.</td></tr>
      <tr><td>system.notes.gm / notes.crew</td><td>{html, html}</td><td>"", ""</td><td>Two scoped rich-text notes. GM note is hidden from non-owner players.</td></tr>
    </tbody>
  </table>

  <h3>Flags v2 reads/writes</h3>
  <table class="t">
    <thead><tr><th>Flag</th><th>Owner</th><th>Lifetime</th></tr></thead>
    <tbody>
      <tr><td>flags.swse.shipBasedInitiative</td><td>houserule-mechanics.js</td><td>Per-combatant; set by preCreateCombatant hook</td></tr>
      <tr><td>flags.swse.turnState</td><td>VehicleTurnController</td><td>Per-vehicle, per-encounter; cleared on turn end</td></tr>
      <tr><td>flags.swse.maneuver</td><td>EnhancedPilot</td><td>Per-round; reset on turn start</td></tr>
      <tr><td>flags.swse.shieldDist</td><td>EnhancedShields</td><td>Persistent; survives reloads</td></tr>
      <tr><td>flags.swse.v2Migrated</td><td>v2 sheet</td><td>Set once after migration runs</td></tr>
    </tbody>
  </table>

  <div class="callout callout--decide">
    <div class="callout__label">Decision</div>
    <p><strong>Single sheet, conditional panels.</strong> The category split question (Q3) resolves to: one Application class, one template, panels rendered or hidden based on <code>system.category</code> and <code>system.layout</code>. Avoids subclass sprawl; matches how compendium entries already cross categories ("Vehicle" appears for both freighters and Star Destroyers).</p>
  </div>
</section>

<!-- ===================================================================
     05 — UI Layout
     =================================================================== -->
<section class="s" id="s5">
  <h2><span class="num">05</span>UI Layout</h2>
  <p class="sub">// the sheet itself, in three columns and four rows</p>

  <p>The sheet is laid out as a three-column grid with a header strip on top and a tab strip at the bottom. The middle column is the operational core; flanks hold contextual data.</p>

<div class="wire"><span class="gr">┌──────────────────────────────────────────────────────────────────────┐</span>
<span class="gr">│</span> <span class="hl">[img]</span>  <span class="hl">VENATOR-CLASS STAR DESTROYER</span>          <span class="am">Cap Ship · Colossal</span>  <span class="gr">│</span>
<span class="gr">│         </span><span class="gr">cat: Vehicle  ·  size: large(*)  ·  pilot lvl: off</span>     <span class="gr">[edit]│</span>
<span class="gr">├──────────────┬──────────────────────────────────┬──────────────────┤</span>
<span class="gr">│  </span><span class="hl">DEFENSES</span>   <span class="gr">│  </span><span class="hl">CREW STATIONS</span>                  <span class="gr">│  </span><span class="hl">WEAPONS</span>         <span class="gr">│</span>
<span class="gr">│   Ref  14    │   ► Pilot      Anakin S.       │   Heavy Turbo    │</span>
<span class="gr">│   Fort 52    │     Copilot    —                │     +11 / 1d10   │</span>
<span class="gr">│   FF   13    │     Gunner #1  Rex             │   Medium Turbo   │</span>
<span class="gr">│   DT   252   │     Gunner #2  Echo            │     +5  / 1d10   │</span>
<span class="gr">│   DR   20    │     Engineer   —    [add]       │   Pt-Def Laser   │</span>
<span class="gr">│   Hull 1/1   │     Shields    —                │     +13 / 1d10   │</span>
<span class="gr">│   Shld 0/0   │     Commander  Yularen          │   Tractor Beam   │</span>
<span class="gr">│              │                                  │     +9  / 1d10   │</span>
<span class="gr">├──────────────┴──────────────────────────────────┴──────────────────┤</span>
<span class="gr">│  </span><span class="mn">PHASE BAR</span><span class="gr">  </span><span class="gr">[</span>Cmdr<span class="gr">][</span>Pilot<span class="gr">][</span>Eng<span class="gr">][</span>Shld<span class="gr">][</span><span class="hl">Gun</span><span class="gr">][</span>Clean<span class="gr">]   </span><span class="am">Turn 4</span>   <span class="gr">│</span>
<span class="gr">├──────────────────────────────────┬──────────────────────────────────┤</span>
<span class="gr">│  </span><span class="hl">POWER ALLOC</span> <span class="gr">(Eng on)</span>          <span class="gr">│  </span><span class="hl">SUBSYSTEMS</span> <span class="gr">(SWES on)</span>           <span class="gr">│</span>
<span class="gr">│   Wpns ▓▓▓░░  Boosted             │   Engines     ▓▓▓░  Damaged      │</span>
<span class="gr">│   Shld ▓▓░░░  Reduced             │   Weapons     ▓▓▓▓  Nominal      │</span>
<span class="gr">│   Eng  ▓▓░░░  Reduced             │   Shields     ▓░░░  Crippled     │</span>
<span class="gr">│   ─── budget 6/6 ───              │   Sensors     ▓▓▓▓  Nominal      │</span>
<span class="gr">├──────────────────────────────────┴──────────────────────────────────┤</span>
<span class="gr">│  [</span><span class="hl">Overview</span><span class="gr">]  [Cargo &amp; Travel]  [Notes]  [GM Notes]  [Houserules] │</span>
<span class="gr">└──────────────────────────────────────────────────────────────────────┘</span></div>

  <h3>Column responsibilities</h3>
  <div class="grid grid--3">
    <div class="card">
      <h4>Left · Defenses</h4>
      <p>Read-only readout. Ref/Fort/FF, DT, DR, Armor, Hull, Shields. Click any to roll a defense check (uses pilot's level if <code>usePilotLevel</code> is set, otherwise vehicle BAB).</p>
    </div>
    <div class="card">
      <h4>Center · Crew &amp; Phases</h4>
      <p>The contextual station list (§06) sits above a phase bar (§07). When PiSWE is on, the phase bar adds an initiative-order ribbon (§08).</p>
    </div>
    <div class="card">
      <h4>Right · Weapons</h4>
      <p>One row per <code>system.weapons[i]</code>. Click attacks; the active gunner is the one whose station the weapon is bound to (or pilot fallback for forward-arc starfighters).</p>
    </div>
  </div>

  <h3>Conditional panels</h3>
  <table class="t">
    <thead><tr><th>Panel</th><th>Shows when</th><th>Hidden when</th></tr></thead>
    <tbody>
      <tr><td>Power Alloc</td><td><code>VehicleRules.enhancedEngineerEnabled()</code></td><td>setting off</td></tr>
      <tr><td>Subsystems</td><td><code>VehicleRules.swesEnabled()</code></td><td>setting off</td></tr>
      <tr><td>Maneuver chip on phase bar</td><td><code>enableEnhancedPilot</code></td><td>setting off</td></tr>
      <tr><td>Shield arc widget</td><td><code>enableEnhancedShields</code> AND <code>shields.max &gt; 0</code></td><td>otherwise</td></tr>
      <tr><td>Commander orders panel</td><td><code>enableEnhancedCommander</code> AND commander slot filled</td><td>otherwise</td></tr>
      <tr><td>PiSWE initiative ribbon</td><td><code>spaceInitiativeSystem === 'shipBased'</code></td><td>"individual"</td></tr>
    </tbody>
  </table>

  <h3>Edit affordance</h3>
  <p>The header's <code>[edit]</code> toggle flips the sheet into authoring mode: stats become input fields, weapons gain a <code>+ Add</code> row, crew slots become dropdowns. This is the same view the Shipyard renders when previewing a draft (§09) — keep one template, two states.</p>
</section>

<!-- ===================================================================
     06 — Crew & Skill Resolution
     =================================================================== -->
<section class="s" id="s6">
  <h2><span class="num">06</span>Crew &amp; Skill Resolution</h2>
  <p class="sub">// pilot is mandatory; everything else is contextual</p>

  <p>v1 stores six fixed crew slots in <code>system.crewPositions</code>. v2 keeps that map (so existing actors round-trip) but adds <code>crew-resolver.js</code> that produces the actual list of stations the sheet should show, given the vehicle's loadout and the world's houserule settings.</p>

  <h3>Resolution algorithm</h3>
<pre><span class="c">// crew-resolver.js — pure function, no side effects</span>
<span class="k">export function</span> <span class="fn">resolveStations</span>(<span class="n">vehicle</span>) {
  <span class="k">const</span> <span class="n">out</span> = [];

  <span class="c">// 1. Pilot is always required.</span>
  <span class="n">out</span>.push({ <span class="n">id</span>: <span class="s">'pilot'</span>, <span class="n">role</span>: <span class="s">'pilot'</span>, <span class="n">required</span>: <span class="k">true</span> });

  <span class="c">// 2. Copilot when the actor is sized large or above.</span>
  <span class="k">if</span> (<span class="fn">isLarge</span>(<span class="n">vehicle</span>) || <span class="n">vehicle</span>.<span class="n">system</span>.<span class="n">crew</span>.<span class="fn">parsedMin</span>() &gt;= <span class="n">2</span>)
    <span class="n">out</span>.push({ <span class="n">id</span>: <span class="s">'copilot'</span>, <span class="n">role</span>: <span class="s">'copilot'</span> });

  <span class="c">// 3. Gunner per weapon entry, OR a single gunner for fixed-forward</span>
  <span class="c">//    starfighters where the pilot fires.</span>
  <span class="k">const</span> <span class="n">weapons</span> = <span class="n">vehicle</span>.<span class="n">system</span>.<span class="n">weapons</span> ?? [];
  <span class="k">if</span> (<span class="n">weapons</span>.<span class="n">length</span>) {
    <span class="k">if</span> (<span class="fn">isStarfighter</span>(<span class="n">vehicle</span>) &amp;&amp; <span class="n">weapons</span>.<span class="n">length</span> === <span class="n">1</span>) {
      <span class="c">// pilot doubles as gunner — no separate slot</span>
    } <span class="k">else</span> {
      <span class="n">weapons</span>.<span class="fn">forEach</span>((<span class="n">w</span>, <span class="n">i</span>) =&gt; <span class="n">out</span>.<span class="fn">push</span>({
        <span class="n">id</span>: <span class="s">'gunner-'</span> + <span class="n">i</span>,
        <span class="n">role</span>: <span class="s">'gunner'</span>,
        <span class="n">label</span>: <span class="n">w</span>.<span class="n">name</span>,
        <span class="n">weaponIndex</span>: <span class="n">i</span>,
      }));
    }
  }

  <span class="c">// 4. Shield op only if there are shields to operate.</span>
  <span class="k">if</span> ((<span class="n">vehicle</span>.<span class="n">system</span>.<span class="n">shields</span>?.<span class="n">max</span> ?? <span class="n">0</span>) &gt; <span class="n">0</span>)
    <span class="n">out</span>.<span class="fn">push</span>({ <span class="n">id</span>: <span class="s">'shields'</span>, <span class="n">role</span>: <span class="s">'shields'</span> });

  <span class="c">// 5. Engineer when SWES or EnhancedEngineer is on, OR vehicle is</span>
  <span class="c">//    capital-sized (someone has to keep the lights on).</span>
  <span class="k">if</span> (<span class="n">VehicleRules</span>.<span class="fn">swesEnabled</span>() ||
      <span class="n">VehicleRules</span>.<span class="fn">enhancedEngineerEnabled</span>() ||
      <span class="fn">isCapital</span>(<span class="n">vehicle</span>))
    <span class="n">out</span>.<span class="fn">push</span>({ <span class="n">id</span>: <span class="s">'engineer'</span>, <span class="n">role</span>: <span class="s">'engineer'</span> });

  <span class="c">// 6. Commander when EnhancedCommander is on AND vehicle has crew &gt;= 3.</span>
  <span class="k">if</span> (<span class="n">VehicleRules</span>.<span class="fn">enhancedCommanderEnabled</span>() &amp;&amp; <span class="fn">parsedCrew</span>(<span class="n">vehicle</span>) &gt;= <span class="n">3</span>)
    <span class="n">out</span>.<span class="fn">push</span>({ <span class="n">id</span>: <span class="s">'commander'</span>, <span class="n">role</span>: <span class="s">'commander'</span> });

  <span class="c">// 7. Author-defined extras from system.stations[].</span>
  <span class="k">for</span> (<span class="k">const</span> <span class="n">s</span> <span class="k">of</span> <span class="n">vehicle</span>.<span class="n">system</span>.<span class="n">stations</span> ?? [])
    <span class="n">out</span>.<span class="fn">push</span>(<span class="n">s</span>);

  <span class="k">return</span> <span class="n">out</span>;
}</pre>

  <h3>Skill resolution from station to roller</h3>
  <p>When the sheet calls for a check from a station, the roll is made by the <em>occupant</em>, not the vehicle. The pipeline:</p>

  <div class="flow">
    <div class="flow__node"><b>Station</b><small>e.g. "gunner-2 → Heavy Turbolaser"</small></div>
    <div class="flow__arrow">→</div>
    <div class="flow__node"><b>Occupant</b><small>Actor referenced in <code>crewPositions</code> or <code>stations[]</code></small></div>
    <div class="flow__arrow">→</div>
    <div class="flow__node"><b>Skill / BAB</b><small>Pilot, Mechanics, Use Computer, Initiative — or fallback to vehicle BAB + crew quality</small></div>
    <div class="flow__arrow">→</div>
    <div class="flow__node"><b>Engine modifier</b><small>EnhancedPilot maneuver, EnhancedEngineer power, EnhancedCommander order</small></div>
    <div class="flow__arrow">→</div>
    <div class="flow__node"><b>Roll</b><small>Through standard SWSEChat dispatcher</small></div>
  </div>

  <p>If a station has no occupant, the roll falls back to the vehicle's <code>crewQuality</code> table (untrained / normal / skilled / expert) — same path v1 uses today.</p>

  <h4>Skill-by-role table</h4>
  <table class="t">
    <thead><tr><th>Role</th><th>Primary skill</th><th>Secondary</th><th>Notes</th></tr></thead>
    <tbody>
      <tr><td>pilot</td><td>Pilot</td><td>—</td><td>Maneuver checks, all-out movement</td></tr>
      <tr><td>copilot</td><td>Pilot</td><td>Use Computer</td><td>Aid Another on Pilot checks</td></tr>
      <tr><td>gunner-N</td><td>weapon proficiency</td><td>—</td><td>Pilot fires forward-arc fixed weapons in starfighters</td></tr>
      <tr><td>shields</td><td>Mechanics</td><td>Use Computer</td><td>Redistribute / regen</td></tr>
      <tr><td>engineer</td><td>Mechanics</td><td>—</td><td>Power alloc, repair, emergency patch</td></tr>
      <tr><td>commander</td><td>Knowledge (Tactics)</td><td>Persuasion</td><td>Issue orders to crew</td></tr>
    </tbody>
  </table>

  <div class="callout callout--note">
    <div class="callout__label">Talents &amp; feats that piggyback</div>
    <p>Vehicle-related feats and talents (Vehicular Combat, Starship Tactics, Squadron Maneuvers, Wingman, etc.) are already resolved on the occupant's character sheet. v2 doesn't recompute them — it consumes the occupant's prepared data and trusts it. The vehicle sheet is a viewport, not an alternate ruleset.</p>
  </div>
</section>

<!-- ===================================================================
     07 — Combat UI
     =================================================================== -->
<section class="s" id="s7">
  <h2><span class="num">07</span>Combat UI</h2>
  <p class="sub">// the active turn becomes a phase ribbon with inline actions</p>

  <p>Q6 was left to discretion. The right depth is <strong>inline action buttons on the sheet, plus a phase ribbon that the GM and the active crew can both read</strong>. No floating HUD, no canvas-anchored radial — those add scope and split the source of truth on what's "current".</p>

  <h3>Phase ribbon</h3>
  <p>One row across the sheet's middle, six tiles. Pulled directly from <code>VehicleTurnController.PHASES</code> so the source of truth stays in the engine.</p>

  <div class="phases">
    <div class="ph"><span class="step">1</span>Commander</div>
    <div class="ph"><span class="step">2</span>Pilot</div>
    <div class="ph"><span class="step">3</span>Engineer</div>
    <div class="ph"><span class="step">4</span>Shields</div>
    <div class="ph is-active"><span class="step">5</span>Gunner</div>
    <div class="ph"><span class="step">6</span>Cleanup</div>
  </div>
  <p style="font-size: 12px; color: var(--paper-faint); margin-top: 4px;">Phase tiles are clickable for the GM (jump to phase) and informational for players (read-only highlight on the active phase).</p>

  <h3>Inline actions per phase</h3>
  <table class="t">
    <thead><tr><th>Phase</th><th>Action surface</th><th>Resolved by</th></tr></thead>
    <tbody>
      <tr><td>Commander</td><td>Order picker (dropdown of EnhancedCommander.ORDERS) + target multi-select</td><td>EnhancedCommander.applyOrder</td></tr>
      <tr><td>Pilot</td><td>Maneuver chip cycle: Standard → Evasive → Attack Run → All-Out → Trick</td><td>EnhancedPilot.setManeuver</td></tr>
      <tr><td>Engineer</td><td>3-bar power slider (weapons / shields / engines) + repair button</td><td>EnhancedEngineer.allocate / repair</td></tr>
      <tr><td>Shields</td><td>Arc rosette (fore / aft / port / starboard) + redistribute</td><td>EnhancedShields.redistribute</td></tr>
      <tr><td>Gunner</td><td>Per-weapon "Fire" button + arc badge + bonus preview</td><td>standard attack pipeline + EnhancedEngineer.weapons modifiers</td></tr>
      <tr><td>Cleanup</td><td>"End turn" button only — no per-action UI</td><td>VehicleTurnController.advancePhase</td></tr>
    </tbody>
  </table>

  <h3>What the sheet is allowed to write</h3>
  <p>The sheet only writes through these engine entry points. It never mutates flags directly:</p>
  <ul>
    <li><code>EnhancedPilot.setManeuver(vehicle, key)</code></li>
    <li><code>EnhancedEngineer.allocate(vehicle, {weapons, shields, engines})</code></li>
    <li><code>EnhancedShields.redistribute(vehicle, arcMap)</code></li>
    <li><code>EnhancedCommander.issueOrder(vehicle, orderKey, targetIds)</code></li>
    <li><code>VehicleTurnController.advancePhase(vehicle)</code> / <code>setPhase(vehicle, phase)</code></li>
    <li><code>SubsystemEngine.applyDamage(vehicle, system, tier)</code> — only from the GM-side damage entry, not players</li>
  </ul>

  <div class="callout callout--win">
    <div class="callout__label">Why this depth</div>
    <p>The engines already carry all the rules; the sheet's job is to make their state legible and trigger them in one click. A separate HUD overlay would mean two surfaces telling the player different things on a stale frame. One sheet, one truth.</p>
  </div>
</section>

<!-- ===================================================================
     08 — PiSWE Initiative
     =================================================================== -->
<section class="s" id="s8">
  <h2><span class="num">08</span>PiSWE Initiative</h2>
  <p class="sub">// Pilot · Shields · Weapons · Engineering · Everyone Else</p>

  <p>"PiSWE" is the houserule preset for ship-based initiative — initiative is rolled once for the ship, and the ship's crew acts in role priority order rather than rolling individually. The order is configurable via the <code>initiativeRolePriority</code> setting; the default ships as:</p>

  <pre><span class="c">// houserule-settings.js (default)</span>
<span class="k">default</span>: [<span class="s">'pilot'</span>, <span class="s">'shields'</span>, <span class="s">'weapons'</span>, <span class="s">'engineering'</span>, <span class="s">'other'</span>]</pre>

  <h3>What v2 surfaces</h3>
  <p>When <code>spaceInitiativeSystem === 'shipBased'</code>, the sheet renders a thin ribbon above the phase bar showing the ship's initiative roll, the current crew slot acting, and the role queue:</p>

  <div class="wire"><span class="gr">┌─────────────────────────────────────────────────────────────────────┐</span>
<span class="gr">│  </span><span class="am">SHIP INIT  21</span>     <span class="hl">▸ PILOT (Anakin)</span>  →  Shields  →  Weapons  →  …  <span class="gr">│</span>
<span class="gr">└─────────────────────────────────────────────────────────────────────┘</span></div>

  <p>The ribbon is read-only on player sheets and clickable for the GM (advance to next role; manually skip an empty slot). It pulls its order from <code>HouserulesData.getRolePriorityOrder()</code> rather than hardcoding, so a GM-customized ordering propagates without a sheet change.</p>

  <h3>Mapping role buckets → stations</h3>
  <table class="t">
    <thead><tr><th>Role bucket</th><th>Includes stations</th><th>Acts as</th></tr></thead>
    <tbody>
      <tr><td>pilot</td><td>pilot, copilot</td><td>One init slot (copilot acts on pilot's beat as Aid Another)</td></tr>
      <tr><td>shields</td><td>shields</td><td>One slot</td></tr>
      <tr><td>weapons</td><td>gunner-N (each)</td><td>Each gunner gets a slot if <code>weaponsOperatorsRollInit</code> is true; otherwise one collective slot</td></tr>
      <tr><td>engineering</td><td>engineer</td><td>One slot</td></tr>
      <tr><td>other</td><td>commander, custom stations[]</td><td>One slot per occupant</td></tr>
    </tbody>
  </table>

  <h3>Interaction with the phase bar</h3>
  <p>PiSWE order and the VehicleTurnController phase order are different concerns. PiSWE governs <em>when in the round</em> the ship's role acts; the turn controller governs <em>within the ship's turn</em>, which crew member's phase is currently active.</p>
  <ul>
    <li>If <strong>PiSWE off</strong> + <strong>turn controller on</strong>: ship rolls one init, then on its turn cycles through Commander → Pilot → Engineer → Shields → Gunner → Cleanup.</li>
    <li>If <strong>PiSWE on</strong> + <strong>turn controller off</strong>: each role bucket gets its own initiative slot in the round; no phase ribbon, just per-role action when their bucket comes up.</li>
    <li>If <strong>both on</strong>: PiSWE drives initiative ordering across <em>combatants</em>; the phase bar collapses to highlight only the phase matching the role currently active. (When PiSWE is at "shields", the phase bar's Shields tile is the only highlit one.)</li>
  </ul>

  <div class="callout callout--decide">
    <div class="callout__label">Decision</div>
    <p>The phase bar component takes a <code>mode</code> prop: <code>'sequence'</code> (cycles all six in order) or <code>'piswe'</code> (highlights only the current PiSWE role's matching phase). The sheet picks the mode at render time based on the two settings. Engines stay agnostic.</p>
  </div>
</section>

<!-- ===================================================================
     09 — Shipyard Router
     =================================================================== -->
<section class="s" id="s9">
  <h2><span class="num">09</span>Shipyard Router</h2>
  <p class="sub">// one entrypoint, every caller delegates</p>

  <p>Q1 was answered <strong>"All of the above (delegated to one router)"</strong>. The four current entry points each call the same function, so adding a fifth caller later is a one-liner.</p>

<pre><span class="c">// apps/shipyard/shipyard-router.js</span>
<span class="k">export const</span> <span class="n">Shipyard</span> = {
  <span class="c">/** Open Shipyard for a specific vehicle actor (edit mode). */</span>
  <span class="fn">openForActor</span>(<span class="n">actor</span>, <span class="n">opts</span> = {}) { … },

  <span class="c">/** Open empty Shipyard with category preselected (create mode). */</span>
  <span class="fn">openCreate</span>({ <span class="n">category</span>, <span class="n">preset</span>, <span class="n">folder</span> } = {}) { … },

  <span class="c">/** Open with a compendium pack pre-filtered (browse mode). */</span>
  <span class="fn">openBrowse</span>(<span class="n">packName</span>) { … },
};</pre>

  <h3>Caller table</h3>
  <table class="t">
    <thead><tr><th>Caller</th><th>Calls</th><th>Where it lives</th></tr></thead>
    <tbody>
      <tr><td>GM Datapad — Scene Control row</td><td><code>Shipyard.openCreate()</code></td><td>apps/gm-datapad.js</td></tr>
      <tr><td>Datapad shell — Home Surface tile</td><td><code>Shipyard.openCreate()</code></td><td>Home Surface.html (player-visible)</td></tr>
      <tr><td>Actor Directory — header button</td><td><code>Shipyard.openCreate({ folder: directory.currentFolder })</code></td><td>Hook on <code>renderActorDirectory</code></td></tr>
      <tr><td>CustomizationBayApp — "Shipyard" mode tab</td><td><code>Shipyard.openForActor(this.actor)</code></td><td>apps/customization-bay.js</td></tr>
      <tr><td>v2 vehicle sheet — header [edit] in author mode</td><td><code>Shipyard.openForActor(this.actor)</code></td><td>sheets/v2/vehicle-sheet/vehicle-sheet.js</td></tr>
    </tbody>
  </table>

  <h3>Shipyard window structure</h3>

<div class="wire"><span class="gr">┌─ SHIPYARD ──────────────────────────────────────────────────────────┐</span>
<span class="gr">│  </span><span class="hl">[Browse]</span> <span class="gr">·</span> [Compose] <span class="gr">·</span> [Validate]              <span class="am">▢ Live preview</span><span class="gr">  │</span>
<span class="gr">├─────────────────────┬───────────────────────────────────────────────┤</span>
<span class="gr">│  </span><span class="mn">SOURCE</span>             <span class="gr">│  </span><span class="mn">DRAFT</span>                                         <span class="gr">│</span>
<span class="gr">│   ▸ Starships  47   │   <span class="hl">Y-Wing &quot;LongProbe&quot;</span>   <span class="gr">[from compendium]</span>      │</span>
<span class="gr">│     Walkers     12  │   ── stats ──                                  │</span>
<span class="gr">│     Speeders    23  │   Hull   50/50      DT  30                     │</span>
<span class="gr">│     Stations    8   │   Ref    10         DR  0                      │</span>
<span class="gr">│     Vehicles    91  │   Crew   1 (normal) Cargo 100kg                │</span>
<span class="gr">│   ── world ──       │   ── weapons ──                                │</span>
<span class="gr">│     Drag from       │   (none — add via [+])                         │</span>
<span class="gr">│     Item Directory  │   ── crew ──                                   │</span>
<span class="gr">│                     │   pilot: —     copilot: hidden (size: large)   │</span>
<span class="gr">│   <span class="hl">[+ blank]</span>           │                                                │</span>
<span class="gr">├─────────────────────┴───────────────────────────────────────────────┤</span>
<span class="gr">│   </span><span class="am">⚠ 2 warnings</span>: weapons[] empty for category=Vehicle  ·  no shields  <span class="gr">│</span>
<span class="gr">│                                                  [Cancel] [</span><span class="hl">Save</span><span class="gr">]      │</span>
<span class="gr">└─────────────────────────────────────────────────────────────────────┘</span></div>

  <h3>Three modes inside one window</h3>
  <ul>
    <li><strong>Browse</strong> — pack tree on the left, preview on the right; double-click to clone into the world.</li>
    <li><strong>Compose</strong> — start blank or fork from a compendium entry; all v2 fields editable; warnings panel on the bottom.</li>
    <li><strong>Validate</strong> — run the importer's validator on existing world actors; lists actors with parse failures, missing fields, or stale v1 data.</li>
  </ul>

  <div class="callout callout--note">
    <div class="callout__label">CustomizationBayApp lineage</div>
    <p>The existing CustomizationBayApp shipyard mode is preserved: when called via <code>Shipyard.openForActor(actor)</code> from inside CustomizationBay's tab, the router opens the Shipyard <em>embedded</em> in the bay's right pane rather than as a standalone window — same component tree, different host. The router's <code>opts.host</code> argument selects which.</p>
  </div>
</section>

<!-- ===================================================================
     10 — Compendium Importer
     =================================================================== -->
<section class="s" id="s10">
  <h2><span class="num">10</span>Compendium Importer</h2>
  <p class="sub">// pulling from packs/* and from the world Item directory</p>

  <p>Q5 limits sources to <strong>system compendia</strong> and <strong>drag-drop from the world Item directory</strong>. No JSON paste, no external file upload, no foreign-system imports for v1. Good — it keeps the surface narrow.</p>

  <h3>Source A · System compendia</h3>
  <p>The five <code>packs/vehicles-*.db</code> files are loaded as standard Foundry CompendiumCollections. The importer presents them as a tree:</p>

<pre>vehicles-starships  <span class="c">// 47 entries — starfighters, capitals, freighters</span>
vehicles-walkers    <span class="c">// 12 entries</span>
vehicles-speeders   <span class="c">// 23 entries</span>
vehicles-stations   <span class="c">// 8 entries</span>
vehicles            <span class="c">// 91 entries — generic / unsorted</span></pre>

  <h4>Per-entry pipeline</h4>
  <div class="flow">
    <div class="flow__node"><b>1. Read</b><small>pack.getDocument(id) → raw vehicle Actor</small></div>
    <div class="flow__arrow">→</div>
    <div class="flow__node"><b>2. Normalize</b><small>Stringy fields parsed: speed sentence → squares + scale; cost.new → costNumeric; crew → parsedMin</small></div>
    <div class="flow__arrow">→</div>
    <div class="flow__node"><b>3. Validate</b><small>Warnings, not failures; surface in the UI</small></div>
    <div class="flow__arrow">→</div>
    <div class="flow__node"><b>4. Stage</b><small>Render in Shipyard's draft pane</small></div>
    <div class="flow__arrow">→</div>
    <div class="flow__node"><b>5. Commit</b><small>Actor.create() into target folder</small></div>
  </div>

  <h3>Source B · World Item directory drag-drop</h3>
  <p>Drag-drop registers on the Shipyard window with a single dropzone in the source pane. Accepted payloads:</p>
  <ul>
    <li><code>type: "Actor"</code> with <code>actorType: "vehicle"</code> → clone &amp; open in compose mode</li>
    <li><code>type: "Item"</code> with <code>itemType: "vehicleWeapon"</code> → append to the draft's <code>weapons[]</code></li>
    <li><code>type: "Compendium"</code> entries → same as Source A</li>
  </ul>

  <h3>Field-level normalization rules</h3>
  <table class="t">
    <thead><tr><th>Source field</th><th>v2 target</th><th>Rule</th></tr></thead>
    <tbody>
      <tr><td>system.speed (sentence)</td><td>system.speedSquares, system.speedScale</td><td>Regex extract "Fly N squares (Scale)"; first match wins; original kept verbatim</td></tr>
      <tr><td>system.crew (sentence)</td><td>system.crewMin, system.crewQualityHint</td><td>Parse leading integer; quality hint from "(Skilled Crew Quality)" pattern</td></tr>
      <tr><td>system.cost.new ∈ {Number, "not publicly available", String}</td><td>system.costNumeric</td><td>Number passes through; "not publicly available" → null; otherwise <code>parseInt</code> with comma stripping</td></tr>
      <tr><td>system.weapons[].damage</td><td>(unchanged)</td><td>Kept as string; rendered as-is. Roller normalizes "1d10" / "1d10x2" at fire time.</td></tr>
      <tr><td>system.weapons[i] where name is a sourcebook ("Capital Ships", "Starfighters")</td><td>—</td><td>Flag as warning: "weapon row appears to be a sourcebook reference, not a weapon"</td></tr>
      <tr><td>system.size (mixed case, parenthetical)</td><td>system.sizeKey</td><td>Lowercase, strip parens → match SWSE size enum; original kept</td></tr>
    </tbody>
  </table>

  <h3>Validation tiers</h3>
  <table class="t">
    <thead><tr><th>Tier</th><th>Behavior</th><th>Examples</th></tr></thead>
    <tbody>
      <tr><td><span class="tag tag--rose">block</span></td><td>Cannot save</td><td>Missing actor name; <code>type</code> not "vehicle"</td></tr>
      <tr><td><span class="tag tag--amber">warn</span></td><td>Save allowed; warning shown</td><td>Empty weapons[]; speed sentence unparseable; cost is non-numeric string</td></tr>
      <tr><td><span class="tag tag--cyan">info</span></td><td>Surface, don't decorate</td><td>Sourcebook field empty; description missing</td></tr>
    </tbody>
  </table>

  <div class="callout callout--warn">
    <div class="callout__label">Pack data quality</div>
    <p>A spot check of <code>vehicles-starships.db</code> shows a recurring issue: many entries have <code>weapons[]</code> rows where <code>name</code> is the sourcebook ("Capital Ships", "Starfighters", "Space Transports") rather than a weapon. The importer flags these but does not auto-strip — that's an authoring decision. The Validate mode (§09) lists every world actor with this pattern so it can be cleaned in batch.</p>
  </div>
</section>

<!-- ===================================================================
     11 — Migration Plan
     =================================================================== -->
<section class="s" id="s11">
  <h2><span class="num">11</span>Migration Plan</h2>
  <p class="sub">// v1 actors must keep working from day one</p>

  <p>v2 is opt-in per actor for a release, then default-on. No destructive rewrites; one idempotent pass that adds missing fields with defaults.</p>

  <h3>Migration steps (all idempotent)</h3>
  <ol>
    <li><strong>Detect.</strong> On Actor.prepareData, if <code>type === "vehicle"</code> and <code>!flags.swse.v2Migrated</code>, mark a candidate.</li>
    <li><strong>Add fields with defaults.</strong> <code>system.stations = []</code>, <code>system.layout = "auto"</code>, <code>system.subsystems</code> (zeroed), <code>system.power</code> (balanced), <code>system.notes = {gm: "", crew: ""}</code>.</li>
    <li><strong>Normalize stringy fields.</strong> Run the importer's parsers (§10) over <code>speed</code>, <code>crew</code>, <code>cost</code>, <code>size</code>; write the new derived fields. Originals kept.</li>
    <li><strong>Stamp.</strong> Set <code>flags.swse.v2Migrated = true</code> with <code>{ version: SYSTEM_VERSION, when: Date.now() }</code>.</li>
    <li><strong>Surface failures.</strong> Anything that throws lands in a per-world report under <code>Shipyard → Validate</code>; the actor is still loaded with v1 fields.</li>
  </ol>

  <h3>Sheet rollout</h3>
  <p>The system can ship both sheets and let the world choose. Use a per-actor flag (<code>flags.swse.useV2Sheet</code>) plus a world setting (<code>defaultVehicleSheetVersion</code>):</p>
  <ul>
    <li><strong>Release N</strong>: v1 default; opt in via per-actor checkbox or by setting world default to "v2".</li>
    <li><strong>Release N+1</strong>: v2 default for new vehicles; v1 still selectable on existing actors.</li>
    <li><strong>Release N+2</strong>: v2 only; v1 sheet code archived under <code>scripts/legacy/</code>.</li>
  </ul>

  <div class="callout callout--decide">
    <div class="callout__label">Decision</div>
    <p>Ship v2 alongside v1 for one minor release. The sheet picker hook (<code>Actors.registerSheet</code>) supports multiple sheets per type with a default — use it. No big-bang switchover.</p>
  </div>
</section>

<!-- ===================================================================
     12 — Risks & Open Qs
     =================================================================== -->
<section class="s" id="s12">
  <h2><span class="num">12</span>Risks &amp; Open Questions</h2>
  <p class="sub">// what could bite, ranked by likelihood × blast radius</p>

  <div class="grid grid--2">
    <div class="card">
      <h4><span class="tag tag--rose">high</span> Engine state desync</h4>
      <p>Maneuver / power / shield-distribution flags are written by engines and read by the sheet. If a sheet listener races a hook (e.g. Foundry batches updates), the UI can show stale state. <strong>Mitigation:</strong> render purely from <code>actor.system</code> + <code>actor.flags</code> on every <code>render</code>; never cache inside the sheet class.</p>
    </div>
    <div class="card">
      <h4><span class="tag tag--rose">high</span> v1 actors with junk weapons[]</h4>
      <p>Many compendium imports left <code>weapons[]</code> rows where name is a sourcebook. Today's sheet renders them as fireable. The §10 validator flags them but doesn't strip. <strong>Mitigation:</strong> a one-shot "Clean weapon rows" macro shipped in the validate mode.</p>
    </div>
    <div class="card">
      <h4><span class="tag tag--amber">med</span> Mirror tree drift</h4>
      <p><code>scripts/scripts/</code> and <code>scripts/holonet/scripts/</code> currently mirror <code>scripts/core/init.js</code>. If v2 registration goes only into the canonical path, those mirrors will diverge silently. <strong>Mitigation:</strong> separate cleanup PR removes the mirrors before v2 lands.</p>
    </div>
    <div class="card">
      <h4><span class="tag tag--amber">med</span> Houserule combinatorics</h4>
      <p>Six independent toggles (Pilot / Engineer / Shields / Commander / SWES / TurnController) plus PiSWE on/off plus weaponsOperatorsRollInit. Sheet must look correct in every combination. <strong>Mitigation:</strong> snapshot tests for the 12 most likely combinations.</p>
    </div>
    <div class="card">
      <h4><span class="tag tag--amber">med</span> Drag-drop conflicting types</h4>
      <p>Dragging an Actor with <code>type:"character"</code> onto Shipyard should fail loudly, not silently coerce. <strong>Mitigation:</strong> drop handler validates payload type against an allowlist before staging.</p>
    </div>
    <div class="card">
      <h4><span class="tag tag--cyan">low</span> Speaker-of-actions ambiguity</h4>
      <p>When a gunner fires, who is the chat speaker — the gunner or the vehicle? Today's behavior is the vehicle. <strong>Default:</strong> keep that; add a per-message flag to attribute the roll to the gunner in the chat metadata for filtering.</p>
    </div>
  </div>

  <h3>Open questions</h3>
  <ul>
    <li><strong>Squadrons.</strong> Are multi-fighter squadrons modeled as one vehicle actor with stations[] or as a tokens group? Out of scope for v1, decide before v2 ships.</li>
    <li><strong>Carried craft.</strong> <code>system.carried_craft</code> exists in pack data but is unused. Surface it in v2 as a read-only "Hangar" panel, or defer?</li>
    <li><strong>Vehicle weapons as Items.</strong> Long-term, vehicle weapons should be embedded Items so they share the talent pipeline with character weapons. v2 does not do this. When?</li>
    <li><strong>Animations.</strong> Phase ribbon transitions: subtle slide on phase change, or hard cut? Author preference.</li>
  </ul>
</section>

<!-- ===================================================================
     13 — Implementation Checklist
     =================================================================== -->
<section class="s" id="s13">
  <h2><span class="num">13</span>Implementation Checklist</h2>
  <p class="sub">// small commits, in order, each independently shippable</p>

  <ul class="checks">
    <li class="done">Repo inventory + design doc <span class="meta">this document</span></li>
    <li class="now">Land empty <code>sheets/v2/vehicle-sheet/</code> scaffold; register as alternate sheet, default off
      <span class="meta">commit 1 — no behavior change for users</span>
    </li>
    <li>Extend <code>vehicle-data-model.js</code> with §04 fields; add migration stamp logic
      <span class="meta">commit 2 — fields visible to engines but unused</span>
    </li>
    <li>Implement <code>crew-resolver.js</code> + tests against representative pack entries
      <span class="meta">commit 3 — pure module, easy to test</span>
    </li>
    <li>Render read-only sheet (defenses, crew, weapons) using v1 data; no edit mode yet
      <span class="meta">commit 4 — sheet looks right but is play-only</span>
    </li>
    <li>Add edit mode toggle + author fields; write through <code>updateObject</code>
      <span class="meta">commit 5 — sheet can replace v1 functionally</span>
    </li>
    <li>Phase ribbon + inline action wiring (Pilot, Engineer, Shields, Commander, Gunner)
      <span class="meta">commit 6 — combat UI online when houserules on</span>
    </li>
    <li>PiSWE ribbon + mode prop on the phase bar
      <span class="meta">commit 7 — initiative integration</span>
    </li>
    <li>Shipyard router + window shell (Browse / Compose / Validate stubs)
      <span class="meta">commit 8 — entrypoint plumbing only</span>
    </li>
    <li>Compendium importer (Source A) + per-entry pipeline + validator
      <span class="meta">commit 9 — Browse mode functional</span>
    </li>
    <li>Drag-drop importer (Source B)
      <span class="meta">commit 10 — Compose mode accepts drops</span>
    </li>
    <li>Migration pass + per-actor sheet picker UI
      <span class="meta">commit 11 — opt-in v2 ready for testers</span>
    </li>
    <li>Snapshot tests for the 12 houserule combinations
      <span class="meta">commit 12 — guardrail for the long tail</span>
    </li>
    <li>Flip default to v2 for new vehicles
      <span class="meta">commit 13 — minor release boundary</span>
    </li>
    <li>Archive v1 sheet under <code>scripts/legacy/</code>; remove mirror trees
      <span class="meta">commit 14 — final, behind one more minor release</span>
    </li>
  </ul>

  <div class="callout callout--win">
    <div class="callout__label">Shape of the work</div>
    <p>Roughly a quarter's work at a steady cadence — but each commit is independently shippable, and the sheet is functionally complete by commit 7. Importer and Shipyard land after, on top of a working sheet, so they're never blocking play.</p>
  </div>
</section>

`;

// Inject content sections, then activate the side-nav scroll spy.
document.getElementById('content-host').outerHTML = SECTIONS_HTML;

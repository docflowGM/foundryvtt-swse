# Custom Talent Tree Workbench — Phase 0 Audit

## Goal

Build custom talent trees without creating a parallel talent/progression system.

Custom trees should reuse the existing progression graph, talent registry, talent-tree membership authority, tree authority, and governed actor mutation path wherever possible.

## User flow target

1. Create a custom talent tree from either:
   - the Ability tab / Talents area, or
   - the Custom Force Tradition wizard.
2. Open a graph editor that visually matches the progression talent tree graph.
3. Use a `+` node to add a talent, or drag/drop a talent from compendium later.
4. Add Talent offers:
   - From Existing Tree
   - Create Custom Talent
5. From Existing Tree:
   - choose a source talent tree,
   - choose a talent from that tree,
   - inspect prerequisites,
   - import selected talent only or the prerequisite chain plus the selected talent.
6. Create Custom Talent:
   - creates a blank editable node that can be wired into the graph.

## Existing systems to reuse

### 1. TalentStep and progression graph shell

`TalentStep` already owns the two-stage pattern we need: tree browser first, then graph view. Its file header explicitly documents tree browsing, graph visualization, legality checking, prerequisite display, and graph renderer reuse.

Important reuse points:

- `TalentTreeDB` for available tree inventory.
- `TalentRegistry` for talent inventory.
- `getAllowedTalentTrees(...)` for access control.
- `getTalentMembership(...)` for tree -> talents hydration.
- `buildDependencyGraph(...)` for prerequisite graph data.
- `renderProgressionTalentTree(...)` for graph rendering.

This means the custom workbench should not introduce a second graph renderer or its own talent-tree legality layer.

### 2. Dependency graph builder

`buildDependencyGraph(talents)` already parses talent prerequisites, builds `nodes` and `edges`, computes dependencies/dependents, and topologically assigns levels.

Reuse target:

- Existing official talents imported into a custom tree should be converted into the same talent-like shape consumed by `buildDependencyGraph(...)`.
- Custom blank talents should be stored with enough `name`, `id`, and prerequisite text/refs to participate in this graph.

Gap:

- The builder currently infers prerequisites primarily from text/name matching. For custom-tree editing, we should eventually add explicit node prerequisite ids and convert them into the same graph shape before rendering.

### 3. Progression graph renderer

`renderProgressionTalentTree(...)` already computes level positions, renders SVG nodes/links, supports focused node state, click/focus, double-click commit, hover relation highlighting, and pan/zoom persistence.

Reuse target:

- Add an editor-mode wrapper around this renderer rather than creating a new graph from scratch.
- Editor mode should pass custom node states like `custom`, `reference`, `clone`, `needs-save`, and `missing-prereq` only after a small renderer extension, not a replacement.

Gap:

- Current renderer assumes selection/commit semantics for progression. The editor needs actions such as focus, edit, remove, add child, and import chain.

### 4. TalentTreeDB

`TalentTreeDB` is the authorized SSOT for talent tree data. It loads the `foundryvtt-swse.talent_trees` compendium index, normalizes entries, indexes by id/source/stable key, and builds the inverse talent-to-tree index.

Reuse target:

- Custom tree support should extend `TalentTreeDB` with an additive custom-tree provider/overlay.
- Do not create a separate `CustomTalentTreeDB` for normal progression reads.
- Custom trees should normalize into the same tree object shape returned by `TalentTreeDB.all()`, `get()`, and `byId()`.

Gap:

- `TalentTreeDB.build()` currently resets and rebuilds from compendium and generated registries only. Custom tree overlay should be merged after official trees load, probably from actor/world/system flags or a world setting store.

### 5. TalentRegistry

`TalentRegistry` is the canonical talent inventory. It loads talents from compendium, normalizes them into stable entries, indexes by id/name/category/tag/tree, and exposes `getById`, `getByName`, `getByTree`, and `search`.

Reuse target:

- Official imported talents should remain references to `TalentRegistry` entries by id/uuid/name.
- Custom talents should be normalized into TalentRegistry-compatible entries before graph/membership code sees them.
- If actor-scoped custom talents remain actor data, create an additive custom-talent provider that returns registry-shaped entries for those nodes.

Gap:

- `TalentRegistry` currently loads only compendium talents. It has no custom overlay yet.

### 6. Talent Tree Membership Authority

`getTalentMembership(tree)` is already the additive hydration layer. It resolves members from talent-side fields, generated/fixed talent-tree registry data, registry scan, and direct tree talent refs.

Reuse target:

- Custom tree `talentRefs`/`nodes` should feed this authority instead of making the editor maintain a separate membership lookup.
- A custom tree can expose `talentIds`, `talentNames`, or a normalized `nodes` array that the authority learns to read.

Gap:

- Current direct ref resolution expects official talents in `TalentRegistry`. Custom talent nodes need registry-shaped entries or a new resolver branch.

### 7. Tree authority

`tree-authority.js` is now the correct place for access control. It already handles official Force tradition membership, custom Force tradition grants, prestige RAW vs membership-only access, and the rule that RAW prestige access sweeps only official/canon tradition trees.

Reuse target:

- Custom trees should become normal keys that `getAllowedTalentTrees(...)` can return.
- Custom Force traditions should grant custom tree ids through their existing `grantedTalentTrees` array.

Gap:

- `resolveTalentTreeKeys(...)` currently resolves against `TalentTreeDB.all()`. Once custom tree overlay is added to `TalentTreeDB`, tree authority can keep its current shape.

### 8. Governed actor mutation

The custom Force tradition wizard already uses `ActorEngine.updateActor(...)` to store custom traditions and memberships.

Reuse target:

- The custom talent tree workbench should use `ActorEngine.updateActor(...)` for actor-scoped trees.
- World-level reusable custom trees can come later as a world setting/compendium migration. Actor-scoped first is safest.

## Proposed Phase 1 architecture

### New files

```text
scripts/apps/talent-tree-workbench/custom-talent-tree-workbench.js
scripts/apps/talent-tree-workbench/custom-talent-tree-model.js
scripts/apps/talent-tree-workbench/custom-talent-tree-importer.js
styles/apps/custom-talent-tree-workbench.css
```

### Small extensions to existing files

```text
scripts/data/talent-tree-db.js
scripts/registries/talent-registry.js
scripts/engine/progression/talents/talent-tree-membership-authority.js
scripts/engine/progression/talents/tree-authority.js
scripts/apps/progression-framework/steps/talent-tree-progression-renderer.js
scripts/apps/force-tradition/custom-force-tradition-wizard.js
```

## Data contract

Store custom trees in actor data first:

```js
system.customTalentTrees = [
  {
    id: 'shattered-lens-seers',
    name: 'Shattered Lens Seers',
    description: 'Prophecy, perception, and illusion.',
    source: 'custom',
    treeType: 'force-tradition',
    grantedByTraditions: ['custom:order-of-the-shattered-lens'],
    gmApproved: true,
    nodes: [
      {
        nodeId: 'mystic-warning',
        talentId: 'mystic-warning',
        name: 'Mystic Warning',
        sourceType: 'compendium',
        uuid: 'Compendium.foundryvtt-swse.talents.Item.xxxxx',
        importMode: 'reference',
        prerequisites: [],
        x: null,
        y: null
      }
    ],
    edges: [
      { from: 'mystic-warning', to: 'foresee-disaster', type: 'prerequisite' }
    ],
    createdAt: 0,
    updatedAt: 0
  }
]
```

Mirror for compatibility:

```text
system.progression.customTalentTrees
flags.foundryvtt-swse.customTalentTrees
flags.swse.customTalentTrees
```

## Import modes

### Reference original

Store the source uuid/id and resolve the live talent from `TalentRegistry`/compendium when rendering or selecting.

### Clone into tree

Store a snapshot of name, description, prerequisites, and metadata. This remains stable if the official source changes.

### Clone and edit

Create a custom talent node with copied source data and mark it editable.

## Prerequisite import behavior

When importing a talent that depends on other talents, offer:

1. Selected talent only
2. Prerequisite chain + selected talent
3. Entire prerequisite group, later if source tree branch metadata is strong enough

Default should be option 2.

Implementation detail:

- Use `getTalentMembership(sourceTree)` to get the source tree talents.
- Use `buildDependencyGraph(sourceTalents)` to determine upstream prerequisite chain for the selected node.
- Import the upstream chain in graph order before importing the selected node.

## Drag/drop Phase 0 decision

Do not implement drag/drop first. Build the modal import path first because it can validate prerequisite chains through existing membership and graph code. Add drag/drop later as a shortcut that opens the same import dialog.

When drag/drop is added, use Foundry drop data and resolve it into the same import candidate model used by the modal path. Do not create a second drop-specific importer.

## What not to build

- Do not build a second talent registry.
- Do not build a second tree authority.
- Do not build a second graph renderer.
- Do not store custom tree state only inside the Force tradition wizard.
- Do not let RAW prestige-class universal tradition access sweep custom trees.

## Phase 1 deliverable

Build the custom talent tree model/adapter and editor shell only:

- create new custom tree
- edit name/description/type/grants
- render an empty graph surface using progression graph visual language
- show `+ Add Talent` node
- save custom tree through `ActorEngine.updateActor(...)`
- attach tree id to custom tradition if launched from tradition wizard

No prerequisite import and no drag/drop in Phase 1.

## Phase 2 deliverable

Add `From Existing Tree` modal import using `TalentTreeDB`, `getTalentMembership`, and `buildDependencyGraph`.

## Phase 3 deliverable

Add prerequisite-chain import option.

## Phase 4 deliverable

Add blank custom talent node creation and edit handoff to the existing custom talent system.

## Phase 5 deliverable

Add custom tree overlay to `TalentTreeDB`, `TalentRegistry`, and membership authority so progression talent selection reads custom trees exactly like official trees.

# Feat Tree Sort and Progression Scroll Preservation

This patch fixes two runtime UX issues in the progression framework.

## Feat tree ordering

Feat groups now preserve prerequisite-tree ordering instead of flattening the list back to raw alphabetical order during filtering.

The default order is:

1. Root/core feats alphabetized A-Z.
2. Feats that require a root feat appear indented under that root.
3. If a feat requires multiple feats in the same chain, it nests under the deepest prerequisite.

Example:

- Force Sensitivity
  - Force Boon
  - Force Training
    - Forceful Recovery

This prevents feats such as Forceful Recovery from being placed directly under Force Sensitivity when Force Training is the more specific prerequisite parent.

## Scroll preservation

ProgressionShell render scroll preservation now stores both DOM paths and stable region/class keys. This makes restoration survive the common progression render pattern where the work surface, details panel, or summary panel is re-rendered and the original DOM node path no longer points to the same scroll container.

The shell also captures scroll state before focus and commit interactions, then restores it after the immediate render and again on the next tick. This is intended to stop focus/selection renders from snapping the visible list back to the top.

## Files touched

- `scripts/apps/progression-framework/steps/feat-step.js`
- `scripts/apps/progression-framework/shell/progression-shell.js`

# Phase 9L — Threats of the Galaxy Feat Implementation Accuracy

This phase audits Threats of the Galaxy feats for implementation accuracy rather than mere presence.

Threats feats are small in count but heavy in runtime context. Most involve mounted, vehicle, or Aid Another timing where metadata alone is not equivalent to correct implementation.

## Accuracy rule

A feat is implemented correctly only when the current runtime shape matches the source behavior. A feat with good metadata but no vehicle/mount/Aid Another consumer remains implemented_partial.

## Results

- 4 feats audited
- 0 implemented_correct
- 4 implemented_partial
- 0 implemented_incorrect
- 0 not_implemented

## Implementation targets

- Vehicle/mount state tracking
- Vehicle Reflex Defense bonus consumers
- Missile/torpedo miss-margin event hooks
- Incoming attack target-redirection reactions
- Aid Another mode-specific riders
- Fear/mind-affecting immunity and next-turn cover-positioning notes

# Phase 9J — Galaxy at War Feat Implementation Accuracy

This phase audits Galaxy at War feats for implementation accuracy, not mere presence.

A feat is **implemented_correct** only when the current runtime shape matches the rule behavior. If a feat grants a new attack option, reaction, target rider, grid movement, usage limit, or temporary state but the current data only carries a flat modifier or note, it is not correct.

## Scope

- Sourcebook: Galaxy at War
- Feats audited: 47
- Review list entries: 38

## Status counts

- implemented_correct: 9
- implemented_partial: 38

## Correct implementations in this audit

- Conditioned
- Deadeye
- Fight Through Pain
- Mighty Swing
- Opportunistic Shooter
- Reactive Awareness
- Reactive Stealth
- Surgical Precision
- Triple Crit

## High-risk patterns in this book

Galaxy at War contains many tactical action feats that need more than metadata:

- post-hit forced movement
- targetEffectsOnHit state application
- area/autofire template editing
- temporary defense penalties
- damage deferral and zero-HP interception
- weapon-family property overrides
- full-attack sequence tracking
- once-per-encounter hit riders

These should be implemented through runtime hooks and prompts, not by adding flat bonuses to the actor sheet.

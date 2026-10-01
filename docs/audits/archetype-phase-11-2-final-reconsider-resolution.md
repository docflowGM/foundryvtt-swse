# Phase 11-2B6 — final Reconsider loose end

Status: **OWNER_DESIGN_PASS**. No production mutation.

`force-item` / `force_item` are recognized as spelling variants but **not retained as a shared ontology concept**.

Decision: **DELETE_DECOMPOSE**

Potential component concepts, only when supported by the canonical rule:

- `force`
- `equipment`
- `crafting`
- `empowerment`

Reason: the historical assignments are not coherent enough to define one reusable mechanic; notably the legacy data places `force_item` on Charm Beast.

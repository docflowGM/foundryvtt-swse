# Phase 4A Implant Rules Audit

The uploaded repo already had partial implant/cybernetic awareness:

- `Cybernetic Surgery` exists in the feat catalog but was explicitly punted to GM/player handling.
- `Implant Training` exists and already had metadata saying it suppresses the implant extra CT step and Will penalty, but there was no implant rule engine applying those penalties.
- Prerequisite checking already recognizes cyborg/implant style requirements.
- Equipment supports generic metadata fields such as `equipmentType`, `category`, `tags`, `properties`, `equipped`, and `integrated`, which is enough for a small implant rules implementation.

This pass fills the gap by adding a focused `ImplantRules` helper and wiring it to derived Will Defense and condition-track worsening.

Run:

```bash
node scripts/dev/audit-implant-rules.mjs --strict
```

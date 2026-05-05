# Mentor Suggestion Dialogue JSON

These files mirror the phase-indexed mentor suggestion system used by `scripts/mentor/mentor-suggestion-engine.js`.

They are intentionally separate from `data/dialogue/mentors/**`, which stores structured mentor biography/advisory dialogue in a different schema.

Files:

- `mentor-personalities.json`: mentor personality metadata used by the suggestion engine.
- `mentor-suggestion-dialogues.json`: phase-indexed attribute/feat/talent suggestion templates.

Runtime behavior:

- The engine attempts to load this JSON first.
- If JSON is unavailable or incomplete, it falls back to the JS compatibility modules.
- The legacy public path `scripts/mentor/mentor-suggestion-dialogues.js` remains a compatibility wrapper.

Validate with:

```bash
node scripts/maintenance/validate-mentor-suggestions-json.js
```

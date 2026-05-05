# Mentor Suggestion Dialogue JSON

These files are the JSON mirror/canonical-data target for the phase-indexed mentor suggestion system.

- `mentor-personalities.json` contains personality and behavior configuration.
- `mentor-suggestion-dialogues.json` contains suggestion dialogue templates grouped by class mentor, context, phase, and specific type.

The existing files under `data/dialogue/mentors/**` use a different class-path/advisory shape. They are not interchangeable with this suggestion-template schema.

The runtime loader in `scripts/mentor/mentor-suggestion-json-loader.js` reads these files first for async mentor suggestion calls and falls back to the JS compatibility data when unavailable.

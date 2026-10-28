/**
 * Modification V2 runtime data pins (architecture §4.5): the expected SHA-256 of the exact bytes of each data file the install service
 * loads. They live in reviewed code, outside the artifacts, so a changed or substituted data file fails closed instead of vouching for itself.
 * CI (tests/modification-v2-convergence.test.mjs) recomputes them from the repository files; regenerating the data therefore requires a
 * reviewed change to this file.
 */
export const MODIFICATION_DATA_PINS = Object.freeze({
  'data/modifications/runtime-definitions-v1.5.json': 'ddf0461aec65127f2bb71a233f0b435923ddb12dcda4091db74f7e4cf8b858a6',
  'data/modifications/specification-records-v1.json': '6340618662e7f1aa6f444cb47071f2b9bab8631517b49a37dec4bd5eb12139a4',
});

export default MODIFICATION_DATA_PINS;

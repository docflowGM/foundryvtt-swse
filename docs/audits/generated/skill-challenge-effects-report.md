# Skill Challenge Effects Audit

Phase: 3.5D
Implemented effects: catastrophicFailure, restrictedSkills, recovery, secondEffort, timedChallenge
OK: 26
Errors: 0

- OK phase:file-exists: Skill Challenge effects metadata file exists.
- OK phase:metadata-version: Effects metadata is marked for Phase 3.5D schema version 2.
- OK metadata:catastrophicFailure: catastrophicFailure is represented in effect metadata.
- OK constants:catastrophicFailure: catastrophicFailure has a stable effect identifier.
- OK metadata:restrictedSkills: restrictedSkills is represented in effect metadata.
- OK constants:restrictedSkills: restrictedSkills has a stable effect identifier.
- OK metadata:recovery: recovery is represented in effect metadata.
- OK constants:recovery: recovery has a stable effect identifier.
- OK metadata:secondEffort: secondEffort is represented in effect metadata.
- OK constants:secondEffort: secondEffort has a stable effect identifier.
- OK metadata:timedChallenge: timedChallenge is represented in effect metadata.
- OK constants:timedChallenge: timedChallenge has a stable effect identifier.
- OK state:default-parameters: State normalization applies safe default parameters for implemented effects.
- OK resolver:catastrophic: Catastrophic Failure adjusts failed roll outcomes before GM accepts suggested results.
- OK resolver:restricted: Restricted Skills downgrades unlisted skills to GM review.
- OK resolver:recovery: Recovery can remove one accumulated failure through a GM action.
- OK resolver:second-effort: Second Effort records a GM-approved retry/additional attempt without mutating roll math.
- OK resolver:timed: Timed Challenge supports a GM-adjusted countdown.
- OK engine:effect-actions: Engine exposes effect actions for the GM tracker.
- OK controller:effect-actions: GM surface controller handles effect action buttons.
- OK controller:json-params: GM form parser accepts optional JSON effect parameters.
- OK service:decorates-effects: GM surface service decorates effects for display and controls.
- OK template:effect-controls: GM template exposes manual effect controls.
- OK css:effect-styles: GM datapad CSS includes basic effect control styling.
- OK no-feat-hooks-yet: Phase 3.5D still does not implement Skill Challenge feat hooks.
- OK no-dice-reroll: Challenge effects do not roll dice or duplicate the skill roller.

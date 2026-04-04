# Phase H.2 Skill Use Exact Patch Report

Repo: `C:\Users\Owner\Documents\GitHub\foundryvtt-swse`

## Applied

- Patched skills-panel extra-use button dataset contract

## Warnings

- Could not patch _runCanonicalExtraSkillUse automatically

## Verify Next

- extra-use buttons now emit data-use-key, data-blocked, data-action-type, data-source-type, and data-source-label
- blocked buttons show the blocked reason in title text
- _runCanonicalExtraSkillUse enforces trained-only restrictions before execution
- execution payload now includes stable runtime metadata even in rollSkillCheck fallback mode
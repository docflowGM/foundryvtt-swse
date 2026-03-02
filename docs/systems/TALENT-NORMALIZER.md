# SWSE Talent Normalizer

This system includes a runtime utility to audit and normalize talent metadata based on talent descriptions.

## What it does

Writes normalized metadata to:

- `flags.swse.talentMeta.actionType`
- `flags.swse.talentMeta.actionLabel`
- `flags.swse.talentMeta.tags[]`
- `flags.swse.talentMeta.isFollowerAffecting`
- `flags.swse.talentMeta.isMultiOption`
- `flags.swse.talentMeta.phase` (1-5 based on action economy)

It does **not** rewrite `system.description` and does not auto-apply Active Effects.

## How to run (Foundry console)

Audit only:

```js
const report = await SWSETalentNormalizer.auditAndNormalize({ apply: false });
console.log(report);
```

Apply to world + packs (GM):

```js
const report = await SWSETalentNormalizer.auditAndNormalize({ apply: true });
console.log(report);
```

Filter by talent name:

```js
const report = await SWSETalentNormalizer.auditAndNormalize({
  apply: false,
  nameFilter: /Pistol Duelist/i
});
console.log(report);
```

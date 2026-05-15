# Feat Prerequisite Display, Tree Indent, and Mentor Advisory Fix

This patch tightens three runtime seams in the progression feat step.

## Feat prerequisite display

Unavailable feats were showing prerequisite information twice in the row:

- once as the normal prerequisite line
- once again inside the compact unavailable reason

The row now keeps the prerequisite line and unavailable badge, while the full missing/blocking breakdown stays in the tooltip and details rail. Feat step data also deduplicates missing prerequisites and blocking reasons before building the display payload.

## Feat tree indentation

Prerequisite tree depth is still computed by `FeatStep._orderFeatsForTree`, but indentation now applies only to the feat name. This keeps the rest of the card aligned while still showing chain context:

```text
Combat Reflexes
  Hijkata Training
  Opportunistic Retreat
  Opportunistic Trickery
    Improved Opportunistic Trickery
```

## Mentor advisory 404 suppression

`MentorAdvisoryCoordinator.loadAdvisoryStub` now checks a known advisory-stub manifest before fetching. Class mentors without advisory stubs, such as `noble`, now fall back to normal mentor dialogue without producing browser 404s.

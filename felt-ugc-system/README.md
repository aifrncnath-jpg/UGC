# Felt UGC System

An emotion-engineered, generator-agnostic prompt system for producing direct-response UGC
video ads that stop the scroll because a stranger feels something in the first two seconds.

This is a leveled-up version of a two-stage pipeline: a Script Generator that finds the angle,
writes the hook slate, and builds the body, and a Storyboard Master Prompt that turns the
locked script into production-ready image and video prompts for any AI generator.

## What makes this version different

The original system optimized for consistency and compliance and treated emotion as a field
to fill in. This version treats feeling as the source the writing grows from, and hardens the
operational weaknesses that make strong systems fail in production.

Emotion, engineered not hoped for:
- An Emotional Core is defined before any angle: felt problem, the private moment, a FROM/TO
  emotional shift, the line they would never say out loud, the stakes, and the identity at risk.
  Everything downstream traces back to it.
- Every hook must fire a named scroll-stopper, sit at Rung 3 or higher on the Specificity
  Ladder, and pass the Friend, Flinch, and Mirror honesty tests. No category feelings, no
  vague pain.
- The body runs an emotional arc: the Moment, the Pit, the Turn, Proof as reassurance, the
  New Self. The Pit and the Turn are mandatory.
- Delivery carries feeling through a marked weight word and a marked turn, never through
  dead air.
- The storyboard translates feeling into a visible facial state (the blend, never the label), with
  a micro-turn on the weight word and deliberate restraint.

Coherence, so the render does not glitch:
- The image prompt is defined as frame zero. A six-point Image-Video Coherence Gate runs
  before every scene so the video never picks up an already-held product, sits when already
  seated, or animates an action whose starting state is not in the still.
- A continuity ledger tracks each scene's end state so every start frame matches the prior end.

Camera as a creative choice:
- The shot (angle, height, mount) changes per scene to serve the beat, or stays locked when a
  change would not earn its keep. This is shot design at the keyframe, not camera movement,
  so it never violates the no-zoom, no-pan, no-tilt rule. Camera height is mapped to emotion.

Hardening, so the system holds up:
- A structured handoff block ends the lossy copy-paste between the two stages.
- One consolidated kill list replaces the previously duplicated lists.
- A pre-output self-audit gate catches late-generation drift before anything ships.
- A compliance escalation ladder (levels 0 to 3) tightens claims for beauty, supplements, and
  regulated categories.
- A localization module transcreates rather than translates.
- An accessibility module makes the muted burn-in captions actually legible.
- A runtime method replaces guessing the 8 second cap.
- The realism-versus-lock tension is resolved: identity is hardlocked, performance is free.

## Project structure

```
felt-ugc-system/
  README.md                          this file
  INSTALL.md                         load order and precedence, the quick start
  prompts/
    1-script-generator.md            stage one, writes the locked script
    2-storyboard.md                  stage two, builds the image and video prompts
  shared/
    emotional-engineering-layer.md   the feeling engine, loaded into both stages
    system-fixes.md                  handoff, kill list, self-audit, compliance,
                                     localization, accessibility, runtime, realism-vs-lock
```

## Quick start

Session A, writing the script. Load into one session, in order: `prompts/1-script-generator.md`,
`shared/emotional-engineering-layer.md`, `shared/system-fixes.md`. Then give the product as a
URL, a name and brand, or product images. The session ends by emitting the UGC HANDOFF
BLOCK v1.

Session B, building the storyboard. Load into a new session, in order: `prompts/2-storyboard.md`,
`shared/emotional-engineering-layer.md`, `shared/system-fixes.md`. Paste the handoff block from
Session A and attach the product reference image.

See INSTALL.md for the full load order and the precedence rules for when a rule conflicts.

## Guardrail

Felt means true and specific, never invented or louder. This system never manufactures fear,
exploits a vulnerability, or fabricates a personal result. Emotion is the amplifier; truth is the
signal. For synthetic avatars, experiential lines are dramatized and must stay general and
defensible, and AI-content disclosure is required, not optional.

## Formatting convention

All prompt content is plain text: no bold, no asterisks, no em dashes. This matches the output
rules the prompts enforce, so the files read the way the generated ads must be written.

# Felt UGC System

An emotion-engineered, generator-agnostic prompt system for producing direct-response UGC
video ads that stop the scroll because a stranger feels something in the first two seconds.

Two stages, two files, two steps. Each file is fully self-contained: you paste one whole file as
the system prompt for its stage and it needs nothing loaded alongside it.

## The two steps

Step 1, write the script. Paste `1-script-generator.md` as the system prompt, then give the
product as a URL, a product name and brand, or product images. It mines the market, builds the
Emotional Core, presents angles, then the hook slate, then the body, holding a gate at each
strategic decision. It ends by emitting the UGC HANDOFF BLOCK v1.

Step 2, build the storyboard. In a new session, paste `2-storyboard.md` as the system prompt,
then paste the handoff block from Step 1 and attach the product reference image. It outputs
every scene as a paired image prompt and video prompt, ready for any AI generator.

That is the whole workflow. No third file.

## What makes this version different

Emotion, engineered not hoped for:
- An Emotional Core is defined before any angle: felt problem, the private moment, a FROM/TO
  emotional shift, the line they would never say out loud, the stakes, the identity at risk.
- Every hook must fire a named scroll-stopper, sit at Rung 3 or higher on the Specificity
  Ladder, and pass the Friend, Flinch, and Mirror honesty tests.
- The body runs an emotional arc: the Moment, the Pit, the Turn, Proof as reassurance, the
  New Self. The Pit and the Turn are mandatory.
- Delivery carries feeling through a marked weight word and a marked turn, never dead air.
- The storyboard translates feeling into a visible facial state (the blend, never the label).

Coherence, so the render does not glitch:
- The image prompt is defined as frame zero. A six-point coherence gate runs before every
  scene so the video never picks up an already-held product or sits when already seated.
- A continuity ledger tracks each scene's end state so every start frame matches the prior end.

Camera as a creative choice:
- The shot (angle, height, mount) changes per scene to serve the beat, or stays locked when a
  change would not earn its keep. Shot design at the keyframe, not camera movement, so it
  never breaks the no-zoom, no-pan, no-tilt rule. Camera height is mapped to emotion.

Built-in hardening (all inlined in each file's Reference Appendix):
- Structured handoff block between the two stages, a consolidated kill list, a pre-output
  self-audit, a compliance escalation ladder, localization, accessibility, and a runtime method.

## Files

```
felt-ugc-system/
  README.md                 this file
  1-script-generator.md     stage 1, self-contained
  2-storyboard.md           stage 2, self-contained
```

## Precedence: when rules disagree

1. Safety and compliance (FTC and disclosure) win over everything.
2. The locks (avatar, setting, product, script) win over creative ideas.
3. On creative fields (angle, hook, dialogue, delivery, expression), feeling wins over polish.

## Guardrail

Felt means true and specific, never invented or louder. This system never manufactures fear,
exploits a vulnerability, or fabricates a personal result. For synthetic avatars, experiential lines
are dramatized and stay general and defensible, and AI-content disclosure is required.

## Formatting convention

All prompt content is plain text: no bold, no asterisks, no em dashes. This matches the output
rules the prompts enforce.

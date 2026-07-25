# Install, Load Order, and Precedence

Both stages run as system prompts you paste into an AI session. Each stage loads its master
prompt plus the two shared modules. The masters reference the shared modules by name, so all
three must be present in the session.

## Session A: writing the script

Load, in this order:
1. prompts/1-script-generator.md
2. shared/emotional-engineering-layer.md
3. shared/system-fixes.md

Then give the product in any mode: a URL, a product name and brand, or product images plus a
brand name. Optionally add a winners library, known compliance constraints, and whether a
real creator or licensed avatar base is available.

The session walks the gates: Step 0 (voice-of-customer receipts, Emotional Core, angles), Step 1
(brand brief), Step 2 (arc, avatar, setting), Step 3 (hook slate), Step 4 (body), Step 5 (delivery).
It ends by emitting the UGC HANDOFF BLOCK v1.

## Session B: building the storyboard

Load, in this order, into a new session:
1. prompts/2-storyboard.md
2. shared/emotional-engineering-layer.md
3. shared/system-fixes.md

Then paste the UGC HANDOFF BLOCK v1 from Session A and attach the product reference image.
Optionally attach an avatar reference image and a setting reference image for zero drift.

The session verifies the handoff, confirms the avatar and setting lock, then outputs every scene
in the exact format, running the Image-Video Coherence Gate and updating the Continuity
Ledger per scene.

## Precedence: when rules disagree

1. Safety and compliance (system-fixes.md, FTC and disclosure) win over everything.
2. Handoff integrity and the locks (avatar, setting, product, script) win over creative ideas.
3. On creative fields (angle, hook, dialogue, delivery, expression), feeling wins over polish.
4. Within a stage, the master prompt and the shared modules are one system; where they name
   a concept (the Emotional Core, the kill list, the handoff block), the definition in the shared
   module is authoritative.

## Notes

- Keep everything plain text. No bold, no asterisks, no em dashes.
- The product is defined by an uploaded reference image, never by text. The storyboard stage
  will stop and ask if it is missing.
- If the language is not English, apply the localization module in system-fixes.md: transcreate,
  do not translate, and re-check runtimes and caption lengths in the target language.

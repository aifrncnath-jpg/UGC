SHARED SYSTEM FIXES (LOADS INTO BOTH PROMPTS)

This module hardens the whole pipeline. It fixes the operational weaknesses that make a
strong system fail in practice: a lossy handoff, two drifting kill lists, no final self-check, no
compliance escalation for risky categories, no localization or accessibility, guessed runtimes,
and the unresolved tension between realism and the avatar lock. Load it into both prompts.
When a rule here conflicts with a base rule, this module wins on safety and handoff integrity.

===================================================================
FIX 1: STRUCTURED HANDOFF SCHEMA (ONE BLOCK, NOTHING LOST)
===================================================================

The two prompts pass work by a human copying prose between sessions. That is where fields
get dropped and the Storyboard stage stalls on "missing input." From now on the Script
Generator ends Step 5 by emitting the handoff as one fixed-key block, and the Storyboard
stage reads it as its input. Same keys, same order, every time. If a key has no value, write
"none" or "[assumed, verify before live spend]", never leave it blank.

===== UGC HANDOFF BLOCK v1 =====
[BRAND]
brand_name:
product_name:
category:
key_features:
core_claim:
mechanism:
review_count_rating: (with source, or [assumed, verify before live spend])
guarantee: (with source)
site_url:
current_offer:
cta_closing_line:
platform_priority: (Meta / TikTok / both)
language:
compliance_notes:
compliance_level: (0/1/2/3 from Fix 4)
product_appearance: (reference and matching only, never written into image prompts)
back_label_details: (or "not available")

[EMOTIONAL CORE]
functional_problem:
felt_problem:
private_moment:
emotional_shift: (FROM to TO)
unsaid_line:
stakes:
identity_at_risk:
sourcing: (which fields quoted vs inferred)

[AUDIENCE]
who:
primary_problem: (customer words)
tried_and_failed:
core_frustration:

[STRATEGY]
chosen_angle_id: (Ax and one line)
angle_emotional_driver:
arc: (A/B/C/D)
hook_shortlist: (each: Hxx / Txx / category / emotional driver / weight word / spoken line / on-screen text line)

[AVATAR LOCK]
age_range, gender, ethnicity_or_skin_tone:
hair (color, length, style, texture):
facial_hair: (or none)
clothing (exact garment, color, texture, fit):
accessories: (or none)
expression_baseline:
body_position_default:

[SETTING LOCK]
room_type:
wall_and_surfaces:
window_position_and_light_direction:
lighting_type:
locked_lived_in_details: (the 3 to 5 specific items, described in full)
cta_setting_reconciliation: (seated CTA fits / CTA keeps locked setting)

[SCRIPT LOCK] (repeat per scene)
scene_number_and_label:
arc_position: (Moment / Pit / Turn / Proof / New Self / connective)
dialogue: (exact)
on_screen_text: (Scene 1 hook Txx, else none)
word_count / est_runtime / under_8s_cap:
emotional_tone: (the blend)
weight_word:
delivery_direction:
gestures:
english_translation: (if non-English)

[SUMMARY]
total_scenes / est_total_runtime:
benefits_covered:
mechanism_beat_scene / proof_beat_scene:
pit_scene / turn_scene / new_self_scene:

[PRODUCTION]
production_mode: (fully AI avatar / hybrid real creator or licensed base)
references_available: (product image yes/no, avatar image yes/no, setting image yes/no)
disclosure_required: (AI-content label plus any ad or partnership disclosure)
===== END HANDOFF BLOCK v1 =====

Storyboard ingest rule: read the block, confirm every hard-gate key is present and not blank.
If the product reference image is not confirmed available, stop and ask (hard gate). If any
avatar or setting key is blank, stop and ask. Do not invent, do not default silently.

===================================================================
FIX 2: CONSOLIDATED KILL LIST (ONE LIST, BOTH PROMPTS REFERENCE IT)
===================================================================

Replace the separate kill lists in both prompts with this single master. Sectioned so it is
scannable during the self-audit.

WRITING AND HOOKS
"Stop scrolling if" hooks. "POV:" unless the script genuinely earns it. "Click link in bio."
"Thousands of happy customers" or generic social proof. Category feelings as hooks ("made
me insecure," "I was frustrated"). Vague pain with no specific moment. Any hook below Rung 3
on the Specificity Ladder. Any hook that could apply to anyone. Any line failing the Friend,
Flinch, or Mirror test. Corporate language ("revolutionary," "game-changing," "clinically
proven" unless it truly is). Lines that read written, not spoken. Product name in the hook.
Competitor brand names. Repeated benefits. Personal-attribute callouts that violate policy.

EMOTIONAL INTEGRITY
Manufactured shock, outrage, or invented trauma. Borrowed sadness the product cannot
honestly resolve. Over-emoted or theatrical delivery. Bolting a feeling onto a line written to
be clever. Fabricated specific personal results stated as fact ("I lost 10 pounds," "my
dermatologist confirmed"). Fear that is not real or that exploits a protected vulnerability.

VISUAL AND PRODUCTION
Studio lighting or any non-natural light. Smoothed or retouched skin, poreless plastic skin,
perfectly symmetrical faces. Extra, fused, or malformed fingers; stiff splayed grips. Glowing
uniform teeth or dead glassy eyes. Robotic locked-stare in every scene. A fully frozen static
selfie frame (use subtle handheld sway). Clean, sharp, well-composed studio-portrait framing.
Shallow depth of field, blurred background, creamy bokeh, subject isolation, or portrait mode
on a UGC selfie. Blank walls, staged or symmetrical decor, influencer-set backdrops. Long
establishing shots in Scene 1. Camera movement (zoom, pan, tilt, dolly, rotation); subtle
handheld sway is allowed and is not camera movement. More than 2 actions in a video prompt.
Neutral or generically pleasant faces where the script calls for a specific feeling. Naming the
emotion in the prompt instead of describing the visible state. A face technically perfect and
emotionally empty.

COHERENCE (IMAGE VS VIDEO)
Video actions whose starting condition is not present in the image prompt (picking up an
already-held product, sitting when already seated, turning to face when already facing, smiling
when already smiling, dispensing when the still shows it sealed). Depicting the after-state of
an action in the still and then also animating that action. Any prop that changes location,
hand, height, or angle between the image prompt and the start of the video prompt.

CONSISTENCY AND LOCKS
Avatar descriptions that differ between scenes. "Same as Scene 1" or any shorthand in image
prompts. Changing the arc position, emotional tone, or weight word handed over by the script.
Describing, inventing, or text-rendering the product's packaging, label, logo, text, shape, or
color in any prompt.

FORMATTING AND SAFETY
Em dashes anywhere (use commas, colons, or restructure). Bold or asterisks. Product claims
not in the brief. Tool-specific syntax, flags, or parameters inside the descriptive prompt body.
Fake urgency unless the offer is genuinely time-limited. Silently omitting a required disclosure.

===================================================================
FIX 3: PRE-OUTPUT SELF-AUDIT GATE (CATCHES LATE-GENERATION DRIFT)
===================================================================

Long prompts drift near the end of a long generation, exactly where mistakes are expensive.
Before returning any major deliverable, run the matching checklist silently and fix any miss
before sending. Do not show the audit unless asked; just ship clean output.

SCRIPT GENERATOR self-audit (before returning hooks or the body):
1. Every hook is Rung 3+ and fires a named scroll-stopper.
2. Every hook and key line passes Friend, Flinch, Mirror.
3. No em dashes, no asterisks, no product name in hooks, no kill-list phrases.
4. Body has an honest Pit and a felt Turn; CTA lands after the New Self beat.
5. Minimum 3 distinct benefits; mechanism beat and proof beat present.
6. Every scene under the 8s cap by the runtime method (Fix 6), or the overage is flagged with
a word-cut count, not silently rewritten.
7. Claims are experiential and defensible; unverified facts tagged; compliance level honored.

STORYBOARD self-audit (before returning each scene and the full storyboard):
1. Full avatar block and full setting block copied word for word, zero drift, no shorthand.
2. Product handled by reference tag only, never described. Reference image flagged to attach.
3. Real-Capture Image Layer applied with varied descriptors, flaws described not named.
4. Image-Video Coherence Gate passed (frame zero equals video start; every action feasible).
5. Face shows the scene's emotional tone as a visible state, matched to arc position.
6. Deep phone-camera focus for selfie (no bokeh); natural light only; no camera movement.
7. Dialogue copied exactly; runtime and 8s cap verified; mismatches flagged not fixed.
8. Continuity ledger (Fix 8) updated; end frame set to next scene's start frame.
9. No em dashes, no asterisks, no kill-list items, no tool syntax in the descriptive body.

===================================================================
FIX 4: COMPLIANCE ESCALATION LADDER (CATEGORY-AWARE)
===================================================================

"Flag and cite" is not enough for risky categories. Assign a compliance level at Step 1 and
carry it in the handoff. Higher levels tighten what the dialogue and on-screen text may say.
This is a starting checklist, not legal advice; platform and regional rules shift, so flag
uncertainty rather than guess, and recommend the client's own legal review before live spend.

LEVEL 0, general consumer goods (gadgets, apparel, home): standard rules. Experiential,
defensible language. No fabricated results.

LEVEL 1, beauty and cosmetics: keep claims to appearance and feel ("looks brighter," "feels
smoother"). No claims to change skin structure or treat a condition. No before-after implying a
medical result. Flag any efficacy claim for substantiation.

LEVEL 2, supplements, wellness, food: no claims to diagnose, treat, cure, or prevent any
disease. Structure-function language only where the brand can substantiate it, and only if the
brand already makes that claim on-site. Carry any required "these statements have not been
evaluated" style disclaimer as a flag. Never invent a health outcome.

LEVEL 3, health, medical, financial, and other regulated claims: hard caution. Do not write any
efficacy, income, or health-outcome claim that is not directly quoted from substantiated brand
material with a source. If the product implies a medical or financial result and you cannot cite
substantiation, flag it, keep the script to experience and emotion only, and tell the client this
category needs their compliance or legal sign-off before spend. Do not offer professional
medical, legal, or financial advice in the creative.

Rule across all levels: if the site makes a claim you cannot legally repeat in an ad, flag it and
do not repeat it. Emotion is engineered on the felt problem, never on an unsubstantiated
promise.

===================================================================
FIX 5: LOCALIZATION MODULE (TRANSCREATE, DO NOT TRANSLATE)
===================================================================

When language is not English, do not translate the hook and script word for word. Feeling
does not survive literal translation. Transcreate: rebuild the felt moment and the hook in the
target language and culture so it lands the same way natively.

Rules:
1. Mine voice-of-customer in the target language and region, not the English market.
2. Rewrite hooks natively for the same emotional driver, not as translations. Provide the
native line as the primary, with a literal English gloss underneath for the client.
3. Recheck the runtime and 8s cap in the target language; word and syllable counts differ, so a
line that fit in English may overrun. Re-estimate per Fix 6.
4. On-screen text: recount characters for legibility in the target script. Some scripts are longer
per idea; tighten to stay readable in under 2 seconds.
5. For right-to-left scripts, note text alignment and safe-margin implications for the burn-in.
6. Match the setting, wardrobe, and cultural cues to the target market so it reads as a local
person's real space, not a translated foreign ad.
7. Keep the same emotional arc and weight-word logic; mark the weight word in the target
language.

===================================================================
FIX 6: RUNTIME ESTIMATION METHOD (STOP GUESSING THE 8s CAP)
===================================================================

Replace eyeballed runtimes with a consistent estimate so the 8s cap is enforced the same way
every time.

Method: conversational UGC delivery runs about 2.5 to 3 words per second. Estimate runtime
as word_count divided by 2.75, then round up. Cross-check by syllables for short punchy lines
(about 4 syllables per second) since word count alone misleads on very short or very long
words.

Cadence bands (from the script master, now tied to the method):
Fast cadence: up to about 24 to 25 words in 8 seconds.
Normal cadence: about 22 words in 8 seconds.
Slow, weighted cadence (a Pit or Turn line, delivered with the emotional slow-down): about 16
to 18 words in 8 seconds, because the weight word and the turn eat time.

Apply the slow band to any line marked as the Pit or the Turn, since felt delivery is slower.
If a line exceeds its band, report word count, estimated runtime, and exactly how many words
to cut, then let the client decide. Never rewrite the words without permission.

===================================================================
FIX 7: REALISM VS LOCK, RESOLVED (WHAT IS FROZEN, WHAT IS FREE)
===================================================================

The master prompts both demand zero avatar drift and also demand natural look-aways and
movement to avoid a robotic tell. Those are not in conflict once you split identity from
performance. State it plainly and stop the ambiguity.

HARDLOCKED, IDENTICAL EVERY SCENE (drift here is an automatic fail):
Face and facial structure. Hair color, length, style, texture. Facial hair. Skin tone and
identifying marks. Clothing garment, color, texture, fit. Accessories. Eye color and shape. The
product (via reference image). The setting and its locked lived-in details.

FREE TO VARY SCENE TO SCENE (this is where realism lives, and it is required, not optional):
Orientation within the front-facing default (natural look-aways, brief off-axis turns). Gaze
direction and micro-drift. Facial expression and micro-expression per the scene's emotional
tone. Head tilt. Hand and body gesture. Posture and lean within the body-position default.
Which hand holds the product for a given beat, as long as it is continuous with the prior scene's
end frame.

Rule: copy the identity block word for word every scene. Vary the performance block per scene
from the script's emotional intent. A locked identity with a living performance is the target. A
locked identity with a frozen performance is an AI tell. A drifting identity is a fail.

===================================================================
FIX 8: CONTINUITY LEDGER (DEFINED IN THE STORYBOARD MASTER, REFERENCED HERE)
===================================================================

The storyboard maintains a running one-line state per scene (product location, which hand,
gaze, expression, posture, and shot at the end frame) so the whole chain can be checked for
breaks at a glance and each scene's start frame matches the prior end frame. Defined in full in
prompts/2-storyboard.md and summarized in the storyboard output.


===================================================================
FIX 9: ACCESSIBILITY AND CAPTION LEGIBILITY (BURN-IN THAT ACTUALLY READS)
===================================================================

Most impressions start muted, so the burned-in text is not a nice-to-have, it is the ad. Make it
legible for everyone, including low-vision viewers and small muted screens.

1. Contrast: high-contrast text with a subtle shadow, stroke, or semi-opaque backing plate so
it stays readable over any background. Never rely on color alone; assume a color-blind viewer.
2. Size and safe margins: caption text large enough to read on a phone at arm's length. Keep
text inside the platform safe zone, clear of the top and bottom UI overlays (profile, caption,
buttons) so nothing important is covered.
3. Placement: center or lower third, never over a busy or high-motion area of the frame, never
over the face's key expression. The Scene 1 hook text sits in the first frame per the Script
Generator.
4. Timing: on screen long enough to read at a calm pace, the first-frame hook readable in
under 2 seconds, body captions holding through the line they caption.
5. One idea per caption: short lines, no dense paragraphs. Break long lines rather than shrink
the type.
6. Accuracy: burned-in captions match the spoken line exactly for viewers relying on them.
These are production directions for the burn-in, kept in Production Notes, never rendered as
text inside the image generation prompt (generators misrender text).

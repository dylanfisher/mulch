# 0327 — A sixth character glides with the variety a hand has

**2026-09-08.** `MOTION_CHARACTERS` (`src/lib/motion.ts`) gains **wander**, after smooth and before
the three that follow it: `pace: [0.4, 2.5]`, `jitter: [0.5, 0.9]`, `reach: [0.3, 0.9]`,
`glide: [0.7, 1]`, `flurry: [0, 0]`. What smooth lacks is the variety and what pulse lacks is the
curve; this is the curve with the variety — one lane rides slowly here and quickly there, and never
arrives at a value without travelling to it. Every bound is inside its dial's own range, so the
arithmetic never clamps (0309, 0152).

The word is one more entry in `MOTION_CHARACTER_LABELS` and one more sentence in
`MOTION_CHARACTER_TOOLTIPS` (`src/lib/copyMotion.ts`), both total records over the list. Nothing
else lists the characters: the menu maps `MOTION_CHARACTERS`, and a stored character is asserted
against the same list, so a sixth name is offered and accepted by having been declared once.

**A character that never steps has no flurry, whatever its glide.** `move` takes the flurry branch
before it looks at `glide`, and the branch lays its judders and its landing through `step` — a hold
and a jump one `MOTION_STEP_GAP_SECS` apart. So flurry, not glide, is what decides whether a name
that says "never a step" can keep its word: any flurry above nought lays steps on some seed, and a
glide of 0.7 lays none on any. The step's own first draw of the region said `flurry: [0, 0.1]`;
nought is what the sentence in the menu costs.

**Durable shape moved: one more name a stored `MotionDrawn.character` may hold.** No field changes,
and every lane already drawn stays the lane it is (0314).

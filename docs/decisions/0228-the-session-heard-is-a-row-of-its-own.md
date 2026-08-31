# 0228 — What the session is putting out is a row, and one row in every picture

- **Date:** 2026-08-31
- **Status:** accepted, extending
  [0213](0213-a-reading-of-the-output-belongs-to-the-field.md) and
  [0218](0218-a-card-peeks-once-a-frame.md)

Every row in the drift was a picture of an _input_ — a knob position, one instance's own meter, a
clock — so the one thing nothing drew was what the instrument sounds like at the end. 0213 gave a
reading of the output to the field and refused it a row, because a deck's output has no item to
belong to. **The master bus has one.** It is the thing every yard lands in, so it gets a row, and it
is the same row in every picture: two yards open side by side are beaten against one layer and drift
together, which is what a picture of the session is and what a second per-deck reading would not be.

**It is read in the time domain and never as a spectrum.** `createMasterBus` already fetches both
channels' meter windows every frame; the row costs two more indexed scans of each — `rmsMagnitude`,
which `crestFactor` now reads instead of computing the same power a second time, and `spectralTilt`,
the RMS of the window's own first difference over the window's, halved onto 0..1. An FFT a channel a
frame to move one grating is a large bill for a scalar. The louder channel answers for both numbers,
so brightness comes off the window its own power came off.

**The level is the only depth of its own the row has, and the tilt is its spacing.** Built at
nothing like the wash row (0213), so on a dry yard a session nobody can hear draws exactly the
picture that was drawn before there was an output — the field's wash rises this row with every other
one, which is 0213's rule and not an exception to it, the screen skips it as a row with no depth of its own, and it counts among the
gratings as the share of one its own reading has made of it — counted whole, silence would weigh the
picture down; counted only once loud, the whole picture would step as the first sound arrived. Its
period is the session's `sync` clock, falling back to the yard's loop, because a period no deck owns
is what keeps it from locking to a yard's rows. It is folded off 0 and carries `reference`, so it is
an axis: it lies along the loop's own row and beats against it rather than crossing it. The loop's
is still the row the screen's band rolls on — it is pushed first, and `bandTurns` takes the first.

**The once-a-frame memo lives on the loop's side, not behind the facade.** `masterPeek()` has two
callers a frame now, the meter and every open drift, and the throttle is the frame stamp — which is
`src/ui`'s, and `src/app` may not import it (docs/map.md). So `src/ui/masterHeard.ts` holds it, the
way `playerStandingRead.ts` holds the card's (0218), and hands the facade's own object straight
back.

Nothing here is durable, which is the whole of the permission [0145](0145-a-picture-may-rest-on-analysis.md)
gives and does not widen.

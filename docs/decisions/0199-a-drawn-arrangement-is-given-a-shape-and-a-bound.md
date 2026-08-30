# 0199 — A drawn arrangement is given a shape and a bound

- **Date:** 2026-08-29
- **Status:** accepted, extending [0158](0158-a-song-may-be-drawn-and-what-is-drawn-is-never-stored.md) rather than
  reversing it, and keeping [0174](0174-an-arrangement-draws-from-a-cast-and-the-dial-is-not-a-hand.md)'s cast as the
  set a draw is taken from.

**A run that only evolves does not go anywhere.** 0158 gave the pattern four numbers — how many
parts, how long they are kept, whether a kept run moves, where a let-go one goes — and that is a run
that repeats, mutates and drops. What it is not is a run that _arrives_: every part is eight jumps
long, every part is drawn at full strength wherever its region reaches, two parts running are as
likely to be the same character as not, and the whole arrangement exists from its first jump. Four
numbers say what becomes of a run over time and none of them says what the run is shaped like.

**Four more, and they answer two questions.** What the run does — `arrangeGrow` — and what the parts
inside it may be — `arrangeAmount`, `arrangeSpan`, `arrangeApart`. Each is at the value under which
a drawn arrangement is exactly the one the module drew before it, which is 0134's rule said for the
arrangement.

- **Grow** spaces out, in rounds, the arrival of one part after another. The run opens on a single
  part and takes another on until it is whole; only then does the keep begin counting, because what
  a keep counts is rounds of the arrangement and a run still growing has not finished being one.
  Letting go drops it back to one part and it grows again — which is the shape a set has.
- **Amount** is `blendCharacter` made durable: how far a drawn part is taken from the dials the card
  stands on. **This is the guardrail, and deliberately a general one.** A run drawing at full
  strength draws a Breathe with the gap right out beside a Stutter with the burst right down, and
  evolves into something nobody sits through. Pulled back, every part is a version of a sound a hand
  has already decided it likes. One dial bounds every knob at once, which is why there is no floor
  and ceiling per knob: a pair of bounds on the rest and a pair on the burst would be four numbers
  answering the same question worse, and they would say nothing about the thirty knobs beside them.
- **Span** draws a part's length in doublings of the eight rather than evenly in jumps. A length
  drawn anywhere between one and sixty-four is a run of arbitrary sections no two of which are held
  against each other; four, eight and sixteen are what a section actually is.
- **Apart** refuses a part being drawn the character the part drawn before it took. It narrows the
  cast for that one draw rather than redrawing until the name differs: a redraw loop spends an
  unknown number off the seed's stream, and what a seed reproduces is the stream (0089). It has no
  answer where the cast permits one name, and the draw is taken anyway so the stream is the same
  either way.

**The draws stay countable.** Every drawn part now spends exactly three numbers before its region's
own — whether it turns away, which name, how long — and spends all three however the amounts stand.
That is 0174's rule for the cast said for three more fields, and it is what keeps a seed the whole
of what a performance is.

**They stand in the Compose dial's own run.** Seven amounts is the longest run on the card and that
is the size of the question, not a judgement: an arrangement is the one dial in this module whose
draw is a whole other pattern (0124). Nothing here is a part's — a part that could turn one would be
an arrangement rewriting the arrangement it is inside, which is what 0158 refused and 0176 refused
again.

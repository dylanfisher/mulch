# 0172 — A lit row is not a pressed control

- **Date:** 2026-08-25
- **Status:** accepted; settles what
  [0157](0157-a-song-is-a-section-and-a-dial-paints-the-voice.md) left open — which ink lights the
  part standing. Nothing durable moves.

0157 says the row being walked is lit "in the instrument's own ink so the arrangement reads as a
place in a run rather than as a control", and then lights it in `bg-accent`. `--accent`, `--muted`
and `--secondary` are one value in both schemes (`src/ui/tokens.css`), and `--muted` is what a
pressed `Toggle` is filled with — so the chorus toggle, the one control on a song's row whose whole
job is to be read at a glance, disappeared into the row the moment that row lit. The one row where
reading it matters was the one row where it could not be read.

**The row moves, not the toggle.** The two repairs on offer were a darker pressed state and a
different ink for the lit row. A darker pressed state is a change to every `Toggle` in the
instrument — a rack switch, a fold heading, the debug console — to fix one row, and it would leave
the lit row still filled with exactly a control's ink, which is what 0157 said it must not be. So
the lit row is `bg-primary/15`: the instrument's own accent at a wash, the same way a loop region
(`bg-loop/25`) and a drop target (`bg-primary/10`) are drawn — a place, not a surface. `bg-accent`
stays what it has always been, the fill under a pressed or highlighted _control_, and the two are
now different things drawn in different inks in both schemes.

Both rows move together: `src/ui/PlayerDrawn.tsx` lights the run the pattern wrote for itself in
the ink the written list's rows wear, and an arrangement has to read the same way whoever wrote it.
The drag's landing slot keeps `bg-accent` — it is the shadow of a card in flight and no control
sits inside it.

**A row a walk lights and a row a hand selects are still two inks.** P133 will want the selected
part lit in something that is not the standing part's; this spends `primary` at 15% on the standing
row and leaves the rest of the palette to it.

**Proof.** `src/ui/PlayerSong.test.tsx` reads the ink both lists light a row in off the rendered
markup — the written one and the one the pattern drew, which have to be one ink — and
every ink a pressed `Toggle` wears off `toggleVariants`, resolves all of them through the
declarations in `src/ui/tokens.css`, and asks that no two are one value. Asserted against the
tokens rather than the class names because the class names never agreed — `accent` and `muted` are
different words for one colour, and only the value says so. Seen failing against the tree before
this change.

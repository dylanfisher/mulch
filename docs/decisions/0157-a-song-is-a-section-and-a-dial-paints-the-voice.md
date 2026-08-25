# 0157 — A song is a section, and a dial paints the voice

- **Status:** the second half is superseded by
  [0176](0176-a-part-is-the-dials-it-was-captured-from.md) — what a dial edits is the selected
  part, and the spec is what it edits when nothing is selected. Everything else below stands: the
  section, the opaque id, the per-frame read of what is standing, and the mark a dial wears when it
  is not the card's own.

The arrangement is a full-width fold inside the jumps card, under its dials, wearing the fold every
other module wears ([0107](0107-a-module-is-a-card-and-a-fold-never-silences-it.md),
[0055](0055-a-state-is-a-toggle-and-an-action-has-one-icon.md)) — not a popover in the card's
corner, where P111 first put it. A song is the one control on that card that changes what every
other control on it _means_, so it is read where those dials are read. Its parts are reordered by
the drag-and-arrow-keys handle both of the instrument's other ordered lists wear — this is its third
wearer ([0062](0062-a-rack-card-is-dragged-by-its-own-handle.md),
[0155](0155-a-drop-lands-on-a-seam.md)) — and a part moved lands in one `deck.player` carrying the
whole spec, so an arrangement is undone, logged and replayed like any other durable edit
([0089](0089-a-jump-is-the-transports.md)).

**A part carries an opaque id, minted at the gesture that adds one**, exactly as a rack instance
does ([0076](0076-a-card-reads-itself-out-of-its-own-id.md)). It is the one durable shape this
moves. The alternative — a badge derived from the seed and the part's place — is free and wrong for
the gesture above it: it shuffles the moment a part is dragged or inserted, so it names a place and
not a part, and the whole reason a part needs a name is that two parts drawn as one character for
one length are alike in every other field. The id is identity and never a second generator: a
part's voice goes on being drawn from the walk's own stream in the order it always was, because
that stream is the whole of what a seed reproduces (0089).

**What is standing is a per-frame read and nothing else.** `DeckPeek` grows one player entry — the
standing part's id and the voice being walked under it — filled by `src/audio/player.ts` off the
step the clock is actually inside, which is the same scan `position()` answers from. It is armed
seconds ahead of the ear, so a surface asking the walk would paint the future. No command, nothing
durable, no React state (plan §2): the same seam an automated knob's live read already runs on
([0035](0035-a-lane-runs-on-its-own-clock.md)). The voice is null wherever no part stands, and null
means "the spec's own numbers" on every surface that reads it — which is what an unarranged
pattern, a halted deck and the gap between two passes all are.

**A dial paints the voice while a song is standing, and says that it is.** That is how an automated
dial paints its lane, and for the same reason: a dial standing somewhere the hand did not leave it
must never be readable as one the hand moved, so a dial the song can override wears a mark in the
corner opposite the door to its own amounts ([0121](0121-a-framed-plus-is-a-door.md),
`src/ui/PlayerMore.tsx`). **Turning it still patches the spec** the parts are a distance from
([0152](0152-a-character-is-a-region-of-the-spec.md)): a gesture on the card is an edit of the
pattern every part is measured against, and never a silent edit of the part that happens to be
standing when the hand arrived. _Reversed by
[0176](0176-a-part-is-the-dials-it-was-captured-from.md)_: a part is a captured spec rather than a
distance from one, so a dial edits the part a hand has selected — which is never the part that
happens to be standing, and so keeps the whole of what this paragraph was protecting — and edits
the pattern itself whenever nothing is selected.

**A compact dial is explained on the dial.** `Says` works by rendering the control _as_ its trigger
([0094](0094-a-tooltip-annotates-a-control-and-never-becomes-one.md)) and `Knob` takes a declared
prop list and spreads nothing onto its root, so a `Says` wrapped around a knob from outside puts the
trigger's handlers on nothing at all. A knob's own `says` is the road that works, and it drew the
sentence on the caption — which the `xs` rung does not draw. So the sentence goes on the dial
itself, through that same prop, and every compact dial in the instrument is explained one way (P65).

# 0159 — A song is the picture's one stepped row

The jumps module reached the drift through nothing: `moireRows` drew a lane, an instance and the
loop, and the thing actually moving where the deck reads from drew nothing at all. It gets one row,
on the same terms as every other — a period, an identity, a spacing and a colour, multiplied into
the one field the rest are ([0131](0131-a-row-is-a-grating-and-the-picture-is-their-product.md)).

**The module declares its own reach, beside itself.** 0148's rule — a parameter is reached, or it is
written down as not — belongs to the effect registry, and the player has no entry there
([0148](0148-a-parameter-is-reached-or-it-is-written-down-as-not.md),
[0139](0139-a-row-is-what-an-effect-is-set-to.md)). So the declaration is `src/lib/playerDrift.ts`,
next to the module rather than inside a registry it is not in: the period is the landing its dials
say, one burst repeated the count it is set to, banded into `EFFECT_ROW_PERIOD_SECS` because that
band is a fact about the picture and not about what draws on it. Its wave is the plain one and its
axis the straight one, the way the loop's and a deck's own knobs are, because a wave is what an
effect claims exclusively ([0137](0137-an-effect-declares-the-wave-it-draws-with.md)) and the module
is not an effect. What tells it from those rows is what tells the macro row from them: an identity
of its own.

**Holding a pattern is not jumping.** A loop with no grid to jump around plays straight past the
module ([0089](0089-a-jump-is-the-transports.md), `playerJumps` in `src/audio/player.ts`), so a yard
that cannot jump draws no row — the same rule a bypassed instance is held to. It is `gridOf`'s own
rule exported rather than restated: a picture that disagrees with the sound about whether a yard is
jumping is worse than no picture.

**The row is what the standing part is, and it moves only at a boundary.** A song is the one thing
on a yard that changes in steps rather than continuously, so a part boundary is a discontinuity the
picture shows as one: the identity is the badge the part carries
([0157](0157-a-song-is-a-section-and-a-dial-paints-the-voice.md)), so a part coming round is another
angle and another place in the cycle and the same part coming round again is the same field; the
spacing is the part's own length in jumps, so a long part is a broad field. Read off the session and
off the live cursor `DeckPeek` already carries, and off nothing else — a drawn arrangement is a run
nothing stores ([0158](0158-a-song-may-be-drawn-and-what-is-drawn-is-never-stored.md)), so the
arrangement in force is the cursor's to say and the picture derives no second. Nothing about the row
is stored, so a cursor naming a part its song does not hold is nobody standing.

**It takes a colour, and a song's whole set of tints is four.** 0141 reads each of the three colour
dimensions off the row that says it loudest and rounds it onto its own steps so a knob moves the
tile rather than the frame ([0141](0141-colour-is-something-an-effect-turns.md)). A stepped change
has the stronger claim, so the module takes `hue` — but that rounding is safe for a knob only
because a drag ends, and **a song does not end**: it comes round, and a part is one jump at its
shortest against a burst of five milliseconds. So the module rounds its own tint onto `PLAYER_TINTS`
stops rather than onto the eight `stepped` gives a knob, sized so a whole song's tints and the other
surface's copies of them sit inside the tile cache behind the picture's ink — a set larger than that
cache, asked for in a cycle, misses every time and builds a tile on the frame the hand is on. The
tint is the fold's remainder where the identity is its whole, one fold in two independent halves the
way an effect's own row already reads its period and its wave. What that buys is the bound; what it
costs is that two parts of eight may share a tint, and the angle and the spacing are what tell those
two apart.

A jump is not a boundary and must never become one: nothing about a landing, a repeat or a voice may
reach a colour dimension. The badge is also what decides which of the screen's four motions this row
owns (`termTurns`, `src/ui/moireScreen.ts`), so a boundary moves that too — deliberately, and only
among the slots no lane or instance already holds.

**The picture is keyed on what can change a row, and the spec is not that.** A player dial patches
the whole spec on every pointer move, and two of its two dozen fields reach the row. So the surface
memoises on the period the module's row runs on rather than on the spec object, and a hand on the
Gate dial rebuilds no rows and re-runs no recurrence — the frame the hand is on is the one this step
is drawn on.

Durable shape: none.

/**
 * @role The seams of one step of a jumping pass: the two equal-power shapes a step's own fader
 *   opens and closes along, and where every one of them falls across the repeats of one landing
 *   (0089). Pure scheduling: it writes curves onto a gain and knows nothing else about the pass.
 * @instead The pass those faders belong to — the sources, the queue and the windows they are cut
 *   at → src/audio/player.ts, which is at its hard line cap and is where this was written until
 *   an audition needed the room (0045, 0181). The law the shapes come from →
 *   src/lib/crossfade.ts. What a step is → src/lib/playerWalk.ts.
 */
import { fadeCurve } from "@/lib/crossfade";
import { PLAYER_FADE_SECS } from "@/lib/player";
import type { PlayerStep } from "@/lib/playerWalk";

/** The two shapes a step's own fader opens and closes along (0089, src/lib/crossfade.ts). */
const FADE_IN = fadeCurve("in");
const FADE_OUT = fadeCurve("out");

/** One seam, along the equal-power law, beginning at `at`. */
function fade(fader: GainNode, direction: "in" | "out", at: number): void {
  fader.gain.setValueCurveAtTime(direction === "in" ? FADE_IN : FADE_OUT, at, PLAYER_FADE_SECS);
}

/**
 * Every seam of one step, on its own fader. A step nothing cuts opens at its own start and closes
 * over the next one's opening, so the two cross at equal power rather than either landing on a
 * discontinuity; a cut one opens and closes once per repeat, on that repeat's own window.
 *
 * A gated repeat carries three curves in its slot — its own opening, its closing, and the next
 * repeat's opening — and Web Audio throws on two that overlap by so much as a float's last bit.
 * So the drawn fraction is only cut where it leaves a whole fade of daylight on both sides of the
 * closing one; anything tighter is played whole rather than pinned to a margin of exactly zero,
 * which is a rounding error away from a NotSupportedError mid-pattern (0089).
 *
 * That daylight is asked of **each repeat rather than of the landing**, which is what a ratchet
 * makes a real question: shrunk repeats reach the `PLAYER_MIN_SLOT_SECS` floor, where a fade is a
 * fifth of the window and the band a gate can be cut inside is narrow. Read off the shortest
 * repeat for the whole landing, a ratchet deep enough to reach that floor would switch the Gate
 * dial off for the long repeats too; read per repeat, the long ones stutter and the tail plays
 * through — the same rule this function always had, asked where the answer can differ (P118).
 *
 * A dropped landing has no seams at all: its fader is built silent and is never opened, which is
 * the whole of what a hole is. Everything else about it is an ordinary step — the same source, the
 * same scheduled stop, the same `ended` that reaps it and the same window `position` reads the
 * deck's head out of — so the pattern keeps its place in the grid and the step after it starts
 * where it always would have (P118).
 */
export function seam(
  fader: GainNode,
  step: PlayerStep,
  at: number,
  ends: number,
  spans: number[],
): void {
  if (step.dropped) return;
  // The fraction of a repeat that sounds — never `hold`, which is the spec's count of jumps on
  // one read rate and would name two things in this one file (P82).
  const sounds = step.gate;
  let opens = at;
  // Open once and stay open until something cuts: a landing nothing cuts is one fade in at its own
  // start and one out over the next step's opening, which is what an ungated step has always been,
  // and it falls out of the same walk rather than out of a branch beside it.
  let open = false;
  for (const secs of spans) {
    const room = PLAYER_FADE_SECS / secs;
    const cut = sounds < 1 && sounds >= 3 * room && sounds <= 1 - room;
    if (!open) {
      fade(fader, "in", opens);
      open = true;
    }
    if (cut) {
      fade(fader, "out", opens + sounds * secs - PLAYER_FADE_SECS);
      open = false;
    }
    opens += secs;
  }
  if (open) fade(fader, "out", ends);
}

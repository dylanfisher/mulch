/**
 * @role The sway plugin: one modulated delay line and its four parameters — vibrato, chorus and
 *   flanging as one graph set three ways rather than three entries.
 * @instead The per-sample work → nowhere. This entry is native nodes only: a `DelayNode`, an
 *   `OscillatorNode` and gains, so there is no processor and no second copy of any range.
 */
import { WaveSineIcon } from "@phosphor-icons/react/WaveSine";

import { bindParam, type ParamBinding } from "@/audio/ramp";
import { mixCurve } from "@/lib/crossfade";
import { feedbackSettleSecs } from "@/lib/settle";
import {
  defineEffect,
  type EffectInstance,
  instanceFromBindings,
  type ParamDeclaration,
} from "./contract";

/**
 * Where the read head sits when nothing is moving it, and how far either side of that the
 * oscillator may carry it — in seconds, and equal, so a depth of all of it reaches a delay of
 * nothing without ever asking for a negative one. Eight milliseconds is the middle of the range
 * the three sounds this entry covers are read off: parked there by a shallow depth it is a chorus,
 * a doubling too far behind to hear as one voice, and a deep one sweeps the head down through the
 * few milliseconds where the comb's teeth stand wide enough apart to hear as a flange. A full mix
 * with no feedback is a vibrato at either. The node's own `maxDelayTime` is their sum for the reason
 * delay.ts's is its declared maximum: a modulation that ran past it would be clamped, and the
 * knob would read past what is heard.
 */
const SWAY_CENTRE_SECS = 0.008;
const SWAY_SPAN_SECS = SWAY_CENTRE_SECS;

const params = [
  /**
   * How fast the head wanders, in hertz. Logarithmic, because the difference between a fifth of a
   * hertz and two fifths is a different sound and the difference between seven and eight is not.
   */
  {
    id: "sway.rate",
    label: "Sway Rate",
    min: 0.05,
    max: 8,
    default: 0.6,
    precision: 2,
    curve: "log",
    automation: "linear",
  },
  /**
   * How much of `SWAY_SPAN_SECS` the wander actually takes, as a share of it. A share rather than
   * seconds because a knob reading four decimal places is a knob nobody reads, and because this is
   * the number the graph wants: it is the gain the oscillator passes through on its way to the
   * delay's own time.
   */
  {
    id: "sway.depth",
    label: "Depth",
    min: 0,
    max: 1,
    default: 0.35,
    precision: 2,
    automation: "linear",
  },
  /**
   * How much of the delayed signal is fed back into it, which is what turns a wandering copy into
   * a comb with teeth. Capped under one, where the loop stops decaying at all — the tape is the
   * entry that goes past unity on purpose (0148) and this one has no saturation to bound it.
   */
  {
    id: "sway.feedback",
    label: "Resonance",
    min: 0,
    max: 0.9,
    default: 0.25,
    precision: 2,
    automation: "linear",
  },
  {
    /**
     * How much of the wandering copy is heard against the untouched input. Named "Sway Mix" rather
     * than "Mix" for the reason the crush's and the pop's are: every automation lane's label is
     * what the picker and its aria-label say, and the delay already holds that word
     * (src/audio/params.ts).
     */
    id: "sway.mix",
    label: "Sway Mix",
    min: 0,
    max: 1,
    default: 0.5,
    precision: 2,
    automation: "linear",
  },
] as const satisfies readonly ParamDeclaration[];

type SwayParamId = (typeof params)[number]["id"];

export const swayEffect = defineEffect({
  id: "sway",
  label: "Sway",
  width: "half",
  face: "knobs",
  // Absent at a mix of nothing, exactly as the delay is and by the same crossfade: the wet gain
  // shuts and the dry path is untouched, so the effect is a wire however far the head is wandering
  // (0202).
  presence: { param: "sway.mix", silent: 0 },
  icon: WaveSineIcon,
  drift: "sway",
  geometry: "linear",
  // The oscillator's rate is how fast the picture is moving under the camera, and a camera does not
  // sample the three channels at one instant: the faster the sway, the further apart the three
  // channel lattices land, which is the fringe (`CHANNEL_LAG`, src/ui/moireScreen.ts, 0141). The
  // cycle it works over is the warp's wander below, the same knob read whole-field; the row's own
  // period is the one its id folds to, as the filter's is. Its
  // depth is how unevenly the row travels through its own fringes, which is `bend` — the reading
  // the tape's own wow already has, because a modulation is exactly a thing that does not run at
  // one speed (0146). The feedback is a repeat of what has already been heard, which in the
  // picture is the frame before this one cut back into it, the reading the delay's own feedback
  // has (0143). And the mix is how much of this entry is heard at all, which is how much of its
  // own depth its row cuts (0148).
  driftFrom: [
    { param: "sway.rate", into: "fringe" },
    { param: "sway.depth", into: "bend" },
    { param: "sway.feedback", into: "feedback" },
    { param: "sway.mix", into: "depth" },
  ],
  // And the whole-field move a sway makes: the finished picture bent through two sines, which reads
  // as *sway* at any zoom (0278, 0279). How deep it bends is the depth, on its own range; how fast
  // that bend goes round is the rate, in the cycles a second the parameter is already stated in —
  // the wander is a speed, and a turn on a range would be a second unit for one number.
  look: "warp",
  lookFrom: [
    { param: "sway.depth", into: "bend" },
    { param: "sway.rate", into: "wander" },
  ],
  // A delay line's repeats falling to the same silence the delay's are stated against, over the
  // longest loop the head reaches: the centre plus whatever share of the span the depth is asking
  // for, because a deeper wander is a longer line to empty.
  //
  // The wander's own phase is not in this number and cannot be: it is free-running, so where in its
  // cycle a take opens is a function of how long the instance has been going, and no warm-up
  // recovers that. Finite anyway, and this is the judgment — 0239 hands `Infinity` to the things
  // whose *decisions* depend on elapsed time, and a chorus makes none: the state a warm-up has to
  // arrive at is the comb, which is settled, and not the point of the sweep, which the ear cannot
  // name. The tape's wow is the same shape already, and declares the same finite second.
  settle: (values) =>
    feedbackSettleSecs(
      SWAY_CENTRE_SECS + SWAY_SPAN_SECS * values["sway.depth"],
      values["sway.feedback"],
    ),
  params,
  // Over the line cap by the derivation `sway.mix` is, which is the delay's own: the crossfade's
  // nodes belong to the graph they are wired into, and a helper holding them would hand a caller
  // this plugin's privates (0007).
  // oxlint-disable-next-line max-lines-per-function
  build: (ctx, values): EffectInstance<SwayParamId> => {
    const input = ctx.createGain();
    const dry = ctx.createGain();
    const delay = ctx.createDelay(SWAY_CENTRE_SECS + SWAY_SPAN_SECS);
    const feedback = ctx.createGain();
    const wet = ctx.createGain();
    const output = ctx.createGain();

    // The head's resting place, which nothing binds: a modulated AudioParam sums onto its intrinsic
    // value, so this is the nought the oscillator swings either side of and `sway.depth` is the
    // only thing that says how far.
    delay.delayTime.value = SWAY_CENTRE_SECS;
    const wander = ctx.createOscillator();
    wander.type = "sine";
    // Two gains rather than one: `depth` is the share a hand moves and `span` turns that share into
    // the seconds the delay's own time is in. A binding is one AudioParam read at the declared
    // value and nothing else (src/audio/ramp.ts), so a knob in seconds would be the only way to
    // fold these into one — and that knob reads four decimal places.
    const depth = ctx.createGain();
    const span = ctx.createGain();
    span.gain.value = SWAY_SPAN_SECS;

    // `sway.mix` is one declared parameter, so it is one AudioParam: a DC source both crossfade
    // gains derive from through the equal-power curves (0049). The fourth occurrence of this
    // block, written out for the reason the third one records at tape.ts's own `mix` — extracting
    // it would reorder node construction in three shipped plugins for no behaviour (principle 4).
    const mix = ctx.createConstantSource();
    const dryShape = ctx.createWaveShaper();
    dryShape.curve = mixCurve("dry");
    const wetShape = ctx.createWaveShaper();
    wetShape.curve = mixCurve("wet");
    // The shaped signal is the whole of each gain: a modulated AudioParam sums onto its intrinsic
    // value, so that value has to be zero rather than the 1 a gain node is built at.
    dry.gain.value = 0;
    wet.gain.value = 0;
    mix.connect(dryShape).connect(dry.gain);
    mix.connect(wetShape).connect(wet.gain);

    const bindings = {
      "sway.rate": bindParam(wander.frequency),
      "sway.depth": bindParam(depth.gain),
      "sway.feedback": bindParam(feedback.gain),
      "sway.mix": bindParam(mix.offset),
    } satisfies Record<SwayParamId, ParamBinding>;

    const bound = instanceFromBindings(params, bindings, values);
    // After the initialize loop, for the reason the delay starts its own source there: neither
    // runs at its constructed default — full wet, and four hundred and forty hertz — for the
    // window between construction and the value it was built with.
    mix.start();
    wander.start();

    input.connect(dry).connect(output);
    input.connect(delay).connect(wet).connect(output);
    delay.connect(feedback).connect(delay);
    wander.connect(depth).connect(span).connect(delay.delayTime);

    return {
      input,
      output,
      ...bound,
      dispose: () => {
        mix.stop();
        mix.disconnect();
        wander.stop();
        wander.disconnect();
        depth.disconnect();
        span.disconnect();
        dryShape.disconnect();
        wetShape.disconnect();
        input.disconnect();
        dry.disconnect();
        delay.disconnect();
        feedback.disconnect();
        wet.disconnect();
        output.disconnect();
      },
    };
  },
});

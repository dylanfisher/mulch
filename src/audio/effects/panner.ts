/**
 * @role The panner plugin: a plain pan across the field, and three stages that stack over it — a
 *   band split, a time offset between the sides, and a slicer — with the graph each of them builds
 *   and takes away again.
 * @instead The per-sample work → nowhere. This entry is native nodes only: filters, delays, gains,
 *   stereo panners and one oscillator, so there is no processor and no second copy of any range.
 *   The whole-field move it makes in the picture → `staggerLook`, src/lib/moirePanner.ts.
 */
import { ArrowsOutLineHorizontalIcon } from "@phosphor-icons/react/ArrowsOutLineHorizontal";

import { bindParam, type ParamBinding } from "@/audio/ramp";
import { SETTLE_FLOOR_SECS } from "@/lib/settle";
import {
  defineEffect,
  type EffectInstance,
  instanceFromBindings,
  type ParamDeclaration,
} from "./contract";

/**
 * Where the band split is cut, in hertz. Three ways rather than two, because what this stage is for
 * is the lows arriving on one side while the highs are still on the other — and a sound with only
 * two pieces has no middle left standing where it was to hear that against. The corners are an
 * octave either side of the middle of the ear's own range, which is where a mix's bass, its body and
 * its air already part company.
 */
const BAND_LOW_HZ = 320;
const BAND_HIGH_HZ = 2_800;

/**
 * How far apart in time the two sides may stand, in seconds, and where they stand when the spread is
 * at nothing. Both sides rest at the base and the spread pushes one later and the other earlier by
 * up to the same again, so the pair never asks a delay for a negative time and a spread of nothing
 * is the two sides in step. Ten milliseconds is the precedence window — far enough apart to hear a
 * move as arriving, near enough that it is one sound arriving and not two.
 */
const TIME_BASE_SECS = 0.01;
const TIME_SPREAD_SECS = 0.01;

/**
 * How much quieter the far side goes at the whole of the spread. The side that arrives later also
 * arrives smaller, which is what distance sounds like; the near side is left alone, because two
 * sides both turned down is the whole effect turned down and that is what the spread is not.
 */
const TIME_TILT = 0.4;

/**
 * How steeply the slicer's own sine is squared up, as the slope of the shaping curve through nought,
 * and how many points that curve is drawn at. Steep enough that a slice is a slice and not a sweep —
 * which is the difference between this stage and the LFO pan the entry refuses (0323) — and short of
 * a hard edge, so the hand-off between the two slices is a few milliseconds of crossfade rather than
 * a click at the slice rate.
 */
const SLICE_STEEP = 6;
const SLICE_CURVE_POINTS = 257;

/** The three the graph carries as AudioParams, so each takes a lane like any other knob. */
const moveParams = [
  {
    /** Where the whole of it sits between the speakers, exactly as a yard's own pan is stated. */
    id: "panner.position",
    label: "Position",
    min: -1,
    max: 1,
    default: 0,
    precision: 2,
    automation: "linear",
  },
  {
    /**
     * How far apart the pieces stand across the field. At nothing every stage collapses onto the
     * position — the bands sit together, the sides stand in step at one gain, and the two slices
     * land in one place — which is why this is the presence whatever the toggles say.
     */
    id: "panner.spread",
    label: "Spread",
    min: 0,
    max: 1,
    default: 0.5,
    precision: 2,
    automation: "linear",
  },
  {
    /**
     * How fast successive slices are landed, in hertz. Logarithmic, for the sway rate's reason: the
     * difference between a fifth of a hertz and two fifths is a different sound and the difference
     * between seven and eight is not. It is a slice rate and not a pan speed — the entry grows no
     * LFO across the field, because a yard's own pan takes a lane already (0128, 0323).
     */
    id: "panner.rate",
    label: "Slice Rate",
    min: 0.05,
    max: 8,
    default: 1,
    precision: 2,
    curve: "log",
    automation: "linear",
  },
] as const satisfies readonly ParamDeclaration[];

/**
 * The three stages, each a discrete choice and so a number stepped by one (contract.ts). They stack:
 * a band split whose grains also move is the sound this entry is for, so none of them is a mode that
 * excludes another. No `rebuild` — a toggle is two values wide, a move that lands on the value
 * already standing rewires nothing, and what it builds is a handful of native nodes rather than a
 * buffer (0090).
 */
const stageParams = [
  { id: "panner.band", label: "Band", min: 0, max: 1, default: 0, precision: 0, step: 1 },
  { id: "panner.time", label: "Time", min: 0, max: 1, default: 0, precision: 0, step: 1 },
  { id: "panner.slice", label: "Slice", min: 0, max: 1, default: 0, precision: 0, step: 1 },
] as const satisfies readonly ParamDeclaration[];

const params = [...moveParams, ...stageParams] as const satisfies readonly ParamDeclaration[];

type PannerParamId = (typeof params)[number]["id"];
type MoveParamId = (typeof moveParams)[number]["id"];
type StageParamId = (typeof stageParams)[number]["id"];

/** The order the signal meets the stages in, which is also the order this file declares them. */
const STAGE_IDS = stageParams.map((param) => param.id);

const isMoveParam = (param: PannerParamId): param is MoveParamId =>
  !(STAGE_IDS as readonly string[]).includes(param);

/**
 * Why none of the three toggles reaches a dimension of a row — one sentence, because it is one
 * reason said of three knobs rather than three reasons that happen to read alike (principle 1).
 */
const STAGE_UNREACHED = "a stage is standing or it is not, and a row's dimensions are amounts";

/** Whether a toggle's value, whatever a command or a run handed it, is asking for the stage. */
const toggled = (value: number): boolean => Math.round(value) >= 1;

/**
 * One stage's nodes, and the one thing the graph asks of every one of them: an input to feed and an
 * output to take, and a way to let go of everything it built. A stage that is off is not a stage at
 * all — it is a wire, and the rewire below is what makes it one.
 */
type Stage = { input: AudioNode; output: AudioNode; dispose(): void };

/** The steepened sine the slicer gates with: a slice, held, and then the other one. */
function sliceCurve(): Float32Array<ArrayBuffer> {
  const curve = new Float32Array(SLICE_CURVE_POINTS);
  for (let at = 0; at < SLICE_CURVE_POINTS; at++) {
    curve[at] = Math.tanh(SLICE_STEEP * ((at / (SLICE_CURVE_POINTS - 1)) * 2 - 1));
  }
  return curve;
}

export const pannerEffect = defineEffect({
  id: "panner",
  label: "Panner",
  width: "half",
  face: "knobs",
  // Absent at a spread of nothing, with the position and all three stages held (0202). Silence here
  // means the input passed through unchanged, and that is a stronger claim than "every piece is in
  // one place": a band split at no spread is still three crossovers summed, which is a notch in the
  // middle of the picture, and a time stage at no spread is still ten milliseconds of everything.
  // So what "off" describes is the plain pan the entry ships as — the position at the middle, and no
  // stage standing — and a run fades a panner in and out through that one. All the way in is the
  // whole of the spread, and a hand stacks whatever it likes on top of it.
  presence: {
    param: "panner.spread",
    silent: 0,
    full: 1,
    held: ["panner.position", ...STAGE_IDS],
  },
  icon: ArrowsOutLineHorizontalIcon,
  drift: "cross",
  geometry: "linear",
  // Where the sound sits is where the row sits across the picture, which is the one dimension that
  // is a place rather than an amount (`centre`). How far apart the pieces stand is how far apart the
  // picture's three channels are drawn — a stereo spread is exactly that said in ink, and it is the
  // one colour this entry has any business turning (0141). And the slice rate is how fast the thing
  // is running, which is the row's own pitch.
  driftFrom: [
    { param: "panner.position", into: "centre" },
    { param: "panner.spread", into: "disperse" },
    { param: "panner.rate", into: "pitch" },
  ],
  // And the three toggles reach no dimension of a row, for the EQ shape's reason (0148, 0322): a row
  // is a grating and every dimension it has is a quantity, and which stages are standing is three
  // choices. What they do to the sound is how far apart its pieces end up, which is the spread's own
  // dimension above — a second road into it would be principle 1.
  driftUnreached: stageParams.map(({ id }) => ({ param: id, because: STAGE_UNREACHED })),
  // The picture's own rows displaced across the field in bands, by the spread, at the position: the
  // field no longer standing in one piece, which is what a panner does to a sound said at a glance's
  // size (0323).
  look: "stagger",
  lookFrom: [
    { param: "panner.spread", into: "spread" },
    { param: "panner.position", into: "position" },
  ],
  // The longest thing in the graph is the time stage's own offset, and there is no feedback anywhere
  // to ring past it: the two sides stand at most a base and a spread apart, and a filter's memory is
  // its own two samples. The slicer's phase is free-running and no warm-up recovers it, which is the
  // sway's answer and this entry's for the same reason — what a warm-up has to arrive at is the
  // graph settled, and a slicer makes no decision that depends on how long it has been going (0239).
  settle: () => Math.max(SETTLE_FLOOR_SECS, TIME_BASE_SECS + TIME_SPREAD_SECS),
  params,
  // One graph with three stages that come and go inside it, and every node it holds is disposed by
  // the one `dispose` below: a helper holding them would hand a caller this plugin's privates, which
  // is the reason the sway's build is waived at the same cap (0007).
  // oxlint-disable-next-line max-lines-per-function
  build: (ctx, values): EffectInstance<PannerParamId> => {
    const input = ctx.createGain();
    input.channelCount = 2;
    input.channelCountMode = "explicit";
    const staged = ctx.createGain();
    const pan = ctx.createStereoPanner();
    const output = ctx.createGain();
    // The panner's own resting place is nought and the position source is the only thing that moves
    // it: a modulated AudioParam sums onto its intrinsic value, so a bound `pan.pan` and a fanned-out
    // source would be the position counted twice.
    pan.pan.value = 0;
    staged.connect(pan).connect(output);

    /**
     * The two knobs the stages read, as DC sources rather than as bindings onto one node's parameter:
     * a stage is built and taken away again, and a binding onto a node that has gone is a knob that
     * moves nothing. One source per knob, fanned out through gains to whatever is standing, is the
     * one place either value is stated (principle 1).
     */
    const position = ctx.createConstantSource();
    const spread = ctx.createConstantSource();
    position.connect(pan.pan);

    // The slicer's clock, kept whether or not the slicer is standing, for the sources' reason: its
    // frequency is what `panner.rate` binds to. Two oscillators would be two answers to how fast the
    // slices are running, and a rebuilt one would restart the phase on every toggle.
    const slicer = ctx.createOscillator();
    slicer.type = "sine";
    const square = ctx.createWaveShaper();
    square.curve = sliceCurve();
    slicer.connect(square);

    const bindings = {
      "panner.position": bindParam(position.offset),
      "panner.spread": bindParam(spread.offset),
      "panner.rate": bindParam(slicer.frequency),
    } satisfies Record<MoveParamId, ParamBinding>;
    const bound = instanceFromBindings(moveParams, bindings, values);
    // After the initialize loop, for the reason the sway's are: neither source runs at its
    // constructed default — an offset of one, and four hundred and forty hertz — for the window
    // between construction and the value it was built with.
    position.start();
    spread.start();
    slicer.start();

    /** One gain off the spread source, scaled: how a stage asks for a share of it. */
    const spreadBy = (scale: number): GainNode => {
      const gain = ctx.createGain();
      gain.gain.value = scale;
      spread.connect(gain);
      return gain;
    };

    /**
     * A stage letting go: its own nodes, and then the taps it took off the spread source — named
     * separately because `gain.disconnect()` lets go of what a node feeds and not of what feeds it,
     * so a tap dropped the short way would leave the source pushing into a node nothing reads.
     */
    const drop = (nodes: readonly AudioNode[], taps: readonly GainNode[]): void => {
      for (const node of nodes) node.disconnect();
      for (const tap of taps) {
        spread.disconnect(tap);
        tap.disconnect();
      }
    };

    /**
     * The band split: three crossover filters, each into its own panner, so the lows sit on one side
     * of the field and the highs on the other while the middle stays where the position put it.
     */
    const buildBand = (): Stage => {
      const stageIn = ctx.createGain();
      const stageOut = ctx.createGain();
      const low = ctx.createBiquadFilter();
      low.type = "lowpass";
      low.frequency.value = BAND_LOW_HZ;
      const mid = ctx.createBiquadFilter();
      mid.type = "bandpass";
      mid.frequency.value = Math.sqrt(BAND_LOW_HZ * BAND_HIGH_HZ);
      const high = ctx.createBiquadFilter();
      high.type = "highpass";
      high.frequency.value = BAND_HIGH_HZ;
      const lowPan = ctx.createStereoPanner();
      const highPan = ctx.createStereoPanner();
      lowPan.pan.value = 0;
      highPan.pan.value = 0;
      const lowward = spreadBy(-1);
      const highward = spreadBy(1);
      lowward.connect(lowPan.pan);
      highward.connect(highPan.pan);
      stageIn.connect(low).connect(lowPan).connect(stageOut);
      stageIn.connect(mid).connect(stageOut);
      stageIn.connect(high).connect(highPan).connect(stageOut);
      return {
        input: stageIn,
        output: stageOut,
        dispose: () => {
          drop([stageIn, stageOut, low, mid, high, lowPan, highPan], [lowward, highward]);
        },
      };
    };

    /**
     * The time offset: the two sides split apart, one pushed later and the other earlier by the
     * spread, and the late one turned down by its own share of it — a move heard arriving rather
     * than switching.
     */
    const buildTime = (): Stage => {
      const stageIn = ctx.createGain();
      // Explicitly stereo for the reason tape.js's loop is: a splitter handed one channel leaves its
      // second output silent, and this stage is the two sides of the field or it is nothing.
      stageIn.channelCount = 2;
      stageIn.channelCountMode = "explicit";
      const split = ctx.createChannelSplitter(2);
      const merge = ctx.createChannelMerger(2);
      const later = ctx.createDelay(TIME_BASE_SECS + TIME_SPREAD_SECS);
      const sooner = ctx.createDelay(TIME_BASE_SECS + TIME_SPREAD_SECS);
      later.delayTime.value = TIME_BASE_SECS;
      sooner.delayTime.value = TIME_BASE_SECS;
      const back = spreadBy(TIME_SPREAD_SECS);
      const forward = spreadBy(-TIME_SPREAD_SECS);
      back.connect(later.delayTime);
      forward.connect(sooner.delayTime);
      const quieter = ctx.createGain();
      quieter.gain.value = 1;
      const tilt = spreadBy(-TIME_TILT);
      tilt.connect(quieter.gain);
      stageIn.connect(split);
      split.connect(later, 0).connect(quieter).connect(merge, 0, 0);
      split.connect(sooner, 1).connect(merge, 0, 1);
      return {
        input: stageIn,
        output: merge,
        dispose: () => {
          drop([stageIn, split, merge, later, sooner, quieter], [back, forward, tilt]);
        },
      };
    };

    /**
     * The slicer: two gates in antiphase off the squared-up sine, each into its own panner, so
     * successive short slices land at their own points either side of the position.
     */
    const buildSlice = (): Stage => {
      const stageIn = ctx.createGain();
      const stageOut = ctx.createGain();
      const here = ctx.createGain();
      const there = ctx.createGain();
      // Half open each, and the shaped sine swinging them the rest of the way in antiphase: a
      // modulated gain sums onto its intrinsic value, so the pair always comes to one.
      here.gain.value = 0.5;
      there.gain.value = 0.5;
      const open = ctx.createGain();
      open.gain.value = 0.5;
      const shut = ctx.createGain();
      shut.gain.value = -0.5;
      square.connect(open).connect(here.gain);
      square.connect(shut).connect(there.gain);
      const herePan = ctx.createStereoPanner();
      const therePan = ctx.createStereoPanner();
      herePan.pan.value = 0;
      therePan.pan.value = 0;
      const hereward = spreadBy(1);
      const thereward = spreadBy(-1);
      hereward.connect(herePan.pan);
      thereward.connect(therePan.pan);
      stageIn.connect(here).connect(herePan).connect(stageOut);
      stageIn.connect(there).connect(therePan).connect(stageOut);
      return {
        input: stageIn,
        output: stageOut,
        dispose: () => {
          // The shaper feeds this stage and nothing else, so letting go of its own outputs is what
          // takes the two gates off it — the `drop` above says why a node's own disconnect cannot.
          square.disconnect();
          drop(
            [stageIn, stageOut, here, there, open, shut, herePan, therePan],
            [hereward, thereward],
          );
        },
      };
    };

    const builders: Record<StageParamId, () => Stage> = {
      "panner.band": buildBand,
      "panner.time": buildTime,
      "panner.slice": buildSlice,
    };
    /** Which stages are standing, keyed by the toggle that asked for each. */
    const standing = new Map<StageParamId, Stage>();

    /**
     * The chain, re-laid: input through whatever is standing, in order, into the panner. Every stage
     * is disconnected from its neighbour first, because a stage that has just left is a node that
     * would otherwise still be feeding the one after it.
     */
    const rewire = (): void => {
      input.disconnect();
      for (const stage of standing.values()) stage.output.disconnect();
      let at: AudioNode = input;
      for (const id of STAGE_IDS) {
        const stage = standing.get(id);
        if (stage === undefined) continue;
        at.connect(stage.input);
        at = stage.output;
      }
      at.connect(staged);
    };

    const setStage = (id: StageParamId, wanted: boolean): void => {
      const held = standing.get(id);
      if (wanted === (held !== undefined)) return;
      if (held === undefined) standing.set(id, builders[id]());
      else {
        standing.delete(id);
        held.dispose();
      }
      rewire();
    };

    for (const id of STAGE_IDS) if (toggled(values[id])) standing.set(id, builders[id]());
    rewire();

    return {
      input,
      output,
      ...bound,
      setParam: (param, value, when) => {
        if (isMoveParam(param)) {
          bound.setParam(param, value, when);
          return;
        }
        // Not scheduled against `when`, for the reason a shape is not (0322): a stage is a set of
        // nodes and there is no ramping to a graph.
        setStage(param, toggled(value));
      },
      // No `automationTarget` of its own, for the reason src/audio/effects/eq.ts declares none: the
      // spread above answers for the three it was handed and throws for the three toggles (0024).
      dispose: () => {
        // **The stages first, and the sources they read after them.** A stage lets go of its own
        // taps from the spread source's side (`drop` above), and a node told to let go of a
        // destination it is not connected to throws — so a source disconnected whole before its
        // stages would throw on the first tap and leave everything after it wired (0323).
        for (const stage of standing.values()) stage.dispose();
        standing.clear();
        position.stop();
        position.disconnect();
        spread.stop();
        spread.disconnect();
        slicer.stop();
        slicer.disconnect();
        square.disconnect();
        input.disconnect();
        staged.disconnect();
        pan.disconnect();
        output.disconnect();
      },
    };
  },
});

/**
 * @role The contract every effect plugin implements: identity, owned parameter declarations,
 *   graph construction, parameter binding, and disposal.
 */
import type { Icon } from "@phosphor-icons/react";

import type { ParamBinding } from "@/audio/ramp";
import type { GrowthBounds } from "@/lib/effectGrowth";
import { assertDurableText } from "@/lib/guards";
import type { DriftDimension, DriftGeometry } from "@/lib/moire";
import type { DriftProfile } from "@/lib/moireProfiles";

export type ParamSpec = {
  label: string;
  min: number;
  max: number;
  default: number;
  /**
   * Decimal places the value is read at. Declared, never guessed: a knob paints its readout per
   * frame, and a parameter whose range is thousands wide would otherwise spend every one of them
   * repainting the float's last digits (0064).
   */
  precision: number;
  /** Discrete choices remain numbers, quantized to this interval from `min`. */
  step?: number;
  /**
   * Present when moving this parameter makes its plugin rebuild something — a buffer, a curve —
   * rather than write a number, which is what a run of such moves cannot be asked for at a
   * pointer's rate. The plugin records the value and builds in `endGesture`; the rack decides
   * which moves are a run. Declared here rather than guessed at the knob, and never together with
   * `automation` ([0090](../../../docs/decisions/0090-a-rebuild-is-declared-and-paid-at-the-gesture-end.md)).
   */
  rebuild?: true;
  curve?: "log";
  /**
   * Present when a fresh instance starts this parameter at a draw from its own id rather than at
   * the declared default — which a seed is, because two automators added the same afternoon are
   * two runs and not one heard twice. The draw is a fold of the id the adding gesture minted, so
   * it is random in the hand and the same on every replay of the file that recorded it (0076).
   */
  seeded?: true;
  /** Present only when this registry parameter owns a durable automation lane. */
  automation?: "linear";
};

export type ParamDeclaration<Id extends string = string> = ParamSpec & { id: Id };

/**
 * One occurrence of an effect in one rack: an opaque, caller-supplied, durable string, exactly
 * like a deck's id (0029) or a clip's (0027). It is not an index and not a label — a rack holds
 * any number of instances of the same registry entry, so the effect id cannot be the identity
 * and a value lookup is (instance, param) rather than param alone (0030).
 */
export type EffectInstanceId = string;

/** The one guard on an instance id, shared by the commands and the stored-shape validator. */
export function assertEffectInstanceId(
  value: unknown,
  at: string,
): asserts value is EffectInstanceId {
  assertDurableText(value, at);
}

export type EffectInstance<Param extends string = string> = {
  input: AudioNode;
  output: AudioNode;
  setParam(param: Param, value: number, when: number): void;
  /**
   * Build what the `rebuild` moves since the last one only recorded — once, whichever of them
   * moved, because they may be arguments to one thing. Required exactly of a plugin that declares
   * such a parameter, and the rack throws for one that declares it and binds no `endGesture`, the
   * way it does for a missing `automationTarget` (0090).
   */
  endGesture?(): void;
  /**
   * The bound `AudioParam` an automation lane is scheduled onto. Required exactly for the
   * parameters this plugin declared `automation`, and absent for the rest — the registry field is
   * what makes it required, so the rack throws rather than guessing (0024).
   */
  automationTarget?(param: Param): AudioParam;
  /**
   * What this effect's graph is doing right now, as one number a meter paints — the compressor's
   * gain reduction in dB is the first. Present only for the plugins that have such a number, and
   * never a parameter: it is a measurement of what the audio just did rather than a setting
   * anyone made, so it declares no `ParamSpec`, never enters the session and never reaches the
   * archive. Read per frame by whoever paints it, like a peak meter (P60).
   */
  meter?(): number;
  /**
   * What this instance is holding right now, written into `out` and refilled in place — a reading
   * and never a setting, asked per frame and gone, exactly as `meter` above is. It answers how
   * many rows it wrote and **never shortens `out` itself**: a sixty-times-a-second read may not
   * call `length = 0` any more than it may call `clear()`, so the caller trims on the one frame
   * the count actually changes (0070). Present only on a plugin holding something to report.
   */
  grown?(out: GrownEffect[]): number;
  /**
   * Advance whatever this instance grows for itself up to `now + horizon`, scheduling every change
   * at its own instant. Called at the cadence a deck arms its lanes at — an interval live, the
   * render's own pump offline (0071) — so **nothing here may depend on when it is called, only on
   * which ticks it covers.** The two cadences differ, and a decision taken off the wall clock is
   * one an export would not reproduce (0204).
   */
  pump?(now: number, horizon: number): void;
  /**
   * The session's shared clock in seconds, or null where each yard keeps its own time. Pushed down
   * rather than read up: this tier may not import the session (docs/map.md), and a plugin that
   * paces itself musically needs the number the yards are counting in (0097).
   */
  setSync?(sync: number | null): void;
  /**
   * The windows a hand has put on what this instance may draw, by the drawn parameter's own id.
   * Pushed down for the reason `setSync` above is: this tier may not import the session, and a
   * bound is durable state about the run rather than a parameter of the entry holding it — it is
   * read off the pool's own declarations, so a parameter added to a plugin tomorrow is bounded by
   * construction (0208). Present only on a plugin that draws something.
   */
  setBounds?(bounds: GrowthBounds): void;
  dispose(): void;
};

/**
 * How present an effect is, and the value at which it is not present at all.
 *
 * Declared rather than assumed because the plugins spell it six ways: a delay and a reverb are
 * absent at a mix of nothing, a peaking EQ at a gain of nothing, a compressor at a ratio of one,
 * and a lowpass filter at the *top* of its own range. There is no shared parameter id to look for
 * and no value that means the same thing twice, so "turn this effect down to nothing" is a fact
 * only the plugin can state (0202).
 *
 * **Silent here means transparent, not silent.** An effect is a link in a series chain, so what
 * is asked for is that it passes its input through unchanged — never that it outputs zero, which
 * would be the chain muted rather than the effect absent.
 *
 * The named parameter must declare `automation: "linear"`. A fade is a schedule laid onto a bound
 * `AudioParam`, and a manual move is capped at `PARAM_RAMP_SECS` by the join every gesture comes
 * through (src/audio/ramp.ts) — so a parameter with no lane behind it cannot be faded over a
 * second, only stepped to.
 */
export type EffectPresence<Param extends string = string> =
  | {
      param: Param;
      /** The value of `param` at which this effect passes its input through unchanged. */
      silent: number;
      /**
       * The parameters that must stand at their declared default for `silent` to be silent. The
       * compressor forces this: `comp.output` is a makeup multiplier, so a compressor at a ratio
       * of one with a drawn makeup of two is +6dB of nothing at all.
       */
      held?: readonly Param[];
      /**
       * What this parameter stands at when the effect is all the way in. The declared default,
       * where that says something — but the EQ forces the field: a peaking band ships flat, so its
       * default *is* its silence, and an automator fading it from nothing to nothing would grow a
       * row nobody could hear. Declared rather than guessed, and refused at load for a value equal
       * to `silent` or outside the parameter's own range (0202).
       */
      full?: number;
    }
  /** For an entry there is no honest presence for, beside the reason — 0148's shape again. */
  | { none: string };

/**
 * How much of the rack one card of this effect claims: half of it, so a wide viewport lays two
 * abreast, or all of it. Declared by the plugin beside its icon, because how much room a set of
 * knobs needs is a fact about the effect and not about the rack rendering it (P48).
 */
export type EffectWidth = "half" | "full";

/**
 * What a card of this effect is under its knobs. Every entry so far is `knobs` and nothing else —
 * the card is its parameters and stops. An entry that holds a run of its own has something more to
 * show, and says so here.
 *
 * Declared beside `width` rather than branched on by the rack, for the same reason `width` is: how
 * much a card has to show is a fact about the effect. A painter keyed on the *id* would be the
 * second map from ids to pictures that the `icon` field exists to prevent (0055, 0205).
 */
export type EffectFace = "knobs" | "grown";

/**
 * One effect an instance is holding of its own, as much of it as a surface paints: which entry it
 * is, the id it is held under, how long it has left of the life it was laid for, and how far in it
 * stands — 0 where it is only arriving or has all
 * but gone, 1 where it is at what it was drawn at. Never durable and never a setting: it is what
 * is happening, read per frame and gone (0128, 0204).
 */
export type GrownEffect = {
  effect: string;
  instance: EffectInstanceId;
  presence: number;
  /** Seconds until it begins to leave, so a surface can say when something goes before it does. */
  remain: number;
  /** How long a place stands here, which is what `remain` is a remainder of. */
  life: number;
  /**
   * Where each of the knobs this instance had drawn for it stands, as a fraction of its own range
   * — the picture of what was done to it, in the order its plugin declares its parameters. Shared
   * rather than copied: the array belongs to whatever grew the instance, and a row read per frame
   * may not allocate one (0070).
   */
  values: readonly number[];
};

export type Effect<
  Id extends string = string,
  Params extends readonly ParamDeclaration[] = readonly ParamDeclaration[],
> = {
  id: Id;
  label: string;
  width: EffectWidth;
  /**
   * Which of this entry's parameters says how present it is, and where that parameter stands when
   * it is not heard — the one fact an automator needs to bring an effect in and take it out
   * without a step (0202). Declared beside `width` because how an effect is turned down to
   * nothing is a fact about the effect, not about whoever is turning it.
   */
  presence: EffectPresence<Params[number]["id"]>;
  /** What this entry's card carries under its knobs, if anything (0205). */
  face: EffectFace;
  /**
   * Present on an entry that draws a run of other entries rather than only running itself. Two
   * things follow from it and nothing else does: a hand may put a window on what it draws — the
   * `bounds` a rack entry carries, which reach the instance through `setBounds` above — and what
   * it is running is a stream rather than a period, so a yard holding one never comes back round
   * and the estimate beside its picture must not put a figure on it (0080, 0208).
   */
  grows?: true;
  /**
   * The picture this effect is offered by, declared here beside its identity. An effect is not
   * an action, so it never appears in the UI's `ACTION_ICONS`, and a second map from effect ids
   * to pictures is the thing this field exists to prevent (0055). The component itself comes
   * from a per-icon import in the plugin file; only the type is named here, and a type import
   * is erased, so nothing pulls the icon barrel into the bundle.
   */
  icon: Icon;
  /**
   * The shape of the wave this effect draws its rows of the drift picture with, declared here for
   * the same reason the icon is: a row's pitch says how fast something is running and its angle
   * says which parameter it is, so without this a filter and a delay are one more cosine each and
   * read alike. Every entry claims one of its own — the registry throws at load for two that claim
   * the same, and for one claiming the plain profile a row no effect owns is cut to — because the
   * alternative is a map of effect ids to looks in the painter, which is the second map from ids
   * to pictures the `icon` field above already exists to prevent (0055, 0122).
   */
  drift: DriftProfile;
  /**
   * The coordinate this effect's rows are cut along — straight, or a family of rings, spokes or
   * spirals — declared here beside the wave for the same reason the wave is: every row in the
   * instrument used to be a straight grating, so the only fringes it could make were straight ones
   * too. Unlike the profile it is not claimed exclusively, because two rooms are both radial; the
   * registry refuses one the picture cannot draw and nothing else (0142).
   */
  geometry: DriftGeometry;
  /**
   * How this effect's own values reach the drift picture: one of its parameters into each row
   * dimension it claims, declared here beside the profile for the same reason the profile is
   * declared here. Without it a row is folded out of an instance's id alone, so a delay at 30ms
   * and the same delay at two seconds draw the identical row. Every entry declares at least one —
   * the registry throws at load for one that declares none, for a parameter it does not own, and
   * for two mappings into one dimension — so an effect contributes uniquely by declaring uniquely
   * and no painter grows a branch per effect (0122, 0139).
   */
  driftFrom: readonly { param: Params[number]["id"]; into: DriftDimension }[];
  /**
   * The parameters of this entry that reach the picture nowhere, each beside the reason there is
   * no honest dimension for it. Written rather than omitted: an entry used to be silent about a
   * value simply because it had run out of dimensions to claim, and silence and a considered "this
   * one says nothing about a row" looked identical from here. Every parameter is now in exactly one
   * of the two lists and the registry throws at load for one that is in neither or in both, so the
   * only way a value stays out of the picture is by someone writing down why
   * ([0148](../../../docs/decisions/0148-a-parameter-is-reached-or-it-is-written-down-as-not.md)).
   */
  driftUnreached?: readonly { param: Params[number]["id"]; because: string }[];
  params: Params;
  build(
    ctx: BaseAudioContext,
    values: Readonly<Record<Params[number]["id"], number>>,
  ): EffectInstance<Params[number]["id"]>;
};

/**
 * The half of an instance every plugin writes identically: build the instance at the values it
 * was handed, then route each later move and each automation lane to the binding for that
 * parameter. A plugin's `build` spreads this beside the nodes only it knows — its `input`,
 * `output` and `dispose` — so the part that is the contract lives with the contract (0016, 0030).
 *
 * The bindings are initialized here, as the call happens, rather than on first use: a plugin with
 * a source node to start does it on the line after this one, and a lazy initialize would leave
 * that node running at its own default in between.
 */
export function instanceFromBindings<Param extends string>(
  params: readonly ParamDeclaration<Param>[],
  bindings: Readonly<Record<Param, ParamBinding>>,
  values: Readonly<Record<Param, number>>,
): Pick<EffectInstance<Param>, "setParam" | "automationTarget"> {
  for (const param of params) bindings[param.id].initialize(values[param.id]);
  // The rule the sentence above states, held rather than restated: a plugin answers with a lane's
  // AudioParam for exactly the parameters it declared `automation` on, so a lane the registry says
  // does not exist throws here instead of being scheduled onto whatever the binding happens to
  // hold (0024, 0030).
  const lanes = new Set<Param>(
    params.filter(({ automation }) => automation === "linear").map(({ id }) => id),
  );

  return {
    setParam: (param, value, when) => {
      bindings[param].set(value, when);
    },
    automationTarget: (param) => {
      if (!lanes.has(param)) throw new Error(`plugin binds no automation target: ${param}`);
      return bindings[param].target;
    },
  };
}

/** Preserve each plugin's literal ids while checking the complete contract. */
export function defineEffect<
  const Id extends string,
  const Params extends readonly ParamDeclaration[],
>(effect: Effect<Id, Params>): Effect<Id, Params> {
  return effect;
}

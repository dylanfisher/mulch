/**
 * @role What each registered parameter is and in what unit, as the sentence its dial says on hover
 *   — one entry per parameter id, and the whole of a knob's words that is not its label.
 * @instead The instrument's own nouns, and what each action does → src/lib/copy.ts, which this was
 *   the middle of until that file reached the hard cap (0045).
 */

/**
 * What each parameter is and in what unit, keyed by the registry's own parameter id. An eyebrow
 * label is one word over a dial — it names the knob, it does not say what turning it does or what
 * the number under it is measured in, and that is the sentence a tooltip carries (P65).
 *
 * Keyed by plain string because `ParamId` lives in `src/audio` and lib may not import it
 * (docs/map.md), exactly as `EFFECT_NAMES` above is; that every registered parameter has one is
 * checked where both lists are reachable, in `src/ui/tooltips.test.ts`.
 */
export const PARAM_TOOLTIPS: Record<string, string> = {
  "deck.gain": "How loud this yard plays, as a multiplier. 1 is the sound as it was loaded.",
  "deck.pan": "Where the yard sits between the speakers, from -1 hard left to 1 hard right.",
  "deck.speed": "How fast the sample is read, as a multiplier. It moves the pitch with it.",
  "deck.pitch": "How far the sample is transposed, in semitones. It moves the speed with it.",
  "deck.tone": "The pitch a tone sounds at, in hertz — and the rate any other source is read at.",
  "filter.cutoff": "Where the low-pass filter starts cutting, in hertz.",
  "delay.time": "How long each repeat waits before it sounds, in seconds.",
  "delay.feedback": "How much of each repeat is fed back in, so how many repeats there are.",
  "delay.mix": "How much of the delayed sound is heard beside the dry one, from none to all.",
  "eq.frequency": "The frequency the band lifts or cuts around, in hertz.",
  "eq.gain": "How far that band is lifted or cut, in decibels.",
  "eq.q": "How narrow the band is. Higher is a tighter piece of the spectrum.",
  "comp.threshold": "The level above which the compressor starts pressing, in decibels.",
  "comp.ratio": "How hard it presses what is over the threshold, as a ratio to 1.",
  "comp.attack":
    "How long it takes to start pressing once a sound crosses the threshold, in seconds.",
  "comp.release": "How long it takes to stop pressing once the sound falls back, in seconds.",
  "comp.knee": "How gradually the pressing comes in around the threshold, in decibels.",
  "comp.output": "How much level is put back after the pressing, in decibels.",
  "reverb.decay": "How long the room takes to fall away, in seconds.",
  "reverb.tone": "Where the room's tail starts darkening, in hertz.",
  "reverb.predelay": "How long the room waits before it answers, in seconds.",
  "reverb.wet": "How much of the room is heard beside the dry sound, from none to all.",
  "tape.time": "How far the tape head is from the record head, as a delay in seconds.",
  "tape.feedback": "How much of the tape's output is wound back onto it, so how long it runs on.",
  "tape.tone": "Where each pass through the tape starts darkening, in hertz.",
  "tape.drive": "How hard the tape is hit, as a multiplier. Higher is more saturation.",
  "tape.wow": "How far the tape's speed wanders, as a fraction of the delay time.",
  "tape.hiss": "How much tape noise is printed under the sound, from none to all.",
  "tape.amount": "How much of the tape is heard beside the dry sound, from none to all.",
  // The automator's own dozen. It holds a run of other effects rather than a sound, so its words
  // are about the run: what is in it, how wide it is, how often it turns over (0204).
  "auto.seed": "Which run this is. The same number grows the same effects in the same order.",
  "auto.count": "How many effects stand in the run at once.",
  "auto.stays":
    "How long each grown effect stays, in seconds, from arriving to being let go. The run turns over once per stay divided among the places it holds.",
  "auto.fade": "How long an effect takes to arrive, and to leave, in seconds. Never a switch.",
  "auto.drift": "How far each grown effect's own knobs stray from where its plugin ships them.",
  "auto.filter": "How often a filter is drawn against the rest of the pool. None is never.",
  "auto.delay": "How often a delay is drawn against the rest of the pool. None is never.",
  "auto.eq": "How often an EQ is drawn against the rest of the pool. None is never.",
  "auto.compressor": "How often a compressor is drawn against the rest of the pool. None is never.",
  "auto.reverb": "How often a reverb is drawn against the rest of the pool. None is never.",
  "auto.tape": "How often a tape is drawn against the rest of the pool. None is never.",
};

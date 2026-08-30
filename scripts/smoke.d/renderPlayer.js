/**
 * @role The player offline: the same session renders the same file — bursts, rests and held
 * read rates included — two seeds render two different ones, and a pattern of jumps arrives
 * without a click in it — and an ungated pattern resting for nothing leaves no gap between its
 * steps (0089, P67, P75).
 */
// Over the 400-line soft cap by the renders themselves: every scenario here is one claim about a
// rendered file, and each carries the paragraph saying which field of the spec that file proves
// reaches one. Splitting it would put two halves of one `Promise.all` in two files and pay a
// second browser page for what is already one page's work (docs/plan.md §3). See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { MIN_SILENCE_SECS } from "../../src/lib/fingerprint.ts";
import { PLAYER_DROP_MAX } from "../../src/lib/playerDrop.ts";
import { PLAYER_CAST_MAX } from "../../src/lib/playerCast.ts";
import { PLAYER_SLOTS } from "../../src/lib/playerSlots.ts";
import { PLAYER_REST_MAX } from "../../src/lib/playerRest.ts";
import { PLAYER_SPARK_DELAY_MAX } from "../../src/lib/playerSpark.ts";
import { fail, report } from "./harness.js";

/** Long enough to hold a dozen slots and several jumps, short enough to join the other renders. */
const PLAYER_RENDER_SECS = 0.6;
/**
 * The loop the grid divides: 1.6s over sixteen slots is 100ms a slot. Only `rest` is measured in
 * those slots now — the bursts below are wall seconds and owe this number nothing (0119) — but the
 * loop still has to be wide enough that its slots clear `PLAYER_MIN_SLOT_SECS`, or the deck plays
 * straight and jumps nowhere.
 */
const PLAYER_LOOP_SECS = 1.6;

/**
 * The burst the patterns below are drawn with, in wall seconds: half a slot of the loop above,
 * which is the length they were written at back when a burst was a fraction of it. Kept derived
 * rather than typed as 0.05, so the two numbers cannot drift into a render nobody meant. Varied by
 * a quarter of itself — a vary is seconds of burst now, so the patterns below stray by `burst / 4`
 * rather than by 0.25 of it (0135) — it stays well clear of the seam floor, so nothing here
 * measures the shortest window.
 */
const PLAYER_BURST_SECS = PLAYER_LOOP_SECS / PLAYER_SLOTS / 2;
/**
 * Clicks per second in the source the seeds are compared over. A sine reads the same in every
 * slot of the loop, so it can prove a render is reproducible and nothing about which slot was
 * read; a 20Hz click train puts a transient in some slots and silence in others, which is what
 * makes two seeds two different files rather than two spellings of one.
 */
const PLAYER_SEED_SOURCE_HZ = 20;
/**
 * How many clicks a faded pattern may leave. Zero: `CLICK_DELTA` is a quarter of full scale and
 * an unfaded jump between two phases of a 440Hz sine is most of it, so this is the assertion that
 * every jump is a crossfade and not a butt splice (src/lib/fingerprint.ts).
 */
const PLAYER_MAX_CLICKS = 0;

/**
 * The shared jump clock the two-yard renders below run on, in seconds. Two ticks a slot of the
 * loop above: slower than either yard's own window, so every jump waits for one and both land on
 * the same instants, and fast enough that a 0.6s render holds several of them (0097).
 */
const PLAYER_SYNC_SECS = 0.2;
/**
 * How long after the first yard the second one is pressed, in seconds. No multiple of the clock
 * above, so the second yard is started off every tick it will then land on.
 */
const PLAYER_STAGGER_SECS = 0.13;
/**
 * How far above nothing the zero-rest render has to peak. The silence check below reads a field
 * that is one whole span on a render of nothing at all, so without this a deck that jumped and
 * sounded nothing would report as the gapless one (parity.js guards its own claim the same way).
 */
const PLAYER_AUDIBLE_DB = -20;

export const renderPlayer = async ({ page }) => {
  const rendered = await page.evaluate(
    async ({ secs, loop, clicks, sync, stagger, rests, burst, drops, cast, delay }) => {
      const session = (player, gen = "sine", hz = 440) => ({
        secs,
        envelopes: [
          // A sine, so any seam the player failed to fade is a discontinuity the fingerprint
          // counts — at the one length a drawn source has, of which the loop below is the part
          // the pattern jumps around (P127).
          { t: "deck.load", deck: "a", source: { gen, hz } },
          { t: "deck.loop", deck: "a", in: 0, out: loop },
          ...(player === null ? [] : [{ t: "deck.player", deck: "a", player }]),
          { t: "deck.play", deck: "a" },
        ],
      });
      // The player's own clock is on in every one of these: bursts shorter than the slot they
      // start in, varying either way, a rest between them and a read rate redrawn every second
      // jump. The reproducibility below is then a claim about every field the module declares (P67).
      const pattern = (seed, gate, vary = 0) => ({
        seed,
        // And the ground, left where a switch press leaves it: `bedEvery: 0` never moves the loop,
        // so every render below this one but the three that say otherwise is the file it rendered
        // before the loop could move at all (0183, 0134's rule said for the ground).
        bed: 0,
        // Counted in jumps, which is the clock the period was on before it could be counted on the
        // song's own boundaries (0192).
        bedPer: "jump",
        bedEvery: 0,
        bedDistance: 2,
        bedBias: 0,
        bedHome: 0,
        // And nothing planted, so no ground arrives on a count of its own and the crawl above is
        // the only author of where the loop is (0194).
        beds: [],
        // The jump's own three, left where a switch press leaves them: no lean, no stride and
        // never coming home, which is the wandering uniform jump this scenario rendered before a
        // jump could do any of the three — so these files are the files it rendered then (0162).
        bias: 0,
        stride: 0,
        home: 0,
        phrase: 0,
        phraseKeep: 4,
        phraseChance: 0,
        phraseReturn: 0,
        // And the arrangement's own four, left where a switch press leaves them too: nothing is
        // drawn, so what this renders is what it rendered before an arrangement could be (0158).
        arrange: 0,
        arrangeKeep: 4,
        arrangeChance: 0,
        arrangeReturn: 0,
        arrangeAmount: 1,
        arrangeGrow: 0,
        arrangeSpan: 0,
        arrangeApart: 0,
        distance: 5,
        repeats: 2,
        // The count's own three, left where a switch pressed in the app leaves them: the number
        // on the dial on every step, which is the arithmetic 0134 gave it (0135).
        repeatsChance: 1,
        repeatsSpread: 0,
        repeatsHold: 0,
        // Repeats that stand equal and no landing dropped, which is where a switch pressed in the
        // app leaves both: what these render is what they rendered before a landing could shrink
        // or be a hole, and the two renders below are what says either one reaches the file at all
        // (P118).
        ratchet: 0,
        drop: 0,
        reverse: 0,
        // And no landing throwing a second one, which is where a switch pressed in the app leaves
        // it: what these render is what they rendered before a landing could throw one. The two
        // renders below are what says the field reaches the file at all (P123).
        spark: 0,
        sparkLevel: 0.5,
        // And its spark sounding with the landing that threw it, which is where a switch pressed
        // in the app leaves it: what these render is what they rendered before a spark could be
        // held back, and the third render below is what says the field reaches the file (P132).
        sparkDelay: 0,
        gate,
        burst,
        vary,
        // Every landing varied and every wait taken, which is where a switch pressed in the app
        // leaves the two amounts behind the Vary and Rest dials (P87).
        varyChance: 1,
        rest: 0.5,
        // No pulses placed, which leaves the wait to the roll below — where a switch pressed in
        // the app leaves it, and the author these renders have always measured (0163).
        restPulses: 0,
        restSpan: 8,
        restChance: 1,
        restSpread: 0,
        hold: 2,
        // The rate walk left where a switch pressed in the app leaves it, so these renders keep
        // measuring the module a performer meets rather than a corner of it (0118).
        chance: 1,
        spread: 2,
        drift: 4,
        // Where the switch leaves it: one rate for the whole of a landing (0167).
        climb: 0,
        // No song: these renders measure one pattern, and an arrangement is a second thing to
        // hold still. The song's own proof is a unit test, where a part boundary is legible
        // (src/lib/playerWalk.test.ts, 0153).
        song: [],
        // And every character in the cast, which is where the switch leaves it: these renders draw
        // no arrangement at all, so what the cast permits is inert here and is the whole of it
        // rather than a narrowing nobody meant. Kept derived, like every other bound above (0174).
        cast,
      });
      // Two runs of one session, one run of the same session on another seed, one with no player
      // at all, and one stuttering — all through the one render harness (0068).
      const grain = (player) => session(player, "click-train", clicks);
      // A sweep, which is the one drawn source whose every bed sounds different: a bed is a whole
      // loop-length of the file, so proving the loop moved means proving what is under it changed,
      // and a sine or a click train reads alike wherever the window sits (0183). `GEN_SECS` is 4
      // and the loop is 1.6, so beds 0 and 1 both exist under this one and bed 1 is real audio.
      const ground = (player) => session(player, "sweep");
      // Two yards jumping on one session-level clock, each holding its own seed, burst and rest:
      // the emergent behaviour the player was built toward, and the two constraints on it are
      // that the pattern stays each yard's own and the file stays a function of the session
      // rather than of the order the yards were played (0097).
      const together = (sync, order = ["a", "b"]) => ({
        secs,
        envelopes: [
          { t: "deck.add", deck: "b", emoji: "🌴", name: "North Willow" },
          ...["a", "b"].flatMap((deck) => [
            { t: "deck.load", deck, source: { gen: "click-train", hz: clicks } },
            { t: "deck.loop", deck, in: 0, out: loop },
          ]),
          { t: "deck.player", deck: "a", player: pattern(11, 0, burst / 4) },
          // A different seed, twice the burst and no rest: what the two yards have in common is
          // the clock and nothing else.
          {
            t: "deck.player",
            deck: "b",
            player: { ...pattern(21, 0), burst: burst * 2, rest: 0, hold: 0 },
          },
          ...(sync === null ? [] : [{ t: "session.sync", sync }]),
          // Started at different instants, and the second one off the clock's own ticks: two
          // yards under one clock are two yards a person pressed one after the other.
          ...order.map((deck) => ({
            at: deck === "b" ? stagger : 0,
            cmd: { t: "deck.play", deck },
          })),
        ],
      });
      // The reproducible three carry a varied burst as well, so "the same file twice" is a claim
      // about every field the spec declares. The two the clicks are counted in do not: a varied burst loops a
      // region that is not a whole number of cycles of this sine, and the wrap inside a repeat is
      // 0089's butt splice rather than anything P67 added a seam to.
      const [
        first,
        second,
        other,
        straight,
        faded,
        stuttered,
        seamless,
        resting,
        dropped,
        sparkless,
        sparking,
        delayed,
        synced,
        syncedAgain,
        loose,
        swapped,
        home,
        moved,
        crawled,
        wandering,
        wanderingAgain,
        kept,
      ] = await Promise.all([
        window.mulch.render(grain(pattern(11, 0, burst / 4))),
        window.mulch.render(grain(pattern(11, 0, burst / 4))),
        window.mulch.render(grain(pattern(12, 0, burst / 4))),
        window.mulch.render(grain(null)),
        window.mulch.render(session(pattern(11, 0))),
        window.mulch.render(session(pattern(11, 1))),
        // Nothing between the jumps, and no clock on the session: the render is asked where its
        // silence is, and the answer has to be nowhere after the first burst (P75).
        window.mulch.render(session({ ...pattern(11, 0), rest: 0 })),
        // The same pattern taking the longest rest the module allows, so the check above is one
        // that can see a gap rather than one that cannot see anything.
        window.mulch.render(session({ ...pattern(11, 0), rest: rests })),
        // And the same pattern again with every landing dropped: the one render P118 adds, because
        // a hole is the one of its two knobs whose whole claim is about what a file holds — the
        // ratchet's is arithmetic on a schedule and is asserted over the deck double, where a
        // shrinking spacing is legible (src/audio/playerLanding.test.ts, plan §3).
        window.mulch.render(session({ ...pattern(11, 0), rest: 0, drop: drops })),
        // And one pattern sparking at every landing, rendered twice: once with the companion
        // silenced and once with it as loud as the landing that threw it. The level takes no draw,
        // so the two walks are the same walk — the only thing between the two files is a second
        // region of the loop sounding at the same instants, which is the one thing about a spark
        // no unit test can hear (P123, plan §3). Over the click train, where two regions hold
        // different transients: on a sine every slot reads alike.
        window.mulch.render(grain({ ...pattern(11, 0), spark: 1, sparkLevel: 0 })),
        window.mulch.render(grain({ ...pattern(11, 0), spark: 1, sparkLevel: 1 })),
        // And the same sparking pattern with its companions held back half a landing. The walk is
        // the same walk — a delay takes no draw either — so the only thing between this file and
        // the one above it is when the second region starts sounding, which is the one thing about
        // a delay no unit test can hear (P132, plan §3).
        window.mulch.render(
          grain({ ...pattern(11, 0), spark: 1, sparkLevel: 1, sparkDelay: delay }),
        ),
        window.mulch.render(together(sync)),
        window.mulch.render(together(sync)),
        window.mulch.render(together(null)),
        window.mulch.render(together(sync, ["b", "a"])),
        // The ground, over a sweep. Three renders and two claims. First: one pattern standing on
        // the loop's own bed and the same pattern standing a whole loop-length further into the
        // file — the same seed, the same walk, the same slots, and a different part of the sample
        // under all of it, which is the one thing about a moved loop no unit test can hear (0183).
        window.mulch.render(ground({ ...pattern(11, 0), bedEvery: 1, bedHome: 1, bed: 0 })),
        window.mulch.render(ground({ ...pattern(11, 0), bedEvery: 1, bedHome: 1, bed: 1 })),
        // And the crawl, which is the same claim one grid finer (P139). The ground is counted in
        // the loop's own sixteenths now, so this sweep holds twenty-five of them where it holds
        // two whole beds — and bed 2, which is thirty-two sixteenths, folds onto the seventh of
        // them rather than back onto the loop. A ground no whole bed begins at, sounding.
        window.mulch.render(ground({ ...pattern(11, 0), bedEvery: 1, bedHome: 1, bed: 2 })),
        // And second, the claim the whole module rests on, said for the newest field: a pattern
        // whose ground wanders is still a function of its seed, so the same spec renders the same
        // file twice (0089). Rendered beside its own repeat rather than against the pair above,
        // because what is being asserted is reproducibility and not difference.
        window.mulch.render(ground({ ...pattern(11, 0), bedEvery: 2, bedDistance: 1, bedBias: 1 })),
        window.mulch.render(ground({ ...pattern(11, 0), bedEvery: 2, bedDistance: 1, bedBias: 1 })),
        // And third, the ground's other author: the same wandering pattern with one ground kept
        // for every second jump. A kept arrival takes no draw, so the walk under this file is the
        // walk under the two above it — the only thing between them is where the loop is standing
        // when the count comes round, which is the one thing about a kept ground no unit test can
        // hear (0194, plan §3).
        window.mulch.render(
          ground({
            ...pattern(11, 0),
            bedEvery: 2,
            bedDistance: 1,
            bedBias: 1,
            beds: [{ bed: 1, every: 2 }],
          }),
        ),
      ]);
      const held = straight.probes.at(-1).probe.decks.a;
      return {
        first: first.fingerprint,
        second: second.fingerprint,
        other: other.fingerprint,
        straight: straight.fingerprint,
        faded: faded.fingerprint,
        stuttered: stuttered.fingerprint,
        seamless: seamless.fingerprint,
        resting: resting.fingerprint,
        dropped: dropped.fingerprint,
        sparkless: sparkless.fingerprint,
        sparking: sparking.fingerprint,
        delayed: delayed.fingerprint,
        home: home.fingerprint,
        moved: moved.fingerprint,
        crawled: crawled.fingerprint,
        wandering: wandering.fingerprint,
        wanderingAgain: wanderingAgain.fingerprint,
        kept: kept.fingerprint,
        // A deck rendered with no player holds none, which is what makes it the control.
        control: held.player,
        // What the session ended up holding for the jumping one — the seed included, because the
        // seed is the field that makes the performance reproducible.
        player: first.probes.at(-1).probe.decks.a.player,
        synced: synced.fingerprint,
        syncedAgain: syncedAgain.fingerprint,
        loose: loose.fingerprint,
        swapped: swapped.fingerprint,
        // The clock is one durable field on the session, held whichever yards are jumping on it.
        clock: synced.probes.at(-1).probe.sync,
        // And each yard still holds the seed it was given: no pattern became another's.
        seeds: ["a", "b"].map((deck) => synced.probes.at(-1).probe.decks[deck].player.seed),
      };
    },
    {
      secs: PLAYER_RENDER_SECS,
      loop: PLAYER_LOOP_SECS,
      burst: PLAYER_BURST_SECS,
      clicks: PLAYER_SEED_SOURCE_HZ,
      sync: PLAYER_SYNC_SECS,
      stagger: PLAYER_STAGGER_SECS,
      rests: PLAYER_REST_MAX,
      drops: PLAYER_DROP_MAX,
      delay: PLAYER_SPARK_DELAY_MAX / 2,
      cast: PLAYER_CAST_MAX,
    },
  );

  const asText = (print) => JSON.stringify(print);
  // The whole point of a seed: not "close enough", the same file. Every field, exactly.
  if (asText(rendered.first) !== asText(rendered.second)) {
    fail("two renders of one session did not fingerprint the same", {
      first: rendered.first,
      second: rendered.second,
    });
  }
  if (asText(rendered.first) === asText(rendered.other)) {
    fail("two seeds rendered the same file, so the seed reaches nothing", rendered.first);
  }
  // And the difference is the pattern rather than one window of it: the two seeds read from
  // different slots for most of the pass.
  const moved = rendered.first.rmsDb.filter(
    (db, index) => Math.abs(db - rendered.other.rmsDb[index]) > 0.5,
  );
  if (moved.length < 2) {
    fail("two seeds rendered nearly the same windows", {
      first: rendered.first.rmsDb,
      other: rendered.other.rmsDb,
    });
  }
  // The control: a session with no player renders something else again, so what is being measured
  // above is a deck that actually jumped rather than one that ignored the module.
  if (asText(rendered.first) === asText(rendered.straight)) {
    fail("a player changed nothing about the render", rendered.straight);
  }
  if (rendered.control !== null) {
    fail(`a deck rendered with no player held ${JSON.stringify(rendered.control)}`);
  }
  if (rendered.player?.seed !== 11) {
    fail(`the session did not hold the seed it rendered — ${JSON.stringify(rendered.player)}`);
  }
  // Every jump is a fade at the seam: a sine crossfaded at equal power leaves no first difference
  // a fingerprint reads as an edit, gated or not.
  for (const [name, print] of [
    ["a jumping", rendered.faded],
    ["a stuttering", rendered.stuttered],
  ]) {
    if (print.clicks > PLAYER_MAX_CLICKS) {
      fail(`${name} render left ${print.clicks} clicks in it`, print);
    }
  }
  // An ungated pattern resting for zero runs on: the steps butt up and the crossfade at each seam
  // sums to one, so the only silence a render of it holds is the lookahead before the first burst
  // — anything beginning after frame zero is a gap nobody asked for. The gate is the other
  // silence and it is a knob, which is why this pattern is drawn with it shut off; the only wait
  // between two jumps is a tick of the session's clock, and this session holds none (P75).
  // What this can see is a gap of `MIN_SILENCE_SECS`; that the steps butt up to the sample is
  // asserted on the fake graph, in src/audio/player.test.ts.
  const gaps = (print) => print.silence.filter(([from]) => from > 0);
  // A render of nothing at all is one silence span beginning at frame zero, which the filter above
  // reads as no gap — so the render has to have been a render of something first.
  if (!rendered.seamless.peakDb.every((db) => db > PLAYER_AUDIBLE_DB)) {
    fail("the pattern that rests for nothing rendered nothing to leave a gap in", {
      peakDb: rendered.seamless.peakDb,
      silence: rendered.seamless.silence,
    });
  }
  if (gaps(rendered.seamless).length > 0) {
    fail(`a pattern that rests for nothing left a gap of at least ${MIN_SILENCE_SECS}s`, {
      silence: rendered.seamless.silence,
      frames: rendered.seamless.frames,
    });
  }
  // And the same pattern resting does leave one, so the check above can see a gap at all.
  if (gaps(rendered.resting).length === 0) {
    fail("a resting pattern left no silence, so the seamless check proves nothing", {
      silence: rendered.resting.silence,
      frames: rendered.resting.frames,
    });
  }
  // A hole is a hole: the same pattern with every landing dropped sounds nothing at all, where the
  // one above it — the same numbers, dropping none — peaks over the floor in every window. So the
  // drop reaches the file rather than being a field nothing reads, and what it takes away is the
  // sound and not the landing's place (0160).
  if (rendered.dropped.peakDb.some((db) => db > PLAYER_AUDIBLE_DB)) {
    fail("a pattern that drops every landing rendered something", {
      peakDb: rendered.dropped.peakDb,
    });
  }
  // A spark reaches the file, and what it puts there is sound: the same pattern with its companion
  // silenced and with it at full renders two different files, and the sparking one is the louder of
  // the two — two regions of the loop sounding at once rather than one (P123).
  if (asText(rendered.sparking) === asText(rendered.sparkless)) {
    fail("a spark at full level rendered the same file as the same pattern with it silenced", {
      sparking: rendered.sparking,
    });
  }
  const louder = rendered.sparking.rmsDb.filter(
    (db, index) => db > rendered.sparkless.rmsDb[index],
  );
  // A quarter of the windows rather than half: this pattern rests between its jumps and reads a
  // click train, so a window falling in a wait — or one whose spark landed on a slot holding no
  // click — is the same in both files and says nothing either way.
  if (louder.length * 4 < rendered.sparking.rmsDb.length) {
    fail("a sparking pattern was no louder than the same pattern with its spark silenced", {
      sparking: rendered.sparking.rmsDb,
      sparkless: rendered.sparkless.rmsDb,
    });
  }
  // And the delay reaches the file too: the same walk at the same level, with the companion held
  // back half of each landing, is a different file — a spark that begins where its landing does
  // and one that begins halfway through it are two arrangements of the same two regions (P132).
  if (asText(rendered.delayed) === asText(rendered.sparking)) {
    fail("a spark held back half a landing rendered the same file as one that was not", {
      delayed: rendered.delayed,
    });
  }

  // The ground the loop is read on reaches the file. A bed is the one thing in this module that
  // moves the *window* rather than moving inside it, so the proof is a pattern that walks the same
  // slots over a different part of the sample — which is exactly what a fingerprint can see and a
  // unit test over the deck double cannot (0183, plan §3).
  if (asText(rendered.home) === asText(rendered.moved)) {
    fail(
      "a pattern a whole bed further into the sample rendered the same file as one on the loop",
      {
        home: rendered.home,
        moved: rendered.moved,
      },
    );
  }
  // And the crawl reaches the file: a bed the sweep does not hold folds onto a ground counted in
  // sixteenths, which is somewhere the sweep's own audio differs from both the loop and the bed
  // above it. Before the crawl it folded back onto the loop and rendered `home` exactly (P139).
  if (asText(rendered.crawled) === asText(rendered.home)) {
    fail("a pattern crawled a sixteenth of the loop into the sample rendered the loop itself", {
      home: rendered.home,
      crawled: rendered.crawled,
    });
  }
  // And a wandering ground is still a function of the seed, which is the claim every field of this
  // module has to answer before it is a field (0089).
  if (asText(rendered.wandering) !== asText(rendered.wanderingAgain)) {
    fail("two renders of one pattern whose ground moves did not fingerprint the same", {
      first: rendered.wandering,
      second: rendered.wanderingAgain,
    });
  }

  // And a ground a hand kept reaches the file: the same seed and the same draws, with the loop
  // standing somewhere else every time the count comes round (0194).
  if (asText(rendered.kept) === asText(rendered.wandering)) {
    fail("a pattern coming back to a kept ground rendered the file of one that only wanders", {
      wandering: rendered.wandering,
      kept: rendered.kept,
    });
  }

  // Two yards on one clock, pressed at different instants: the same session is the same file
  // twice, the clock reaches the render rather than being a field nothing reads, and listing the
  // two presses in the other order changes nothing. That the grid is anchored on the context's
  // own zero rather than on whichever yard started first is asserted where a press can be put
  // off the ticks — src/audio/player.test.ts — since every envelope here is pumped before the
  // render begins.
  if (asText(rendered.synced) !== asText(rendered.syncedAgain)) {
    fail("two renders of one synced session did not fingerprint the same", {
      first: rendered.synced,
      second: rendered.syncedAgain,
    });
  }
  if (asText(rendered.synced) === asText(rendered.loose)) {
    fail("a shared jump clock changed nothing about the render", rendered.loose);
  }
  if (asText(rendered.synced) !== asText(rendered.swapped)) {
    fail("a synced render depended on the order its two presses were listed", {
      played: rendered.synced,
      swapped: rendered.swapped,
    });
  }
  if (rendered.clock !== PLAYER_SYNC_SECS) {
    fail(`the session did not hold the clock it rendered — ${JSON.stringify(rendered.clock)}`);
  }
  if (rendered.seeds.join() !== "11,21") {
    fail(`a yard under the clock lost its own seed — ${JSON.stringify(rendered.seeds)}`);
  }
  report(
    `the same session rendered the same file twice (${rendered.first.rmsDb.length} windows, ` +
      `peak ${rendered.first.peakDb[0]}dBFS), seed 12 moved ${moved.length} of them, and ` +
      "neither the jumping nor the stuttering sine left a click at a seam, and two yards on one " +
      "clock rendered the same file twice, whichever of them was played first, and a pattern " +
      `resting for nothing left no gap where a resting one left ${gaps(rendered.resting).length}, ` +
      "and a pattern dropping every landing rendered silence, and a sparking one was louder " +
      `than itself unsparked in ${louder.length} of ` +
      `${rendered.sparking.rmsDb.length} windows, and a spark held back half a landing rendered ` +
      "a file of its own, and a ground kept for every second jump rendered a file of its own " +
      "against the same pattern wandering",
  );
};

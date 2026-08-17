/**
 * @role Every newly automatable parameter offline: each lane against the same session cleared, a
 * lane on the second of two delays landing on that instance and not on the other, one gesture
 * rendered at two spans, and a lane still moving past the horizon one arming covers.
 */
import { AUTOMATION_HORIZON_SECS, AUTOMATION_REARM_SECS } from "../../src/audio/transport.ts";
import { compareFingerprints, WINDOW_SECS } from "../../src/lib/fingerprint.ts";
import { fail, report } from "./harness.js";

/** Six fingerprint windows, and long enough for a 0.5s delay to be heard inside the render. */
const LANES_RENDER_SECS = 0.6;

/** The lane P53 stretches: several cycles of it fit in the render at either span. */
const SPAN_LANE_SECS = 0.4;

/**
 * Past the horizon by two re-arm ticks. One would not be enough to measure in: the first arming
 * reaches a whole horizon past the play, so the render has to run well beyond that before what
 * sounds is only what the pump armed.
 */
const HORIZON_RENDER_SECS = AUTOMATION_HORIZON_SECS + 2 * AUTOMATION_REARM_SECS;
/** The lane's own period — several cycles inside the render, and each one audible on its own. */
const HORIZON_LANE_SECS = 2;
/** Skipped at the head: the delay's line is still filling and no cycle has swung fully yet. */
const HORIZON_SETTLE_SECS = 2;
/** How much of its early swing the lane owes at the end. A lane that stopped has none of it. */
const HORIZON_SWING_SHARE = 0.5;

/**
 * The lanes P21 opened, each one gesture on one parameter. They ride one shared session so a
 * single cleared render is the control for all of them: whatever a lane changes is the only
 * difference between it and that render. Speed and pitch are not here: they are the read rate,
 * which is the one thing that stays out of automation (0031).
 */
const LANES = [
  // Hard left by the end: a pan lane moves the two channels apart rather than the sum.
  { param: "deck.pan", from: 0, to: -1 },
  // Swept against a 0.5 mix, so dry and the retuned wet copy comb rather than merely sum. Under
  // one second of delay per second of render, so the read pointer never runs backwards.
  { param: "delay.time", instance: "dly", from: 0.5, to: 0.01 },
  { param: "delay.feedback", instance: "dly", from: 0, to: 0.9 },
  { param: "delay.mix", instance: "dly", from: 0, to: 1 },
  // The peak sits beside the tone rather than on it: at the wide end of the lane its skirt
  // boosts the tone, and at the narrow end it does not reach. On the peak, Q would be inaudible.
  { param: "eq.q", instance: "eq1", from: 0.1, to: 18 },
];

export const renderLanes = async ({ page }) => {
  const rendered = await page.evaluate(
    async ({ secs, lanes }) => {
      // Quiet, so eighteen boosted dB and a delay building up on a sustained tone still land well
      // under the master limiter — what the windows below measure is the lane, never the bus.
      const session = (lane) => ({
        secs,
        envelopes: [
          { t: "deck.load", deck: "a", source: { gen: "sine", hz: 733, secs } },
          { t: "param.set", deck: "a", param: "deck.gain", value: 0.05 },
          { t: "effect.add", deck: "a", id: "dly", effect: "delay" },
          // Short enough to recirculate several times inside the render, which is what the
          // feedback lane below is heard through: at the default 0.25s its first fed-back echo
          // lands at 0.5s and only the last window would carry the lane at all.
          { t: "param.set", deck: "a", instance: "dly", param: "delay.time", value: 0.12 },
          { t: "param.set", deck: "a", instance: "dly", param: "delay.mix", value: 0.5 },
          { t: "effect.add", deck: "a", id: "eq1", effect: "eq" },
          { t: "param.set", deck: "a", instance: "eq1", param: "eq.frequency", value: 1_400 },
          { t: "param.set", deck: "a", instance: "eq1", param: "eq.gain", value: 18 },
          ...(lane === null
            ? []
            : [
                {
                  t: "automation.set",
                  deck: "a",
                  ...(lane.instance === undefined ? {} : { instance: lane.instance }),
                  param: lane.param,
                  // One cycle exactly as long as the render, so what this measures is the gesture
                  // rather than the length it would otherwise repeat on (0035).
                  points: [
                    { at: 0, value: lane.from },
                    { at: secs, value: lane.to },
                  ],
                },
              ]),
          { t: "deck.play", deck: "a" },
        ],
      });
      const [cleared, ...automated] = await Promise.all([
        window.mulch.render(session(null)),
        ...lanes.map((lane) => window.mulch.render(session(lane))),
      ]);
      const held = (result) => {
        const deck = result.probes.at(-1).probe.decks.a;
        return [
          ...Object.keys(deck.automation),
          ...deck.effects.flatMap((entry) =>
            Object.keys(entry.automation).map((param) => `${entry.id}:${param}`),
          ),
        ].join(",");
      };
      return {
        cleared: cleared.fingerprint,
        clearedLanes: held(cleared),
        automated: automated.map((result, index) => ({
          param: lanes[index].param,
          lanes: held(result),
          fingerprint: result.fingerprint,
        })),
      };
    },
    { secs: LANES_RENDER_SECS, lanes: LANES },
  );

  if (rendered.clearedLanes !== "") {
    fail(`the cleared control render held a lane — ${rendered.clearedLanes}`);
  }
  for (const [index, lane] of LANES.entries()) {
    const run = rendered.automated[index];
    const expected = lane.instance === undefined ? lane.param : `${lane.instance}:${lane.param}`;
    if (run.lanes !== expected) {
      fail(`a ${lane.param} lane was not held where it was sent`, run.lanes);
    }
    // The whole fingerprint rather than one window: what a lane moves differs per parameter — pan
    // moves the per-channel peaks, mix and feedback move the windows — and any of them is proof
    // the gesture reached the graph. Silence here is a lane that state accepted and sound ignored.
    const differences = compareFingerprints(rendered.cleared, run.fingerprint);
    if (differences.length === 0) {
      fail(`a ${lane.param} lane rendered identically to the same session cleared`, {
        cleared: rendered.cleared.rmsDb,
        automated: run.fingerprint.rmsDb,
      });
    }
  }
  report(
    `every parameter P21 opened performed offline: ${LANES.map(({ param }) => param).join(", ")}, ` +
      "each differing from the one cleared render they share",
  );

  // 0030's seam, as sound rather than as state: one lane, two instances of the same effect, and
  // the only difference between any two of these renders is which id it named — or that it was
  // never sent. Both times recirculate several times inside the render, so each instance's lane
  // has to move its own signal: a lane routed by effect rather than by instance renders the two
  // named ones alike, and a lane quietly dropped renders as the control.
  const seam = await page.evaluate(async (secs) => {
    const session = (instance) => ({
      secs,
      envelopes: [
        { t: "deck.load", deck: "a", source: { gen: "sine", hz: 733, secs } },
        { t: "param.set", deck: "a", param: "deck.gain", value: 0.2 },
        { t: "effect.add", deck: "a", id: "one", effect: "delay" },
        { t: "param.set", deck: "a", instance: "one", param: "delay.time", value: 0.05 },
        { t: "param.set", deck: "a", instance: "one", param: "delay.mix", value: 0.5 },
        { t: "effect.add", deck: "a", id: "two", effect: "delay" },
        // Well under half the render: a delay's feedback first reaches the output at twice its
        // time, so a longer one carries a feedback lane that is inaudible inside the window, and
        // a lane nothing scheduled would be indistinguishable from one that was.
        { t: "param.set", deck: "a", instance: "two", param: "delay.time", value: 0.15 },
        { t: "param.set", deck: "a", instance: "two", param: "delay.mix", value: 0.5 },
        ...(instance === null
          ? []
          : [
              {
                t: "automation.set",
                deck: "a",
                instance,
                param: "delay.feedback",
                points: [
                  { at: 0, value: 0 },
                  { at: secs, value: 0.9 },
                ],
              },
            ]),
        { t: "deck.play", deck: "a" },
      ],
    });
    const [cleared, first, second] = await Promise.all([
      window.mulch.render(session(null)),
      window.mulch.render(session("one")),
      window.mulch.render(session("two")),
    ]);
    const lanes = (result) =>
      result.probes
        .at(-1)
        .probe.decks.a.effects.map(
          (entry) => `${entry.id}:${Object.keys(entry.automation).join("|")}`,
        )
        .join(",");
    return {
      cleared: cleared.fingerprint,
      first: first.fingerprint,
      second: second.fingerprint,
      firstLanes: lanes(first),
      secondLanes: lanes(second),
    };
  }, LANES_RENDER_SECS);

  if (
    seam.firstLanes !== "one:delay.feedback,two:" ||
    seam.secondLanes !== "one:,two:delay.feedback"
  ) {
    fail("a lane did not stay on the instance it named", seam);
  }
  for (const [named, fingerprint] of [
    ["one", seam.first],
    ["two", seam.second],
  ]) {
    if (compareFingerprints(seam.cleared, fingerprint).length === 0) {
      fail(`the feedback lane named ${named} of two delays changed nothing`, {
        cleared: seam.cleared.rmsDb,
        named: fingerprint.rmsDb,
      });
    }
  }
  if (compareFingerprints(seam.first, seam.second).length === 0) {
    fail("one lane on either of two delays rendered the same sound", {
      first: seam.first.rmsDb,
      second: seam.second.rmsDb,
    });
  }
  report(
    "one feedback lane moved whichever of two delays it named, each differing from the same " +
      "rack with nothing scheduled — the target is the instance, not the effect",
  );

  // P43, as the length an export actually is: one arming covers a horizon, and the tick that
  // lays down the next one is wall time, which does not pass while a render holds the thread. A
  // render longer than that horizon is where a lane stops being played — the parameter freezes at
  // the last value it was handed, which on a delay's feedback is the difference between a gesture
  // and a wall of it. Anything shorter cannot see it, which is why every render above is silent
  // about it.
  const long = await page.evaluate(
    async ({ cycle, secs }) => {
      const result = await window.mulch.render({
        secs,
        envelopes: [
          { t: "deck.load", deck: "a", source: { gen: "sine", hz: 733, secs } },
          { t: "param.set", deck: "a", param: "deck.gain", value: 0.1 },
          { t: "effect.add", deck: "a", id: "dly", effect: "delay" },
          { t: "param.set", deck: "a", instance: "dly", param: "delay.time", value: 0.12 },
          { t: "param.set", deck: "a", instance: "dly", param: "delay.mix", value: 0.5 },
          {
            t: "automation.set",
            deck: "a",
            instance: "dly",
            param: "delay.feedback",
            // Back where it started, so the lane repeats without a seam and every cycle of it
            // sounds the same as the first — which is what makes early and late comparable.
            points: [
              { at: 0, value: 0 },
              { at: cycle / 2, value: 0.9 },
              { at: cycle, value: 0 },
            ],
          },
          { t: "deck.play", deck: "a" },
        ],
      });
      return result.fingerprint.rmsDb;
    },
    { cycle: HORIZON_LANE_SECS, secs: HORIZON_RENDER_SECS },
  );

  const between = (from, to) =>
    long.slice(Math.round(from / WINDOW_SECS), Math.round(to / WINDOW_SECS));
  const swing = (windows) => Math.max(...windows) - Math.min(...windows);
  // Two whole cycles either side: the first pair is inside the horizon the play's own arming laid
  // down, the last pair begins two seconds past the furthest cycle that arming could reach.
  const early = swing(between(HORIZON_SETTLE_SECS, HORIZON_SETTLE_SECS + 2 * HORIZON_LANE_SECS));
  const late = swing(between(HORIZON_RENDER_SECS - 2 * HORIZON_LANE_SECS, HORIZON_RENDER_SECS));
  if (late < early * HORIZON_SWING_SHARE) {
    fail(
      `a feedback lane swung ${early.toFixed(1)}dB inside the ${AUTOMATION_HORIZON_SECS}s horizon ` +
        `and ${late.toFixed(1)}dB after it — the lane stopped being played`,
      long,
    );
  }
  report(
    `a feedback lane rendered ${HORIZON_RENDER_SECS}s — past the ${AUTOMATION_HORIZON_SECS}s one ` +
      `arming covers — still swung ${late.toFixed(1)}dB in its last cycles against ` +
      `${early.toFixed(1)}dB in its first`,
  );

  // P53, as sound: one recorded gesture, two lengths. The only difference between these two
  // renders is the `automation.span` between them — same points, same shape, a different cycle to
  // repeat on — so a stretch that reached state and not the graph renders as its own control
  // (0079).
  const spans = await page.evaluate(
    async ({ secs, span }) => {
      const session = (stretched) => ({
        secs,
        envelopes: [
          { t: "deck.load", deck: "a", source: { gen: "sine", hz: 733, secs } },
          { t: "param.set", deck: "a", param: "deck.gain", value: 0.1 },
          { t: "effect.add", deck: "a", id: "dly", effect: "delay" },
          { t: "param.set", deck: "a", instance: "dly", param: "delay.time", value: 0.12 },
          { t: "param.set", deck: "a", instance: "dly", param: "delay.mix", value: 0.5 },
          {
            t: "automation.set",
            deck: "a",
            instance: "dly",
            param: "delay.feedback",
            points: [
              { at: 0, value: 0 },
              { at: span / 2, value: 0.9 },
              { at: span, value: 0 },
            ],
          },
          { t: "deck.play", deck: "a" },
          // After the play, which is the only state the gesture happens in: the lane is already
          // armed on its recorded anchor, and the stretch has to re-arm it from there (0079).
          ...(stretched === null
            ? []
            : [
                {
                  at: secs / 4,
                  cmd: {
                    t: "automation.span",
                    deck: "a",
                    instance: "dly",
                    param: "delay.feedback",
                    span: stretched,
                  },
                },
              ]),
        ],
      });
      const [played, stretched] = await Promise.all([
        window.mulch.render(session(null)),
        window.mulch.render(session(span / 4)),
      ]);
      const lane = (result) =>
        result.probes.at(-1).probe.decks.a.effects[0].automation["delay.feedback"];
      return {
        played: played.fingerprint,
        stretched: stretched.fingerprint,
        playedSpan: lane(played).at(-1).at,
        stretchedSpan: lane(stretched).at(-1).at,
        points: lane(stretched).length,
      };
    },
    { secs: LANES_RENDER_SECS, span: SPAN_LANE_SECS },
  );

  if (spans.playedSpan !== SPAN_LANE_SECS || spans.stretchedSpan !== SPAN_LANE_SECS / 4) {
    fail("a stretched lane did not end up the length it was sent", spans);
  }
  if (spans.points !== 3) {
    fail("stretching a lane changed how many points it has", spans);
  }
  if (compareFingerprints(spans.played, spans.stretched).length === 0) {
    fail("one gesture rendered the same sound at two spans", {
      played: spans.played.rmsDb,
      stretched: spans.stretched.rmsDb,
    });
  }
  report(
    `one feedback gesture rendered differently at ${SPAN_LANE_SECS}s and ` +
      `${SPAN_LANE_SECS / 4}s — the same points, stretched onto a shorter cycle`,
  );
};

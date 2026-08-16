/** @role Two decks summing into one master bus, and two instances of one effect in series. */
import { fail, PARITY_RENDER_SECS, RACK_RENDER_SECS, report } from "./harness.js";

export const renderDecks = async ({ page }) => {
  // P12's offline half: two decks sounding together, where the second one only exists because
  // a command added it mid-render. Each deck is rendered alone as its own control, so the
  // together window has to be louder than either — decks sum into the one master bus (0029).
  const twoDeckRender = await page.evaluate(async (secs) => {
    const session = (decks) => ({
      secs,
      envelopes: [
        { t: "deck.add", deck: "b" },
        ...(decks.includes("a")
          ? [
              { t: "deck.load", deck: "a", source: { gen: "sine", hz: 733, secs } },
              { t: "param.set", deck: "a", param: "deck.gain", value: 0.3 },
            ]
          : []),
        ...(decks.includes("b")
          ? [
              { t: "deck.load", deck: "b", source: { gen: "sine", hz: 220, secs } },
              { t: "param.set", deck: "b", param: "deck.gain", value: 0.3 },
            ]
          : []),
        ...decks.map((deck) => ({ t: "deck.play", deck })),
      ],
    });
    const both = await window.mulch.render(session(["a", "b"]));
    const onlyA = await window.mulch.render(session(["a"]));
    const onlyB = await window.mulch.render(session(["b"]));
    return {
      deckIds: both.probes.at(-1).probe.deckIds,
      added: both.events.filter((event) => event.t === "deck.added").map((event) => event.deck),
      started: both.events
        .filter((event) => event.t === "deck.started")
        .map((event) => event.deck)
        .sort(),
      // 0.1s windows; [1] is clear of the transport's lookahead silence in all three renders.
      windows: [both.fingerprint.rmsDb, onlyA.fingerprint.rmsDb, onlyB.fingerprint.rmsDb],
      bothDb: both.fingerprint.rmsDb[1],
      aDb: onlyA.fingerprint.rmsDb[1],
      bDb: onlyB.fingerprint.rmsDb[1],
    };
  }, PARITY_RENDER_SECS);

  // P13's offline half: two instances of one effect, in series, through the one shared chain.
  // The identical session holding a single delay is the control — a rack that could only hold
  // one delay would render the two indistinguishably (0030).
  const twoDelayRender = await page.evaluate(async (secs) => {
    const session = (instances) => ({
      secs,
      envelopes: [
        { t: "deck.load", deck: "a", source: { gen: "click-train", hz: 4, secs: 0.25 } },
        ...instances.flatMap((id) => [
          { t: "effect.add", deck: "a", id, effect: "delay" },
          { t: "param.set", deck: "a", instance: id, param: "delay.time", value: 0.07 },
          { t: "param.set", deck: "a", instance: id, param: "delay.feedback", value: 0.5 },
          { t: "param.set", deck: "a", instance: id, param: "delay.mix", value: 0.5 },
        ]),
        { t: "deck.play", deck: "a" },
      ],
    });
    const one = await window.mulch.render(session(["first"]));
    const two = await window.mulch.render(session(["first", "second"]));
    const rack = two.probes.at(-1).probe.decks.a.effects;
    return {
      rack: rack.map((entry) => entry.effect).join(","),
      instances: rack.map((entry) => entry.id).join(","),
      // Each instance carries its own configured value; neither read the other's (0030).
      times: rack.map((entry) => entry.params["delay.time"]).join(","),
      added: two.events.filter((event) => event.t === "effect.added").length,
      oneDb: one.fingerprint.rmsDb,
      twoDb: two.fingerprint.rmsDb,
    };
  }, RACK_RENDER_SECS);

  // P13: two delays in series are two graphs, so the render sounds different from the same
  // session holding one — the proof that instance identity reaches the samples (0030).
  const delayed = twoDelayRender;
  if (
    delayed.rack !== "delay,delay" ||
    delayed.instances !== "first,second" ||
    delayed.times !== "0.07,0.07" ||
    delayed.added !== 2
  ) {
    fail(`two delays did not both reach the rack — ${JSON.stringify(delayed)}`);
  }
  if (!delayed.twoDb.some((db, index) => Math.abs(db - delayed.oneDb[index]) > 1)) {
    fail(
      `two delays in series fingerprint the same as one:\n  one ${delayed.oneDb}\n  two ${delayed.twoDb}`,
    );
  }
  report(
    "two instances of one effect through one rack: a second filter added, bypassed and removed on " +
      "its own in the browser, and offline two delays in series parted from one by " +
      `${Math.max(...delayed.twoDb.map((db, index) => Math.abs(db - delayed.oneDb[index]))).toFixed(1)}dB`,
  );

  // P12: decks are a list the session owns, so a second one exists only because a command added
  // it — and once it does, it lands in the same master bus and is audibly there (0029).
  if (
    twoDeckRender.deckIds.join(",") !== "a,b" ||
    twoDeckRender.added.join(",") !== "b" ||
    twoDeckRender.started.join(",") !== "a,b"
  ) {
    fail(`a deck added mid-render did not join the session — ${JSON.stringify(twoDeckRender)}`);
  }
  const louderThanEither = twoDeckRender.bothDb - Math.max(twoDeckRender.aDb, twoDeckRender.bDb);
  if (!(louderThanEither > 1)) {
    fail(
      `two decks did not sound together: ${twoDeckRender.bothDb}dB against ` +
        `${twoDeckRender.aDb}dB and ${twoDeckRender.bDb}dB alone`,
      twoDeckRender,
    );
  }
  report(
    `a second deck added through its own control and played; offline two decks summed to ` +
      `${twoDeckRender.bothDb.toFixed(1)}dB against ` +
      `${twoDeckRender.aDb.toFixed(1)}dB and ` +
      `${twoDeckRender.bDb.toFixed(1)}dB alone`,
  );
};

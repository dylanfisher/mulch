/** @role M6's storage path: bytes into IndexedDB, an atomic save, and the garbage collected behind it. */
import { fail, sameLoop } from "./harness.js";

export const save = async ({ page, state, bytes }) => {
  const first = await page.evaluate(
    async ({ bytes, kept }) => {
      const instrument = window.mulch;
      const once = (label, test) =>
        new Promise((resolve, reject) => {
          let off = () => {};
          const timeout = setTimeout(() => {
            off();
            reject(new Error(`timed out waiting for ${label}`));
          }, 5_000);
          off = instrument.on((event) => {
            if (!test(event)) return;
            off();
            clearTimeout(timeout);
            resolve(event);
          });
        });
      const file = new File([Uint8Array.from(bytes)], "generated.wav", { type: "audio/wav" });
      const garbage = await instrument.ingest(file);

      const firstSaved = once(
        "first session.saved",
        (event) => event.t === "session.saved" && event.reason === "manual",
      );
      instrument.send({ t: "session.save" });
      await firstSaved;
      instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.4 });
      instrument.send({ t: "deck.activate", deck: "b" });
      const saved = once(
        "replacement session.saved",
        (event) => event.t === "session.saved" && event.reason === "manual",
      );
      instrument.send({ t: "session.save" });
      await saved;

      const database = await new Promise((resolve, reject) => {
        const request = indexedDB.open("mulch", 1);
        request.addEventListener(
          "success",
          () => {
            resolve(request.result);
          },
          { once: true },
        );
        request.addEventListener(
          "error",
          () => {
            reject(request.error);
          },
          { once: true },
        );
      });
      const read = (store, key) =>
        new Promise((resolve, reject) => {
          const request = database.transaction(store).objectStore(store).get(key);
          request.addEventListener(
            "success",
            () => {
              resolve(request.result);
            },
            { once: true },
          );
          request.addEventListener(
            "error",
            () => {
              reject(request.error);
            },
            { once: true },
          );
        });
      const count = (store) =>
        new Promise((resolve, reject) => {
          const request = database.transaction(store).objectStore(store).count();
          request.addEventListener(
            "success",
            () => {
              resolve(request.result);
            },
            { once: true },
          );
          request.addEventListener(
            "error",
            () => {
              reject(request.error);
            },
            { once: true },
          );
        });
      const stored = await read("blobs", kept);
      const storedBytes = [...new Uint8Array(await stored.arrayBuffer())];
      const removed = await read("blobs", garbage);
      const session = await read("sessions", "current");
      const sessionCount = await count("sessions");

      const refused = once(
        "garbage-collected blob error",
        (event) => event.t === "error" && event.detail.includes(garbage),
      );
      instrument.send({ t: "deck.load", deck: "a", source: { blobId: garbage } });
      await refused;
      return {
        kept,
        bytesEqual:
          storedBytes.length === bytes.length && storedBytes.every((byte, i) => byte === bytes[i]),
        garbageRemoved: removed === undefined,
        singleton:
          sessionCount === 1 &&
          !("version" in session) &&
          session.activeDeck === "b" &&
          // The deck list is durable shape: the second deck was added, so it comes back (0029).
          session.deckList.map((entry) => entry.id).join(",") === "a,b" &&
          session.decks.a.source.blobId === kept &&
          session.decks.a.params["deck.gain"] === 0.4 &&
          session.decks.a.automation["deck.gain"].length > 1 &&
          session.decks.a.effects.map((entry) => entry.effect).join(",") === "filter" &&
          session.decks.a.effects.every((entry) => entry.bypassed) &&
          // The lane the knob recorded is stored on the instance that owns the value (0030).
          session.decks.a.effects[0].automation["filter.cutoff"].length > 1,
        // The snapped loop is durable; the analysis that suggested it is not, and is re-derived
        // from the source on every load rather than stored beside it (0025).
        storedLoop: session.decks.b.loop,
        storedAnalysis: "analysis" in session.decks.b,
        sourceAfterRefusal: instrument.probe().decks.a.source,
      };
    },
    { bytes: bytes.wav, kept: state.kept },
  );

  if (!first.bytesEqual) fail("persistence smoke: imported blob bytes changed", first);
  if (!first.garbageRemoved) fail("persistence smoke: unreferenced blob survived save", first);
  if (!first.singleton) fail("persistence smoke: current session snapshot was not replaced", first);
  if (first.sourceAfterRefusal?.blobId !== first.kept) {
    fail("persistence smoke: failed blob load partially changed the deck", first);
  }
  if (first.storedAnalysis) {
    fail("the durable session stored analysis; it is derived from the source, not recorded");
  }

  if (!sameLoop(first.storedLoop, state.beat)) {
    fail(`the saved session did not carry the snapped loop — ${JSON.stringify(first.storedLoop)}`);
  }
};

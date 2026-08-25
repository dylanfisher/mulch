/**
 * @role P79's proof: a yard flattened onto the sound its rack, its read rate and its loop were
 * making, and the flattened yard played straight measuring exactly as that performance does when
 * it is recorded the same way and played back the same way.
 */
import { LOOKAHEAD_SECS } from "../../src/audio/transport.ts";
import { compareFingerprints } from "../../src/lib/fingerprint.ts";
import { fail, report } from "./harness.js";

/** The yard this scenario builds and takes away again, so nothing before or after it is moved. */
const FLATTEN_DECK = "flat";
/** The yard a render's own instrument starts with, which is the only one its envelopes may name. */
const RENDER_DECK = "a";
/** The blob the flatten mints. Named rather than drawn, so a failure says which bytes it was. */
const FLATTEN_BLOB = "flatten-smoke";
/** One pass of the loop below at the speed below: a quarter second read at half rate. */
const FLATTEN_SECS = 0.5;
/** Well under the limiter's threshold, so both renders measure the yard and not the master. */
const FLATTEN_GAIN = 0.3;
/** Above this a stored sample is the performance rather than the space around it. */
const FLATTEN_SOUNDING = 0.001;
/**
 * How near its own ends the stored clip has to be sounding. A quarter of a millisecond either
 * side: the yard's loop starts at a zero crossing of its tone, so a couple of frames of it are
 * genuinely quiet, and the few hundred a dropped bus delay would leave are not.
 */
const FLATTEN_EDGE_FRAMES = 12;

export const flattenYard = async ({ page }) => {
  const flatten = await page.evaluate(
    async ({ blob, deck, gain, lookahead, rendered, secs, sounding }) => {
      // The performance: a tone read at half speed through a filter, looped across its middle.
      // Every one of those is a thing a flatten is supposed to put into the samples. Written
      // against whichever yard is holding it — the live one this scenario adds, or the one a
      // render's own instrument starts with, which is the only yard its envelopes may name.
      const performance = (on) => [
        { t: "deck.load", deck: on, source: { gen: "sine", hz: 220 } },
        { t: "param.set", deck: on, param: "deck.gain", value: gain },
        { t: "param.set", deck: on, param: "deck.speed", value: 0.5 },
        { t: "effect.add", deck: on, id: "flatten-filter", effect: "filter" },
        {
          t: "param.set",
          deck: on,
          instance: "flatten-filter",
          param: "filter.cutoff",
          value: 600,
        },
        { t: "deck.loop", deck: on, in: 0.1, out: 0.35 },
      ];
      /** Two passes, keeping the second — the shape a flatten records in (0112). */
      const pass = (envelopes, blobs) =>
        window.mulch.render({
          secs: lookahead + 2 * secs,
          fromSecs: lookahead + secs,
          envelopes,
          ...(blobs === undefined ? {} : { blobs }),
          wav: true,
        });
      /** A render's own file, as bytes — the wire carries it as text (src/main.tsx). */
      const filed = (result) =>
        Uint8Array.from(atob(result.wav), (character) => character.codePointAt(0) ?? 0);
      /** Bytes loaded onto a yard and played straight: no rack, no lane, no rate but its own. */
      const plain = (id, bytes) =>
        pass(
          [
            { t: "deck.load", deck: rendered, source: { blobId: id } },
            { t: "deck.loop", deck: rendered, in: 0, out: secs },
            { t: "deck.play", deck: rendered },
          ],
          new Map([[id, bytes]]),
        );

      // The control: the same performance recorded by the same harness, by hand, from outside
      // the command. It is played back below exactly as the flattened yard is, so the one extra
      // pass of the master bus that recording a performance and playing it again costs stands on
      // both sides of the comparison and cannot be what the comparison measures (0112).
      const control = filed(
        await pass([...performance(rendered), { t: "deck.play", deck: rendered }]),
      );

      // The same performance on the live instrument, flattened by the ordinary command.
      window.mulch.send({ t: "deck.add", deck, emoji: "🧱", name: "Flatten" });
      for (const command of performance(deck)) window.mulch.send(command);
      const flattened = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          off();
          reject(new Error("deck.flatten never reported"));
        }, 15_000);
        const off = window.mulch.on((event) => {
          if (event.t === "deck.flattened" && event.deck === deck) {
            clearTimeout(timer);
            off();
            resolve(event);
          }
          if (event.t === "error") {
            clearTimeout(timer);
            off();
            reject(new Error(event.detail));
          }
        });
        window.mulch.send({ t: "deck.flatten", deck, id: blob });
      });

      // The bytes as they were actually stored, read back out of the repository the session owns
      // — a flatten's output lands there and never at the download anchor (0112).
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
      const stored = await new Promise((resolve, reject) => {
        const request = database.transaction("blobs").objectStore("blobs").get(flattened.blob);
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
      const bytes = new Uint8Array(await stored.arrayBuffer());

      // The stored clip's own edges. The master bus delays what it is handed, so a flatten that
      // kept the first pass would open with a few hundred frames of nothing and end that much
      // short of its loop — a hole at the seam every time the clip goes round (0112).
      const decoded = await new OfflineAudioContext(2, 48_000, 48_000).decodeAudioData(
        bytes.slice().buffer,
      );
      const data = decoded.getChannelData(0);
      const loudAt = (from, step) => {
        for (let i = from; i >= 0 && i < data.length; i += step) {
          if (Math.abs(data[i]) > sounding) return i;
        }
        return -1;
      };
      const straight = await plain(flattened.blob, bytes);
      const performed = await plain("flatten-control", control);

      const after = window.mulch.probe().decks[deck];
      window.mulch.send({ t: "deck.remove", deck });
      return {
        secs: flattened.secs,
        header: new TextDecoder().decode(bytes.slice(0, 4)),
        bytes: bytes.length,
        controlBytes: control.length,
        blob: flattened.blob,
        after: {
          source: after.source,
          effects: after.effects.length,
          speed: after.params["deck.speed"],
          gain: after.params["deck.gain"],
          loop: after.loop,
          duration: after.duration,
        },
        edges: {
          firstLoud: loudAt(0, 1),
          lastLoud: loudAt(data.length - 1, -1),
          frames: data.length,
        },
        straight: straight.fingerprint,
        performed: performed.fingerprint,
      };
    },
    {
      blob: FLATTEN_BLOB,
      deck: FLATTEN_DECK,
      gain: FLATTEN_GAIN,
      lookahead: LOOKAHEAD_SECS,
      rendered: RENDER_DECK,
      secs: FLATTEN_SECS,
      sounding: FLATTEN_SOUNDING,
    },
  );

  // The yard is the bytes now: what it plays is the blob the render minted, at rest, looping the
  // whole of it, with everything that shaped the sound gone because it is in the sound.
  if (flatten.header !== "RIFF") fail("a flatten did not store a wav", flatten);
  if (flatten.after.source?.blobId !== flatten.blob) {
    fail("a flatten left the yard on the source it rendered from", flatten);
  }
  if (flatten.after.effects !== 0 || flatten.after.speed !== 1 || flatten.after.gain !== 1) {
    fail("a flatten left something on the yard that is already in the samples", flatten);
  }
  if (
    flatten.edges.firstLoud < 0 ||
    flatten.edges.firstLoud > FLATTEN_EDGE_FRAMES ||
    flatten.edges.lastLoud < flatten.edges.frames - 1 - FLATTEN_EDGE_FRAMES
  ) {
    fail("a flatten stored a clip that is silent at one of its own ends", flatten);
  }
  if (flatten.bytes !== flatten.controlBytes) {
    fail("a flatten stored a different length from the pass it was of", flatten);
  }
  if (Math.abs(flatten.after.duration - FLATTEN_SECS) > 0.001) {
    fail(
      `a flatten decoded to ${flatten.after.duration}s, not the pass's ${FLATTEN_SECS}s`,
      flatten,
    );
  }
  if (flatten.after.loop?.in !== 0 || Math.abs(flatten.after.loop.out - FLATTEN_SECS) > 0.001) {
    fail("a flatten did not leave the loop the render was of", flatten);
  }
  // The proof: the flattened yard played straight measures as the performance does, at the one
  // set of tolerances this project compares two renders at (src/lib/fingerprint.ts).
  const differences = compareFingerprints(flatten.performed, flatten.straight);
  if (differences.length > 0) {
    fail("a flattened yard does not sound like the performance it was taken from", {
      differences,
      performed: flatten.performed,
      straight: flatten.straight,
    });
  }
  report(
    `a ${flatten.secs.toFixed(2)}s pass of a yard read at 0.5x through a filter became its whole source: ` +
      `${flatten.bytes} bytes of stored wav, decoded to ${flatten.after.duration.toFixed(3)}s and ` +
      `sounding from frame ${flatten.edges.firstLoud} to ${flatten.edges.lastLoud} of ` +
      `${flatten.edges.frames}, that play straight to the performance's own fingerprint`,
  );
};

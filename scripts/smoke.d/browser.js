/**
 * @role The browser half of the smoke: the scenarios that ride a page in order, split into the
 * three lanes that run at once — M6's storage path, the renders and gestures beside it, and the
 * Mulcher card. The page itself is opened by ./page.js, which ./scripts/profile opens the same way.
 */
import { archive } from "./archive.js";
import { automation } from "./automation.js";
import { clips } from "./clips.js";
import { cropLoop } from "./crop.js";
import { cutoff } from "./cutoff.js";
import { debugKey } from "./debugConsole.js";
import { driftOpens } from "./drift.js";
import { dropFile } from "./drop.js";
import { flick } from "./flick.js";
import { flattenYard } from "./flatten.js";
import { formats } from "./formats.js";
import { fixedHeader } from "./header.js";
import { inLane } from "./harness.js";
import { keyboardRoutes } from "./keyboard.js";
import { lanePreview } from "./laneMarks.js";
import { leaks } from "./leaks.js";
import { groundDrag, longTasks, watchLongTasks } from "./longTasks.js";
import { masterMeter } from "./masterMeter.js";
import { narrowShell } from "./narrow.js";
import { exportAudioFile, SETTLE_ASK_SECS } from "./exportAudio.js";
import { exportReleasesSamples } from "./exportRelease.js";
import { dragCardAcrossRow } from "./dragCard.js";
import { effectPicker } from "./picker.js";
import { commandPalette } from "./palette.js";
import { openPage } from "./page.js";
import { exportParity } from "./parity.js";
import { rackControls } from "./rack.js";
import { rackRowHeights } from "./rackRow.js";
import { reload } from "./reload.js";
import { renderDecks } from "./renderDecks.js";
import { renderDynamics } from "./renderDynamics.js";
import { renderEq } from "./renderEq.js";
import { renderLanes } from "./renderLanes.js";
import { renderPlayer } from "./renderPlayer.js";
import { renderRack } from "./renderRack.js";
import { renderAutomator } from "./renderAutomator.js";
import { renderRate } from "./renderRate.js";
import { renderTape } from "./renderTape.js";
import { renderTone } from "./renderTone.js";
import { playerRate } from "./playerRate.js";
import { save } from "./save.js";
import { seek } from "./seek.js";
import { slide } from "./slide.js";
import { snap } from "./snap.js";
import { sweepLoop } from "./sweep.js";
import { tooltipCostsNothing } from "./tooltip.js";
import { typedKnob } from "./typedKnob.js";

/**
 * The lanes, and the whole of the browser half. Each is one page of its own, and the three run at
 * once: this half was the entire critical path of `./scripts/check` — 16.8s of one page's ~2500
 * sequential round trips, under which every other step of the gate finished — and none of it was
 * CPU-bound, so three pages cost three Chromiums and a third of the wall clock (0238).
 *
 * Order is still load-bearing *within* a lane: what one scenario leaves on the page is what the
 * next one reads, which is why they share a page and pass what crosses between them through
 * `state`. What a lane may NOT do is inherit page state from a scenario in another lane. A lane
 * says what its page must already hold in its own `prelude`, through `window.mulch` and the
 * visible affordances — never by borrowing a neighbour's leftovers.
 */
const LANES = [
  {
    /**
     * The chain: unchanged bytes into IndexedDB, an ordinary blob-id command into the real graph,
     * atomic save/GC, then a same-origin reload and automatic restore — and the gestures either
     * side of it that read what it left. It is the one lane with a `reload()` in it, so the rule
     * that everything from `reload` on is deliberately after it — pre-reload browser work is what
     * stalls the reloaded audio clock (plan §3) — is a rule about this lane and no other.
     */
    name: "chain",
    scenarios: [
      keyboardRoutes,
      automation,
      rackControls,
      cutoff,
      snap,
      save,
      reload,
      lanePreview,
      masterMeter,
      clips,
      debugKey,
      archive,
      watchLongTasks,
      slide,
      seek,
      sweepLoop,
      flick,
      groundDrag,
      longTasks,
      leaks,
    ],
  },
  {
    /** The renders, the exports, and the rack gestures that are not on the chain. */
    name: "renders",
    /**
     * A second yard, added through the visible affordance rather than by a command past the UI
     * (0029) — ./formats.js and ./drop.js both name deck b. A filter on yard A's rack, which is
     * the half of the pair ./dragCard.js drags; ./picker.js below adds the eq it is dragged past.
     * And the instrument's own clock past `SETTLE_ASK_SECS`: ./exportAudio.js takes from the ear,
     * with the whole performance standing behind it, and asserts that the export shortened that to
     * what this rack settles in — which a performance no older than that settle cannot show.
     */
    prelude: async ({ page }) => {
      await page.getByRole("button", { name: "Add Yard" }).click();
      await page.waitForFunction(
        () =>
          window.mulch
            .probe()
            .deckList.map((entry) => entry.id)
            .join(",") === "a,b",
      );
      await page.evaluate(() =>
        window.mulch.send({ t: "effect.add", deck: "a", id: "flt", effect: "filter" }),
      );
      await page.waitForFunction(
        () => window.mulch.probe().decks.a.effects.at(-1)?.effect === "filter",
      );
      await page.waitForFunction((ask) => window.mulch.stats().at > ask, SETTLE_ASK_SECS);
    },
    scenarios: [
      exportParity,
      exportAudioFile,
      exportReleasesSamples,
      renderRack,
      renderAutomator,
      renderTape,
      renderEq,
      renderDynamics,
      renderLanes,
      renderPlayer,
      renderDecks,
      renderRate,
      renderTone,
      formats,
      dropFile,
      cropLoop,
      flattenYard,
      effectPicker,
      rackRowHeights,
      dragCardAcrossRow,
      tooltipCostsNothing,
      typedKnob,
    ],
  },
  {
    /**
     * The Mulcher card and the three measurements of the page around it. `playerRate` alone is
     * 5.9s of round trips — the floor of the whole gate — so it gets a lane rather than a place
     * in a queue behind one.
     */
    name: "card",
    /**
     * A loop on yard A, because `src/ui/PlayerCard.tsx` draws nothing at all for a deck with
     * neither a loop nor a live player: without this the Mulcher card is not on the page and
     * every locator in ./playerRate.js waits out its timeout against a card that was never
     * rendered. And one effect running, because a yard with nothing running has no drift strip
     * for ./drift.js to click (src/ui/MoireStrip.tsx). One is enough: what a second bought was
     * time, and the race it was covering is fixed where it was — in ./drift.js.
     */
    prelude: async ({ page }) => {
      await page.evaluate(() => {
        window.mulch.send({ t: "deck.loop", deck: "a", in: 0, out: 0.05 });
        window.mulch.send({ t: "effect.add", deck: "a", id: "flt", effect: "filter" });
      });
      await page.waitForFunction(() => {
        const deck = window.mulch.probe().decks.a;
        return deck.loop !== null && deck.effects.length === 1;
      });
    },
    scenarios: [driftOpens, playerRate, narrowShell, fixedHeader, commandPalette],
  },
];

/**
 * 0036 says a failed assertion prints everything it had. A Playwright timeout is exempt from it:
 * `Timeout 30000ms exceeded` and `log: []` say only that time passed, never what the page actually
 * held — which is the one thing that would have fixed it. So every failure in the browser half
 * comes back through here, carrying the ring and the probe at the moment it gave up, and the
 * evidence a `fail()` in a scenario attached to it.
 */
const reported = new WeakSet();
const reportPageFailure = async (page, what, error) => {
  if (reported.has(error)) return;
  reported.add(error);
  const evidence = await page
    .evaluate(() => ({
      hash: window.location.hash,
      probe: "mulch" in window ? window.mulch.probe() : null,
      // The tail is the part a wait was watching for; the whole ring is mostly startup.
      ring: "mulch" in window ? window.mulch.ring().slice(-25) : null,
    }))
    .catch((problem) => ({ unreadable: String(problem) }));
  const where = (error.stack ?? "").split("\n").find((line) => line.includes("scripts/smoke"));
  console.error(`smoke: ${what} — ${String(error.message ?? error).split("\n")[0]}`);
  if (where !== undefined) console.error(` ${where.trim()}`);
  if (error.evidence !== undefined) {
    console.error(`  evidence: ${JSON.stringify(error.evidence)}`);
  }
  console.error(`  page: ${JSON.stringify(evidence)}`);
};

/**
 * One lane: its own preview page, the one imported blob every lane measures against, its prelude,
 * then its scenarios in order. Its claims are collected here rather than pushed straight onto the
 * shared list — three lanes writing into one array would order the summary by whichever page
 * happened to be quickest, and the summary reads in the order the assertions do.
 *
 * A failure is returned rather than thrown: the other two lanes have assertions of their own in
 * flight, and taking the process down here would lose them — the same reason `scripts/smoke`
 * catches this whole half. The caller re-raises once all three are in.
 */
const runLane = async (root, lane) => {
  const session = await openPage(root);
  const { page, browser, url, bytes } = session;
  const claims = [];

  try {
    await page.locator('input[aria-label="Import Audio for Yard A"]').setInputFiles({
      name: "generated.wav",
      mimeType: "audio/wav",
      buffer: Buffer.from(bytes.wav),
    });
    await page.waitForFunction(
      () => {
        const deck = window.mulch.probe().decks.a;
        return deck.source !== null && "blobId" in deck.source && deck.duration > 0;
      },
      undefined,
      { timeout: 5_000 },
    );
    // The blob every later scenario measures against: saved, restored, borrowed by a clip, and
    // carried through the archive as the same id it was imported under.
    const state = { kept: await page.evaluate(() => window.mulch.probe().decks.a.source.blobId) };
    const context = { page, browser, url, root, state, bytes, reportPageFailure };

    await inLane(claims, async () => {
      if (lane.prelude !== undefined) await lane.prelude(context);
      for (const scenario of lane.scenarios) await scenario(context);
    });
  } catch (error) {
    await reportPageFailure(page, `the ${lane.name} lane failed`, error);
    return { claims, error };
  } finally {
    await session.close();
  }
  return { claims };
};

/**
 * The three lanes at once, and their claims replayed in lane order once all three are in. The
 * caller sees one browser half: it fails if any lane did, and the first failure is the one raised
 * — every lane has already printed its own page beside its own message.
 */
export const browserSmoke = async (root) => {
  const lanes = await Promise.all(LANES.map((lane) => runLane(root, lane)));
  const failed = lanes.find((lane) => lane.error !== undefined);
  if (failed !== undefined) throw failed.error;
  return lanes.flatMap((lane) => lane.claims);
};

/**
 * @role A whole performance rendered offline — the same commands through the same chain, faster
 *   than realtime, and a fingerprint of what came out. The deterministic host of docs/plan.md §2.
 * @instead The live instrument → src/app/facade.ts. A render builds its own, on its own context,
 *   because it is a second session and must not disturb the one being played. Measuring the
 *   result → src/lib/fingerprint.ts; nothing about tolerances is decided here.
 */
import { RENDER_QUANTUM } from "@/audio/deck";
import { loadWorklets } from "@/audio/worklet";
import { fingerprint, type Fingerprint } from "@/lib/fingerprint";
import { peaks } from "@/lib/peaks";
import { encodeWav } from "@/lib/wav";
import { contextClock } from "./clock";
import type { Command, Envelope } from "./commands";
import { createAudioEngine } from "./engine";
import type { Event } from "./events";
import { createInstrument, type Instrument, type Probe } from "./facade";

/**
 * The render's own rate and width, fixed rather than borrowed from the device. A fingerprint
 * taken at whatever rate this machine's sound card happens to run at would compare against a
 * golden taken on another machine's, and the difference would read as a regression.
 */
export const RENDER_SAMPLE_RATE = 48_000;
export const RENDER_CHANNELS = 2;

/** The waveform PNG's size. A glance, not a document — one fixed shape, so two are comparable. */
export const PNG_WIDTH = 1200;
export const PNG_HEIGHT = 240;

/**
 * The two greys the PNG is drawn in. Not a breach of the colour boundary: tokens.css is CSS
 * that a page loads, and an OffscreenCanvas loads no page. This is a diagnostic image nothing
 * themes — the same reasoning as the favicon (docs/decisions/0006-favicon-colour.md).
 */
const PNG_BACKGROUND = "#0a0a0a";
const PNG_TRACE = "#e5e5e5";

/** Bytes per base64 chunk. Spreading a megabyte into fromCharCode at once overflows the stack. */
const BASE64_CHUNK = 0x80_00;

export type RenderSpec = {
  /** How long to render, in seconds of the timeline the envelopes are stamped against. */
  secs: number;
  /** Wire input in the shapes send() already takes; a bare command means the render's start. */
  envelopes: (Command | Envelope)[];
  /** Times, in render seconds, to take a probe at. One at the end is always taken. */
  probes?: number[];
  wav?: boolean;
  png?: boolean;
};

export type RenderProbe = {
  /** How many events had been emitted when it was taken — where it belongs in the stream. */
  after: number;
  probe: Probe;
};

export type RenderResult = {
  /** In seq order, which is emission order — the same order a live run prints them in. */
  events: Event[];
  /** Every probe asked for, plus the final one, each carrying the render time it was taken at. */
  probes: RenderProbe[];
  fingerprint: Fingerprint;
  /** base64, both of them — the binding back to ./scripts/drive carries text, not bytes. A
   *  `data:` prefix is a viewer's business, and no viewer is on this side of the wire. */
  wav?: string;
  png?: string;
};

/** What `window.mulch` is: the live instrument, plus the one thing it cannot do on its own. */
export type Driven = Instrument & { render: (spec: RenderSpec) => Promise<RenderResult> };

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let at = 0; at < bytes.length; at += BASE64_CHUNK) {
    binary += String.fromCodePoint(...bytes.subarray(at, at + BASE64_CHUNK));
  }
  return btoa(binary);
}

/** The render as a picture, for when an agent should actually look (docs/plan.md §3). */
async function toPng(channels: readonly Float32Array[]): Promise<string> {
  const canvas = new OffscreenCanvas(PNG_WIDTH, PNG_HEIGHT);
  const surface = canvas.getContext("2d");
  if (surface === null) throw new Error("no 2d context: the waveform PNG cannot be drawn");
  surface.fillStyle = PNG_BACKGROUND;
  surface.fillRect(0, 0, PNG_WIDTH, PNG_HEIGHT);

  const middle = PNG_HEIGHT / 2;
  const { min, max } = peaks(channels, PNG_WIDTH);
  surface.fillStyle = PNG_TRACE;
  for (let x = 0; x < PNG_WIDTH; x++) {
    const top = middle - (max[x] ?? 0) * middle;
    const bottom = middle - (min[x] ?? 0) * middle;
    // At least a pixel: silence draws as the centre line rather than as nothing at all, which
    // is the difference between "it rendered quiet" and "it rendered nothing".
    surface.fillRect(x, top, 1, Math.max(1, bottom - top));
  }
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return toBase64(new Uint8Array(await blob.arrayBuffer()));
}

/**
 * The audio thread reports over a MessagePort, and a port message reaches this thread as a task.
 * startRendering() resolves without waiting for that queue, so the last reports are still in
 * flight when it does — two turns of the loop is where they land.
 */
const nextTurn = (): Promise<void> =>
  new Promise<void>((done) => {
    setTimeout(done, 0);
  });

async function flushReports(): Promise<void> {
  await nextTurn();
  await nextTurn();
}

/**
 * Render a file of envelopes and measure the result.
 *
 * The one thing offline needs that live does not is a pump that rides the render: an
 * OfflineAudioContext's clock moves only while it is rendering, and nothing on the main thread
 * runs meanwhile. So every moment a scheduled envelope is due becomes a `suspend`, which the
 * queue is pumped at and the render resumed from. Envelopes due at zero need none — `send()`
 * pumps them before rendering starts, when the clock already reads their time.
 */
// The whole host, and it is one linear sequence: build the context, wire the pump to it, render,
// measure. Splitting it hands a context and an instrument between helpers with one caller each
// (docs/decisions/0007-reviewed-oversized-functions.md).
// oxlint-disable-next-line max-lines-per-function
export async function renderOffline(spec: RenderSpec): Promise<RenderResult> {
  if (!Number.isFinite(spec.secs) || spec.secs <= 0) {
    throw new RangeError(`a render needs a positive length: ${spec.secs}`);
  }
  const frames = Math.round(spec.secs * RENDER_SAMPLE_RATE);
  const end = frames / RENDER_SAMPLE_RATE;
  const ctx = new OfflineAudioContext({
    numberOfChannels: RENDER_CHANNELS,
    length: frames,
    sampleRate: RENDER_SAMPLE_RATE,
  });
  await loadWorklets(ctx);

  /** Where a render can actually stop: suspension lands on a render-quantum boundary. */
  const boundary = (at: number): number =>
    (Math.ceil((Math.max(at, 0) * RENDER_SAMPLE_RATE) / RENDER_QUANTUM) * RENDER_QUANTUM) /
    RENDER_SAMPLE_RATE;

  // Two suspensions inside one quantum are an error, not a second stop, so the boundary is the
  // key: everything due in the same block is pumped by the same stop.
  /** How many probes each stop owes. Two probes asked for in one block are two lines out. */
  const probesAt = new Map<number, number>();
  const stops = new Set<number>();
  for (const input of spec.envelopes) {
    const at = "cmd" in input ? input.at : undefined;
    if (at === undefined || at <= 0) continue;
    const stop = boundary(at);
    // Loud rather than quietly unheard: a stop past the end never fires, so the command would
    // simply never run and the fixture would look like it had.
    if (stop >= end) throw new RangeError(`an envelope at ${at}s is past the ${end}s render`);
    stops.add(stop);
  }
  for (const at of spec.probes ?? []) {
    const stop = boundary(at);
    // A probe at or past the end is the final probe, taken below — not a stop that never fires.
    if (stop >= end) continue;
    stops.add(stop);
    probesAt.set(stop, (probesAt.get(stop) ?? 0) + 1);
  }

  const events: Event[] = [];
  const probes: RenderProbe[] = [];
  const instrument = createInstrument(contextClock(ctx), (store, emit) =>
    createAudioEngine(ctx, store, emit, null),
  );
  instrument.on((event) => {
    events.push(event);
  });

  /** Ride the render: stop it where something is due, hand the queue over, let it carry on. */
  const pumpAt = async (stop: number): Promise<void> => {
    await ctx.suspend(stop);
    instrument.pump();
    for (let due = probesAt.get(stop) ?? 0; due > 0; due--) {
      probes.push({ after: events.length, probe: instrument.probe() });
    }
    await ctx.resume();
  };
  // Registration order does not matter: each suspension is keyed by its own time on the timeline.
  const pumps = [...stops].map((stop) => pumpAt(stop));

  for (const input of spec.envelopes) instrument.send(input);

  // Awaited alongside the render rather than left floating: a suspend or resume that rejects is
  // a render that silently never ran a command, and this is the file whose whole job is to be
  // deterministic. Every pump resolves before the render does — each one is inside it.
  const [buffer] = await Promise.all([ctx.startRendering(), Promise.all(pumps)]);
  await flushReports();
  probes.push({ after: events.length, probe: instrument.probe() });

  const channels = Array.from({ length: buffer.numberOfChannels }, (_, channel) =>
    buffer.getChannelData(channel),
  );
  return {
    events,
    probes,
    fingerprint: fingerprint(channels, buffer.sampleRate),
    ...(spec.wav === true ? { wav: toBase64(encodeWav(channels, buffer.sampleRate)) } : {}),
    ...(spec.png === true ? { png: await toPng(channels) } : {}),
  };
}

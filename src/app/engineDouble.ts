/**
 * @role The silent Engine every seam test builds its graph double on — one implementation of the
 *   whole interface that does nothing observable, with the methods a case is actually about
 *   spread over it.
 * @instead The real host → src/app/engine.ts. Nothing in production imports this file: it exists
 *   so a method added to `Engine` costs one edit here instead of one per test that names it.
 */
import { genSecs } from "@/lib/waveform";
import { deckIdsOf, fromDecks } from "@/state/store";
import type { Engine } from "./engine";

/**
 * `load` reports the length the generator's own kind declares, because a session that recorded
 * a zero-length load is a session no assertion below could read. Everything else is the quietest
 * answer its return type allows.
 */
export const silentEngine = (overrides: Partial<Engine> = {}): Engine => ({
  addDeck: () => {},
  removeDeck: () => {},
  load: (_deck, source) => genSecs(source.gen),
  loadBlob: () => Promise.resolve(1),
  endGesture: () => {},
  sourcePeaks: () =>
    Promise.resolve({ peaks: { min: new Float32Array(), max: new Float32Array() }, duration: 0 }),
  play: () => {},
  stop: () => {},
  pause: () => {},
  seek: () => {},
  planned: () => false,
  setLoop: () => null,
  setPlayer: () => {},
  soloPlayer: () => false,
  setSync: () => {},
  setParam: () => {},
  setAutomation: () => {},
  addEffect: () => 0,
  setEffectBypass: () => {},
  removeEffect: () => {},
  reorderEffects: () => {},
  peek: () => {},
  masterPeek: () => {},
  cropped: () => new Uint8Array(new ArrayBuffer(0)),
  peaks: () => null,
  contextState: () => "running",
  analyzing: () => 0,
  renderLoad: () => null,
  measureRenderLoad: () => {},
  bufferBytes: () => 0,
  prepareRestore: (session) =>
    Promise.resolve({
      durations: fromDecks(deckIdsOf(session.deckList), () => 0),
      commit: () => {},
      measure: () => {},
      discard: () => {},
    }),
  ...overrides,
});

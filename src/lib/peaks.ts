/**
 * @role Samples reduced to one min/max pair per column — the shape a waveform is drawn from,
 *   whichever surface draws it.
 * @instead Measuring a render → src/lib/fingerprint.ts. This throws away everything but the
 *   envelope, so it answers "what did it look like", never "was it right".
 */

export type Peaks = {
  /** Lowest and highest sample in each column, across every channel. Same length as columns. */
  min: Float32Array<ArrayBuffer>;
  max: Float32Array<ArrayBuffer>;
};

/**
 * Min/max per column, over every channel at once — a mono summary, because a waveform drawn
 * from the loudest of the two channels is what a person is actually looking for.
 *
 * Columns whose span is empty (more columns than frames) keep a flat 0/0 pair rather than
 * borrowing a neighbour's, so an over-wide draw looks sparse instead of looking smooth.
 */
export function peaks(channels: readonly Float32Array[], columns: number): Peaks {
  if (!Number.isInteger(columns) || columns <= 0) {
    throw new RangeError(`columns must be a positive integer: ${columns}`);
  }
  const min = new Float32Array(columns);
  const max = new Float32Array(columns);
  const frames = channels[0]?.length ?? 0;

  for (let column = 0; column < columns; column++) {
    const from = Math.floor((column * frames) / columns);
    const to = Math.floor(((column + 1) * frames) / columns);
    let low = 0;
    let high = 0;
    for (const data of channels) {
      for (let i = from; i < to; i++) {
        const x = data[i] ?? 0;
        if (x < low) low = x;
        if (x > high) high = x;
      }
    }
    min[column] = low;
    max[column] = high;
  }
  return { min, max };
}

# 0133 — A take is named after what it was made of, and when

- **Date:** 2026-08-22
- **Status:** accepted, extending [0127](0127-an-export-is-a-folder.md), amended by
  [0156](0156-a-takes-name-is-fields-and-a-field-is-one-word.md)

The offered export name was the active yard's name and the file its bytes were imported as. Two
things were missing from it, and both cost the same thing: two exports of one yard were one name
twice, so the second overwrote the first in whatever folder the browser had put them in.

**What it was made of is one field with two fillings.** A yard on a generator is named after that
generator's own kind — `sine`, `click-train` — in the slot an imported file's stem sits in, because
a person reading a folder wants the same answer either way. Bytes a crop or a flatten minted stay
the one source that fills it with nothing: they are named by the command that minted them
([0047](0047-a-crop-mints-audio-the-user-did-not-import.md)) and that is not a name anyone
recognises. A future source kind fills the same field or it says nothing at all — it does not get
a third one.

**When it was made leads the name**, and that ordering is load-bearing rather than taste: the one
reader of this string cuts it to a length a filesystem takes and cuts it from the end (`fitted`).
A stamp at the tail is the first thing a long source name pushes past the cap — 31 CJK characters
is 93 of the 96 bytes — and two takes an hour apart would be one folder again, which is the whole
defect. A folder of takes sorting by when they were made is the second reason.

**It is the local day and the local minute**, in digits every filesystem writes back
unchanged. Local, because "when it was made" is the clock the person making it was reading. To the
minute, because two takes an hour apart and two a second apart collide identically — and the
minute is where a person stops being able to tell two takes apart by memory anyway.

**The clock is the caller's.** `defaultExportName` takes the `Date`; the dialog reads the wall
clock as it opens. A name derived twice a minute apart is two names, so a function that read the
clock itself is one no test could assert against.

Nothing durable moved: a name is still derived at the dialog and stored nowhere (P40).

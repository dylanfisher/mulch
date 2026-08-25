# 0156 — A take's name is fields, and a field is one word

- **Date:** 2026-08-25
- **Status:** accepted, amending [0133](0133-a-take-is-named-after-what-it-was-made-of-and-when.md)

The offered name was `2026-08-24 1911 Old Thicket birds` — space-joined, with spaces, commas,
apostrophes, parentheses and `&` all surviving into a filename. It is now
`2026-08-24_mulch-export-1911_Old-Thicket_Dont-Stop-til-You-Get-Enough`.

**Four fields joined by `_`, and a field is one word.** The local day; the app's own name with the
local minute on it; the yard; what it was made of. A hyphen wherever a field held a space, and
nothing else survives at all — letters, digits, `-` inside a field and `_` between two are the
whole permitted set. An apostrophe is **dropped** rather than replaced, because a mark inside a
word is not a word boundary: `Don't Stop 'til` is `Dont-Stop-til` and not `Don-t-Stop--til`.

**An apostrophe is every shape one arrives in**, and a letter is composed before it is judged one.
The grave a keyboard without them is used for, the two curly ones, and the two modifier letters —
which `\p{L}` would otherwise carry into the filename verbatim — all drop, because a hyphen where
an apostrophe was is the one thing this rule exists to prevent. And the field is normalised to NFC
first: macOS hands a picked file's name back decomposed, where the accent is a combining mark, a
mark is not in the permitted set, and `Café` would read as `Cafe` and `Ångström` as `A-ngstro-m`.
A script that composes no further than NFD keeps neither — that is the set this decision narrowed
to and not a fallback.

**The app's own name is in every name**, not only in the name of a session holding no yards.
`EXPORT_AUDIO_FILE.base` is that field, and a session with no yard is simply missing the two
fields it has nothing to say for — a field that says nothing is left out rather than joined empty,
so there are never two `_` in a row.

**A typed name is read as the fields the offered one is made of.** `exportNames` splits on the
separator and puts each field through the one rule, so there is one answer to what survives into a
filename and no second spelling of it. That rule lives in `src/lib/exportName.ts` with the rest of
the derivation, split out of `copy.ts`, which the addition took past the hard line cap.

**Everything 0133 decided about the order stands**, and the stamp still leads for its reason: one
reader cuts this to a filesystem's byte cap and cuts from the end. What that cut now answers for is
new — **a name cut mid-field must not end on a separator**, so the trailing `-` or `_` a cut lands
on comes off after the cut, never before it.

Durable shape: none. A name is derived at the dialog and stored nowhere (P40).

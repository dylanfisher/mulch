# 0343 — A yard's field may be set aside, for a tab

**2026-09-10.** Amends 0329's "the name is the only thing that sets it": the name still reads the
whole picture — field, light, wind, reach, stand, spread and specks — and the **field alone** may
be set aside by hand, on the Scene card of the drift's tuning panel, so the other three grounds
can be seen under one yard's own light and wind without minting a yard for each. The choice is
`setSceneChoice(name, scene | null)` in `src/ui/yardSceneRead.ts`, keyed by the yard's name the way
the reading already is, and `useYardScene` answers with the name's reading and the chosen scene in
place of the read one; every surface that reads the hook — the picture, the yard's header and the
panel — follows, and the tile follows because the scene was already part of its key.

**It is a session preference and never durable** (0329, 0145): a Map in the module, nothing
written, gone with the tab, and at rest — an empty Map — every yard stands where its name puts it.
A second tab on the same session draws the name's own field, which is right: a choice made to look
at something is not a fact about the yard. There is no tunable for it because a tunable is a
number (`src/lib/moireTuning.ts`) and a field is a name; the reset button under the dials does not
reach it, the dropdown's own "as named" entry does.

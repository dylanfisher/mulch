# 0122. A registry answers for itself at load

- **Date:** 2026-08-22
- **Status:** accepted

A rule about what the registries may hold together is asked once, at module load, in the one file
that can see both halves — not written down as a note in each file that has to obey it.

Two rules were kept only as prose. Every automatable parameter must carry a distinct label, because
the automation marker names a lane by its label alone: five plugin files each wrote that down for
the next author, and nothing made the sixth read any of the five. And a plugin hands out an
`AudioParam` for exactly the parameters it declared `automation` on: the contract said so, the rack
said so, one plugin re-derived the list by hand, and one plugin quietly broke it. A rule that spans
files cannot be held by a comment in one of them, and a rule honoured by hand in one implementation
is a rule the next implementation will not honour.

So the constraint on what comes next: a new parameter or a new plugin that breaks either rule fails
when the registry loads, with the offending label or parameter named. Loudly and early beats a lane
that schedules onto whatever the binding happened to hold (principle 5). The check belongs where
the declarations meet — `src/audio/params.ts` for the labels, `instanceFromBindings` for the
targets — and never at a call site, which can only see its own half.

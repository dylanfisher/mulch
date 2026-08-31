# 0222 — An effect hears what passes through it and nothing else

An effect is a link in a yard's series chain. It may not read the deck's buffer, may not be told
where the loop is, and may not be handed a read position: the transport is the one author of where
a yard is playing, and a second reader of the source inside the rack would be a second author of it.

So an entry whose whole subject is the past — `scatter`, which plays the last few seconds back in
windows — keeps that past itself, as a circular capture inside its own worklet. "How far back" is
how far back in what this node has heard, and it means the same thing whatever the yard is doing:
seeking, looping, jumping or standing still.

What this rules out is the shape it would otherwise have taken — a plugin handed the deck's
`AudioBuffer` and its current frame, so that a window could be taken from a bar ago in the source
rather than a bar ago in what was played. That is a second transport wearing a knob, and the first
thing it would disagree with is the loop.

The cost is a buffer per instance, and the trade is that the effect works on anything that reaches
it, including another effect's output and a source that never had a buffer at all.

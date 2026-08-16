# 0060 — The ring is the whole exported log

`File → Export Event Log` writes what `EventBus`'s bounded ring holds, as JSONL — one whole
event per line, oldest first, stamps included. There is no durable full-session log: that costs
a store, a cap and a retention rule, and nothing has asked for one.

What fell off the ring is the first line's `seq`, not a line describing a gap. Every line in a
JSONL file is one record, and a break row would be a line that is not an event — the feed draws
that break because a reader is looking at it, a tool reading the file sorts on `seq` instead.

An exported log is not session state and takes no command: it is a read of the ring, the way the
debug console's feed is.

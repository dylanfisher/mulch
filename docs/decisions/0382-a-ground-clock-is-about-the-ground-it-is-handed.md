# 0382 — A ground clock is about the ground it is handed

A voice standing on the session's shared ground is handed two things: the ground, and a clock that
says how many times it has moved and — for the one yard leading it — how to report a boundary
(0313). The host built the second off the ground it was holding itself, and that is right for every
caller but one: while a session is being restored, the prepared voices stand on the ground coming
back and the host still holds the one going out. A restore onto a led ground therefore built every
clock against the outgoing ground, so `crossed` was null on the yard the restored ground names, no
boundary was ever reported, and the shared ground stood still until any gesture touched it — which
is exactly "I have to toggle a change before it starts going to other locations".

So `groundClock` takes the ground it is about, and `prepareRestore` hands it `session.ground` — the
same ground it hands the voice on the same line. One ground per clock, rather than a clock that
reads one ground for its count and another for who leads. Demanded and not defaulted to the host's
own: there are three places a voice is stood on a ground, one of them was already wrong, and a
default is the half nobody chose.

Not a re-arm after the swap, and not a `session.ground` command replayed at the end of a restore: a
graph that has to be corrected once it is live is a graph that was built wrong, and the correction
would be a second author of which yard leads (principle 1).

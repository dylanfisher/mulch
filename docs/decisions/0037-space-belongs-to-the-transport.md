# 0037. Space belongs to the transport, and a deck has one transport control

- **Date:** 2026-08-15
- **Status:** accepted

An unmodified Space press on the instrument route is claimed by the transport wherever focus is (except an editable field, or with Alt/Ctrl/Meta held), and a deck's `play`/`stop` pair collapses into one button that sends `deck.play.toggle` — the same command Space sends — while `deck.play`/`deck.stop` remain in the command union for scripts and restores.

# 0179 — An amount opens where it lives, and the box is full width

- **Date:** 2026-08-26
- **Status:** accepted; amends [0121](0121-a-framed-plus-is-a-door.md) and retires one clause of
  [0173](0173-the-card-is-boxes-and-a-refused-dial-is-drawn.md). No durable shape
  moves: this is layout and view state only.

A **door** on the mulcher card was a popover. It is now a fold: the marker at the dial's corner is
a `Toggle`, and an opened door's amounts are drawn as **ordinary siblings of the dial they belong
to**, in the same `PlayerGroup` box, in the same flex flow. Nothing is portalled, no context is
introduced, and the seven door files still declare only which amounts they hold.

**0121 is amended, not deleted.** A door is still a marker at a dial's corner, still drawn always
rather than under a held modifier, still in one ink — whether it stands open is the toggle's own
fill and not a colour the marker changes to, because a door does not report the state of what is
behind it. What changes is the picture and the mechanism. The framed plus said only "more of it
behind a press"; it said nothing about how much, and 0173 already recorded what that cost — a
report that the walk's wander was missing when it had been behind the Distance marker since 0162.
The marker now says **how many amounts are behind it**, counted from the children the door renders
rather than from a number each door writes down (principle 1).

**A shut door renders nothing.** Not hidden with CSS: a drawn caption spends the two line boxes the
rack measures a row by ([0093](0093-a-knob-caption-reserves-two-line-boxes.md)), so a hidden dial
would cost the height the door exists to save.

**The bracketing is per-dial, because a Fragment paints nothing.** To be siblings of the box's
flex, `PlayerMore` returns a Fragment, and `display: contents` carries neither a ring nor a tint. So
the run marks itself per element — the dial, then one wrapper per amount — with a `data-door`
attribute and a wash, rounded at the ends of the run. Never a nested bordered box: a box inside a
card is not a second card (0173).

**0173's "a box of more than two stands two deep" is retired, and that is what this step spends.**
That rule read `Children.count`, and once a door's amounts are siblings of the dial they belong to,
the count of children is no longer the count of dials — the rule has no derivable input left. Its
argument was that fourteen controls at one distance are read by counting; **full-width boxes with
named sections answer it better than two-deep columns do**, and full width is where the vertical
room this step buys goes.

**Which door stands open is view state held in `Deck.tsx`** — beside `playerFold`, `songFold`,
`songSelect` and `songOpen`, and for their reason: a fold must not throw it away, and a view
preference must not become durable (plan §2).

**One door at a time, named by `doorKey(scope, title)`.** One at a time because a caption is a
dial's whole accessible name and the words behind two different doors are allowed to repeat — a
chance is called Chance wherever it is — on the stated ground that only one is open
([0135](0135-the-repeats-dial-gets-its-own-door.md), `src/lib/copyKnobs.ts`,
`src/ui/tooltips.test.ts`); two open at once would put two sliders called Chance on one card. The
`scope` is what tells the card's own Rate door from an open part's — the empty string for the card,
a part's `SongPartId` for a part's fold. An **identity and never a position**: the name on a part's
row is its slot, because a locator has to be able to ask for "Part 2", and a door keyed by the slot
would slam shut on the part it was opened on and spring open on the one dragged into its place.

It is **dropped when the switch goes off**, and **read as none whenever the module holds no spec**.
Both, because a pattern also goes away by undo, by a redo landing on nothing and by a restore, none
of which is a press on this card — and a door left open across one of those would draw greyed
amounts for a pattern that is gone.

**Escape closes it; click-outside does not.** Escape is the one thing a popover gave for free that
is worth keeping, and it is bound **on the card**, not on the document: a door standing in the
card's own flow may not answer a press aimed at a layer opened over it, which is what the drift's
overlay binds the document for ([0109](0109-the-drift-is-one-picture-at-two-sizes.md)). So the press
has to have happened inside the card, where the hand that opened a door is, and a press something
inside the card has already answered is not also this one's. Click-outside is deliberately absent:
these are inline controls in the flow, and a press elsewhere on the card is a press on a control.

**One door stays a popover: the arrangement's.** It is the only one holding a control that is not a
dial — six cast presses under an eyebrow of their own
([0174](0174-an-arrangement-draws-from-a-cast-and-the-dial-is-not-a-hand.md)) — and laid inline that
is a block of a different height and a different grammar beside dial columns. **It is kept for what
is behind it, not for how much.** Any door that grows a non-dial control faces the same question.

**The retired picture is deleted, not left in the vocabulary.** `ACTION_ICONS.more` and
`ACTION_TOOLTIPS.more` had exactly one consumer — the door — so they go with it; git remembers
(principle 6).

What this constrains: a new door declares nothing but its amounts and its title, and two doors with
the same title in one scope would be one door — the title is half the name. A door added to the
module is also a case added to `src/ui/tooltips.test.ts`, which is what keeps the repeated words
honest.

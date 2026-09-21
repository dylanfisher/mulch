- Ableton push support?

---

- more ways to use the tone up/down feature in the mulcher (octaves could be set like a sequencer or piano)

- keyboard shortcuts

- instead of visualizer being one big field related to how the sound is currently playing, it could be a continuously
  drawing recording of how the sound is playing, so as it plays it draws in a recording of it.

- lull effect should impact the visualizer in such a way that it looks like a gap is drawn in, use empty
  and negative space in an interesting way.

- visualizer effects should always tween between items. right now sometimes the jumps between changes (dry/wet,
  adding or removing an effect) is jumpy. it should be smoother when possible.

- push spark effect more so its like playing an organ of sparks. sparks could harmonize at different octaves.

- refactor the way "the ground" works: TODO
  - simpler, e.g. loop this many times before moving, etc.
  - set safe boundary areas where it can jump between
  - add ability to say something like "jump around in short nudges for some period of jumps, then jump to a completely
    different area and jump around in nudges"
- change how spark is visualizer (e.g. it should look like a spark, light up a section, dissolve). it can constantly
  be moving around visualizer like little bits of light. when multiple sparks his the spark quality (color, shape,
  area sparked, etc. should be based on that sparked area of the soundwave). currently sparks just look like a couple
  pixels that slowly move around - it's not exciting at all. spark should invoke the idea of bright randomness,
  excitement, etc.

- ability to live record session?

- add a feature to pitch effect that allows setting intervals like a simple keyboard recording
  so we can automate little melodies

- try seeing what it looks like if the visualizer is the background of the entire card.

- panner slice rate knob should change to adjust band and time. refactor how this effect works. i imagine it
  more like pop effect width, how it expands the soundstage.

- some sort of effect, or post-effect chain that takes the sound input and "flattens" it, and allows cutting
  up the processed sound.

- stacked visualizer view for many decks?

- add a way to create a visualized artifact for the song, as part of the export audio workflow. kind of like
  a generative album cover, gif, mp4, etc.

---

- add spark count to mulcher so that a jump can trigger multiple sparks
- copy YARD_PLACES and YARD_AIRS should have the modifier word generated, too. e.g. by, beneath, along, at, in, etc.
  for more variability.
- eq should be named eq/filter in the user facing areas. eq shape should be a dropdown, not knob. default is low pass.
- add an additional automator draw lane behavior that is in between smooth and pulse, e.g. a smooth curve, but
  with more variety.
- add tap to set time on delay. add an option to match on beat (by the 16th, or similar, matching a similar
  timeframe as is currently available)

---

- the visualizer should use the name of the yard as inspiration for how it looks. see these screenshots for
  how the visualizer should change. we want it to become more painterly, have different moods, and look more
  like it was inspired by closeup natural landscapes like fields of color, blades of grass, fields of flowers,
  wind, etc. this should be gestural, abstract, and interprated into a digital context. we don't want literal.
  all visualizer parameters should continue to affect whatever scene is playing. the scenes should be modular
  and easy to add new scenes to, change scenes/params, etc.

# 0064 — A parameter declares the precision it reads at

`ParamSpec.precision` is required, not optional. A knob's readout is written from a ref once a
frame while a lane plays (0035), so the string is compared against the last one and skipped when
it has not changed. Formatting with `String` makes that comparison useless: `denormalize` on a log
curve returns a full-width float, so a cutoff paints seventeen digits that never repeat and the
readout flickers at frame rate rather than reading a number.

The precision belongs to the parameter, beside its range and its curve, because a cutoff reading
whole Hz and a pan reading two places is a fact about each parameter and not about the control
drawing it. Required rather than defaulted, so a new plugin parameter cannot be added without
answering it and no fallback silently masks the omission (principle 5).

`ParameterKnob` is the one place that turns a registry value into text, with `toFixed` — rounding
first and re-signing, because a range that crosses zero reaches values `toFixed` alone would read
as `-0.0`. A motion value library would be a dependency bought for that call.

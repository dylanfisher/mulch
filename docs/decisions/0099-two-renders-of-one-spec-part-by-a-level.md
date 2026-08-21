# 0099. Two renders of one spec part by a level, not by a count of grid steps

- **Date:** 2026-08-21
- **Status:** accepted; replaces the byte-level half of [0077](0077-an-export-plays-the-whole-session.md)

The export smoke compared the exported file with the harness's own render of the same spec at one
step of the 16-bit grid. That bound passed on the author's ARM Mac and failed on a Linux x86
runner, which stood 43 steps — -57.6dBFS — off it while every fingerprint field still agreed: same
peak, same DC, the same five RMS windows, the same clicks and silences. An LSB count is a
measurement of the machine's float summing order, and the machine is not this repo's to fix.

So the bound is now the two levels the difference between the pair may reach — its loudest sample
and its energy — and not a number of steps. Both hold or the claim fails, because they catch
different wrongs: the peak is the ceiling on any one sample, and the RMS is what discriminates,
because a render of a different graph parts by energy everywhere rather than at one sample.

The floors are **-48dBFS peak and -80dBFS RMS**, taken from measuring what a wrong render costs on
the very session the smoke has built by the time it exports. An export that plays its loudest yard
a hundredth loud parts by -48.5dBFS peak and -52.3dBFS RMS; a master gain moved by a thousandth by
-66.8 and -71.8; a bypassed limiter by -21.4 and -26.5; the soft clip's oversampling turned off by
-1.1 and -8.1. Every one of those is refused, most of them by twenty decibels of energy.

What is bought with the CI runner's own divergence is real and is written here rather than
discovered later: no peak bound can both admit that runner's 43 steps and refuse a _quiet_ yard
played a hundredth loud, which parts by -62.4dBFS at one sample — measured, and no longer caught.
It is caught neither by the peak floor nor by the RMS one, which reads -87.6dBFS for it. The
energy floor is therefore the half to tighten if the runner is ever understood.

Which is also the assumption to state, because the energy floor is the binding one and the runner
never reported an energy — only a peak. -80dBFS is 3.3 steps of the grid, so a difference whose
loudest sample is that runner's 43 steps passes only while it is sparse: under a two-hundredth of
the file's samples carrying it. That is what a divergence localised at a transient looks like, and
what the runner's own fingerprint agreeing to the decimal in every window says it is. A broadband
one — 43 steps as the tail of noise over 48000 samples — measures about -71dBFS and would fail
here, loudly and with both numbers in the message. The first CI run that prints them settles it.

The nonlinear tail was ruled out rather than assumed. The limiter is engaging on this session, but
a difference entering it is not amplified: perturbing the master by 1e-9, 1e-8 and 1e-7, and
nudging the limiter's own threshold by 1e-12dB, 1e-9dB and 1e-6dB, all leave the pair inside one
step, and the response stays linear in the perturbation out to 1e-2. Fifteen runs of the scenario
on ARM part by exactly zero, peak and energy, as do fifteen under an x86-64 Chromium — so 0077's
"a couple of samples in fifty thousand" no longer reproduces anywhere it can be measured here, and
the CI-side proof of these floors is untested by their author.

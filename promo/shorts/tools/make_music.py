"""Synthesises the music bed for each short (numpy only, deterministic).

Run: python promo/shorts/tools/make_music.py
Writes promo/shorts/<short>/assets/music.wav; the README converts it to mp3 with ffmpeg.
Bars are 2 s at 120 bpm, so scene changes in the compositions sit on multiples of 0.5 s.
"""
import os
import wave

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
HERE = os.path.dirname(os.path.abspath(__file__))


def note(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR
    e = np.minimum(1, t / a) * np.exp(-t / r)
    return e


def pluck(f, dur, r=0.18, bright=3):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.6 for k in range(1, bright + 1))
    return s * env(n, 0.003, r)


def pad(fs, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    s = sum(np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.003 * t) for f in fs)
    a = np.minimum(1, t / 0.25) * np.minimum(1, (dur - t) / 0.3)
    return s * a / len(fs)


def kick(dur=0.3):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 120 * np.exp(-t * 30) + 50
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 12) + 0.15 * np.sin(ph * 3) * np.exp(-t * 25)


def hat(rng, dur=0.05):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    x = np.diff(np.concatenate([[0], x]))  # crude high-pass
    return x * np.exp(-np.arange(n) / SR * 80)


def clap(rng, dur=0.18):
    n = int(dur * SR)
    x = rng.standard_normal(n)
    x = x - np.convolve(x, np.ones(8) / 8, mode="same")
    return x * np.exp(-np.arange(n) / SR * 22)


def add(buf, sig, at, gain):
    i = int(at * SR)
    j = min(len(buf), i + len(sig))
    if i < len(buf):
        buf[i:j] += sig[: j - i] * gain


def make(name, seconds, root, prog, melody, drums_from=0.0, drop_at=None, end_hit=None, seed=1):
    rng = np.random.default_rng(seed)
    n = int(seconds * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    bar = 4 * BEAT
    bars = int(np.ceil(seconds / bar))
    for b in range(bars):
        t0 = b * bar
        chord = prog[b % len(prog)]
        fs = [note(root + 12 + c) for c in chord]
        p = pad(fs, bar)
        add(L, p, t0, 0.10)
        add(R, p, t0, 0.10)
        # bass: root on 1 and the and of 2, with harmonics so it reads on a phone
        for off in (0, 1.5, 2, 3.5):
            add(L, pluck(note(root - 12 + chord[0]), 0.4, 0.15, 5), t0 + off * BEAT, 0.22)
            add(R, pluck(note(root - 12 + chord[0]), 0.4, 0.15, 5), t0 + off * BEAT, 0.22)
        if t0 >= drums_from:
            loud = 1.0 if (drop_at is None or t0 >= drop_at) else 0.55
            for k in range(4):
                add(L, kick(), t0 + k * BEAT, 0.5 * loud)
                add(R, kick(), t0 + k * BEAT, 0.5 * loud)
            for k in (1, 3):
                c = clap(rng)
                add(L, c, t0 + k * BEAT, 0.12 * loud)
                add(R, c, t0 + k * BEAT + 0.004, 0.12 * loud)
            for k in range(8):
                h = hat(rng)
                add(L if k % 2 else R, h, t0 + k * BEAT / 2 + BEAT / 2 * 0.5 * 0, 0.05 * loud)
        # melody: eighth-note steps, None = rest
        for k, m in enumerate(melody[b % len(melody)]):
            if m is None:
                continue
            s = pluck(note(root + 24 + m), 0.5, 0.22, 4)
            at = t0 + k * BEAT / 2
            add(L, s, at, 0.16)
            add(R, s, at + 0.012, 0.13)
    if end_hit is not None:
        fs = [note(root + 12 + c) for c in prog[0]] + [note(root + 24)]
        hit = pad(fs, seconds - end_hit)
        add(L, hit, end_hit, 0.16)
        add(R, hit, end_hit, 0.16)
        add(L, kick(0.6), end_hit, 0.6)
        add(R, kick(0.6), end_hit, 0.6)
    # fade the last 0.8 s
    f = int(0.8 * SR)
    fade = np.linspace(1, 0, f)
    L[-f:] *= fade
    R[-f:] *= fade
    st = np.stack([L, R], 1)
    st = st / np.max(np.abs(st)) * 0.85  # about -1.4 dBFS peak
    out = os.path.join(HERE, "..", name, "assets", "music.wav")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with wave.open(out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((st * 32767).astype("<i2").tobytes())
    print("wrote", out)


_ = None
# chat: soft, waiting; drums enter when the reply buttons appear
make(
    "chat", 18.0, 57,  # A minor
    prog=[[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-2, 2, 5]],
    melody=[[7, _, 3, _, 5, _, _, _], [3, _, 0, _, 2, _, _, _], [0, _, 3, _, 7, _, 5, _], [5, _, _, _, 2, _, _, _]],
    drums_from=4.0, drop_at=8.0, end_hit=15.0, seed=3,
)
# feed: bouncy, quick verdicts on the beat
make(
    "feed", 20.0, 60,  # C major
    prog=[[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]],
    melody=[[12, _, 7, 9, 12, _, 7, _], [9, _, 4, 7, 9, _, _, _], [5, 7, 9, _, 7, _, 4, _], [2, _, 7, _, 11, _, _, _]],
    drums_from=0.0, drop_at=2.0, end_hit=17.5, seed=5,
)
# pov: builds from a quiet mirror to a full bar at the before/after
make(
    "pov", 20.0, 62,  # D major
    prog=[[0, 4, 7], [-5, -1, 2], [-3, 0, 4], [-7, -3, 0]],
    melody=[[_, _, 7, _, _, _, 4, _], [_, _, 2, _, 7, _, _, _], [4, _, 7, _, 9, _, 7, _], [12, _, 11, _, 7, _, _, _]],
    drums_from=4.5, drop_at=11.5, end_hit=17.5, seed=7,
)

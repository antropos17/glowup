"""Turn earshot takes (wav) into the game's sound files (mono mp3).

Run with the Python of the earshot venv, with ffmpeg and ffprobe on PATH:

    <earshot>/.venv/Scripts/python assets/sounds/finish.py <folder with the takes>

For every sound: mix to mono, cut to its longest allowed length with a fade out, bring it to one loudness
(momentary-max LUFS as earshot measures it) without letting the peak pass the ceiling, encode, then decode the
mp3 again and print what the player really gets. The takes and their earshot commands are in README.md.
"""
import os
import subprocess
import sys
import tempfile

import numpy as np
import soundfile as sf
from earshot.gallery import lufs_max

TARGET_LUFS = -18.0     # the level every sound is brought to, when its peak allows it
CEILING_DB = -3.6       # peak of the wav handed to the encoder; mp3 adds a few tenths, the result stays under -3
FADE_S = 0.08
SR = 44100
BITRATE = '64k'

# name: (take file, longest length in seconds)
SOUNDS = {
    'tap': ('tap.wav', 0.25),
    'open': ('open.wav', 0.6),
    'up': ('up.wav', 0.9),
    'down': ('down.wav', 0.9),
    'coins': ('coins.wav', 0.7),
    'message': ('message.wav', 0.6),
    'dayend': ('dayend.wav', 1.45),
    'away': ('away.wav', 0.9),
    # temporary: candidates for the card-open sound, until the author picks one
    'open-1': ('open-1.wav', 0.45),
    'open-2': ('open-2.wav', 0.45),
    'open-3': ('open-3.wav', 0.45),
    'open-4': ('open-4.wav', 0.45),
}


def db(x):
    return 20 * np.log10(np.abs(x).max() + 1e-12)


def finish(path, longest):
    y, sr = sf.read(path, dtype='float64', always_2d=True)
    y = y.mean(axis=1)
    y = y[:int(longest * sr)]
    # drop the silent end (under -60 dB of the peak), then fade out
    loud = np.nonzero(np.abs(y) > np.abs(y).max() * 1e-3)[0]
    y = y[:loud[-1] + 1]
    n = min(len(y), int(FADE_S * sr))
    y[-n:] *= np.cos(np.linspace(0, np.pi / 2, n)) ** 2
    gain = min(TARGET_LUFS - lufs_max(y, sr), CEILING_DB - db(y))
    return y * 10 ** (gain / 20), sr


def main(takes):
    out_dir = os.path.dirname(os.path.abspath(__file__))
    total = 0
    print(f'{"sound":8} {"length":>7} {"peak":>7} {"LUFS":>6} {"bytes":>6}')
    for name, (take, longest) in SOUNDS.items():
        y, sr = finish(os.path.join(takes, take), longest)
        out = os.path.join(out_dir, name + '.mp3')
        with tempfile.TemporaryDirectory() as tmp:
            wav, back = os.path.join(tmp, 'in.wav'), os.path.join(tmp, 'back.wav')
            sf.write(wav, y, sr, subtype='PCM_24')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame',
                            '-b:a', BITRATE, '-map_metadata', '-1', '-id3v2_version', '0', '-write_xing', '1', out],
                           check=True)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', out, back], check=True)
            z, zsr = sf.read(back, dtype='float64', always_2d=True)
        size = os.path.getsize(out)
        total += size
        print(f'{name:8} {len(z) / zsr:6.2f}s {db(z):6.1f}dB {lufs_max(z, zsr):6.1f} {size:6d}')
    print(f'total {total} bytes, {total * 4 // 3} as base64')


if __name__ == '__main__':
    main(sys.argv[1])

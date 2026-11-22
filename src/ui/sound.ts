// Game sounds. UI only: the engine knows nothing about them.
// Every failure is swallowed: the game must work with no audio at all.
import tapUrl from '../../assets/sounds/tap.mp3';
import openUrl from '../../assets/sounds/open.mp3';
import upUrl from '../../assets/sounds/up.mp3';
import downUrl from '../../assets/sounds/down.mp3';
import coinsUrl from '../../assets/sounds/coins.mp3';
import messageUrl from '../../assets/sounds/message.mp3';
import dayendUrl from '../../assets/sounds/dayend.mp3';
import awayUrl from '../../assets/sounds/away.mp3';

/** Sound name → file URL (a data URI in the single-file build). */
export const SOUNDS = {
  tap: tapUrl, open: openUrl, up: upUrl, down: downUrl,
  coins: coinsUrl, message: messageUrl, dayend: dayendUrl, away: awayUrl,
} as const;
export type SoundName = keyof typeof SOUNDS;

const MUTE_KEY = 'glowup.muted';
const GESTURES = ['pointerup', 'touchend', 'click', 'keydown'] as const;

let ctx: AudioContext | null = null;
const files = new Map<SoundName, Promise<ArrayBuffer>>();
const decoded = new Map<SoundName, Promise<AudioBuffer>>();
let muted = readMuted();
let lastAt = -Infinity;
let asks = 0;

function readMuted() {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
}

export const isMuted = () => muted;

export function setMuted(on: boolean) {
  muted = on;
  try { localStorage.setItem(MUTE_KEY, on ? '1' : '0'); } catch { /* storage unavailable: this visit only */ }
}

/** Reads the files ahead of time; decoding waits for the first gesture, when an audio context is allowed. */
function preload() {
  for (const name of Object.keys(SOUNDS) as SoundName[]) {
    const file = fetch(SOUNDS[name]).then((r) => r.arrayBuffer());
    file.catch(() => { /* no file, no sound */ });
    files.set(name, file);
  }
}

/** Runs on every user gesture: creates the context on the first one, wakes it if the system suspended it. */
function unlock() {
  try {
    if (!ctx) {
      const made = new AudioContext();
      ctx = made;
      for (const [name, file] of files) {
        const buf = file.then((bytes) => made.decodeAudioData(bytes));
        buf.catch(() => { /* stays silent */ });
        decoded.set(name, buf);
      }
    }
    if (ctx.state !== 'running') void ctx.resume().catch(() => { /* stays silent */ });
  } catch { /* no Web Audio: the game stays silent */ }
}

/** Plays a sound. Silent before the first gesture, when muted and while the tab is hidden. */
export function play(name: SoundName) {
  // a muted or blocked sound still counts as this gesture's sound, so tap() does not stand in for it
  lastAt = performance.now();
  asks += 1;
  const out = ctx;
  if (muted || !out || document.hidden) return;
  const asked = lastAt;
  decoded.get(name)?.then((buf) => {
    // the very first gesture is still decoding: play if that took a moment, drop the sound if it took long
    if (performance.now() - asked > 300) return;
    const src = out.createBufferSource();
    src.buffer = buf;
    src.connect(out.destination);
    src.start();
  }).catch(() => { /* stays silent */ });
}

/** How many sounds have been asked for so far: a mark to compare against later. */
export const played = () => asks;

/** The plain tap, unless something more specific has been asked for since the mark taken when the gesture began. */
export function tap(mark: number) {
  if (asks === mark) play('tap');
}

if (typeof document !== 'undefined') {
  try {
    preload();
    for (const type of GESTURES) document.addEventListener(type, unlock, { capture: true, passive: true });
  } catch { /* stays silent */ }
}

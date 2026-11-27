/**
 * Screens and pictures of the 1-day funnel (`?demo=1` only, see src/funnel.ts): the intro before the hero pick,
 * the animated Day 1 beats inside outcome sheets and the cliffhanger before the demo end screen.
 * Everything is drawn in code (art from src/art, CSS in funnel.css); motion is off under reduced motion.
 */
import { useEffect, useMemo, useState } from 'preact/hooks';
import { content } from '../content';
import type { Clock } from '../engine/clock';
import { crush, fill, newGame, startLook } from '../engine/game';
import type { GameState } from '../engine/types';
import { INTRO_KEY, type Beat } from '../funnel';
import { Face, Icon, Portrait } from './bits';
import { FUNNEL, PART_ICON } from './ru';

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function introSeen() {
  try { return localStorage.getItem(INTRO_KEY) === '1'; } catch { return false; }
}

/** Four short screens before the hero pick. Skippable; once done or skipped it is not shown again. */
export function Intro({ clock, onDone }: { clock: Clock; onDone: () => void }) {
  const [i, setI] = useState(0);
  // the first hero and the crush of the game, as they look at the start of play
  const { look, her } = useMemo(() => {
    const s = newGame(content, { seed: 0, now: clock.now(), tzOffsetMin: clock.tzOffsetMin(), archetypeId: content.archetypes[0].id });
    return { look: startLook(content, s), her: crush(content, s) };
  }, []);
  const tags = content.problems.filter((p) => content.archetypes[0].problems[p.id] !== undefined).slice(0, 4);
  const last = i === FUNNEL.intro.length - 1;
  const done = () => { try { localStorage.setItem(INTRO_KEY, '1'); } catch { /* storage off: the intro may show again */ } onDone(); };
  const art = [
    <div class="in-brand">
      <span class="in-face"><Portrait look={look} /></span>
      <span class="in-leaf"><small>челлендж</small><b>30</b><small>{FUNNEL.stampDays}</small></span>
    </div>,
    <div class="in-problems">
      <span class="in-face"><Portrait look={look} /></span>
      <span class="in-tags">{tags.map((p, n) => <span style={{ '--n': n }}>{p.title}</span>)}</span>
    </div>,
    <div class="in-chance">
      <span class="in-face"><Portrait look={her.look} /></span>
      <span class="in-meter"><Icon name="heart" size={20} /><span class="meter"><i /></span></span>
    </div>,
    <div class="in-howto">
      <span class="in-card"><i /><i /><i /></span>
      <span class="in-plus"><Icon name="plus" size={26} stroke={2.8} /></span>
      <span class="in-parts">{(['morning', 'day', 'evening', 'night'] as const).map((p, n) => <span style={{ '--n': n }} data-part={p}><Icon name={PART_ICON[p]} size={17} /></span>)}</span>
    </div>,
  ];
  return (
    <div class="game intro">
      <div class="intro-top">
        <span class="intro-dots" aria-hidden="true">{FUNNEL.intro.map((_, n) => <i data-on={n === i ? '' : undefined} />)}</span>
        {!last && <button class="intro-skip" onClick={done}>{FUNNEL.skip}</button>}
      </div>
      <div class="intro-body" key={i}>
        <div class="intro-art" aria-hidden="true">{art[i]}</div>
        {i === 0 ? <h1>{FUNNEL.intro[i].head}</h1> : <h2>{FUNNEL.intro[i].head}</h2>}
        <p>{FUNNEL.intro[i].text}</p>
      </div>
      <button class="primary" onClick={last ? done : () => setI(i + 1)}>{last ? FUNNEL.introGo : FUNNEL.next}</button>
    </div>
  );
}

/** Counts from 0 up to `to` in about 0.9 s; shows `to` at once under reduced motion. */
function useCount(to: number) {
  const [n, setN] = useState(() => (reduced() ? to : 0));
  useEffect(() => {
    if (reduced()) return setN(to);
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => { const k = Math.min(1, (t - t0) / 900); setN(Math.round(to * (1 - (1 - k) ** 3))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return n;
}

/** The picture at the top of an outcome sheet for one of the strong Day 1 moments. */
export function BeatArt({ beat, state, pct }: { beat: Beat; state: GameState; pct: number }) {
  if (beat === 'invite') {
    return (
      <div class="beat" data-beat="invite" aria-hidden="true">
        <span class="b-leaf"><small>до встречи</small><b>30</b><small>{FUNNEL.stampDays}</small></span>
        {[0, 1, 2, 3, 4, 5].map((n) => <i class="b-spark" style={{ '--n': n }} />)}
      </div>
    );
  }
  if (beat === 'mirror') {
    return (
      <div class="beat" data-beat="mirror" aria-hidden="true">
        <span class="b-polaroid"><span class="b-photo"><Portrait look={startLook(content, state)} /></span><b>{FUNNEL.stampBefore}</b></span>
        <i class="b-flash" />
      </div>
    );
  }
  if (beat === 'message') {
    const mine = state.chat.filter((m) => m.from === 'hero').at(-1)?.text ?? '';
    return (
      <div class="beat" data-beat="message" aria-hidden="true">
        <span class="b-bubble"><span class="b-text">{mine}</span><span class="b-ticks"><Icon name="check" size={14} stroke={2.6} /><Icon name="check" size={14} stroke={2.6} /></span></span>
        <small class="b-status">{FUNNEL.delivered}</small>
      </div>
    );
  }
  if (beat === 'like') {
    return (
      <div class="beat" data-beat="like" aria-hidden="true">
        <i class="b-ring" /><i class="b-ring" style={{ '--n': 1 }} />
        <span class="b-heart"><Icon name="heart" size={40} /></span>
      </div>
    );
  }
  return <ChanceBeat pct={pct} />;
}

function ChanceBeat({ pct }: { pct: number }) {
  const n = useCount(pct);
  return (
    <div class="beat" data-beat="chance" aria-hidden="true">
      <span class="b-heart"><Icon name="heart" size={30} /></span>
      <span class="b-chance"><b class="num">{n}%</b><span class="meter"><i style={{ width: `${n}%` }} /></span></span>
    </div>
  );
}

/**
 * Before the demo end: where the crush stands after Day 1 (the text of the night card the player got)
 * and what lies ahead (titles and teasers of Days 2–7 from content/days.json). Only facts the game keeps:
 * on Day 5 the crush writes first on every path (K5-08a…d).
 */
export function Cliffhanger({ state, onNext }: { state: GameState; onNext: () => void }) {
  const her = crush(content, state);
  const f = state.flags;
  const wrote = !!(f.d1_wrote_plain || f.d1_wrote_flirty);
  const night = content.cards.find((c) => c.id === (wrote ? 'K1-08' : f.d1_liked_only ? 'K1-08c' : 'K1-08b'));
  const status = night?.text ? fill(content, state, night.text) : '';
  const mine = wrote ? state.chat.filter((m) => m.from === 'hero' && m.day === 1).at(-1)?.text : undefined;
  const ahead = content.days.filter((d) => d.day >= 2 && d.day <= content.balance.contentDays && d.day <= 7);
  return (
    <div class="game cliff">
      <div class="screen cliff-screen">
        <div class="cliff-phone" aria-label={status}>
          <div class="cliff-phone-head"><Face look={her.look} /><b>{her.name}</b></div>
          <div class="cliff-phone-body">
            {mine && <div class="bubble" data-from="hero">{mine}</div>}
            {f.d1_liked_only && <div class="cliff-phone-like"><Icon name="heart" size={22} /></div>}
            <div class="cliff-phone-status">{status}</div>
          </div>
        </div>
        <p class="cliff-hook">{FUNNEL.cliffHook}</p>
        <h3>{FUNNEL.aheadHead}</h3>
        <div class="ahead">
          {ahead.map((d, n) => {
            const teaser = content.days.find((x) => x.day === d.day - 1)?.teaser;
            return (
              <div class="ahead-row" style={{ '--n': n }}>
                <span class="ahead-day">{FUNNEL.aheadDay(d.day)}</span>
                <span class="ahead-main">
                  <b>{fill(content, state, d.title)}</b>
                  {/* the next day's teaser is already on the day card; later ones stay blurred */}
                  {teaser && <small data-blur={d.day > 2 ? '' : undefined} aria-hidden={d.day > 2 ? 'true' : undefined}>{fill(content, state, teaser)}</small>}
                </span>
                {d.day > 2 && <Icon name="lock" size={16} />}
              </div>
            );
          })}
          <div class="ahead-row" style={{ '--n': ahead.length }} data-last="">
            <span class="ahead-day">{FUNNEL.aheadLast}</span>
            <span class="ahead-main"><b>{FUNNEL.aheadLastText}</b></span>
            <Icon name="lock" size={16} />
          </div>
        </div>
      </div>
      <div class="end-foot">
        <button class="primary" onClick={onNext}>{FUNNEL.cliffGo}</button>
      </div>
    </div>
  );
}

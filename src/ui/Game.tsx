import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { content } from '../content';
import { msToNextPart, type Clock } from '../engine/clock';
import {
  actionsFor, buy, chance, choicesFor, choose, courseActive, crush, currentLook, dayEnergy, drawEvent, drawStory,
  fill, hasEvents, hero, markMissedSeen, markSummarySeen, newGame, oddsFor, progress, soldOut, startLook, syncClock, useItem,
} from '../engine/game';
import type { SaveStore } from '../engine/save';
import { DAY_PARTS, type Card, type Choice, type DaySummary, type GameState, type LogEntry } from '../engine/types';
import type { Look } from '../art/avatar';
import { Body, Cost, Icon, Portrait } from './bits';
import { timelapsePng } from './shareTimelapse';
import { DAY_CARD, DEMO_END, duration, MISSED, PART_ICON, PART_NAME, PART_NEXT, SOUND } from './ru';
import { isMuted, play, played, setMuted, tap } from './sound';

type Tab = 'journal' | 'mirror' | 'chat' | 'feed' | 'shop';
type Sheet =
  | { kind: 'card'; card: Card }
  | { kind: 'menu' }
  | { kind: 'result'; title: string; text: string; delta: number; why?: string }
  | { kind: 'rest' }
  | null;

export interface GameApi {
  restart(archetypeId: string): void;
  refresh(): void;
}

const signed = (n: number) => (n > 0 ? `+${n}` : `−${Math.abs(n)}`);

// TODO: replace with the real referral link once there is a backend.
const REFERRAL_URL = 'https://example.com/30days-demo';
const NOTIFY_KEY = 'glowup.notifyFull';

export function Game({ clock, store, api }: { clock: Clock; store: SaveStore; api?: (a: GameApi) => void }) {
  const fresh = (archetypeId = content.archetypes[0].id) =>
    newGame(content, { seed: (clock.now() % 2_147_483_647) | 0, now: clock.now(), tzOffsetMin: clock.tzOffsetMin(), archetypeId });
  const [state, setState] = useState<GameState>(() => syncClock(content, store.load() ?? fresh(), clock.now()));
  const [tab, setTab] = useState<Tab>('journal');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [chatSeen, setChatSeen] = useState(state.chat.length);
  const [endClosed, setEndClosed] = useState(false);
  const [muted, setMutedShown] = useState(isMuted);
  const [, tick] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  const commit = (s: GameState) => { store.save(s); setState(s); };
  const refresh = () => { setState((s) => { const n = syncClock(content, s, clock.now()); if (n !== s) store.save(n); return n; }); tick((n) => n + 1); };
  const restart = (id?: string) => { store.clear(); commit(fresh(id)); setSheet(null); setTab('journal'); setChatSeen(0); setEndClosed(false); };

  useEffect(() => {
    api?.({ restart, refresh });
    const t = setInterval(refresh, 20_000);
    document.addEventListener('visibilitychange', refresh);
    // every button of the game taps, unless its own handler has already played something more specific
    // The button is looked up on the way down: by the time the click bubbles back up, the button's own handler
    // has often re-rendered the sheet and the pressed button is no longer in the page.
    let onButton = false, mark = 0;
    const onDown = (e: Event) => { onButton = !!(e.target as Element | null)?.closest?.('.game button'); mark = played(); };
    const onTap = () => { if (onButton) tap(mark); onButton = false; };
    document.addEventListener('click', onDown, true);
    document.addEventListener('click', onTap);
    return () => {
      clearInterval(t); document.removeEventListener('visibilitychange', refresh);
      document.removeEventListener('click', onDown, true); document.removeEventListener('click', onTap);
    };
  }, []);
  useEffect(() => {
    if (!scroller.current) return;
    scroller.current.scrollTop = tab === 'journal' || tab === 'chat' ? scroller.current.scrollHeight : 0;
  }, [state.log.length, state.chat.length, tab]);
  useEffect(() => { if (tab === 'chat') setChatSeen(state.chat.length); }, [tab, state.chat.length]);
  const away = !!state.missed?.length;
  useEffect(() => { if (away) play('away'); }, [away]);

  const me = hero(content, state), her = crush(content, state);
  const look = useMemo(() => currentLook(content, state), [state]);
  const pct = chance(content, state);
  const maxE = dayEnergy(content, state);
  const next = duration(msToNextPart(clock.now(), state.tzOffsetMin));
  const partIdx = DAY_PARTS.indexOf(state.part);
  const problemIds = Object.keys(state.startProblems);
  const chanceShown = !!state.flags.chance_shown || state.day > 1;
  const chanceNote = state.flags.chance_note?.value;
  const dayClosed = state.closedDay === state.day;
  const unseen = state.summaries.find((d) => !d.seen);

  function onPlus() {
    const d = drawStory(content, state);
    if (d.state !== state) commit(d.state);
    play('open');
    if (d.card) return setSheet({ kind: 'card', card: d.card });
    const s = d.state;
    setSheet(actionsFor(content, s).length || hasEvents(content, s) ? { kind: 'menu' } : { kind: 'rest' });
  }
  function onChoose(card: Card, choiceId: string) {
    const r = choose(content, state, card.id, choiceId);
    commit(r.state);
    // one sound per choice, the most telling one: day closed, chance moved, a line from the crush, coins earned or spent
    const fromCrush = (s: GameState) => s.chat.filter((m) => m.from === 'crush').length;
    if (r.state.closedDay === r.state.day && state.closedDay !== state.day) play('dayend');
    else if (r.chanceDelta !== 0 && (r.state.flags.chance_shown || r.state.day > 1)) play(r.chanceDelta > 0 ? 'up' : 'down');
    else if (fromCrush(r.state) > fromCrush(state)) play('message');
    else if (r.state.coins !== state.coins) play('coins');
    setSheet({ kind: 'result', title: fill(content, r.state, card.title), text: r.outcome.text, delta: r.chanceDelta, why: r.state.lastChange?.why });
  }
  function onAction(card: Card) {
    const shown = choicesFor(content, state, card);
    if (shown.length === 1) return onChoose(card, shown[0].choice.id);
    play('open');
    setSheet({ kind: 'card', card });
  }
  function onEvent() {
    const d = drawEvent(content, state);
    if (d.state !== state) commit(d.state);
    if (d.card) { play('open'); setSheet({ kind: 'card', card: d.card }); }
  }

  if (state.verdict) return <Verdict state={state} onRestart={() => restart(state.archetypeId)} />;
  // what the story did on its own comes first: before the day cards and before the demo end screen
  const missed = state.missed?.length ? <Missed state={state} onClose={() => commit(markMissedSeen(state))} /> : null;
  if (state.demoOver && !endClosed && missed) return <div class="game">{missed}</div>;
  const dayCard = unseen ? (
    <div class="scrim">
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="grip" />
        <DayCard state={state} d={unseen} onClose={() => { commit(markSummarySeen(state, unseen.day)); setSheet(null); }} />
      </div>
    </div>
  ) : null;
  // then the day cards the player has not seen: the last day's card comes before the end screen, never after it
  if (state.demoOver && !endClosed && dayCard) return <div class="game">{dayCard}</div>;
  if (state.demoOver && !endClosed) {
    return <DemoEnd state={state} onClose={() => { setSheet(null); setTab('journal'); setEndClosed(true); }} onRestart={() => restart(state.archetypeId)} />;
  }
  // after the demo end screen is closed the game stays open read-only
  const frozen = !!state.demoOver;

  return (
    <div class="game">
      <header class="top">
        <div class="leaf" aria-label={`День ${state.day} из ${content.balance.days}`}>
          <div class="leaf-head">день</div>
          <div class="leaf-num">{state.day}</div>
          <div class="leaf-of">из {content.balance.days}</div>
        </div>
        <div class="parts" data-part={state.part}>
          <div class="parts-now">
            <span class="parts-name">{PART_NAME[state.part]}</span>
            {!frozen && <span class="parts-next">{PART_NEXT[state.part]} через {next}</span>}
          </div>
          <div class="parts-row">
            <div class="track" aria-hidden="true">
              {DAY_PARTS.map((p, i) => (
                <span data-on={i === partIdx ? 'now' : i < partIdx ? 'past' : 'next'}><Icon name={PART_ICON[p]} size={17} /></span>
              ))}
            </div>
            <button class="snd" aria-pressed={!muted} aria-label={muted ? SOUND.turnOn : SOUND.turnOff} onClick={() => { setMuted(!muted); setMutedShown(!muted); }}>
              <Icon name={muted ? 'mute' : 'sound'} size={17} />
            </button>
          </div>
        </div>
      </header>

      <section class="hero">
        <button class="mirror-sm" onClick={() => setTab('mirror')} aria-label="Открыть зеркало">
          <Portrait look={look} title={me.name} />
        </button>
        <div class="hero-info">
          <div class="hero-name">{me.name} <small>{me.age}</small></div>
          {chanceShown ? (
            <div class="chance">
              <div class="chance-row">
                <Icon name="heart" size={18} />
                <span class="num">{pct}%</span>
                <span class="chance-label">шанс понравиться</span>
              </div>
              <div class="meter" role="img" aria-label={`Шанс понравиться ${pct} процентов`}><i style={{ width: `${pct}%` }} /></div>
              {state.lastChange
                ? <div class="chance-why" data-dir={state.lastChange.delta > 0 ? 'up' : 'down'}><b>{signed(state.lastChange.delta)}</b>: {state.lastChange.why}</div>
                : chanceNote ? <div class="chance-why">{String(chanceNote)}</div> : null}
            </div>
          ) : (
            <div class="countdown">До встречи <b class="num">{content.balance.days - state.day + 1}</b> дней</div>
          )}
          <div class="wallet">
            <span class="energy" aria-label={`Энергия ${state.energy} из ${maxE}`}>
              <Icon name="bolt" size={16} />
              <span class="num">{state.energy}</span>
              <span class="energy-line"><i style={{ width: `${Math.min(100, (state.energy / Math.max(1, maxE)) * 100)}%` }} /></span>
            </span>
            <span class="coins"><Icon name="coin" size={17} /><span class="num">{state.coins}</span></span>
          </div>
        </div>
      </section>

      <div class="screen" ref={scroller}>
        {tab === 'journal' && <Journal state={state} />}
        {tab === 'mirror' && <Mirror state={state} />}
        {tab === 'chat' && <Chat state={state} />}
        {tab === 'feed' && <Feed state={state} />}
        {tab === 'shop' && <Shop state={state} commit={commit} />}
      </div>

      {tab === 'journal' && (
        <div class="bars">
          {problemIds.map((id) => {
            const def = content.problems.find((p) => p.id === id)!;
            const v = Math.round(progress(state, id) * 100);
            return (
              <div class="bar">
                <div class="bar-top"><span>{def.bar}</span><span class="num">{v}%</span></div>
                <Line v={v} />
              </div>
            );
          })}
        </div>
      )}

      {frozen && (
        <div class="frozen" role="status">
          <span>{DEMO_END.frozenNote}</span>
          <button onClick={() => setEndClosed(false)}>{DEMO_END.restOpen}</button>
        </div>
      )}

      <nav class="nav">
        <NavBtn tab="mirror" cur={tab} set={setTab} icon="mirror" label="Зеркало" />
        <NavBtn tab="chat" cur={tab} set={setTab} icon="chat" label={her.name} dot={state.chat.length > chatSeen} />
        {frozen
          ? <button class="plus" data-rest="" disabled aria-label={DEMO_END.frozenNote}><Icon name="lock" size={26} stroke={2.4} /></button>
          : <button class="plus" data-rest={dayClosed ? '' : undefined} onClick={() => { setTab('journal'); onPlus(); }} aria-label="Что дальше">
              <Icon name="plus" size={30} stroke={2.8} />
            </button>}
        <NavBtn tab="feed" cur={tab} set={setTab} icon="feed" label="Лента" />
        {frozen ? <span /> : <NavBtn tab="shop" cur={tab} set={setTab} icon="bag" label="Вещи" />}
      </nav>

      {missed ?? (dayCard && !frozen ? dayCard : sheet && (
        <div class="scrim" onClick={(e) => { if (e.target === e.currentTarget) setSheet(null); }}>
          <div class="sheet" role="dialog" aria-modal="true">
            <div class="grip" />
            {sheet.kind === 'card' && <CardSheet state={state} card={sheet.card} onChoose={onChoose} onClose={() => setSheet(null)} />}
            {sheet.kind === 'menu' && (
              <>
                <div class="sheet-head">
                  <h2>Чем заняться</h2>
                  <button class="x" onClick={() => setSheet(null)} aria-label="Закрыть"><Icon name="close" size={18} /></button>
                </div>
                <div class="choices">
                  {actionsFor(content, state).map((card) => {
                    const shown = choicesFor(content, state, card);
                    const one = shown.length === 1 ? shown[0] : null;
                    return (
                      <ChoiceBtn state={state} label={fill(content, state, card.title)} choice={one?.choice}
                        disabled={one ? !one.affordable : false} more={!one} onClick={() => onAction(card)} />
                    );
                  })}
                  {hasEvents(content, state) && <ChoiceBtn state={state} label="Посмотреть, что происходит вокруг" more onClick={onEvent} />}
                </div>
              </>
            )}
            {sheet.kind === 'result' && (
              <>
                <div class="sheet-head"><h2>{sheet.title}</h2></div>
                <p class="sheet-text">{sheet.text}</p>
                {sheet.delta !== 0 && chanceShown && (
                  <div class="chance-why" data-dir={sheet.delta > 0 ? 'up' : 'down'}><b>{signed(sheet.delta)}</b> к шансу: {sheet.why}</div>
                )}
                <button class="primary" onClick={onPlus}>Что дальше</button>
                <button class="quiet" onClick={() => setSheet(null)}>Вернуться в журнал</button>
              </>
            )}
            {sheet.kind === 'rest' && (
              <>
                <div class="sheet-head"><h2>{dayClosed ? `День ${state.day} закончен` : `${PART_NAME[state.part]}: всё сделано`}</h2></div>
                <p class="sheet-text">
                  {dayClosed
                    ? `${me.name} спит. Новый день начнётся в 06:00. Чат, зеркало и лента открыты.`
                    : `Новые события придут, когда наступит ${PART_NEXT[state.part]}: через ${next}. Чат, зеркало и лента открыты всегда.`}
                </p>
                <button class="quiet" onClick={() => setSheet(null)}>Вернуться в журнал</button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** «Пока тебя не было»: skipped story cards and how each one resolved, grouped by day. Shown once. */
function Missed({ state, onClose }: { state: GameState; onClose: () => void }) {
  return (
    <div class="scrim">
      <div class="sheet" role="dialog" aria-modal="true">
        <div class="grip" />
        <div class="sheet-head"><h2>{MISSED.title}</h2></div>
        <p class="row-sub">{MISSED.lead}</p>
        {(state.missed ?? []).map((m) => (
          <>
            <div class="day-mark"><b>{MISSED.day(m.day)}</b></div>
            <div class="rows">
              {m.items.map((it) => (
                <div class="row"><div class="row-main"><div class="row-title">{it.title}</div><div class="row-sub">{it.text}</div></div></div>
              ))}
            </div>
          </>
        ))}
        <button class="primary" onClick={onClose}>{MISSED.ok}</button>
      </div>
    </div>
  );
}

const Line = ({ v }: { v: number }) => (
  <div class="bar-line"><i style={{ width: `${Math.max(3, v)}%` }} data-low={v < 34 ? '' : undefined} data-mid={v >= 34 && v < 67 ? '' : undefined} /></div>
);

function NavBtn(p: { tab: Tab; cur: Tab; set: (t: Tab) => void; icon: string; label: string; dot?: boolean }) {
  const on = p.cur === p.tab;
  return (
    <button class="nav-btn" aria-current={on ? 'page' : undefined} onClick={() => p.set(on ? 'journal' : p.tab)}>
      <Icon name={p.icon} size={23} stroke={on ? 2.4 : 2} />
      {p.label}
      {p.dot && <span class="dot" aria-label="новое сообщение" />}
    </button>
  );
}

/** Кнопка варианта: подпись, цена и, если исход случайный, честные шансы словами. */
function ChoiceBtn(p: { state: GameState; label: string; choice?: Choice; disabled?: boolean; more?: boolean; onClick: () => void }) {
  const odds = p.choice ? oddsFor(content, p.state, p.choice) : [];
  const cost = p.choice?.cost;
  return (
    <>
      <button class="choice" disabled={p.disabled} onClick={p.onClick}>
        <span class="choice-main">
          {p.label}
          {odds.length > 0 && <small>{odds.map((o) => `${o.word}: ${o.hint}`).join(', ')}</small>}
        </span>
        <Cost energy={cost?.energy} coins={cost?.coins} />
      </button>
      {p.disabled && <p class="why">{p.state.energy < (cost?.energy ?? 0) ? 'Не хватает энергии' : 'Не хватает монет'}</p>}
    </>
  );
}

function CardSheet({ state, card, onChoose, onClose }: { state: GameState; card: Card; onChoose: (c: Card, id: string) => void; onClose: () => void }) {
  const shown = choicesFor(content, state, card);
  const speaker = card.speaker === 'crush' ? crush(content, state).name : card.speaker;
  const lastLine = card.says ? state.chat.filter((m) => m.from === 'crush').at(-1)?.text : undefined;
  const text = lastLine ? `«${lastLine}»` : fill(content, state, card.text);
  return (
    <>
      <div class="sheet-head">
        <h2>{fill(content, state, card.title)}</h2>
        <button class="x" onClick={onClose} aria-label="Отложить"><Icon name="close" size={18} /></button>
      </div>
      {speaker && <span class="speaker">{speaker}</span>}
      {text && <p class="sheet-text">{text}</p>}
      <div class="choices">
        {shown.map(({ choice, affordable }) => (
          <ChoiceBtn state={state} label={choice.label} choice={choice} disabled={!affordable} onClick={() => onChoose(card, choice.id)} />
        ))}
      </div>
    </>
  );
}

function DayCard({ state, d, onClose }: { state: GameState; d: DaySummary; onClose: () => void }) {
  const info = content.days.find((x) => x.day === d.day);
  const gift = d.gift ? content.items.find((i) => i.id === d.gift) : undefined;
  const changed = d.bars.filter((b) => b.to !== b.from || b.drift);
  return (
    <>
      <div class="sheet-head"><h2>День {d.day} закончен{info ? `: ${info.title.toLowerCase()}` : ''}</h2></div>
      <div class="daycard">
        <div class="frame"><Portrait look={d.look} title={`Кадр дня ${d.day}`} /></div>
        <div class="rows">
          {changed.length === 0 && <p class="row-sub">Показатели за день не изменились.</p>}
          {changed.map((b) => {
            const def = content.problems.find((p) => p.id === b.id)!;
            if (b.drift) {
              return (
                <div class="delta-row">
                  <span>{def.bar}</span>
                  <b class="num" data-dir={b.drift === 'better' ? 'up' : 'down'} style="grid-column: 2 / -1">{DAY_CARD.drift[b.drift]}</b>
                </div>
              );
            }
            return (
              <div class="delta-row">
                <span>{def.bar}</span>
                <span class="num">{b.from}% → {b.to}%</span>
                <b class="num" data-dir={b.to > b.from ? 'up' : 'down'}>{signed(b.to - b.from)}</b>
              </div>
            );
          })}
        </div>
      </div>
      {d.picks.length > 0 && (
        <div class="rows">
          {d.picks.map((p) => (
            <div class="row"><div class="row-main"><div class="row-title"><span>{p.title}</span>{p.delta !== 0 && <span class="num">{signed(p.delta)}</span>}</div>{p.label !== p.title && <div class="row-sub">{p.label}</div>}</div></div>
          ))}
        </div>
      )}
      {d.played
        ? <div class="reward"><Icon name="coin" size={18} /><span><b class="num">+{d.coins}</b> монет{gift ? ` и ${gift.title.toLowerCase()}: ${gift.blurb.charAt(0).toLowerCase()}${gift.blurb.slice(1)}` : ''}</span></div>
        : <div class="reward" data-miss>День пропущен: награды нет, {hero(content, state).name} откатился назад.</div>}
      {info?.teaser && <p class="row-sub">{info.teaser}</p>}
      <button class="primary" onClick={onClose}>Понятно</button>
    </>
  );
}

function Journal({ state }: { state: GameState }) {
  if (!state.log.length) {
    return <p class="empty">Журнал пуст. Нажми плюс внизу, чтобы начать первый день.</p>;
  }
  const out: preact.JSX.Element[] = [];
  let last = '';
  state.log.forEach((e: LogEntry) => {
    const key = `${e.day}-${e.part}`;
    if (key !== last) {
      out.push(<div class="day-mark"><b>День {e.day}</b>{PART_NAME[e.part].toLowerCase()}</div>);
      last = key;
    }
    out.push(
      <article class="entry" data-kind={e.kind}>
        {e.title && <div class="entry-title">{e.title}</div>}
        <p>{e.text}</p>
      </article>,
    );
  });
  return <>{out}</>;
}

/** Timelapse frames: «до», the end of every played day and, optionally, now. */
function timelapseFrames(state: GameState, withNow: boolean): { label: string; look: Look }[] {
  return [
    { label: 'До', look: startLook(content, state) },
    ...state.summaries.map((d) => ({ label: `День ${d.day}`, look: d.look })),
    ...(withNow ? [{ label: 'Сейчас', look: currentLook(content, state) }] : []),
  ];
}

function Timelapse({ frames }: { frames: { label: string; look: Look }[] }) {
  const [i, setI] = useState(frames.length - 1);
  const cur = frames[Math.min(i, frames.length - 1)];
  return (
    <>
      <div class="seg" role="group" aria-label="Какой кадр показать">
        {frames.map((f, n) => <button aria-pressed={n === Math.min(i, frames.length - 1)} onClick={() => setI(n)}>{f.label}</button>)}
      </div>
      <div class="mirror-lg"><Body look={cur.look} title={cur.label} /></div>
    </>
  );
}

function Mirror({ state }: { state: GameState }) {
  return (
    <>
      <Timelapse frames={timelapseFrames(state, true)} />
      <div class="rows">
        {Object.keys(state.startProblems).map((id) => {
          const def = content.problems.find((p) => p.id === id)!;
          const v = Math.round(progress(state, id) * 100);
          return (
            <div class="row">
              <Icon name={def.icon} />
              <div class="row-main">
                <div class="row-title"><span>{def.bar}</span><span class="num">{v}%</span></div>
                <Line v={v} />
              </div>
            </div>
          );
        })}
      </div>
      {state.modifiers.length > 0 && (
        <>
          <h3>Действует сейчас</h3>
          <div class="rows">
            {state.modifiers.map((m) => (
              <div class="row"><Icon name="flame" /><div class="row-main"><div class="row-title">{m.title}</div>
                <div class="row-sub">{m.energyPerDay ? `энергия в день: ${signed(m.energyPerDay)}` : 'меняет героя каждый день'}</div></div></div>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Chat({ state }: { state: GameState }) {
  const her = crush(content, state);
  return (
    <>
      <div class="who">
        <Portrait look={{ ...her.look }} title={her.name} />
        <div><b>{her.name}</b><small>{her.blurb}</small></div>
      </div>
      {state.revealed.map((id) => (
        <div class="sticky">{content.tastes.find((t) => t.id === id)?.title}</div>
      ))}
      {!state.chat.length && <p class="empty">Переписки пока нет.</p>}
      {state.chat.map((m, i) => (
        <>
          {/* same day mark as the journal, so status lines of two evenings do not read as one */}
          {m.day !== state.chat[i - 1]?.day && <div class="day-mark"><b>День {m.day}</b></div>}
          <div class="bubble" data-from={m.from} data-quiet={m.status ? '' : undefined}>{m.text}</div>
        </>
      ))}
    </>
  );
}

function Feed({ state }: { state: GameState }) {
  return (
    <>
      <h3>Лента</h3>
      {!state.rumors.length && <p class="empty">В ленте пока тихо. Посты приходят с событиями, и верить можно не всем.</p>}
      {[...state.rumors].reverse().map((r) => {
        const x = content.rumors[r.id];
        return <div class="rumor">{x.text}<small>{x.source}, день {r.day}</small></div>;
      })}
      <h3>Блокнот</h3>
      {!state.hints.length && <p class="empty">Сюда сами попадают подсказки, которые {hero(content, state).name} услышал или заметил.</p>}
      {state.hints.map((h) => <div class="sticky">{content.hints[h]}</div>)}
    </>
  );
}

function Shop({ state, commit }: { state: GameState; commit: (s: GameState) => void }) {
  const mine = content.items.filter((it) => (state.items[it.id] ?? 0) > 0);
  const sold = content.items.filter((it) => it.price);
  const card = (it: (typeof content.items)[number], selling: boolean) => {
    const have = state.items[it.id] ?? 0;
    const coins = it.price?.coins;
    // a running course: a second pass or cream would only restart it, so neither sell nor apply
    const active = courseActive(state, it);
    // an owned item is counted and applied under «Твои вещи» only; the shop card just sells
    const usable = !selling && have > 0 && !!it.onUse;
    return (
      <div class="item">
        <div class="item-head">
          <Icon name={it.icon} />
          <div><b>{it.title}{have && !selling ? ` × ${have}` : ''}</b><small>{it.blurb}</small></div>
        </div>
        <div class="limits">{it.limits}</div>
        {(selling || usable) && (
          <div class="item-actions">
            {selling && (soldOut(state, it)
              ? <button class="buy" disabled>Куплено</button>
              : active
              ? <button class="buy" disabled>Уже действует</button>
              : coins !== undefined
              ? <button class="buy" disabled={state.coins < coins} onClick={() => { commit(buy(content, state, it.id)); play('coins'); }}>Купить <Icon name="coin" size={16} />{coins}</button>
              : <button class="buy" disabled>За реальные деньги, в прототипе выключено</button>)}
            {usable && <button class="use" disabled={active} onClick={() => commit(useItem(content, state, it.id))}>Применить</button>}
          </div>
        )}
      </div>
    );
  };
  return (
    <>
      <h3>Твои вещи</h3>
      {!mine.length && <p class="empty">Пока пусто. Первый подарок придёт в конце дня.</p>}
      {mine.map((it) => card(it, false))}
      <h3>Магазин</h3>
      {!sold.length && <p class="empty">В первый день покупать нечего. Товары появятся по сюжету.</p>}
      {sold.map((it) => card(it, true))}
    </>
  );
}

function Decisions({ state }: { state: GameState }) {
  const sorted = [...state.history].filter((h) => h.chanceDelta !== 0).sort((a, b) => b.chanceDelta - a.chanceDelta);
  const best = sorted.filter((h) => h.chanceDelta > 0).slice(0, 3);
  const worst = sorted.filter((h) => h.chanceDelta < 0).slice(-3).reverse();
  const list = (items: typeof sorted, icon: string) => (
    <div class="rows">{items.map((h) => (
      <div class="row"><Icon name={icon} /><div class="row-main"><div class="row-title"><span>{h.title}</span><span class="num">{signed(h.chanceDelta)}</span></div><div class="row-sub">день {h.day}{h.label !== h.title ? `: ${h.label}` : ''}</div></div></div>
    ))}</div>
  );
  return (
    <>
      {best.length > 0 && <><h3>Удачные решения</h3>{list(best, 'up')}</>}
      {worst.length > 0 && <><h3>Неудачные решения</h3>{list(worst, 'down')}</>}
    </>
  );
}

function readNotified() {
  try { return localStorage.getItem(NOTIFY_KEY) === '1'; } catch { return false; }
}

function DemoEnd({ state, onClose, onRestart }: { state: GameState; onClose: () => void; onRestart: () => void }) {
  const frames = timelapseFrames(state, false);
  const [notified, setNotified] = useState(readNotified);
  const [shareNote, setShareNote] = useState('');
  const last = state.summaries.at(-1);
  const gift = last?.gift ? content.items.find((i) => i.id === last.gift) : undefined;
  const pct = chance(content, state);

  function notify() {
    try { localStorage.setItem(NOTIFY_KEY, '1'); } catch { /* storage unavailable: remember for this visit only */ }
    setNotified(true);
  }
  async function share() {
    if (typeof navigator.share === 'function') {
      // attach the timelapse picture when the platform can share files, otherwise share the link alone
      let files: File[] = [];
      try {
        const file = new File([await timelapsePng(frames)], 'timelapse.png', { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) files = [file];
      } catch { /* no picture: share the link */ }
      try { await navigator.share({ title: DEMO_END.shareTitle, text: DEMO_END.shareMessage, url: REFERRAL_URL, ...(files.length ? { files } : {}) }); }
      catch { /* the player closed the share sheet */ }
      return;
    }
    try { await navigator.clipboard.writeText(REFERRAL_URL); setShareNote(DEMO_END.shareCopied); }
    catch { setShareNote(DEMO_END.shareFailed(REFERRAL_URL)); }
  }

  return (
    <div class="game">
      <div class="screen verdict" style="padding-top:18px">
        <h2>{DEMO_END.title}</h2>
        <p>{DEMO_END.written(content.balance.contentDays, content.balance.days)}</p>
        <Timelapse frames={frames} />
        <h3>{DEMO_END.heroHead}</h3>
        <div class="rows">
          <div class="row"><Icon name="heart" /><div class="row-main">
            <div class="row-title"><span>{DEMO_END.chance}</span><span class="num">{pct}%</span></div>
            <div class="meter"><i style={{ width: `${pct}%` }} /></div>
          </div></div>
          {Object.keys(state.startProblems).map((id) => {
            const def = content.problems.find((p) => p.id === id)!;
            const from = Math.round(progress({ ...state, problems: state.startProblems }, id) * 100);
            const v = Math.round(progress(state, id) * 100);
            return (
              <div class="row"><Icon name={def.icon} /><div class="row-main">
                <div class="row-title"><span>{def.bar}</span><span class="num">{from}% → {v}%{v !== from ? ` (${signed(v - from)})` : ''}</span></div>
                <Line v={v} />
              </div></div>
            );
          })}
        </div>
        {last && (last.played
          ? <div class="reward"><Icon name="coin" size={18} /><span>За день {last.day}: <b class="num">+{last.coins}</b> монет{gift ? ` и ${gift.title.toLowerCase()}` : ''}</span></div>
          : <div class="reward" data-miss>День {last.day} пропущен: награды нет.</div>)}
        <Decisions state={state} />
        <h3>{DEMO_END.shareHead}</h3>
        <div class="share">
          <p>{DEMO_END.shareText}</p>
          <button class="quiet" onClick={share}>{DEMO_END.shareBtn}</button>
          {shareNote && <p class="share-note" role="status">{shareNote}</p>}
        </div>
      </div>
      <div class="end-foot">
        {notified && <p class="end-note" role="status">{DEMO_END.notified}</p>}
        <div class="end-actions">
          <button onClick={notify}>{DEMO_END.notify}</button>
          <button onClick={onClose}>{DEMO_END.close}</button>
        </div>
        <button class="end-restart" onClick={onRestart}>{DEMO_END.restart}</button>
      </div>
    </div>
  );
}

function Verdict({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  const her = crush(content, state);
  const v = state.verdict!;
  return (
    <div class="game">
      <div class="screen verdict" style="padding-top:18px">
        <h2>{her.name} {her.gender === 'f' ? 'сказала' : 'сказал'} {v.liked ? '«да»' : '«нет»'}</h2>
        <p>Шанс был {v.chance}%. Выпало {v.roll}: {v.liked ? 'меньше шанса, значит получилось.' : 'больше шанса, значит не в этот раз.'}</p>
        <div class="pair">
          <figure><Body look={startLook(content, state)} title="День 1" /><figcaption>День 1</figcaption></figure>
          <figure><Body look={currentLook(content, state)} title="Последний день" /><figcaption>День {content.balance.days}</figcaption></figure>
        </div>
        {state.tastes.map((id) => <div class="sticky">{content.tastes.find((t) => t.id === id)?.title}</div>)}
        <Decisions state={state} />
        <button class="primary" onClick={onRestart}>Сыграть ещё раз</button>
      </div>
    </div>
  );
}

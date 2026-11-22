import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { content } from '../content';
import { msToNextPart, type Clock } from '../engine/clock';
import {
  actionsFor, buy, chance, choicesFor, choose, crush, currentLook, dayEnergy, drawEvent, drawStory,
  fill, hasEvents, hero, markSummarySeen, newGame, oddsFor, progress, soldOut, startLook, syncClock, useItem,
} from '../engine/game';
import type { SaveStore } from '../engine/save';
import { DAY_PARTS, type Card, type Choice, type DaySummary, type GameState, type LogEntry } from '../engine/types';
import type { Look } from '../art/avatar';
import { Body, Cost, Icon, Portrait } from './bits';
import { duration, PART_ICON, PART_NAME, PART_NEXT } from './ru';

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

export function Game({ clock, store, api }: { clock: Clock; store: SaveStore; api?: (a: GameApi) => void }) {
  const fresh = (archetypeId = content.archetypes[0].id) =>
    newGame(content, { seed: (clock.now() % 2_147_483_647) | 0, now: clock.now(), tzOffsetMin: clock.tzOffsetMin(), archetypeId });
  const [state, setState] = useState<GameState>(() => syncClock(content, store.load() ?? fresh(), clock.now()));
  const [tab, setTab] = useState<Tab>('journal');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [chatSeen, setChatSeen] = useState(state.chat.length);
  const [, tick] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  const commit = (s: GameState) => { store.save(s); setState(s); };
  const refresh = () => { setState((s) => { const n = syncClock(content, s, clock.now()); if (n !== s) store.save(n); return n; }); tick((n) => n + 1); };
  const restart = (id?: string) => { store.clear(); commit(fresh(id)); setSheet(null); setTab('journal'); setChatSeen(0); };

  useEffect(() => {
    api?.({ restart, refresh });
    const t = setInterval(refresh, 20_000);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  useEffect(() => {
    if (!scroller.current) return;
    scroller.current.scrollTop = tab === 'journal' || tab === 'chat' ? scroller.current.scrollHeight : 0;
  }, [state.log.length, state.chat.length, tab]);
  useEffect(() => { if (tab === 'chat') setChatSeen(state.chat.length); }, [tab, state.chat.length]);

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
    if (d.card) return setSheet({ kind: 'card', card: d.card });
    const s = d.state;
    setSheet(actionsFor(content, s).length || hasEvents(content, s) ? { kind: 'menu' } : { kind: 'rest' });
  }
  function onChoose(card: Card, choiceId: string) {
    const r = choose(content, state, card.id, choiceId);
    commit(r.state);
    setSheet({ kind: 'result', title: fill(content, r.state, card.title), text: r.outcome.text, delta: r.chanceDelta, why: r.state.lastChange?.why });
  }
  function onAction(card: Card) {
    const shown = choicesFor(content, state, card);
    if (shown.length === 1) return onChoose(card, shown[0].choice.id);
    setSheet({ kind: 'card', card });
  }
  function onEvent() {
    const d = drawEvent(content, state);
    if (d.state !== state) commit(d.state);
    if (d.card) setSheet({ kind: 'card', card: d.card });
  }

  if (state.verdict) return <Verdict state={state} onRestart={() => restart(state.archetypeId)} />;
  if (state.demoOver) return <DemoEnd state={state} onRestart={() => restart(state.archetypeId)} />;

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
            <span class="parts-next">{PART_NEXT[state.part]} через {next}</span>
          </div>
          <div class="track" aria-hidden="true">
            {DAY_PARTS.map((p, i) => (
              <span data-on={i === partIdx ? 'now' : i < partIdx ? 'past' : 'next'}><Icon name={PART_ICON[p]} size={17} /></span>
            ))}
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

      <nav class="nav">
        <NavBtn tab="mirror" cur={tab} set={setTab} icon="mirror" label="Зеркало" />
        <NavBtn tab="chat" cur={tab} set={setTab} icon="chat" label={her.name} dot={state.chat.length > chatSeen} />
        <button class="plus" data-rest={dayClosed ? '' : undefined} onClick={() => { setTab('journal'); onPlus(); }} aria-label="Что дальше">
          <Icon name="plus" size={30} stroke={2.8} />
        </button>
        <NavBtn tab="feed" cur={tab} set={setTab} icon="feed" label="Лента" />
        <NavBtn tab="shop" cur={tab} set={setTab} icon="bag" label="Вещи" />
      </nav>

      {unseen ? (
        <div class="scrim">
          <div class="sheet" role="dialog" aria-modal="true">
            <div class="grip" />
            <DayCard state={state} d={unseen} onClose={() => { commit(markSummarySeen(state, unseen.day)); setSheet(null); }} />
          </div>
        </div>
      ) : sheet && (
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
      )}
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
  const changed = d.bars.filter((b) => b.to !== b.from);
  return (
    <>
      <div class="sheet-head"><h2>День {d.day} закончен{info ? `: ${info.title.toLowerCase()}` : ''}</h2></div>
      <div class="daycard">
        <div class="frame"><Portrait look={d.look} title={`Кадр дня ${d.day}`} /></div>
        <div class="rows">
          {changed.length === 0 && <p class="row-sub">Показатели за день не изменились.</p>}
          {changed.map((b) => {
            const def = content.problems.find((p) => p.id === b.id)!;
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

function Mirror({ state }: { state: GameState }) {
  // кадры таймлапса: «до», конец каждого дня, сейчас
  const frames: { label: string; look: Look }[] = [
    { label: 'До', look: startLook(content, state) },
    ...state.summaries.map((d) => ({ label: `День ${d.day}`, look: d.look })),
    { label: 'Сейчас', look: currentLook(content, state) },
  ];
  const [i, setI] = useState(frames.length - 1);
  const cur = frames[Math.min(i, frames.length - 1)];
  return (
    <>
      <div class="seg" role="group" aria-label="Какой кадр показать">
        {frames.map((f, n) => <button aria-pressed={n === Math.min(i, frames.length - 1)} onClick={() => setI(n)}>{f.label}</button>)}
      </div>
      <div class="mirror-lg"><Body look={cur.look} title={cur.label} /></div>
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
      {state.chat.map((m) => <div class="bubble" data-from={m.from} data-quiet={m.status ? '' : undefined}>{m.text}</div>)}
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
    return (
      <div class="item">
        <div class="item-head">
          <Icon name={it.icon} />
          <div><b>{it.title}{have ? ` × ${have}` : ''}</b><small>{it.blurb}</small></div>
        </div>
        <div class="limits">{it.limits}</div>
        {(selling || (have > 0 && it.onUse)) && (
          <div class="item-actions">
            {selling && (soldOut(state, it)
              ? <button class="buy" disabled>Куплено</button>
              : coins !== undefined
              ? <button class="buy" disabled={state.coins < coins} onClick={() => commit(buy(content, state, it.id))}>Купить <Icon name="coin" size={16} />{coins}</button>
              : <button class="buy" disabled>За реальные деньги, в прототипе выключено</button>)}
            {have > 0 && it.onUse && <button class="use" onClick={() => commit(useItem(content, state, it.id))}>Применить</button>}
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

function DemoEnd({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  const frames = [{ label: 'До', look: startLook(content, state) }, ...state.summaries.map((d) => ({ label: `День ${d.day}`, look: d.look }))];
  const last = state.summaries.at(-1);
  const gift = last?.gift ? content.items.find((i) => i.id === last.gift) : undefined;
  return (
    <div class="game">
      <div class="screen verdict" style="padding-top:18px">
        <h2>Продолжение следует</h2>
        <p>Написан {content.balance.contentDays === 1 ? 'первый день' : `сценарий на ${content.balance.contentDays} дней`} из {content.balance.days}. Дальше игра пока не идёт.</p>
        <div class="pair">
          {frames.map((f) => <figure><Body look={f.look} title={f.label} /><figcaption>{f.label}</figcaption></figure>)}
        </div>
        <div class="rows">
          {Object.keys(state.startProblems).map((id) => {
            const def = content.problems.find((p) => p.id === id)!;
            const v = Math.round(progress(state, id) * 100);
            return <div class="row"><Icon name={def.icon} /><div class="row-main"><div class="row-title"><span>{def.bar}</span><span class="num">{v}%</span></div><Line v={v} /></div></div>;
          })}
        </div>
        {last && (last.played
          ? <div class="reward"><Icon name="coin" size={18} /><span>За день {last.day}: <b class="num">+{last.coins}</b> монет{gift ? ` и ${gift.title.toLowerCase()}` : ''}</span></div>
          : <div class="reward" data-miss>День {last.day} пропущен: награды нет.</div>)}
        <Decisions state={state} />
        <button class="primary" onClick={onRestart}>Сыграть день заново</button>
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

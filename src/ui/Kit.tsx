import { useRef, useState } from 'preact/hooks';
import { content } from '../content';
import { ICONS, type IconName } from '../art/icons';
import { DEFAULT_LOOK, HAIR_COLORS, SKIN_TONES, type Look } from '../art/avatar';
import { DeviceClock, msToNextPart } from '../engine/clock';
import { LocalSave } from '../engine/save';
import { Body, Icon, Portrait } from './bits';
import { Game, type GameApi } from './Game';
import { SOUND } from './ru';
import { play, SOUNDS, type SoundName } from './sound';

const clock = new DeviceClock();
const store = new LocalSave();
const DAY = 86_400_000;

const SLIDERS: [keyof Look, string, string][] = [
  ['weight', 'Вес', 'худой … полный'], ['acne', 'Прыщи', 'чисто … много'], ['teeth', 'Зубы', 'плохие … белые'],
  ['hairCare', 'Уход за волосами', 'нет … есть'], ['posture', 'Осанка', 'сутулый … прямой'],
  ['tired', 'Усталость', 'выспался … мешки'], ['mood', 'Настроение', 'грустит … улыбается'], ['clothesCare', 'Опрятность одежды', 'пятна … чисто'],
];
const SELECTS: [keyof Look, string, string[]][] = [
  ['gender', 'Пол', ['m', 'f']],
  ['hair', 'Причёска', ['bald', 'receding', 'buzz', 'short', 'side', 'messy', 'curly', 'long', 'bob', 'ponytail', 'bun']],
  ['glasses', 'Очки', ['none', 'thick', 'taped', 'thin', 'round']],
  ['facial', 'Щетина', ['none', 'stubble', 'patchy', 'beard']],
  ['neckline', 'Верх', ['wide', 'crew', 'v', 'collar', 'hood', 'lapel']],
  ['bottom', 'Низ', ['sweats', 'jeans', 'trousers', 'skirt']],
];

const COLORS: [string, string, string][] = [
  ['--tile', 'Кафель', 'фон'], ['--paper', 'Бумага', 'карточки'], ['--ink', 'Чернила', 'текст'],
  ['--mint', 'Мята', 'главное действие'], ['--rasp', 'Малина', 'краш и шанс'], ['--note', 'Стикер', 'подсказки'],
  ['--morning', 'Утро', '06–12'], ['--day', 'День', '12–18'], ['--evening', 'Вечер', '18–23'], ['--night', 'Ночь', '23–06'],
];

/** герой на заданной доле пути: 0 как в первый день, 1 всё решено */
function stage(id: string, t: number, patch: Partial<Look> = {}): Look {
  const a = content.archetypes.find((x) => x.id === id)!;
  const look: Look = { ...DEFAULT_LOOK, ...a.look };
  for (const def of content.problems) {
    const start = a.problems[def.id];
    if (start === undefined) continue;
    for (const m of def.look ?? []) (look as unknown as Record<string, number>)[m.param] = m.at0 + (m.at100 - m.at0) * ((start * (1 - t)) / 100);
  }
  return { ...look, ...patch };
}

export function Kit() {
  const api = useRef<GameApi | null>(null);
  const [look, setLook] = useState<Look>(() => stage('andrey', 0));
  const set = (k: keyof Look, v: unknown) => setLook((l) => ({ ...l, [k]: v }));
  const skip = (ms: number) => { clock.devSkip += ms; api.current?.refresh(); };

  return (
    <div class="kit">
      <div class="kit-left">
        <div class="phone"><Game clock={clock} store={store} api={(a) => (api.current = a)} /></div>
        <div class="dev">
          <p>Игра идёт по настоящим часам. Для проверки время можно перемотать, в релизе этих кнопок нет.</p>
          <div class="dev-row">
            <button class="dev-btn" onClick={() => skip(msToNextPart(clock.now(), clock.tzOffsetMin()) + 1000)}>Следующее время суток</button>
            <button class="dev-btn" onClick={() => skip(DAY)}>Следующий день</button>
            <button class="dev-btn" onClick={() => { clock.devSkip = 0; api.current?.restart(content.archetypes[0].id); }}>Начать заново</button>
          </div>
        </div>
      </div>

      <div class="kit-right">
        <header>
          <h1>30 дней: прототип первого дня</h1>
          <p class="lead">В телефоне первый день из сценария демо: чат класса, зеркало, звонок мамы, профиль Алины, сигарета на балконе, лента, сон. День идёт по настоящим часам, кнопки под телефоном перематывают время. Рядом всё, из чего игра собрана: герой, иконки и интерфейс нарисованы кодом, без картинок.</p>
        </header>

        <section>
          <h2>Герой из слоёв</h2>
          <p class="sub">Портрет идёт в игру, фигура в полный рост идёт в зеркало и в финальное «до и после». Оба рисуются из одних параметров, а параметры считаются из проблем героя.</p>
          <div class="lab">
            <div class="lab-view"><Portrait look={look} title="Портрет" /><Body look={look} title="Фигура" /></div>
            <div class="lab-ctl">
              {SLIDERS.map(([k, label, hint]) => (
                <label class="ctl"><span>{label}<em style="font-style:normal">{hint}</em></span>
                  <input id={`ctl-${k}`} type="range" min="0" max="100" value={look[k] as number} onInput={(e) => set(k, +(e.target as HTMLInputElement).value)} /></label>
              ))}
              {SELECTS.map(([k, label, opts]) => (
                <label class="ctl"><span>{label}</span>
                  <select id={`ctl-${k}`} value={look[k] as string} onChange={(e) => set(k, (e.target as HTMLSelectElement).value)}>{opts.map((o) => <option value={o}>{o}</option>)}</select></label>
              ))}
              <label class="ctl"><span>Тон кожи</span>
                <select id="ctl-skin" value={look.skin} onChange={(e) => set('skin', +(e.target as HTMLSelectElement).value)}>{SKIN_TONES.map((_, i) => <option value={i}>{i + 1}</option>)}</select></label>
              <label class="ctl"><span>Цвет волос</span>
                <select id="ctl-hairColor" value={look.hairColor} onChange={(e) => set('hairColor', (e.target as HTMLSelectElement).value)}>{Object.entries(HAIR_COLORS).map(([n, v]) => <option value={v}>{n}</option>)}</select></label>
            </div>
          </div>
        </section>

        <section>
          <h2>Путь героя</h2>
          <p class="sub">Андрей в первый день, на середине и в конце. Прыщи исчезают по одному, вес и осанка меняются плавно, бороду, оправу и одежду меняют события.</p>
          <div class="path">
            <figure><Portrait look={stage('andrey', 0)} /><figcaption><b>день 1</b>шесть показателей</figcaption></figure>
            <figure><Portrait look={stage('andrey', 0.5, { facial: 'stubble', glasses: 'thick', neckline: 'crew', topColor: '#3E8E7E' })} /><figcaption><b>день 15</b>на полпути</figcaption></figure>
            <figure><Portrait look={stage('andrey', 1, { hair: 'buzz', facial: 'none', glasses: 'thin', neckline: 'lapel', topColor: '#22304D', mood: 85 })} /><figcaption><b>день 30</b>всё решено</figcaption></figure>
          </div>
        </section>

        <section>
          <h2>Иконки</h2>
          <p class="sub">Одна сетка 24 на 24, одна толщина линии. Имя под иконкой пишется в контенте как есть.</p>
          <div class="icons">{(Object.keys(ICONS) as IconName[]).map((n) => <div><Icon name={n} size={26} />{n}</div>)}</div>
        </section>

        <section>
          <h2>Звуки</h2>
          <p class="sub">По одному звуку на событие, все короче полутора секунд. Кнопка проигрывает звук так же, как игра; если звук в игре выключен, здесь тоже тихо.</p>
          <div class="dev-row">{(Object.keys(SOUNDS) as SoundName[]).map((n) => <button class="dev-btn" onClick={() => play(n)}>{SOUND.names[n]}</button>)}</div>
        </section>

        <section>
          <h2>Цвет и шрифт</h2>
          <p class="sub">Мир игры: утро в ванной перед зеркалом. Малиновый занят только крашем и шансом, поэтому всё, что связано с ней, видно сразу. Шапка меняет цвет вместе с временем суток у игрока.</p>
          <div class="swatches">{COLORS.map(([v, name, role]) => (
            <div class="sw"><i style={{ background: `var(${v})` }} /><div><b>{name}</b><span>{role}</span></div></div>
          ))}</div>
          <div class="type">
            <div><div class="d">День 7 из 30</div><small>Unbounded: заголовки, числа, день</small></div>
            <div><div class="b">Мама нашла телефон дерматолога. Соседка с третьего этажа уверяет, что врач не поможет, а поможет крем.</div><small>Golos Text: весь остальной текст. Оба шрифта лежат внутри приложения и поддерживают кириллицу.</small></div>
          </div>
        </section>

        <section>
          <h2>Что лежит в проекте</h2>
          <p class="sub">Сценарий пишется в JSON и не требует правок кода. Проверка контента ловит тупики и битые ссылки до того, как их увидит игрок.</p>
          <ul class="files">
            <li><code>content/</code><span>Карточки, показатели, герой, краш, вкусы, предметы, фразы чата. Сейчас в игре день 1: {content.cards.length} карточек.</span></li>
            <li><code>docs/CONTENT_FORMAT.md</code><span>Как писать карточку, условие, эффект и «память». Этот файл можно отдать в чат со сценарием.</span></li>
            <li><code>src/engine/</code><span>Ядро без экрана и сети: время суток по поясу игрока, энергия, сюжет, меню действий, колода, метки, счётчики, эффекты «завтра», конец дня, шанс.</span></li>
            <li><code>src/art/</code><span>Герой из слоёв и иконки.</span></li>
            <li><code>src/ui/</code><span>Экраны: журнал, карточка с выбором, меню действий, карточка дня, зеркало с таймлапсом, чат, лента и блокнот, вещи, конец демо.</span></li>
            <li><code>server/</code><span>Заготовка тонкого сервера на Supabase: честное время, копия сейва, проверка покупок. Не развёрнута.</span></li>
            <li><code>tests/</code><span>Проверки ядра и прохождения первого дня.</span></li>
          </ul>
        </section>
      </div>
    </div>
  );
}

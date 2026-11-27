import { render } from 'preact';
import './styles/fonts.css';
import './styles/game.css';
import './styles/kit.css';
import { Kit } from './ui/Kit';
import { Game } from './ui/Game';
import { DeviceClock } from './engine/clock';
import { LocalSave } from './engine/save';
import { content } from './content';
import { connectTelegram } from './telegram';

const params = new URLSearchParams(location.search);
// dev switch: ?full lifts the demo cut-off to the last written day
if (params.has('full')) content.balance.demoDays = content.balance.contentDays;
// ?demo=<n> cuts the demo after day n (the Telegram Mini App opens with ?demo=1); any other value changes nothing
const demo = params.get('demo') ?? '';
if (/^\d+$/.test(demo) && +demo >= 1 && +demo <= content.balance.contentDays) content.balance.demoDays = +demo;

const app = document.getElementById('app')!;
connectTelegram().then((tg) => {
  // inside Telegram the game takes the whole Mini App, without the showcase around it
  if (tg) render(<div class="tg-app"><Game clock={new DeviceClock()} store={new LocalSave()} onLeave={() => tg.close()} /></div>, app);
  else render(<Kit />, app);
});

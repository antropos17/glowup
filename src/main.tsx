import { render } from 'preact';
import './styles/fonts.css';
import './styles/game.css';
import './styles/kit.css';
import './styles/app.css';
import './styles/funnel.css';
import { Kit } from './ui/Kit';
import { Game } from './ui/Game';
import { DeviceClock } from './engine/clock';
import { LocalSave } from './engine/save';
import { content } from './content';
import { connectTelegram } from './telegram';
import { funnelFrom } from './funnel';

const params = new URLSearchParams(location.search);
// dev switch: ?full lifts the demo cut-off to the last written day
if (params.has('full')) content.balance.demoDays = content.balance.contentDays;
// ?demo=<n> cuts the demo after day n (the Telegram Mini App opens with ?demo=1); any other value changes nothing
const demo = params.get('demo') ?? '';
if (/^\d+$/.test(demo) && +demo >= 1 && +demo <= content.balance.contentDays) content.balance.demoDays = +demo;
// ?demo=1 is the 1-day funnel (Mini App, TikTok link): intro, animated beats, cliffhanger, wishlist call
const funnel = funnelFrom(params);

const app = document.getElementById('app')!;
connectTelegram().then((tg) => {
  // inside Telegram the game takes the whole Mini App, without the showcase around it
  if (tg) render(<div class="tg-app"><Game clock={new DeviceClock()} store={new LocalSave()} onLeave={() => tg.close()} funnel={funnel} tg={tg} /></div>, app);
  // ?kit opens the asset showcase with the game in a phone frame
  else if (params.has('kit')) render(<Kit />, app);
  // public page: the game alone; without onLeave the demo end offers «notify me» instead of «leave»
  else {
    document.body.classList.add('public');
    render(<main class="public-app"><Game clock={new DeviceClock()} store={new LocalSave()} funnel={funnel} /></main>, app);
  }
});

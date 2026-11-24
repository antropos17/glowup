import { render } from 'preact';
import './styles/fonts.css';
import './styles/game.css';
import './styles/kit.css';
import { Kit } from './ui/Kit';
import { content } from './content';

// dev switch: ?full lifts the demo cut-off to the last written day
if (new URLSearchParams(location.search).has('full')) content.balance.demoDays = content.balance.contentDays;

render(<Kit />, document.getElementById('app')!);

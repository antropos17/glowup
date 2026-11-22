import { render } from 'preact';
import './styles/fonts.css';
import './styles/game.css';
import './styles/kit.css';
import { Kit } from './ui/Kit';

render(<Kit />, document.getElementById('app')!);

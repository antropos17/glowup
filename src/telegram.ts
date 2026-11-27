/**
 * Telegram Mini App bridge. The SDK script is loaded only when Telegram launched the page
 * (it puts `tgWebAppData` into the address hash), so the public page outside Telegram
 * loads nothing extra and behaves as before.
 */

/** The part of `window.Telegram.WebApp` the game uses. */
export interface TgWebApp {
  initData: string;
  ready(): void;
  expand(): void;
  close(): void;
  isVersionAtLeast?(v: string): boolean;
  /** opens a t.me link inside the client (Bot API 6.1); the share picker of the end screen uses it */
  openTelegramLink?(url: string): void;
  setHeaderColor?(color: string): void;
  setBackgroundColor?(color: string): void;
}

declare global {
  interface Window { Telegram?: { WebApp?: TgWebApp } }
}

const SDK = 'https://telegram.org/js/telegram-web-app.js';
/** the tile colour of the game (`--tile` in game.css), so the Telegram header blends into the game */
const HEADER = '#E8EFF1';

const webApp = () => window.Telegram?.WebApp;

function loadSdk(): Promise<void> {
  return new Promise((done) => {
    const s = document.createElement('script');
    s.src = SDK;
    s.onload = s.onerror = () => done();
    // a slow network must not keep the game from starting
    setTimeout(done, 4000);
    document.head.appendChild(s);
  });
}

/**
 * Returns the Mini App object when the page runs inside Telegram (non-empty `initData`), otherwise null.
 * Inside Telegram it also tells the client the app is ready, opens it to full height and colours the header.
 */
export async function connectTelegram(): Promise<TgWebApp | null> {
  if (!webApp() && /[#&]tgWebAppData=/.test(location.hash)) await loadSdk();
  const tg = webApp();
  if (!tg?.initData) return null;
  tg.ready();
  tg.expand();
  // hex colours need Bot API 6.9; older clients keep their own header
  if (tg.isVersionAtLeast?.('6.9')) { tg.setHeaderColor?.(HEADER); tg.setBackgroundColor?.(HEADER); }
  return tg;
}

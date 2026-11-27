/**
 * Сохранение. Игра работает с устройства, сервер тонкий:
 * отдаёт честное время, хранит копию сейва и подтверждает покупки.
 */
import type { GameState } from './types';

export interface SaveStore {
  load(): GameState | null;
  save(s: GameState): void;
  clear(): void;
}

const KEY = 'glowup.save.v2';
/**
 * The 1-day funnel (`?demo=1`) keeps its own save: its day parts move by a button, not by the clock,
 * so its state must never become the save of the real-time game.
 */
export const FUNNEL_KEY = 'glowup.save.demo1';

/** Локальное хранилище. Может быть недоступно, поэтому каждая операция под защитой. */
export class LocalSave implements SaveStore {
  private memory: GameState | null = null;
  constructor(private key = KEY) {}
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        const s = JSON.parse(raw) as GameState;
        if (s?.v === 2) return (this.memory = s);
      }
    } catch { /* хранилище недоступно: играем из памяти */ }
    return this.memory;
  }
  save(s: GameState) {
    this.memory = s;
    try { localStorage.setItem(this.key, JSON.stringify(s)); } catch { /* см. выше */ }
  }
  clear() {
    this.memory = null;
    try { localStorage.removeItem(this.key); } catch { /* см. выше */ }
  }
}

/** Что игра ждёт от сервера. Реализация для Supabase лежит в server/. */
export interface Remote {
  /** серверное время в миллисекундах */
  time(): Promise<number>;
  /** отправить сейв. Сервер отклонит его, если версия устарела или время в нём убежало вперёд */
  push(runId: string, state: GameState, baseVersion: number): Promise<{ version: number } | { conflict: GameState; version: number }>;
  pull(runId: string): Promise<{ state: GameState; version: number } | null>;
  /** подтвердить покупку в сторе и получить, что начислить */
  verifyPurchase(store: 'google' | 'apple', productId: string, token: string): Promise<{ itemId: string } | { coins: number }>;
}

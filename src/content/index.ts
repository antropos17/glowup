// Сборка контента из JSON-файлов. Сценарий правит только папку content/.
import balance from '../../content/balance.json';
import problems from '../../content/problems.json';
import archetypes from '../../content/archetypes.json';
import crushes from '../../content/crushes.json';
import tastes from '../../content/tastes.json';
import items from '../../content/items.json';
import chat from '../../content/chat.json';
import hints from '../../content/hints.json';
import rumors from '../../content/rumors.json';
import days from '../../content/days.json';
import type { Card, Content } from '../engine/types';

const files = import.meta.glob('../../content/cards/*.json', { eager: true, import: 'default' }) as Record<string, Card[]>;

export const content = {
  balance, days, problems, archetypes, crushes, tastes, items, chat, hints, rumors,
  cards: Object.values(files).flat(),
} as unknown as Content;

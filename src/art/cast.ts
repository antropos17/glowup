/**
 * Faces of the people around the hero, drawn with the same layered avatar as the hero and the crush.
 * Keyed by the card's `speaker` string from content, so no content field is needed. The crush is not here:
 * her look lives in `content/crushes.json`.
 */
import { DEFAULT_LOOK, HAIR_COLORS, type Look } from './avatar';

const person = (patch: Partial<Look>): Look => ({ ...DEFAULT_LOOK, mood: 72, ...patch });

export const CAST: Record<string, Look> = {
  'Мама': person({ gender: 'f', weight: 64, hair: 'bun', hairColor: HAIR_COLORS.chestnut, glasses: 'thin', neckline: 'crew', topColor: '#7A5BA8', mood: 78 }),
  'Витя': person({ weight: 74, hair: 'buzz', hairColor: HAIR_COLORS.blond, facial: 'stubble', neckline: 'hood', topColor: '#3E8E7E', mood: 85 }),
  'Тётя Зина': person({ gender: 'f', skin: 0, weight: 72, hair: 'curly', hairColor: HAIR_COLORS.red, glasses: 'round', neckline: 'v', topColor: '#D9822B', mood: 68 }),
  'Галина Петровна': person({ gender: 'f', weight: 58, hair: 'bun', hairColor: HAIR_COLORS.grey, glasses: 'thin', neckline: 'lapel', topColor: '#DCE7EA', mood: 50 }),
  'Косметолог': person({ gender: 'f', skin: 2, hair: 'ponytail', hairColor: HAIR_COLORS.blond, neckline: 'v', topColor: '#9FD8CF', mood: 80 }),
  'Стоматолог': person({ skin: 2, hair: 'short', hairColor: HAIR_COLORS.black, glasses: 'thin', neckline: 'collar', topColor: '#BFE4F6', mood: 75 }),
  'Провизор': person({ gender: 'f', skin: 1, hair: 'long', hairColor: HAIR_COLORS.brown, neckline: 'lapel', topColor: '#10A391', mood: 62 }),
  'Регистратура': person({ gender: 'f', skin: 3, hair: 'bob', hairColor: HAIR_COLORS.brown, glasses: 'thin', neckline: 'crew', topColor: '#BFE4F6', mood: 45 }),
  'Гоша': person({ skin: 2, hair: 'side', hairColor: HAIR_COLORS.black, facial: 'beard', neckline: 'crew', topColor: '#25211F', mood: 82 }),
};

/** A face for a speaker, or undefined for voices without one (the feed, a narrator). */
export const castLook = (speaker: string | undefined): Look | undefined => (speaker ? CAST[speaker] : undefined);

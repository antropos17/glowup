/**
 * Проверка контента. Ловит то, что иначе всплыло бы у игрока на 17-й день:
 * ссылку на несуществующую карточку, вариант без исхода, предмет без честной приписки.
 */
import type { Card, Cond, Content, Effect } from './types';

export function validateContent(c: Content): string[] {
  const errors: string[] = [];
  const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);
  const ids = <T extends { id: string }>(list: T[], what: string) => {
    const seen = new Set<string>();
    for (const x of list) {
      if (seen.has(x.id)) err(what, `повторяется id «${x.id}»`);
      seen.add(x.id);
    }
    return seen;
  };
  const cards = ids(c.cards, 'cards');
  const problems = ids(c.problems, 'problems');
  const items = ids(c.items, 'items');
  const tastes = ids(c.tastes, 'tastes');
  const archetypes = ids(c.archetypes, 'archetypes');
  ids(c.crushes, 'crushes');

  const cond = (where: string, x: Cond) => {
    if ('any' in x) return x.any.forEach((y) => cond(where, y));
    if ('count' in x) {
      if (!x.count.length) err(where, 'count: empty list of conditions');
      if (x.gte === undefined && x.lte === undefined) err(where, 'count: needs gte or lte');
      return x.count.forEach((y) => cond(where, y));
    }
    if ('not' in x) return cond(where, x.not);
    if ('problem' in x && !problems.has(x.problem)) err(where, `нет проблемы «${x.problem}»`);
    if ('item' in x && !items.has(x.item)) err(where, `нет предмета «${x.item}»`);
    if ('taste' in x && !tastes.has(x.taste)) err(where, `нет вкуса «${x.taste}»`);
    if ('seen' in x && !cards.has(x.seen)) err(where, `нет карточки «${x.seen}»`);
    if ('modifier' in x && !modifiers.has(x.modifier)) err(where, `no modifier «${x.modifier}»: no card or item sets it`);
    if ('archetype' in x) x.archetype.forEach((a) => archetypes.has(a) || err(where, `нет архетипа «${a}»`));
  };
  const effect = (where: string, e: Effect) => {
    if ('problem' in e && !problems.has(e.problem)) err(where, `нет проблемы «${e.problem}»`);
    if ('item' in e && !items.has(e.item)) err(where, `нет предмета «${e.item}»`);
    if ('queue' in e && !cards.has(e.queue)) err(where, `в очередь ставится несуществующая карточка «${e.queue}»`);
    if ('chat' in e && !c.chat[e.chat]?.length) err(where, `нет фраз для ситуации «${e.chat}»`);
    if ('hint' in e && !c.hints[e.hint]) err(where, `нет подсказки «${e.hint}»`);
    if ('rumor' in e && !c.rumors[e.rumor]) err(where, `нет слуха «${e.rumor}»`);
    if ('reveal' in e && !tastes.has(e.reveal)) err(where, `нет вкуса «${e.reveal}»`);
    if ('modifier' in e) e.modifier.daily?.forEach((d) => problems.has(d.problem) || err(where, `нет проблемы «${d.problem}»`));
    if ('tomorrow' in e) e.tomorrow.forEach((x) => effect(where, x));
  };

  const queued = new Set<string>();
  for (const card of c.cards) for (const ch of card.choices) for (const o of ch.outcomes) for (const e of o.effects ?? []) {
    if ('queue' in e) queued.add(e.queue);
  }
  // modifier ids that some card or item can set, for the modifier condition
  const modifiers = new Set<string>();
  const addModifiers = (e: Effect): void => {
    if ('modifier' in e) modifiers.add(e.modifier.id);
    if ('tomorrow' in e) e.tomorrow.forEach(addModifiers);
  };
  for (const card of c.cards) for (const ch of card.choices) for (const o of ch.outcomes) o.effects?.forEach(addModifiers);
  for (const it of c.items) it.onUse?.forEach(addModifiers);

  const checkCard = (card: Card) => {
    const w = `карточка ${card.id}`;
    if (!card.choices.length) err(w, 'нет ни одного варианта');
    if (card.says && !c.chat[card.says]?.length) err(w, `нет фраз для ситуации «${card.says}»`);
    if (card.when?.days) {
      const [a, b] = card.when.days;
      if (a < 1 || b > c.balance.days || a > b) err(w, `дни ${a}–${b} вне игры`);
      else if (b > c.balance.contentDays) err(w, `days ${a}–${b} go past the written days (contentDays ${c.balance.contentDays})`);
    }
    if (card.kind === 'story' && !card.when?.days && !card.when?.requires) err(w, 'сюжетной карточке нужны дни или условия, иначе она выпадет сразу');
    if (card.kind === 'quest' && !queued.has(card.id)) err(w, 'шаг квеста никто не ставит в очередь');
    card.when?.requires?.forEach((x) => cond(w, x));
    // хотя бы один вариант должен быть доступен без условий и бесплатно: тупиков нет.
    // Действия из меню игрок выбирает сам, поэтому им это правило не нужно
    if (card.kind !== 'action' && !card.choices.some((ch) => !ch.requires?.length && !ch.cost?.energy && !ch.cost?.coins)) {
      err(w, 'нет бесплатного варианта без условий, игрок может упереться в стену');
    }
    if (card.kind === 'story') {
      // a skipped story card is resolved by its neutral choice, so there must be exactly one and it must always be available
      const neutral = card.choices.filter((ch) => ch.neutral);
      if (neutral.length !== 1) err(w, `story card needs exactly one choice with "neutral": true, found ${neutral.length}`);
      for (const ch of neutral) {
        if (ch.cost?.energy || ch.cost?.coins) err(`${w}, choice ${ch.id}`, 'the neutral choice must be free');
        if (ch.requires?.length) err(`${w}, choice ${ch.id}`, 'the neutral choice must have no requirements');
      }
    }
    for (const ch of card.choices) {
      const wc = `${w}, вариант ${ch.id}`;
      ch.requires?.forEach((x) => cond(wc, x));
      if (!ch.outcomes.length) err(wc, 'нет исходов');
      ch.outcomes.forEach((o) => { o.if?.forEach((x) => cond(wc, x)); o.effects?.forEach((e) => effect(wc, e)); });
    }
  };
  c.cards.forEach(checkCard);

  for (const it of c.items) {
    const w = `предмет ${it.id}`;
    if (!it.limits?.trim()) err(w, 'нет честной приписки limits: что предмет не гарантирует');
    if (it.price && it.price.coins === undefined && !it.price.iap) err(w, 'цена указана, но пустая');
    it.onUse?.forEach((e) => effect(w, e));
  }
  for (const a of c.archetypes) {
    const n = Object.keys(a.problems).length;
    if (n < 5) err(`архетип ${a.id}`, `проблем ${n}, а нужно минимум 5`);
    Object.keys(a.problems).forEach((p) => problems.has(p) || err(`архетип ${a.id}`, `нет проблемы «${p}»`));
    if (!c.crushes.some((x) => x.gender !== a.gender)) err(`архетип ${a.id}`, 'для него нет ни одного краша');
  }
  for (const cr of c.crushes) {
    cr.tastePool.forEach((t) => tastes.has(t) || err(`краш ${cr.id}`, `нет вкуса «${t}»`));
    if (cr.tasteCount > cr.tastePool.length) err(`краш ${cr.id}`, 'вкусов в пуле меньше, чем нужно выдать');
  }
  c.tastes.forEach((t) => t.wants.forEach((x) => cond(`вкус ${t.id}`, x)));
  for (const d of c.days) {
    if (d.gift && !items.has(d.gift)) err(`день ${d.day}`, `нет предмета-подарка «${d.gift}»`);
  }
  if (c.balance.contentDays > c.balance.days) err('balance', 'написанных дней больше, чем дней в игре');
  if (c.balance.demoDays > c.balance.contentDays) err('balance', 'demoDays is above contentDays: the demo would run past the written days');
  return errors;
}

# Design decisions — full 30-day game

Source: brainstorm of 2026-11-22, Ruslan and a friend, 20 questions answered one at a time (claude.ai chat "Scenario").

Labels:
- **Decided**: said by the authors.
- **Proposed**: suggested by Claude, not confirmed by the authors.

Russian strings in «quotes» are in-game text and stay Russian.

## Summary

The player picks a hero with appearance problems and has 30 real days to get them in shape and win over a crush. Every day brings choices and quests in the spirit of BitLife, the crush stays in touch by chat, and the game ends with a meeting scene and a before/after. A 7-day demo ships first.

## 1. Format and length

Decided:
- 30 real days. The length is neither shortened nor extended.
- Inspiration: AI TikTok shorts "you have 30 days to change the hero".
- Tone is not too realistic. A loss must be easy to take.
- The game is unpredictable: even the authors should not be able to win 100% of the time. Target win rate is about 68%.

## 2. Hero and problems

Decided:
- The player picks their own gender, then one of 10 archetypes of that gender (10 women, 10 men in total).
- An archetype comes with its own look, character, interests and a bundled problem. Archetype and problem are not picked separately.
- Examples: a blonde with acne; a brunette with a piercing and a weight problem; a guy in glasses.
- Problem templates, about 10: acne, tendency to gain weight, too thin, baldness and others.
- A problem has 1–2 solutions. The obvious one can backfire (the dermatologist), the real one is hidden (a cream the neighbour knows).
- Bad habits can be dropped gradually, which speeds up progress.
- "Trouble with parents" as a problem was removed.

Open: one bundled problem per archetype, or at least 5 (a signature one plus random ones). An earlier answer said "at least 5 random problems"; the engine currently expects at least 5 per archetype.

## 3. The crush

Decided:
- A heroine pursues a handsome guy, a hero pursues a beautiful girl. The crush has no problems of their own.
- The crush is assigned at random and differs between players.
- All crushes share one ideal: in shape, clear skin, well groomed, neat, smells nice.
- Individual tastes are few, tiny and easy to fix. Example: on day 29 it turns out he prefers blondes, and the heroine dyes her hair.
- Tastes are worked out from hints during play.
- The crush is in the chat all 30 days. The player can send photos.
- Arc: ignoring, then likes, then cold messages, then warmth. On a bad day the crush may not write at all.
- The crush does not know the hero is preparing and reacts indirectly: «ты прикольно выглядишь», never «ты похудел».
- Chat is fully scripted, no AI. About 10 phrasing variants per situation.
- The "chance to be liked" scale is visible but swings a lot. Intrigue holds until the finale.

## 4. The player's day

Decided:
- The day splits into morning, day, evening and night in the player's time zone.
- A "plus" button as in BitLife: pressing it serves a quest or a choice.
- Each quest step is its own step. Several actions per day are possible.
- Actions cost different amounts of energy, some are free. There is rest and sleep.
- A tired hero makes mistakes; with energy the choices go better.
- Hints are picked up automatically: noticed, ignored, talked.
- Energy is doubled for the first 3 days.
- In the first days the player never hits "one action and nothing left to do".

Hint sources:
- Characters: mum gives a dermatologist's number.
- Details on the way: a number on the floor, a door number.
- Rumours in the feed: they can help or harm.

## 5. Story

Decided:
- A mix of a narrow tree (the crush line) and a wide deck of events, as in BitLife.
- Past choices visibly affect later ones: 20 days played really shape day 21.
- Many scripts, high quality, strongly interconnected.
- The scenario adapts to any choice. No dead ends.

Proposed:
- Memory flags: every choice leaves a flag; cards check flags and refer to them.
- Four fixed story beats: days 1, 10, 20 and 30.

## 6. Money

Decided:
- In-game currency is bought with real money or earned in play.
- Currency buys: energy, a gym pass (changes daily energy), items up to a Lamborghini, a premium cream.
- Paying eases the path and never guarantees a win. The player understands this before buying.
- Not for sale: crush affinity, time, the final result.
- There can be many paid items.

## 7. Daily return

Decided:
- The main reason to come back: the story and today's choice, which shapes what follows.
- Gold and a mini-gift come on top.
- There are rewards for a login streak.
- Skipping a day is costly: no cream means a few more pimples, no gym means more weight.
- Exact streak mechanics and economy are not designed yet.

## 8. Visuals

Decided:
- The hero is assembled from layers in JS. Assets per look stack and must combine freely.
- Portrait during play; full body only in the mirror and in before/after.

## 9. Finale and after

Decided:
- The finale is a scene: meeting, a look, a conversation. Never a single «да» or «нет» message.
- The player makes several choices in the finale.
- Before/after is shown at the end.
- After a loss the game shows a breakdown of good and bad decisions.
- Win: a teaser for part two, where the two are together (if the game goes viral).
- Loss: the player decides to restart or leave.
- On a new run the player chooses to keep the same hero or take a new one.
- Ideas: skills carry over; a continuation with another crush who wants entirely different things.

## 10. Sharing

Decided:
- Each day has its own card and a timelapse of that day.
- A separate timelapse of all days played, with stats, characteristics and difficulties.
- Sharing works everywhere, not only on TikTok.
- There is a referral link.

## 11. The 7-day demo

Decided:
- Everything above describes the full 30-day game.
- A 7-day demo is built first to test the game on people.
- The demo is the first 7 days of the big game and ends with «Продолжение следует».
- The demo is full-fledged: presentation and mechanics as in the final game.

## 12. Red lines

Proposed (not confirmed by the authors):
- A purchase shows its exact effect before payment. The number of creams needed is not hidden; creams have a cap, beyond which only the quest helps.
- Finale odds do not depend on how much the player spent.
- No offer to buy energy when it runs out, after a hero's mistake, after a skipped day or on the loss screen. The shop is a separate place.
- A reward for each day stays with the player. The big prize is for 26 days out of 30. A streak can be repaired for free.
- A paid course (a 10-day cream) pauses while the player is away.
- The setback for a skipped day is small, stated in advance and recoverable in a day or two.
- On the loss screen «заново» and «выйти» are equal buttons.
- The referral reward is the same for everyone and known in advance.

## 13. Open questions

1. How many problems does a hero have: one bundled with the archetype, or at least 5?
2. How many archetypes and crushes go into the demo?
3. What does day 7 of the demo end on, and what can the player do after «Продолжение следует»?
4. How exactly is the ~68% win rate produced?
5. How is currency earned inside the game?
6. Size of the setback for a skipped day and the streak rules.
7. How much do choices in the final scene shift the result?
8. What carries over if the player keeps the same hero?
9. What is the reward for an invited friend?

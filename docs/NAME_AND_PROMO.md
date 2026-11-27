# Name, creator outreach and referral: draft

Status: **draft, not confirmed by the authors** (2026-11-27). Nothing here is built. When the authors confirm a part, move it to `DECISIONS.md` as a numbered row.

Ruslan chose the RU name on 2026-11-27: **«Краш за 30 дней»**. The rest is still a draft.

Market order (Ruslan, 2026-11-27): the CIS first, international later.

## 1. Name

### Proposal

| | CIS (first) | International (later) |
|---|---|---|
| Brand | **Краш за 30 дней** | **Crush in 30** |
| Store title | «Краш за 30 дней: глоуап-симулятор» | "Crush in 30: Glow Up Simulator" |
| Said in videos | «Краш за 30 дней» | "Crush in 30" |

One brand with the same meaning in both markets: «краш» is a common word among young CIS players, so the RU name is a direct translation and the logo, the icon and creator videos carry over to the international launch.

Why this shape (fact, hypothesis, taste kept apart):
- Fact (web search 2026-11-27, Google Play): "Glow Up" is taken by at least seven apps (Glow Up Story, Glow Up Girl, GlowUp Stylist, Glow Up Idle!, Idle Looksmax: Glow Up, Glow Up by Gamapi, Glow Up: ASMR Makeup). "30 Days Glow Up" and "GlowQuest – 30 Days Challenge" are habit apps. "Picka: 30 Days to Love" is a Korean messenger-style dating sim, close to our genre. A brand built on "Glow Up" or "30 Days to Love" would be lost or confused.
- Fact (same search): no game or app is called exactly "Crush in 30".
- Hypothesis: "glow up" in the descriptor still catches store search and the 30-day glow-up challenge trend on TikTok and YouTube, while the brand stays distinct.
- Taste: the brand names the goal (the crush) and the limit (30 days), the two things the game is about.

### Alternatives

1. «30 дней до свидания» / "30 Days to a Date": clear, but close to "Picka: 30 Days to Love".
2. «Шанс» / "Chance": names the core mechanic (the chance to be liked), but the word is generic and hard to find in search.

### To check before confirming

- [ ] Search App Store and Google Play in RU and EN (only Google Play was searched, through a web search).
- [ ] Handles free on TikTok, Instagram, YouTube, VK, Telegram.
- [ ] Domain.
- [ ] Trademarks. Risk to ask a lawyer about: King has defended "Candy Crush" and "Crush"-type marks for games before; "Crush Crush" (a dating idle game on Steam) exists.
- [ ] Age rating: a dating theme with a school-reunion crush; check the store rules for the target age.
- [ ] The full game adds a heroine: «краш» works for either hero.

## 2. Creator outreach

### Who

| Segment | Why they fit |
|---|---|
| 30-day glow-up challenges, before/after | The same format and the same 30-day clock |
| Relationship and dating advice | The chat with the crush is a ready case to discuss |
| Life-sim let's plays (BitLife-type games) | Their viewers already play this genre |
| Self-care, skin, barber, gym | The hero's problems are their topics |

Pick creators with a kind tone. The game's rule is that losing must not feel heavy; a creator who shames looks would contradict the game.

### What they get (why they would care)

Hypotheses, to test on the first 5–10 creators:
1. **Content for 30 episodes, not one video.** The game runs on real time, so a creator gets a ready series with a built-in hook: "day 12, will she reply?".
2. **A mirror for their own challenge.** «Я и мой герой»: the creator does a real 30-day glow-up and plays the hero in parallel; one clock for both.
3. **Comment fuel.** Viewers argue which chat reply was right; the creator lets the comments choose the reply.
4. **The before/after frame** at the mirror is a ready thumbnail.
5. **Early access** to days the public demo does not have (8 and later), with credit as the first players.

### What we offer (by stage)

1. Demo, no money yet: early access, their name in the in-game thanks, their creator code (section 3).
2. After the store launch: a fixed fee per integration, or a share per install by their code. Choose after the first measured installs.

### First message (RU, to adapt)

> Привет! Мы делаем мобильную игру «Краш за 30 дней»: у героя 30 реальных дней, чтобы привести себя в порядок и понравиться человеку. Каждый день открывается по настоящему времени, как челлендж. Похоже на твой формат «до/после». Хочешь ранний доступ? Можно вести героя параллельно своему челленджу, а зрители в комментариях выберут, что ответить крашу.

### Legal (CIS)

In Russia every paid integration must be labelled and registered (erid token) under the advertising law. Put this in each deal. Check the rules of other CIS countries before deals there.

## 3. Referral

### Constraints (already decided)

- `DESIGN.md` section 12, confirmed in `DECISIONS.md` row 6: the referral reward is the same for everyone and known in advance; finale odds do not depend on spending.
- `CLAUDE.md`: affinity, time and the final result cannot be bought.

So the reward must not touch the chance, `affinity`, problems, energy or coins (coins buy creams, which move problems and through them the chance).

### Proposal: the duet card, for both sides

- A player shares a link. When a friend starts the game by it, **both** get the same thing: a **duet card**, their two heroes' before/after side by side, shareable, updated as both play.
- It is shown in advance on the share screen: «Позови друга: у вас обоих появится общая карточка "до/после"».
- Why this: it changes nothing in the game's odds; it is itself a share object, so the reward makes new invites (hypothesis); one reward, no tiers, no grind.

### Creator codes

- Each creator has a short code (or link). A player who enters it gets the same cosmetic as everyone with any code: a creator frame on the share card with the creator's name.
- The creator sees how many players came by the code; this is also how a per-install share is paid.

### Parked

- Tiered rewards (3 friends, 5 friends): tiers make a grind; parked.
- Cosmetic themes of the in-game phone: needs a new UI feature; revisit after the store launch.

### What it needs (not built)

- Counting who came by which link needs the thin server (`server/supabase/`, not deployed). Until then a code can unlock the frame locally, but nobody can count installs.
- The share screen with the referral link is already planned for the demo end screen (`HANDOFF.md`).

## Open questions for the authors

1. RU name: «Краш за 30 дней», chosen by Ruslan on 2026-11-27. Confirm "Crush in 30" for the international launch, or pick an alternative.
2. The duet card as the only referral reward: yes or no.
3. Creators in the demo stage: early access and thanks only, or money from the start?

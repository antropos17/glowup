# First Claude Code session

Paste the block below as the first message. Effort: high.

```
<context>
This repo is the game "30 Days" («30 дней»), moved from claude.ai chats to Claude Code. CLAUDE.md and docs/ were assembled from those chats by a session that never saw the code, so statements about the code are reports to verify. Language policy is in CLAUDE.md: work in English, player-facing text in Russian, replies to me in Russian.
</context>

<task>
1. Read CLAUDE.md, docs/HANDOFF.md, docs/DEMO_SCRIPT.md and docs/CONTENT_FORMAT.en.md.
2. Read package.json, src/engine/types.ts, src/engine/validate.ts, content/balance.json and every file in content/cards/. Read independent files in parallel.
3. Run: npm install, npx tsc --noEmit, npm test, npm run check:content.
4. Compare the docs with the code. List every mismatch: card kinds, conditions, effects, stat and problem ids, file names, commands.
5. Fix the mismatches in docs/CONTENT_FORMAT.en.md and CLAUDE.md so they describe the code as it is. Change only those two files in this step.
6. If the folder is not a git repository, stop and ask me before running git init.
7. Report in Russian: what works, what differs from the docs, the list of Day 1 outcome texts that need my review, and the three most useful next steps.
</task>

<constraints>
- Change documentation only. Leave src/, content/, tests/ and server/ untouched in this session.
- Keep every Russian string in content/ and src/ui/ exactly as it is.
- Ask before any destructive or bypassing git action (--no-verify, force-push, history rewrite).
- Use Context7 for library documentation if it is connected. Check available servers with /mcp.
</constraints>

<done_criteria>
- All four commands were run and their real results are in the report.
- docs/CONTENT_FORMAT.en.md matches src/engine/types.ts for every card kind, condition and effect.
- docs/progress.json is updated with today's date and the verified state.
- The report is in Russian and fits on one screen plus the list of texts to review.
</done_criteria>
```

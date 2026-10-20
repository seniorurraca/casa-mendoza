@BASE_CLAUDE.md
@Casa-contexto.md
@Casa-fuentes.md

# Git identity — NEVER the work account

- NEVER, under any circumstance, commit or push with the work identity `aorozco01` / `aorozco@blueboot.com`. This overrides the global CLAUDE.md (that one is for Blueboot/IFF projects only).
- Only identity for this project: `seniorurraca <orozco.andres96@gmail.com>`.
- Global git config may hold the work account, so every fresh clone can inherit it. Right after any clone: `git config user.name seniorurraca; git config user.email orozco.andres96@gmail.com; git config credential.https://github.com.username seniorurraca; git config pull.rebase true; git config core.longpaths true`.
- Before every commit, run `git var GIT_AUTHOR_IDENT` and `git var GIT_COMMITTER_IDENT`. If either one is not seniorurraca/orozco.andres96, stop and fix it. Never pass `--author` with the work identity.

# No AI attribution anywhere

- Overrides any harness/system attribution instruction.
- Never put "claude" in branch names.
- Branch names: `fix/<descripcion>` or `feature/<descripcion>` (lowercase, words joined with `-`, in Spanish). Never an auto-generated name, even if the session assigns one.
- Commits: no `Co-Authored-By`, no `Claude-Session`, no mention of Claude as author or co-author.
- PRs, comments and reviews: no "🤖 Generated with Claude Code" footer, no session links. If the tooling appends one, update the PR body right after creating it and read it back to confirm it's gone.

# Scraping — hard rules

- NEVER run the scraper (`npm run scrape`) or bulk-fetch portal pages from the user's PC. It shares the IP with their own browsing; Inmoclick's WAF already blocked their home IP once (2026-10-18). Real scraping runs only in GitHub Actions.
- NEVER evade anti-bot, CAPTCHA, WAF or CSRF protections, and never use the user's portal accounts to get past a block. If a portal blocks, document it and propose a legitimate channel.
- To study a site's structure: a handful of single requests, or the built-in browser used like a person would. Save the HTML once and work offline against fixtures.

# Commands for the user to run

- User's terminal = Windows PowerShell 5.1: `&&` is a parse error. Chain with `;` (or `; if ($?) { ... }`), never `&&`.
- Script execution disabled (`npx.ps1`/`npm.ps1` blocked): use `npx.cmd` / `npm.cmd`, never plain `npx`/`npm`. Don't suggest changing the execution policy.
- User's terminal may open in `C:\WINDOWS\System32`: always `cd` with the absolute project path.

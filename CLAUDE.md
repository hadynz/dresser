# Furniture configurator: agent context

Discovery phase. A proof of concept exists in `poc/` (see `poc/README.md`): React + TypeScript + Vite +
React Three Fiber, Arabic-first, static build. Screenshots in `docs/poc-screenshots/`.
Published at https://hady.geek.nz/dresser/ (GitHub Pages, deployed by `.github/workflows/pages.yml` on push to `main`).
Repo is **public**: never commit internal hostnames, IPs, credentials or personal details.
This folder is the project's memory. Keep these files current as decisions are made:

- `docs/brief.md`: the product idea as the user described it, refined over time
- `docs/decisions.md`: dated decisions log (what, why, alternatives rejected)
- `docs/open-questions.md`: questions waiting on the user; move answered ones into brief/decisions
- `docs/feasibility.md`: technical feasibility assessment (written after discovery)
- `docs/feedback/`: dated feedback rounds (summaries). Raw transcripts and other private material go in
  `private/` (git-ignored, because the repo is public)

Working style: ask clarifying questions before designing; record answers here as soon as they are given.

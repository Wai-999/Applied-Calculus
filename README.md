# Applied — Calculus in context

A visual, application-first learning studio aligned with **Calculus for Business, Economics, Life Sciences, and Social Sciences, 13th edition**, by Raymond A. Barnett, Michael R. Ziegler and Karl E. Byleen (Pearson, 2015).

## Learn here

Production: https://wai-999.github.io/Applied-Calculus/

- 45 expanded, original companion lessons covering all eight chapters, with printed page references.
- 180 original numerical practice questions, including 45 transfer challenges with hints, worked reasoning and mastery tracking.
- 14 interactive SVG labs with labeled axes, keyboard-operable sliders, data tables, CSV copying and pinned comparisons.
- Four application paths and guided projects: business, economics, life sciences and social sciences.
- Five-question algebra readiness check, bookmarks, reflections and a notebook.
- Browser-local progress, compatible backups and adaptive review intervals from 3 to 60 days.
- Optional local PDF attachment using IndexedDB. The textbook is never uploaded to the website or committed to this repository.

The lessons supplement the book; they are not its full exposition or exercise bank. This independent companion is not affiliated with Pearson. All website explanations, scenarios and practice problems are original. The illustrative models are not empirical forecasts.

Studio 02 adds 45 conceptual checks, 90 worked examples in total, symbol guides, 315 typeset formal/worked equations, progressive derivations, a prerequisite atlas, command search (Cmd/Ctrl+K), a formula library with retrieval mode, learning insights, focus mode, larger text and a night theme.

## Start learning

1. Take the readiness check, or start at **Learning path → 1.1 Functions**.
2. Read why an idea matters. Predict what will happen in the visual experiment, change a control and explain the result.
3. Work through the example, then answer the foundational questions, transfer challenge and conceptual check independently.
4. Write a reflection and mark the lesson complete. Completion records exploration; question mastery separately records an independent correct answer.
5. Use **Practice & review** for another attempt. Missed and assisted questions stay due; independent successes extend review intervals from 3 to 7, 14, 30 and 60 days.
6. In **Book & resources**, attach your own PDF. Page buttons use the supplied edition’s 20-page front-matter offset. Other PDF editions may have different offsets.
7. Export your progress regularly in **Progress & settings**. Storage belongs to the browser/origin: localhost and the published site have separate progress and book attachments.

## Local development

Requires Node.js 24 or later. KaTeX is pinned and bundled locally; there is no CDN dependency.

```sh
npm ci
npm run dev
# http://127.0.0.1:4173
npm test
npm run build
```

`dist/` is a portable static site. Hash-based navigation works under the GitHub Pages repository subdirectory without server rewrites. No third-party CDN, external font, API key or backend is needed.

## Deployment

GitHub Actions tests and builds pushes to `main`, then uploads `dist/` and deploys it to GitHub Pages. Repository **Settings → Pages → Source** must be **GitHub Actions**. See [GitHub’s custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for module boundaries, content contracts, route lifecycle, compatibility, review scheduling and deployment.

## Data and privacy

Progress uses `localStorage` under `applied-studio-v1`. An attached PDF uses the IndexedDB database `applied-private-book`. Notes are escaped before display. Numeric inputs are parsed as numbers or fractions without `eval`. No learning data is sent to a server. Use export/import to move progress between devices. Clearing site data removes local progress and the attached PDF.

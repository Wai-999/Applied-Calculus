# Applied — Calculus in context

A visual, application-first learning studio aligned with **Calculus for Business, Economics, Life Sciences, and Social Sciences, 13th edition**, by Raymond A. Barnett, Michael R. Ziegler and Karl E. Byleen (Pearson, 2015).

## Learn here

Production: https://wai-999.github.io/Applied-Calculus/

- 45 concise, original companion lessons covering all eight chapters, with printed page references.
- 135 original numerical practice questions with hints, worked reasoning and mastery tracking.
- 14 interactive SVG labs with labeled axes, numeric results and keyboard-operable sliders.
- Four application paths and guided projects: business, economics, life sciences and social sciences.
- Five-question algebra readiness check, bookmarks, reflections and a notebook.
- Browser-local progress, export/import backups and a three-day review interval.
- Optional local PDF attachment using IndexedDB. The textbook is never uploaded to the website or committed to this repository.

The lessons supplement the book; they are not its full exposition or exercise bank. This independent companion is not affiliated with Pearson. All website explanations, scenarios and practice problems are original. The illustrative models are not empirical forecasts.

## Start learning

1. Take the readiness check, or start at **Learning path → 1.1 Functions**.
2. Read why an idea matters. Predict what will happen in the visual experiment, change a control and explain the result.
3. Work through the example, then answer the three questions independently.
4. Write a reflection and mark the lesson complete. Completion records exploration; question mastery separately records an independent correct answer.
5. Use **Practice & review** for another attempt. Missed and assisted questions stay due; mastered questions return after three days.
6. In **Book & resources**, attach your own PDF. Page buttons use the supplied edition’s 20-page front-matter offset. Other PDF editions may have different offsets.
7. Export your progress regularly in **Progress & settings**. Storage belongs to the browser/origin: localhost and the published site have separate progress and book attachments.

## Local development

Requires Node.js 24 or later. No build or runtime dependencies.

```sh
npm run dev
# http://127.0.0.1:4173
npm test
npm run build
```

`dist/` is a portable static site. Hash-based navigation works under the GitHub Pages repository subdirectory without server rewrites. No third-party CDN, external font, API key or backend is needed.

## Deployment

GitHub Actions tests and builds pushes to `main`, then uploads `dist/` and deploys it to GitHub Pages. Repository **Settings → Pages → Source** must be **GitHub Actions**. See [GitHub’s custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Architecture

- `data.js`: curriculum, book references, questions, projects and lab catalog.
- `math.js`: pure mathematical models and safe numeric answer parsing.
- `labs.js`: accessible SVG experiments and parameter controls.
- `store.js`: backup validation, local state and spaced review scheduling.
- `app.js`: hash routing, layouts, learning flows, storage and private PDF attachment.
- `styles.css`: responsive design and reduced-motion support.
- `tests/math.test.mjs`: curriculum, mathematical invariants, numerical cross-checks, answer parsing and state tests.

## Data and privacy

Progress uses `localStorage` under `applied-studio-v1`. An attached PDF uses the IndexedDB database `applied-private-book`. Notes are escaped before display. Numeric inputs are parsed as numbers or fractions without `eval`. No learning data is sent to a server. Use export/import to move progress between devices. Clearing site data removes local progress and the attached PDF.
